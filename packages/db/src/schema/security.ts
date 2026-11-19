import { datetime, index, int, varchar, mysqlTable } from "drizzle-orm/mysql-core";

/**
 * DB-backed rate limit store (no Redis).
 * One row per key. Sliding-window counter (port socio.my, Susulan 50):
 * berat = prev_count*(1 - elapsed/window) + count — menghapus burst 2x di
 * batas window pada fixed-window lama. Count + prev_count diperbarui atomik
 * via `INSERT ... ON DUPLICATE KEY UPDATE` (lihat lib/server/rate-limit.ts).
 */
export const rateLimits = mysqlTable(
  "rate_limits",
  {
    key: varchar("key", { length: 160 }).primaryKey(),
    count: int("count").notNull().default(0),
    prevCount: int("prev_count").notNull().default(0),
    windowStart: datetime("window_start").notNull(),
    expiresAt: datetime("expires_at").notNull(),
  },
  (t) => ({
    expiresIdx: index("rate_limits_expires_idx").on(t.expiresAt),
  }),
);

export type RateLimit = typeof rateLimits.$inferSelect;
export type NewRateLimit = typeof rateLimits.$inferInsert;
