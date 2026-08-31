import { db } from "@socio/db";
import { users, accounts, verifications, deposits, balanceLogs } from "@socio/db/schema";
import { eq, or, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { sendEmail } from "./email";

export interface SignupInput {
  email: string;
  password: string;
  username: string;
  fullName: string;
  whatsapp?: string;
  level?: "Member" | "Reseller";
  /** ID user yang mereferensikan (referrer) — disimpan di up_link. */
  upLink?: number | null;
}

const rand = (n: number) => randomBytes(n).toString("hex").slice(0, n);
const farFuture = () => new Date("2099-01-01T00:00:00");

/**
 * Insert user baru langsung ke tabel legacy `users`. Mode SQL strict:
 * semua kolom NOT NULL tanpa default WAJIB diisi → insert partial pasti error
 * (alasan `auth.api.signUpEmail` gagal di DB legasi ini).
 * Link ke better-auth `accounts` supaya custom login flow bisa verify password.
 * Port 1:1 dari `app.socio.id/auth/signup-edit.php` + `signup-reseller-edit.php`.
 */
export async function createUserRow(input: SignupInput): Promise<number> {
  const email = input.email.trim().toLowerCase();
  const username = input.username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  // U-08: validate length setelah sanitasi (mis. "a@b" → "ab" lolos jika dicek awal)
  if (username.length < 3) throw new Error("Username minimal 3 karakter (hanya huruf/angka).");

  const [dup] = await db
    .select({ id: users.id })
    .from(users)
    .where(or(eq(users.username, username), eq(users.email, email)))
    .limit(1);
  if (dup) throw new Error("Username atau email sudah terdaftar.");

  const now = new Date();
  const passwordHash = bcrypt.hashSync(input.password, 10);

  const [inserted] = await db
    .insert(users)
    .values({
      fullName: input.fullName.trim(),
      username,
      email,
      password: passwordHash,
      balance: 0,
      level: input.level ?? "Member",
      createdAt: now,
      expire: farFuture(),
      status: "1",
      apiKey: `${Date.now()}${rand(20)}`,
      kodek: rand(32),
      hash: bcrypt.hashSync(rand(40), 4),
      astatus: "1",
      readPopup: "0",
      verify: "No",
      token: rand(40),
      has: "",
      resetLink: "",
      expReset: farFuture(),
      usedReset: "1",
      sewa: "No",
      reffKode: rand(5).toUpperCase(),
      upLink: input.upLink ? String(input.upLink) : "",
      subs: true,
      sentMail: false,
      online: false,
      tokenLogin: "",
      theme: "light",
      waNumber: (input.whatsapp ?? "").trim(),
    })
    .$returningId();
  const userId = inserted.id;

  // Credential untuk custom login flow (login/+page.server.ts baca accounts)
  await db.insert(accounts).values({
    id: `acc_${rand(30)}`,
    userId: String(userId),
    accountId: `cred_${rand(30)}`,
    providerId: "credential",
    password: passwordHash,
    createdAt: now,
    updatedAt: now,
  });

  return userId;
}

/**
 * Email verifikasi akun Member — insert token ke `verifications` (format
 * better-auth sehingga `/verifikasi?token=` tetap valid) lalu kirim via Resend.
 * Return `true` bila email benar-benar terkirim (Resend ok).
 */
export async function sendMemberVerificationEmail(userId: number): Promise<boolean> {
  const [u] = await db
    .select({ email: users.email, fullName: users.fullName })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!u) return false;

  const token = rand(48);
  const now = new Date();
  // Bersihkan token lama untuk email ini supaya 1 email = 1 token aktif (anti-duplikat resend).
  await db
    .delete(verifications)
    .where(eq(verifications.identifier, `email-verification:${u.email}`));
  await db.insert(verifications).values({
    id: `ver_${rand(30)}`,
    identifier: `email-verification:${u.email}`,
    value: token,
    expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
    createdAt: now,
    updatedAt: now,
  });
  const base = process.env.SOCIO_APP_URL ?? "https://app.socio.id";
  const link = `${base}/verifikasi?token=${token}`;
  const { verificationEmail } = await import("./email");
  const sent = await sendEmail({
    to: u.email,
    subject: "Verifikasi email — Socio.id",
    ...verificationEmail(link),
  });
  return sent;
}

/** Biaya aktivasi reseller: Rp50.000 incl. saldo Rp20.000 → tagihan = 50.000 + 111..999, kredit saldo 20.000 saat aktif. */
export function resellerActivationAmount(): {
  amount: number;
  suffix: number;
  saldoIncluded: number;
} {
  const suffix = 111 + Math.floor(Math.random() * 889); // 111..999
  return { amount: 50000 + suffix, suffix, saldoIncluded: 20000 };
}

/**
 * Flow daftar reseller (port `signup-reseller-edit.php`):
 * buat user level=Reseller (verify=No) + deposit Pending `untuk_apa=reseller`
 * + email instruksi transfer BCA. Akun aktif saat admin confirm deposit itu.
 */
