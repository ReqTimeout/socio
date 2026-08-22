export interface PricingRuleDefault {
  level: "Member" | "Agen" | "Reseller" | "Admin";
  markupPercent: number;
  flatPer1k: number;
  minProfitPer1k: number;
}

/**
 * Default pricing rules used by the seeder (Settings → "generate default").
 * Markup = % di atas base price (price per 1000 di tabel services).
 * Keputusan user (M3, 13 Aug 2026):
 *   Member +200%, Agen +150%, Reseller +180%, Admin 0%.
 */
export const DEFAULT_PRICING_RULES: PricingRuleDefault[] = [
  { level: "Member", markupPercent: 200, flatPer1k: 0, minProfitPer1k: 0 },
  { level: "Agen", markupPercent: 150, flatPer1k: 0, minProfitPer1k: 0 },
  { level: "Reseller", markupPercent: 180, flatPer1k: 0, minProfitPer1k: 0 },
  { level: "Admin", markupPercent: 0, flatPer1k: 0, minProfitPer1k: 0 },
];
