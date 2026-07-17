import { int, mysqlTable, text, varchar, timestamp, index } from "drizzle-orm/mysql-core";

/** Frequently-used links per user for quick reorder. */
export const savedLinks = mysqlTable(
  "saved_links",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull(),
    label: varchar("label", { length: 100 }).notNull().default(""),
    link: text("link").notNull(),
    serviceId: int("service_id").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("user_idx").on(t.userId),
  }),
);

export type SavedLink = typeof savedLinks.$inferSelect;
export type NewSavedLink = typeof savedLinks.$inferInsert;
