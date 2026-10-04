#!/usr/bin/env node
// seo/from-template.mjs — assembler artikel MDX dari SPEC ringkas (hemat token).
// Semua bagian kaku yang menjamin gate (frontmatter, FAQ x5 di 2 tempat, CTA link
// wajib /layanan + app.socio.id/daftar, ## Baca juga ke slug PUBLISHED, category
// enum) di-bake otomatis. Author (agent/model) hanya kirim prose di specs.json.
//
// Spec (array JSON):
// [{
//   "keyword":"...", "slug":"...", "title":"...", "description":"...",
//   "category":"Followers|TikTok|Reseller|Lainnya",
//   "lead":"paragraf pembuka (kata pertama keyword di awal)",
//   "sections":[{"h2":"...","body":"..."}, ... 3-5; H2 pertama memuat 2 kata awal keyword; TARUH 1 link eksternal resmi di salah satu body],
//   "faq":[{"q":"...","a":"..."}, ... tepat 5],
//   "tags":["...","..."]  // opsional; default [keyword]
// }]
//
// Write: node seo/from-template.mjs specs.batch2.json [--force]
// Setelah itu jalankan: node seo/qc.mjs  (verdict gate otoritatif)
import { readFileSync, writeFileSync, readdirSync, existsSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { BLOG_DIR, QUEUE_PATH } from './paths.mjs';

const NL = String.fromCharCode(10);
const FORCE = process.argv.includes('--force');
const PUB_CANDIDATES = [
  'apa-itu-smm-panel', 'cara-menambah-followers-instagram', 'modal-jualan-followers',
  'smm-panel-indonesia', 'smm-panel',
];
const CATS = ['Followers', 'TikTok', 'Reseller', 'Lainnya'];

function isDraft(txt) { return txt.indexOf(NL + 'draft: true') >= 0; }
function titleOf(slug) {
  try {
    const t = readFileSync(join(BLOG_DIR, `${slug}.mdx`), 'utf8').match(/^title:\s*"?([^"\n]+?)"?\s*$/m);
    return t ? t[1] : slug;
  } catch { return slug; }
}
function publishedPick(n = 2) {
  const all = readdirSync(BLOG_DIR).filter((f) => f.endsWith('.mdx')).map((f) => f.replace(/\.mdx$/, ''));
  const pub = new Set(all.filter((s) => !isDraft(readFileSync(join(BLOG_DIR, `${s}.mdx`), 'utf8'))));
  const chosen = PUB_CANDIDATES.filter((s) => pub.has(s)).slice(0, n);
  for (const s of all) { if (chosen.length >= n) break; if (pub.has(s) && !chosen.includes(s)) chosen.push(s); }
  return chosen;
}

const esc = (s) => String(s).replace(/([.*+?^${}()|[\]\\])/g, '\\$1');

function buildMdx(spec) {
  const cat = CATS.includes(spec.category) ? spec.category : 'Lainnya';
  const rel = publishedPick(2);
  const tags = (spec.tags && spec.tags.length) ? spec.tags : [spec.keyword];
  const fm = [];
  fm.push('---');
  fm.push(`title: "${spec.title.replace(/"/g, '')}"`);
  fm.push(`description: "${(spec.description || '').replace(/"/g, '').slice(0, 160)}"`);
  fm.push(`pubDate: ${process.env.SEO_PUBDATE || '2026-10-01'}`);
  fm.push(`category: "${cat}"`);
  fm.push('draft: true');
  fm.push('faq:');
  for (const f of spec.faq) { fm.push(`  - q: "${f.q.replace(/"/g, '')}"`); fm.push(`    a: "${f.a.replace(/"/g, '')}"`); }
  fm.push('related:');
  for (const r of rel) fm.push(`  - ${r}`);
  fm.push(`tags: [${tags.map((t) => `"${String(t).replace(/"/g, '')}"`).join(', ')}]`);
  fm.push('---');

  const body = [];
  body.push(spec.lead.trim());
  body.push('');
  for (const s of spec.sections) { body.push(`## ${s.h2.trim()}`); body.push(''); body.push(s.body.trim()); body.push(''); }
  // CTA bake — internal /layanan + app.socio.id/daftar (jamin 2 gate sekaligus).
  body.push(
    'Untuk membandingkan opsi dan melihat minimum order tiap layanan, buka katalog [layanan SMM panel](/layanan), ' +
    'lalu mulai gratis dengan membuat akun di [app.socio.id/daftar](https://app.socio.id/daftar).',
  );
  body.push('');
  body.push('## FAQ');
  body.push('');
  for (const f of spec.faq) { body.push(`**Q: ${f.q.replace(/"/g, '')}**`); body.push(`A: ${f.a.replace(/"/g, '')}`); body.push(''); }
  body.push('## Baca juga');
  body.push('');
  for (const r of rel) body.push(`- [${titleOf(r)}](/blog/${r})`);
  body.push('');

  return fm.join(NL) + NL + NL + body.join(NL);
}

