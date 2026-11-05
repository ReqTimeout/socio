import { db } from "@socio/db";
import { deposits, balanceLogs } from "@socio/db/schema";
import { eq, desc } from "drizzle-orm";
import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(303, "/login");

  const userId = Number(locals.user.id);
  const topups = await db
    .select({
      id: deposits.id,
      amount: deposits.amount,
      // C1 (port .my): nominal TEPAT yang harus ditransfer (termasuk kode unik
      // sen) + tujuan deposit — banner aksi bedakan top-up smm vs aktivasi
      // reseller (`untukApa === "reseller"`).
      postAmount: deposits.postAmount,
      untukApa: deposits.untukApa,
      methodName: deposits.methodName,
      status: deposits.status,
      createdAt: deposits.createdAt,
      expire: deposits.expire,
    })
    .from(deposits)
    .where(eq(deposits.userId, userId))
    .orderBy(desc(deposits.createdAt))
    .limit(5);

  const logs = await db
    .select({
      id: balanceLogs.id,
      type: balanceLogs.type,
      amount: balanceLogs.amount,
      note: balanceLogs.note,
      createdAt: balanceLogs.createdAt,
    })
    .from(balanceLogs)
    .where(eq(balanceLogs.userId, userId))
    .orderBy(desc(balanceLogs.createdAt))
    .limit(5);

  return {
    balance: locals.user.balance ?? 0,
    // Level untuk gerbang teaser C1 (Member saja — sama pola .my).
    level: locals.user.level ?? "Member",
    topups,
    logs,
  };
};
