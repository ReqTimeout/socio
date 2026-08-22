import { db } from "@socio/db";
import { sql } from "drizzle-orm";
import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

const LIMIT = 50;

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user) throw redirect(303, "/login");
  if (locals.user.level !== "Admin") throw redirect(303, "/");

  const q = String(url.searchParams.get("q") ?? "").trim();
  const status = String(url.searchParams.get("status") ?? "").trim(); // Pending | Withdraw
  const page = Math.max(1, Number(url.searchParams.get("p") ?? 1));

  const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value));

  const [kpiRows, topRows] = await Promise.all([
    // KPI: total downline (users yang punya uplink), komisi lifetime,
    // komisi belum ditarik (Pending), sudah ditarik (Withdraw)
    db.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM users WHERE up_link <> '' AND up_link IS NOT NULL) AS downlines,
        COALESCE(SUM(a.balance), 0) AS lifetime_commission,
        COALESCE(SUM(CASE WHEN a.status = 'Pending' THEN a.balance ELSE 0 END), 0) AS pending_commission,
        COALESCE(SUM(CASE WHEN a.status = 'Withdraw' THEN a.balance ELSE 0 END), 0) AS withdrawn
      FROM affiliate a
    `),
    // Top referrer: upline (user_affi) dengan komisi terbanyak
    db.execute(sql`
      SELECT a.user_affi AS referrer_id, u.username AS referrer,
        COUNT(*) AS downline_count,
        COALESCE(SUM(a.balance), 0) AS commission
      FROM affiliate a
      LEFT JOIN users u ON u.id = a.user_affi
      WHERE a.user_affi > 0
      GROUP BY a.user_affi, u.username
      ORDER BY commission DESC
      LIMIT 10
    `),
  ]);

  const k = (kpiRows as any)[0]?.[0] ?? {};
  const kpi = {
    downlines: Number(k.downlines ?? 0),
    lifetimeCommission: Number(k.lifetime_commission ?? 0),
    pendingCommission: Number(k.pending_commission ?? 0),
    withdrawn: Number(k.withdrawn ?? 0),
  };

  const topReferrers = plain((topRows as any)[0] ?? []).map((r: any) => ({
    referrerId: Number(r.referrer_id),
    referrer: String(r.referrer ?? `user#${r.referrer_id}`),
    downlineCount: Number(r.downline_count ?? 0),
    commission: Number(r.commission ?? 0),
  }));

  // Tabel full: komisi affiliate join downline & upline (server-side filter)
  const frags: any[] = [];
  if (status === "Pending" || status === "Withdraw") frags.push(sql`a.status = ${status}`);
  if (q) {
    const like = `%${q}%`;
    frags.push(sql`(du.username LIKE ${like} OR uu.username LIKE ${like})`);
  }
  const whereSql = frags.length ? sql`WHERE ${sql.join(frags, sql` AND `)}` : sql``;
  const offset = (page - 1) * LIMIT;

  const [rowsRes, countRes] = await Promise.all([
    db.execute(sql`
      SELECT a.id, a.balance, a.status, a.created_at,
        a.user_id AS downline_id, du.username AS downline,
        a.user_affi AS referrer_id, uu.username AS referrer
      FROM affiliate a
      LEFT JOIN users du ON du.id = a.user_id
      LEFT JOIN users uu ON uu.id = a.user_affi
      ${whereSql}
      ORDER BY a.created_at DESC
      LIMIT ${LIMIT} OFFSET ${offset}
    `),
    db.execute(sql`
      SELECT COUNT(*) AS total
      FROM affiliate a
      LEFT JOIN users du ON du.id = a.user_id
      LEFT JOIN users uu ON uu.id = a.user_affi
      ${whereSql}
    `),
  ]);

  const rows = plain((rowsRes as any)[0] ?? []).map((r: any) => ({
    id: Number(r.id),
    downlineId: Number(r.downline_id),
    downline: String(r.downline ?? `user#${r.downline_id}`),
    referrerId: Number(r.referrer_id),
    referrer: String(r.referrer ?? `user#${r.referrer_id}`),
    balance: Number(r.balance ?? 0),
    status: String(r.status),
    createdAt: r.created_at,
  }));
  const total = Number((countRes as any)[0]?.[0]?.total ?? 0);

  return {
    q,
    status,
    page,
    total,
    pages: Math.max(1, Math.ceil(total / LIMIT)),
    rows,
    kpi,
    topReferrers,
  };
};
