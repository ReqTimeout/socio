import { dev } from "$app/environment";

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const SMTP_HOST = process.env.SMTP_HOST ?? "";
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 587);
const SMTP_USER = process.env.SMTP_USER ?? "";
const SMTP_PASS = process.env.SMTP_PASS ?? "";
// FROM boleh polos (noreply@socio.id) atau sudah berformat ("Nama <addr>") —
// normalisasi di buildFrom() agar header tidak double-wrap (pernah kejadian:
// "Socio ID <Socio ID <noreply@socio.id>>" → penalti spam + risiko DMARC).
const FROM = process.env.SOCIO_MAIL_FROM ?? "noreply@socio.id";
const FROM_NAME = process.env.SOCIO_MAIL_FROM_NAME ?? "Socio ID";
const SUPPORT = process.env.SOCIO_MAIL_SUPPORT ?? "support@socio.id";
// DKIM private key (selector `mail`, d=socio.id — cocok DNS mail._domainkey).
// Disimpan di env dengan newline asli. Kalau kosong → kirim tanpa DKIM.
const DKIM_KEY = (process.env.SOCIO_DKIM_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");

function buildFrom(): string {
  const raw = FROM.trim();
  if (/<[^<>]+@[^<>]+>/.test(raw)) return raw; // sudah berformat → pakai apa adanya
  return `${FROM_NAME} <${raw}>`;
}

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send transactional email.
 *
 * Provider priority (2026-09-29, keputusan deliverability):
 *   1. RESEND_API_KEY — IP pool bersih + PTR/DMARC sehat. IP VPS saat ini
 *      (130.254.47.93, TNA Hosting/infra Hostinger — salah dicatat "Contabo"
 *      di dokumen lama) di-block Gmail (550 5.7.25 missing PTR + 421 4.7.28
 *      rate-limit) sehingga email verifikasi user hilang tanpa kabar.
 *   2. SMTP_HOST/PORT/USER/PASS (self-hosted) — fallback kalau Resend tidak
 *      tersedia / gagal.
 *
 * If no provider is configured, the email is logged to the server console
 * (dev / pre-email-setup). This keeps auth flows functional before the
 * email work is finalized.
 */
export async function sendEmail({ to, subject, html, text }: SendArgs): Promise<boolean> {
  const useSmtp = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);
  const useResend = Boolean(RESEND_API_KEY);

  if (!useSmtp && !useResend) {
    if (dev) {
      console.info(`[email:dev] to=${to} subject="${subject}"\n${text ?? html}`);
    }
    return false;
  }

  try {
    if (useResend) {
      const ok = await sendViaResend({ to, subject, html, text });
      if (ok) return true;
      if (!useSmtp) return false;
      return await sendViaSmtp({ to, subject, html, text });
    }
    return await sendViaSmtp({ to, subject, html, text });
  } catch (e) {
    console.error("[email] exception", e);
    return false;
  }
}

async function sendViaSmtp(args: SendArgs): Promise<boolean> {
  const { default: nodemailer } = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    requireTLS: SMTP_PORT === 587,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    tls: {
      // Mailserver saat ini self-signed (interim). Production harus pakai CF Origin CA cert.
      rejectUnauthorized: process.env.SMTP_REJECT_UNAUTH === "true",
      minVersion: "TLSv1.2",
    },
    connectionTimeout: 10_000,
    greetingTimeout: 5_000,
    // DKIM-sign di app (mailserver tidak signing: KeyTable/SigningTable kosong).
    ...(DKIM_KEY.includes("BEGIN PRIVATE KEY")
      ? { dkim: { domainName: "socio.id", keySelector: "mail", privateKey: DKIM_KEY } }
      : {}),
  });
  try {
    const info = await transporter.sendMail({
      from: buildFrom(),
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
      // Wajib untuk bulk-sender reputation (aturan Gmail) + memberi jalan keluar user.
      headers: {
        "List-Unsubscribe": `<mailto:${SUPPORT}?subject=unsubscribe>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
    if (dev) console.info(`[email:smtp] queued id=${info.messageId}`);
    return true;
  } catch (e) {
    console.error("[email:smtp] send failed", e);
    return false;
  } finally {
    transporter.close();
  }
}

async function sendViaResend(args: SendArgs): Promise<boolean> {
  const { Resend } = await import("resend");
  const resend = new Resend(RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: buildFrom(),
    to: args.to,
    subject: args.subject,
    html: args.html,
    text: args.text,
    headers: {
      "List-Unsubscribe": `<mailto:${SUPPORT}?subject=unsubscribe>`,
    },
  });
  if (error) {
    console.error("[email:resend] send failed", error);
    return false;
  }
  return true;
}

import {
  emailShell,
  emailTitleBlock,
  emailCta,
  emailCopyLink,
  emailFooterTransactional,
  emailSupportAfterCard,
} from "./email/render.js";
import type { SparkoPose } from "./email/render.js";

function wrapEmail(opts: {
  preheader: string;
  title: string;
  intro: string;
  ctaLabel: string;
  ctaHref: string;
  note?: string;
  mascot?: SparkoPose;
}): string {
  const { preheader, title, intro, ctaLabel, ctaHref, note, mascot } = opts;
  // Sumber HTML: app/src/lib/server/email/render.ts (token DNA).
  // Copy teks IDENTIK dengan versi lama; yang berubah hanya warna sub-AA
  // (#94a3b8 → #64748b di permukaan terang) + dark-mode + preheader aman.
  return emailShell({
    preheader,
    headerSub: "Panel SMM Indonesia",
    maxWidth: 480,
    content:
      emailTitleBlock(title, intro) +
      emailCta({ label: ctaLabel, href: ctaHref }) +
      emailCopyLink(ctaHref, note),
    footer: emailFooterTransactional("security"),
    afterCard: emailSupportAfterCard(),
    mascot,
  });
}

export function resetPasswordEmail(resetLink: string): {
  html: string;
  text: string;
} {
  return {
    html: wrapEmail({
      preheader: "Atur ulang password Socio.id — link berlaku 1 jam",
      title: "Atur ulang password",
      intro:
        "Kami menerima permintaan untuk mengatur ulang password akun Socio.id Anda. Klik tombol di bawah — link berlaku 1 jam dan hanya bisa dipakai sekali.",
      ctaLabel: "Reset password",
      ctaHref: resetLink,
      mascot: "idle",
      note: "Demi keamanan, jangan bagikan link ini kepada siapa pun. Jika Anda tidak meminta reset, abaikan email ini.",
    }),
    text: `Reset password Socio.id\n\nKlik link berikut (berlaku 1 jam): ${resetLink}\n\nJika bukan Anda, abaikan email ini.`,
  };
}

export function verificationEmail(verifyLink: string): {
  html: string;
  text: string;
} {
  return {
    html: wrapEmail({
      preheader: "Verifikasi email Socio.id — aktifkan akun Anda",
      title: "Verifikasi email Anda",
      intro:
        "Selamat datang di Socio.id! Klik tombol di bawah untuk memverifikasi email dan mengaktifkan akun Anda. Proses hanya butuh beberapa detik.",
      ctaLabel: "Verifikasi email",
      ctaHref: verifyLink,
      mascot: "wave",
      note: "Link verifikasi akan kedaluwarsa dalam 24 jam. Jika tombol tidak berfungsi, salin link di atas ke browser.",
    }),
    text: `Verifikasi email Socio.id\n\nKlik link berikut untuk mengaktifkan akun: ${verifyLink}`,
  };
}
