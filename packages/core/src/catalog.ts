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
  /** Brand color hex — dipakai untuk tint icon/swatch di UI. */
  color: string;
}

export const PLATFORMS: PlatformDef[] = [
  { id: "instagram", label: "Instagram", icon: "instagram", color: "#E1306C" },
  { id: "tiktok", label: "TikTok", icon: "tiktok", color: "#010101" },
  { id: "youtube", label: "YouTube", icon: "youtube", color: "#FF0000" },
  { id: "facebook", label: "Facebook", icon: "facebook", color: "#1877F2" },
  { id: "x", label: "X (Twitter)", icon: "twitter", color: "#000000" },
  { id: "telegram", label: "Telegram", icon: "telegram", color: "#229ED9" },
  { id: "whatsapp", label: "WhatsApp", icon: "whatsapp", color: "#25D366" },
  { id: "spotify", label: "Spotify", icon: "spotify", color: "#1DB954" },
  { id: "musik", label: "Musik", icon: "music", color: "#A855F7" },
  { id: "kwai", label: "Kwai", icon: "play", color: "#FF6600" },
  { id: "snapchat", label: "Snapchat", icon: "ghost", color: "#FFFC00" },
  { id: "quora", label: "Quora", icon: "help", color: "#B92B27" },
  { id: "kick", label: "Kick", icon: "zap", color: "#53FC18" },
  { id: "twitch", label: "Twitch", icon: "twitch", color: "#9146FF" },
  { id: "pinterest", label: "Pinterest", icon: "pin", color: "#E60023" },
  { id: "reddit", label: "Reddit", icon: "reddit", color: "#FF4500" },
  { id: "threads", label: "Threads", icon: "at", color: "#000000" },
  { id: "linkedin", label: "LinkedIn", icon: "linkedin", color: "#0A66C2" },
  { id: "discord", label: "Discord", icon: "message", color: "#5865F2" },
  { id: "bluesky", label: "Bluesky", icon: "cloud", color: "#1185FE" },
  { id: "xiaohongshu", label: "RedNote", icon: "book", color: "#FE2C55" },
  { id: "trustpilot", label: "Trustpilot", icon: "shield", color: "#00B67A" },
  { id: "marketplace", label: "Marketplace", icon: "shopping", color: "#F59E0B" },
  { id: "seo", label: "SEO & Web", icon: "globe", color: "#0891B2" },
  { id: "other", label: "Lainnya", icon: "grid", color: "#6B7280" },
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
  /**
   * Warna identitas jenis (port B2 .my Okt-2026, kalibrasi ulang dari DNA
   * Sparko) — hex literal karena dipakai di catalog murni (tanpa CSS).
   * Nilai = token `packages/ui/src/tokens.css` .id: primary-600..800,
   * sky/cyan Tailwind, mango-600..800, danger-700, success-700, ink-600.
   * Semua tone ≥ AA 4.5:1 vs putih supaya teks idle kebaca, dan solid
   * background saat selected (teks putih ≥ AA juga).
   */
  tint: string;
}

