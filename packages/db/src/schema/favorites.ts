import { int, mysqlTable, timestamp, index } from "drizzle-orm/mysql-core";

/** User-bookmarked services for quick access (I-U11). */
export const favorites = mysqlTable(
  "favorites",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull().default(0),
    serviceId: int("service_id").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("user_idx").on(t.userId),
    userServiceIdx: index("user_service_idx").on(t.userId, t.serviceId),
  }),
);

export type Favorite = typeof favorites.$inferSelect;
export type NewFavorite = typeof favorites.$inferInsert;
