import { db } from "@socio/db";
import { categories, services, provider } from "@socio/db/schema";
import { and, asc, eq, like, sql } from "drizzle-orm";
import { getCategoryRoutingMap } from "./active-provider";

/**
 * Sumber tunggal untuk aksi "kategori" di admin (rail kiri /admin/services dan
 * halaman /admin/categories). Dulu SQL-nya tersebar per route — berisiko drift:
 * dua jalur disable bisa saja tidak sama-sama menempelkan tag [manual-off], dan
 * itu menjebol kontrak tahan-sync.
 *
 * KONTRAK [manual-off]: `categories` tidak punya kolom status (service-sync
 * membuat kategori otomatis dari katalog provider), jadi "kategori nonaktif"
 * diwujudkan di seluruh `services` di dalamnya:
 *   - status=0 + note memuat "[manual-off]"  → cron/service-sync TIDAK mengaktifkan ulang
 *   - status=0 tanpa tag                     → akan dihidupkan lagi saat sync per jam
 * Jadi setiap jalur disable manual WAJIB lewat fungsi ini.
 */
export const MANUAL_OFF_TAG = "[manual-off]";

/** Tempel (off=true) atau kupas (off=false) tag di note layanan. */
export function withManualOff(note: string, off: boolean): string {
  const base = (note ?? "").trim();
  if (off) return base.includes(MANUAL_OFF_TAG) ? base : (base ? base + " " : "") + MANUAL_OFF_TAG;
  return base.replace(MANUAL_OFF_TAG, "").replace(/\s+/g, " ").trim();
}

/** Baris kategori ringkas — dipakai rail /admin/services. */
export type CategoryLiteRow = {
  id: number;
  name: string;
  /** Jumlah seluruh layanan di kategori. */
  total: number;
  /** Jumlah layanan yang status=1 (aktif). */
  active: number;
};

/**
 * Daftar kategori + hitungan total/aktif.
 *
 * PENTING (perf): jangan LEFT JOIN services lalu GROUP BY categories — dengan
 * ±1.800 kategori itu jadi "Using temporary; Using filesort" dan dipicu ulang
 * tiap load/toggle. Hitungan diambil dari GROUP BY di tabel `services` SAJA
 * (pakai index category_id_idx), lalu digabung ke daftar kategori di memori.
 */
export async function listCategoryRowsLite(): Promise<CategoryLiteRow[]> {
  const [catBase, svcCounts] = await Promise.all([
    db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .orderBy(asc(categories.name)),
    db
      .select({
        categoryId: services.categoryId,
        total: sql<number>`COUNT(*)`,
        active: sql<number>`COALESCE(SUM(CASE WHEN ${services.status} = 1 THEN 1 ELSE 0 END), 0)`,
      })
      .from(services)
      .groupBy(services.categoryId),
  ]);

  const cntMap = new Map<number, { total: number; active: number }>();
  for (const sc of svcCounts) {
    cntMap.set(Number(sc.categoryId), { total: Number(sc.total), active: Number(sc.active) });
  }
  return catBase.map((c) => {
    const m = cntMap.get(Number(c.id));
    return { id: Number(c.id), name: c.name, total: m?.total ?? 0, active: m?.active ?? 0 };
  });
}

/** Baris kategori lengkap — dipakai halaman /admin/categories. */
export type CategoryRow = CategoryLiteRow & {
  /** Provider yang benar-benar melayani via category_provider_routing (null = default). */
  routingProviderId: number | null;
  routingProviderName: string | null;
  /** Nama provider dari layanan kategori ini (gabungan, untuk label "siapa punya"). */
  providerNames: string[];
};

