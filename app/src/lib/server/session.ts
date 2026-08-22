import type { Cookies } from "@sveltejs/kit";

/**
 * Single source of truth for the socio.id session cookie.
 *
 * WHY A CUSTOM COOKIE (not better-auth's own session cookie):
 * better-auth's `api.getSession()` was not reliably round-tripping its own
 * cookies in this deployment (root cause unknown — see git history: repeated
 * "fix(login): ..." commits). To stabilise auth we mint our own
 * `socio_session` cookie (`<sessionId>.<token>`) and resolve the session via a
 * direct Drizzle lookup in `hooks.server.ts → readSocioSession`. Do NOT "fix"
 * this back to better-auth's cookie unless the getSession issue is resolved,
 * or logins will break again.
 *
 * `secure` defaults to false to match historical behaviour (works behind
 * Cloudflare HTTPS termination). Set SOCIO_SECURE_COOKIES=1 in production to
 * mark the cookie Secure (recommended once HTTPS is confirmed end-to-end).
 */
export const SESSION_COOKIE = "socio_session";

export function setSocioSessionCookie(
  cookies: Cookies,
  sessionId: string,
  token: string,
  expiresAt: Date,
): void {
  cookies.set(SESSION_COOKIE, `${sessionId}.${token}`, {
    path: "/",
    httpOnly: true,
    secure: process.env.SOCIO_SECURE_COOKIES === "1",
    sameSite: "lax",
    expires: expiresAt,
  });
}

export function clearSocioSessionCookie(cookies: Cookies): void {
  cookies.delete(SESSION_COOKIE, { path: "/" });
}

export function parseSocioSession(
  cookie: string | undefined,
): { sessionId: string; token: string } | null {
  if (!cookie) return null;
  const dot = cookie.indexOf(".");
  if (dot === -1) return null;
  return { sessionId: cookie.slice(0, dot), token: cookie.slice(dot + 1) };
}