// pre-check ringan (verdict final tetap qc.mjs) — info supaya spec pertama sering lolos.
function preflight(mdx, keyword) {
  const body = mdx.slice(mdx.indexOf('---', 3) + 3);
  const words = body.split(/\s+/).filter(Boolean).length;
  const kw = keyword.toLowerCase();
  const hits = (body.toLowerCase().match(new RegExp(esc(kw), 'g')) || []).length;
  const ext = [...body.matchAll(/\[[^\]]+\]\((https?:[^)]+)\)/g)].map((m) => m[1])
    .filter((u) => !/^(https:\/\/)?(www\.)?socio\.id\//i.test(u) && !/app\.socio\.id/i.test(u)).length;
  return { words, hits, ext };
}

const specsPath = process.argv[2];
if (!specsPath) { console.error('Pakai: node seo/from-template.mjs <specs.json> [--force]'); process.exit(2); }
const specs = JSON.parse(readFileSync(specsPath, 'utf8'));
const queue = JSON.parse(readFileSync(QUEUE_PATH, 'utf8'));

let ok = 0;
for (const spec of specs) {
  const slug = spec.slug || spec.keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const outPath = join(BLOG_DIR, `${slug}.mdx`);
  if (existsSync(outPath) && !FORCE) { console.log(`SKIP ${slug} (file ada)`); continue; }
  if (!spec.sections || spec.sections.length < 3 || spec.sections.length > 5) { console.log(`SKIP ${slug}: sections harus 3-5 (ada ${spec.sections ? spec.sections.length : 0})`); continue; }
  if (!spec.faq || spec.faq.length !== 5) { console.log(`SKIP ${slug}: faq harus tepat 5`); continue; }
  const mdx = buildMdx(spec);
  const pf = preflight(mdx, spec.keyword);
  const flag = pf.words >= 850 && pf.words <= 1400 && pf.hits >= 3 && pf.hits <= 25 && pf.ext >= 1 && pf.ext <= 2 ? 'OK ' : 'CEK';
  writeFileSync(outPath, mdx);
  // flip queue pending -> draft
  const it = queue.items.find((x) => (x.slug || x.keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')) === slug && x.status === 'pending');
  if (it) { it.status = 'draft'; it.slug = slug; it.notes = (it.notes ? it.notes + ' | ' : '') + 'template-agent 2026-10-01'; }
  console.log(`${flag} ${slug}  [${pf.words} kata, kw=${pf.hits}, ext=${pf.ext}]  ${it ? 'queue:draft' : 'queue:?'}`);
  ok++;
}
writeFileSync(QUEUE_PATH + '.tmp', JSON.stringify(queue, null, 2) + NL);
renameSync(QUEUE_PATH + '.tmp', QUEUE_PATH);
console.log(`\n${ok} artikel ditulis. Verifikasi gate: node seo/qc.mjs ${specs.map((s) => s.slug || '').join(' ')}`);
