import { db } from "@socio/db";
import { orders, deposits, categories, promotionBanners, services } from "@socio/db/schema";
import { eq, desc, and, gte, sql, lte, or, isNull, asc, inArray } from "drizzle-orm";
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
          serviceId: orders.serviceId,
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

  // Pesan Cepat — layanan yang paling sering di-order user (repeat flow).
  // Legacy orders.service_id menyimpan provider service id lama (repo services
  // pernah di-reimport) jadi join langsung sering miss. Strategi resolve nomor 2:
  // prefix nama layanan ("Instagram Likes [..." → "Instagram Likes") ke catalog aktif.
  const repeatRows = await db
    .select({
      psid: orders.serviceId,
      serviceName: sql<string>`max(${orders.serviceName})`,
      count: sql<number>`count(*)`,
      lastLink: sql<string>`max(${orders.data})`,
    })
    .from(orders)
    .where(and(eq(orders.userId, userId), sql`${orders.serviceId} > 0`))
    .groupBy(orders.serviceId)
    .orderBy(desc(sql`count(*)`), desc(sql`max(${orders.createdAt})`))
    .limit(8);

  let quickOrders: Array<{
    serviceId: number;
    serviceName: string;
    times: number;
    lastLink: string | null;
  }> = [];
  if (repeatRows.length) {
    const psids = [...new Set(repeatRows.map((r) => Math.round(Number(r.psid))))].filter(
      (n) => n > 0,
    );
    const svcRows = psids.length
      ? await db
          .select({ providerServiceId: services.providerServiceId, id: services.id })
          .from(services)
          .where(and(eq(services.status, 1), inArray(services.providerServiceId, psids)))
      : [];
    const byPsid = new Map(svcRows.map((s) => [s.providerServiceId, s.id]));

    // Prefix-based fallback — 1 query OR-conditioned untuk semua prefix (bukan N query
    // dalam loop: dashboard high-traffic, round-trip tambahan per load mahal).
    const prefixes = [
      ...new Set(
        repeatRows
          .map((r) => (r.serviceName.split("[")[0] ?? "").replace(/[^a-zA-Z\s]/g, "").trim())
          .filter(Boolean),
      ),
    ].slice(0, 8);
    const byPrefix = new Map<string, number>();
    if (prefixes.length) {
      const conditions = prefixes.map((p) => sql`${services.serviceName} LIKE CONCAT(${p}, '%')`);
      const candidates = await db
        .select({ id: services.id, price: services.price, name: services.serviceName })
        .from(services)
        .where(and(eq(services.status, 1), sql`(${sql.join(conditions, sql` OR `)})`))
        .orderBy(asc(services.price))
        .limit(200);
      // Pilih termurah per prefix (sama behavior dengan ORDER BY price LIMIT 1 per prefix).
      const seenPrefix = new Set<string>();
      for (const c of candidates) {
        const p = prefixes.find((px) => c.name.toLowerCase().startsWith(px.toLowerCase()));
        if (p && !seenPrefix.has(p) && byPrefix.size < 4) {
          byPrefix.set(p, c.id);
          seenPrefix.add(p);
        }
        if (byPrefix.size >= 4) break;
      }
    }

    const seen = new Set<number>();
    quickOrders = repeatRows
      .map((r) => {
        const raw = Math.round(Number(r.psid));
        const prefix = (r.serviceName.split("[")[0] ?? "").replace(/[^a-zA-Z\s]/g, "").trim();
        const sid = byPsid.get(raw) ?? byPrefix.get(prefix) ?? 0;
        return {
          serviceId: sid,
          serviceName: r.serviceName,
          times: Number(r.count),
          lastLink: r.lastLink || null,
        };
      })
      .filter((r) => r.serviceId > 0 && !seen.has(r.serviceId) && seen.add(r.serviceId))
      .slice(0, 4);
  }

  // Banner promo — prioritas: tabel CMS (position=dashboard, aktif, dalam jadwal)
  // → fallback admin setting JSON `dashboard_banners` → fallback dummy.
  let banners: Banner[] = DUMMY_BANNERS;
  try {
    const now = new Date();
    const cmsRows = await db
      .select()
      .from(promotionBanners)
      .where(
        and(
          eq(promotionBanners.position, "dashboard"),
          eq(promotionBanners.isActive, 1),
          or(isNull(promotionBanners.startAt), lte(promotionBanners.startAt, now)),
          or(isNull(promotionBanners.endAt), gte(promotionBanners.endAt, now)),
        ),
      )
      .orderBy(asc(promotionBanners.sortOrder), desc(promotionBanners.id))
      .limit(5);
    if (cmsRows.length) {
      banners = cmsRows.map((b) => ({
        title: b.title,
        subtitle: b.subtitle || undefined,
        href: b.linkUrl || undefined,
        img: b.imageUrl || undefined,
        gradient: "from-primary-600 via-primary-700 to-accent-600",
      }));
    } else {
      const raw = await getSetting("dashboard_banners");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) banners = parsed;
      }
    }
  } catch {
    banners = DUMMY_BANNERS;
  }

  // Attention: orders Error/Partial/Canceled terbaru
  const attentionRows = await db
    .select({ id: orders.id, serviceName: orders.serviceName, status: orders.status })
    .from(orders)
    .where(
      and(
        eq(orders.userId, userId),
        sql`lower(${orders.status}) in ('error','canceled','partial')`,
      ),
    )
    .orderBy(desc(orders.createdAt))
    .limit(3);
  const attention =
    attentionRows.length > 0
      ? [{ count: attentionRows.length, sample: attentionRows[0].serviceName.split("[")[0].trim() }]
      : [];

  // Nudge: saldo tipis vs harga termurah quickOrders (atau 10k)
  let nudge: { balance: number; reason: string } | null = null;
  const bal = Number((locals.user as any)?.balance ?? 0);
  const cheap = quickOrders.length
    ? Math.min(
        ...(await db
          .select({ price: services.price })
          .from(services)
          .where(
            inArray(
              services.id,
              quickOrders.map((q) => q.serviceId),
            ),
          )
          .then((r) => r.map((x) => Number(x.price)))),
      )
    : 0;
  const threshold = cheap ? cheap : 10000;
  if (bal < threshold && bal < 50000) {
    nudge = {
      balance: bal,
      reason: `minimal ${threshold.toLocaleString("id-ID")}/1k — isi dulu yuk`,
    };
  }

  return {
    recent,
    banners,
    categories: catRows,
    activeOrders: Number(statActive[0]?.count ?? 0),
    quickOrders,
    attention,
    nudge,

    stats: {
      totalOrders: Number(statOrders[0]?.count ?? 0),
      totalSpent: Number(statOrders[0]?.spent ?? 0),
      totalDeposit: Number(statDeposit[0]?.total ?? 0),
      deltaOrders: delta(sum(curOrders), sum(prevOrders)),
      deltaSpent: delta(sum(curSpend), sum(prevSpend)),
      deltaDeposit: delta(sum(curDeposit), sum(prevDeposit)),
    },
    chart: {
      labels: labels14.slice(7),
      orders: curOrders,
      deposits: curDeposit,
      spend: curSpend,
    },
  };
};
