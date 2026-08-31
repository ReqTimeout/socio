import { db } from "@socio/db";
import { coupons } from "@socio/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { applyCoupon, type CouponResult } from "@socio/core/pricing";

export interface CouponCheck extends CouponResult {
  couponId?: number;
}

/** Validate kupon terhadap subtotal. Tidak mengubah data apa pun. */
export async function validateCoupon(code: string, subtotal: number): Promise<CouponCheck> {
  const codeNorm = code.trim().toUpperCase();
  if (!codeNorm) return { valid: false, discount: 0, message: "Masukkan kode kupon." };
  const [c] = await db.select().from(coupons).where(eq(coupons.code, codeNorm)).limit(1);
  if (!c) return { valid: false, discount: 0, message: `Kupon ${codeNorm} tidak ditemukan.` };
  const res = applyCoupon(
    {
      code: c.code,
      type: c.type,
      value: Number(c.value),
      minOrder: Number(c.minOrder),
      maxDiscount: Number(c.maxDiscount),
      expiresAt: c.expiresAt,
      maxUsage: c.maxUsage,
      used: c.used,
      active: c.active,
    },
    subtotal,
  );
  return { ...res, couponId: res.valid ? c.id : undefined };
}

/**
 * Klaim cuota kupon atomik (CAS): `used = used + 1` hanya kalau kuota masih ada.
 * Return false kalau kuota habis di antara validasi & order (anti race).
 */
export async function consumeCoupon(couponId: number): Promise<boolean> {
  const res: any = await db
    .update(coupons)
    .set({ used: sql`${coupons.used} + 1` })
    .where(
      and(
        eq(coupons.id, couponId),
        sql`(${coupons.maxUsage} = 0 OR ${coupons.used} < ${coupons.maxUsage})`,
      ),
    );
  const rows = Array.isArray(res) ? res : [res];
  return Number(rows[0]?.affectedRows ?? 1) > 0;
}

/** Balikkan pemakai kalau order gagal setelah kupon diklaim (best-effort). */
export async function releaseCoupon(couponId: number): Promise<void> {
  await db
    .update(coupons)
    .set({ used: sql`GREATEST(${coupons.used} - 1, 0)` })
    .where(eq(coupons.id, couponId));
}
