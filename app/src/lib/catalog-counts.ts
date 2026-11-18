/**
 * catalog-counts.ts — hitungan katalog PER PROVIDER yang MURNI (tanpa DB, tanpa
 * SvelteKit), pola yang sama dengan routing-policy.ts / category-toggle-policy.ts.
 *
 * Letak di `$lib/` (bukan `$lib/server/`) karena KLIEN pun butuh fungsi ini:
 * badge kesehatan + arah toggle dihitung sekali di server, tapi rail
 * /admin/services dan tabel /admin/categories harus membaca keputusan yang SAMA.
 * Guard SvelteKit menolak import `$lib/server/*` dari kode client, jadi modul
 * murni ini sengaja tinggal di luar folder itu. Tidak ada import `@socio/db`
 * di sini — itu tetap di category-admin.ts (pembungkus DB).
 *
 * BUG F13 (port .my 083d0271, 14 Nov 2026) — owner: "/admin/services ko ga
 * relate dengan categorynya". Punca: kedua halaman menghitung `active/total`
 * lintas SEMUA provider, termasuk katalog provider yang sudah tidak melayani.
 * Di .my produksi: 7.677 baris SMMfollows mati duduk di kategori yang sama
 * dengan SMMturk → badge "Partial" palsu + switch rail bicara lain dari tabel.
 * Di .id sisa P9 sudah dibersihkan (kategori dorman-only dihapus), tapi baris
 * provider dorman di kategori CAMPURAN masih ada — celah angka yang sama tetap
 * bisa muncul, jadi port ini defensif sekaligus menyatukan sumber hitungan.
 *
 * Kontrak: SATU fungsi `categoryHealth` dipakai rail /admin/services, tabel
 * /admin/categories, dan band konteks kategori — mustahil tiga tempat itu
 * memberi jawaban berbeda untuk kategori yang sama.
 *
 * Istilah:
 *   - serving  = provider yang BENAR-BENAR melayani kategori ini (routing target
 *                menang, else provider aktif global). Sama persis dengan
 *                `allowedForRouting` yang dipakai jalur order.
 *   - legacy   = baris dari provider lain di kategori itu. Tidak bisa di-order;
 *                hanya ada karena sync lama belum dibersihkan.
 *
 * Adaptasi .id vs .my: ON di .id hanya menghidupkan baris status=0 + bertag
 * [manual-off] (bukan semua baris provider serving), dan OFF hanya mengubah
 * baris aktif. Maka agregat membawa `manualOff` per (kategori,provider) dan
 * `toggleAffected`/`canToggleCategory` mengikuti semantik itu — jujur terhadap
 * planCategoryToggle yang menulis DB.
 */

/** Satu baris agregat `GROUP BY category_id, provider_id`. */
export type ProviderCountRow = {
  categoryId: number;
  providerId: number;
  total: number;
  active: number;
  /** Baris status=0 + note bertag [manual-off] — satu-satunya yang bisa di-ON-kan. */
  manualOff: number;
};

/** Konteks "siapa melayani" — dibaca sekali per request, dipakai semua kategori. */
export type ServingContext = {
  /** Provider aktif global (null = state rusak / belum di-set). */
  activeProviderId: number | null;
  /** categoryId -> providerId untuk kategori yang di-route (isActive=1). */
  routing: Map<number, number>;
};

export type CategoryCounts = {
  /** Semua provider — dipakai sisi OFF toggle + guard hapus (total mentah). */
  total: number;
  active: number;
  /** Provider yang melayani kategori ini; null = tidak ada provider sah. */
  servingProviderId: number | null;
  /** Katalog yang bisa di-order: hanya provider serving. */
  servingTotal: number;
  servingActive: number;
  /** Baris serving yang manual-off — target sisi ON (adaptasi .id). */
  servingManualOff: number;
  /** Katalog provider lain (mati / tidak melayani kategori ini). */
  legacyTotal: number;
  legacyActive: number;
};

/**
 * Provider yang melayani satu kategori. Routing target menang; tanpa routing,
 * ikut provider aktif global. Selaras dengan isProviderAllowedForCategory().
 */
export function servingProviderFor(categoryId: number, ctx: ServingContext): number | null {
  const routed = ctx.routing.get(Number(categoryId));
  if (routed !== undefined) return Number(routed);
  return ctx.activeProviderId ?? null;
}

/**
 * Lipat agregat per-(kategori,provider) menjadi hitungan serving vs legacy.
 * Kategori tanpa satu pun layanan TIDAK muncul di peta — pemanggil pakai
 * `emptyCategoryCounts()` untuk mereka (LEFT JOIN lama memberi 0/0).
 */
