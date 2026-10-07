/**
 * Katalog platform & jenis layanan — SINGLE SOURCE OF TRUTH.
 *
 * Dipakai server (/pesan load + endpoint services) DAN client (/pesan page)
 * supaya grouping SELALU konsisten. Murni fungsi string → tidak ada
 * dependency server, aman diimport ke .svelte.
 *
 * Prinsip anti-sampah (PESAN_REVAMP 2026-10-07):
 * - Nama kategori MENTAH provider TIDAK PERNAH tampil di UI. Yang tampil
 *   hanya 11 platform + ~17 jenis di bawah ini.
 * - Platform/jenis dihitung dari NAMA LAYANAN AKTIF (status=1) saat request,
 *   jadi layanan/kategori yang dinonaktifkan HILANG OTOMATIS tanpa kerja manual.
 * - Nama layanan tetap disanitasi whitelabel() seperti sebelumnya.
 */

export type PlatformId =
  | "instagram"
  | "tiktok"
  | "youtube"
  | "facebook"
  | "x"
  | "telegram"
  | "whatsapp"
  | "spotify"
  | "musik"
  | "kwai"
  | "snapchat"
  | "quora"
  | "kick"
  | "twitch"
  | "pinterest"
  | "reddit"
  | "threads"
  | "linkedin"
  | "discord"
  | "bluesky"
  | "xiaohongshu"
  | "trustpilot"
  | "marketplace"
  | "seo"
  | "other";

export interface PlatformDef {
  id: PlatformId;
  /** Label bersih tampil di chip. */
  label: string;
  /** Nama icon di @socio/ui Icon — SETIAP platform WAJIB punya icon sendiri. */
  icon: string;
}

export const PLATFORMS: PlatformDef[] = [
  { id: "instagram", label: "Instagram", icon: "instagram" },
  { id: "tiktok", label: "TikTok", icon: "tiktok" },
  { id: "youtube", label: "YouTube", icon: "youtube" },
  { id: "facebook", label: "Facebook", icon: "facebook" },
  { id: "x", label: "X (Twitter)", icon: "twitter" },
  { id: "telegram", label: "Telegram", icon: "telegram" },
  { id: "whatsapp", label: "WhatsApp", icon: "whatsapp" },
  { id: "spotify", label: "Spotify", icon: "spotify" },
  { id: "musik", label: "Musik", icon: "music" },
  { id: "kwai", label: "Kwai", icon: "play" },
  { id: "snapchat", label: "Snapchat", icon: "ghost" },
  { id: "quora", label: "Quora", icon: "help" },
  { id: "kick", label: "Kick", icon: "zap" },
  { id: "twitch", label: "Twitch", icon: "twitch" },
  { id: "pinterest", label: "Pinterest", icon: "pin" },
  { id: "reddit", label: "Reddit", icon: "reddit" },
  { id: "threads", label: "Threads", icon: "at" },
  { id: "linkedin", label: "LinkedIn", icon: "linkedin" },
  { id: "discord", label: "Discord", icon: "message" },
  { id: "bluesky", label: "Bluesky", icon: "cloud" },
  { id: "xiaohongshu", label: "RedNote", icon: "book" },
  { id: "trustpilot", label: "Trustpilot", icon: "shield" },
  { id: "marketplace", label: "Marketplace", icon: "shopping" },
  { id: "seo", label: "SEO & Web", icon: "globe" },
  { id: "other", label: "Lainnya", icon: "grid" },
];

export const platformById = (id: string): PlatformDef =>
  PLATFORMS.find((p) => p.id === id) ?? PLATFORMS[PLATFORMS.length - 1]!;

/**
 * Deteksi platform dari nama layanan (fallback: nama kategori).
 * URUTAN PENTING — yang spesifik dicek dulu (spotify sebelum musik, dst).
 * Return "other" untuk yang tidak dikenali (masuk bucket Lainnya, bukan hilang).
 */
