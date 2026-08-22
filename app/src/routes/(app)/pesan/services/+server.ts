import { db } from "@socio/db";
import { services } from "@socio/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

/**
 * Services for a given category — powers the self-contained order flow
 * (kategori → layanan) without leaving /pesan, mirroring the old
 * ajax/order-get-service.php + order-select-service.php endpoints.
 */
export const GET: RequestHandler = async ({ url, locals }) => {
  if (!locals.user) throw error(401, "Unauthorized");
  const cat = Number(url.searchParams.get("cat") ?? 0);
  if (!cat) return json([]);

  const rows = await db
    .select({
      id: services.id,
      serviceName: services.serviceName,
      type: services.type,
      price: services.price,
      min: services.min,
      max: services.max,
      isRefill: services.isRefill,
      note: services.note,
      waktu: services.waktu,
      providerId: services.providerId,
      providerServiceId: services.providerServiceId,
    })
    .from(services)
    .where(and(eq(services.categoryId, cat), eq(services.status, 1)))
    .orderBy(asc(services.price));

  return json(rows);
};
