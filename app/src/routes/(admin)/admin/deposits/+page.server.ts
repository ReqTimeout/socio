import { db } from "@socio/db";
import { deposits, users, balanceLogs } from "@socio/db/schema";
import { sql, desc, eq, and, ne } from "drizzle-orm";
import { redirect, fail } from "@sveltejs/kit";
import { logAudit } from "$lib/server/admin";
import type { PageServerLoad, Actions } from "./$types";

const STATUSES = ["Pending", "Success", "Canceled"] as const;
type Status = (typeof STATUSES)[number];

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user) throw redirect(303, "/login");
  if (locals.user.level !== "Admin") throw redirect(303, "/");

  const q = String(url.searchParams.get("q") ?? "").trim();
  const status = String(url.searchParams.get("status") ?? "") as Status | "";
  const page = Math.max(1, Number(url.searchParams.get("p") ?? 1));
  const limit = 25;
  const offset = (page - 1) * limit;

  const conds: any[] = [ne(users.level, "Admin")];
  if (status && STATUSES.includes(status as Status)) {
    conds.push(eq(deposits.status, status as never));
  }
  if (q) {
    const n = Number(q) || 0;
    conds.push(
      sql`(${deposits.id} = ${n} OR ${users.username} LIKE ${"%" + q + "%"} OR ${deposits.methodName} LIKE ${"%" + q + "%"} OR ${deposits.status} LIKE ${"%" + q + "%"})`,
    );
  }
  const where = and(...conds);

  const [rows, totalRow, statsRows] = await Promise.all([
    db
      .select({
        id: deposits.id,
        userId: deposits.userId,
        username: users.username,
        methodName: deposits.methodName,
        amount: deposits.amount,
        status: deposits.status,
        createdAt: deposits.createdAt,
      })
      .from(deposits)
      .leftJoin(users, eq(deposits.userId, users.id))
      .where(where)
      .orderBy(desc(deposits.id))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: sql<number>`count(*)` })
      .from(deposits)
      .leftJoin(users, eq(deposits.userId, users.id))
      .where(where),
    db
      .select({
        status: deposits.status,
        count: sql<number>`count(*)`,
        total: sql<number>`COALESCE(SUM(${deposits.amount}),0)`,
      })
      .from(deposits)
      .leftJoin(users, eq(deposits.userId, users.id))
      .where(ne(users.level, "Admin"))
      .groupBy(deposits.status),
  ]);

  const total = Number(totalRow[0]?.total ?? 0);
  const stats: Record<Status, { count: number; total: number }> = {
    Pending: { count: 0, total: 0 },
    Success: { count: 0, total: 0 },
    Canceled: { count: 0, total: 0 },
  };
  for (const r of statsRows) {
    if (r.status in stats)
      stats[r.status as Status] = { count: Number(r.count), total: Number(r.total) };
  }

  return {
    deposits: rows,
    q,
    status,
    page,
    total,
    pages: Math.max(1, Math.ceil(total / limit)),
    stats,
  };
};

export const actions: Actions = {
  confirm: async ({ request, locals }) => {
    const form = await request.formData();
    const id = Number(form.get("id"));
    const [d] = await db.select().from(deposits).where(eq(deposits.id, id)).limit(1);
    if (!d) return fail(404, { error: "Deposit tidak ditemukan." });
    if (d.status === "Success") return fail(400, { error: "Sudah dikonfirmasi." });

    await db.update(deposits).set({ status: "Success" }).where(eq(deposits.id, id));
    if (d.userId) {
      const [u] = await db
        .select({ balance: users.balance })
        .from(users)
        .where(eq(users.id, d.userId))
        .limit(1);
      const newBal = Number(u?.balance ?? 0) + Number(d.amount);
      await db.update(users).set({ balance: newBal }).where(eq(users.id, d.userId));
      await db.insert(balanceLogs).values({
        userId: d.userId,
        type: "dep",
        amount: Number(d.amount),
        note: `Manual deposit confirm #${id} (${d.methodName})`,
        createdAt: new Date(),
      });
    }
    await logAudit({
      adminId: Number(locals.user!.id),
      action: "confirm_deposit",
      entity: "deposit",
      entityId: id,
      detail: { amount: Number(d.amount), method: d.methodName },
      ip: (locals as any).ip,
    });
    return { success: `Deposit #${id} dikonfirmasi.` };
  },
  reject: async ({ request, locals }) => {
    const form = await request.formData();
    const id = Number(form.get("id"));
    await db.update(deposits).set({ status: "Canceled" }).where(eq(deposits.id, id));
    await logAudit({
      adminId: Number(locals.user!.id),
      action: "reject_deposit",
      entity: "deposit",
      entityId: id,
      ip: (locals as any).ip,
    });
    return { success: `Deposit #${id} ditolak.` };
  },
};
