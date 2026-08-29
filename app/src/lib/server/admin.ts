import { db } from "@socio/db";
import { auditLog, adminSettings } from "@socio/db/schema";
import { eq } from "drizzle-orm";
import { fail } from "@sveltejs/kit";
import { rateLimit } from "./rate-limit";

export type LocalUser = {
  id: string | number;
  level?: string;
  username?: string;
  email?: string;
};

/** A-01 / A-02: helper untuk defense-in-depth di setiap admin action. */
export function assertAdmin(locals: {
  user?: LocalUser | null;
}): asserts locals is { user: LocalUser & { level: string } } {
  if (!locals.user || locals.user.level !== "Admin") {
    throw fail(403, { error: "Akses ditolak — hanya Admin." });
  }
}

/** A-03: helper rate-limit admin action. Pakai prefix "admin:action:<key>:ip". */
export async function assertAdminRate(
  key: string,
  ip: string,
  limit = 30,
  windowSec = 60,
): Promise<void> {
  const ok = await rateLimit(`admin:${key}:${ip}`, { limit, windowSec });
  if (!ok) {
    throw fail(429, { error: "Terlalu banyak aksi. Coba lagi dalam 1 menit." });
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
