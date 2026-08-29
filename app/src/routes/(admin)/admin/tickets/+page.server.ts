import { db } from "@socio/db";
import { sql } from "drizzle-orm";
import { redirect, fail } from "@sveltejs/kit";
import { logAudit, assertAdmin, assertAdminRate } from "$lib/server/admin";
import type { Actions, PageServerLoad } from "./$types";

const PAGE_SIZE = 25;

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user) throw redirect(303, "/login");
  if (locals.user.level !== "Admin") throw redirect(303, "/");
  const q = String(url.searchParams.get("q") ?? "").trim();
  const status = String(url.searchParams.get("status") ?? "").trim();
  const activeId = Number(url.searchParams.get("id") ?? 0);
  const rawP = Number(url.searchParams.get("p") ?? 1);
  const page = Number.isFinite(rawP) && rawP >= 1 && rawP <= 1000 ? rawP : 1; // A-15

  // Aggregate: 1 row per ticket_id (pakai latest message)
  const condList: any[] = [sql`1=1`];
  if (q) {
    condList.push(
      sql`(m.subject LIKE ${"%" + q + "%"} OR m.message LIKE ${"%" + q + "%"} OR m.ticket_id = ${Number(q) || 0})`,
    );
  }
  if (status) condList.push(sql`m.status = ${status}`);
  const whereList = sql.join(condList, sql` AND `);

  // Helpers: db.execute() returns [rows, fields] tuple from mysql2.
  const rowsOf = (res: unknown): any[] => {
    const a = res as any[];
    return Array.isArray(a[0]) ? (a[0] as any[]) : (a as any[]);
  };
  const firstRow = (res: unknown): any => rowsOf(res)[0] ?? {};

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
        COUNT(DISTINCT CASE WHEN m.status = 'Pending' THEN m.ticket_id END) AS pending,
        COUNT(DISTINCT CASE WHEN m.status = 'Answered' THEN m.ticket_id END) AS answered,
        COUNT(DISTINCT CASE WHEN m.status = 'Reply by user' THEN m.ticket_id END) AS reply_by_user,
        COUNT(DISTINCT CASE WHEN m.status = 'Closed' THEN m.ticket_id END) AS closed,
        COUNT(DISTINCT m.ticket_id) AS total_tickets
      FROM message m
    `),
  ]);

  const total = Number(firstRow(totalRow).total ?? 0);
  const s = firstRow(statsRow);

  // Helper: JSON round-trip to get plain POJOs (RowDataPacket → serialisable).
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
    const tryRow = firstRow(firstRows);
    if (tryRow && tryRow.ticket_id != null) {
      active = {
        ticketId: Number(tryRow.ticket_id),
        userId: Number(tryRow.user_id),
        subject: tryRow.subject || "(Tanpa subjek)",
        status: tryRow.status,
        username: tryRow.username,
        email: tryRow.email,
      };
    }
    thread = plain(rowsOf(threadRows));

    // A-13: side-effect UPDATE di GET dihapus. Pakai POST `markRead` di bawah
    // (dengan fetch dari client) — non-CSRF-able read-state mutation.
  }

  return {
    tickets: plain(rowsOf(ticketList)),
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
    },
  };
};

export const actions: Actions = {
  /** A-13: explicit POST action to mark admin view; replaces side-effect in load. */
  markRead: async ({ request, locals }) => {
    assertAdmin(locals);
    await assertAdminRate("ticket-mark-read", (locals as any).ip ?? "0.0.0.0", 60, 60);
    const form = await request.formData();
    const ticketId = Number(form.get("ticketId"));
    if (!Number.isFinite(ticketId) || ticketId <= 0)
      return fail(400, { error: "ID tiket tidak valid." });
    await db.execute(
      sql`UPDATE message SET is_read = 1 WHERE ticket_id = ${ticketId} AND type = 'user'`,
    );
    return { success: "OK" };
  },

  reply: async ({ request, locals }) => {
    assertAdmin(locals);
    await assertAdminRate("ticket-reply", (locals as any).ip ?? "0.0.0.0", 30, 60);
    const form = await request.formData();
    const ticketId = Number(form.get("ticketId"));
    const msg = String(form.get("message") ?? "").trim();
    if (!Number.isFinite(ticketId) || ticketId <= 0 || !msg)
      return fail(400, { error: "Pesan wajib diisi." });

    // Get subject & user_id from first message
    const firstRes = await db.execute(
      sql`SELECT user_id, subject FROM message WHERE ticket_id = ${ticketId} ORDER BY id ASC LIMIT 1`,
    );
    const f =
      (firstRes as unknown as any[])[0] && Array.isArray((firstRes as unknown as any[])[0])
        ? (firstRes as unknown as any[])[0][0]
        : (firstRes as unknown as any[])[0];
    if (!f || f.user_id == null) return fail(404, { error: "Tiket tidak ditemukan." });

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
    assertAdmin(locals);
    await assertAdminRate("ticket-close", (locals as any).ip ?? "0.0.0.0", 30, 60);
    const form = await request.formData();
    const ticketId = Number(form.get("ticketId"));
    if (!Number.isFinite(ticketId) || ticketId <= 0) return fail(400, { error: "ID tidak valid." });
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
    assertAdmin(locals);
    await assertAdminRate("ticket-reopen", (locals as any).ip ?? "0.0.0.0", 30, 60);
    const form = await request.formData();
    const ticketId = Number(form.get("ticketId"));
    if (!Number.isFinite(ticketId) || ticketId <= 0) return fail(400, { error: "ID tidak valid." });
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
