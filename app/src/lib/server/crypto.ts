import crypto from "node:crypto";

const ALGO = "aes-256-gcm";

/**
 * Derive a stable 32-byte key from env. Prefer a dedicated
 * SOCIO_PROVIDER_ENC_KEY; fall back to AUTH_SECRET so it works without
 * extra env setup (still 256-bit via SHA-256).
 */
function getKey(): Buffer {
  const raw =
    process.env.SOCIO_PROVIDER_ENC_KEY?.trim() || process.env.SOCIO_AUTH_SECRET?.trim() || "";
  if (!raw) throw new Error("Missing SOCIO_PROVIDER_ENC_KEY / SOCIO_AUTH_SECRET");
  return crypto.createHash("sha256").update(raw).digest();
}

const PREFIX = "enc:";

/** Encrypt a secret (API key, token) for at-rest storage. */
export function encryptSecret(plain: string): string {
  if (!plain) return plain;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, enc]).toString("base64");
}

/** Decrypt a stored secret. Plaintext (no prefix) passes through untouched. */
export function decryptSecret(stored: string | null | undefined): string {
  if (!stored) return "";
  if (!stored.startsWith(PREFIX)) return stored; // belum terenkripsi
  const buf = Buffer.from(stored.slice(PREFIX.length), "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

/** True if a stored value looks encrypted (for UI masking). */
export function isEncrypted(stored: string | null | undefined): boolean {
  return !!stored && stored.startsWith(PREFIX);
}
