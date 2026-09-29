import {
  datetime,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  varchar,
  index,
} from "drizzle-orm/mysql-core";

/**
 * PRD Service Sync v2 §6.3 — audit trail perubahan layanan per-field.
 * Ditulis oleh `service-sync` setiap kali kolom layanan/kategori berubah.
 * Retensi 180 hari (dipangkas cron cleanup — lihat §13 no.5).
 */
export const serviceChangelog = mysqlTable(
  "service_changelog",
  {
    id: int("id").autoincrement().primaryKey(),
    providerId: int("provider_id").notNull(),
    /** 0 = event 'created' sebelum id final tersedia (diisi post-insert via UPDATE). */
    serviceId: int("service_id").notNull().default(0),
    event: mysqlEnum("event", [
      "created",
      "name_changed",
      "category_changed",
      "price_up",
      "price_down",
      "minmax_changed",
      "type_changed",
      "refill_changed",
      "cancel_changed",
      "dripfeed_changed",
      "enabled",
      "disabled",
    ]).notNull(),
    field: varchar("field", { length: 32 }),
    oldValue: text("old_value"),
    newValue: text("new_value"),
    detectedAt: datetime("detected_at").notNull(),
  },
  (t) => ({
    serviceIdx: index("scl_service_idx").on(t.serviceId, t.detectedAt),
    eventIdx: index("scl_event_idx").on(t.event, t.detectedAt),
  }),
);

export type ServiceChangelog = typeof serviceChangelog.$inferSelect;
export type NewServiceChangelog = typeof serviceChangelog.$inferInsert;
