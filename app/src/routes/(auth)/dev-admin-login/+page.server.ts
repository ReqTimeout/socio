import { dev } from "$app/environment";
import { redirect, error } from "@sveltejs/kit";
import { randomBytes } from "node:crypto";
import { db } from "@socio/db";
import { users, sessions } from "@socio/db/schema";
import { eq, sql } from "drizzle-orm";
import type { PageServerLoad } from "./$types";
import { setSocioSessionCookie } from "$lib/server/session";

/**
 * Whitelist user yang boleh dilogin tanpa password (dev-only).
 * Daftar ini sengaja pendek — bisa ditambah dari session ke session.
 *   - Admin: socioadmin / admin / diomaulana
 *   - User biasa dengan data real: febian / irlan02 / kokobee / sadamhsn
 *     (masing-masing punya ratusan–ribuan order, berguna untuk preview UI
 *      user-side yang data-driven)
 */
const ALLOWED = new Set([
  // Admin
  "socioadmin",
  "admin",
  "diomaulana",
  // User dengan data order real (sample accounts)
  "febian",
  "irlan02",
  "kokobee",
  "sadamhsn",
]);

/**
 * Dev-only shortcut: pick any whitelisted user (default `socioadmin`) and
 * create a session without requiring a password. Bypasses normal auth so
 * the developer can iterate on either admin or user-side pages.
 *
 *  - Only enabled when `import.meta.env.DEV` is true.
 *  - Production builds gate this with a 404 so it cannot be reached.
 *  - Refuses unknown usernames (whitelist is the only way in).
 *  - Admin → redirect to `/admin`; user biasa → redirect to `/`.
 *
 * Usage:
 *   /dev-admin-login           → login as `socioadmin` → /admin
 *   /dev-admin-login?as=febian → login as `febian`     → /
 *   /dev-admin-login?as=irlan02
 */
export const load: PageServerLoad = async ({ url, cookies, request }) => {
  if (!dev) {
    throw error(404, "Not Found");
  }

  const requested = (url.searchParams.get("as") ?? "socioadmin").toLowerCase();
  if (!ALLOWED.has(requested)) {
    throw error(400, `Unknown user "${requested}". Pick one of: ${[...ALLOWED].join(", ")}`);
  }

  const [row] = await db
    .select({
      id: users.id,
      username: users.username,
      level: users.level,
      status: users.status,
    })
    .from(users)
    .where(eq(users.username, requested))
    .limit(1);

  if (!row) {
    throw error(404, `User "${requested}" not found in DB. Run the dump import first.`);
  }
  if (row.status !== "1") {
    throw error(403, `User "${requested}" is disabled (status=${row.status}).`);
  }

  // Mint a fresh session row.
  const token = randomBytes(24).toString("hex");
  const sessionId = randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({
    id: sessionId,
    userId: String(row.id),
    token,
    expiresAt,
    ipAddress:
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "127.0.0.1",
    userAgent: request.headers.get("user-agent") ?? "dev-admin-login",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  setSocioSessionCookie(cookies, sessionId, token, expiresAt);

  // Touch updatedAt so the user is fresh (no-op if already fresh).
  await db.execute(sql`UPDATE users SET updated_at = NOW() WHERE id = ${row.id}`);

  // Admin → /admin (Command Center), user biasa → / (beranda).
  const dest = row.level === "Admin" ? "/admin" : "/";
  throw redirect(303, dest);
};
