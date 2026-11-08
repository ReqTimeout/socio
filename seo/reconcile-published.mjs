#!/usr/bin/env node
/**
 * seo/reconcile-published.mjs — sinkronkan `state.published[]` dengan korpus nyata.
 *
 * MASALAH YANG DIPERBAIKI:
 *   Jalur publish produksi (`publish-git.mjs`) menandai artikel published di
 *   `queue.json` tapi TIDAK PERNAH menambah entri ke `state.published[]`.
 *   Akibatnya artikel baru tidak pernah masuk GSC URL Inspection, ramp-gate,
 *   atau remedy — dan `state.published` tertinggal jauh di belakang korpus
 *   (terukur 8 Nov 2026: 340 entri vs 1.006 artikel live).
 *   Gejalanya: `gsc-inspect: tidak ada URL baru untuk dicek` + ramp-gate
 *   "discovery gap 100%" → `daily_count` beku, index_rate tak pernah terukur.
 *
 * SKRIP INI ADALAH REKONSILIASI ADITIF:
 *   - Menambah entri yang hilang (artikel live di korpus tapi tak ada di state).
 *   - Backfill field yang KOSONG pada entri lama: `firstSeen` (dari pubDate MDX)
 *     dan `indexed` (default 'unknown'). Entri warisan yang tak punya
 *     `firstSeen` mustahil dilihat `gsc-inspect` (filter window) — tanpa
 *     backfill, artikel itu tak akan pernah di-inspect sama sekali.
 *   - TIDAK PERNAH menghapus entri, TIDAK PERHAMPIR `indexed`/`lastChecked`
 *     entri yang sudah ada, TIDAK menyentuh `indexnow.submitted`,
 *     `bing.submitted`, `gsc`, atau `rampGate`.
 *   - Idempoten: dijalankan dua kali → hasil sama (tidak ada duplikat).
 *
 * `firstSeen` diambil dari `pubDate` frontmatter MDX (fallback: hari ini) —
 * itu yang dipakai `gsc-inspect` untuk memilih window inspeksi.
 *
 * Usage:
 *   node seo/reconcile-published.mjs           # rekonsiliasi + tulis state
 *   node seo/reconcile-published.mjs --dry     # preview, tidak menulis
 *
 * Env: SEO_SITE (default https://socio.id)
 * Exit: 0 = selesai (0 entri baru juga sukses — itu kondisi normal).
 */

import {
  existsSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  renameSync,
} from "node:fs";
import { join } from "node:path";
import { BLOG_DIR, QUEUE_PATH, STATE_PATH } from "./paths.mjs";

const SITE = process.env.SEO_SITE || "https://socio.id";
const DRY = process.argv.includes("--dry");

const readJson = (p, fallback) => {
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return fallback;
  }
};

/** Tulis atomik supaya state.json tidak korup kalau proses mati di tengah. */
function saveState(state) {
  const tmp = `${STATE_PATH}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(state, null, 2)}\n`);
  renameSync(tmp, STATE_PATH);
}

/** Ambil `pubDate` dari frontmatter MDX → "YYYY-MM-DD". */
function pubDateOf(raw) {
  const fm = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) return null;
  const m = fm[1].match(/^pubDate:\s*"?([0-9]{4}-[0-9]{2}-[0-9]{2})/m);
  return m ? m[1] : null;
}

function isDraft(raw) {
  const fm = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) return false;
  return /^\s*draft:\s*true\s*$/im.test(fm[1]);
}

