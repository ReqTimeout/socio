import { datetime, int, mysqlTable, text, varchar } from "drizzle-orm/mysql-core";

export const news = mysqlTable("news", {
  id: int("id").autoincrement().primaryKey(),
  kategori: varchar("kategori", { length: 128 }).notNull().default(""),
  content: text("content").notNull(),
  createdAt: datetime("created_at").notNull(),
});

export type News = typeof news.$inferSelect;
export type NewNews = typeof news.$inferInsert;
