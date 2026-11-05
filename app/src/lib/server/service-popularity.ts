/**
 * "Paling laris" — sumber data rekomendasi /pesan (port 1:1 socio.my Nov-2026).
 *
 * IDEA: user milih chip JENIS (kinds) → kami tunjukkan layanan yang benar-benar
 * BERHASIL dipesan semua user dalam jendela terakhir, di area daftar Layanan.
 * Bukan "paling banyak dilihat" — hanya order berstatus `Success` yang dihitung
 * sebagai bukti berhasil.
 *
 * JENDELA BERTINGKAT (lihat `@socio/core/service-popularity`): 24 jam → 7 hari
 * → 30 hari. Tier dipilih GLOBAL supaya labelnya jujur ("hari ini" / "minggu
 * ini" / "bulan ini"). Kalau tak ada tier dengan cukup kandidat → hasilnya
 * array kosong → band tak dirender sama sekali (dalem app tak ada kotak kosong).
 *
 * DATA (probe produksi 5 Nov 2026): 172 order 30 hari terakhir, 142 Sukses →
 * tier "day"/"week" punya bahan. Kalau data menipis, engine otomatis turun
 * tier atau mengembalikan array kosong (band hilang, bukan kotak kosong).
 *
 * KEAMANAN: yang dikirim ke client HANYA `pricePer1k` (harga jual level user,
 * sama seperti daftar Layanan). Harga base/modal (`price`, `price_api`,
 * `price_reseller`) dan persentase markup TIDAK PERNAH keluar dari modul ini.
 * Data ini agregat lintas user — tanpa nama/identitas user.
 *
 * JOIN PENTING: `orders.service_id` = ID INTERNAL `services.id` (di skema `.id`
 * kolomnya bertipe double — dibungkus `Number()` sama seperti `/pesanan`).
 * Jangan pakai id provider — itu jalur katalog eksternal.
 *
 * PERBEDAAN vs `.my`: `.id` TIDAK punya aturan harga per kategori
 * (`getCategoryRulesFor`). Jalur harga di sini meniru persis
 * `/pesan/services/+server.ts`: `effectivePer1k(base, level, rule, modal)` —
 * supaya angka di band = angka di daftar layanan.
 */
import { db } from "@socio/db";
import { categories, orders, services } from "@socio/db/schema";
import { and, gte, inArray } from "drizzle-orm";
import { baseForLevel, effectivePer1k, type UserLevel } from "@socio/core/pricing";
import { detectKind, detectPlatform, type KindId, type PlatformId } from "@socio/core/catalog";
import {
  bucketPopularStats,
  pickPopularWindow,
  popularSuccessRate,
  rankPopular,
  type PopularCandidate,
  type PopularWindow,
} from "@socio/core/service-popularity";
import { getPricingRules } from "$lib/server/pricing";
import { whitelabel } from "$lib/format";

/** Bentuk yang dikirim ke client (aman — tanpa harga modal/markup). */
export type PopularService = {
  id: number;
  serviceName: string;
  categoryId: number;
  categoryName: string;
  platform: PlatformId;
  kind: KindId;
  /** Harga jual per-1000 untuk level user ini (sudah markup). */
  pricePer1k: number;
  min: number;
  max: number;
  isRefill: number;
  type: string;
  note: string;
  waktu: string;
  /** Order SUKSES dalam tier berjalan. */
  successCount: number;
  /** Semua percobaan order dalam tier berjalan (untuk success-rate). */
  attemptCount: number;
  /** 0..1 */
  successRate: number;
  /** ISO order Sukses terakhir (null = tak pernah sukses). */
  lastSuccessAt: string | null;
  /** Jendela data yang dipakai (label jujur per tier). */
  window: PopularWindow;
};

/** Status order yang dibaca (Partial = bukan bukti berhasil, tetap dihitung sbg attempt). */
const COUNTED_STATUS = [
  "Success",
  "Pending",
  "Processing",
  "In progress",
  "Partial",
  "Error",
  "Canceled",
  "Refilling",
] as const;

/** TTL cache in-memory (detik). Data order berubah lambat; /pesan tak boleh berat. */
const CACHE_TTL_MS = 60_000;
/** Maks kandidat yang dikirim ke client. */
const MAX_CANDIDATES = 40;

/** Baris layanan yang dipakai untuk hitung harga jual (per level). */
type ServiceRow = {
  id: number;
  serviceName: string;
  categoryId: number;
  type: string;
  price: number;
  priceApi: number;
  priceReseller: number;
  min: number;
  max: number;
  isRefill: number;
  note: string;
  waktu: string;
};

/** Snapshot data (tanpa harga) — di-cache sekali per TTL, dipakai semua level. */
type PopularitySnapshot = {
  candidates: PopularCandidate[];
  window: PopularWindow | null;
  svcById: Map<number, ServiceRow>;
  catNames: Map<number, string>;
};

/**
 * Cache in-memory (tidak pernah `null` — field `at = 0` berarti belum ada
 * snapshot, jadi TS tak perlu narrowing di mana-mana).
 */
const cache: {
  at: number;
  snapshot: PopularitySnapshot | null;
  byLevel: Map<UserLevel, PopularService[]>;
} = { at: 0, snapshot: null, byLevel: new Map() };

/** Buang cache (dipanggil test / setelah perubahan data besar). */
export function invalidatePopularityCache(): void {
  cache.at = 0;
  cache.snapshot = null;
  cache.byLevel.clear();
}

/**
 * Ambil kandidat yang punya order (30 hari terakhir) + snapshot layanan aktif.
 * Dipisah dari perhitungan harga supaya query berat cuma jalan sekali per TTL.
 */
