#!/usr/bin/env node
/**
 * seo/push-drafts.mjs — A9: commit + push draft MDX lokal ke REPO KONTEN.
 *
 * Aman secara desain:
 * - TIDAK menyimpan/menempel token. Pakai kredensial git user yang sudah ada
 *   (credential helper / SSH). Runner pakai GH_TOKEN sendiri (Fase C).
 * - GUARD anti-salah-repo: remote repo yang menaungi BLOG_DIR WAJIB mengandung
 *   "socio-seo-content". Kalau tidak, exit 1 (mencegah draft tak sengaja ke repo app
 *   yang memicu webhook deploy). Override sadar: --allow-any-repo.
 * - Selalu `git pull --rebase` dulu (aturan §0.3: satu writer per field, hindari conflict).
 *
 * Alur lokal normal: set SEO_CONTENT_DIR=<clone socio-seo-content-id>/blog, jalankan
 * generate, lalu `pnpm seo:push-drafts`.
 *
 * Usage: node seo/push-drafts.mjs [--dry] [--message="..."] [--allow-any-repo]
 */
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

import { BLOG_DIR, QUEUE_PATH } from './paths.mjs';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const allowAny = args.includes('--allow-any-repo');
const msgArg = args.find((a) => a.startsWith('--message='));

function git(argv, cwd) {
  return execFileSync('git', argv, { cwd, encoding: 'utf8' }).trim();
}

if (!existsSync(BLOG_DIR)) {
  console.error(`FATAL: BLOG_DIR tidak ada: ${BLOG_DIR}`);
  console.error('Set SEO_CONTENT_DIR ke clone repo konten, atau kembalikan folder blog default.');
  process.exit(1);
}

const root = git(['rev-parse', '--show-toplevel'], BLOG_DIR);
let remote = '';
try {
  remote = git(['remote', 'get-url', 'origin'], root);
} catch {
  console.error(`FATAL: ${root} bukan repo git dengan remote 'origin'.`);
  process.exit(1);
}
console.log(`Content root: ${root}`);
console.log(`Remote origin: ${remote}`);

if (!allowAny && !/socio-seo-content/.test(remote)) {
  console.error('\nGUARD AKTIF: repo ini BUKAN repo konten socio-seo-content-id.');
  console.error('Mencegah draft ter-push ke repo app (yang bisa memicu deploy).');
  console.error('Arahkan SEO_CONTENT_DIR ke clone repo konten, atau (sadar) tambah --allow-any-repo.');
  process.exit(1);
}

// 1. sinkron dulu (rebase di atas perubahan runner).
try {
  git(['pull', '--rebase'], root);
  console.log('✓ pull --rebase');
} catch (e) {
  console.error('FATAL: pull --rebase gagal (konflik?). Selesaikan manual sebelum push.');
  console.error(String(e.message || e).slice(0, 300));
  process.exit(1);
}

// 2. stage draft + queue.
git(['add', 'blog', 'queue.json'], root);
if (existsSync(QUEUE_PATH)) git(['add', 'queue.json'], root);

// 3. ada perubahan?
const staged = git(['diff', '--cached', '--name-only'], root);
if (!staged) {
  console.log('Tidak ada draft/queue baru untuk di-push. Bersih.');
  process.exit(0);
}
const files = staged.split('\n').filter(Boolean);
const drafts = files.filter((f) => f.startsWith('blog/') && f.endsWith('.mdx')).length;
console.log(`Siap commit ${files.length} file (${drafts} MDX):`);
for (const f of files) console.log('  ' + f);

const message = msgArg
  ? msgArg.slice('--message='.length)
  : `content(seo): ${drafts} draft + queue (${new Date().toISOString().slice(0, 10)})`;

if (dry) {
  console.log(`\n--dry: tidak commit/push. Pesan akan: "${message}"`);
  process.exit(0);
}

git(['commit', '-m', message], root);
console.log('✓ commit');
git(['push', 'origin', 'HEAD'], root);
console.log(`✓ push ke ${remote}`);
