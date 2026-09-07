import { int, mysqlTable, varchar, datetime, index } from "drizzle-orm/mysql-core";

export const backupLogs = mysqlTable(
  "backup_logs",
  {
    id: int("id").autoincrement().primaryKey(),
    filename: varchar("filename", { length: 255 }).notNull(),
    sizeBytes: int("size_bytes").notNull().default(0),
    status: varchar("status", { length: 20 }).notNull().default("running"), // running | success | failed
    error: varchar("error", { length: 500 }),
    triggeredBy: int("triggered_by").notNull(), // 0 = cron
    startedAt: datetime("started_at").notNull(),
    finishedAt: datetime("finished_at"),
  },
  (t) => ({
    statusIdx: index("status_idx").on(t.status),
    createdIdx: index("started_idx").on(t.startedAt),
  }),
);

export type BackupLog = typeof backupLogs.$inferSelect;
export type NewBackupLog = typeof backupLogs.$inferInsert;