/** Semua kategori + jumlah layanan (total/aktif) + kondisi routing, terurut nama. */
export async function listCategoryRows(): Promise<CategoryRow[]> {
  const [lite, provRows, provIds, routingMap] = await Promise.all([
    listCategoryRowsLite(),
    db.select({ id: provider.id, name: provider.name }).from(provider),
    db
      .select({
        categoryId: services.categoryId,
        providerIds: sql<string>`COALESCE(GROUP_CONCAT(DISTINCT ${services.providerId}), '')`,
      })
      .from(services)
      .groupBy(services.categoryId),
    getCategoryRoutingMap(),
  ]);

  const provById = new Map<number, string>(provRows.map((p) => [Number(p.id), String(p.name)]));
  const idsByCat = new Map<number, number[]>();
  for (const row of provIds) {
    const ids = String(row.providerIds)
      .split(",")
      .map((x) => Number(x.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
    idsByCat.set(Number(row.categoryId), ids);
  }

  return lite.map((c) => {
    const routingProviderId = routingMap.get(c.id) ?? null;
    const names = (idsByCat.get(c.id) ?? [])
      .map((pid) => provById.get(pid))
      .filter((x): x is string => !!x);
    return {
      ...c,
      routingProviderId,
      routingProviderName:
        routingProviderId !== null ? (provById.get(routingProviderId) ?? null) : null,
      providerNames: names,
    };
  });
}

export type CategoryStatusResult =
  | { ok: true; name: string; affected: number; mode: "on" | "off" }
  | { ok: false; reason: "not_found" | "empty" | "invalid" };

/**
 * Matikan / nyalakan SEMUA layanan satu kategori.
 *
 * off → status=0 + tag [manual-off] ditempel (tahan dari reaktivasi sync).
 * on  → HANYA yang status=0 DAN bertag yang dihidupkan lagi; layanan mati
 *        karena alasan lain (mis. tidak ada di katalog provider) dibiarkan mati.
 */
export async function setCategoryStatus(
  categoryId: number,
  mode: "on" | "off",
): Promise<CategoryStatusResult> {
  if (!Number.isFinite(categoryId) || categoryId <= 0) return { ok: false, reason: "invalid" };
  const [cat] = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(eq(categories.id, categoryId))
    .limit(1);
  if (!cat) return { ok: false, reason: "not_found" };

  const likeTag = `%${MANUAL_OFF_TAG}%`;

  if (mode === "off") {
    const [cnt] = await db
      .select({ n: sql<number>`COUNT(*)` })
      .from(services)
      .where(and(eq(services.categoryId, categoryId), eq(services.status, 1)));
    const changed = Number(cnt?.n ?? 0);
    if (changed > 0) {
      // CASE menjaga supaya baris yang (langka) sudah bertag tidak dobel tag.
      await db
        .update(services)
        .set({
          status: 0,
          note: sql`CASE WHEN ${services.note} IS NULL OR ${services.note} NOT LIKE ${likeTag}
              THEN TRIM(CONCAT(COALESCE(${services.note}, ''), ' ', ${MANUAL_OFF_TAG})) ELSE ${services.note} END`,
        })
        .where(and(eq(services.categoryId, categoryId), eq(services.status, 1)));
    }
    return { ok: true, name: cat.name, affected: changed, mode: "off" };
  }

  // ON: hanya yang manual-off (status=0 + bertag) — buang tag, jadi aktif.
  const [cnt] = await db
    .select({ n: sql<number>`COUNT(*)` })
    .from(services)
    .where(
      and(
        eq(services.categoryId, categoryId),
        eq(services.status, 0),
        like(services.note, likeTag),
      ),
    );
  const changed = Number(cnt?.n ?? 0);
  if (changed > 0) {
    await db
      .update(services)
      .set({
        status: 1,
        // Buang tag di POSISI APAPUN: REPLACE pertama untuk " [manual-off]"
        // (dengan spasi), REPLACE kedua untuk "[manual-off]" persis di awal
        // string. Path OFF men-TRIM hasil concat, jadi baris yang catatannya
        // kosong menghasilkan note = "[manual-off]" tanpa spasi — kalau hanya
        // REPLACE pertama, tag itu NYTAR dan baris ini tetap terblokir sync
        // (isManualOff) padahal sudah dinyalakan manual.
        note: sql`TRIM(REPLACE(REPLACE(COALESCE(${services.note}, ''), ${" " + MANUAL_OFF_TAG}, ''), ${MANUAL_OFF_TAG}, ''))`,
      })
      .where(
        and(
          eq(services.categoryId, categoryId),
          eq(services.status, 0),
          like(services.note, likeTag),
        ),
      );
  }
  return { ok: true, name: cat.name, affected: changed, mode: "on" };
}

/**
 * Toggle satu kategori: masih ada yang aktif → matikan semua; semua mati →
 * hidupkan yang bertag manual-off saja. Dipakai switch per baris.
 */
export async function toggleCategoryStatus(categoryId: number): Promise<CategoryStatusResult> {
  if (!Number.isFinite(categoryId) || categoryId <= 0) return { ok: false, reason: "invalid" };
  const rows = await db
    .select({ status: services.status })
    .from(services)
    .where(eq(services.categoryId, categoryId));
  if (!rows.length) return { ok: false, reason: "empty" };
  const mode = rows.some((r) => r.status === 1) ? "off" : "on";
  return setCategoryStatus(categoryId, mode);
}

/** Jumlah layanan yang masih memakai satu kategori (dipakai sebelum hapus). */
export async function countCategoryServices(categoryId: number): Promise<number> {
  const [row] = await db
    .select({ c: sql<number>`count(*)` })
    .from(services)
    .where(eq(services.categoryId, categoryId));
  return Number(row?.c ?? 0);
}
