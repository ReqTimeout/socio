import { db } from "@socio/db";
import { pricingRules, services, auditLog } from "@socio/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { redirect, fail } from "@sveltejs/kit";
import { logAudit, assertAdmin, assertAdminRate } from "$lib/server/admin";
import { DEFAULT_PRICING_RULES } from "$lib/server/pricing-defaults";
import { getPricingRules, invalidatePricingCache, upsertPricingRule } from "$lib/server/pricing";
import type { Actions, PageServerLoad } from "./$types";

async function seedIfEmpty(): Promise<void> {
  try {
    const existing = await db.select({ id: pricingRules.id }).from(pricingRules).limit(1);
    if (existing.length > 0) return;
    await db.insert(pricingRules).values(
      DEFAULT_PRICING_RULES.map((r) => ({
        level: r.level,
        markupPercent: r.markupPercent,
        flatPer1k: r.flatPer1k,
        minProfitPer1k: r.minProfitPer1k,
        isActive: 1,
      })),
    );
    invalidatePricingCache();
  } catch (e) {
    console.error("[pricing] auto-seed pricing_rules gagal:", e);
  }
}

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(303, "/login");
  if (locals.user.level !== "Admin") throw redirect(303, "/");

  await seedIfEmpty();
  const rules = await db.select().from(pricingRules).orderBy(pricingRules.level);

  const order = ["Member", "Agen", "Reseller", "Admin"] as const;
  rules.sort((a, b) => order.indexOf(a.level as any) - order.indexOf(b.level as any));

  let stats = {
    total: 0,
    active: 0,
    medianBase: 0,
    minBase: 0,
    maxBase: 0,
    distribution: [] as { range: string; count: number }[],
    sample: [] as { id: number; serviceName: string; base: number; modal: number }[],
  };
  try {
    const medianResult = (await db.execute(sql`
      SELECT AVG(price) AS median FROM (
        SELECT price, ROW_NUMBER() OVER (ORDER BY price ASC) AS rn,
               COUNT(*) OVER () AS total
        FROM services
        WHERE price > 0
      ) t
      WHERE rn IN (FLOOR((total + 1) / 2), CEIL((total + 1) / 2))
    `)) as unknown as [{ median: number }[], unknown];
    const [statRow] = await db
      .select({
        total: sql<number>`COUNT(*)`,
        active: sql<number>`SUM(CASE WHEN ${services.status}=1 THEN 1 ELSE 0 END)`,
        mn: sql<number>`MIN(${services.price})`,
        mx: sql<number>`MAX(${services.price})`,
      })
      .from(services);

    const distRows = await db
      .select({
        bucket: sql<string>`CASE
          WHEN ${services.price} < 1000 THEN '< Rp1.000'
          WHEN ${services.price} < 5000 THEN 'Rp1.000-5.000'
          WHEN ${services.price} < 20000 THEN 'Rp5.000-20.000'
          WHEN ${services.price} < 50000 THEN 'Rp20.000-50.000'
          WHEN ${services.price} < 200000 THEN 'Rp50.000-200.000'
          ELSE '> Rp200.000'
        END`,
        cnt: sql<number>`COUNT(*)`,
      })
      .from(services)
      .groupBy(sql`1`)
      .orderBy(sql`MIN(${services.price})`);

    const sampleRows = await db
      .select({
        id: services.id,
        serviceName: services.serviceName,
        base: services.price,
        modal: services.priceApi,
      })
      .from(services)
      .where(eq(services.status, 1))
      .orderBy(sql`RAND()`)
      .limit(3);

    stats = {
      total: Number(statRow?.total ?? 0),
      active: Number(statRow?.active ?? 0),
      medianBase: Math.round(Number(medianResult?.[0]?.[0]?.median ?? 0)),
      minBase: Math.round(Number(statRow?.mn ?? 0)),
      maxBase: Math.round(Number(statRow?.mx ?? 0)),
      distribution: distRows.map((r) => ({ range: r.bucket, count: Number(r.cnt) })),
      sample: sampleRows.map((r) => ({
        id: r.id,
        serviceName: r.serviceName,
        base: Number(r.base),
        modal: Number(r.modal),
      })),
    };
  } catch (e) {
    console.error("[pricing] load services stats gagal:", e);
  }

  return { rules, stats };
};

const LEVELS = ["Member", "Agen", "Reseller", "Admin"] as const;
type Level = (typeof LEVELS)[number];

