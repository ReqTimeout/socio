import { auth } from "$lib/server/auth";
import { sequence } from "@sveltejs/kit/hooks";
import type { Handle } from "@sveltejs/kit";

async function authHook({ event, resolve }: Parameters<Handle>[0]) {
  const session = await auth.api.getSession({ headers: event.request.headers });
  event.locals.session = session?.session ?? null;
  event.locals.user = session?.user ?? null;
  return resolve(event);
}

export const handle = sequence(authHook);
