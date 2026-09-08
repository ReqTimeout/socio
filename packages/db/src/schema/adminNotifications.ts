import { int, mysqlEnum, mysqlTable, varchar, text, datetime, index } from "drizzle-orm/mysql-core";

/** Admin in-app notifications (P3-06/M4: sync alerts, system events). */
export const adminNotifications = mysqlTable(
  "admin_notifications",
  {
    id: int("id").autoincrement().primaryKey(),
    adminId: int("admin_id").notNull().default(0), // 0 = broadcast semua admin
    type: mysqlEnum("type", ["order", "deposit", "ticket", "system", "report"]).default("system"),
    title: varchar("title", { length: 255 }).notNull(),
    message: text("message"),
    actionUrl: varchar("action_url", { length: 500 }),
    priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).default("medium"),
    readAt: datetime("read_at"),
    createdAt: datetime("created_at").notNull(),
  },
  (t) => ({
    adminIdx: index("an_admin_idx").on(t.adminId, t.readAt),
    createdIdx: index("an_created_idx").on(t.createdAt),
  }),
);

export type AdminNotification = typeof adminNotifications.$inferSelect;
export type NewAdminNotification = typeof adminNotifications.$inferInsert;
