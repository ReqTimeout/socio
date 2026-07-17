import { db } from "@socio/db";
import { balanceLogs } from "@socio/db/schema";
import { eq, desc } from "drizzle-orm";
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
  return { logs: rows };
};
