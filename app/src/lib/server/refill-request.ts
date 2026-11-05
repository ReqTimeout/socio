import { db } from "@socio/db";
import { orders, services, provider } from "@socio/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { smmturkRefillFor } from "@socio/core/smmturk";
import { decryptSecret } from "$lib/server/crypto";
import { computeRefillWindow } from "@socio/core/refill-window";

/**
 * refill-request.ts — helper bersama request refill (port .my, Refill Center v1+v2).
 * Dipakai aksi /refill DAN /pesanan. Memperbaiki 2 bug jalur-uang lama di .id:
 *  1. provider-safe — endpoint+key milik order.providerId (bukan hardcoded SMMturk);
 *  2. set orders.status='Refilling' — supaya runRefillPolling memantau ulang.
 * Plus guard jendela waktu (cooldown/validity) via computeRefillWindow.
 * String dikirim lewat `sm` (RefillMsgs) — helper locale-agnostic (§9.2 refillServerMsgs).
 */
export interface RefillMsgs {
  invalidOrderId: string;
  orderNotFound: string;
  noRefillSupport: string;
  onlySuccessRefill: string;
  noAutoRefill: string;
  refillProcessing: string;
  refillFailed: (err: string) => string;
  refillOk: string;
  refillWindowClosed: string;
  refillTooSoon: (when: string) => string;
  locale: string;
}

export type RefillResult = { ok: true } | { ok: false; error: string };

export async function requestOrderRefill(
  orderId: number,
  userId: number,
  sm: RefillMsgs,
): Promise<RefillResult> {
  if (!orderId) return { ok: false, error: sm.invalidOrderId };

  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
    .limit(1);
  if (!order) return { ok: false, error: sm.orderNotFound };

  const [svc] = await db
    .select({ isRefill: services.isRefill })
    .from(services)
    .where(eq(services.id, Number(order.serviceId)))
    .limit(1);
  if (!svc?.isRefill) return { ok: false, error: sm.noRefillSupport };

  if (order.status !== "Success") return { ok: false, error: sm.onlySuccessRefill };
  if (!order.providerOrderId || order.providerOrderId === "0")
    return { ok: false, error: sm.noAutoRefill };

  // Refill terakhir order ini (tabel raw di luar drizzle — pola sama dgn cron/aksi lama).
  const refillRows = (await db
    .select()
    .from(sql`refill`)
    .where(eq(sql`order_id`, orderId))
    .orderBy(sql`created_at DESC`)
    .limit(1)) as any[];
  const latest = refillRows[0];
  const inProgress = order.status === ("Refilling" as any) || latest?.status === "Pending";

  const win = computeRefillWindow({
    status: order.status,
    isRefill: svc.isRefill,
    providerOrderId: order.providerOrderId,
    quantity: Number(order.quantity ?? 0),
    remains: Number(order.remains ?? 0),
    successAt: order.updatedAt,
    lastRefillAt: latest?.created_at ?? null,
    inProgress,
    now: Date.now(),
  });

  if (win.state === "progress") return { ok: false, error: sm.refillProcessing };
  if (win.state === "expired") return { ok: false, error: sm.refillWindowClosed };
  if (win.state === "cooldown") {
    const when = new Intl.DateTimeFormat(sm.locale, { dateStyle: "medium", timeStyle: "short" }).format(
      new Date(win.nextAvailableAt ?? Date.now()),
    );
    return { ok: false, error: sm.refillTooSoon(when) };
  }
  if (!win.canRequest) return { ok: false, error: sm.noAutoRefill };

  // Provider-safe: pakai endpoint + key milik provider order ini (bukan SMMturk default).
  const [p] = await db
    .select()
    .from(provider)
    .where(eq(provider.id, Number(order.providerId)))
    .limit(1);
  const key = p?.apiKey ? decryptSecret(p.apiKey) : "";
  if (!key) return { ok: false, error: sm.noAutoRefill };
  const endpoint = p?.apiUrlOrder || "https://smmturk.org/api/v2";

  let refillId = "0";
  try {
    const result = await smmturkRefillFor(endpoint, key, [order.providerOrderId]);
    refillId = String(result?.refill ?? result?.order ?? "0");
  } catch (e: any) {
    return { ok: false, error: sm.refillFailed(String(e?.message ?? e)) };
  }

  await db.execute(sql`
    INSERT INTO refill (refill_id, order_id, status, api_log, api_log_status, created_at)
    VALUES (${refillId}, ${orderId}, 'Pending', 'web', 'Pending', NOW())
  `);

  // Bug 2 lama: status tak pernah di-set → runRefillPolling (WHERE status='Refilling')
  // tak pernah memantau. Set sekarang; cron menutup kembali ke Success via refill_status.
  await db
    .update(orders)
    .set({ status: "Refilling" as any, updatedAt: new Date() })
    .where(eq(orders.id, orderId));

  return { ok: true };
}
