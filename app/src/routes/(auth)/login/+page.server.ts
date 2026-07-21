import type { Actions, PageServerLoad } from "./$types";
import { fail, redirect } from "@sveltejs/kit";
import { auth, maybeRehashPassword } from "$lib/server/auth";
import { rateLimit } from "$lib/server/rate-limit";
import { dev } from "$app/environment";

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.session) throw redirect(303, "/");
  return { turnstileSitekey: dev ? "" : "" };
};

export const actions: Actions = {
  default: async ({ request, getClientAddress, cookies }) => {
    const form = await request.formData();
    const email = String(form.get("email") ?? "")
      .trim()
      .toLowerCase();
    const password = String(form.get("password") ?? "");

    if (!email || !password) {
      return fail(400, { error: "Email dan password wajib diisi.", email });
    }

    // Rate limit: 30 attempts per 5 minutes per IP.
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

    let res: any;
    try {
      res = await auth.api.signInEmail({
        body: { email, password },
        headers: request.headers,
        asResponse: true,
        returnHeaders: true,
      });
    } catch {
      return fail(401, { error: "Email atau password salah.", email });
    }

    // Forward every Set-Cookie header from better-auth via SvelteKit's cookies API.
    const setCookies: string[] = (res.headers?.getSetCookie?.() as string[] | undefined) ?? [];
    for (const sc of setCookies) {
      const [pair] = sc.split(";");
      const eq = pair.indexOf("=");
      const name = pair.slice(0, eq);
      const value = pair.slice(eq + 1);
      cookies.set(name, value, {
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "lax",
      });
    }

    const body: any = await res.clone().json().catch(() => ({}));
    if (!body || !body.user) {
      return fail(401, { error: "Email atau password salah.", email });
    }

    await maybeRehashPassword(body.user.id, password);

    throw redirect(303, "/");
  },
};
