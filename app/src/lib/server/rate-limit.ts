import { db } from "@socio/db";
import { rateLimits } from "@socio/db/schema";
import { sql } from "drizzle-orm";

/**
 * DB-backed sliding-window rate limiter (no Redis). Port socio.my (Susulan 50).
 *
 * Usage:
 *   const ok = await rateLimit(`${ip}:login`, { limit: 5, windowSec: 60 });
 *   if (!ok) return error(429, "Terlalu banyak percobaan");
 *   // API publik: fail-closed kalau store error
 *   const ok = await rateLimit(`api-v1:${ip}`, { limit: 60, windowSec: 60, failOpen: false });
 *
 * Sliding-window counter: berat = prev_count*(1 - elapsed/window) + count.
 * Ini menghapus burst 2x di batas window yang ada pada fixed-window lama. Count +
 * prev_count diperbarui atomik dalam satu INSERT ... ON DUPLICATE KEY UPDATE.
 * Tabel dibuat idempoten saat pemakaian pertama; kolom prev_count ditambah untuk DB lama.
 */

let ensured = false;
async function ensureTable() {
  if (ensured) return;
  await db.execute(sql`CREATE TABLE IF NOT EXISTS rate_limits (
    \`key\` VARCHAR(160) NOT NULL,
    \`count\` INT NOT NULL DEFAULT 0,
    \`prev_count\` INT NOT NULL DEFAULT 0,
    \`window_start\` DATETIME NOT NULL,
    \`expires_at\` DATETIME NOT NULL,
    PRIMARY KEY (\`key\`),
    KEY rate_limits_expires_idx (\`expires_at\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  // DB lama (fixed-window) belum punya prev_count → probe information_schema DULU,
  // ALTER hanya kalau kolom belum ada (doktrin MDL convoy ensure.ts: ALTER yang
  // "idempotent" pun tetap minta MDL eksklusif tiap boot → convoy kalau ada query lama).
  // any: hasil mentah db.execute (mysql2 RowDataPacket[]) — pola sama dgn ensure.ts.
  const res: any = await db.execute(sql`
    SELECT COLUMN_NAME cn FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rate_limits' AND COLUMN_NAME = 'prev_count'
  `);
  const rows = Array.isArray(res?.[0]) ? res[0] : Array.isArray(res) ? res : [];
  if (rows.length === 0) {
    try {
      await db.execute(sql`ALTER TABLE rate_limits ADD COLUMN prev_count INT NOT NULL DEFAULT 0`);
    } catch {
      // ER_DUP_FIELDNAME (race dengan proses lain) → sudah ada, abaikan.
    }
  }
  ensured = true;
}

interface RateLimitOpts {
  limit: number;
  windowSec: number;
  /** Default true (fail-open, jangan block auth saat store error). API publik set false. */
  failOpen?: boolean;
}

export async function rateLimit(key: string, opts: RateLimitOpts): Promise<boolean> {
  try {
    await ensureTable();
    const now = new Date();
    const windowMs = opts.windowSec * 1000;
    const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs);
    const prevWindow = new Date(windowStart.getTime() - windowMs);
    const expiresAt = new Date(windowStart.getTime() + windowMs);
    const fmt = (d: Date) => d.toISOString().slice(0, 19).replace("T", " ");
    const cur = fmt(windowStart);
    const prev = fmt(prevWindow);
    const exp = fmt(expiresAt);

    // prev_count dihitung DULU (pakai window_start + count lama), kemudian count,
    // kemudian window_start — urutan assignment ON DUPLICATE kiri→kanan penting.
    await db.execute(sql`
      INSERT INTO rate_limits (\`key\`, \`count\`, prev_count, window_start, expires_at)
      VALUES (${key}, 1, 0, ${cur}, ${exp})
      ON DUPLICATE KEY UPDATE
        prev_count = IF(window_start = ${cur}, prev_count, IF(window_start = ${prev}, \`count\`, 0)),
        \`count\` = IF(window_start = ${cur}, \`count\` + 1, 1),
        window_start = ${cur},
        expires_at = ${exp}
    `);

    const row = await db.query.rateLimits.findFirst({
      where: (t, { eq }) => eq(t.key, key),
    });
    const count = row?.count ?? 0;
    const prevCount = row?.prevCount ?? 0;
    const elapsed = (now.getTime() - windowStart.getTime()) / 1000;
    const weight = prevCount * Math.max(0, 1 - elapsed / opts.windowSec) + count;
    return weight <= opts.limit;
  } catch {
    // Fail-open default (auth tidak boleh terblock saat store error); API fail-closed.
    return opts.failOpen ?? true;
  }
}

export async function cleanupRateLimits(): Promise<void> {
  try {
    await db.delete(rateLimits).where(sql`expires_at < NOW()`);
  } catch {
    // best-effort
  }
}
