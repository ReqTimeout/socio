/**
 * quota.ts — gerbang kuota provider email (Resend free: 100/hari · 3.000/bulan).
 * Port .my 9e000248 (P2.5 gap-plan 2026-11-17).
 *
 * Semua fungsi di sini PURE (tanpa import db) supaya bisa diuji tanpa stub
 * database dan dipakai bersama oleh cron worker, lifecycle, maupun halaman
 * admin — satu sumber kebenaran angka.
 *
 * KONTEKS: produksi hanya punya Resend (SMTP fallback mati), jadi email
 * TRANSAKSIONAL + marketing berbagi plafon 100/hari. Keputusan owner:
 * activation TETAP diprioritaskan (user baru wajib tahu cara deposit), tapi
 * lane lain dapat jatah terlindungi dan plafon provider tidak pernah dijebol.
 *
 * ENV (opsional, default konservatif sama dengan .my):
 *  - EMAIL_PROVIDER_DAILY_CAP   default 95  (100 minus buffer retry)
 *  - EMAIL_PROVIDER_MONTHLY_CAP default 3000
 *  - EMAIL_MARKETING_TOTAL_CAP  default 35  (= 25 activation + 5 protected + sisanya winback)
 *  - EMAIL_MARKETING_GUARD_CAP  default 10  (marketing saat guard bulanan aktif)
 */

const DEFAULT_PROVIDER_DAILY_CAP = 95;
const DEFAULT_PROVIDER_MONTHLY_CAP = 3000;
const DEFAULT_MARKETING_TOTAL_CAP = 35;
const DEFAULT_MARKETING_GUARD_CAP = 10;
/** Winback hanya "nyempil" bila sisa budget provider hari itu masih lega. */
export const WINBACK_MIN_HEADROOM = 15;
/** Admin-alert ditahan bila sisa harian ≤ angka ini — inbox user didahulukan. */
export const ADMIN_ALERT_RESERVE = 5;

export function envPositiveInt(name: string, fallback: number): number {
  const raw = (process.env[name] ?? "").trim();
  if (!raw) return fallback;
  const v = Number(raw);
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : fallback;
}

export function providerDailyCap(): number {
  return envPositiveInt("EMAIL_PROVIDER_DAILY_CAP", DEFAULT_PROVIDER_DAILY_CAP);
}
export function providerMonthlyCap(): number {
  return envPositiveInt("EMAIL_PROVIDER_MONTHLY_CAP", DEFAULT_PROVIDER_MONTHLY_CAP);
}
export function marketingTotalCap(): number {
  return envPositiveInt("EMAIL_MARKETING_TOTAL_CAP", DEFAULT_MARKETING_TOTAL_CAP);
}
export function marketingGuardCap(): number {
  return envPositiveInt("EMAIL_MARKETING_GUARD_CAP", DEFAULT_MARKETING_GUARD_CAP);
}

/** Kelas template: marketing = lifecycle + campaign manual. */
export function isMarketingTemplate(t: string | null | undefined): boolean {
  return !!t && (/^campaign-/i.test(t) || /^marketing-/i.test(t));
}
/** Kelas template: alert internal admin (admin-deposit-pending, admin-alert). */
export function isAdminAlertTemplate(t: string | null | undefined): boolean {
  return !!t && /^admin-/i.test(t);
}

/**
 * Guard pace bulanan: mulai hari ke-27, bila pengiriman bulan ini sudah ≥90%
 * plafon bulan, lane marketing dipangkas (transaksional TIDAK tersentuh).
 */
export function monthlyPaceGuardActive(i: {
  monthSent: number;
  monthCap: number;
  dayOfMonth: number;
}): boolean {
  return i.dayOfMonth >= 27 && i.monthSent >= i.monthCap * 0.9;
}

export interface LaneCaps {
  total: number;
  activation: number;
  /** balance_low (dan coupon_expiring bila ada) — jatah yang TIDAK boleh dimakan activation. */
  protected: number;
  winback: number;
}

/** Susunan lane normal (cap total 35 → 25 activation + 5 protected + ±5 winback). */
export function normalLaneCaps(): LaneCaps {
  const total = marketingTotalCap();
  return { total, activation: Math.min(25, total), protected: 5, winback: 10 };
}

/** Lane saat guard bulanan aktif: hemat — hanya 10/hari, tanpa winback. */
export function guardLaneCaps(): LaneCaps {
  const total = marketingGuardCap();
  return { total, activation: Math.min(8, total), protected: Math.min(2, total), winback: 0 };
}

export interface LaneBudgets {
  protectedBudget: number;
  activationBudget: number;
  winbackBudget: number;
}

/**
 * Bagi budget lifecycle per lane. `usedToday` = marketing yang sudah di-enqueue
 * hari ini; `dailyHeadroom` = sisa kuota provider hari ini (cap − terkirim).
 * Aturan: protected dicoret duluan (tidak bisa direbut activation), activation
 * maksimal sisanya, winback hanya bila headroom ≥ 15 dan caps mengizinkan.
 */
export function computeLaneBudgets(
  caps: LaneCaps,
  usedToday: number,
  dailyHeadroom: number,
): LaneBudgets {
  const left = Math.max(0, caps.total - usedToday);
  const protectedBudget = Math.min(caps.protected, left);
  const activationBudget = Math.min(caps.activation, Math.max(0, left - protectedBudget));
  const winbackBudget =
    caps.winback > 0 && dailyHeadroom >= WINBACK_MIN_HEADROOM
      ? Math.min(caps.winback, Math.max(0, left - protectedBudget - activationBudget))
      : 0;
  return { protectedBudget, activationBudget, winbackBudget };
}
