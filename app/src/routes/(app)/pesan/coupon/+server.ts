import { db } from "@socio/db";
import { coupons } from "@socio/db/schema";
import { eq } from "drizzle-orm";
import { json, error } from "@sveltejs/kit";
import { applyCoupon } from "@socio/core/pricing";
import type { RequestHandler } from "./$types";

/**
 * Validate a coupon against a subtotal — powers live preview in /pesan
 * before checkout. Server action re-validates authoritatively (sama rule).
 */
export const GET: RequestHandler = async ({ url, locals }) => {
  if (!locals.user) throw error(401, "Unauthorized");
  const code = String(url.searchParams.get("code") ?? "")
    .trim()
    .toUpperCase();
  const subtotal = Number(url.searchParams.get("subtotal") ?? 0);
  if (!code) return json({ valid: false, discount: 0, message: "Masukkan kode kupon." });
  if (!(subtotal > 0)) return json({ valid: false, discount: 0, message: "Pilih layanan dulu." });

  const [c] = await db.select().from(coupons).where(eq(coupons.code, code)).limit(1);
  if (!c) return json({ valid: false, discount: 0, message: `Kupon ${code} tidak ditemukan.` });

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
  return json(res);
};
