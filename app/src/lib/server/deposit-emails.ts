import { db } from "@socio/db";
import { emailQueue } from "@socio/db/schema";
import { emailShell, emailCta, emailBankCard, emailFooterTransactional } from "./email/render.js";
import { EMAIL_COLORS } from "./email/tokens.js";
import type { SparkoPose } from "./email/render.js";

/**
 * Email transaksional deposit — instruksi, reminder, sukses, batal.
 * Dikirim via `email_queue` (async, retry ≤3, terkirim ≤5 menit via email-queue cron).
 * Layout HTML dari `email/render.ts` (token DNA). Copy teks TIDAK diubah.
 */

const BCA_NUMBER = process.env.SOCIO_BCA_NUMBER ?? "1392680815";
const BCA_NAME = process.env.SOCIO_BCA_NAME ?? "Awangga Ramadhi";

export function idr(n: number): string {
  return "Rp" + Math.round(Number(n ?? 0)).toLocaleString("id-ID");
}

function shell(
  preheader: string,
  headerSub: string,
  bodyInner: string,
  mascot?: SparkoPose,
): string {
  // Sumber HTML: email/render.ts. Copy + struktur dipertahankan.
  return emailShell({
    preheader,
    headerSub,
    maxWidth: 480,
    content: bodyInner,
    footer: emailFooterTransactional("help"),
    mascot,
  });
}

function cta(label: string, href: string): string {
  return emailCta({ label, href });
}

function bankCard(amount: string, invoice: string, expireText: string): string {
  return emailBankCard({
    bankLabel: "Transfer BCA ke",
    accountNumber: BCA_NUMBER,
    accountName: `a.n ${BCA_NAME}`,
    amountLabel: "Nominal (transfer pas)",
    amount,
    meta: `Invoice ${invoice} · Bayar sebelum ${expireText}`,
  });
}

function steps(): string {
  return `<ol style="margin:12px 0 0 0;padding-left:20px;font-size:13px;color:${EMAIL_COLORS.inkBody}">
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

export function depositInstructionMail(i: DepositMailInput): {
  subject: string;
  html: string;
  text: string;
} {
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
    html: shell(
      `Instruksi pembayaran ${amt} via BCA`,
      i.isReseller ? "Aktivasi Reseller" : "Instruksi Deposit",
      body,
      "idle",
    ),
    text: `${title}\nTransfer ${amt} ke BCA ${BCA_NUMBER} a.n ${BCA_NAME}\nInvoice ${i.invoiceId}\nBayar sebelum ${exp}`,
  };
}

export function depositReminderMail(i: DepositMailInput & { leftText: string }): {
  subject: string;
  html: string;
  text: string;
} {
  const amt = idr(i.amount);
  const body = `<p style="margin:0 0 4px 0">Halo <b>${i.name}</b>,</p>
    <p style="margin:8px 0 0 0">Deposit <b>${amt}</b> (invoice ${i.invoiceId}) <b style="color:${EMAIL_COLORS.berryInk}">segera kedaluwarsa — sisa ${i.leftText}</b>. Transfer sekarang agar tidak batal otomatis:</p>
    ${bankCard(amt, i.invoiceId, fmtExpire(i.expireAt))}
    ${cta("Bayar sekarang", "https://app.socio.id/saldo")}`;
  return {
    subject: `Segera berakhir: deposit ${amt} sisa ${i.leftText}`,
    html: shell(`Deposit ${amt} segera kedaluwarsa`, "Pengingat Deposit", body, "idle"),
    text: `Deposit ${amt} sisa ${i.leftText}. Transfer ke BCA ${BCA_NUMBER} a.n ${BCA_NAME} sebelum ${fmtExpire(i.expireAt)}`,
  };
}

export function depositSuccessMail(i: { name: string; amount: number; isReseller?: boolean }): {
  subject: string;
  html: string;
  text: string;
} {
  const amt = idr(i.amount);
  const body = `<p style="margin:0 0 4px 0">Halo <b>${i.name}</b>,</p>
    <p style="margin:8px 0 0 0">${i.isReseller ? `Akun Reseller Anda <b>sudah aktif</b>. Biaya aktivasi ${amt} terkonfirmasi.` : `Deposit <b>${amt}</b> sudah masuk ke saldo Anda dan siap dipakai order.`}</p>
    ${cta(i.isReseller ? "Mulai order" : "Buat pesanan", "https://app.socio.id/pesan")}`;
  return {
    subject: i.isReseller ? "Akun Reseller aktif ✅" : `Deposit ${amt} masuk ✅`,
    html: shell(
      i.isReseller ? "Akun Reseller Anda aktif" : `Deposit ${amt} berhasil`,
      "Konfirmasi",
      body,
      "celebrate",
    ),
    text: i.isReseller
      ? `Akun Reseller aktif. Biaya aktivasi ${amt} terkonfirmasi.`
      : `Deposit ${amt} masuk ke saldo Socio.id Anda.`,
  };
}

export function depositCanceledMail(i: { name: string; amount: number; reason: string }): {
  subject: string;
  html: string;
  text: string;
} {
  const amt = idr(i.amount);
  const body = `<p style="margin:0 0 4px 0">Halo <b>${i.name}</b>,</p>
    <p style="margin:8px 0 0 0">Deposit <b>${amt}</b> dibatalkan (${i.reason}). Saldo tidak berubah. Silakan buat deposit baru kapan saja:</p>
    ${cta("Top up lagi", "https://app.socio.id/saldo/topup")}`;
  return {
    subject: `Deposit ${amt} dibatalkan`,
    html: shell(`Deposit ${amt} dibatalkan`, "Info Deposit", body, "sad"),
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
