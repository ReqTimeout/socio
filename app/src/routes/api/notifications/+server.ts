import { json } from "@sveltejs/kit";
import { db } from "@socio/db";
import { notifications } from "@socio/db/schema";
import { eq, sql, desc, and } from "drizzle-orm";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ locals, url }) => {
  if (!locals.user) return json({ items: [], unread: 0 }, { status: 401 });
  const userId = Number(locals.user.id);
  const limit = Math.min(20, Math.max(1, Number(url.searchParams.get("limit") ?? 6)));

  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);

  const [{ unread }] = await db
    .select({ unread: sql<number>`COUNT(*)` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), sql`${notifications.readAt} IS NULL`));

  return json({
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
  });
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) return json({ error: "Unauthorized" }, { status: 401 });
  const userId = Number(locals.user.id);
  let body: any = {};
  try {
    body = await request.json();
  } catch {
    // empty
  }
  const { id, all } = body as { id?: number; all?: boolean };

  if (all) {
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.userId, userId), sql`${notifications.readAt} IS NULL`));
    return json({ ok: true });
  }

  if (id) {
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.id, Number(id)), eq(notifications.userId, userId)));
    return json({ ok: true });
  }

  return json({ error: "id or all required" }, { status: 400 });
};
