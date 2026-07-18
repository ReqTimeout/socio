import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { runProviderSync } from "../../../../cron/provider-sync";
import { runStatusPolling } from "../../../../cron/status-polling";
import { db } from "@socio/db";
import { sql } from "drizzle-orm";

async function requireAdmin(locals: any) {
  if (!locals.user || locals.user.level !== "Admin") {
    throw new Error("unauthorized");
  }
}

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    requireAdmin(locals);
  } catch {
    return json({ error: "unauthorized" }, { status: 403 });
  }
  const { task } = await request.json().catch(() => ({ task: "sync" }));
  if (task === "sync") {
    await runProviderSync(1);
    return json({ ok: true, task: "provider-sync" });
  }
  if (task === "poll") {
    await runStatusPolling();
    const [r] = await db.execute(sql`SELECT COUNT(*) AS c FROM orders WHERE status IN ('Pending','In progress')`);
    const rows = (r as any).rows ?? [];
    return json({ ok: true, task: "status-polling", pending: rows[0]?.c ?? 0 });
  }
  return json({ error: "unknown task" }, { status: 400 });
};
