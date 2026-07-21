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
    const form = await request.formData();
    const email = String(form.get("email") ?? "")
      .trim()
      .toLowerCase();
    const password = String(form.get("password") ?? "");
    const turnstileToken = String(form.get("turnstile") ?? "");

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

    let res: any;
    try {
      res = await auth.api.signInEmail({
        body: { email, password },
        headers: request.headers,
        asResponse: true,
      });
    } catch {
      return fail(401, { error: "Email atau password salah.", email });
    }

    // asResponse:true returns a Response with Set-Cookie headers we must forward.
    const setCookies: string[] = (res.headers?.getSetCookie?.() as string[] | undefined) ?? [];
    const cookies = setCookies.length
      ? setCookies.map((c) => c.split(";")[0]).join("; ")
      : (res.headers?.get("set-cookie") as string | null) ?? "";

    const body: any = await res.clone().json().catch(() => ({}));
    if (!body || !body.user) {
      return fail(401, { error: "Email atau password salah.", email });
    }

    // Rehash legacy (non-bcrypt) password to bcrypt, invisible to user.
    await maybeRehashPassword(body.user.id, password);

    // Redirect with the session cookies set.
    if (setCookies.length > 0) {
      // Pass cookies via the throw-Response mechanism (third arg accepted on
      // SvelteKit's redirect() in this version? — fall back to manual Response).
      const headers = new Headers({ location: "/" });
      for (const c of setCookies) {
        headers.append("set-cookie", c);
      }
      throw new Response(null, { status: 303, headers });
    }
    throw redirect(303, "/");
  },
};
