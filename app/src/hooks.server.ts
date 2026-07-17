import { config } from "dotenv";
config({ path: new URL("../.env", import.meta.url).pathname });
import { auth } from "$lib/server/auth";
import { sequence } from "@sveltejs/kit/hooks";
import { getSetting } from "$lib/server/admin";
import type { Handle } from "@sveltejs/kit";

async function authHook({ event, resolve }: Parameters<Handle>[0]) {
  const session = await auth.api.getSession({ headers: event.request.headers });
  event.locals.session = session?.session ?? null;
  event.locals.user = session?.user ?? null;
  return resolve(event);
}

async function maintenanceHook({ event, resolve }: Parameters<Handle>[0]) {
  const path = event.url.pathname;
  const isStatic =
    path.startsWith("/manifest") ||
    path.startsWith("/icon") ||
    path.startsWith("/_app") ||
    path.startsWith("/api/auth");
  const isAdmin = path.startsWith("/admin") || path.startsWith("/login");
  if (isStatic || isAdmin) return resolve(event);

  if ((await getSetting("maintenance_mode")) === "1") {
    const level = (event.locals.user as any)?.level;
    if (level !== "Admin") {
      return new Response("Sistem sedang maintenance. Silakan coba beberapa saat lagi.", {
        status: 503,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
  }
  return resolve(event);
}

export const handle = sequence(authHook, maintenanceHook);
