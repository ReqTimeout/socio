/**
 * Wrapper eksekusi cron job dengan pencatatan ke `cron_runs`:
 *  - insert row status=running saat mulai
 *  - update ok (+durasi) / error (+pesan) saat selesai
 *  - cegah overlap: job yang masih running di-skip (return null)
 *  - prune: simpan max 200 row terakhir per job
 *
 * Dipakai scheduler (index.ts) DAN tombol manual /admin/cron.
 */
import { db } from "@socio/db";
import { cronRuns } from "@socio/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { CRON_JOBS, getJobDef } from "../../cron/jobs";

const running = new Set<string>();
const KEEP_PER_JOB = 200;

export function isJobRunning(job: string): boolean {
  return running.has(job);
}

async function prune(job: string): Promise<void> {
  try {
    await db.execute(sql`
      DELETE FROM ${cronRuns}
      WHERE ${cronRuns.job} = ${job}
        AND ${cronRuns.id} <= (
          SELECT min_id FROM (
            SELECT ${cronRuns.id} AS min_id FROM ${cronRuns}
            WHERE ${cronRuns.job} = ${job}
            ORDER BY ${cronRuns.id} DESC
            LIMIT 1 OFFSET ${KEEP_PER_JOB}
          ) AS t
        )
    `);
  } catch {
    // prune best-effort
  }
}

export async function runJob<T>(job: string, fn: () => Promise<T>, triggeredBy = 0): Promise<T | null> {
  if (running.has(job)) {
    console.warn(`[cron] ${job}: skip, masih berjalan`);
    return null;
  }
  running.add(job);
  const start = Date.now();
  let rowId = 0;
  try {
    await db.insert(cronRuns).values({
      job,
      status: "running",
      triggeredBy,
      createdAt: new Date(),
    } as any);
    const last = await db
      .select({ id: cronRuns.id })
      .from(cronRuns)
      .where(eq(cronRuns.job, job))
      .orderBy(desc(cronRuns.id))
      .limit(1);
    rowId = last[0]?.id ?? 0;
  } catch (e) {
    console.error(`[cron] ${job}: gagal tulis cron_runs:`, e);
  }

  try {
    const result = await fn();
    if (rowId) {
      await db
        .update(cronRuns)
        .set({ status: "ok", durationMs: Date.now() - start, finishedAt: new Date() })
        .where(eq(cronRuns.id, rowId));
    }
    return result;
  } catch (e: any) {
    if (rowId) {
      try {
        await db
          .update(cronRuns)
          .set({
            status: "error",
            durationMs: Date.now() - start,
            error: String(e?.message ?? e).slice(0, 1000),
            finishedAt: new Date(),
          })
          .where(eq(cronRuns.id, rowId));
      } catch {}
    }
    throw e;
  } finally {
    running.delete(job);
    void prune(job);
  }
}

export interface CronStatusRow {
  key: string;
  label: string;
  scheduleLabel: string;
  intervalMin: number;
  note: string;
  expr: string;
  running: boolean;
  last: {
    status: string;
    at: string | null;
    durationMs: number | null;
    detail: string | null;
    error: string | null;
    triggeredBy: number | null;
    by: string;
  } | null;
  nextInSec: number | null;
  error24h: number;
}

/** Status semua job untuk /admin/cron + health. */
export async function getCronStatus(): Promise<CronStatusRow[]> {
  const now = Date.now();
  const out: CronStatusRow[] = [];
  for (const def of CRON_JOBS) {
    let last: CronStatusRow["last"] = null;
    let error24h = 0;
    try {
      const rows = (await db
        .select()
        .from(cronRuns)
        .where(eq(cronRuns.job, def.key))
        .orderBy(desc(cronRuns.id))
        .limit(1)) as any[];
      if (rows[0]) {
        const r = rows[0];
        last = {
          status: String(r.status),
          at: r.finishedAt
            ? new Date(r.finishedAt as any).toISOString()
            : r.createdAt
              ? new Date(r.createdAt as any).toISOString()
              : null,
          durationMs: r.durationMs != null ? Number(r.durationMs) : null,
          detail: r.detail ?? null,
          error: r.error ?? null,
          triggeredBy: r.triggeredBy != null ? Number(r.triggeredBy) : null,
          by: Number(r.triggeredBy ?? 0) === 0 ? "otomatis" : `admin #${r.triggeredBy}`,
        };
      }
      const err = (await db.execute(sql`
        SELECT COUNT(*) AS c FROM ${cronRuns}
        WHERE ${cronRuns.job} = ${def.key}
          AND ${cronRuns.status} = 'error'
          AND ${cronRuns.createdAt} >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      `)) as any;
      const errRows: any[] = Array.isArray(err?.[0]) ? err[0] : (err?.rows ?? []);
      error24h = Number(errRows[0]?.c ?? 0);
    } catch {
      // tabel belum ada (pre-migrasi) → last null
    }
    const isRunning = running.has(def.key) || last?.status === "running";
    let nextInSec: number | null = null;
    if (!isRunning && last?.at) {
      const elapsed = (now - new Date(last.at).getTime()) / 1000;
      nextInSec = Math.max(0, Math.round(def.intervalMin * 60 - elapsed));
    } else if (!isRunning && !last) {
      nextInSec = def.intervalMin * 60;
    }
    out.push({
      key: def.key,
      label: def.label,
      scheduleLabel: def.scheduleLabel,
      intervalMin: def.intervalMin,
      note: def.note,
      expr: def.expr,
      running: isRunning,
      last,
      nextInSec,
      error24h,
    });
  }
  return out;
}