export function foldCategoryCounts(
  rows: ProviderCountRow[],
  ctx: ServingContext,
): Map<number, CategoryCounts> {
  const out = new Map<number, CategoryCounts>();
  for (const r of rows) {
    const cid = Number(r.categoryId);
    // provider_id bisa 0/null untuk layanan manual tanpa provider → legacy.
    const pid = Number(r.providerId);
    const total = Number(r.total ?? 0);
    const active = Number(r.active ?? 0);
    const manualOff = Number(r.manualOff ?? 0);
    let c = out.get(cid);
    if (!c) {
      c = {
        total: 0,
        active: 0,
        servingProviderId: servingProviderFor(cid, ctx),
        servingTotal: 0,
        servingActive: 0,
        servingManualOff: 0,
        legacyTotal: 0,
        legacyActive: 0,
      };
      out.set(cid, c);
    }
    c.total += total;
    c.active += active;
    if (c.servingProviderId !== null && pid === c.servingProviderId) {
      c.servingTotal += total;
      c.servingActive += active;
      c.servingManualOff += manualOff;
    } else {
      c.legacyTotal += total;
      c.legacyActive += active;
    }
  }
  return out;
}

/** Kategori kosong (tanpa layanan) — tetap tampil di daftar admin (placeholder). */
export function emptyCategoryCounts(ctx: ServingContext, categoryId: number): CategoryCounts {
  return {
    total: 0,
    active: 0,
    servingProviderId: servingProviderFor(categoryId, ctx),
    servingTotal: 0,
    servingActive: 0,
    servingManualOff: 0,
    legacyTotal: 0,
    legacyActive: 0,
  };
}

export type CategoryHealth = "empty" | "archived" | "off" | "partial" | "on";

/**
 * SATU sumber kebenaran badge kategori. Urutan sengaja:
 *   empty    → tidak punya layanan sama sekali (bisa dihapus)
 *   archived → ada layanan TAPI semuanya dari provider yang tidak melayani.
 *              Bukan "off" — owner tidak bisa menghidupkannya; tindakan yang
 *              benar = route atau hapus.
 *   off      → katalog serving ada, semuanya mati (manual-off / sync)
 *   partial  → SEBAGIAN katalog serving mati ← ini baru "Partial" yang jujur
 *   on       → seluruh katalog serving hidup
 */
export function categoryHealth(c: CategoryCounts): CategoryHealth {
  if (c.total === 0) return "empty";
  if (c.servingTotal === 0) return "archived";
  if (c.servingActive === 0) return "off";
  if (c.servingActive < c.servingTotal) return "partial";
  return "on";
}

/**
 * Anomali terpisah: ada layanan provider TIDAK melayani yang masih status=1.
 * Ini bukan "Partial" — ini bocor katalog (order akan ditolak di checkout).
 * Di produksi .id 0 baris, tapi jangan senyap kalau ia muncul lagi.
 */
export function hasLegacyLeak(c: CategoryCounts): boolean {
  return c.legacyActive > 0;
}

/**
 * Arah toggle yang akan diambil server (`planCategoryToggle` deteksi buta:
 * ada ≥1 baris aktif lintas SEMUA provider → matikan semua). UI wajib pakai
 * fungsi ini supaya switch tidak menjanjikan arah yang berlawanan dengan aksi.
 */
export function toggleWillTurnOff(c: CategoryCounts): boolean {
  return c.active > 0;
}

/**
 * Jumlah baris yang akan berubah — supaya toast admin jujur (adaptasi .id):
 * OFF = baris AKTIF saja (semua provider); ON = baris manual-off provider
 * serving saja. Selaras planCategoryToggle.affected di category-admin.
 */
export function toggleAffected(c: CategoryCounts): number {
  return toggleWillTurnOff(c) ? c.active : c.servingManualOff;
}

/**
 * Bolehkah switch toggle ditampilkan? (adaptasi .id — lebih ketat dari .my
 * yang pakai servingTotal > 0): server menolak ON bila tidak ada baris
 * manual-off dari provider sah (no_serving_services / no_active_provider).
 * Kategori yang semua baris serving-nya mati TANPA tag (dimatikan sync) tidak
 * bisa dihidupkan dari sini — jangan tampil switch yang cuma menghasilkan
 * toast gagal. OFF selalu diizinkan bila masih ada baris aktif.
 * Invariant: canToggleCategory(c) === (planCategoryToggle(...).refuse === null).
 */
export function canToggleCategory(c: CategoryCounts): boolean {
  return toggleWillTurnOff(c) || c.servingManualOff > 0;
}
