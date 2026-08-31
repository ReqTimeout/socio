import { json } from "@sveltejs/kit";
import { db } from "@socio/db";
import { users, services, categories, orders, provider, balanceLogs } from "@socio/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { smmturkAddFor, smmturkRefill } from "@socio/core/smmturk";
import { baseForLevel, computePrice, type UserLevel } from "@socio/core/pricing";
import { getPricingRules } from "$lib/server/pricing";
import { decryptSecret } from "$lib/server/crypto";
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

/** Authenticate by api_key, return user or null. Blokir user Blacklist/non-aktif (B-14). */
async function authByKey(apiKey: string) {
  if (!apiKey) return null;
  const [u] = await db.select().from(users).where(eq(users.apiKey, apiKey)).limit(1);
  if (!u) return null;
  if (u.level === "Blacklist" || u.status !== "1") return null;
  return u;
}

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
  try {
    // Parse body: accept both JSON and form-encoded (JSON bypasses CSRF for cross-origin API clients)
    const contentType = request.headers.get("content-type") ?? "";
    let params: Record<string, string>;
    if (contentType.includes("application/json")) {
      params = (await request.json()) as Record<string, string>;
    } else {
      const text = await request.text();
      params = Object.fromEntries(new URLSearchParams(text));
    }
    const action = String(params.action ?? "");
    const apiKey = String(params.api_key ?? "");

    // rate-limit: 60 req/min per IP
    const ip = getClientAddress();
    const allowed = await rateLimit(`api-v1:${ip}`, { limit: 60, windowSec: 60 });
    if (!allowed) return fail("Rate limit exceeded. Max 60 requests/minute.");

    switch (action) {
      case "services":
        return handleServices(apiKey);
      case "order":
        return handleOrder(apiKey, params);
      case "status":
        return handleStatus(apiKey, params);
      case "refill":
        return handleRefill(apiKey, params);
      case "profile":
        return handleProfile(apiKey);
      default:
        return fail("Wrong Action, Read API Documentation First");
    }
  } catch (e: any) {
    console.error("[api/v1] error:", e);
    return fail(`Internal error: ${e?.message ?? String(e)}`);
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

/** Deduct saldo atomik: 0 row terdampak = saldo kurang (fix P0-1). */
async function deductBalanceAtomic(userId: number, amount: number): Promise<number> {
  const res: any = await db
    .update(users)
    .set({ balance: sql`${users.balance} - ${amount}` })
    .where(sql`${users.id} = ${userId} AND ${users.balance} >= ${amount}`);
  const rows = Array.isArray(res) ? res : [res];
  const n = rows[0]?.affectedRows;
  return typeof n === "number" ? n : 1;
}

/** Refund balans atomik kalau order gagal setelah deduct. */
async function refundBalanceAtomic(userId: number, amount: number): Promise<void> {
  await db
    .update(users)
    .set({ balance: sql`${users.balance} + ${amount}` })
    .where(eq(users.id, userId));
}

async function handleOrder(apiKey: string, form: Record<string, string>): Promise<Response> {
  const user = await authByKey(apiKey);
  if (!user) return fail("Wrong API Key");

  const serviceId = Number(form["service"]);
  const link = String(form["data"] ?? form["link"] ?? "");
  const quantity = Number(form["quantity"] ?? 0);
  const comments = String(form["comments"] ?? "");

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

  // pricing per level — rules DB (parity dengan web checkout, fix P0-2)
  const level = (
    ["Member", "Agen", "Reseller", "Admin"].includes(user.level ?? "") ? user.level : "Member"
  ) as UserLevel;
  const rules = await getPricingRules();
  const basePer1k = baseForLevel(
    {
      price: Number(svc.price),
      priceApi: Number(svc.priceApi),
      priceReseller: Number(svc.priceReseller),
    },
    level,
  );
  const totalPrice = computePrice(basePer1k, qty, level, rules[level], Number(svc.priceApi));
  if (!Number.isFinite(totalPrice) || totalPrice <= 0) return fail("Invalid service price");

  // Deduct saldo atomik SEBELUM kontak provider (fix P0-1)
  const affected = await deductBalanceAtomic(user.id, totalPrice);
  if (affected === 0) return fail("Not Enough Balance");

  const [p] = await db.select().from(provider).where(eq(provider.id, svc.providerId)).limit(1);
  if (!p || p.name === "MANUAL") {
    await refundBalanceAtomic(user.id, totalPrice);
    return fail("Service not available (no provider)");
  }

  // place order ke provider: key + URL milik provider itu, comments dikirim (fix P0-8)
  let providerOrderId = "0";
  if (svc.providerId !== 1) {
    const key = decryptSecret(p.apiKey);
    if (!key) {
      await refundBalanceAtomic(user.id, totalPrice);
      return fail("Provider not configured");
    }
    try {
      const result =
        svc.type === "Custom Comments"
          ? await smmturkAddFor(p.apiUrlOrder, key, {
              service: String(svc.providerServiceId),
              link,
              comments,
            })
          : svc.type === "Package"
            ? await smmturkAddFor(p.apiUrlOrder, key, {
                service: String(svc.providerServiceId),
                link,
              })
            : await smmturkAddFor(p.apiUrlOrder, key, {
                service: String(svc.providerServiceId),
                link,
                quantity: qty,
              });
      if (result.error) {
        await refundBalanceAtomic(user.id, totalPrice);
        return fail(`Provider error: ${result.error}`);
      }
      providerOrderId = result.order ?? "0";
    } catch (e: any) {
      await refundBalanceAtomic(user.id, totalPrice);
      return fail(`Provider error: ${e?.message ?? e}`);
    }
  }

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

async function handleStatus(apiKey: string, form: Record<string, string>): Promise<Response> {
  const user = await authByKey(apiKey);
  if (!user) return fail("Wrong API Key");

  const orderId = String(form["id"] ?? "").trim();
  if (!orderId) return fail("Missing order id");

  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.oid, orderId), eq(orders.userId, user.id)))
    .limit(1);
  if (!order) return fail("Order ID not Found");

  return ok("Access Allowed", {
    id: order.oid,
    status: order.status,
    start_count: order.startCount,
    remains: order.remains,
    price: order.price,
  });
}

async function handleRefill(apiKey: string, form: Record<string, string>): Promise<Response> {
  const user = await authByKey(apiKey);
  if (!user) return fail("Wrong API Key");

  const orderId = String(form["id"] ?? "").trim();
  if (!orderId) return fail("Missing order id");

  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.oid, orderId), eq(orders.userId, user.id)))
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
    return ok("Refill requested", { id: order.oid });
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
