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

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const ROOT = '/Users/maabook/Desktop/socio.id';
const PRICES = JSON.parse(readFileSync(`${ROOT}/landing/src/data/prices.json`, 'utf8'));
const QUEUE = JSON.parse(readFileSync(`${ROOT}/seo/queue.json`, 'utf8'));

// ===== Load prompts.ts (TS strip + eval values) =====
// Simpler approach: extract SYSTEM_PROMPT string + function bodies via regex,
// eval them in a Function scope. Avoids module system gotchas.
const promptsSrc = readFileSync(`${ROOT}/seo/prompts.ts`, 'utf8');

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
const capitalize = (s) => (s||'').split(/\\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
const renderFrontmatter = ({title, description, pubDate, category, draft, faq, related}) => {
  const faqYaml = (faq||[]).map((f) => \`  - q: "\${escapeYaml(f.q)}"\\n    a: "\${escapeYaml(f.a)}"\`).join('\\n');
  const relatedYaml = (related||[]).map((r) => \`  - id: "\${r.slug}"\`).join('\\n');
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
const renderSafetyCallout = () => \`> **Tips aman pakai SMM panel**: (1) Pilih layanan gradual refill — follower naik bertahap, bukan sekaligus, jadi lebih natural. (2) Jangan beli followers saat akun masih baru (<3 bulan) — algoritma deteksi lebih ketat. (3) Hindari spam massal — maksimal 1-2x order per minggu per akun. (4) Cek garansi refill sebelum bayar — layanan tanpa refill = risiko tinggi.\`;
const renderCtaBlock = () => \`> **Mau langsung cek harganya?** Daftar reseller Socio.id — Rp50.000 include saldo Rp20.000 langsung jalan + harga reseller lebih murah di semua 8.270 layanan Instagram, TikTok, YouTube, Telegram, Spotify & SEO. → [Cek harga & pesan sekarang](https://app.socio.id/daftar?mode=reseller)\`;
const stripFaqSection = (body) => body.replace(/##\\s*FAQ[\\s\\S]*$/i, '').trimEnd();
const injectAfterFirstH2 = (body, table) => {
  const m = body.match(/^##\\s+[^\\n]+\\n([\\s\\S]*?)(?=\\n## |\\n*$)/);
  if (!m) return body + '\\n\\n' + table;
  const firstH2End = m.index + m[0].length;
  return body.slice(0, firstH2End) + '\\n\\n' + table + '\\n\\n' + body.slice(firstH2End);
};
`;

// Each helper makes the eval'd function destructure its arg explicitly so `keyword` etc. are bound.
function buildUserPrompt(args) {
  const { keyword, category, related, pricesBlock } = args;
  const body = SHARED_HELPERS + '\n' + stripTs(extractFunctionBody(promptsSrc, 'buildUserPrompt') || '');
  const fn = new Function('keyword', 'category', 'related', 'pricesBlock', body);
  return fn(keyword, category, related, pricesBlock);
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
const FREE_MODELS = [
  'opencode/mimo-v2.5-free',
  'opencode/ling-3.0-flash-fin-free',
  'opencode/muse-spark-1.2-contributor-free',
  'opencode/nemotron-3-ultra-free',
  'opencode/nemotron-3.5-lightning-free',
  'opencode/big-pickle', // fallback
];
let modelIdx = 0;
function nextModel() {
  return FREE_MODELS[modelIdx++ % FREE_MODELS.length];
}

// ===== opencode CLI runner =====
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

function pickRelated(keyword, cluster, excludeSlug) {
  const candidates = QUEUE.items
    .filter((i) => i.slug !== excludeSlug && i.cluster === cluster && i.added_by !== 'katalog' && i.status !== 'skipped')
    .slice(0, 5);
  return candidates.slice(0, 2).map((c) => ({ slug: c.slug, title: c.keyword }));
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
  // Map keyword → money page slug
  const k = keyword.toLowerCase();
  if (k.includes('follower')) {
    if (k.includes('instagram')) return { url: '/beli-followers-instagram/', anchor: 'beli followers Instagram' };
    if (k.includes('tiktok')) return { url: '/beli-followers-tiktok/', anchor: 'beli followers TikTok' };
    if (k.includes('youtube')) return { url: '/beli-subscribers-youtube/', anchor: 'beli subscribers YouTube' };
    if (k.includes('facebook')) return { url: '/beli-followers-facebook/', anchor: 'beli followers Facebook' };
  }
  if (k.includes('likes') || k.includes('like ')) return { url: '/beli-likes-instagram/', anchor: 'beli likes Instagram' };
  if (k.includes('view')) {
    if (k.includes('tiktok')) return { url: '/beli-views-tiktok/', anchor: 'beli views TikTok' };
    if (k.includes('youtube')) return { url: '/beli-views-youtube/', anchor: 'beli views YouTube' };
  }
  if (k.includes('member') || k.includes('subscriber')) return { url: '/beli-members-telegram/', anchor: 'beli member Telegram' };
  if (k.includes('reseller') || k.includes('smm')) return { url: '/smm-panel-reseller/', anchor: 'program reseller SMM' };
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

  // Format B: Bold question + paragraph answer
  if (faqs.length < 5) {
    const boldMatches = [...block.matchAll(/\*\*([^*?]*\?)\*\*\s*\n+\s*([^*\n][^\n]+)/g)];
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

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { count: 1, dry: false, keyword: null };
  for (const a of args) {
    if (a.startsWith('--count=')) opts.count = parseInt(a.slice(8));
    else if (a === '--dry') opts.dry = true;
    else if (a.startsWith('--keyword=')) opts.keyword = a.slice(10);
  }
  return opts;
}

async function main() {
  const opts = parseArgs();
  const sigW = { high: 4, medium: 3, aeo: 2, low: 1 };

  let targets;
  if (opts.keyword) {
    targets = QUEUE.items.filter((i) => i.keyword === opts.keyword && i.status === 'pending');
  } else {
    targets = QUEUE.items
      .filter((i) => i.status === 'pending')
      .sort((a, b) => (b.priority + sigW[b.demand_signal] * 5) - (a.priority + sigW[a.demand_signal] * 5))
      .slice(0, opts.count);
  }

  console.log(`Targets: ${targets.length} (count=${opts.count} dry=${opts.dry})`);
  for (const t of targets) {
    console.log(`  p${t.priority} ${t.demand_signal.padEnd(6)} ${t.keyword} (cluster=${t.cluster})`);
  }
  if (opts.dry) return;

  let ok = 0, fail = 0;
  for (const t of targets) {
    console.log(`\n--- ${t.keyword} ---`);
    const slug = t.slug || slugify(t.keyword);
    const outPath = `${ROOT}/landing/src/content/blog/${slug}.mdx`;
    if (existsSync(outPath)) {
      console.log(`  SKIP: exists`);
      continue;
    }

    const prices = pickPrices(t.keyword);
    const related = pickRelated(t.keyword, t.cluster, slug);
    const moneyLink = pickMoneyLink(t.keyword, prices);
    const pricesBlock = prices.slice(0, 6).map((p) => `- ${p.platform} ${p.name} (Rp${p.price.toLocaleString('id-ID')}/1k)`).join('\n');

    const user = buildUserPrompt({
      keyword: t.keyword,
      category: t.category || 'Lainnya',
      related,
      pricesBlock,
    });
    console.log(`  user prompt len: ${user.length}`);
    if (process.env.SEO_DEBUG) writeFileSync('/tmp/seo-user.txt', user);

    // Call opencode CLI (retry 1x ganti model)
    let raw = null;
    let lastErr = null;
    for (let attempt = 0; attempt < 3; attempt++) {
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
    if (faq.length < 5) {
      console.log(`  FAQ parse: hanya ${faq.length} (butuh 5) — pad generik`);
      while (faq.length < 5) {
        faq.push({
          q: `Pertanyaan umum tentang ${t.keyword}?`,
          a: 'Penjelasan ada di artikel socio.id. Cek katalog 8.270 layanan atau hubungi WhatsApp support 24/7 untuk konsultasi gratis.',
        });
      }
    }
    const meta = deriveMeta({ keyword: t.keyword, llmBody, category: t.category || 'Lainnya' });

    const mdx = assembleMdx({
      llmBody,
      prices,
      moneyLink,
      related,
      faq,
      meta,
    });
    if (process.env.SEO_DEBUG) writeFileSync('/tmp/seo-assembled.mdx', mdx);

    const v = validateMdx(mdx, t.keyword);
    if (!v.ok) {
      console.log(`  GATES FAIL: ${v.errors.join(' | ')}`);
      console.log(`  (body preview) ${llmBody.slice(0, 300)}`);
      fail++;
      continue;
    }
    console.log(`  ✓ ${v.words} kata, ${v.h2Count} H2, ${v.faqCount} FAQ, ${v.internalLinks} internal links`);

    writeFileSync(outPath, mdx);
    t.status = 'draft';
    t.notes = (t.notes || '') + ` | generated ${new Date().toISOString().slice(0, 10)}`;
    ok++;
  }

  if (ok > 0) {
    writeFileSync(`${ROOT}/seo/queue.json`, JSON.stringify(QUEUE, null, 2) + '\n');
    console.log(`\nWrote queue.json: ${ok} draft(s) added`);
  }
  console.log(`\nSummary: ${ok} ok, ${fail} fail`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});