export const actions: Actions = {
  save: async ({ request, locals }) => {
    assertAdmin(locals);
    const _rate = await assertAdminRate("pricing-save", (locals as any).ip ?? "0.0.0.0", 20, 60);
    if (_rate) return _rate;
    const form = await request.formData();

    const updates: {
      level: Level;
      markupPercent: number;
      flatPer1k: number;
      minProfitPer1k: number;
      isActive: number;
    }[] = [];

    for (const level of LEVELS) {
      const markupPercent = Number(form.get(`markup_${level}`) ?? 0);
      const flatPer1k = Number(form.get(`flat_${level}`) ?? 0);
      const minProfitPer1k = Number(form.get(`min_${level}`) ?? 0);
      const isActive = form.get(`active_${level}`) === "1" ? 1 : 0;

      if (!Number.isFinite(markupPercent) || markupPercent < 0 || markupPercent > 1000)
        return fail(400, { error: `Markup ${level} harus 0-1000.` });
      if (!Number.isFinite(flatPer1k) || flatPer1k < 0)
        return fail(400, { error: `Flat ${level} tidak valid.` });
      if (!Number.isFinite(minProfitPer1k) || minProfitPer1k < 0)
        return fail(400, { error: `Min profit ${level} tidak valid.` });

      updates.push({ level, markupPercent, flatPer1k, minProfitPer1k, isActive });
    }

    for (const u of updates) {
      await upsertPricingRule(u.level, {
        markupPercent: u.markupPercent,
        flatPer1k: u.flatPer1k,
        minProfitPer1k: u.minProfitPer1k,
        isActive: u.isActive,
      });
    }
    invalidatePricingCache();

    await logAudit({
      adminId: Number(locals.user.id),
      action: "save_pricing_rules",
      entity: "pricing_rules",
      detail: { updates },
      ip: (locals as any).ip,
    });

    return { success: "Aturan harga per level disimpan." };
  },

  /**
   * A-07: idempotent — base `price_api` (bukan `price` saat ini, supaya klik
   * berulang tidak mengalikan markup). Kalau `price_api = 0`, fallback ke `price`
   * (legacy service). Tolak double-klik < 30 detik via `audit_log` last-run.
   *
   * A-08 fix: `profit_agen` dihitung `price - price_api` (margin agen),
   * bukan `price_api - price_api` (selalu 0, bug sebelumnya).
   */
  applyToCatalog: async ({ locals }) => {
    assertAdmin(locals);
    const _rate = await assertAdminRate("pricing-apply", (locals as any).ip ?? "0.0.0.0", 5, 60);
    if (_rate) return _rate;

    // Idempotency: tolak kalau admin sudah apply dalam 30 detik terakhir.
    const [recent] = await db
      .select({ at: auditLog.createdAt })
      .from(auditLog)
      .where(eq(auditLog.action, "apply_pricing_to_catalog"))
      .orderBy(desc(auditLog.createdAt))
      .limit(1);
    if (recent && Date.now() - new Date(recent.at).getTime() < 30_000) {
      return fail(429, {
        error:
          "Penerapan baru saja dilakukan < 30 detik lalu. Tunggu sebentar untuk mencegah double-klik.",
      });
    }

    const rules = await getPricingRules();
    const m = (lv: "Member" | "Agen" | "Reseller" | "Admin") =>
      rules[lv]?.isActive ? Number(rules[lv].markupPercent) : 0;

    const member = m("Member");
    const agen = m("Agen");
    const reseller = m("Reseller");

    if (member === 0 && agen === 0 && reseller === 0) {
      return fail(400, {
        error:
          "Semua markup 0% — tidak ada yang berubah. Set minimal satu level markup > 0 dulu, lalu simpan (Step 1).",
      });
    }

    const [totalRow] = await db.select({ n: sql<number>`COUNT(*)` }).from(services);
    const total = Number(totalRow?.n ?? 0);

    // Base = price_api (modal) kalau > 0, fallback price. Stabil lintas multi-klik.
    const base = sql`COALESCE(NULLIF(${services.priceApi}, 0), ${services.price})`;
    if (member !== 0) {
      await db.execute(sql`
        UPDATE services SET price = ROUND(${base} * (1 + ${member} / 100))
      `);
    }
    if (reseller !== 0) {
      await db.execute(sql`
        UPDATE services SET price_reseller = ROUND(${base} * (1 + ${reseller} / 100))
      `);
    }
    if (agen !== 0) {
      await db.execute(sql`
        UPDATE services SET price_api = ROUND(${base} * (1 + ${agen} / 100))
      `);
    }

    // A-08 fix: profit_agen = price - price_api (margin agen), bukan price_api - price_api.
    await db.execute(sql`
      UPDATE services
      SET
        profit          = ROUND(price - price_api),
        profit_reseller = ROUND(price_reseller - price_api),
        profit_agen     = ROUND(price - price_api)
    `);

    invalidatePricingCache();

    await logAudit({
      adminId: Number(locals.user.id),
      action: "apply_pricing_to_catalog",
      entity: "services",
      detail: {
        markup: { Member: member, Agen: agen, Reseller: reseller },
        total,
      },
      ip: (locals as any).ip,
    });

    return {
      success: `${total.toLocaleString("id-ID")} layanan di-update. Member ×${(1 + member / 100).toFixed(2)} (${member >= 0 ? "+" : ""}${member}%) · Agen ×${(1 + agen / 100).toFixed(2)} (${agen >= 0 ? "+" : ""}${agen}%) · Reseller ×${(1 + reseller / 100).toFixed(2)} (${reseller >= 0 ? "+" : ""}${reseller}%).`,
      total,
    };
  },
};
