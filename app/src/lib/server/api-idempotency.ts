/**
 * Idempotensi action `add` API publik /api/v1 (port socio.my). Tabel klaim DB
 * `api_idempotency` — klaim SEBELUM potong saldo / kontak provider supaya replay
 * `idempotency_key` yang sama tidak menghasilkan order kedua (race-safe).
 *
 * Aliran: handleAdd → getIdempotentOrder (replay done?) → claimIdempotencyKey
 * (INSERT UNIQUE; kalah = duplicate) → placeOrder → finalize (oid, done) ATAU
 * release (gagal → buang klaim supaya retry bisa buat order baru).
 *
 * Klaim `processing` yang menggantung (proses crash sebelum finalize/release)
 * dibebaskan setelah TTL 10 menit oleh klaim berikutnya (self-healing, tanpa cron).
 */
import { db } from "@socio/db";
import { apiIdempotency } from "@socio/db/schema";
import { and, eq, lt } from "drizzle-orm";

const STALE_MS = 10 * 60 * 1000;

function dupCode(e: unknown): string | undefined {
  return (e as { code?: string })?.code ?? (e as { cause?: { code?: string } })?.cause?.code;
}

/** Replay: oid order yang sudah berhasil untuk key ini (status done), atau null. */
export async function getIdempotentOrder(userId: number, key: string): Promise<string | null> {
  const [r] = await db
    .select({ oid: apiIdempotency.oid })
    .from(apiIdempotency)
    .where(
      and(
        eq(apiIdempotency.userId, userId),
        eq(apiIdempotency.idemKey, key),
        eq(apiIdempotency.status, "done"),
      ),
    )
    .limit(1);
  return r?.oid ?? null;
}

async function tryInsert(userId: number, key: string): Promise<boolean> {
  try {
    await db.insert(apiIdempotency).values({
      userId,
      idemKey: key,
      status: "processing",
      createdAt: new Date(),
    });
    return true;
  } catch (e) {
    if (dupCode(e) === "ER_DUP_ENTRY") return false;
    throw e;
  }
}

/**
 * Klaim key. true = menang (bisa lanjutkan order). false = duplicate (caller
 * baca ulang oid done). Klaim processing menggantung > TTL dibuang + retry sekali.
 */
export async function claimIdempotencyKey(userId: number, key: string): Promise<boolean> {
  if (await tryInsert(userId, key)) return true;
  const [existing] = await db
    .select({ status: apiIdempotency.status, createdAt: apiIdempotency.createdAt })
    .from(apiIdempotency)
    .where(and(eq(apiIdempotency.userId, userId), eq(apiIdempotency.idemKey, key)))
    .limit(1);
  if (
    existing?.status === "processing" &&
    existing.createdAt &&
    Date.now() - existing.createdAt.getTime() > STALE_MS
  ) {
    await db
      .delete(apiIdempotency)
      .where(
        and(
          eq(apiIdempotency.userId, userId),
          eq(apiIdempotency.idemKey, key),
          eq(apiIdempotency.status, "processing"),
          lt(apiIdempotency.createdAt, new Date(Date.now() - STALE_MS)),
        ),
      );
    return tryInsert(userId, key);
  }
  return false;
}

/** Order berhasil → simpan oid + tanda done (replay berikutnya mengembalikan oid ini). */
export async function finalizeIdempotency(userId: number, key: string, oid: string): Promise<void> {
  await db
    .update(apiIdempotency)
    .set({ oid, status: "done" })
    .where(and(eq(apiIdempotency.userId, userId), eq(apiIdempotency.idemKey, key)));
}

/** Order gagal (refund/provider reject) → buang klaim processing supaya retry valid. */
export async function releaseIdempotency(userId: number, key: string): Promise<void> {
  await db
    .delete(apiIdempotency)
    .where(
      and(
        eq(apiIdempotency.userId, userId),
        eq(apiIdempotency.idemKey, key),
        eq(apiIdempotency.status, "processing"),
      ),
    );
}
