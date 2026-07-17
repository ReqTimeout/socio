import { db } from "@socio/db";
import { users, orders, deposits, auditLog } from "@socio/db/schema";
import { sql, desc, eq } from "drizzle-orm";
import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(303, "/login");

  const [{ users: userCount }] = await db.select({ users: sql<number>`count(*)` }).from(users);
  const [{ orders: orderCount }] = await db.select({ orders: sql<number>`count(*)` }).from(orders);
  const [{ deposits: depCount }] = await db
    .select({ deposits: sql<number>`count(*)` })
    .from(deposits);

  const [{ revenue }] = await db
    .select({ revenue: sql<number>`COALESCE(SUM(price),0)` })
    .from(orders);
  const [{ balance }] = await db
    .select({ balance: sql<number>`COALESCE(SUM(balance),0)` })
    .from(users);

  const recent = await db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      entity: auditLog.entity,
      entityId: auditLog.entityId,
      detail: auditLog.detail,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .orderBy(desc(auditLog.createdAt))
    .limit(12);

  return {
    stats: {
      users: Number(userCount),
      orders: Number(orderCount),
      deposits: Number(depCount),
      revenue: Number(revenue),
      balance: Number(balance),
    },
    recent,
  };
};
