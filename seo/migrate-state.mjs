/**
 * seo/migrate-state.mjs — satukan state yang terpecah (satu kali, idempoten).
 *
 * Background (bug nyata, 5 Okt 2026):
 *   `seo/indexnow.mjs` punya `const STATE_PATH = `${ROOT}/seo/state.json`` yang
 *   MENGABAIKAN `SEO_STATE_PATH` milik `paths.mjs`. Di runner Docker meaning
 *   `SEO_STATE_PATH=/app/data/state.json` (volume persisten), tapi indexnow
 *   menulis ke `/app/seo/state.json` — yang ada di LAYER IMAGE, jadi hilang
 *   tiap container rebuild.
 *
 * Akibatnya ada DUA state yang berbeda pendapat:
 *   /app/data/state.json  → 7 published  (volume, membeku, dibaca restore)
 *   /app/seo/state.json   → 5 published  (image, ditulis indexnow tiap publish)
 * sementara 8 file MDX benar-benar `draft: false` di situs.
 *
 * Kalau dibiarkan, `restore-published.mjs` akan mengembalikan 3 artikel yang
 * sudah tayang jadi `draft:true` — artinya diam-diam MENGHAPUS artikel live.
 *
 * Skrip ini membangun state otoritatif = union dari ketiganya, lalu menuliskannya
 * ke `STATE_PATH` (volume) supaya hilang permanent. Semua file lama dibiarkan
 * sebagai `.bak` — tidak ada data yang dihapus.
 *
 * Idempoten: jalankan berkali-kali aman; union yang sama menghasilkan hasil sama.
 */
import { readFileSync, writeFileSync, existsSync, copyFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { BLOG_DIR, STATE_PATH, ROOT } from './paths.mjs';

const CANDIDATES = [STATE_PATH, join(ROOT, 'seo/state.json')];

function load(p) {
  if (!existsSync(p)) return null;
  try {
    const s = JSON.parse(readFileSync(p, 'utf8'));
    return Array.isArray(s.published) ? s.published : null;
  } catch (e) {
    console.warn(`[migrate-state] lewati ${p}: JSON rusak (${e.message})`);
    return null;
  }
}

function slugOf(x) {
  if (typeof x === 'string') return x;
  if (x && typeof x === 'object') return x.slug || x.url || x.path || null;
  return null;
}

// --- 1. Kumpulkan slug dari semua state yang ada -----------------------------
const union = new Map(); // slug -> objek published
for (const p of CANDIDATES) {
  const list = load(p);
  if (!list) {
    console.log(`[migrate-state] ${p}: tidak ada / bukan state — lewati`);
    continue;
  }
  let n = 0;
  for (const entry of list) {
    const slug = slugOf(entry);
    if (!slug) continue;
    if (!union.has(slug)) {
      union.set(slug, typeof entry === 'string' ? { slug } : { ...entry, slug });
      n++;
    }
  }
  console.log(`[migrate-state] ${p}: ${list.length} entri, ${n} slug baru`);
}

// --- 2. Tambahkan slug yang file MDX-nya draft:false tapi tak ada di state ---
let fromFiles = 0;
for (const f of readdirSync(BLOG_DIR)) {
  if (!f.endsWith('.mdx')) continue;
  const slug = f.replace(/\.mdx$/, '');
  if (union.has(slug)) continue;
  if (/^draft:\s*false/m.test(readFileSync(join(BLOG_DIR, f), 'utf8'))) {
    union.set(slug, { slug, url: `https://socio.id/blog/${slug}/`, recoveredFrom: 'mdx-frontmatter' });
    fromFiles++;
  }
}
if (fromFiles) {
  console.log(`[migrate-state] ${fromFiles} slug dipulihkan dari frontmatter MDX (hilang dari state)`);
}

// --- 3. Tulis ke STATE_PATH (volume) ------------------------------------------
const existing = load(STATE_PATH) || [];
const base = existsSync(STATE_PATH)
  ? JSON.parse(readFileSync(STATE_PATH, 'utf8'))
  : { published: [] };

// Pertahankan field lain yang sudah ada (gsc, indexnow, ramp, dll)
base.published = [...union.values()];
if (!Array.isArray(base.indexnowSubmitted)) base.indexnowSubmitted = [];
if (typeof base.schemaVersion !== 'number') base.schemaVersion = 1;
base.migratedAt = new Date().toISOString();
base.migratedFrom = CANDIDATES;

// Backup dulu sebelum menimpa
for (const p of CANDIDATES) {
  if (existsSync(p) && p !== STATE_PATH) copyFileSync(p, `${p}.bak`);
}
if (existsSync(STATE_PATH)) copyFileSync(STATE_PATH, `${STATE_PATH}.bak`);

writeFileSync(STATE_PATH, JSON.stringify(base, null, 2) + '\n');

console.log('');
console.log(`[migrate-state] SEBELUM : ${existing.length} published di ${STATE_PATH}`);
console.log(`[migrate-state] SESUDAH : ${base.published.length} published ditulis ke ${STATE_PATH}`);
console.log(`[migrate-state] backup  : ${CANDIDATES.map((p) => `${p}.bak`).join(', ')}`);
console.log('[migrate-state] slugs   : ' + base.published.map((x) => x.slug).join(', '));
