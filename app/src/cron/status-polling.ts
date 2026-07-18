import { db } from "@socio/db";
import { orders } from "@socio/db/schema";
import { eq, and, inArray, lt, or, isNull, sql } from "drizzle-orm";
import { smmturkStatus } from "@socio/core/smmturk";
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
 * Tick: claim up to 200 orders needing a poll, batch status check via SMMturk
 * (multi-order endpoint), update, schedule next poll, notify on final.
 */
export async function runStatusPolling(): Promise<void> {
  const now = new Date();
  const due = await db
    .select()
    .from(orders)
    .where(
      and(
        sql`${orders.status} IN ('Pending','In progress')`,
        or(isNull(orders.nextPollAt), lt(orders.nextPollAt, now)),
      ),
    )
    .limit(200);

  if (due.length === 0) return;

  const providerOrders = new Map<number, typeof due>();
  for (const o of due) {
    const list = providerOrders.get(o.providerId) ?? [];
    list.push(o);
    providerOrders.set(o.providerId, list);
  }

  for (const [providerId, list] of providerOrders) {
    const ids = list.map((o) => o.providerOrderId).filter(Boolean);
    if (ids.length === 0) continue;
    try {
      const result = await smmturkStatus(ids);
      for (const o of list) {
        const r: any = result[o.providerOrderId];
        if (!r || typeof r === "string") continue;
        const newStatus = mapStatus(r.status);
        const remains = Number(r.remains ?? o.remains);
        const startCount = Number(r.start_count ?? o.startCount);
        const wasFinal = o.status === "Success" || o.status === "Canceled" || o.status === "Partial";
        const isFinal = newStatus === "Success" || newStatus === "Canceled" || newStatus === "Partial";
        const update: any = {
          remains,
          startCount,
          updatedAt: new Date(),
        };
        if (newStatus) update.status = newStatus as any;
        if (!isFinal) {
          update.nextPollAt = new Date(Date.now() + nextPollInterval(newStatus ?? o.status, o.createdAt));
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
      // push next poll further out to avoid hammering a broken API
      await db
        .update(orders)
        .set({ nextPollAt: new Date(Date.now() + 10 * 60 * 1000) })
        .where(inArray(orders.id, list.map((o) => o.id)));
    }
  }
  console.log(`[cron] status-polling: checked ${due.length} orders`);
}
