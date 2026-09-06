import { db } from "@socio/db";
import { orders, users } from "@socio/db/schema";
import { eq } from "drizzle-orm";
import { redirect, fail } from "@sveltejs/kit";
import { logAudit, assertAdmin, assertAdminRate } from "$lib/server/admin";
import type { PageServerLoad, Actions } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(303, "/login");
  if ((locals.user as any).level !== "Admin") throw redirect(303, "/");
  return {};
};

export const actions: Actions = {
  create: async ({ request, locals }) => {
    assertAdmin(locals);
    const _rate = await assertAdminRate("order-manual-create", (locals as any).ip ?? "0.0.0.0", 10, 60);
    if (_rate) return _rate;
    const form = await request.formData();
    const targetUser = String(form.get("username") ?? form.get("userId") ?? "").trim();
    const serviceName = String(form.get("serviceName") ?? "").trim();
    const link = String(form.get("link") ?? "").trim();
    const qty = Number(form.get("quantity") ?? 0);
    const price = Number(form.get("price") ?? 0);
    const notes = String(form.get("manualNotes") ?? "").trim();
    const isManual = form.get("isManual") === "1";

    if (!isManual) return fail(400, { error: "Toggle manual harus aktif." });
    if (!notes) return fail(400, { error: "Catatan manual wajib — kenapa order ini tidak lewat provider." });
    if (!targetUser) return fail(400, { error: "Username / user ID wajib." });
    if (!serviceName) return fail(400, { error: "Nama layanan wajib." });
    if (!link) return fail(400, { error: "Link wajib." });
    if (!Number.isFinite(qty) || qty <= 0) return fail(400, { error: "Quantity tidak valid." });
    if (!Number.isFinite(price) || price < 0) return fail(400, { error: "Harga tidak valid." });

    // Resolve user by id or username
    let userId: number | null = null;
    if (/^\d+$/.test(targetUser)) {
      userId = Number(targetUser);
      const [u] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
      if (!u) return fail(404, { error: "User ID tidak ditemukan." });
    } else {
      const [u] = await db.select({ id: users.id }).from(users).where(eq(users.username, targetUser)).limit(1);
      if (!u) return fail(404, { error: `Username @${targetUser} tidak ditemukan.` });
      userId = Number(u.id);
    }

    const now = new Date();
    const [res] = await db
      .insert(orders)
      .values({
        userId,
        oid: `MANUAL-${Date.now()}`,
        sid: "manual",
        providerOrderId: `MANUAL-${Date.now()}`,
        user: targetUser,
        serviceName,
        serviceId: 0,
        data: link,
        komen: "",
        quantity: Math.round(qty),
        remains: 0,
        startCount: 0,
        price: Math.round(price),
        profit: 0,
        status: "Success",
        date: now.toISOString().slice(0, 10),
        time: now.toTimeString().slice(0, 8),
        createdAt: now,
        updatedAt: now,
        providerId: 0,
        isApi: 0,
        isRefund: 0,
        isManual: 1,
        manualNotes: notes,
      } as any)
      .$returningId?.() as any;

    // Drizzle mysql may not return id via $returningId — fallback select last insert
    const insertedId = (res as any)?.id ?? (await db.select({ id: orders.id }).from(orders).where(eq(orders.oid, `MANUAL-${Date.now()}`)).limit(1).then(r=>r[0]?.id) ?? null);

    await logAudit({
      adminId: Number(locals.user!.id),
      action: "manual_order_created",
      entity: "order",
      entityId: insertedId ?? undefined,
      detail: { userId, serviceName, link, quantity: qty, price, notes },
      ip: (locals as any).ip,
    });

    return { success: `Order manual #${insertedId ?? "?"} dibuat untuk @${targetUser} — ${serviceName} — Rp${price.toLocaleString("id-ID")} (skip provider).` };
  },
};