async function loadSnapshot(): Promise<PopularitySnapshot> {
  const now = Date.now();
  const since = new Date(now - 30 * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      serviceId: orders.serviceId,
      status: orders.status,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(and(gte(orders.createdAt, since), inArray(orders.status, [...COUNTED_STATUS])))
    .limit(5000);

  const stats = bucketPopularStats(
    rows.map((r) => ({
      serviceId: Number(r.serviceId),
      status: String(r.status),
      createdAt: new Date(r.createdAt).getTime(),
    })),
    now,
  );

  const ids = Array.from(stats.keys()).filter((id) => Number.isFinite(id) && id > 0);
  if (ids.length === 0) {
    return { candidates: [], window: null, svcById: new Map(), catNames: new Map() };
  }

  const svcRows = await db
    .select({
      id: services.id,
      serviceName: services.serviceName,
      categoryId: services.categoryId,
      type: services.type,
      price: services.price,
      priceApi: services.priceApi,
      priceReseller: services.priceReseller,
      min: services.min,
      max: services.max,
      isRefill: services.isRefill,
      note: services.note,
      waktu: services.waktu,
    })
    .from(services)
    .where(and(inArray(services.id, ids), inArray(services.status, [1])));

  const svcById = new Map<number, ServiceRow>();
  const candidates: PopularCandidate[] = [];
  for (const s of svcRows) {
    const st = stats.get(s.id);
    if (!st) continue;
    const name = String(s.serviceName ?? "");
    svcById.set(s.id, {
      id: s.id,
      serviceName: name,
      categoryId: s.categoryId,
      type: s.type,
      price: Number(s.price ?? 0),
      priceApi: Number(s.priceApi ?? 0),
      priceReseller: Number(s.priceReseller ?? 0),
      min: s.min,
      max: s.max,
      isRefill: s.isRefill,
      note: s.note,
      waktu: s.waktu,
    });
    candidates.push({
      id: s.id,
      kind: detectKind(name),
      platform: detectPlatform(name),
      categoryId: s.categoryId,
      // Harga diisi nanti (per level) — di sini placeholder supaya ranking
      // (tie-break harga) tetap jalan; dihitung ulang di bawah.
      pricePer1k: 0,
      day: st.day,
      week: st.week,
      month: st.month,
    });
  }

  // Nama kategori (whitelabel) — buat label item lintas kategori.
  const catNames = new Map<number, string>();
  const catIds = Array.from(new Set(svcRows.map((s) => s.categoryId)));
  if (catIds.length > 0) {
    const cats = await db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(inArray(categories.id, catIds));
    for (const c of cats) catNames.set(c.id, whitelabel(c.name));
  }

  return { candidates, window: pickPopularWindow(candidates), svcById, catNames };
}

/**
 * Rekomendasi "Paling laris" untuk level user tertentu.
 * Hasil: array aman untuk client (kosong = tak ada band yang ditampilkan).
 */
export async function getServicePopularity(level: UserLevel): Promise<PopularService[]> {
  const now = Date.now();
  const fresh = now - cache.at < CACHE_TTL_MS && !!cache.snapshot;
  if (fresh && cache.byLevel.has(level)) return cache.byLevel.get(level)!;

  // Snapshot (order + layanan + nama kategori) di-cache sekali per TTL dan
  // dipakai semua level → buka /pesan tak menambah query per level.
  let snap: PopularitySnapshot;
  if (fresh && cache.snapshot) {
    snap = cache.snapshot;
  } else {
    try {
      snap = await loadSnapshot();
    } catch (e) {
      console.error("[popularity] gagal ambil data order:", e);
      return [];
    }
    cache.at = now;
    cache.snapshot = snap;
    cache.byLevel.clear();
  }

  const window = snap.window;
  if (!window || snap.candidates.length === 0) {
    cache.byLevel.set(level, []);
    return [];
  }

  // Harga jual per level — jalur harga SAMA dengan daftar Layanan
  // (`/pesan/services/+server.ts`: rule per level + effectivePer1k 4 arg),
  // jadi angka di band = angka yang dibayar user.
  const rule = (await getPricingRules())[level];

  const priced: PopularCandidate[] = [];
  for (const c of snap.candidates) {
    const s = snap.svcById.get(c.id);
    if (!s) continue;
    const modal = s.priceApi;
    const base = baseForLevel(
      { price: s.price, priceApi: modal, priceReseller: s.priceReseller },
      level,
    );
    priced.push({ ...c, pricePer1k: effectivePer1k(base, level, rule, modal) });
  }

  // Ranking TANPA filter kind/platform dulu: daftar kandidat global, lalu
  // client memfilter sesuai chip yang dipilih (re-rank instan, tanpa request).
  const ranked = rankPopular(priced, { window, limit: MAX_CANDIDATES });
  if (ranked.length === 0) {
    cache.byLevel.set(level, []);
    return [];
  }

  const out: PopularService[] = [];
  for (const c of ranked) {
    const s = snap.svcById.get(c.id);
    if (!s) continue;
    const st = c[window];
    out.push({
      id: s.id,
      serviceName: whitelabel(s.serviceName),
      categoryId: s.categoryId,
      categoryName: snap.catNames.get(s.categoryId) ?? "",
      platform: c.platform,
      kind: c.kind,
      pricePer1k: c.pricePer1k,
      min: s.min,
      max: s.max,
      isRefill: s.isRefill,
      type: s.type,
      note: s.note,
      waktu: s.waktu,
      successCount: st.success,
      attemptCount: st.attempts,
      successRate: popularSuccessRate(c, window),
      lastSuccessAt: st.lastAt ? new Date(st.lastAt).toISOString() : null,
      window,
    });
  }

  cache.byLevel.set(level, out);
  return out;
}
