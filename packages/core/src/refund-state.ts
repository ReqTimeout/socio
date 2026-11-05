/**
 * Refund state — keputusan LABEL refund, Sumber kebenaran = ledger saldo
 * (balance_logs type 'ref'), BUKAN flag orders.is_refund.
 *
 * Kenapa flag tidak bisa dipercaya (dibuktikan data produksi, port dari socio.my):
 *   - order Success, is_refund=0, TAPI ada refund kecil di ledger  → flag bohong
 *     ke bawah (sudah dibayar kembali, tak ditandai).
 *   - order Canceled, is_refund=1, TAPI price tidak dipotong        → flag bohong
 *     ke atas (ditandai refund, saldo belum tentu kembali).
 * Flag boleh salah dua arah; ledger uang tidak pernah. Maka label = ledger-first,
 * dan flag tetap dipakai untuk menandai anomali ("flag-no-ledger").
 *
 * ⚠ Modul PURE — tanpa db, tanpa import server. Nominal di .id = RUPIAH (double),
 * bukan sen (socio.my). Skala tidak mengubah logika rekonstruksi.
 */

export type RefundState = "refunded" | "flag-no-ledger" | "pending" | "none";

/** Status final yang berarti order TIDAK terisi penuh → seharusnya di-refund. */
const FINAL_UNFULFILLED = ["Canceled", "Error", "Partial"];

/**
 * refundState — status refund untuk LABEL (admin list/detail + sheet user).
 *  refunded       = ledger membuktikan saldo user bertambah
 *  flag-no-ledger = is_refund=1 tapi tidak ada catatan saldo → selidiki
 *  pending        = order gagal/batal & belum ada refund → cron 15 menit akan proses
 *  none           = tidak relevan (Pending/Processing/Success tanpa refund)
 */
export function refundStateOf(o: {
  status: string;
  isRefund?: number | boolean | null;
  refundedLedger?: number | null;
}): RefundState {
  const ledger = Number(o.refundedLedger ?? 0);
  if (ledger > 0) return "refunded";
  if (Number(o.isRefund ?? 0) === 1) return "flag-no-ledger";
  if (FINAL_UNFULFILLED.includes(String(o.status))) return "pending";
  return "none";
}

/**
 * Nominal yang sebenarnya dibayar user (RUPIAH), untuk label "Dibayar".
 * `orders.price` sudah tidak konsisten antar jalur refund (cron/admin zeroes
 * price; user-cancel meninggalkan price), jadi direkonstruksi:
 *  price=0 & ada refund  → refund-lah harga awalnya (refund penuh)
 *  refund == price       → cancel user: price belum dikurangi → price itu harga awal
 *  selain itu (Partial)  → price = sisa yang tidak direfund → jumlahkan
 */
export function charged(price: number, refundedLedger: number): number {
  const p = Number(price ?? 0);
  const r = Number(refundedLedger ?? 0);
  if (p === 0) return r;
  if (r === p) return p;
  return p + r;
}
