#!/usr/bin/env node
/**
 * seo/cluster-manifest.mjs — bangun & validasi manifest pillar ↔ cluster
 * (plan v2 §1.2 Pillar Map + §1.4 Implementasi data).
 *
 * Gunanya:
 *   1. `--build`  → generates `seo/clusters.json` dari data NYATA (queue.json +
 *                   cities.json + file MDX yang ada), bukan daftar harapan.
 *   2. default    → audit manifest: pillar ada? cluster-nya ada? cakupan keyword
 *                   berapa? artikel published vs draft?orphan yang tidak
 *                   masuk pilar mana pun?
 *   3. `--strict` → exit 1 kalau manifest rusak / pillar tanpa cluster / cakupan
 *                   di bawah ambang. Untuk CI & gate pre-publish.
 *
 * Zero dependency. Sumber kebenaran:
 *   - `seo/queue.json`    → daftar keyword intent (slug, cluster, category, status)
 *   - `seo/cities.json`   → 72 kota reviewed (dipakai untuk klasifikasi geo)
 *   - `landing/src/content/blog/*.mdx` → artikel yang benar-benar ada
 *
 * Aturan pemetaan (penting, kenapa):
 *   - Keyword GEO dikenali dari `cluster: geo-<kota>` ATAU slug berakhiran
 *     nama kota dari cities.json. Semua masuk pilar P10 (per-kota) supaya
 *     894 varian geo tidak meny-spread ke pilar intent lain.
 *   - Keyword intent dipetakan ke pilar berdasarkan pola slug/keyword.
 *   - Keyword yang tidak cocok pola mana pun → `unassigned` (reported, bukan
 *     dipaksa masuk pilar, supaya data jelek terlihat).
 *
 * Usage:
 *   node seo/cluster-manifest.mjs              # audit + laporan
 *   node seo/cluster-manifest.mjs --build      # tulis/refresh clusters.json
 *   node seo/cluster-manifest.mjs --json       # output JSON
 *   node seo/cluster-manifest.mjs --strict     # exit 1 bila gagal
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { QUEUE_PATH, CITIES_PATH, BLOG_DIR } from './paths.mjs';

/**
 * Routing keyword modifier → money page (keputusan 2 Okt 2026, §14.13B).
 *
 * 55 keyword yang tadinya `unassigned` bukan topik baru — semuanya pola
 * `{beli|jasa|order|bahan} × {layanan}`, dan 54 di antaranya **sudah punya**
 * money page yanghorst menjawab intent yang sama. Membuat 55 artikel tipis
 * hanya menambah duplikasi.
 *
 * Yang dilakukan: keyword di-route ke money page tujuannya, dan varian
 * `jasa-*` / `order-*` dijawab sebagai FAQ di halaman tersebut.
 *
 * PENTING: `beli-live-instagram` TIDAK dibuat meski katalog punya Instagram
 * Live Views. Money page `beli-live-tiktok` sudah memakai slot "Live", dan
 * menambah satu halaman per platform untuk layanan yang sama dinilai
 * sebagai menambah duplikasi, bukan menambah jangkauan. FB "post reach"
 * di-park karena katalog benar-benar tidak punya layanan itu.
 */
const MODIFIER_ROUTES = {
  // Komentar (sudah ada money page)
  members_telegram: null, // placeholder, ditulis sebagai key dengan '-' di bawah
};

