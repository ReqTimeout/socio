import { db } from "@socio/db";
import { orders, services, provider } from "@socio/db/schema";
import { eq, desc, sql, and, inArray } from "drizzle-orm";
import { fail } from "@sveltejs/kit";
import { smmturkStatusFor } from "@socio/core/smmturk";
import { decryptSecret } from "$lib/server/crypto";
import { requestOrderRefill } from "$lib/server/refill-request";
import { computeRefillWindow, type RefillState } from "@socio/core/refill-window";
import { refillServerMsgs } from "$lib/refill-copy";
import type { PageServerLoad, Actions } from "./$types";

/**
 * Pusat Refill (port .my Refill Center v1+v2, handover §8.4 + adaptasi §10.3).
 * Gotcha KRITIS: runStatusPolling membeku saat Success → remains tersimpan tidak
 * pernah mencerminkan drop pasca-selesai. Load ini re-poll provider LIVE terbatas
 * (cap 100, batch per-provider, degradasi anggun) lalu menulis remains/startCount
 * balik ke orders sebelum menghitung estimate.
 */
const REFRESH_CAP = 100;
type RowState = RefillState;

export const load: PageServerLoad = async ({ url, locals }) => {
  const tab = (url.searchParams.get("t") ?? "refillable").trim();
  const userId = Number(locals.user!.id);

  const base = await db
    .select({
      id: orders.id, oid: orders.oid, serviceName: orders.serviceName, data: orders.data,
      quantity: orders.quantity, remains: orders.remains, startCount: orders.startCount,
      status: orders.status, createdAt: orders.createdAt, updatedAt: orders.updatedAt,
      serviceId: orders.serviceId, providerId: orders.providerId, providerOrderId: orders.providerOrderId,
    })
    .from(orders)
    .innerJoin(services, eq(services.id, orders.serviceId))
    .where(and(eq(orders.userId, userId), eq(services.isRefill, 1)))
    .orderBy(desc(orders.createdAt))
    .limit(300);

  const candidates = base
    .filter((o) => o.status === "Success" && !!o.providerOrderId && String(o.providerOrderId) !== "0")
    .slice(0, REFRESH_CAP);
  const liveRemains = new Map<number, number>();

  if (candidates.length) {
    const pids = [...new Set(candidates.map((o) => Number(o.providerId)))];
    const provRows = await db
      .select({ id: provider.id, apiUrlOrder: provider.apiUrlOrder, apiKey: provider.apiKey })
      .from(provider)
      .where(inArray(provider.id, pids));
    const provMap = new Map(provRows.map((p) => [Number(p.id), p]));
    const byProvider = new Map<number, typeof candidates>();
    for (const o of candidates) {
      const list = byProvider.get(Number(o.providerId)) ?? [];
      list.push(o);
      byProvider.set(Number(o.providerId), list);
    }
    for (const [pid, list] of byProvider) {
      const p = provMap.get(pid);
      const key = p?.apiKey ? decryptSecret(p.apiKey) : "";
      if (!key) continue;
      const endpoint = p?.apiUrlOrder || "https://smmturk.org/api/v2";
      try {
        const res = await smmturkStatusFor(endpoint, key, list.map((o) => o.providerOrderId));
        for (const o of list) {
          const r: any = res[o.providerOrderId];
          if (!r || typeof r === "string") continue;
          const rem = Number(r.remains ?? o.remains);
          const start = Number(r.start_count ?? o.startCount);
          if (Number.isFinite(rem)) liveRemains.set(Number(o.id), rem);
          if (Number.isFinite(rem) || Number.isFinite(start)) {
            await db.update(orders)
              .set({ remains: Number.isFinite(rem) ? rem : o.remains, startCount: Number.isFinite(start) ? start : o.startCount })
              .where(eq(orders.id, Number(o.id)));
          }
        }
      } catch (e) {
        // Degradasi anggun: provider tak terjangkau → pakai remains tersimpan, jangan 500.
        console.warn(`[refill] status refresh provider ${pid} gagal:`, e);
      }
    }
  }

  // Refill terakhir per order (tabel raw di luar drizzle — pola sama dgn cron).
  const ids = base.map((o) => Number(o.id)).filter(Number.isInteger);
  const lastRefill = new Map<number, { status: string; createdAt: string | null }>();
  if (ids.length) {
    const res: any = await db.execute(sql`
      SELECT order_id AS orderId, status, created_at AS createdAt FROM refill
      WHERE order_id IN (${sql.join(ids.map((i) => sql`${i}`), sql`, `)})
      ORDER BY created_at DESC
    `);
    const list = Array.isArray(res?.[0]) ? res[0] : Array.isArray(res) ? res : [];
    for (const r of list) {
      const oid = Number(r.orderId);
      if (!lastRefill.has(oid))
        lastRefill.set(oid, { status: String(r.status), createdAt: r.createdAt ? String(r.createdAt) : null });
    }
  }

  const nowMs = Date.now();
  const rows = base.map((o) => {
    const id = Number(o.id);
    const rem = liveRemains.has(id) ? liveRemains.get(id)! : Number(o.remains ?? 0);
    const rf = lastRefill.get(id);
    const inProgress = o.status === ("Refilling" as any) || rf?.status === "Pending";
    const win = computeRefillWindow({
      status: o.status, isRefill: 1, providerOrderId: o.providerOrderId,
      quantity: Number(o.quantity ?? 0), remains: rem, successAt: o.updatedAt,
      lastRefillAt: rf?.createdAt ?? null, inProgress, now: nowMs,
    });
    return { ...o, remains: rem, estimate: win.estimate, state: win.state as RowState,
      canRequest: win.canRequest, nextAvailableAt: win.nextAvailableAt, refillUntil: win.refillUntil };
  });

  const counts = {
    refillable: rows.filter((r) => r.state === "refillable").length,
    progress: rows.filter((r) => r.state === "progress" || r.state === "cooldown").length,
    all: rows.length,
  };
  const filtered =
    tab === "all" ? rows
    : tab === "progress" ? rows.filter((r) => r.state === "progress" || r.state === "cooldown")
    : rows.filter((r) => r.state === "refillable");

  return { tab, counts, rows: filtered, lastUpdate: new Date().toISOString() };
};

export const actions: Actions = {
  refill: async ({ request, locals }) => {
    const sm = { ...refillServerMsgs, locale: "id" };
    const form = await request.formData();
    const orderId = Number(form.get("id"));
    const r = await requestOrderRefill(orderId, Number(locals.user!.id), sm);
    if (!r.ok) return fail(400, { error: r.error });
    return { success: sm.refillOk };
  },
};
