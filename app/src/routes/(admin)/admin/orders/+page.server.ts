import { db } from "@socio/db";
import { orders, users, balanceLogs } from "@socio/db/schema";
import { sql, eq, ne, and, desc } from "drizzle-orm";
import { redirect, fail } from "@sveltejs/kit";
import { logAudit, assertAdmin, assertAdminRate } from "$lib/server/admin";
import { notifyOrderUpdate } from "$lib/server/notification";
import type { PageServerLoad, Actions } from "./$types";

const UPDATABLE_FROM = ["Pending", "Processing", "In progress"];
const UPDATABLE_TO = ["Success", "Error", "Partial", "Processing", "Pending"];
const EDITABLE_STATUS = ["Pending", "Processing", "In progress", "Error", "Partial"];
const REFUNDABLE_STATUS = ["Pending", "Processing", "In progress", "Error", "Partial", "Canceled"];

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user) throw redirect(303, "/login");
  if (locals.user.level !== "Admin") throw redirect(303, "/"); // A-02
  const status = String(url.searchParams.get("status") ?? "");
  const q = String(url.searchParams.get("q") ?? "");
  const rawP = Number(url.searchParams.get("p") ?? 1);
  const page = Number.isFinite(rawP) && rawP >= 1 && rawP <= 1000 ? rawP : 1; // A-15
  const limit = 25;
  const offset = (page - 1) * limit;

  // exclude order milik user level Admin (samakan logika lama: user_id != admin)
  const notAdmin = sql`(${users.level} IS NULL OR ${users.level} <> 'Admin')`;

  const conds = [notAdmin];
  if (status) conds.push(eq(orders.status, status as never));
  if (q)
    conds.push(
      sql`(${orders.id} = ${Number(q) || 0} OR ${users.username} LIKE ${"%" + q + "%"} OR ${orders.serviceName} LIKE ${"%" + q + "%"} OR ${orders.status} LIKE ${"%" + q + "%"})`,
    );
  const where = and(...conds);

  const [rows, totalRow, statRow] = await Promise.all([
    db
      .select({
        id: orders.id,
        userId: orders.userId,
        username: users.username,
        serviceName: orders.serviceName,
        link: orders.data,
        quantity: orders.quantity,
        price: orders.price,
        profit: orders.profit,
        status: orders.status,
        startCount: orders.startCount,
        remains: orders.remains,
        providerId: orders.providerId,
        providerOrderId: orders.providerOrderId,
        isApi: orders.isApi,
        isRefund: orders.isRefund,
        komen: orders.komen,
        apiOrderLog: orders.apiOrderLog,
        apiStatusLog: orders.apiStatusLog,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
      })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .where(where)
      .orderBy(desc(orders.id))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: sql<number>`count(*)` })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .where(where),
    db
      .select({
        successCount: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} = 'Success' THEN 1 ELSE 0 END),0)`,
        successTotal: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} = 'Success' THEN ${orders.price} ELSE 0 END),0)`,
        pendingCount: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} = 'Pending' THEN 1 ELSE 0 END),0)`,
        pendingTotal: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} = 'Pending' THEN ${orders.price} ELSE 0 END),0)`,
        processingCount: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} IN ('Processing','In progress','Refilling') THEN 1 ELSE 0 END),0)`,
        processingTotal: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} IN ('Processing','In progress','Refilling') THEN ${orders.price} ELSE 0 END),0)`,
        errorCount: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} IN ('Canceled','Error','Partial') THEN 1 ELSE 0 END),0)`,
        errorTotal: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} IN ('Canceled','Error','Partial') THEN ${orders.price} ELSE 0 END),0)`,
      })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .where(ne(users.level, "Admin")),
  ]);

  const total = Number(totalRow[0]?.total ?? 0);
  const s = statRow[0];

  return {
    orders: rows,
    status,
    q,
    page,
    total,
    pages: Math.ceil(total / limit),
    stats: {
      success: { count: Number(s.successCount), total: Number(s.successTotal) },
      pending: { count: Number(s.pendingCount), total: Number(s.pendingTotal) },
      processing: { count: Number(s.processingCount), total: Number(s.processingTotal) },
      error: { count: Number(s.errorCount), total: Number(s.errorTotal) },
    },
  };
};

