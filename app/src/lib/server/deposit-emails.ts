import { db } from "@socio/db";
import { emailQueue, users } from "@socio/db/schema";
import { eq } from "drizzle-orm";
import {
  emailShell,
  emailCta,
  emailBankCard,
  emailFooterTransactional,
  escapeHtml,
} from "./email/render.js";
import { EMAIL_COLORS } from "./email/tokens.js";
import { createNotification } from "./notification.js";
import type { SparkoPose } from "./email/render.js";
import { getDepositBonusRate, getResellerActivationAmount, getResellerBonus } from "$lib/format";

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

/** Baris "saldo yang diterima" — hanya muncul bila credited > nominal transfer
 *  (WP6: user harus lihat angka PAS yang ditransfer, bonus sebagai baris terpisah). */
function creditedLine(payAmount: number, credited?: number): string {
  if (!credited || !(Number(credited) > Number(payAmount))) return "";
  return `<p style="margin:12px 0 0 0;font-size:13px;color:${EMAIL_COLORS.inkBody}">Saldo yang diterima: <b>${idr(credited)}</b> — top-up kamu plus bonus deposit. Transfer cukup sesuai nominal di kotak atas.</p>`;
}

/** Nilai bersih aktivasi reseller (bayar sekali − saldo termasuk = biaya bersih). */
function resellerValueLine(): string {
  const base = getResellerActivationAmount();
  const bonus = getResellerBonus();
  if (!(bonus > 0)) return "";
  const net = Math.max(0, base - bonus);
  return `<p style="margin:12px 0 0 0;font-size:13px;color:${EMAIL_COLORS.inkBody}"><b>Yang kamu dapat:</b> ${idr(base)} sekali bayar · saldo ${idr(bonus)} termasuk · bersih ${idr(net)} — harga reseller di semua layanan, permanen.</p>`;
}

