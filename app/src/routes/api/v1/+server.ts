import { json } from "@sveltejs/kit";
import { db } from "@socio/db";
import {
  users,
  services,
  categories,
  orders,
  provider,
  balanceLogs,
  apiUsage,
  deposits,
  affiliate,
} from "@socio/db/schema";
import { eq, and, sql, desc, inArray } from "drizzle-orm";
import { randomInt } from "node:crypto";
import { smmturkAddFor, smmturkRefillFor } from "@socio/core/smmturk";
import {
  baseForLevel,
  effectivePer1k,
  computePrice,
  modalAmountFor,
  type UserLevel,
} from "@socio/core/pricing";
import { orderFieldSpec } from "@socio/core/catalog";
import { getPricingRules } from "$lib/server/pricing";
import { isProviderAllowedForCategory } from "$lib/server/active-provider";
import { decryptSecret } from "$lib/server/crypto";
import { rateLimit } from "$lib/server/rate-limit";
import { asciiSafe } from "$lib/format";
import { requestOrderCancel } from "$lib/server/order-cancel";
import { createManualDepositInvoice } from "$lib/server/api-deposit";
import {
  API_CURRENCY,
  isApiLevelAllowed,
  mapOrderStatus,
  parseBatchIds,
  cancelReasonMessage,
  clampHistoryLimit,
  socioStatusesForApiFilter,
  normalizeIdempotencyKey,
  parseBulkOrders,
  checkApiSignature,
  isSandbox,
  sandboxOrderId,
  isSandboxOrderId,
  affiliateCanWithdraw,
} from "$lib/server/api-compat";
import {
  getIdempotentOrder,
  claimIdempotencyKey,
  finalizeIdempotency,
  releaseIdempotency,
} from "$lib/server/api-idempotency";
import { setUserWebhook, setUserApiSecret } from "$lib/server/api-webhook";
import { claimNonce } from "$lib/server/api-replay";
import type { RequestHandler } from "./$types";

/**
 * Reseller API — KOMPATIBEL SMMturk / standar SMM panel API v2 (smmturk.org/api).
 *
 * Port penuh dari app.socio.my (14 action, format flat) dengan adaptasi .id:
 * mata uang IDR (rupiah integer, bukan sen), pricing computePrice (tanpa override
 * kategori), deposit manual BCA (bukan TnG QR), link affiliate /daftar.
 *
 * Param `key` (alias legacy `api_key`), action `add` (alias `order`), `balance`
 * (alias `profile`), + services, bulk_add, status, refill, refill_status, cancel,
 * orders, set_webhook, set_api_secret, deposit, deposits, affiliate.
 * Response FLAT mengikuti docs SMMturk: services=[{service,name,type,category,
 * rate,min,max,refill,cancel}], add={order}, status={charge,start_count,status,
 * remains,currency}, refill={refill}, balance={balance,currency}, error={error}.
 *
 * AKSES: hanya level Reseller + Agen (model wholesale/agen). Member/Admin/Demo/
 * Blacklist/nonaktif ditolak. Reseller wajib `resellerActivated` (paritas order web).
 *
 * Aliran uang TETAP atomik: deduct saldo sebelum kontak provider, refund otomatis
 * bila provider menolak / provider tidak aktif / insert order gagal. Pricing paritas
 * web checkout (computePrice: floor min_profit + routing Package vs Default).
 *
 * Keamanan (port Susulan 50 .my): HMAC wajib bila api_secret diset, nonce anti-replay,
 * rate-limit sliding fail-closed, error generik (tanpa bocoran detail internal),
 * webhook SSRF-guard. BREAKING: format legacy {status,message,data} diganti flat.
 */

const CURRENCY = API_CURRENCY;
const APP_URL = process.env.SOCIO_APP_URL ?? "https://app.socio.id";
/** Rekening BCA tujuan transfer deposit manual (paritas web /saldo/top-up). */
const BCA_NUMBER = process.env.SOCIO_BCA_NUMBER ?? "1392680815";
const BCA_NAME = process.env.SOCIO_BCA_NAME ?? "Awangga Ramadhi";

type ApiUser = typeof users.$inferSelect;

/** Response error format SMMturk: {error: "..."}. */
function smmError(message: string): Response {
  return json({ error: message });
}

/** Autentikasi via api_key. Blokir Blacklist/nonaktif (B-14). Gate level di POST. */
async function authByKey(apiKey: string): Promise<ApiUser | null> {
  if (!apiKey) return null;
  const [u] = await db.select().from(users).where(eq(users.apiKey, apiKey)).limit(1);
  if (!u) return null;
  if (u.level === "Blacklist" || u.status !== "1") return null;
  return u;
}

/**
 * P2.3 (G20): catat pemakaian API ke api_usage best-effort (fire-and-forget,
 * tidak menambah latensi / tidak pernah menggagalkan respons).
 */
