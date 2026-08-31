import { db } from "@socio/db";
import {
  services,
  categories,
  savedLinks,
  orders,
  users,
  balanceLogs,
  provider,
} from "@socio/db/schema";
import { eq, desc, asc, sql } from "drizzle-orm";
import { fail, redirect } from "@sveltejs/kit";
import { computePrice, baseForLevel, type UserLevel } from "@socio/core/pricing";
import { smmturkAddFor } from "@socio/core/smmturk";
import { decryptSecret } from "$lib/server/crypto";
import { getPricingRules } from "$lib/server/pricing";
import { validateCoupon, consumeCoupon, releaseCoupon } from "$lib/server/coupons";
import type { PageServerLoad, Actions } from "./$types";

export const load: PageServerLoad = async ({ url, locals }) => {
  const serviceId = Number(url.searchParams.get("service") ?? 0);
  const prefillLink = url.searchParams.get("link") ?? "";
  const prefillQty = Number(url.searchParams.get("qty") ?? 0);
  const catRows = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .orderBy(asc(categories.name));

  let service: null | {
    id: number;
    serviceName: string;
    type: string;
    price: number;
    priceApi: number;
    priceReseller: number;
    min: number;
    max: number;
    providerId: number;
    providerServiceId: number;
    isRefill: number;
    note: string;
    waktu: string;
    categoryId: number;
  } = null;

  if (serviceId) {
    const [s] = await db
      .select({
        id: services.id,
        serviceName: services.serviceName,
        type: services.type,
        price: services.price,
        priceApi: services.priceApi,
        priceReseller: services.priceReseller,
        min: services.min,
        max: services.max,
        providerId: services.providerId,
        providerServiceId: services.providerServiceId,
        isRefill: services.isRefill,
        note: services.note,
        waktu: services.waktu,
        categoryId: services.categoryId,
      })
      .from(services)
      .where(eq(services.id, serviceId))
      .limit(1);
    service = s ?? null;
  }

  const saved = await db
    .select({
      id: savedLinks.id,
      label: savedLinks.label,
      link: savedLinks.link,
      serviceId: savedLinks.serviceId,
    })
    .from(savedLinks)
    .where(eq(savedLinks.userId, Number(locals.user!.id)))
    .orderBy(desc(savedLinks.createdAt))
    .limit(10);

  const rules = await getPricingRules();

  return {
    service,
    categories: catRows,
    saved,
    balance: locals.user!.balance ?? 0,
    level: (locals.user!.level as UserLevel) ?? "Member",
    prefill: { link: prefillLink, qty: prefillQty },
    // Markup live dari DB (bukan hardcode) — dipakai total realtime di client
    rules: Object.values(rules).map((r) => ({
      level: r.level,
      markupPercent: r.markupPercent,
      flatPer1k: r.flatPer1k,
      minProfitPer1k: r.minProfitPer1k,
      isActive: r.isActive,
    })),
  };
};

/**
 * Deduct saldo atomik: `UPDATE users SET balance = balance - ? WHERE id = ? AND balance >= ?`.
 * Kembalikan jumlah row terdampak (0 = saldo tidak cukup). Anti race condition
 * kalau 2 request order paralel — tidak ada read-then-write.
 */
async function deductBalance(userId: number, amount: number): Promise<number> {
  const res = await db
    .update(users)
    .set({ balance: sql`${users.balance} - ${amount}` })
    .where(sql`${users.id} = ${userId} AND ${users.balance} >= ${amount}`);
  const rows: any = res;
  if (Array.isArray(rows) && typeof rows[0]?.affectedRows === "number") return rows[0].affectedRows;
  return Number(rows?.affectedRows ?? 1);
}

