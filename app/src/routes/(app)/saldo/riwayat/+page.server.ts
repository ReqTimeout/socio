import { db } from "@socio/db";
import { balanceLogs } from "@socio/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(303, "/login");
  const rows = await db
    .select({
      id: balanceLogs.id,
      type: balanceLogs.type,
      amount: balanceLogs.amount,
      note: balanceLogs.note,
      createdAt: balanceLogs.createdAt,
    })
    .from(balanceLogs)
    .where(eq(balanceLogs.userId, Number(locals.user.id)))
    .orderBy(desc(balanceLogs.createdAt))
    .limit(50);
  // Ringkasan all-time (bukan cuma 50 terakhir) — 1 query ringan.
  // Legacy PHP menyimpan pengeluaran sebagai amount POSITIF + type='minus'
  // (lihat app.socio.id/order/new-action.php) — arah transaksi ditentukan
  // oleh type, bukan tanda amount. App baru (M2+) menulis amount bertanda.
  const [agg] = await db
    .select({
      masuk: sql<number>`COALESCE(SUM(CASE WHEN type = 'plus' AND amount > 0 THEN amount ELSE 0 END),0)`,
      keluar: sql<number>`COALESCE(SUM(CASE WHEN type = 'minus' AND amount > 0 THEN amount WHEN amount < 0 THEN -amount ELSE 0 END),0)`,
    })
    .from(balanceLogs)
    .where(eq(balanceLogs.userId, Number(locals.user!.id)));
  const summary = { masuk: Number(agg?.masuk ?? 0), keluar: Number(agg?.keluar ?? 0) };

  return { logs: rows, summary };
};
