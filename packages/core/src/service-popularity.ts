/**
 * "Paling laris" — mesin PERILAKU murni untuk rekomendasi layanan di /pesan
 * (tanpa DB / tanpa framework) supaya bisa diuji di selftest
 * (`packages/core/test/service-popularity.test.ts`). Port B4 socio.my
 * (31 Okt 2026 → v5 1 Nov), engine identik — hanya konteks data probe disesuaikan.
 *
 * IDE: user milih chip JENIS (kinds) → daftar rekomendasi di area daftar
 * Layanan berubah isi sesuai jenis itu. Sumber kebenaran = order yang
 * BENAR-BENAR BERHASIL di semua user (bukan sekadar banyak diklik).
 *
 * KONTEK DATA (probe produksi `socio_smm` `.id`, 5 Nov 2026): 172 order
 * 30 hari terakhir, 142 di antaranya Success — cukup untuk tier mingguan,
 * tapi order Sukses 24 jam terakhir bisa saja < 3 → karena itu jendela
 * BERTINGKAT:
 *
 *   day   → 24 jam  ("hari ini")
 *   week  → 7 hari  ("minggu ini")
 *   month → 30 hari ("bulan ini")
 *
 * Tier dipilih GLOBAL (satu untuk seluruh band, bukan per item) supaya
 * labelnya jujur. Kalau tak ada tier yang punya cukup kandidat → `null`
 * (band tak dirender sama sekali, bukan kotak kosong).
 *
 * CATATAN KEJUJURAN: angka "N× dipesan" hanya ditampilkan kalau N ≥ 2
 * (lihat `POPULAR_SHOW_COUNT_FROM`). Angka 1 tak impressive dan tak
 * boleh dipakai sebagai social proof.
 */

import type { KindId, PlatformId } from "./catalog.ts";

export type PopularWindow = "day" | "week" | "month";

/** Statistik per jendela untuk satu layanan. */
export interface PopularStats {
  /** Order berstatus `Success` (Partial TIDAK dihitung — bukan bukti berhasil). */
  success: number;
  /** Semua order yang dicoba (dipakai untuk success-rate). */
  attempts: number;
  /** Epoch ms order Sukses terakhir (null = tak pernah sukses). */
  lastAt: number | null;
}

/** Satu kandidat layanan (dipetakan server → kandidat siap pakai). */
export interface PopularCandidate {
  id: number;
  kind: KindId;
  platform: PlatformId;
  categoryId: number;
  /** Harga jual per-1000 untuk level user ini (sudah markup). */
  pricePer1k: number;
  day: PopularStats;
  week: PopularStats;
  month: PopularStats;
}

export interface PopularContext {
  window: PopularWindow;
  /** Filter keras: kind terpilih user ("" = semua jenis). */
  kind?: KindId | "";
  /** Filter keras: platform terpilih user ("" = semua platform). */
  platform?: PlatformId | "";
  /** Preferensi (bukan filter): item dalam kategori ini naik ke depan. */
  categoryId?: number;
  /** Maks item yang ditampilkan. */
  limit?: number;
}

/** Order mentah untuk bucketing (layer server → fungsi murni). */
export interface RawPopularOrder {
  serviceId: number;
  status: string;
  /** Epoch ms. */
  createdAt: number;
}

/** Minimal kandidat agar sebuah tier dianggap layak (balik "kotak kosong"). */
export const POPULAR_MIN_ITEMS = 3;
/** Default jumlah item yang ditampilkan. */
export const POPULAR_DEFAULT_LIMIT = 4;
/** Success-rate minimal, dipakai kalau percobaan sudah cukup banyak. */
export const POPULAR_MIN_SUCCESS_RATE = 0.5;
/** Minimal percobaan sebelum success-rate dianggap bermakna. */
export const POPULAR_RATE_MIN_ATTEMPTS = 3;
/** Angka "N× dipesan" baru ditampilkan mulai N ini (1 = tak impressive). */
export const POPULAR_SHOW_COUNT_FROM = 2;

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const MONTH_MS = 30 * DAY_MS;

/** Urutan tier: paling sempit dulu. */
const WINDOWS: readonly PopularWindow[] = ["day", "week", "month"];

/** Panjang jendela (ms) per tier. */
export function popularWindowMs(w: PopularWindow): number {
  if (w === "day") return DAY_MS;
  if (w === "week") return WEEK_MS;
  return MONTH_MS;
}

