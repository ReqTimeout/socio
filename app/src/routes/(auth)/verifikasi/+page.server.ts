import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";
import { auth } from "$lib/server/auth";

export const load: PageServerLoad = async ({ url }) => {
  const token = url.searchParams.get("token") ?? "";
  if (!token) throw redirect(303, "/login");
  try {
    await auth.api.verifyEmail({
      query: { token },
      headers: new Headers(),
    });
    return { ok: true };
  } catch {
    return { ok: false };
  }
};
