import { db } from "@socio/db";
import { deposits, users } from "@socio/db/schema";
import { eq, and, lt, sql, inArray } from "drizzle-orm";
import { depositReminderMail, depositCanceledMail, enqueueEmail } from "$lib/server/deposit-emails";

/**
 * Light housekeeping tasks run every 15 minutes:
 *  - expire pending deposits past their `expire` time
 *  - seed next_poll_at for orders that lack it (e.g. legacy rows)
 *  - reminder email T-2h untuk deposit Pending yang belum diingatkan
 */
export async function runLightCron(): Promise<void> {
  // Expire deposits — email batal untuk yang baru kedaluwarsa
  try {
    const expiring = await db
      .select({ id: deposits.id, userId: deposits.userId, amount: deposits.amount })
      .from(deposits)
      .where(and(eq(deposits.status, "Pending"), lt(deposits.expire, new Date())))
      .limit(200);
    if (expiring.length > 0) {
      await db
        .update(deposits)
        .set({ status: "Canceled" })
        .where(
          and(
            eq(deposits.status, "Pending"),
            lt(deposits.expire, new Date()),
            inArray(
              deposits.id,
              expiring.map((d) => d.id),
            ),
          ),
        );
      for (const dep of expiring) {
        try {
          const [u] = await db
            .select({ email: users.email, fullName: users.fullName })
            .from(users)
            .where(eq(users.id, dep.userId))
            .limit(1);
          if (u?.email) {
            const m = depositCanceledMail({
              name: u.fullName || "Pengguna Socio.id",
              amount: Number(dep.amount),
              reason: "melewati batas waktu pembayaran",
            });
            await enqueueEmail({
              to: u.email,
              userId: dep.userId,
              templateName: "deposit-expired",
              subject: m.subject,
              body: m.text,
              ctaText: "Top up lagi",
              ctaUrl: "https://app.socio.id/saldo/topup",
              html: m.html,
            });
          }
        } catch {}
      }
      console.log(`[cron] deposit-expire: ${expiring.length} dibatalkan`);
    }
  } catch (e) {
    console.error("[cron] deposit-expire failed:", e);
  }

  // Reminder T-2h: Pending + expire < now+2h + belum diingatkan.
  // reminderSent (0/1) dipakai SEMUA jenis deposit. Reminder H-2/H-1 khusus
  // aktivasi reseller ada di blok terpisah di bawah (pakai reminder_stage).
  try {
    const due = await db
      .select({
        id: deposits.id,
        userId: deposits.userId,
        amount: deposits.amount,
        expire: deposits.expire,
        untukApa: deposits.untukApa,
      })
      .from(deposits)
      .where(
        and(
          eq(deposits.status, "Pending"),
          eq(deposits.reminderSent, 0),
          sql`${deposits.expire} > NOW()`,
          sql`${deposits.expire} <= DATE_ADD(NOW(), INTERVAL 2 HOUR)`,
        ),
      )
      .limit(100);
    for (const dep of due) {
      try {
        const [u] = await db
          .select({ email: users.email, fullName: users.fullName })
          .from(users)
          .where(eq(users.id, dep.userId))
          .limit(1);
        const minsLeft = Math.max(
          1,
          Math.round((new Date(dep.expire as any).getTime() - Date.now()) / 60000),
        );
        const leftText =
          minsLeft >= 1440
            ? `${Math.floor(minsLeft / 1440)} hari`
            : minsLeft >= 60
              ? `${Math.floor(minsLeft / 60)} jam ${minsLeft % 60} mnt`
              : `${minsLeft} menit`;
        if (u?.email) {
          const m = depositReminderMail({
            name: u.fullName || "Pengguna Socio.id",
            amount: Number(dep.amount),
            invoiceId: `#${dep.id}`,
            expireAt: dep.expire as any,
            leftText,
          });
          await enqueueEmail({
            to: u.email,
            userId: dep.userId,
            templateName: "deposit-reminder",
            subject: m.subject,
            body: m.text,
            ctaText: "Bayar sekarang",
            ctaUrl: "https://app.socio.id/saldo",
            html: m.html,
            priority: "high",
          });
        }
        await db.update(deposits).set({ reminderSent: 1 }).where(eq(deposits.id, dep.id));
      } catch (e) {
        console.error(`[cron] deposit-reminder ${dep.id} failed:`, e);
      }
    }
    if (due.length > 0) console.log(`[cron] deposit-reminder: ${due.length} diingatkan`);
  } catch (e) {
    console.error("[cron] deposit-reminder failed:", e);
  }

  // Reminder H-2 / H-1 KHUSUS aktivasi reseller (expire 72 jam).
  // Stage disimpan di deposits.reminder_stage (0=belum, 1=H-2 terkirim, 2=H-1 terkirim).
  // Jendela tidak tumpang-tindih: H-2 = sisa (24h, 48h], H-1 = sisa (2h, 24h].
  // Deposit top-up biasa (untukApa=smm, expire 24h) TIDAK tersentuh blok ini.
  for (const stage of [
    { stage: 1, maxHours: 48, minHours: 24 },
    { stage: 2, maxHours: 24, minHours: 2 },
  ]) {
    try {
      const rows = await db
        .select({
          id: deposits.id,
          userId: deposits.userId,
          amount: deposits.amount,
          expire: deposits.expire,
          stage: deposits.reminderStage,
        })
        .from(deposits)
        .where(
          and(
            eq(deposits.status, "Pending"),
            eq(deposits.untukApa, "reseller"),
            sql`${deposits.reminderStage} < ${stage.stage}`,
            sql`${deposits.expire} > DATE_ADD(NOW(), INTERVAL ${sql.raw(String(stage.minHours))} HOUR)`,
            sql`${deposits.expire} <= DATE_ADD(NOW(), INTERVAL ${sql.raw(String(stage.maxHours))} HOUR)`,
          ),
        )
        .limit(100);
      for (const dep of rows) {
        try {
          const [u] = await db
            .select({ email: users.email, fullName: users.fullName })
            .from(users)
            .where(eq(users.id, dep.userId))
            .limit(1);
          const minsLeft = Math.max(
            1,
            Math.round((new Date(dep.expire as any).getTime() - Date.now()) / 60000),
          );
          const leftText =
            minsLeft >= 1440
              ? `${Math.floor(minsLeft / 1440)} hari`
              : `${Math.floor(minsLeft / 60)} jam ${minsLeft % 60} mnt`;
          if (u?.email) {
            const m = depositReminderMail({
              name: u.fullName || "Pengguna Socio.id",
              amount: Number(dep.amount),
              invoiceId: `#${dep.id}`,
              expireAt: dep.expire as any,
              leftText,
            });
            await enqueueEmail({
              to: u.email,
              userId: dep.userId,
              templateName: "deposit-reminder",
              subject: m.subject,
              body: m.text,
              ctaText: "Bayar sekarang",
              ctaUrl: "https://app.socio.id/saldo",
              html: m.html,
              priority: "high",
            });
          }
          await db
            .update(deposits)
            .set({ reminderStage: stage.stage })
            .where(eq(deposits.id, dep.id));
        } catch (e) {
          console.error(`[cron] reseller-reminder H${3 - stage.stage} ${dep.id} failed:`, e);
        }
      }
      if (rows.length > 0)
        console.log(`[cron] reseller-reminder stage${stage.stage}: ${rows.length} diingatkan`);
    } catch (e) {
      console.error("[cron] reseller-reminder failed:", e);
    }
  }
  try {
    await db.execute(sql`
      UPDATE orders
      SET next_poll_at = NOW()
      WHERE status IN ('Pending','In progress') AND next_poll_at IS NULL
      LIMIT 500
    `);
  } catch (e) {
    console.error("[cron] seed-poll failed:", e);
  }

  console.log("[cron] light-cron pass complete");
}
