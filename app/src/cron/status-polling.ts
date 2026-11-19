import { db } from "@socio/db";
import { orders, provider } from "@socio/db/schema";
import { eq, and, inArray, lt, or, isNull, sql } from "drizzle-orm";
import { smmturkStatusFor, smmturkRefillStatusFor } from "@socio/core/smmturk";
import {
  mapProviderStatus,
  nextPollIntervalMs,
  isFinalStatus,
  isCancelPending,
} from "@socio/core/order-status";
import { decryptSecret } from "$lib/server/crypto";
import { notifyOrderUpdate } from "$lib/server/notification";
import { notifyAdmins } from "$lib/server/email-templates";
import { enqueueOrderWebhook } from "$lib/server/api-webhook";

/** Tick: claim up to 200 orders needing a poll, batch status check
 * (multi-order endpoint) PER-PROVIDER via each provider's own API URL + key,
 * update, schedule next poll, notify on final.
 * Orders tanpa provider_order_id dianggap Error (port PHP status.php).
 */
export async function runStatusPolling(): Promise<void> {
  const now = new Date();
  const due = await db
    .select()
    .from(orders)
    .where(
      and(
        sql`${orders.status} IN ('Pending','In progress','Processing','Canceling')`,
        or(isNull(orders.nextPollAt), lt(orders.nextPollAt, now)),
      ),
    )
    .limit(200);

  if (due.length === 0) return;

  // Auto-error: order tanpa provider_order_id tidak bisa di-track
  const untracked = due.filter((o) => !o.providerOrderId || o.providerOrderId === "0");
  for (const o of untracked) {
    // F12: cancel yang tak terlacak di provider → langsung Canceled (tidak ada
    // apa-apa di provider untuk dibatalkan). Cron auto-refund yang membayar.
    if (isCancelPending(o.status)) {
      await db
        .update(orders)
        .set({ status: "Canceled" as any, updatedAt: new Date(), nextPollAt: null })
        .where(eq(orders.id, o.id));
      await notifyOrderUpdate(o.userId, o.id, "Canceled");
      void enqueueOrderWebhook(o, "Canceled");
      continue;
    }
    // provider MANUAL (1) tetap manual — jangan auto-error, reschedule saja
    if (o.providerId === 1) {
      await db
        .update(orders)
        .set({ nextPollAt: new Date(Date.now() + 30 * 60 * 1000) })
        .where(eq(orders.id, o.id));
      continue;
    }
    await db
      .update(orders)
      .set({ status: "Error" as any, updatedAt: new Date(), nextPollAt: null })
      .where(eq(orders.id, o.id));
    await notifyOrderUpdate(o.userId, o.id, "Error");
    void enqueueOrderWebhook(o, "Error");
  }

  const trackable = due.filter((o) => o.providerOrderId && o.providerOrderId !== "0");
  const providerOrders = new Map<number, typeof trackable>();
  for (const o of trackable) {
    const list = providerOrders.get(o.providerId) ?? [];
    list.push(o);
    providerOrders.set(o.providerId, list);
  }

  for (const [providerId, list] of providerOrders) {
    const [p] = await db.select().from(provider).where(eq(provider.id, providerId)).limit(1);
    const key = p?.apiKey ? decryptSecret(p.apiKey) : "";
    const endpoint = p?.apiUrlOrder || "https://smmturk.org/api/v2";

    // Provider tanpa key (legacy non-SMMturk) → tunda polling, jangan spam
    if (!key) {
      await db
        .update(orders)
        .set({ nextPollAt: new Date(Date.now() + 60 * 60 * 1000) })
        .where(
          inArray(
            orders.id,
            list.map((o) => o.id),
          ),
        );
      console.warn(`[cron] status-polling: provider ${providerId} tanpa api key, skip`);
      continue;
    }

    const ids = list.map((o) => o.providerOrderId);
    try {
      const result = await smmturkStatusFor(endpoint, key, ids);
      for (const o of list) {
        const r: any = result[o.providerOrderId];
        if (!r) continue;
        if (typeof r === "string") continue;
        // ERROR PER-ORDER dari provider (mis. "Incorrect order ID") = provider tak
        // kenal order ini (order lama/ditutup provider) → tak akan pernah selesai.
        // Tanpa cabang ini order menggantung "Pending" SELAMANYA & saldo konsumen
        // tak pernah dikembalikan (prod: 53 order s/d 2021, Rp527rb tertahan).
        // Tandai Error → cron auto-refund mengembalikan dana penuh.
        // Guard usia 2 jam: order yang baru dibuat mungkin belum terlihat provider.
        if (r.error) {
          // F12: order Canceling yang provider-nya lapor error per-order JANGAN
          // lewat pintu stale-error → Error → auto-refund. Uang Canceling terkunci
          // sampai provider konfirmasi batal. Reschedule 1 menit, tunggu poll lagi.
          if (isCancelPending(o.status)) {
            await db
              .update(orders)
              .set({ nextPollAt: new Date(Date.now() + 60 * 1000) })
              .where(eq(orders.id, o.id));
            continue;
          }
          const ageMs = Date.now() - new Date(o.createdAt ?? Date.now()).getTime();
          if (ageMs < 2 * 60 * 60 * 1000) {
            await db
              .update(orders)
              .set({ nextPollAt: new Date(Date.now() + 10 * 60 * 1000) })
              .where(eq(orders.id, o.id));
            continue;
          }
          await db
            .update(orders)
            .set({ status: "Error" as any, updatedAt: new Date(), nextPollAt: null })
            .where(eq(orders.id, o.id));
          try {
            await notifyOrderUpdate(o.userId, o.id, "Error");
          } catch {
            // notif best-effort
          }
          void enqueueOrderWebhook(o, "Error");
          continue;
        }
        const newStatus = mapProviderStatus(r.status);
        const remains = Number(r.remains ?? o.remains);
        const startCount = Number(r.start_count ?? o.startCount);
        const wasFinal = isFinalStatus(o.status);
        // Status yang tak dikenali provider (map → null) TIDAK boleh ditulis;
        // order tetap pada status terakhir yang valid & tetap dijadwal poll ulang.
        const isFinal = isFinalStatus(newStatus);
        // F12 — order `Canceling` sedang MENUNGGU konfirmasi provider. Status
        // non-final (In progress/Pending/Processing) TIDAK boleh menimpa intent
        // cancel, kalau tidak permintaan itu hilang dan order kembali diproses
        // seperti biasa sementara user mengira sudah batal.
        const cancelPending = isCancelPending(o.status);
        const keepCanceling = cancelPending && !isFinal;
        const update: any = {
          remains,
          startCount,
          updatedAt: new Date(),
        };
        if (newStatus && !keepCanceling) update.status = newStatus;
        if (!isFinal) {
          update.nextPollAt = new Date(
            Date.now() +
              nextPollIntervalMs(keepCanceling ? o.status : (newStatus ?? o.status), o.createdAt),
          );
        } else {
          update.nextPollAt = null;
        }
        await db.update(orders).set(update).where(eq(orders.id, o.id));
        // Provider SIAP mengirim walau cancel diminta → modal owner sudah dibayar
        // dan customer dapat layanan. Tidak ada refund (betul), tapi owner HARUS
        // tahu supaya bisa menagih provider.
        if (cancelPending && newStatus === "Success") {
          console.warn(
            `[cron] status-polling: order #${o.id} dikirim provider walau cancel diminta (provId ${o.providerOrderId})`,
          );
          try {
            await notifyAdmins({
              subject: `[Cancel Ignored] Order #${o.id} dikirim provider`,
              body: `Cancel diminta untuk order #${o.id} (provider ${o.providerId}, provId ${o.providerOrderId}) tetapi provider tetap menyelesaikannya. Tidak ada refund yang diberikan. Tagih order ini ke provider untuk memulihkan modal.`,
              ctaText: "Lihat order",
              ctaUrl: `/admin/orders?order=${o.id}`,
              templateName: "admin-alert",
            });
          } catch {
            /* best-effort */
          }
        }
        if (isFinal && !wasFinal) {
          await notifyOrderUpdate(o.userId, o.id, newStatus ?? o.status);
          // Webhook API publik: kirim status final + remains/startCount terbaru.
          void enqueueOrderWebhook({ ...o, remains, startCount }, newStatus ?? o.status);
        }
      }
    } catch (e) {
      console.error(`[cron] status-polling provider ${providerId} error:`, e);
      await db
        .update(orders)
        .set({ nextPollAt: new Date(Date.now() + 10 * 60 * 1000) })
        .where(
          inArray(
            orders.id,
            list.map((o) => o.id),
          ),
        );
    }
  }
  console.log(`[cron] status-polling: checked ${due.length} orders`);
}

