import { db } from "@socio/db";
import { affiliate, users, balanceLogs } from "@socio/db/schema";
import { sql, eq, and } from "drizzle-orm";
import { redirect, fail } from "@sveltejs/kit";
import { logAudit, assertAdmin, assertAdminRate } from "$lib/server/admin";
import type { Actions, PageServerLoad } from "./$types";

const LIMIT = 50;

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user) throw redirect(303, "/login");
  if (locals.user.level !== "Admin") throw redirect(303, "/");

  const q = String(url.searchParams.get("q") ?? "").trim();
  const status = String(url.searchParams.get("status") ?? "").trim(); // Pending | Requested | Paid | Withdraw
  const page = Math.max(1, Number(url.searchParams.get("p") ?? 1));

  const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value));

  const [kpiRows, topRows, queueRows] = await Promise.all([
    // KPI: total downline (users yang punya uplink), komisi lifetime,
    // komisi tersedia (Pending), antrian penarikan (Requested), sudah cair
    db.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM users WHERE up_link <> '' AND up_link IS NOT NULL) AS downlines,
        COALESCE(SUM(a.balance), 0) AS lifetime_commission,
        COALESCE(SUM(CASE WHEN a.status = 'Pending' THEN a.balance ELSE 0 END), 0) AS pending_commission,
        COALESCE(SUM(CASE WHEN a.status = 'Requested' THEN a.balance ELSE 0 END), 0) AS requested,
        COALESCE(SUM(CASE WHEN a.status IN ('Withdraw','Paid') THEN a.balance ELSE 0 END), 0) AS withdrawn
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
    // Antrian penarikan menunggu approval admin (M3 Task #3.D)
    db.execute(sql`
      SELECT u.id AS user_id, u.username,
        COUNT(*) AS entries,
        COALESCE(SUM(a.balance), 0) AS total,
        MIN(a.created_at) AS requested_since
      FROM affiliate a
      JOIN users u ON u.id = a.user_id
      WHERE a.status = 'Requested'
      GROUP BY u.id, u.username
      ORDER BY requested_since ASC
      LIMIT 50
    `),
  ]);

  const k = (kpiRows as any)[0]?.[0] ?? {};
  const kpi = {
    downlines: Number(k.downlines ?? 0),
    lifetimeCommission: Number(k.lifetime_commission ?? 0),
    pendingCommission: Number(k.pending_commission ?? 0),
    requested: Number(k.requested ?? 0),
    withdrawn: Number(k.withdrawn ?? 0),
  };

  const topReferrers = plain((topRows as any)[0] ?? []).map((r: any) => ({
    referrerId: Number(r.referrer_id),
    referrer: String(r.referrer ?? `user#${r.referrer_id}`),
    downlineCount: Number(r.downline_count ?? 0),
    commission: Number(r.commission ?? 0),
  }));

  // Antrian penarikan (grouped per user) — admin approve/reject di sini
  const queue = plain((queueRows as any)[0] ?? []).map((r: any) => ({
    userId: Number(r.user_id),
    username: String(r.username ?? `user#${r.user_id}`),
    entries: Number(r.entries ?? 0),
    total: Number(r.total ?? 0),
    requestedSince: r.requested_since,
  }));

  // Tabel full: komisi affiliate join downline & upline (server-side filter)
  const frags: any[] = [];
  if (["Pending", "Requested", "Paid", "Withdraw"].includes(status))
    frags.push(sql`a.status = ${status}`);
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
    queue,
  };
};

