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

export const deposits = mysqlTable(
  "deposits",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull(),
    payment: mysqlEnum("payment", ["pulsa", "bank"]).notNull(),
    type: mysqlEnum("type", ["manual", "auto", "VA"]).notNull(),
    methodName: varchar("method_name", { length: 255 }).notNull(),
    validasi: varchar("validasi", { length: 100 }).notNull().default(""),
    target: varchar("target", { length: 264 }).notNull().default(""),
    postAmount: double("post_amount").notNull().default(0),
    amount: double("amount").notNull().default(0),
    note: text("note").notNull(),
    phone: varchar("phone", { length: 255 }),
    status: mysqlEnum("status", ["Pending", "Canceled", "Success"]).notNull(),
    createdAt: datetime("created_at").notNull(),
    expire: datetime("expire").notNull(),
    idPm: varchar("id_pm", { length: 280 }).notNull().default(""),
    invoiceVirtual: varchar("invoice_virtual", { length: 128 }).notNull().default(""),
    untukApa: mysqlEnum("untuk_apa", ["smm", "reseller"]),
    img: text("img").notNull(),
  },
  (t) => ({
    userIdx: index("user_id_idx").on(t.userId),
    statusIdx: index("idx_status").on(t.status),
  }),
);

export type Deposit = typeof deposits.$inferSelect;
export type NewDeposit = typeof deposits.$inferInsert;
