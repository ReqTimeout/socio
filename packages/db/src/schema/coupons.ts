import { datetime, int, mysqlEnum, mysqlTable, varchar, double, index } from "drizzle-orm/mysql-core";

/**
 * I-U1: coupon / voucher codes applied at checkout on /pesan.
 * Discount is percent (of subtotal) or fixed (IDR).
 */
export const coupons = mysqlTable(
  "coupons",
  {
    id: int("id").autoincrement().primaryKey(),
    code: varchar("code", { length: 40 }).notNull(),
    type: mysqlEnum("type", ["percent", "fixed"]).notNull().default("percent"),
    value: double("value").notNull().default(0),
    minOrder: double("min_order").notNull().default(0),
    maxDiscount: double("max_discount").notNull().default(0),
    expiresAt: datetime("expires_at"),
    maxUsage: int("max_usage").notNull().default(0),
    used: int("used").notNull().default(0),
    active: mysqlEnum("active", ["0", "1"]).notNull().default("1"),
    createdAt: datetime("created_at").notNull(),
  },
  (t) => ({
    codeIdx: index("code_idx").on(t.code),
  }),
);

export type Coupon = typeof coupons.$inferSelect;
export type NewCoupon = typeof coupons.$inferInsert;
