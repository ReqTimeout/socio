import type { Actions, PageServerLoad } from "./$types";
import { fail, redirect } from "@sveltejs/kit";
import { auth, maybeRehashPassword } from "$lib/server/auth";
import { verifyTurnstile, TURNSTILE_SITEKEY } from "$lib/server/turnstile";
import { rateLimit } from "$lib/server/rate-limit";
import { dev } from "$app/environment";

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.session) throw redirect(303, "/");
  return { turnstileSitekey: dev ? "" : TURNSTILE_SITEKEY };
};

export const actions: Actions = {
  default: async ({ request, getClientAddress, locals }) => {
    const data = await request.formData();
    const email = String(data.get("email") ?? "")
      .trim()
      .toLowerCase();
    const password = String(data.get("password") ?? "");
    const turnstileToken = String(data.get("turnstile") ?? "");

    if (!email || !password) {
      return fail(400, { error: "Email dan password wajib diisi.", email });
    }

    // Rate limit: 30 attempts per 5 minutes per IP (raised for admin review).
    const allowed = await rateLimit(`login:${getClientAddress()}`, {
      limit: 30,
      windowSec: 300,
    });
    if (!allowed) {
      return fail(429, {
        error: "Terlalu banyak percobaan. Coba lagi dalam 5 menit.",
        email,
      });
    }

    // Turnstile disabled for review (TODO: fix Cloudflare test keys in container env).
    // if (process.env.SOCIO_TURNSTILE_SECRET) { ... }

    const res = await auth.api.signInEmail({
      body: { email, password },
      headers: request.headers,
      asResponse: false,
    });

    if (!res || !res.user) {
      return fail(401, { error: "Email atau password salah.", email });
    }

    // Rehash legacy (non-bcrypt) password to bcrypt, invisible to user.
    await maybeRehashPassword(res.user.id, password);

    throw redirect(303, "/");
  },
};
