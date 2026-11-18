/**
 * category-toggle-policy.ts — keputusan toggle kategori MURNI (tanpa DB, tanpa
 * SvelteKit), pola yang sama dengan routing-policy.ts.
 *
 * Dipakai oleh `category-admin.setCategoryStatus` / `toggleCategoryStatus`
 * (satu-satunya sumber untuk /admin/categories dan rail /admin/services) dan
 * unit harness (packages/core/test/category-toggle-policy). Keputusan dipisah
 * dari I/O karena ini jalur admin yang bisa menghidupkan katalog — hanya
 * fungsi murni yang bisa diuji tanpa DB.
 *
 * BUG F2 (port .my 82b52f11, 13 Nov 2026): cabang enable dulu UPDATE tanpa
 * filter provider → satu klik "Enable" menghidupkan SEMUA layanan kategori
 * termasuk provider yang tidak melayani. Di .id sisi ON sudah lebih ketat
 * (hanya status=0 + tag [manual-off] yang hidup lagi), tapi tetap tanpa filter
 * provider — layanan bertag dari provider dorman/campuran bisa ikut hidup.
 * Port ini menutup celah itu (defensif; routing .id = 0 pasca-P8).
 *
 * Kontrak:
 *   - OFF → matikan layanan AKTIF kategori (semua provider) + tag. Tidak pernah
 *     refuse: provider rusak tidak boleh menjebak admin (aksi selamat).
 *   - ON  → HANYA layanan manual-off dari provider yang sah: routing target
 *     menang, else provider aktif global. Provider lain tetap mati.
 *   - Tidak ada provider sah / tidak ada baris memenuhi → TOLAK; pemanggil
 *     tidak boleh menulis DB (invariant: refuse ≠ null ⇒ affected = 0).
 *
 * Adaptasi .id vs .my: OFF hanya mengubah baris status=1 (bukan semua baris),
 * ON hanya baris status=0 + bertag manual-off — maka ToggleSvc membawa flag
 * manualOff dan `affected` menghitung baris yang BENAR-BENAR berubah di .id
 * (toast/audit admin jujur).
 */

/** Bentuk minimal satu baris layanan yang dibutuhkan keputusan toggle. */
export type ToggleSvc = { providerId: number; status: number; manualOff: boolean };

export type ToggleRefusal = "no_active_provider" | "no_serving_services";

export type TogglePlan = {
  /** true = matikan semua provider; false = hidupkan provider sah saja. */
  turnedOff: boolean;
  /**
   * Provider yang bisa dihidupkan. null bila off (semua provider dimatikan)
   * atau bila refuse — pemanggil memakai null sebagai "WHERE kategori saja",
   * jadi WAJIB periksa `refuse` dahulu.
   */
  allowedProvider: number | null;
  /** Jumlah baris yang benar-benar berubah — supaya toast/audit admin jujur. */
  affected: number;
  /** Bukan null = pemanggil WAJIB tolak dan tidak menulis DB. */
  refuse: ToggleRefusal | null;
};

/**
 * `routed` = target `category_provider_routing` untuk kategori ini (undefined
 * bila tidak ada baris routing). `active` = provider aktif global (null bila
 * state rusak / belum di-set). `mode` opsional: bila diisi, menimpa deteksi
 * buta (dipakai jalur bulk ON/OFF eksplisit .id); tanpa mode, deteksi dari
 * kondisi sekarang: ada ≥1 layanan aktif → matikan semua.
 */
export function planCategoryToggle(
  svcs: ToggleSvc[],
  routed: number | undefined,
  active: number | null,
  mode?: "on" | "off",
): TogglePlan {
  const turnedOff = mode !== undefined ? mode === "off" : svcs.some((s) => Number(s.status) === 1);
  if (turnedOff) {
    // Sisi off tidak difilter provider: mematikan semua = selamat. Di .id hanya
    // baris aktif yang berubah (baris mati tanpa tag dibiarkan apa adanya).
    const affected = svcs.filter((s) => Number(s.status) === 1).length;
    return { turnedOff: true, allowedProvider: null, affected, refuse: null };
  }

  const allowedProvider = routed !== undefined ? routed : active;
  if (allowedProvider === null || allowedProvider === undefined) {
    return { turnedOff: false, allowedProvider: null, affected: 0, refuse: "no_active_provider" };
  }

  // ON .id: hanya status=0 + bertag manual-off dari provider sah. routed=0
  // (baris routing rusak) tidak match provider mana pun → refuse, bukan jatuh
  // balik ke aktif global.
  const affected = svcs.filter(
    (s) => Number(s.providerId) === allowedProvider && Number(s.status) === 0 && s.manualOff,
  ).length;
  return {
    turnedOff: false,
    allowedProvider,
    affected,
    // Kategori ada dan ada layanan, tapi tidak satu pun baris memenuhi (mis.
    // kategori provider dorman, atau semua mati tanpa tag). Jangan tulis UPDATE
    // yang mengubah 0 baris lalu lapor "enabled" — tolak dengan sebab jelas.
    refuse: affected === 0 ? "no_serving_services" : null,
  };
}