export async function createResellerSignup(input: SignupInput): Promise<{
  userId: number;
  amount: number;
  depositId: number;
}> {
  const userId = await createUserRow({ ...input, level: "Reseller" });
  const { amount } = resellerActivationAmount();
  const bcaNumber = process.env.SOCIO_BCA_NUMBER ?? "1392680815";
  const bcaName = process.env.SOCIO_BCA_NAME ?? "Awangga Ramadhi";

  const [dep] = await db
    .insert(deposits)
    .values({
      userId,
      payment: "bank",
      type: "manual",
      methodName: "Bank Central Asia",
      validasi: "BCA",
      target: `${bcaNumber} a.n ${bcaName} (BCA)`,
      postAmount: amount,
      amount,
      note: "Aktivasi akun reseller",
      phone: null,
      status: "Pending",
      createdAt: new Date(),
      expire: new Date(Date.now() + 12 * 3600 * 1000),
      idPm: `RESELLER-${Date.now()}-${userId}`,
      invoiceVirtual: "",
      untukApa: "reseller",
      img: "",
    })
    .$returningId();

  await sendResellerInstructionsEmail(userId, amount, `${bcaNumber} a.n ${bcaName} (BCA)`);
  return { userId, amount, depositId: dep.id };
}

async function sendResellerInstructionsEmail(
  userId: number,
  amount: number,
  target: string,
): Promise<void> {
  const [u] = await db
    .select({ email: users.email, fullName: users.fullName })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!u) return;
  const amt = Math.round(amount).toLocaleString("id-ID");
  const html = `<!doctype html><html lang="id"><body style="margin:0;background:#f8fafc;padding:24px 12px;font-family:ui-sans-serif,system-ui,sans-serif">
  <table role="presentation" width="100%"><tr><td align="center">
    <table role="presentation" style="max-width:480px;width:100%;background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden">
      <tr><td style="background:linear-gradient(135deg,#4f46e5,#06b6d4);padding:20px 24px;color:#fff">
        <div style="font-size:18px;font-weight:800">Socio.id</div>
        <div style="font-size:11px;opacity:.85;letter-spacing:.08em;text-transform:uppercase">Aktivasi Akun Reseller</div>
      </td></tr>
      <tr><td style="padding:24px;color:#334155;font-size:14px;line-height:1.7">
        <p style="margin:0 0 12px">Halo <b>${u.fullName}</b>,</p>
        <p style="margin:0 0 12px">Terima kasih sudah mendaftar sebagai <b>Reseller Socio.id</b>. Tinggal selangkah lagi! Silakan transfer biaya aktivasi sebesar:</p>
        <div style="background:#f1f5f9;border-radius:12px;padding:16px;margin:16px 0;text-align:center">
          <div style="font-size:24px;font-weight:800;color:#0f172a">Rp${amt}</div>
          <div style="margin-top:6px;font-size:13px;color:#475569">${target}</div>
        </div>
        <p style="margin:0 0 12px"><b>Penting:</b> transfer <u>sesuai nominal</u> (termasuk 3 digit terakhir) supaya bisa dicocokkan, maksimal <b>12 jam</b> dari email ini.</p>
        <p style="margin:0 0 12px">Akun reseller kamu otomatis aktif dan saldo <b>Rp20.000 sudah termasuk</b> dalam pembayaranmu — langsung bisa dipakai pesan. Nikmati harga khusus untuk jualan ulang!</p>
        <p style="margin:0;color:#64748b;font-size:13px">Selamat bergabung!<br>Tim Socio.id</p>
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
  await sendEmail({
    to: u.email,
    subject: "Aktivasi Akun Reseller — Socio.id",
    html,
    text: `Aktivasi reseller: transfer Rp${amt} ke ${target} (sudah termasuk saldo Rp20.000). Akun aktif otomatis setelah pembayaran diterima.`,
  });
}

/**
 * Dipanggil saat admin confirm deposit `untuk_apa=reseller`:
 * aktifkan akun (verify=Yes) + kredit saldo Rp20.000 yang sudah termasuk di tagihan 50k (net).
 */
export async function activateReseller(userId: number): Promise<void> {
  const bonus = Number(process.env.SOCIO_RESELLER_BONUS ?? 20000);
  await db.update(users).set({ verify: "Yes" }).where(eq(users.id, userId));
  await db
    .update(users)
    .set({ balance: sql`GREATEST(${users.balance}, 0) + ${bonus}` })
    .where(eq(users.id, userId));
  await db.insert(balanceLogs).values({
    userId,
    type: "plus",
    amount: bonus,
    note: "Saldo aktivasi reseller (termasuk di pembayaran)",
    createdAt: new Date(),
  });
  const [u] = await db
    .select({ email: users.email, fullName: users.fullName })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (u) {
    const html = `<!doctype html><html lang="id"><body style="margin:0;background:#f8fafc;padding:24px 12px;font-family:ui-sans-serif,system-ui,sans-serif">
    <table role="presentation" width="100%"><tr><td align="center">
      <table role="presentation" style="max-width:480px;width:100%;background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden">
        <tr><td style="background:linear-gradient(135deg,#16a34a,#06b6d4);padding:20px 24px;color:#fff">
          <div style="font-size:18px;font-weight:800">Socio.id</div>
          <div style="font-size:11px;opacity:.85;letter-spacing:.08em;text-transform:uppercase">Selamat Datang Reseller</div>
        </td></tr>
        <tr><td style="padding:24px;color:#334155;font-size:14px;line-height:1.7">
          <p style="margin:0 0 12px">Halo <b>${u.fullName}</b>,</p>
          <p style="margin:0 0 12px">Pembayaran aktivasi reseller kamu sudah kami terima. 🎉</p>
          <p style="margin:0 0 12px">Akun kamu sudah aktif — saldo <b>Rp${bonus.toLocaleString("id-ID")} sudah masuk</b> dan siap dipakai. Nikmati harga spesial reseller!</p>
          <p style="margin:0;color:#64748b;font-size:13px">Sukses selalu!<br>Tim Socio.id</p>
        </td></tr>
      </table>
    </td></tr></table></body></html>`;
    await sendEmail({ to: u.email, subject: "Selamat Datang Reseller — Socio.id", html });
  }
}
