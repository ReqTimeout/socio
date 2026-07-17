import { datetime, index, int, varchar, mysqlTable } from "drizzle-orm/mysql-core";

/**
 * DB-backed rate limit store (no Redis).
 * One row per (key, window_start). Count is incremented atomically via
 * `INSERT ... ON DUPLICATE KEY UPDATE count = count + 1`.
 */
export const rateLimits = mysqlTable(
  "rate_limits",
  {
    key: varchar("key", { length: 160 }).primaryKey(),
    count: int("count").notNull().default(0),
    windowStart: datetime("window_start").notNull(),
    expiresAt: datetime("expires_at").notNull(),
  },
  (t) => ({
    expiresIdx: index("rate_limits_expires_idx").on(t.expiresAt),
  }),
);

export type RateLimit = typeof rateLimits.$inferSelect;
export type NewRateLimit = typeof rateLimits.$inferInsert;
