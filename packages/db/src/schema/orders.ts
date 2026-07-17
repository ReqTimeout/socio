import {
  datetime,
  double,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  varchar,
  index,
} from "drizzle-orm/mysql-core";

/**
 * User orders. `sid` = provider service id (string), `service_id` = our internal
 * service id (numeric). `status` mirrors provider statuses.
 */
export const orders = mysqlTable(
  "orders",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull(),
    oid: varchar("oid", { length: 50 }).notNull(),
    sid: varchar("sid", { length: 128 }).notNull(),
    providerOrderId: varchar("provider_order_id", { length: 50 }).notNull(),
    user: varchar("user", { length: 100 }).notNull().default(""),
    serviceName: varchar("service_name", { length: 255 }).notNull(),
    serviceId: double("service_id").notNull().default(0),
    data: text("data").notNull(),
    komen: text("komen").notNull(),
    quantity: int("quantity").notNull().default(0),
    remains: int("remains").notNull().default(0),
    startCount: int("start_count").notNull().default(0),
    price: int("price").notNull().default(0),
    profit: double("profit").notNull().default(0),
    status: mysqlEnum("status", [
      "Pending",
      "Processing",
      "Error",
      "Partial",
      "Success",
      "In progress",
      "Canceled",
      "Refilling",
    ])
      .notNull()
      .default("Pending"),
    date: varchar("date", { length: 10 }).notNull().default(""),
    time: varchar("time", { length: 8 }).notNull().default(""),
    createdAt: datetime("created_at").notNull(),
    updatedAt: datetime("updated_at"),
    providerId: int("provider_id").notNull().default(0),
    isApi: int("is_api").notNull().default(0),
    isRefund: int("is_refund").notNull().default(0),
    apiOrderLog: text("api_order_log"),
    apiStatusLog: text("api_status_log"),
  },
  (t) => ({
    userIdx: index("idx_user_id").on(t.userId),
    statusIdx: index("idx_status").on(t.status),
    createdIdx: index("idx_created_at").on(t.createdAt),
  }),
);

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
