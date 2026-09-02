#!/usr/bin/env node
/**
 * seo/publish.mjs — promote draft → build → deploy → IndexNow ping (spec §4).
 *
 * Langkah:
 *   1. Ambil draft terbaik (priority DESC, lama duduk ASC) dari queue status='draft'
 *      yang file MDX-nya ada + draft:true
 *   2. Flip frontmatter draft:false, set pubDate=now
 *   3. pnpm --filter landing build
 *   4. wrangler pages deploy landing/dist (env CLOUDFLARE_API_TOKEN + ACCOUNT_ID)
 *   5. indexnow.mjs ping URL baru + update state.json
 *
 * Usage:
 *   node seo/publish.mjs --count=1
 *   node seo/publish.mjs --count=1 --no-deploy   # flip + build saja (review manual)
 *   node seo/publish.mjs --slug=apa-itu-smm-panel # publish spesifik
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execSync, spawn } from 'node:child_process';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const QUEUE_PATH = `${ROOT}/seo/queue.json`;
const BLOG_DIR = `${ROOT}/landing/src/content/blog`;
const SITE = 'https://socio.id';

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { count: 1, noDeploy: false, slug: null };
  for (const a of args) {
    if (a.startsWith('--count=')) opts.count = parseInt(a.slice(10));
    else if (a === '--no-deploy') opts.noDeploy = true;
    else if (a.startsWith('--slug=')) opts.slug = a.slice(7);
  }
  return opts;
}

function pickDrafts(queue, count, slug) {
  const drafts = queue.items.filter((i) => {
    if (i.status !== 'draft') return false;
    if (slug) return i.slug === slug;
    return existsSync(`${BLOG_DIR}/${i.slug}.mdx`);
  });
  if (slug) return drafts;
  return drafts
    .sort((a, b) => (b.priority || 0) - (a.priority || 0) || (a.notes || '').localeCompare(b.notes || ''))
    .slice(0, count);
}

function flipDraft(path) {
  const src = readFileSync(path, 'utf8');
  const today = new Date().toISOString().slice(0, 10);
  const flipped = src
    .replace(/^draft:\s*true\s*$/m, 'draft: false')
    .replace(/^pubDate:\s*\d{4}-\d{2}-\d{2}\s*$/m, `pubDate: ${today}`);
  if (flipped === src) throw new Error('frontmatter tidak berubah — draft:true tidak ditemukan?');
  writeFileSync(path, flipped);
  return today;
}

function run(cmd, opts = {}) {
  console.log(`  $ ${cmd}`);
  return execSync(cmd, { stdio: 'inherit', cwd: ROOT, ...opts });
}

async function main() {
  const opts = parseArgs();
  const queue = JSON.parse(readFileSync(QUEUE_PATH, 'utf8'));

  const targets = pickDrafts(queue, opts.count, opts.slug);
  if (!targets.length) {
    console.log('Tidak ada draft siap publish (queue status=draft + file MDX ada).');
    console.log('Generate dulu: node seo/generate.mjs --count=2');
    process.exit(1);
  }

  const publishedUrls = [];
  for (const t of targets) {
    const path = `${BLOG_DIR}/${t.slug}.mdx`;
    console.log(`\n--- publish ${t.slug} ---`);
    const today = flipDraft(path);
    t.status = 'published';
    t.notes = (t.notes || '').replace(/\s*\|\s*generated[^\n]*/, '').trim();
    t.notes = (t.notes ? t.notes + ' | ' : '') + `published ${today}`;
    publishedUrls.push(`${SITE}/blog/${t.slug}/`);
    console.log(`  draft:false, pubDate:${today}`);
  }

  writeFileSync(QUEUE_PATH, JSON.stringify(queue, null, 2) + '\n');

  // Build
  console.log('\n=== build landing ===');
  run('pnpm --filter landing build');

  if (opts.noDeploy) {
    console.log('\n--no-deploy: build selesai, deploy manual:');
    console.log('  export CLOUDFLARE_API_TOKEN=…; export CLOUDFLARE_ACCOUNT_ID=0298214d1069f75436f490b51ea4763e');
    console.log('  npx wrangler pages deploy landing/dist --project-name socio-id --branch main --commit-dirty=true');
    console.log(`  node seo/indexnow.mjs ${publishedUrls.join(' ')}`);
    return;
  }

  // Deploy (butuh env CF — dari accountcf.md, JANGAN hardcode)
  if (!process.env.CLOUDFLARE_API_TOKEN || !process.env.CLOUDFLARE_ACCOUNT_ID) {
    console.error('\nFATAL: CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID belum di-set (lihat accountcf.md).');
    console.error('Draft sudah di-flip + queue updated. Deploy manual lalu ping:');
    console.error(`  node seo/indexnow.mjs ${publishedUrls.join(' ')}`);
    process.exit(1);
  }
  console.log('\n=== deploy ===');
  run('npx wrangler pages deploy landing/dist --project-name socio-id --branch main --commit-dirty=true');

  // IndexNow
  console.log('\n=== indexnow ===');
  const child = spawn('node', [`${ROOT}/seo/indexnow.mjs`, ...publishedUrls], {
    stdio: 'inherit',
    cwd: ROOT,
  });
  child.on('close', (code) => {
    console.log(`\nDone: ${publishedUrls.length} artikel live:`);
    for (const u of publishedUrls) console.log(`  ${u}`);
    process.exit(code || 0);
  });
}

main().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
