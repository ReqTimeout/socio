import { db } from "@socio/db";
import { apiUsage, users } from "@socio/db/schema";
import { sql, eq } from "drizzle-orm";
import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

const RANGES = ["7d", "30d", "all"] as const;
type Range = (typeof RANGES)[number];

function startOfRange(range: Range): Date | null {
  const now = new Date();
  if (range === "7d") return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (range === "30d") return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return null; // all
}

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user) throw redirect(303, "/login");
  if (locals.user.level !== "Admin") throw redirect(303, "/");

  const rawRange = String(url.searchParams.get("range") ?? "7d");
  const range: Range = (RANGES as readonly string[]).includes(rawRange)
    ? (rawRange as Range)
    : "7d";
  const start = startOfRange(range);
  const where = start ? sql`${apiUsage.createdAt} >= ${start}` : undefined;

  // Totals
  const [tot] = (await db
    .select({
      total: sql<number>`count(*)`,
      errors: sql<number>`COALESCE(SUM(CASE WHEN ${apiUsage.ok} = 0 THEN 1 ELSE 0 END),0)`,
      uniqueUsers: sql<number>`COUNT(DISTINCT ${apiUsage.userId})`,
    })
    .from(apiUsage)
    .where(where)) as any[];

  // Breakdown per action
  const byAction = (await db
    .select({
      action: apiUsage.action,
      total: sql<number>`count(*)`,
      errors: sql<number>`COALESCE(SUM(CASE WHEN ${apiUsage.ok} = 0 THEN 1 ELSE 0 END),0)`,
    })
    .from(apiUsage)
    .where(where)
    .groupBy(apiUsage.action)
    .orderBy(sql`count(*) DESC`)
    .limit(20)) as any[];

  // Top user (join username)
  const topUsers = (await db
    .select({
      userId: apiUsage.userId,
      username: users.username,
      total: sql<number>`count(*)`,
      errors: sql<number>`COALESCE(SUM(CASE WHEN ${apiUsage.ok} = 0 THEN 1 ELSE 0 END),0)`,
      lastSeen: sql<string>`MAX(${apiUsage.createdAt})`,
    })
    .from(apiUsage)
    .leftJoin(users, eq(users.id, apiUsage.userId))
    .where(where)
    .groupBy(apiUsage.userId)
    .orderBy(sql`count(*) DESC`)
    .limit(15)) as any[];

  // Daily series utk chart
  const daily = (await db
    .select({
      day: sql<string>`DATE(${apiUsage.createdAt})`,
      total: sql<number>`count(*)`,
    })
    .from(apiUsage)
    .where(where)
    .groupBy(sql`DATE(${apiUsage.createdAt})`)
    .orderBy(sql`DATE(${apiUsage.createdAt}) ASC`)
    .limit(60)) as any[];

  // Recent calls (50)
  const recent = (await db
    .select({
      id: apiUsage.id,
      userId: apiUsage.userId,
      username: users.username,
      action: apiUsage.action,
      ok: apiUsage.ok,
      ip: apiUsage.ip,
      createdAt: apiUsage.createdAt,
    })
    .from(apiUsage)
    .leftJoin(users, eq(users.id, apiUsage.userId))
    .orderBy(sql`${apiUsage.createdAt} DESC`)
    .limit(50)) as any[];

  return {
    range,
    totals: {
      total: Number(tot?.total ?? 0),
      errors: Number(tot?.errors ?? 0),
      uniqueUsers: Number(tot?.uniqueUsers ?? 0),
    },
    byAction,
    topUsers,
    daily: daily.map((d) => ({ day: String(d.day), total: Number(d.total) })),
    recent,
  };
};
