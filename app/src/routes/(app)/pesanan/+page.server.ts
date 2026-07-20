import { db } from "@socio/db";
import { orders, services, users, balanceLogs } from "@socio/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { fail } from "@sveltejs/kit";
import { smmturkRefill, smmturkCancel } from "@socio/core/smmturk";
import type { PageServerLoad, Actions } from "./$types";

export const load: PageServerLoad = async ({ url, locals }) => {
  const filter = url.searchParams.get("f") ?? "all";
  const userId = Number(locals.user!.id);

  const conditions = [eq(orders.userId, userId)];
  if (filter === "pending") conditions.push(eq(orders.status, "Pending"));
  else if (filter === "proses")
    conditions.push(sql`${orders.status} IN ('Processing','In progress')`);
  else if (filter === "selesai") conditions.push(eq(orders.status, "Success"));
  else if (filter === "gagal")
    conditions.push(sql`${orders.status} IN ('Error','Canceled','Partial')`);

  const rows = await db
    .select({
      id: orders.id,
      oid: orders.oid,
      serviceName: orders.serviceName,
      data: orders.data,
      quantity: orders.quantity,
      price: orders.price,
      status: orders.status,
      createdAt: orders.createdAt,
      remains: orders.remains,
      serviceId: orders.serviceId,
      providerOrderId: orders.providerOrderId,
    })
    .from(orders)
    .where(and(...conditions))
    .orderBy(desc(orders.createdAt))
    .limit(30);

  // Get isRefill flag per service
  const svcIds = [...new Set(rows.map((r) => Number(r.serviceId)))];
  const svcRows = svcIds.length
    ? await db
        .select({ id: services.id, isRefill: services.isRefill })
        .from(services)
        .where(sql`${services.id} IN (${svcIds.join(",")})`)
    : [];
  const refillMap = new Map(svcRows.map((s) => [s.id, s.isRefill]));

  return {
    orders: rows.map((r) => ({ ...r, isRefill: refillMap.get(Number(r.serviceId)) ?? 0 })),
    filter,
  };
};

export const actions: Actions = {
  refill: async ({ request, locals }) => {
    const form = await request.formData();
    const orderId = Number(form.get("id"));
    if (!orderId) return fail(400, { error: "ID order tidak valid" });

    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, Number(locals.user!.id))))
      .limit(1);
    if (!order) return fail(404, { error: "Order tidak ditemukan" });

    const [svc] = await db
      .select({ isRefill: services.isRefill })
      .from(services)
      .where(eq(services.id, Number(order.serviceId)))
      .limit(1);
    if (!svc?.isRefill) return fail(400, { error: "Layanan ini tidak mendukung refill" });
    if (order.status !== "Success")
      return fail(400, { error: "Hanya order Berhasil yang bisa di-refill" });

    // Cek sudah refill pending
    const [existing] = await db
      .select()
      .from(sql`refill`)
      .where(eq(sql`order_id`, orderId))
      .limit(1) as any[];
    if (existing && existing.status === "Pending")
      return fail(400, { error: "Refill sedang diproses" });

    let refillId = "0";
    try {
      const result = await smmturkRefill([order.providerOrderId]);
      refillId = String(result?.refill ?? result?.order ?? "0");
    } catch (e: any) {
      return fail(500, { error: `Gagal refill: ${e?.message ?? e}` });
    }

    await db.execute(sql`
      INSERT INTO refill (refill_id, order_id, status, api_log, api_log_status, created_at)
      VALUES (${refillId}, ${orderId}, 'Pending', 'web', 'Pending', NOW())
    `);

    return { success: "Refill diajukan. Cek status dalam 5 menit." };
  },

  cancel: async ({ request, locals }) => {
    const form = await request.formData();
    const orderId = Number(form.get("id"));
    if (!orderId) return fail(400, { error: "ID order tidak valid" });

    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, Number(locals.user!.id))))
      .limit(1);
    if (!order) return fail(404, { error: "Order tidak ditemukan" });
    if (order.status !== "Pending")
      return fail(400, { error: "Hanya order Pending yang bisa dibatalkan" });

    // Try cancel di provider (kalau support)
    if (order.providerId !== 1 && order.providerOrderId) {
      try {
        await smmturkCancel([order.providerOrderId]);
      } catch {
        // ignore — masih lanjut refund
      }
    }

    // Update status + refund saldo
    await db
      .update(orders)
      .set({ status: "Canceled", updatedAt: new Date() })
      .where(eq(orders.id, orderId));

    const [u] = await db
      .select({ balance: users.balance })
      .from(users)
      .where(eq(users.id, Number(locals.user!.id)))
      .limit(1);
    const newBal = Number(u?.balance ?? 0) + Number(order.price);
    await db
      .update(users)
      .set({ balance: newBal })
      .where(eq(users.id, Number(locals.user!.id)));

    await db.insert(balanceLogs).values({
      userId: Number(locals.user!.id),
      type: "ref",
      amount: Number(order.price),
      note: `Refund cancel order #${orderId}`,
      createdAt: new Date(),
    });

    return { success: `Order dibatalkan. Saldo dikembalikan Rp ${order.price}` };
  },

  massCancel: async ({ request, locals }) => {
    const form = await request.formData();
    const ids = String(form.get("ids") ?? "")
      .split(",")
      .map((x) => Number(x.trim()))
      .filter(Boolean);
    if (!ids.length) return fail(400, { error: "Pilih minimal 1 order" });

    const userId = Number(locals.user!.id);
    const targets = await db
      .select()
      .from(orders)
      .where(and(eq(orders.userId, userId), sql`${orders.id} IN (${ids.join(",")})`));

    const pending = targets.filter((o) => o.status === "Pending");
    if (!pending.length) return fail(400, { error: "Tidak ada order Pending yang bisa dibatalkan" });

    let refunded = 0;
    for (const o of pending) {
      if (o.providerId !== 1 && o.providerOrderId) {
        try {
          await smmturkCancel([o.providerOrderId]);
        } catch {
          // ignore
        }
      }
      await db
        .update(orders)
        .set({ status: "Canceled", updatedAt: new Date() })
        .where(eq(orders.id, o.id));
      refunded += Number(o.price);
    }

    const [u] = await db
      .select({ balance: users.balance })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    await db
      .update(users)
      .set({ balance: Number(u?.balance ?? 0) + refunded })
      .where(eq(users.id, userId));
    await db.insert(balanceLogs).values({
      userId,
      type: "ref",
      amount: refunded,
      note: `Mass refund ${pending.length} order dibatalkan`,
      createdAt: new Date(),
    });

    return { success: `Refund ${pending.length} order. Saldo +Rp ${refunded.toLocaleString("id-ID")}` };
  },
};
