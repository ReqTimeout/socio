/**
 * Webhook callback status order API publik (port socio.my). Reseller set URL via
 * action `set_webhook`; cron status-polling enqueue delivery saat order mencapai
 * status final; worker cron `api-webhooks` POST payload bertanda tangan HMAC ke URL
 * reseller (retry backoff, maks 5 attempt). DB-backed (pola email-queue, tanpa Redis).
 *
 * Keselamatan: URL wajib https publik (isSafeWebhookUrl, SSRF guard) — dicek saat
 * set, enqueue, DAN sebelum POST. Payload ditandatangani HMAC-SHA256 (secret per
 * user) supaya reseller bisa verifikasi keaslian callback. Mata uang IDR (rupiah).
 */
import { db } from "@socio/db";
import { ensureAdminSchema } from "@socio/db/ensure";
import { users, apiWebhookDeliveries } from "@socio/db/schema";
import { and, eq, lt } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { lookup } from "node:dns/promises";
import {
  API_CURRENCY,
  mapOrderStatus,
  isSafeWebhookUrl,
  isPrivateOrLocalIp,
  webhookSignature,
  webhookBackoffMs,
} from "./api-compat";

const MAX_ATTEMPTS = 5;

/**
 * SSRF defense-in-depth (Susulan 50): resolve hostname → SEMUA alamat (A/AAAA) harus
 * publik. Menangkap DNS rebinding (domain publik yang resolve ke 127.0.0.1/169.254.x/
 * private) yang lolos cek string isSafeWebhookUrl. Fail-closed: DNS gagal/kosong → false.
 * Dipanggil saat set webhook DAN sesaat sebelum worker POST (persempit window TOCTOU).
 */
async function hostResolvesPublic(hostname: string): Promise<boolean> {
  try {
    const addrs = await lookup(hostname, { all: true, verbatim: true });
    if (!addrs.length) return false;
    return addrs.every((a) => !isPrivateOrLocalIp(a.address));
  } catch {
    return false;
  }
}

/** URL webhook lolos guard string + resolve DNS publik. */
async function isDeliverableWebhookUrl(url: string): Promise<boolean> {
  if (!isSafeWebhookUrl(url)) return false;
  try {
    return await hostResolvesPublic(new URL(url).hostname);
  } catch {
    return false;
  }
}

/** Set/ubah URL webhook user. URL kosong = matikan. Secret dibuat kalau kosong
 *  (atau regenerate=true). Return secret supaya reseller bisa verifikasi sign. */
export async function setUserWebhook(
  userId: number,
  rawUrl: string,
  regenerate = false,
): Promise<{ ok: true; url: string; secret: string } | { ok: false; error: string }> {
  const url = String(rawUrl ?? "").trim();
  if (url.length > 500) return { ok: false, error: "Webhook URL too long (max 500)" };
  if (url && !(await isDeliverableWebhookUrl(url)))
    return {
      ok: false,
      error: "Invalid webhook URL (must be a public https URL resolving to a public IP)",
    };
  const [u] = await db
    .select({ secret: users.webhookSecret })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  let secret = u?.secret || "";
  if (url && (!secret || regenerate)) secret = randomBytes(24).toString("hex");
  await db
    .update(users)
    .set({ webhookUrl: url, webhookSecret: secret })
    .where(eq(users.id, userId));
  return { ok: true, url, secret };
}

/** HMAC request-signing: buat secret baru + set flag wajib signature.
 *  requireSignature undefined = pertahankan flag yang ada. Return secret + flag. */
export async function setUserApiSecret(
  userId: number,
  requireSignature?: boolean,
): Promise<{ secret: string; signRequired: boolean }> {
  const secret = randomBytes(24).toString("hex");
  const [u] = await db
    .select({ req: users.apiSignRequired })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const signRequired = requireSignature ?? Boolean(u?.req);
  await db
    .update(users)
    .set({ apiSecret: secret, apiSignRequired: signRequired ? 1 : 0 })
    .where(eq(users.id, userId));
  return { secret, signRequired };
}

