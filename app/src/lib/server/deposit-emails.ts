import { db } from "@socio/db";
import { emailQueue } from "@socio/db/schema";

/**
 * Email transaksional deposit — instruksi, reminder, sukses, batal.
 * Dikirim via `email_queue` (async, retry ≤3, terkirim ≤5 menit via email-queue cron).
 * Layout HTML disamakan branding web (gradient indigo→cyan, kartu bank, CTA pill).
 */

const BCA_NUMBER = process.env.SOCIO_BCA_NUMBER ?? "1392680815";
const BCA_NAME = process.env.SOCIO_BCA_NAME ?? "Awangga Ramadhi";

export function idr(n: number): string {
  return "Rp" + Math.round(Number(n ?? 0)).toLocaleString("id-ID");
}

function shell(preheader: string, headerSub: string, bodyInner: string): string {
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f8fafc">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${preheader}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f8fafc;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
        <tr><td style="background:linear-gradient(135deg,#4f46e5 0%,#06b6d4 100%);padding:20px 24px;text-align:center">
          <div style="font-family:ui-sans-serif,system-ui,sans-serif;font-size:18px;font-weight:800;letter-spacing:-0.02em;color:#ffffff">Socio<span style="opacity:0.9">.id</span></div>
          <div style="font-family:ui-sans-serif,system-ui,sans-serif;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:rgba(255,255,255,0.85);margin-top:2px">${headerSub}</div>
        </td></tr>
        <tr><td style="padding:24px;color:#334155;font-size:14px;line-height:1.7;font-family:ui-sans-serif,system-ui,sans-serif">
          ${bodyInner}
        </td></tr>
        <tr><td style="padding:20px 24px;border-top:1px solid #f1f5f9">
          <p style="margin:0;font-family:ui-sans-serif,system-ui,sans-serif;font-size:11px;line-height:1.5;color:#94a3b8;text-align:center">© ${new Date().getFullYear()} Socio.id — Panel SMM Indonesia<br>Butuh bantuan? Balas email ini.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function cta(label: string, href: string): string {
  return `<div style="text-align:center;margin:20px 0 4px 0"><a href="${href}" style="display:inline-block;background:#4f46e5;color:#ffffff;font-family:ui-sans-serif,system-ui,sans-serif;font-size:14px;font-weight:700;line-height:44px;text-align:center;text-decoration:none;border-radius:9999px;padding:0 28px;min-width:180px">${label}</a></div>`;
}

function bankCard(amount: string, invoice: string, expireText: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0f172a;border-radius:12px;margin:16px 0">
    <tr><td style="padding:18px 20px">
      <div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8">Transfer BCA ke</div>
      <div style="font-size:22px;font-weight:800;letter-spacing:0.04em;color:#ffffff;margin:4px 0">${BCA_NUMBER}</div>
      <div style="font-size:12px;color:#cbd5e1">a.n ${BCA_NAME}</div>
      <div style="border-top:1px solid rgba(255,255,255,0.12);margin:12px 0"></div>
      <div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8">Nominal (transfer pas)</div>
      <div style="font-size:24px;font-weight:800;color:#22d3ee;margin:4px 0">${amount}</div>
      <div style="font-size:12px;color:#cbd5e1">Invoice ${invoice} · Bayar sebelum ${expireText}</div>
    </td></tr>
  </table>`;
}

function steps(): string {
  return `<ol style="margin:12px 0 0 0;padding-left:20px;font-size:13px;color:#475569">
    <li>Transfer <b>pas sesuai nominal</b> (termasuk 3 digit terakhir) ke rekening di atas.</li>
    <li>Tunggu konfirmasi otomatis — saldo masuk setelah admin verifikasi mutasi.</li>
    <li>Jangan transfer setelah melewati batas waktu (deposit batal otomatis).</li>
  </ol>`;
}

export interface DepositMailInput {
  name: string;
  amount: number;
  invoiceId: string;
  expireAt: Date | string;
  isReseller?: boolean;
}

function fmtExpire(d: Date | string): string {
  const dt = d instanceof Date ? d : new Date(String(d).replace(" ", "T"));
  return (
    dt.toLocaleDateString("id-ID", { day: "numeric", month: "short" }) +
    ", " +
    dt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) +
    " WIB"
  );
}

export function depositInstructionMail(i: DepositMailInput): { subject: string; html: string; text: string } {
  const amt = idr(i.amount);
  const exp = fmtExpire(i.expireAt);
  const title = i.isReseller ? "Selesaikan aktivasi Reseller" : "Selesaikan pembayaran deposit";
  const body = `<p style="margin:0 0 4px 0">Halo <b>${i.name}</b>,</p>
    <p style="margin:8px 0 0 0">${title} sebesar <b>${amt}</b> dengan transfer ke rekening berikut:</p>
    ${bankCard(amt, i.invoiceId, exp)}
    ${steps()}
    ${cta(i.isReseller ? "Lihat status aktivasi" : "Lihat status deposit", "https://app.socio.id/saldo")}`;
  return {
    subject: `${i.isReseller ? "Aktivasi Reseller" : "Deposit"} ${amt} — bayar sebelum ${exp}`,
    html: shell(`Instruksi pembayaran ${amt} via BCA`, i.isReseller ? "Aktivasi Reseller" : "Instruksi Deposit", body),
    text: `${title}\nTransfer ${amt} ke BCA ${BCA_NUMBER} a.n ${BCA_NAME}\nInvoice ${i.invoiceId}\nBayar sebelum ${exp}`,
  };
}

export function depositReminderMail(i: DepositMailInput & { leftText: string }): { subject: string; html: string; text: string } {
  const amt = idr(i.amount);
  const body = `<p style="margin:0 0 4px 0">Halo <b>${i.name}</b>,</p>
    <p style="margin:8px 0 0 0">Deposit <b>${amt}</b> (invoice ${i.invoiceId}) <b style="color:#dc2626">segera kedaluwarsa — sisa ${i.leftText}</b>. Transfer sekarang agar tidak batal otomatis:</p>
    ${bankCard(amt, i.invoiceId, fmtExpire(i.expireAt))}
    ${cta("Bayar sekarang", "https://app.socio.id/saldo")}`;
  return {
    subject: `Segera berakhir: deposit ${amt} sisa ${i.leftText}`,
    html: shell(`Deposit ${amt} segera kedaluwarsa`, "Pengingat Deposit", body),
    text: `Deposit ${amt} sisa ${i.leftText}. Transfer ke BCA ${BCA_NUMBER} a.n ${BCA_NAME} sebelum ${fmtExpire(i.expireAt)}`,
  };
}

export function depositSuccessMail(i: { name: string; amount: number; isReseller?: boolean }): { subject: string; html: string; text: string } {
  const amt = idr(i.amount);
  const body = `<p style="margin:0 0 4px 0">Halo <b>${i.name}</b>,</p>
    <p style="margin:8px 0 0 0">${i.isReseller ? `Akun Reseller Anda <b>sudah aktif</b>. Biaya aktivasi ${amt} terkonfirmasi.` : `Deposit <b>${amt}</b> sudah masuk ke saldo Anda dan siap dipakai order.`}</p>
    ${cta(i.isReseller ? "Mulai order" : "Buat pesanan", "https://app.socio.id/pesan")}`;
  return {
    subject: i.isReseller ? "Akun Reseller aktif ✅" : `Deposit ${amt} masuk ✅`,
    html: shell(i.isReseller ? "Akun Reseller Anda aktif" : `Deposit ${amt} berhasil`, "Konfirmasi", body),
    text: i.isReseller ? `Akun Reseller aktif. Biaya aktivasi ${amt} terkonfirmasi.` : `Deposit ${amt} masuk ke saldo Socio.id Anda.`,
  };
}

export function depositCanceledMail(i: { name: string; amount: number; reason: string }): { subject: string; html: string; text: string } {
  const amt = idr(i.amount);
  const body = `<p style="margin:0 0 4px 0">Halo <b>${i.name}</b>,</p>
    <p style="margin:8px 0 0 0">Deposit <b>${amt}</b> dibatalkan (${i.reason}). Saldo tidak berubah. Silakan buat deposit baru kapan saja:</p>
    ${cta("Top up lagi", "https://app.socio.id/saldo/topup")}`;
  return {
    subject: `Deposit ${amt} dibatalkan`,
    html: shell(`Deposit ${amt} dibatalkan`, "Info Deposit", body),
    text: `Deposit ${amt} dibatalkan (${i.reason}). Buat deposit baru di https://app.socio.id/saldo/topup`,
  };
}

/** Enqueue email transaksional (dikirim ≤5 menit oleh email-queue cron, retry ≤3). */
export async function enqueueEmail(opts: {
  to: string;
  userId?: number | null;
  templateName: string;
  subject: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  html?: string;
  priority?: "low" | "normal" | "high";
}): Promise<void> {
  try {
    if (!opts.to || !opts.to.includes("@")) return;
    await db.insert(emailQueue).values({
      recipientEmail: opts.to,
      recipientId: opts.userId ?? null,
      templateName: opts.templateName,
      templateData: JSON.stringify({
        subject: opts.subject,
        body: opts.body,
        cta_text: opts.ctaText ?? null,
        cta_url: opts.ctaUrl ?? null,
        html: opts.html ?? null,
      }),
      priority: opts.priority ?? "normal",
      status: "pending",
    } as any);
  } catch (e) {
    console.error("[email] enqueue failed:", e);
  }
}
