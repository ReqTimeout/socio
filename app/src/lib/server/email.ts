import { dev } from "$app/environment";

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const FROM = process.env.SOCIO_MAIL_FROM ?? "noreply@socio.id";
const FROM_NAME = process.env.SOCIO_MAIL_FROM_NAME ?? "Socio ID";

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send transactional email via Resend. Env-gated: if no API key is configured,
 * the email is logged to the server console (dev / pre-email-setup). This keeps
 * auth flows functional before the M6 email work is finalized.
 */
export async function sendEmail({ to, subject, html, text }: SendArgs): Promise<boolean> {
  if (!RESEND_API_KEY) {
    if (dev) {
      console.info(`[email:dev] to=${to} subject="${subject}"\n${text ?? html}`);
    }
    return false;
  }
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM}>`,
      to,
      subject,
      html,
      text,
    });
    if (error) {
      console.error("[email] send failed", error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[email] exception", e);
    return false;
  }
}

export function resetPasswordEmail(resetLink: string): {
  html: string;
  text: string;
} {
  return {
    html: `<div style="font-family:sans-serif;max-width:420px;margin:auto">
      <h2 style="color:#4f46e5">Reset password Socio.id</h2>
      <p>Klik tombol di bawah untuk mengatur ulang password Anda. Link berlaku 1 jam.</p>
      <a href="${resetLink}" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 20px;border-radius:9999px;text-decoration:none;font-weight:700">Reset password</a>
      <p style="color:#64748b;font-size:12px">Jika bukan Anda, abaikan email ini.</p>
    </div>`,
    text: `Reset password Socio.id: ${resetLink}`,
  };
}

export function verificationEmail(verifyLink: string): {
  html: string;
  text: string;
} {
  return {
    html: `<div style="font-family:sans-serif;max-width:420px;margin:auto">
      <h2 style="color:#4f46e5">Verifikasi email Socio.id</h2>
      <p>Klik tombol di bawah untuk mengaktifkan akun Anda.</p>
      <a href="${verifyLink}" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 20px;border-radius:9999px;text-decoration:none;font-weight:700">Verifikasi email</a>
    </div>`,
    text: `Verifikasi email Socio.id: ${verifyLink}`,
  };
}
