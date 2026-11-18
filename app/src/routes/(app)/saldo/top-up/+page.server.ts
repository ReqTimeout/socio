import { db } from "@socio/db";
import { deposits, users } from "@socio/db/schema";
import { eq, desc, and, sql, gte, inArray } from "drizzle-orm";
import { redirect, fail } from "@sveltejs/kit";
import { createHmac, randomInt } from "node:crypto";
import { uploadToR2 } from "$lib/server/r2";
import { depositInstructionMail, enqueueEmail } from "$lib/server/deposit-emails";
import { formatRupiah, getDepositBonusRate, getTopupMin } from "$lib/format";
import type { PageServerLoad, Actions } from "./$types";

// Bonus deposit dibaca dari getter single-source ($lib/format, env
// SOCIO_DEPOSIT_BONUS) — angka sama dengan nudge dashboard + email WP6.
// Dikredit saat admin konfirmasi — port PHP lama `add-action.php:35`.

/** HMAC suffix kode unik → client tidak bisa manipulasi nominal transfer. */
function signSuffix(userId: number, suffix: number): string {
  const secret = process.env.SOCIO_AUTH_SECRET ?? "socio-dev-secret";
  return createHmac("sha256", secret).update(`${userId}:${suffix}`).digest("hex").slice(0, 16);
}

/** Kode unik 3 digit (111..999) — acak per deposit (B-08: dulu derivasi userId, identik antar deposit). */
function newSuffix(): number {
  return randomInt(111, 1000);
}

/** Batas fallback kalau data belum cukup untuk hitung proporsi Populer. */
const FALLBACK_CHIPS = [50000, 100000, 200000, 500000] as const;

/** Tentukan nominal Populer dari data 30 hari terakhir (lintas user).
 *  - Hitung distribusi nominal deposit berstatus Success + Pending (recent signal).
 *  - Cari nominal yang paling banyak dipakai, kalau >= 20% share dari total deposit → tandai Populer.
 *  - Kalau dataset < 20 deposit → fallback ke Rp100.000 (chip index-1 default).
 */
async function pickPopularNominal(): Promise<{ chips: number[]; popular: number | null }> {
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  try {
    const rows = await db
      .select({ amount: deposits.postAmount })
      .from(deposits)
      .where(and(gte(deposits.createdAt, since), inArray(deposits.status, ["Success", "Pending"])))
      .limit(500);
    if (rows.length < 20) {
      return { chips: [...FALLBACK_CHIPS], popular: FALLBACK_CHIPS[1] };
    }
    // Bucket ke kelipatan Rp50.000 biar tidak ada banyak nominal unik kecil.
    const buckets = new Map<number, number>();
    for (const r of rows) {
      const a = Number(r.amount ?? 0);
      if (a < 20000) continue;
      const bucket = Math.round(a / 50000) * 50000;
      buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
    }
    // Top 4 bucket by count.
    const sorted = [...buckets.entries()].sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) return { chips: [...FALLBACK_CHIPS], popular: FALLBACK_CHIPS[1] };
    const top = sorted
      .slice(0, 4)
      .map(([amt]) => amt)
      .sort((a, b) => a - b);
    const [winner, winnerCount] = sorted[0];
    const total = rows.length;
    const share = winnerCount / total;
    return { chips: top, popular: share >= 0.2 ? winner : null };
  } catch {
    return { chips: [...FALLBACK_CHIPS], popular: FALLBACK_CHIPS[1] };
  }
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
  const popular = await pickPopularNominal();
  return {
    history,
    balance: locals.user.balance ?? 0,
    bcaNumber: process.env.SOCIO_BCA_NUMBER ?? "1392680815",
    bcaName: process.env.SOCIO_BCA_NAME ?? "Awangga Ramadhi",
    bonusRate: getDepositBonusRate(),
    // Preview kode unik + HMAC; action validasi signature (anti-tamper).
    suffix,
    suffixSig: signSuffix(userId, suffix),
    chips: popular.chips,
    popularNominal: popular.popular,
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

    const minTopup = getTopupMin();
    if (!amount || amount < minTopup)
      return fail(400, { error: `Minimal top up ${formatRupiah(minTopup)}` });
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
    const bonus = Math.round(amount * getDepositBonusRate());
    // Saldo masuk = nominal transfer + bonus (paritas PHP lama: amount tersimpan
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

    // Manual BCA → return instruksi + email instruksi (async via queue)
    const expireAt = new Date(Date.now() + 24 * 3600 * 1000);
    try {
      const [u] = await db
        .select({ email: users.email, fullName: users.fullName })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      if (u?.email) {
        const m = depositInstructionMail({
          name: u.fullName || "Pengguna Socio.id",
          // WP6: nominal PAS yang ditransfer = postAmount (bukan credited yang
          // sudah termasuk bonus) — bonus tampil sebagai baris "saldo yang diterima".
          amount: postAmount,
          credited,
          invoiceId,
          expireAt,
        });
        await enqueueEmail({
          to: u.email,
          userId,
          templateName: "deposit-instruction",
          subject: m.subject,
          body: m.text,
          ctaText: "Lihat status deposit",
          ctaUrl: "https://app.socio.id/saldo",
          html: m.html,
          priority: "high",
        });
      }
      // Alert admin: ada deposit pending baru (uang masuk potensial).
      const { notifyAdmins } = await import("$lib/server/email-templates");
      const amtRp = "Rp" + Math.round(credited).toLocaleString("id-ID");
      await notifyAdmins({
        subject: `Deposit pending ${amtRp} — ${u?.fullName ?? "user #" + userId}`,
        body: `Deposit manual ${amtRp} (${invoiceId}) menunggu konfirmasi.\nUser: ${u?.fullName ?? userId} <${u?.email ?? "-"}>`,
        ctaText: "Buka deposits",
        ctaUrl: "https://app.socio.id/admin/deposits",
        templateName: "admin-deposit-pending",
      });
    } catch {
      // email best-effort — deposit tetap dibuat
    }
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
