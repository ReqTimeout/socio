#!/usr/bin/env node
/**
 * seo/llms.mjs — generate public/llms.txt + public/llms-full.txt untuk AI consumption.
 * Spec LANDING_SEO_SYSTEM.md §5: "llms.txt + llms-full.txt — generate di build (50 artikel + FAQ) untuk AI crawler".
 *
 * Format spec: https://llmstxt.org
 *  - llms.txt: ringkas + link ke llms-full.txt
 *  - llms-full.txt: full content (title, description, faq, internal links) — untuk AI ingest
 *
 * Token: 0 AI. Pure data dari MDX frontmatter + sitemap.
 * Usage: node seo/llms.mjs
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = '/Users/maabook/Desktop/socio.id';
const SITE = 'https://socio.id';
const BLOG_DIR = `${ROOT}/landing/src/content/blog`;
const PUBLIC_DIR = `${ROOT}/landing/public`;

// ===== Helpers =====
function readFrontmatter(content) {
  // MDX frontmatter: ---\nkey: value\n--- body
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return null;
  const fmText = match[1];
  const body = match[2];
  // Simple YAML parser untuk tipe dasar
  const fm = {};
  const lines = fmText.split('\n');
  let currentArray = null;
  let currentObj = null;
  let arrayKey = null;
  let objKey = null;
  let inMultiline = null;
  let multilineBuffer = [];
  for (const line of lines) {
    if (inMultiline) {
      if (line.match(/^\s{2,}/) || line.trim() === '') {
        multilineBuffer.push(line.replace(/^\s{2}/, ''));
        continue;
      } else {
        if (inMultiline === 'faq-a') currentObj.a = multilineBuffer.join('\n').trim();
        else if (inMultiline === 'faq-q') currentObj.q = multilineBuffer.join('\n').trim();
        else currentArray.push(multilineBuffer.join('\n').trim());
        inMultiline = null;
        multilineBuffer = [];
      }
    }
    const arrayMatch = line.match(/^(\w+):\s*$/);
    if (arrayMatch && !line.includes(': ')) {
      currentArray = [];
      fm[arrayMatch[1]] = currentArray;
      arrayKey = arrayMatch[1];
      currentObj = null;
      objKey = null;
      continue;
    }
    const objItemMatch = line.match(/^\s+- (q|a):\s*"?(.*?)"?\s*$/);
    if (objItemMatch && currentArray) {
      let v = objItemMatch[2];
      if (typeof v === 'string' && v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
      currentObj = { [objItemMatch[1]]: v };
      currentArray.push(currentObj);
      objKey = objItemMatch[1];
      continue;
    }
    const objValMatch = line.match(/^\s+(\w+):\s*"?(.+?)"?\s*$/);
    if (objValMatch && currentObj) {
      const key = objValMatch[1];
      let val = objValMatch[2];
      if (typeof val === 'string' && val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      currentObj[key] = val;
      continue;
    }
    const objValMultiline = line.match(/^\s+(\w+):\s*\|\s*$/);
    if (objValMultiline && currentObj) {
      inMultiline = objValMultiline[1];
      multilineBuffer = [];
      continue;
    }
    const arrayMultiline = line.match(/^(\w+):\s*\|\s*$/);
    if (arrayMultiline && currentArray) {
      inMultiline = 'array';
      multilineBuffer = [];
      continue;
    }
    const kvMatch = line.match(/^(\w+):\s*"?(.+?)"?\s*$/);
    if (kvMatch) {
      const key = kvMatch[1];
      let val = kvMatch[2];
      if (val === 'true' || val === 'false') val = val === 'true';
      if (typeof val === 'string' && val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      fm[key] = val;
      currentArray = null;
      currentObj = null;
    }
  }
  // Strip inline MDX (##, **, dll) untuk AI ingestion
  const strippedBody = body
    .replace(/<[^>]+>/g, '') // strip JSX/HTML
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // strip MDX link → text
    .replace(/[*_`~]+/g, '') // strip formatting chars
    .replace(/^#+\s*/gm, '') // strip heading prefix
    .trim();
  return { fm, body: strippedBody };
}

function escapeMd(s) {
  if (!s) return '';
  return s.replace(/[<>]/g, '');
}

