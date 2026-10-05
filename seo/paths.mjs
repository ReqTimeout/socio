/**
 * seo/paths.mjs — single source of truth for all SEO script paths.
 * Import this instead of hardcoding ROOT. Portable across machines.
 *
 * When content repo separation is complete (Sprint 0 plan), set:
 *   SEO_CONTENT_DIR=/path/to/socio-seo-content/blog
 * All other paths derive from ROOT (monorepo/workspace root).
 */
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ROOT = workspace root (one level up from seo/)
export const ROOT = join(__dirname, '..');

// Content paths — env override for future repo separation
export const BLOG_DIR = process.env.SEO_CONTENT_DIR
  ? resolve(process.env.SEO_CONTENT_DIR)
  : join(ROOT, 'landing/src/content/blog');

export const QUEUE_PATH = process.env.SEO_QUEUE_PATH
  ? resolve(process.env.SEO_QUEUE_PATH)
  : join(ROOT, 'seo/queue.json');
// State/config bisa dipindah (runner Docker memakai volume persisten):
//   SEO_STATE_PATH=/app/data/state.json
//   SEO_CONFIG_PATH=/app/data/config.json
//   SEO_QUEUE_PATH=/app/data/queue.json
// Default tetap repo, supaya perilaku script lokal tidak berubah.
export const STATE_PATH = process.env.SEO_STATE_PATH
  ? resolve(process.env.SEO_STATE_PATH)
  : join(ROOT, 'seo/state.json');
export const CONFIG_PATH = process.env.SEO_CONFIG_PATH
  ? resolve(process.env.SEO_CONFIG_PATH)
  : join(ROOT, 'seo/config.json');
export const PRICES_PATH = join(ROOT, 'landing/src/data/prices.json');
export const PROMPTS_PATH = join(ROOT, 'seo/prompts.ts');
export const PUBLIC_DIR = join(ROOT, 'landing/public');
export const SITEMAP_PATH = join(ROOT, 'landing/dist/sitemap-0.xml');
// Fase F — Keyword & Geo Engine.
// CITIES_PATH: dataset kota + anchor ekonomi lokal (wajib approval user).
// GEO_OUT_PATH: daftar kandidat keyword geo/longtail SEBELUM masuk queue.
// Gate generate: daftar ini harus berstatus approved + jumlah minimum terpenuhi.
export const CITIES_PATH = join(ROOT, 'seo/cities.json');
export const GEO_OUT_PATH = join(ROOT, 'seo/keywords.geo.json');
