import { db } from "@socio/db";
import { deposits } from "@socio/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { redirect, fail } from "@sveltejs/kit";
import { createHmac, randomInt } from "node:crypto";
import { uploadToR2 } from "$lib/server/r2";
import type { PageServerLoad, Actions } from "./$types";

/** Bonus deposit (0.10 = 10%). Dikredit saat admin konfirmasi — port PHP lama `add-action.php:35`. */
function depositBonusRate(): number {
  const r = Number(process.env.SOCIO_DEPOSIT_BONUS ?? "0.10");
  return Number.isFinite(r) && r >= 0 && r <= 1 ? r : 0;
}

/** HMAC suffix kode unik → client tidak bisa manipulasi nominal transfer. */
function signSuffix(userId: number, suffix: number): string {
  const secret = process.env.SOCIO_AUTH_SECRET ?? "socio-dev-secret";
  return createHmac("sha256", secret).update(`${userId}:${suffix}`).digest("hex").slice(0, 16);
}

/** Kode unik 3 digit (111..999) — acak per deposit (B-08: dulu derivasi userId, identik antar deposit). */
function newSuffix(): number {
  return randomInt(111, 1000);
}

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(303, "/login");

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

  const userId = Number(locals.user.id);
  const suffix = newSuffix();
  return {
    history,
    balance: locals.user.balance ?? 0,
    bcaNumber: process.env.SOCIO_BCA_NUMBER ?? "1392680815",
    bcaName: process.env.SOCIO_BCA_NAME ?? "Awangga Ramadhi",
    bonusRate: depositBonusRate(),
    // Preview kode unik + HMAC; action validasi signature (anti-tamper).
    suffix,
    suffixSig: signSuffix(userId, suffix),
  };
};

export const actions: Actions = {
  topup: async ({ request, locals }) => {
    if (!locals.user) throw redirect(303, "/login");
    const userId = Number(locals.user.id);
    const form = await request.formData();
    const amount = Number(form.get("amount"));
    const method = String(form.get("method") ?? "manual"); // manual | midtrans (midtrans disabled)

    if (method !== "manual") {
      return fail(400, { error: "Metode pembayaran unavailable. Gunakan transfer BCA." });
    }

    if (!amount || amount < 20000) return fail(400, { error: "Minimal top up Rp20.000" });
    if (amount > 10_000_000) return fail(400, { error: "Maksimal top up Rp10.000.000" });

    // B-07: max 2 deposit pending (port PHP lama `add-action.php:31`).
    const [pending] = await db
      .select({ n: sql<number>`count(*)` })
      .from(deposits)
      .where(and(eq(deposits.userId, userId), eq(deposits.status, "Pending")));
    if (Number(pending?.n ?? 0) >= 2) {
      return fail(400, { error: "Kamu punya 2 deposit pending — selesaikan dulu ya." });
    }

    // Kode unik: pakai yang di-preview kalau signature valid, else acak baru.
    const formSuffix = Number(form.get("suffix"));
    const formSig = String(form.get("suffixSig") ?? "");
    const suffix =
      formSuffix >= 111 && formSuffix <= 999 && formSig === signSuffix(userId, formSuffix)
        ? formSuffix
        : newSuffix();

    const postAmount = amount + suffix;
    const bonus = Math.round(amount * depositBonusRate());
    // Saldo masuk = nominal transfer + bonus 10% (paritas PHP lama: amount tersimpan
    // sudah termasuk bonus; admin confirm kredit `deposits.amount` apa adanya).
    const credited = postAmount + bonus;
    const invoiceId = `DEP-${Date.now()}-${userId}`;

    await db.insert(deposits).values({
      userId,
      payment: "bank",
      type: "manual",
      methodName: "Transfer BCA",
      validasi: "BCA",
      target: "",
      postAmount,
      amount: credited,
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

    // Manual BCA → return instruksi
    return { success: true, method: "manual", postAmount, credited, bonus, invoiceId };
  },

  uploadProof: async ({ request, locals }) => {
    if (!locals.user) throw redirect(303, "/login");
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

    // P0-7: hanya boleh update bukti deposit milik sendiri.
    // Catatan: upload bukti OPSIONAL — admin tetap bisa approve langsung tanpa bukti.
    await db
      .update(deposits)
      .set({ img: url })
      .where(and(eq(deposits.id, depositId), eq(deposits.userId, Number(locals.user.id))));

    return { success: "Bukti transfer diupload. Menunggu konfirmasi admin." };
  },
};
