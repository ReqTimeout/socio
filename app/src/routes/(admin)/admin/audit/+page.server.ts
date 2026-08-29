import { db } from "@socio/db";
import { auditLog, users } from "@socio/db/schema";
import { sql, desc, eq, and } from "drizzle-orm";
import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user) throw redirect(303, "/login");
  // A-01: viewer audit_log hanya Admin (bukan Member/Agen/Reseller).
  if (locals.user.level !== "Admin") throw redirect(303, "/");

  const q = String(url.searchParams.get("q") ?? "").trim();
  const action = String(url.searchParams.get("action") ?? "").trim();
  const rawP = Number(url.searchParams.get("p") ?? 1);
  const page = Number.isFinite(rawP) && rawP >= 1 && rawP <= 1000 ? rawP : 1; // A-15
  const limit = 30;
  const offset = (page - 1) * limit;

  const conds: any[] = [];
  if (action) conds.push(eq(auditLog.action, action));
  if (q) {
    conds.push(
      sql`(${auditLog.action} LIKE ${"%" + q + "%"} OR ${auditLog.entity} LIKE ${"%" + q + "%"} OR ${auditLog.entityId} LIKE ${"%" + q + "%"} OR ${auditLog.ip} LIKE ${"%" + q + "%"} OR ${users.username} LIKE ${"%" + q + "%"})`,
    );
  }
  const where = conds.length ? and(...conds) : undefined;

  const [rows, totalRow, actionRows] = await Promise.all([
    db
      .select({
        id: auditLog.id,
        adminId: auditLog.adminId,
        adminUsername: users.username,
        action: auditLog.action,
        entity: auditLog.entity,
        entityId: auditLog.entityId,
        detail: auditLog.detail,
        ip: auditLog.ip,
        createdAt: auditLog.createdAt,
      })
      .from(auditLog)
      .leftJoin(users, eq(auditLog.adminId, users.id))
      .where(where)
      .orderBy(desc(auditLog.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: sql<number>`count(*)` })
      .from(auditLog)
      .leftJoin(users, eq(auditLog.adminId, users.id))
      .where(where),
    db
      .select({
        action: auditLog.action,
        count: sql<number>`count(*)`,
      })
      .from(auditLog)
      .groupBy(auditLog.action)
      .orderBy(desc(sql`count(*)`)),
  ]);

  const total = Number(totalRow[0]?.total ?? 0);
  const actions = actionRows.map((r) => ({ key: r.action, count: Number(r.count) }));

  return {
    logs: rows,
    q,
    action,
    page,
    total,
    pages: Math.max(1, Math.ceil(total / limit)),
    actions,
  };
};
