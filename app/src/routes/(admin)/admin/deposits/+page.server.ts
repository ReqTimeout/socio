import { db } from "@socio/db";
import { deposits, users, balanceLogs } from "@socio/db/schema";
import { sql, desc, eq, and, ne } from "drizzle-orm";
import { redirect, fail } from "@sveltejs/kit";
import { logAudit, assertAdmin, assertAdminRate } from "$lib/server/admin";
import { creditAffiliateCommission } from "$lib/server/affiliate";
import type { PageServerLoad, Actions } from "./$types";

const STATUSES = ["Pending", "Success", "Canceled"] as const;
type Status = (typeof STATUSES)[number];

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user) throw redirect(303, "/login");
  if (locals.user.level !== "Admin") throw redirect(303, "/");

  const q = String(url.searchParams.get("q") ?? "").trim();
  const status = String(url.searchParams.get("status") ?? "") as Status | "";
  const rawP = Number(url.searchParams.get("p") ?? 1);
  const page = Number.isFinite(rawP) && rawP >= 1 && rawP <= 1000 ? rawP : 1; // A-15
  const limit = 25;
  const offset = (page - 1) * limit;

  const conds: any[] = [ne(users.level, "Admin")];
  if (status && STATUSES.includes(status as Status)) {
    conds.push(eq(deposits.status, status as never));
  }
  if (q) {
    const n = Number(q) || 0;
    conds.push(
      sql`(${deposits.id} = ${n} OR ${users.username} LIKE ${"%" + q + "%"} OR ${deposits.methodName} LIKE ${"%" + q + "%"} OR ${deposits.status} LIKE ${"%" + q + "%"})`,
    );
  }
  const where = and(...conds);

  const [rows, totalRow, statsRows] = await Promise.all([
    db
      .select({
        id: deposits.id,
        userId: deposits.userId,
        username: users.username,
        methodName: deposits.methodName,
        amount: deposits.amount,
        postAmount: deposits.postAmount,
        status: deposits.status,
        img: deposits.img,
        untukApa: deposits.untukApa,
        note: deposits.note,
        createdAt: deposits.createdAt,
      })
      .from(deposits)
      .leftJoin(users, eq(deposits.userId, users.id))
      .where(where)
      .orderBy(desc(deposits.id))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: sql<number>`count(*)` })
      .from(deposits)
      .leftJoin(users, eq(deposits.userId, users.id))
      .where(where),
    db
      .select({
        status: deposits.status,
        count: sql<number>`count(*)`,
        total: sql<number>`COALESCE(SUM(CASE WHEN ${deposits.amount} > 100000000 THEN 0 ELSE ${deposits.amount} END),0)`,
      })
      .from(deposits)
      .leftJoin(users, eq(deposits.userId, users.id))
      .where(ne(users.level, "Admin"))
      .groupBy(deposits.status),
  ]);

  const total = Number(totalRow[0]?.total ?? 0);
  const stats: Record<Status, { count: number; total: number }> = {
    Pending: { count: 0, total: 0 },
    Success: { count: 0, total: 0 },
    Canceled: { count: 0, total: 0 },
  };
  for (const r of statsRows) {
    if (r.status in stats)
      stats[r.status as Status] = { count: Number(r.count), total: Number(r.total) };
  }

  return {
    deposits: rows,
    q,
    status,
    page,
    total,
    pages: Math.max(1, Math.ceil(total / limit)),
    stats,
  };
};

