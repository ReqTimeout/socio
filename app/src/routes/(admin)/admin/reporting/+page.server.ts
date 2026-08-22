import { db } from "@socio/db";
import { sql } from "drizzle-orm";
import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

const RANGES = ["7d", "30d", "month"] as const;
type Range = (typeof RANGES)[number];

function startOfRange(range: Range): Date {
  const now = new Date();
  if (range === "7d") {
    return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
  if (range === "30d") {
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  // month: dari awal bulan
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user) throw redirect(303, "/login");
  if (locals.user.level !== "Admin") throw redirect(303, "/");

  const rangeRaw = String(url.searchParams.get("range") ?? "7d");
  const range: Range = (RANGES as readonly string[]).includes(rangeRaw)
    ? (rangeRaw as Range)
    : "7d";
  const since = startOfRange(range);

  // Aggregate orders
  const [overviewRows, dailyRows, statusRows, topServices, topUsers] = await Promise.all([
    // Overview
    db.execute(sql`
      SELECT
        COUNT(*) AS total_orders,
        SUM(CASE WHEN status NOT IN ('Canceled','Error') THEN 1 ELSE 0 END) AS success_orders,
        SUM(CASE WHEN status IN ('Success','In progress','Processing','Partial') THEN price ELSE 0 END) AS revenue,
        SUM(CASE WHEN status = 'Success' THEN price ELSE 0 END) AS revenue_done,
        SUM(profit) AS total_profit,
        AVG(CASE WHEN quantity > 0 THEN price ELSE NULL END) AS avg_price
      FROM orders WHERE created_at >= ${since}
    `),
    // Daily (last 14 hari)
    db.execute(sql`
      SELECT DATE(created_at) AS day,
        COUNT(*) AS orders_count,
        SUM(CASE WHEN status = 'Success' THEN price ELSE 0 END) AS revenue
      FROM orders
      WHERE created_at >= ${new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)}
      GROUP BY DATE(created_at)
      ORDER BY day ASC
    `),
    // Status breakdown
    db.execute(sql`
      SELECT status, COUNT(*) AS c, SUM(price) AS revenue
      FROM orders WHERE created_at >= ${since}
      GROUP BY status ORDER BY c DESC
    `),
    // Top services (by revenue, success only)
    db.execute(sql`
      SELECT service_name,
        COUNT(*) AS orders_count,
        SUM(price) AS revenue,
        SUM(profit) AS profit
      FROM orders
      WHERE created_at >= ${since} AND status = 'Success'
      GROUP BY service_name
      ORDER BY revenue DESC
      LIMIT 10
    `),
    // Top users (by spend, success only)
    db.execute(sql`
      SELECT o.user_id, u.username,
        COUNT(*) AS orders_count,
        SUM(o.price) AS spend
      FROM orders o
      LEFT JOIN users u ON u.id = o.user_id
      WHERE o.created_at >= ${since} AND o.status = 'Success'
      GROUP BY o.user_id, u.username
      ORDER BY spend DESC
      LIMIT 10
    `),
  ]);

  const o = (overviewRows as any)[0] ?? {};
  const overview = {
    totalOrders: Number(o.total_orders ?? 0),
    successOrders: Number(o.success_orders ?? 0),
    revenue: Number(o.revenue ?? 0),
    revenueDone: Number(o.revenue_done ?? 0),
    totalProfit: Number(o.total_profit ?? 0),
    avgPrice: Number(o.avg_price ?? 0),
    successRate:
      Number(o.total_orders ?? 0) > 0
        ? (Number(o.success_orders ?? 0) / Number(o.total_orders)) * 100
        : 0,
  };

  // Build daily chart array (pad with 0 untuk hari tanpa data)
  const days: { day: string; revenue: number; orders: number; label: string }[] = [];
  const start = new Date(Date.now() - 13 * 24 * 60 * 60 * 1000);
  start.setHours(0, 0, 0, 0);
  for (let i = 0; i < 14; i++) {
    const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    const iso = d.toISOString().slice(0, 10);
    const row = ((dailyRows as any)[0] ?? []).find((r: any) => String(r.day).slice(0, 10) === iso);
    days.push({
      day: iso,
      revenue: Number(row?.revenue ?? 0),
      orders: Number(row?.orders_count ?? 0),
      label: d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }),
    });
  }

  return {
    range,
    overview,
    days,
    statusBreakdown: ((statusRows as any)[0] ?? []).map((r: any) => ({
      status: String(r.status),
      count: Number(r.c ?? 0),
      revenue: Number(r.revenue ?? 0),
    })),
    topServices: ((topServices as any)[0] ?? []).map((r: any) => ({
      name: String(r.service_name ?? ""),
      ordersCount: Number(r.orders_count ?? 0),
      revenue: Number(r.revenue ?? 0),
      profit: Number(r.profit ?? 0),
    })),
    topUsers: ((topUsers as any)[0] ?? []).map((r: any) => ({
      userId: Number(r.user_id),
      username: String(r.username ?? `user#${r.user_id}`),
      ordersCount: Number(r.orders_count ?? 0),
      spend: Number(r.spend ?? 0),
    })),
  };
};
