import cron from "node-cron";
import { runProviderSync } from "./provider-sync";
import { runStatusPolling } from "./status-polling";
import { runLightCron } from "./light";
import { db } from "@socio/db";
import { sql } from "drizzle-orm";

let started = false;

/**
 * Start all cron schedules. Idempotent — called once from hooks.server.ts.
 * Schedules:
 *  - provider-sync: every hour
 *  - status-polling: every minute
 *  - light housekeeping: every 15 min
 */
export function startCron(): void {
  if (started) return;
  started = true;

  // Provider catalog sync — hourly
  cron.schedule("0 * * * *", () => {
    runProviderSync(1).catch((e) => console.error("[cron] provider-sync failed:", e));
  });

  // Order status polling — every minute
  cron.schedule("* * * * *", () => {
    runStatusPolling().catch((e) => console.error("[cron] status-polling failed:", e));
  });

  // Light housekeeping — every 15 minutes
  cron.schedule("*/15 * * * *", () => {
    runLightCron().catch((e) => console.error("[cron] light-cron failed:", e));
  });

  console.log("[cron] schedules registered");
}

/** Manual trigger for provider sync (admin button). */
export async function triggerProviderSync(): Promise<void> {
  await runProviderSync(1);
}

/** Manual trigger for a status poll pass. */
export async function triggerStatusPoll(): Promise<number> {
  return db
    .select({ c: sql<number>`COUNT(*)` })
    .from(sql`orders`)
    .where(sql`status IN ('Pending','In progress') AND (next_poll_at IS NULL OR next_poll_at <= NOW())`)
    .then((r) => Number(r[0]?.c ?? 0));
}
