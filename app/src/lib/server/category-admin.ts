import { db } from "@socio/db";
import { categories, services, provider } from "@socio/db/schema";
import { and, asc, eq, like, notInArray, or, sql, type SQL } from "drizzle-orm";
import { getActiveProviderId, getCategoryRoutingMap } from "./active-provider";
import { planCategoryToggle, type ToggleSvc } from "./category-toggle-policy";
import {
  categoryHealth,
  emptyCategoryCounts,
  foldCategoryCounts,
  type CategoryCounts,
  type CategoryHealth,
  type ProviderCountRow,
  type ServingContext,
} from "$lib/catalog-counts";

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

/** Baris kategori lengkap — dipakai halaman /admin/categories DAN rail /admin/services. */
export type CategoryRow = {
  id: number;
  name: string;
  /** Jumlah seluruh layanan di kategori (lintas provider — guard hapus + sisi OFF). */
  total: number;
  /** Jumlah layanan yang status=1 (aktif, lintas provider). */
  active: number;
  /** Provider yang benar-benar melayani via category_provider_routing (null = default). */
  routingProviderId: number | null;
  routingProviderName: string | null;
  /** Nama provider dari layanan kategori ini (gabungan, untuk label "siapa punya"). */
  providerNames: string[];
  /**
   * F13 — hitungan yang owner bisa percaya: hanya provider yang melayani
   * kategori ini. `total/active` di atas masih lintas semua provider (termasuk
   * katalog provider mati), jadi badge WAJIB pakai serving* + health, bukan
   * active<total mentah.
   */
  servingProviderId: number | null;
  servingProviderName: string | null;
  servingTotal: number;
  servingActive: number;
  /** Baris serving status=0 + bertag [manual-off] — target sisi ON (adaptasi .id). */
  servingManualOff: number;
  legacyTotal: number;
  legacyActive: number;
  health: CategoryHealth;
};

/**
 * Semua kategori + jumlah layanan + kondisi routing, terurut nama.
 *
 * F13: agregat `GROUP BY category_id, provider_id` di services SAJA (index
 * category_id_idx), dilipat oleh `foldCategoryCounts` — bukan LEFT JOIN +
 * GROUP_CONCAT lintas provider. Dua manfaat sekaligus:
 *   1. hitungan serving vs legacy terpisah → badge tidak lagi "Partial" palsu
 *      untuk kategori yang katalog serving-nya sudah ON semua;
 *   2. tetap tanpa join ke categories + filesort TEXT (keluhan lambat P10).
 * Kategori kosong tetap muncul (0/0) karena daftar kategori dibaca terpisah.
 *
 * PENTING (perf): jangan LEFT JOIN services lalu GROUP BY categories — dengan
 * ±900 kategori itu jadi "Using temporary; Using filesort" dan dipicu ulang
 * tiap load/toggle.
 *
 * Kategori yang SELURUH layanannya berasal dari provider dorman disembunyikan
 * (P9 — sisa provider lama, bukan katalog aktif). Provider dorman = status=0
 * DAN tidak ter-route; baris provider + api_key-nya sendiri TETAP disimpan di
 * DB supaya order lama pelanggan tetap ter-poll (lihat status-polling.ts).
 * Kategori tanpa layanan tetap tampil karena bisa jadi placeholder buatan admin.
 */
