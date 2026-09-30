import { db } from "@socio/db";
import { services, categories, favorites } from "@socio/db/schema";
import { eq, like, desc, asc, sql, and, inArray } from "drizzle-orm";
import { fail } from "@sveltejs/kit";
import { baseForLevel, effectivePer1k, type UserLevel } from "@socio/core/pricing";
import { getPricingRules } from "$lib/server/pricing";
import { whitelabel } from "$lib/format";
import type { PageServerLoad, Actions } from "./$types";

const PAGE_SIZE = 20;

export const load: PageServerLoad = async ({ url, locals }) => {
  const q = (url.searchParams.get("q") ?? "").trim();
  const cat = Number(url.searchParams.get("cat") ?? 0);
  const sort = url.searchParams.get("sort") ?? "termurah";
  const fav = url.searchParams.get("fav") === "1";
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const level = ((locals.user?.level as UserLevel) ?? "Member") as UserLevel;

  // User's favorited service ids
  const favRows = locals.user
    ? await db
        .select({ serviceId: favorites.serviceId })
        .from(favorites)
        .where(eq(favorites.userId, Number(locals.user.id)))
    : [];
  const favIds = favRows.map((r) => r.serviceId);

  // Tampilkan hanya service aktif yang layak order: punya modal > 0 dan range
  // min/max valid. Ini menyaring 4 baris legacy (provider_id=0 / placeholder)
  // yang muncul sebagai "Min 0 · Max 0 · Rp0" di sort termurah.
  const filters = [
    eq(services.status, 1),
    sql`${services.price} > 0`,
    sql`${services.min} > 0`,
    sql`${services.max} > 0`,
  ];
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
      priceApi: services.priceApi,
      priceReseller: services.priceReseller,
      min: services.min,
      max: services.max,
      isRefill: services.isRefill,
      categoryId: services.categoryId,
      categoryName: categories.name,
      providerId: services.providerId,
    })
    .from(services)
    .leftJoin(categories, eq(services.categoryId, categories.id))
    .where(and(...filters))
    .orderBy(orderBy)
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const withLevelPrice = await (async () => {
    const rules = await getPricingRules();
    const rule = rules[level];
    return rows.map((s) => {
      const modal = Math.max(Number(s.priceApi ?? 0), 0);
      const base = baseForLevel(
        {
          price: Number(s.price),
          priceApi: Number((s as any).priceApi ?? 0),
          priceReseller: Number((s as any).priceReseller ?? 0),
        },
        level,
      );
      return {
        id: s.id,
        serviceName: s.serviceName,
        type: s.type,
        min: s.min,
        max: s.max,
        isRefill: s.isRefill,
        categoryId: s.categoryId,
        categoryName: whitelabel((s as any).categoryName ?? ""),
        providerId: s.providerId,
        fav: favIds.includes(s.id),
        // Harga jual efektif per 1k (sudah markup per level) — satu-satunya
        // angka yang dikirim ke client supaya modal tidak bocor.
        levelPrice: Math.round(effectivePer1k(base, level, rule, modal)),
      };
    });
  })();

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)` })
    .from(services)
    .where(and(...filters));

  const cats = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .orderBy(asc(categories.name));

  return {
    services: withLevelPrice,
    categories: cats.map((c) => ({ id: c.id, name: whitelabel(c.name) })),
    total: Number(total),
    page,
    hasMore: page * PAGE_SIZE < Number(total),
    favCount: favIds.length,
    params: { q, cat, sort, fav },
    level,
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
