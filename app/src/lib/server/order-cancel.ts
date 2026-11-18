import { db } from "@socio/db";
import { orders, services, provider } from "@socio/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { smmturkCancelFor, isProviderRejection } from "@socio/core/smmturk";
import { CANCELABLE_STATUS, isCancelableStatus, isCancelPending } from "@socio/core/order-status";
import { decryptSecret } from "$lib/server/crypto";
import { logAudit } from "$lib/server/admin";
import { notifyOrderUpdate } from "$lib/server/notification";
import { notifyAdmins } from "$lib/server/email-templates";
import { formatRupiah } from "$lib/format";

/**
 * F12 — SATU jalur cancel untuk user (/pesanan), mass cancel, dan admin
 * (/admin/orders). Helper bersama supaya tidak ada dua SQL berbeda.
 *
 * KENAPA helper ini TIDAK menulis uang langsung:
 *   Respons `action=cancel` dari SMMturk/SMMfollows cuma berarti "permintaan
 *   DITERIMA" (`{"order":<pid>,"cancel":<refId>}`), BUKAN "order sudah batal".
 *   Provider bisa terus memproses order itu — terbukti live pada order yang
 *   tetap `Processing` puluhan menit setelah cancel diterima. Aliran lama
 *   langsung refund saldo pada respons itu → customer sudah dapat uang
 *   sedangkan modal owner belum kembali dari provider. Itu kerugian owner.
 *
 * ALIRAN BARU (confirm-before-refund):
 *   1. Kirim cancel ke provider MILIK order (endpoint + key provider itu).
 *   2. Diterima    → status `Canceling`, TIDAK ada refund.
 *      Ditolak     → tidak ada perubahan DB, order tetap dikerjakan.
 *      Unreachable → TIDAK ada perubahan DB, TIDAK refund (dulu: refund juga!).
 *   3. Cron status-polling (1 menit) menaikkan `Canceling` → Canceled/Error/
 *      Partial HANYA bila provider melaporkannya.
 *   4. Cron auto-refund (tiap 15 menit) membayar lewat ledger beraudit + guard
 *      `ledgerRefundSum` + CAS `is_refund`. Satu-satunya penulis uang.
 *
 * Order TANPA provider_order_id (manual/tak terlacak) tidak ada apa-apa di
 * provider untuk dibatalkan → langsung `Canceled` (aman), refund tetap oleh cron.
 */

export type CancelFailReason =
  | "not_found"
  | "not_cancelable"
  | "not_supported"
  | "rejected"
  | "unreachable"
  | "already"
  | "race";

export type CancelResult =
  | {
      ok: true;
      /** `canceling` = menunggu provider; `canceled` = tak terlacak, langsung batal. */
      state: "canceling" | "canceled";
      orderId: number;
      userId: number;
      /** Nominal order dalam RUPIAH (bukan sen) — untuk pesan hasil yang jujur. */
      price: number;
    }
  | { ok: false; reason: CancelFailReason };

/**
 * Panggil provider untuk cancel. Pertahankan tiga hasil supaya caller bisa
 * membedakan "ditolak eksplisit" (jangan coba lagi) dari "tak sampai"
 * (boleh coba lagi, tapi JANGAN refund).
 */
async function callProviderCancel(order: {
  providerId: unknown;
  providerOrderId: string | null;
}): Promise<"ok" | "rejected" | "unreachable"> {
  const [p] = await db
    .select()
    .from(provider)
    .where(eq(provider.id, Number(order.providerId)))
    .limit(1);
  const key = p?.apiKey ? decryptSecret(p.apiKey) : "";
  if (!key) {
    console.warn(
      `[cancel] provider ${order.providerId} tanpa api key — TIDAK cancel, TIDAK refund`,
    );
    return "unreachable";
  }
  const endpoint = p?.apiUrlOrder || "https://smmturk.org/api/v2";
  try {
    await smmturkCancelFor(endpoint, key, [String(order.providerOrderId)]);
    return "ok";
  } catch (e: any) {
    if (isProviderRejection(e)) return "rejected";
    console.error(`[cancel] provider unreachable (provId ${order.providerOrderId}):`, e);
    return "unreachable";
  }
}

/**
 * Minta cancel satu order. `userId` bila dipanggil user (cakupan keamanan:
 * user hanya boleh cancel order sendiri); `adminId` bila dipanggil admin
 * (audit + boleh cancel order siapa pun).
 */