/**
 * Bucket order mentah → statistik per layanan untuk 3 jendela sekaligus.
 * Order yang umurnya > 30 hari atau bertanggal di masa depan diabaikan.
 * `attempts` di tier "day" hanya menghitung order < 24 jam, dst.
 */
export function bucketPopularStats(
  orders: RawPopularOrder[],
  now: number,
): Map<number, { day: PopularStats; week: PopularStats; month: PopularStats }> {
  const empty = (): PopularStats => ({ success: 0, attempts: 0, lastAt: null });
  const out = new Map<number, { day: PopularStats; week: PopularStats; month: PopularStats }>();
  for (const o of orders) {
    const age = now - o.createdAt;
    if (!Number.isFinite(age) || age < 0 || age > MONTH_MS) continue;
    let e = out.get(o.serviceId);
    if (!e) {
      e = { day: empty(), week: empty(), month: empty() };
      out.set(o.serviceId, e);
    }
    const ok = o.status === "Success";
    for (const w of WINDOWS) {
      if (age > popularWindowMs(w)) continue;
      const s = e[w];
      s.attempts += 1;
      if (ok) {
        s.success += 1;
        if (s.lastAt === null || o.createdAt > s.lastAt) s.lastAt = o.createdAt;
      }
    }
  }
  return out;
}

/**
 * Pilih tier global: hari ini → minggu ini → bulan ini.
 * `null` = data tak cukup untuk menampilkan band (jangan render kotak kosong).
 */
export function pickPopularWindow(candidates: PopularCandidate[]): PopularWindow | null {
  for (const w of WINDOWS) {
    const n = candidates.filter((c) => c[w].success > 0).length;
    if (n >= POPULAR_MIN_ITEMS) return w;
  }
  return null;
}

/** Success-rate 0..1 untuk satu kandidat pada satu tier. */
export function popularSuccessRate(c: PopularCandidate, w: PopularWindow): number {
  const s = c[w];
  if (s.attempts <= 0) return 0;
  return s.success / s.attempts;
}

/**
 * Syarat masuk daftar: ada ≥1 Sukses di tier berjalan, DAN kalau percobaannya
 * sudah banyak (≥ `POPULAR_RATE_MIN_ATTEMPTS`) success-rate-nya ≥ 50%.
 * Dengan data tipis, 1 percobaan = 1 success (rate 100%) tetap lolos —
 * success-rate baru bermakna setelah 3 percobaan.
 */
export function isPopularEligible(c: PopularCandidate, w: PopularWindow): boolean {
  const s = c[w];
  if (s.success <= 0) return false;
  if (
    s.attempts >= POPULAR_RATE_MIN_ATTEMPTS &&
    popularSuccessRate(c, w) < POPULAR_MIN_SUCCESS_RATE
  ) {
    return false;
  }
  return true;
}

/**
 * Filter keras (kind/platform) → eligibility → ranking.
 * Urutan: dalam-kategori dulu → jumlah Sukses ↓ → success-rate ↓ →
 * Sukses terakhir ↓ → harga ↑.
 */
export function rankPopular(
  candidates: PopularCandidate[],
  ctx: PopularContext,
): PopularCandidate[] {
  const kind = ctx.kind || "";
  const platform = ctx.platform || "";
  const cat = ctx.categoryId ?? 0;
  const limit = ctx.limit ?? POPULAR_DEFAULT_LIMIT;
  const inCat = (x: PopularCandidate) => (cat && x.categoryId === cat ? 1 : 0);

  return candidates
    .filter((c) => (!kind || c.kind === kind) && (!platform || c.platform === platform))
    .filter((c) => isPopularEligible(c, ctx.window))
    .sort((a, b) => {
      if (inCat(a) !== inCat(b)) return inCat(b) - inCat(a);
      const sa = a[ctx.window].success;
      const sb = b[ctx.window].success;
      if (sa !== sb) return sb - sa;
      const ra = popularSuccessRate(a, ctx.window);
      const rb = popularSuccessRate(b, ctx.window);
      if (ra !== rb) return rb - ra;
      const la = a[ctx.window].lastAt ?? 0;
      const lb = b[ctx.window].lastAt ?? 0;
      if (la !== lb) return lb - la;
      return a.pricePer1k - b.pricePer1k;
    })
    .slice(0, limit);
}
