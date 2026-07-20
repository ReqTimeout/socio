import { db } from "@socio/db";
import { notifications, users } from "@socio/db/schema";
import { eq, sql } from "drizzle-orm";
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

/** Insert an in-app notification + fire Web Push to subscribed devices. */
export async function notifyOrderUpdate(
  userId: number,
  orderId: number,
  status: string,
): Promise<void> {
  const label = STATUS_LABEL[status] ?? status;
  try {
    await db.insert(notifications).values({
      userId,
      type: "order",
      title: `Order #${orderId} ${label}`,
      message: `Status order kamu telah diperbarui menjadi ${label}.`,
      actionUrl: `/pesanan`,
    });
  } catch (e) {
    console.error("[notify] insert failed:", e);
  }

  // Web Push
  try {
    const subs = await db.execute(
      sql`SELECT endpoint, p256dh, auth FROM web_push_subscriptions WHERE user_id = ${userId}`,
    );
    const rows = (subs as any).rows ?? [];
    const payload = JSON.stringify({
      title: `Order #${orderId} ${label}`,
      body: `Status: ${label}`,
      url: `/pesanan/${orderId}`,
    });
    await Promise.all(
      rows.map((r: any) => {
        const sub = {
          endpoint: r.endpoint,
          keys: { p256dh: r.p256dh, auth: r.auth },
        };
        return webpush.sendNotification(sub as any, payload).catch(() => {});
      }),
    );
  } catch (e) {
    // push subscription table may not exist yet — ignore
  }
}
