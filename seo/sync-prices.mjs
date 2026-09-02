#!/usr/bin/env node
// seo/sync-prices.mjs — pull layanan + harga top dari app DB → landing/src/data/prices.json.
// Dipakai /layanan + money pages /beli-* (jangan hardcode harga di markup).
// Jalankan: node seo/sync-prices.mjs  (opsional SOCIO_DB_* override via env)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const dbHost = process.env.SOCIO_DB_HOST ?? '127.0.0.1';
const dbUser = process.env.SOCIO_DB_USER ?? 'socio_app';
const dbPass = process.env.SOCIO_DB_PASS ?? '';
const dbName = process.env.SOCIO_DB_NAME ?? 'socio_smm';
const OUT = 'landing/src/data/prices.json';

if (!dbPass) {
  console.error('Butuh SOCIO_DB_PASS (lihat app/.env). Contoh: SOCIO_DB_PASS=xxx node seo/sync-prices.mjs');
  process.exit(1);
}

const q = (sql) =>
  execFileSync('mysql', ['-h', dbHost, '-u', dbUser, `-p${dbPass}`, dbName, '-N', '-B', '-e', sql], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  }).toString();

// platform volume (count layanan aktif per platform)
const PLATFORM_SQL = `
SELECT
  CASE
    WHEN service_name LIKE '%Instagram%' THEN 'Instagram'
    WHEN service_name LIKE '%TikTok%' OR service_name LIKE '%Tiktok%' THEN 'TikTok'
    WHEN service_name LIKE '%YouTube%' OR service_name LIKE '%Youtube%' THEN 'YouTube'
    WHEN service_name LIKE '%Facebook%' THEN 'Facebook'
    WHEN service_name LIKE '%Twitter%' THEN 'X/Twitter'
    WHEN service_name LIKE '%Telegram%' THEN 'Telegram'
    WHEN service_name LIKE '%Spotify%' THEN 'Spotify'
    ELSE 'Lainnya'
  END AS platform,
  COUNT(*) AS svc,
  COUNT(DISTINCT category_id) AS cat
FROM services WHERE status=1
GROUP BY platform`;

// top layanan kurasi (nama bersih via GROUP BY prefix, dedup varian duplikat)
const TOP_SQL = `
SELECT MIN(service_name), MIN(price), MIN(price_reseller), MIN(min), MAX(is_refill) FROM services
WHERE status=1 AND (
 (service_name LIKE 'Instagram Followers%' AND price BETWEEN 3000 AND 15000)
 OR (service_name LIKE 'Instagram Likes%' AND price BETWEEN 1000 AND 6000)
 OR (service_name LIKE 'Instagram Video Views%' AND price < 500)
 OR (service_name LIKE 'TikTok Video Views%' AND price BETWEEN 100 AND 1000)
 OR (service_name LIKE 'Tiktok Followers%' AND price BETWEEN 1000 AND 12000)
 OR (service_name LIKE 'TikTok Likes%' AND price BETWEEN 1000 AND 6000)
 OR (service_name LIKE 'Youtube Subscriber%' AND price BETWEEN 2500 AND 12000)
 OR (service_name LIKE 'YouTube Views%' AND price BETWEEN 3000 AND 12000)
 OR (service_name LIKE 'Facebook Followers%' AND price BETWEEN 3000 AND 20000)
 OR (service_name LIKE 'Facebook Page Likes%' AND price BETWEEN 5000 AND 30000)
 OR (service_name LIKE 'Twitter Followers%' AND price BETWEEN 3000 AND 12000)
 OR (service_name LIKE 'Twitter Tweet Views %' AND price < 500)
 OR (service_name LIKE 'Telegram Members%' AND price BETWEEN 500 AND 9000)
 OR (service_name LIKE 'Telegram Post Views%' AND price BETWEEN 30 AND 600)
 OR (service_name LIKE 'Spotify%Plays%' AND price BETWEEN 1000 AND 9000)
 OR (service_name LIKE 'Spotify Followers%' AND price BETWEEN 5000 AND 20000))
GROUP BY SUBSTRING_INDEX(service_name, '|', 1)
ORDER BY MIN(price) ASC`;

function platformOf(name) {
  if (/Instagram|IG /i.test(name)) return 'Instagram';
  if (/TikTok|Tiktok/i.test(name)) return 'TikTok';
  if (/YouTube|Youtube/i.test(name)) return 'YouTube';
  if (/Facebook/i.test(name)) return 'Facebook';
  if (/Twitter/i.test(name)) return 'X/Twitter';
  if (/Telegram/i.test(name)) return 'Telegram';
  if (/Spotify/i.test(name)) return 'Spotify';
  return 'Lainnya';
}

// bersihkan nama layanan: buang part setelah '|' pertama + emoji + noise
function cleanName(raw) {
  let n = raw.split('|')[0].trim();
  n = n.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}\u{20E3}]/gu, '');
  n = n.replace(/\[.*?\]/g, '').replace(/\s{2,}/g, ' ').trim();
  n = n.replace(/[\u{1D400}-\u{1D7FF}%]/gu, '');
  n = n.replace(/   +/g, ' ').trim();
  return n;
}

const platforms = {};
for (const line of q(PLATFORM_SQL).trim().split('\n')) {
  const [p, svc, cat] = line.split('\t');
  platforms[p] = { services: Number(svc), categories: Number(cat) };
}

const top = [];
const seen = new Set();
for (const line of q(TOP_SQL).trim().split('\n')) {
  const [raw, price, pres, min, refill] = line.split('\t');
  const name = cleanName(raw);
  const platform = platformOf(raw);
  const key = platform + '|' + name.toLowerCase();
  if (seen.has(key)) continue;
  seen.add(key);
  top.push({
    platform,
    name,
    price: Number(price),
    priceReseller: Number(pres),
    min: Number(min),
    refill: refill === '1',
  });
}

const data = {
  syncedAt: new Date().toISOString(),
  totalServices: Object.values(platforms).reduce((a, p) => a + p.services, 0),
  totalCategories: 882,
  platforms,
  top,
};

mkdirSync('landing/src/data', { recursive: true });
writeFileSync(OUT, JSON.stringify(data, null, 2) + '\n');
console.log(`OK — ${top.length} layanan top, ${Object.keys(platforms).length} platform → ${OUT}`);
