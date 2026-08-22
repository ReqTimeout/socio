import { db } from "@socio/db";
import { affiliate, users } from "@socio/db/schema";
import { eq, sql, and, inArray } from "drizzle-orm";
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

  // Sudah cair: legacy 'Withdraw' (auto-credit lama) + 'Paid' (approve admin)
  const [withdrawnRow] = await db
    .select({ total: sql<number>`COALESCE(SUM(${affiliate.balance}), 0)` })
    .from(affiliate)
    .where(and(eq(affiliate.userId, userId), inArray(affiliate.status, ["Withdraw", "Paid"])));
  const withdrawn = Number(withdrawnRow?.total ?? 0);

  const [requestedRow] = await db
    .select({ total: sql<number>`COALESCE(SUM(${affiliate.balance}), 0)` })
    .from(affiliate)
    .where(and(eq(affiliate.userId, userId), eq(affiliate.status, "Requested")));
  const requested = Number(requestedRow?.total ?? 0);

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
    requested,
    canWithdraw: pending >= MIN_WITHDRAW && requested === 0,
    minWithdraw: MIN_WITHDRAW,
    downline: Number(downline),
    refLink,
    code: String(code),
    qr,
  };
};

export const actions: Actions = {
  /**
   * Withdraw → masuk antrian approval admin (bukan auto-credit).
   * Semua komisi Pending diubah jadi 'Requested'; saldo dikredit saat admin approve.
   */
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

    const [alreadyRequested] = await db
      .select({ c: sql<number>`COALESCE(SUM(${affiliate.balance}), 0)` })
      .from(affiliate)
      .where(and(eq(affiliate.userId, userId), eq(affiliate.status, "Requested")));
    if (Number(alreadyRequested?.c ?? 0) > 0) {
      return fail(409, { error: "Masih ada penarikan yang menunggu persetujuan admin." });
    }

    await db
      .update(affiliate)
      .set({ status: "Requested" })
      .where(and(eq(affiliate.userId, userId), eq(affiliate.status, "Pending")));

    return {
      success: `Pengajuan penarikan Rp${available.toLocaleString("id-ID")} dikirim. Saldo dikredit setelah disetujui admin.`,
    };
  },
};
