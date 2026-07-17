import { db } from "@socio/db";
import { auditLog, adminSettings } from "@socio/db/schema";
import { eq } from "drizzle-orm";

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
