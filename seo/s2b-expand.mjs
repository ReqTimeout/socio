#!/usr/bin/env node
/**
 * S2b-expand.mjs — ekspansi keyword dari katalog + autocomplete depth-2.
 * Hemat token: 0 AI, hanya Google Suggest (free).
 */

import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = '/Users/maabook/Desktop/socio.id';
const PRICES = JSON.parse(readFileSync(`${ROOT}/landing/src/data/prices.json`, 'utf8'));
const QUEUE = JSON.parse(readFileSync(`${ROOT}/seo/queue.json`, 'utf8'));
const DRY = process.argv.includes('--dry');

// ===== Helpers =====
function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

async function suggest(q, hl = 'id') {
  try {
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&hl=${hl}&q=${encodeURIComponent(q)}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return [];
    const d = await r.json();
    return Array.isArray(d[1]) ? d[1].filter((s) => s.toLowerCase() !== q.toLowerCase()) : [];
  } catch {
    return [];
  }
}

function clusterOf(s) {
  for (const pf of ['instagram', 'tiktok', 'youtube', 'telegram', 'facebook', 'twitter', 'spotify']) {
    if (s.includes(pf)) return pf;
  }
  if (s.includes('live') || s.includes('streaming')) return 'live';
  if (s.includes('story') || s.includes('reels')) return 'story';
  if (s.includes('komentar') || s.includes('comment')) return 'komentar';
  if (s.includes('smm') || s.includes('panel')) return 'smm-panel';
  return 'lainnya';
}

const PREFIX_COMMERCIAL = ['beli', 'jasa', 'order'];
const SUFFIX_COMMERCIAL = ['murah', 'aman', 'gratis'];
const ACTION_VERBS = ['tambah', 'naikkan', 'dapatkan', 'cara', 'beli', 'jasa', 'order', 'cari', 'pesan', 'suntik', 'isi', 'lihat', 'cek'];

// Normalize service name dari prices.top[].name ke search-intent stem.
// Contoh:
//   "Instagram Followers" → "followers instagram"
//   "TikTok Video Views" → "video views tiktok"
//   "Youtube Subscriber" → "subscriber youtube"
function normalizeServiceName(name, platform) {
  let n = name
    .toLowerCase()
    .replace(/\bpaling murah\b/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/[\\/]/g, ' ')
    .trim();
  const words = n.split(/\s+/).filter(Boolean);
  // Heuristik: kalau kata pertama SAMA dengan platform (atau subset), reverse
  const platformWords = platform.toLowerCase().split(/[\s\\/]+/).filter(Boolean);
  const firstIsPlatform = platformWords.some((pw) => pw === words[0] || words[0].startsWith(pw) || pw.startsWith(words[0]));
  if (firstIsPlatform && words.length > 1) {
    // Reverse: "instagram followers" → "followers instagram"
    return [words.slice(1).join(' '), words[0]].join(' ');
  }
  return n;
}

function isNoDouble(kw) {
  const words = kw.split(/\s+/);
  const PREFIX = ['beli', 'jasa', 'order'];
  const SUFFIX = ['murah', 'aman', 'gratis', '1k', '1000', 'reseller', 'terpercaya'];
  // Skip kalau 2+ prefix words BERURUTAN di awal frasa ("beli beli", "jasa jasa", "beli jasa live")
  if (words.length >= 2 && PREFIX.includes(words[0]) && PREFIX.includes(words[1])) return false;
  // Duplicate prefix anywhere
  const seenPrefix = new Set();
  for (const w of words) {
    if (PREFIX.includes(w)) {
      if (seenPrefix.has(w)) return false;
      seenPrefix.add(w);
    }
  }
  // Duplicate suffix
  const seenSuffix = new Set();
  for (const w of words) {
    if (SUFFIX.includes(w)) {
      if (seenSuffix.has(w)) return false;
      seenSuffix.add(w);
    }
  }
  return true;
}

function shouldSkipPrefix(base) {
  // Skip kalau base starts with action verb (avoid "beli tambah X")
  const first = base.split(/\s+/)[0];
  return ACTION_VERBS.includes(first);
}

// Service base: normalize dari prices.top
const SERVICE_BASE = PRICES.top.map((s) => normalizeServiceName(s.name, s.platform)).filter(Boolean);

