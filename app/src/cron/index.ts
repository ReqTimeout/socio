import cron from "node-cron";
import { CRON_JOBS } from "./jobs";
import { runJob } from "../lib/server/cron-runs";
import { runProviderSync, runAllProviderSync } from "./provider-sync";
import { runStatusPolling } from "./status-polling";
import { runBackup } from "../lib/server/backup";
import { db } from "@socio/db";
import { sql } from "drizzle-orm";

export { runBackup };

let started = false;

/**
 * Start all cron schedules from CRON_JOBS registry. Idempotent — called once
 * from hooks.server.ts when SOCIO_CRON_ENABLED=1.
 * Setiap run tercatat ke `cron_runs` (status/durasi/error) via runJob.
 * Job "chained" (service-catalog) TIDAK dijadwalkan sendiri — jalan otomatis
 * di dalam runProviderSync setelah mirror katalog selesai.
 */
export function startCron(): void {
  if (started) return;
  started = true;

  // Reap: row 'running' yang yatim (proses mati/deploy saat sync jalan)
  // ditandai error agar dashboard tidak tampil "sedang jalan" selamanya.
  void (async () => {
    try {
      const { db } = await import("@socio/db");
      const { cronRuns } = await import("@socio/db/schema");
      const { sql } = await import("drizzle-orm");
      await db.execute(sql`
        UPDATE ${cronRuns} SET status = 'error', error = 'Proses restart saat job berjalan', finished_at = NOW()
        WHERE ${cronRuns.status} = 'running' AND ${cronRuns.createdAt} < DATE_SUB(NOW(), INTERVAL 30 MINUTE)
      `);
    } catch {}
  })();

  for (const def of CRON_JOBS) {
    if (def.expr === "chained") continue;
    cron.schedule(def.expr, () => {
      runJob(def.key, () => def.run(0)).catch((e) =>
        console.error(`[cron] ${def.key} failed:`, e?.message ?? e),
      );
    });
  }

  console.log(`[cron] ${CRON_JOBS.length} job terdaftar (1 chained):`, CRON_JOBS.map((j) => j.key).join(", "));
}

/** Manual trigger for provider sync (admin button / halaman providers). */
export async function triggerProviderSync(providerId?: number): Promise<void> {
  await (providerId ? runProviderSync(providerId) : runAllProviderSync());
}

/** Manual trigger cron job by key — dipakai tombol /admin/cron (background). */
export async function triggerCronJob(key: string, adminId: number): Promise<string> {
  const { getJobDef } = await import("./jobs");
  const { isJobRunning } = await import("../lib/server/cron-runs");
  const def = getJobDef(key);
  if (!def) throw new Error("Job tidak dikenal.");
  if (isJobRunning(key)) throw new Error(`Job ${def.label} masih berjalan.`);
  void runJob(key, () => def.run(adminId), adminId).catch((e) =>
    console.error(`[cron] manual ${key} failed:`, e?.message ?? e),
  );
  return def.label;
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

/** Manual trigger for backup (admin button). */
export async function triggerBackup(): Promise<void> {
  await runBackup(0);
}
