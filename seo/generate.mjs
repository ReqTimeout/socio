#!/usr/bin/env node
/**
 * seo/generate.mjs — generator artikel SMM via opencode CLI (spec §3).
 *
 * Pipeline:
 *   queue.json → sort priority → pull top pending
 *   → build prompt → spawn `opencode run --model <free>` (stdin)
 *   → parse output → assemble MDX via template (prompts.ts)
 *   → validate gates → write MDX draft ke landing/src/content/blog/<slug>.mdx
 *   → mark queue item status='draft'
 *
 * Provider: opencode/* free models (rotasi round-robin).
 *   Available (verified Sep 2026): mimo-v2.5-free, ling-3.0-flash-fin-free,
 *   muse-spark-1.2-contributor-free, nemotron-3-ultra-free, nemotron-3.5-lightning-free.
 *   Plus 'big-pickle' sebagai fallback.
 *
 * Token budget: ~2.5k token/artikel (system 200 + user 250 + output 2000).
 * Timeout: 180s per call. Retry 1x ganti model jika error.
 *
 * Usage:
 *   node seo/generate.mjs --count=2
 *   node seo/generate.mjs --count=1 --keyword="beli followers instagram aman"
 *   node seo/generate.mjs --count=2 --dry
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

import { ROOT, BLOG_DIR, QUEUE_PATH, PRICES_PATH, PROMPTS_PATH, GEO_OUT_PATH } from './paths.mjs';
import { injectGeoAnchor } from './lib/geo-anchor.mjs';
import { lintArticle } from './lib/article-lint.mjs';

const PRICES = JSON.parse(readFileSync(PRICES_PATH, 'utf8'));
const QUEUE = JSON.parse(readFileSync(QUEUE_PATH, 'utf8'));

// ===== Load prompts.ts (TS strip + eval values) =====
// Simpler approach: extract SYSTEM_PROMPT string + function bodies via regex,
// eval them in a Function scope. Avoids module system gotchas.
const promptsSrc = readFileSync(PROMPTS_PATH, 'utf8');

function extractSystemPrompt(src) {
  const m = src.match(/export\s+const\s+SYSTEM_PROMPT\s*=\s*`([\s\S]*?)`;?\s*$/m);
  return m ? m[1] : '';
}

function extractFunctionBody(src, fname) {
  // Find `export function NAME(` start line.
  const lines = src.split('\n');
  let startLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (new RegExp(`^export\\s+function\\s+${fname}\\s*\\(`).test(lines[i])) {
      startLine = i;
      break;
    }
  }
  if (startLine < 0) return null;
  let i = 0;
  for (let p = 0; p < startLine; p++) i += lines[p].length + 1;
  // Skip past params `(...)` (handles destructuring)
  while (i < src.length && src[i] !== '(') i++;
  if (i >= src.length) return null;
  i++;
  let pd = 1;
  while (i < src.length && pd > 0) {
    if (src[i] === '(') pd++;
    else if (src[i] === ')') pd--;
    i++;
  }
  while (i < src.length && /\s/.test(src[i])) i++;
  if (src[i] !== '{') return null;
  const bodyStart = i + 1;

  // State machine: only count `{`/`}` as function braces when OUTSIDE any template literal.
  let depth = 0;
  let started = false;
  let inTpl = 0;
  let inStr = '';
  let inLine = false;
  let inBlock = false;
  let inRegex = false;

  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1] || '';
    const prev = i > 0 ? src[i - 1] : '';

    if (inLine) {
      if (c === '\n') inLine = false;
      i++; continue;
    }
    if (inBlock) {
      if (c === '*' && next === '/') inBlock = false;
      i++; continue;
    }
    if (inStr) {
      if (c === '\\' && i + 1 < src.length) { i += 2; continue; }
      if (c === inStr) inStr = '';
      i++; continue;
    }
    if (inRegex) {
      if (c === '\\' && i + 1 < src.length) { i += 2; continue; }
      if (c === '/') inRegex = false;
      i++; continue;
    }
    if (inTpl > 0) {
      if (c === '\\' && i + 1 < src.length) { i += 2; continue; }
      if (c === '$' && next === '{') {
        i += 2;
        let d2 = 1;
        while (i < src.length && d2 > 0) {
          const cc = src[i];
          if (cc === '\\' && i + 1 < src.length) { i += 2; continue; }
          if (cc === '{') d2++;
          else if (cc === '}') d2--;
          i++;
        }
        continue;
      }
      if (c === '`') { inTpl--; i++; continue; }
      i++; continue;
    }
    // Outside any
    if (c === '/' && next === '/') { inLine = true; i += 2; continue; }
    if (c === '/' && next === '*') { inBlock = true; i += 2; continue; }
    if (c === '"' || c === "'") { inStr = c; i++; continue; }
    if (c === '/' && /[=(,;:!&|?+\{\[]$/.test(prev)) { inRegex = true; i++; continue; }
    if (c === '`') { inTpl++; i++; continue; }
    if (c === '{') { depth++; started = true; }
    else if (c === '}') {
      depth--;
      if (started && depth === 0) break;
    }
    i++;
  }
  if (!started || depth !== 0) return null;
  return src.slice(bodyStart, i - 1);
}

// Strip TS types from a function body (crude but works for our prompts)
function stripTs(b) {
  return b
    .replace(/:\s*string(?!\w)/g, '')
    .replace(/:\s*number(?!\w)/g, '')
    .replace(/:\s*boolean(?!\w)/g, '')
    .replace(/:\s*any(?!\w)/g, '')
    .replace(/:\s*void(?!\w)/g, '')
    .replace(/\)\s*:\s*[a-zA-Z_]\w*\s*\{/g, ') {');
}

const SYSTEM_PROMPT = extractSystemPrompt(promptsSrc);

// Shared helpers prepended to each function body so they're in scope when eval'd.
const SHARED_HELPERS = `
const escapeMd = (s) => s == null ? '' : String(s).replace(/[|]/g, '\\\\|').replace(/\\n/g, ' ').slice(0, 100);
const escapeYaml = (s) => s == null ? '' : String(s).replace(/"/g, '\\\\"').replace(/\\n/g, ' ').slice(0, 200);
const ACRONYMS = new Set(['SMM','SEO','API','QRIS','DM','FYP','CTA','UGC']);
const mapCategory = (category) => {
  const c = String(category || 'Lainnya');
  if (['Followers', 'TikTok', 'Reseller', 'Lainnya'].includes(c)) return c;
  if (/reseller/i.test(c)) return 'Reseller';
  if (/tiktok/i.test(c)) return 'TikTok';
  if (/follow/i.test(c)) return 'Followers';
  return 'Lainnya';
};
const capitalize = (s) => { const ACR = new Set(['SMM','SEO','API','QRIS','DM','FYP','CTA','UGC']); return (s||'').split(/\\s+/).map((w) => ACR.has(w.toUpperCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)).join(' '); };
const renderFrontmatter = ({title, description, pubDate, category, draft, faq, related}) => {
  const faqYaml = (faq||[]).map((f) => \`  - q: "\${escapeYaml(f.q)}"\\n    a: "\${escapeYaml(f.a)}"\`).join('\\n');
  const relatedYaml = (related||[]).map((r) => \`  - \${r.slug}\`).join('\\n');
  return \`---
title: "\${escapeYaml(title)}"
description: "\${escapeYaml(description)}"
pubDate: \${pubDate}
category: "\${category}"
draft: \${draft ? 'true' : 'false'}
faq:
\${faqYaml || '  - q: "Placeholder"\\n    a: "Placeholder"'}
related:\${relatedYaml ? '\\n' + relatedYaml : ' []'}
---\`;
};
const renderPriceTable = (prices) => {
  const rows = (prices||[]).slice(0, 6).map((p) =>
    \`| \${p.platform} \${escapeMd(p.name)} | Rp\${p.price.toLocaleString('id-ID')} | Rp\${p.priceReseller.toLocaleString('id-ID')} | \${p.min.toLocaleString('id-ID')} |\`,
  ).join('\\n');
  return \`| Layanan | Harga member/1k | Harga reseller/1k | Min order |
| --- | --- | --- | --- |
\${rows}\`;
};
const renderSafetyCallout = () => \`> **Tips aman pakai SMM panel**: (1) Pilih layanan gradual refill — follower naik bertahap, bukan sekaligus, jadi lebih natural. (2) Jangan beli followers saat akun masih baru (umur di bawah 3 bulan) — algoritma deteksi lebih ketat. (3) Hindari spam massal — maksimal 1-2x order per minggu per akun. (4) Cek garansi refill sebelum bayar — layanan tanpa refill = risiko tinggi.\`;
const renderCtaBlock = () => \`> **Mau langsung cek harganya?** Daftar reseller Socio.id — Rp50.000 include saldo Rp20.000 langsung jalan + harga reseller lebih murah di semua 8.270 layanan Instagram, TikTok, YouTube, Telegram, Spotify & SEO. → [Cek harga & pesan sekarang](https://app.socio.id/daftar?mode=reseller)\`;
const stripFaqSection = (body) => body.replace(/##\\s*(?:FAQ|Pertanyaan[^\\n]*)[\\s\\S]*$/i, '').trimEnd();
const stripFabricatedRp = (body) => body.replace(/Rp\\s?(\\d[\\d.]*)\\s?(ribu|juta)?/gi, (m, n, suf) => {
  let digits = Number(n.replace(/\\./g, ''));
  if (/^ribu/i.test(suf || '')) digits *= 1000;
  if (/^juta/i.test(suf || '')) digits *= 1000000;
  if (digits === 50000 || digits === 20000) return m;
  return 'harga di tabel';
});
const injectAfterFirstH2 = (body, table) => {
  const m = body.match(/^##\\s+[^\\n]+\\n([\\S\\s]*?)(?=\\n## |\\n*$)/);
  if (!m) return body + '\\n\\n' + table;
  const firstH2End = m.index + m[0].length;
  return body.slice(0, firstH2End) + '\\n\\n' + table + '\\n\\n' + body.slice(firstH2End);
};
const linkifyBareUrls = (body) => {
  let out = body;
  out = out.replace(/(?<!\\]\\()https?:\\/\\/app\\.socio\\.id\\/daftar[^\\s)]*/g, (u) => \`[daftar reseller Socio.id](\${u})\`);
  out = out.replace(/(?<!\\]\\()(^|[\\s(])(\\/(?:layanan|reseller|beli-[a-z0-9-]+|smm-panel-[a-z0-9-]+|blog\\/[a-z0-9-]+)\\/?)/gm,
    (m, pre, p) => \`\${pre}[\${p.replace(/\\//g, ' ').trim()}](\${p})\`);
  out = out.replace(/(?<!\\]\\()((?:https?:\\/\\/)?(?:help\\.instagram\\.com|support\\.tiktok\\.com|support\\.google\\.com)[^\\s)]*)/g,
    (u) => \`[panduan resmi](\${u.startsWith('http') ? u : 'https://' + u})\`);
  return out;
};
`;

