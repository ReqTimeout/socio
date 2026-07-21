import { config } from "dotenv";
config({ path: new URL("../.env", import.meta.url).pathname });
import { auth } from "$lib/server/auth";
import { sequence } from "@sveltejs/kit/hooks";
import { getSetting } from "$lib/server/admin";
import { ensureAdminSchema } from "@socio/db/ensure";
import { startCron } from "./cron";
import type { Handle } from "@sveltejs/kit";

// Start background cron schedules once (idempotent inside startCron).
try {
  startCron();
} catch {
  // cron scheduling failure must not block app boot
}

async function authHook({ event, resolve }: Parameters<Handle>[0]) {
  const cookieHeader = event.request.headers.get("cookie") ?? "";
  console.log(`[authHook] ${event.url.pathname} cookies=${cookieHeader.slice(0, 200)}`);
  try {
    const session = await auth.api.getSession({ headers: event.request.headers });
    console.log(`[authHook] session=${session?.session?.id ?? "null"} user=${(session?.user as any)?.email ?? "null"}`);
    event.locals.session = session?.session ?? null;
    event.locals.user = session?.user ?? null;
  } catch (e) {
    console.log(`[authHook] error:`, e instanceof Error ? e.message : String(e));
    event.locals.session = null;
    event.locals.user = null;
  }
  (event.locals as any).ip =
    event.request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    event.request.headers.get("x-real-ip") ||
    "0.0.0.0";
  // Bootstrap new admin tables once (idempotent). Fail open if DB unreachable.
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
