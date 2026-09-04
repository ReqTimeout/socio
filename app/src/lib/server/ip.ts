/**
 * Centralized client-IP resolver for audit log, rate-limit, dan turnstile.
 *
 * Urutan lookup (semua header dipicu oleh upstream proxy — jangan pernah
 * baca dari `request` body / cookie):
 *   1. `cf-connecting-ip`        — Cloudflare edge (production)
 *   2. `x-forwarded-for`         — generic proxy chain (first hop = client)
 *   3. `x-real-ip`               — nginx default
 *   4. fallback                  — `"0.0.0.0"` (jangan ditelan mentah oleh audit)
 *
 * Trust model:
 *   - Saat `TRUST_PROXY_HEADERS=true` (default di production lewat Cloudflare /
 *     nginx), pakai header di atas. Bila tidak, kosong (security: jangan percaya
 *     header dari direct connection).
 *   - IPv4-mapped IPv6 (`::ffff:1.2.3.4`) → dinormalisasi jadi `1.2.3.4`.
 *
 * @example
 *   import { getClientIp, ipAuditSafe } from "$lib/server/ip";
 *
 *   const ip = getClientIp(event);
 *   await db.insert(auditLog).values({ ..., ip: ipAuditSafe(ip) });
 */
import type { RequestEvent } from "@sveltejs/kit";

const FALLBACK_IP = "0.0.0.0";

/** Extract first IP from a comma-separated chain. */
function firstHop(raw: string | null): string | null {
  if (!raw) return null;
  const first = raw.split(",")[0]?.trim();
  return first && first.length > 0 ? first : null;
}

/** Strip IPv4-mapped IPv6 prefix (`::ffff:1.2.3.4` → `1.2.3.4`). */
function normalize(ip: string): string {
  if (ip.startsWith("::ffff:")) return ip.slice(7);
  return ip;
}

/**
 * Resolve client IP from request headers.
 * Returns null when `TRUST_PROXY_HEADERS=false` (security: don't trust spoofed headers).
 */
export function getClientIp(event: Pick<RequestEvent, "request">): string | null {
  const trustProxy = (process.env.TRUST_PROXY_HEADERS ?? "true").toLowerCase() !== "false";

  if (!trustProxy) return null;

  const ip =
    firstHop(event.request.headers.get("cf-connecting-ip")) ||
    firstHop(event.request.headers.get("x-forwarded-for")) ||
    firstHop(event.request.headers.get("x-real-ip"));

  return ip ? normalize(ip) : null;
}

/**
 * Same as `getClientIp` but never returns null — always a string suitable
 * for DB insert (audit_log.ip column is `NOT NULL` semantically; we want
 * to flag unresolved IPs explicitly with `0.0.0.0` rather than fail).
 *
 * **Audit reviewer note**: `0.0.0.0` is now a meaningful sentinel meaning
 * "no proxy header present" — bukan lagi bug random. Use `wasIpResolved()`
 * downstream jika perlu bedakan real vs fallback.
 */
export function ipAuditSafe(event: Pick<RequestEvent, "request">): string {
  return getClientIp(event) ?? FALLBACK_IP;
}

/** Detect fallback (no header present). */
export function wasIpResolved(event: Pick<RequestEvent, "request">): boolean {
  return getClientIp(event) !== null;
}