// Each helper makes the eval'd function destructure its arg explicitly so `keyword` etc. are bound.
function buildUserPrompt(args) {
  const { keyword, category, related, pricesBlock, localAnchor, localBuyer } = args;
  const body = SHARED_HELPERS + '\n' + stripTs(extractFunctionBody(promptsSrc, 'buildUserPrompt') || '');
  const fn = new Function('keyword', 'category', 'related', 'pricesBlock', 'localAnchor', 'localBuyer', body);
  return fn(keyword, category, related, pricesBlock, localAnchor, localBuyer);
}
function parseOutput(content) {
  const body = stripTs(extractFunctionBody(promptsSrc, 'parseOutput') || '');
  return new Function('content', body)(content);
}
function assembleMdx(args) {
  const { llmBody, prices, moneyLink, related, faq, meta } = args;
  const body = SHARED_HELPERS + '\n' + stripTs(extractFunctionBody(promptsSrc, 'assembleMdx') || '');
  return new Function('llmBody', 'prices', 'moneyLink', 'related', 'faq', 'meta', body)(llmBody, prices, moneyLink, related, faq, meta);
}
function deriveMeta(args) {
  const { keyword, llmBody, category } = args;
  const body = SHARED_HELPERS + '\n' + stripTs(extractFunctionBody(promptsSrc, 'deriveMeta') || '');
  return new Function('keyword', 'llmBody', 'category', body)(keyword, llmBody, category);
}
function validateMdx(content, keyword) {
  const body = stripTs(extractFunctionBody(promptsSrc, 'validateMdx') || '');
  return new Function('content', 'keyword', body)(content, keyword);
}

