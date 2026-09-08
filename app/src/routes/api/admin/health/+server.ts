import type { RequestHandler } from "./$types";
import { collectHealth } from "$lib/server/health-metrics";

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user || (locals.user as any).level !== "Admin") {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }
  const payload = await collectHealth();
  return new Response(JSON.stringify(payload), { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
};
