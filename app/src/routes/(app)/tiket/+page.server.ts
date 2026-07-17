import { db } from "@socio/db";
import { sql } from "drizzle-orm";
import { redirect, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(303, "/login");
  const userId = Number(locals.user.id);

  const tickets = await db.execute(sql`
    SELECT ticket_id, subject, status, MAX(created_at) as last, COUNT(*) as msgs
    FROM message WHERE user_id = ${userId} GROUP BY ticket_id, subject, status
    ORDER BY last DESC LIMIT 20
  `);

  return { tickets: (tickets as any)[0] ?? [] };
};

export const actions: Actions = {
  create: async ({ request, locals }) => {
    const form = await request.formData();
    const subject = String(form.get("subject") ?? "").trim();
    const message = String(form.get("message") ?? "").trim();
    if (!subject || !message) return fail(400, { error: "Subjek dan pesan wajib diisi." });

    const userId = Number(locals.user!.id);
    const ticketId = Date.now();
    await db.execute(sql`
      INSERT INTO message (user_id, type, subject, message, status, created_at, ticket_id, is_read)
      VALUES (${userId}, 'user', ${subject}, ${message}, 'Pending', NOW(), ${ticketId}, 0)
    `);
    return { success: true, ticketId };
  },

  reply: async ({ request, locals }) => {
    const form = await request.formData();
    const ticketId = Number(form.get("ticketId"));
    const message = String(form.get("message") ?? "").trim();
    if (!ticketId || !message) return fail(400, { error: "Pesan wajib diisi." });

    const userId = Number(locals.user!.id);
    await db.execute(sql`
      INSERT INTO message (user_id, type, subject, message, status, created_at, ticket_id, is_read)
      VALUES (${userId}, 'user', '', ${message}, 'Reply by user', NOW(), ${ticketId}, 0)
    `);
    await db.execute(sql`UPDATE message SET status = 'Pending' WHERE ticket_id = ${ticketId}`);
    return { success: true };
  },

  close: async ({ request, locals }) => {
    const form = await request.formData();
    const ticketId = Number(form.get("ticketId"));
    if (!ticketId) return fail(400, { error: "Tiket tidak valid." });
    await db.execute(sql`UPDATE message SET status = 'Closed' WHERE ticket_id = ${ticketId}`);
    return { success: true };
  },
};
