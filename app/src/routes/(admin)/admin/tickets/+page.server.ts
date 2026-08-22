import { db } from "@socio/db";
import { sql } from "drizzle-orm";
import { redirect, fail } from "@sveltejs/kit";
import { logAudit } from "$lib/server/admin";
import type { Actions, PageServerLoad } from "./$types";

const PAGE_SIZE = 25;

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user) throw redirect(303, "/login");
  if (locals.user.level !== "Admin") throw redirect(303, "/");

  const q = String(url.searchParams.get("q") ?? "").trim();
  const status = String(url.searchParams.get("status") ?? "").trim();
  const activeId = Number(url.searchParams.get("id") ?? 0);
  const page = Math.max(1, Number(url.searchParams.get("p") ?? 1));

  // Aggregate: 1 row per ticket_id (pakai latest message)
  const condList: any[] = [sql`1=1`];
  if (q) {
    condList.push(
      sql`(m.subject LIKE ${"%" + q + "%"} OR m.message LIKE ${"%" + q + "%"} OR m.ticket_id = ${Number(q) || 0})`,
    );
  }
  if (status) condList.push(sql`m.status = ${status}`);
  const whereList = sql.join(condList, sql` AND `);

  // Subquery: ambil row terbaru per ticket_id
  const [ticketList, totalRow, statsRow] = await Promise.all([
    db.execute(sql`
      SELECT t.ticket_id, t.user_id, t.subject, t.status, t.is_read, t.created_at, t.last_message, t.type AS last_type, u.username, u.email
      FROM (
        SELECT m.*,
          ROW_NUMBER() OVER (PARTITION BY m.ticket_id ORDER BY m.id DESC) AS rn,
          SUBSTRING(m.message, 1, 120) AS last_message
        FROM message m
        WHERE ${whereList}
      ) t
      LEFT JOIN users u ON u.id = t.user_id
      WHERE t.rn = 1
      ORDER BY t.id DESC
      LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}
    `),
    db.execute(sql`
      SELECT COUNT(*) AS total FROM (
        SELECT 1 FROM message m WHERE ${whereList} GROUP BY ticket_id
      ) x
    `),
    db.execute(sql`
      SELECT
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status = 'Answered' THEN 1 ELSE 0 END) AS answered,
        SUM(CASE WHEN status = 'Reply by user' THEN 1 ELSE 0 END) AS reply_by_user,
        SUM(CASE WHEN status = 'Closed' THEN 1 ELSE 0 END) AS closed,
        COUNT(*) AS total_msgs,
        COUNT(DISTINCT ticket_id) AS total_tickets
      FROM message
    `),
  ]);

  const total = Number((totalRow as any)[0]?.total ?? 0);
  const s = (statsRow as any)[0] ?? {};

  // Helper: db.execute() returns [rows, fields] tuple from mysql2 — rows
  // are RowDataPacket instances which SvelteKit cannot serialise.
  // JSON round-trip is the cheapest way to get plain POJOs.
  const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value));

  // Detail: kalau ada ?id=... ambil semua message di ticket tsb
  let active: {
    ticketId: number;
    userId: number;
    subject: string;
    status: string;
    username?: string;
    email?: string;
  } | null = null;
  let thread: any[] = [];
  if (activeId > 0) {
    const [firstRows, threadRows] = await Promise.all([
      db.execute(sql`
        SELECT m.ticket_id, m.user_id, m.subject, m.status, u.username, u.email
        FROM message m
        LEFT JOIN users u ON u.id = m.user_id
        WHERE m.ticket_id = ${activeId}
        ORDER BY m.id ASC
        LIMIT 1
      `),
      db.execute(sql`
        SELECT m.id, m.type, m.message, m.status, m.created_at, u.username
        FROM message m
        LEFT JOIN users u ON u.id = m.user_id
        WHERE m.ticket_id = ${activeId}
        ORDER BY m.id ASC
      `),
    ]);
    const f = (firstRows as any)[0];
    if (f) {
      active = {
        ticketId: Number(f.ticket_id),
        userId: Number(f.user_id),
        subject: f.subject || "(Tanpa subjek)",
        status: f.status,
        username: f.username,
        email: f.email,
      };
    }
    thread = plain((threadRows as any)[0] ?? []);

    // Mark as read (admin view)
    await db.execute(
      sql`UPDATE message SET is_read = 1 WHERE ticket_id = ${activeId} AND type = 'user'`,
    );
  }

  return {
    tickets: plain((ticketList as any)[0] ?? []),
    q,
    status,
    activeId,
    active,
    thread,
    page,
    total,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    stats: {
      pending: Number(s.pending ?? 0),
      answered: Number(s.answered ?? 0),
      replyByUser: Number(s.reply_by_user ?? 0),
      closed: Number(s.closed ?? 0),
      totalTickets: Number(s.total_tickets ?? 0),
      totalMessages: Number(s.total_msgs ?? 0),
    },
  };
};

export const actions: Actions = {
  reply: async ({ request, locals }) => {
    const form = await request.formData();
    const ticketId = Number(form.get("ticketId"));
    const msg = String(form.get("message") ?? "").trim();
    if (!ticketId || !msg) return fail(400, { error: "Pesan wajib diisi." });

    // Get subject & user_id from first message
    const [first] = await db.execute(
      sql`SELECT user_id, subject FROM message WHERE ticket_id = ${ticketId} ORDER BY id ASC LIMIT 1`,
    );
    const f = (first as any)[0];
    if (!f) return fail(404, { error: "Tiket tidak ditemukan." });

    await db.execute(sql`
      INSERT INTO message (user_id, type, subject, message, status, created_at, ticket_id, is_read)
      VALUES (${f.user_id}, 'admin', ${f.subject || ""}, ${msg}, 'Answered', NOW(), ${ticketId}, 0)
    `);
    // Bump all messages to Answered (latest wins for list grouping)
    await db.execute(sql`UPDATE message SET status = 'Answered' WHERE ticket_id = ${ticketId}`);

    await logAudit({
      adminId: Number(locals.user!.id),
      action: "reply_ticket",
      entity: "ticket",
      entityId: ticketId,
      detail: { message: msg.slice(0, 100) },
      ip: (locals as any).ip,
    });
    return { success: `Balasan terkirim ke tiket #${ticketId}.` };
  },

  close: async ({ request, locals }) => {
    const form = await request.formData();
    const ticketId = Number(form.get("ticketId"));
    if (!ticketId) return fail(400, { error: "ID tidak valid." });
    await db.execute(sql`UPDATE message SET status = 'Closed' WHERE ticket_id = ${ticketId}`);

    await logAudit({
      adminId: Number(locals.user!.id),
      action: "close_ticket",
      entity: "ticket",
      entityId: ticketId,
      ip: (locals as any).ip,
    });
    return { success: `Tiket #${ticketId} ditutup.` };
  },

  reopen: async ({ request, locals }) => {
    const form = await request.formData();
    const ticketId = Number(form.get("ticketId"));
    if (!ticketId) return fail(400, { error: "ID tidak valid." });
    await db.execute(sql`UPDATE message SET status = 'Pending' WHERE ticket_id = ${ticketId}`);

    await logAudit({
      adminId: Number(locals.user!.id),
      action: "reopen_ticket",
      entity: "ticket",
      entityId: ticketId,
      ip: (locals as any).ip,
    });
    return { success: `Tiket #${ticketId} dibuka kembali.` };
  },
};
