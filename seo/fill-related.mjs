#!/usr/bin/env node
/**
 * seo/fill-related.mjs — isi `related: []` di frontmatter tiap artikel.
 *
 * Kenapa ini penting (bukan sekadar kosmetik):
 *   849 dari 927 artikel punya `related: []`, jadi seksi "Lanjut baca ini"
 *   di [slug].astro TIDAK PERNAH muncul. Artinya tidak ada internal link
 *   antar-artikel sama sekali — tiap artikel jadi jalan buntu yang tidak
 *   pernah menyambungkan ke artikel lain. Ini:
 *     - pagination/kelcrawwling jelek (Google tidak menemukan artikel lain),
 *     - plunging bounce rate (pendatang masuk 1 halaman lalu keluar),
 *     - Authority/PageRank tidak mengalir antar artikel.
 *
 * `related` dibaca `getEntryById(r.id)` di [slug].astro, jadi isinya harus
 * ID entry (tanpa ekstensi, tanpa "blog/"). Script ini menulis ID itu.
 *
 * STRATEGI MILIKAN (deterministik, tanpa LLM, tanpa jaringan):
 *   Skor similaritas = jumlah token yang sama antara keyword artikel ini dan
 *   kandidat, DITAMBAH bonus kalau kategorinya sama. Ambil top-3 yang skornya
 *   >0. Kalau tidak ada yang cocok → pakai 3 artikel kategori sama sebagai
 *   fallback, atau dibiarkan kosong kalau kategori itu cuma 1 artikel.
 *
 * Kenapa pakai related DARI FRONTMATTER (bukan dihitung di layout):
 *   supaya bisa di-cache per-artikel, hasilnya stabil antar-build, dan bisa
 *   di-review/diedit manual kalau perlu. Sifatnya "dipilih sekali".
 *
 * PEMAKAIAN
 *   node seo/fill-related.mjs --dry     # tampilkan rencana, jangan tulis
 *   node seo/fill-related.mjs           # tulis ke semua mdx
 *   node seo/fill-related.mjs --only=draft  # hanya yang draft:true
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { BLOG_DIR, CITIES_PATH } from './paths.mjs';

// Daftar nama kota untuk deteksi artikel geo. 753 dari 927 artikel punya
// pola "kategori-kota", jadi kota adalah sinyal similaritas terkuat.
const cities = (() => {
  try {
    const raw = JSON.parse(readFileSync(CITIES_PATH, 'utf8'));
    const arr = Array.isArray(raw) ? raw : raw.cities || [];
    return arr
      .map((c) => String(c.city || '').toLowerCase().replace(/\s+/g, '-'))
      .filter(Boolean);
  } catch {
    return [];
  }
})();

const DRY = process.argv.includes('--dry');
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7);

const STOP = new Set([
  'panduan', 'di', 'dan', 'untuk', 'dari', 'yang', 'dengan', 'ke', 'di', 'cara',
  'apa', 'itu', 'harga', 'termurah', 'murah', 'terbaik', 'gratis', 'smm', 'panel',
  'jasa', 'layanan', 'Indonesia', 'indonesia',
]);

function readMeta(slug) {
  const s = readFileSync(join(BLOG_DIR, `${slug}.mdx`), 'utf8');
  if (!s.startsWith('---')) return null;
  const end = s.indexOf('\n---', 4);
  if (end < 0) return null;
  const fm = s.slice(4, end);
  const title = (fm.match(/^title:\s*"(.*)"\s*$/m) || [, ''])[1];
  const category = (fm.match(/^category:\s*"?([\w\s-]+?)"?\s*$/m) || [, ''])[1];
  const draft = /^draft:\s*true/m.test(fm);
  // Hitung JUMLAH ITEM, bukan jumlah tanda hubung.
  //
  // Versi lama: `(relatedRaw.match(/-/g) || []).length` — itu menghitung SEMUA
  // karakter '-' di dalam teks, termasuk tanda penghubung di slug. Contoh
  // "  - modal-jualan-followers\n  - smm-panel-indonesia" punya 2 item tapi 6
  // tanda '-', jadi artikel dilaporkan punya 6 related → dianggap sudah lengkap
  // dan tidak pernah dilengkapi. Akibatnya 72 artikel tersesat dengan related
  // hanya 1-2 item.
  const relMatch = fm.match(/^related:\s*(\[[^\]]*\]|\n(?:\s*-\s+\S+\n?)*)/m);
  const relatedRaw = relMatch ? relMatch[1].trim() : '[]';
  const existing = relatedRaw === '[]' ? 0 : /^\[/.test(relatedRaw)
    ? (relatedRaw.match(/\S+/g) || []).length
    : relatedRaw.split('\n').filter((l) => l.trim().length > 0).length;
  return { slug, title, category, draft, relatedCount: existing, end };
}

function tokens(title) {
  return new Set(
    String(title || '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2 && !STOP.has(w)),
  );
}

const slugs = readdirSync(BLOG_DIR)
  .filter((f) => f.endsWith('.mdx'))
  .map((f) => f.replace(/\.mdx$/, ''));

let meta = [];
for (const s of slugs) {
  const m = readMeta(s);
  if (m) meta.push(m);
}
console.log(`[related] ${meta.length} artikel terbaca dari BLOG_DIR`);

// Target = artikel yang related-nya KURANG dari 3 (bukan hanya yang 0).
//
// Ini penting: versi lama hanya menyaring `relatedCount === 0`, jadi artikel
// yang sudah terisi 1 atau 2 item (hasil run sebelumnya) tidak pernah dilengkapi
// lagi — menyisakan 48 artikel dengan related kurang dari 3. Sekarang semua yang
// <3 ikut ditangani.
const NEED = 3;
const target = meta.filter((m) => {
  if (ONLY === 'draft') return m.draft && m.relatedCount < NEED;
  if (ONLY === 'missing') return m.relatedCount < NEED;
  if (ONLY === '') return m.relatedCount < NEED;
  return false;
});
console.log(`[related] ${target.length} artikel akan diisi related (filter=${ONLY || 'missing'})`);

// pre-tokenize semua judul sekali
const tok = new Map(meta.map((m) => [m.slug, tokens(m.title)]));

// group by kategori untuk fallback
const byCat = new Map();
for (const m of meta) {
  const k = (m.category || '').toLowerCase();
  if (!byCat.has(k)) byCat.set(k, []);
  byCat.get(k).push(m.slug);
}

let written = 0, filled = 0, unchanged = 0, empty = 0;

for (const t of target) {
  const tk = tok.get(t.slug) || new Set();
  // Kata geo dari slug (kota). 753 dari 927 artikel itu geo ("kategori-kota"),
  // jadi kota adalah sinyal terkuat untuk memilih yang benar-benar mirip.
  const tCity = cities.find((c) => t.slug.includes(c));

  const scored = meta
    .filter((m) => m.slug !== t.slug)
    .map((m) => {
      const tk2 = tok.get(m.slug) || new Set();
      let overlap = 0;
      for (const w of tk) if (tk2.has(w)) overlap++;
      const mCity = cities.find((c) => m.slug.includes(c));

      let s = 0;
      // 1) kota yang sama = sinyal terkuat. Menghubungkan "cara menambah
      //    followers di Bandung" dengan "cara menambah followers di Somalijauh
      //    lebih berguna buat pembaca daripada dua artikel "harga smm".
      if (tCity && mCity === tCity) s += 10;
      // 2) kategori sama (fallback kalau tidak ada kota yg sama)
      if (m.category && t.category && m.category === t.category) s += 3;
      // 3) token overlap (tema, mis. "termurah", "tiktok", "views")
      s += overlap;
      return { slug: m.slug, s };
    })
    .sort((a, b) => b.s - a.s || (a.slug < b.slug ? -1 : 1));

  // Prioritas: kota sama → kategori sama → token overlap. Kandidat yang
  // SUDAH ada di related artikel ini tidak boleh dipilih lagi (idempoten
  // parsial: run berikutnya melengkapi, bukan menimpa).
  const need = Math.max(0, NEED - t.relatedCount);
  const picks = [];
  if (need > 0) {
    const sameCity = scored.filter((x) => tCity && x.s >= 10);
    const sameCat = scored.filter((x) => x.s >= 3 && x.s < 10);
    const other = scored.filter((x) => x.s > 0 && x.s < 3);
    for (const bucket of [sameCity, sameCat, other]) {
      for (const x of bucket) {
        if (picks.length >= need) break;
        if (!picks.includes(x.slug)) picks.push(x.slug);
      }
    }
    // Kalau masih kurang (kategori langka), pakai kategori sama.
    if (picks.length < need) {
      const pool = (byCat.get((t.category || '').toLowerCase()) || []).filter(
        (s) => s !== t.slug && !picks.includes(s),
      );
      for (const p of pool) {
        if (picks.length >= need) break;
        picks.push(p);
      }
    }
  }

  if (picks.length === 0) {
    empty++;
    continue;
  }

  // Tulis ke file. Kalau related SUDAH punya isi (run sebelumnya hanya
  // menyetengah), GABUNGkan — jangan replace, atau picks lama ikut hilang.
  const path = join(BLOG_DIR, `${t.slug}.mdx`);
  const s = readFileSync(path, 'utf8');
  const existingBlock = s.match(/^related:\n((?:\s*-\s+\S+\n?)*)/m);
  const already = existingBlock
    ? existingBlock[1]
        .split('\n')
        .map((l) => l.trim().replace(/^-\s*/, ''))
        .filter(Boolean)
    : [];
  const merged = [...new Set([...already, ...picks])].slice(0, NEED);
  const relBlock = `related:\n${merged.map((p) => `  - ${p}`).join('\n')}`;
  let next;
  if (existingBlock) {
    next = s.replace(existingBlock[0], relBlock + '\n');
  } else if (/^related:\s*\[\]\s*$/m.test(s)) {
    next = s.replace(/^related:\s*\[\]\s*$/m, relBlock);
  } else if (/^related:\s*$/m.test(s)) {
    next = s.replace(/^related:\s*$/m, relBlock);
  } else {
    unchanged++; // format tak dikenali — jangan sentuh
    continue;
  }

  if (DRY) {
    if (written < 5) console.log(`  [dry] ${t.slug} → ${picks.join(', ')}`);
  } else {
    writeFileSync(path, next);
  }
  written++;
  filled += picks.length;
}

console.log('');
console.log(`[related] artikel ditulis : ${DRY ? '(dry, tidak ditulis)' : written}`);
console.log(`[related] total relasi     : ${filled} (${written ? (filled / written).toFixed(1) : 0} per artikel)`);
console.log(`[related] dibiarkan kosong  : ${empty} (kategori sendirian, tidak ada pasangan)`);
console.log(`[related] format tak dikenali: ${unchanged}`);