import { db } from "@socio/db";
import { pricingRules } from "@socio/db/schema";
import { eq } from "drizzle-orm";
import { redirect, fail } from "@sveltejs/kit";
import { logAudit } from "$lib/server/admin";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(303, "/login");
  if (locals.user.level !== "Admin") throw redirect(303, "/");

  const rules = await db.select().from(pricingRules).orderBy(pricingRules.level);

  // Urutkan sesuai hierarki level agar tampil konsisten di UI
  const order = ["Member", "Agen", "Reseller", "Admin"] as const;
  rules.sort((a, b) => order.indexOf(a.level as any) - order.indexOf(b.level as any));

  return { rules };
};

const LEVELS = ["Member", "Agen", "Reseller", "Admin"] as const;
type Level = (typeof LEVELS)[number];

export const actions: Actions = {
  save: async ({ request, locals }) => {
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

      if (!Number.isFinite(markupPercent) || markupPercent < 0)
        return fail(400, { error: `Markup ${level} tidak valid.` });
      if (!Number.isFinite(flatPer1k) || flatPer1k < 0)
        return fail(400, { error: `Flat ${level} tidak valid.` });
      if (!Number.isFinite(minProfitPer1k) || minProfitPer1k < 0)
        return fail(400, { error: `Min profit ${level} tidak valid.` });

      updates.push({ level, markupPercent, flatPer1k, minProfitPer1k, isActive });
    }

    for (const u of updates) {
      await db
        .update(pricingRules)
        .set({
          markupPercent: u.markupPercent,
          flatPer1k: u.flatPer1k,
          minProfitPer1k: u.minProfitPer1k,
          isActive: u.isActive,
        })
        .where(eq(pricingRules.level, u.level));
    }

    await logAudit({
      adminId: Number(locals.user!.id),
      action: "save_pricing_rules",
      entity: "pricing_rules",
      detail: { updates },
      ip: (locals as any).ip,
    });

    return { success: "Aturan harga per level disimpan." };
  },
};
