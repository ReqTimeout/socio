import { int, mysqlTable, varchar, text, datetime, tinyint, index } from "drizzle-orm/mysql-core";

/**
 * Generic run log untuk SEMUA cron job (provider-sync, service-catalog,
 * status-poll, refill-poll, auto-refund, email-queue, light, backup).
 * Dibaca halaman /admin/cron + health metrics — tidak ada lagi status fake.
 */
export const cronRuns = mysqlTable(
  "cron_runs",
  {
    id: int("id").autoincrement().primaryKey(),
    job: varchar("job", { length: 50 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("running"),
    durationMs: int("duration_ms").notNull().default(0),
    detail: varchar("detail", { length: 500 }),
    error: text("error"),
    triggeredBy: int("triggered_by").notNull().default(0),
    createdAt: datetime("created_at").notNull(),
    finishedAt: datetime("finished_at"),
  },
  (t) => ({
    jobIdx: index("cr_job_idx").on(t.job, t.createdAt),
  }),
);

export type CronRun = typeof cronRuns.$inferSelect;
export type NewCronRun = typeof cronRuns.$inferInsert;