export function detectPlatform(
  serviceName: string,
  categoryName = "",
): PlatformId {
  const n = `${serviceName} ${categoryName}`.toLowerCase();
  // Platform spesifik dulu — urutan penting agar tidak salah tangkap
  // (mis. 'xiaohongshu' sebelum 'seo', 'shopee' sebelum 'instagram' kalau
  // suatu saat nama mengandung keduanya).
  if (/xiaohongshu|red ?note|小红书/.test(n)) return "xiaohongshu";
  if (/\bsnap ?chat\b/.test(n)) return "snapchat";
  if (/\bquora\b/.test(n)) return "quora";
  if (/\bbluesky\b|\bbsky\b/.test(n)) return "bluesky";
  if (/\bthreads\b/.test(n)) return "threads";
  if (/\breddit\b/.test(n)) return "reddit";
  if (/\btwitch\b/.test(n)) return "twitch";
  if (/\bkick\b/.test(n)) return "kick";
  if (/\bpinterest\b/.test(n)) return "pinterest";
  if (/\blinkedin\b/.test(n)) return "linkedin";
  if (/\bdiscord\b/.test(n)) return "discord";
  if (/trustpilot/.test(n)) return "trustpilot";
  if (
    /\b(shopee|tokopedia|bukalapak|lazada|tiktok ?shop|marketplace|coinmarketcap|coingecko|coinhunt|cryptorank|cryptorival|coin ?price)\b/.test(
      n,
    )
  )
    return "marketplace";
  if (/\b(backlink|\bseo\b|press ?release|website ?traffic|web ?traffic|safe ?link|traffic ?exchange)\b/.test(n))
    return "seo";
  if (/instagram|\binsta\b|\big\b/.test(n)) return "instagram";
  if (/tiktok|tik-?tok|\btt\b/.test(n)) return "tiktok";
  if (/youtube|youtu|\byt\b/.test(n)) return "youtube";
  if (/facebook|\bfb\b/.test(n)) return "facebook";
  if (/twitter|\bx\b/.test(n)) return "x";
  if (/telegram|\btg\b/.test(n)) return "telegram";
  if (/whatsapp|\bwa\b/.test(n)) return "whatsapp";
  if (/spotify/.test(n)) return "spotify";
  if (
    /apple music|audiomack|boomplay|deezer|soundcloud|tidal|shazam|napster|pandora|iheart|anghami|audius|qobuz|jiosaavn|gaana|resso/.test(
      n,
    )
  )
    return "musik";
  if (/kwai/.test(n)) return "kwai";
  return "other";
}

export type KindId =
  | "followers"
  | "likes"
  | "views"
  | "live"
  | "comments"
  | "subscribers"
  | "members"
  | "shares"
  | "reactions"
  | "plays"
  | "reviews"
  | "saves"
  | "impressions"
  | "reach"
  | "watchtime"
  | "traffic"
  | "mentions"
  | "other";

export interface KindDef {
  id: KindId;
  label: string;
  /** Icon per jenis — sama, setiap jenis punya icon sendiri. */
  icon: string;
}

export const KINDS: KindDef[] = [
  { id: "followers", label: "Followers", icon: "user_plus" },
  { id: "likes", label: "Likes", icon: "heart" },
  { id: "views", label: "Views", icon: "eye" },
  { id: "live", label: "Live", icon: "radio" },
  { id: "comments", label: "Comments", icon: "message" },
  { id: "subscribers", label: "Subscribers", icon: "users" },
  { id: "members", label: "Members", icon: "users" },
  { id: "shares", label: "Shares", icon: "share" },
  { id: "reactions", label: "Reactions", icon: "zap" },
  { id: "plays", label: "Plays", icon: "play" },
  { id: "reviews", label: "Reviews", icon: "star" },
  { id: "saves", label: "Saves", icon: "bookmark" },
  { id: "impressions", label: "Impressions", icon: "chart" },
  { id: "reach", label: "Reach", icon: "trending_up" },
  { id: "watchtime", label: "Watch Time", icon: "clock" },
  { id: "traffic", label: "Traffic", icon: "globe" },
  { id: "mentions", label: "Mentions", icon: "hash" },
  { id: "other", label: "Lainnya", icon: "tag" },
];

/** Urutan tampil chip jenis — yang paling laku duluan. */
export const KIND_ORDER: KindId[] = [
  "followers",
  "likes",
  "views",
  "live",
  "comments",
  "subscribers",
  "members",
  "shares",
  "reactions",
  "plays",
  "reviews",
  "saves",
  "impressions",
  "reach",
  "watchtime",
  "traffic",
  "mentions",
  "other",
];

