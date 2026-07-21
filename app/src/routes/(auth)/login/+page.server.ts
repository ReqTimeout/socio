import type { Actions, PageServerLoad } from "./$types";
import { fail, redirect } from "@sveltejs/kit";
import { db } from "@socio/db";
import { users, accounts, sessions } from "@socio/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { rateLimit } from "$lib/server/rate-limit";
import { maybeRehashPassword } from "$lib/server/auth";
import { dev } from "$app/environment";

const SESSION_COOKIE = "socio_session";

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

    // 1. Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
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

    // 4. Rehash legacy non-bcrypt hash if needed
    await maybeRehashPassword(user.id, password);

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

    // 6. Set our own session cookie
    cookies.set(SESSION_COOKIE, `${sessionId}.${token}`, {
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      expires: expiresAt,
    });

    throw redirect(303, "/");
  },
};