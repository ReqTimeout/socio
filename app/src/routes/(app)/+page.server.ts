import { db } from "@socio/db";
import { orders, deposits, categories } from "@socio/db/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { getSetting } from "$lib/server/admin";
import type { PageServerLoad } from "./$types";

// Banner promo dashboard. Admin bisa set JSON via adminSettings key `dashboard_banners`
// (array of { title, subtitle, cta, href, img, gradient, badge }). Kalau kosong → dummy.
type Banner = {
  title: string;
  subtitle?: string;
  cta?: string;
  href?: string;
  img?: string;
  gradient?: string;
  badge?: string;
};

const DUMMY_BANNERS: Banner[] = [
  {
    badge: "Promo",
    title: "Diskon 20% semua layanan Instagram",
    subtitle: "Gaskan followers & like hari ini, harga reseller termurah se-Indonesia.",
    cta: "Pesan sekarang",
    href: "/layanan?cat=1",
    gradient: "from-primary-600 via-primary-700 to-accent-600",
  },
  {
    badge: "Baru",
    title: "Top up saldo, bonus langsung masuk",
    subtitle: "Deposit via QRIS, e-wallet, & VA. Otomatis masuk dalam hitungan detik.",
    cta: "Top up saldo",
    href: "/saldo/top-up",
    gradient: "from-emerald-500 via-emerald-600 to-teal-600",
  },
  {
    badge: "Cuan",
    title: "Ajak teman, dapat komisi seumur hidup",
    subtitle: "Bagikan link affiliate-mu dan raih komisi tiap transaksi mereka.",
    cta: "Mulai affiliate",
    href: "/affiliate",
    gradient: "from-violet-600 via-primary-600 to-accent-500",
  },
];

export const load: PageServerLoad = async ({ locals }) => {
  const userId = Number(locals.user!.id);

  // Jendela 14 hari: 7 hari untuk chart + 7 hari sebelumnya untuk delta WoW.
  const start = new Date();
  start.setDate(start.getDate() - 13);
  start.setHours(0, 0, 0, 0);

  const [recent, statOrders, statDeposit, orderSeries, depositSeries, statActive] =
    await Promise.all([
      db
        .select({
          id: orders.id,
          oid: orders.oid,
          serviceName: orders.serviceName,
          data: orders.data,
          quantity: orders.quantity,
          price: orders.price,
          status: orders.status,
          createdAt: orders.createdAt,
          remains: orders.remains,
        })
        .from(orders)
        .where(eq(orders.userId, userId))
        .orderBy(desc(orders.createdAt))
        .limit(5),

      // Total pesanan + total belanja user (port stat card index-edit.php)
      db
        .select({
          count: sql<number>`count(*)`,
          spent: sql<number>`coalesce(sum(${orders.price}), 0)`,
        })
        .from(orders)
        .where(eq(orders.userId, userId)),

      // Total deposit sukses user
      db
        .select({ total: sql<number>`coalesce(sum(${deposits.amount}), 0)` })
        .from(deposits)
        .where(and(eq(deposits.userId, userId), eq(deposits.status, "Success"))),

      // Serie 14 hari: jumlah pesanan + belanja per hari
      db
        .select({
          day: sql<string>`date(${orders.createdAt})`,
          count: sql<number>`count(*)`,
          spent: sql<number>`coalesce(sum(${orders.price}), 0)`,
        })
        .from(orders)
        .where(and(eq(orders.userId, userId), gte(orders.createdAt, start)))
        .groupBy(sql`date(${orders.createdAt})`),

      // Serie 14 hari: total deposit sukses per hari
      db
        .select({
          day: sql<string>`date(${deposits.createdAt})`,
          total: sql<number>`coalesce(sum(${deposits.amount}), 0)`,
        })
        .from(deposits)
        .where(
          and(
            eq(deposits.userId, userId),
            eq(deposits.status, "Success"),
            gte(deposits.createdAt, start),
          ),
        )
        .groupBy(sql`date(${deposits.createdAt})`),

      // Pesanan yang masih berjalan (untuk copy dinamis di greeting)
      db
        .select({ count: sql<number>`count(*)` })
        .from(orders)
        .where(
          and(
            eq(orders.userId, userId),
            sql`lower(${orders.status}) in ('pending','proses','processing','in progress','partial','refilling')`,
          ),
        ),
    ]);

  // Isi 14 hari (0=paling lama, 13=hari ini) supaya chart selalu penuh.
  const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  // Key tanggal lokal (bukan toISOString/UTC — hindari geser hari di WIB)
  const localKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const labels14: string[] = [];
  const orders14: number[] = [];
  const spend14: number[] = [];
  const deposit14: number[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = localKey(d);
    labels14.push(dayNames[d.getDay()]);
    const or = orderSeries.find((r) => String(r.day).slice(0, 10) === key);
    orders14.push(Number(or?.count ?? 0));
    spend14.push(Number(or?.spent ?? 0));
    deposit14.push(
      Number(depositSeries.find((r) => String(r.day).slice(0, 10) === key)?.total ?? 0),
    );
  }

  // 7 hari terakhir (chart + sparkline) & 7 hari sebelumnya (baseline delta)
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
  const delta = (cur: number, prev: number) =>
    prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 1000) / 10;

  const curOrders = orders14.slice(7);
  const prevOrders = orders14.slice(0, 7);
  const curSpend = spend14.slice(7);
  const prevSpend = spend14.slice(0, 7);
  const curDeposit = deposit14.slice(7);
  const prevDeposit = deposit14.slice(0, 7);

  const catRows = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .limit(12);

  // Banner promo — dari admin setting, fallback dummy
  let banners: Banner[] = DUMMY_BANNERS;
  try {
    const raw = await getSetting("dashboard_banners");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) banners = parsed;
    }
  } catch {
    banners = DUMMY_BANNERS;
  }

  return {
    recent,
    banners,
    categories: catRows,
    activeOrders: Number(statActive[0]?.count ?? 0),

    stats: {
      totalOrders: Number(statOrders[0]?.count ?? 0),
      totalSpent: Number(statOrders[0]?.spent ?? 0),
      totalDeposit: Number(statDeposit[0]?.total ?? 0),
      deltaOrders: delta(sum(curOrders), sum(prevOrders)),
      deltaSpent: delta(sum(curSpend), sum(prevSpend)),
      deltaDeposit: delta(sum(curDeposit), sum(prevDeposit)),
    },
    // Chart utama + sparkline per kartu (semuanya 7 hari terakhir)
    chart: {
      labels: labels14.slice(7),
      orders: curOrders,
      deposits: curDeposit,
      spend: curSpend,
    },
  };
};
