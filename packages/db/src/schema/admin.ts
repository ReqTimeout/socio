import {
  mysqlTable,
  int,
  bigint,
  double,
  varchar,
  text,
  json,
  datetime,
  index,
  mysqlEnum,
  tinyint,
} from "drizzle-orm/mysql-core";

export const adminSettings = mysqlTable("admin_settings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 60 }).notNull().unique(),
  value: text("value").notNull().default(""),
  updatedAt: datetime("updated_at").notNull().default(new Date()),
});

export const adminRoles = mysqlTable(
  "admin_roles",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull().unique(),
    role: varchar("role", { length: 20 }).notNull().default("operator"),
    permissions: json("permissions").default(null),
  },
  (t) => ({ userIdx: index("user_idx").on(t.userId) }),
);

/**
 * G3 dual-control balance — penyesuaian saldo admin > hard cap dibuat sebagai
 * request pending; admin KEDUA (reviewed_by != requested_by) yang approve/reject.
 * Pola reuse refund_requests.
 */
export const balanceRequests = mysqlTable(
  "balance_requests",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull(),
    amount: double("amount").notNull(),
    reason: varchar("reason", { length: 255 }).notNull().default(""),
    requestedBy: int("requested_by").notNull(),
    status: mysqlEnum("status", ["pending", "approved", "rejected"])
      .notNull()
      .default("pending"),
    reviewedBy: int("reviewed_by"),
    reviewNote: varchar("review_note", { length: 255 }),
    createdAt: datetime("created_at").notNull().default(new Date()),
    updatedAt: datetime("updated_at").notNull().default(new Date()),
  },
  (t) => ({
    userIdx: index("br_user_idx").on(t.userId),
    statusIdx: index("br_status_idx").on(t.status),
  }),
);

/**
 * G20 API usage monitoring — rekam tiap panggilan API publik /api/v1
 * (best-effort, non-blocking). Dipakai utk audit penyalahgunaan & kuota.
 */
export const apiUsage = mysqlTable(
  "api_usage",
  {
    id: bigint("id", { mode: "number" }).autoincrement().primaryKey(),
    userId: int("user_id"),
    action: varchar("action", { length: 32 }).notNull().default(""),
    ok: tinyint("ok").notNull().default(1),
    ip: varchar("ip", { length: 64 }),
    createdAt: datetime("created_at").notNull().default(new Date()),
  },
  (t) => ({
    userIdx: index("au_user_idx").on(t.userId, t.createdAt),
    createdIdx: index("au_created_idx").on(t.createdAt),
  }),
);
