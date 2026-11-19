// Blog hero images — banner pack socio.id (EN) sebagai sumber utama,
// Unsplash hotlink sebagai fallback bila data banner tidak lengkap.
// Banner: render ulang cache pack socio.my via minimax-image/socio_id_pack.py
// (0 request API), aset di landing/public/img/banner/, alt EN dari manifest.
// Mapping slug→banner deterministik: artikel baru dari pipeline SEO harian
// otomatis dapat banner tanpa edit frontmatter MDX.
// Unsplash ID di bawah DIVERIFIKASI manual 30 Sep 2026 (curl 200 + lihat isi foto):
//   ig-icon      1611262588024-d12430b98920  → ikon 3D Instagram (pink/chart)
//   social-apps  1611926653458-09294b3142bf  → folder "Social Media" (IG/YT/Twitter/FB)
//   cash         1553729459-efe14ef6055d     → tangan pegang cash USD (modal/untung)
//   checkout     1556742049-0cfed4f6a45d     → kasir + pembayaran HP (order/cara mulai)
//   analytics    1460925895917-afdab827c52f  → laptop dashboard analitik (definisi)
//   strategy     1533750349088-cd871a92f312  → flatlay "Marketing Strategy" (tips)
//   iphone       1511707171634-5f897ff02aa9  → iPhone aplikasi sosmed (TikTok/umum)
//   coffee       1499750310107-5fef28a66643  → kopi + laptop + catatan (default editorial)
// DITOLAK: 1611162617474 (logo Netflix — salah topik), 1579869847514 (404).

import { BANNERS } from "./blogBanners";

const U = "https://images.unsplash.com/photo-";

const BANNER_URL = "https://socio.id/img/banner";
const BANNER_ALT = new Map(BANNERS.map((b) => [b.base, b.alt]));

// Type valid per platform sesuai manifest pack (20 Nov 2026).
const PLATFORM_TYPES: Record<string, string[]> = {
  youtube: [
    "subscribers",
    "views",
    "watch-hours",
    "live-viewers",
    "likes",
    "comments",
  ],
  tiktok: [
    "followers",
    "likes",
    "views",
    "comments",
    "live-viewers",
    "saves",
    "shares",
  ],
  instagram: [
    "followers",
    "likes",
    "reels-views",
    "comments",
    "story-views",
    "live-viewers",
    "saves",
    "shares",
  ],
  telegram: ["members", "post-views", "reactions", "story-views", "poll-votes"],
  facebook: [
    "followers",
    "page-likes",
    "post-likes",
    "video-views",
    "reels-views",
    "live-viewers",
    "comments",
    "shares",
    "group-members",
  ],
  spotify: ["plays", "followers", "saves"],
  x: ["followers", "likes", "impressions", "replies", "reposts"],
  threads: ["followers", "likes", "reposts"],
  shopee: ["live-viewers", "followers", "likes", "product-views", "reviews"],
  discord: ["members"],
  linkedin: ["followers", "connections", "likes", "comments"],
  twitch: ["live-viewers", "followers"],
  kick: ["live-viewers", "followers"],
  snapchat: ["followers", "story-views"],
  "google-maps": ["reviews"],
  kwai: ["followers", "likes", "views", "live-viewers"],
  likee: ["followers", "likes", "views", "live-viewers"],
  trustpilot: ["reviews"],
  "press-release": ["distribution"],
  "reseller-agent": ["panel"],
};
// Default type bila slug tidak menyebut servis spesifik.
const PLATFORM_DEFAULT: Record<string, string> = {
  youtube: "subscribers",
  telegram: "members",
  spotify: "plays",
  discord: "members",
  "google-maps": "reviews",
  trustpilot: "reviews",
  "press-release": "distribution",
  "reseller-agent": "panel",
};
const PLATFORM_TOKENS: [RegExp, string][] = [
  [/tiktok/, "tiktok"],
  [/instagram|\big\b/, "instagram"],
  [/youtube|subscriber/, "youtube"],
  [/facebook|\bfb\b/, "facebook"],
  [/telegram/, "telegram"],
  [/spotify/, "spotify"],
  [/threads/, "threads"],
  [/discord/, "discord"],
  [/linkedin/, "linkedin"],
  [/twitch/, "twitch"],
  [/kick/, "kick"],
  [/snapchat/, "snapchat"],
  [/kwai/, "kwai"],
  [/likee/, "likee"],
  [/shopee/, "shopee"],
  [/google-maps/, "google-maps"],
  [/trustpilot/, "trustpilot"],
  [/press-release/, "press-release"],
  [/reseller|agen/, "reseller-agent"],
  [/twitter|\bx\b/, "x"],
];
// Urutan penting: token spesifik dulu (reels/story/post-view sebelum views,
// page-like/post-like sebelum likes, reviews sebelum views karena "review"
// mengandung substring "view").
const SERVICE_TOKENS: [RegExp, string][] = [
  [/subscriber/, "subscribers"],
  [/watch-hour/, "watch-hours"],
  [/live/, "live-viewers"],
  [/reels/, "reels-views"],
  [/story/, "story-views"],
  [/post-view/, "post-views"],
  [/video-view/, "video-views"],
  [/product-view/, "product-views"],
  [/review|ulasan/, "reviews"],
  [/view/, "views"],
  [/page-like/, "page-likes"],
  [/post-like/, "post-likes"],
  [/like/, "likes"],
  [/comment|komentar/, "comments"],
  [/group-member/, "group-members"],
  [/member|anggota/, "members"],
  [/connection/, "connections"],
  [/impression/, "impressions"],
  [/repl(y|ies)/, "replies"],
  [/repost/, "reposts"],
  [/share/, "shares"],
  [/save/, "saves"],
  [/reaction/, "reactions"],
  [/poll/, "poll-votes"],
  [/play/, "plays"],
  [/follower/, "followers"],
];