export const actions: Actions = {
  // ubah status order manual (hanya dari status non-final) + notif user + audit
  updateStatus: async ({ request, locals }) => {
    assertAdmin(locals);
    const _rate = await assertAdminRate("order-status", (locals as any).ip ?? "0.0.0.0", 30, 60);
    if (_rate) return _rate;
    const form = await request.formData();
    const id = Number(form.get("id"));
    const status = String(form.get("status") ?? "");
    if (!Number.isFinite(id) || id <= 0) return fail(400, { error: "ID order tidak valid." });
    if (!UPDATABLE_TO.includes(status)) return fail(400, { error: "Status tidak valid." });

    const [o] = await db
      .select({ status: orders.status, userId: orders.userId })
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);
    if (!o) return fail(404, { error: "Order tidak ditemukan." });
    if (!UPDATABLE_FROM.includes(o.status))
      return fail(400, { error: `Order status "${o.status}" tidak bisa diubah manual.` });

    await db
      .update(orders)
      .set({ status: status as never })
      .where(eq(orders.id, id));
    if (o.userId) await notifyOrderUpdate(o.userId, id, status);
    await logAudit({
      adminId: Number(locals.user.id),
      action: "update_order_status",
      entity: "order",
      entityId: id,
      detail: { from: o.status, to: status },
      ip: (locals as any).ip,
    });
    return { success: `Order #${id} → ${status}.` };
  },

  // edit detail provider (provider_order_id, start_count, remains) + audit
  editProvider: async ({ request, locals }) => {
    assertAdmin(locals);
    const _rate = await assertAdminRate("order-edit", (locals as any).ip ?? "0.0.0.0", 30, 60);
    if (_rate) return _rate;
    const form = await request.formData();
    const id = Number(form.get("id"));
    const providerOrderId = String(form.get("providerOrderId") ?? "").trim();
    const startCount = Number(form.get("startCount") ?? 0);
    const remains = Number(form.get("remains") ?? 0);
    if (!Number.isFinite(id) || id <= 0) return fail(400, { error: "Order tidak valid." });
    if (!Number.isFinite(startCount) || startCount < 0)
      return fail(400, { error: "Start count harus >= 0." });
    if (!Number.isFinite(remains) || remains < 0)
      return fail(400, { error: "Remains harus >= 0." });

    const [o] = await db
      .select({ status: orders.status })
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);
    if (!o) return fail(404, { error: "Order tidak ditemukan." });
    if (!EDITABLE_STATUS.includes(o.status))
      return fail(400, { error: `Order status "${o.status}" tidak bisa diedit.` });

    await db.update(orders).set({ providerOrderId, startCount, remains }).where(eq(orders.id, id));
    await logAudit({
      adminId: Number(locals.user.id),
      action: "edit_order_provider",
      entity: "order",
      entityId: id,
      detail: { providerOrderId, startCount, remains },
      ip: (locals as any).ip,
    });
    return { success: `Detail provider order #${id} disimpan.` };
  },

  /**
   * Refund manual per order (G-refund): admin input order ID → dana kembali ke
   * saldo user. Full refund = harga order saat ini; optional `amount` = refund
   * parsial. Idempotent via CAS `WHERE is_refund = 0` (pola sama dgn cron
   * auto-refund) — double-klik / 2 admin tidak bisa refund ganda.
   */
  refund: async ({ request, locals }) => {
    assertAdmin(locals);
    const _rate = await assertAdminRate("order-refund", (locals as any).ip ?? "0.0.0.0", 10, 60);
    if (_rate) return _rate;
    const form = await request.formData();
    const id = Number(form.get("id"));
    const rawAmount = Number(form.get("amount") ?? 0);

    if (!Number.isFinite(id) || id <= 0) return fail(400, { error: "ID order tidak valid." });
    if (!Number.isFinite(rawAmount) || rawAmount < 0)
      return fail(400, { error: "Nominal refund tidak valid." });

    const [o] = await db
      .select({
        status: orders.status,
        userId: orders.userId,
        price: orders.price,
        isRefund: orders.isRefund,
      })
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);
    if (!o) return fail(404, { error: "Order tidak ditemukan." });
    if (o.isRefund) return fail(409, { error: `Order #${id} sudah di-refund sebelumnya.` });
    if (!REFUNDABLE_STATUS.includes(o.status))
      return fail(400, { error: `Order status "${o.status}" tidak bisa di-refund.` });
    if (!o.userId) return fail(400, { error: "Order tidak punya user (API/anonim)." });

    const price = Number(o.price) || 0;
    const refundAmount = rawAmount > 0 ? Math.min(rawAmount, price) : price;
    if (refundAmount <= 0)
      return fail(400, { error: "Harga order 0 — tidak ada dana untuk di-refund." });

    // CAS: klaim is_refund atomik supaya tidak dobel
    const [claim]: any[] = await db
      .update(orders)
      .set({ isRefund: 1, price: sql`GREATEST(${orders.price} - ${refundAmount}, 0)` })
      .where(and(eq(orders.id, id), eq(orders.isRefund, 0)));
    const affected = Number((Array.isArray(claim) ? claim[0] : claim)?.affectedRows ?? 0);
    if (affected === 0) return fail(409, { error: `Order #${id} sudah di-refund proses lain.` });

    await db
      .update(users)
      .set({ balance: sql`${users.balance} + ${refundAmount}` })
      .where(eq(users.id, o.userId));
    await db.insert(balanceLogs).values({
      userId: o.userId,
      type: "ref",
      amount: refundAmount,
      note: `Refund manual oleh admin — order #${id} (${o.status})`,
      createdAt: new Date(),
    });

    await logAudit({
      adminId: Number(locals.user.id),
      action: "manual_refund_order",
      entity: "order",
      entityId: id,
      detail: { userId: o.userId, amount: refundAmount, orderStatus: o.status },
      ip: (locals as any).ip,
    });
    try {
      await notifyOrderUpdate(o.userId, id, "Dana order dikembalikan admin");
    } catch {
      // notif best-effort
    }
    return {
      success: `Order #${id} di-refund ${refundAmount.toLocaleString("id-ID")} ke saldo user #${o.userId}.`,
    };
  },
};
