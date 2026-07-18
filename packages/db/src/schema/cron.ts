import {
  datetime,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  varchar,
  index,
  tinyint,
  double,
} from "drizzle-orm/mysql-core";

/**
 * Mirror of a provider's service catalog (one row per provider service id).
 * `hash` enables diff-based sync (skip unchanged rows).
 */
export const providerServices = mysqlTable(
  "provider_services",
  {
    id: int("id").autoincrement().primaryKey(),
    providerId: int("provider_id").notNull(),
    providerServiceId: varchar("provider_service_id", { length: 64 }).notNull(),
    name: text("name").notNull(),
    category: varchar("category", { length: 128 }).notNull().default(""),
    rate: double("rate").notNull().default(0),
    min: int("min").notNull().default(0),
    max: int("max").notNull().default(0),
    refill: tinyint("refill").notNull().default(0),
    cancel: tinyint("cancel").notNull().default(0),
    hash: varchar("hash", { length: 64 }).notNull().default(""),
    raw: json("raw"),
    lastSeenAt: datetime("last_seen_at").notNull(),
  },
  (t) => ({
    providerIdx: index("ps_provider_idx").on(t.providerId, t.providerServiceId),
  }),
);

export type ProviderService = typeof providerServices.$inferSelect;
export type NewProviderService = typeof providerServices.$inferInsert;

/** Provider sync run log (for monitoring + alerting). */
export const providerSyncLog = mysqlTable(
  "provider_sync_log",
  {
    id: int("id").autoincrement().primaryKey(),
    providerId: int("provider_id").notNull(),
    action: varchar("action", { length: 32 }).notNull(),
    status: mysqlEnum("status", ["ok", "error", "partial"]).notNull().default("ok"),
    durationMs: int("duration_ms").notNull().default(0),
    fetched: int("fetched").notNull().default(0),
    changed: int("changed").notNull().default(0),
    error: text("error"),
    createdAt: datetime("created_at").notNull(),
  },
  (t) => ({
    providerIdx: index("psl_provider_idx").on(t.providerId),
  }),
);

export type ProviderSyncLog = typeof providerSyncLog.$inferSelect;
export type NewProviderSyncLog = typeof providerSyncLog.$inferInsert;
