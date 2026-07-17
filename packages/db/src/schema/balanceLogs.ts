import { datetime, double, int, mysqlTable, text, varchar, index } from "drizzle-orm/mysql-core";

export const balanceLogs = mysqlTable(
  "balance_logs",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull(),
    type: varchar("type", { length: 5 }).notNull(),
    amount: double("amount").notNull().default(0),
    note: text("note").notNull(),
    createdAt: datetime("created_at").notNull(),
  },
  (t) => ({
    userIdx: index("user_id_idx").on(t.userId),
  }),
);

export type BalanceLog = typeof balanceLogs.$inferSelect;
export type NewBalanceLog = typeof balanceLogs.$inferInsert;
