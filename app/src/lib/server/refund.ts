import { db } from "@socio/db";
import { orders, users, balanceLogs, refundRequests } from "@socio/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { logAudit } from "./admin";
import { notifyOrderUpdate } from "./notification";

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