function main() {
  const state = readJson(STATE_PATH, null);
  if (!state) {
    console.error(
      `reconcile-published: state.json tidak bisa dibaca (${STATE_PATH})`,
    );
    return 1;
  }
  const existing = Array.isArray(state.published) ? state.published : [];
  const known = new Set(existing.map((p) => p?.url).filter(Boolean));

  // ── Korpus nyata: MDX live (draft:false) di BLOG_DIR ──────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const corpus = new Map(); // url → { slug, url, firstSeen }
  let draftCount = 0;
  if (existsSync(BLOG_DIR)) {
    for (const f of readdirSync(BLOG_DIR).filter((x) => x.endsWith(".mdx"))) {
      let raw;
      try {
        raw = readFileSync(join(BLOG_DIR, f), "utf8");
      } catch {
        continue;
      }
      if (isDraft(raw)) {
        draftCount++;
        continue;
      }
      const slug = f.replace(/\.mdx$/, "");
      const url = `${SITE}/blog/${slug}/`;
      corpus.set(url, { slug, url, firstSeen: pubDateOf(raw) || today });
    }
  }

  // ── Queue published tapi MDX-nya hilang → catat, jangan masuk state ───────
  const queue = readJson(QUEUE_PATH, { items: [] });
  const items = Array.isArray(queue) ? queue : queue.items || [];
  let queuePublished = 0;
  let queueWithoutMdx = 0;
  for (const it of items) {
    if (it?.status !== "published") continue;
    queuePublished++;
    const url = `${SITE}/blog/${it.slug}/`;
    if (!corpus.has(url)) queueWithoutMdx++;
  }

  const missing = [...corpus.values()].filter((c) => !known.has(c.url));
  // Urut berdasarkan firstSeen agar state.published chronological.
  missing.sort((a, b) =>
    a.firstSeen < b.firstSeen ? -1 : a.firstSeen > b.firstSeen ? 1 : 0,
  );

  // ── Backfill field kosong pada entri warisan ────────────────────────────
  // Entri lama (dari bootstrap/migrasi sebelumnya) boleh jadi tanpa `firstSeen`
  // → `gsc-inspect` tak pernah melihatnya (filter `daysAgo(firstSeen)`).
  // Backfill HANYA field yang kosong; nilai yang sudah ada tak disentuh.
  let backfilledSeen = 0;
  let backfilledIndexed = 0;
  for (const entry of existing) {
    const c = entry?.url ? corpus.get(entry.url) : null;
    if (c && !entry.firstSeen) {
      entry.firstSeen = c.firstSeen;
      backfilledSeen++;
    }
    if (entry && !entry.indexed) {
      entry.indexed = "unknown";
      backfilledIndexed++;
    }
  }

  console.log(
    `reconcile-published — korpus live ${corpus.size} (draft ${draftCount}) · ` +
      `queue published ${queuePublished} (MDX hilang ${queueWithoutMdx}) · ` +
      `state.published ${existing.length}`,
  );
  if (backfilledSeen || backfilledIndexed) {
    console.log(
      `  backfill field kosong: firstSeen ${backfilledSeen} · indexed ${backfilledIndexed}`,
    );
  }

  if (!missing.length) {
    if (!backfilledSeen && !backfilledIndexed) {
      console.log("  entri sudah selaras — tidak ada yang perlu ditambah.");
      return 0;
    }
    if (DRY) {
      console.log("\n--dry: state.json tidak ditulis.");
      return 0;
    }
    state.published = existing;
    saveState(state);
    console.log(
      `  ✓ state.published = ${existing.length} entri (backfill saja).`,
    );
    return 0;
  }

  console.log(`  entri baru untuk ditambahkan: ${missing.length}`);
  for (const m of missing.slice(0, 10))
    console.log(`    + ${m.url} (firstSeen ${m.firstSeen})`);
  if (missing.length > 10) console.log(`    … +${missing.length - 10} lagi`);

  if (DRY) {
    console.log("\n--dry: state.json tidak ditulis.");
    return 0;
  }

  const added = missing.map((m) => ({
    slug: m.slug,
    url: m.url,
    firstSeen: m.firstSeen,
    indexed: "unknown",
    lastChecked: null,
  }));
  const merged = [...existing, ...added];
  merged.sort((a, b) => {
    const x = String(a?.firstSeen || "");
    const y = String(b?.firstSeen || "");
    return x < y ? -1 : x > y ? 1 : 0;
  });
  state.published = merged;
  saveState(state);
  console.log(
    `  ✓ state.published = ${merged.length} entri (${added.length} baru).`,
  );
  return 0;
}

process.exit(main());
