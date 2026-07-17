/**
 * Client-side Cloudflare Turnstile helper.
 * Loads the widget script once, then renders a widget into a container and
 * resolves with the token. The token is verified server-side in
 * `$lib/server/turnstile.ts` — never trust the client.
 */

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";
let scriptPromise: Promise<void> | null = null;

declare global {
  interface Window {
    turnstile?: {
      render: (el: string | HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id?: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

function loadScript(sitekey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      if (window.turnstile) resolve();
      else window.onTurnstileLoad = () => resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => resolve();
    window.onTurnstileLoad = () => resolve();
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export interface TurnstileHandle {
  token: Promise<string>;
  reset: () => void;
}

/**
 * Render a Turnstile widget into `containerId`. Resolves with the token once
 * the user passes the challenge. If no sitekey is configured (dev), resolves
 * with an empty string immediately (server allows in dev).
 */
export function renderTurnstile(
  containerId: string,
  sitekey: string,
  action?: string,
): TurnstileHandle {
  let widgetId: string | undefined;
  const token = loadScript(sitekey).then(
    () =>
      new Promise<string>((resolve) => {
        const el = document.getElementById(containerId);
        if (!el) return resolve("");
        if (!sitekey || sitekey.startsWith("0x")) {
          // No real key configured — dev mode. Resolve empty, server allows.
          if (!sitekey) return resolve("");
        }
        window.onTurnstileLoad = () => {
          if (!window.turnstile || !el) return resolve("");
          widgetId = window.turnstile.render(el, {
            sitekey,
            action,
            callback: (t: string) => resolve(t),
            "expired-callback": () => resolve(""),
            "error-callback": () => resolve(""),
          });
        };
        if (window.turnstile) window.onTurnstileLoad();
      }),
  );

  return {
    token,
    reset: () => {
      if (widgetId && window.turnstile) window.turnstile.reset(widgetId);
    },
  };
}
