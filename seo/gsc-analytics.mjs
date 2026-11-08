#!/usr/bin/env node
/**
 * seo/gsc-analytics.mjs — LAPISAN QUERY GSC untuk socio.id.
 *
 * `seo/gsc-inspect.mjs` memberi tahu "URL ini index atau tidak". Ia TIDAK
 * memberi tahu untuk query apa kita ranking, pada kedudukan berapa, dan
 * berapa CTR — dan tiga loop utama (ekspansi keyword, revisi title, semak
 * halaman tak terindex) bergantung pada data query itu.
 *
 * Modul ini:
 *   1. Tarik Search Analytics (query → clicks, impressions, position, CTR)
 *      untuk 28 hari lepas + delta window sebelumnya.
 *   2. Simpan snapshot mentah ke `${SEO_REPORT_DIR}/queries-<YYYY-MM-DD>.json`.
 *   3. Jana `${SEO_REPORT_DIR}/SEO-QUERIES.md`:
 *      - kedudukan seed query
 *      - query dengan impression tapi BELUM ada halaman → calon page
 *      - halaman dengan CTR rendah → calon revisi title/meta
 *      - halaman dengan impression tapi tak terindex → semak QC/duplicate
 *
 * PORT dari socio.my (repo/seo/gsc-analytics.mjs) — adaptasi untuk socio.id:
 *   - Pakai helper `searchAnalytics()` milik `seo/lib/gsc.mjs` (bukan fetch
 *     mentah) supaya quirks API (dimensions berulang, startDate query param)
 *     handled di satu tempat.
 *   - Sumber daftar URL: `state.published[]` + sitemap live + money page
 *     kanonik (`seo/lib/money-pages.mjs` bila ada). .my memakai sitemap.mjs;
 *     socio.id tidak punya modul itu.
 *   - OUTPUT ke path UNTRACKED (`SEO_REPORT_DIR`). Di .my laporan ditulis ke
 *     `docs/SEO-QUERIES.md` yang TRACKED → setiap hari tree jadi dirty →
 *     `git pull --rebase` di siklus publish gagal (insiden 3-8 Nov 2026).
 *     Di runner repo socio.id commit publish terjadi tiap siklus, jadi laporan
 *     tidak boleh menyentuh path tracked.
 *
 * Kredensial: GSC_SERVICE_ACCOUNT_JSON_B64 (atau GSC_SA_FILE) — scope
 * `webmasters` yang sudah ada sudah cukup untuk searchanalytics.query.
 *
 * Usage:
 *   node seo/gsc-analytics.mjs            # tarik + tulis report
 *   node seo/gsc-analytics.mjs --dry      # report sahaja, tanpa tulis
 *   node seo/gsc-analytics.mjs --days=14
 *
 * Env: SEO_REPORT_DIR (default /app/data/reports di container, sonst <repo>/seo/reports)
 * Exit: 0 = selesai. GAGAL GSC → exit 0 + pesan (lapisan lain boleh jalan).
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { searchAnalytics, SITE_URL } from "./lib/gsc.mjs";
import { ROOT, STATE_PATH } from "./paths.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const DAYS = Number(args.find((a) => a.startsWith("--days="))?.slice(7)) || 28;

/**
 * Direktori laporan. WAJIB di luar repo git saat pipeline publish aktif —
 * report yang ditulis tiap hari ke path tracked akan menggagalkan
 * `git pull --rebase` siklus publish.
 */
const REPORT_DIR =
  process.env.SEO_REPORT_DIR ||
  (existsSync("/app/data")
    ? "/app/data/reports"
    : join(ROOT, "seo", "reports"));

const SITE_ORIGIN = "https://socio.id";

/* Seed query pasar Indonesia — kedudukan inilah yang kita pantau. */
const SEED_QUERIES = [
  "beli followers instagram",
  "buy tiktok followers",
  "panel smm",
  "followers instagram murah",
  "jasa social media marketing",
  "buy instagram followers indonesia",
];

