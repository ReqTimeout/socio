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
 * - Pagination lewat ?page=<n> (default 12 kartu / halaman).
 */
export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user) throw redirect(303, "/login");

  const t = String(url.searchParams.get("t") ?? "").trim();
  const where = t
    ? and(eq(news.isHidden, 0), eq(news.eventType, t as never))
    : eq(news.isHidden, 0);

  const perPage = 12;
  const rawPage = Number(url.searchParams.get("page") ?? 1);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.min(rawPage, 1000) : 1;

  const [rows, countRow] = await Promise.all([
    db
      .select({
        id: news.id,
        kategori: news.kategori,
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

  return { items: rows, t, page, pages, total };
};
