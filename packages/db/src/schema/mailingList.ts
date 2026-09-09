import { int, mysqlTable, varchar, tinyint, timestamp, index } from "drizzle-orm/mysql-core";

/**
 * Daftar email eksternal hasil import XLS/CSV (bukan user terdaftar).
 * Dipakai audience campaign "xls_list". Hormati `subscribed` (unsubscribe).
 */
export const mailingList = mysqlTable(
  "mailing_list",
  {
    id: int("id").autoincrement().primaryKey(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    name: varchar("name", { length: 150 }).notNull().default(""),
    source: varchar("source", { length: 50 }).notNull().default("xls-import"),
    subscribed: tinyint("subscribed").notNull().default(1),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    emailIdx: index("ml_email_idx").on(t.email),
    subIdx: index("ml_sub_idx").on(t.subscribed),
  }),
);

export type MailingListRow = typeof mailingList.$inferSelect;
export type NewMailingListRow = typeof mailingList.$inferInsert;
