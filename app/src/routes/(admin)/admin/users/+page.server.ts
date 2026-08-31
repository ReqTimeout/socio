import { db } from "@socio/db";
import { users, balanceLogs } from "@socio/db/schema";
import { sql, eq, ne, and, desc } from "drizzle-orm";
import { redirect, fail } from "@sveltejs/kit";
import { logAudit, assertAdmin, assertAdminRate } from "$lib/server/admin";
import type { PageServerLoad, Actions } from "./$types";

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user) throw redirect(303, "/login");
  if (locals.user.level !== "Admin") throw redirect(303, "/");
  const q = String(url.searchParams.get("q") ?? "");
  const level = String(url.searchParams.get("level") ?? "");
  const status = String(url.searchParams.get("status") ?? ""); // "1" active | "0" suspended
  const verified = String(url.searchParams.get("verified") ?? ""); // "1" yes | "0" no
  const rawP = Number(url.searchParams.get("p") ?? 1);
  const page = Number.isFinite(rawP) && rawP >= 1 && rawP <= 1000 ? rawP : 1; // A-15
  const limit = 20;
  const offset = (page - 1) * limit;

  const conds = [];
  if (q)
    conds.push(
      sql`(${users.username} LIKE ${"%" + q + "%"} OR ${users.email} LIKE ${"%" + q + "%"} OR ${users.fullName} LIKE ${"%" + q + "%"})`,
    );
  if (level) conds.push(eq(users.level, level as never));
  if (status) conds.push(status === "1" ? eq(users.status, "1") : ne(users.status, "1"));
  if (verified) conds.push(verified === "1" ? eq(users.verify, "Yes") : ne(users.verify, "Yes"));
  const where = conds.length ? and(...conds) : undefined;

  const [rows, totalRow, statRow] = await Promise.all([
    db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        fullName: users.fullName,
        level: users.level,
        balance: users.balance,
        status: users.status,
        verify: users.verify,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(where)
      .orderBy(desc(users.id))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: sql<number>`count(*)` })
      .from(users)
      .where(where),
    db
      .select({
        total: sql<number>`count(*)`,
        active: sql<number>`COALESCE(SUM(CASE WHEN ${users.status} = '1' THEN 1 ELSE 0 END),0)`,
        verified: sql<number>`COALESCE(SUM(CASE WHEN ${users.verify} = 'Yes' THEN 1 ELSE 0 END),0)`,
        balance: sql<number>`COALESCE(SUM(${users.balance}),0)`,
      })
      .from(users)
      .where(ne(users.level, "Admin")),
  ]);

  const total = Number(totalRow[0]?.total ?? 0);
  const s = statRow[0] ?? { total: 0, active: 0, verified: 0, balance: 0 };
  const stats = {
    total: Number(s.total),
    active: Number(s.active),
    verified: Number(s.verified),
    balance: Number(s.balance),
  };

  return {
    users: rows,
    q,
    level,
    status,
    verified,
    page,
    total,
    pages: Math.ceil(total / limit),
    stats,
  };
};

/**
 * A-P0a: hard cap adjustment saldo untuk cegah human error / abuse tanpa
 * second-approver. > Rp1jt harus via deposit/channel resmi. Threshold
 * diturunkan kalau perlu (lihat ADMIN_GAP G3 untuk dual-control proper).
 */
const ADJUST_HARD_CAP = 1_000_000; // Rp 1.000.000 per aksi

