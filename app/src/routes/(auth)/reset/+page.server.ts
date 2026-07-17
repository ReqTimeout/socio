import type { Actions, PageServerLoad } from "./$types";
import { fail, redirect } from "@sveltejs/kit";
import { auth } from "$lib/server/auth";

export const load: PageServerLoad = async ({ url }) => {
  const token = url.searchParams.get("token") ?? "";
  if (!token) throw redirect(303, "/login");
  return { token };
};

export const actions: Actions = {
  default: async ({ request }) => {
    const data = await request.formData();
    const token = String(data.get("token") ?? "");
    const password = String(data.get("password") ?? "");
    const confirm = String(data.get("confirm") ?? "");

    if (!token) return fail(400, { error: "Token tidak valid." });
    if (password.length < 8)
      return fail(400, { error: "Password minimal 8 karakter." });
    if (password !== confirm)
      return fail(400, { error: "Konfirmasi password tidak cocok." });

    try {
      await auth.api.resetPassword({
        body: { newPassword: password, token },
        headers: request.headers,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal reset password.";
      return fail(400, { error: msg });
    }
    throw redirect(303, "/login?reset=1");
  },
};
