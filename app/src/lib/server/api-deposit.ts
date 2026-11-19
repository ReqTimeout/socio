/**
 * Deposit manual via API publik /api/v1 (port socio.my, adaptasi BCA .id).
 * Paritas penuh dengan action top-up web (/saldo/top-up): kode unik 3 digit
 * (111..999) ditambahkan sebagai rupiah UTUH, bonus deposit, maks 2 pending,
 * invoice DEP-, kedaluwarsa 24 jam, email instruksi + alert admin. Saldo baru
 * dikredit setelah admin konfirmasi (deposit tetap Pending — bukan auto-credit).
 */
import { db } from "@socio/db";
import { deposits, users } from "@socio/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { randomInt } from "node:crypto";
import { getTopupMin, getDepositBonusRate } from "$lib/format";
import { depositInstructionMail, enqueueEmail } from "$lib/server/deposit-emails";
import { depositAmountError } from "./api-compat";

const APP_URL = process.env.SOCIO_APP_URL ?? "https://app.socio.id";
/** Batas maksimal top up .id (paritas web /saldo/top-up: Rp10.000.000). */
const TOPUP_MAX = 10_000_000;

export type DepositInvoiceResult =
  | {
      ok: true;
      invoiceId: string;
      postAmount: number;
      credited: number;
      bonus: number;
      suffix: number;
      expireAt: string;
      method: string;
    }
  | { ok: false; error: string };

export async function createManualDepositInvoice(
  userId: number,
  amountRaw: number,
): Promise<DepositInvoiceResult> {
  const amount = Math.round(Number(amountRaw));
  const min = getTopupMin();
  const amountErr = depositAmountError(amountRaw, min, TOPUP_MAX);
  if (amountErr) return { ok: false, error: amountErr };

  // B-07: maks 2 deposit pending (paritas web top-up).
  const [pending] = await db
    .select({ n: sql<number>`count(*)` })
    .from(deposits)
    .where(and(eq(deposits.userId, userId), eq(deposits.status, "Pending")));
  if (Number(pending?.n ?? 0) >= 2) {
    return {
      ok: false,
      error: "You already have 2 pending deposits. Complete or cancel them first.",
    };
  }

  // Kode unik BCA .id = rupiah utuh (bukan sen seperti .my): postAmount = amount + suffix.
  const suffix = randomInt(111, 1000);
  const postAmount = amount + suffix;
  const bonus = Math.round(amount * getDepositBonusRate());
  // Saldo masuk = nominal transfer + bonus (amount tersimpan sudah termasuk bonus;
  // admin confirm kredit `deposits.amount` apa adanya — paritas PHP lama).
  const credited = postAmount + bonus;
  const invoiceId = `DEP-${Date.now()}-${userId}`;
  const expireAt = new Date(Date.now() + 24 * 3600 * 1000);

  await db.insert(deposits).values({
    userId,
    payment: "bank",
    type: "manual",
    methodName: "Transfer BCA",
    validasi: "BCA",
    target: "",
    postAmount,
    amount: credited,
    note: "Top up manual (API)",
    phone: null,
    status: "Pending",
    createdAt: new Date(),
    expire: expireAt,
    idPm: invoiceId,
    invoiceVirtual: "",
    untukApa: "smm",
    img: "",
  });

  try {
    const [u] = await db
      .select({ email: users.email, fullName: users.fullName })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (u?.email) {
      const m = depositInstructionMail({
        name: u.fullName || "Pengguna Socio.id",
        // Nominal PAS yang ditransfer = postAmount (credited sudah termasuk bonus).
        amount: postAmount,
        credited,
        invoiceId,
        expireAt,
      });
      await enqueueEmail({
        to: u.email,
        userId,
        templateName: "deposit-instruction",
        subject: m.subject,
        body: m.text,
        ctaText: "Lihat status deposit",
        ctaUrl: `${APP_URL}/saldo`,
        html: m.html,
        priority: "high",
      });
    }
    // Alert admin: ada deposit pending baru (uang masuk potensial).
    const { notifyAdmins } = await import("$lib/server/email-templates");
    const amtRp = "Rp" + Math.round(credited).toLocaleString("id-ID");
    const transferRp = "Rp" + Math.round(postAmount).toLocaleString("id-ID");
    await notifyAdmins({
      subject: `Deposit pending ${amtRp} — ${u?.fullName ?? "user #" + userId}`,
      body: `Deposit manual (API) ${amtRp} (${invoiceId}) menunggu konfirmasi.\nTransfer pas: ${transferRp} · Saldo dikredit: ${amtRp}\nUser: ${u?.fullName ?? userId} <${u?.email ?? "-"}>`,
      ctaText: "Buka deposits",
      ctaUrl: `${APP_URL}/admin/deposits`,
      templateName: "admin-deposit-pending",
    });
  } catch {
    // email best-effort — deposit tetap dibuat
  }

  return {
    ok: true,
    invoiceId,
    postAmount,
    credited,
    bonus,
    suffix,
    expireAt: expireAt.toISOString(),
    method: "manual",
  };
}
