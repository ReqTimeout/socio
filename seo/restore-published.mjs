#!/usr/bin/env node
/**
 * seo/restore-published.mjs — pulihkan status draft:false dari state.json.
 *
 * MASALAH YANG DISELESAIKAN (5 Okt 2026)
 * `publish.mjs` mengubah `draft: true` → `draft: false` pada file MDX di
 * filesystem container. Tapi file itu ikut ke dalam IMAGE, bukan ke volume.
 * Setiap kali container di-rebuild (image baru, Coolify recreate, server restart),
 * filesystem kembali ke isi image — dan semua artikel yang sudah terbit
 * MULAI LAGI jadi draft.
 *
 * Bukti: 10 artikel published 17:45, lalu image di-rebuild 3x, dan pukul 17:57
 *tinggal 7 yang published. Itu sinkron 1%/hari jadi tidak mungkin.
 *
 * SOLUSI
 * `state.json` (yang berisi daftar `published[]`) ADA di volume persisten.
 * Jadi setiap container start: baca state.json → pastikan slug di dalamnya punya
 * `draft: false`. Idempoten, cepat (mx. hundreds file), tidak memanggil jaringan.
 *
 * Dijalankan dari CMD sebelum `idle.mjs`, jadi selalu sinkron dengan image apa pun.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { BLOG_DIR, STATE_PATH, QUEUE_PATH } from './paths.mjs';

function main() {
  let state;
  try {
    state = JSON.parse(readFileSync(STATE_PATH, 'utf8'));
  } catch {
    console.log('[restore-published] state.json belum ada — lewati');
    return 0;
  }

  const published = state.published || [];
  if (!published.length) {
    console.log('[restore-published] tidak ada daftar published — lewati');
    return 0;
  }

  // slug diambil dari URL agar tidak bergantung field lain di state.json
  const slugs = new Set();
  for (const p of published) {
    const s = String(p.slug || '').trim();
    if (s) {
      slugs.add(s);
      continue;
    }
    const m = /\/blog\/([a-z0-9-]+)\/?$/.exec(String(p.url || ''));
    if (m) slugs.add(m[1]);
  }

  // QUEUE juga|authoritatif. `publish.mjs` mencatat status publish di
  // `queue.json` (t.status = 'published'), BUKAN di `state.published[]` —
  // array itu cuma baseline dari bootstrap dan tidak pernah di-append.
  //
  // Dulu restore hanya percaya `state.published`, sehingga setiap artikel yang
  // terbit SESUDAH bootstrap (mis. `cara-kerja-smm-panel`) tidak ada di daftar
  // dan di-flip balik jadi `draft:true` pada rebuild berikutnya — artikel
  // yang tayang diam-diam hilang dari situs.
  //
  // `queue.json` sekarang persisten di volume (SEO_QUEUE_PATH), jadi union
  // ini aman dan menutup celah itu.
  let queueAdded = 0;
  try {
    const queue = JSON.parse(readFileSync(QUEUE_PATH, 'utf8'));
    for (const it of queue.items || []) {
      if (it && it.status === 'published' && it.slug && !slugs.has(it.slug)) {
        slugs.add(it.slug);
        queueAdded++;
      }
    }
    if (queueAdded) {
      console.log(`[restore-published] +${queueAdded} slug diambil dari queue (tidak ada di state.published)`);
    }
  } catch {
    // queue tidak ada / rusak — andalkan state.published saja
  }
  if (!slugs.size) {
    console.log('[restore-published] tidak ada slug bisa dibaca — lewati');
    return 0;
  }

  let fixed = 0;
  let missing = 0;
  for (const slug of slugs) {
    const f = join(BLOG_DIR, `${slug}.mdx`);
    if (!existsSync(f)) {
      missing++;
      continue;
    }
    const src = readFileSync(f, 'utf8');
    if (/^draft:\s*false\s*$/m.test(src)) continue; // sudah benar
    if (!/^draft:\s*true\s*$/m.test(src)) continue; // format lain, jangan diubah
    writeFileSync(f, src.replace(/^draft:\s*true\s*$/m, 'draft: false'));
    fixed++;
  }

  // bonus: bersihkan flag draft:false yang TIDAK ada di state.json (publish
  // dibatalkan / state di-reset). Tanpa ini, artikel tetap live padahal sudah
  // dibatalkan dari sisi runner.
  let reverted = 0;
  try {
    for (const f of readdirSync(BLOG_DIR)) {
      if (!f.endsWith('.mdx')) continue;
      const slug = f.replace(/\.mdx$/, '');
      if (slugs.has(slug)) continue;
      const p = join(BLOG_DIR, f);
      const src = readFileSync(p, 'utf8');
      if (/^draft:\s*false\s*$/m.test(src)) {
        writeFileSync(p, src.replace(/^draft:\s*false\s*$/m, 'draft: true'));
        reverted++;
      }
    }
  } catch {
    /* tidak wajib */
  }

  console.log(
    `[restore-published] published=${slugs.size} dipulihkan=${fixed} dikembalikan ke draft=${reverted} file-hilang=${missing}`,
  );
  return 0;
}

process.exitCode = main();
