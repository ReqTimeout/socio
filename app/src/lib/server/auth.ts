import { db } from "@socio/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { users, sessions, verifications, accounts } from "@socio/db/schema";
import * as schema from "@socio/db/schema";

/**
 * custom password hashing compatible with legacy PHP password_hash ($2y$ / bcrypt).
 * bcryptjs handles $2y$ natively in compareSync/hashSync.
 */
import bcrypt from "bcryptjs";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "mysql",
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: false,
    },
    sendResetPassword: async ({ user, url }: { user: { email: string; name?: string }; url: string }) => {
      const { sendEmail, resetPasswordEmail } = await import("./email");
      await sendEmail({
        to: user.email,
        subject: "Reset password — Socio.id",
        ...resetPasswordEmail(url),
      });
    },
    sendVerificationEmail: async ({ user, url }: { user: { email: string; name?: string }; url: string }) => {
      const { sendEmail, verificationEmail } = await import("./email");
      const base = process.env.SOCIO_APP_URL ?? "https://app.socio.id";
      const token = new URL(url).searchParams.get("token") ?? "";
      const verifyLink = `${base}/verifikasi?token=${token}`;
      await sendEmail({
        to: user.email,
        subject: "Verifikasi email — Socio.id",
        ...verificationEmail(verifyLink),
      });
    },
    password: {
      // better-auth expects async hash/verify
      hash: async (password: string) => bcrypt.hashSync(password, 10),
      verify: async (data: { password: string; hash?: string } | string, hash?: string) => {
        const pw = typeof data === "string" ? data : data.password;
        const h = typeof data === "string" ? hash : data.hash;
        return bcrypt.compareSync(pw ?? "", h ?? "");
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },
  user: {
    // map legacy column names
    fields: {
      email: "email",
      name: "fullName",
      emailVerified: "verify",
      image: "has",
      password: "password",
    },
    additionalFields: {
      username: { type: "string", required: true },
      balance: { type: "number", defaultValue: 0 },
      level: { type: "string", defaultValue: "Member" },
      apiKey: { type: "string", defaultValue: "" },
    },
  },
  secret: process.env.SOCIO_AUTH_SECRET ?? "dev-insecure-secret-change-me",
  baseURL: process.env.SOCIO_APP_URL ?? process.env.BETTER_AUTH_URL ?? undefined,
});

/**
 * Rehash-on-login: legacy PHP hashes may not be bcrypt (some dumps use a
 * different scheme). After a successful login with a plain (bcrypt-compatible)
 * password, upgrade the stored hash to bcrypt so future logins are uniform.
 * No mass reset — invisible to the user.
 */
export async function maybeRehashPassword(
  userId: number | string,
  plainPassword: string,
): Promise<void> {
  try {
    const rows = await db
      .select({ password: users.password })
      .from(users)
      .where(eq(users.id, Number(userId)))
      .limit(1);
    const current = rows[0]?.password ?? "";
    const isBcrypt =
      current.startsWith("$2a$") || current.startsWith("$2b$") || current.startsWith("$2y$");
    if (isBcrypt) return; // already bcrypt, nothing to do
    await db
      .update(users)
      .set({ password: bcrypt.hashSync(plainPassword, 10) })
      .where(eq(users.id, Number(userId)));
  } catch {
    // best-effort: never break login on rehash failure
  }
}

import { eq } from "drizzle-orm";

export { db, schema };
