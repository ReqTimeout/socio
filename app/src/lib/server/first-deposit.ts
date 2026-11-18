/**
 * WP6 L1 — nudge "deposit pertama" untuk user yang sudah daftar tapi BELUM
 * pernah deposit sukses (port .my: mayoritas user baru berhenti di sini karena
 * tidak ada penjelasan cara deposit di dashboard).
 *
 * Keputusan tampil DI SERVER (jangan tayang buta di halaman panas):
 *   - Gate aktivasi reseller sedang aktif → null (banner aktivasi sudah pegang pesan itu).
 *   - Pernah ada deposit Success (totalDeposit > 0) → null (bukan lagi user baru).
 *   - Ada deposit Pending yang masih hidup → stage "pending" (arahkan ke /saldo
 *     untuk bayar invoice yang ada, bukan buat invoice baru).
 *   - Selain itu → stage "new" (arahkan ke /saldo/top-up).
 *
 * Hemat query: dua guard pertama return sebelum menyentuh DB, jadi hanya subset
 * user belum-deposit yang menambah 1 query (index user_id).
 */
import { db } from "@socio/db";
import { deposits } from "@socio/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { getDepositBonusRate, getTopupMin } from "$lib/format";

export type FirstDepositNudge = {
  stage: "new" | "pending";
  /** Persen bonus deposit asli (env SOCIO_DEPOSIT_BONUS) — 0 = jangan janji. */
  bonusPct: number;
  /** Minimum top-up Rupiah (env SOCIO_TOPUP_MIN). */
  minTopup: number;
  /** Stage pending saja: nominal PAS yang harus dibayar (termasuk kode unik 3 digit). */
  amount: number;
  expireAt: string | null;
  isReseller: boolean;
};

export async function getFirstDepositNudge(
  userId: number,
  i: { totalDeposit: number; activationRequired: boolean },
): Promise<FirstDepositNudge | null> {
  if (i.activationRequired) return null;
  if (Number(i.totalDeposit ?? 0) > 0) return null;

  const base = {
    bonusPct: Math.round(getDepositBonusRate() * 100),
    minTopup: getTopupMin(),
    amount: 0,
    expireAt: null as string | null,
    isReseller: false,
  };
  try {
    const [pend] = await db
      .select({
        postAmount: deposits.postAmount,
        amount: deposits.amount,
        expire: deposits.expire,
        untukApa: deposits.untukApa,
      })
      .from(deposits)
      .where(
        and(
          eq(deposits.userId, userId),
          eq(deposits.status, "Pending"),
          sql`${deposits.expire} > NOW()`,
        ),
      )
      .orderBy(desc(deposits.id))
      .limit(1);
    if (pend) {
      return {
        ...base,
        stage: "pending",
        amount: Number(pend.postAmount ?? pend.amount ?? 0),
        expireAt: new Date(pend.expire).toISOString(),
        isReseller: pend.untukApa === "reseller",
      };
    }
  } catch {
    // Query gagal → tetap tunjuk nudge "new" (lebih baik daripada diam).
    return { ...base, stage: "new" };
  }
  return { ...base, stage: "new" };
}
