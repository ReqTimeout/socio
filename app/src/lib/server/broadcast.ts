import { db } from "@socio/db";
import { users, notifications, webPushSubscriptions, broadcastCampaigns } from "@socio/db/schema";
import { eq, sql, and, inArray } from "drizzle-orm";
import webpush from "web-push";
import { logAudit } from "./admin";

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails("mailto:admin@socio.id", process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  } catch {}
}

export type Segment = "all" | "member" | "agen" | "reseller" | "verified" | "unverified";

export async function getUserIdsForSegment(segment: Segment): Promise<number[]> {
  const conds: any[] = [];
  if (segment === "member") conds.push(eq(users.level, "Member" as any));
  else if (segment === "agen") conds.push(eq(users.level, "Agen" as any));
  else if (segment === "reseller") conds.push(eq(users.level, "Reseller" as any));
  else if (segment === "verified") conds.push(eq(users.verify, "Yes" as any));
  else if (segment === "unverified") conds.push(eq(users.verify, "No" as any));
  // all = no conds

  const where = conds.length ? and(...conds) : undefined;
  const rows = await db.select({ id: users.id }).from(users).where(where as any);
  return rows.map((r) => Number(r.id));
}

export async function sendBroadcast(params: {
  title: string;
  body: string;
  segment: Segment;
  channel: "in_app" | "web_push" | "both";
  createdBy: number;
  ip?: string;
}) {
  const { title, body, segment, channel, createdBy, ip } = params;
  if (!title.trim() || !body.trim()) throw new Error("Judul dan isi wajib diisi.");
  if (title.length > 120) throw new Error("Judul maksimal 120 karakter.");
  if (body.length > 240) throw new Error("Isi maksimal 240 karakter.");

  const userIds = await getUserIdsForSegment(segment);
  if (userIds.length === 0) throw new Error("Tidak ada user di segment ini.");

  // Insert campaign
  await db.insert(broadcastCampaigns).values({
    title: title.trim(),
    body: body.trim(),
    targetSegment: segment,
    channel,
    sentCount: 0,
    createdBy,
    createdAt: new Date(),
  } as any);
  const campaignIdRow = await db.select({ id: broadcastCampaigns.id }).from(broadcastCampaigns).orderBy(sql`${broadcastCampaigns.id} DESC`).limit(1);
  const campaignId = campaignIdRow[0]?.id ?? 0;

  let sent = 0;

  // In-app: batched inserts (500 per batch)
  if (channel === "in_app" || channel === "both") {
    const batchSize = 500;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      const values = batch.map((uid) => ({
        userId: uid,
        type: "promo" as const,
        title: title.trim(),
        message: body.trim(),
        actionUrl: null,
      }));
      await db.insert(notifications).values(values as any);
      sent += batch.length;
    }
  }

  // Web Push: batched sends (100 per batch)
  if (channel === "web_push" || channel === "both") {
    const batchSize = 100;
    let pushSent = 0;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      const subs = await db.select().from(webPushSubscriptions).where(inArray(webPushSubscriptions.userId, batch));
      const payload = JSON.stringify({ title: title.trim(), body: body.trim(), url: "/" });
      await Promise.all(
        subs.map((r: any) => {
          const sub = { endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } };
          return webpush.sendNotification(sub as any, payload).catch(() => {});
        }),
      );
      pushSent += subs.length;
    }
    if (channel === "web_push") sent = pushSent;
  }

  // Update campaign
  await db.update(broadcastCampaigns).set({ sentCount: sent, sentAt: new Date() }).where(eq(broadcastCampaigns.id, campaignId));

  await logAudit({ adminId: createdBy, action: "broadcast_send", entity: "broadcast_campaign", entityId: campaignId, detail: { title, segment, channel, sent }, ip });

  return { campaignId, sent };
}
