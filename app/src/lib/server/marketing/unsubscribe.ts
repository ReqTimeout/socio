/**
 * G1 lifecycle — token unsubscribe satu-klik (RFC 8058) untuk email MARKETING.
 *
 * Token = `${b64url(email)}.${b64url(campaignKey)}.${sig}` dengan
 * `sig = HMAC-SHA256(SOCIO_AUTH_SECRET, "${b64url(email)}.${b64url(campaignKey)}")`.
 * Payload di-base64url agar email dapat dipulihkan TANPA login — halaman /u
 * tidak tahu siapa pemilik email, token itu sendiri yang membuktikannya. `sig`
 * membuatnya tamper-evident (tidak bisa dipalsukan/diubah siapa pun).
 *
 * Dua URL memakai TOKEN yang sama, beda path prefix:
 *  - manusia (footer):   https://app.socio.id/u/<token>       → halaman konfirmasi (CSRF)
 *  - one-click (header): https://app.socio.id/api/u/<token>   → POST RFC 8058, langsung opt-out
 */
import { createHmac, timingSafeEqual } from "node:crypto";

/** Kunci default untuk kampanye/otomasi marketing (unsubscribe berlaku global, bukan per email). BUKAN rahasia — label payload saja. */
export const DEFAULT_MARKETING_KEY = "marketing";

/** Base URL app (sama dgn render.emailAbsoluteUrl). */
function appBase(): string {
  return (process.env.SOCIO_APP_URL ?? "https://app.socio.id").replace(/\/+$/, "");
}

const secret = (): string => {
  // Fail-fast (pola L3 .my Okt-2026, CWE-798): token unsubscribe hidup di route
  // publik tanpa-login — tanda tangan dengan fallback dev diam-diam bisa
  // dipalsukan siapa pun yang tahu string tetapannya. Produksi WAJIB
  // SOCIO_AUTH_SECRET nyata (≥16 char); selftest set env sendiri sebelum import.
  const s = process.env.SOCIO_AUTH_SECRET?.trim();
  if (!s || s.length < 16) {
    throw new Error("SOCIO_AUTH_SECRET missing/too short — unsubscribe token refused");
  }
  return s;
};

const b64 = (s: string): string => Buffer.from(s, "utf8").toString("base64url");
const unb64 = (s: string): string => Buffer.from(s, "base64url").toString("utf8");

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

/** Bangun `<payload>.<sig>` — bagian setelah `/u/`. Tidak expose email mentah. */
export function buildUnsubscribeToken(email: string, campaignKey = DEFAULT_MARKETING_KEY): string {
  const payload = `${b64(email.trim().toLowerCase())}.${b64(campaignKey)}`;
  return `${payload}.${sign(payload)}`;
}

/** URL halaman konfirmasi unsubscribe (manusia klik dari footer email). */
export function buildUnsubscribeUrl(email: string, campaignKey = DEFAULT_MARKETING_KEY): string {
  return `${appBase()}/u/${buildUnsubscribeToken(email, campaignKey)}`;
}

/**
 * URL endpoint one-click RFC 8058 — dipakai di header `List-Unsubscribe`
 * (bersama mailto) + `List-Unsubscribe-Post`. Client mail dapat mengirim POST
 * otomatis tanpa user menyentuh apa pun.
 */
export function buildOneClickUrl(email: string, campaignKey = DEFAULT_MARKETING_KEY): string {
  return `${appBase()}/api/u/${buildUnsubscribeToken(email, campaignKey)}`;
}

export interface UnsubscribePayload {
  email: string;
  campaignKey: string;
}

/**
 * Verifikasi token → payload {email, campaignKey}, atau null bila cacat/
 * kedaluwarsa format/salah tanda tangan. Timing-safe perbandingan `sig`.
 */
export function verifyUnsubscribeToken(token: string): UnsubscribePayload | null {
  const parts = String(token ?? "").split(".");
  if (parts.length !== 3) return null;
  const [emailB64, keyB64, sig] = parts;
  if (!emailB64 || !keyB64 || !sig) return null;
  const expected = sign(`${emailB64}.${keyB64}`);
  const a = Buffer.from(sig, "base64url");
  const b = Buffer.from(expected, "base64url");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return { email: unb64(emailB64).trim().toLowerCase(), campaignKey: unb64(keyB64) };
  } catch {
    return null;
  }
}
