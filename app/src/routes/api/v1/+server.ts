import { json } from "@sveltejs/kit";
import { db } from "@socio/db";
import {
  users,
  services,
  categories,
  orders,
  provider,
  balanceLogs,
} from "@socio/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { smmturkAdd, smmturkRefill } from "@socio/core/smmturk";
import { rateLimit } from "$lib/server/rate-limit";
import type { RequestHandler } from "./$types";

interface ApiResponse {
  status: boolean;
  message: string;
  data?: any;
}

function ok(message: string, data?: any): Response {
  return json({ status: true, message, data } satisfies ApiResponse);
}
function fail(message: string): Response {
  return json({ status: false, message } satisfies ApiResponse);
}

/** Authenticate by api_key, return user or null. */
async function authByKey(apiKey: string) {
  if (!apiKey) return null;
  const [u] = await db
    .select()
    .from(users)
    .where(eq(users.apiKey, apiKey))
    .limit(1);
  return u ?? null;
}

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
  const form = await request.formData();
  const action = String(form.get("action") ?? "");
  const apiKey = String(form.get("api_key") ?? "");

  // rate-limit: 60 req/min per IP
  const ip = getClientAddress();
  const allowed = await rateLimit(`api-v1:${ip}`, { limit: 60, windowSec: 60 });
  if (!allowed) return fail("Rate limit exceeded. Max 60 requests/minute.");

  switch (action) {
    case "services":
      return handleServices(apiKey);
    case "order":
      return handleOrder(apiKey, form);
    case "status":
      return handleStatus(apiKey, form);
    case "refill":
      return handleRefill(apiKey, form);
    case "profile":
      return handleProfile(apiKey);
    default:
      return fail("Wrong Action, Read API Documentation First");
  }
};

/** GET returns API info + docs summary. */
export const GET: RequestHandler = async () => {
  return json({
    name: "Socio.id Reseller API",
    version: "1.0",
    documentation: "POST with api_key + action (services|order|status|refill|profile)",
    base_url: "https://app.socio.id/api/v1",
  });
};

async function handleServices(apiKey: string): Promise<Response> {
  const user = await authByKey(apiKey);
  if (!user) return fail("Wrong API Key");

  const rows = await db
    .select({
      id: services.id,
      name: services.serviceName,
      status: services.status,
      refill: services.isRefill,
      price: services.price,
      priceReseller: services.priceReseller,
      priceAgen: services.priceApi,
      type: services.type,
      min: services.min,
      max: services.max,
      note: services.note,
      category: categories.name,
    })
    .from(services)
    .innerJoin(categories, eq(categories.id, services.categoryId))
    .where(eq(services.status, 1));

  return ok("Access Allowed", rows);
}

async function handleOrder(apiKey: string, form: FormData): Promise<Response> {
  const user = await authByKey(apiKey);
  if (!user) return fail("Wrong API Key");

  const serviceId = Number(form.get("service"));
  const link = String(form.get("data") ?? form.get("link") ?? "");
  const quantity = Number(form.get("quantity") ?? 0);
  const comments = String(form.get("comments") ?? "");

  if (!serviceId || !link || (!quantity && !comments)) {
    return fail("Wrong Request! Missing service, data (link), or quantity");
  }
  if (quantity && comments) return fail("Wrong Request! Use either quantity OR comments, not both");

  const [svc] = await db
    .select()
    .from(services)
    .where(and(eq(services.id, serviceId), eq(services.status, 1)))
    .limit(1);
  if (!svc) return fail("Service not available / inactive");

  const qty = comments ? comments.split("\n").filter(Boolean).length : quantity;
  if (qty < svc.min) return fail(`min order: ${svc.min}`);
  if (qty > svc.max) return fail(`max order: ${svc.max}`);

  // pricing per level
  const level = (user.level ?? "Member") as any;
  const pricePer1k =
    level === "Reseller" ? svc.priceReseller : level === "Agen" ? svc.priceApi : svc.price;
  const totalPrice = Math.round((pricePer1k / 1000) * qty);

  if (Number(user.balance) < totalPrice) return fail("Not Enough Balance");

  const [p] = await db.select().from(provider).where(eq(provider.id, svc.providerId)).limit(1);
  if (!p) return fail("Service not available (no provider)");

  // place order to SMMturk
  let providerOrderId = "0";
  if (svc.providerId !== 1) {
    // not manual
    try {
      const result = await smmturkAdd(
        String(svc.providerServiceId),
        link,
        comments ? 0 : qty,
      );
      if (result.error) return fail(`Provider error: ${result.error}`);
      providerOrderId = result.order ?? "0";
    } catch (e: any) {
      return fail(`Provider error: ${e?.message ?? e}`);
    }
  }

  // deduct balance
  const newBalance = Number(user.balance) - totalPrice;
  await db.update(users).set({ balance: newBalance }).where(eq(users.id, user.id));

  // create order
  const now = new Date();
  const oid = String(Date.now());
  const profit = Math.round(((svc.profit ?? 0) / 1000) * qty);
  await db.insert(orders).values({
    userId: user.id,
    oid,
    sid: String(svc.providerServiceId),
    providerOrderId,
    serviceName: svc.serviceName,
    serviceId: svc.id,
    data: link,
    komen: comments,
    quantity: qty,
    price: totalPrice,
    profit,
    status: "Pending",
    date: now.toISOString().slice(0, 10).replace(/-/g, ""),
    time: now.toTimeString().slice(0, 8),
    createdAt: now,
    updatedAt: now,
    providerId: svc.providerId,
    isApi: 1,
    nextPollAt: new Date(Date.now() + 60_000),
  });

  // balance log
  await db.insert(balanceLogs).values({
    userId: user.id,
    type: "ord",
    amount: -totalPrice,
    note: `API Order #${oid}`,
    createdAt: now,
  });

  return ok("Order placed", { order_id: oid, price: totalPrice });
}

async function handleStatus(apiKey: string, form: FormData): Promise<Response> {
  const user = await authByKey(apiKey);
  if (!user) return fail("Wrong API Key");

  const orderId = Number(form.get("id"));
  if (!orderId) return fail("Missing order id");

  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, user.id)))
    .limit(1);
  if (!order) return fail("Order ID not Found");

  return ok("Access Allowed", {
    id: order.id,
    status: order.status,
    start_count: order.startCount,
    remains: order.remains,
    price: order.price,
  });
}

async function handleRefill(apiKey: string, form: FormData): Promise<Response> {
  const user = await authByKey(apiKey);
  if (!user) return fail("Wrong API Key");

  const orderId = Number(form.get("id"));
  if (!orderId) return fail("Missing order id");

  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, user.id)))
    .limit(1);
  if (!order) return fail("Order ID not Found");

  const [svc] = await db
    .select({ isRefill: services.isRefill })
    .from(services)
    .where(eq(services.id, Number(order.serviceId)))
    .limit(1);
  if (!svc?.isRefill) return fail("Refill not available for this service");

  try {
    await smmturkRefill([order.providerOrderId]);
    await db.execute(sql`
      INSERT INTO refill (order_id, user_id, status, created_at)
      VALUES (${order.id}, ${user.id}, 'Pending', NOW())
    `);
    return ok("Refill requested", { id: order.id });
  } catch (e: any) {
    return fail(`Refill error: ${e?.message ?? e}`);
  }
}

async function handleProfile(apiKey: string): Promise<Response> {
  const user = await authByKey(apiKey);
  if (!user) return fail("Wrong API Key");

  return ok("Access Allowed", {
    username: user.username,
    full_name: (user as any).fullName ?? "",
    balance: Number(user.balance),
    level: user.level,
  });
}
