import { db } from "@socio/db";
import { news } from "@socio/db/schema";
import { desc, eq, sql, count, like, or } from "drizzle-orm";
import { fail, redirect } from "@sveltejs/kit";
import { logAudit, assertAdmin, assertAdminRate } from "$lib/server/admin";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user) throw redirect(303, "/login");
  if (locals.user.level !== "Admin") throw redirect(303, "/");

  const q = (url.searchParams.get("q") ?? "").trim();
  const rawPage = Number(url.searchParams.get("page") ?? 1);
  const page = Number.isFinite(rawPage) && rawPage >= 1 && rawPage <= 1000 ? rawPage : 1; // A-15
  const perPage = 20;

  // A-11: WHERE di DB (sebelumnya fetch-all + JS filter).
  const where = q
    ? or(
        like(sql<string>`LOWER(${news.kategori})`, `%${q.toLowerCase()}%`),
        like(sql<string>`LOWER(${news.content})`, `%${q.toLowerCase()}%`),
      )
    : undefined;

  const [rows, totalRow] = await Promise.all([
    db
      .select()
      .from(news)
      .where(where)
      .orderBy(desc(news.id))
      .limit(perPage)
      .offset((page - 1) * perPage),
    db.select({ c: count() }).from(news).where(where),
  ]);

  return {
    items: rows.map((r) => ({
      id: Number(r.id),
      kategori: String(r.kategori ?? ""),
      content: String(r.content ?? ""),
      createdAt: r.createdAt,
    })),
    total: Number(totalRow[0]?.c ?? 0),
    page,
    perPage,
    pages: Math.max(1, Math.ceil(Number(totalRow[0]?.c ?? 0) / perPage)),
    q,
  };
};

export const actions: Actions = {
  save: async ({ request, locals }) => {
    assertAdmin(locals);
    const _rate = await assertAdminRate("news-save", (locals as any).ip ?? "0.0.0.0", 20, 60);
    if (_rate) return _rate;
    const form = await request.formData();
    const id = Number(form.get("id") ?? 0);
    const kategori = String(form.get("kategori") ?? "").trim();
    const content = String(form.get("content") ?? "").trim();

    if (!kategori) return fail(400, { error: "Kategori wajib diisi." });
    if (!content) return fail(400, { error: "Konten berita wajib diisi." });
    if (kategori.length > 128) return fail(400, { error: "Kategori maksimal 128 karakter." });

    if (id > 0) {
      const [existing] = await db
        .select({ id: news.id })
        .from(news)
        .where(eq(news.id, id))
        .limit(1);
      if (!existing) return fail(404, { error: "Berita tidak ditemukan." });
      await db.update(news).set({ kategori, content }).where(eq(news.id, id));
      await logAudit({
        adminId: Number(locals.user.id),
        action: "update_news",
        entity: "news",
        entityId: id,
        detail: { kategori },
        ip: (locals as any).ip,
      });
      return { success: `Berita #${id} diperbarui.` };
    }

    await db.insert(news).values({ kategori, content, createdAt: new Date() });
    // A-11: broadcast read_popup legacy. Bungkus best-effort (kalau kolom
    // sudah di-drop, gak fatal). User.notification insert sudah di-batasi.
    try {
      await db.execute(sql`UPDATE users SET read_popup = '0' WHERE status = 1 LIMIT 10000`);
    } catch {
      // kolom legacy mungkin sudah di-drop — non-kritis
    }
    try {
      const msg = String(content).slice(0, 160).replace(/\s+/g, " ").trim();
      await db.execute(sql`
        INSERT INTO notifications (user_id, type, title, message, action_url, created_at)
        SELECT id, 'news', ${`[${kategori}] ${msg.slice(0, 60)}`}, ${msg}, ${`/notif?type=news`}, NOW()
        FROM users WHERE status = 1 LIMIT 10000
      `);
    } catch {
      // notifications table might be missing in local dump — non-kritis
    }
    await logAudit({
      adminId: Number(locals.user.id),
      action: "create_news",
      entity: "news",
      detail: { kategori },
      ip: (locals as any).ip,
    });
    return { success: `Berita kategori "${kategori}" ditambahkan.` };
  },

  delete: async ({ request, locals }) => {
    assertAdmin(locals);
    const _rate = await assertAdminRate("news-delete", (locals as any).ip ?? "0.0.0.0", 20, 60);
    if (_rate) return _rate;
    const form = await request.formData();
    const id = Number(form.get("id"));
    if (!Number.isFinite(id) || id <= 0) return fail(400, { error: "ID wajib." });
    const [row] = await db
      .select({ id: news.id, kategori: news.kategori })
      .from(news)
      .where(eq(news.id, id))
      .limit(1);
    if (!row) return fail(404, { error: "Berita tidak ditemukan." });
    await db.delete(news).where(eq(news.id, id));
    await logAudit({
      adminId: Number(locals.user.id),
      action: "delete_news",
      entity: "news",
      entityId: id,
      detail: { kategori: row.kategori },
      ip: (locals as any).ip,
    });
    return { success: `Berita #${id} dihapus.` };
  },
};
