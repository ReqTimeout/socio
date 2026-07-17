import {
  boolean,
  datetime,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  varchar,
  index,
  primaryKey,
} from "drizzle-orm/mysql-core";

/**
 * Existing `users` table from the legacy PHP dump.
 * Column names preserved (snake_case) for 1:1 compatibility.
 * better-auth will use this table directly via the Drizzle MySQL adapter.
 */
export const users = mysqlTable(
  "users",
  {
    id: int("id").autoincrement().primaryKey(),
    fullName: varchar("full_name", { length: 100 }).notNull(),
    username: varchar("username", { length: 100 }).notNull(),
    email: varchar("email", { length: 100 }).notNull(),
    password: varchar("password", { length: 250 }).notNull(),
    balance: int("balance").notNull().default(0),
    pulsaBalance: int("pulsa_balance").notNull().default(0),
    pulsaBalanceUsed: int("pulsa_balance_used").notNull().default(0),
    balanceUsed: int("balance_used").notNull().default(0),
    balanceReff: int("balance_reff").notNull().default(0),
    level: mysqlEnum("level", [
      "Demo",
      "Member",
      "Agen",
      "Reseller",
      "Blacklist",
      "Admin",
      "Developers",
    ])
      .notNull()
      .default("Member"),
    createdAt: datetime("created_at").notNull(),
    updatedAt: datetime("updated_at"),
    expire: datetime("expire").notNull(),
    status: varchar("status", { length: 1 }).notNull().default("1"),
    apiKey: varchar("api_key", { length: 100 }).notNull(),
    kodek: varchar("kodek", { length: 100 }).notNull(),
    hash: varchar("hash", { length: 300 }).notNull(),
    astatus: mysqlEnum("astatus", ["1", "2"]).notNull().default("1"),
    readPopup: varchar("read_popup", { length: 255 }).notNull(),
    verify: varchar("verify", { length: 288 }).notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    has: varchar("has", { length: 255 }).notNull(),
    resetLink: varchar("reset_link", { length: 280 }).notNull(),
    expReset: datetime("exp_reset").notNull(),
    usedReset: mysqlEnum("used_reset", ["1", "2"]).notNull(),
    sewa: mysqlEnum("sewa", ["No", "Yes"]).notNull().default("No"),
    reffKode: varchar("reff_kode", { length: 10 }).notNull(),
    upLink: varchar("up_link", { length: 50 }).notNull(),
    subs: boolean("subs").notNull().default(true),
    sentMail: boolean("sent_mail").notNull().default(false),
    online: boolean("online").notNull().default(false),
    tokenLogin: varchar("token_login", { length: 128 }).notNull(),
    theme: mysqlEnum("theme", ["light", "dark"]).notNull().default("light"),
    waNumber: text("wa_number").notNull(),
  },
  (t) => ({
    usernameIdx: index("username_idx").on(t.username),
    levelIdx: index("level_idx").on(t.level),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