export interface DepositMailInput {
  name: string;
  /** Nominal PAS yang harus dibayar = `deposits.post_amount` (termasuk kode unik
   *  3 digit). JANGAN kirim `deposits.amount` untuk top-up biasa — itu sudah
   *  termasuk bonus dan bukan jumlah yang harus ditransfer. */
  amount: number;
  /** Saldo yang akan masuk setelah bonus (opsional) — tampil sebagai baris terpisah. */
  credited?: number;
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
  const value = i.isReseller ? resellerValueLine() : creditedLine(i.amount, i.credited);
  const body = `<p style="margin:0 0 4px 0">Halo <b>${escapeHtml(i.name)}</b>,</p>
    <p style="margin:8px 0 0 0">${title} sebesar <b>${amt}</b> dengan transfer ke rekening berikut:</p>
    ${bankCard(amt, i.invoiceId, exp)}
    ${value}
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
    text: `${title}\nTransfer ${amt} ke BCA ${BCA_NUMBER} a.n ${BCA_NAME}${i.credited && i.credited > i.amount ? `\nSaldo yang diterima: ${idr(i.credited)} (termasuk bonus deposit).` : ""}\nInvoice ${i.invoiceId}\nBayar sebelum ${exp}`,
  };
}

/**
 * Reminder deposit / aktivasi.
 * `tone`:
 *  - "final" (default) = T-2h terakhir, nada segera (hindari batal otomatis).
 *  - "mid" = pertengahan masa berlaku invoice (WP6 L2: dulu hanya SATU reminder
 *    telat, jadi user yang lupa bayar terus hilang sampai kedaluwarsa).
 * `isReseller` = bahasa aktivasi (bukan "deposit").
 */
export function depositReminderMail(
  i: DepositMailInput & { leftText: string; tone?: "mid" | "final" },
): {
  subject: string;
  html: string;
  text: string;
} {
  const amt = idr(i.amount);
  const exp = fmtExpire(i.expireAt);
  const mid = i.tone === "mid";
  const label = i.isReseller ? "Aktivasi Reseller" : "Deposit";
  const head = mid
    ? `${label} <b>${amt}</b> (invoice ${i.invoiceId}) masih belum dibayar — sisa ${i.leftText}. Bayar sekarang, ${i.isReseller ? "akun kamu langsung aktif" : "saldo masuk"} begitu admin verifikasi:`
    : `${label} <b>${amt}</b> (invoice ${i.invoiceId}) <b style="color:${EMAIL_COLORS.berryInk}">segera kedaluwarsa — sisa ${i.leftText}</b>. Transfer sekarang agar tidak batal otomatis:`;
  const value = i.isReseller ? resellerValueLine() : creditedLine(i.amount, i.credited);
  const body = `<p style="margin:0 0 4px 0">Halo <b>${escapeHtml(i.name)}</b>,</p>
    <p style="margin:8px 0 0 0">${head}</p>
    ${bankCard(amt, i.invoiceId, exp)}
    ${value}
    ${cta(i.isReseller ? "Selesaikan aktivasi" : "Bayar sekarang", "https://app.socio.id/saldo")}`;
  return {
    subject: mid
      ? `${label} ${amt} belum dibayar — sisa ${i.leftText}`
      : `Segera berakhir: ${label.toLowerCase()} ${amt} sisa ${i.leftText}`,
    html: shell(
      `${label} ${amt} — sisa ${i.leftText}`,
      mid ? "Pengingat Pembayaran" : i.isReseller ? "Pengingat Aktivasi" : "Pengingat Deposit",
      body,
      "idle",
    ),
    text: `${label} ${amt} sisa ${i.leftText}. Transfer ke BCA ${BCA_NUMBER} a.n ${BCA_NAME} sebelum ${exp}`,
  };
}

export function depositSuccessMail(i: { name: string; amount: number; isReseller?: boolean }): {
  subject: string;
  html: string;
  text: string;
} {
  const amt = idr(i.amount);
  const body = `<p style="margin:0 0 4px 0">Halo <b>${escapeHtml(i.name)}</b>,</p>
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

/**
 * Deposit batal / kedaluwarsa — WP6 L2 winback: nyatakan saldo tidak berubah,
 * kenapa batal, langkah lanjutan bila user TERLANJUR transfer, dan langkah
 * berikutnya yang paling pendek (bukan sekadar pemberitahuan).
 * Reseller: bahasa aktivasi + CTA mulai ulang (invoice bisa diterbitkan lagi).
 * Catatan jujur: jangan janji "tidak ada uang dipotong" — deposit manual bisa
 * saja user sudah transfer tetapi lewat/tidak cocok; sebab itu ada baris bukti.
 */
export function depositCanceledMail(i: {
  name: string;
  amount: number;
  reason: string;
  isReseller?: boolean;
}): {
  subject: string;
  html: string;
  text: string;
} {
  const amt = idr(i.amount);
  const bonusPct = Math.round(getDepositBonusRate() * 100);
  const bonusBit =
    bonusPct > 0 ? ` Bonus deposit ${bonusPct}% tetap berlaku untuk top-up berikutnya.` : "";
  const body = i.isReseller
    ? `<p style="margin:0 0 4px 0">Halo <b>${escapeHtml(i.name)}</b>,</p>
    <p style="margin:8px 0 0 0">Invoice aktivasi Reseller <b>${amt}</b> kedaluwarsa (${escapeHtml(i.reason)}). Saldo tidak berkurang dan akun kamu masih menunggu aktivasi.</p>
    ${resellerValueLine()}
    <p style="margin:12px 0 0 0;font-size:13px;color:${EMAIL_COLORS.inkBody}">Minta invoice baru di halaman reseller dan transfer sesuai nominal (termasuk 3 digit kode unik) — akun aktif otomatis setelah admin verifikasi. Sudah terlanjur bayar? Balas email ini dengan bukti transfer — kami cocokkan ke akunmu.</p>
    ${cta("Mulai ulang aktivasi", "https://app.socio.id/reseller")}`
    : `<p style="margin:0 0 4px 0">Halo <b>${escapeHtml(i.name)}</b>,</p>
    <p style="margin:8px 0 0 0">Deposit <b>${amt}</b> dibatalkan (${escapeHtml(i.reason)}). Saldo kamu tidak berubah.</p>
    <p style="margin:12px 0 0 0;font-size:13px;color:${EMAIL_COLORS.inkBody}">Mulai lagi kurang dari semenit: pilih nominal, transfer BCA sesuai angka pas (termasuk 3 digit kode unik).${bonusBit} Sudah terlanjur transfer? Balas email ini dengan bukti transfer — kami cocokkan ke akunmu.</p>
    ${cta("Top up lagi", "https://app.socio.id/saldo/top-up")}`;
  const subject = i.isReseller
    ? `Aktivasi Reseller ${amt} kedaluwarsa — mulai ulang dalam 1 menit`
    : `Deposit ${amt} dibatalkan — top up lagi dalam 1 menit`;
  const preheader = i.isReseller
    ? `Invoice aktivasi ${amt} kedaluwarsa — minta invoice baru`
    : `Deposit ${amt} dibatalkan — saldo kamu tidak berubah`;
  return {
    subject,
    html: shell(preheader, i.isReseller ? "Aktivasi Kedaluwarsa" : "Info Deposit", body, "sad"),
    text: i.isReseller
      ? `Aktivasi Reseller ${amt} kedaluwarsa (${i.reason}). Saldo tidak berkurang. Minta invoice baru di https://app.socio.id/reseller — akun aktif otomatis setelah pembayaran diverifikasi. Sudah terlanjur bayar? Balas email ini dengan bukti transfer.`
      : `Deposit ${amt} dibatalkan (${i.reason}). Saldo kamu tidak berubah. Buat deposit baru di https://app.socio.id/saldo/top-up (transfer sesuai nominal pas, termasuk 3 digit kode unik).${bonusBit} Sudah terlanjur transfer? Balas email ini dengan bukti transfer — kami cocokkan ke akunmu.`,
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

/**
 * C4 — notifikasi sukses deposit (bell in-app + email).
 * Dipanggil dari: webhook Midtrans, admin/deposits confirm, admin/deposits/verify approve.
 * Best-effort: gagal diam, jangan pecahkan flow utama.
 */
export async function notifyDepositSuccess(
  userId: number,
  amount: number,
  isReseller = false,
): Promise<void> {
  try {
    // 1. Bell in-app + Web Push
    await createNotification(
      userId,
      "Deposit berhasil",
      `Saldo ${idr(amount)} telah ditambahkan.`,
      "deposit",
    );
    // 2. Email sukses
    const [u] = await db
      .select({ email: users.email, fullName: users.fullName })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (u?.email) {
      const m = depositSuccessMail({
        name: u.fullName || "Pengguna Socio.id",
        amount,
        isReseller,
      });
      await enqueueEmail({
        to: u.email,
        userId,
        templateName: "deposit-success",
        subject: m.subject,
        body: m.text,
        ctaText: isReseller ? "Mulai order" : "Buat pesanan",
        ctaUrl: "https://app.socio.id/pesan",
        html: m.html,
      });
    }
  } catch (e) {
    console.error("[deposit-emails] notifyDepositSuccess failed:", e);
  }
}
