import { db } from "@socio/db";
import { orders, users, balanceLogs, refundRequests } from "@socio/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { logAudit } from "./admin";
import { notifyOrderUpdate } from "./notification";
import { formatRupiah } from "$lib/format";

export async function requestRefund(params: {
  orderId: number;
  amount: number;
  reason: string;
  requestedBy: number;
  ip?: string;
}) {
  const { orderId, amount, reason, requestedBy, ip } = params;
  if (!reason.trim()) throw new Error("Alasan refund wajib diisi.");
  const [o] = await db
    .select({
      status: orders.status,
      userId: orders.userId,
      price: orders.price,
      isRefund: orders.isRefund,
    })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!o) throw new Error("Order tidak ditemukan.");
  if (o.isRefund) throw new Error(`Order #${orderId} sudah di-refund.`);
  if (!o.userId) throw new Error("Order tidak punya user.");

  // Auto-execute langsung — TANPA approval admin kedua.
  // Refund dari status provider (Error/Partial/Canceled) sudah otomatis via cron;
  // refund manual admin pun harus LANGSUNG sampai ke saldo konsumen tanpa klik approve.
  const res = await executeRefund({ orderId, amount, requestedBy, reason, ip });

  // Catat di ledger refund_requests (status 'executed') supaya ada riwayat di
  // /admin/refunds — BUKAN sebagai antrean approval.
  await db.insert(refundRequests).values({
    orderId,
    userId: Number(o.userId),
    amount: res.amount,
    reason: reason.trim(),
    requestedBy,
    status: "executed",
    approvedBy: requestedBy,
    executedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return { ...res, auto: true as const };
}

export async function executeRefund(params: {
  orderId: number;
  amount: number;
  requestedBy: number;
  reason?: string;
  ip?: string;
  auto?: boolean;
}) {
  const { orderId, amount, requestedBy, reason, ip } = params;
  const [o] = await db
    .select({
      status: orders.status,
      userId: orders.userId,
      price: orders.price,
      isRefund: orders.isRefund,
    })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!o) throw new Error("Order tidak ditemukan.");
  if (o.isRefund) throw new Error(`Order #${orderId} sudah di-refund.`);
  if (!o.userId) throw new Error("Order tidak punya user.");

  // Guard anti refund ganda berbasis LEDGER, bukan flag. Data prod membuktikan
  // `is_refund` bisa bohong dua arah (flag 0 tapi ledger sudah berisi refund →
  // order diam-diam sudah dibayar kembali). Menorefund lagi = saldo user naik
  // dua kali. Flag 0 + ledger sudah ada refund = TOLAK, jangan kredit ulang.
  const alreadyInLedger = await ledgerRefundSum(Number(o.userId), orderId);
  if (alreadyInLedger > 0)
    throw new Error(
      `Order #${orderId} sudah punya refund ${formatRupiah(alreadyInLedger)} di ledger saldo — refund diblokir (flag is_refund=${o.isRefund}).`,
    );

  const price = Number(o.price) || 0;
  const refundAmount = Math.min(amount, price);
  if (refundAmount <= 0) throw new Error("Nominal refund tidak valid.");

  const [claim]: any[] = await db
    .update(orders)
    .set({ isRefund: 1, price: sql`GREATEST(${orders.price} - ${refundAmount}, 0)` })
    .where(and(eq(orders.id, orderId), eq(orders.isRefund, 0)));
  const affected = Number((Array.isArray(claim) ? claim[0] : claim)?.affectedRows ?? 0);
  if (affected === 0) throw new Error(`Order #${orderId} sudah di-refund proses lain.`);

  await db
    .update(users)
    .set({ balance: sql`${users.balance} + ${refundAmount}` })
    .where(eq(users.id, o.userId));
  await db.insert(balanceLogs).values({
    userId: o.userId,
    type: "ref",
    amount: refundAmount,
    note: `Refund ${params.auto ? "otomatis" : "approved"} oleh admin #${requestedBy} — order #${orderId}${reason ? ` (${reason})` : ""} (${o.status})`,
    createdAt: new Date(),
  });

  await logAudit({
    adminId: requestedBy,
    action: params.auto ? "auto_refund_order" : "execute_refund",
    entity: "order",
    entityId: orderId,
    detail: { userId: o.userId, amount: refundAmount, orderStatus: o.status, reason },
    ip,
  });

  try {
    await notifyOrderUpdate(o.userId, orderId, "Dana order dikembalikan admin");
  } catch {
    /* notif best-effort */
  }

  return { executed: true as const, amount: refundAmount };
}

