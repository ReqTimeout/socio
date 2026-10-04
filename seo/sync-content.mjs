#!/usr/bin/env node
/**
 * seo/sync-content.mjs — salin MDX dari repo konten (SEO_CONTENT_DIR) ke
 * content collection landing, sebelum `astro build`.
 *
 * Kenapa tidak pakai `base:` env langsung di content.config.ts:
 * glob loader Astro + path di luar project root = Vite fs.allow pain + urine
 * di Production build. Copy lebih lambat (0,1 detik untuk 62 file) tapi
 * bebas masalah.
 *
 * Prinsip: NO-OP kalau env tidak di-set / path tidak ada. Jadi build lokal dan
 * CI tanpa env sama persis dengan sebelumnya — nol risiko.
 *
 * Env:
 *   SEO_CONTENT_DIR  path ke folder berisi *.mdx (isi repo socio-seo-content-id/blog).
 *                    Kosong / tidak ada → script keluar 0 tanpa mengubah apa pun.
 *   SEO_CONTENT_MIRROR  '1' untuk JADIKAN sumber benar-benar mirror — hapus MDX di
 *                    tujuan yang tidak ada di sumber. Default 0 (aman: tidak
 *                    menghapus file lokal). Kode: process.env.SEO_CONTENT_MIRROR === '1'.
 *
 * Usage: node seo/sync-content.mjs [--dry-run]
 */

import { existsSync, readdirSync, readFileSync, writeFileSync, unlinkSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const TARGET = join(ROOT, 'landing/src/content/blog');

const dryRun = process.argv.includes('--dry-run');
const mirror = process.env.SEO_CONTENT_MIRROR === '1';
const SRC = process.env.SEO_CONTENT_DIR ? resolve(process.env.SEO_CONTENT_DIR) : '';

function log(s) {
  console.log(`[sync-content] ${s}`);
}

function main() {
  if (!SRC) {
    log('SEO_CONTENT_DIR tidak di-set — lewati (pakai content lokal).');
    return 0;
  }
  if (!existsSync(SRC)) {
    log(`WARN: SEO_CONTENT_DIR tidak ada: ${SRC} — lewati (pakai content lokal).`);
    return 0;
  }
  if (!existsSync(TARGET)) {
    mkdirSync(TARGET, { recursive: true });
    log(`dibuat ${TARGET}`);
  }

  const srcFiles = readdirSync(SRC).filter((f) => f.endsWith('.mdx'));
  if (!srcFiles.length) {
    log(`WARN: tidak ada .mdx di ${SRC} — lewati (JANGAN kosongkan blog).`);
    return 0;
  }

  let added = 0;
  let updated = 0;
  let same = 0;
  for (const f of srcFiles) {
    const src = join(SRC, f);
    const dst = join(TARGET, f);
    const incoming = readFileSync(src, 'utf8');
    if (!existsSync(dst)) {
      if (!dryRun) writeFileSync(dst, incoming);
      added++;
      log(`+ ${f}`);
    } else if (readFileSync(dst, 'utf8') !== incoming) {
      if (!dryRun) writeFileSync(dst, incoming);
      updated++;
      log(`~ ${f}`);
    } else {
      same++;
    }
  }

  let removed = 0;
  if (mirror) {
    for (const f of readdirSync(TARGET)) {
      if (f.endsWith('.mdx') && !srcFiles.includes(f)) {
        if (!dryRun) unlinkSync(join(TARGET, f));
        removed++;
        log(`- ${f}`);
      }
    }
  }

  const draftCount = srcFiles.filter((f) => /^\s*draft:\s*true\s*$/m.test(readFileSync(join(SRC, f), 'utf8'))).length;
  log(
    `selesai: ${added} baru · ${updated} berubah · ${same} sama · ${removed} dihapus` +
      ` (total sumber ${srcFiles.length} file, draft ${draftCount} → tidak ikut build) · mirror=${mirror}` +
      (dryRun ? ' [DRY-RUN, tidak ada file ditulis]' : ''),
  );
  return 0;
}

try {
  process.exitCode = main();
} catch (e) {
  console.error(`[sync-content] FATAL: ${e.message}`);
  process.exitCode = 1;
}
