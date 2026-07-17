import { datetime, double, int, mysqlEnum, mysqlTable, index } from "drizzle-orm/mysql-core";

export const affiliate = mysqlTable(
  "affiliate",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull(),
    userAffi: int("user_affi").notNull().default(0),
    balance: double("balance").notNull().default(0),
    status: mysqlEnum("status", ["Pending", "Withdraw"]).notNull().default("Pending"),
    createdAt: datetime("created_at").notNull(),
  },
  (t) => ({
    userIdx: index("user_idx").on(t.userId),
  }),
);

export type Affiliate = typeof affiliate.$inferSelect;
export type NewAffiliate = typeof affiliate.$inferInsert;
