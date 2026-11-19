/**
 * Anti-replay nonce API publik /api/v1 (port socio.my, Susulan 50). checkApiSignature
 * hanya memaksa timestamp ±300s; modul ini mencatat signature (nonce unik per request)
 * supaya request bertanda tangan yang sama tidak bisa diproses dua kali dalam window itu.
 *
 * Aliran: POST handler → checkApiSignature lolos → claimNonce(user.id, signature).
 * true = pertama kali (lanjutkan). false = replay ATAU store error (fail-closed, tolak).
 * DB-backed UNIQUE(user_id, nonce), TTL 600s (> window 300s). cleanupApiReplay dipanggil
 * cron berkala untuk buang baris kedaluwarsa (pola rate-limit/idempotensi, tanpa Redis).
 */
import { db } from "@socio/db";
import { apiReplay } from "@socio/db/schema";
import { lt } from "drizzle-orm";

const TTL_MS = 600_000;

function dupCode(e: unknown): string | undefined {
  return (e as { code?: string })?.code ?? (e as { cause?: { code?: string } })?.cause?.code;
}

/** Klaim nonce. true = pertama kali (bisa proses). false = replay / store error (tolak). */
export async function claimNonce(userId: number, nonce: string): Promise<boolean> {
  const n = String(nonce ?? "").slice(0, 128);
  if (!n) return false;
  const now = new Date();
  try {
    await db.insert(apiReplay).values({
      userId,
      nonce: n,
      expiresAt: new Date(now.getTime() + TTL_MS),
      createdAt: now,
    });
    return true;
  } catch (e) {
    if (dupCode(e) === "ER_DUP_ENTRY") return false;
    // Fail-closed: store error → tolak request bertanda tangan (lebih aman daripada lolos).
    console.error("[api-replay] claim failed:", (e as Error)?.message);
    return false;
  }
}

/** Buang nonce kedaluwarsa (best-effort, cron berkala). */
export async function cleanupApiReplay(): Promise<void> {
  try {
    await db.delete(apiReplay).where(lt(apiReplay.expiresAt, new Date()));
  } catch {
    // best-effort
  }
}