export const KINDS: KindDef[] = [
  // ── Audience growth (indigo brand) ──
  { id: "followers", label: "Followers", icon: "user_plus", tint: "#4f46e5" }, // primary-600 7.1:1
  { id: "subscribers", label: "Subscribers", icon: "users", tint: "#4338ca" }, // primary-700 8.6:1
  { id: "members", label: "Members", icon: "users", tint: "#3730a3" }, // primary-800 11.5:1
  { id: "mentions", label: "Mentions", icon: "hash", tint: "#1d4ed8" }, // blue-700 8.3:1
  // ── Reach / view count (Sky = Sparko brand action) ──
  { id: "views", label: "Views", icon: "eye", tint: "#0284c7" }, // sky-600 sparko-sky-deep
  { id: "plays", label: "Plays", icon: "play", tint: "#0369a1" }, // sky-700
  { id: "impressions", label: "Impressions", icon: "chart", tint: "#075985" }, // sky-800
  { id: "reach", label: "Reach", icon: "trending_up", tint: "#0c4a6e" }, // sky-900
  // ── Media dwell (Cyan = Sparko accent) ──
  { id: "watchtime", label: "Watch Time", icon: "clock", tint: "#0e7490" }, // cyan-700
  { id: "traffic", label: "Traffic", icon: "globe", tint: "#155e75" }, // cyan-800
  // ── Engagement (Mango = Sparko sparkle) ──
  { id: "likes", label: "Likes", icon: "heart", tint: "#b98600" }, // mango-600 5.8:1
  { id: "reactions", label: "Reactions", icon: "zap", tint: "#8a6300" }, // mango-700 5.4:1
  { id: "comments", label: "Comments", icon: "message", tint: "#5c4300" }, // mango-800 8.5:1
  { id: "saves", label: "Saves", icon: "bookmark", tint: "#a16207" }, // yellow-700 (warm variant)
  { id: "reviews", label: "Reviews", icon: "star", tint: "#ca8a04" }, // yellow-600 (warm brighter)
  // ── Urgent / Live (Berry = Sparko danger) ──
  { id: "live", label: "Live", icon: "radio", tint: "#b91c1c" }, // red-700 (sparko-berry dark)
  // ── Spread / Success (Emerald = Sparko success) ──
  { id: "shares", label: "Shares", icon: "share", tint: "#047857" }, // success-700
  // ── Netral (Ink/Slate) ──
  { id: "other", label: "Lainnya", icon: "tag", tint: "#334155" }, // ink-600 .id (#475569 dipergelap di token .id)
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

/** ── Bentuk link per jenis (port B1 socio.my 30 Okt 2026) ──
 * followers/subscribers/members → link PROFIL/akun; jenis lain → link
 * POSTINGAN/video/uttusan. Dipakai linkExample() + helper teks di form pesan. */
export type LinkShape = "profile" | "post";
export function linkShapeForKind(kind: KindId | ""): LinkShape {
  return kind === "followers" || kind === "subscribers" || kind === "members"
    ? "profile"
    : "post";
}

/**
 * CONTOH URL placeholder per platform × bentuk link. Di sini (bukan copy/i18n)
 * karena URL bersifat universal — bukan teks terjemahan. Hanya 6 platform yang
 * divalidasi validateLink(); platform lain → "" (form jatuh ke fallback
 * placeholderByPlatform yang sudah ada). "" juga dipakai saat platform/jenis
 * belum jelas. Tanpa keterangan berbahasa (parenthetical) — netral.
 */
const LINK_EXAMPLES: Partial<Record<PlatformId, { profile: string; post: string }>> = {
  instagram: {
    profile: "https://instagram.com/username",
    post: "https://instagram.com/p/xxxxx",
  },
  tiktok: {
    profile: "https://tiktok.com/@username",
    post: "https://tiktok.com/@username/video/xxxxx",
  },
  youtube: {
    profile: "https://youtube.com/@channelname",
    post: "https://youtube.com/watch?v=xxxxx",
  },
  facebook: {
    profile: "https://facebook.com/username",
    post: "https://facebook.com/username/posts/xxxxx",
  },
  x: {
    profile: "https://x.com/username",
    post: "https://x.com/username/status/xxxxx",
  },
  telegram: {
    profile: "https://t.me/channelname",
    post: "https://t.me/channelname/123",
  },
};

/** Contoh placeholder pintar: URL panutan sesuai platform + jenis layanan.
 *  Return "" bila platform tak dikenal / jenis belum diketahui → pemanggil
 *  memakai fallback. Bentuk (profile vs post) dari linkShapeForKind. */
export function linkExample(platform: PlatformId | "", kind: KindId | ""): string {
  if (!platform || !kind) return "";
  const ex = LINK_EXAMPLES[platform];
  if (!ex) return "";
  return ex[linkShapeForKind(kind)];
}
