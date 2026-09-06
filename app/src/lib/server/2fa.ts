/**
 * Server helpers for TOTP 2FA — encrypt at rest, backup codes.
 * Secret is AES-256-GCM encrypted with key derived from SOCIO_AUTH_SECRET.
 * Backup codes are stored as encrypted JSON array in users.totp_backup_codes.
 */
import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";
import { db } from "@socio/db";
import { users } from "@socio/db/schema";
import { eq } from "drizzle-orm";
import {
  generateSecret,
  generateBackupCodes,
  normalizeBackupCode,
  verifyTOTP,
  otpauthURL,
} from "@socio/core/totp";

function keyFromSecret(): Buffer {
  const raw = process.env.SOCIO_AUTH_SECRET ?? "socio-dev-secret";
  return createHash("sha256").update(raw).digest(); // 32 bytes
}

export function encryptTotpSecret(plain: string): string {
  const key = keyFromSecret();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

export function decryptTotpSecret(enc: string): string {
  const [ivHex, tagHex, dataHex] = enc.split(":");
  if (!ivHex || !tagHex || !dataHex) throw new Error("Invalid encrypted secret format");
  const key = keyFromSecret();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const dec = Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]);
  return dec.toString("utf8");
}

export async function getTotpInfo(userId: number) {
  const [row] = await db
    .select({
      secret: users.totpSecret,
      enabled: users.totpEnabled,
      backupCodes: users.totpBackupCodes,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row ?? null;
}

export async function setupTotpForUser(userId: number, username: string) {
  const secret = generateSecret(20);
  const url = otpauthURL(secret, username, "Socio.id");
  const enc = encryptTotpSecret(secret);
  const codes = generateBackupCodes(10);
  const encCodes = encryptTotpSecret(JSON.stringify(codes));
  await db
    .update(users)
    .set({ totpSecret: enc, totpBackupCodes: encCodes, totpEnabled: false })
    .where(eq(users.id, userId));
  return { secret, url, codes };
}

export async function verifyAndEnable(userId: number, token: string): Promise<boolean> {
  const info = await getTotpInfo(userId);
  if (!info?.secret) return false;
  let plain: string;
  try {
    plain = decryptTotpSecret(info.secret);
  } catch {
    return false;
  }
  if (!verifyTOTP(plain, token, 1)) return false;
  await db.update(users).set({ totpEnabled: true }).where(eq(users.id, userId));
  return true;
}

export async function verifyTotpForUser(userId: number, token: string): Promise<boolean> {
  const info = await getTotpInfo(userId);
  if (!info?.secret || !info.enabled) return false;
  let plain: string;
  try {
    plain = decryptTotpSecret(info.secret);
  } catch {
    return false;
  }
  // Try TOTP first
  if (verifyTOTP(plain, token, 1)) return true;
  // Try backup code
  if (!info.backupCodes) return false;
  let codes: string[] = [];
  try {
    const dec = decryptTotpSecret(info.backupCodes);
    codes = JSON.parse(dec) as string[];
  } catch {
    return false;
  }
  const norm = normalizeBackupCode(token);
  const idx = codes.findIndex((c) => normalizeBackupCode(c) === norm);
  if (idx === -1) return false;
  // Consume backup code (remove it)
  codes.splice(idx, 1);
  const encCodes = encryptTotpSecret(JSON.stringify(codes));
  await db.update(users).set({ totpBackupCodes: encCodes }).where(eq(users.id, userId));
  return true;
}

export async function disableTotp(userId: number) {
  await db
    .update(users)
    .set({ totpSecret: "", totpEnabled: false, totpBackupCodes: null })
    .where(eq(users.id, userId));
}

export async function getBackupCodesPlain(userId: number): Promise<string[] | null> {
  const info = await getTotpInfo(userId);
  if (!info?.backupCodes) return null;
  try {
    const dec = decryptTotpSecret(info.backupCodes);
    return JSON.parse(dec) as string[];
  } catch {
    return null;
  }
}
