/**
 * G1 lifecycle/winback — cron email perilaku (BUKAN blast).
 *
 * Dijadwalkan 09:00 WIB (lihat jobs.ts tz=Asia/Jakarta). Setiap run:
 *  1. Gerbang: kill switch OFF → skip. Di luar jendela 08:00–20:00 WIB → skip
 *     (kecuali dipicu manual dari admin).
 *  2. Budget harian tersisa = DAILY_CAP − jumlah klaim 24 jam terakhir.
 *  3. Untuk tiap segmen AKTIF, ambil penerima (sudah difilter opt-in +
 *     suppression di SQL), hormati cooldown per-user, enqueue idempoten.
 *
 * Yang DIJADWALKAN sekarang: hanya `activation` (keputusan owner 6-Nov-2026).
 * Winback/balance_low sudah tersedia di `segments.ts` — tinggal tambah key di
 * ACTIVE_TRIGGERS untuk mengaktifkan, tanpa kode baru. Worker `email-queue`
 * yang benar-benar mengirim (dengan throttle + suppression + kill switch).
 */
import { db } from "@socio/db";
import { emailTriggersSent } from "@socio/db/schema";
import { and, eq, gte, sql } from "drizzle-orm";
import {
  DAILY_CAP,
  PER_USER_COOLDOWN_DAYS,
  marketingEnabled,
  weekPeriodKey,
  withinSendWindow,
} from "$lib/server/marketing/config.js";
import {
  fetchPopularCategories,
  resolveSegment,
  type SegmentKey,
} from "$lib/server/marketing/segments.js";
import { enqueueLifecycleEmail } from "$lib/server/marketing/enqueue.js";

/** Segmen yang dijadwalkan. Tambah "winback_30" dst. untuk mengaktifkan. */
const ACTIVE_TRIGGERS: SegmentKey[] = ["activation"];

/** Jendela hari untuk copy winback. */
const WINBACK_DAYS: Partial<Record<SegmentKey, number>> = {
  winback_30: 30,
  winback_60: 60,
  winback_90: 90,
};

function appBase(): string {
  return (process.env.SOCIO_APP_URL ?? "https://app.socio.id").replace(/\/+$/, "");
}

/** Jumlah klaim lifecycle dalam N jam terakhir (bucket budget). */
async function claimsWithinHours(hours: number): Promise<number> {
  const since = new Date(Date.now() - hours * 3_600_000);
  const [r] = await db
    .select({ c: sql<number>`COUNT(*)` })
    .from(emailTriggersSent)
    .where(gte(emailTriggersSent.sentAt, since));
  return Number(r?.c ?? 0);
}

/** Apakah user ini sudah dapat email lifecycle (trigger apapun) dalam N hari? */
async function sentAnyInDays(userId: number, days: number): Promise<boolean> {
  const since = new Date(Date.now() - days * 86_400_000);
  const [r] = await db
    .select({ c: sql<number>`COUNT(*)` })
    .from(emailTriggersSent)
    .where(and(eq(emailTriggersSent.userId, userId), gte(emailTriggersSent.sentAt, since)));
  return Number(r?.c ?? 0) > 0;
}

export interface LifecycleResult {
  skipped?: string;
  enqueued: number;
  usedToday: number;
  cap: number;
}

/**
 * @param triggeredBy 0 = cron terjadwal; >0 = manual dari admin (ID admin).
 *        Manual mengabaikan jendela quiet-hours (admin tahu yang dilakukannya).
 */
export async function runEmailLifecycle(triggeredBy = 0): Promise<LifecycleResult> {
  const empty: LifecycleResult = { enqueued: 0, usedToday: 0, cap: DAILY_CAP };

  if (!marketingEnabled()) {
    console.log("[cron] email-lifecycle: EMAIL_MARKETING_ENABLED OFF → skip");
    return { ...empty, skipped: "kill-switch-off" };
  }
  if (!triggeredBy && !withinSendWindow()) {
    console.log("[cron] email-lifecycle: di luar jendela kirim WIB → skip");
    return { ...empty, skipped: "quiet-hours" };
  }

  const usedToday = await claimsWithinHours(24);
  let remaining = Math.max(0, DAILY_CAP - usedToday);
  if (remaining === 0) {
    console.log(`[cron] email-lifecycle: budget harian habis (${usedToday}/${DAILY_CAP})`);
    return { ...empty, usedToday };
  }

  const periodKey = weekPeriodKey();
  const preferencesUrl = `${appBase()}/akun`;
  // Grid layanan diambil sekali, dipakai semua email run ini (hemat query).
  const grid = await fetchPopularCategories(6);

  let enqueued = 0;
  for (const trigger of ACTIVE_TRIGGERS) {
    if (remaining <= 0) break;
    // Ambil sedikit lebih banyak dari sisa budget (antisipasi cooldown skip).
    const recips = await resolveSegment(trigger, remaining + 20);
    for (const rc of recips) {
      if (remaining <= 0) break;
      // Cooldown lintas-trigger: 1 email lifecycle per user per N hari.
      if (await sentAnyInDays(rc.userId, PER_USER_COOLDOWN_DAYS)) continue;
      const qid = await enqueueLifecycleEmail({
        recipient: rc,
        trigger,
        periodKey,
        grid,
        preferencesUrl,
        daysSince: WINBACK_DAYS[trigger],
      });
      if (qid) {
        enqueued++;
        remaining--;
      }
    }
  }

  console.log(
    `[cron] email-lifecycle: enqueued=${enqueued} (usedToday=${usedToday}+${enqueued}/${DAILY_CAP})`,
  );
  return { enqueued, usedToday, cap: DAILY_CAP };
}
