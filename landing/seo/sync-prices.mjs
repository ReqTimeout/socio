#!/usr/bin/env node
/**
 * seo/sync-prices.mjs — pull katalog live (app DB prod) → landing/src/data/prices.json
 *
 * Cara pakai:  node seo/sync-prices.mjs   (butuh akses ssh root@130.254.47.93)
 * Output:     landing/src/data/prices.json { syncedAt, totalServices, totalCategories,
 *               platforms{...}, top[14] }
 *
 * - Hanya layanan AKTIF provider 2 (SMMturk). Harga = price (Member) + priceReseller real.
 * - Platform dari prefix nama kategori; sisanya "Lainnya".
 * - top: 2 termurah per platform prioritas (X, Telegram, IG, TikTok, YT, FB, Spotify),
 *   nama pendek (sebelum "[" atau "|").
 */
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const SSH = "root@130.254.47.93";
const MYSQL =
  "docker exec -i rebicrj57r3afbg9knieq9ks mysql -usocio -p58a16bc8693d12038b34c4e1c189b9fa socio_smm -N -e";

function q(sql) {
  const out = execSync(`ssh ${SSH} "${MYSQL} \\"${sql}\\""`, {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  return out
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => l.split("\t"));
}

const PLATFORMS = ["Instagram", "TikTok", "YouTube", "Facebook", "Twitter", "Telegram", "Spotify"];

function platformOf(cat) {
  const c = cat.toLowerCase();
  if (c.startsWith("instagram") || c.startsWith("ig ")) return "Instagram";
  if (c.startsWith("tiktok") || c.startsWith("tik tok") || c.startsWith("tt ")) return "TikTok";
  if (c.startsWith("youtube") || c.startsWith("yt ")) return "YouTube";
  if (c.startsWith("facebook") || c.startsWith("fb ")) return "Facebook";
  if (c.startsWith("twitter") || c.startsWith(" x ") || c === "x" || c.startsWith("x ")) return "Twitter";
  if (c.startsWith("telegram") || c.startsWith("tg ")) return "Telegram";
  if (c.startsWith("spotify")) return "Spotify";
  return "Lainnya";
}

function shortName(name) {
  return name
    .split("[")[0]
    .split("|")[0]
    .replace(/[^\p{L}\p{N}\s./+-]/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 60);
}

// 1. Kategori + jumlah layanan aktif
const catRows = q(
  "SELECT c.name, COUNT(s.id) FROM categories c JOIN services s ON s.category_id=c.id AND s.status=1 AND s.provider_id=2 GROUP BY c.name",
);
const platforms = {};
for (const p of [...PLATFORMS, "Lainnya"]) platforms[p] = { services: 0, categories: 0 };
for (const [name, cnt] of catRows) {
  const p = platformOf(name || "");
  platforms[p].services += Number(cnt);
  platforms[p].categories += 1;
}
const totalServices = Object.values(platforms).reduce((a, p) => a + p.services, 0);
const totalCategories = Object.values(platforms).reduce((a, p) => a + p.categories, 0);

// 2. Top termurah per platform prioritas (2 per platform → 14)
const prio = ["Twitter", "Telegram", "Instagram", "TikTok", "YouTube", "Facebook", "Spotify"];
const top = [];
const seen = new Set();
for (const p of prio) {
  const like = p === "Twitter" ? "twitter%') OR c.name LIKE ('x %" : `${p}%`;
  const rows = q(
    `SELECT s.service_name, s.price, s.price_reseller, s.min, s.is_refill FROM services s JOIN categories c ON c.id=s.category_id WHERE s.status=1 AND s.provider_id=2 AND (c.name LIKE '${like}') ORDER BY s.price ASC LIMIT 6`,
  );
  for (const [name, price, priceReseller, min, refill] of rows) {
    const short = shortName(name || "");
    const key = `${p}|${short}`;
    if (seen.has(key)) continue;
    seen.add(key);
    top.push({
      platform: p === "Twitter" ? "X/Twitter" : p,
      name: short,
      price: Math.round(Number(price)),
      priceReseller: Math.round(Number(priceReseller)),
      min: Number(min),
      refill: refill === "1",
    });
    if (top.filter((t) => t.platform === (p === "Twitter" ? "X/Twitter" : p)).length >= 2) break;
  }
}

const out = {
  syncedAt: new Date().toISOString(),
  totalServices,
  totalCategories,
  platforms: Object.fromEntries(
    [...PLATFORMS.map((p) => (p === "Twitter" ? "X/Twitter" : p)), "Lainnya"].map((k) => [
      k,
      platforms[k === "X/Twitter" ? "Twitter" : k],
    ]),
  ),
  top: top.slice(0, 14),
};

const dir = dirname(fileURLToPath(import.meta.url));
writeFileSync(join(dir, "..", "src", "data", "prices.json"), JSON.stringify(out, null, 2) + "\n");
console.log(`prices.json: ${totalServices} layanan / ${totalCategories} kategori / top ${out.top.length}`);