export const kindById = (id: string): KindDef =>
  KINDS.find((k) => k.id === id) ?? KINDS[KINDS.length - 1]!;

/**
 * Deteksi jenis dari nama layanan. Watch time dicek SEBELUM views karena
 * namanya tidak mengandung kata "views". Custom Comments ikut "comments"
 * (ganti cek `type === "Custom Comments"` yang mati — kolom type 99,9% "Default").
 */
export function detectKind(serviceName: string): KindId {
  const n = serviceName.toLowerCase();
  // Live SEBELUM views — "Live Stream Views"/"Live Viewers" itu produk sendiri (700+).
  if (/\blive\b|livestream|live-?stream|stay ?time|concurrent/.test(n)) return "live";
  if (/watch ?time|watch ?hours/.test(n)) return "watchtime";
  if (/follower|following|fans|subscrib/.test(n))
    return /subscrib/.test(n) ? "subscribers" : "followers";
  if (/member/.test(n)) return "members";
  if (/\blikes?\b|dislikes?|hearts?/.test(n)) return "likes";
  if (/views?|viewers?|viewing|live/.test(n)) return "views";
  if (/comment|replies|reply/.test(n)) return "comments";
  if (/shares?|repost|retweet/.test(n)) return "shares";
  if (/reaction|emoji/.test(n)) return "reactions";
  if (/plays?|streams?|listens?/.test(n)) return "plays";
  if (/review|rating|stars?/.test(n)) return "reviews";
  if (/saves?|bookmarks?|collections?/.test(n)) return "saves";
  if (/impressions?/.test(n)) return "impressions";
  if (/\breach\b/.test(n)) return "reach";
  if (/traffic|visits?|clicks?/.test(n)) return "traffic";
  if (/mention|tags?/.test(n)) return "mentions";
  return "other";
}

/** Layanan "komentar custom" (1 baris = 1 qty) — deteksi dari nama, bukan kolom type. */
export function isCustomCommentsService(serviceName: string): boolean {
  return /custom comments?/.test(serviceName.toLowerCase());
}

/**
 * Alias pencarian — kata user → kata katalog. Dipakai search /pesan supaya
 * "livestream", "ig", "pengikut" tetap ketemu ("Live Viewers", "Instagram",
 * "Followers"). Token < 2 char dibuang, maks 4 token (AND semua harus cocok).
 */
export const SEARCH_ALIASES: Record<string, string> = {
  livestream: "live",
  ig: "instagram",
  tt: "tiktok",
  yt: "youtube",
  fb: "facebook",
  tg: "telegram",
  wa: "whatsapp",
  subs: "subscribers",
  sub: "subscribers",
  pengikut: "followers",
  follower: "followers",
  suka: "likes",
  tonton: "views",
  lihat: "views",
  komentar: "comments",
  komen: "comments",
  pelanggan: "subscribers",
  anggota: "members",
  bagikan: "shares",
  ulasan: "reviews",
  simpan: "saves",
};

export function normalizeSearchQuery(q: string): string[] {
  return q
    .toLowerCase()
    .split(/\s+/)
    .map((t) => SEARCH_ALIASES[t] ?? t)
    .filter((t) => t.length >= 2)
    .slice(0, 4);
}

/** Platform kanonik untuk validasi link — SAMA persis dgn string yang
 * dipakai validateLink() di /pesan, supaya perbandingan langsung cocok.
 * Platform tanpa link (WA/Spotify/Musik/...) = string kosong = tidak dicek. */
export const PLATFORM_LINK_NAME: Record<PlatformId, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  facebook: "Facebook",
  x: "X / Twitter",
  telegram: "Telegram",
  whatsapp: "",
  spotify: "",
  musik: "",
  kwai: "",
  snapchat: "",
  quora: "",
  kick: "",
  twitch: "",
  pinterest: "",
  reddit: "",
  threads: "",
  linkedin: "",
  discord: "",
  bluesky: "",
  xiaohongshu: "",
  trustpilot: "",
  marketplace: "",
  seo: "",
  other: "",
};
