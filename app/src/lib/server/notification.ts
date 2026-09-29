import { db } from "@socio/db";
import { notifications } from "@socio/db/schema";
import { sql } from "drizzle-orm";
import webpush from "web-push";

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:admin@socio.id",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
}

const STATUS_LABEL: Record<string, string> = {
  Success: "Selesai",
  Canceled: "Dibatalkan",
  Partial: "Partial",
  Error: "Gagal",
};

export type NotificationType = "order" | "deposit" | "ticket" | "news" | "promo";

/** Helper: fire Web Push best-effort. Silent fail (tabel bisa belum ada). */
async function dispatchPush(userId: number, title: string, body: string, url: string) {
  try {
    const subs = await db.execute(
      sql`SELECT endpoint, p256dh, auth FROM web_push_subscriptions WHERE user_id = ${userId}`,
    );
    const rows = (subs as any).rows ?? [];
    if (!rows.length) return;
    const payload = JSON.stringify({ title, body, url });
    await Promise.all(
      rows.map((r: any) => {
        const sub = { endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } };
        return webpush.sendNotification(sub as any, payload).catch(() => {});
      }),
    );
  } catch {
    /* ignore */
  }
}

/** Insert notifikasi in-app generik (deposit/affiliate/sistem). Best-effort. */
export async function createNotification(
  userId: number,
  title: string,
  message: string,
  type: NotificationType = "news",
): Promise<void> {
  try {
    await db.insert(notifications).values({ userId, type, title, message, actionUrl: null });
  } catch (e) {
    console.error("[notify] insert failed:", e);
  }
}

/** Insert an in-app notification + fire Web Push to subscribed devices. */
export async function notifyOrderUpdate(
  userId: number,
  orderId: number,
  status: string,
): Promise<void> {
  const label = STATUS_LABEL[status] ?? status;
  const title = `Order #${orderId} ${label}`;
  const message = `Status order kamu telah diperbarui menjadi ${label}.`;
  const actionUrl = `/pesanan`;
  try {
    await db.insert(notifications).values({ userId, type: "order", title, message, actionUrl });
  } catch (e) {
    console.error("[notify] insert failed:", e);
  }
  await dispatchPush(userId, title, message, `/pesanan/${orderId}`);
}

/** Notif user: admin membalas tiket. */
export async function notifyTicketReply(
  userId: number,
  ticketId: number,
  snippet: string,
): Promise<void> {
  const title = `Tiket #${ticketId} dibalas`;
  const message = String(snippet).slice(0, 200) || "Ada balasan baru dari tim Socio.id.";
  const actionUrl = `/tiket?ticket=${ticketId}`;
  try {
    await db.insert(notifications).values({ userId, type: "ticket", title, message, actionUrl });
  } catch (e) {
    console.error("[notify] ticket insert:", e);
  }
  await dispatchPush(userId, title, message, actionUrl);
}

/** Notif user: dia sendiri cancel order (in-app + push). */
export async function notifyOrderCancel(
  userId: number,
  orderId: number,
  amount: number,
): Promise<void> {
  const title = `Order #${orderId} dibatalkan`;
  const message = `Saldo ${new Intl.NumberFormat("id-ID").format(amount)} dikembalikan ke akunmu.`;
  const actionUrl = `/pesanan`;
  try {
    await db.insert(notifications).values({ userId, type: "order", title, message, actionUrl });
  } catch (e) {
    console.error("[notify] cancel insert:", e);
  }
  await dispatchPush(userId, title, message, actionUrl);
}