// Manual curated untuk layanan LIVE/viewers/comments/story/reels/spotify/twitter/facebook
// yang TIDAK di top14 tapi volume tinggi (kritik user: ekspansi keyword dari katalog + intent variants).
const EXTRA_BASES = [
  // TikTok LIVE
  'live viewers tiktok', 'viewers tiktok live', 'live streaming tiktok',
  'tiktok live viewers', 'penonton live tiktok', 'jasa live tiktok',
  'jasa viewers tiktok', 'jasa live streaming tiktok',
  'beli viewers tiktok', 'beli live viewers tiktok',
  // YouTube LIVE
  'live viewers youtube', 'viewers youtube live', 'live streaming youtube',
  'jasa live youtube', 'jasa viewers youtube live',
  'beli viewers youtube live', 'beli live viewers youtube',
  // Instagram LIVE
  'live viewers instagram', 'viewers instagram live', 'jasa live instagram',
  // Comments
  'komentar tiktok', 'komentar youtube', 'komentar instagram',
  'beli komentar tiktok', 'beli komentar youtube', 'beli komentar instagram',
  'jasa komentar tiktok', 'jasa komentar youtube',
  // Story / Reels
  'story views instagram', 'story viewers instagram',
  'beli story views instagram', 'beli story viewers',
  'reels views instagram', 'reels plays instagram', 'reels likes instagram',
  'beli reels views', 'beli reels likes', 'beli reels plays',
  'jasa reels views instagram',
  // Spotify
  'spotify plays', 'spotify streams', 'spotify listeners',
  'beli spotify plays', 'beli spotify streams', 'beli spotify listeners',
  'jasa spotify plays', 'jasa spotify streams',
  // Twitter / X
  'retweet twitter', 'likes twitter', 'tweet views twitter',
  'beli retweet twitter', 'beli likes twitter', 'beli tweet views',
  'jasa retweet twitter', 'jasa likes twitter',
  // Facebook
  'share facebook', 'page likes facebook', 'post reach facebook',
  'beli share facebook', 'beli page likes facebook', 'jasa share facebook',
  // AEO smm panel
  'smm panel termurah', 'smm panel terbaik', 'smm panel murah',
  'cheapest smm panel', 'best smm panel for resellers',
];

const allBases = [...new Set([...SERVICE_BASE, ...EXTRA_BASES])].filter(Boolean);

// ===== Build candidates =====
const candidates = [];

for (const base of allBases) {
  // Plain head term
  if (isNoDouble(base)) candidates.push({ kw: base, prio: 85, cat: 'howto' });
  // PREFIX × BASE (skip kalau base starts with action verb)
  if (!shouldSkipPrefix(base)) {
    for (const p of PREFIX_COMMERCIAL) {
      const kw = `${p} ${base}`;
      if (isNoDouble(kw)) candidates.push({ kw, prio: 85, cat: 'howto' });
      // PREFIX × BASE × SUFFIX
      for (const s of SUFFIX_COMMERCIAL) {
        const kw2 = `${p} ${base} ${s}`;
        if (isNoDouble(kw2)) candidates.push({ kw: kw2, prio: 80, cat: 'howto' });
      }
    }
  }
}

// AEO platform variants
for (const pf of ['instagram', 'tiktok', 'youtube', 'telegram', 'facebook']) {
  for (const k of [`cara menambah followers ${pf}`, `beli followers ${pf}`, `tambah followers ${pf}`]) {
    if (isNoDouble(k)) candidates.push({ kw: k, prio: 85, cat: 'howto' });
  }
}

// ===== Autocomplete depth-1 + depth-2 =====
const AUTOCOMPLETE_SEEDS = [
  'jasa view live tiktok', 'jasa viewers tiktok', 'jasa live tiktok',
  'view live tiktok', 'live viewers tiktok', 'viewers tiktok live',
  'beli viewers tiktok', 'beli live viewers tiktok',
  'beli komentar tiktok', 'beli komentar youtube',
  'beli story views instagram', 'beli reels views',
  'beli spotify plays', 'beli followers spotify', 'beli retweet twitter',
  'beli share facebook', 'beli reels likes',
  'jasa reels views', 'live streaming tiktok',
];

async function expandAllSeeds() {
  const out = [];
  for (const seed of AUTOCOMPLETE_SEEDS) {
    const sgs = await suggest(seed);
    out.push(...sgs);
    for (const sg of sgs.slice(0, 2)) {
      const sgs2 = await suggest(sg);
      out.push(...sgs2);
    }
  }
  return out;
}

