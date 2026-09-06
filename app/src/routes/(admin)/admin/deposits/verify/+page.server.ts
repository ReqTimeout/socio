import { db } from "@socio/db";
import { deposits, users, adminRoles } from "@socio/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { redirect, fail, error } from "@sveltejs/kit";
import { logAudit, assertAdmin, assertAdminRate } from "$lib/server/admin";
import { can, normalizeRole } from "@socio/core/rbac";
import type { PageServerLoad, Actions } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(303, "/login");
  if ((locals.user as any).level !== "Admin") throw redirect(303, "/");
  const [roleRow] = await db.select({ role: adminRoles.role }).from(adminRoles).where(eq(adminRoles.userId, Number(locals.user!.id))).limit(1);
  const role = normalizeRole(roleRow?.role ?? "admin");
  if (!can(role, "deposits:read")) throw error(403, `Akses ditolak · role kamu: ${role} · butuh: deposits:read`);
  // Only pending with proof image
  const rows = await db
    .select({
      id: deposits.id,
      userId: deposits.userId,
      username: users.username,
      postAmount: deposits.postAmount,
      amount: deposits.amount,
      img: deposits.img,
      createdAt: deposits.createdAt,
      verifiedBy: deposits.verifiedBy,
    })
    .from(deposits)
    .leftJoin(users, eq(deposits.userId, users.id))
    .where(and(eq(deposits.status, "Pending"), sql`${deposits.img} IS NOT NULL AND ${deposits.img} <> ''`))
    .orderBy(desc(deposits.id))
    .limit(50);

  const pendingCount = rows.length;
  const oldest = rows.length ? rows[rows.length - 1].createdAt : null;

  return { deposits: rows, pendingCount, oldest };
};

export const actions: Actions = {
  verify: async ({ request, locals }) => {
    assertAdmin(locals);
    const [roleRow2] = await db.select({ role: adminRoles.role }).from(adminRoles).where(eq(adminRoles.userId, Number(locals.user!.id))).limit(1);
    const role2 = normalizeRole(roleRow2?.role ?? "admin");
    if (!can(role2, "deposits:approve")) return fail(403, { error: "Role kamu tidak bisa verifikasi deposit." });
    const _rate = await assertAdminRate("deposit-verify", (locals as any).ip ?? "0.0.0.0", 30, 60);
    if (_rate) return _rate;
    const form = await request.formData();
    const id = Number(form.get("id"));
    const action = String(form.get("action") ?? "approve"); // approve | reject
    const notes = String(form.get("notes") ?? "").trim();
    if (!Number.isFinite(id) || id <= 0) return fail(400, { error: "ID tidak valid." });
    if (!["approve", "reject"].includes(action)) return fail(400, { error: "Aksi tidak valid." });
    if (action === "reject" && !notes) return fail(400, { error: "Alasan reject wajib." });

    const [d] = await db.select().from(deposits).where(eq(deposits.id, id)).limit(1);
    if (!d) return fail(404, { error: "Deposit tidak ditemukan." });
    if (d.status !== "Pending") return fail(409, { error: `Deposit berstatus ${d.status}.` });

    if (action === "approve") {
      // Reuse confirm logic but with verified fields
      const { users: usersTbl, balanceLogs } = await import("@socio/db/schema");
      const isResellerActivation = d.untukApa === "reseller";
      try {
        await db.transaction(async (tx) => {
          if (d.userId && !isResellerActivation) {
            await tx.update(usersTbl).set({ balance: sql`${usersTbl.balance} + ${Number(d.amount)}` }).where(eq(usersTbl.id, d.userId));
            await tx.insert(balanceLogs).values({ userId: d.userId, type: "dep", amount: Number(d.amount), note: `Deposit BCA dikonfirmasi #${id} (${d.methodName})`, createdAt: new Date() });
          }
          const upd: any = await tx.execute(sql`UPDATE deposits SET status = 'Success', verified_by = ${Number(locals.user!.id)}, verified_at = NOW(), verification_notes = ${notes || null} WHERE id = ${id} AND status = 'Pending'`);
          const affected = Array.isArray(upd) ? Number((upd[0] as any)?.affectedRows ?? 0) : Number((upd as any)?.affectedRows ?? 0);
          if (!affected) throw new Error("DEPOSIT_NOT_PENDING");
        });
      } catch (e: any) {
        if (e?.message === "DEPOSIT_NOT_PENDING") return fail(409, { error: "Deposit sudah diproses." });
        return fail(500, { error: "Gagal verifikasi." });
      }
      if (isResellerActivation && d.userId) {
        try {
          const { activateReseller } = await import("$lib/server/signup");
          await activateReseller(d.userId);
        } catch {}
      }
      await logAudit({ adminId: Number(locals.user!.id), action: "verify_deposit_approve", entity: "deposit", entityId: id, detail: { amount: Number(d.amount), notes }, ip: (locals as any).ip });
      return { success: `Deposit #${id} disetujui.` };
    } else {
      // reject
      const upd: any = await db.execute(sql`UPDATE deposits SET status = 'Canceled', verified_by = ${Number(locals.user!.id)}, verified_at = NOW(), verification_notes = ${notes} WHERE id = ${id} AND status = 'Pending'`);
      const affected = Array.isArray(upd) ? Number((upd[0] as any)?.affectedRows ?? 0) : Number((upd as any)?.affectedRows ?? 0);
      if (!affected) return fail(409, { error: "Deposit sudah diproses." });
      await logAudit({ adminId: Number(locals.user!.id), action: "verify_deposit_reject", entity: "deposit", entityId: id, detail: { notes }, ip: (locals as any).ip });
      return { success: `Deposit #${id} ditolak.` };
    }
  },
};
