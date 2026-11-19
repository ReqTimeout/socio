import {
  datetime,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Key idempotensi untuk action `add` API publik /api/v1 (port socio.my).
 *
 * Klaim dibuat SEBELUM potong saldo / kontak provider supaya replay key yang
 * sama tidak menghasilkan order kedua (race-safe): UNIQUE(user_id, idem_key)
 * memastikan hanya satu pemanggil menang; yang kalah membaca oid pemenang.
 * `status` processing → done (oid diisi setelah order berhasil). Klaim processing
 * yang menggantung (proses crash) dibebaskan lagi setelah TTL oleh klaim berikutnya.
 * Tabel fisik dibuat idempoten di packages/db/src/ensure.ts (CREATE TABLE IF NOT EXISTS).
 */
export const apiIdempotency = mysqlTable(
  "api_idempotency",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull(),
    idemKey: varchar("idem_key", { length: 100 }).notNull(),
    oid: varchar("oid", { length: 50 }),
    status: mysqlEnum("status", ["processing", "done"]).notNull().default("processing"),
    createdAt: datetime("created_at").notNull(),
  },
  (t) => ({
    userKeyUq: uniqueIndex("ai_user_key_uq").on(t.userId, t.idemKey),
    createdIdx: index("ai_created_idx").on(t.createdAt),
  }),
);

export type ApiIdempotency = typeof apiIdempotency.$inferSelect;
export type NewApiIdempotency = typeof apiIdempotency.$inferInsert;
