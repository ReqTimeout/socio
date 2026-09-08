import { redirect, fail } from "@sveltejs/kit";
import { assertAdmin, assertAdminRate, logAudit } from "$lib/server/admin";
import { getCronStatus } from "$lib/server/cron-runs";
import { triggerCronJob } from "../../../../cron";
import type { PageServerLoad, Actions } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(303, "/login");
  if ((locals.user as any).level !== "Admin") throw redirect(303, "/");
  const jobs = await getCronStatus();
  return { jobs };
};

export const actions: Actions = {
  run: async ({ request, locals }) => {
    assertAdmin(locals);
    const r = await assertAdminRate("cron-run", (locals as any).ip ?? "0.0.0.0", 10, 60);
    if (r) return r;
    const form = await request.formData();
    const key = String(form.get("key") ?? "");
    if (!key) return fail(400, { error: "Job wajib dipilih." });
    try {
      const label = await triggerCronJob(key, Number(locals.user!.id));
      await logAudit({
        adminId: Number(locals.user!.id),
        action: "cron_run",
        entity: "cron",
        entityId: key,
        ip: (locals as any).ip,
      });
      return { success: `${label} dimulai di background — refresh untuk lihat hasil.` };
    } catch (e: any) {
      return fail(400, { error: e?.message ?? "Gagal menjalankan job." });
    }
  },
};
