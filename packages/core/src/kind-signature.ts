/**
 * kind-signature.ts — signature "jenis layanan" dari nama kategori.
 *
 * Dipakai bersama oleh:
 *   - UI routing admin ($lib/server/category-routing) untuk menggolongkan
 *     kategori (followers/likes/views/comments/live/…) supaya owner bisa
 *     filter "kind" yang sama lintas provider.
 *   - Generator aktivasi routing (skrip di luar repo) untuk menentukan
 *     kategori SMMturk yang "covered" oleh SMMfollows atau tidak.
 *
 * Nama kategori dua provider TIDAK identik, jadi pemetaan lewat signature
 * (platform, kind) yang dinormalisasi — bukan string-match. Prioritas cek
 * penting: "live" diperiksa sebelum "views" agar "Live Stream Views" tidak
 * salah dikira views biasa; dst.
 */

export type ServiceKind =
  | "live"
  | "watchtime"
  | "comments"
  | "followers"
  | "subscribers"
  | "likes"
  | "views"
  | "shares"
  | "sound"
  | "generic";

export function kindOf(name: string): ServiceKind {
  const t =
    " " +
    (name || "")
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .replace(/\s+/g, " ") +
    " ";
  const has = (k: string): boolean => t.includes(" " + k + " ") || t.includes(k);
  if (has("live stream") || has("livestream") || has(" live ")) return "live";
  if (has("watchtime") || has("watch time")) return "watchtime";
  if (has("comment")) return "comments";
  if (has("follower")) return "followers";
  if (has("subscriber")) return "subscribers";
  if (has("like")) return "likes";
  if (has("view")) return "views";
  if (has("share")) return "shares";
  if (has("sound") || has("music")) return "sound";
  return "generic";
}

export const KIND_ORDER: ServiceKind[] = [
  "followers",
  "likes",
  "views",
  "comments",
  "live",
  "watchtime",
  "subscribers",
  "shares",
  "sound",
  "generic",
];

/**
 * Platform dari nama kategori. null = tidak dikenal → aturan apa pun yang
 * memakai signature ini WAJIB diam (jangan menebak).
 */
const PLATFORMS = [
  "tiktok",
  "instagram",
  "youtube",
  "facebook",
  "telegram",
  "whatsapp",
  "twitter",
  "spotify",
  "snapchat",
  "kwai",
  "linkedin",
  "soundcloud",
  "discord",
  "twitch",
  "kick",
  "reddit",
  "pinterest",
  "threads",
  "messenger",
];

export function platformOf(name: string): string | null {
  const t =
    " " +
    (name || "")
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .replace(/\s+/g, " ") +
    " ";
  for (const p of PLATFORMS) if (t.includes(p)) return p;
  return null;
}

/**
 * Signature "(platform, kind)" satu nama kategori, mis. "tiktok|likes".
 * null bila platform tidak dikenal ATAU kind-nya "generic" — sengaja: generic
 * terlalu kasar (TikTok Coins / Ads / Emergency Server akan ikut tersapu hanya
 * karena ada satu kategori routed bernama samar). Aturan anti-bocor routing
 * (service-sync) hanya bisa menyala untuk kind spesifik.
 */
export function kindSignature(name: string): string | null {
  const platform = platformOf(name);
  if (!platform) return null;
  const kind = kindOf(name);
  if (kind === "generic") return null;
  return `${platform}|${kind}`;
}
