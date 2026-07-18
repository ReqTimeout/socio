import { db } from "@socio/db";
import { deposits, orders } from "@socio/db/schema";
import { eq, and, lt, sql } from "drizzle-orm";

/**
 * Light housekeeping tasks run every 15 minutes:
 *  - expire pending deposits past their `expire` time
 *  - seed next_poll_at for orders that lack it (e.g. legacy rows)
 */
export async function runLightCron(): Promise<void> {
  // Expire deposits
  try {
    await db
      .update(deposits)
      .set({ status: "Canceled" })
      .where(and(eq(deposits.status, "Pending"), lt(deposits.expire, new Date())));
  } catch (e) {
    console.error("[cron] deposit-expire failed:", e);
  }

  // Seed next_poll_at for orders in flight without a schedule
  try {
    await db.execute(sql`
      UPDATE orders
      SET next_poll_at = NOW()
      WHERE status IN ('Pending','In progress') AND next_poll_at IS NULL
      LIMIT 500
    `);
  } catch (e) {
    console.error("[cron] seed-poll failed:", e);
  }

  console.log("[cron] light-cron pass complete");
}