const ROUTES = {
  // —— Komentar ——
  'members-telegram': 'beli-members-telegram',
  'komentar-instagram': 'beli-komentar-instagram',
  'beli-komentar-instagram': 'beli-komentar-instagram',
  'jasa-komentar-instagram': 'beli-komentar-instagram',
  'order-komentar-instagram': 'beli-komentar-instagram',
  // —— Story views ——
  'story-views-instagram': 'beli-story-views-instagram',
  'beli-story-views-instagram': 'beli-story-views-instagram',
  'jasa-story-views-instagram': 'beli-story-views-instagram',
  'order-story-views-instagram': 'beli-story-views-instagram',
  'story-viewers-instagram': 'beli-story-views-instagram',
  'beli-story-viewers-instagram': 'beli-story-views-instagram',
  'jasa-story-viewers-instagram': 'beli-story-views-instagram',
  'order-story-viewers-instagram': 'beli-story-views-instagram',
  'story-viewers': 'beli-story-views-instagram',
  'beli-story-viewers': 'beli-story-views-instagram',
  // —— Share Facebook ——
  'share-facebook': 'beli-share-facebook',
  'beli-share-facebook': 'beli-share-facebook',
  'jasa-share-facebook': 'beli-share-facebook',
  'order-share-facebook': 'beli-share-facebook',
  // —— Reels (semua varian → satu halaman) ——
  'reels-views-instagram': 'beli-reels-instagram',
  'beli-reels-views-instagram': 'beli-reels-instagram',
  'jasa-reels-views-instagram': 'beli-reels-instagram',
  'order-reels-views-instagram': 'beli-reels-instagram',
  'reels-plays-instagram': 'beli-reels-instagram',
  'beli-reels-plays-instagram': 'beli-reels-instagram',
  'jasa-reels-plays-instagram': 'beli-reels-instagram',
  'order-reels-plays-instagram': 'beli-reels-instagram',
  'reels-views': 'beli-reels-instagram',
  'beli-reels-views': 'beli-reels-instagram',
  'reels-plays': 'beli-reels-instagram',
  'beli-reels-plays': 'beli-reels-instagram',
  // —— Spotify ——
  'spotify-listeners': 'beli-listeners-spotify',
  'beli-spotify-listeners': 'beli-listeners-spotify',
  'jasa-spotify-listeners': 'beli-listeners-spotify',
  'order-spotify-listeners': 'beli-listeners-spotify',
  'spotify-plays': 'beli-plays-spotify',
  'beli-spotify-plays': 'beli-plays-spotify',
  'jasa-spotify-plays': 'beli-plays-spotify',
  'order-spotify-plays': 'beli-plays-spotify',
  'spotify-streams': 'beli-plays-spotify',
  'beli-spotify-streams': 'beli-plays-spotify',
  'jasa-spotify-streams': 'beli-plays-spotify',
  'order-spotify-streams': 'beli-plays-spotify',
  // —— Live viewers → halaman live yang sudah ada ——
  'viewers-instagram-live': 'beli-live-tiktok',
  'beli-viewers-instagram-live': 'beli-live-tiktok',
  'jasa-viewers-instagram-live': 'beli-live-tiktok',
  'order-viewers-instagram-live': 'beli-live-tiktok',
  'jasa-live-instagram': 'beli-live-tiktok',
  // —— Telegram post views & Twitter tweet views ——
  'post-views-telegram': 'beli-views-telegram',
  'tweet-views': 'beli-views-twitter',
  'beli-tweet-views': 'beli-views-twitter',
  // —— Intent informasi member Telegram → FAQ, bukan halaman transaksi ——
  'member-telegram-aman-tanpa-password': 'beli-members-telegram',
  'member-telegram-gradual-refill': 'beli-members-telegram',
  'member-telegram-reseller-pemula': 'beli-members-telegram',
  'member-telegram-cara-cek': 'beli-members-telegram',
};

/**
 * Keyword yang sengaja TIDAK dipromosikan: katalog tidak punya layanannya.
 * 'post reach' Facebook → 0 baris di tabel `services` (cek prod DB 2 Okt 2026).
 * Mempromosikan keyword yang tidak bisa dipenuhi lebih buruk daripada
 * membiarkannya menggantung.
 */
const PARKED_NO_SERVICE = new Set([
  'post-reach-facebook',
  'beli-post-reach-facebook',
  'jasa-post-reach-facebook',
  'order-post-reach-facebook',
]);

const NL = String.fromCharCode(10);
const CLUSTERS_PATH = join(QUEUE_PATH.replace(/queue\.json$/, ''), 'clusters.json');

