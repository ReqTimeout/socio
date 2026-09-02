import { dev } from "$app/environment";

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const SMTP_HOST = process.env.SMTP_HOST ?? "";
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 587);
const SMTP_USER = process.env.SMTP_USER ?? "";
const SMTP_PASS = process.env.SMTP_PASS ?? "";
const FROM = process.env.SOCIO_MAIL_FROM ?? "noreply@socio.id";
const FROM_NAME = process.env.SOCIO_MAIL_FROM_NAME ?? "Socio ID";

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send transactional email.
 *
 * Provider priority:
 *   1. SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS (self-hosted, default)
 *   2. RESEND_API_KEY (legacy fallback for staging without mailserver)
 *
 * If no provider is configured, the email is logged to the server console
 * (dev / pre-email-setup). This keeps auth flows functional before the
 * email work is finalized.
 */
export async function sendEmail({ to, subject, html, text }: SendArgs): Promise<boolean> {
  const useSmtp = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);

  if (!useSmtp && !RESEND_API_KEY) {
    if (dev) {
      console.info(`[email:dev] to=${to} subject="${subject}"\n${text ?? html}`);
    }
    return false;
  }

  try {
    if (useSmtp) {
      return await sendViaSmtp({ to, subject, html, text });
    }
    return await sendViaResend({ to, subject, html, text });
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
  });
  try {
    const info = await transporter.sendMail({
      from: `${FROM_NAME} <${FROM}>`,
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
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
    from: `${FROM_NAME} <${FROM}>`,
    to: args.to,
    subject: args.subject,
    html: args.html,
    text: args.text,
  });
  if (error) {
    console.error("[email:resend] send failed", error);
    return false;
  }
  return true;
}

function wrapEmail(opts: {
  preheader: string;
  title: string;
  intro: string;
  ctaLabel: string;
  ctaHref: string;
  note?: string;
}): string {
  const { preheader, title, intro, ctaLabel, ctaHref, note } = opts;
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f8fafc">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${preheader}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f8fafc;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
        <tr><td style="background:linear-gradient(135deg,#4f46e5 0%,#06b6d4 100%);padding:20px 24px;text-align:center">
          <div style="font-family:ui-sans-serif,system-ui,sans-serif;font-size:18px;font-weight:800;letter-spacing:-0.02em;color:#ffffff">Socio<span style="opacity:0.9">.id</span></div>
          <div style="font-family:ui-sans-serif,system-ui,sans-serif;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:rgba(255,255,255,0.85);margin-top:2px">Panel SMM Indonesia</div>
        </td></tr>
        <tr><td style="padding:28px 24px 8px 24px">
          <h1 style="margin:0;font-family:ui-sans-serif,system-ui,sans-serif;font-size:20px;line-height:1.3;font-weight:800;color:#0f172a">${title}</h1>
          <p style="margin:12px 0 0 0;font-family:ui-sans-serif,system-ui,sans-serif;font-size:14px;line-height:1.6;color:#334155">${intro}</p>
        </td></tr>
        <tr><td style="padding:20px 24px 8px 24px" align="center">
          <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${ctaHref}" style="height:44px;v-text-anchor:middle;width:220px" arcsize="50%" strokecolor="#4f46e5" fillcolor="#4f46e5"><center style="color:#ffffff;font-family:sans-serif;font-size:14px;font-weight:700">${ctaLabel}</center></v:roundrect><![endif]-->
          <!--[if !mso]><!--><a href="${ctaHref}" style="display:inline-block;background:#4f46e5;color:#ffffff;font-family:ui-sans-serif,system-ui,sans-serif;font-size:14px;font-weight:700;line-height:44px;text-align:center;text-decoration:none;border-radius:9999px;padding:0 28px;min-width:180px">${ctaLabel}</a><!--<![endif]-->
        </td></tr>
        <tr><td style="padding:8px 24px 4px 24px">
          <p style="margin:0;font-family:ui-sans-serif,system-ui,sans-serif;font-size:12px;line-height:1.5;color:#64748b;word-break:break-all">Atau salin link ini: <a href="${ctaHref}" style="color:#4f46e5;text-decoration:underline">${ctaHref}</a></p>
          ${note ? `<p style="margin:12px 0 0 0;font-family:ui-sans-serif,system-ui,sans-serif;font-size:11px;line-height:1.5;color:#94a3b8">${note}</p>` : ""}
        </td></tr>
        <tr><td style="padding:24px;border-top:1px solid #f1f5f9">
          <p style="margin:0;font-family:ui-sans-serif,system-ui,sans-serif;font-size:11px;line-height:1.5;color:#94a3b8;text-align:center">© ${new Date().getFullYear()} Socio.id — Panel SMM Indonesia<br>Jika bukan Anda yang meminta, abaikan email ini. Akun Anda tetap aman.</p>
        </td></tr>
      </table>
      <div style="max-width:480px;margin:12px auto 0 auto;text-align:center"><p style="margin:0;font-family:ui-sans-serif,system-ui,sans-serif;font-size:11px;color:#94a3b8">Butuh bantuan? Balas email ini atau buka <a href="https://socio.id/tiket" style="color:#4f46e5">pusat bantuan</a>.</p></div>
    </td></tr>
  </table>
</body></html>`;
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
      note: "Link verifikasi akan kedaluwarsa dalam 24 jam. Jika tombol tidak berfungsi, salin link di atas ke browser.",
    }),
    text: `Verifikasi email Socio.id\n\nKlik link berikut untuk mengaktifkan akun: ${verifyLink}`,
  };
}
