import { db } from "@socio/db";
import { provider, providerServices, orders, jobQueue } from "@socio/db/schema";
import { eq, and, lt, sql } from "drizzle-orm";
import {
  smmturkBalance,
  smmturkServices,
  smmturkStatus,
  withConcurrency,
} from "@socio/core/smmturk";

const USD_TO_IDR = Number(process.env.SOCIO_USD_TO_IDR ?? "15000");

/** Record a sync run for monitoring (G10). */
async function logSync(
  providerId: number,
  action: string,
  status: "ok" | "error" | "partial",
  durationMs: number,
  fetched: number,
  changed: number,
  error?: string,
): Promise<void> {
  try {
    await db.execute(sql`
      INSERT INTO provider_sync_log (provider_id, action, status, duration_ms, fetched, changed, error, created_at)
      VALUES (${providerId}, ${action}, ${status}, ${durationMs}, ${fetched}, ${changed}, ${error ?? null}, NOW())
    `);
  } catch (e) {
    console.error("[cron] logSync failed:", e);
  }
}

function hashService(s: {
  name: string;
  category: string;
  rate: string;
  min: string;
  max: string;
  refill: any;
  cancel: any;
}): string {
  const raw = `${s.name}|${s.category}|${s.rate}|${s.min}|${s.max}|${s.refill}|${s.cancel}`;
  // lightweight hash (no crypto dep needed for diffing)
  let h = 0;
  for (let i = 0; i < raw.length; i++) {
    h = (h << 5) - h + raw.charCodeAt(i);
    h |= 0;
  }
  return String(h);
}

/**
 * Fetch SMMturk services, diff against provider_services, upsert changed rows.
 * Only changed rows get a DB write (no mass update).
 */
export async function runProviderSync(providerId = 1): Promise<void> {
  const start = Date.now();
  try {
    const [p] = await db
      .select()
      .from(provider)
      .where(eq(provider.id, providerId))
      .limit(1);
    if (!p) {
      await logSync(providerId, "services", "error", 0, 0, 0, "provider not found");
      return;
    }

    const balance = await smmturkBalance();
    const remote = await smmturkServices();
    let changed = 0;

    // index existing by provider_service_id
    const existing = await db
      .select()
      .from(providerServices)
      .where(eq(providerServices.providerId, providerId));
    const existingMap = new Map(existing.map((e) => [e.providerServiceId, e]));

    const toUpsert = remote
      .map((r) => {
        const pid = String(r.service);
        const h = hashService(r);
        const prev = existingMap.get(pid);
        return { r, pid, h, prev };
      })
      .filter((x) => !x.prev || x.prev.hash !== x.h);

    changed = toUpsert.length;

    await withConcurrency(toUpsert, async (x) => {
      const { r, pid, h } = x;
      const rateUsd = Number(r.rate) || 0;
      const rateIdr = Math.round(rateUsd * USD_TO_IDR);
      await db
        .insert(providerServices)
        .values({
          providerId,
          providerServiceId: pid,
          name: r.name,
          category: r.category,
          rate: rateIdr,
          min: Number(r.min) || 0,
          max: Number(r.max) || 0,
          refill: r.refill ? 1 : 0,
          cancel: r.cancel ? 1 : 0,
          hash: h,
          raw: r as any,
          lastSeenAt: new Date(),
        })
        .onDuplicateKeyUpdate({
          set: {
            name: r.name,
            category: r.category,
            rate: rateIdr,
            min: Number(r.min) || 0,
            max: Number(r.max) || 0,
            refill: r.refill ? 1 : 0,
            cancel: r.cancel ? 1 : 0,
            hash: h,
            raw: r as any,
            lastSeenAt: new Date(),
          },
        });
    });

    // update balance if column exists (best-effort)
    try {
      await db.execute(sql`UPDATE provider SET balance_provider = ${balance} WHERE id = ${providerId}`);
    } catch {
      // column may not exist
    }

    await logSync(providerId, "services", "ok", Date.now() - start, remote.length, changed);
    console.log(`[cron] provider-sync: fetched ${remote.length}, changed ${changed}`);
  } catch (e: any) {
    await logSync(providerId, "services", "error", Date.now() - start, 0, 0, String(e?.message ?? e));
    console.error("[cron] provider-sync error:", e);
    throw e;
  }
}
