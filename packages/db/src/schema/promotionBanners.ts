import { datetime, int, mysqlEnum, mysqlTable, timestamp, tinyint, varchar } from "drizzle-orm/mysql-core";

export const promotionBanners = mysqlTable("promotion_banners", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 150 }).notNull(),
  subtitle: varchar("subtitle", { length: 255 }).notNull().default(""),
  imageUrl: varchar("image_url", { length: 500 }).notNull().default(""),
  linkUrl: varchar("link_url", { length: 500 }).notNull().default(""),
  position: mysqlEnum("position", ["home", "services", "dashboard"])
    .notNull()
    .default("dashboard"),
  sortOrder: int("sort_order").notNull().default(0),
  isActive: tinyint("is_active").notNull().default(1),
  startAt: datetime("start_at"),
  endAt: datetime("end_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type PromotionBanner = typeof promotionBanners.$inferSelect;
export type NewPromotionBanner = typeof promotionBanners.$inferInsert;
