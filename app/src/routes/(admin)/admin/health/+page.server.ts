import { db } from "@socio/db";
import { adminRoles } from "@socio/db/schema";
import { eq } from "drizzle-orm";
import { normalizeRole, can } from "@socio/core/rbac";
import { redirect } from "@sveltejs/kit";
import { collectHealth } from "$lib/server/health-metrics";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(303, "/login");
  if ((locals.user as any).level !== "Admin") throw redirect(303, "/");
  const [row] = await db.select({ role: adminRoles.role }).from(adminRoles).where(eq(adminRoles.userId, Number(locals.user.id))).limit(1);
  if (!can(normalizeRole(row?.role ?? "admin"), "health:read") && !can(normalizeRole(row?.role ?? "admin"), "backup:manage") && normalizeRole(row?.role ?? "admin") !== "admin" && normalizeRole(row?.role ?? "admin") !== "super_admin") {
    // fallback: allow admin & super_admin even without explicit health:read
  }
  // Least strict: any admin can view health (read-only ops)
  const health = await collectHealth();
  return { health };
};
