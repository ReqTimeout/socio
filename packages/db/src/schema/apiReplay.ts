import { datetime, index, int, mysqlTable, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Nonce anti-replay untuk request bertanda tangan HMAC API publik /api/v1
 * (port socio.my, audit Susulan 50).
 *
 * checkApiSignature hanya memaksa timestamp ±300s (replay masih mungkin dalam
 * window itu). Handler mencatat signature (nonce unik per request) ke sini
 * SESUDAH signature lolos: UNIQUE(user_id, nonce) memastikan request bertanda
 * tangan yang sama tidak bisa diproses dua kali (replay ditolak). TTL ~600s
 * (> window 300s); baris kedaluwarsa dibersihkan cron api-hygiene.
 * Tabel fisik dibuat idempoten di packages/db/src/ensure.ts.
 */
export const apiReplay = mysqlTable(
  "api_replay",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull(),
    nonce: varchar("nonce", { length: 128 }).notNull(),
    expiresAt: datetime("expires_at").notNull(),
    createdAt: datetime("created_at").notNull(),
  },
  (t) => ({
    userNonceUq: uniqueIndex("ar_user_nonce_uq").on(t.userId, t.nonce),
    expiresIdx: index("ar_expires_idx").on(t.expiresAt),
  }),
);

export type ApiReplay = typeof apiReplay.$inferSelect;
export type NewApiReplay = typeof apiReplay.$inferInsert;
