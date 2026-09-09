import { db } from "@socio/db";
import { orders, users, adminNotifications } from "@socio/db/schema";
import { sql, eq, lt, and } from "drizzle-orm";

/**
 * Rekonsiliasi uang harian (Phase 4 P1) — ALERT ONLY, tidak pernah auto-fix.
 * Uang user terlalu sensitif untuk diperbaiki otomatis; admin yang putuskan.
 *
 * Cek:
 *  1. Order gagal final (Error/Canceled/Partial) yang BELUM di-refund >1 jam.
 *     Auto-refund cron (15 mnt) seharusnya menangani — jika lolos = bug money-safety.
 *  2. Saldo negatif (seharusnya mustahil via deduct atomik).
 */
export async function runReconcile(): Promise<void> {
  const findings: string[] = [];

  // 1. Unrefunded failed orders (grace 1 jam untuk auto-refund cron)
  try {
    const rows = (await db
      .select({ id: orders.id, status: orders.status, price: orders.price, userId: orders.userId })
      .from(orders)
      .where(
        and(
          sql`${orders.status} IN ('Error','Canceled','Partial')`,
          eq(orders.isRefund, 0),
          lt(orders.updatedAt, sql`DATE_SUB(NOW(), INTERVAL 1 HOUR)`),
        ),
      )
      .limit(50)) as any[];
    if (rows.length > 0) {
      const total = rows.reduce((a: number, r: any) => a + Number(r.price ?? 0), 0);
      findings.push(
        `${rows.length} order gagal belum refund (Rp${Math.round(total).toLocaleString("id-ID")}, cth #${rows.slice(0, 5).map((r: any) => r.id).join(",#")})`,
      );
    }
  } catch (e) {
    console.error("[cron] reconcile unrefunded check failed:", e);
  }

  // 2. Negative balances
  try {
    const rows = (await db
      .select({ id: users.id, balance: users.balance })
      .from(users)
      .where(sql`${users.balance} < 0`)
      .limit(20)) as any[];
    if (rows.length > 0) {
      findings.push(
        `${rows.length} user saldo negatif (cth #${rows.slice(0, 5).map((r: any) => r.id).join(",#")})`,
      );
    }
  } catch (e) {
    console.error("[cron] reconcile negative check failed:", e);
  }

  if (findings.length === 0) {
    console.log("[cron] reconcile: bersih, tidak ada anomali uang");
    return;
  }

  // Broadcast ke semua admin (in-app, priority critical).
  try {
    const admins = (await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.level, "Admin" as any))
      .limit(20)) as any[];
    for (const a of admins) {
      await db.insert(adminNotifications).values({
        adminId: Number(a.id),
        type: "system",
        title: "Anomali uang terdeteksi",
        message: `Rekonsiliasi harian: ${findings.join(" · ")}. Cek manual sebelum ada komplain.`,
        actionUrl: "/admin/orders",
        priority: "critical",
        createdAt: new Date(),
      } as any);
    }
  } catch (e) {
    console.error("[cron] reconcile notify failed:", e);
  }
  console.log(`[cron] reconcile: ${findings.length} temuan — admin di-notify`);
}
