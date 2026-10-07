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
  { id: "other", label: "Lainnya", icon: "globe" },
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
  if (
    /xiaohongshu|rednote|bluesky|bsky|shopee|tokopedia|bukalapak|lazada|backlink|\bseo\b|press release|coingecko|coinmarketcap|trustpilot|website|traffic exchange/.test(
      n,
    )
  )
    return "other";
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
 * Platform kanonik untuk validasi link — SAMA persis dgn string yang
 * dipakai validateLink() di /pesan, supaya perbandingan langsung cocok.
 */
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
  other: "",
};
