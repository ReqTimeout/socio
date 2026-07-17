import { redirect, fail } from "@sveltejs/kit";
import { getSetting, setSetting, logAudit } from "$lib/server/admin";
import type { PageServerLoad, Actions } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(303, "/login");
  const maintenance = await getSetting("maintenance_mode");
  return { maintenance: maintenance === "1" };
};

export const actions: Actions = {
  maintenance: async ({ request, locals }) => {
    const form = await request.formData();
    const on = form.get("on") === "1";
    await setSetting("maintenance_mode", on ? "1" : "0");
    await logAudit({
      adminId: Number(locals.user!.id),
      action: on ? "enable_maintenance" : "disable_maintenance",
      entity: "system",
      ip: (locals as any).ip,
    });
    return { success: on ? "Maintenance mode AKTIF." : "Maintenance mode nonaktif." };
  },
};
