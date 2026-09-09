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
  else if (filter === "gagal") conditions.push(sql`${orders.status} IN ('Error','Canceled')`);
  else if (filter === "partial") conditions.push(eq(orders.status, "Partial"));

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

  // Counts per tab — tanpa query tambahan berat: hitung dari 30 rows terbaru sudah representatif
  // Untuk total yang akurat, hitung via group-by sekali (ringan, index userId+status)
  const allCounts = await db
    .select({ status: orders.status, c: sql<number>`count(*)` })
    .from(orders)
    .where(eq(orders.userId, userId))
    .groupBy(orders.status);
  const countMap: Record<string, number> = {};
  let totalCount = 0;
  for (const r of allCounts) {
    const k = String(r.status).toLowerCase();
    countMap[k] = (countMap[k] ?? 0) + Number(r.c);
    totalCount += Number(r.c);
  }
  // Normalisasi kategori tab — Partial BUKAN gagal: sebagian order sukses,
  // sisanya direfund. Ini mencegah user Reseller berat melihat "809 gagal"
  // padahal banyak di antaranya sukses parsial.
  const tabCounts = {
    all: totalCount,
    pending: countMap["pending"] ?? 0,
    proses: (countMap["processing"] ?? 0) + (countMap["in progress"] ?? 0),
    selesai: countMap["success"] ?? 0,
    gagal: (countMap["error"] ?? 0) + (countMap["canceled"] ?? 0),
    partial: countMap["partial"] ?? 0,
  };

  // Layanan populer global (top 3 by order, untuk cross-sell di empty state).
  // Join via provider_service_id + provider_id=2 (SMMturk aktif). Orders legacy
  // menyimpan provider ID lama di service_id — tanpa filter provider bisa salah map.
  // Query ringan: aggregate + join 3 services. Hanya saat filter=all & kosong.
  let popular: { id: number; serviceName: string; price: number }[] = [];
  if (filter === "all" && rows.length === 0) {
    try {
      const top = (await db.execute(sql`
        SELECT o.service_id AS sid, COUNT(*) AS c FROM orders o
        WHERE o.provider_id = 2 AND o.service_id > 0
        GROUP BY o.service_id ORDER BY c DESC LIMIT 3
      `)) as any;
      const topRows: any[] = Array.isArray(top?.[0]) ? top[0] : Array.isArray(top) ? top : [];
      const pids = topRows.map((r: any) => Number(r.sid)).filter((n) => n > 0);
      if (pids.length) {
        const svc = await db
          .select({ id: services.id, serviceName: services.serviceName, price: services.price, providerServiceId: services.providerServiceId })
          .from(services)
          .where(and(eq(services.providerId, 2), eq(services.status, 1), sql`${services.providerServiceId} IN (${pids.join(",")})`));
        const order: Record<number, number> = {};
        pids.forEach((id, i) => (order[id] = i));
        const byPid = new Map(svc.map((s) => [Number((s as any).providerServiceId ?? 0), s]));
        popular = pids
          .map((pid) => byPid.get(pid))
          .filter((s): s is NonNullable<typeof s> => !!s)
          .slice(0, 3)
          .map((s) => ({ id: s.id, serviceName: s.serviceName, price: Number(s.price) }));
      }
    } catch {}
  }

  return {
    orders: rows.map((r) => ({ ...r, isRefill: refillMap.get(Number(r.serviceId)) ?? 0 })),
    filter,
    counts: tabCounts,
    popular,
    // UX4.3 — lastUpdate untuk LiveDot timestamp (initial dari server = now)
    lastUpdate: new Date().toISOString(),
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
    if (!order.providerOrderId || order.providerOrderId === "0")
      return fail(400, { error: "Order ini tidak bisa refill otomatis (manual/legacy)." });

    // Cek sudah refill pending
    const [existing] = (await db
      .select()
      .from(sql`refill`)
      .where(eq(sql`order_id`, orderId))
      .limit(1)) as any[];
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

    // Update status + refund saldo (CAS: hanya 1 cancel yang lolos → idempotent)
    const res: any = await db
      .update(orders)
      .set({ status: "Canceled", updatedAt: new Date() })
      .where(and(eq(orders.id, orderId), eq(orders.status, "Pending")));
    const claimed = Array.isArray(res) ? res[0]?.affectedRows : res?.affectedRows;
    if (Number(claimed ?? 1) === 0)
      return fail(400, { error: "Order sedang diproses, tidak bisa dibatalkan" });

    // Refund saldo atomik (fix P0-1: bukan read-then-write)
    await db
      .update(users)
      .set({ balance: sql`${users.balance} + ${Number(order.price)}` })
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
    if (!pending.length)
      return fail(400, { error: "Tidak ada order Pending yang bisa dibatalkan" });

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

    // Refund saldo atomik (fix P0-1: bukan read-then-write)
    if (refunded > 0) {
      await db
        .update(users)
        .set({ balance: sql`${users.balance} + ${refunded}` })
        .where(eq(users.id, userId));
    }
    await db.insert(balanceLogs).values({
      userId,
      type: "ref",
      amount: refunded,
      note: `Mass refund ${pending.length} order dibatalkan`,
      createdAt: new Date(),
    });

    return {
      success: `Refund ${pending.length} order. Saldo +Rp ${refunded.toLocaleString("id-ID")}`,
    };
  },
};
