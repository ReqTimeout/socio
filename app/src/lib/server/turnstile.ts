import { dev } from "$app/environment";

/**
 * Turnstile is OPT-IN via SOCIO_TURNSTILE_ENABLED=1.
 * When disabled (default) the widget is never rendered and verification is
 * skipped, so auth can never be blocked by a missing/broken challenges config.
 * This prevents the earlier incident where test keys in a container env
 * blocked ALL logins (git: "fix(login): disable Turnstile gate").
 */
const TURNSTILE_ENABLED = process.env.SOCIO_TURNSTILE_ENABLED === "1";

const TURNSTILE_SECRET = TURNSTILE_ENABLED ? (process.env.SOCIO_TURNSTILE_SECRET ?? "") : "";

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
  // Disabled (no SOCIO_TURNSTILE_ENABLED=1) → skip gate entirely (safe default).
  if (!TURNSTILE_ENABLED) return true;
  // Dev never renders the widget (the load fn returns an empty sitekey), so
  // there is no token to verify — skip the gate to match client behaviour.
  if (dev) return true;
  if (!TURNSTILE_SECRET) {
    // No secret configured → skip Turnstile gate (unconfigured prod).
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

export const TURNSTILE_SITEKEY = TURNSTILE_ENABLED
  ? (process.env.SOCIO_TURNSTILE_SITEKEY ?? "")
  : "";
