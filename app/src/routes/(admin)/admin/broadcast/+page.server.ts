import { db } from "@socio/db";
import { broadcastCampaigns } from "@socio/db/schema";
import { desc, sql } from "drizzle-orm";
import { redirect, fail } from "@sveltejs/kit";
import { assertAdmin, assertAdminRate } from "$lib/server/admin";
import { sendBroadcast, getUserIdsForSegment, type Segment } from "$lib/server/broadcast";
import type { PageServerLoad, Actions } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(303, "/login");
  if ((locals.user as any).level !== "Admin") throw redirect(303, "/");

  const campaigns = await db.select().from(broadcastCampaigns).orderBy(desc(broadcastCampaigns.id)).limit(20);

  // Count per segment for preview
  const counts: Record<string, number> = {};
  for (const seg of ["all", "member", "agen", "reseller", "verified", "unverified"] as Segment[]) {
    try {
      const ids = await getUserIdsForSegment(seg);
      counts[seg] = ids.length;
    } catch {
      counts[seg] = 0;
    }
  }

  return { campaigns, counts };
};

export const actions: Actions = {
  send: async ({ request, locals }) => {
    assertAdmin(locals);
    // RBAC check
    const { db: db2 } = await import("@socio/db");
    const { adminRoles } = await import("@socio/db/schema");
    const { eq } = await import("drizzle-orm");
    const { normalizeRole, can } = await import("@socio/core/rbac");
    const [roleRow] = await db2.select({ role: adminRoles.role }).from(adminRoles).where(eq(adminRoles.userId, Number(locals.user!.id))).limit(1);
    if (!can(normalizeRole(roleRow?.role ?? "admin"), "broadcast:send")) return fail(403, { error: "Role kamu tidak bisa broadcast." });
    const _rate = await assertAdminRate("broadcast-send", (locals as any).ip ?? "0.0.0.0", 5, 60);
    if (_rate) return _rate;
    const form = await request.formData();
    const title = String(form.get("title") ?? "").trim();
    const body = String(form.get("body") ?? "").trim();
    const segment = String(form.get("segment") ?? "all") as Segment;
    const channel = String(form.get("channel") ?? "in_app") as "in_app" | "web_push" | "both";

    if (!["all", "member", "agen", "reseller", "verified", "unverified"].includes(segment))
      return fail(400, { error: "Segment tidak valid." });
    if (!["in_app", "web_push", "both"].includes(channel))
      return fail(400, { error: "Channel tidak valid." });

    try {
      const res = await sendBroadcast({ title, body, segment, channel, createdBy: Number(locals.user!.id), ip: (locals as any).ip });
      return { success: `Broadcast terkirim ke ${res.sent} user · in-app: ${channel !== "web_push" ? res.sent : 0} · push: ${channel !== "in_app" ? "batched" : 0}` };
    } catch (e: any) {
      return fail(400, { error: e?.message ?? "Gagal kirim broadcast." });
    }
  },
};
