import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(303, "/login");
  return {
    user: {
      id: locals.user.id,
      name: locals.user.fullName ?? locals.user.username,
      username: locals.user.username,
      email: locals.user.email,
      level: locals.user.level,
      balance: locals.user.balance ?? 0,
      apiKey: (locals.user as any).apiKey ?? "",
    },
  };
};