/** Definisi 12 pilar (plan v2 §1.2). `match` = pola slug/keyword yang dipegang pilar ini. */
const PILLARS = [
  { id: 'P1', slug: 'smm-panel', title: 'SMM Panel: Panduan Lengkap 2026', keyword_root: 'smm panel',
    intent: ['apa-itu-smm-panel', 'smm-panel-adalah', 'smm-panel-indonesia', 'smm-panel', 'smm-panel-murah', 'smm-panel-umkm'],
    money_links: ['/layanan', '/reseller', '/beli-followers-instagram'] },
  { id: 'P2', slug: 'reseller-smm-panel', title: 'Reseller SMM Panel: Modal, Untung, dan Cara Mulai', keyword_root: 'reseller smm panel',
    intent: ['modal-jualan-followers', 'reseller-smm-panel', 'agen-smm-panel', 'promosi-usaha-online',
      'jadi-reseller-sosmed', 'cara-jadi-reseller-smm', 'reseller-sosmed', 'jualan-followers', 'dropship-smm'],
    money_links: ['/reseller', '/layanan'] },
  { id: 'P3', slug: 'cara-menambah-followers-instagram', title: 'Cara Menambah Followers Instagram: Panduan Lengkap', keyword_root: 'cara menambah followers instagram',
    intent: ['cara-menambah-followers', 'cara-menambah-followers-instagram', 'beli-followers', 'followers',
      'likes-instagram', 'cara-menambah-likes-instagram', 'video-views-instagram', 'likes', 'live-viewers'],
    money_links: ['/beli-followers-instagram', '/beli-likes-instagram'] },
  { id: 'P4', slug: 'harga-smm-panel', title: 'Harga SMM Panel 2026: Transparan dan Jujur', keyword_root: 'harga smm panel',
    intent: ['harga-smm-panel', 'harga', 'harga-followers', 'harga-likes'],
    money_links: ['/layanan', '/harga-smm-panel'] },
  { id: 'P5', slug: 'smm-panel-terpercaya', title: 'SMM Panel Terpercaya 2026: Cara Bedakan yang Aman', keyword_root: 'smm panel terpercaya',
    intent: ['smm-panel-terpercaya', 'smm-panel-legal', 'smm-panel-aman', 'smm-panel-penipuan', 'smm-panel-resmi'],
    money_links: ['/smm-panel-terpercaya', '/layanan'] },
  { id: 'P6', slug: 'keamanan-smm-panel', title: 'Keamanan SMM Panel: Anti Bot, Garansi, dan Risiko', keyword_root: 'keamanan smm panel',
    intent: ['smm-panel-bukan-bot', 'smm-panel-penjaminan', 'garansi-smm-panel'],
    money_links: ['/layanan', '/blog'] },
  { id: 'P7', slug: 'smm-panel-tiktok', title: 'SMM Panel TikTok: Followers, Likes, Views', keyword_root: 'smm panel tiktok',
    intent: ['tambah-followers-tiktok', 'tambah-likes-tiktok', 'tiktok', 'tambah-views-tiktok', 'views-tiktok'],
    money_links: ['/beli-followers-tiktok', '/beli-likes-tiktok'] },
  { id: 'P8', slug: 'smm-panel-youtube', title: 'SMM Panel YouTube: Subscribers, Views, Likes', keyword_root: 'smm panel youtube',
    intent: ['tambah-viewers-yt', 'tambah-subscribe-yt', 'youtube', 'beli-subscribers-youtube', 'subscribers-youtube', 'jam-tayang-youtube'],
    money_links: ['/beli-subscribers-youtube', '/beli-jam-tayang-youtube'] },
  { id: 'P9', slug: 'smm-panel-twitter', title: 'SMM Panel Twitter/X: Followers, Likes, Repost', keyword_root: 'smm panel twitter',
    intent: ['followers-twitter', 'likes-twitter', 'twitter', 'retweet-twitter'],
    money_links: ['/beli-followers-twitter', '/beli-retweet-twitter'] },
  { id: 'P10', slug: 'smm-panel-per-kota', title: 'SMM Panel per Kota: Panduan Regional Indonesia', keyword_root: 'smm panel [kota]',
    intent: [], // diisi otomatis dari geo
    money_links: ['/layanan'] },
  { id: 'P11', slug: 'affiliate-smm-panel', title: 'Afiliasi SMM Panel: Komisi dan Cara Kerja', keyword_root: 'afiliate smm panel',
    intent: ['affiliasi-smm', 'komisi-smm', 'affiliate-smm-panel', 'referral-smm'],
    money_links: ['/reseller'] },
  { id: 'P12', slug: 'faq-smm-panel', title: 'FAQ SMM Panel: Cara Kerja, Pembayaran, CS 24 Jam', keyword_root: 'faq smm panel',
    intent: ['bagaimana-smm-bekerja', 'smm-reseller-faq', 'cara-kerja-smm-panel', 'cara-daftar-smm-panel',
      'apa-itu-panel-smm', 'smm-panel-gratis', 'faq-smm-panel'],
    money_links: ['/blog', '/layanan'] },
];

