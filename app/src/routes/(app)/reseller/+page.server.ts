import { db } from "@socio/db";
import { users, deposits } from "@socio/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { redirect, fail } from "@sveltejs/kit";
import { effectivePer1k } from "@socio/core/pricing";
import { getPricingRules } from "$lib/server/pricing";
import { rateLimit } from "$lib/server/rate-limit";
import {
  issueResellerActivationInvoice,
  resellerActivationAmount,
  resellerActivationDeadlineLabel,
} from "$lib/server/signup";
import type { PageServerLoad, Actions } from "./$types";

/**
 * Chart "keuntungan Reseller" — JUJUR, dihitung server-side dari pricing_rules
 * LIVE (bukan angka hardcode ala .my yang 275/250 — markup .id ternyata
 * Member 225% / Reseller 200%). Anti-leak: client hanya menerima TOTAL rupiah
 * final per titik, TIDAK ADA base/markup yang dikirim (invarian §pricing.ts).
 * BASE_RATE_PER_1K ilustratif (median katalog prod 7.698 layanan aktif ≈
 * Rp36.400/1k, dibulatkan) — caption halaman menyatakan ini simulasi.
 */
const BASE_RATE_PER_1K = 10000;
const ORDER_POINTS = [10, 25, 50, 75, 100, 150, 200, 300];

async function buildChart() {
  const rules = await getPricingRules();
  const m1k = effectivePer1k(BASE_RATE_PER_1K, "Member", rules.Member, BASE_RATE_PER_1K);
  const r1k = effectivePer1k(BASE_RATE_PER_1K, "Reseller", rules.Reseller, BASE_RATE_PER_1K);
  return {
    labels: ORDER_POINTS.map(String),
    // Titik = 1.000 unit per order → total = qty/1000 × harga efektif per 1k.
    member: ORDER_POINTS.map((o) => Math.round(o * m1k)),
    reseller: ORDER_POINTS.map((o) => Math.round(o * r1k)),
    savePct: m1k > 0 ? Math.max(0, Math.round((1 - r1k / m1k) * 100)) : 0,
  };
}

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(303, "/login");
  const userId = Number(locals.user.id);
  const level = (locals.user.level as string) ?? "Member";

  // Nominal invoice mengikuti helper signup — jangan hardcode, suffix sen unik
  // dipakai cron pendeteksi transfer manual BCA. Untuk DISPLAY biaya dipakai
  // angka bersih (50.000) — tail sen acak tiap load cuma membingungkan;
  // nominal persis tagihan tetap muncul di strip pending + email + /saldo.
  const { amount: invoiced, saldoIncluded: bonus } = resellerActivationAmount();
  const base = Math.round(invoiced - (invoiced % 1000));
  const chart = await buildChart();

  // Invoice aktivasi Pending yang MASIH HIDUP (belum expired 72 jam) —
  // dipakai status CTA. Samakan predicate dengan banner dashboard + resendActivation.
  let hasPending = false;
  let pendingAmount = 0;
  if (level === "Member") {
    const [pend] = await db
      .select({ amount: deposits.amount, expire: deposits.expire })
      .from(deposits)
      .where(
        and(
          eq(deposits.userId, userId),
          eq(deposits.untukApa, "reseller"),
          eq(deposits.status, "Pending"),
        ),
      )
      .orderBy(desc(deposits.id))
      .limit(1);
    hasPending = !!pend && new Date(pend!.expire).getTime() > Date.now();
    pendingAmount = hasPending ? Number(pend!.amount) : 0;
  }

  // G2: penanda aktivasi reseller adalah `reseller_activated`, BUKAN `verify`.
  // Reseller warisan (level=Reseller belum lunas — 234 akun prod) tidak boleh
  // diklaim "sudah aktif"; mereka diarahkan ke dashboard (banner resend invoice
  // sudah ada di sana).
  let activationPending = false;
  if (level === "Reseller") {
    const [ru] = await db
      .select({ activated: users.resellerActivated })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    activationPending = !ru || ru.activated !== 1;
  }

  return {
    level,
    isMember: level === "Member",
    activationPending,
    hasPending,
    eligible: !hasPending,
    pendingAmount,
    base,
    bonus,
    deadlineLabel: resellerActivationDeadlineLabel(),
    chart,
  };
};

export const actions: Actions = {
  // Member meminta invoice aktivasi Reseller — reuse 100% flow signup
  // (`issueResellerActivationInvoice`: deposit Pending untuk_apa=reseller +
  // email instruksi BCA). Level TIDAK berubah di sini: Member tetap Member
  // sampai admin konfirmasi pembayaran (uang masuk dulu, hak naik kemudian —
  // flip level terjadi di activateReseller via CASE).
  upgradeToReseller: async ({ locals }) => {
    if (!locals.user) return fail(401, { error: "Sesi berakhir. Silakan login lagi." });
    const userId = Number(locals.user.id);

    // Gerbang spam: 1 request/menit per user (invoice + email keluar).
    const ok = await rateLimit(`reseller-upgrade:${userId}`, { limit: 1, windowSec: 60 });
    if (!ok) {
      return fail(429, { error: "Tunggu sebentar lalu coba lagi ya." });
    }

    // Otoritatif: baca level dari DB, bukan hanya session.
    const [u] = await db
      .select({ level: users.level })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!u) return fail(400, { error: "Akun tidak ditemukan." });
    if (u.level !== "Member") {
      return fail(403, { error: "Halaman ini khusus akun Member yang ingin naik ke Reseller." });
    }

    // Idempoten: invoice Pending yang masih hidup → jangan menumpuk tagihan.
    const [pend] = await db
      .select({ id: deposits.id, expire: deposits.expire })
      .from(deposits)
      .where(
        and(
          eq(deposits.userId, userId),
          eq(deposits.untukApa, "reseller"),
          eq(deposits.status, "Pending"),
        ),
      )
      .orderBy(desc(deposits.id))
      .limit(1);
    if (pend && new Date(pend.expire).getTime() > Date.now()) {
      return { success: "Invoice aktivasi masih aktif. Selesaikan pembayarannya dulu ya.", pending: true };
    }
    // Invoice expired → issueResellerActivationInvoice boleh terbit baru
    // (sama seperti jalur "kirim ulang invoice" di dashboard).

    try {
      const inv = await issueResellerActivationInvoice(userId);
      return { success: "Invoice aktivasi dibuat! Cek instruksi transfer di email dan halaman Saldo.", amount: inv.amount };
    } catch (e) {
      console.error("[reseller] upgradeToReseller failed:", (e as Error)?.message);
      return fail(500, { error: "Gagal membuat invoice. Coba lagi ya." });
    }
  },
};