export const actions: Actions = {
  /**
   * Approve withdrawal: kredit saldo user + affiliate Requested → Paid.
   * Single admin approval (keputusan user M3 §8.3 — tanpa dual control).
   * A-09: SELECT FOR UPDATE di dalam transaksi untuk anti double-credit
   * konkuren. Cek affectedRows setelah UPDATE — kalau 0 = sudah di-approve
   * admin lain sebelumnya, return 409 idempotent.
   */
  approve: async ({ request, locals }) => {
    assertAdmin(locals);
    await assertAdminRate("affiliate-approve", (locals as any).ip ?? "0.0.0.0", 10, 60);
    const form = await request.formData();
    const userId = Number(form.get("userId"));
    if (!Number.isFinite(userId) || userId <= 0) return fail(400, { error: "ID user wajib." });

    let total = 0;
    try {
      // Transaksi serialize-able: lock baris user + affiliate, baca total,
      // kredit, flip status, insert log. SELECT FOR UPDATE biar 2 admin gak
      // bisa approve amount yang sama (MySQL InnoDB default isolation).
      // P0-audit fix: return normal dari callback — throw apa pun di dalam
      // db.transaction() = ROLLBACK (drizzle mysql2), bukan commit.
      await db.transaction(async (tx) => {
        // Lock baris user dulu supaya deposit/order paralel gak ganggu.
        await tx.execute(sql`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`);
        // Hitung Requested total (in-session lock aman).
        const [sumRow] = await tx
          .select({ total: sql<number>`COALESCE(SUM(${affiliate.balance}), 0)` })
          .from(affiliate)
          .where(and(eq(affiliate.userId, userId), eq(affiliate.status, "Requested")));
        total = Number(sumRow?.total ?? 0);
        if (total <= 0) {
          // No-op: jangan terus transaksi
          throw new Error("NO_PENDING");
        }

        // Flip Requested → Paid sebelum kredit; affectedRows == guard idempoten.
        // P0-audit fix: tx.execute() return tuple [ResultSetHeader, fields]
        // (drizzle mysql2) — affectedRows ada di elemen [0], bukan di res langsung.
        const flip = await tx.execute(sql`
          UPDATE affiliate SET status = 'Paid'
          WHERE user_id = ${userId} AND status = 'Requested'
        `);
        const flipRes = (Array.isArray(flip) ? flip[0] : flip) as { affectedRows?: number };
        const affected = Number(flipRes?.affectedRows ?? 0);
        if (!affected) {
          throw new Error("ALREADY_PROCESSED");
        }

        await tx
          .update(users)
          .set({ balance: sql`${users.balance} + ${total}` })
          .where(eq(users.id, userId));
        await tx.insert(balanceLogs).values({
          userId,
          type: "wd",
          amount: total,
          note: `Withdraw affiliate commission disetujui admin #${locals.user!.id}`,
          createdAt: new Date(),
        });
      });
    } catch (e: any) {
      if (e?.message === "NO_PENDING") {
        return fail(400, { error: "Tidak ada penarikan menunggu." });
      }
      if (e?.message === "ALREADY_PROCESSED") {
        return fail(409, {
          error: "Withdrawal sudah diproses admin lain. Refresh halaman.",
        });
      }
      console.error("[affiliate] approve failed", (e as Error)?.message);
      return fail(500, { error: "Gagal approve withdrawal. Coba lagi." });
    }

    // Audit di luar transaksi — kalau gagal, sudah committed; lebih baik
    // ada withdrawal sukses tanpa audit entry (sangat jarang).
    await logAudit({
      adminId: Number(locals.user!.id),
      action: "approve_affiliate_withdrawal",
      entity: "user",
      entityId: userId,
      detail: { amount: total },
      ip: (locals as any).ip,
    });
    const [u] = await db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return {
      success: `Withdrawal ${u?.username ?? userId} disetujui (+${total.toLocaleString("id-ID")}).`,
    };
  },

  /** Reject withdrawal: Requested → Pending (komisi balik, saldo tidak disentuh). */
  reject: async ({ request, locals }) => {
    assertAdmin(locals);
    await assertAdminRate("affiliate-reject", (locals as any).ip ?? "0.0.0.0", 10, 60);
    const form = await request.formData();
    const userId = Number(form.get("userId"));
    if (!Number.isFinite(userId) || userId <= 0) return fail(400, { error: "ID user wajib." });

    const [sumRow] = await db
      .select({ total: sql<number>`COALESCE(SUM(${affiliate.balance}), 0)` })
      .from(affiliate)
      .where(and(eq(affiliate.userId, userId), eq(affiliate.status, "Requested")));
    const total = Number(sumRow?.total ?? 0);
    if (total <= 0) return fail(400, { error: "Tidak ada penarikan menunggu." });

    await db
      .update(affiliate)
      .set({ status: "Pending" })
      .where(and(eq(affiliate.userId, userId), eq(affiliate.status, "Requested")));

    const [u] = await db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    await logAudit({
      adminId: Number(locals.user!.id),
      action: "reject_affiliate_withdrawal",
      entity: "user",
      entityId: userId,
      detail: { amount: total, note: "commission reverted to Pending" },
      ip: (locals as any).ip,
    });
    return { success: `Withdrawal ${u?.username ?? userId} ditolak (komisi balik Pending).` };
  },
};
