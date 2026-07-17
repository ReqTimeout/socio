import { db } from "@socio/db";
import { orders, users } from "@socio/db/schema";
import { sql, eq, desc, like } from "drizzle-orm";
import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user) throw redirect(303, "/login");
  const status = String(url.searchParams.get("status") ?? "");
  const q = String(url.searchParams.get("q") ?? "");
  const page = Math.max(1, Number(url.searchParams.get("p") ?? 1));
  const limit = 25;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (status) conditions.push(sql`${orders.status} = ${status}`);
  if (q)
    conditions.push(
      sql`(${orders.data} LIKE ${"%" + q + "%"} OR ${orders.id} = ${Number(q) || 0})`,
    );

  const where = conditions.length ? sql.join(conditions, sql` AND `) : undefined;

  const rows = await db
    .select({
      id: orders.id,
      userId: orders.userId,
      serviceName: orders.serviceName,
      link: orders.data,
      quantity: orders.quantity,
      price: orders.price,
      status: orders.status,
      startCount: orders.startCount,
      remains: orders.remains,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(where)
    .orderBy(desc(orders.id))
    .limit(limit)
    .offset(offset);

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)` })
    .from(orders)
    .where(where);

  return { orders: rows, status, q, page, total, pages: Math.ceil(Number(total) / limit) };
};
