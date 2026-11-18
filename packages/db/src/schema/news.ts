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
  /**
   * Kategori pengumuman manual = KEY preset stabil (`info|update|promo|
   * maintenance|urgent`) — label & warna chip dari `newsCategory()` (satu sumber
   * admin & user), jadi baris lama teks bebas tetap tampil (fallback netral).
   * Baris sync menyimpan label event ("Harga Turun" dll.) yang tidak pernah
   * dibaca sebagai kategori preset.
   */
  kategori: varchar("kategori", { length: 128 }).notNull().default(""),
  /** Judul pengumuman (hanya source='manual'; baris sync = '' → judul diturunkan dari konten). */
  title: varchar("title", { length: 255 }).notNull().default(""),
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
