import { db } from "@socio/db";
import { news } from "@socio/db/schema";
import { desc, eq } from "drizzle-orm";
import { fail, redirect } from "@sveltejs/kit";
import { logAudit } from "$lib/server/admin";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user) throw redirect(303, "/login");
  if (locals.user.level !== "Admin") throw redirect(303, "/");

  const q = (url.searchParams.get("q") ?? "").trim();
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const perPage = 20;

  const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value));

  // Simple: fetch all ordered desc, filter in JS for q (kategori/content), paginate
  const rows = await db.select().from(news).orderBy(desc(news.id));

  let filtered = plain(rows as any[]);
  if (q) {
    const lq = q.toLowerCase();
    filtered = filtered.filter(
      (r: any) =>
        String(r.kategori ?? "")
          .toLowerCase()
          .includes(lq) ||
        String(r.content ?? "")
          .toLowerCase()
          .includes(lq),
    );
  }
  const total = filtered.length;
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  return {
    items: paged.map((r: any) => ({
      id: Number(r.id),
      kategori: String(r.kategori ?? ""),
      content: String(r.content ?? ""),
      createdAt: r.created_at ?? r.createdAt,
    })),
    total,
    page,
    perPage,
    q,
  };
};

export const actions: Actions = {
  save: async ({ request, locals }) => {
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
        adminId: Number(locals.user!.id),
        action: "update_news",
        entity: "news",
        entityId: id,
        detail: { kategori },
        ip: (locals as any).ip,
      });
      return { success: `Berita #${id} diperbarui.` };
    }

    await db.insert(news).values({ kategori, content, createdAt: new Date() });
    // Broadcast: tandai semua user belum baca — kompatibel legacy read_popup
    // (tabel users.read_popup sudah ada; kalau kolom hilang, try-catch swallow)
    try {
      await db.execute(
        await import("drizzle-orm").then((m) => m.sql`UPDATE users SET read_popup = '0'`),
      );
    } catch {
      // kolom legacy mungkin sudah di-drop — non-kritis
    }
    await logAudit({
      adminId: Number(locals.user!.id),
      action: "create_news",
      entity: "news",
      detail: { kategori },
      ip: (locals as any).ip,
    });
    return { success: `Berita kategori "${kategori}" ditambahkan.` };
  },

  delete: async ({ request, locals }) => {
    const form = await request.formData();
    const id = Number(form.get("id"));
    if (!id) return fail(400, { error: "ID wajib." });
    const [row] = await db
      .select({ id: news.id, kategori: news.kategori })
      .from(news)
      .where(eq(news.id, id))
      .limit(1);
    if (!row) return fail(404, { error: "Berita tidak ditemukan." });
    await db.delete(news).where(eq(news.id, id));
    await logAudit({
      adminId: Number(locals.user!.id),
      action: "delete_news",
      entity: "news",
      entityId: id,
      detail: { kategori: row.kategori },
      ip: (locals as any).ip,
    });
    return { success: `Berita #${id} dihapus.` };
  },
};