function readSitemapUrls() {
  const sitemap = `${ROOT}/landing/dist/sitemap-0.xml`;
  if (!existsSync(sitemap)) return [];
  const xml = readFileSync(sitemap, 'utf8');
  const urls = [];
  const matches = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)];
  for (const m of matches) urls.push(m[1]);
  return urls;
}

// ===== Build =====
const articles = [];
if (existsSync(BLOG_DIR)) {
  const files = readdirSync(BLOG_DIR).filter((f) => f.endsWith('.mdx'));
  for (const f of files) {
    const raw = readFileSync(join(BLOG_DIR, f), 'utf8');
    const parsed = readFrontmatter(raw);
    if (!parsed || parsed.fm.draft) continue; // skip draft
    articles.push({
      slug: f.replace(/\.mdx$/, ''),
      title: parsed.fm.title || f,
      description: parsed.fm.description || '',
      category: parsed.fm.category || 'Lainnya',
      pubDate: parsed.fm.pubDate,
      faq: Array.isArray(parsed.fm.faq) ? parsed.fm.faq : [],
      body: parsed.body,
    });
  }
}

articles.sort((a, b) => new Date(b.pubDate).valueOf() - new Date(a.pubDate).valueOf());
const sitemapUrls = readSitemapUrls();

console.log(`articles: ${articles.length} published`);
console.log(`sitemap URLs: ${sitemapUrls.length}`);

// ===== Generate llms.txt (ringkas) =====
const llmsTxt = `# Socio.id

> Panel SMM reseller termurah dan tercepat di Indonesia. 8.270 layanan Instagram, TikTok, YouTube, Telegram, Spotify & SEO. Daftar reseller Rp50.000 include saldo Rp20.000 + harga reseller lebih murah di semua layanan.

## Money pages (10 — commercial intent)
${sitemapUrls
  .filter((u) => u.match(/\/(beli|smm-panel)-/) || u.match(/\/(layanan|reseller)/))
  .map((u) => `- [${u.replace(SITE, '')}](${u})`)
  .join('\n')}

## Blog (${articles.length} articles — informational)
${articles
  .map((a) => `- [${a.title}](${SITE}/blog/${a.slug}): ${a.description}`)
  .join('\n')}

## Optional
- [Sitemap](${SITE}/sitemap-index.xml)
- [Daftar reseller →](https://app.socio.id/daftar?mode=reseller)

Full content (titles + FAQ + body) → [llms-full.txt](${SITE}/llms-full.txt)
`;

writeFileSync(`${PUBLIC_DIR}/llms.txt`, llmsTxt);
console.log(`Wrote public/llms.txt (${llmsTxt.length} bytes)`);

// ===== Generate llms-full.txt (per-article content) =====
const sections = [];
sections.push(`# Socio.id — Full Content for LLM ingestion
# Generated: ${new Date().toISOString().slice(0, 10)}
# Articles: ${articles.length}
# Sitemap URLs: ${sitemapUrls.length}
#
# Format: # <slug> → metadata + FAQ + body. Plain markdown, no JSX.
# Aturan pakai: konsumsi untuk knowledge base, RAG, AI Overview. Hindari fabricate number di luar data yang ada.

`);

// Money pages (ringkas — bukan full body)
sections.push(`## Money Pages (commercial — 10 high-intent URLs)
${sitemapUrls
  .filter((u) => u.match(/\/(beli|smm-panel)-/) || u.match(/\/(layanan|reseller)/))
  .map((u) => `- ${u}`)
  .join('\n')}

`);

// Articles — full
sections.push(`## Articles (${articles.length})\n`);
for (const a of articles) {
  sections.push(`### ${a.title}
URL: ${SITE}/blog/${a.slug}
Category: ${a.category}
Published: ${new Date(a.pubDate).toISOString().slice(0, 10)}
Description: ${escapeMd(a.description)}

FAQ:
${a.faq.map((f, i) => `  ${i + 1}. ${escapeMd(f.q)}\n     → ${escapeMd(f.a)}`).join('\n')}

Body:
${escapeMd(a.body).slice(0, 3000)}
${a.body.length > 3000 ? '\n[... truncated, full article at ' + SITE + '/blog/' + a.slug + ']' : ''}

---
`);
}

const llmsFullTxt = sections.join('\n');
writeFileSync(`${PUBLIC_DIR}/llms-full.txt`, llmsFullTxt);
console.log(`Wrote public/llms-full.txt (${llmsFullTxt.length} bytes)`);