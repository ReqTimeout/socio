/**
 * routing-policy.ts — keputusan routing per-kategori MURNI (tanpa DB, tanpa
 * SvelteKit, tanpa network).
 *
 * Dipakai bersama oleh:
 *   - server helper `$lib/server/active-provider` (gate order: siapa boleh
 *     melayani kategori ini) dan `$lib/server/category-routing` (halaman
 *     /admin/routing + rekonsiliasi status layanan).
 *   - selftest `packages/core/test/routing-policy.test.ts`.
 *
 * Memisahkan keputusan dari I/O supaya perilaku "siapa melayani kategori" +
 * "layanan mana yang di-flip" bisa diuji tanpa database — penting karena jalur
 * ini menyentuh uang (order) dan admin (katalog).
 *
 * Kontrak [manual-off]: layanan bertag [manual-off] adalah milik owner (dimatikan
 * manual) → routing TIDAK boleh mengaktifkannya kembali; tapi layanan provider
 * non-pemenang yang di-disable OLEH ROUTING tidak diberi tag (lepas routing =
 * status default dipulihkan).
 */

/** Tag status "dimatikan manual oleh owner" — sumber tunggal (kontrak F2). */
export const MANUAL_OFF_TAG = "[manual-off]";

export type ServingState = "routed" | "active-global" | "off-manual" | "inactive";

/**
 * Keputusan label "siapa melayani kategori ini" untuk badge / filter admin.
 * Prioritas: routed > active-global > off-manual > inactive.
 *   - routed        → ada baris category_provider_routing (provider eksplisit).
 *   - active-global → tidak diroute, provider-nya = provider aktif global.
 *   - off-manual    → punya layanan, semua mati, semuanya bertag [manual-off].
 *   - inactive      → sisanya (provider bukan aktif & tidak diroute).
 */
export function deriveServingState(input: {
  routingProviderId: number | null;
  providerIds: number[];
  activeId: number | null;
  total: number;
  active: number;
  manualOff: number;
}): ServingState {
  if (input.routingProviderId !== null) return "routed";
  if (input.activeId !== null && input.providerIds.includes(input.activeId)) return "active-global";
  if (input.total > 0 && input.active === 0 && input.manualOff === input.total) return "off-manual";
  return "inactive";
}

/** Bentuk minimal satu baris layanan yang dibutuhkan rencana rekonsiliasi. */
export type ReconcileSvc = {
  id: number;
  providerId: number;
  note: string | null;
  status: number;
};

/**
 * Rencana rekonsiliasi status layanan satu kategori setelah routing diubah.
 * `winner` = provider yang seharusnya melayani (assign → providerId; unassign →
 * provider aktif global, boleh null kalau tidak ada). Hanya baris yang benar-benar
 * perlu flip yang dikembalikan, jadi pemanggil bisa UPDATE presisi + hitung
 * `affected` = perubahan nyata.
 *   enable → layanan provider-pemenang yang belum aktif DAN tidak bertag [manual-off].
 *   disable→ layanan provider BUKAN pemenang yang masih aktif.
 */
export function planReconcile(
  services: ReconcileSvc[],
  winner: number | null,
): { enable: number[]; disable: number[] } {
  const manualOff = (note: string | null) => !!note && note.includes(MANUAL_OFF_TAG);
  const enable: number[] = [];
  const disable: number[] = [];
  for (const s of services) {
    const owned = winner !== null && s.providerId === winner;
    if (owned) {
      if (!manualOff(s.note) && s.status !== 1) enable.push(s.id);
    } else if (s.status === 1) {
      disable.push(s.id);
    }
  }
  return { enable, disable };
}

/**
 * Predikat MURNI (bolehkah providerId melayani kategori?) — dipakai
 * active-provider.isProviderAllowedForCategory (satu sumber, teruji selftest):
 *   - routed !== undefined → kategori diroute: HANYA provider target routing.
 *   - routed undefined → aturan default satu-aktif: hanya provider aktif global.
 */
export function allowedForRouting(
  providerId: number,
  routed: number | undefined,
  active: number | null,
): boolean {
  if (routed !== undefined) return routed === providerId;
  return active !== null && active === providerId;
}

/**
 * KELAS BOCOR kategori BARU (port .my 899a5b2b, gap-plan P2.4 — MOOT routing=0):
 * routing per-kategori hanya berisi kategori yang SUDAH ada saat aktivasi. Ketika
 * provider menambah kategori baru yang kind-nya sudah dilayani provider lain lewat
 * routing (contoh: SMMturk menambah "TikTok Likes | Refill Button Active" sementara
 * seluruh likes TikTok sudah dirutekan ke provider lain), kategori baru itu tidak
 * punya baris routing → ikut aturan satu-aktif → order lari ke provider yang sedang
 * dihindari owner.
 *
 * Predikat MURNI: true bila signature kategori baru itu sudah diklaim provider
 * LAIN lewat routing. Konservatif di jalur uang: kalau provider ini sendiri JUGA
 * punya kategori routed ber-signature sama (owner sengaja membagikan kind itu ke
 * dua provider), layanan barunya TIDAK disuppress.
 *
 * Pemanggil WAJIB hanya memakai fungsi ini untuk kategori yang tidak punya baris
 * routing sendiri (kasus itu sudah ditangani allowedForRouting), dan tidak untuk
 * kategori yang seluruh layanannya sudah manual-off (sudah ditangani catState).
 * Signature "generic"/platform tidak dikenal = null → selalu false, jadi
 * Coins/Ads/Emergency Server yang sengaja KEEP tidak pernah tersapu.
 */
export function coveredByOtherProviderRouting(
  signature: string | null,
  routedSignatures: Map<string, Set<number>>,
  providerId: number,
): boolean {
  if (!signature) return false;
  const owners = routedSignatures.get(signature);
  if (!owners || owners.size === 0) return false;
  if (owners.has(providerId)) return false; // kind ini juga milik kita → jangan suppress
  return owners.size > 0; // seluruh pemilik kind = provider lain
}
