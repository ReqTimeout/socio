import {
  datetime,
  index,
  int,
  mysqlTable,
  tinyint,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

/**
 * Routing layanan per kategori ke provider tertentu (multi-provider).
 *
 * Semantik:
 *   - Kategori yang ADA di tabel ini dengan is_active=1 → DILAYANI `providerId`.
 *     Layanan provider itu di kategori tsb boleh `services.status=1` (orderable)
 *     walau provider-nya BUKAN provider `provider.status=1`; layanan provider lain
 *     di kategori yang sama dipaksa `status=0`.
 *   - Kategori TIDAK terdaftar → aturan default satu-aktif (hanya provider
 *     `provider.status=1` yang orderable).
 *
 * Ini membiarkan provider utama (SMMturk) tetap jadi provider aktif global
 * sementara hanya platform/kategori tertentu (mis. TikTok) dialihkan ke
 * provider kedua (SMMfollows). Lihat app/src/lib/server/active-provider.ts
 * (isProviderAllowedForCategory) dan app/src/cron/service-sync.ts (gerbang
 * enable per-kategori).
 */
export const categoryProviderRouting = mysqlTable(
  "category_provider_routing",
  {
    id: int("id").autoincrement().primaryKey(),
    categoryId: int("category_id").notNull(),
    providerId: int("provider_id").notNull(),
    isActive: tinyint("is_active").notNull().default(1),
    createdAt: datetime("created_at"),
    updatedAt: datetime("updated_at"),
  },
  (t) => ({
    // Satu kategori hanya boleh punya satu baris routing (satu provider).
    uqCategory: uniqueIndex("uq_routing_category").on(t.categoryId),
    idxProvider: index("idx_routing_provider").on(t.providerId),
  }),
);

export type CategoryProviderRouting = typeof categoryProviderRouting.$inferSelect;
export type NewCategoryProviderRouting = typeof categoryProviderRouting.$inferInsert;
