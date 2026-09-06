import { redirect, fail } from "@sveltejs/kit";
import { db } from "@socio/db";
import { users } from "@socio/db/schema";
import { eq } from "drizzle-orm";
import { verifyTotpForUser } from "$lib/server/2fa";
import { randomBytes } from "node:crypto";
import { sessions } from "@socio/db/schema";
import { setSocioSessionCookie } from "$lib/server/session";
import type { PageServerLoad, Actions } from "./$types";

export const load: PageServerLoad = async ({ cookies }) => {
  const pending = cookies.get("totp_pending");
  if (!pending) throw redirect(303, "/login");
  const userId = Number(pending);
  if (!Number.isFinite(userId)) throw redirect(303, "/login");
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw redirect(303, "/login");
  return { username: user.username };
};

export const actions: Actions = {
  default: async ({ request, cookies, getClientAddress }) => {
    const pending = cookies.get("totp_pending");
    if (!pending) return fail(400, { error: "Sesi 2FA kadaluarsa. Login ulang." });
    const userId = Number(pending);
    if (!Number.isFinite(userId)) return fail(400, { error: "Sesi 2FA tidak valid." });
    const form = await request.formData();
    const code = String(form.get("code") ?? "").trim();
    if (!code) return fail(400, { error: "Kode wajib diisi." });
    const ok = await verifyTotpForUser(userId, code);
    if (!ok) return fail(400, { error: "Kode salah atau kadaluarsa. Coba lagi atau pakai backup code." });

    // Create session (same as login)
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return fail(400, { error: "User tidak ditemukan." });
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
    setSocioSessionCookie(cookies, sessionId, token, expiresAt);
    cookies.delete("totp_pending", { path: "/" });
    throw redirect(303, user.level === "Admin" ? "/admin" : "/");
  },
};