const ARGS = (() => {
  const a = { build: false, json: false, strict: false, help: false };
  for (const k of process.argv.slice(2)) {
    if (k === '--build') a.build = true;
    else if (k === '--json') a.json = true;
    else if (k === '--strict') a.strict = true;
    else if (k === '--help' || k === '-h') a.help = true;
    else throw new Error(`Argumen tidak dikenal: ${k}`);
  }
  return a;
})();

if (ARGS.help) {
  console.log('Usage: node seo/cluster-manifest.mjs [--build] [--json] [--strict]');
  console.log('  --build  tulis/refresh seo/clusters.json dari queue.json + cities.json + MDX');
  console.log('  --strict exit 1 bila manifest rusak / pillar kosong / coverage rendah');
}

function loadJSON(path, label) {
  if (!existsSync(path)) throw new Error(`${label} tidak ada: ${path}`);
  return JSON.parse(readFileSync(path, 'utf8'));
}

/** Kota dari cities.json → Set slug kota (72 kota, reviewed). */
function loadCities() {
  if (!existsSync(CITIES_PATH)) return { slugs: new Set(), bySlug: new Map() };
  const d = loadJSON(CITIES_PATH, 'cities.json');
  const cities = d.cities || [];
  return {
    slugs: new Set(cities.map((c) => (c.slug || '').toLowerCase()).filter(Boolean)),
    bySlug: new Map(cities.map((c) => [(c.slug || '').toLowerCase(), c])),
    count: cities.length,
  };
}

/** Article yang benar-benar ada di disk + status draft. */
function loadArticles() {
  if (!existsSync(BLOG_DIR)) return new Map();
  const out = new Map();
  for (const f of readdirSync(BLOG_DIR).filter((x) => x.endsWith('.mdx'))) {
    const slug = f.replace(/\.mdx$/, '');
    const src = readFileSync(join(BLOG_DIR, f), 'utf8');
    out.set(slug, { draft: /^draft:[ \t]*true/m.test(src) });
  }
  return out;
}

/** Klasifikasi satu item queue → { pillar, geo } */
function classify(item, cities) {
  const slug = (item.slug || '').toLowerCase();
  const cluster = (item.cluster || '').toLowerCase();
  const kw = (item.keyword || '').toLowerCase();

  // GEO: cluster geo-<kota> ATAU slug berakhiran nama kota
  if (cluster.startsWith('geo-')) return { pillar: 'P10', geo: cluster.slice(4) };
  if (cities.slugs.size) {
    for (const c of cities.slugs) {
      if (slug.endsWith('-' + c) || slug === c || kw.endsWith(' ' + c)) return { pillar: 'P10', geo: c };
    }
  }

  // INTENT: cocokkan ke intent list pilar (paling spesifik dulu)
  for (const p of PILLARS) {
    if (p.id === 'P10') continue;
    for (const pat of p.intent) {
      if (slug === pat || slug.startsWith(pat + '-') || slug.includes(pat)) return { pillar: p.id, geo: null };
    }
  }
  return { pillar: null, geo: null };
}

