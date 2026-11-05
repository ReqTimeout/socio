/**
 * Order-placement guard predicates (Fase 1 — Fix 3).
 *
 * Pure decision helpers — TIDAK menyentuh DB/network/uang. Dipakai agar aturan
 * "layanan mana yang boleh di-order" punya SATU definisi yang dipakai jalur
 * submit (action `default` /pesan), load deep-link, dan gate "Pesan lagi" —
 * menutup asimetri historis di mana API v1 sudah filter `status=1` tapi form
 * web tidak, sehingga order #39 lolos ke layanan yang sudah di-disable admin.
 */

/**
 * Layanan boleh di-order HANYA bila barisnya ADA dan `status === 1`.
 * - `null`/`undefined` (dihapus dari katalog) → false.
 * - `status` 0 / non-1 (manual-off, kategori mati, provider mati) → false.
 * Kompatibel kolom `status` yang datang sebagai number ATAU string ("1").
 */
export function serviceIsOrderable(
  svc: { status: number | string | null | undefined } | null | undefined,
): boolean {
  if (!svc) return false;
  return Number(svc.status) === 1;
}

/** Varian longgar utk load deep-link: id diminta tapi layanan tak aktif. */
export function serviceUnavailable(
  serviceId: number,
  svc: { status: number | string | null | undefined } | null | undefined,
): boolean {
  return serviceId > 0 && !serviceIsOrderable(svc);
}