/** Normalisasi query → sla token terakhir (untuk padanan dengan URL). */
function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Token bermakna (buang stopword EN/ID). */
const STOP = new Set([
  "beli",
  "buy",
  "harga",
  "price",
  "murah",
  "cheap",
  "di",
  "in",
  "smm",
  "panel",
  "the",
  "a",
  "an",
  "of",
  "for",
  "dan",
  "yang",
  "ke",
  "terbaik",
  "best",
  "online",
  "reseller",
  "jasa",
  "service",
  "services",
  "indonesia",
  "smm",
  "media",
  "marketing",
  "followers",
]);
function tokens(s) {
  return norm(s)
    .split(" ")
    .filter((t) => t.length > 2 && !STOP.has(t));
}

/**
 * Adakah query ini sudah ada halamannya? Bandingkan token query dengan
 * token URL (money page + artikel /blog/*).
 */
function pageForQuery(query, pages) {
  const qt = tokens(query);
  if (!qt.length) return null;
  let best = null;
  let bestScore = 0;
  for (const p of pages) {
    const pt = tokens(p);
    if (!pt.length) continue;
    const shared = qt.filter((t) => pt.includes(t)).length;
    if (!shared) continue;
    // Skor bilinear: berapa banyak token query ter-cover (recall) dan berapa
    // banyak token URL itu ada dalam query (precision).
    const cover = shared / qt.length;
    const prec = shared / pt.length;
    const score = cover * 0.7 + prec * 0.3;
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return bestScore >= 0.75 ? best : null;
}

/**
 * Money page kanonik. Prioritas: modul `seo/lib/money-pages.mjs` (sumber
 * kebenaran socio.id — daftar money page TIDAK boleh ditebak dari pola slug,
 * karena artikel geo seperti `smm-panel-umkm-manokwari` juga diawali
 * "smm-panel-"). Kalau modul tidak ada (mis. monorepo), pakai pola URL
 * dengan syarat URL bukan di /blog/.
 */
async function canonicalMoneyUrls() {
  try {
    const mod = await import("./lib/money-pages.mjs");
    if (typeof mod.allMoneyUrls === "function") {
      const list = mod.allMoneyUrls();
      if (Array.isArray(list) && list.length) return list;
    }
  } catch {
    /* modul opsional — lanjut ke fallback pola URL */
  }
  return null;
}

function isMoneyUrl(u) {
  const path = String(u).replace(SITE_ORIGIN, "");
  if (path.startsWith("/blog/")) return false;
  return (
    /^\/(beli|smm-panel)-/.test(path) || /^\/(layanan|reseller)\/?$/.test(path)
  );
}

/** Ambil URL kanonik dari sitemap live (toleran gagal). */
async function liveSitemapUrls() {
  const urls = [];
  for (const u of [
    `${SITE_ORIGIN}/sitemap-0.xml`,
    `${SITE_ORIGIN}/sitemap-index.xml`,
  ]) {
    try {
      const res = await fetch(u, {
        signal: AbortSignal.timeout(20000),
        redirect: "follow",
      });
      if (!res.ok) continue;
      const xml = await res.text();
      const found = [...String(xml).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) =>
        m[1].trim(),
      );
      if (found.length) {
        urls.push(...found);
        break;
      }
    } catch {
      /* coba URL berikutnya */
    }
  }
  return urls;
}

function isoDaysAgo(n) {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
}

function withDecimal(n) {
  return Number(n).toLocaleString("id-ID");
}

