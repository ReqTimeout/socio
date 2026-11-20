// Regenerasi landing/src/data/blogBanners.ts dari manifest pack banner EN.
// Sumber manifest: output socio_id_pack.py (minimax-image/socio.id image/manifest.json),
// render ulang cache artwork socio.my dengan branding socio.id — 0 request API.
// Pakai: node seo/generate-blog-banners.mjs <manifest.json> [out.ts]
//   <manifest.json> wajib; [out.ts] default landing/src/data/blogBanners.ts (relatif root repo).
// Hanya entri crop "banner" (hero) yang dipakai: 1 base = 1 hero, alt diambil verbatim.
// Setelah generate, jalankan prettier --write pada out.ts bila perlu (format sudah kompatibel).
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = process.argv[2];
if (!manifestPath) {
  console.error('Pakai: node seo/generate-blog-banners.mjs <manifest.json> [out.ts]');
  process.exit(1);
}
const outPath = process.argv[3] ? resolve(process.argv[3]) : resolve(ROOT, 'landing/src/data/blogBanners.ts');

const manifest = JSON.parse(readFileSync(resolve(manifestPath), 'utf8'));
const heroes = manifest.filter(
  (e) => e.crop === 'banner' && /^hero-.+-en-1200x675\.webp$/.test(e.filename),
);
const entries = heroes
  .map((e) => ({
    base: e.filename.replace(/^hero-/, '').replace(/-en-1200x675\.webp$/, ''),
    alt: e.alt,
  }))
  .sort((a, b) => (a.base < b.base ? -1 : a.base > b.base ? 1 : 0));

const header = [
  '// Data banner artikel socio.id (EN) — dihasilkan dari manifest pack',
  '// minimax-image/socio.id image (render ulang cache socio.my, 0 request API).',
  '// JANGAN edit manual: regenerate via skrip generate-blog-banners (lihat jurnal 20 Nov).',
].join('\n');
const body = entries
  .map((e) => `  {\n    base: ${JSON.stringify(e.base)},\n    alt: ${JSON.stringify(e.alt)},\n  },`)
  .join('\n');
const out = `${header}\nexport interface BannerEntry {\n  base: string;\n  alt: string;\n}\nexport const BANNERS: BannerEntry[] = [\n${body}\n];\n`;

writeFileSync(outPath, out);
console.log(`[selesai] ${entries.length} base banner → ${outPath}`);