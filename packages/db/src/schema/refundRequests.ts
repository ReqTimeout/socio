import { int, mysqlTable, varchar, text, datetime, index } from "drizzle-orm/mysql-core";

export const refundRequests = mysqlTable(
  "refund_requests",
  {
    id: int("id").autoincrement().primaryKey(),
    orderId: int("order_id").notNull(),
    userId: int("user_id").notNull(),
    amount: int("amount").notNull(),
    reason: varchar("reason", { length: 255 }).notNull().default(""),
    requestedBy: int("requested_by").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | approved | rejected | executed
    approvedBy: int("approved_by"),
    executedAt: datetime("executed_at"),
    createdAt: datetime("created_at").notNull(),
    updatedAt: datetime("updated_at").notNull(),
  },
  (t) => ({
    orderIdx: index("order_idx").on(t.orderId),
    statusIdx: index("status_idx").on(t.status),
    userIdx: index("user_idx").on(t.userId),
  }),
);

export type RefundRequest = typeof refundRequests.$inferSelect;
export type NewRefundRequest = typeof refundRequests.$inferInsert;