export async function approveRefund(requestId: number, approvedBy: number, ip?: string) {
  const [req] = await db
    .select()
    .from(refundRequests)
    .where(eq(refundRequests.id, requestId))
    .limit(1);
  if (!req) throw new Error("Refund request tidak ditemukan.");
  if (req.status !== "pending") throw new Error(`Status sudah ${req.status}, tidak bisa approve.`);
  if (req.requestedBy === approvedBy)
    throw new Error("Tidak bisa approve refund sendiri — butuh admin lain.");

  await db
    .update(refundRequests)
    .set({ status: "approved", approvedBy, updatedAt: new Date() })
    .where(eq(refundRequests.id, requestId));
  await logAudit({
    adminId: approvedBy,
    action: "approve_refund",
    entity: "refund_request",
    entityId: requestId,
    detail: { orderId: req.orderId, amount: req.amount },
    ip,
  });

  // Execute after approval
  const res = await executeRefund({
    orderId: req.orderId,
    amount: req.amount,
    requestedBy: approvedBy,
    reason: req.reason,
    ip,
  });
  await db
    .update(refundRequests)
    .set({ status: "executed", executedAt: new Date(), updatedAt: new Date() })
    .where(eq(refundRequests.id, requestId));
  return res;
}

export async function rejectRefund(
  requestId: number,
  rejectedBy: number,
  reason: string,
  ip?: string,
) {
  if (!reason.trim()) throw new Error("Alasan reject wajib.");
  const [req] = await db
    .select()
    .from(refundRequests)
    .where(eq(refundRequests.id, requestId))
    .limit(1);
  if (!req) throw new Error("Refund request tidak ditemukan.");
  if (req.status !== "pending") throw new Error(`Status sudah ${req.status}.`);
  await db
    .update(refundRequests)
    .set({ status: "rejected", approvedBy: rejectedBy, updatedAt: new Date() })
    .where(eq(refundRequests.id, requestId));
  await logAudit({
    adminId: rejectedBy,
    action: "reject_refund",
    entity: "refund_request",
    entityId: requestId,
    detail: { orderId: req.orderId, reason },
    ip,
  });
  return { rejected: true as const };
}

// ── Bukti refund (derived dari ledger saldo) ───────────────────────────────
/**
 * Uang user benar-benar kembali HANYA kalau ada baris `balance_logs` type='ref'
 * untuk order itu. `balance_logs` tidak punya kolom order_id, jadi pencocokan
 * lewat teks note — SEMUA jalur refund menulis "order #<id>":
 *   cron auto-refund : "Pengembalian dana otomatis (Canceled) - order #7"
 *   user cancel      : "Refund cancel order #7"
 *   admin manual     : "Refund approved oleh admin #1 — order #7 (reason)"
 * Batas non-digit di REGEXP supaya "#7" tidak ikut menarik "#70"/"#700".
 *
 * Kenapa bukan `orders.is_refund` saja: flag terbukti bisa salah dua arah (order
 * Success dengan refund kecil di ledger & flag 0; order Canceled flag 1 tapi price
 * tak dipotong). Flag boleh bohong; ledger uang tidak. Label = ledger-first.
 *
 * CATATAN .id: amount disimpan RUPIAH (double), bukan sen — helper nominal di sini
 * mengembalikan Rupiah apa adanya.
 */
export const ledgerRefundAmount = sql<number>`COALESCE((SELECT SUM(bl.amount) FROM balance_logs bl WHERE bl.type = 'ref' AND bl.note REGEXP CONCAT('order #', ${orders.id}, '([^0-9]|$)')), 0)`;

export const ledgerRefundAt = sql<
  string | null
>`(SELECT MAX(bl.created_at) FROM balance_logs bl WHERE bl.type = 'ref' AND bl.note REGEXP CONCAT('order #', ${orders.id}, '([^0-9]|$)'))`;

/** Versi boolean (buat agregat stats admin) — regex-nya TETAP satu sumber. */
export const ledgerRefundExists = sql<boolean>`EXISTS (SELECT 1 FROM balance_logs bl WHERE bl.type = 'ref' AND bl.note REGEXP CONCAT('order #', ${orders.id}, '([^0-9]|$)'))`;

// RefundState, refundStateOf, charged = predikat PURE di @socio/core/refund-state
// (diuji offline refund-state.test.ts). Re-export supaya consumer lama yang import
// dari "$lib/server/refund" tidak berubah.
export { refundStateOf, charged, type RefundState } from "@socio/core/refund-state";

/**
 * Nominal refund yang SUDAH tercatat di ledger saldo untuk order ini (RUPIAH).
 * Sama maksudnya dengan `ledgerRefundAmount` (SQL) tapi tanpa REGEXP — dipakai
 * di JALUR TULIS (cron + refund manual) sebagai guard anti refund ganda.
 * `balance_logs` tidak punya order_id → cocokkan note "order #<id>" dengan
 * lookahead non-digit ("#7" tidak boleh match "#70").
 */
export async function ledgerRefundSum(userId: number, orderId: number): Promise<number> {
  const rows = await db
    .select({ amount: balanceLogs.amount, note: balanceLogs.note })
    .from(balanceLogs)
    .where(and(eq(balanceLogs.userId, userId), eq(balanceLogs.type, "ref")));
  const re = new RegExp(`order #${orderId}(?![0-9])`);
  return rows.reduce((a, r) => (re.test(String(r.note ?? "")) ? a + Number(r.amount ?? 0) : a), 0);
}
