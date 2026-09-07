import { redirect, fail } from "@sveltejs/kit";
import { db } from "@socio/db";
import { adminRoles } from "@socio/db/schema";
import { eq } from "drizzle-orm";
import { normalizeRole, can } from "@socio/core/rbac";
import { assertAdmin, assertAdminRate } from "$lib/server/admin";
import { runBackup, listBackups, deleteBackup } from "$lib/server/backup";
import type { PageServerLoad, Actions } from "./$types";

function rbac(locals: App.Locals) {
  return locals.user ? (can(normalizeRole(((locals as any).adminRole ?? "viewer")), "backup:manage") ? null : "no_permission") : "no_user";
}

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(303, "/login");
  if ((locals.user as any).level !== "Admin") throw redirect(303, "/");
  // RBAC: backup:manage — super_admin / admin only
  const [roleRow] = await db.select({ role: adminRoles.role }).from(adminRoles).where(eq(adminRoles.userId, Number(locals.user.id))).limit(1);
  if (!can(normalizeRole(roleRow?.role ?? "admin"), "backup:manage")) throw redirect(303, "/admin");

  const backups = await listBackups();
  return { backups };
};

export const actions: Actions = {
  run: async ({ request, locals }) => {
    assertAdmin(locals);
    const r = await assertAdminRate("backup-run", (locals as any).ip ?? "0.0.0.0", 2, 60);
    if (r) return r;

    const [roleRow] = await db.select({ role: adminRoles.role }).from(adminRoles).where(eq(adminRoles.userId, Number(locals.user!.id))).limit(1);
    if (!can(normalizeRole(roleRow?.role ?? "admin"), "backup:manage")) return fail(403, { error: "Role kamu tidak punya backup:manage." });

    try {
      const result = await runBackup(Number(locals.user!.id), (locals as any).ip);
      return { success: `Backup selesai · ${(result.sizeBytes / 1024 / 1024).toFixed(2)} MB` };
    } catch (e: any) {
      return fail(500, { error: e?.message ?? "Backup gagal." });
    }
  },
  delete: async ({ request, locals }) => {
    assertAdmin(locals);
    const r = await assertAdminRate("backup-delete", (locals as any).ip ?? "0.0.0.0", 5, 60);
    if (r) return r;
    const [roleRow] = await db.select({ role: adminRoles.role }).from(adminRoles).where(eq(adminRoles.userId, Number(locals.user!.id))).limit(1);
    if (!can(normalizeRole(roleRow?.role ?? "admin"), "backup:manage")) return fail(403, { error: "Role kamu tidak punya backup:manage." });

    const form = await request.formData();
    const id = Number(form.get("id"));
    if (!Number.isFinite(id) || id <= 0) return fail(400, { error: "ID invalid." });

    const out = await deleteBackup(id);
    if (!out) return fail(404, { error: "Backup tidak ditemukan." });
    return { success: `Backup ${out.filename} dihapus.` };
  },
};
