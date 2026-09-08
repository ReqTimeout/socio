import { db } from "@socio/db";
import { users, orders, deposits, auditLog, jobQueue, providerSyncLog } from "@socio/db/schema";
import { sql, desc, gte, lt, and, eq, inArray } from "drizzle-orm";
import type { RequestHandler } from "./$types";

const ACTIVE_ORDER_STATUS = ["Pending", "Processing", "In progress", "Refilling"] as const;
const cache: { sig: string; payload: any; at: number } = { sig: "", payload: null, at: 0 };

async function fetchDashboard() {
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
    recentOrders,
    recentDeposits,
    recentUsers,
    recentAudit,
  ] = await Promise.all([
    db.select({ users: sql<number>`count(*)`, balance: sql<number>`COALESCE(SUM(${users.balance}),0)` }).from(users),
    db.select({ c: sql<number>`count(*)` }).from(users).where(gte(users.createdAt, startToday)),
    db.select({ c: sql<number>`count(*)` }).from(users).where(and(gte(users.createdAt, startYest), lt(users.createdAt, startToday))),
    db.select({ c: sql<number>`count(*)`, rev: sql<number>`COALESCE(SUM(${orders.price}),0)` }).from(orders).where(gte(orders.createdAt, startToday)),
    db.select({ c: sql<number>`count(*)` }).from(orders).where(and(gte(orders.createdAt, startYest), lt(orders.createdAt, startToday))),
    db.select({ c: sql<number>`count(*)`, amt: sql<number>`COALESCE(SUM(${deposits.amount}),0)` }).from(deposits).where(eq(deposits.status, "Pending")),
    db.select({ rev: sql<number>`COALESCE(SUM(${orders.price}),0)` }).from(orders).where(gte(orders.createdAt, startToday)),
    db.select({ rev: sql<number>`COALESCE(SUM(${orders.price}),0)` }).from(orders).where(and(gte(orders.createdAt, startYest), lt(orders.createdAt, startToday))),
    db.select({ d: sql<string>`DATE(${orders.createdAt})`, c: sql<number>`count(*)` }).from(orders).where(gte(orders.createdAt, start7)).groupBy(sql`DATE(${orders.createdAt})`),
    db.select({ d: sql<string>`DATE(${users.createdAt})`, c: sql<number>`count(*)` }).from(users).where(gte(users.createdAt, start7)).groupBy(sql`DATE(${users.createdAt})`),
    db.select({ d: sql<string>`DATE(${orders.createdAt})`, rev: sql<number>`COALESCE(SUM(${orders.price}),0)` }).from(orders).where(gte(orders.createdAt, start7)).groupBy(sql`DATE(${orders.createdAt})`),
    db.select({ status: providerSyncLog.status, fetched: providerSyncLog.fetched, changed: providerSyncLog.changed, createdAt: providerSyncLog.createdAt }).from(providerSyncLog).orderBy(desc(providerSyncLog.createdAt)).limit(1),
    db.select({ c: sql<number>`count(*)` }).from(jobQueue).where(eq(jobQueue.status, "pending")),
    db.select({ c: sql<number>`count(*)` }).from(orders).where(inArray(orders.status, [...ACTIVE_ORDER_STATUS])),
    db.select({ id: orders.id, oid: orders.oid, user: orders.user, service: orders.serviceName, status: orders.status, price: orders.price, createdAt: orders.createdAt }).from(orders).orderBy(desc(orders.createdAt)).limit(12),
    db.select({ id: deposits.id, userId: deposits.userId, amount: deposits.amount, method: deposits.methodName, status: deposits.status, createdAt: deposits.createdAt }).from(deposits).orderBy(desc(deposits.createdAt)).limit(12),
    db.select({ id: users.id, username: users.username, level: users.level, createdAt: users.createdAt }).from(users).orderBy(desc(users.createdAt)).limit(12),
    db.select({ id: auditLog.id, action: auditLog.action, entity: auditLog.entity, entityId: auditLog.entityId, createdAt: auditLog.createdAt }).from(auditLog).orderBy(desc(auditLog.createdAt)).limit(12),
  ]);

  function ymd(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
  function pct(a: number, b: number) { if (b <= 0) return a > 0 ? 100 : undefined; return ((a - b) / b) * 100; }
  function rp(n: number) { return "Rp" + Math.round(n).toLocaleString("id-ID"); }
  const days: {key:string; label:string}[] = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(startToday.getTime() - i*86_400_000); days.push({ key: ymd(d), label: d.toLocaleDateString("id-ID", { day: "numeric", month: "short" }) }); }

  type FeedRaw = { kind: "order" | "deposit" | "user" | "audit"; title: string; meta: string; status: string | null; href: string; at: Date };
  const feedRaw: FeedRaw[] = [
    ...recentOrders.map((o: any) => ({ kind: "order" as const, title: `Order #${o.oid && String(o.oid).trim() ? o.oid : o.id}`, meta: `${o.service || "Layanan"}${o.user ? ` · @${o.user}` : ""} · ${rp(Number(o.price))}`, status: o.status, href: `/admin/orders?q=${o.id}`, at: new Date(o.createdAt) })),
    ...recentDeposits.map((d: any) => ({ kind: "deposit" as const, title: `Deposit ${rp(Number(d.amount))}`, meta: `${d.method} · user #${d.userId}`, status: d.status, href: `/admin/deposits?q=${d.id}`, at: new Date(d.createdAt) })),
    ...recentUsers.map((u: any) => ({ kind: "user" as const, title: `@${u.username}`, meta: `User baru bergabung · ${u.level}`, status: null, href: `/admin/users?q=${encodeURIComponent(u.username)}`, at: new Date(u.createdAt) })),
    ...recentAudit.map((a: any) => ({ kind: "audit" as const, title: `${a.action}`, meta: `${a.entity}${a.entityId ? ` #${a.entityId}` : ""}`, status: null, href: `/admin/audit`, at: new Date(a.createdAt) })),
  ];
  const feed = feedRaw
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 30)
    .map((f: any, i: number) => ({ id: `${f.kind}-${f.title}-${f.at.getTime()}-${i}`, kind: f.kind, title: f.title, meta: f.meta, status: f.status, href: f.href, at: f.at.toISOString() }));

  const orderMap = new Map(ordersByDay.map((r: any) => [String(r.d), Number(r.c)]));
  const userMap = new Map(usersByDay.map((r: any) => [String(r.d), Number(r.c)]));
  const revMap = new Map(revByDay.map((r: any) => [String(r.d), Number(r.rev)]));
  const revenueSeries = days.map((d) => revMap.get(d.key) ?? 0);
  const usersToday = Number((usersTodayRow as any)[0]?.c ?? 0);

  return {
    metrics: {
      users: { today: usersToday, delta: pct(usersToday, Number((usersYestRow as any)[0]?.c ?? 0)), total: Number((userTotals as any)[0]?.users ?? 0), spark: days.map((d) => userMap.get(d.key) ?? 0) },
      orders: { today: Number((ordersTodayRow as any)[0]?.c ?? 0), delta: pct(Number((ordersTodayRow as any)[0]?.c ?? 0), Number((ordersYestRow as any)[0]?.c ?? 0)), revenueToday: Number((revTodayRow as any)[0]?.rev ?? 0), spark: days.map((d) => orderMap.get(d.key) ?? 0) },
      depositPending: { count: Number((depPendingRow as any)[0]?.c ?? 0), amount: Number((depPendingRow as any)[0]?.amt ?? 0) },
      revenue: { today: Number((revTodayRow as any)[0]?.rev ?? 0), delta: pct(Number((revTodayRow as any)[0]?.rev ?? 0), Number((revYestRow as any)[0]?.rev ?? 0)), spark: revenueSeries },
      totalBalance: Number((userTotals as any)[0]?.balance ?? 0),
    },
    chart: { labels: days.map((d) => d.label), revenue: revenueSeries },
    queue: {
      sync: syncLast[0] ? { status: syncLast[0].status, fetched: Number(syncLast[0].fetched), changed: Number(syncLast[0].changed), at: new Date(syncLast[0].createdAt).toISOString() } : null,
      polling: Number((pollingRow as any)[0]?.c ?? 0),
      depth: Number((queueDepthRow as any)[0]?.c ?? 0),
    },
    feed,
  };
}

export const GET: RequestHandler = async ({ locals, request }) => {
  if (!locals.user || locals.user.level !== "Admin") return new Response("Unauthorized", { status: 401 });

  let timer: ReturnType<typeof setInterval> | undefined;
  let hb: ReturnType<typeof setInterval> | undefined;
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const cleanup = () => {
        if (closed) return;
        closed = true;
        if (timer) clearInterval(timer);
        if (hb) clearInterval(hb);
        try { controller.close(); } catch {}
      };
      const send = (event: string, data: unknown) => {
        if (closed) return;
        try { controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)); } catch { cleanup(); }
      };

      request.signal.addEventListener("abort", cleanup);

      const tick = async () => {
        if (closed) return;
        try {
          const payload = await fetchDashboard();
          const sig = JSON.stringify(payload.feed.slice(0, 5).map((f: any) => f.id)) + payload.queue.depth + payload.metrics.revenue.today;
          if (sig !== cache.sig || Date.now() - cache.at > 30000) {
            cache.sig = sig; cache.payload = payload; cache.at = Date.now();
          }
          // Only send when sig changed or first tick
          if (sig !== (payload as any)._lastSig) send("dashboard", payload);
        } catch {}
      };

      send("ready", { ok: true });
      await tick();
      timer = setInterval(tick, 8000);
      hb = setInterval(() => {
        if (closed) return;
        try { controller.enqueue(enc.encode(": hb\n\n")); } catch { cleanup(); }
      }, 25000);
    },
    cancel() { closed = true; if (timer) clearInterval(timer); if (hb) clearInterval(hb); },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" },
  });
};
