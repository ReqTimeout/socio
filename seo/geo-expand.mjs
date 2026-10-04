#!/usr/bin/env node
/**
 * seo/geo-expand.mjs — Fase F: mesin keyword geo + longtail intent (spec §15).
 *
 * Kenapa bukan mining autocomplete: probing live 30 Sep menunjukkan frasa
 * "smm panel <kota>" menghasilkan 0 sugestian (di bawah ambang Google). Jadi
 * pasokan keyword dibuat dengan matriks: head term x template x kota, plus
 * intent longtail non-geo. Yang bikin halaman tetap berharga (bukan doorway)
 * adalah `anchor` ekonomi lokal di cities.json yang wajib ikut ke prompt.
 *
 * Alur kerja (2 langkah, dengan gate approval user):
 *   1) node seo/geo-expand.mjs --expand      -> tulis seo/keywords.geo.json (candidate)
 *      user review/edit file itu: set "approved": true pada baris yang layak,
 *      dan _meta.approved_at = tanggal.
 *   2) node seo/geo-expand.mjs --promote     -> salin yang approved ke queue.json
 *
 * Flags:
 *   --expand            bangun kandidat (default kalau tidak ada flag lain)
 *   --promote           pindahkan kandidat approved ke queue.json (status pending)
 *   --tier=1,2          filter kota berdasarkan tier (default semua)
 *   --max=N             batasi jumlah kandidat yang ditulis
 *   --min-approved=N    ambang gate untuk --promote (default 200)
 *   --dry               cetak statistik tanpa menulis file
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, BLOG_DIR, QUEUE_PATH, CITIES_PATH, GEO_OUT_PATH } from './paths.mjs';

// ===== Template matriks =====
// {city} = nama kota, {prov} = provinsi. slugPrefix digabung dgn slug kota.
// Aturan 30 Sep (user): KOMERSIAL dibatasi tier atas (anti-kanibal money page),
// yang diprioritaskan = SMART LONGTAIL (tanya/masalah/cara/banding/biaya +
// sudut buyer dari local_anchor). `tiers` = tier kota yang dapat pola ini;
// kosong = semua tier.
const GEO_PATTERNS = [
  // --- Komersial (selektif tier) ---
  { id: 'g1', t: 'smm panel {city}', slug: 'smm-panel', category: 'geo-head', priority: 84, tiers: [1] },
  { id: 'g2', t: 'smm panel termurah {city}', slug: 'smm-panel-termurah', category: 'geo-head', priority: 86, tiers: [1, 2] },
  { id: 'g3', t: 'smm panel {city} terpercaya', slug: 'smm-panel-terpercaya', category: 'geo-trust', priority: 82 },
  { id: 'g4', t: 'harga smm panel {city}', slug: 'harga-smm-panel', category: 'geo-price', priority: 82, tiers: [1, 2] },
  { id: 'g5', t: 'reseller smm panel {city}', slug: 'reseller-smm-panel', category: 'geo-reseller', priority: 84, tiers: [1, 2] },
  { id: 'g7', t: 'beli followers instagram {city}', slug: 'beli-followers-instagram', category: 'geo-service', priority: 84, tiers: [1] },
  { id: 'g8', t: 'beli followers tiktok {city}', slug: 'beli-followers-tiktok', category: 'geo-service', priority: 84, tiers: [1] },
  // --- Smart longtail (semua tier, prioritas lebih tinggi) ---
  { id: 'L1', t: 'apakah smm panel {city} aman', slug: 'apakah-aman', category: 'geo-trust', priority: 89 },
  { id: 'L2', t: 'smm panel {city} penipuan atau bukan', slug: 'penipuan-atau-bukan', category: 'geo-trust', priority: 87 },
  { id: 'L3', t: 'cara jadi reseller smm panel di {city}', slug: 'cara-jadi-reseller', category: 'geo-reseller', priority: 88 },
  { id: 'L4', t: 'cara promosi usaha {city} lewat tiktok', slug: 'promosi-lewat-tiktok', category: 'geo-howto', priority: 87 },
  { id: 'L5', t: 'kenapa bisnis {city} pakai smm panel', slug: 'kenapa-pakai', category: 'geo-angle', priority: 87 },
  { id: 'L6', t: 'smm panel vs facebook ads {city}', slug: 'vs-facebook-ads', category: 'geo-compare', priority: 86 },
  { id: 'L7', t: 'biaya promosi online {city}', slug: 'biaya-promosi', category: 'geo-price', priority: 86 },
  { id: 'L8', t: 'berapa harga followers instagram di {city}', slug: 'berapa-harga-followers', category: 'geo-price', priority: 85 },
  { id: 'L9', t: 'followers instagram turun {city}', slug: 'followers-turun', category: 'geo-problem', priority: 85 },
  { id: 'L10', t: 'order pertama smm panel {city}', slug: 'order-pertama', category: 'geo-howto', priority: 85 },
  { id: 'g11', t: 'smm panel untuk umkm {city}', slug: 'smm-panel-umkm', category: 'geo-niche', priority: 80 },
];

// Longtail intent non-geo: pertanyaan yang dicari sebelum orang beli.
const INTENT_PATTERNS = [
  { id: 'i1', t: 'harga {base} per 1000', slug: 'harga', category: 'howto', priority: 80 },
  { id: 'i2', t: '{base} aman tanpa password', slug: 'aman-tanpa-password', category: 'keamanan', priority: 82 },
  { id: 'i3', t: '{base} gradual refill', slug: 'gradual-refill', category: 'keamanan', priority: 76 },
  { id: 'i4', t: '{base} untuk reseller pemula', slug: 'reseller-pemula', category: 'reseller', priority: 78 },
  { id: 'i5', t: 'cara cek {base} sudah masuk', slug: 'cara-cek', category: 'howto', priority: 74 },
];
const INTENT_BASES = [
  { label: 'followers Instagram', slug: 'followers-instagram' },
  { label: 'followers TikTok', slug: 'followers-tiktok' },
  { label: 'subscribers YouTube', slug: 'subscribers-youtube' },
  { label: 'views TikTok', slug: 'views-tiktok' },
  { label: 'member Telegram', slug: 'member-telegram' },
  { label: 'likes Instagram', slug: 'likes-instagram' },
];

// Per-layanan (platform × jasa) — label natural ID, dipakai SERVICE_INTENTS.
const SERVICE_BASES = [
  { label: 'followers Instagram', slug: 'followers-instagram' },
  { label: 'likes Instagram', slug: 'likes-instagram' },
  { label: 'views Instagram', slug: 'views-instagram' },
  { label: 'komentar Instagram', slug: 'komentar-instagram' },
  { label: 'story views Instagram', slug: 'story-views-instagram' },
  { label: 'reels Instagram', slug: 'reels-instagram' },
  { label: 'followers TikTok', slug: 'followers-tiktok' },
  { label: 'likes TikTok', slug: 'likes-tiktok' },
  { label: 'views TikTok', slug: 'views-tiktok' },
  { label: 'live viewers TikTok', slug: 'live-viewers-tiktok' },
  { label: 'komentar TikTok', slug: 'komentar-tiktok' },
  { label: 'share TikTok', slug: 'share-tiktok' },
  { label: 'subscribers YouTube', slug: 'subscribers-youtube' },
  { label: 'views YouTube', slug: 'views-youtube' },
  { label: 'likes YouTube', slug: 'likes-youtube' },
  { label: 'live views YouTube', slug: 'live-views-youtube' },
  { label: 'komentar YouTube', slug: 'komentar-youtube' },
  { label: 'members Telegram', slug: 'members-telegram' },
  { label: 'post views Telegram', slug: 'post-views-telegram' },
  { label: 'reactions Telegram', slug: 'reactions-telegram' },
  { label: 'followers Facebook', slug: 'followers-facebook' },
  { label: 'likes Facebook', slug: 'likes-facebook' },
  { label: 'views Facebook', slug: 'views-facebook' },
  { label: 'share Facebook', slug: 'share-facebook' },
  { label: 'followers Twitter', slug: 'followers-twitter' },
  { label: 'likes Twitter', slug: 'likes-twitter' },
  { label: 'retweet Twitter', slug: 'retweet-twitter' },
  { label: 'views Twitter', slug: 'views-twitter' },
  { label: 'plays Spotify', slug: 'plays-spotify' },
  { label: 'followers Spotify', slug: 'followers-spotify' },
  { label: 'listeners Spotify', slug: 'listeners-spotify' },
];

// Intent smart per layanan: tanya, aman, harga, cara, banding, masalah,
// review, jualan, timing. SENGAJA tanpa pola "beli/jasa X" (jatah money page).
const SERVICE_INTENTS = [
  { id: 'S1', t: '{base} itu apa', slug: 'itu-apa', category: 'definisi', priority: 86 },
  { id: 'S2', t: 'apakah {base} aman', slug: 'apakah-aman', category: 'keamanan', priority: 88 },
  { id: 'S3', t: 'harga {base} termurah', slug: 'harga-termurah', category: 'howto', priority: 85 },
  { id: 'S4', t: 'cara order {base}', slug: 'cara-order', category: 'howto', priority: 85 },
  { id: 'S5', t: '{base} refill atau non refill', slug: 'refill-atau-tidak', category: 'keamanan', priority: 84 },
  { id: 'S6', t: '{base} turun solusinya', slug: 'turun-solusi', category: 'keamanan', priority: 85 },
  { id: 'S7', t: '{base} tanpa password', slug: 'tanpa-password', category: 'keamanan', priority: 86 },
  { id: 'S8', t: 'review {base}', slug: 'review', category: 'howto', priority: 83 },
  { id: 'S9', t: '{base} untuk jualan', slug: 'untuk-jualan', category: 'reseller', priority: 84 },
  { id: 'S10', t: 'berapa lama {base} masuk', slug: 'berapa-lama', category: 'howto', priority: 84 },
];

const norm = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim();

function parseArgs() {
  const opts = { expand: false, promote: false, tiers: null, max: 0, minApproved: 200, dry: false };
  const args = process.argv.slice(2);
  for (const a of args) {
    if (a === '--expand') opts.expand = true;
    else if (a === '--promote') opts.promote = true;
    else if (a === '--dry') opts.dry = true;
    else if (a.startsWith('--tier=')) opts.tiers = a.slice(7).split(',').map((n) => Number(n));
    else if (a.startsWith('--max=')) opts.max = parseInt(a.slice(6));
    else if (a.startsWith('--min-approved=')) opts.minApproved = parseInt(a.slice(15));
  }
  // Tanpa flag aksi: default expand supaya aman dipanggil manual.
  if (!opts.expand && !opts.promote) opts.expand = true;
  return opts;
}

// Korpus keyword yang sudah ada: queue.json + slug MDX di disk.
function existingKeys(queue) {
  const keys = new Set();
  for (const it of queue.items) if (it.keyword) keys.add(norm(it.keyword));
  if (existsSync(BLOG_DIR)) {
    for (const f of readdirSync(BLOG_DIR).filter((x) => x.endsWith('.mdx'))) {
      keys.add(f.replace(/\.mdx$/, '').replace(/-/g, ' '));
    }
  }
  return keys;
}

function slugify(s) {
  return norm(s).replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function expand(opts) {
  if (!existsSync(CITIES_PATH)) {
    console.error('FATAL: seo/cities.json tidak ditemukan. Dataset kota adalah prasyarat gate.');
    process.exit(1);
  }
  const citiesData = JSON.parse(readFileSync(CITIES_PATH, 'utf8'));
  const queue = JSON.parse(readFileSync(QUEUE_PATH, 'utf8'));
  const taken = existingKeys(queue);

  const cities = citiesData.cities.filter((c) => !opts.tiers || opts.tiers.includes(c.tier));
  const noAnchor = cities.filter((c) => !c.anchor || String(c.anchor).length < 20);
  if (noAnchor.length) {
    console.error(`FATAL: ${noAnchor.length} kota tanpa anchor ekonomi (anti-doorway). Contoh: ${noAnchor.slice(0, 3).map((c) => c.city).join(', ')}`);
    process.exit(1);
  }

  const items = [];
  let dup = 0;
  const push = (kw, slug, extra) => {
    const k = norm(kw);
    if (taken.has(k)) { dup++; return; }
    taken.add(k);
    items.push({ keyword: k, slug, ...extra, approved: false });
  };

  for (const c of cities) {
    const patterns = GEO_PATTERNS.filter((p) => !p.tiers || p.tiers.includes(c.tier));
    for (const p of patterns) {
      const kw = norm(p.t.replace('{city}', c.city));
      const slug = `${p.slug}-${c.slug}`;
      push(kw, slug, {
        source: 'geo',
        pattern: p.id,
        city: c.city,
        city_slug: c.slug,
        provinsi: c.provinsi,
        tier: c.tier,
        local_anchor: c.anchor,
        local_buyer: c.buyer,
        priority: p.priority + (c.tier === 1 ? 4 : c.tier === 2 ? 2 : 0),
        category: p.category,
        cluster: `geo-${c.slug}`,
        demand_signal: 'geo-matrix',
      });
    }
  }

  for (const p of INTENT_PATTERNS) {
    for (const b of INTENT_BASES) {
      const kw = norm(p.t.replace('{base}', b.label));
      const slug = `${b.slug}-${p.slug}`;
      push(kw, slug, {
        source: 'intent',
        pattern: p.id,
        city: null,
        provinsi: null,
        tier: 0,
        local_anchor: null,
        local_buyer: null,
        priority: p.priority,
        category: p.category,
        cluster: b.slug,
        demand_signal: 'longtail-intent',
      });
    }
  }

  // ===== Per-layanan longtail (30 Sep, request user) =====
  // Matriks layanan × intent smart: definisi, aman, harga, cara, banding,
  // masalah, review, jualan, timing. Non-geo (nasional), anti-kanibal:
  // TIDAK ada pola "beli X" (itu jatah money page).
  for (const p of SERVICE_INTENTS) {
    for (const b of SERVICE_BASES) {
      const kw = norm(p.t.replace('{base}', b.label));
      const slug = `${b.slug}-${p.slug}`;
      push(kw, slug, {
        source: 'intent',
        pattern: p.id,
        city: null,
        provinsi: null,
        tier: 0,
        local_anchor: null,
        local_buyer: null,
        priority: p.priority,
        category: p.category,
        cluster: b.slug,
        demand_signal: 'longtail-intent',
      });
    }
  }

  const limited = opts.max > 0 ? items.slice(0, opts.max) : items;
  const out = {
    _meta: {
      version: '1.0.0',
      generated: new Date().toISOString().slice(0, 10),
      cities_file: citiesData._meta.version,
      note: 'Kandidat keyword geo + longtail. User WAJIB review: set approved:true per baris, lalu isi approved_at. Setelah itu jalankan --promote. Generate artikel diblokir selama daftar ini belum approved (lihat gate di generate.mjs).',
      approved_at: null,
      approved_by: null,
      total: limited.length,
      geo: limited.filter((x) => x.source === 'geo').length,
      intent: limited.filter((x) => x.source === 'intent').length,
    },
    items: limited,
  };

  console.log(`Kandidat: ${limited.length} (geo=${out._meta.geo}, intent=${out._meta.intent}) | kota=${cities.length} | terlewat duplikat=${dup}`);
  if (opts.dry) {
    console.log('--dry: tidak menulis file. Contoh 5 teratas:');
    for (const x of limited.slice(0, 5)) console.log(`  [${x.source}] ${x.keyword} -> ${x.slug} (p${x.priority})`);
    return;
  }
  writeFileSync(GEO_OUT_PATH, JSON.stringify(out, null, 2) + '\n');
  console.log(`Tulis ${GEO_OUT_PATH.replace(ROOT + '/', '')}. Langkah berikutnya: review + set approved, lalu node seo/geo-expand.mjs --promote`);
}

function promote(opts) {
  if (!existsSync(GEO_OUT_PATH)) {
    console.error('FATAL: seo/keywords.geo.json belum ada. Jalankan --expand dulu.');
    process.exit(1);
  }
  const geo = JSON.parse(readFileSync(GEO_OUT_PATH, 'utf8'));
  const queue = JSON.parse(readFileSync(QUEUE_PATH, 'utf8'));
  const taken = existingKeys(queue);

  const approved = geo.items.filter((x) => x.approved === true);
  if (!geo._meta.approved_at) {
    console.error('FATAL: _meta.approved_at masih kosong. Gate user belum dilepas — isi tanggal approval di keywords.geo.json.');
    process.exit(1);
  }
  if (approved.length < opts.minApproved) {
    console.error(`FATAL: baru ${approved.length} keyword approved, ambang gate ${opts.minApproved}. Tambah approval dulu.`);
    process.exit(1);
  }

  let added = 0;
  let skipped = 0;
  for (const k of approved) {
    if (taken.has(norm(k.keyword))) { skipped++; continue; }
    taken.add(norm(k.keyword));
    queue.items.push({
      keyword: k.keyword,
      priority: k.priority,
      category: k.category,
      status: 'pending',
      slug: k.slug,
      cluster: k.cluster,
      demand_signal: k.demand_signal,
      autocomplete_count: 0,
      kd_estimate: 'low',
      notes: `geo-expand ${new Date().toISOString().slice(0, 10)} (approved ${geo._meta.approved_at})`,
      added_by: k.source === 'geo' ? 'geo' : 'intent',
      city: k.city,
      provinsi: k.provinsi,
      local_anchor: k.local_anchor,
      local_buyer: k.local_buyer,
    });
    k.promoted = true;
    added++;
  }

  if (opts.dry) {
    console.log(`--dry: akan menambah ${added} keyword ke queue (skip duplikat ${skipped}).`);
    return;
  }
  queue._meta.updated = new Date().toISOString().slice(0, 10);
  writeFileSync(QUEUE_PATH, JSON.stringify(queue, null, 2) + '\n');
  writeFileSync(GEO_OUT_PATH, JSON.stringify(geo, null, 2) + '\n');
  console.log(`Promote selesai: +${added} masuk queue (skip duplikat ${skipped}), queue total ${queue.items.length}.`);
}

const opts = parseArgs();
if (opts.promote) promote(opts);
else expand(opts);
