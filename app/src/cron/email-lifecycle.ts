/**
 * G1 lifecycle/winback — cron email perilaku (BUKAN blast).
 *
 * Dijadwalkan 09:00 WIB (lihat jobs.ts tz=Asia/Jakarta). Setiap run:
 *  1. Gerbang: kill switch OFF → skip. Di luar jendela 08:00–20:00 WIB → skip
 *     (kecuali dipicu manual dari admin).
 *  2. Budget lane (P2.5, port .my 9e000248 — lihat email/quota.ts): total 35 =
 *     activation ≤25 + protected 5 (balance_low, tidak boleh direbut activation)
 *     + winback ≤ sisa slot hanya bila headroom provider ≥15. Guard pace bulanan
 *     (≥hari-27 & ≥90% plafon bulan) → lane hemat 10. Headroom = cap provider −
 *     email terkirim hari ini (transaksional + marketing berbagi plafon Resend).
 *  3. Untuk tiap lane AKTIF, ambil penerima (sudah difilter opt-in +
 *     suppression di SQL), hormati cooldown per-user, enqueue idempoten.
 *
 * Lane aktif = ACTIVE_TRIGGERS (bawaan: activation — keputusan owner 6-Nov)
 * + gate env per-lane `EMAIL_LANE_<KEY>` (1/true/on/yes). Lane baru WP7
 * (reseller_unpaid, deposit_canceled) default OFF — kill switch global ON
 * TIDAK otomatis menghidupkannya (gap-plan §2.7). Worker `email-queue` yang
 * benar-benar mengirim (throttle + suppression + kill switch + kuota provider).
 *
 * Prioritas isi budget: reseller_unpaid → activation → balance_low →
 * deposit_canceled → winback (30→60→90). Reseller didahulukan dalam lane
 * activation (kohort kecil, nilai per konversi tinggi); deposit_canceled
 * ikut lane winback (hanya nyempil bila headroom provider lega).
 */
import { db } from "@socio/db";
import { emailQueue, emailTriggersSent } from "@socio/db/schema";
import { and, eq, gte, sql } from "drizzle-orm";
import {
  PER_USER_COOLDOWN_DAYS,
  marketingEnabled,
  weekPeriodKey,
  withinSendWindow,
} from "$lib/server/marketing/config.js";
import {
  providerDailyCap,
  providerMonthlyCap,
  monthlyPaceGuardActive,
  normalLaneCaps,
  guardLaneCaps,
  computeLaneBudgets,
} from "$lib/server/email/quota.js";
import {
  fetchPopularCategories,
  resolveSegment,
  type SegmentKey,
} from "$lib/server/marketing/segments.js";
import { enqueueLifecycleEmail } from "$lib/server/marketing/enqueue.js";

/** Segmen bawaan yang dijadwalkan (tanpa env). Tambah key untuk mengaktifkan. */
const ACTIVE_TRIGGERS: SegmentKey[] = ["activation"];

/** Urutan prioritas lane (coupon_expiring belum ada di .id — menunggu H3). */
const LANE_ORDER: SegmentKey[] = [
  "reseller_unpaid",
  "activation",
  "balance_low",
  "deposit_canceled",
  "winback_30",
  "winback_60",
  "winback_90",
];