function recordApiUsage(args: { action: string; apiKey: string; ip: string; ok: boolean }) {
  void (async () => {
    try {
      const [u] = args.apiKey
        ? await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.apiKey, args.apiKey))
            .limit(1)
        : [];
      await db.insert(apiUsage).values({
        userId: u?.id ?? null,
        action: args.action.slice(0, 32),
        ok: args.ok ? 1 : 0,
        ip: args.ip.slice(0, 64),
        createdAt: new Date(),
      });
    } catch (e) {
      console.error("[api/v1] usage log failed:", (e as Error)?.message);
    }
  })();
}

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
  try {
    // Terima JSON dan form-encoded (JSON bypass CSRF untuk klien API cross-origin).
    const contentType = request.headers.get("content-type") ?? "";
    let params: Record<string, string>;
    if (contentType.includes("application/json")) {
      params = (await request.json()) as Record<string, string>;
    } else {
      const text = await request.text();
      params = Object.fromEntries(new URLSearchParams(text));
    }
    const action = String(params.action ?? "");
    // SMMturk pakai `key`; legacy socio pakai `api_key` — terima keduanya.
    const apiKey = String(params.key ?? params.api_key ?? "");

    const ip = getClientAddress();
    const allowed = await rateLimit(`api-v1:${ip}`, { limit: 60, windowSec: 60, failOpen: false });
    if (!allowed) return smmError("Rate limit exceeded. Max 60 requests/minute.");

    const user = await authByKey(apiKey);
    let res: Response;
    let validAction = false;
    if (!user) {
      res = smmError("Wrong API Key");
    } else if (!isApiLevelAllowed(user.level)) {
      res = smmError(
        "API access is limited to Reseller and Agen accounts. Upgrade your level to use the API.",
      );
    } else {
      // Tier 3 HMAC (Susulan 50): apiSecret diset → signature WAJIB (checkApiSignature)
      // + anti-replay nonce (signature dicatat; replay dalam window ±300s ditolak).
      const sigErr = checkApiSignature(
        { apiSecret: user.apiSecret, apiSignRequired: Boolean(user.apiSignRequired) },
        params,
      );
      const sig = String(params["signature"] ?? "");
      const replayErr =
        !sigErr && sig && !(await claimNonce(user.id, sig))
          ? "Replay detected: signed request already processed"
          : null;
      const guardErr = sigErr ?? replayErr;
      if (guardErr) {
        res = smmError(guardErr);
      } else {
        switch (action) {
          case "services":
            res = await handleServices(user);
            validAction = true;
            break;
          case "add":
          case "order":
            res = await handleAdd(user, params);
            validAction = true;
            break;
          case "bulk_add":
            res = await handleBulkAdd(user, params);
            validAction = true;
            break;
          case "status":
            res = await handleStatus(user, params);
            validAction = true;
            break;
          case "refill":
            res = await handleRefill(user, params);
            validAction = true;
            break;
          case "refill_status":
            res = await handleRefillStatus(user, params);
            validAction = true;
            break;
          case "cancel":
            res = await handleCancel(user, params, ip);
            validAction = true;
            break;
          case "balance":
            res = handleBalance(user, params);
            validAction = true;
            break;
          case "profile":
            res = handleProfile(user);
            validAction = true;
            break;
          case "orders":
          case "history":
            res = await handleOrders(user, params);
            validAction = true;
            break;
          case "set_webhook":
            res = await handleSetWebhook(user, params);
            validAction = true;
            break;
          case "set_api_secret":
            res = await handleSetApiSecret(user, params);
            validAction = true;
            break;
          case "deposit":
          case "topup":
            res = await handleDeposit(user, params);
            validAction = true;
            break;
          case "deposits":
            res = await handleDeposits(user, params);
            validAction = true;
            break;
          case "affiliate":
            res = await handleAffiliate(user);
            validAction = true;
            break;
          default:
            res = smmError("Wrong Action, Read API Documentation First");
        }
      }
    }
    recordApiUsage({ action, apiKey, ip, ok: validAction });
    return res;
  } catch (e) {
    console.error("[api/v1] error:", e);
    return smmError("Internal error");
  }
};

/** GET = info API + ringkasan docs (standar SMM panel API v2). */
export const GET: RequestHandler = async () => {
  return json({
    name: "Socio Reseller API",
    version: "2.0",
    compatible: "Socio API v2 (SMM panel format)",
    documentation: `${APP_URL}/api-docs`,
    base_url: `${APP_URL}/api/v1`,
    http_method: "POST",
    response_format: "JSON",
    actions: [
      "services",
      "add",
      "bulk_add",
      "status",
      "refill",
      "refill_status",
      "cancel",
      "balance",
      "orders",
      "set_webhook",
      "set_api_secret",
      "deposit",
      "deposits",
      "affiliate",
    ],
    access: "Reseller & Agen only",
    currency: CURRENCY,
  });
};

