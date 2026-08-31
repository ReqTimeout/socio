import { db } from "@socio/db";
import { pricingRules } from "@socio/db/schema";
import { eq } from "drizzle-orm";
import type { PricingRule, UserLevel } from "@socio/core/pricing";
import { ZERO_RULE } from "@socio/core/pricing";

/**
 * Simpan rule satu level secara UPSERT — update kalau row ada, insert kalau
 * belum (fix P0-2: save lama UPDATE-only = silent no-op saat tabel kosong).
 */
export async function upsertPricingRule(
  level: UserLevel,
  values: { markupPercent: number; flatPer1k: number; minProfitPer1k: number; isActive: number },
): Promise<void> {
  const [existing] = await db
    .select({ id: pricingRules.id })
    .from(pricingRules)
    .where(eq(pricingRules.level, level))
    .limit(1);
  if (existing) {
    await db.update(pricingRules).set(values).where(eq(pricingRules.level, level));
  } else {
    await db.insert(pricingRules).values({ level, ...values });
  }
}

/**
 * Pricing rules dari DB (tabel `pricing_rules`) — satu-satunya sumber kebenaran
 * markup per level. Di-cache 60 detik per proses supaya order flow tidak query DB
 * tiap request. `getPricingRules()` tidak pernah melempar: kalau tabel kosong/
 * error, kembali rule nol (harga tersimpan tidak berubah — port 1:1 PHP lama).
 */
let cache: { at: number; rules: Record<UserLevel, PricingRule> } | null = null;
const TTL_MS = 60_000;

export async function getPricingRules(): Promise<Record<UserLevel, PricingRule>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.rules;
  const levels: UserLevel[] = ["Member", "Agen", "Reseller", "Admin"];
  const out = Object.fromEntries(levels.map((l) => [l, ZERO_RULE(l)])) as Record<
    UserLevel,
    PricingRule
  >;
  try {
    const rows = await db.select().from(pricingRules);
    for (const r of rows) {
      const lvl = r.level as UserLevel;
      if (!out[lvl]) continue;
      out[lvl] = {
        level: lvl,
        markupPercent: Number(r.markupPercent ?? 0),
        flatPer1k: Number(r.flatPer1k ?? 0),
        minProfitPer1k: Number(r.minProfitPer1k ?? 0),
        isActive: Number(r.isActive ?? 1) === 1,
      };
    }
    cache = { at: Date.now(), rules: out };
  } catch (e) {
    console.error("[pricing] gagal load rules dari DB, pakai markup 0:", e);
  }
  return out;
}

/** Invalidate cache (dipanggil setelah admin simpan rule). */
export function invalidatePricingCache(): void {
  cache = null;
}

/** Markup % per level, bentuk ringkas untuk preview UI. */
export async function getMarkupMap(): Promise<Record<UserLevel, number>> {
  const rules = await getPricingRules();
  return {
    Member: rules.Member.markupPercent,
    Agen: rules.Agen.markupPercent,
    Reseller: rules.Reseller.markupPercent,
    Admin: rules.Admin.markupPercent,
  };
}
