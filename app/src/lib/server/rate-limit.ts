import { db } from "@socio/db";
import { rateLimits } from "@socio/db/schema";
import { sql } from "drizzle-orm";

/**
 * DB-backed sliding-window rate limiter (no Redis).
 *
 * Usage:
 *   const ok = await rateLimit(`${ip}:login`, { limit: 5, windowSec: 60 });
 *   if (!ok) return error(429, "Terlalu banyak percobaan");
 *
 * The underlying table is created on first use if missing (idempotent).
 * Counts are tracked per (key, windowStart) and auto-expire via `expires_at`.
 */

let ensured = false;
async function ensureTable() {
  if (ensured) return;
  await db.execute(sql`CREATE TABLE IF NOT EXISTS rate_limits (
    \`key\` VARCHAR(160) NOT NULL,
    \`count\` INT NOT NULL DEFAULT 0,
    \`window_start\` DATETIME NOT NULL,
    \`expires_at\` DATETIME NOT NULL,
    PRIMARY KEY (\`key\`),
    KEY rate_limits_expires_idx (\`expires_at\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  ensured = true;
}

interface RateLimitOpts {
  limit: number;
  windowSec: number;
}

export async function rateLimit(
  key: string,
  opts: RateLimitOpts,
): Promise<boolean> {
  try {
    await ensureTable();
    const now = new Date();
    const windowStart = new Date(
      Math.floor(now.getTime() / 1000 / opts.windowSec) * 1000 * opts.windowSec,
    );
    const expiresAt = new Date(windowStart.getTime() + opts.windowSec * 1000);

    await db
      .insert(rateLimits)
      .values({ key, count: 1, windowStart, expiresAt })
      .onDuplicateKeyUpdate({ set: { count: sql`${rateLimits.count} + 1` } });

    const row = await db.query.rateLimits.findFirst({
      where: (t, { eq }) => eq(t.key, key),
    });
    return (row?.count ?? 0) <= opts.limit;
  } catch {
    // Fail open: never block auth on a rate-limit store error.
    return true;
  }
}

export async function cleanupRateLimits(): Promise<void> {
  try {
    await db.delete(rateLimits).where(sql`expires_at < NOW()`);
  } catch {
    // best-effort
  }
}