async function handleServices(user: ApiUser): Promise<Response> {
  const rows = await db
    .select({
      id: services.id,
      name: services.serviceName,
      type: services.type,
      refill: services.isRefill,
      cancel: services.allowCancel,
      // Kolom price/priceReseller/priceApi di DB = MODAL murni (rate provider).
      // API publik mengembalikan harga JUAL per level (sudah markup) supaya
      // konsumen tidak pernah melihat modal & cocok dengan nominal tagihan order.
      price: services.price,
      priceReseller: services.priceReseller,
      priceAgen: services.priceApi,
      modalForCalc: services.priceApi,
      min: services.min,
      max: services.max,
      category: categories.name,
    })
    .from(services)
    .innerJoin(categories, eq(categories.id, services.categoryId))
    .where(eq(services.status, 1));

  const level = user.level as UserLevel;
  const rules = await getPricingRules();
  const rule = rules[level];
  const out = rows.map((r) => {
    const base = baseForLevel(
      {
        price: Number(r.price),
        priceApi: Number(r.priceAgen ?? 0),
        priceReseller: Number(r.priceReseller ?? 0),
      },
      level,
    );
    const modal = Math.max(Number(r.modalForCalc ?? 0), 0);
    // .id tidak punya override kategori — effectivePer1k yang sama dipakai
    // computePrice saat order, jadi rate API = rate tagihan. Tanpa pembulatan
    // supaya presisi per-1000 terjaga (String apa adanya).
    const jual = effectivePer1k(base, level, rule, modal);
    // Format SMMturk: rate per-1000 (string), min/max string, refill/cancel boolean.
    return {
      service: r.id,
      name: r.name,
      type: r.type,
      category: r.category,
      rate: String(jual),
      min: String(r.min),
      max: String(r.max),
      refill: Boolean(r.refill),
      cancel: Boolean(r.cancel),
    };
  });
  return json(out);
}

/** Deduct saldo atomik: 0 baris terdampak = saldo kurang (fix P0-1).
 *  Susulan 50: fail-closed — affectedRows tidak terbaca → anggap 0 (hindari overdraft). */
async function deductBalanceAtomic(userId: number, amount: number): Promise<number> {
  // any: bentuk hasil driver mysql2 ([ResultSetHeader, ...]) tidak diekspos
  // tipe Drizzle — affectedRows dibaca manual dari header.
  const res: any = await db
    .update(users)
    .set({ balance: sql`${users.balance} - ${amount}` })
    .where(sql`${users.id} = ${userId} AND ${users.balance} >= ${amount}`);
  const header = Array.isArray(res) ? res[0] : res;
  const n = header?.affectedRows ?? (Array.isArray(header) ? header[0]?.affectedRows : undefined);
  return typeof n === "number" ? n : 0;
}

/** Refund saldo atomik kalau order gagal setelah deduct. */
async function refundBalanceAtomic(userId: number, amount: number): Promise<void> {
  await db
    .update(users)
    .set({ balance: sql`${users.balance} + ${amount}` })
    .where(eq(users.id, userId));
}

/** OID unik (ms + 6 digit acak) — hindari tabrakan Date.now() untuk bulk/concurrent. */
function newOid(): string {
  return `${Date.now()}${randomInt(0, 1_000_000).toString().padStart(6, "0")}`;
}

type PreparedOrder = {
  svc: typeof services.$inferSelect;
  spec: ReturnType<typeof orderFieldSpec>;
  extra: Record<string, string>;
  ctx: { link: string; comments: string; username: string; qty: number; totalPrice: number };
};
type PrepareResult = { ok: true; prep: PreparedOrder } | { ok: false; error: string };

/** Validasi + pricing paritas web (tanpa gerak uang). Dipakai add + bulk_add. */
async function prepareOrder(user: ApiUser, form: Record<string, string>): Promise<PrepareResult> {
  const serviceId = Number(form["service"]);
  const link = String(form["link"] ?? form["data"] ?? "");
  const quantity = Number(form["quantity"] ?? 0);
  const comments = String(form["comments"] ?? "");
  const username = String(form["username"] ?? "").trim();
  if (!serviceId) return { ok: false, error: "Missing service" };

  const [svc] = await db
    .select()
    .from(services)
    .where(and(eq(services.id, serviceId), eq(services.status, 1)))
    .limit(1);
  if (!svc) return { ok: false, error: "Service not available / inactive" };

  // Gate multi-provider .id: provider yang melayani kategori ini harus provider
  // aktif global atau provider target routing. Ditaruh SEBELUM deduct (tidak perlu
  // refund) — paritas dengan gate /pesan.
  if (!(await isProviderAllowedForCategory(Number(svc.providerId), Number(svc.categoryId)))) {
    return { ok: false, error: "Service not available / inactive" };
  }

  const spec = orderFieldSpec(svc.type, svc.serviceName);
  if (spec.needsLink && !link) return { ok: false, error: "Missing link" };
  if (spec.isComments && !comments) return { ok: false, error: "Missing comments" };
  if (spec.needsUsername && !username)
    return { ok: false, error: "Username is required for this service" };

  // Field tambahan per tipe (docs SMMturk) + opsional Subscriptions/Default.
  const extra: Record<string, string> = {
    usernames: String(form["usernames"] ?? "").trim(),
    hashtag: String(form["hashtag"] ?? "").trim(),
    groups: String(form["groups"] ?? "").trim(),
    answer_number: String(form["answer_number"] ?? "").trim(),
    keywords: String(form["keywords"] ?? "").trim(),
    min: String(form["min"] ?? "").trim(),
    max: String(form["max"] ?? "").trim(),
    delay: String(form["delay"] ?? "").trim(),
    runs: String(form["runs"] ?? "").trim(),
    interval: String(form["interval"] ?? "").trim(),
    posts: String(form["posts"] ?? "").trim(),
    old_posts: String(form["old_posts"] ?? "").trim(),
    expiry: String(form["expiry"] ?? "").trim(),
  };
  for (const p of spec.extra) {
    if (!extra[p]) return { ok: false, error: `Missing required parameter: ${p}` };
  }

  // Kuantitas tertagih (paritas web): Custom Comments → baris; Subscriptions → max;
  // sisanya → quantity (Package tetap ditagih per quantity).
  let qty: number;
  if (spec.isComments) qty = comments.split("\n").filter(Boolean).length;
  else if (svc.type === "Subscriptions") qty = Number(extra.max) || 0;
  else qty = quantity;

  if (svc.type === "Subscriptions") {
    if (!qty || qty < svc.min) return { ok: false, error: `min order: ${svc.min}` };
    if (qty > svc.max) return { ok: false, error: `max order: ${svc.max}` };
  } else if (!spec.isComments) {
    if (!qty || qty < svc.min) return { ok: false, error: `min order: ${svc.min}` };
    if (qty > svc.max) return { ok: false, error: `max order: ${svc.max}` };
  }

  const level = user.level as UserLevel;
  // Gate aktivasi Reseller (paritas order web): wajib resellerActivated (bayar + confirm).
  if (level === "Reseller") {
    const [ru] = await db
      .select({ activated: users.resellerActivated })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);
    if (!ru || !ru.activated) {
      return {
        ok: false,
        error: "Reseller account is not activated. Complete activation to order.",
      };
    }
  }

  // Pricing paritas web .id: computePrice (floor min_profit + routing Package/Default).
  // Tidak ada override kategori di .id — rules[level] saja.
  const rules = await getPricingRules();
  const basePer1k = baseForLevel(
    {
      price: Number(svc.price),
      priceApi: Number(svc.priceApi),
      priceReseller: Number(svc.priceReseller),
    },
    level,
  );
  const totalPrice = computePrice(
    basePer1k,
    qty,
    level,
    rules[level],
    Number(svc.priceApi),
    svc.type,
  );
  if (!Number.isFinite(totalPrice) || totalPrice <= 0)
    return { ok: false, error: "Invalid service price" };

  return {
    ok: true,
    prep: { svc, spec, extra, ctx: { link, comments, username, qty, totalPrice } },
  };
}