async function main() {
  console.log('Fetching autocomplete suggestions (depth 1+2)...');
  const suggsAll = await expandAllSeeds();
  console.log(`Got ${suggsAll.length} raw suggs`);

  // Merge candidates + suggs
  const existingKw = new Set(QUEUE.items.map((i) => i.keyword.toLowerCase()));
  const seen = new Set();
  const merged = [];

  function add(kw, prio, cat, addedBy, notes) {
    const k = kw.toLowerCase().trim();
    if (seen.has(k) || existingKw.has(k)) return;
    if (k.length < 4 || k.length > 90) return;
    if (!isNoDouble(k)) return;
    seen.add(k);
    merged.push({
      keyword: kw,
      priority: prio,
      category: cat,
      status: 'pending',
      slug: slugify(kw),
      cluster: clusterOf(kw),
      demand_signal: 'medium',
      autocomplete_count: 0,
      kd_estimate: prio >= 85 ? 'medium' : 'low',
      notes,
      added_by: addedBy,
    });
  }

  for (const c of candidates) {
    add(c.kw, c.prio, c.cat, 'katalog', 'auto-expand dari katalog prices.json');
  }
  for (const sg of suggsAll) {
    add(sg, 80, 'howto', 'autocomplete', 'auto dari Google Suggest ID');
  }

  // Demand check ALL merged (max ~1000). Higher prio = more important to validate.
  const TOP_TO_CHECK = merged.filter((x) => x.priority >= 80).slice(0, 250);
  console.log(`Demand-check ${TOP_TO_CHECK.length} keywords via Google Suggest...`);
  for (const item of TOP_TO_CHECK) {
    const sgs = await suggest(item.keyword);
    item.autocomplete_count = sgs.length;
    item.demand_signal = sgs.length >= 6 ? 'high' : sgs.length >= 3 ? 'medium' : sgs.length >= 1 ? 'low' : 'aeo';
  }

  // Sort by composite + cap at 150 (spec §0)
  const MAX_NEW = 150;
  const w = { high: 4, medium: 3, aeo: 2, low: 1 };
  merged.sort((a, b) => (b.priority + w[b.demand_signal] * 5) - (a.priority + w[a.demand_signal] * 5));
  const final = merged.slice(0, MAX_NEW);

  console.log(`\nMerged: ${merged.length} → final (cap ${MAX_NEW}): ${final.length}`);

  const byCluster = {};
  for (const f of final) byCluster[f.cluster] = (byCluster[f.cluster] || 0) + 1;
  console.log('By cluster:', byCluster);

  // LIVE/viewers count
  const liveCount = final.filter((x) => x.keyword.match(/live|viewers|komentar|reels|story|share|spotify plays|spotify streams|retweet|tweet views|page likes/)).length;
  console.log(`LIVE/secondary intent: ${liveCount} of ${final.length}`);

  // Show top 50
  console.log('\n=== Top 50 (sorted composite DESC) ===');
  for (const item of final.slice(0, 50)) {
    console.log(`  p${item.priority} ${item.demand_signal.padEnd(6)} ${String(item.autocomplete_count).padStart(2)}s ${item.keyword}`);
  }

  if (!DRY) {
    QUEUE.items = [...QUEUE.items, ...final];
    QUEUE._meta.updated = new Date().toISOString().slice(0, 10);
    const stats = {
      seed: QUEUE.items.filter((i) => i.added_by === 'seed').length,
      autocomplete: QUEUE.items.filter((i) => i.added_by === 'autocomplete').length,
      katalog: QUEUE.items.filter((i) => i.added_by === 'katalog').length,
      gsc: QUEUE.items.filter((i) => i.added_by === 'gsc').length,
    };
    QUEUE._meta.note = `${QUEUE.items.length} keyword total (${stats.seed} seed + ${stats.autocomplete} autocomplete + ${stats.katalog} katalog-expand + ${stats.gsc} gsc). Target fase1 150-300 (spec §0). Update: tambah ekspansi LIVE/viewers/comments/story/reels/spotify/twitter/fb dari prices.json top14 + EXTRA_BASES manual kurasi (koreksi kritik user).`;
    writeFileSync(`${ROOT}/seo/queue.json`, JSON.stringify(QUEUE, null, 2) + '\n');
    console.log(`\nWrote seo/queue.json: total ${QUEUE.items.length} items`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});