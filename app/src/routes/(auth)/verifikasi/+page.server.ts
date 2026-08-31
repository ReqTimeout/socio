import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";
import { db } from "@socio/db";
import { users, verifications } from "@socio/db/schema";
import { eq, and, like, gt } from "drizzle-orm";

export const load: PageServerLoad = async ({ url }) => {
  const token = url.searchParams.get("token") ?? "";
  const email = (url.searchParams.get("email") ?? "").trim().toLowerCase();

  // Kirim ulang verifikasi (jika user gagal login & klik "Kirim ulang").
  if (url.searchParams.get("resend") === "1" && email) {
    try {
      const [u] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      if (u) {
        const { sendMemberVerificationEmail } = await import("$lib/server/signup");
        await sendMemberVerificationEmail(Number(u.id));
      }
    } catch {
      // best-effort — silent
    }
    return { ok: null as boolean | null, resent: true, email };
  }

  if (!token) throw redirect(303, "/login");

  // V-01 fix: verifikasi langsung via DB. better-auth 1.2.7 `verifyEmail`
  // mengharapkan token JWT ber-signature (jwtVerify) — token legacy kita adalah
  // hex mentah di `verifications.value` (dibuat sendMemberVerificationEmail),
  // jadi lewat better-auth selalu gagal. Lagipula better-auth menulis boolean ke
  // kolom varchar legacy `verify` ("Yes"/"No") — tidak pernah jadi "Yes".
  const [row] = await db
    .select()
    .from(verifications)
    .where(
      and(
        like(verifications.identifier, "email-verification:%"),
        eq(verifications.value, token),
        gt(verifications.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!row) {
    return { ok: false as boolean | null, resent: false, email };
  }

  const userEmail = row.identifier.slice("email-verification:".length);
  const [u] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, userEmail))
    .limit(1);
  if (u) {
    await db.update(users).set({ verify: "Yes" }).where(eq(users.id, u.id));
  }
  // Konsumsi token: hapus semua token verifikasi email ini (sekali pakai + bersihkan resend duplikat).
  await db
    .delete(verifications)
    .where(like(verifications.identifier, `email-verification:${userEmail}`));

  return { ok: true as boolean | null, resent: false, email: userEmail };
};