// Sanity check
if (!SYSTEM_PROMPT || SYSTEM_PROMPT.length < 100) {
  console.error('FATAL: failed to extract SYSTEM_PROMPT from prompts.ts');
  process.exit(1);
}

// ===== Free model rotation =====
// 1 Okt 2026: mimo-v2.5, ling-3.0-flash, muse-spark-1.2 MATI server-side.
// nemotron-lightning TIMEOUT utk output panjang (3x180s hangus) → dikeluarkan.
// Rotasi: big-pickle (panjang, kadang ngaco) + nemotron-ultra (rapi, kadang pendek).
const FREE_MODELS = [
  'opencode/big-pickle',
  'opencode/nemotron-3-ultra-free',
];
let modelIdx = 0;
function nextModel() {
  // Override uji model: SEO_MODEL=opencode/nemotron-3-ultra-free
  if (process.env.SEO_MODEL) return process.env.SEO_MODEL;
  return FREE_MODELS[modelIdx++ % FREE_MODELS.length];
}

// ===== opencode CLI runner =====
// ===== LLM provider =====
// Urutan: (1) Groq HTTP langsung (cepat ~20-40 dtk, gratis) kalau GROQ_API_KEY
// ada; (2) fallback opencode CLI rotasi free model. Hemat token: prompt sama,
// tidak ada retry boros — gagal = keep pending untuk batch berikut.
async function runGroq({ model, system, user, timeout = 120_000 }) {
  const key = process.env.GROQ_API_KEY;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.7,
        max_tokens: 3000,
      }),
    });
    if (!res.ok) throw new Error(`groq ${res.status}: ${(await res.text()).slice(0, 150)}`);
    const j = await res.json();
    const text = j.choices?.[0]?.message?.content?.trim() || '';
    if (!text) throw new Error('groq empty response');
    return text;
  } finally {
    clearTimeout(t);
  }
}

function groqModel() {
  return process.env.SEO_MODEL || process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
}

function runOpencode({ model, prompt, timeout = 180_000 }) {
  return new Promise((resolve, reject) => {
    const proc = spawn('opencode', ['run', '--model', model, '--format', 'default', prompt], {
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: ROOT,
    });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => (stdout += d.toString()));
    proc.stderr.on('data', (d) => (stderr += d.toString()));
    const t = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error(`timeout ${timeout}ms`));
    }, timeout);
    proc.on('close', (code) => {
      clearTimeout(t);
      if (code !== 0 && !stdout.trim()) {
        reject(new Error(`opencode exit ${code}: ${stderr.slice(0, 200)}`));
        return;
      }
      resolve(stdout);
    });
  });
}

// ===== Helpers =====
function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

// ===== Sprint 1 guards (A4/A5b/A6) — helper murni, tidak lewat eval =====

