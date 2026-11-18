import { db } from "@socio/db";
import { deposits, users } from "@socio/db/schema";
import { eq, and, lt, sql, inArray } from "drizzle-orm";
import { depositReminderMail, depositCanceledMail, enqueueEmail } from "$lib/server/deposit-emails";

/** Label sisa waktu untuk email reminder: "2 hari" / "5 jam 30 mnt" / "45 menit".
 *  Satu sumber supaya ketiga blok reminder tidak menyimpang formatnya. */
function leftLabel(expire: unknown): string {
  const mins = Math.max(1, Math.round((new Date(expire as any).getTime() - Date.now()) / 60000));
  if (mins >= 1440) return `${Math.floor(mins / 1440)} hari`;
  if (mins >= 60) return `${Math.floor(mins / 60)} jam ${mins % 60} mnt`;
  return `${mins} menit`;
}

/**
 * Light housekeeping tasks run every 15 minutes:
 *  - expire pending deposits past their `expire` time (+ email batal/winback)
 *  - seed next_poll_at for orders that lack it (e.g. legacy rows)
 *  - reminder pertengahan masa berlaku (WP6 L2) untuk top-up biasa: sisa (2h, 12h]
 *  - reminder email T-2h untuk deposit Pending yang belum diingatkan
 *  - reminder H-2 / H-1 khusus aktivasi reseller (expire 72h)
 *
 * Nominal dalam semua email = `post_amount` (jumlah PAS yang harus ditransfer,
 * termasuk kode unik 3 digit). `amount` untuk top-up biasa sudah termasuk bonus —
 * ditampilkan sebagai "saldo yang diterima", bukan jumlah bayar.
 */
export async function runLightCron(): Promise<void> {
  // Expire deposits — email batal untuk yang baru kedaluwarsa
  try {
    const expiring = await db
      .select({
        id: deposits.id,
        userId: deposits.userId,
        amount: deposits.amount,
        postAmount: deposits.postAmount,
        untukApa: deposits.untukApa,
      })
      .from(deposits)
      .where(and(eq(deposits.status, "Pending"), lt(deposits.expire, new Date())))
      .limit(200);
    if (expiring.length > 0) {
      await db
        .update(deposits)
        .set({ status: "Canceled", verificationNotes: "Expired: melewati batas waktu pembayaran" })
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
            const isReseller = dep.untukApa === "reseller";
            const m = depositCanceledMail({
              name: u.fullName || "Pengguna Socio.id",
              amount: Number(dep.postAmount || dep.amount),
              reason: "melewati batas waktu pembayaran",
              isReseller,
            });
            await enqueueEmail({
              to: u.email,
              userId: dep.userId,
              templateName: "deposit-expired",
              subject: m.subject,
              body: m.text,
              ctaText: isReseller ? "Mulai ulang aktivasi" : "Top up lagi",
              ctaUrl: isReseller
                ? "https://app.socio.id/reseller"
                : "https://app.socio.id/saldo/top-up",
              html: m.html,
            });
          }
        } catch {
          /* deposit-expire email best-effort — jangan gagalkan cron loop */
        }
      }
      console.log(`[cron] deposit-expire: ${expiring.length} dibatalkan`);
    }
  } catch (e) {
    console.error("[cron] deposit-expire failed:", e);
  }

  // WP6 L2 — reminder PERTENGAHAN masa berlaku untuk top-up biasa (expire 24h).
  // Sebelum ini hanya ada SATU reminder pada T-2h: user yang lupa bayar pada
  // hari pertama terus hilang sampai invoice batal. Jendela sisa (2h, 12h] →
  // tepat satu reminder awal, tidak tumpang-tindih dengan T-2h. Penanda memakai
  // `reminder_stage` (khusus untukApa=smm di blok ini; blok reseller di bawah
  // memakai kolom sama untuk H-2/H-1 — dua set baris terpisah, tidak bertindih).
  try {
    const mid = await db
      .select({
        id: deposits.id,
        userId: deposits.userId,
        amount: deposits.amount,
        postAmount: deposits.postAmount,
        idPm: deposits.idPm,
        expire: deposits.expire,
      })
      .from(deposits)
      .where(
        and(
          eq(deposits.status, "Pending"),
          eq(deposits.untukApa, "smm"),
          eq(deposits.reminderStage, 0),
          sql`${deposits.expire} > DATE_ADD(NOW(), INTERVAL 2 HOUR)`,
          sql`${deposits.expire} <= DATE_ADD(NOW(), INTERVAL 12 HOUR)`,
        ),
      )
      .limit(100);
    for (const dep of mid) {
      try {
        const [u] = await db
          .select({ email: users.email, fullName: users.fullName })
          .from(users)
          .where(eq(users.id, dep.userId))
          .limit(1);
        if (u?.email) {
          const m = depositReminderMail({
            name: u.fullName || "Pengguna Socio.id",
            amount: Number(dep.postAmount || dep.amount),
            credited: Number(dep.amount),
            invoiceId: dep.idPm || `#${dep.id}`,
            expireAt: dep.expire as any,
            leftText: leftLabel(dep.expire),
            tone: "mid",
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
          });
        }
        // Tandai walaupun tanpa email — hindari baris sama diproses tiap 15 menit.
        await db.update(deposits).set({ reminderStage: 1 }).where(eq(deposits.id, dep.id));
      } catch (e) {
        console.error(`[cron] deposit-reminder-mid ${dep.id} failed:`, e);
      }
    }
    if (mid.length > 0) console.log(`[cron] deposit-reminder-mid: ${mid.length} diingatkan`);
  } catch (e) {
    console.error("[cron] deposit-reminder-mid failed:", e);
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
        postAmount: deposits.postAmount,
        idPm: deposits.idPm,
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
        if (u?.email) {
          const m = depositReminderMail({
            name: u.fullName || "Pengguna Socio.id",
            amount: Number(dep.postAmount || dep.amount),
            credited: Number(dep.amount),
            invoiceId: dep.idPm || `#${dep.id}`,
            expireAt: dep.expire as any,
            leftText: leftLabel(dep.expire),
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
          postAmount: deposits.postAmount,
          idPm: deposits.idPm,
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
          if (u?.email) {
            const m = depositReminderMail({
              name: u.fullName || "Pengguna Socio.id",
              amount: Number(dep.postAmount || dep.amount),
              invoiceId: dep.idPm || `#${dep.id}`,
              expireAt: dep.expire as any,
              leftText: leftLabel(dep.expire),
              isReseller: true,
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
