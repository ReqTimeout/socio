import { db } from "@socio/db";
import { users } from "@socio/db/schema";
import { eq } from "drizzle-orm";
import { redirect, fail } from "@sveltejs/kit";
import bcrypt from "bcryptjs";
import type { PageServerLoad, Actions } from "./$types";

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
      theme: (locals.user as any).theme ?? "light",
    },
  };
};

export const actions: Actions = {
  profile: async ({ request, locals }) => {
    const form = await request.formData();
    const name = String(form.get("name") ?? "").trim();
    if (!name) return fail(400, { error: "Nama wajib diisi." });
    await db
      .update(users)
      .set({ fullName: name })
      .where(eq(users.id, Number(locals.user!.id)));
    return { success: "Profil diperbarui." };
  },

  password: async ({ request, locals }) => {
    const form = await request.formData();
    const current = String(form.get("current") ?? "");
    const next = String(form.get("next") ?? "");
    if (!current || !next) return fail(400, { error: "Semua field wajib diisi." });
    if (next.length < 8) return fail(400, { error: "Password baru minimal 8 karakter." });

    const [u] = await db
      .select({ password: users.password })
      .from(users)
      .where(eq(users.id, Number(locals.user!.id)))
      .limit(1);
    if (!u || !bcrypt.compareSync(current, u.password)) {
      return fail(400, { error: "Password saat ini salah." });
    }
    await db
      .update(users)
      .set({ password: bcrypt.hashSync(next, 10) })
      .where(eq(users.id, Number(locals.user!.id)));
    return { success: "Password diperbarui." };
  },

  theme: async ({ request, locals }) => {
    const form = await request.formData();
    const theme = String(form.get("theme") ?? "light") as "light" | "dark";
    await db
      .update(users)
      .set({ theme })
      .where(eq(users.id, Number(locals.user!.id)));
    return { success: "Tema diperbarui." };
  },
};