/**
 * Resolve base kandidat ke yang benar-benar ada di pack. Dua platform
 * single-type (press-release, reseller-agent) pakai base = nama platform
 * saja, bukan platform-type; sisanya platform-type. Bila dua-duanya tidak
 * ada, kembalikan full agar heroFor jatuh ke fallback Unsplash (aman).
 */
function resolveBase(plat: string, type: string): string {
  const full = `${plat}-${type}`;
  if (BANNER_ALT.has(full)) return full;
  if (BANNER_ALT.has(plat)) return plat;
  return full;
}

/** Base banner untuk slug artikel; topik & fallback generik = "layanan". */
export function bannerFor(slug: string, category: string): string {
  const s = `${slug} ${category}`.toLowerCase();
  if (/^apa-itu/.test(slug)) return "apa-itu-socio";
  if (/^order-pertama/.test(slug)) return "order-pertama";
  for (const [re, plat] of PLATFORM_TOKENS) {
    if (!re.test(s)) continue;
    const types = PLATFORM_TYPES[plat];
    for (const [sre, type] of SERVICE_TOKENS) {
      if (sre.test(s) && types.includes(type)) return resolveBase(plat, type);
    }
    return resolveBase(plat, PLATFORM_DEFAULT[plat] ?? "followers");
  }
  return "layanan";
}

function url(id: string, w: number) {
  return `${U}${id}?auto=format&fit=crop&w=${w}&q=70`;
}

export interface BlogHero {
  id: string;
  alt: string;
}

const HEROES: Record<string, BlogHero> = {
  "ig-icon": { id: "1611262588024-d12430b98920", alt: "Ikon Instagram 3D" },
  "social-apps": {
    id: "1611926653458-09294b3142bf",
    alt: "Aplikasi media sosial di HP",
  },
  cash: {
    id: "1553729459-efe14ef6055d",
    alt: "Uang tunai hasil jualan followers",
  },
  checkout: { id: "1556742049-0cfed4f6a45d", alt: "Pembayaran order di kasir" },
  analytics: {
    id: "1460925895917-afdab827c52f",
    alt: "Dashboard analitik di laptop",
  },
  strategy: {
    id: "1533750349088-cd871a92f312",
    alt: "Catatan strategi marketing",
  },
  iphone: {
    id: "1511707171634-5f897ff02aa9",
    alt: "iPhone dengan aplikasi sosmed",
  },
  coffee: {
    id: "1499750310107-5fef28a66643",
    alt: "Laptop dan kopi — kerja dari mana saja",
  },
};

function pickKey(slug: string, category: string): keyof typeof HEROES {
  const s = `${slug} ${category}`.toLowerCase();
  // Sudut transaksi/pembayaran dulu (foto kasir), lalu sudut uang
  // (foto cash) — keduanya menang atas platform. Mis. "modal-jualan-followers"
  // = cash, "smm-panel-indonesia" (pembayaran lokal) = checkout.
  if (/(pembayaran|indonesia|daftar|order|checkout|cara-mulai)/.test(s))
    return "checkout";
  if (/(modal|untung|cuan|reseller|bisnis|uang|grosir)/.test(s)) return "cash";
  if (/(instagram|followers|likes|like-|reels|story)/.test(s)) return "ig-icon";
  if (/(youtube|views|subscribers)/.test(s)) return "social-apps";
  if (/(modal|untung|reseller|cuan|uang|harga-grosir|bisnis)/.test(s))
    return "cash";
  if (/(indonesia|pembayaran|daftar|order|checkout|cara-mulai|mulai)/.test(s))
    return "checkout";
  if (/(smm-panel|apa-itu|definisi|panel|api)/.test(s)) return "analytics";
  if (/(tiktok|spotify|telegram|facebook|twitter)/.test(s)) return "iphone";
  if (/(aman|risiko|tips|strategi|bot|refill|turun)/.test(s)) return "strategy";
  return "coffee";
}

/** URL hero (banner 1200x675, fallback Unsplash w=1200) + alt untuk slug artikel. */
export function heroFor(
  slug: string,
  category: string,
): { src: string; alt: string } {
  const b = bannerFor(slug, category);
  if (BANNER_ALT.has(b)) {
    return {
      src: `${BANNER_URL}/hero-${b}-en-1200x675.webp`,
      alt: BANNER_ALT.get(b) as string,
    };
  }
  const h = HEROES[pickKey(slug, category)];
  return { src: url(h.id, 1200), alt: h.alt };
}

/** URL thumbnail (banner 400x210, fallback Unsplash w=400) untuk ledger/related. */
export function thumbFor(
  slug: string,
  category: string,
): { src: string; alt: string } {
  const b = bannerFor(slug, category);
  if (BANNER_ALT.has(b)) {
    return {
      src: `${BANNER_URL}/thumb-${b}-en-400x210.webp`,
      alt: BANNER_ALT.get(b) as string,
    };
  }
  const h = HEROES[pickKey(slug, category)];
  return { src: url(h.id, 400), alt: h.alt };
}

/** URL OG 1200x630 (rasio sosial 1.91:1); null bila jatuh ke fallback Unsplash. */
export function ogFor(slug: string, category: string): string | null {
  const b = bannerFor(slug, category);
  return BANNER_ALT.has(b) ? `${BANNER_URL}/og-${b}-en-1200x630.webp` : null;
}
