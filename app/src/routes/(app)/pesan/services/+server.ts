import { db } from "@socio/db";
import { services } from "@socio/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { json, error } from "@sveltejs/kit";
import { baseForLevel, effectivePer1k, type UserLevel } from "@socio/core/pricing";
import { getPricingRules } from "$lib/server/pricing";
import type { RequestHandler } from "./$types";

/**
 * Services for a given category — powers the self-contained order flow
 * (kategori → layanan) without leaving /pesan, mirroring the old
 * ajax/order-get-service.php + order-select-service.php endpoints.
 *
 * KEAMANAN: harga base/modal (price, price_api, price_reseller) dan persentase
 * markup TIDAK pernah dikirim ke client. Server menghitung harga efektif
 * per-1000 untuk level user login lalu hanya mengembalikan angka final
 * (`pricePer1k`). Client tinggal total = round(qty/1000 * pricePer1k).
 */
export const GET: RequestHandler = async ({ url, locals }) => {
  if (!locals.user) throw error(401, "Unauthorized");
  const cat = Number(url.searchParams.get("cat") ?? 0);
  if (!cat) return json([]);

  const level = (locals.user.level as UserLevel) ?? "Member";
  const rule = (await getPricingRules())[level];

  const rows = await db
    .select({
      id: services.id,
      serviceName: services.serviceName,
      type: services.type,
      price: services.price,
      priceApi: services.priceApi,
      priceReseller: services.priceReseller,
      min: services.min,
      max: services.max,
      isRefill: services.isRefill,
      note: services.note,
      waktu: services.waktu,
    })
    .from(services)
    .where(and(eq(services.categoryId, cat), eq(services.status, 1)))
    .orderBy(asc(services.price));

  // Petakan ke bentuk aman: hanya harga efektif per-1000 untuk level user ini.
  const safe = rows.map((r) => {
    const modal = Number(r.priceApi ?? 0);
    const base = baseForLevel(
      {
        price: Number(r.price),
        priceApi: modal,
        priceReseller: Number(r.priceReseller),
      },
      level,
    );
    const pricePer1k = effectivePer1k(base, level, rule, modal);
    return {
      id: r.id,
      serviceName: r.serviceName,
      type: r.type,
      min: r.min,
      max: r.max,
      isRefill: r.isRefill,
      note: r.note,
      waktu: r.waktu,
      pricePer1k,
    };
  });

  return json(safe);
};
