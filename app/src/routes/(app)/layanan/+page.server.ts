import { db } from "@socio/db";
import { services, categories, favorites } from "@socio/db/schema";
import { eq, like, desc, asc, sql, and, inArray } from "drizzle-orm";
import { redirect, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";

const PAGE_SIZE = 20;

export const load: PageServerLoad = async ({ url, locals }) => {
  const q = (url.searchParams.get("q") ?? "").trim();
  const cat = Number(url.searchParams.get("cat") ?? 0);
  const sort = url.searchParams.get("sort") ?? "termurah";
  const fav = url.searchParams.get("fav") === "1";
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));

  // User's favorited service ids
  const favRows = locals.user
    ? await db
        .select({ serviceId: favorites.serviceId })
        .from(favorites)
        .where(eq(favorites.userId, Number(locals.user.id)))
    : [];
  const favIds = favRows.map((r) => r.serviceId);

  const filters = [eq(services.status, 1)];
  if (cat) filters.push(eq(services.categoryId, cat));
  if (q) filters.push(like(services.serviceName, `%${q}%`));
  if (fav) {
    // Only show favorited services (empty set → no results)
    filters.push(favIds.length ? inArray(services.id, favIds) : sql`0 = 1`);
  }

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
    services: rows.map((s) => ({ ...s, fav: favIds.includes(s.id) })),
    categories: cats,
    total: Number(total),
    page,
    hasMore: page * PAGE_SIZE < Number(total),
    favCount: favIds.length,
    params: { q, cat, sort, fav },
  };
};

export const actions: Actions = {
  toggleFav: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { error: "Unauthorized" });
    const form = await request.formData();
    const serviceId = Number(form.get("serviceId"));
    if (!serviceId) return fail(400, { error: "serviceId required" });
    const userId = Number(locals.user.id);

    const [existing] = await db
      .select({ id: favorites.id })
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.serviceId, serviceId)))
      .limit(1);

    if (existing) {
      await db.delete(favorites).where(eq(favorites.id, existing.id));
      return { fav: false };
    }
    await db.insert(favorites).values({ userId, serviceId });
    return { fav: true };
  },
};
