import { db } from "@socio/db";
import { news } from "@socio/db/schema";
import { and, count, desc, eq } from "drizzle-orm";
import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

/**
 * PRD Service Sync v2 §10 — halaman "Berita & Update Layanan".
 * Sumber data = tabel `news` global (sama persis dgn widget "Update" dashboard),
 * BUKAN tabel `notifications` per-user → tidak membanjiri lonceng/inbox.
 * - Filter per jenis event lewat ?t=<event_type>.
 * - Filter sumber lewat ?src=manual|sync (pengumuman admin vs berita otomatis katalog).
 * - Pagination lewat ?page=<n> (default 12 kartu / halaman).
 */
export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user) throw redirect(303, "/login");

  const t = String(url.searchParams.get("t") ?? "").trim();
  const srcRaw = String(url.searchParams.get("src") ?? "").trim();
  const src = srcRaw === "manual" || srcRaw === "sync" ? srcRaw : "";
  const conds = [eq(news.isHidden, 0)];
  if (t) conds.push(eq(news.eventType, t as never));
  if (src) conds.push(eq(news.source, src));
  const where = and(...conds);

  const perPage = 12;
  const rawPage = Number(url.searchParams.get("page") ?? 1);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.min(rawPage, 1000) : 1;

  const [rows, countRow] = await Promise.all([
    db
      .select({
        id: news.id,
        kategori: news.kategori,
        title: news.title,
        content: news.content,
        eventType: news.eventType,
        source: news.source,
        serviceId: news.serviceId,
        createdAt: news.createdAt,
      })
      .from(news)
      .where(where)
      .orderBy(desc(news.createdAt), desc(news.id))
      .limit(perPage)
      .offset((page - 1) * perPage),
    db.select({ c: count() }).from(news).where(where),
  ]);

  const total = Number(countRow[0]?.c ?? 0);
  const pages = Math.max(1, Math.ceil(total / perPage));

  return { items: rows, t, src, page, pages, total };
};