/** Enqueue callback status order (best-effort — tidak pernah menggagalkan cron). */
export async function enqueueOrderWebhook(
  order: { userId: number; oid: string; price: number; remains: number; startCount: number },
  status: string,
): Promise<void> {
  try {
    const [u] = await db
      .select({ url: users.webhookUrl, secret: users.webhookSecret })
      .from(users)
      .where(eq(users.id, order.userId))
      .limit(1);
    if (!u?.url || !isSafeWebhookUrl(u.url)) return;
    const payload = JSON.stringify({
      event: "order.status",
      order: String(order.oid),
      status: mapOrderStatus(status),
      // IDR integer (rupiah) — orders.price .id sudah satuan rupiah, bukan sen.
      charge: String(Number(order.price)),
      remains: String(order.remains ?? 0),
      start_count: String(order.startCount ?? 0),
      currency: API_CURRENCY,
      timestamp: new Date().toISOString(),
    });
    await db.insert(apiWebhookDeliveries).values({
      userId: order.userId,
      oid: String(order.oid),
      event: "order.status",
      url: u.url,
      payload,
      signature: webhookSignature(payload, u.secret || ""),
      status: "pending",
      attempts: 0,
      maxAttempts: MAX_ATTEMPTS,
      nextRunAt: new Date(),
      createdAt: new Date(),
    });
  } catch (e) {
    console.error("[api-webhook] enqueue failed:", (e as Error)?.message);
  }
}

async function retryOrFail(id: number, attempts: number, maxAttempts: number, err: string) {
  const next = attempts + 1;
  const lastError = err.slice(0, 255);
  if (next >= maxAttempts) {
    await db
      .update(apiWebhookDeliveries)
      .set({ status: "failed", attempts: next, lastError })
      .where(eq(apiWebhookDeliveries.id, id));
  } else {
    await db
      .update(apiWebhookDeliveries)
      .set({
        attempts: next,
        lastError,
        nextRunAt: new Date(Date.now() + webhookBackoffMs(next)),
      })
      .where(eq(apiWebhookDeliveries.id, id));
  }
}

/** Worker: proses delivery pending yang due → POST signed → delivered/retry/failed. */
export async function runApiWebhookDeliveries(): Promise<void> {
  // Defensif: cron bisa jalan sebelum request pertama (ensureAdminSchema di hooks
  // memoized — panggilan ini murah setelah pertama kali). Tanpa ini, tick pertama
  // pasca-deploy bisa error karena tabel api_webhook_deliveries belum dibuat.
  await ensureAdminSchema();
  const now = new Date();
  const due = await db
    .select()
    .from(apiWebhookDeliveries)
    .where(and(eq(apiWebhookDeliveries.status, "pending"), lt(apiWebhookDeliveries.nextRunAt, now)))
    .limit(50);
  if (due.length === 0) return;
  for (const d of due) {
    if (!(await isDeliverableWebhookUrl(d.url))) {
      await db
        .update(apiWebhookDeliveries)
        .set({ status: "failed", lastError: "Unsafe URL" })
        .where(eq(apiWebhookDeliveries.id, d.id));
      continue;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15_000);
    try {
      const res = await fetch(d.url, {
        method: "POST",
        redirect: "manual",
        headers: {
          "Content-Type": "application/json",
          "X-Socio-Signature": d.signature,
          "X-Socio-Event": d.event,
        },
        body: d.payload,
        signal: ctrl.signal,
      });
      if (res.ok) {
        await db
          .update(apiWebhookDeliveries)
          .set({ status: "delivered", deliveredAt: new Date(), lastError: null })
          .where(eq(apiWebhookDeliveries.id, d.id));
      } else {
        await retryOrFail(d.id, d.attempts, d.maxAttempts, `HTTP ${res.status}`);
      }
    } catch (e) {
      await retryOrFail(d.id, d.attempts, d.maxAttempts, (e as Error)?.message ?? String(e));
    } finally {
      clearTimeout(timer);
    }
  }
  console.log(`[cron] api-webhooks: processed ${due.length} deliveries`);
}
