/**
 * refill-window.ts — keputusan murni jendela waktu refill (TANPA DB, tanpa API).
 * Provider API hanya mengembalikan charge/start_count/status/remains/currency —
 * TIDAK ada field refill-window. Jadi ini ATURAN PANEL dari timestamp milik kita:
 *   orders.updated_at (≈ Success) → validity; refill.created_at → cooldown.
 *
 * Port verbatim dari socio.my (Refill Center v2, commit 5023c874; L3 0 findings).
 * Prioritas state: progress > not_success > inactive(no poid) > expired > cooldown
 * > refillable/clean. canRequest hanya true saat Success + poid asli + bukan
 * progress/expired/cooldown.
 */
export const HOUR_MS = 3_600_000;
export const DAY_MS = 24 * HOUR_MS;

export const REFILL_COOLDOWN_HOURS = Number(process.env.SOCIO_REFILL_COOLDOWN_HOURS ?? 24) || 24;
export const REFILL_VALIDITY_DAYS = Number(process.env.SOCIO_REFILL_VALIDITY_DAYS ?? 7) || 7;

export type RefillState =
  | "refillable" | "clean" | "cooldown" | "progress"
  | "expired" | "not_success" | "inactive";

export interface RefillWindowInput {
  status: string;
  isRefill: number | boolean;
  providerOrderId: string | null | undefined;
  quantity: number;
  remains: number;
  successAt: Date | string | null | undefined;
  lastRefillAt: Date | string | null;
  inProgress: boolean;
  now: number;
  cooldownHours?: number;
  validityDays?: number;
}

export interface RefillWindow {
  state: RefillState;
  canRequest: boolean;
  estimate: number;
  nextAvailableAt: number | null;
  refillUntil: number | null;
}

const toMs = (d: Date | string | null | undefined): number | null => {
  if (d == null) return null;
  const t = typeof d === "string" ? Date.parse(d) : d.getTime();
  return Number.isFinite(t) ? t : null;
};

export function computeRefillWindow(i: RefillWindowInput): RefillWindow {
  const cooldownMs = (i.cooldownHours ?? REFILL_COOLDOWN_HOURS) * HOUR_MS;
  const validityMs = (i.validityDays ?? REFILL_VALIDITY_DAYS) * DAY_MS;
  const isRefill = Number(i.isRefill) === 1;
  const poidReal = !!i.providerOrderId && String(i.providerOrderId) !== "0";
  const success = i.status === "Success";
  const estimate = success ? Math.max(0, Number(i.quantity ?? 0) - Number(i.remains ?? 0)) : 0;
  const successMs = toMs(i.successAt);
  const lastMs = toMs(i.lastRefillAt);
  const refillUntil = successMs != null ? successMs + validityMs : null;
  const nextAvailableAt = lastMs != null ? lastMs + cooldownMs : null;

  let state: RefillState;
  if (!isRefill) state = "inactive";
  else if (i.inProgress) state = "progress";
  else if (!success) state = "not_success";
  else if (!poidReal) state = "inactive";
  else if (refillUntil != null && i.now > refillUntil) state = "expired";
  else if (nextAvailableAt != null && i.now < nextAvailableAt) state = "cooldown";
  else if (estimate > 0) state = "refillable";
  else state = "clean";

  const canRequest =
    isRefill && success && poidReal && !i.inProgress && state !== "expired" && state !== "cooldown";

  return { state, canRequest, estimate, nextAvailableAt, refillUntil };
}
