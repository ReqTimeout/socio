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
 * Markup rules per member level — single source of truth dari `pricing_rules` DB.
 *
 * ⚠ KONVENSI KATALOG (fix double-markup Sep-2026, keputusan pemilik):
 *   `services.price`, `services.price_api`, `services.price_reseller`
 *   KETIGANYA menyimpan **MODAL MURNI** (rate provider SMMturk) per 1000.
 *   Ketiganya identik post-rebase; perbedaan level TIDAK lagi di-encode ke
 *   kolom DB — cukup dari `pricing_rules.markup_percent`.
 *
 * Harga JUAL per 1000 untuk satu level (dihitung SEKALI saat checkout):
 *   jual = baseForLevel(svc, level) × (1 + markup%/100) + flatPer1k,
 *   floor: max(jual, modal + minProfitPer1k) — anti-jual-rugi.
 *
 * ANTI-PATTERN HARAM (sebabkan bug fatal double-markup order #37735):
 *   ✘ service-sync menulis `price = rateIdr × (1 + markup)` ke DB
 *   ✘ admin /admin/services computePricing menulis marked-up ke `price`
 *   ✘ applyToCatalog "Terapkan ke Katalog" menulis marked-up ke `price`
 *   ✘ bulkCategoryPrice menulis marked-up ke `price`
 *   ✘ API /layanan /api/v1 /pesanan mengirim `s.price` mentah ke client
 *   Semua itu membuat harga efektif = modal × (1+markup)² atau bocor modal.
 *   JANGAN reintroduce. Setiap route baru WAJIB wrap `effectivePer1k`.
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
 * Harga efektif per 1000 untuk satu level — SUDAH termasuk markup + floor
 * anti-jual-rugi. TIDAK bergantung quantity. Dipakai server untuk mengirim
 * SATU angka harga final ke client (tanpa membocorkan base/modal/markup).
 *
 * `modalPer1k` (opsional) = harga provider per 1000, untuk floor `modal + minProfit`.
 */
export function effectivePer1k(
  basePricePer1k: number,
  level: UserLevel = "Member",
  rule?: PricingRule,
  modalPer1k?: number,
): number {
  const r = rule ?? ZERO_RULE(level);
  let per1k =
    Number(basePricePer1k) * (1 + Number(r.markupPercent) / 100) +
    Number(r.flatPer1k);
  if (r.isActive && modalPer1k !== undefined && Number(r.minProfitPer1k) > 0) {
    per1k = Math.max(per1k, Number(modalPer1k) + Number(r.minProfitPer1k));
  } else if (!r.isActive) {
    per1k = Number(basePricePer1k);
  }
  return per1k;
}

/**
 * ⚠ FIXED-PACKAGE PRICING — SMMturk memakai DUA semantik rate pada kolom harga
 * yang sama (`services.price` / `price_api` / `price_reseller`):
 *
 *   - "Default", "Custom Comments", "Subscriptions", dll
 *       rate = per **1000 item** → total = (qty / 1000) × rate; min/max = rentang item.
 *   - "Package", "Custom Comments Package"
 *       rate = per **PACK penuh** (satu bundle + bonus) → total = qty × rate; min = max = 1.
 *
 * Kalau formula per-1000 dipakai ke Package, Socio menagih 1/1000 harga
 * sebenarnya sementara provider dibayar penuh → rugi sampai ~1000× per order
 * (kasus nyata socio.my: Order #58). Di socio.id jalur ini LUAS: terukur di DB
 * produksi 2026-11-05 ada **1.042 `Package` + 136 `Custom Comments Package`
 * aktif**, semuanya `min = max = 1` (mengonfirmasi semantik pack).
 *
 * Semua perhitungan tagihan/modal WAJIB lewat dispatcher di bawah — jangan
 * kalikan `/ 1000` manual lagi di route manapun.
 */
export function isFixedPackageType(type: string | null | undefined): boolean {
  if (!type) return false;
  return type === "Package" || type === "Custom Comments Package";
}

/** Pembagi quantity sesuai semantik rate type: 1000 (per-item) atau 1 (per-pack). */
export function qtyDivisorFor(type: string | null | undefined): number {
  return isFixedPackageType(type) ? 1 : 1000;
}

/**
 * Total tagihan dari rate jual (per-1000 ATAU per-pack, tergantung `type`) × qty.
 * Pembulatan dilakukan di sini — satu kali, identik server & client preview.
 * Rate/qty non-finite atau nonpositif → 0 (pemanggil menolak hasil `<= 0`).
 */
export function orderBillableFor(
  type: string | null | undefined,
  rateJual: number,
  quantity: number,
): number {
  const r = Number(rateJual);
  const q = Number(quantity);
  if (!Number.isFinite(r) || !Number.isFinite(q) || r <= 0 || q <= 0) return 0;
  return Math.round((q / qtyDivisorFor(type)) * r);
}

/**
 * Modal provider untuk qty ini, mengikuti semantik rate `type` (kolom
 * `price_api` menyimpan rate provider dengan semantik yang sama).
 */
export function modalAmountFor(
  type: string | null | undefined,
  modalRate: number,
  quantity: number,
): number {
  const m = Math.max(Number(modalRate) || 0, 0);
  const q = Number(quantity);
  if (!Number.isFinite(m) || !Number.isFinite(q) || m <= 0 || q <= 0) return 0;
  return Math.round((q / qtyDivisorFor(type)) * m);
}

/**
 * Compute the user-facing price for an order.
 * `basePricePer1k` = harga dasar per 1000 sesuai level (lihat `baseForLevel`).
 * `modalPer1k` (opsional) = harga provider per 1000, untuk floor `modal + minProfit`.
 * `serviceType` (opsional) = `services.type` — WAJIB dikirim pemanggil order,
 * supaya layanan Package ditagih per-pack, bukan per-1000 (lihat di atas).
 */
export function computePrice(
  basePricePer1k: number,
  quantity: number,
  level: UserLevel = "Member",
  rule?: PricingRule,
  modalPer1k?: number,
  serviceType?: string | null,
): number {
  const per1k = effectivePer1k(basePricePer1k, level, rule, modalPer1k);
  return orderBillableFor(serviceType, per1k, quantity);
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
  if (c.active !== "1")
    return { valid: false, discount: 0, message: "Kupon tidak aktif." };
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
    c.type === "percent"
      ? Math.round(subtotal * (c.value / 100))
      : Math.round(c.value);
  if (c.maxDiscount > 0)
    discount = Math.min(discount, Math.round(c.maxDiscount));
  discount = Math.min(discount, subtotal);
  if (discount <= 0)
    return {
      valid: false,
      discount: 0,
      message: "Kupon tidak dapat diterapkan.",
    };
  return {
    valid: true,
    discount,
    message: `Hemat Rp${discount.toLocaleString("id-ID")}.`,
  };
}
