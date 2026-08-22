import { json } from "@sveltejs/kit";
import { db } from "@socio/db";
import { sessions } from "@socio/db/schema";
import { eq } from "drizzle-orm";
import { clearSocioSessionCookie, SESSION_COOKIE } from "$lib/server/session";

export const POST = async ({ cookies }: { cookies: any }) => {
  const cookie = cookies.get(SESSION_COOKIE);
  if (cookie) {
    const dot = cookie.indexOf(".");
    const token = dot >= 0 ? cookie.slice(dot + 1) : "";
    if (token) {
      // Hapus session row di DB kalau ada
      try {
        await db.delete(sessions).where(eq(sessions.token, token));
      } catch {
        // ignore — biar logout tetep jalan walau DB error
      }
    }
    clearSocioSessionCookie(cookies);
  }
  return json({ ok: true });
};