export const actions: Actions = {
  confirm: async ({ request, locals }) => {
    // A-02/A-03 defense-in-depth
    assertAdmin(locals);
    await assertAdminRate("deposit-confirm", (locals as any).ip ?? "0.0.0.0", 30, 60);
    const form = await request.formData();
    const id = Number(form.get("id"));
    if (!Number.isFinite(id) || id <= 0) return fail(400, { error: "ID tidak valid." });

    // A-05: idempotent guard — hanya Pending yang boleh di-confirm. Canceled
    // tidak boleh di-confirm ulang. Cek status terbaru.
    const [d] = await db.select().from(deposits).where(eq(deposits.id, id)).limit(1);
    if (!d) return fail(404, { error: "Deposit tidak ditemukan." });
    if (d.status === "Success") return fail(409, { error: "Deposit sudah dikonfirmasi." });
    if (d.status !== "Pending")
      return fail(409, { error: `Deposit berstatus ${d.status} — tidak bisa dikonfirmasi.` });

    // A-05: transaksi atomik — kredit saldo + log + flip status. Kalau satu
    // gagal, semua rollback. Pakai `where status="Pending"` untuk idempotency
    // di level DB.
    //
    // V-DEP3: deposit reseller (untukApa=reseller) = biaya AKTIVASI Rp50rb,
    // BUKAN kredit saldo. Saldo awal reseller cuma SOCIO_RESELLER_BONUS (20rb)
    // via activateReseller — spec `docs/RESELLER_PAGE_SPEC.md` Rule #1/#4.
    const isResellerActivation = d.untukApa === "reseller";
    try {
      await db.transaction(async (tx) => {
        if (d.userId && !isResellerActivation) {
          await tx
            .update(users)
            .set({ balance: sql`${users.balance} + ${Number(d.amount)}` })
            .where(eq(users.id, d.userId));
          await tx.insert(balanceLogs).values({
            userId: d.userId,
            type: "dep",
            amount: Number(d.amount),
            note: `Deposit BCA dikonfirmasi #${id} (${d.methodName})`,
            createdAt: new Date(),
          });
        }

        // affectedRows cek via raw SQL (Drizzle MySQL UPDATE belum support .returning)
        const upd = await tx.execute(sql`
          UPDATE deposits SET status = 'Success'
          WHERE id = ${id} AND status = 'Pending'
        `);
        // mysql2 ResultSetHeader.affectedRows — drizzle bisa return array [header, fields]
        // (V-DEP2: baca langsung `.affectedRows` dari array = undefined → flip
        // selalu dianggap gagal → transaksi rollback → confirm tidak pernah sukses)
        const affected = Array.isArray(upd)
          ? Number((upd[0] as { affectedRows?: number } | undefined)?.affectedRows ?? 0)
          : Number((upd as unknown as { affectedRows?: number }).affectedRows ?? 0);
        if (!affected) {
          throw new Error("DEPOSIT_NOT_PENDING");
        }
      });
    } catch (e) {
      if ((e as Error)?.message === "DEPOSIT_NOT_PENDING") {
        return fail(409, { error: "Deposit sudah dikonfirmasi sebelumnya." });
      }
      console.error("[deposit] confirm transaction failed", (e as Error)?.message);
      return fail(500, { error: "Gagal konfirmasi deposit. Coba lagi." });
    }

    // V-DEP4: side-effects dijalankan SETELAH commit (bukan di dalam tx).
    // activateReseller/creditAffiliateCommission pakai global `db` — kalau
    // dipanggil di dalam tx, row `users` masih terkunci koneksi tx → update
    // gagal "Failed query: update users set verify".
    try {
      if (isResellerActivation) {
        const { activateReseller } = await import("$lib/server/signup");
        await activateReseller(d.userId);
      } else if (d.userId) {
        await creditAffiliateCommission(d.userId, Number(d.amount), d.untukApa);
      }
    } catch (e) {
      console.error("[deposit] post-confirm side effect failed", (e as Error)?.message);
    }

    await logAudit({
      adminId: Number(locals.user.id),
      action: "confirm_deposit",
      entity: "deposit",
      entityId: id,
      detail: { amount: Number(d.amount), method: d.methodName, untukApa: d.untukApa },
      ip: (locals as any).ip,
    });
    return {
      success:
        d.untukApa === "reseller"
          ? `Deposit #${id} dikonfirmasi & akun reseller diaktifkan.`
          : `Deposit #${id} dikonfirmasi.`,
    };
  },
  reject: async ({ request, locals }) => {
    assertAdmin(locals);
    await assertAdminRate("deposit-reject", (locals as any).ip ?? "0.0.0.0", 30, 60);
    const form = await request.formData();
    const id = Number(form.get("id"));
    if (!Number.isFinite(id) || id <= 0) return fail(400, { error: "ID tidak valid." });
    // A-05: hanya Pending yang bisa ditolak. Canceled/Success → 409 idempotent.
    const upd = await db.execute(sql`
      UPDATE deposits SET status = 'Canceled'
      WHERE id = ${id} AND status = 'Pending'
    `);
    const affected = Number((upd as unknown as { affectedRows?: number }).affectedRows ?? 0);
    if (!affected) {
      const [d] = await db
        .select({ status: deposits.status })
        .from(deposits)
        .where(eq(deposits.id, id))
        .limit(1);
      if (!d) return fail(404, { error: "Deposit tidak ditemukan." });
      return fail(409, { error: `Deposit berstatus ${d.status} — tidak bisa ditolak.` });
    }
    await logAudit({
      adminId: Number(locals.user.id),
      action: "reject_deposit",
      entity: "deposit",
      entityId: id,
      ip: (locals as any).ip,
    });
    return { success: `Deposit #${id} ditolak.` };
  },
};
