import { db } from "@socio/db";
import { emailQueue, users, adminNotifications } from "@socio/db/schema";
import { eq } from "drizzle-orm";
import {
  depositInstructionMail,
  depositReminderMail,
  depositSuccessMail,
  depositCanceledMail,
  enqueueEmail,
} from "./deposit-emails";
import { resetPasswordEmail, verificationEmail } from "./email";

/**
 * Registry template email SISTEM (transaksional) — read-only untuk preview admin.
 * Template campaign (marketing) tetap lewat CRUD /admin/email.
 * Untuk ubah isi template sistem = edit kode (disengaja — cegah HTML rusak massal).
 */
export interface SystemTemplate {
  key: string;
  label: string;
  description: string;
  subject: string;
  html: string;
  text: string;
}

const SAMPLE_DATE = new Date(Date.now() + 12 * 3600_000);

export function listSystemTemplates(): SystemTemplate[] {
  const instr = depositInstructionMail({
    name: "Contoh Pengguna",
    amount: 100297,
    invoiceId: "DEP-0000-contoh",
    expireAt: SAMPLE_DATE,
  });
  const reminder = depositReminderMail({
    name: "Contoh Pengguna",
    amount: 100297,
    invoiceId: "DEP-0000-contoh",
    expireAt: SAMPLE_DATE,
    leftText: "1 jam 30 mnt",
  });
  const success = depositSuccessMail({ name: "Contoh Pengguna", amount: 110327 });
  const canceled = depositCanceledMail({
    name: "Contoh Pengguna",
    amount: 100297,
    reason: "melewati batas waktu pembayaran",
  });
  const reset = resetPasswordEmail("https://app.socio.id/reset?token=contoh");
  const verify = verificationEmail("https://app.socio.id/verifikasi?token=contoh");
  return [
    {
      key: "deposit-instruction",
      label: "Instruksi Deposit",
      description: "Dikirim saat user buat top-up / daftar reseller. Berisi norek + nominal + batas bayar.",
      ...instr,
    },
    {
      key: "deposit-reminder",
      label: "Pengingat Deposit (T-2 jam)",
      description: "Cron light: deposit Pending yang kedaluwarsa < 2 jam.",
      ...reminder,
    },
    {
      key: "deposit-success",
      label: "Deposit Berhasil",
      description: "Dikirim saat admin Confirm (top-up) atau aktivasi reseller.",
      ...success,
    },
    {
      key: "deposit-canceled",
      label: "Deposit Batal",
      description: "Dikirim saat admin Reject atau auto-expire.",
      ...canceled,
    },
    {
      key: "reset-password",
      label: "Reset Password",
      description: "Link reset 1 jam, sekali pakai.",
      subject: "Atur ulang password Socio.id",
      ...reset,
    },
    {
      key: "verification",
      label: "Verifikasi Email",
      description: "Aktivasi akun member baru.",
      subject: "Verifikasi email Socio.id",
      ...verify,
    },
  ];
}

/**
 * Alert email ke SEMUA user level Admin (deposit pending, refund request, dsb).
 * Volume kecil (bisnis ini <20 event/hari) — aman tanpa digest.
 * Backup in-app: selalu tulis admin_notifications juga (email ke Gmail bisa
 * ter-throttle; notif in-app tampil di topbar admin via SSE/polling).
 */
export async function notifyAdmins(opts: {
  subject: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  templateName?: string;
}): Promise<number> {
  try {
    const admins = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.level, "Admin" as any))
      .limit(20);
    let n = 0;
    for (const a of admins) {
      if (a.email && a.email.includes("@")) {
        await enqueueEmail({
          to: a.email,
          userId: Number(a.id),
          templateName: opts.templateName ?? "admin-alert",
          subject: opts.subject,
          body: opts.body,
          ctaText: opts.ctaText,
          ctaUrl: opts.ctaUrl,
          priority: "high",
        });
      }
      try {
        await db.insert(adminNotifications).values({
          adminId: Number(a.id),
          type: "system",
          title: opts.subject.slice(0, 255),
          message: opts.body.slice(0, 2000),
          actionUrl: opts.ctaUrl ?? "/admin",
          priority: "high",
          createdAt: new Date(),
        } as any);
      } catch {}
      n++;
    }
    return n;
  } catch (e) {
    console.error("[email] notifyAdmins failed:", e);
    return 0;
  }
}
