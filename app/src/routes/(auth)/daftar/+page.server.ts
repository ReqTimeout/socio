import type { Actions, PageServerLoad } from "./$types";
import { fail, redirect } from "@sveltejs/kit";
import { db } from "@socio/db";
import { users } from "@socio/db/schema";
import { eq } from "drizzle-orm";
import { verifyTurnstile, TURNSTILE_SITEKEY } from "$lib/server/turnstile";
import { rateLimit } from "$lib/server/rate-limit";
import { isDisposableEmail } from "$lib/server/disposable-emails";
import {
  createUserRow,
  createResellerSignup,
  sendMemberVerificationEmail,
} from "$lib/server/signup";
import { dev } from "$app/environment";

/** Referral cookie — port `?r_program=` dari signup-edit.php (awet 10 hari). */
const REF_COOKIE = "r_pr";

export const load: PageServerLoad = async ({ locals, cookies, url }) => {
  if (locals.session) throw redirect(303, "/");

  // ?r=username → catat sebagai referral cookie, lalu redirect tanpa query
  const ref = String(url.searchParams.get("r") ?? "").trim();
  if (ref) {
    cookies.set(REF_COOKIE, ref, {
      path: "/",
      maxAge: 60 * 60 * 24 * 10,
      sameSite: "lax",
      secure: false,
    });
    throw redirect(303, "/daftar");
  }

  let referrer: { username: string } | null = null;
  const refCookie = cookies.get(REF_COOKIE);
  if (refCookie) {
    const [u] = await db
      .select({ username: users.username })
      .from(users)
      .where(eq(users.username, refCookie))
      .limit(1);
    if (u) referrer = u;
  }

  return { turnstileSitekey: dev ? "" : TURNSTILE_SITEKEY, referrer };
};

export const actions: Actions = {
  default: async ({ request, getClientAddress, cookies }) => {
    const data = await request.formData();
    const email = String(data.get("email") ?? "")
      .trim()
      .toLowerCase();
    const username = String(data.get("username") ?? "").trim();
    const fullName = String(data.get("fullName") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const whatsapp = String(data.get("whatsapp") ?? "").trim();
    const mode = String(data.get("mode") ?? "member"); // member | reseller
    const turnstileToken = String(data.get("turnstile") ?? "");

    const baseErr = { email, username, fullName };
    if (!email || !username || !fullName || !password) {
      return fail(400, { ...baseErr, error: "Semua field wajib diisi." });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return fail(400, { ...baseErr, error: "Format email tidak valid." });
    }
    if (username.length < 3) {
      return fail(400, { ...baseErr, error: "Username minimal 3 karakter." });
    }
    // U-08: juga reject username yang setelah sanitasi hanya berisi karakter
    // non-allowed (mis. "@@@" → ""). Sisa dicek ulang di server createUserRow.
    const sanitized = username.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (sanitized.length < 3) {
      return fail(400, {
        ...baseErr,
        error: "Username harus berisi minimal 3 huruf/angka (tanpa spasi/simbol).",
      });
    }
    if (password.length < 8) {
      return fail(400, { ...baseErr, error: "Password minimal 8 karakter." });
    }
    if (mode === "reseller" && !/^\d{10,14}$/.test(whatsapp.replace(/\D/g, ""))) {
      return fail(400, { ...baseErr, error: "Nomor WhatsApp wajib diisi (10-14 digit)." });
    }

    if (isDisposableEmail(email)) {
      return fail(400, { ...baseErr, error: "Gunakan email asli, bukan email sementara." });
    }

    const allowed = await rateLimit(`signup:${getClientAddress()}`, {
      limit: 5,
      windowSec: 900,
    });
    if (!allowed) {
      return fail(429, { ...baseErr, error: "Terlalu banyak pendaftaran. Coba lagi nanti." });
    }

    const ok = await verifyTurnstile(turnstileToken);
    if (!ok) {
      return fail(400, { ...baseErr, error: "Verifikasi humans failed. Refresh and try again." });
    }

    // Resolve referrer dari cookie referral
    let upLink: number | null = null;
    const refCookie = cookies.get(REF_COOKIE);
    if (refCookie) {
      const [u] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, refCookie))
        .limit(1);
      upLink = u ? Number(u.id) : null;
    }

    let emailSent = false;
    try {
      if (mode === "reseller") {
        await createResellerSignup({ email, password, username, fullName, whatsapp, upLink });
        throw redirect(303, "/login?registered=reseller");
      }
      const userId = await createUserRow({
        email,
        password,
        username,
        fullName,
        whatsapp,
        upLink,
      });
      // U-04: kalau email gagal kirim, tetap buat akun tapi flag ke UI agar
      // user tidak diam-diam tidak terima verifikasi. Pesan error minta user
      // resend manual di halaman verifikasi.
      try {
        emailSent = await sendMemberVerificationEmail(userId);
      } catch (e) {
        console.error("[signup] sendMemberVerificationEmail failed", (e as Error)?.message);
      }
    } catch (e) {
      if (e && typeof e === "object" && "status" in e) throw e; // SvelteKit redirect
      const msg = e instanceof Error ? e.message : "Gagal membuat akun. Coba lagi.";
      return fail(400, { ...baseErr, error: msg });
    }

    if (!emailSent) {
      throw redirect(303, `/verifikasi?resend=1&email=${encodeURIComponent(email)}`);
    }
    throw redirect(303, "/login?registered=1");
  },
};
