import { db } from "@socio/db";
import { promotionBanners } from "@socio/db/schema";
import { eq, asc, desc } from "drizzle-orm";
import { redirect, fail } from "@sveltejs/kit";
import { logAudit, assertAdmin, assertAdminRate } from "$lib/server/admin";
import type { Actions, PageServerLoad } from "./$types";

const POSITIONS = [
  { value: "home", label: "Beranda (landing)" },
  { value: "services", label: "Laman Layanan" },
  { value: "dashboard", label: "Dashboard User" },
] as const;

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(303, "/login");
  if (locals.user.level !== "Admin") throw redirect(303, "/");

  const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value));

  const rows = await db
    .select()
    .from(promotionBanners)
    .orderBy(
      asc(promotionBanners.position),
      asc(promotionBanners.sortOrder),
      desc(promotionBanners.id),
    );

  // Drizzle maps columns → camelCase property names (imageUrl, isActive, ...)
  return {
    banners: plain(rows as any[]).map((b: any) => ({
      id: Number(b.id),
      title: String(b.title),
      subtitle: String(b.subtitle ?? ""),
      imageUrl: String(b.imageUrl ?? ""),
      linkUrl: String(b.linkUrl ?? ""),
      position: String(b.position ?? "dashboard"),
      sortOrder: Number(b.sortOrder ?? 0),
      isActive: Number(b.isActive ?? 1) === 1,
      startAt: b.startAt ?? null,
      endAt: b.endAt ?? null,
      createdAt: b.createdAt,
    })),
    positions: POSITIONS.map((p) => ({ value: p.value, label: p.label })),
  };
};

function parseDate(v: string | null): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const actions: Actions = {
  save: async ({ request, locals }) => {
    assertAdmin(locals);
    await assertAdminRate("banner-save", (locals as any).ip ?? "0.0.0.0", 30, 60);
    const form = await request.formData();
    const id = Number(form.get("id") ?? 0);
    const title = String(form.get("title") ?? "").trim();
    const subtitle = String(form.get("subtitle") ?? "").trim();
    const imageUrl = String(form.get("imageUrl") ?? "").trim();
    const linkUrl = String(form.get("linkUrl") ?? "").trim();
    const position = String(form.get("position") ?? "dashboard");
    const sortOrder = Number(form.get("sortOrder") ?? 0);
    const isActive = form.get("isActive") === "1" ? 1 : 0;
    const startAt = parseDate(String(form.get("startAt") ?? ""));
    const endAt = parseDate(String(form.get("endAt") ?? ""));

    if (!title) return fail(400, { error: "Judul banner wajib diisi." });
    if (!["home", "services", "dashboard"].includes(position))
      return fail(400, { error: "Posisi tidak valid." });
    if (startAt && endAt && endAt < startAt)
      return fail(400, { error: "Tanggal berakhir harus setelah tanggal mulai." });
    // Validasi URL sederhana (imageUrl/linkUrl) untuk cegah javascript: dll.
    for (const [k, v] of [
      ["imageUrl", imageUrl],
      ["linkUrl", linkUrl],
    ]) {
      if (v && !/^https?:\/\//i.test(v)) return fail(400, { error: `${k} harus http/https.` });
    }

    const values = {
      title,
      subtitle,
      imageUrl,
      linkUrl,
      position: position as "home" | "services" | "dashboard",
      sortOrder: Number.isNaN(sortOrder) ? 0 : sortOrder,
      isActive,
      startAt,
      endAt,
    };

    if (id > 0) {
      await db.update(promotionBanners).set(values).where(eq(promotionBanners.id, id));
      await logAudit({
        adminId: Number(locals.user!.id),
        action: "update_banner",
        entity: "banner",
        entityId: id,
        detail: { title, position },
        ip: (locals as any).ip,
      });
      return { success: `Banner "${title}" diperbarui.` };
    }

    await db.insert(promotionBanners).values(values);
    await logAudit({
      adminId: Number(locals.user!.id),
      action: "create_banner",
      entity: "banner",
      detail: { title, position },
      ip: (locals as any).ip,
    });
    return { success: `Banner "${title}" ditambahkan.` };
  },

  toggle: async ({ request, locals }) => {
    assertAdmin(locals);
    await assertAdminRate("banner-toggle", (locals as any).ip ?? "0.0.0.0", 30, 60);
    const form = await request.formData();
    const id = Number(form.get("id"));
    if (!Number.isFinite(id) || id <= 0) return fail(400, { error: "ID wajib." });

    const [b] = await db
      .select({
        id: promotionBanners.id,
        isActive: promotionBanners.isActive,
        title: promotionBanners.title,
      })
      .from(promotionBanners)
      .where(eq(promotionBanners.id, id))
      .limit(1);
    if (!b) return fail(404, { error: "Banner tidak ditemukan." });

    const next = b.isActive ? 0 : 1;
    await db.update(promotionBanners).set({ isActive: next }).where(eq(promotionBanners.id, id));
    await logAudit({
      adminId: Number(locals.user.id),
      action: next ? "activate_banner" : "deactivate_banner",
      entity: "banner",
      entityId: id,
      detail: { title: b.title },
      ip: (locals as any).ip,
    });
    return { success: `Banner "${b.title}" ${next ? "diaktifkan" : "dinonaktifkan"}.` };
  },

  delete: async ({ request, locals }) => {
    assertAdmin(locals);
    await assertAdminRate("banner-delete", (locals as any).ip ?? "0.0.0.0", 20, 60);
    const form = await request.formData();
    const id = Number(form.get("id"));
    if (!Number.isFinite(id) || id <= 0) return fail(400, { error: "ID wajib." });

    const [b] = await db
      .select({ id: promotionBanners.id, title: promotionBanners.title })
      .from(promotionBanners)
      .where(eq(promotionBanners.id, id))
      .limit(1);
    if (!b) return fail(404, { error: "Banner tidak ditemukan." });

    await db.delete(promotionBanners).where(eq(promotionBanners.id, id));
    await logAudit({
      adminId: Number(locals.user.id),
      action: "delete_banner",
      entity: "banner",
      entityId: id,
      detail: { title: b.title },
      ip: (locals as any).ip,
    });
    return { success: `Banner "${b.title}" dihapus.` };
  },
};
