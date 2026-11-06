import type { Actions, PageServerLoad } from "./$types";
import { fail, redirect } from "@sveltejs/kit";
import { db } from "@socio/db";
import { users, accounts, sessions } from "@socio/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { rateLimit } from "$lib/server/rate-limit";
import { maybeRehashPassword } from "$lib/server/auth";
import { setSocioSessionCookie } from "$lib/server/session";
import { verifyTurnstile, TURNSTILE_SITEKEY } from "$lib/server/turnstile";

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.session) throw redirect(303, "/");
  return { turnstileSitekey: TURNSTILE_SITEKEY };
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

    // 0. Turnstile (skipped automatically when SOCIO_TURNSTILE_ENABLED != 1)
    const turnstileToken = String(form.get("turnstile") ?? "");
    if (!(await verifyTurnstile(turnstileToken))) {
      return fail(400, { error: "Verifikasi gagal. Coba lagi.", email });
    }

    // 1. Find user by email
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      return fail(401, { error: "Email atau password salah.", email });
    }

    // 2. Find credential account for this user
    const [account] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, String(user.id)))
      .limit(1);
    if (!account || !account.password) {
      return fail(401, { error: "Email atau password salah.", email });
    }

    // 3. Verify password (bcrypt)
    const ok = bcrypt.compareSync(password, account.password);
    if (!ok) {
      return fail(401, { error: "Email atau password salah.", email });
    }

    // G2 retire-verify: gate verifikasi email Member/Agen (U-02) DIHAPUS —
    // signup member tidak lagi mengirim email verifikasi, jadi login langsung
    // boleh. Aktivasi reseller kini lewat users.reseller_activated (bukan
    // verify) dan hanya menggating order di /pesan, bukan login.

    // V-LOGIN-SUSPENDED: tahan akun suspended/blacklist agar tidak bisa login.
    // PHP legacy pakai kolom `status` varchar "1"/"0" + "Blacklist" untuk permanent.
    if (user.status === "0" || user.status === "Blacklist") {
      return fail(403, {
        error:
          user.status === "Blacklist"
            ? "Akun kamu di-blacklist. Hubungi admin untuk info lebih lanjut."
            : "Akun kamu disuspend. Hubungi admin untuk aktivasi ulang.",
        email,
        suspended: true,
      });
    }

    // 4. Rehash legacy non-bcrypt hash if needed
    await maybeRehashPassword(user.id, password);

    // 4b. 2FA check for admin (P3-02): if TOTP enabled, require second factor
    // We check raw DB flag (users.totp_enabled) — if true, don't create session yet.
    const totpEnabled = !!(user as any).totpEnabled;
    if (user.level === "Admin" && totpEnabled) {
      // Set short-lived pending cookie (5 min) with userId, redirect to verify
      cookies.set("totp_pending", String(user.id), {
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 300,
      });
      throw redirect(303, "/admin/2fa/verify");
    }

    // 5. Create session row in DB
    const token = randomBytes(24).toString("hex");
    const sessionId = randomBytes(16).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.insert(sessions).values({
      id: sessionId,
      userId: String(user.id),
      token,
      expiresAt,
      ipAddress: getClientAddress(),
      userAgent: request.headers.get("user-agent") ?? "",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 6. Set our own session cookie (custom — see $lib/server/session.ts)
    setSocioSessionCookie(cookies, sessionId, token, expiresAt);

    // Admin langsung ke command center, user lain ke dashboard
    throw redirect(303, user.level === "Admin" ? "/admin" : "/");
  },
};
