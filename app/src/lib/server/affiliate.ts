import { db } from "@socio/db";
import { users, affiliate } from "@socio/db/schema";
import { eq, and } from "drizzle-orm";
import { createNotification } from "./notification";

const AFFILIATE_RATE = Number(process.env.SOCIO_AFFILIATE_RATE ?? 0.02);

/**
 * Komisi affiliate untuk upline Reseller saat downline deposit (port
 * `cekmutasi/cron.php` + `jasamutasi/callback.php` + `tripay/callback.php`).
 * Dipanggil dari semua jalur kredit deposit: admin manual confirm &
 * Midtrans webhook. Masuk antrian Pending — upline tarik lewat halaman
 * `/affiliate` (approval admin).
 *
 * Aturan legasi: hanya top up `untuk_apa='smm'` yang dapat komisi
 * (deposit aktivasi reseller tidak dihitung).
 */
export async function creditAffiliateCommission(
  downlineId: number,
  amount: number,
  untukApa?: string | null,
): Promise<void> {
  if (untukApa && untukApa !== "smm") return;
  const commission = Math.round(Number(amount) * AFFILIATE_RATE);
  if (!(commission > 0)) return;

  const [downline] = await db
    .select({ id: users.id, upLink: users.upLink })
    .from(users)
    .where(eq(users.id, downlineId))
    .limit(1);
  if (!downline) return;

  const upLinkId = Number(downline.upLink);
  if (!upLinkId || !Number.isFinite(upLinkId)) return;

  const [upline] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, upLinkId), eq(users.level, "Reseller")))
    .limit(1);
  if (!upline) return;

  await db.insert(affiliate).values({
    userId: upline.id,
    userAffi: downlineId,
    balance: commission,
    status: "Pending",
    createdAt: new Date(),
  });
  try {
    await createNotification(
      upline.id,
      "Komisi affiliate",
      `Downline deposit Rp${Number(amount).toLocaleString("id-ID")} — komisi Rp${commission.toLocaleString("id-ID")} masuk antrian.`,
      "promo",
    );
  } catch {
    // best-effort — notifikasi tidak boleh menggagalkan kredit
  }
}
