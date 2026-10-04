#!/usr/bin/env node
/**
 * seo/check-article.mjs — validasi 1 artikel sebelum dianggap selesai.
 *
 * Kenapa file ini perlu: `qc-uniqueness.mjs` hanya mengecek duplikasi, dan
 * `yaml.safe_load` hanya mengecek sintaks YAML. Keduanya TIDAK mengecek schema
 * content collection Astro (title ≤70, description ≤160, faq tepat 5) maupun
 * keberadaan pagar frontmatter. Empat hal itu sempat rusak di artikel yang
 * sudah "selesai" — jadi sekarang satu perintah untuk semuanya.
 *
 * Pakai: node seo/check-article.mjs <slug> [<slug> ...]
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { BLOG_DIR } from './paths.mjs';

// js-yaml hanya terpasang di workspace `landing`, jadi resolve dari sana.
// Dipakai karena parsing manual pakai regex BUTA: frontmatter `a: "…\"…` tanpa
// penutup quote lolos regex, padahal YAML-nya rusak. Draft tidak pernah dirender
// Astro, jadi build TIDAK bisa menangkap ini — hanya parser YAML yang bisa.
const requireLanding = createRequire(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'landing', 'noop.js'),
);
let YAML = null;
try {
  YAML = requireLanding('js-yaml');
} catch {
  console.error('  PERINGATAN: js-yaml tidak ketemu — validasi sintaks YAML dilewati.');
}

const slugs = process.argv.slice(2);
if (!slugs.length) {
  console.error('Pakai: node seo/check-article.mjs <slug> [<slug> ...]');
  process.exit(2);
}

// Kata yang menempel: huruf kecil glued ke sufiks kapital.
// Versi lama butuh KAPITAL 3+ (`beliInstagram`), dan itu terlalu longgar —
// glitch nyata di korpus hanya 1-2 kapital: `hanyaIncrement`, `butuhPaparan`,
// `duanyaDescending`, `llNemu`, `mudahletyFriendpeople`. Sekarang 1 kapital cukup.
const KATA_CAMPUR = /\b[a-z]{3,}[A-Z][a-z]{2,}\b/g;
const KATA_CAMPUR_LEGIT = new Set(['pubDate']);
// Junk underscore/bracket: `yang_comment`, `karena_pattern`, `&[i] ordered]`.
// Glitch yang lolos gate lain karena watcher kata stemmed-nya tidak kena.
// Skrip non-Latin. Range lama (CJK + Cyrillic + Latin-Extended) ternyata MISSED:
// Hangul, fullwidth, dan emoji/simbol astral — ketiganya nyata muncul sebagai
// glitch di korpus 2 Okt 2026 dan lolos gate. Sekarang semuanya ditutup.
// SENGAJA tidak dimasukkan: tanda baca Latin sah (— · → ≥ ≤).
const ASING =
  /[\u0100-\u017f\u0370-\u03ff\u0400-\u04ff\u0530-\u058f\u0900-\u0dff\u0e00-\u0fff\u3000-\u9fff\uac00-\ud7af\uff00-\uffef]|[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/u;
const BOLEH = new Set(['instagram', 'tiktok', 'telegram', 'youtube', 'twitter', 'facebook', 'spotify', 'smm', 'faq']);

let gagal = 0;

for (const slug of slugs) {
  const f = join(BLOG_DIR, `${slug}.mdx`);
  let src;
  try {
    src = readFileSync(f, 'utf8');
  } catch {
    console.log(`  ✗ ${slug}: file tidak ada`);
    gagal++;
    continue;
  }

  const err = [];

  // 1. pagar frontmatter harus tepat 2
  const fences = (src.match(/^---$/gm) || []).length;
  if (fences !== 2) err.push(`pagar '---' = ${fences} (harus 2)`);
  if (!src.startsWith('---\n')) err.push('baris pertama bukan pagar pembuka');

  // 2. karakter asing / kata campuran huruf
  if (ASING.test(src)) err.push('ada karakter non-Latin');
  const mixed = [...new Set([...src.matchAll(KATA_CAMPUR)].map((m) => m[0]))].filter(
    (w) => !BOLEH.has(w.toLowerCase()) && !KATA_CAMPUR_LEGIT.has(w),
  );
  if (mixed.length) err.push(`kata campuran huruf: ${mixed.join(', ')}`);

  // Junk markup: underscore di tengah kata, atau sisa tag HTML/MDX.
  const junk = [...new Set([
    ...[...src.matchAll(/\b[a-z]+_[a-z]+\b/g)].map((m) => m[0]),
    ...[...src.matchAll(/&\[[a-z]{1,4}\]|\]\[[a-z]{1,4}\]/gi)].map((m) => m[0]),
  ])];
  if (junk.length) err.push(`junk markup: ${junk.join(', ')}`);

  // 3. frontmatter + schema Astro
  const fmRaw = src.slice(4, src.indexOf('\n---', 3));
  let d = null;
  try {
    if (YAML) {
      // Parser sungguhan. Menangkap quote tak tertutup, indentasi rusak, dan
      // key ganda — semua yang lolos regex tapi bikin draft gagal saat publish.
      let doc;
      try {
        doc = YAML.load(fmRaw);
      } catch (e) {
        err.push(`YAML frontmatter rusak: ${String(e.message).split('\n')[0]}`);
      }
      if (doc && typeof doc === 'object') {
        const faq = Array.isArray(doc.faq) ? doc.faq : [];
        d = {
          title: doc.title ?? null,
          description: doc.description ?? null,
          faq: faq.length,
          a: faq.filter((f) => f && typeof f.a === 'string' && f.a.trim()).length,
          draft: doc.draft ?? null,
        };
        for (const [i, f] of faq.entries()) {
          if (!f || typeof f.q !== 'string' || !f.q.trim()) err.push(`faq #${i + 1} tidak punya q`);
        }
      }
    }
    // get() dipakai sebagai fallback kalau js-yaml tidak tersedia.
    const get = (k) => {
      const m = fmRaw.match(new RegExp(`^${k}:\\s*"?([^"\\n]*)"?\\s*$`, 'm'));
      return m ? m[1] : null;
    };
    if (!d) {
      const faqBlock = fmRaw.slice(fmRaw.indexOf('faq:') + 4);
      const faqs = [...faqBlock.matchAll(/^\s*-\s*q:\s*"([^"]*)"\s*$/gm)];
      const as = [...faqBlock.matchAll(/^\s*a:\s*"([^"]*)"\s*$/gm)];
      d = { title: get('title'), description: get('description'), faq: faqs.length, a: as.length, draft: get('draft') };
    }

    if (!d.title) err.push('title tidak terbaca');
    else if (d.title.length > 70) err.push(`title ${d.title.length} karakter (maks 70)`);
    if (!d.description) err.push('description tidak terbaca');
    else if (d.description.length > 160) err.push(`description ${d.description.length} karakter (maks 160)`);
    if (d.faq !== 5) err.push(`faq ${d.faq} item (harus tepat 5)`);
    if (d.a !== 5) err.push(`faq punya ${d.a} field 'a' (harus 5)`);
    if (fmRaw.includes('- q::') || fmRaw.includes('::')) err.push('ada key YAML ganda (::)');
  } catch (e) {
    err.push(`frontmatter gagal dibaca: ${e.message}`);
  }

  const words = src.split('---', 2)[1]?.split(/\s+/).filter(Boolean).length ?? 0;

  if (err.length) {
    gagal++;
    console.log(`  ✗ ${slug}`);
    for (const e of err) console.log(`      - ${e}`);
  } else {
    console.log(`  ✓ ${slug}  (draft=${d.draft}, ${d.faq} FAQ, ${words} token)`);
  }
}

console.log(gagal ? `\n  ${gagal} artikel belum benar` : `\n  semua ${slugs.length} artikel valid`);
process.exitCode = gagal ? 1 : 0;
