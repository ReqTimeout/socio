import { db } from "@socio/db";
import { orders } from "@socio/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ url, locals }) => {
  const filter = url.searchParams.get("f") ?? "all";
  const userId = Number(locals.user!.id);

  const conditions = [eq(orders.userId, userId)];
  if (filter === "pending") conditions.push(eq(orders.status, "Pending"));
  else if (filter === "proses")
    conditions.push(sql`${orders.status} IN ('Processing','In progress')`);
  else if (filter === "selesai") conditions.push(eq(orders.status, "Success"));

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
    })
    .from(orders)
    .where(and(...conditions))
    .orderBy(desc(orders.createdAt))
    .limit(30);

  return { orders: rows, filter };
};
