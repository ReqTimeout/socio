import { db } from "@socio/db";
import { auditLog, adminSettings, adminRoles } from "@socio/db/schema";
import { eq } from "drizzle-orm";
import { fail, error } from "@sveltejs/kit";
import type { ActionFailure } from "@sveltejs/kit";
import { rateLimit } from "./rate-limit";
import { can, normalizeRole, type AdminRole } from "@socio/core/rbac";

export type LocalUser = {
  id: string | number;
  level?: string;
  username?: string;
  email?: string;
};

/** A-01 / A-02: guard admin. Assertion narrowing + throw error() (LEGAL di action —
 *  jangan pakai throw fail(), Kit me-reject-nya sebagai 500). */
export function assertAdmin(locals: {
  user?: LocalUser | null;
}): asserts locals is { user: LocalUser & { level: string } } {
  if (!locals.user || locals.user.level !== "Admin") {
    error(403, "Akses ditolak — hanya Admin.");
  }
}

/** A-03: helper rate-limit admin action. Pakai prefix "admin:action:<key>:ip". */
export async function assertAdminRate(
  key: string,
  ip: string,
  limit = 30,
  windowSec = 60,
): Promise<ActionFailure<{ error: string }> | null> {
  const ok = await rateLimit(`admin:${key}:${ip}`, { limit, windowSec });
  if (!ok) {
    return fail(429, { error: "Terlalu banyak aksi. Coba lagi dalam 1 menit." });
  }
  return null;
}

/**
 * P0 RBAC (fix ADMIN_FULL_AUDIT §1.2): resolve role admin dari `admin_roles`
 * (fallback "admin"). Layout load sudah resolve, TAPI action POST harus tetap
 * resolve sendiri — `assertAdmin` hanya cek level==="Admin".
 */
export async function resolveAdminRole(userId: number): Promise<AdminRole> {
  const [row] = await db
    .select({ role: adminRoles.role })
    .from(adminRoles)
    .where(eq(adminRoles.userId, userId))
    .limit(1);
  return normalizeRole(row?.role ?? "admin");
}

/**
 * P0 RBAC action enforcement. Pasang SETELAH `assertAdmin(locals)` di setiap
 * aksi mutasi/destruktif. Return `null` kalau boleh, `fail(403)` kalau role
 * tidak punya `permission`. Pola sama `assertAdminRate` — caller `return`-nya:
 *   const g = await assertAdminCan(locals, "services:edit"); if (g) return g;
 */
export async function assertAdminCan(
  locals: { user?: LocalUser | null },
  permission: string,
): Promise<ActionFailure<{ error: string }> | null> {
  const uid = Number(locals.user?.id ?? 0);
  if (!uid) return fail(403, { error: "Sesi admin tidak valid." });
  const role = await resolveAdminRole(uid);
  if (!can(role, permission)) {
    return fail(403, { error: `Role ${role} tidak punya izin "${permission}".` });
  }
  return null;
}

/**
 * Varian melempar (throw) dari `assertAdminCan` untuk endpoint `+server.ts`
 * (CSV/PDF export, download). `+server.ts` TIDAK melewati `(admin)` layout,
 * jadi guard read harus di-inline di sini.
 */
export async function guardAdminCan(
  locals: { user?: LocalUser | null },
  permission: string,
): Promise<void> {
  const uid = Number(locals.user?.id ?? 0);
  if (!uid) throw error(403, "Sesi admin tidak valid.");
  const role = await resolveAdminRole(uid);
  if (!can(role, permission)) {
    throw error(403, `Role ${role} tidak punya izin "${permission}".`);
  }
}

export async function logAudit(params: {
  adminId: number;
  action: string;
  entity: string;
  entityId?: string | number;
  detail?: unknown;
  ip?: string;
}) {
  await db.insert(auditLog).values({
    adminId: params.adminId,
    action: params.action,
    entity: params.entity,
    entityId: params.entityId !== undefined ? String(params.entityId) : null,
    detail: params.detail ? JSON.stringify(params.detail) : null,
    ip: params.ip ?? null,
    createdAt: new Date(),
  });
}

export async function getSetting(key: string): Promise<string> {
  const [row] = await db.select().from(adminSettings).where(eq(adminSettings.key, key)).limit(1);
  return row?.value ?? "";
}

export async function setSetting(key: string, value: string) {
  const [row] = await db.select().from(adminSettings).where(eq(adminSettings.key, key)).limit(1);
  if (row) {
    await db
      .update(adminSettings)
      .set({ value, updatedAt: new Date() })
      .where(eq(adminSettings.key, key));
  } else {
    await db.insert(adminSettings).values({ key, value, updatedAt: new Date() });
  }
}
