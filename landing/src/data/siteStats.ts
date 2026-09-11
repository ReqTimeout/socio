/**
 * Angka situs terpusat — SELALU dari prices.json (sync via `node seo/sync-prices.mjs`).
 * Jangan hardcode "8.270" / "882" / "Rp42" di markup — pakai helper ini supaya
 * angka ikut update tiap sync katalog. Berlaku untuk .astro DAN .svelte (Vite).
 */
import prices from "./prices.json";

const fmt = (n: number) => Math.round(Number(n ?? 0)).toLocaleString("id-ID");

export const totalLayanan: string = fmt((prices as any).totalServices ?? 0);
export const totalKategori: string = fmt((prices as any).totalCategories ?? 0);
export const totalLayananPlus: string = `${totalLayanan}+`;

/** Harga termurah katalog (Member per 1k) — untuk klaim "mulai RpX/1k". */
const topArr: Array<{ price?: number }> = Array.isArray((prices as any).top)
  ? (prices as any).top
  : [];
const minPrice = topArr.reduce(
  (m, t) => Math.min(m, Number(t.price ?? Infinity)),
  Infinity,
);
export const hargaMulai: string = fmt(Number.isFinite(minPrice) ? minPrice : 0);
export const syncedAt: string = String((prices as any).syncedAt ?? "");
