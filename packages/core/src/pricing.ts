export type UserLevel = "Member" | "Agen" | "Reseller" | "Admin";

export interface PricingRule {
  level: UserLevel;
  markupPercent: number;
  flatPer1k: number;
  minProfitPer1k: number;
  isActive: boolean;
}

/** Default rule = 0% markup (harga tersimpan tidak berubah — aman untuk data legacy). */
export const ZERO_RULE = (level: UserLevel): PricingRule => ({
  level,
  markupPercent: 0,
  flatPer1k: 0,
  minProfitPer1k: 0,
  isActive: true,
});

/**
 * Markup rules per member level — port 1:1 dari `app.socio.id/lib/pricing.php`.
 *
 * Konvensi data (legacy dump, 6044 layanan):
 *  - `services.price`          = base harga per 1000 untuk **Member**
 *  - `services.price_reseller` = base harga per 1000 untuk **Reseller**
 *  - `services.price_api`      = base harga per 1000 untuk **Agen** (+ modal provider)
 *
 * Harga jual per 1000 untuk satu level:
 *    effective = base(level) × (1 + markup%/100) + flatPer1k,
 *    dibatasi minimal = price_api + minProfitPer1k (floor anti-jual-rugi).
 *
 * Default markup = 0% (identitas) → harga tersimpan TIDAK berubah.
 * Admin mengatur markup % per level via /admin/pricing (sumber kebenaran = DB).
 */
export function baseForLevel(
  svc: { price: number; priceApi: number; priceReseller: number },
  level: UserLevel,
): number {
  if (level === "Reseller") return Number(svc.priceReseller ?? 0);
  if (level === "Agen") return Number(svc.priceApi ?? 0);
  return Number(svc.price ?? 0);
}

/**
 * Compute the user-facing price for an order.
 * `basePricePer1k` = harga dasar per 1000 sesuai level (lihat `baseForLevel`).
 * `modalPer1k` (opsional) = harga provider per 1000, untuk floor `modal + minProfit`.
 */
export function computePrice(
  basePricePer1k: number,
  quantity: number,
  level: UserLevel = "Member",
  rule?: PricingRule,
  modalPer1k?: number,
): number {
  const r = rule ?? ZERO_RULE(level);
  let per1k = Number(basePricePer1k) * (1 + Number(r.markupPercent) / 100) + Number(r.flatPer1k);
  if (r.isActive && modalPer1k !== undefined && Number(r.minProfitPer1k) > 0) {
    per1k = Math.max(per1k, Number(modalPer1k) + Number(r.minProfitPer1k));
  } else if (!r.isActive) {
    per1k = Number(basePricePer1k);
  }
  const total = (quantity / 1000) * per1k;
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
