import { db } from "@socio/db";
import { services } from "@socio/db/schema";
import { eq, and, asc, like, sql } from "drizzle-orm";
import { json, error } from "@sveltejs/kit";
import { baseForLevel, effectivePer1k, type UserLevel } from "@socio/core/pricing";
import {
  detectPlatform,
  detectKind,
  KIND_ORDER,
  normalizeSearchQuery,
  type PlatformId,
  type KindId,
} from "@socio/core/catalog";
import { getPricingRules } from "$lib/server/pricing";
import type { RequestHandler } from "./$types";

/**
 * Katalog layanan untuk flow /pesan (PESAN_REVAMP 2026-10-07 rev 4):
 * Kategori dropdown (PRIMARY, dari `categories` table) → Layanan cards.
 * Filter sekunder: platform icon + kind icon (narrow visible cards).
 *
 * Query params (boleh kombinasi):
 * - `categoryId`: id kategori PROVIDER (PRIMARY dropdown). Filter by kategori.
 * - `platform`: id platform (instagram, tiktok, …) — filter bucket sekunder.
 * - `kind`: id jenis (followers, likes, …) — filter bucket sekunder.
 * - `q`: search global lintas platform — ditokenisasi + alias. Min 1 token valid.
 * - `kinds=1` + `platform`: agregasi jenis [{id, count}] — untuk chip icon.
 * - `cat`: id kategori LEGACY — kompatibilitas deep-link lama.
 *
 * ANTI-SAMPAH: hanya `status = 1` yang pernah keluar. Platform/jenis dihitung
 * dari nama layanan saat request → yang dinonaktifkan hilang otomatis.
 *
 * KEAMANAN: harga base/modal (price, price_api, price_reseller) dan persentase
 * markup TIDAK pernah dikirim ke client — hanya harga efektif per-1000.
 */
export const GET: RequestHandler = async ({ url, locals }) => {
  if (!locals.user) throw error(401, "Unauthorized");
  const categoryId = Number(url.searchParams.get("categoryId") ?? 0);
  const platform = (url.searchParams.get("platform") ?? "") as PlatformId | "";
  const kind = (url.searchParams.get("kind") ?? "") as KindId | "";
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 60);
  const tokens = q ? normalizeSearchQuery(q) : [];
  const cat = Number(url.searchParams.get("cat") ?? 0);

  const level = (locals.user.level as UserLevel) ?? "Member";
  const rule = (await getPricingRules())[level];

  // ── Search by id — exact match by id (debounce 0 di client untuk digit murni).
  if (q && /^\d{1,8}$/.test(q)) {
    const id = Number(q);
    const [row] = await db
      .select({
        id: services.id,
        serviceName: services.serviceName,
        type: services.type,
        price: services.price,
        priceApi: services.priceApi,
        priceReseller: services.priceReseller,
        min: services.min,
        max: services.max,
        isRefill: services.isRefill,
        note: services.note,
        waktu: services.waktu,
        categoryId: services.categoryId,
      })
      .from(services)
      .where(and(eq(services.id, id), eq(services.status, 1)))
      .limit(1);
    if (!row) return json([]);
    const modal = Number(row.priceApi ?? 0);
    const base = baseForLevel(
      { price: Number(row.price), priceApi: modal, priceReseller: Number(row.priceReseller) },
      level,
    );
    return json([
      {
        id: row.id,
        serviceName: row.serviceName,
        type: row.type,
        min: row.min,
        max: row.max,
        isRefill: row.isRefill,
        note: row.note,
        waktu: row.waktu,
        categoryId: row.categoryId,
        pricePer1k: effectivePer1k(base, level, rule, modal),
        platform: detectPlatform(row.serviceName),
        kind: detectKind(row.serviceName),
      },
    ]);
  }

  // Mode agregasi jenis (untuk chip icon di client).
  if (url.searchParams.get("kinds") === "1" && platform) {
    const names = await db
      .select({ serviceName: services.serviceName })
      .from(services)
      .where(eq(services.status, 1))
      .limit(10000);
    const counts = new Map<KindId, number>();
    for (const r of names) {
      if (detectPlatform(r.serviceName) !== platform) continue;
      const k = detectKind(r.serviceName);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return json(
      KIND_ORDER.filter((k) => (counts.get(k) ?? 0) > 0).map((k) => ({
        id: k,
        count: counts.get(k) ?? 0,
      })),
    );
  }

  const rows = await db
    .select({
      id: services.id,
      serviceName: services.serviceName,
      type: services.type,
      price: services.price,
      priceApi: services.priceApi,
      priceReseller: services.priceReseller,
      min: services.min,
      max: services.max,
      isRefill: services.isRefill,
      note: services.note,
      waktu: services.waktu,
      categoryId: services.categoryId,
    })
    .from(services)
    .where(
      and(
        sql`LENGTH(TRIM(${services.serviceName})) >= 3`,
        eq(services.status, 1),
        // Filter PRIMARY (dropdown kategori) — kalau ada, pakai. Kalau tidak,
        // fallback ke `cat` legacy.
        ...(categoryId
          ? [eq(services.categoryId, categoryId)]
          : cat
            ? [eq(services.categoryId, cat)]
            : []),
        ...tokens.map((t) => like(services.serviceName, `%${t.replace(/[%_\\]/g, "\\$&")}%`)),
      ),
    )
    .orderBy(asc(services.price))
    .limit(tokens.length > 0 ? 60 : 10000);

  // Petakan ke bentuk aman + tempel platform/jenis hasil deteksi.
  const mapped = rows.map((r) => {
    const modal = Number(r.priceApi ?? 0);
    const base = baseForLevel(
      {
        price: Number(r.price),
        priceApi: modal,
        priceReseller: Number(r.priceReseller),
      },
      level,
    );
    return {
      id: r.id,
      serviceName: r.serviceName,
      type: r.type,
      min: r.min,
      max: r.max,
      isRefill: r.isRefill,
      note: r.note,
      waktu: r.waktu,
      categoryId: r.categoryId,
      pricePer1k: effectivePer1k(base, level, rule, modal),
      platform: detectPlatform(r.serviceName),
      kind: detectKind(r.serviceName),
    };
  });

  mapped.sort((a, b) => a.pricePer1k - b.pricePer1k);

  const filtered = mapped.filter(
    (s) => (!platform || s.platform === platform) && (!kind || s.kind === kind),
  );

  if (q && tokens.length === 0) return json([]);
  return json(filtered.slice(0, 1000));
};
