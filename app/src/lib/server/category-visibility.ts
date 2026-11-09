/**
 * Satu sumber kebenaran untuk pertanyaan: "kategori ini masih bisa dibeli tidak?"
 *
 * Dipakai oleh dropdown filter /layanan (hanya tampilkan yang bisa dibeli) dan payload
 * kategori dashboard (tetap tampilkan semuanya, tapi ditandai `disabled`).
 * Dulu kedua permukaan punya aturan sendiri — /layanan mengirim SELURUH tabel
 * `categories` (1.836 baris di produksi) tanpa filter, sehingga kategori yang
 * layanannya dimatikan provider tetap muncul di filter user dan berujung daftar
 * kosong. Aturan berbeda di satu halaman = drift.
 *
 * Aturan penting (kontrak dgn owner, 9 Nov 2026): TIDAK ADA kategori yang dihapus
 * dari DB atau dari payload informasi — yang mati hanya diLABELI. Begitu provider
 * mengaktifkan ulang produknya, label/pilihan muncul sendiri tanpa perubahan kode.
 */
import { sql } from "drizzle-orm";
import { services } from "@socio/db/schema";

/**
 * Predikat "layak order" — SALINAN PERSIS filter daftar layanan /layanan:
 * aktif + punya harga + range min/max valid. Empat baris legacy
 * (provider_id=0 / placeholder) lolos filter status saja, makanya range ikut dicek.
 *
 * Difungsi-kan (bukan konstanta module-level) supaya fragmennya bisa dipakai
 * berdampingan dengan prefix tabel lain saat query me-JOIN tabel `services`, dan
 * supaya tidak ada SQL yang dibangun diam-diam saat file ini di-import.
 *
 * Fragment ini selalu dipakai berdampingan dgn ${t.xxx} di query yang me-JOIN tabel
 * `services`, jadi nama kolom tanpa prefix tabel sudah tidak ambigu.
 */
export function orderableServiceSql(t: typeof services = services) {
  return sql`${t.status} = 1 AND ${t.price} > 0 AND ${t.min} > 0 AND ${t.max} > 0`;
}

/** Bentuk baris hasil query kategori + hitungan layanan layak order. */
export type CategoryRow = {
  id: number;
  name: string;
  /** Jumlah layanan dalam kategori ini yang memenuhi orderableServiceSql(). */
  active: number;
  /** Timestamp layanan terbaru di kategori ini (dipakai untuk urutan kesegaran). */
  latestAt?: string | null;
};

export type DecoratedCategory = CategoryRow & {
  /** true = tidak ada satu pun layanan layak order (provider mematikan / belum relist). */
  disabled: boolean;
};

/**
 * Tandai kategori tanpa layanan layak order. Murni (tanpa DB) supaya bisa diuji
 * terpisah. Baris TIDAK ada yang dibuang — ini fungsi pelabelan, bukan filter.
 */
export function decorateCategoryRows(rows: CategoryRow[]): DecoratedCategory[] {
  return rows.map((r) => {
    const active = Number(r.active) || 0;
    return { ...r, active, disabled: active === 0 };
  });
}

/**
 * Dropdown untuk user yang mau membeli: hanya kategori dengan >=1 layanan layak
 * order. Urutan sudah ditentukan di SQL (terbaru dulu), jadi di sini cukup filter.
 */
export function pickBuyableCategories(rows: CategoryRow[]): CategoryRow[] {
  return rows.filter((r) => (Number(r.active) || 0) > 0);
}
