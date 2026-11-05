import { redirect } from "@sveltejs/kit";
import { db } from "@socio/db";
import { deposits, notifications } from "@socio/db/schema";
import { eq, sql, and, gt } from "drizzle-orm";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ locals, url }) => {
  if (!locals.user) {
    throw redirect(303, `/login?redirect=${encodeURIComponent(url.pathname)}`);
  }
  const [{ unread }] = await db
    .select({ unread: sql<number>`COUNT(*)` })
    .from(notifications)
    .where(
      and(eq(notifications.userId, Number(locals.user.id)), sql`${notifications.readAt} IS NULL`),
    );
  // C1 (port .my Nov-2026): deposit Pending yang BELUM kedaluwarsa → dot amber
  // di menu Saldo (Sidebar + BottomNav) supaya user sadar ada pembayaran yang
  // menunggu. User-scoped, limit 1, murah — kolom `expire` index ada.
  // Semantik .id: saat ini top-up = transfer BCA manual + kode unik (Pending
  // sampai admin konfirmasi); kalau Midtrans diaktifkan lagi, Pending =
  // invoice belum dibayar — query yang sama tetap benar.
  const [pend] = await db
    .select({ n: sql<number>`COUNT(*)` })
    .from(deposits)
    .where(
      and(
        eq(deposits.userId, Number(locals.user.id)),
        eq(deposits.status, "Pending"),
        gt(deposits.expire, new Date()),
      ),
    );
  return {
    user: {
      id: locals.user.id,
      name: locals.user.fullName || locals.user.username,
      username: locals.user.username,
      email: locals.user.email,
      level: locals.user.level,
      balance: locals.user.balance ?? 0,
    },
    unreadCount: Number(unread ?? 0),
    hasPendingDeposit: Number(pend?.n ?? 0) > 0,
  };
};
