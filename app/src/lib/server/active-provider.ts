import { db } from "@socio/db";
import { provider, categoryProviderRouting } from "@socio/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { allowedForRouting } from "@socio/core/routing-policy";

/**
 * Provider aktif untuk switcher satu-aktif (mis. SMMturk ↔ SMMfollows).
 *
 * Kontrak: TEPAT SATU baris `provider.status = 1` (dijaga ensure.ts backfill +
 * action setActive). Provider aktif: (a) yang di-sync cron, (b) satu-satunya
 * yang layanannya boleh di-order pada kategori TANPA routing, (c) yang tampil di
 * /pesan (karena provider lain layanannya dipaksa status=0).
 *
 * Cache in-memory singkat (30s) — dibaca tiap request order & tiap tick cron;
 * invalidasikan lewat clearActiveProviderCache() saat admin berpindah provider.
 */
let cache: { id: number; at: number } | null = null;
const TTL_MS = 30_000;

export function clearActiveProviderCache(): void {
  cache = null;
}

/** null = tidak ada provider aktif (state rusak / belum di-set) → caller tolak order. */
export async function getActiveProviderId(): Promise<number | null> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.id || null;

  const [row] = await db
    .select({ id: provider.id })
    .from(provider)
    .where(eq(provider.status, 1))
    .orderBy(provider.id)
    .limit(1);
  let id = Number(row?.id ?? 0);

  if (!id) {
    // Fallback self-heal: tak ada flag aktif → pakai incumbent SMMturk; kalau
    // tetap kosong, provider ber-key id terendah (provider MANUAL tak punya
    // key → otomatis tersingkir). Jangan cache nilai 0 (coba lagi).
    const [fb] = await db
      .select({ id: provider.id })
      .from(provider)
      .where(
        and(
          sql`${provider.apiKey} <> ''`,
          sql`${provider.apiUrlOrder} LIKE ${"https://smmturk.org%"}`,
        ),
      )
      .orderBy(provider.id)
      .limit(1);
    id = Number(fb?.id ?? 0);
    if (!id) {
      const [anyKeyed] = await db
        .select({ id: provider.id })
        .from(provider)
        .where(sql`${provider.apiKey} <> ''`)
        .orderBy(provider.id)
        .limit(1);
      id = Number(anyKeyed?.id ?? 0);
    }
    if (!id) return null; // jangan cache — biarkan recovery setelah admin set
  }

  cache = { id, at: now };
  return id;
}

/**
 * Routing per-kategori (lanjutan switcher satu-aktif).
 *
 * Peta `category_provider_routing` (isActive=1): kategori yang terdaftar dilayani
 * provider tsb walau bukan provider aktif global; provider lain di kategori itu
 * dipaksa non-orderable. Kategori TANPA entri mengikuti aturan default satu-aktif.
 * Cache 30s (dibaca tiap request order + tiap tick cron).
 */
let routingCache: { at: number; byCat: Map<number, number> } | null = null;
const ROUTING_TTL_MS = 30_000;

export function clearCategoryRoutingCache(): void {
  routingCache = null;
}

/** Peta categoryId -> providerId untuk kategori yang di-route (isActive=1). */
export async function getCategoryRoutingMap(): Promise<Map<number, number>> {
  const now = Date.now();
  if (routingCache && now - routingCache.at < ROUTING_TTL_MS) return routingCache.byCat;
  const map = new Map<number, number>();
  try {
    const rows = await db
      .select({
        categoryId: categoryProviderRouting.categoryId,
        providerId: categoryProviderRouting.providerId,
      })
      .from(categoryProviderRouting)
      .where(eq(categoryProviderRouting.isActive, 1));
    for (const r of rows) map.set(Number(r.categoryId), Number(r.providerId));
    routingCache = { at: now, byCat: map };
  } catch (e) {
    // Jangan cache saat error → coba lagi request berikutnya. Jangan gagalkan
    // order: peta kosong = tidak ada routing = aturan default (aktif saja).
    console.error("[active-provider] gagal load routing, pakai default satu-aktif:", e);
  }
  return map;
}

/**
 * Bolehkah `providerId` melayani order di `categoryId`? Delegates ke
 * allowedForRouting (@socio/core/routing-policy — murni, teruji selftest):
 *   - kategori diroute → HANYA provider target routing.
 *   - kategori tidak diroute → provider aktif global saja.
 */
export async function isProviderAllowedForCategory(
  providerId: number,
  categoryId: number,
): Promise<boolean> {
  const routed = (await getCategoryRoutingMap()).get(categoryId);
  if (routed !== undefined) return allowedForRouting(providerId, routed, null);
  const active = await getActiveProviderId();
  return allowedForRouting(providerId, undefined, active);
}

/** Daftar provider id yang dipakai routing (untuk cron: sinkron aktif ∪ routed). */
export async function getRoutedProviderIds(): Promise<number[]> {
  const map = await getCategoryRoutingMap();
  return Array.from(new Set(map.values()));
}
