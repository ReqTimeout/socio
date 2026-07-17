import { boolean, double, int, mysqlEnum, mysqlTable, tinyint } from "drizzle-orm/mysql-core";

/**
 * Markup rules per member level. `price` in services table is the base (Member)
 * price per 1000. Higher levels get cheaper prices via markup rules.
 */
export const pricingRules = mysqlTable("pricing_rules", {
  id: int("id").autoincrement().primaryKey(),
  level: mysqlEnum("level", ["Member", "Agen", "Reseller", "Admin"]).notNull(),
  markupPercent: double("markup_percent").notNull().default(0),
  flatPer1k: double("flat_per_1k").notNull().default(0),
  minProfitPer1k: double("min_profit_per_1k").notNull().default(0),
  isActive: tinyint("is_active").notNull().default(1),
});

export type PricingRule = typeof pricingRules.$inferSelect;
export type NewPricingRule = typeof pricingRules.$inferInsert;
