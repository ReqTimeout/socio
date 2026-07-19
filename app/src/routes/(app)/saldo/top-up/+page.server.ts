import { db } from "@socio/db";
import { deposits, users } from "@socio/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { redirect, fail } from "@sveltejs/kit";
import { createSnapToken } from "$lib/server/payment";
import { uploadToR2 } from "$lib/server/r2";
import type { PageServerLoad, Actions } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(303, "/login");
  const midtransReady = Boolean(process.env.MIDTRANS_SERVER_KEY);

  const history = await db
    .select({
      id: deposits.id,
      amount: deposits.amount,
      postAmount: deposits.postAmount,
      methodName: deposits.methodName,
      status: deposits.status,
      createdAt: deposits.createdAt,
      expire: deposits.expire,
      idPm: deposits.idPm,
      img: deposits.img,
    })
    .from(deposits)
    .where(eq(deposits.userId, Number(locals.user.id)))
    .orderBy(desc(deposits.createdAt))
    .limit(10);

  return {
    midtransReady,
    history,
    balance: locals.user.balance ?? 0,
    bcaNumber: "1234567890",
    bcaName: "PT Socio ID Nusantara",
  };
};

/** Generate unique 3-digit suffix anti-wrong-transfer */
function uniqueSuffix(userId: number): number {
  return 100 + ((userId * 7) % 900);
}

export const actions: Actions = {
  topup: async ({ request, locals }) => {
    const form = await request.formData();
    const amount = Number(form.get("amount"));
    const method = String(form.get("method") ?? "manual"); // manual | midtrans

    if (!amount || amount < 20000) return fail(400, { error: "Minimal top up Rp20.000" });
    if (amount > 10_000_000) return fail(400, { error: "Maksimal top up Rp10.000.000" });

    const userId = Number(locals.user!.id);
    const invoiceId = `DEP-${Date.now()}-${userId}`;

    // Manual BCA: add unique suffix for anti-wrong-transfer matching
    const suffix = uniqueSuffix(userId);
    const postAmount = method === "manual" ? amount + suffix : amount;
    const methodName = method === "midtrans" ? "Midtrans" : "BCA Manual";

    await db.insert(deposits).values({
      userId,
      payment: "bank",
      type: method === "midtrans" ? "VA" : "manual",
      methodName,
      validasi: "BCA",
      target: "",
      postAmount,
      amount,
      note: `Top up ${method}`,
      phone: null,
      status: "Pending",
      createdAt: new Date(),
      expire: new Date(Date.now() + 24 * 3600 * 1000),
      idPm: invoiceId,
      invoiceVirtual: "",
      untukApa: "smm",
      img: "",
    });

    if (method === "midtrans") {
      try {
        const snap = await createSnapToken({
          orderId: invoiceId,
          amount: postAmount,
          customerName: locals.user!.name ?? "User",
          customerEmail: locals.user!.email,
        });
        return { success: true, method: "midtrans", snapUrl: snap.redirect_url, invoiceId };
      } catch (e: any) {
        return fail(500, { error: "Midtrans gagal: " + (e?.message ?? "unknown") });
      }
    }

    // Manual BCA → return instruksi
    return { success: true, method: "manual", postAmount, invoiceId };
  },

  uploadProof: async ({ request, locals }) => {
    const form = await request.formData();
    const depositId = Number(form.get("id"));
    const file = form.get("proof") as File;
    if (!file || file.size === 0) return fail(400, { error: "Bukti transfer wajib diupload" });
    if (file.size > 2_000_000) return fail(400, { error: "Max ukuran file 2MB" });
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
      return fail(400, { error: "Format harus JPG/PNG/WebP" });

    const buf = new Uint8Array(await file.arrayBuffer());
    const ext = file.type.split("/")[1];
    const key = `proofs/${depositId}-${Date.now()}.${ext}`;
    const url = await uploadToR2(key, buf, file.type);

    await db.update(deposits).set({ img: url }).where(eq(deposits.id, depositId));

    return { success: "Bukti transfer diupload. Menunggu konfirmasi admin." };
  },
};
