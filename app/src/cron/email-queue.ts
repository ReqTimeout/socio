import { db } from "@socio/db";
import { emailQueue, emailCampaignTracking, emailCampaignLog } from "@socio/db/schema";
import { eq, and, lt, sql } from "drizzle-orm";
import { sendEmail } from "$lib/server/email";
import { emailShell, emailCta, emailFooterTransactional } from "$lib/server/email/render.js";

/**
 * Drain antrian `email_queue` → kirim via SMTP/Resend.
 * Port `app.socio.id/cron/send-email-queue.php`: batch kecil, retry ≤3
 * (exponential gap), cleanup failed >7 hari. Dipanggil tiap 5 menit.
 *
 * GUARD anti-throttle (insiden Gmail 421-4.7.28, Sep-2026):
 *  - Transaksional (non campaign-/marketing-) selalu duluan (priority DESC).
 *  - Marketing max 10 kirim/run; penerima Gmail max 5/run (≈60/jam).
 *  - Sisanya tetap pending untuk run berikutnya (tidak di-drop).
 * Angka ini konservatif selama reputasi domain pulih; naikkan bertahap
 * setelah Postmaster Tools menunjukkan spam rate <0.1%.
 */
const BATCH = 30;
const MAX_MARKETING_PER_RUN = 10;
const MAX_GMAIL_PER_RUN = 5;
const GMAIL_RE = /@(gmail|googlemail)\.com$/i;
const isMarketing = (t: string | null | undefined) =>
  !!t && (/^campaign-/i.test(t) || /^marketing-/i.test(t));

export async function runEmailQueue(): Promise<void> {
  // Hapus queueue gagal > 7 hari
  try {
    await db
      .delete(emailQueue)
      .where(
        and(
          eq(emailQueue.status, "failed"),
          lt(emailQueue.createdAt, new Date(Date.now() - 7 * 24 * 3600 * 1000)),
        ),
      );
  } catch (e) {
    console.error("[cron] email cleanup failed:", e);
  }

  const pending = await db
    .select()
    .from(emailQueue)
    .where(eq(emailQueue.status, "pending"))
    .orderBy(sql`${emailQueue.priority} DESC, ${emailQueue.id} ASC`)
    .limit(100);
  if (pending.length === 0) return;

  let sent = 0;
  let failed = 0;
  let skippedCap = 0;
  let sentMarketing = 0;
  let sentGmail = 0;
  for (const q of pending) {
    if (sent + failed >= BATCH) break;
    const mk = isMarketing(q.templateName);
    const gm = GMAIL_RE.test(q.recipientEmail ?? "");
    if (mk && sentMarketing >= MAX_MARKETING_PER_RUN) {
      skippedCap++;
      continue;
    }
    if (gm && sentGmail >= MAX_GMAIL_PER_RUN) {
      skippedCap++;
      continue;
    }
    try {
      let subject = `Socio.id`;
      let html = "";
      let text = "";
      try {
        const d = JSON.parse(q.templateData ?? "{}");
        subject = d.subject ?? subject;
        // Custom HTML penuh (mis. email deposit dengan kartu bank) — pakai langsung
        if (d.html && String(d.html).includes("<html")) {
          html = String(d.html);
          text = String(d.body ?? "").slice(0, 2000);
        } else {
          const body = String(d.body ?? "");
          const ctaText = d.cta_text;
          const ctaUrl = d.cta_url;
          // Sumber HTML: $lib/server/email/render.ts (token DNA).
          // Isi (body + CTA + footer) IDENTIK dengan template lama; yang berubah
          // hanya warna sub-AA (#94a3b8 → #64748b) + preheader + dark-mode.
          const contentHtml =
            `<div>${body.replace(/\n/g, "<br>")}</div>` +
            (ctaText && ctaUrl ? emailCta({ label: String(ctaText), href: String(ctaUrl) }) : "");
          html = emailShell({
            preheader: body.slice(0, 100),
            maxWidth: 520,
            content: contentHtml,
            footer: emailFooterTransactional("bare"),
          });
          text = body;
        }
      } catch {
        // templateData bukan JSON — kirim sebagai plain
        text = q.templateData ?? "";
        html = `<pre>${text}</pre>`;
      }

      const ok = await sendEmail({ to: q.recipientEmail, subject, html, text });
      if (ok) {
        await db
          .update(emailQueue)
          .set({ status: "sent", sentAt: new Date() })
          .where(eq(emailQueue.id, q.id));
        // Sinkronkan tracking campaign (queueId ada di campaign_log;
        // di tracking cocokkan via campaignId + userId)
        const m = /^campaign-(\d+)$/.exec(q.templateName ?? "");
        if (m && q.recipientId) {
          const campaignId = Number(m[1]);
          await db
            .update(emailCampaignTracking)
            .set({ status: "sent", emailSent: new Date() })
            .where(
              and(
                eq(emailCampaignTracking.campaignId, campaignId),
                eq(emailCampaignTracking.userId, q.recipientId),
              ),
            );
        }
        await db
          .update(emailCampaignLog)
          .set({ emailSent: "sent", sentAt: new Date() })
          .where(eq(emailCampaignLog.queueId, q.id));
        sent++;
        if (mk) sentMarketing++;
        if (gm) sentGmail++;
      } else {
        // No key env / gagal kirim → tambah attempts, coba lagi nanti
        await db
          .update(emailQueue)
          .set({
            attempts: (q.attempts ?? 0) + 1,
            errorMessage: "send returned false (no key/failed)",
          })
          .where(eq(emailQueue.id, q.id));
        failed++;
      }
    } catch (e: any) {
      const attempts = (q.attempts ?? 0) + 1;
      await db
        .update(emailQueue)
        .set({
          attempts,
          status: attempts >= Number(q.maxAttempts ?? 3) ? "failed" : "pending",
          errorMessage: String(e?.message ?? e),
        })
        .where(eq(emailQueue.id, q.id));
      failed++;
    }
  }
  console.log(
    `[cron] email-queue: sent=${sent} failed=${failed} skippedCap=${skippedCap} (mkt=${sentMarketing} gmail=${sentGmail})`,
  );
}
