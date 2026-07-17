import { db } from "@socio/db";
import { services, categories, savedLinks, orders, users, balanceLogs } from "@socio/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { fail, redirect } from "@sveltejs/kit";
import { computePrice, type UserLevel } from "@socio/core/pricing";
import type { PageServerLoad, Actions } from "./$types";

export const load: PageServerLoad = async ({ url, locals }) => {
  const serviceId = Number(url.searchParams.get("service") ?? 0);
  const catRows = await db.select({ id: categories.id, name: categories.name }).from(categories).limit(30);

  let service: null | {
    id: number;
    serviceName: string;
    type: string;
    price: number;
    min: number;
    max: number;
  } = null;

  if (serviceId) {
    const [s] = await db
      .select({
        id: services.id,
        serviceName: services.serviceName,
        type: services.type,
        price: services.price,
        min: services.min,
        max: services.max,
      })
      .from(services)
      .where(eq(services.id, serviceId))
      .limit(1);
    service = s ?? null;
  }

  const saved = await db
    .select({ id: savedLinks.id, label: savedLinks.label, link: savedLinks.link })
    .from(savedLinks)
    .where(eq(savedLinks.userId, Number(locals.user!.id)))
    .orderBy(desc(savedLinks.createdAt))
    .limit(10);

  return {
    service,
    categories: catRows,
    saved,
    balance: locals.user!.balance ?? 0,
    level: (locals.user!.level as UserLevel) ?? "Member",
  };
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const form = await request.formData();
    const serviceId = Number(form.get("serviceId"));
    const link = String(form.get("link") ?? "").trim();
    const quantity = Number(form.get("quantity"));
    const saveLink = form.get("saveLink") === "on";

    if (!serviceId || !link || !quantity) {
      return fail(400, { error: "Layanan, link, dan jumlah wajib diisi." });
    }

    const [s] = await db.select().from(services).where(eq(services.id, serviceId)).limit(1);
    if (!s) return fail(400, { error: "Layanan tidak ditemukan." });
    if (quantity < s.min || quantity > s.max) {
      return fail(400, { error: `Jumlah harus antara ${s.min}–${s.max}.` });
    }

    const userId = Number(locals.user!.id);
    const level = (locals.user!.level as UserLevel) ?? "Member";
    const price = computePrice(s.price, quantity, level);

    const [u] = await db.select({ balance: users.balance }).from(users).where(eq(users.id, userId)).limit(1);
    if (!u || u.balance < price) {
      return fail(400, { error: "Saldo tidak cukup. Silakan top up terlebih dahulu." });
    }

    const oid = `SOC-${Date.now()}`;
    await db.insert(orders).values({
      userId,
      oid,
      sid: String(s.providerServiceId),
      providerOrderId: "",
      user: link,
      serviceName: s.serviceName,
      serviceId: s.id,
      data: link,
      komen: "",
      quantity,
      remains: quantity,
      startCount: 0,
      price,
      profit: 0,
      status: "Pending",
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toISOString().slice(11, 19),
      createdAt: new Date(),
      providerId: s.providerId,
      isApi: 0,
      isRefund: 0,
    });

    await db.update(users).set({ balance: sql`${users.balance} - ${price}` }).where(eq(users.id, userId));
    await db.insert(balanceLogs).values({
      userId,
      type: "order",
      amount: -price,
      note: `Pesan ${s.serviceName} (${oid})`,
      createdAt: new Date(),
    });

    if (saveLink) {
      await db.insert(savedLinks).values({ userId, label: s.serviceName.slice(0, 100), link, serviceId: s.id });
    }

    throw redirect(303, "/pesanan");
  },
};
