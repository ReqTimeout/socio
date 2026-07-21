import { config } from "dotenv";
config({ path: new URL("../.env", import.meta.url).pathname });
import { auth } from "$lib/server/auth";
import { db } from "@socio/db";
import { users, sessions } from "@socio/db/schema";
import { eq } from "drizzle-orm";
import { sequence } from "@sveltejs/kit/hooks";
import { getSetting } from "$lib/server/admin";
import { ensureAdminSchema } from "@socio/db/ensure";
import { startCron } from "./cron";
import type { Handle } from "@sveltejs/kit";

try {
  startCron();
} catch {
  // cron scheduling failure must not block app boot
}

const SESSION_COOKIE = "socio_session";

async function readSocioSession(event: Parameters<Handle>[0]["event"]) {
  const cookie = event.cookies.get(SESSION_COOKIE);
  if (!cookie) return null;
  const dot = cookie.indexOf(".");
  if (dot === -1) return null;
  const sessionId = cookie.slice(0, dot);
  const token = cookie.slice(dot + 1);

  const [row] = await db
    .select({
      sessionId: sessions.id,
      expiresAt: sessions.expiresAt,
      user: users,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, Number(sessions.userId)))
    .where(eq(sessions.token, token))
    .limit(1);
  if (!row || row.sessionId !== sessionId) return null;
  if (row.expiresAt && new Date(row.expiresAt) < new Date()) return null;
  // Build a Session-like shape compatible with better-auth Locals types.
  return {
    session: {
      id: row.sessionId,
      token,
      userId: String(row.user.id),
      expiresAt: row.expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    user: {
      id: String(row.user.id),
      email: row.user.email,
      name: row.user.fullName ?? row.user.username,
      emailVerified: row.user.verify === "Yes",
      image: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      fullName: row.user.fullName,
      username: row.user.username,
      level: row.user.level,
      balance: row.user.balance,
    },
  };
}

async function authHook({ event, resolve }: Parameters<Handle>[0]) {
  // Prefer our custom session cookie; fall back to better-auth if present.
  let session: any = await readSocioSession(event);
  if (!session) {
    try {
      const ba = await auth.api.getSession({ headers: event.request.headers });
      if (ba?.session && ba?.user) {
        session = { session: ba.session, user: ba.user };
      }
    } catch {
      // ignore
    }
  }
  event.locals.session = session?.session ?? null;
  event.locals.user = session?.user ?? null;

  (event.locals as any).ip =
    event.request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    event.request.headers.get("x-real-ip") ||
    "0.0.0.0";

  try {
    await ensureAdminSchema();
  } catch {
    // non-fatal
  }
  return resolve(event);
}

async function maintenanceHook({ event, resolve }: Parameters<Handle>[0]) {
  const path = event.url.pathname;
  const isStatic =
    path.startsWith("/manifest") ||
    path.startsWith("/icon") ||
    path.startsWith("/_app") ||
    path.startsWith("/api/auth");
  const isAdmin = path.startsWith("/admin") || path.startsWith("/login");
  if (isStatic || isAdmin) return resolve(event);

  try {
    if ((await getSetting("maintenance_mode")) === "1") {
      const level = (event.locals.user as any)?.level;
      if (level !== "Admin") {
        return new Response("Sistem sedang maintenance. Silakan coba beberapa saat lagi.", {
          status: 503,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }
    }
  } catch {
    // getSetting may fail (DB unavailable) — fail open, don't block app.
  }
  return resolve(event);
}

async function securityHeadersHook({ event, resolve }: Parameters<Handle>[0]) {
  const response = await resolve(event, {
    preload: ({ type }) => type === "js" || type === "css" || type === "font",
  });
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()");
  response.headers.set("X-DNS-Prefetch-Control", "on");
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://app.midtrans.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https: https://cdn.socio.id",
      "connect-src 'self' https: wss:",
      "frame-src https://challenges.cloudflare.com https://app.midtrans.com",
      "manifest-src 'self'",
      "worker-src 'self' blob:",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  );
  return response;
}

export const handle = sequence(authHook, maintenanceHook, securityHeadersHook);
