import cron from "node-cron";
import { runProviderSync, runAllProviderSync } from "./provider-sync";
import { runStatusPolling, runRefillPolling } from "./status-polling";
import { runAutoRefund } from "./refund";
import { runEmailQueue } from "./email-queue";
import { runLightCron } from "./light";
import { db } from "@socio/db";
import { sql } from "drizzle-orm";

let started = false;

/**
 * Start all cron schedules. Idempotent — called once from hooks.server.ts
 * when SOCIO_CRON_ENABLED=1.
 * Schedules:
 *  - provider-sync  : every hour (catalog diff)
 *  - status-polling : every minute (stratified)
 *  - refill-polling : every 5 minutes (status Refilling)
 *  - auto-refund    : every 15 minutes (port cron/refund.php)
 *  - email-queue    : every 5 minutes (drain email_queue)
 *  - light          : every 15 minutes (expire deposits, seed poll)
 */
export function startCron(): void {
  if (started) return;
  started = true;

  // Provider catalog sync — hourly (semua provider aktif)
  cron.schedule("0 * * * *", () => {
    runAllProviderSync().catch((e) => console.error("[cron] provider-sync failed:", e));
  });

  // Order status polling — every minute
  cron.schedule("* * * * *", () => {
    runStatusPolling().catch((e) => console.error("[cron] status-polling failed:", e));
  });

  // Refill status polling — every 5 minutes (port status_refill.php)
  cron.schedule("*/5 * * * *", () => {
    runRefillPolling().catch((e) => console.error("[cron] refill-polling failed:", e));
  });

  // Auto refund Error/Partial/Canceled — every 15 minutes (port refund.php)
  cron.schedule("*/15 * * * *", () => {
    runAutoRefund().catch((e) => console.error("[cron] auto-refund failed:", e));
  });

  // Email queue drain — every 5 minutes (campaign, transactional queued)
  cron.schedule("*/5 * * * *", () => {
    runEmailQueue().catch((e) => console.error("[cron] email-queue failed:", e));
  });

  // Light housekeeping — every 15 minutes
  cron.schedule("*/15 * * * *", () => {
    runLightCron().catch((e) => console.error("[cron] light-cron failed:", e));
  });

  console.log("[cron] schedules registered (sync, status, refill, refund, email, light)");
}

/** Manual trigger for provider sync (admin button). */
export async function triggerProviderSync(providerId?: number): Promise<void> {
  await (providerId ? runProviderSync(providerId) : runAllProviderSync());
}

/** Manual trigger for a status poll pass. */
export async function triggerStatusPoll(): Promise<number> {
  await runStatusPolling();
  return db
    .select({ c: sql<number>`COUNT(*)` })
    .from(sql`orders`)
    .where(
      sql`status IN ('Pending','In progress') AND (next_poll_at IS NULL OR next_poll_at <= NOW())`,
    )
    .then((r) => Number(r[0]?.c ?? 0));
}
