import { redirect, fail, error } from "@sveltejs/kit";
import { db } from "@socio/db";
import { users } from "@socio/db/schema";
import { eq } from "drizzle-orm";
import { assertAdmin, logAudit } from "$lib/server/admin";
import { setupTotpForUser, getTotpInfo, verifyAndEnable, getBackupCodesPlain, disableTotp } from "$lib/server/2fa";
import { decryptTotpSecret } from "$lib/server/2fa";
import { generateSecret, otpauthURL } from "@socio/core/totp";
import QRCode from "qrcode";
import bcrypt from "bcryptjs";
import type { PageServerLoad, Actions } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  assertAdmin(locals);
  const userId = Number(locals.user!.id);
  const info = await getTotpInfo(userId);
  const enabled = !!info?.enabled;
  let secret: string | null = null;
  let url: string | null = null;
  let qr: string | null = null;
  let backupCodes: string[] | null = null;

  if (!enabled) {
    // If no secret, generate one (setupTotpForUser does it). If already has secret but not enabled, reuse it.
    if (!info?.secret) {
      const res = await setupTotpForUser(userId, String(locals.user!.username ?? locals.user!.email));
      secret = res.secret;
      url = res.url;
      // QR will be generated below
    } else {
      try {
        secret = decryptTotpSecret(info.secret);
        url = otpauthURL(secret, String(locals.user!.username ?? locals.user!.email), "Socio.id");
      } catch {
        // If decrypt fails, regenerate
        const res = await setupTotpForUser(userId, String(locals.user!.username ?? locals.user!.email));
        secret = res.secret;
        url = res.url;
      }
    }
    if (url) {
      qr = await QRCode.toDataURL(url, { errorCorrectionLevel: "M", width: 260, margin: 1 });
    }
  } else {
    backupCodes = await getBackupCodesPlain(userId);
  }

  return { enabled, secret, url, qr, backupCodes, username: String(locals.user!.username ?? "") };
};

export const actions: Actions = {
  verify: async ({ request, locals }) => {
    assertAdmin(locals);
    const form = await request.formData();
    const code = String(form.get("code") ?? "").trim();
    if (!/^\d{6}$/.test(code.replace(/\s/g, ""))) return fail(400, { error: "Kode harus 6 digit." });
    const ok = await verifyAndEnable(Number(locals.user!.id), code);
    if (!ok) return fail(400, { error: "Kode salah atau kadaluarsa. Coba lagi." });
    const codes = await getBackupCodesPlain(Number(locals.user!.id));
    await logAudit({
      adminId: Number(locals.user!.id),
      action: "2fa_enable",
      entity: "user",
      entityId: Number(locals.user!.id),
      ip: (locals as any).ip,
    });
    return { success: "2FA diaktifkan. Simpan backup code di bawah — hanya tampil sekali.", codes };
  },
  disable: async ({ request, locals }) => {
    assertAdmin(locals);
    const form = await request.formData();
    const password = String(form.get("password") ?? "");
    const code = String(form.get("code") ?? "").trim();
    // Require password check via accounts table (reuse login logic)
    const { accounts, users: usersTbl } = await import("@socio/db/schema");
    const [user] = await db.select().from(usersTbl).where(eq(usersTbl.id, Number(locals.user!.id))).limit(1);
    if (!user) throw error(404, "User not found");
    const [account] = await db.select().from(accounts).where(eq(accounts.userId, String(user.id))).limit(1);
    if (!account?.password) return fail(400, { error: "Akun tidak punya password." });
    if (!bcrypt.compareSync(password, account.password)) return fail(400, { error: "Password salah." });
    // If code provided, verify it (TOTP or backup)
    if (code) {
      const { verifyTotpForUser } = await import("$lib/server/2fa");
      const ok = await verifyTotpForUser(Number(locals.user!.id), code);
      if (!ok) return fail(400, { error: "Kode 2FA salah." });
    } else {
      // No code — check if super_admin can override? For now require code if enabled
      const info = await getTotpInfo(Number(locals.user!.id));
      if (info?.enabled) return fail(400, { error: "Butuh kode 2FA untuk disable." });
    }
    await disableTotp(Number(locals.user!.id));
    await logAudit({
      adminId: Number(locals.user!.id),
      action: "2fa_disable",
      entity: "user",
      entityId: Number(locals.user!.id),
      ip: (locals as any).ip,
    });
    return { success: "2FA dimatikan." };
  },
  regenerate: async ({ locals }) => {
    assertAdmin(locals);
    const userId = Number(locals.user!.id);
    // Force regenerate secret (disable first)
    await disableTotp(userId);
    const res = await setupTotpForUser(userId, String(locals.user!.username ?? locals.user!.email));
    const qr = await QRCode.toDataURL(res.url, { errorCorrectionLevel: "M", width: 260, margin: 1 });
    return { regenerated: true, secret: res.secret, url: res.url, qr, codes: res.codes };
  },
};