/**
 * Poll status request refill (port status_refill.php). Order berstatus
 * 'Refilling' dicek statusnya ke provider — selesai/error/reject → Success.
 */
export async function runRefillPolling(): Promise<void> {
  const res: any = await db.execute(sql`
    SELECT o.id, o.provider_id AS providerId, o.provider_order_id AS providerOrderId,
           o.user_id AS userId, o.oid, o.price, o.remains, o.start_count AS startCount,
           r.refill_id AS refillId
    FROM orders o
    JOIN refill r ON r.order_id = o.id
    WHERE o.status = 'Refilling'
    ORDER BY o.id ASC
    LIMIT 100
  `);
  const list = Array.isArray(res?.[0]) ? res[0] : Array.isArray(res) ? res : [];
  if (!list.length) return;

  for (const row of list) {
    try {
      const [p] = await db
        .select()
        .from(provider)
        .where(eq(provider.id, Number(row.providerId)))
        .limit(1);
      const key = p?.apiKey ? decryptSecret(p.apiKey) : "";
      if (!key) continue;
      const endpoint = p?.apiUrlOrder || "https://smmturk.org/api/v2";
      const { status, raw } = await smmturkRefillStatusFor(endpoint, key, String(row.refillId));
      if (!status) continue;
      const mapped =
        status === "Completed" || status === "Success"
          ? "Success"
          : status === "In progress"
            ? "In progress"
            : status === "Error" || status === "Rejected"
              ? "Success" // port PHP: refill ditolak pun kembali ke Success
              : "Pending";
      await db.execute(sql`
        UPDATE refill SET status = ${mapped}, api_log_status = ${raw ?? ""} WHERE order_id = ${row.id}
      `);
      if (mapped === "Success") {
        await db
          .update(orders)
          .set({ status: "Success" as any, updatedAt: new Date() })
          .where(eq(orders.id, Number(row.id)));
        // Refill selesai = order akhirnya Success → webhook parity status-poll.
        void enqueueOrderWebhook(
          {
            userId: Number(row.userId),
            oid: String(row.oid),
            price: Number(row.price),
            remains: Number(row.remains),
            startCount: Number(row.startCount),
          },
          "Success",
        );
      }
    } catch (e) {
      console.error(`[cron] refill-polling order ${row.id} error:`, e);
    }
  }
  console.log(`[cron] refill-polling: checked ${list.length} refills`);
}
