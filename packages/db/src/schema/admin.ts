import { mysqlTable, int, varchar, text, json, datetime, index } from "drizzle-orm/mysql-core";

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
  (t) => ({ userIdx: index("user_idx").on(t.userId) })
);
