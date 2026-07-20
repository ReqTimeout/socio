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

export interface CouponInput {
  code: string;
  type: "percent" | "fixed";
  value: number;
  minOrder: number;
  maxDiscount: number;
  expiresAt: Date | null;
  maxUsage: number;
  used: number;
  active: "0" | "1";
}

export interface CouponResult {
  valid: boolean;
  discount: number;
  message: string;
}

/**
 * Validate a coupon against the subtotal and compute the discount (IDR).
 * `subtotal` is the already-computed user-facing price (after level markup).
 */
export function applyCoupon(c: CouponInput, subtotal: number): CouponResult {
  if (c.active !== "1") return { valid: false, discount: 0, message: "Kupon tidak aktif." };
  if (c.expiresAt && new Date(c.expiresAt) < new Date())
    return { valid: false, discount: 0, message: "Kupon sudah kedaluwarsa." };
  if (c.maxUsage > 0 && c.used >= c.maxUsage)
    return { valid: false, discount: 0, message: "Kupon sudah habis kuota." };
  if (subtotal < c.minOrder)
    return {
      valid: false,
      discount: 0,
      message: `Min. pembelian Rp${Math.round(c.minOrder).toLocaleString("id-ID")}.`,
    };
  let discount =
    c.type === "percent" ? Math.round(subtotal * (c.value / 100)) : Math.round(c.value);
  if (c.maxDiscount > 0) discount = Math.min(discount, Math.round(c.maxDiscount));
  discount = Math.min(discount, subtotal);
  if (discount <= 0)
    return { valid: false, discount: 0, message: "Kupon tidak dapat diterapkan." };
  return { valid: true, discount, message: `Hemat Rp${discount.toLocaleString("id-ID")}.` };
}
