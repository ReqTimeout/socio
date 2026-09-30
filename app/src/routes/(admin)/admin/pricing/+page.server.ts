import { db } from "@socio/db";
import { pricingRules, services } from "@socio/db/schema";
import { eq, sql } from "drizzle-orm";
import { redirect, fail } from "@sveltejs/kit";
import { logAudit, assertAdmin, assertAdminRate } from "$lib/server/admin";
import { DEFAULT_PRICING_RULES } from "$lib/server/pricing-defaults";
import { invalidatePricingCache, upsertPricingRule } from "$lib/server/pricing";
import { getFxInfo, setFxFloor } from "$lib/server/fx";
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
    sample: [] as {
      id: number;
      serviceName: string;
      base: number;
      modal: number;
      profit: number;
    }[],
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
        profit: services.profit,
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
        profit: Number(r.profit),
      })),
    };
  } catch (e) {
    console.error("[pricing] load services stats gagal:", e);
  }

  return { rules, stats, fx: await getFxInfo() };
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
      isActive: number;
    }[] = [];

    for (const level of LEVELS) {
      // Field kosong ("") = user menghapus isi (bukan 0). Tolak supaya tidak silent-reset ke 0.
      // Checkbox unchecked / field tidak ada (level nonaktif) = null → pakai 0 + isActive 0.
      const rawMarkup = form.get(`markup_${level}`);
      if (rawMarkup === "")
        return fail(400, { error: `Markup ${level} wajib diisi (0 untuk gratis).` });
      const markupPercent = Number(rawMarkup ?? 0);
      const isActive = form.get(`active_${level}`) === "1" ? 1 : 0;

      if (!Number.isFinite(markupPercent) || markupPercent < 0 || markupPercent > 1000)
        return fail(400, { error: `Markup ${level} harus 0-1000.` });

      updates.push({ level, markupPercent, isActive });
    }

    // flat_/min_ TIDAK ada di form — pertahankan nilai DB (jangan timpa jadi 0).
    const current = await db.select().from(pricingRules);
    const curBy = new Map(current.map((r) => [r.level, r]));

    for (const u of updates) {
      const cur = curBy.get(u.level);
      await upsertPricingRule(u.level, {
        markupPercent: u.markupPercent,
        flatPer1k: Number(cur?.flatPer1k ?? 0),
        minProfitPer1k: Number(cur?.minProfitPer1k ?? 0),
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
   * Set floor kurs USD→IDR manual (anti-rugi). Tidak tersentuh auto-refresh harian.
   * Perubahan floor berlaku di sync katalog berikutnya (maks 1 jam).
   */
  setFloor: async ({ request, locals }) => {
    assertAdmin(locals);
    const _rate = await assertAdminRate("pricing-floor", (locals as any).ip ?? "0.0.0.0", 10, 60);
    if (_rate) return _rate;
    const form = await request.formData();
    const floor = Number(form.get("floor"));
    if (!Number.isFinite(floor) || floor < 1000 || floor > 100000) {
      return fail(400, { error: "Floor harus angka 1.000–100.000." });
    }
    try {
      await setFxFloor(floor);
    } catch (e: any) {
      return fail(400, { error: e?.message ?? "Gagal simpan floor." });
    }
    await logAudit({
      adminId: Number(locals.user.id),
      action: "set_fx_floor",
      entity: "fx_rates",
      detail: { floor: Math.round(floor) },
      ip: (locals as any).ip,
    });
    return {
      success: `Floor kurs disimpan: Rp${Math.round(floor).toLocaleString("id-ID")} per $1.`,
    };
  },
};
