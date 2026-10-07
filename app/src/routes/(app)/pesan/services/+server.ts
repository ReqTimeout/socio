import { db } from "@socio/db";
import { services } from "@socio/db/schema";
import { eq, and, asc, like } from "drizzle-orm";
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
 * Katalog layanan untuk flow /pesan baru (PESAN_REVAMP 2026-10-07):
 * Platform (chip icon) → Jenis (chip) → Layanan (card).
 *
 * Query params (boleh kombinasi):
 * - `platform`: id platform (instagram, tiktok, …) — filter bucket.
 * - `kind`: id jenis (followers, likes, …) — filter dalam bucket.
 * - `q`: search global lintas platform — ditokenisasi + alias
 *   (`normalizeSearchQuery`: "livestream view" → live AND view, "followers ig"
 *   → followers AND instagram). Min 1 token valid, max 60 hasil.
 * - `kinds=1` + `platform`: KEMBALIKAN agregasi jenis [{id, count}] saja
 *   (tanpa baris layanan) — untuk render chip jenis + hitungan live.
 * - `cat`: id kategori LEGACY — kompatibilitas deep-link lama, tetap didukung.
 *
 * ANTI-SAMPAH: hanya `status = 1` yang pernah keluar. Platform/jenis dihitung
 * dari nama layanan saat request → yang dinonaktifkan hilang otomatis.
 *
 * KEAMANAN: harga base/modal (price, price_api, price_reseller) dan persentase
 * markup TIDAK pernah dikirim ke client — hanya harga efektif per-1000
 * (`pricePer1k`) untuk level user login.
 */
export const GET: RequestHandler = async ({ url, locals }) => {
  if (!locals.user) throw error(401, "Unauthorized");
  const platform = (url.searchParams.get("platform") ?? "") as PlatformId | "";
  const kind = (url.searchParams.get("kind") ?? "") as KindId | "";
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 60);
  // Search: semua token harus cocok (AND) — "livestream view" ketemu
  // "TikTok Live Stream Views" walau user tidak ketik persis.
  const tokens = q ? normalizeSearchQuery(q) : [];
  const cat = Number(url.searchParams.get("cat") ?? 0);

  const level = (locals.user.level as UserLevel) ?? "Member";
  const rule = (await getPricingRules())[level];

  // Mode agregasi jenis — query ramping (nama saja), tanpa hitung harga.
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
    })
    .from(services)
    .where(
      and(
        eq(services.status, 1),
        ...(cat ? [eq(services.categoryId, cat)] : []),
        // Tiap token = LIKE %token% (escape wildcard user). AND antar token.
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
      pricePer1k: effectivePer1k(base, level, rule, modal),
      platform: detectPlatform(r.serviceName),
      kind: detectKind(r.serviceName),
    };
  });

  // Urut termurah per tampilan (harga efektif, bukan harga mentah).
  mapped.sort((a, b) => a.pricePer1k - b.pricePer1k);

  const filtered = mapped.filter(
    (s) => (!platform || s.platform === platform) && (!kind || s.kind === kind),
  );

  // Query tanpa token valid (mis. "a") → kosong, bukan full scan sia-sia.
  if (q && tokens.length === 0) return json([]);

  // Cap 1000 baris — bucket terbesar (IG followers ~750) muat penuh, tanpa truncate.
  return json(filtered.slice(0, 1000));
};
