import {
  datetime,
  int,
  mysqlTable,
  text,
  tinyint,
  varchar,
} from "drizzle-orm/mysql-core";

export const news = mysqlTable("news", {
  id: int("id").autoincrement().primaryKey(),
  kategori: varchar("kategori", { length: 128 }).notNull().default(""),
  content: text("content").notNull(),
  createdAt: datetime("created_at").notNull(),
  /** PRD Service Sync v2 — news terintegrasi sync layanan. */
  eventType: varchar("event_type", { length: 32 }).notNull().default("manual"),
  source: varchar("source", { length: 16 }).notNull().default("manual"),
  serviceId: int("service_id").notNull().default(0),
  isHidden: tinyint("is_hidden").notNull().default(0),
});

export type News = typeof news.$inferSelect;
export type NewNews = typeof news.$inferInsert;
