import { db } from "@socio/db";
import { orders, users } from "@socio/db/schema";
import { sql, eq, ne, and, desc } from "drizzle-orm";
import { redirect, fail } from "@sveltejs/kit";
import { logAudit } from "$lib/server/admin";
import { notifyOrderUpdate } from "$lib/server/notification";
import type { PageServerLoad, Actions } from "./$types";

// status yang boleh diubah manual (samakan admin lama)
const UPDATABLE_FROM = ["Pending", "Processing", "In progress"];
const UPDATABLE_TO = ["Success", "Error", "Partial", "Processing", "Pending"];
const EDITABLE_STATUS = ["Pending", "Processing", "In progress", "Error", "Partial"];

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user) throw redirect(303, "/login");
  const status = String(url.searchParams.get("status") ?? "");
  const q = String(url.searchParams.get("q") ?? "");
  const page = Math.max(1, Number(url.searchParams.get("p") ?? 1));
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
    const form = await request.formData();
    const id = Number(form.get("id"));
    const status = String(form.get("status") ?? "");
    if (!id || !UPDATABLE_TO.includes(status)) return fail(400, { error: "Status tidak valid." });

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
      adminId: Number(locals.user!.id),
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
    const form = await request.formData();
    const id = Number(form.get("id"));
    const providerOrderId = String(form.get("providerOrderId") ?? "").trim();
    const startCount = Number(form.get("startCount") ?? 0);
    const remains = Number(form.get("remains") ?? 0);
    if (!id) return fail(400, { error: "Order tidak valid." });
    if (Number.isNaN(startCount) || Number.isNaN(remains))
      return fail(400, { error: "Start count / remains harus angka." });

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
      adminId: Number(locals.user!.id),
      action: "edit_order_provider",
      entity: "order",
      entityId: id,
      detail: { providerOrderId, startCount, remains },
      ip: (locals as any).ip,
    });
    return { success: `Detail provider order #${id} disimpan.` };
  },
};
