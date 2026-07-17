import type { Actions, PageServerLoad } from "./$types";
import { fail } from "@sveltejs/kit";
import { auth } from "$lib/server/auth";
import { verifyTurnstile, TURNSTILE_SITEKEY } from "$lib/server/turnstile";
import { rateLimit } from "$lib/server/rate-limit";
import { dev } from "$app/environment";

export const load: PageServerLoad = async () => {
  return { turnstileSitekey: dev ? "" : TURNSTILE_SITEKEY };
};

export const actions: Actions = {
  default: async ({ request, getClientAddress, url }) => {
    const data = await request.formData();
    const email = String(data.get("email") ?? "")
      .trim()
      .toLowerCase();
    const turnstileToken = String(data.get("turnstile") ?? "");

    if (!email) return fail(400, { error: "Masukkan email Anda." });

    const allowed = await rateLimit(`forgot:${getClientAddress()}`, {
      limit: 5,
      windowSec: 900,
    });
    if (!allowed)
      return fail(429, {
        error: "Terlalu banyak permintaan. Coba lagi nanti.",
      });

    const ok = await verifyTurnstile(turnstileToken, getClientAddress());
    if (!ok)
      return fail(400, {
        error: "Verifikasi humans failed. Refresh and try again.",
      });

    // Always return success to avoid account enumeration.
    try {
      await auth.api.forgetPassword({
        body: { email, redirectTo: "/reset" },
        headers: request.headers,
      });
    } catch {
      // ignore
    }
    return { success: true };
  },
};
