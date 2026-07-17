import { db } from "@socio/db";
import { orders, services, categories } from "@socio/db/schema";
import { eq, desc } from "drizzle-orm";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  const userId = Number(locals.user!.id);

  const recent = await db
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
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt))
    .limit(5);

  const catRows = await db.select({ id: categories.id, name: categories.name }).from(categories).limit(12);
  const serviceCount = await db.select({ c: services.id }).from(services).limit(1);

  return {
    recent,
    categories: catRows,
    serviceCount: serviceCount.length,
  };
};
