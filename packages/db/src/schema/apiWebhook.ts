import { datetime, index, int, mysqlEnum, mysqlTable, text, varchar } from "drizzle-orm/mysql-core";

/**
 * Antrian delivery webhook API publik (port socio.my). Satu baris = satu callback
 * status order ke URL webhook reseller. Worker cron `api-webhooks` memproses
 * pending → POST (bertanda tangan HMAC) → delivered/failed (retry backoff,
 * max_attempts). Pola mengikuti email-queue (DB-backed, tanpa Redis).
 * Tabel fisik dibuat idempoten di packages/db/src/ensure.ts.
 */
export const apiWebhookDeliveries = mysqlTable(
  "api_webhook_deliveries",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull(),
    oid: varchar("oid", { length: 50 }).notNull(),
    event: varchar("event", { length: 40 }).notNull().default("order.status"),
    url: varchar("url", { length: 500 }).notNull(),
    payload: text("payload").notNull(),
    signature: varchar("signature", { length: 64 }).notNull().default(""),
    status: mysqlEnum("status", ["pending", "delivered", "failed"]).notNull().default("pending"),
    attempts: int("attempts").notNull().default(0),
    maxAttempts: int("max_attempts").notNull().default(5),
    lastError: varchar("last_error", { length: 255 }),
    nextRunAt: datetime("next_run_at").notNull(),
    createdAt: datetime("created_at").notNull(),
    deliveredAt: datetime("delivered_at"),
  },
  (t) => ({
    statusRunIdx: index("awd_status_run_idx").on(t.status, t.nextRunAt),
    userIdx: index("awd_user_idx").on(t.userId),
  }),
);

export type ApiWebhookDelivery = typeof apiWebhookDeliveries.$inferSelect;
export type NewApiWebhookDelivery = typeof apiWebhookDeliveries.$inferInsert;
