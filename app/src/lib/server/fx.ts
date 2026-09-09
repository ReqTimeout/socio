import { db } from "@socio/db";
import { fxRates } from "@socio/db/schema";
import { eq, desc, and } from "drizzle-orm";

/**
 * Kurs USD→IDR terpusat — SATU sumber kebenaran (dulu 3 default beda: 15000/15000/16000).
 *
 * Desain anti-rugi (instruksi owner 2026-09-08):
 *   efektif = max(live_terbaru, floor)
 * - live: fetch API harian (cron fx-rate). Kalau rupiah melemah, kurs ikut naik → modal akurat.
 * - floor: setting manual (default 20000). Kalau rupiah menguat, kurs bertahan di floor → margin aman.
 *
 * Fallback bila DB/API gagal: env SOCIO_USD_TO_IDR → 20000.
 */
const ENV_FALLBACK = Number(process.env.SOCIO_USD_TO_IDR ?? "20000") || 20000;
const DEFAULT_FLOOR = 20000;

let cache: { at: number; rate: number } | null = null;
const TTL_MS = 10 * 60 * 1000;

export async function getFxFloor(): Promise<number> {
  try {
    const [row] = await db
      .select({ rate: fxRates.rate })
      .from(fxRates)
      .where(and(eq(fxRates.pair, "USD_IDR"), eq(fxRates.source, "floor")))
      .orderBy(desc(fxRates.id))
      .limit(1);
    if (row) return Number(row.rate);
  } catch {}
  return DEFAULT_FLOOR;
}

export async function getLiveRate(): Promise<{ rate: number; at: Date | null } | null> {
  try {
    const [row] = await db
      .select({ rate: fxRates.rate, fetchedAt: fxRates.fetchedAt })
      .from(fxRates)
      .where(and(eq(fxRates.pair, "USD_IDR"), eq(fxRates.source, "live")))
      .orderBy(desc(fxRates.id))
      .limit(1);
    if (row) return { rate: Number(row.rate), at: new Date(row.fetchedAt as any) };
  } catch {}
  return null;
}

export async function getUsdToIdr(): Promise<number> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.rate;
  try {
    const [floor, live] = await Promise.all([getFxFloor(), getLiveRate()]);
    // Live dianggap basi setelah 72 jam → pakai floor saja.
    const liveAt = live?.at ? live.at.getTime() : 0;
    const liveFresh = live && Date.now() - liveAt < 72 * 3600_000 ? live.rate : 0;
    const best = Math.max(liveFresh, floor);
    const finalRate = best > 0 ? best : ENV_FALLBACK;
    cache = { at: Date.now(), rate: finalRate };
    return finalRate;
  } catch {
    return ENV_FALLBACK;
  }
}

export function invalidateFxCache(): void {
  cache = null;
}

/** Set floor manual (dari /admin/pricing). Tidak tersentuh auto-refresh. */
export async function setFxFloor(rate: number): Promise<void> {
  if (!Number.isFinite(rate) || rate < 1000 || rate > 100000) {
    throw new Error("Floor harus 1.000–100.000.");
  }
  await db.insert(fxRates).values({ pair: "USD_IDR", rate: Math.round(rate), source: "floor", fetchedAt: new Date() } as any);
  invalidateFxCache();
}

/**
 * Fetch kurs live dari API gratis (tanpa key) + simpan.
 * Dipanggil cron harian. Gagal = diam (fallback tetap jalan).
 */
export async function refreshFxRate(): Promise<{ rate: number } | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", { signal: ctrl.signal });
    if (!res.ok) return null;
    const j: any = await res.json();
    const idr = Number(j?.rates?.IDR);
    if (!Number.isFinite(idr) || idr < 1000 || idr > 100000) return null;
    await db.insert(fxRates).values({ pair: "USD_IDR", rate: Math.round(idr), source: "live", fetchedAt: new Date() } as any);
    invalidateFxCache();
    console.log(`[cron] fx-rate: USD_IDR=${Math.round(idr)}`);
    return { rate: Math.round(idr) };
  } catch (e: any) {
    console.error("[cron] fx-rate failed:", e?.message ?? e);
    return null;
  } finally {
    clearTimeout(t);
  }
}

export async function getFxInfo(): Promise<{
  effective: number;
  live: { rate: number; at: string | null } | null;
  floor: number;
}> {
  const [effective, floor, live] = await Promise.all([getUsdToIdr(), getFxFloor(), getLiveRate()]);
  return {
    effective,
    floor,
    live: live ? { rate: live.rate, at: live.at ? live.at.toISOString() : null } : null,
  };
}