// publishedSlugs: hanya artikel yang ada di disk + sudah publish yang boleh jadi tautan
// internal "Baca juga". Draft (draft: true) belum tampil di situs = 404 kalau di-link.
function publishedSlugs() {
  if (!existsSync(BLOG_DIR)) return [];
  return readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => ({ slug: f.replace(/\.mdx$/, ''), path: join(BLOG_DIR, f) }))
    .filter((r) => !readFileSync(r.path, 'utf8').includes('\ndraft: true'))
    .map((r) => r.slug);
}

// A4: related diambil dari slug terpublish saja; judul dibaca dari frontmatter file.
function pickRelated(available) {
  if (!existsSync(BLOG_DIR)) return [];
  return available.slice(0, 2).map((slug) => {
    const raw = readFileSync(join(BLOG_DIR, `${slug}.mdx`), 'utf8');
    const m = raw.match(/^title: "?([^"\n]+)/m);
    return { slug, title: m ? m[1].trim() : slug };
  });
}

// A5b: normalisasi prosa -> set 3-gram -> Jaccard. Ambang 0.55 konservatif: artikel
// serumpun topik tetap lolos, hasil tempel-lolos / parafrase tipis ditolak.
const cleanProse = (s) => String(s).toLowerCase()
  .replace(/\[\[[^\]]*\]\]/g, ' ')
  .replace(/https?:\/\/\S+/g, ' ')
  .replace(/\[([^[\]]*)\]\([^)]*\)/g, '$1')
  .replace(/\s+/g, ' ').trim();
function gramSet(s, n = 3) {
  const w = cleanProse(s).split(' ').filter(Boolean);
  const set = new Set();
  for (let i = 0; i + n <= w.length; i++) set.add(w.slice(i, i + n).join(' '));
  return set;
}
function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const g of a) if (b.has(g)) inter++;
  return inter / (a.size + b.size - inter);
}
function duplicateDraftInfo(mdx, selfSlug) {
  if (!existsSync(BLOG_DIR)) return null;
  const mine = gramSet(mdx);
  for (const f of readdirSync(BLOG_DIR).filter((x) => x.endsWith('.mdx'))) {
    const slug = f.replace(/\.mdx$/, '');
    if (slug === selfSlug) continue;
    if (jaccard(mine, gramSet(readFileSync(join(BLOG_DIR, f), 'utf8'))) >= 0.55) return slug;
  }
  return null;
}

