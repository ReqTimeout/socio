import { db } from "@socio/db";
import {
  orders,
  deposits,
  categories,
  promotionBanners,
  services,
  news,
  users,
  coupons,
} from "@socio/db/schema";
import { eq, desc, and, gte, gt, lt, sql, lte, or, isNull, asc, inArray } from "drizzle-orm";
import { fail } from "@sveltejs/kit";
import { getSetting } from "$lib/server/admin";
import { whitelabel, getResellerBonus } from "$lib/format";
import { getFirstDepositNudge } from "$lib/server/first-deposit";
import { orderableServiceSql, decorateCategoryRows } from "$lib/server/category-visibility";
import type { PageServerLoad, Actions } from "./$types";

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

const WIDGET_NEWS_MAX = 5;

/**
 * Widget "Update" supaya BERAGAM, bukan 5 berita terbaru mentah. Provider
 * (SMMturk) sering merepricing banyak layanan sekaligus, jadi 5 teratas bisa
 * seragam (mis. semua "Harga Turun"). Ambil SATU terbaru per jenis event dulu,
 * sisa slot diisi berita terbaru lain. Plus SATU per NAMA layanan: provider
 * menjual produk sama di bawah beberapa pid — tanpa ini dua baris identik
 * memakan 2 dari 5 slot. Signature = teks sebelum " — " (nama display),
 * case/whitespace-insensitive. Baris diasumsikan terurut createdAt DESC, id DESC.
 */
function pickDiverseNews<T extends { id: number; eventType: string | null; content?: string }>(
  rows: T[],
  max: number,
): T[] {
  const nameKey = (c?: string) =>
    (c ?? "").split(" — ")[0].toLowerCase().replace(/\s+/g, " ").trim();
  const chosen: T[] = [];
  const seenType = new Set<string>();
  const seenName = new Set<string>();
  const take = (r: T) => {
    chosen.push(r);
    const k = nameKey(r.content);
    if (k) seenName.add(k);
  };
  for (const r of rows) {
    const key = r.eventType ?? "other";
    if (seenType.has(key)) continue;
    if (seenName.has(nameKey(r.content))) continue;
    seenType.add(key);
    take(r);
    if (chosen.length >= max) break;
  }
  // Kurang dari max (jenis sedikit) → isi dengan berita terbaru lain yang belum masuk.
  if (chosen.length < max) {
    const ids = new Set(chosen.map((c) => c.id));
    for (const r of rows) {
      if (ids.has(r.id)) continue;
      if (seenName.has(nameKey(r.content))) continue;
      take(r);
      if (chosen.length >= max) break;
    }
  }
  return chosen;
}

