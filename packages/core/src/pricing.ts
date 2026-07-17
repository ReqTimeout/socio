export type UserLevel = "Member" | "Agen" | "Reseller" | "Admin";

export interface PricingRule {
  level: UserLevel;
  markupPercent: number;
  flatPer1k: number;
  minProfitPer1k: number;
  isActive: boolean;
}

const DEFAULT_RULES: Record<UserLevel, PricingRule> = {
  Member: { level: "Member", markupPercent: 0, flatPer1k: 0, minProfitPer1k: 0, isActive: true },
  Agen: { level: "Agen", markupPercent: -10, flatPer1k: 0, minProfitPer1k: 0, isActive: true },
  Reseller: { level: "Reseller", markupPercent: -20, flatPer1k: 0, minProfitPer1k: 0, isActive: true },
  Admin: { level: "Admin", markupPercent: 0, flatPer1k: 0, minProfitPer1k: 0, isActive: true },
};

/**
 * Compute the user-facing price for an order.
 * `basePricePer1k` is the Member base price stored in `services.price`.
 * Higher tiers (Agen/Reseller) get a discount via the pricing rule.
 */
export function computePrice(
  basePricePer1k: number,
  quantity: number,
  level: UserLevel = "Member",
  rule?: PricingRule,
): number {
  const r = rule ?? DEFAULT_RULES[level];
  const per1k = basePricePer1k * (1 + r.markupPercent / 100) + r.flatPer1k;
  const total = (quantity / 1000) * Math.max(per1k, r.minProfitPer1k);
  return Math.round(total);
}
