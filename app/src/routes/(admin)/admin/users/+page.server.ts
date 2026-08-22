import { db } from "@socio/db";
import { users, balanceLogs } from "@socio/db/schema";
import { sql, eq, ne, and, desc } from "drizzle-orm";
import { redirect, fail } from "@sveltejs/kit";
import { logAudit } from "$lib/server/admin";
import type { PageServerLoad, Actions } from "./$types";

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user) throw redirect(303, "/login");
  const q = String(url.searchParams.get("q") ?? "");
  const level = String(url.searchParams.get("level") ?? "");
  const status = String(url.searchParams.get("status") ?? ""); // "1" active | "0" suspended
  const verified = String(url.searchParams.get("verified") ?? ""); // "1" yes | "0" no
  const page = Math.max(1, Number(url.searchParams.get("p") ?? 1));
  const limit = 20;
  const offset = (page - 1) * limit;

  const conds = [];
  if (q)
    conds.push(
      sql`(${users.username} LIKE ${"%" + q + "%"} OR ${users.email} LIKE ${"%" + q + "%"} OR ${users.fullName} LIKE ${"%" + q + "%"})`,
    );
  if (level) conds.push(eq(users.level, level as never));
  if (status) conds.push(status === "1" ? eq(users.status, "1") : ne(users.status, "1"));
  if (verified) conds.push(verified === "1" ? eq(users.verify, "Yes") : ne(users.verify, "Yes"));
  const where = conds.length ? and(...conds) : undefined;

  const [rows, totalRow, statRow] = await Promise.all([
    db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        fullName: users.fullName,
        level: users.level,
        balance: users.balance,
        status: users.status,
        verify: users.verify,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(where)
      .orderBy(desc(users.id))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: sql<number>`count(*)` })
      .from(users)
      .where(where),
    db
      .select({
        total: sql<number>`count(*)`,
        active: sql<number>`COALESCE(SUM(CASE WHEN ${users.status} = '1' THEN 1 ELSE 0 END),0)`,
        verified: sql<number>`COALESCE(SUM(CASE WHEN ${users.verify} = 'Yes' THEN 1 ELSE 0 END),0)`,
        balance: sql<number>`COALESCE(SUM(${users.balance}),0)`,
      })
      .from(users)
      .where(ne(users.level, "Admin")),
  ]);

  const total = Number(totalRow[0]?.total ?? 0);
  const s = statRow[0] ?? { total: 0, active: 0, verified: 0, balance: 0 };
  const stats = {
    total: Number(s.total),
    active: Number(s.active),
    verified: Number(s.verified),
    balance: Number(s.balance),
  };

  return {
    users: rows,
    q,
    level,
    status,
    verified,
    page,
    total,
    pages: Math.ceil(total / limit),
    stats,
  };
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

  setLevel: async ({ request, locals }) => {
    const form = await request.formData();
    const id = Number(form.get("id"));
    const level = String(form.get("level") ?? "");
    const allowed = ["Demo", "Member", "Agen", "Reseller", "Blacklist", "Admin", "Developers"];
    if (!id || !allowed.includes(level)) return fail(400, { error: "Level tidak valid." });
    const [u] = await db
      .select({ level: users.level, username: users.username })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    if (!u) return fail(404, { error: "User tidak ditemukan." });
    if (u.level === level) return { success: `Level ${u.username} tidak berubah.` };
    await db
      .update(users)
      .set({ level: level as never })
      .where(eq(users.id, id));
    await logAudit({
      adminId: Number(locals.user!.id),
      action: "change_level",
      entity: "user",
      entityId: id,
      detail: { from: u.level, to: level },
      ip: (locals as any).ip,
    });
    return { success: `Level ${u.username} → ${level}.` };
  },
};
