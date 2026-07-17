import { db } from "@socio/db";
import { services, categories, provider } from "@socio/db/schema";
import { eq, like, desc, asc, sql, and } from "drizzle-orm";
import type { PageServerLoad } from "./$types";

const PAGE_SIZE = 20;

export const load: PageServerLoad = async ({ url }) => {
  const q = (url.searchParams.get("q") ?? "").trim();
  const cat = Number(url.searchParams.get("cat") ?? 0);
  const sort = url.searchParams.get("sort") ?? "termurah";
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));

  const filters = [eq(services.status, 1)];
  if (cat) filters.push(eq(services.categoryId, cat));
  if (q) filters.push(like(services.serviceName, `%${q}%`));

  const orderBy =
    sort === "termahal"
      ? desc(services.price)
      : sort === "terlaris"
        ? desc(services.id)
        : asc(services.price);

  const rows = await db
    .select({
      id: services.id,
      serviceName: services.serviceName,
      type: services.type,
      price: services.price,
      min: services.min,
      max: services.max,
      isRefill: services.isRefill,
      categoryId: services.categoryId,
      providerId: services.providerId,
    })
    .from(services)
    .where(and(...filters))
    .orderBy(orderBy)
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)` })
    .from(services)
    .where(and(...filters));

  const cats = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .limit(30);

  return {
    services: rows,
    categories: cats,
    total: Number(total),
    page,
    hasMore: page * PAGE_SIZE < Number(total),
    params: { q, cat, sort },
  };
};
