import { redirect } from "@sveltejs/kit";
import { db } from "@socio/db";
import { notifications } from "@socio/db/schema";
import { eq, sql, and } from "drizzle-orm";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ locals, url }) => {
  if (!locals.user) {
    throw redirect(303, `/login?redirect=${encodeURIComponent(url.pathname)}`);
  }
  const [{ unread }] = await db
    .select({ unread: sql<number>`COUNT(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, Number(locals.user.id)), sql`${notifications.readAt} IS NULL`));
  return {
    user: {
      id: locals.user.id,
      name: locals.user.fullName || locals.user.username,
      username: locals.user.username,
      email: locals.user.email,
      level: locals.user.level,
      balance: locals.user.balance ?? 0,
    },
    unreadCount: Number(unread ?? 0),
  };
};
