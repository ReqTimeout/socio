/**
 * G1 lifecycle — enqueue SATU email lifecycle ke `email_queue` dengan kunci
 * idempotensi.
 *
 * Urutan penting (anti-duplikat dù run ganda):
 *  1. Claim slot di `email_triggers_sent` (UNIQUE userId+triggerKey+periodKey).
 *     Insert gagal (duplikat) → email ini sudah dijadwalkan periode ini → skip.
 *     Ini menangkals dua run cron dalam minggu yang sama mengirim ulang.
 *  2. Baru render + insert `email_queue` (marketing, priority low) +
 *     `email_campaign_log`. Worker `email-queue` yang benar-benar mengirim
 *     (dengan suppression + throttle + kill switch sudah terpasang di sana).
 *
 * `templateData` menyimpan HTML utuh + flag `marketing:true` + `unsubscribe_url`
 * (URL one-click RFC 8058) supaya worker cukup meneruskan URL ke header
 * List-Unsubscribe. Footer HTML pakai URL konfirmasi manusia (/u/...) terpisah.
 */
import { db } from "@socio/db";
import { emailQueue, emailCampaignLog, emailTriggersSent } from "@socio/db/schema";
import { and, eq } from "drizzle-orm";
import { buildUnsubscribeUrl, buildOneClickUrl, DEFAULT_MARKETING_KEY } from "./unsubscribe.js";
import { buildLifecycleEmail } from "./templates.js";
import type { SegmentKey, Recipient, GridItem } from "./segments.js";

export interface EnqueueArgs {
  recipient: Recipient;
  trigger: SegmentKey;
  periodKey: string;
  grid: GridItem[];
  preferencesUrl: string;
  /** winback: jendela hari untuk copy. */
  daysSince?: number;
}

/**
 * @returns queueId yang dibuat, atau null bila slot periode sudah terisi
 *          (duplikat) / ada error.
 */
export async function enqueueLifecycleEmail(a: EnqueueArgs): Promise<number | null> {
  const { recipient, trigger, periodKey } = a;

  // 1. Claim idempotensi — INSERT gagal bila (user,trigger,periode) sudah ada.
  try {
    await db
      .insert(emailTriggersSent)
      .values({ userId: recipient.userId, triggerKey: trigger, periodKey });
  } catch {
    // Duplicate key (atau tabel belum siap) → jangan kirim ulang.
    return null;
  }

  // 2. Render + push ke queue.
  try {
    const humanUrl = buildUnsubscribeUrl(recipient.email, DEFAULT_MARKETING_KEY);
    const oneClickUrl = buildOneClickUrl(recipient.email, DEFAULT_MARKETING_KEY);
    const built = buildLifecycleEmail(trigger, {
      name: recipient.name,
      unsubscribeUrl: humanUrl,
      preferencesUrl: a.preferencesUrl,
      grid: a.grid,
      balanceRp: trigger === "balance_low" ? recipient.balance : undefined,
      daysSince: a.daysSince,
    });

    const templateData = JSON.stringify({
      subject: built.subject,
      html: built.html,
      body: built.text,
      marketing: true,
      // Header List-Unsubscribe (RFC 8058) → endpoint one-click, bukan /u/ manusia.
      unsubscribe_url: oneClickUrl,
    });

    const ret = await db
      .insert(emailQueue)
      .values({
        recipientEmail: recipient.email,
        recipientId: recipient.userId,
        templateName: `marketing-${trigger}`,
        templateData,
        priority: "low",
        status: "pending",
      })
      .$returningId();
    const queueId = Number((ret?.[0] as any)?.id ?? 0);

    if (queueId > 0) {
      await db
        .update(emailTriggersSent)
        .set({ queueId })
        .where(
          and(
            eq(emailTriggersSent.userId, recipient.userId),
            eq(emailTriggersSent.triggerKey, trigger),
            eq(emailTriggersSent.periodKey, periodKey),
          ),
        );
      await db.insert(emailCampaignLog).values({
        userId: recipient.userId,
        campaignType: `marketing_${trigger}`.slice(0, 50),
        queueId,
        emailSent: "pending",
      });
    }
    return queueId || null;
  } catch (e) {
    console.error(`[marketing] enqueueLifecycleEmail(${trigger}) gagal:`, e);
    return null;
  }
}