export async function requestOrderCancel(
  orderId: number,
  opts: { userId?: number; adminId?: number; ip?: string } = {},
): Promise<CancelResult> {
  if (!Number.isFinite(orderId) || orderId <= 0) return { ok: false, reason: "not_found" };

  const conds = [eq(orders.id, orderId)];
  if (opts.userId !== undefined) conds.push(eq(orders.userId, Number(opts.userId)));
  const [order] = await db
    .select()
    .from(orders)
    .where(and(...conds))
    .limit(1);
  if (!order) return { ok: false, reason: "not_found" };

  // Idempoten: jangan kirim permintaan kedua ke provider untuk intent yang sama.
  if (isCancelPending(order.status)) return { ok: false, reason: "already" };
  if (!isCancelableStatus(order.status)) return { ok: false, reason: "not_cancelable" };

  // Guard flag layanan (UI sudah gate tombol; ini jaga request lama/direct POST).
  const [svc] = await db
    .select({ allowCancel: services.allowCancel })
    .from(services)
    .where(eq(services.id, Number(order.serviceId)))
    .limit(1);
  if (!svc || svc.allowCancel !== 1) return { ok: false, reason: "not_supported" };

  const untracked = !order.providerOrderId || order.providerOrderId === "0";
  const price = Number(order.price);
  const userId = Number(order.userId);

  if (!untracked) {
    const r = await callProviderCancel(order);
    // H1/H2: kedua kegagalan TIDAK menulis DB dan TIDAK refund.
    if (r === "rejected") {
      console.warn(`[cancel] provider rejected #${orderId} (provId ${order.providerOrderId})`);
      return { ok: false, reason: "rejected" };
    }
    if (r === "unreachable") return { ok: false, reason: "unreachable" };
  }

  // CAS: hanya satu permintaan boleh menang bila ada klik serentak.
  const target = untracked ? "Canceled" : "Canceling";
  const res: any = await db
    .update(orders)
    .set({
      status: target as any,
      updatedAt: new Date(),
      // Batal langsung = final, berhenti poll. Menunggu = poll ulang segera.
      nextPollAt: untracked ? null : new Date(),
    })
    .where(and(eq(orders.id, orderId), inArray(orders.status, [...CANCELABLE_STATUS])));
  const claimed = Array.isArray(res) ? res[0]?.affectedRows : res?.affectedRows;
  if (Number(claimed ?? 1) === 0) return { ok: false, reason: "race" };

  if (opts.adminId !== undefined) {
    await logAudit({
      adminId: Number(opts.adminId),
      action: "cancel_order_at_provider",
      entity: "order",
      entityId: orderId,
      detail: {
        to: target,
        providerId: Number(order.providerId),
        providerOrderId: order.providerOrderId,
        untracked,
        price,
        note: "Tidak ada refund di sini — cron auto-refund membayar setelah provider konfirmasi.",
      },
      ip: opts.ip,
    });
  }

  // Notif jujur: `Canceling` BUKAN "sudah refund". Jangan pakai notifyOrderCancel
  // (teksnya "saldo dikembalikan") untuk status menunggu.
  try {
    await notifyOrderUpdate(userId, orderId, target);
  } catch {
    /* best-effort */
  }
  try {
    await notifyAdmins({
      subject: `[Cancel ${opts.adminId !== undefined ? "Admin" : "User"}] Order #${orderId}`,
      body: untracked
        ? `Order #${orderId} dibatalkan (tak terlacak di provider). Refund ${formatRupiah(price)} akan dikredit oleh cron auto-refund.`
        : `Permintaan cancel DITERIMA provider ${order.providerId} untuk order #${orderId} (provId ${order.providerOrderId}). Status sekarang Canceling — BELUM ada refund. Cron auto-refund membayar ${formatRupiah(price)} hanya setelah provider konfirmasi Canceled/Error/Partial.`,
      ctaText: "Lihat order",
      ctaUrl: `/admin/orders?order=${orderId}`,
      templateName: "admin-alert",
    });
  } catch {
    /* best-effort */
  }

  return { ok: true, state: untracked ? "canceled" : "canceling", orderId, userId, price };
}

/** Fragmen SQL: order yang sedang menunggu konfirmasi cancel provider. */
export const cancelPendingSql = sql`${orders.status} = 'Canceling'`;
