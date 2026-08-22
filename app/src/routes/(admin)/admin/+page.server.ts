import { db } from "@socio/db";
import { users, orders, deposits, auditLog, jobQueue, providerSyncLog } from "@socio/db/schema";
import { sql, desc, and, gte, lt, eq, inArray } from "drizzle-orm";
import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

/** YYYY-MM-DD dari komponen lokal (bukan UTC) supaya bucket sejajar DATE() MySQL. */
function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function pct(today: number, prev: number): number | undefined {
  if (prev <= 0) return today > 0 ? 100 : undefined;
  return ((today - prev) / prev) * 100;
}
function rp(n: number): string {
  return "Rp" + Math.round(n).toLocaleString("id-ID");
}

// Status order yang sedang aktif dipoll ke provider
const ACTIVE_ORDER_STATUS = ["Pending", "Processing", "In progress", "Refilling"] as const;

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(303, "/login");

  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startYest = new Date(startToday.getTime() - 86_400_000);
  const start7 = new Date(startToday.getTime() - 6 * 86_400_000);

  const [
    userTotals,
    usersTodayRow,
    usersYestRow,
    ordersTodayRow,
    ordersYestRow,
    depPendingRow,
    revTodayRow,
    revYestRow,
    ordersByDay,
    usersByDay,
    revByDay,
    syncLast,
    queueDepthRow,
    pollingRow,
    lastMineRow,
    recentOrders,
    recentDeposits,
    recentUsers,
    recentAudit,
  ] = await Promise.all([
    db
      .select({
        users: sql<number>`count(*)`,
        balance: sql<number>`COALESCE(SUM(${users.balance}),0)`,
      })
      .from(users),
    db
      .select({ c: sql<number>`count(*)` })
      .from(users)
      .where(gte(users.createdAt, startToday)),
    db
      .select({ c: sql<number>`count(*)` })
      .from(users)
      .where(and(gte(users.createdAt, startYest), lt(users.createdAt, startToday))),
    db
      .select({ c: sql<number>`count(*)`, rev: sql<number>`COALESCE(SUM(${orders.price}),0)` })
      .from(orders)
      .where(gte(orders.createdAt, startToday)),
    db
      .select({ c: sql<number>`count(*)` })
      .from(orders)
      .where(and(gte(orders.createdAt, startYest), lt(orders.createdAt, startToday))),
    db
      .select({ c: sql<number>`count(*)`, amt: sql<number>`COALESCE(SUM(${deposits.amount}),0)` })
      .from(deposits)
      .where(eq(deposits.status, "Pending")),
    db
      .select({ rev: sql<number>`COALESCE(SUM(${orders.price}),0)` })
      .from(orders)
      .where(gte(orders.createdAt, startToday)),
    db
      .select({ rev: sql<number>`COALESCE(SUM(${orders.price}),0)` })
      .from(orders)
      .where(and(gte(orders.createdAt, startYest), lt(orders.createdAt, startToday))),
    db
      .select({ d: sql<string>`DATE(${orders.createdAt})`, c: sql<number>`count(*)` })
      .from(orders)
      .where(gte(orders.createdAt, start7))
      .groupBy(sql`DATE(${orders.createdAt})`),
    db
      .select({ d: sql<string>`DATE(${users.createdAt})`, c: sql<number>`count(*)` })
      .from(users)
      .where(gte(users.createdAt, start7))
      .groupBy(sql`DATE(${users.createdAt})`),
    db
      .select({
        d: sql<string>`DATE(${orders.createdAt})`,
        rev: sql<number>`COALESCE(SUM(${orders.price}),0)`,
      })
      .from(orders)
      .where(gte(orders.createdAt, start7))
      .groupBy(sql`DATE(${orders.createdAt})`),
    db
      .select({
        status: providerSyncLog.status,
        fetched: providerSyncLog.fetched,
        changed: providerSyncLog.changed,
        createdAt: providerSyncLog.createdAt,
      })
      .from(providerSyncLog)
      .orderBy(desc(providerSyncLog.createdAt))
      .limit(1),
    db
      .select({ c: sql<number>`count(*)` })
      .from(jobQueue)
      .where(eq(jobQueue.status, "pending")),
    db
      .select({ c: sql<number>`count(*)` })
      .from(orders)
      .where(inArray(orders.status, [...ACTIVE_ORDER_STATUS])),
    db
      .select({
        action: auditLog.action,
        entity: auditLog.entity,
        entityId: auditLog.entityId,
        createdAt: auditLog.createdAt,
      })
      .from(auditLog)
      .where(eq(auditLog.adminId, Number(locals.user.id)))
      .orderBy(desc(auditLog.createdAt))
      .limit(1),
    db
      .select({
        id: orders.id,
        oid: orders.oid,
        user: orders.user,
        service: orders.serviceName,
        status: orders.status,
        price: orders.price,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .limit(12),
    db
      .select({
        id: deposits.id,
        userId: deposits.userId,
        amount: deposits.amount,
        method: deposits.methodName,
        status: deposits.status,
        createdAt: deposits.createdAt,
      })
      .from(deposits)
      .orderBy(desc(deposits.createdAt))
      .limit(12),
    db
      .select({
        id: users.id,
        username: users.username,
        level: users.level,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(12),
    db
      .select({
        id: auditLog.id,
        action: auditLog.action,
        entity: auditLog.entity,
        entityId: auditLog.entityId,
        createdAt: auditLog.createdAt,
      })
      .from(auditLog)
      .orderBy(desc(auditLog.createdAt))
      .limit(12),
  ]);

  // Bangun 7 bucket harian (label + series) supaya kontinu walau hari kosong
  const days: { key: string; label: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(startToday.getTime() - i * 86_400_000);
    days.push({
      key: ymd(d),
      label: d.toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
    });
  }
  const orderMap = new Map(ordersByDay.map((r) => [String(r.d), Number(r.c)]));
  const userMap = new Map(usersByDay.map((r) => [String(r.d), Number(r.c)]));
  const revMap = new Map(revByDay.map((r) => [String(r.d), Number(r.rev)]));

  const revenueSeries = days.map((d) => revMap.get(d.key) ?? 0);
  const ordersSpark = days.map((d) => orderMap.get(d.key) ?? 0);
  const usersSpark = days.map((d) => userMap.get(d.key) ?? 0);
  const chartLabels = days.map((d) => d.label);

  const usersToday = Number(usersTodayRow[0]?.c ?? 0);
  const ordersToday = Number(ordersTodayRow[0]?.c ?? 0);
  const revenueToday = Number(revTodayRow[0]?.rev ?? 0);

  // Feed aktivitas gabungan (order/deposit/user/audit) — item terstruktur + link detail
  type FeedRaw = {
    kind: "order" | "deposit" | "user" | "audit";
    title: string;
    meta: string;
    status: string | null;
    href: string;
    at: Date;
  };
  const feedRaw: FeedRaw[] = [
    ...recentOrders.map((o) => {
      const ref = o.oid && String(o.oid).trim() ? String(o.oid) : String(o.id);
      return {
        kind: "order" as const,
        title: `Order #${ref}`,
        meta: `${o.service || "Layanan"}${o.user ? ` · @${o.user}` : ""} · ${rp(Number(o.price))}`,
        status: o.status,
        href: `/admin/orders?q=${o.id}`,
        at: new Date(o.createdAt),
      };
    }),
    ...recentDeposits.map((d) => ({
      kind: "deposit" as const,
      title: `Deposit ${rp(Number(d.amount))}`,
      meta: `${d.method} · user #${d.userId}`,
      status: d.status,
      href: `/admin/deposits?q=${d.id}`,
      at: new Date(d.createdAt),
    })),
    ...recentUsers.map((u) => ({
      kind: "user" as const,
      title: `@${u.username}`,
      meta: `User baru bergabung · ${u.level}`,
      status: null,
      href: `/admin/users?q=${encodeURIComponent(u.username)}`,
      at: new Date(u.createdAt),
    })),
    ...recentAudit.map((a) => ({
      kind: "audit" as const,
      title: `${a.action}`,
      meta: `${a.entity}${a.entityId ? ` #${a.entityId}` : ""}`,
      status: null,
      href: `/admin/audit`,
      at: new Date(a.createdAt),
    })),
  ];
  const feed = feedRaw
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 30)
    .map((f) => ({
      kind: f.kind,
      title: f.title,
      meta: f.meta,
      status: f.status,
      href: f.href,
      at: f.at.toISOString(),
    }));

  const mine = lastMineRow[0];

  return {
    metrics: {
      users: {
        today: usersToday,
        delta: pct(usersToday, Number(usersYestRow[0]?.c ?? 0)),
        total: Number(userTotals[0]?.users ?? 0),
        spark: usersSpark,
      },
      orders: {
        today: ordersToday,
        delta: pct(ordersToday, Number(ordersYestRow[0]?.c ?? 0)),
        revenueToday,
        spark: ordersSpark,
      },
      depositPending: {
        count: Number(depPendingRow[0]?.c ?? 0),
        amount: Number(depPendingRow[0]?.amt ?? 0),
      },
      revenue: {
        today: revenueToday,
        delta: pct(revenueToday, Number(revYestRow[0]?.rev ?? 0)),
        spark: revenueSeries,
      },
      totalBalance: Number(userTotals[0]?.balance ?? 0),
    },
    chart: { labels: chartLabels, revenue: revenueSeries },
    queue: {
      sync: syncLast[0]
        ? {
            status: syncLast[0].status,
            fetched: Number(syncLast[0].fetched),
            changed: Number(syncLast[0].changed),
            at: new Date(syncLast[0].createdAt).toISOString(),
          }
        : null,
      polling: Number(pollingRow[0]?.c ?? 0),
      depth: Number(queueDepthRow[0]?.c ?? 0),
    },
    lastMine: mine
      ? {
          action: mine.action,
          entity: mine.entity,
          entityId: mine.entityId,
          at: new Date(mine.createdAt).toISOString(),
        }
      : null,
    feed,
  };
};
