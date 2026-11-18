/**
 * F1 — Fold bukti refund dari ledger saldo untuk LIST order (pesanan user +
 * admin/orders). Pengganti subquery REGEXP terkait per baris yang bikin query
 * list ~7 detik (tiap baris order men-scan balance_logs penuh).
 *
 * Semantik WAJIB identik dengan SQL lama:
 *   SUM(bl.amount)  WHERE bl.type='ref' AND bl.note REGEXP 'order #<id>([^0-9]|$)'
 *   MAX(bl.created_at) dengan filter yang sama.
 * Batas non-digit: "#7" tidak boleh menarik "#70"/"#700". Flag `i` meniru
 * collation ci REGEXP MySQL (note legacy bisa beda kapitalisasi).
 *
 * Kenapa fold per user aman (SQL lama tanpa filter user): SEMUA penulis ledger
 * 'ref' memakai userId pemilik order (cron/refund.ts ×2 + executeRefund), dan
 * probe prod 18 Nov 2026: 0 baris ref yang user_id-nya beda dengan order-nya.
 * Jadi memfilter ledger by user halaman lalu mencocokkan note per order memberi
 * hasil yang sama persis — dengan SATU query ber-index user_id, bukan N scan.
 *
 * Ledger-first tetap: flag orders.is_refund boleh bohong dua arah (lihat
 * refund-state.ts); modul ini hanya merekonstruksi bukti ledger, bukan label.
 * Nominal .id = RUPIAH (double), bukan sen.
 *
 * ⚠ Modul PURE — tanpa db, tanpa import server. Diuji offline refund-ledger.test.ts.
 */

export type LedgerRefundRow = {
  userId: number;
  amount: number | string | null;
  note: string | null;
  createdAt: Date | string | null;
};

export type OrderRefundKey = { id: number; userId: number };

export type RefundLedgerProof = {
  /** Total nominal refund tercatat di ledger (RUPIAH); 0 = belum ada bukti. */
  refundedLedger: number;
  /** created_at baris ref terbaru yang match; null = belum ada bukti. */
  refundedAt: Date | string | null;
};

/**
 * Cocokkan baris ledger 'ref' ke order lewat note "order #<id>", lalu jumlahkan
 * amount + ambil created_at terbaru per order. Setiap order key SELALU punya
 * entri hasil (default {0, null}) supaya pemanggil tidak perlu fallback ganda.
 */
export function foldRefundLedger(
  orderKeys: readonly OrderRefundKey[],
  ledgerRows: readonly LedgerRefundRow[],
): Map<number, RefundLedgerProof> {
  const byUser = new Map<number, LedgerRefundRow[]>();
  for (const row of ledgerRows) {
    const uid = Number(row.userId);
    if (!Number.isFinite(uid)) continue;
    const list = byUser.get(uid);
    if (list) list.push(row);
    else byUser.set(uid, [row]);
  }

  const out = new Map<number, RefundLedgerProof>();
  for (const key of orderKeys) {
    const id = Number(key.id);
    const proof: RefundLedgerProof = { refundedLedger: 0, refundedAt: null };
    out.set(id, proof);
    if (!Number.isFinite(id) || id <= 0) continue;
    const rows = byUser.get(Number(key.userId));
    if (!rows?.length) continue;
    const re = new RegExp(`order #${id}(?![0-9])`, "i");
    let maxTime = -Infinity;
    for (const row of rows) {
      if (!re.test(String(row.note ?? ""))) continue;
      proof.refundedLedger += Number(row.amount ?? 0) || 0;
      const t = row.createdAt == null ? NaN : new Date(row.createdAt).getTime();
      if (Number.isFinite(t) && t > maxTime) {
        maxTime = t;
        // Pertahankan nilai asli (Date dari Drizzle) — bentuk payload lama
        // MAX(created_at) juga Date, jadi UI (fmtDate) tidak berubah.
        proof.refundedAt = row.createdAt;
      }
    }
  }
  return out;
}
