/**
 * TOTP helpers — RFC 6238 (TOTP = HOTP with time step)
 * - Secret: base32 (RFC 4648)
 * - Algorithm: HMAC-SHA1, 6 digits, 30s step, window ±1 (90s tolerance)
 * No external deps — uses Node crypto (WebCrypto compatible via crypto.subtle if needed).
 */
import { createHmac, randomBytes } from "node:crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  while (out.length % 8 !== 0) out += "=";
  return out;
}

function base32Decode(str: string): Buffer {
  const clean = str.replace(/=+$/, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const ch of clean) {
    const idx = ALPHABET.indexOf(ch);
    if (idx === -1) throw new Error(`Invalid base32 char: ${ch}`);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function hotp(secret: Buffer, counter: number, digits = 6): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter), 0);
  const hmac = createHmac("sha1", secret).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 10 ** digits).padStart(digits, "0");
}

export function generateSecret(bytes = 20): string {
  return base32Encode(randomBytes(bytes));
}

export function generateTOTP(secretBase32: string, time = Date.now()): string {
  const secret = base32Decode(secretBase32);
  const counter = Math.floor(time / 1000 / 30);
  return hotp(secret, counter, 6);
}

export function verifyTOTP(secretBase32: string, token: string, window = 1, time = Date.now()): boolean {
  const clean = token.replace(/\s/g, "");
  if (!/^\d{6}$/.test(clean)) return false;
  const secret = base32Decode(secretBase32);
  const counter = Math.floor(time / 1000 / 30);
  for (let i = -window; i <= window; i++) {
    if (hotp(secret, counter + i, 6) === clean) return true;
  }
  return false;
}

export function otpauthURL(secretBase32: string, label: string, issuer = "Socio.id"): string {
  const encLabel = encodeURIComponent(label);
  const encIssuer = encodeURIComponent(issuer);
  return `otpauth://totp/${encIssuer}:${encLabel}?secret=${secretBase32}&issuer=${encIssuer}&algorithm=SHA1&digits=6&period=30`;
}

export function generateBackupCodes(count = 10): string[] {
  return Array.from({ length: count }, () => {
    const b = randomBytes(5).toString("hex").toUpperCase(); // 10 hex chars
    return `${b.slice(0, 5)}-${b.slice(5)}`;
  });
}

export function normalizeBackupCode(code: string): string {
  return code.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}