/** action=add (alias order) — place order. Response SMMturk {order: id}.
 *  Idempotency: param `idempotency_key` (opsional) — replay key sama mengembalikan
 *  order yang sama tanpa deduct/provider call kedua. Claim SEBELUM deduct (race-safe). */
async function handleAdd(user: ApiUser, form: Record<string, string>): Promise<Response> {
  const prep = await prepareOrder(user, form);
  if (!prep.ok) return smmError(prep.error);
  const { svc, spec, extra, ctx } = prep.prep;

  // Sandbox (Tier 3): dry-run — validasi+pricing saja, tanpa deduct/provider/DB.
  if (isSandbox(form)) {
    return json({
      order: sandboxOrderId(),
      sandbox: true,
      charge: String(ctx.totalPrice),
    });
  }

  // Idempotency claim SEBELUM deduct/provider (uang belum bergerak → race-safe).
  const idemKey = normalizeIdempotencyKey(form["idempotency_key"]);
  if (idemKey) {
    const done = await getIdempotentOrder(user.id, idemKey);
    if (done) return json({ order: done });
    const claimed = await claimIdempotencyKey(user.id, idemKey);
    if (!claimed) {
      const done2 = await getIdempotentOrder(user.id, idemKey);
      if (done2) return json({ order: done2 });
      return smmError("Duplicate idempotency_key: a request with this key is already in progress");
    }
  }

  const placed = await placeOrderAfterPricing(user, svc, spec, extra, ctx);
  if (idemKey) {
    if (placed.oid) await finalizeIdempotency(user.id, idemKey, placed.oid);
    else await releaseIdempotency(user.id, idemKey);
  }
  return placed.res;
}

/** action=bulk_add — banyak order dalam 1 request (JSON array `orders`, ≤100).
 *  Tiap item diproses atomik (deduct→provider→insert) secara berurutan; item gagal
 *  refund sendiri dan tidak menghentikan item lain. Response [{order}|{error}] selaras
 *  urutan input. idempotency_key per item opsional (replay aman). */
async function handleBulkAdd(user: ApiUser, form: Record<string, string>): Promise<Response> {
  const parsed = parseBulkOrders(form["orders"]);
  if (!parsed.ok) return smmError(parsed.error);
  const sandbox = isSandbox(form);

  const results: Array<Record<string, unknown>> = [];
  for (const item of parsed.items) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      results.push({ error: "Invalid order item" });
      continue;
    }
    const f = item as Record<string, string>;
    const prep = await prepareOrder(user, f);
    if (!prep.ok) {
      results.push({ error: prep.error });
      continue;
    }
    const { svc, spec, extra, ctx } = prep.prep;
    if (sandbox) {
      results.push({
        order: sandboxOrderId(),
        sandbox: true,
        charge: String(ctx.totalPrice),
      });
      continue;
    }
    const idemKey = normalizeIdempotencyKey(f["idempotency_key"]);
    if (idemKey) {
      const done = await getIdempotentOrder(user.id, idemKey);
      if (done) {
        results.push({ order: done });
        continue;
      }
      const claimed = await claimIdempotencyKey(user.id, idemKey);
      if (!claimed) {
        const done2 = await getIdempotentOrder(user.id, idemKey);
        results.push(done2 ? { order: done2 } : { error: "Duplicate idempotency_key in progress" });
        continue;
      }
    }
    const placed = await placeOrderAfterPricing(user, svc, spec, extra, ctx);
    if (idemKey) {
      if (placed.oid) await finalizeIdempotency(user.id, idemKey, placed.oid);
      else await releaseIdempotency(user.id, idemKey);
    }
    results.push(placed.oid ? { order: placed.oid } : { error: placed.error ?? "Order failed" });
  }
  return json(results);
}

