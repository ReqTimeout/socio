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
import { resetPasswordEmail, verificationEmail, welcomeEmail } from "./email";

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
    credited: 110327,
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
  const welcome = welcomeEmail("Contoh Pengguna", "https://app.socio.id/saldo/top-up");
  return [
    {
      key: "deposit-instruction",
      label: "Instruksi Deposit",
      description:
        "Dikirim saat user buat top-up. Nominal transfer PAS (post_amount, termasuk kode unik 3 digit) + baris saldo yang diterima setelah bonus + batas bayar.",
      ...instr,
    },
    {
      key: "deposit-reminder",
      label: "Pengingat Deposit (mid + T-2 jam)",
      description:
        "Cron light: reminder pertengahan masa berlaku (sisa 2–12 jam, nada ramah) dan T-2h (nada segera). Reseller: bahasa aktivasi + nilai bersih.",
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
    {
      key: "welcome",
      label: "Sambutan (pasca-verifikasi)",
      description:
        "Dikirim sekali setelah user sukses verifikasi email — 3 langkah menuju pesanan pertama + bonus deposit asli dari env.",
      subject: "Selamat datang di Socio.id — mulai dalam 3 langkah",
      ...welcome,
    },
  ];
}

/**
 * Alert email HANYA ke inbox operator (port .my 95d9d78f, keputusan owner).
 * Dulu email dikirim ke SEMUA akun level=Admin — akun partner ikut menerima
 * alert internal. Sekarang: daftar operator via env SOCIO_ADMIN_ALERT_EMAILS
 * (comma-separated), default aramadhi92@gmail.com. Bell in-app
 * (admin_notifications) TETAP untuk semua akun Admin — akun admin tidak
 * di-demote, hanya rute emailnya yang dibatasi.
 * Volume kecil (bisnis ini <20 event/hari) — aman tanpa digest.
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
    // Daftar operator: override via env, default inbox operator .id.
    const rawExtra = process.env.SOCIO_ADMIN_ALERT_EMAILS?.trim();
    const extra = (rawExtra ? rawExtra.split(",") : ["aramadhi92@gmail.com"])
      .map((s) => s.trim())
      .filter((s) => s.includes("@"));
    // Peta email→id supaya baris queue tetap tertaut ke akun Admin bila ada
    // (operator di luar akun Admin → recipientId null, kolom nullable).
    const idByEmail = new Map<string, number>();
    for (const a of admins) {
      if (a.email && a.email.includes("@")) idByEmail.set(a.email, Number(a.id));
    }
    const recipients = new Set<string>(extra);

    // 1) Email ke daftar operator saja — bukan ke semua akun level=Admin.
    let n = 0;
    for (const email of recipients) {
      await enqueueEmail({
        to: email,
        userId: idByEmail.get(email) ?? null,
        templateName: opts.templateName ?? "admin-alert",
        subject: opts.subject,
        body: opts.body,
        ctaText: opts.ctaText,
        ctaUrl: opts.ctaUrl,
        priority: "high",
      });
      n++;
    }
    // 2) Backup in-app (bell topbar) untuk SEMUA akun level=Admin yang login
    //    (email ke Gmail bisa ter-throttle; notif in-app tampil via SSE/polling).
    for (const a of admins) {
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
    }
    return n;
  } catch (e) {
    console.error("[email] notifyAdmins failed:", e);
    return 0;
  }
}
