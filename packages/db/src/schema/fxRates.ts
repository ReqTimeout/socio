import { int, mysqlTable, varchar, double, datetime, index } from "drizzle-orm/mysql-core";

/**
 * Riwayat kurs USD→IDR + floor manual anti-rugi.
 * - source='live': hasil fetch API (cron harian)
 * - source='floor': batas bawah manual (tidak pernah auto-update)
 * Kurs efektif = max(live terbaru, floor) → tidak pernah rugi saat rupiah melemah,
 * tetap ikut pasar saat rupiah menguat di atas floor.
 */
export const fxRates = mysqlTable(
  "fx_rates",
  {
    id: int("id").autoincrement().primaryKey(),
    pair: varchar("pair", { length: 20 }).notNull().default("USD_IDR"),
    rate: double("rate").notNull(),
    source: varchar("source", { length: 20 }).notNull().default("live"),
    fetchedAt: datetime("fetched_at").notNull(),
  },
  (t) => ({
    pairIdx: index("fx_pair_idx").on(t.pair, t.fetchedAt),
  }),
);

export type FxRate = typeof fxRates.$inferSelect;
export type NewFxRate = typeof fxRates.$inferInsert;