function main() {
  const queue = loadJSON(QUEUE_PATH, 'queue.json');
  const cities = loadCities();
  const articles = loadArticles();
  const items = queue.items || [];

  // Bangun manifest dari data nyata
  const byPillar = new Map(PILLARS.map((p) => [p.id, { ...p, clusters: [], clustersMeta: [] }]));
  const unassigned = [];
  const routed = [];
  const parked = [];
  let geoCount = 0;

  for (const it of items) {
    const slug = it.slug || (it.keyword || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const cls = classify({ ...it, slug }, cities);
    const art = articles.get(slug);
    const meta = {
      slug,
      keyword: it.keyword,
      status: it.status || 'unknown',
      hasArticle: Boolean(art),
      draft: art ? art.draft : null,
      priority: it.priority ?? null,
    };
    if (!cls.pillar && ROUTES[slug]) {
      routed.push({ ...meta, route: ROUTES[slug] });
      continue;
    } else if (!cls.pillar && PARKED_NO_SERVICE.has(slug)) {
      parked.push({ ...meta, reason: 'tidak ada layanan ini di katalog (cek prod DB)' });
      continue;
    } else if (!cls.pillar) {
      unassigned.push(meta);
      continue;
    }
    if (cls.geo) {
      geoCount++;
      meta.geo = cls.geo;
      meta.provinsi = cities.bySlug.get(cls.geo)?.provinsi || null;
    }
    const pillar = byPillar.get(cls.pillar);
    pillar.clusters.push(slug);
    pillar.clustersMeta.push(meta);
  }

  // Ringkasan per pilar
  const pillars = [...byPillar.values()].map((p) => {
    const total = p.clusters.length;
    const published = p.clustersMeta.filter((m) => m.hasArticle && m.draft === false).length;
    const draft = p.clustersMeta.filter((m) => m.hasArticle && m.draft === true).length;
    const noFile = p.clustersMeta.filter((m) => !m.hasArticle).length;
    const pillarArticle = articles.get(p.slug);
    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      keyword_root: p.keyword_root,
      money_links: p.money_links,
      clusters_count: total,
      clusters_published: published,
      clusters_draft: draft,
      clusters_no_file: noFile,
      pillar_has_article: Boolean(pillarArticle),
      pillar_published: Boolean(pillarArticle && pillarArticle.draft === false),
      status: pillarArticle ? (pillarArticle.draft ? 'draft' : 'live') : 'missing',
      clusters: p.clusters, // slug list
      clusters_meta: p.clustersMeta, // detail (status/article/geo)
    };
  });

  // Analisis P10: rencana §1.2 hanya mau 1 short page per kota (72 kota).
  // Data nyata punya ~12 varian per kota → sisanya kandidat merge/consolidate.
  // Kelompokkan unassigned berdasarkan token platform/layanan supaya bisa
  // diputuskan user: "pillar map plan tidak punya slot untuk ini".
  const unassignedGroups = {};
  for (const u of unassigned) {
    const hay = `${u.slug} ${u.keyword || ''}`.toLowerCase();
    let group = 'lain-lain';
    for (const key of ['spotify', 'telegram', 'reels', 'live', 'facebook', 'tiktok', 'youtube', 'instagram', 'twitter']) {
      if (hay.includes(key)) { group = key; break; }
    }
    (unassignedGroups[group] = unassignedGroups[group] || []).push(u.slug);
  }
  const unassignedSummary = Object.entries(unassignedGroups)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([g, list]) => ({ group: g, count: list.length, sample: list.slice(0, 3) }));

  const geoPillar = pillars.find((p) => p.id === 'P10');
  const perCity = new Map();
  for (const m of geoPillar?.clusters_meta || []) {
    const c = m.geo || '(tanpa kota)';
    perCity.set(c, (perCity.get(c) || 0) + 1);
  }
  const cityReport = {
    cities: perCity.size,
    planned_per_city: 1,
    current_per_city_avg: Number((perCity.size ? geoPillar.clusters_count / perCity.size : 0).toFixed(1)),
    excess: Math.max(0, geoPillar.clusters_count - perCity.size),
    top: [...perCity.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([city, n]) => ({ city, n })),
  };

  const totals = {
    queue_items: items.length,
    geo_items: geoCount,
    assigned: pillars.reduce((a, p) => a + p.clusters_count, 0),
    unassigned: unassigned.length,
    routed_to_money_page: routed.length,
    parked_no_service: parked.length,
    pillars_total: pillars.length,
    pillars_live: pillars.filter((p) => p.status === 'live').length,
    pillar_articles_present: pillars.filter((p) => p.pillar_has_article).length,
  };
  totals.coverage_pct = Number(((totals.assigned / Math.max(1, totals.queue_items)) * 100).toFixed(1));
  totals.p10_city_report = cityReport;

  const manifest = {
    _meta: {
      generated_at: new Date().toISOString(),
      generator: 'seo/cluster-manifest.mjs --build',
      plan_ref: 'docs/SEO_AUTOMATION_PLAN_V2.md §1.2 (Pillar Map) + §1.4 (data)',
      cities_source: 'seo/cities.json',
      note: 'Manifest dibangun dari queue.json + cities.json + MDX nyata. clusters_meta menyimpan status publish per artikel.',
    },
    totals,
    p10_city_report: cityReport,
    unassigned_groups: unassignedSummary,
    pillars,
    unassigned,
    routed,
    parked,
  };

  // Build → tulis clusters.json (atomic)
  if (ARGS.build && !ARGS.json) {
    const tmp = `${CLUSTERS_PATH}.tmp`;
    writeFileSync(tmp, JSON.stringify(manifest, null, 2) + NL);
    renameSync(tmp, CLUSTERS_PATH);
    console.log(`cluster-manifest: ${CLUSTERS_PATH} ditulis (${pillars.length} pillar, ${totals.assigned} keyword ter-assign).`);
  }

  if (ARGS.json) {
    console.log(JSON.stringify(manifest, null, 2));
  } else {
    // Human report
    console.log(`cluster-manifest — queue ${totals.queue_items} keyword · ${totals.pillars_total} pilar`);
    console.log(`  cakupan: ${totals.assigned} ter-assign (${totals.coverage_pct}%) · ${totals.unassigned} unassigned · ${totals.geo_items} geo → P10`);
    console.log(`  modifier di-route ke money page: ${totals.routed_to_money_page} · di-park (tidak ada layanan): ${totals.parked_no_service}`);
    console.log(`  artikel pilar: ${totals.pillar_articles_present}/${totals.pillars_total} punya file (${totals.pillars_live} live)`);
    console.log('');
    console.log('  ID   PILLAR                        CLUSTER  PUBLISHED  DRAFT  NO-FILE  STATUS');
    for (const p of pillars) {
      console.log(
        `  ${p.id.padEnd(4)} ${p.slug.padEnd(30)} ${String(p.clusters_count).padStart(7)}  ${String(p.clusters_published).padStart(9)}  ${String(p.clusters_draft).padStart(5)}  ${String(p.clusters_no_file).padStart(7)}  ${p.status}`
      );
    }
    if (cityReport.cities) {
      console.log(
        `\n  P10 (geo): ${cityReport.cities} kota · rata-rata ${cityReport.current_per_city_avg} varian/kota ` +
        `(rencana 1/kota) → ${cityReport.excess} varian excess (kandidat merge)`
      );
      console.log(`     kota paling padat: ${cityReport.top.map((t) => `${t.city}=${t.n}`).join(', ')}`);
    }

    if (unassigned.length) {
      console.log(`\n  UNASSIGNED (${unassigned.length}) — dikelompokkan:`);
      for (const g of unassignedSummary) console.log(`    · ${g.group.padEnd(10)} ${String(g.count).padStart(3)}  contoh: ${g.sample.join(', ')}`);
      console.log('      → pillar map plan §1.2 belum punya slot untuk semua platform ini;');
      console.log('        pilihan: tambah pilar, atau gabungkan ke pilar terdekat (butuh keputusan user).');
    }

    // Validasi
    const problems = [];
    for (const p of pillars) {
      if (p.clusters_count === 0) problems.push(`${p.id} (${p.slug}) tidak punya cluster keyword`);
      if (!p.pillar_has_article) problems.push(`${p.id} artikel pilar belum ada (${p.slug}.mdx)`);
    }
    if (totals.unassigned > 0) problems.push(`${totals.unassigned} keyword unassigned — tidak masuk pilar mana pun`);
    if (cityReport.excess > 0) problems.push(`P10 punya ${cityReport.excess} varian geo excess (${cityReport.current_per_city_avg}/kota vs rencana 1/kota) — merge atau differentiates`);
    if (problems.length) {
      console.log('\n  MASALAH:');
      for (const p of problems) console.log(`    · ${p}`);
    } else {
      console.log('\n  Manifest sehat: semua pilar punya cluster + artikel.');
    }

    if (ARGS.strict && problems.length) process.exitCode = 1;
  }
}

try {
  main();
} catch (e) {
  console.error('cluster-manifest FATAL:', e.message);
  process.exitCode = 2;
}
