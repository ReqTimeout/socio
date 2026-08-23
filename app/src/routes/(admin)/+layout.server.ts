import { redirect } from "@sveltejs/kit";
import { ensureAdminSchema } from "@socio/db/ensure";
import { db } from "@socio/db";
import { notifications } from "@socio/db/schema";
import { eq, sql, and } from "drizzle-orm";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ locals, request }) => {
  if (!locals.user) throw redirect(303, "/login");
  if ((locals.user as any).level !== "Admin") throw redirect(303, "/");

  await ensureAdminSchema();

  const ip =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "0.0.0.0";

  const [{ unreadAdmin }] = await db
    .select({ unreadAdmin: sql<number>`COUNT(*)` })
    .from(notifications)
    .where(
      and(eq(notifications.userId, Number(locals.user.id)), sql`${notifications.readAt} IS NULL`),
    );

  return {
    admin: {
      id: locals.user.id,
      name: locals.user.fullName ?? locals.user.username,
      username: locals.user.username,
      level: (locals.user as any).level,
    },
    ip,
    unreadCount: Number(unreadAdmin ?? 0),
  };
};
