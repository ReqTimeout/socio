import { db } from "@socio/db";
import { orders, users, balanceLogs } from "@socio/db/schema";
import { eq, and, lt, sql } from "drizzle-orm";
import { notifyOrderUpdate } from "$lib/server/notification";
import { ledgerRefundSum } from "$lib/server/refund";

/**
 * Auto-refund order Error / Partial / Canceled yang belum di-refund.
 * Port 1:1 dari `app.socio.id/cron/refund.php`:
 *  - Error/Canceled  → refund penuh
 *  - Partial         → refund proporsional = (price/qty) × remains
 *  - idempotent via `is_refund=1` dan CAS `WHERE is_refund = 0`
 * Dijalankan tiap 15 menit (cron) — TIDAK ada refund otomatis tanpa ini.
 */
export async function runAutoRefund(): Promise<void> {
  const rows = await db
    .select()
    .from(orders)
    .where(and(sql`${orders.status} IN ('Partial','Error','Canceled')`, eq(orders.isRefund, 0)))
    .limit(50);

  if (rows.length === 0) return;
  let refunded = 0;

  for (const o of rows) {
    try {
      const qty = Number(o.quantity) || 1;
      const remains = Math.min(Number(o.remains ?? 0), qty);
      let refundAmount: number;
      if (o.status === "Partial") {
        refundAmount = Math.round((Number(o.price) / qty) * remains);
      } else {
        refundAmount = Number(o.price); // Error / Canceled → penuh
      }
      if (refundAmount <= 0) {
        await db.update(orders).set({ isRefund: 1 }).where(eq(orders.id, o.id));
        continue;
      }

      // Guard ledger: `is_refund` boleh bohong (flag 0, price utuh, tapi saldo
      // sudah pernah ditambah). Tanpa cek ini, cron akan menambah saldo lagi →
      // refund ganda. Kalau ledger sudah ada refund untuk order ini, cukup perbaiki
      // flag lalu lewati (self-heal, bukan kredit ulang).
      if (await ledgerRefundSum(Number(o.userId), Number(o.id))) {
        await db.update(orders).set({ isRefund: 1 }).where(eq(orders.id, o.id));
        console.warn(
          `[cron] auto-refund: order #${o.id} sudah ada refund di ledger → flag dipaksa 1, tidak kredit ulang`,
        );
        continue;
      }

      // Klaim CAS + kredit saldo + catat log dalam SATU transaksi. Kalau salah
      // satu gagal (mis. DB transient), seluruhnya rollback sehingga is_refund
      // tetap 0 → order ini dicoba lagi di run berikutnya (tidak under-refund).
      let credited = 0;
      await db.transaction(async (tx) => {
        const [claim]: any[] = await tx
          .update(orders)
          .set({ isRefund: 1, price: sql`GREATEST(${orders.price} - ${refundAmount}, 0)` })
          .where(and(eq(orders.id, o.id), eq(orders.isRefund, 0)));
        const affected = Number(claim?.affectedRows ?? 1);
        if (affected === 0) return; // sudah di-refund proses lain
        await tx
          .update(users)
          .set({ balance: sql`${users.balance} + ${refundAmount}` })
          .where(eq(users.id, o.userId));
        await tx.insert(balanceLogs).values({
          userId: o.userId,
          type: "ref",
          amount: refundAmount,
          note: `Pengembalian dana otomatis (${o.status}) - order #${o.id}`,
          createdAt: new Date(),
        });
        credited = refundAmount;
      });
      if (credited > 0) {
        refunded++;
        try {
          await notifyOrderUpdate(o.userId, o.id, `${o.status} (dananya dikembalikan)`);
        } catch {
          // notif best-effort
        }
      }
    } catch (e) {
      console.error(`[cron] auto-refund order ${o.id} failed:`, e);
    }
  }
  if (refunded > 0) console.log(`[cron] auto-refund: ${refunded} order di-refund`);
}

/**
 * Auto-refund order NYANGKAP: status Pending / Processing / In progress yang
 * umurnya sudah melewati batas (default 7 hari, env SOCIO_STALE_ORDER_DAYS).
 *
 * Kenapa perlu: order yg provider-nya tak pernah memulai (start_count=0) tetap
 * "Pending" selamanya → saldo konsumen tertahan tanpa batas. Auto-refund Error/
 * Partial/Canceled TIDAK menjangkau status ini..prod: 53 order Pending (s/d
 * 2021) + 2 Processing + 1 In progress = Rp610rb tertahan.
 *
 * Refund PENUH (bukan proporsional): tak ada transaksi yang terkirim, jadi
 * 100% dana harus kembali. Guard ledger-first + CAS is_refund (sama dgn
 * auto-refund biasa) → tak ada refund ganda.
 */
export async function runStaleOrderRefund(): Promise<void> {
  const days = Math.max(1, Number(process.env.SOCIO_STALE_ORDER_DAYS ?? 7) || 7);
  const cutoff = new Date(Date.now() - days * 86400000);
  const rows = await db
    .select()
    .from(orders)
    .where(
      and(
        sql`${orders.status} IN ('Pending','Processing','In progress')`,
        lt(orders.createdAt, cutoff),
        eq(orders.isRefund, 0),
      ),
    )
    .limit(50);

  if (rows.length === 0) return;
  let refunded = 0;

  for (const o of rows) {
    try {
      const refundAmount = Number(o.price) || 0;
      if (refundAmount <= 0) {
        await db.update(orders).set({ isRefund: 1 }).where(eq(orders.id, o.id));
        continue;
      }

      // Guard ledger: kalau refund untuk order ini sudah tercatat → jangan
      // kredit ulang; cukup selaraskan flag (self-heal).
      if (await ledgerRefundSum(Number(o.userId), Number(o.id))) {
        await db.update(orders).set({ isRefund: 1 }).where(eq(orders.id, o.id));
        console.warn(
          `[cron] stale-refund: order #${o.id} sudah ada refund di ledger → flag dipaksa 1, tidak kredit ulang`,
        );
        continue;
      }

      // Klaim CAS + kredit saldo + catat log dalam SATU transaksi.
      let credited = 0;
      await db.transaction(async (tx) => {
        const [claim]: any[] = await tx
          .update(orders)
          .set({ isRefund: 1, status: "Error" as any, price: sql`GREATEST(${orders.price} - ${refundAmount}, 0)` })
          .where(and(eq(orders.id, o.id), eq(orders.isRefund, 0)));
        const affected = Number(claim?.affectedRows ?? 1);
        if (affected === 0) return;
        await tx
          .update(users)
          .set({ balance: sql`${users.balance} + ${refundAmount}` })
          .where(eq(users.id, o.userId));
        await tx.insert(balanceLogs).values({
          userId: o.userId,
          type: "ref",
          amount: refundAmount,
          note: `Pengembalian dana otomatis (order nyangkut > ${days} hari) - order #${o.id}`,
          createdAt: new Date(),
        });
        credited = refundAmount;
      });
      if (credited > 0) {
        refunded++;
        try {
          await notifyOrderUpdate(o.userId, o.id, "Error (dananya dikembalikan)");
        } catch {
          // notif best-effort
        }
      }
    } catch (e) {
      console.error(`[cron] stale-refund order ${o.id} failed:`, e);
    }
  }
  if (refunded > 0) {
    console.log(`[cron] stale-refund: ${refunded} order nyangkut di-refund (>%d hari)`, days);
  }
}