/** Gate per-lane: bawaan ACTIVE_TRIGGERS, sisanya env EMAIL_LANE_<KEY> (OFF). */
function laneEnabled(key: SegmentKey): boolean {
  if (ACTIVE_TRIGGERS.includes(key)) return true;
  const v = (process.env[`EMAIL_LANE_${key.toUpperCase()}`] ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "on" || v === "yes";
}

/** reseller_unpaid se-lane activation; deposit_canceled se-lane winback. */
function laneOf(seg: SegmentKey): "protected" | "activation" | "winback" {
  if (seg === "activation" || seg === "reseller_unpaid") return "activation";
  if (seg.startsWith("winback") || seg === "deposit_canceled") return "winback";
  return "protected";
}
type LaneName = "protected" | "activation" | "winback";
function keyOf(l: LaneName): "protectedBudget" | "activationBudget" | "winbackBudget" {
  return l === "activation"
    ? "activationBudget"
    : l === "winback"
      ? "winbackBudget"
      : "protectedBudget";
}

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

/**
 * Terkirim HARI ini di semua lane (transaksional+marketing) — dasar headroom
 * kuota provider. `created_at` dihitung MySQL (clock sama dengan CURDATE()) —
 * sengaja JANGAN pakai sent_at yang ditulis JS (jam UTC) agar tidak meleset
 * 7 jam (pitfall timezone DATETIME).
 */
async function providerSentToday(): Promise<number> {
  try {
    const [row] = await db
      .select({ c: sql<number>`COUNT(*)` })
      .from(emailQueue)
      .where(and(eq(emailQueue.status, "sent"), sql`DATE(${emailQueue.createdAt}) = CURDATE()`));
    return Number(row?.c ?? 0);
  } catch (e) {
    console.error("[cron] email-lifecycle provider-sent-today count failed:", e);
    return 0;
  }
}

async function providerSentMonth(): Promise<number> {
  try {
    const [row] = await db
      .select({ c: sql<number>`COUNT(*)` })
      .from(emailQueue)
      .where(
        and(
          eq(emailQueue.status, "sent"),
          sql`${emailQueue.createdAt} >= DATE_FORMAT(CURDATE(), '%Y-%m-01')`,
        ),
      );
    return Number(row?.c ?? 0);
  } catch (e) {
    console.error("[cron] email-lifecycle provider-sent-month count failed:", e);
    return 0;
  }
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
  const empty: LifecycleResult = { enqueued: 0, usedToday: 0, cap: normalLaneCaps().total };

  if (!marketingEnabled()) {
    console.log("[cron] email-lifecycle: EMAIL_MARKETING_ENABLED OFF → skip");
    return { ...empty, skipped: "kill-switch-off" };
  }
  if (!triggeredBy && !withinSendWindow()) {
    console.log("[cron] email-lifecycle: di luar jendela kirim WIB → skip");
    return { ...empty, skipped: "quiet-hours" };
  }

  const usedToday = await claimsWithinHours(24);

  // Kuota provider (P2.5): transaksional + marketing berbagi plafon Resend →
  // headroom menentukan boleh-tidaknya lane winback ikut antre hari ini.
  const sentToday = await providerSentToday();
  const dailyHeadroom = Math.max(0, providerDailyCap() - sentToday);
  const guardActive = monthlyPaceGuardActive({
    monthSent: await providerSentMonth(),
    monthCap: providerMonthlyCap(),
    dayOfMonth: new Date().getDate(),
  });
  const caps = guardActive ? guardLaneCaps() : normalLaneCaps();
  const lanes = computeLaneBudgets(caps, usedToday, dailyHeadroom);
  if (caps.total - usedToday <= 0) {
    console.log(
      `[cron] email-lifecycle: budget harian habis (${usedToday}/${caps.total}${guardActive ? " GUARD" : ""})`,
    );
    return { ...empty, usedToday, cap: caps.total };
  }

  const periodKey = weekPeriodKey();
  const preferencesUrl = `${appBase()}/akun`;
  // Grid layanan diambil sekali, dipakai semua email run ini (hemat query).
  const grid = await fetchPopularCategories(6);

  let enqueued = 0;
  const parts: string[] = [];
  for (const trigger of LANE_ORDER) {
    if (!laneEnabled(trigger)) continue;
    const key = keyOf(laneOf(trigger));
    let budget = lanes[key];
    if (budget <= 0) {
      parts.push(`${trigger}=0`);
      continue;
    }
    // Ambil sedikit lebih banyak dari sisa budget (antisipasi cooldown skip).
    const recips = await resolveSegment(trigger, budget + 20);
    let enq = 0;
    for (const rc of recips) {
      if (budget <= 0) break;
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
        budget--;
        lanes[key] = budget;
        enq++;
        enqueued++;
      }
    }
    parts.push(`${trigger}=${enq}`);
  }

  console.log(
    `[cron] email-lifecycle: enqueued=${enqueued} (${parts.join(" ")}) usedToday=${usedToday}+${enqueued}/${caps.total}${guardActive ? " GUARD" : ""} providerLeft=${dailyHeadroom}/${providerDailyCap()}`,
  );
  return { enqueued, usedToday, cap: caps.total };
}