export async function listCategoryRows(): Promise<CategoryRow[]> {
  const [catBase, countRows, provRows, routingMap, activeProviderId] = await Promise.all([
    db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .orderBy(asc(categories.name)),
    db
      .select({
        categoryId: services.categoryId,
        providerId: services.providerId,
        total: sql<number>`COUNT(*)`,
        active: sql<number>`COALESCE(SUM(CASE WHEN ${services.status} = 1 THEN 1 ELSE 0 END), 0)`,
        manualOff: sql<number>`COALESCE(SUM(CASE WHEN ${services.status} = 0 AND ${services.note} LIKE ${"%" + MANUAL_OFF_TAG + "%"} THEN 1 ELSE 0 END), 0)`,
      })
      .from(services)
      .groupBy(services.categoryId, services.providerId),
    db.select({ id: provider.id, name: provider.name, status: provider.status }).from(provider),
    getCategoryRoutingMap(),
    getActiveProviderId(),
  ]);

  const provById = new Map<number, string>(provRows.map((p) => [Number(p.id), String(p.name)]));
  const routedIds = new Set(routingMap.values());
  const dormant = new Set(
    provRows
      .filter((p) => Number(p.status) === 0 && !routedIds.has(Number(p.id)))
      .map((p) => Number(p.id)),
  );

  const ctx: ServingContext = { activeProviderId, routing: routingMap };
  const counts: ProviderCountRow[] = countRows.map((r) => ({
    categoryId: Number(r.categoryId),
    providerId: Number(r.providerId),
    total: Number(r.total ?? 0),
    active: Number(r.active ?? 0),
    manualOff: Number(r.manualOff ?? 0),
  }));
  const folded = foldCategoryCounts(counts, ctx);

  // "Siapa punya" per kategori — nama provider yang benar-benar ada baris di
  // situ. Provider dorman jangan bocor ke UI admin walau barisnya masih ada.
  const idsByCat = new Map<number, number[]>();
  const namesByCat = new Map<number, string[]>();
  for (const r of counts) {
    const ids = idsByCat.get(r.categoryId) ?? [];
    if (r.providerId > 0 && !ids.includes(r.providerId)) ids.push(r.providerId);
    idsByCat.set(r.categoryId, ids);
    if (dormant.has(r.providerId)) continue;
    const nm = provById.get(r.providerId);
    if (!nm) continue;
    const arr = namesByCat.get(r.categoryId) ?? [];
    if (!arr.includes(nm)) arr.push(nm);
    namesByCat.set(r.categoryId, arr);
  }

  return catBase
    .filter((c) => {
      const ids = idsByCat.get(Number(c.id)) ?? [];
      return ids.length === 0 || ids.some((pid) => !dormant.has(pid));
    })
    .map((c) => {
      const id = Number(c.id);
      const n: CategoryCounts = folded.get(id) ?? emptyCategoryCounts(ctx, id);
      const routingProviderId = routingMap.get(id) ?? null;
      return {
        id,
        name: c.name,
        total: n.total,
        active: n.active,
        routingProviderId,
        routingProviderName:
          routingProviderId !== null ? (provById.get(routingProviderId) ?? null) : null,
        providerNames: namesByCat.get(id) ?? [],
        servingProviderId: n.servingProviderId,
        servingProviderName:
          n.servingProviderId !== null ? (provById.get(n.servingProviderId) ?? null) : null,
        servingTotal: n.servingTotal,
        servingActive: n.servingActive,
        servingManualOff: n.servingManualOff,
        legacyTotal: n.legacyTotal,
        legacyActive: n.legacyActive,
        health: categoryHealth(n),
      };
    });
}

export type CategoryStatusResult =
  | { ok: true; name: string; affected: number; mode: "on" | "off" }
  | {
      ok: false;
      reason: "not_found" | "empty" | "invalid" | "no_active_provider" | "no_serving_services";
      /** Nama kategori bila sudah diketahui — supaya pesan admin tidak menyebut id mentah (F10). */
      name?: string;
    };

/**
 * Matikan / nyalakan layanan satu kategori.
 *
 * off → status=0 + tag [manual-off] ditempel (tahan dari reaktivasi sync).
 *        SEMUA provider — sisi off tidak pernah refuse (aksi selamat).
 * on  → HANYA yang status=0 DAN bertag yang dihidupkan lagi; layanan mati
 *        karena alasan lain (mis. tidak ada di katalog provider) dibiarkan mati.
 *        DITAPIS provider (W1/F2): routing target menang, else provider aktif
 *        global — keputusan fungsi murni `planCategoryToggle` supaya teruji
 *        tanpa DB. Tanpa provider sah / tanpa baris memenuhi → tolak, JANGAN
 *        tulis DB (dulu kategori campuran/provider dorman bisa ikut hidup).
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

  // ON: hanya manual-off (status=0 + bertag) dari provider yang sah (W1/F2).
  const rows = await db
    .select({ status: services.status, providerId: services.providerId, note: services.note })
    .from(services)
    .where(eq(services.categoryId, categoryId));
  const svcs: ToggleSvc[] = rows.map((r) => ({
    providerId: Number(r.providerId),
    status: Number(r.status),
    manualOff: String(r.note ?? "").includes(MANUAL_OFF_TAG),
  }));
  // Provider sah: routing target menang; hanya bila tidak ada routing baru
  // tanya provider aktif global (hindari query tidak perlu).
  const routed = (await getCategoryRoutingMap()).get(categoryId);
  const active = routed !== undefined ? null : await getActiveProviderId();
  const plan = planCategoryToggle(svcs, routed, active, "on");
  const allowed = plan.allowedProvider;
  // Tidak ada provider sah / tidak ada baris memenuhi → JANGAN tulis DB.
  if (plan.refuse !== null || allowed === null)
    return { ok: false, reason: plan.refuse ?? "no_active_provider", name: cat.name };

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
        eq(services.providerId, allowed),
      ),
    );
  return { ok: true, name: cat.name, affected: plan.affected, mode: "on" };
}

/**
 * Toggle satu kategori: masih ada yang aktif → matikan semua; semua mati →
 * hidupkan yang bertag manual-off dari provider sah saja (keputusan murni
 * planCategoryToggle, refuse tanpa tulis DB). Dipakai switch per baris.
 */