type PlacedOrder = { res: Response; oid: string | null; error: string | null };

/** Deduct → provider → insert order + ledger (setelah validasi/pricing/idempotency). */
async function placeOrderAfterPricing(
  user: ApiUser,
  svc: typeof services.$inferSelect,
  spec: ReturnType<typeof orderFieldSpec>,
  extra: Record<string, string>,
  ctx: { link: string; comments: string; username: string; qty: number; totalPrice: number },
): Promise<PlacedOrder> {
  const { link, comments, username, qty, totalPrice } = ctx;

  // Deduct saldo atomik SEBELUM kontak provider (fix P0-1).
  const affected = await deductBalanceAtomic(user.id, totalPrice);
  if (affected === 0)
    return { res: smmError("Not Enough Balance"), oid: null, error: "Not Enough Balance" };

  const [p] = await db.select().from(provider).where(eq(provider.id, svc.providerId)).limit(1);
  if (!p || p.name === "MANUAL") {
    await refundBalanceAtomic(user.id, totalPrice);
    return {
      res: smmError("Service not available (no provider)"),
      oid: null,
      error: "Service not available (no provider)",
    };
  }
  // Guard TOCTOU: provider bisa dinonaktifkan antara prepareOrder dan deduct.
  if (!(await isProviderAllowedForCategory(Number(svc.providerId), Number(svc.categoryId)))) {
    await refundBalanceAtomic(user.id, totalPrice);
    return {
      res: smmError("Service unavailable (inactive provider)"),
      oid: null,
      error: "Service unavailable (inactive provider)",
    };
  }

  let providerOrderId = "0";
  // .id: provider 1 = MANUAL (tidak dikirim ke API provider); SMMturk = 2.
  if (svc.providerId !== 1) {
    const key = decryptSecret(p.apiKey);
    if (!key) {
      await refundBalanceAtomic(user.id, totalPrice);
      return {
        res: smmError("Provider not configured"),
        oid: null,
        error: "Provider not configured",
      };
    }
    try {
      // Payload dinamis per tipe — sama pola aksi /pesan (orderFieldSpec).
      const provParams: Parameters<typeof smmturkAddFor>[2] = {
        service: String(svc.providerServiceId),
      };
      if (spec.needsLink) provParams.link = link;
      if (spec.isComments) provParams.comments = comments;
      else if (spec.hasQuantity) provParams.quantity = qty;
      if (spec.needsUsername) provParams.username = username;
      const pickedExtra: Record<string, string> = {};
      for (const ep of spec.extra) {
        const v = extra[ep];
        if (v) pickedExtra[ep] = v;
      }
      for (const op of ["runs", "interval", "posts", "old_posts", "expiry"]) {
        if (extra[op]) pickedExtra[op] = extra[op];
      }
      if (Object.keys(pickedExtra).length > 0) provParams.extra = pickedExtra;
      const result = await smmturkAddFor(p.apiUrlOrder, key, provParams);
      if (result.error) {
        await refundBalanceAtomic(user.id, totalPrice);
        console.error("[api/v1] provider add rejected:", result.error);
        // Error generik ke klien — detail provider hanya di log server.
        const msg = "Provider rejected the order";
        return { res: smmError(msg), oid: null, error: msg };
      }
      providerOrderId = result.order ?? "0";
    } catch (e) {
      await refundBalanceAtomic(user.id, totalPrice);
      console.error("[api/v1] provider add error:", e);
      const msg = "Provider error, try again later";
      return { res: smmError(msg), oid: null, error: msg };
    }
  }

  const now = new Date();
  const oid = newOid();
  // Profit riil = dibayar − modal provider (katalog menyimpan modal murni di
  // price_api; modalAmountFor mengikuti semantik rate per tipe: per-1000 / per-pack).
  const profit = Math.round(totalPrice - modalAmountFor(svc.type, Number(svc.priceApi) || 0, qty));
  try {
    await db.insert(orders).values({
      userId: user.id,
      oid,
      sid: String(svc.providerServiceId),
      providerOrderId,
      user: link,
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
    // type "ord" (varchar(5) legacy) + note asciiSafe — kolom note utf8mb3,
    // nama layanan bisa mengandung emoji/karakter non-BMP.
    await db.insert(balanceLogs).values({
      userId: user.id,
      type: "ord",
      amount: -totalPrice,
      note: asciiSafe(`Order ${svc.serviceName} (${oid})`),
      createdAt: now,
    });
  } catch (e) {
    // Susulan 50: provider sudah place + saldo sudah deduct, tapi insert order gagal
    // → refund supaya user tidak kehilangan uang tanpa order. Log providerOrderId
    // untuk rekonsiliasi admin (order yatim di provider).
    await refundBalanceAtomic(user.id, totalPrice);
    console.error(
      "[api/v1] order insert failed after provider place; refunded. providerOrderId=",
      providerOrderId,
      e,
    );
    const msg = "Order failed, please retry";
    return { res: smmError(msg), oid: null, error: msg };
  }

  // SMMturk: {order: id}. oid socio dipakai sebagai order id untuk status/refill/cancel.
  return { res: json({ order: oid }), oid, error: null };
} /** action=orders (alias history) — daftar order user: filter status/service + limit/offset. */
async function handleOrders(user: ApiUser, form: Record<string, string>): Promise<Response> {
  const limit = clampHistoryLimit(form["limit"]);
  const offset = Math.max(0, Math.floor(Number(form["offset"]) || 0));
  const conditions = [eq(orders.userId, user.id)];
  const statusFilter = String(form["status"] ?? "").trim();
  if (statusFilter) {
    const socio = socioStatusesForApiFilter(statusFilter);
    if (!socio) return smmError("Invalid status filter");
    conditions.push(
      sql`${orders.status} IN (${sql.join(
        socio.map((s) => sql`${s}`),
        sql`,`,
      )})`,
    );
  }
  const serviceFilter = Number(form["service"]);
  if (serviceFilter) conditions.push(eq(orders.serviceId, serviceFilter));
  const rows = await db
    .select()
    .from(orders)
    .where(and(...conditions))
    .orderBy(desc(orders.id))
    .limit(limit)
    .offset(offset);
  const out = rows.map((o) => ({
    order: String(o.oid),
    service: Number(o.serviceId),
    name: o.serviceName,
    link: o.data,
    quantity: String(o.quantity),
    charge: String(Number(o.price)),
    status: mapOrderStatus(o.status),
    remains: String(o.remains ?? 0),
    start_count: String(o.startCount ?? 0),
    created_at: o.createdAt ? o.createdAt.toISOString().replace("T", " ").slice(0, 19) : "",
    currency: CURRENCY,
  }));
  return json(out);
}

function statusPayload(o: typeof orders.$inferSelect) {
  return {
    charge: String(Number(o.price)),
    start_count: String(o.startCount ?? 0),
    status: mapOrderStatus(o.status),
    remains: String(o.remains ?? 0),
    currency: CURRENCY,
  };
}

/** Status simulasi sandbox (Tier 3) — order SBX- selalu Completed, tanpa DB. */
function sandboxStatusPayload() {
  return {
    charge: "0",
    start_count: "0",
    status: "Completed",
    remains: "0",
    currency: CURRENCY,
    sandbox: true,
  };
}

/** action=status — order (tunggal) atau orders (multi, koma ≤100). */
async function handleStatus(user: ApiUser, form: Record<string, string>): Promise<Response> {
  const multi = String(form["orders"] ?? "").trim();
  const single = String(form["order"] ?? form["id"] ?? "").trim();
  if (multi) {
    const ids = parseBatchIds(multi);
    const rows = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.userId, user.id),
          sql`${orders.oid} IN (${sql.join(
            ids.map((i) => sql`${i}`),
            sql`,`,
          )})`,
        ),
      );
    const byOid = new Map(rows.map((o) => [String(o.oid), o]));
    const out: Record<string, unknown> = {};
    for (const id of ids) {
      const o = byOid.get(id);
      out[id] = isSandboxOrderId(id)
        ? sandboxStatusPayload()
        : o
          ? statusPayload(o)
          : { error: "Incorrect order ID" };
    }
    return json(out);
  }
  if (!single) return smmError("Missing order id");
  if (isSandboxOrderId(single)) return json(sandboxStatusPayload());
  const [o] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.oid, single), eq(orders.userId, user.id)))
    .limit(1);
  if (!o) return smmError("Incorrect order ID");
  return json(statusPayload(o));
}

