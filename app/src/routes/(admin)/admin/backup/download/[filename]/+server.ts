import { redirect, error } from "@sveltejs/kit";
import { db } from "@socio/db";
import { adminRoles } from "@socio/db/schema";
import { eq } from "drizzle-orm";
import { normalizeRole, can } from "@socio/core/rbac";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { getBackupPath } from "$lib/server/backup";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params, locals }) => {
  if (!locals.user || (locals.user as any).level !== "Admin") throw redirect(303, "/login");
  const [roleRow] = await db.select({ role: adminRoles.role }).from(adminRoles).where(eq(adminRoles.userId, Number(locals.user.id))).limit(1);
  if (!can(normalizeRole(roleRow?.role ?? "admin"), "backup:manage")) throw error(403, "Forbidden");

  const filepath = getBackupPath(params.filename);
  if (!filepath) throw error(400, "Bad filename");

  try {
    const s = await stat(filepath);
    if (!s.isFile()) throw error(404, "Not found");
  } catch (e) {
    throw error(404, "Not found");
  }

  const stream = createReadStream(filepath);
  return new Response(stream as any, {
    headers: {
      "Content-Type": "application/gzip",
      "Content-Disposition": `attachment; filename="${params.filename}"`,
      "Content-Length": String((await stat(filepath)).size),
    },
  });
};
