import { db } from "@socio/db";
import { orders, users, balanceLogs } from "@socio/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { notifyOrderUpdate } from "$lib/server/notification";

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

      // CAS supaya 2 proses tidak refund ganda
      const [claim]: any[] = await db
        .update(orders)
        .set({ isRefund: 1, price: sql`GREATEST(${orders.price} - ${refundAmount}, 0)` })
        .where(and(eq(orders.id, o.id), eq(orders.isRefund, 0)));
      const affected = Number(claim?.affectedRows ?? 1);
      if (affected === 0) continue; // sudah di-refund proses lain

      await db
        .update(users)
        .set({ balance: sql`${users.balance} + ${refundAmount}` })
        .where(eq(users.id, o.userId));
      await db.insert(balanceLogs).values({
        userId: o.userId,
        type: "ref",
        amount: refundAmount,
        note: `Pengembalian dana otomatis (${o.status}) — order #${o.id}`,
        createdAt: new Date(),
      });
      refunded++;
      try {
        await notifyOrderUpdate(o.userId, o.id, `${o.status} (dananya dikembalikan)`);
      } catch {
        // notif best-effort
      }
    } catch (e) {
      console.error(`[cron] auto-refund order ${o.id} failed:`, e);
    }
  }
  if (refunded > 0) console.log(`[cron] auto-refund: ${refunded} order di-refund`);
}
