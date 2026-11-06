/**
 * G1 lifecycle — eksekusi opt-out marketing. Dipanggil halaman /u (manusia,
 * setelah konfirmasi CSRF) dan endpoint one-click /api/u (RFC 8058). Idempoten
 * — dipanggil berulang tetap aman (upsert pada unique(email)).
 *
 * Dua hal yang ditulis:
 *  1. `users.subs = false` bila email cocok dengan sebuah akun. HANYA memengaruhi
 *     jalur MARKETING — transaksional (reset/deposit/refund/tiket) tidak membaca
 *     flag ini, jadi tetap terkirim. Non-fatal bila email tak punya akun.
 *  2. Baris `email_suppressions` (upsert). Ini sumber kebenaran daftar hitam yang
 *     disaring worker `email-queue.ts` + BASE_FILTER segmen marketing.
 */
import { db } from "@socio/db";
import { emailSuppressions, users } from "@socio/db/schema";
import { eq } from "drizzle-orm";

export async function applyUnsubscribe(
  email: string,
  campaignKey = "marketing",
): Promise<void> {
  const e = email.trim().toLowerCase();
  if (!e) return;
  // 1. Flag subs=false di users (bila ada akunnya). Non-fatal bila tidak.
  try {
    await db.update(users).set({ subs: false }).where(eq(users.email, e));
  } catch (err) {
    console.error("[marketing] applyUnsubscribe: users.subs update gagal:", err);
  }
  // 2. Upsert suppression — ON DUPLICATE KEY UPDATE pada unique(email).
  await db
    .insert(emailSuppressions)
    .values({
      email: e,
      reason: "unsubscribe",
      source: "one-click",
      detail: campaignKey.slice(0, 50),
    })
    .onDuplicateKeyUpdate({
      set: { reason: "unsubscribe", source: "one-click" },
    });
}