/** action=refill — order (tunggal {refill}) atau orders (multi [{order,refill}]). */
async function handleRefill(user: ApiUser, form: Record<string, string>): Promise<Response> {
  const multi = String(form["orders"] ?? "").trim();
  const single = String(form["order"] ?? form["id"] ?? "").trim();
  const ids = multi ? parseBatchIds(multi) : single ? [single] : [];
  if (!ids.length) return smmError("Missing order id");

  const results: Array<{ order: string; refill: unknown }> = [];
  for (const oid of ids) {
    const [o] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.oid, oid), eq(orders.userId, user.id)))
      .limit(1);
    if (!o) {
      results.push({ order: oid, refill: { error: "Incorrect order ID" } });
      continue;
    }
    const [svc] = await db
      .select({ isRefill: services.isRefill })
      .from(services)
      .where(eq(services.id, Number(o.serviceId)))
      .limit(1);
    if (!svc?.isRefill) {
      results.push({ order: oid, refill: { error: "Refill not available for this service" } });
      continue;
    }
    // Guard .id: tanpa providerOrderId, request refill tidak bisa dilacak polling.
    if (!o.providerOrderId || o.providerOrderId === "0") {
      results.push({ order: oid, refill: { error: "Refill not available for this order" } });
      continue;
    }
    // Provider-safe (P1.5): endpoint + key milik provider order ini, bukan
    // hardcoded SMMturk — order provider lain dulu dikirim ke key yang salah.
    const [p] = await db
      .select()
      .from(provider)
      .where(eq(provider.id, Number(o.providerId)))
      .limit(1);
    const key = p?.apiKey ? decryptSecret(p.apiKey) : "";
    if (!key) {
      results.push({ order: oid, refill: { error: "Refill not available" } });
      continue;
    }
    const endpoint = p?.apiUrlOrder || "https://smmturk.org/api/v2";
    try {
      const result = await smmturkRefillFor(endpoint, key, [o.providerOrderId]);
      const refillId = String(result?.refill ?? result?.order ?? "0");
      // api_log_status='Pending' wajib — tanpa ini runRefillPolling tidak bisa
      // melacak request (dulu INSERT tanpa refill_id = polling buta).
      await db.execute(sql`
        INSERT INTO refill (refill_id, order_id, user_id, status, api_log, api_log_status, created_at)
        VALUES (${refillId}, ${o.id}, ${user.id}, 'Pending', 'api', 'Pending', NOW())
      `);
      // Paritas jalur web (refill-request.ts): tandai 'Refilling' supaya
      // runRefillPolling (WHERE o.status='Refilling') benar-benar memantau sampai
      // selesai. Cast: enum Drizzle orders.status belum memuat 'Refilling'.
      await db
        .update(orders)
        .set({ status: "Refilling" as any, updatedAt: new Date() })
        .where(eq(orders.id, Number(o.id)));
      results.push({ order: oid, refill: refillId });
    } catch (e) {
      console.error("[api/v1] refill error:", e);
      results.push({ order: oid, refill: { error: "Refill failed, try again later" } });
    }
  }
  // Tunggal → {refill: id}; multi → [{order, refill}] (docs SMMturk).
  if (!multi) {
    const r = results[0].refill;
    return typeof r === "object" && r !== null ? json(r) : json({ refill: r });
  }
  return json(results);
}

