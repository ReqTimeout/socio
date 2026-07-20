import { db } from "@socio/db";
import { services, categories, savedLinks, orders, users, balanceLogs, coupons } from "@socio/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { fail, redirect } from "@sveltejs/kit";
import { computePrice, applyCoupon, type UserLevel } from "@socio/core/pricing";
import { smmturkAdd } from "@socio/core/smmturk";
import type { PageServerLoad, Actions } from "./$types";

export const load: PageServerLoad = async ({ url, locals }) => {
  const serviceId = Number(url.searchParams.get("service") ?? 0);
  const prefillLink = url.searchParams.get("link") ?? "";
  const prefillQty = Number(url.searchParams.get("qty") ?? 0);
  const catRows = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .limit(30);

  let service: null | {
    id: number;
    serviceName: string;
    type: string;
    price: number;
    min: number;
    max: number;
    providerId: number;
    providerServiceId: number;
    isRefill: number;
    note: string;
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
        providerId: services.providerId,
        providerServiceId: services.providerServiceId,
        isRefill: services.isRefill,
        note: services.note,
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
    prefill: { link: prefillLink, qty: prefillQty },
  };
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const form = await request.formData();
    const serviceId = Number(form.get("serviceId"));
    const link = String(form.get("link") ?? "").trim();
    const quantity = Number(form.get("quantity")) || 0;
    const komen = String(form.get("komen") ?? "").trim();
    const saveLink = form.get("saveLink") === "on";
    const couponCode = String(form.get("coupon") ?? "").trim().toUpperCase();

    if (!serviceId || !link) {
      return fail(400, { error: "Layanan dan link wajib diisi." });
    }

    const [s] = await db.select().from(services).where(eq(services.id, serviceId)).limit(1);
    if (!s) return fail(400, { error: "Layanan tidak ditemukan." });

    // Custom Comments: qty dari line count komen, bukan input quantity
    const isCustomComments = s.type === "Custom Comments";
    const finalQty = isCustomComments ? komen.split("\n").filter(Boolean).length : quantity;

    if (isCustomComments && !komen) {
      return fail(400, { error: "Komentar wajib diisi untuk layanan Custom Comments." });
    }
    if (!isCustomComments && (!finalQty || finalQty < s.min)) {
      return fail(400, { error: `Jumlah minimal ${s.min}.` });
    }
    if (finalQty > s.max) {
      return fail(400, { error: `Jumlah maksimal ${s.max}.` });
    }

    const userId = Number(locals.user!.id);
    const level = (locals.user!.level as UserLevel) ?? "Member";
    const price = computePrice(s.price, finalQty, level);

    // I-U1: validate + apply coupon
    let couponDiscount = 0;
    let appliedCoupon: string | null = null;
    if (couponCode) {
      const [c] = await db
        .select()
        .from(coupons)
        .where(eq(coupons.code, couponCode))
        .limit(1);
      if (!c) {
        return fail(400, { error: "Kupon tidak ditemukan.", coupon: couponCode });
      }
      const res = applyCoupon(
        {
          code: c.code,
          type: c.type,
          value: c.value,
          minOrder: c.minOrder,
          maxDiscount: c.maxDiscount,
          expiresAt: c.expiresAt,
          maxUsage: c.maxUsage,
          used: c.used,
          active: c.active,
        },
        price,
      );
      if (!res.valid) {
        return fail(400, { error: res.message, coupon: couponCode });
      }
      couponDiscount = res.discount;
      appliedCoupon = c.code;
    }

    const finalPrice = Math.max(0, price - couponDiscount);

    const [u] = await db
      .select({ balance: users.balance })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!u || u.balance < finalPrice) {
      return fail(400, { error: "Saldo tidak cukup. Silakan top up terlebih dahulu." });
    }

    // Kirim order ke SMMturk (dapat provider_order_id)
    let providerOrderId = "0";
    if (s.providerId !== 1) {
      // not manual provider
      try {
        const result = isCustomComments
          ? await smmturkAdd(String(s.providerServiceId), link, 0)
          : await smmturkAdd(String(s.providerServiceId), link, finalQty);
        if (result.error) return fail(400, { error: `Provider error: ${result.error}` });
        providerOrderId = result.order ?? "0";
      } catch (e: any) {
        return fail(500, { error: `Gagal mengirim order ke provider: ${e?.message ?? e}` });
      }
    }

    const oid = `SOC-${Date.now()}`;
    await db.insert(orders).values({
      userId,
      oid,
      sid: String(s.providerServiceId),
      providerOrderId,
      user: link,
      serviceName: s.serviceName,
      serviceId: s.id,
      data: link,
      komen: isCustomComments ? komen : "",
      quantity: finalQty,
      remains: finalQty,
      startCount: 0,
      price: finalPrice,
      profit: 0,
      status: "Pending",
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toISOString().slice(11, 19),
      createdAt: new Date(),
      updatedAt: new Date(),
      providerId: s.providerId,
      isApi: 0,
      isRefund: 0,
      couponCode: appliedCoupon,
      discount: couponDiscount,
      nextPollAt: new Date(Date.now() + 60_000),
    });

    await db
      .update(users)
      .set({ balance: sql`${users.balance} - ${finalPrice}` })
      .where(eq(users.id, userId));
    await db.insert(balanceLogs).values({
      userId,
      type: "order",
      amount: -finalPrice,
      note: `Pesan ${s.serviceName} (${oid})${appliedCoupon ? ` [kupon ${appliedCoupon}]` : ""}`,
      createdAt: new Date(),
    });
    if (appliedCoupon) {
      await db
        .update(coupons)
        .set({ used: sql`${coupons.used} + 1` })
        .where(eq(coupons.code, appliedCoupon));
    }

    if (saveLink) {
      await db
        .insert(savedLinks)
        .values({ userId, label: s.serviceName.slice(0, 100), link, serviceId: s.id });
    }

    throw redirect(303, "/pesanan");
  },

  coupon: async ({ request, locals }) => {
    const form = await request.formData();
    const code = String(form.get("code") ?? "").trim().toUpperCase();
    const serviceId = Number(form.get("serviceId") ?? 0);
    const quantity = Number(form.get("quantity") ?? 0);
    const komen = String(form.get("komen") ?? "").trim();

    if (!serviceId) return fail(400, { couponError: "Pilih layanan dulu." });
    const [s] = await db.select().from(services).where(eq(services.id, serviceId)).limit(1);
    if (!s) return fail(400, { couponError: "Layanan tidak ditemukan." });

    const isCustom = s.type === "Custom Comments";
    const qty = isCustom ? komen.split("\n").filter(Boolean).length : quantity;
    const price = computePrice(s.price, qty, (locals.user!.level as UserLevel) ?? "Member");

    if (!code) return fail(400, { couponError: "Masukkan kode kupon." });
    const [c] = await db.select().from(coupons).where(eq(coupons.code, code)).limit(1);
    if (!c) return fail(400, { couponError: "Kupon tidak ditemukan." });
    const res = applyCoupon(
      {
        code: c.code,
        type: c.type,
        value: c.value,
        minOrder: c.minOrder,
        maxDiscount: c.maxDiscount,
        expiresAt: c.expiresAt,
        maxUsage: c.maxUsage,
        used: c.used,
        active: c.active,
      },
      price,
    );
    if (!res.valid) return fail(400, { couponError: res.message });
    return { coupon: code, discount: res.discount, finalPrice: price - res.discount };
  },
};
