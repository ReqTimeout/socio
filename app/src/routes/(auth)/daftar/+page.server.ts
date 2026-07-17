import type { Actions, PageServerLoad } from "./$types";
import { fail, redirect } from "@sveltejs/kit";
import { auth } from "$lib/server/auth";
import { verifyTurnstile, TURNSTILE_SITEKEY } from "$lib/server/turnstile";
import { rateLimit } from "$lib/server/rate-limit";
import { isDisposableEmail } from "$lib/server/disposable-emails";
import { dev } from "$app/environment";

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.session) throw redirect(303, "/");
  return { turnstileSitekey: dev ? "" : TURNSTILE_SITEKEY };
};

export const actions: Actions = {
  default: async ({ request, getClientAddress }) => {
    const data = await request.formData();
    const email = String(data.get("email") ?? "")
      .trim()
      .toLowerCase();
    const username = String(data.get("username") ?? "").trim();
    const fullName = String(data.get("fullName") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const turnstileToken = String(data.get("turnstile") ?? "");

    if (!email || !username || !fullName || !password) {
      return fail(400, {
        error: "Semua field wajib diisi.",
        email,
        username,
        fullName,
      });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return fail(400, {
        error: "Format email tidak valid.",
        email,
        username,
        fullName,
      });
    }
    if (username.length < 3) {
      return fail(400, {
        error: "Username minimal 3 karakter.",
        email,
        username,
        fullName,
      });
    }
    if (password.length < 8) {
      return fail(400, {
        error: "Password minimal 8 karakter.",
        email,
        username,
        fullName,
      });
    }

    if (isDisposableEmail(email)) {
      return fail(400, {
        error: "Gunakan email asli, bukan email sementara.",
        email,
        username,
        fullName,
      });
    }

    const allowed = await rateLimit(`signup:${getClientAddress()}`, {
      limit: 5,
      windowSec: 900,
    });
    if (!allowed) {
      return fail(429, {
        error: "Terlalu banyak pendaftaran. Coba lagi nanti.",
        email,
        username,
        fullName,
      });
    }

    const ok = await verifyTurnstile(turnstileToken, getClientAddress());
    if (!ok) {
      return fail(400, {
        error: "Verifikasi humans failed. Refresh and try again.",
        email,
        username,
        fullName,
      });
    }

    try {
      const res = await auth.api.signUpEmail({
        body: { email, password, username, name: fullName },
        headers: request.headers,
        asResponse: false,
      });
      if (!res || !res.user) {
        return fail(500, {
          error: "Gagal membuat akun. Coba lagi.",
          email,
          username,
          fullName,
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Email atau username sudah terdaftar.";
      return fail(400, { error: msg, email, username, fullName });
    }

    throw redirect(303, "/login?registered=1");
  },
};