export const load: PageServerLoad = async ({ locals }) => {
  const userId = Number(locals.user!.id);

  // Gate aktivasi reseller: level Reseller yang belum verify=Yes WAJIB
  // menyelesaikan pembayaran aktivasi dulu (banner dashboard + blokir order).
  // Login tetap boleh (baca instruksi, buat tiket) — yang diblokir ordernya.
  let activation: {
    required: boolean;
    hasPending: boolean;
    amount: number;
    bonus: number;
    expireAt: string | null;
    leftText: string | null;
  } | null = null;
  if ((locals.user as any)?.level === "Reseller") {
    // Single-source getter (env SOCIO_RESELLER_BONUS) — angka sama dengan
    // invoice aktivasi + email WP6.
    const bonus = getResellerBonus();
    try {
      const [ru] = await db
        .select({ resellerActivated: users.resellerActivated })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      if (!ru || ru.resellerActivated !== 1) {
        const [pend] = await db
          .select({ id: deposits.id, amount: deposits.amount, expire: deposits.expire })
          .from(deposits)
          .where(
            and(
              eq(deposits.userId, userId),
              eq(deposits.untukApa, "reseller"),
              eq(deposits.status, "Pending"),
            ),
          )
          .orderBy(desc(deposits.id))
          .limit(1);
        let hasPending = false;
        let amount = 0;
        let expireAt: string | null = null;
        let leftText: string | null = null;
        if (pend && new Date(pend.expire).getTime() > Date.now()) {
          hasPending = true;
          amount = Number(pend.amount);
          expireAt = new Date(pend.expire).toISOString();
          const mins = Math.max(
            1,
            Math.round((new Date(pend.expire).getTime() - Date.now()) / 60000),
          );
          leftText =
            mins >= 1440
              ? `${Math.floor(mins / 1440)} hari`
              : mins >= 60
                ? `${Math.floor(mins / 60)} jam ${mins % 60} mnt`
                : `${mins} menit`;
        }
        activation = { required: true, hasPending, amount, bonus, expireAt, leftText };
      }
    } catch {
      activation = {
        required: true,
        hasPending: false,
        amount: 0,
        bonus,
        expireAt: null,
        leftText: null,
      };
    }
  }

  // Jendela 14 hari: 7 hari untuk chart + 7 hari sebelumnya untuk delta WoW.
  const start = new Date();
  start.setDate(start.getDate() - 13);
  start.setHours(0, 0, 0, 0);

  const [
    recent,
    statOrders,
    statDeposit,
    orderSeries,
    depositSeries,
    statActive,
    recentNews,
    announcements,
  ] = await Promise.all([
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

    // Pesanan yang benar-benar sedang berjalan (untuk copy dinamis di greeting).
    // 'partial' TIDAK termasuk — itu status final (sebagian selesai + sisanya
    // direfund), bukan sedang diproses. Data legacy 2023 ber-status partial
    // pernah bikin greeting menampilkan "604 pesanan berjalan" untuk user
    // yang tidak punya order aktif.
    db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(
        and(
          eq(orders.userId, userId),
          sql`lower(${orders.status}) in ('pending','proses','processing','in progress','refilling')`,
        ),
      ),

    // Pool kandidat widget "Update" — HANYA berita otomatis katalog (source='sync').
    // Pengumuman tulisan admin (source='manual') dipisah ke box "Pengumuman" di bawah:
    // dulu keduanya rebutan 5 slot yang sama, jadi pengumuman penting kalah jumlah vs
    // berita sync dan user tidak pernah melihatnya. Diambil >WIDGET_NEWS_MAX lalu
    // diragamkan pickDiverseNews() — bukan 5 mentah, karena satu jenis event bisa
    // mendominasi dan membuat feed seragam.
    db
      .select({
        id: news.id,
        kategori: news.kategori,
        content: news.content,
        eventType: news.eventType,
        serviceId: news.serviceId,
        source: news.source,
        createdAt: news.createdAt,
      })
      .from(news)
      .where(
        and(
          eq(news.isHidden, 0),
          eq(news.source, "sync"),
          sql`${news.createdAt} > DATE_SUB(NOW(), INTERVAL 14 DAY)`,
        ),
      )
      .orderBy(desc(news.createdAt), desc(news.id))
      .limit(40),

    // Box "Pengumuman" — berita yang admin tulis di /admin/news (source='manual'),
    // terbaru dulu. Klik → popup (bukan navigate) supaya user tidak kehilangan konteks
    // dashboard. 4 baris cukup; sisanya di /berita?src=manual.
    db
      .select({
        id: news.id,
        title: news.title,
        kategori: news.kategori,
        content: news.content,
        createdAt: news.createdAt,
      })
      .from(news)
      .where(and(eq(news.isHidden, 0), eq(news.source, "manual")))
      .orderBy(desc(news.createdAt), desc(news.id))
      .limit(4),
  ]);

  // Fallback widget "Update": kalau tak ada berita sync <=14 hari (Service Sync
  // belum memproduksi event), tampil berita sync terbaru secara umum supaya widget
  // tidak pernah kosong — tetap sync-only, pengumuman manual tidak masuk sini.
  // Ragamkan: satu terbaru per jenis event, sisa diisi berita terbaru lainnya.
  let newsFeed = pickDiverseNews(recentNews, WIDGET_NEWS_MAX);
  if (newsFeed.length === 0) {
    const pool = await db
      .select({
        id: news.id,
        kategori: news.kategori,
        content: news.content,
        eventType: news.eventType,
        serviceId: news.serviceId,
        source: news.source,
        createdAt: news.createdAt,
      })
      .from(news)
      .where(and(eq(news.isHidden, 0), eq(news.source, "sync")))
      .orderBy(desc(news.createdAt), desc(news.id))
      .limit(20);
    newsFeed = pickDiverseNews(pool, WIDGET_NEWS_MAX);
  }

  // Pengumuman manual yang disembunyikan admin (is_hidden=1) sudah terfilter di query;
  // jangan diragamkan — user memang harus melihat seluruh pengumuman terbaru.

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

  // Kategori utk dashboard: TIDAK ADA yang dihapus/difilter habis (kontrak owner 9 Nov
  // 2026: yang mati cukup diLABELI `disabled`, karena provider bisa mengaktifkan ulang
  // produknya kapan saja). Predikat "layak order" dipakai di ON-clause LEFT JOIN, jadi
  // kategori kosong tetap ikut dengan active=0, dan COALESCE(...,'1970-01-01') DESC
  // menaruh yang mati di bawah secara deterministik (query lama `LIMIT 12` tanpa
  // ORDER BY = urutan acak tiap eksekusi).
  // Nama whitelabel: nama mentah categories berisi brand hulu ("SMMTURK ...") — dulu
  // payload ini bocor mentah walau tak dipakai UI; sekarang dirapikan sekaligus.
  const catRows = decorateCategoryRows(
    await db
      .select({
        id: categories.id,
        name: categories.name,
        active: sql<number>`COUNT(${services.id})`,
        latestAt: sql<
          string | null
        >`MAX(GREATEST(COALESCE(${services.createdAt}, '1970-01-01'), COALESCE(${services.updatedAt}, '1970-01-01')))`,
      })
      .from(categories)
      .leftJoin(
        services,
        sql`${services.categoryId} = ${categories.id} AND ${orderableServiceSql()}`,
      )
      .groupBy(categories.id, categories.name)
      .orderBy(
        sql`COALESCE(MAX(GREATEST(COALESCE(${services.createdAt}, '1970-01-01'), COALESCE(${services.updatedAt}, '1970-01-01'))), '1970-01-01') DESC`,
        asc(categories.name),
      )
      .limit(12),
  ).map((c) => ({ ...c, name: whitelabel(c.name) }));

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

  // Kupon PUBLIK (kode global, tabel `coupons`) → strip tiket compact di bawah
  // SaldoHero. Ambil satu terbaik: aktif + belum tamat + kuota belum habis
  // (max_usage=0 = tanpa batas), urut diskon terbesar. Read-only, hemat 1 query,
  // dibungkus try/catch — kegagalan tidak boleh menjatuhkan dashboard.
  type PromoCoupon = {
    code: string;
    type: "percent" | "fixed";
    value: number;
    minOrder: number;
    hasExpiry: boolean;
    daysLeft: number;
  };
  let promoCoupon: PromoCoupon | null = null;
  try {
    const now = new Date();
    const rows = await db
      .select({
        code: coupons.code,
        type: coupons.type,
        value: coupons.value,
        minOrder: coupons.minOrder,
        expiresAt: coupons.expiresAt,
      })
      .from(coupons)
      .where(
        and(
          eq(coupons.active, "1"),
          or(isNull(coupons.expiresAt), gt(coupons.expiresAt, now)),
          or(eq(coupons.maxUsage, 0), lt(coupons.used, coupons.maxUsage)),
        ),
      )
      .orderBy(desc(coupons.value), asc(coupons.id))
      .limit(1);
    const r = rows[0];
    if (r) {
      promoCoupon = {
        code: r.code,
        type: r.type,
        value: Number(r.value),
        minOrder: Number(r.minOrder),
        hasExpiry: r.expiresAt != null,
        // Sisa hari (pembulatan ke atas, minimum 0) — countdown nyata dari expiresAt.
        daysLeft: r.expiresAt
          ? Math.max(0, Math.ceil((new Date(r.expiresAt).getTime() - now.getTime()) / 86_400_000))
          : 0,
      };
    }
  } catch {
    promoCoupon = null;
  }

  return {
    recent,
    banners,
    activation,
    promoCoupon,
    // WP6 L1: nudge deposit pertama — keputusan tampil di server (null bila
    // sudah pernah deposit / gate aktivasi reseller aktif).
    firstDeposit: await getFirstDepositNudge(userId, {
      totalDeposit: Number(statDeposit[0]?.total ?? 0),
      activationRequired: !!activation?.required,
    }),
    categories: catRows,
    activeOrders: Number(statActive[0]?.count ?? 0),
    quickOrders,
    newsFeed,
    announcements,

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

export const actions: Actions = {
  // Terbitkan ulang invoice aktivasi reseller (deposit lama expired/dibatalkan).
  // Maksimal 1 deposit aktivasi Pending per user.
  resendActivation: async ({ locals }) => {
    const userId = Number(locals.user!.id);
    if ((locals.user as any)?.level !== "Reseller") {
      return fail(403, { error: "Khusus akun reseller." });
    }
    const [ru] = await db
      .select({ resellerActivated: users.resellerActivated })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (ru?.resellerActivated === 1) {
      return fail(400, { error: "Akun reseller sudah aktif." });
    }
    const [pend] = await db
      .select({ id: deposits.id, expire: deposits.expire })
      .from(deposits)
      .where(
        and(
          eq(deposits.userId, userId),
          eq(deposits.untukApa, "reseller"),
          eq(deposits.status, "Pending"),
        ),
      )
      .orderBy(desc(deposits.id))
      .limit(1);
    if (pend && new Date(pend.expire).getTime() > Date.now()) {
      return fail(400, { error: "Invoice aktivasi masih aktif — cek email atau halaman saldo." });
    }
    try {
      const { issueResellerActivationInvoice } = await import("$lib/server/signup");
      const inv = await issueResellerActivationInvoice(userId);
      return { success: true, resent: true, amount: inv.amount };
    } catch (e) {
      console.error("[dashboard] resendActivation failed:", (e as Error)?.message);
      return fail(500, { error: "Gagal menerbitkan invoice. Coba lagi." });
    }
  },
};
