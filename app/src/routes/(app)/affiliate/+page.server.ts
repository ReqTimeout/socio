import { db } from "@socio/db";
import { affiliate, users, balanceLogs } from "@socio/db/schema";
import { eq, sql, and } from "drizzle-orm";
import { redirect, fail } from "@sveltejs/kit";
import QRCode from "qrcode";
import type { PageServerLoad, Actions } from "./$types";

const MIN_WITHDRAW = 5000;

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(303, "/login");
  const userId = Number(locals.user.id);
  const base = process.env.SOCIO_APP_URL ?? "https://app.socio.id";

  const [pendingRow] = await db
    .select({ total: sql<number>`COALESCE(SUM(${affiliate.balance}), 0)` })
    .from(affiliate)
    .where(and(eq(affiliate.userId, userId), eq(affiliate.status, "Pending")));
  const pending = Number(pendingRow?.total ?? 0);

  const [withdrawnRow] = await db
    .select({ total: sql<number>`COALESCE(SUM(${affiliate.balance}), 0)` })
    .from(affiliate)
    .where(and(eq(affiliate.userId, userId), eq(affiliate.status, "Withdraw")));
  const withdrawn = Number(withdrawnRow?.total ?? 0);

  const [{ downline }] = await db
    .select({ downline: sql<number>`count(*)` })
    .from(users)
    .where(eq(users.upLink, String(locals.user!.username)));

  const code = (locals.user as any).reffKode ?? userId;
  const refLink = `${base}/daftar?ref=${code}`;
  const qr = await QRCode.toDataURL(refLink, { margin: 1, width: 240 });

  return {
    commission: pending,
    withdrawn,
    canWithdraw: pending >= MIN_WITHDRAW,
    minWithdraw: MIN_WITHDRAW,
    downline: Number(downline),
    refLink,
    code: String(code),
    qr,
  };
};

export const actions: Actions = {
  withdraw: async ({ locals }) => {
    if (!locals.user) return fail(401, { error: "Unauthorized" });
    const userId = Number(locals.user.id);

    const [row] = await db
      .select({ total: sql<number>`COALESCE(SUM(${affiliate.balance}), 0)` })
      .from(affiliate)
      .where(and(eq(affiliate.userId, userId), eq(affiliate.status, "Pending")));
    const available = Number(row?.total ?? 0);

    if (available < MIN_WITHDRAW) {
      return fail(400, { error: `Minimal withdraw Rp${MIN_WITHDRAW.toLocaleString("id-ID")}.` });
    }

    const [u] = await db
      .select({ balance: users.balance })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    const newBal = Number(u?.balance ?? 0) + available;

    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ balance: newBal })
        .where(eq(users.id, userId));
      await tx
        .update(affiliate)
        .set({ status: "Withdraw" })
        .where(and(eq(affiliate.userId, userId), eq(affiliate.status, "Pending")));
      await tx.insert(balanceLogs).values({
        userId,
        type: "wd",
        amount: available,
        note: `Withdraw affiliate commission (auto-credit)`,
        createdAt: new Date(),
      });
    });

    return { success: `Komisi Rp${available.toLocaleString("id-ID")} berhasil ditarik ke saldo.` };
  },
};
