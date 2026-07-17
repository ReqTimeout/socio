import {
  double,
  int,
  mysqlTable,
  text,
  tinyint,
  varchar,
  index,
} from "drizzle-orm/mysql-core";

/** Categories for services (IG, TT, YT, TG, ...) */
export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  name: text("name").notNull(),
});

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

/** SMM providers (SMMturk, JAP, IRVAN, SMC, ...) */
export const provider = mysqlTable("provider", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  apiUrlOrder: varchar("api_url_order", { length: 128 }).notNull(),
  apiUrlStatus: varchar("api_url_status", { length: 128 }).notNull(),
  apiKey: varchar("api_key", { length: 128 }).notNull(),
});

export type Provider = typeof provider.$inferSelect;
export type NewProvider = typeof provider.$inferInsert;

/**
 * Internal service catalog (mirrors provider catalog with our pricing).
 * price = base price per 1000 (IDR) for Member level.
 */
export const services = mysqlTable(
  "services",
  {
    id: int("id").autoincrement().primaryKey(),
    categoryId: int("category_id").notNull(),
    type: varchar("type", { length: 128 }).notNull(),
    serviceName: varchar("service_name", { length: 255 }).notNull(),
    note: text("note").notNull(),
    price: double("price").notNull().default(0),
    priceApi: double("price_api").notNull().default(0),
    priceReseller: double("price_reseller").notNull().default(0),
    profit: double("profit").notNull().default(0),
    profitReseller: double("profit_reseller").notNull().default(0),
    profitAgen: double("profit_agen").notNull().default(0),
    min: int("min").notNull().default(0),
    max: int("max").notNull().default(0),
    status: int("status").notNull().default(1),
    providerId: int("provider_id").notNull(),
    providerServiceId: int("provider_service_id").notNull(),
    waktu: text("waktu").notNull(),
    isRefill: tinyint("is_refill").notNull().default(0),
  },
  (t) => ({
    categoryIdx: index("category_id_idx").on(t.categoryId),
    providerIdx: index("provider_id_idx").on(t.providerId),
  }),
);

export type Service = typeof services.$inferSelect;
export type NewService = typeof services.$inferInsert;
