import { redirect } from "@sveltejs/kit";
import { ensureAdminSchema } from "@socio/db/ensure";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ locals, request }) => {
  if (!locals.user) throw redirect(303, "/login");
  if ((locals.user as any).level !== "Admin") throw redirect(303, "/");

  await ensureAdminSchema();

  const ip =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "0.0.0.0";

  return {
    admin: {
      id: locals.user.id,
      name: locals.user.fullName ?? locals.user.username,
      username: locals.user.username,
      level: (locals.user as any).level,
    },
    ip,
  };
};
