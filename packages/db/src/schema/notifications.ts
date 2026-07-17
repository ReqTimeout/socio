import { datetime, int, mysqlEnum, mysqlTable, text, timestamp, varchar, index } from "drizzle-orm/mysql-core";

export const notifications = mysqlTable(
  "notifications",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull(),
    type: mysqlEnum("type", ["order", "deposit", "ticket", "news", "promo"]).default("news"),
    title: varchar("title", { length: 255 }).notNull(),
    message: text("message"),
    actionUrl: varchar("action_url", { length: 500 }),
    readAt: datetime("read_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    unreadIdx: index("idx_user_unread").on(t.userId, t.readAt),
    createdIdx: index("idx_created").on(t.createdAt),
  }),
);

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
