import { db } from "@socio/db";
import { orders, provider } from "@socio/db/schema";
import { eq, and, inArray, lt, or, isNull, sql } from "drizzle-orm";
import { smmturkStatusFor, smmturkRefillStatusFor } from "@socio/core/smmturk";
import { decryptSecret } from "$lib/server/crypto";
import { notifyOrderUpdate } from "$lib/server/notification";

/** Map SMMturk status string to our order status enum. */
function mapStatus(s?: string): string | null {
  if (!s) return null;
  const v = s.toLowerCase();
  if (v.includes("complete") || v.includes("success")) return "Success";
  if (v.includes("cancel")) return "Canceled";
  if (v.includes("partial")) return "Partial";
  if (v.includes("progress") || v.includes("in progress")) return "In progress";
  if (v.includes("pending")) return "Pending";
  if (v.includes("error")) return "Error";
  return null;
}

function nextPollInterval(status: string, createdAt: Date): number {
  const ageMs = Date.now() - createdAt.getTime();
  const hour = 60 * 60 * 1000;
  if (status === "Success" || status === "Canceled" || status === "Partial" || status === "Error")
    return 0; // final, skip
  if (status === "In progress") return 5 * 60 * 1000;
  if (ageMs < hour) return 1 * 60 * 1000;
  if (ageMs < 6 * hour) return 5 * 60 * 1000;
  return 30 * 60 * 1000;
}

/**
 * Tick: claim up to 200 orders needing a poll, batch status check
 * (multi-order endpoint) PER-PROVIDER via each provider's own API URL + key,
 * update, schedule next poll, notify on final.
 * Orders tanpa provider_order_id dianggap Error (port PHP status.php).
 */
export async function runStatusPolling(): Promise<void> {
  const now = new Date();
  const due = await db
    .select()
    .from(orders)
    .where(
      and(
        sql`${orders.status} IN ('Pending','In progress','Processing')`,
        or(isNull(orders.nextPollAt), lt(orders.nextPollAt, now)),
      ),
    )
    .limit(200);

  if (due.length === 0) return;

  // Auto-error: order tanpa provider_order_id tidak bisa di-track
  const untracked = due.filter((o) => !o.providerOrderId || o.providerOrderId === "0");
  for (const o of untracked) {
    // provider MANUAL (1) tetap manual — jangan auto-error, reschedule saja
    if (o.providerId === 1) {
      await db
        .update(orders)
        .set({ nextPollAt: new Date(Date.now() + 30 * 60 * 1000) })
        .where(eq(orders.id, o.id));
      continue;
    }
    await db
      .update(orders)
      .set({ status: "Error" as any, updatedAt: new Date(), nextPollAt: null })
      .where(eq(orders.id, o.id));
    await notifyOrderUpdate(o.userId, o.id, "Error");
  }

  const trackable = due.filter((o) => o.providerOrderId && o.providerOrderId !== "0");
  const providerOrders = new Map<number, typeof trackable>();
  for (const o of trackable) {
    const list = providerOrders.get(o.providerId) ?? [];
    list.push(o);
    providerOrders.set(o.providerId, list);
  }

  for (const [providerId, list] of providerOrders) {
    const [p] = await db.select().from(provider).where(eq(provider.id, providerId)).limit(1);
    const key = p?.apiKey ? decryptSecret(p.apiKey) : "";
    const endpoint = p?.apiUrlOrder || "https://smmturk.org/api/v2";

    // Provider tanpa key (legacy non-SMMturk) → tunda polling, jangan spam
    if (!key) {
      await db
        .update(orders)
        .set({ nextPollAt: new Date(Date.now() + 60 * 60 * 1000) })
        .where(
          inArray(
            orders.id,
            list.map((o) => o.id),
          ),
        );
      console.warn(`[cron] status-polling: provider ${providerId} tanpa api key, skip`);
      continue;
    }

    const ids = list.map((o) => o.providerOrderId);
    try {
      const result = await smmturkStatusFor(endpoint, key, ids);
      for (const o of list) {
        const r: any = result[o.providerOrderId];
        if (!r || typeof r === "string") continue;
        const newStatus = mapStatus(r.status);
        const remains = Number(r.remains ?? o.remains);
        const startCount = Number(r.start_count ?? o.startCount);
        const wasFinal =
          o.status === "Success" ||
          o.status === "Canceled" ||
          o.status === "Partial" ||
          o.status === "Error";
        const isFinal =
          newStatus === "Success" ||
          newStatus === "Canceled" ||
          newStatus === "Partial" ||
          newStatus === "Error";
        const update: any = {
          remains,
          startCount,
          updatedAt: new Date(),
        };
        if (newStatus) update.status = newStatus as any;
        if (!isFinal) {
          update.nextPollAt = new Date(
            Date.now() + nextPollInterval(newStatus ?? o.status, o.createdAt),
          );
        } else {
          update.nextPollAt = null;
        }
        await db.update(orders).set(update).where(eq(orders.id, o.id));
        if (isFinal && !wasFinal) {
          await notifyOrderUpdate(o.userId, o.id, newStatus ?? o.status);
        }
      }
    } catch (e) {
      console.error(`[cron] status-polling provider ${providerId} error:`, e);
      await db
        .update(orders)
        .set({ nextPollAt: new Date(Date.now() + 10 * 60 * 1000) })
        .where(
          inArray(
            orders.id,
            list.map((o) => o.id),
          ),
        );
    }
  }
  console.log(`[cron] status-polling: checked ${due.length} orders`);
}

/**
 * Poll status request refill (port status_refill.php). Order berstatus
 * 'Refilling' dicek statusnya ke provider — selesai/error/reject → Success.
 */
export async function runRefillPolling(): Promise<void> {
  const res: any = await db.execute(sql`
    SELECT o.id, o.provider_id AS providerId, o.provider_order_id AS providerOrderId,
           o.user_id AS userId, r.refill_id AS refillId
    FROM orders o
    JOIN refill r ON r.order_id = o.id
    WHERE o.status = 'Refilling'
    ORDER BY o.id ASC
    LIMIT 100
  `);
  const list = Array.isArray(res?.[0]) ? res[0] : Array.isArray(res) ? res : [];
  if (!list.length) return;

  for (const row of list) {
    try {
      const [p] = await db
        .select()
        .from(provider)
        .where(eq(provider.id, Number(row.providerId)))
        .limit(1);
      const key = p?.apiKey ? decryptSecret(p.apiKey) : "";
      if (!key) continue;
      const endpoint = p?.apiUrlOrder || "https://smmturk.org/api/v2";
      const { status, raw } = await smmturkRefillStatusFor(endpoint, key, String(row.refillId));
      if (!status) continue;
      const mapped =
        status === "Completed" || status === "Success"
          ? "Success"
          : status === "In progress"
            ? "In progress"
            : status === "Error" || status === "Rejected"
              ? "Success" // port PHP: refill ditolak pun kembali ke Success
              : "Pending";
      await db.execute(sql`
        UPDATE refill SET status = ${mapped}, api_log_status = ${raw ?? ""} WHERE order_id = ${row.id}
      `);
      if (mapped === "Success") {
        await db
          .update(orders)
          .set({ status: "Success" as any, updatedAt: new Date() })
          .where(eq(orders.id, Number(row.id)));
      }
    } catch (e) {
      console.error(`[cron] refill-polling order ${row.id} error:`, e);
    }
  }
  console.log(`[cron] refill-polling: checked ${list.length} refills`);
}
