import { db } from "@socio/db";
import { provider, providerServices } from "@socio/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { smmturkBalanceFor, smmturkServicesFor, withConcurrency } from "@socio/core/smmturk";
import { decryptSecret, encryptSecret } from "$lib/server/crypto";

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
    const [p] = await db.select().from(provider).where(eq(provider.id, providerId)).limit(1);
    if (!p) {
      await logSync(providerId, "services", "error", 0, 0, 0, "provider not found");
      return;
    }
    // Pakai URL + key milik provider ini (bukan cuma env SMMturk)
    const endpoint = p.apiUrlOrder || "https://smmturk.org/api/v2";
    const key = decryptSecret(p.apiKey) || "";
    if (!key) {
      await logSync(providerId, "services", "error", 0, 0, 0, "provider has no api_key");
      return;
    }

    const balance = await smmturkBalanceFor(endpoint, key);
    const remote = await smmturkServicesFor(endpoint, key);
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
      await db.execute(
        sql`UPDATE provider SET balance_provider = ${balance} WHERE id = ${providerId}`,
      );
    } catch {
      // column may not exist
    }

    await logSync(providerId, "services", "ok", Date.now() - start, remote.length, changed);
    console.log(`[cron] provider-sync: fetched ${remote.length}, changed ${changed}`);
  } catch (e: any) {
    await logSync(
      providerId,
      "services",
      "error",
      Date.now() - start,
      0,
      0,
      String(e?.message ?? e),
    );
    console.error("[cron] provider-sync error:", e);
    throw e;
  }
}

// In-memory mutex supaya sync tdk overlap (cron + manual trigger)
let syncing = false;

/**
 * Pastikan row provider SMMturk ada (key dari env, ter-encrypt). Idempotent.
 * Audit P0-3: tanpa row ini sync tidak punya bahan & order guard gagal.
 */
export async function seedSmmturkProvider(): Promise<number | null> {
  const envKey = process.env.SOCIO_SMMTURK_KEY;
  if (!envKey) return null;
  const [existing] = await db
    .select({ id: provider.id })
    .from(provider)
    .where(eq(provider.name, "SMMturk"))
    .limit(1);
  if (existing) return existing.id;

  const apiKey = encryptSecret(envKey);
  const [inserted] = await db
    .insert(provider)
    .values({
      name: "SMMturk",
      apiUrlOrder: "https://smmturk.org/api/v2",
      apiUrlStatus: "https://smmturk.org/api/v2",
      apiKey,
    })
    .$returningId();
  console.log(`[cron] provider SMMturk di-seed (id=${inserted.id})`);
  return inserted.id;
}

/**
 * Sync semua provider aktif yang punya api_key (bukan MANUAL).
 * Dijalankan tiap jam oleh cron. Per-provider di-handle runProviderSync.
 */
export async function runAllProviderSync(): Promise<void> {
  if (syncing) {
    console.log("[cron] provider-sync: skip, already running");
    return;
  }
  syncing = true;
  try {
    await seedSmmturkProvider().catch((e) =>
      console.error("[cron] seed smmturk provider failed:", e),
    );
    const rows = await db
      .select({ id: provider.id, name: provider.name, apiKey: provider.apiKey })
      .from(provider)
      .where(and(sql`${provider.apiKey} <> ''`, sql`${provider.apiKey} IS NOT NULL`));
    for (const r of rows) {
      try {
        await runProviderSync(Number(r.id));
      } catch (e: any) {
        console.error(`[cron] provider-sync ${r.name} failed:`, e?.message ?? e);
      }
    }
  } finally {
    syncing = false;
  }
}

/** Cek apakah sedang sync (untuk UI). */
export function isSyncing(): boolean {
  return syncing;
}
