import { db } from "@socio/db";
import { deposits, users } from "@socio/db/schema";
import { eq, desc } from "drizzle-orm";
import { redirect, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(303, "/login");
  const midtransReady = Boolean(process.env.SOCIO_MIDTRANS_KEY);
  const tripayReady = Boolean(process.env.SOCIO_TRIPAY_KEY);

  const history = await db
    .select({
      id: deposits.id,
      amount: deposits.amount,
      methodName: deposits.methodName,
      status: deposits.status,
      createdAt: deposits.createdAt,
    })
    .from(deposits)
    .where(eq(deposits.userId, Number(locals.user.id)))
    .orderBy(desc(deposits.createdAt))
    .limit(10);

  return { midtransReady, tripayReady, history, balance: locals.user.balance ?? 0 };
};

export const actions: Actions = {
  topup: async ({ request, locals }) => {
    const form = await request.formData();
    const amount = Number(form.get("amount"));
    if (!amount || amount < 10000) return fail(400, { error: "Minimal top up Rp10.000." });

    const userId = Number(locals.user!.id);
    if (process.env.SOCIO_MIDTRANS_KEY) {
      // TODO M2: call Midtrans Snap, store snap token, redirect to snap.
      // For now create a Pending deposit record keyed to Midtrans order.
    }

    await db.insert(deposits).values({
      userId,
      payment: "bank",
      type: "auto",
      methodName: process.env.SOCIO_MIDTRANS_KEY ? "Midtrans QRIS" : "Manual",
      validasi: "",
      target: "",
      postAmount: amount,
      amount,
      note: "",
      phone: null,
      status: "Pending",
      createdAt: new Date(),
      expire: new Date(Date.now() + 24 * 3600 * 1000),
      idPm: `DEP-${Date.now()}`,
      invoiceVirtual: "",
      untukApa: "smm",
      img: "",
    });

    return { success: true, amount };
  },
};
