import { dev } from "$app/environment";

const TURNSTILE_SECRET = dev
  ? (process.env.SOCIO_TURNSTILE_SECRET ?? "")
  : (process.env.SOCIO_TURNSTILE_SECRET ?? "");

interface TurnstileResponse {
  success: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
}

/**
 * Verify a Turnstile token server-side.
 * Never call this from the browser — the secret must stay server-only.
 * Docs: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */
export async function verifyTurnstile(token: string, remoteIp?: string): Promise<boolean> {
  if (!TURNSTILE_SECRET) {
    // No secret configured → skip Turnstile gate (dev + unconfigured prod).
    return true;
  }
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: TURNSTILE_SECRET,
        response: token,
        ...(remoteIp ? { remoteip: remoteIp } : {}),
      }),
    });
    const data = (await res.json()) as TurnstileResponse;
    return data.success === true;
  } catch {
    return false;
  }
}

export const TURNSTILE_SITEKEY = dev
  ? (process.env.SOCIO_TURNSTILE_SITEKEY ?? "0x4AAAAAAD3RtU-MhZPHl3Fw")
  : (process.env.SOCIO_TURNSTILE_SITEKEY ?? "0x4AAAAAAD3RtU-MhZPHl3Fw");
