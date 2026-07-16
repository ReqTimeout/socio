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
    password: {
      // better-auth expects async hash/verify
      hash: async (password: string) => bcrypt.hashSync(password, 10),
      verify: async ({ hash, password }: { hash: string; password: string }) =>
        bcrypt.compareSync(password, hash),
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
    },
    additionalFields: {
      username: { type: "string", required: true },
      balance: { type: "number", defaultValue: 0 },
      level: { type: "string", defaultValue: "Member" },
      apiKey: { type: "string", defaultValue: "" },
    },
  },
  secret: process.env.SOCIO_AUTH_SECRET ?? "dev-insecure-secret-change-me",
});

export { db, schema };
