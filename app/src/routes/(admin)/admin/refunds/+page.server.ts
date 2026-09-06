import { db } from "@socio/db";
import { refundRequests, orders, users, adminRoles } from "@socio/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { redirect, fail } from "@sveltejs/kit";
import { assertAdmin, assertAdminRate } from "$lib/server/admin";
import { approveRefund, rejectRefund } from "$lib/server/refund";
import { can, normalizeRole } from "@socio/core/rbac";
import type { PageServerLoad, Actions } from "./$types";

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user) throw redirect(303, "/login");
  if ((locals.user as any).level !== "Admin") throw redirect(303, "/");

  const filter = String(url.searchParams.get("filter") ?? "pending");
  const where = filter === "all" ? undefined : eq(refundRequests.status, filter as any);

  const pendingCountRow = await db.select({ c: sql<number>`count(*)` }).from(refundRequests).where(eq(refundRequests.status, "pending"));
  const pendingCount = Number(pendingCountRow[0]?.c ?? 0);

  const rows = await db
    .select({
      id: refundRequests.id,
      orderId: refundRequests.orderId,
      userId: refundRequests.userId,
      amount: refundRequests.amount,
      reason: refundRequests.reason,
      requestedBy: refundRequests.requestedBy,
      status: refundRequests.status,
      approvedBy: refundRequests.approvedBy,
      createdAt: refundRequests.createdAt,
      orderService: orders.serviceName,
      username: users.username,
    })
    .from(refundRequests)
    .leftJoin(orders, eq(refundRequests.orderId, orders.id))
    .leftJoin(users, eq(refundRequests.userId, users.id))
    .where(where as any)
    .orderBy(desc(refundRequests.id))
    .limit(50);

  return { filter, pendingCount, requests: rows };
};

export const actions: Actions = {
  approve: async ({ request, locals }) => {
    assertAdmin(locals);
    const form = await request.formData();
    const id = Number(form.get("id"));
    if (!Number.isFinite(id)) return fail(400, { error: "ID tidak valid." });
    const [roleRow] = await db.select({ role: adminRoles.role }).from(adminRoles).where(eq(adminRoles.userId, Number(locals.user!.id))).limit(1);
    const role = normalizeRole(roleRow?.role ?? "admin");
    if (!can(role, "refund:approve")) return fail(403, { error: "Role kamu tidak bisa approve refund." });
    try {
      await approveRefund(id, Number(locals.user!.id), (locals as any).ip);
      return { success: `Refund #${id} disetujui & dieksekusi.` };
    } catch (e: any) {
      return fail(400, { error: e?.message ?? "Gagal approve." });
    }
  },
  reject: async ({ request, locals }) => {
    assertAdmin(locals);
    const form = await request.formData();
    const id = Number(form.get("id"));
    const reason = String(form.get("reason") ?? "").trim();
    if (!Number.isFinite(id)) return fail(400, { error: "ID tidak valid." });
    const [roleRow] = await db.select({ role: adminRoles.role }).from(adminRoles).where(eq(adminRoles.userId, Number(locals.user!.id))).limit(1);
    const role = normalizeRole(roleRow?.role ?? "admin");
    if (!can(role, "refund:reject")) return fail(403, { error: "Role kamu tidak bisa reject refund." });
    try {
      await rejectRefund(id, Number(locals.user!.id), reason, (locals as any).ip);
      return { success: `Refund #${id} ditolak.` };
    } catch (e: any) {
      return fail(400, { error: e?.message ?? "Gagal reject." });
    }
  },
};