// A6: FAQ harus ada dan pertanyaannya tidak kembar. Section hilang / dobel = hasil-pad.
function paddedFaqInfo(body) {
  const m = body.match(/##\s*(?:FAQ|Pertanyaan[^\n]*)\s*\n([\S\s]*?)(?=\n## |\n*$)/i);
  if (!m) return 'section FAQ tidak ada';
  const qs = [...m[1].matchAll(/\*\*([^*\n]+\?)\*\*/g)].map((x) => cleanProse(x[1])).filter(Boolean);
  if (qs.length >= 2 && new Set(qs).size !== qs.length) return 'pertanyaan FAQ duplikat';
  return null;
}

function pickPrices(keyword) {
  const k = keyword.toLowerCase();
  let pool = PRICES.top;
  for (const pf of ['instagram', 'tiktok', 'youtube', 'telegram', 'facebook', 'twitter', 'spotify']) {
    if (k.includes(pf)) {
      pool = PRICES.top.filter((p) => p.platform.toLowerCase().includes(pf));
      if (pool.length >= 3) break;
    }
  }
  return pool.length >= 3 ? pool.slice(0, 6) : PRICES.top.slice(0, 6);
}

function pickMoneyLink(keyword, prices) {
  // Map keyword → money page slug (39 pages: 10 hand + 29 generated).
  // Urutan: spesifik (komentar/live/story/retweet/...) dulu, baru generik.
  const k = keyword.toLowerCase();
  const has = (...ws) => ws.some((w) => k.includes(w));
  if (has('komentar', 'comment', 'repl')) {
    if (has('instagram')) return { url: '/beli-komentar-instagram/', anchor: 'beli komentar Instagram' };
    if (has('tiktok')) return { url: '/beli-komentar-tiktok/', anchor: 'beli komentar TikTok' };
    if (has('youtube')) return { url: '/beli-komentar-youtube/', anchor: 'beli komentar YouTube' };
    if (has('telegram')) return { url: '/beli-komentar-telegram/', anchor: 'beli komentar Telegram' };
    if (has('facebook')) return { url: '/beli-komentar-facebook/', anchor: 'beli komentar Facebook' };
    if (has('twitter')) return { url: '/beli-komentar-twitter/', anchor: 'beli komentar Twitter' };
  }
  if (has('live')) {
    if (has('tiktok')) return { url: '/beli-live-tiktok/', anchor: 'beli live viewers TikTok' };
    if (has('youtube')) return { url: '/beli-live-youtube/', anchor: 'beli live viewers YouTube' };
    if (has('facebook')) return { url: '/beli-live-facebook/', anchor: 'beli live viewers Facebook' };
  }
  if (has('story')) {
    if (has('telegram')) return { url: '/beli-story-telegram/', anchor: 'beli story Telegram' };
    return { url: '/beli-story-views-instagram/', anchor: 'beli story views Instagram' };
  }
  if (has('reels')) return { url: '/beli-reels-instagram/', anchor: 'beli reels Instagram' };
  if (has('saves', 'save ')) {
    if (has('instagram')) return { url: '/beli-saves-instagram/', anchor: 'beli saves Instagram' };
    if (has('tiktok')) return { url: '/beli-saves-tiktok/', anchor: 'beli saves TikTok' };
  }
  if (has('share')) {
    if (has('tiktok')) return { url: '/beli-share-tiktok/', anchor: 'beli share TikTok' };
    if (has('facebook')) return { url: '/beli-share-facebook/', anchor: 'beli share Facebook' };
    if (has('youtube')) return { url: '/beli-share-youtube/', anchor: 'beli share YouTube' };
    if (has('instagram')) return { url: '/beli-shares-instagram/', anchor: 'beli shares Instagram' };
  }
  if (has('retweet')) return { url: '/beli-retweet-twitter/', anchor: 'beli retweet Twitter' };
  if (has('reaction')) {
    if (has('telegram')) return { url: '/beli-reactions-telegram/', anchor: 'beli reactions Telegram' };
    if (has('facebook')) return { url: '/beli-reactions-facebook/', anchor: 'beli reactions Facebook' };
  }
  if (has('jam tayang', 'watch hour', 'monetisasi')) return { url: '/beli-jam-tayang-youtube/', anchor: 'beli jam tayang YouTube' };
  if (has('listener')) return { url: '/beli-listeners-spotify/', anchor: 'beli listeners Spotify' };
  if (has('plays', 'play ')) return { url: '/beli-plays-spotify/', anchor: 'beli plays Spotify' };
  if (has('post view', 'post-view', 'views telegram', 'views channel')) return { url: '/beli-views-telegram/', anchor: 'beli views Telegram' };
  if (has('follower')) {
    if (has('instagram')) return { url: '/beli-followers-instagram/', anchor: 'beli followers Instagram' };
    if (has('tiktok')) return { url: '/beli-followers-tiktok/', anchor: 'beli followers TikTok' };
    if (has('youtube')) return { url: '/beli-subscribers-youtube/', anchor: 'beli subscribers YouTube' };
    if (has('facebook')) return { url: '/beli-followers-facebook/', anchor: 'beli followers Facebook' };
    if (has('twitter')) return { url: '/beli-followers-twitter/', anchor: 'beli followers Twitter' };
    if (has('spotify')) return { url: '/beli-followers-spotify/', anchor: 'beli followers Spotify' };
  }
  if (has('likes') || has('like ')) {
    if (has('tiktok')) return { url: '/beli-likes-tiktok/', anchor: 'beli likes TikTok' };
    if (has('youtube')) return { url: '/beli-likes-youtube/', anchor: 'beli likes YouTube' };
    if (has('facebook')) return { url: '/beli-likes-facebook/', anchor: 'beli likes Facebook' };
    if (has('twitter')) return { url: '/beli-likes-twitter/', anchor: 'beli likes Twitter' };
    return { url: '/beli-likes-instagram/', anchor: 'beli likes Instagram' };
  }
  if (has('view')) {
    if (has('tiktok')) return { url: '/beli-views-tiktok/', anchor: 'beli views TikTok' };
    if (has('youtube')) return { url: '/beli-views-youtube/', anchor: 'beli views YouTube' };
    if (has('facebook')) return { url: '/beli-views-facebook/', anchor: 'beli views Facebook' };
    if (has('twitter')) return { url: '/beli-views-twitter/', anchor: 'beli views Twitter' };
    if (has('instagram')) return { url: '/beli-views-instagram/', anchor: 'beli views Instagram' };
  }
  if (has('member') || has('subscriber')) return { url: '/beli-members-telegram/', anchor: 'beli member Telegram' };
  if (has('reseller') || has('smm')) return { url: '/smm-panel-reseller/', anchor: 'program reseller SMM' };
  return { url: '/layanan/', anchor: 'layanan SMM lengkap' };
}

function extractFaqFromBody(body) {
  // Cari section FAQ di body. Accept multiple formats:
  //   A) YAML-like: "- q: \"...\" a: \"...\""
  //   B) Bold paragraphs: "**Question?**\n\nAnswer paragraph.\n\n"
  //   C) Numbered list: "1. Q? A."
  const m = body.match(/##\s*(?:FAQ|Pertanyaan[^\n]*)\s*\n([\s\S]*?)(?=\n## |\n> |\n*\[CTA|\n*$)/i);
  if (!m) return [];
  const block = m[1];
  const faqs = [];

  // Format A: YAML - q: ... a: ...
  const yamlMatches = [...block.matchAll(/(?:^|\n)\s*-?\s*q:\s*"?([^"\n]+?)"?\s*\n?\s*a:\s*"?([^"\n]+?)"?/g)];
  for (const y of yamlMatches.slice(0, 5)) {
    const q = y[1].trim();
    const a = y[2].trim();
    if (q && a) faqs.push({ q, a });
  }
  if (faqs.length >= 5) return faqs.slice(0, 5);

  // Format B: Bold question + paragraph answer (toleran emphasis *..* di dalam Q)
  if (faqs.length < 5) {
    const boldMatches = [...block.matchAll(/\*\*(.+?\?)\*\*\s*\n+\s*([^\n]+)/g)];
    for (const m2 of boldMatches.slice(0, 5 - faqs.length)) {
      faqs.push({ q: m2[1].trim(), a: m2[2].trim() });
    }
  }

  // Format C: Numbered list
  if (faqs.length < 5) {
    const numbered = [...block.matchAll(/(\d+)\.\s*\*?\*?([^*\n]+\?)\*?\*?\s*\n?\s*([^*\n][^\n]+)/g)];
    for (const n of numbered.slice(0, 5 - faqs.length)) {
      faqs.push({ q: n[2].trim(), a: n[3].trim() });
    }
  }

  return faqs.slice(0, 5);
}

// A5: validasi eksistensi link internal /blog/<slug>. Target HARUS artikel publish di disk
// (draft belum live = 404; slug karangan LLM = 404). Money page (/beli-*, /layanan, /reseller,
// /smm-panel-*) TIDAK dicek di sini — dirender route dinamis & selalu disuplai oleh
// pickMoneyLink (whitelist deterministik), bukan oleh LLM.
function blogLinkBrokenInfo(mdx, validSlugs) {
  const valid = new Set(validSlugs);
  const broken = new Set();
  for (const m of mdx.matchAll(/\/blog\/([a-z0-9][a-z0-9-]*)/g)) {
    if (!valid.has(m[1])) broken.add(m[1]);
  }
  return broken.size ? [...broken] : null;
}

// Gate Fase F: kembalikan string alasan kalau daftar keyword belum siap.
// Null = gate terbuka (boleh generate).
function keywordGate() {
  if (!existsSync(GEO_OUT_PATH)) {
    return 'seo/keywords.geo.json belum ada — jalankan: node seo/geo-expand.mjs --expand';
  }
  const geo = JSON.parse(readFileSync(GEO_OUT_PATH, 'utf8'));
  if (!geo._meta || !geo._meta.approved_at) {
    return 'daftar keyword belum di-approve user (isi _meta.approved_at di seo/keywords.geo.json)';
  }
  const approved = geo.items.filter((x) => x.approved === true).length;
  const min = Number(process.env.SEO_MIN_KEYWORDS || 200);
  if (approved < min) return `baru ${approved} keyword disetujui, ambang gate ${min}`;
  const inQueue = QUEUE.items.filter((i) => (i.added_by === 'geo' || i.added_by === 'intent') && i.status === 'pending').length;
  if (inQueue === 0) return 'belum ada keyword geo/intent di queue — jalankan: node seo/geo-expand.mjs --promote';
  return null;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { count: 1, dry: false, keyword: null, ignoreGate: false, list: 0, deferQueue: false, mergeQueue: false };
  for (const a of args) {
    if (a.startsWith('--count=')) opts.count = parseInt(a.slice(8));
    else if (a === '--dry') opts.dry = true;
    else if (a === '--ignore-gate') opts.ignoreGate = true;
    else if (a.startsWith('--keyword=')) opts.keyword = a.slice(10);
    else if (a.startsWith('--list=')) opts.list = parseInt(a.slice(7));
    else if (a === '--defer-queue') opts.deferQueue = true;
    else if (a === '--merge-queue') opts.mergeQueue = true;
  }
  return opts;
}

// Merge hasil worker paralel: MDX draft:true di disk yang queue-nya masih
// pending → tandai draft. Dipanggil SEKALI oleh orkestrator setelah semua
// worker selesai (hindari race tulis queue.json antar worker).
function mergeQueue() {
  let marked = 0;
  const files = existsSync(BLOG_DIR) ? readdirSync(BLOG_DIR).filter((f) => f.endsWith('.mdx')) : [];
  const draftSlugs = new Set(
    files
      .filter((f) => readFileSync(join(BLOG_DIR, f), 'utf8').includes('\ndraft: true'))
      .map((f) => f.replace(/\.mdx$/, '')),
  );
  for (const it of QUEUE.items) {
    if (it.status === 'pending' && it.slug && draftSlugs.has(it.slug)) {
      it.status = 'draft';
      it.notes = (it.notes || '') + ` | generated ${new Date().toISOString().slice(0, 10)}`;
      marked++;
    }
  }
  if (marked > 0) {
    writeFileSync(QUEUE_PATH, JSON.stringify(QUEUE, null, 2) + '\n');
  }
  console.log(`merge-queue: ${marked} item pending → draft`);
}

async function main() {
  const opts = parseArgs();
  const sigW = { high: 4, medium: 3, 'geo-matrix': 3, 'longtail-intent': 3, aeo: 2, low: 1 };
  const sig = (d) => sigW[d] ?? 2;

  // Gate Fase F (keputusan user 30 Sep): daftar keyword geo/longtail harus sudah
  // dikurasi + di-approve SEBELUM satu artikel pun digenerate. Ini mencegah mesin
  // membalik ribuan halaman kota tanpa daftar yang disetujui manusia.
  const gateReason = keywordGate();
  if (gateReason) {
    if (opts.ignoreGate) {
      console.warn('PERINGATAN KERAS: --ignore-gate dipakai. Gate Fase F dilanggar: ' + gateReason);
    } else {
      console.error('GATE FASE F TERTUTUP: ' + gateReason);
      console.error('Lewati dengan benar: node seo/geo-expand.mjs --expand -> review keywords.geo.json (approved:true + _meta.approved_at) -> node seo/geo-expand.mjs --promote');
      process.exit(1);
    }
  }

  // Urutan antrean (keputusan user 30 Sep): KOTA DULU.
  // 1. Geo (`added_by:geo`) didahulukan, round-robin per kota supaya variasi
  //    (tidak 12x kota yang sama beruntun). Kota tier-1 (prioritas tertinggi)
  //    jalan di ronde awal; dalam satu kota urut intent: head > service > trust.
  // 2. Head term non-geo (katalog/AEO) setelah antrean geo habis.
  const score = (i) => i.priority + sig(i.demand_signal) * 5;
  function pickTargets(items, count) {
    const pend = items.filter((i) => i.status === 'pending');
    const geo = pend.filter((i) => i.added_by === 'geo').sort((a, b) => score(b) - score(a));
    const byCity = new Map();
    for (const g of geo) {
      const k = g.city || '-';
      if (!byCity.has(k)) byCity.set(k, []);
      byCity.get(k).push(g);
    }
    const cities = [...byCity.keys()].sort(
      (a, b) => score(byCity.get(b)[0]) - score(byCity.get(a)[0]),
    );
    const ordered = [];
    const seen = new Set();
    // Offset diagonal per kota: ronde 0 = kota0→intent0, kota1→intent1, ...
    // sehingga 24 artikel pertama langsung campur intent (anti-doorway),
    // bukan 24x pola yang sama beda kota.
    for (let round = 0; ordered.length < geo.length; round++) {
      let added = false;
      cities.forEach((c, ci) => {
        const q = byCity.get(c);
        const pick = q[(round + ci) % q.length];
        if (pick && !seen.has(pick.keyword)) {
          seen.add(pick.keyword);
          ordered.push(pick);
          added = true;
        }
      });
      if (!added) break;
    }
    const rest = pend
      .filter((i) => i.added_by !== 'geo')
      .sort((a, b) => score(b) - score(a));
    return [...ordered, ...rest].slice(0, count);
  }

  let targets;
  if (opts.keyword) {
    targets = QUEUE.items.filter((i) => i.keyword === opts.keyword && i.status === 'pending');
  } else {
    targets = pickTargets(QUEUE.items, opts.count);
  }

  console.log(`Targets: ${targets.length} (count=${opts.count} dry=${opts.dry})`);
  for (const t of targets) {
    console.log(`  p${t.priority} ${t.demand_signal.padEnd(6)} ${t.keyword} (cluster=${t.cluster})`);
  }
  if (opts.dry) return;
  if (opts.list) {
    // Mode orkestrator paralel: cetak keyword saja (satu per baris).
    for (const t of targets) console.log(`KW::${t.keyword}`);
    return;
  }
  if (opts.mergeQueue) {
    mergeQueue();
    return;
  }

  let ok = 0, fail = 0;
  for (const t of targets) {
    console.log(`\n--- ${t.keyword} ---`);
    const slug = t.slug || slugify(t.keyword);
    const outPath = join(BLOG_DIR, `${slug}.mdx`);
    if (existsSync(outPath)) {
      console.log(`  SKIP: exists`);
      continue;
    }

    const prices = pickPrices(t.keyword);
    // A4: related HANYA dari artikel publish di disk (bukan tebakan queue) — cegah 404.
    const related = pickRelated(publishedSlugs().filter((s) => s !== slug));
    const moneyLink = pickMoneyLink(t.keyword, prices);
    const pricesBlock = prices.slice(0, 6).map((p) => `- ${p.platform} ${p.name} (Rp${p.price.toLocaleString('id-ID')}/1k)`).join('\n');

    const user = buildUserPrompt({
      keyword: t.keyword,
      category: t.category || 'Lainnya',
      related,
      pricesBlock,
      // Anti-doorway: artikel geo bawa fakta ekonomi lokal dari cities.json.
      localAnchor: t.local_anchor || null,
      localBuyer: t.local_buyer || null,
    });
    console.log(`  user prompt len: ${user.length}`);
    if (process.env.SEO_DEBUG) writeFileSync('/tmp/seo-user.txt', user);

    // Call LLM: Groq HTTP dulu (cepat), fallback rotasi opencode CLI.
    // 1 attempt per provider (hemat token/waktu) — gagal = keep pending.
    let raw = null;
    let lastErr = null;
    if (process.env.GROQ_API_KEY && !process.env.SEO_CLI_ONLY) {
      try {
        console.log(`  [groq/${groqModel()}] call...`);
        const start = Date.now();
        const out = await runGroq({ model: groqModel(), system: SYSTEM_PROMPT, user });
        const ms = Date.now() - start;
        console.log(`  ${(ms / 1000).toFixed(1)}s OK out=${out.length}c`);
        if (process.env.SEO_DEBUG) writeFileSync('/tmp/seo-out.txt', out);
        raw = out;
      } catch (e) {
        lastErr = e.message;
        console.log(`  FAIL groq: ${e.message.slice(0, 120)} → fallback CLI`);
      }
    }
    for (let attempt = 0; !raw && attempt < 2; attempt++) {
      const model = nextModel();
      try {
        const fullPrompt = SYSTEM_PROMPT + '\n\n' + user;
        console.log(`  [${model}] call... prompt=${fullPrompt.length}chars`);
        // DEBUG: dump prompt for inspection
        if (process.env.SEO_DEBUG) {
          writeFileSync('/tmp/seo-prompt.txt', fullPrompt);
          writeFileSync('/tmp/seo-user.txt', user);
        }
        const start = Date.now();
        const out = await runOpencode({ model, prompt: fullPrompt });
        const ms = Date.now() - start;
        console.log(`  ${(ms / 1000).toFixed(1)}s OK out=${out.length}c`);
        if (process.env.SEO_DEBUG) writeFileSync('/tmp/seo-out.txt', out);
        raw = out;
        break;
      } catch (e) {
        lastErr = e.message;
        console.log(`  FAIL: ${e.message.slice(0, 100)}`);
      }
    }
    if (!raw) {
      console.log(`  FINAL FAIL — keep pending`);
      fail++;
      continue;
    }

    // Parse + assemble
    const llmBody = parseOutput(raw);
    const faq = extractFaqFromBody(llmBody);
    // A6: FAQ < 5 atau terindikasi hasil-pad = LLM tidak patuh. Dulu blok ini men-pad
    // dengan pertanyaan generik — sekarang artikel ditolak supaya korpus tetap bersih.
    if (faq.length < 5) {
      console.log(`  REJECT: FAQ hanya ${faq.length}/5 — tanpa pad generik`);
      fail++;
      continue;
    }
    const padReason = paddedFaqInfo(llmBody);
    if (padReason) {
      console.log(`  REJECT: FAQ ${padReason}`);
      fail++;
      continue;
    }
    const meta = deriveMeta({ keyword: t.keyword, llmBody, category: t.category || 'Lainnya' });

    let mdx = assembleMdx({
      llmBody,
      prices,
      moneyLink,
      related,
      faq,
      meta,
    });
    // Anchor kota untuk artikel geo: disuntik DETERMINISTIK setelah assembleMdx.
    // Bukan bergantung pada LLM menulisnya — free model sering tidak patuh, dan
    // tanpa anchor halaman geo jadi doorway page (lihat §14.13).
    if (t.local_anchor) {
      const patched = injectGeoAnchor(mdx, t);
      if (patched !== mdx) {
        if (process.env.SEO_DEBUG) console.log('  + anchor kota disuntik');
        mdx = patched;
      }
    }

    if (process.env.SEO_DEBUG) writeFileSync('/tmp/seo-assembled.mdx', mdx);

    const v = validateMdx(mdx, t.keyword);
    if (!v.ok) {
      console.log(`  GATES FAIL: ${v.errors.join(' | ')}`);
      console.log(`  (body preview) ${llmBody.slice(0, 300)}`);
      fail++;
      continue;
    }
    console.log(`  ✓ ${v.words} kata, ${v.h2Count} H2, ${v.faqCount} FAQ, ${v.internalLinks} internal links`);

    // A5: semua tautan /blog/<slug> di body harus menunjuk artikel publish (cegah 404 internal).
    const brokenLinks = blogLinkBrokenInfo(mdx, publishedSlugs());
    if (brokenLinks) {
      console.log(`  REJECT: link /blog/ ke slug tak publish: ${brokenLinks.join(', ')}`);
      fail++;
      continue;
    }

    // A5b: guard anti-duplikat terhadap seluruh korpus MDX sebelum tulis file.
    const dupOf = duplicateDraftInfo(mdx, slug);
    if (dupOf) {
      console.log(`  REJECT: duplikat (Jaccard >= 0.55 vs "${dupOf}")`);
      fail++;
      continue;
    }

    // A6: gate kualitas TEKS. `validateMdx` di atas hanya menyorot frontmatter
    // (title ≤70, description ≤160, faq = 5) — tidak menyentuh isi paragraf.
    // Akibatnya kelas glitch `yang_filters`, `sebelumellos. hasten.`,
    // `Pertanyaan about harga` lolos ke korpus tanpa pernah ditahan (terbukti
    // 4 Okt 2026: 7 glitch di 5 artikel, semua lolos SEMUA gate yang ada).
    // Modul yang sama dipakai `check-article.mjs` — satu implementasi, dua pintu.
    // MENOLAK = tidak ditulis ke disk, sama seperti gate di atasnya.
    const { err: lintErr } = lintArticle(mdx);
    if (lintErr.length) {
      console.log(`  REJECT: gate teks gagal (${lintErr.length})`);
      for (const e of lintErr) console.log(`      - ${e}`);
      fail++;
      continue;
    }

    writeFileSync(outPath, mdx);
    t.status = 'draft';
    t.notes = (t.notes || '') + ` | generated ${new Date().toISOString().slice(0, 10)}`;
    ok++;
  }

  if (ok > 0 && !opts.deferQueue) {
    writeFileSync(QUEUE_PATH, JSON.stringify(QUEUE, null, 2) + '\n');
    console.log(`\nWrote queue.json: ${ok} draft(s) added`);
  } else if (ok > 0) {
    console.log(`\n--defer-queue: MDX tertulis, queue di-merge belakangan`);
  }
  console.log(`\nSummary: ${ok} ok, ${fail} fail`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});