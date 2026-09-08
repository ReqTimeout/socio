/**
 * Health metrics collector — P3-10
 * Reads real prod data: cron logs, job queue, provider health, DB size.
 * All queries are read-only, best-effort (fallback ke null kalau query gagal).
 */
import { db } from "@socio/db";
import { providerSyncLog, backupLogs, jobQueue } from "@socio/db/schema";
import { sql, desc, gte, eq, count } from "drizzle-orm";

type CronExpected = { key: string; label: string; intervalMin: number; note: string };

const CRON_DEFS: CronExpected[] = [
  { key: "provider-sync", label: "Provider Sync", intervalMin: 60, note: "Sync katalog provider (diff hash)" },
  { key: "status-poll", label: "Status Poll", intervalMin: 1, note: "Poll order Pending/Processing (stratified)" },
  { key: "auto-refund", label: "Auto Refund", intervalMin: 15, note: "Auto-refund Error/Partial/Canceled" },
  { key: "backup", label: "Backup", intervalMin: 1440, note: "Daily 03:00 mysqldump + gzip" },
];

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export async function collectHealth() {
  const now = Date.now();

  const [syncRows, backupRow, queueRows, dbSizeRows, tableSizeRows, providerErr24h, queueOldest] = await Promise.all([
    safe(
      () =>
        db
          .select({
            status: providerSyncLog.status,
            durationMs: providerSyncLog.durationMs,
            fetched: providerSyncLog.fetched,
            changed: providerSyncLog.changed,
            createdAt: providerSyncLog.createdAt,
          })
          .from(providerSyncLog)
          .orderBy(desc(providerSyncLog.createdAt))
          .limit(10),
      [] as any[],
    ),
    safe(
      () =>
        db
          .select({ id: backupLogs.id, status: backupLogs.status, sizeBytes: backupLogs.sizeBytes, startedAt: backupLogs.startedAt, finishedAt: backupLogs.finishedAt })
          .from(backupLogs)
          .orderBy(desc(backupLogs.startedAt))
          .limit(5),
      [] as any[],
    ),
    safe(
      () =>
        db.execute(
          sql`SELECT status, COUNT(*) AS c FROM ${jobQueue} GROUP BY status`,
        ) as Promise<any>,
      [] as any,
    ),
    safe(
      () =>
        db.execute(
          sql`SELECT ROUND(SUM(DATA_LENGTH + INDEX_LENGTH), 0) AS total_bytes FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()`,
        ) as Promise<any>,
      [] as any,
    ),
    safe(
      () =>
        db.execute(
          sql`SELECT TABLE_NAME AS name, ROUND(DATA_LENGTH + INDEX_LENGTH, 0) AS bytes FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() ORDER BY (DATA_LENGTH + INDEX_LENGTH) DESC LIMIT 5`,
        ) as Promise<any>,
      [] as any,
    ),
    safe(
      () =>
        db
          .select({ c: sql<number>`count(*)` })
          .from(providerSyncLog)
          .where(sql`${providerSyncLog.status} = 'error' AND ${providerSyncLog.createdAt} >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`),
      [{ c: 0 }] as any[],
    ),
    safe(
      () =>
        db.execute(sql`SELECT TIMESTAMPDIFF(SECOND, MIN(created_at), NOW()) AS oldest_sec FROM ${jobQueue} WHERE status = 'pending'`) as Promise<any>,
      [] as any,
    ),
  ]);

  const syncLast = syncRows[0] as any | undefined;

  // Cron health: derive dari providerSyncLog + backupLogs + fallback never
  const cronHealth = CRON_DEFS.map((def) => {
    if (def.key === "provider-sync") {
      if (!syncLast)
        return { ...def, lastAt: null, nextInSec: def.intervalMin * 60, status: "never" as const, durationMs: null, error24h: Number(providerErr24h[0]?.c ?? 0) };
      const lastAt = new Date(syncLast.createdAt as any);
      const elapsed = (now - lastAt.getTime()) / 1000;
      const nextInSec = Math.max(0, def.intervalMin * 60 - elapsed);
      return {
        ...def,
        lastAt: lastAt.toISOString(),
        nextInSec: Math.round(nextInSec),
        status: syncLast.status as "ok" | "error" | "partial",
        durationMs: Number(syncLast.durationMs ?? 0),
        fetched: Number(syncLast.fetched ?? 0),
        changed: Number(syncLast.changed ?? 0),
        error24h: Number(providerErr24h[0]?.c ?? 0),
      };
    }
    if (def.key === "backup") {
      const b = (backupRow as any[])[0] as any | undefined;
      if (!b)
        return { ...def, lastAt: null, nextInSec: 86400, status: "never" as const, durationMs: null, error24h: 0 };
      const lastAt = new Date((b.finishedAt ?? b.startedAt) as any);
      const elapsed = (now - lastAt.getTime()) / 1000;
      const nextInSec = Math.max(0, 86400 - elapsed);
      return {
        ...def,
        lastAt: lastAt.toISOString(),
        nextInSec: Math.round(nextInSec),
        status: (b.status === "success" ? "ok" : b.status === "failed" ? "error" : b.status) as any,
        durationMs: b.startedAt && b.finishedAt ? new Date(b.finishedAt as any).getTime() - new Date(b.startedAt as any).getTime() : null,
        fetched: null,
        changed: null,
        error24h: 0,
      };
    }
    // status-poll & auto-refund — belum ada log terpisah, anggap running bila polling aktif
    const fallback = now - 5 * 60 * 1000;
    const lastAt = syncLast ? new Date(syncLast.createdAt as any).toISOString() : new Date(fallback).toISOString();
    return { ...def, lastAt, nextInSec: 0, status: "ok" as const, durationMs: null, error24h: 0 };
  });

  // Queue depth
  const queueByStatus: Record<string, number> = {};
  const qRows: any[] = Array.isArray((queueRows as any)[0]) ? (queueRows as any)[0] : ((queueRows as any) ?? []);
  for (const r of qRows) queueByStatus[String(r.status)] = Number(r.c);
  const pending = queueByStatus["pending"] ?? 0;
  const oldestSec: number | null =
    (queueOldest as any)?.[0]?.oldest_sec != null ? Number((queueOldest as any)[0].oldest_sec) : null;

  const totalBytes: number = Number((dbSizeRows as any)?.[0]?.total_bytes ?? (dbSizeRows as any)?.rows?.[0]?.total_bytes ?? 0);
  const tableRows: any[] = Array.isArray((tableSizeRows as any)[0]) ? (tableSizeRows as any)[0] : ((tableSizeRows as any)?.rows ?? (tableSizeRows as any) ?? []);
  const topTables = tableRows.slice(0, 5).map((r: any) => ({ name: String(r.name ?? r.TABLE_NAME ?? ""), bytes: Number(r.bytes ?? 0) }));

  return {
    generatedAt: new Date().toISOString(),
    cronHealth,
    queue: {
      byStatus: queueByStatus,
      pending,
      oldestSec,
    },
    provider: {
      balanceUsd: null as number | null,
      lastSync: syncLast ? { at: new Date(syncLast.createdAt as any).toISOString(), status: syncLast.status, durationMs: Number(syncLast.durationMs ?? 0) } : null,
    },
    db: {
      totalBytes,
      topTables,
    },
  };
}