export async function toggleCategoryStatus(categoryId: number): Promise<CategoryStatusResult> {
  if (!Number.isFinite(categoryId) || categoryId <= 0) return { ok: false, reason: "invalid" };
  const rows = await db
    .select({ status: services.status, providerId: services.providerId, note: services.note })
    .from(services)
    .where(eq(services.categoryId, categoryId));
  if (!rows.length) return { ok: false, reason: "empty" };
  const svcs: ToggleSvc[] = rows.map((r) => ({
    providerId: Number(r.providerId),
    status: Number(r.status),
    manualOff: String(r.note ?? "").includes(MANUAL_OFF_TAG),
  }));
  const routed = (await getCategoryRoutingMap()).get(categoryId);
  const active = routed !== undefined ? null : await getActiveProviderId();
  const plan = planCategoryToggle(svcs, routed, active);
  if (plan.refuse !== null) {
    // Nama dibaca hanya di jalur tolak (langka) — pesan admin menyebut nama,
    // bukan id mentah (F10). Jalur lulus sudah fetch nama di setCategoryStatus.
    const [cat] = await db
      .select({ name: categories.name })
      .from(categories)
      .where(eq(categories.id, categoryId))
      .limit(1);
    return { ok: false, reason: plan.refuse, name: cat?.name };
  }
  return setCategoryStatus(categoryId, plan.turnedOff ? "off" : "on");
}

/** Jumlah layanan yang masih memakai satu kategori (dipakai sebelum hapus). */
export async function countCategoryServices(categoryId: number): Promise<number> {
  const [row] = await db
    .select({ c: sql<number>`count(*)` })
    .from(services)
    .where(eq(services.categoryId, categoryId));
  return Number(row?.c ?? 0);
}

/**
 * Kembar SQL dari `servingProviderFor` — filter "hanya katalog yang bisa
 * di-order" untuk /admin/services (F13 scope=serving).
 *
 * Tanpa filter ini, halaman pertama /admin/services (ORDER BY id DESC, 25 baris)
 * bisa didominasi baris provider mati yang tidak bisa dijual — itu punca rasa
 * "ga relate dengan categories". Bentuk: (provider aktif AND kategori TIDAK
 * di-route) OR (pasangan routing). Dengan routing 0 baris (produksi .id
 * sekarang) ia jadi satu `provider_id = ?` saja — ramah index. Routing tetap
 * diperhitungkan supaya kategori yang sengaja di-route ke provider lain TIDAK
 * hilang dari pandangan.
 *
 * undefined = tidak ada provider sah sama sekali (state rusak). Pemanggil wajib
 * menampilkan SEMUA baris, bukan halaman kosong yang tidak bisa diperbaiki admin.
 */
export function servingCatalogWhere(ctx: ServingContext): SQL | undefined {
  const routed = [...ctx.routing.entries()];
  const parts: SQL[] = [];
  if (ctx.activeProviderId !== null) {
    const routedCats = routed.map(([cid]) => Number(cid));
    if (routedCats.length) {
      const p = and(
        eq(services.providerId, ctx.activeProviderId),
        notInArray(services.categoryId, routedCats),
      );
      if (p) parts.push(p);
    } else {
      parts.push(eq(services.providerId, ctx.activeProviderId));
    }
  }
  for (const [cid, pid] of routed) {
    const p = and(eq(services.categoryId, Number(cid)), eq(services.providerId, Number(pid)));
    if (p) parts.push(p);
  }
  if (!parts.length) return undefined;
  return parts.length === 1 ? parts[0] : or(...parts);
}
