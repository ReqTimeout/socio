import { db } from "@socio/db";
import { users, balanceLogs } from "@socio/db/schema";
import { sql, eq, like, desc } from "drizzle-orm";
import { redirect, fail } from "@sveltejs/kit";
import { logAudit } from "$lib/server/admin";
import type { PageServerLoad, Actions } from "./$types";

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user) throw redirect(303, "/login");
  const q = String(url.searchParams.get("q") ?? "");
  const page = Math.max(1, Number(url.searchParams.get("p") ?? 1));
  const limit = 20;
  const offset = (page - 1) * limit;

  const where = q ? like(users.username, `%${q}%`) : undefined;
  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
      fullName: users.fullName,
      level: users.level,
      balance: users.balance,
      status: users.status,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(where)
    .orderBy(desc(users.id))
    .limit(limit)
    .offset(offset);

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)` })
    .from(users)
    .where(where);

  return { users: rows, q, page, total, pages: Math.ceil(Number(total) / limit) };
};

export const actions: Actions = {
  adjust: async ({ request, locals }) => {
    const form = await request.formData();
    const id = Number(form.get("id"));
    const amount = Number(form.get("amount"));
    const reason = String(form.get("reason") ?? "");
    if (!id || !amount || !reason) return fail(400, { error: "Semua field wajib diisi." });

    const [u] = await db
      .select({ balance: users.balance, username: users.username })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    if (!u) return fail(404, { error: "User tidak ditemukan." });

    const before = Number(u.balance);
    const after = before + amount;
    await db.update(users).set({ balance: after }).where(eq(users.id, id));
    await db.insert(balanceLogs).values({
      userId: id,
      type: "adj",
      amount,
      note: `Adjust by admin: ${reason}`,
      createdAt: new Date(),
    });

    await logAudit({
      adminId: Number(locals.user!.id),
      action: "adjust_balance",
      entity: "user",
      entityId: id,
      detail: { from: before, to: after, reason },
      ip: (locals as any).ip,
    });
    return { success: `Saldo ${u.username} ${amount >= 0 ? "+" : ""}${amount}.` };
  },

  suspend: async ({ request, locals }) => {
    const form = await request.formData();
    const id = Number(form.get("id"));
    const [u] = await db
      .select({ status: users.status, username: users.username })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    if (!u) return fail(404, { error: "User tidak ditemukan." });
    const next = u.status === "1" ? "0" : "1";
    await db.update(users).set({ status: next }).where(eq(users.id, id));
    await logAudit({
      adminId: Number(locals.user!.id),
      action: "suspend_user",
      entity: "user",
      entityId: id,
      detail: { from: u.status, to: next },
      ip: (locals as any).ip,
    });
    return { success: `${u.username} → ${next}.` };
  },
};
