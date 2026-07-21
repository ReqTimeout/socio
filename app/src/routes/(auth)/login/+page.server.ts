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

    // Use better-auth's full HTTP handler so cookie signing/setting is consistent.
    const betterAuthUrl = new URL("/api/auth/sign-in/email", request.url);
    const betterAuthReq = new Request(betterAuthUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: request.headers.get("cookie") ?? "",
        "x-forwarded-for": request.headers.get("x-forwarded-for") ?? "",
      },
      body: JSON.stringify({ email, password }),
    });
    let authRes: Response;
    try {
      authRes = await auth.handler(betterAuthReq);
    } catch {
      return fail(401, { error: "Email atau password salah.", email });
    }
    if (!authRes.ok) {
      return fail(401, { error: "Email atau password salah.", email });
    }

    // Forward each Set-Cookie verbatim via SvelteKit's cookies API.
    const setCookies: string[] = (authRes.headers as Headers).getSetCookie?.() ?? [];
    for (const sc of setCookies) {
      const semi = sc.indexOf(";");
      const pair = semi === -1 ? sc : sc.slice(0, semi);
      const eq = pair.indexOf("=");
      const name = pair.slice(0, eq);
      const value = pair.slice(eq + 1);
      const attrs: Record<string, string> = {};
      if (semi !== -1) {
        for (const a of sc.slice(semi + 1).split(";")) {
          const [k, ...v] = a.trim().split("=");
          attrs[k.toLowerCase()] = v.join("=") || "";
        }
      }
      cookies.set(name, value, {
        path: attrs["path"] || "/",
        httpOnly: true,
        secure: !!attrs["secure"],
        sameSite: (attrs["samesite"] as any) || "lax",
        expires: attrs["expires"] ? new Date(attrs["expires"]) : undefined,
      });
    }

    const body: any = await authRes.clone().json().catch(() => ({}));
    if (!body?.user) {
      return fail(401, { error: "Email atau password salah.", email });
    }
    await maybeRehashPassword(body.user.id, password);

    throw redirect(303, "/");
  },
};