/** action=refill_status — refill (tunggal {status}) atau refills (multi [{refill,status}]). */
async function handleRefillStatus(user: ApiUser, form: Record<string, string>): Promise<Response> {
  const multi = String(form["refills"] ?? "").trim();
  const single = String(form["refill"] ?? "").trim();
  const ids = multi ? parseBatchIds(multi) : single ? [single] : [];
  if (!ids.length) return smmError("Missing refill id");

  const results: Array<{ refill: string; status: unknown }> = [];
  for (const rid of ids) {
    // any: bentuk hasil db.execute driver mysql2 ([rows, fields]) — dibaca manual.
    const res: any = await db.execute(
      sql`SELECT status FROM refill WHERE refill_id = ${rid} AND user_id = ${user.id} LIMIT 1`,
    );
    const rows = Array.isArray(res?.[0]) ? res[0] : Array.isArray(res) ? res : [];
    const row = rows[0] as { status?: string } | undefined;
    if (!row) results.push({ refill: rid, status: { error: "Refill not found" } });
    else results.push({ refill: rid, status: row.status ?? "Pending" });
  }
  if (!multi) {
    const r = results[0].status;
    return typeof r === "object" && r !== null ? json(r) : json({ status: r });
  }
  return json(results);
}

/** action=cancel — orders (koma ≤100). Response [{order, cancel: 1 | {error}}]. */
async function handleCancel(
  user: ApiUser,
  form: Record<string, string>,
  ip: string,
): Promise<Response> {
  const raw = String(form["orders"] ?? form["order"] ?? "").trim();
  const ids = parseBatchIds(raw);
  if (!ids.length) return smmError("Missing order id");

  const results: Array<{ order: string; cancel: unknown }> = [];
  for (const oid of ids) {
    const [o] = await db
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.oid, oid), eq(orders.userId, user.id)))
      .limit(1);
    if (!o) {
      results.push({ order: oid, cancel: { error: "Incorrect order ID" } });
      continue;
    }
    // requestOrderCancel: ownership via userId, guard allowCancel, idempoten,
    // provider-safe (Canceling → cron refund setelah provider confirm).
    const r = await requestOrderCancel(Number(o.id), { userId: user.id, ip });
    if (r.ok) results.push({ order: oid, cancel: 1 });
    else results.push({ order: oid, cancel: { error: cancelReasonMessage(r.reason) } });
  }
  return json(results);
}

/** action=set_webhook — set URL callback status order (https publik). URL kosong =
 *  off. Return webhook_secret (HMAC-SHA256) supaya reseller verifikasi callback.
 *  regenerate_secret=1 → secret baru. */
async function handleSetWebhook(user: ApiUser, form: Record<string, string>): Promise<Response> {
  const url = String(form["url"] ?? form["webhook_url"] ?? "");
  const regen = String(form["regenerate_secret"] ?? "") === "1";
  const r = await setUserWebhook(user.id, url, regen);
  if (!r.ok) return smmError(r.error);
  return json({ webhook_url: r.url, webhook_secret: r.secret, enabled: Boolean(r.url) });
}