/** Kirim order ke provider sesuai mapping legacy (port order/new-action.php). */
async function sendToProvider(
  svc: {
    providerId: number;
    providerServiceId: number;
    type: string;
    isRefill: number;
  },
  link: string,
  quantity: number,
  komen: string,
): Promise<{ providerOrderId: string } | { error: string }> {
  if (svc.providerId === 1) return { providerOrderId: "0" }; // MANUAL

  const [p] = await db.select().from(provider).where(eq(provider.id, svc.providerId)).limit(1);
  if (!p || !p.apiKey || p.name === "MANUAL") return { providerOrderId: "0" };

  const key = decryptSecret(p.apiKey);
  if (!key) return { providerOrderId: "0" };

  try {
    const result =
      svc.type === "Custom Comments"
        ? await smmturkAddFor(p.apiUrlOrder, key, {
            service: String(svc.providerServiceId),
            link,
            comments: komen,
          })
        : svc.type === "Package"
          ? await smmturkAddFor(p.apiUrlOrder, key, {
              service: String(svc.providerServiceId),
              link,
            })
          : await smmturkAddFor(p.apiUrlOrder, key, {
              service: String(svc.providerServiceId),
              link,
              quantity,
            });
    if (result.error) return { error: result.error };
    return { providerOrderId: result.order ?? "0" };
  } catch (e: any) {
    return { error: e?.message ?? String(e) };
  }
}

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const form = await request.formData();
    const serviceId = Number(form.get("serviceId"));
    const link = String(form.get("link") ?? "").trim();
    const quantity = Number(form.get("quantity")) || 0;
    const komen = String(form.get("komen") ?? "").trim();
    const saveLink = form.get("saveLink") === "on";

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

    // Harga dari rules DB + base per level (port lib/pricing.php)
    const rules = await getPricingRules();
    const rule = rules[level];
    const basePer1k = baseForLevel(
      {
        price: Number(s.price),
        priceApi: Number(s.priceApi),
        priceReseller: Number(s.priceReseller),
      },
      level,
    );
    const finalPrice = computePrice(basePer1k, finalQty, level, rule, Number(s.priceApi));
    if (!Number.isFinite(finalPrice) || finalPrice <= 0) {
      return fail(400, { error: "Harga layanan tidak valid." });
    }

    // Kupon: validasi ulang secara authoritative (live preview hanyalah preview).
    const couponCodeRaw = String(form.get("coupon") ?? "")
      .trim()
      .toUpperCase();
    let discount = 0;
    let couponId: number | undefined;
    let applyCode: string | null = null;
    if (couponCodeRaw) {
      const chk = await validateCoupon(couponCodeRaw, finalPrice);
      if (!chk.valid) return fail(400, { error: chk.message });
      discount = chk.discount;
      couponId = chk.couponId;
      applyCode = chk.couponId ? couponCodeRaw : null;
    }
    const payable = Math.max(finalPrice - discount, 0);

    // Deduct saldo SECARA ATOMIK sebelum kontak provider — anti double-spend.
    const affected = await deductBalance(userId, payable);
    if (affected === 0) {
      return fail(400, { error: "Saldo tidak cukup. Silakan top up terlebih dahulu." });
    }

    // Klaim kuota kupon atomik setelah saldo terpotong (anti race kuota).
    if (couponId !== undefined) {
      const claimed = await consumeCoupon(couponId);
      if (!claimed) {
        await db
          .update(users)
          .set({ balance: sql`${users.balance} + ${payable}` })
          .where(eq(users.id, userId));
        return fail(400, { error: "Kuota kupon baru saja habis. Coba kupon lain." });
      }
    }

    // Kirim order ke provider (per-provider key + URL, custom comments supported)
    let providerOrderId = "0";
    const sent = await sendToProvider(
      {
        providerId: s.providerId,
        providerServiceId: s.providerServiceId,
        type: s.type,
        isRefill: s.isRefill,
      },
      link,
      finalQty,
      komen,
    );
    if ("error" in sent) {
      // Refund atomik kalau provider gagal (+ lepas kuota kupon)
      await db
        .update(users)
        .set({ balance: sql`${users.balance} + ${payable}` })
        .where(eq(users.id, userId));
      if (couponId !== undefined) await releaseCoupon(couponId);
      return fail(500, { error: `Gagal mengirim order ke provider: ${sent.error}` });
    }
    providerOrderId = sent.providerOrderId;

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
      price: payable,
      profit: 0,
      status: "Pending",
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toISOString().slice(11, 19),
      createdAt: new Date(),
      updatedAt: new Date(),
      providerId: s.providerId,
      isApi: 0,
      isRefund: 0,
      couponCode: applyCode,
      discount,
      nextPollAt: new Date(Date.now() + 60_000),
    });

    // Saldo sudah dideduct atomik di awal (sebelum kontak provider).
    await db.insert(balanceLogs).values({
      userId,
      type: "order",
      amount: -payable,
      note: applyCode
        ? `Pesan ${s.serviceName} (${oid}) — kupon ${applyCode}`
        : `Pesan ${s.serviceName} (${oid})`,
      createdAt: new Date(),
    });

    if (saveLink) {
      await db
        .insert(savedLinks)
        .values({ userId, label: s.serviceName.slice(0, 100), link, serviceId: s.id });
    }

    throw redirect(303, "/pesanan");
  },
};
