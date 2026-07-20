import { db } from "@socio/db";
import { notifications } from "@socio/db/schema";
import { eq, sql, desc, and } from "drizzle-orm";
import { redirect, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user) throw redirect(303, "/login");
  const userId = Number(locals.user.id);
  const type = String(url.searchParams.get("type") ?? "");

  const rows = await db
    .select()
    .from(notifications)
    .where(
      type
        ? and(eq(notifications.userId, userId), eq(notifications.type, type as any))
        : eq(notifications.userId, userId),
    )
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  const [{ unread }] = await db
    .select({ unread: sql<number>`COUNT(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), sql`${notifications.readAt} IS NULL`));

  return {
    items: rows.map((n: any) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      actionUrl: n.actionUrl,
      read: !!n.readAt,
      createdAt: n.createdAt,
    })),
    unread: Number(unread ?? 0),
    type,
  };
};

export const actions: Actions = {
  read: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { error: "Unauthorized" });
    const form = await request.formData();
    const id = Number(form.get("id"));
    if (!id) return fail(400, { error: "ID required" });
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.id, id), eq(notifications.userId, Number(locals.user.id))));
    return { success: true };
  },

  readAll: async ({ locals }) => {
    if (!locals.user) return fail(401, { error: "Unauthorized" });
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.userId, Number(locals.user.id)), sql`${notifications.readAt} IS NULL`));
    return { success: true };
  },
};