export const actions: Actions = {
  adjust: async ({ request, locals }) => {
    assertAdmin(locals);
    const _rate = await assertAdminRate("user-adjust", (locals as any).ip ?? "0.0.0.0", 10, 60);
    if (_rate) return _rate;
    const form = await request.formData();
    const id = Number(form.get("id"));
    const amount = Number(form.get("amount"));
    const reason = String(form.get("reason") ?? "").trim();
    if (!Number.isFinite(id) || id <= 0) return fail(400, { error: "ID user wajib." });
    if (!Number.isFinite(amount) || amount === 0)
      return fail(400, { error: "Nominal tidak valid (bukan 0)." });
    if (reason.length < 5) return fail(400, { error: "Alasan minimal 5 karakter (audit trail)." });
    if (Math.abs(amount) > ADJUST_HARD_CAP)
      return fail(400, {
        error: `Penyesuaian > Rp${ADJUST_HARD_CAP.toLocaleString(
          "id-ID",
        )} butuh dual-control (belum tersedia). Gunakan deposit resmi atau pecah nominal.`,
      });

    // A-P0a: ATOMIK `balance+amount` (bukan read-then-write) anti race.
    let username = "";
    try {
      await db.transaction(async (tx) => {
        // Lock baris user dulu
        await tx.execute(sql`SELECT id FROM users WHERE id = ${id} FOR UPDATE`);
        const [u] = await tx
          .select({ username: users.username, balance: users.balance })
          .from(users)
          .where(eq(users.id, id))
          .limit(1);
        if (!u) throw new Error("USER_NOT_FOUND");
        username = u.username;
        await tx
          .update(users)
          .set({ balance: sql`${users.balance} + ${amount}` })
          .where(eq(users.id, id));
        await tx.insert(balanceLogs).values({
          userId: id,
          type: amount > 0 ? "plus" : "minus",
          amount,
          note: `Adjust admin: ${reason}`,
          createdAt: new Date(),
        });
      });
    } catch (e) {
      if ((e as Error)?.message === "USER_NOT_FOUND")
        return fail(404, { error: "User tidak ditemukan." });
      console.error("[users.adjust] failed", (e as Error)?.message);
      return fail(500, { error: "Gagal adjust saldo. Coba lagi." });
    }

    await logAudit({
      adminId: Number(locals.user.id),
      action: "adjust_balance",
      entity: "user",
      entityId: id,
      detail: { amount, reason },
      ip: (locals as any).ip,
    });
    return {
      success: `Saldo ${username} ${amount >= 0 ? "+" : ""}${amount.toLocaleString("id-ID")}.`,
    };
  },

  suspend: async ({ request, locals }) => {
    assertAdmin(locals);
    const _rate = await assertAdminRate("user-suspend", (locals as any).ip ?? "0.0.0.0", 10, 60);
    if (_rate) return _rate;
    const form = await request.formData();
    const id = Number(form.get("id"));
    if (!Number.isFinite(id) || id <= 0) return fail(400, { error: "ID wajib." });
    const [u] = await db
      .select({ status: users.status, username: users.username })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    if (!u) return fail(404, { error: "User tidak ditemukan." });
    const next = u.status === "1" ? "0" : "1";
    await db.update(users).set({ status: next }).where(eq(users.id, id));
    await logAudit({
      adminId: Number(locals.user.id),
      action: "suspend_user",
      entity: "user",
      entityId: id,
      detail: { from: u.status, to: next },
      ip: (locals as any).ip,
    });
    return { success: `${u.username} → ${next === "1" ? "Aktif" : "Suspended"}.` };
  },

  setLevel: async ({ request, locals }) => {
    assertAdmin(locals);
    const _rate = await assertAdminRate("user-setlevel", (locals as any).ip ?? "0.0.0.0", 10, 60);
    if (_rate) return _rate;
    const form = await request.formData();
    const id = Number(form.get("id"));
    const level = String(form.get("level") ?? "");
    const allowed = ["Member", "Agen", "Reseller", "Admin"];
    if (!Number.isFinite(id) || id <= 0) return fail(400, { error: "ID wajib." });
    if (!allowed.includes(level)) return fail(400, { error: "Level tidak valid." });
    const [u] = await db
      .select({ level: users.level, username: users.username })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    if (!u) return fail(404, { error: "User tidak ditemukan." });
    if (u.level === level) return { success: `Level ${u.username} tidak berubah.` };
    await db
      .update(users)
      .set({ level: level as never })
      .where(eq(users.id, id));
    await logAudit({
      adminId: Number(locals.user.id),
      action: "change_level",
      entity: "user",
      entityId: id,
      detail: { from: u.level, to: level },
      ip: (locals as any).ip,
    });
    return { success: `Level ${u.username} → ${level}.` };
  },
};