/** action=set_api_secret (Tier 3) — buat secret HMAC request-signing baru.
 *  require_signature=1/0 opsional untuk mewajibkan signature. Return secret + flag. */
async function handleSetApiSecret(user: ApiUser, form: Record<string, string>): Promise<Response> {
  const reqRaw = String(form["require_signature"] ?? "").trim();
  const requireSignature = reqRaw === "" ? undefined : reqRaw === "1" || reqRaw === "true";
  const r = await setUserApiSecret(user.id, requireSignature);
  return json({ api_secret: r.secret, sign_required: r.signRequired });
}

/** action=balance — {balance, currency} (docs SMMturk). sandbox=1 → saldo uji. */
function handleBalance(user: ApiUser, form: Record<string, string>): Response {
  if (isSandbox(form)) return json({ balance: "1000", currency: CURRENCY, sandbox: true });
  return json({ balance: String(Number(user.balance)), currency: CURRENCY });
}

/** action=profile (alias legacy) — superset balance + identitas. */
function handleProfile(user: ApiUser): Response {
  return json({
    balance: String(Number(user.balance)),
    currency: CURRENCY,
    username: user.username,
    full_name: user.fullName ?? "",
    level: user.level,
  });
}

/** Minimum withdraw affiliate .id (rupiah) — paritas halaman /affiliate. */
const AFFILIATE_MIN_WITHDRAW = 5000;

/** action=deposit (alias topup) — buat invoice manual BCA (paritas web top-up).
 *  Pending saja: kredit saldo hanya setelah admin confirm (gateway belum live). */
async function handleDeposit(user: ApiUser, form: Record<string, string>): Promise<Response> {
  const amount = Number(form["amount"] ?? form["nominal"] ?? "");
  const r = await createManualDepositInvoice(user.id, amount);
  if (!r.ok) return smmError(r.error);
  return json({
    invoice: r.invoiceId,
    transfer_amount: String(r.postAmount),
    credited: String(r.credited),
    bonus: String(r.bonus),
    suffix: r.suffix,
    method: r.method,
    status: "Pending",
    expire: r.expireAt,
    bank_number: BCA_NUMBER,
    bank_name: BCA_NAME,
    currency: CURRENCY,
  });
}

/** action=deposits — riwayat deposit (read-only, paritas orders history). */
async function handleDeposits(user: ApiUser, form: Record<string, string>): Promise<Response> {
  const limit = clampHistoryLimit(form["limit"]);
  const offset = Math.max(0, Math.floor(Number(form["offset"] ?? 0) || 0));
  const rows = await db
    .select({
      invoice: deposits.idPm,
      amount: deposits.amount,
      postAmount: deposits.postAmount,
      method: deposits.methodName,
      status: deposits.status,
      createdAt: deposits.createdAt,
      expire: deposits.expire,
    })
    .from(deposits)
    .where(eq(deposits.userId, user.id))
    .orderBy(desc(deposits.createdAt))
    .limit(limit)
    .offset(offset);
  return json(
    rows.map((r) => ({
      invoice: r.invoice,
      amount: String(Number(r.amount)),
      transfer_amount: String(Number(r.postAmount)),
      method: r.method,
      status: r.status,
      created: r.createdAt ? new Date(r.createdAt).toISOString() : null,
      expire: r.expire ? new Date(r.expire).toISOString() : null,
      currency: CURRENCY,
    })),
  );
}

/** action=affiliate — statistik affiliate read-only (paritas halaman /affiliate).
 *  Withdraw tetap di web (approval admin); API tidak memindahkan uang. */
async function handleAffiliate(user: ApiUser): Promise<Response> {
  const userId = user.id;
  const [pendingRow] = await db
    .select({ total: sql<number>`COALESCE(SUM(${affiliate.balance}), 0)` })
    .from(affiliate)
    .where(and(eq(affiliate.userId, userId), eq(affiliate.status, "Pending")));
  const pending = Number(pendingRow?.total ?? 0);
  const [withdrawnRow] = await db
    .select({ total: sql<number>`COALESCE(SUM(${affiliate.balance}), 0)` })
    .from(affiliate)
    .where(and(eq(affiliate.userId, userId), inArray(affiliate.status, ["Withdraw", "Paid"])));
  const withdrawn = Number(withdrawnRow?.total ?? 0);
  const [requestedRow] = await db
    .select({ total: sql<number>`COALESCE(SUM(${affiliate.balance}), 0)` })
    .from(affiliate)
    .where(and(eq(affiliate.userId, userId), eq(affiliate.status, "Requested")));
  const requested = Number(requestedRow?.total ?? 0);
  const [{ downline }] = await db
    .select({ downline: sql<number>`count(*)` })
    .from(users)
    .where(eq(users.upLink, String(user.username)));
  const code = user.reffKode || String(userId);
  return json({
    commission: String(pending),
    withdrawn: String(withdrawn),
    requested: String(requested),
    downline: Number(downline),
    can_withdraw: affiliateCanWithdraw(pending, requested, AFFILIATE_MIN_WITHDRAW),
    min_withdraw: AFFILIATE_MIN_WITHDRAW,
    ref_code: String(code),
    ref_link: `${APP_URL}/daftar?ref=${code}`,
    currency: CURRENCY,
  });
}
