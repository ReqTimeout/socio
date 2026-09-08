/**
 * Health metrics collector — P3-10
 * Reads real prod data: cron logs, job queue, provider health, DB size.
 * All queries are read-only, best-effort (fallback ke null kalau query gagal).
 */
import { db } from "@socio/db";
import { providerSyncLog, backupLogs, jobQueue } from "@socio/db/schema";
import { sql, desc, gte, eq, count } from "drizzle-orm";
import { CRON_JOBS } from "../../cron/jobs";
import { getCronStatus } from "./cron-runs";

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

  // Cron health: data REAL dari cron_runs (semua 8 job tercatat sejak deploy).
  // provider-sync dapat extra fetched/changed dari provider_sync_log.
  const cronStatus = await getCronStatus().catch(() => [] as any[]);
  const byKey = new Map((cronStatus as any[]).map((c: any) => [c.key, c]));
  const cronHealth = CRON_JOBS.map((def) => {
    const live: any = byKey.get(def.key);
    if (!live?.last) {
      // Belum ada run tercatat (fresh deploy) — fallback ke sumber lama
      if (def.key === "provider-sync" && syncLast) {
        const lastAt = new Date(syncLast.createdAt as any);
        const elapsed = (now - lastAt.getTime()) / 1000;
        return {
          ...def,
          lastAt: lastAt.toISOString(),
          nextInSec: Math.max(0, Math.round(def.intervalMin * 60 - elapsed)),
          status: syncLast.status,
          durationMs: Number(syncLast.durationMs ?? 0),
          fetched: Number(syncLast.fetched ?? 0),
          changed: Number(syncLast.changed ?? 0),
          error24h: Number(providerErr24h[0]?.c ?? 0),
        };
      }
      if (def.key === "backup") {
        const b = (backupRow as any[])[0] as any | undefined;
        if (b) {
          const lastAt = new Date((b.finishedAt ?? b.startedAt) as any);
          const elapsed = (now - lastAt.getTime()) / 1000;
          return {
            ...def,
            lastAt: lastAt.toISOString(),
            nextInSec: Math.max(0, Math.round(86400 - elapsed)),
            status: b.status === "success" ? "ok" : b.status === "failed" ? "error" : b.status,
            durationMs: b.startedAt && b.finishedAt ? new Date(b.finishedAt as any).getTime() - new Date(b.startedAt as any).getTime() : null,
            fetched: null,
            changed: null,
            error24h: 0,
          };
        }
      }
      return { ...def, lastAt: null, nextInSec: def.intervalMin * 60, status: "never" as const, durationMs: null, fetched: null, changed: null, error24h: 0 };
    }
    const row: any = {
      ...def,
      lastAt: live.last.at,
      nextInSec: live.nextInSec,
      status: live.running ? "running" : live.last.status,
      durationMs: live.last.durationMs,
      error24h: live.error24h,
    };
    if (def.key === "provider-sync" && syncLast) {
      row.fetched = Number(syncLast.fetched ?? 0);
      row.changed = Number(syncLast.changed ?? 0);
    } else {
      row.fetched = null;
      row.changed = null;
    }
    return row;
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