async function main() {
  const end = isoDaysAgo(1); // GSC data ada delay ~2 hari
  const start = isoDaysAgo(DAYS);
  const prevEnd = isoDaysAgo(DAYS + 1);
  const prevStart = isoDaysAgo(DAYS * 2);

  console.log(`gsc-analytics — ${SITE_URL} · ${start} → ${end}`);

  const pull = async (s, e) => {
    const rows = await searchAnalytics({
      startDate: s,
      endDate: e,
      dimensions: ["query"],
      rowLimit: 1000,
    });
    return rows.map((r) => ({
      query: r.keys?.[0] || "",
      clicks: r.clicks || 0,
      impressions: r.impressions || 0,
      ctr: r.ctr || 0,
      position: r.position || 0,
    }));
  };

  let rows = [];
  let prevRows = [];
  try {
    rows = await pull(start, end);
    prevRows = await pull(prevStart, prevEnd);
  } catch (e) {
    console.error(`gsc-analytics GAGAL: ${e.message}`);
    console.error(
      "  (langkah lain biasanya boleh jalan tanpa GSC — lapisan query dilumpuhkan.)",
    );
    return 0;
  }

  // Snapshot mentah (artefak runtime, untracked).
  if (!DRY) {
    mkdirSync(REPORT_DIR, { recursive: true });
    const snap = {
      at: new Date().toISOString(),
      site: SITE_URL,
      window: { start, end, days: DAYS },
      queries: rows,
      previous: prevRows,
    };
    writeFileSync(
      join(REPORT_DIR, `queries-${end}.json`),
      `${JSON.stringify(snap, null, 2)}\n`,
    );
  }

  // ── URL live untuk padanan query → halaman ───────────────────────────────
  const state = (() => {
    try {
      return JSON.parse(readFileSync(STATE_PATH, "utf8"));
    } catch {
      return {};
    }
  })();

  const sitemapUrls = await liveSitemapUrls();
  const articleUrls = (state.published || [])
    .map((p) => p?.url)
    .filter(Boolean);
  const moneyList = await canonicalMoneyUrls();
  const moneyPages = moneyList || sitemapUrls.filter(isMoneyUrl);
  const pages = [...new Set([...moneyPages, ...articleUrls, ...sitemapUrls])];

  console.log(
    `  halaman dipetakan: ${pages.length} (money ${moneyPages.length} · artikel ${articleUrls.length} · sitemap ${sitemapUrls.length})`,
  );

  const prevByQuery = new Map(prevRows.map((r) => [r.query, r]));
  const withDelta = rows.map((r) => {
    const p = prevByQuery.get(r.query);
    return {
      ...r,
      prevImpressions: p?.impressions ?? 0,
      prevClicks: p?.clicks ?? 0,
      prevPosition: p?.position ?? 0,
    };
  });

  // ── 1. Seed query ─────────────────────────────────────────────────────────
  const seed = SEED_QUERIES.map((q) => ({
    q,
    hit: withDelta.find((r) => norm(r.query) === norm(q)) || null,
  }));

  // ── 2. Query dengan impression tapi tiada halaman ────────────────────────
  const noPage = withDelta
    .filter((r) => r.impressions > 0 && !pageForQuery(r.query, pages))
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 40);

  // ── 3. Halaman CTR rendah (impression ada, klik kurang) ──────────────────
  const byPage = new Map();
  for (const r of withDelta) {
    const p = pageForQuery(r.query, pages);
    if (!p) continue;
    const cur = byPage.get(p) || {
      url: p,
      impressions: 0,
      clicks: 0,
      position: 0,
      n: 0,
    };
    cur.impressions += r.impressions;
    cur.clicks += r.clicks;
    cur.position += r.position;
    cur.n += 1;
    byPage.set(p, cur);
  }
  const lowCtr = [...byPage.values()]
    .filter((p) => p.impressions >= 20 && p.clicks / p.impressions < 0.02)
    .map((p) => ({
      ...p,
      ctr: p.clicks / p.impressions,
      avgPos: p.position / p.n,
    }))
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 25);

  // ── 4. Halaman ada impression tapi GSC kata tak terindex ─────────────────
  const inspections = state.gsc?.inspections || {};
  const indexedNo = [];
  for (const p of byPage.values()) {
    const insp = inspections[p.url];
    if (!insp) continue;
    const s = String(insp.coverageState || "").toLowerCase();
    if (s && !/indexed/.test(s)) {
      indexedNo.push({
        url: p.url,
        coverage: insp.coverageState,
        impressions: p.impressions,
      });
    }
  }
  indexedNo.sort((a, b) => b.impressions - a.impressions);

  // ── Report ────────────────────────────────────────────────────────────────
  const md = [
    "# SEO Queries (GSC Search Analytics)",
    "",
    `> Dijana \`seo/gsc-analytics.mjs\` (${new Date().toISOString().slice(0, 10)}) · window ${start} → ${end} (${DAYS} hari) · ${rows.length} query.`,
    `> Snapshot mentah: \`${join(REPORT_DIR, `queries-${end}.json`)}\` (artefak runtime, untracked).`,
    "",
    "## Ringkasan",
    "",
    `- **Total**: ${withDelta.reduce((a, r) => a + r.clicks, 0)} klik · ${withDecimal(withDelta.reduce((a, r) => a + r.impressions, 0))} impression`,
    `- **Halaman live** dipetakan: ${pages.length} (${moneyPages.length} money page, ${articleUrls.length} artikel published)`,
    `- **Query tanpa halaman** (impression > 0): **${noPage.length}** → calon page baru`,
    `- **Halaman CTR rendah** (<2%, ≥20 impression): **${lowCtr.length}** → calon revisi title/meta`,
    `- **Halaman ada impression tapi GSC kata tak terindex**: **${indexedNo.length}** → semak QC/duplicate`,
    "",
    "## 1. Kedudukan seed query",
    "",
    "| Query | Klick | Impression | Posisi | CTR |",
    "|---|---|---|---|---|",
    ...seed.map((s) =>
      s.hit
        ? `| ${s.q} | ${s.hit.clicks} | ${s.hit.impressions} | ${s.hit.position.toFixed(1)} | ${(s.hit.ctr * 100).toFixed(1)}% |`
        : `| ${s.q} | — | — | tiada data | — |`,
    ),
    "",
    "## 2. Query dengan impression tapi tiada halaman → calon page",
    "",
    noPage.length
      ? [
          "| Query | Klik | Impression | Posisi |",
          "|---|---|---|---|",
          ...noPage.map(
            (r) =>
              `| ${r.query} | ${r.clicks} | ${r.impressions} | ${r.position.toFixed(1)} |`,
          ),
        ]
      : ["_Tiada — semua query dengan impression sudah ada halamannya._"],
    "",
    "## 3. Halaman CTR rendah → calon revisi title/meta",
    "",
    lowCtr.length
      ? [
          "| URL | Klik | Impression | CTR | Posisi purata |",
          "|---|---|---|---|---|",
          ...lowCtr.map(
            (p) =>
              `| ${p.url} | ${p.clicks} | ${p.impressions} | ${(p.ctr * 100).toFixed(2)}% | ${p.avgPos.toFixed(1)} |`,
          ),
        ]
      : ["_Tiada halaman dengan CTR < 2% dan ≥ 20 impression._"],
    "",
    "## 4. Ada impression tapi GSC kata tak terindex",
    "",
    indexedNo.length
      ? [
          "| URL | Impression | Coverage GSC |",
          "|---|---|---|",
          ...indexedNo.map(
            (p) => `| ${p.url} | ${p.impressions} | ${p.coverage} |`,
          ),
        ]
      : ["_Tiada._"],
    "",
  ]
    // .flat() PENTING: beberapa bahagian ialah array (baris jadual) — tanpa
    // .flat(), join() menukarnya jadi string ber(",") → jadual rosak.
    .flat()
    .join("\n");

  if (!DRY) {
    mkdirSync(REPORT_DIR, { recursive: true });
    const out = join(REPORT_DIR, "SEO-QUERIES.md");
    writeFileSync(out, md);
    console.log(
      `gsc-analytics: ${out} ditulis (${rows.length} query, ${noPage.length} calon page, ${lowCtr.length} CTR rendah, ${indexedNo.length} tak terindex).`,
    );
  } else {
    console.log(md.slice(0, 1200));
  }
  return 0;
}

process.exit(await main());
