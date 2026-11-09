import { db } from "@socio/db";
import { categories } from "@socio/db/schema";
import { eq } from "drizzle-orm";
import { fail, redirect } from "@sveltejs/kit";
import { logAudit, assertAdmin, assertAdminRate, assertAdminCan } from "$lib/server/admin";
import {
  countCategoryServices,
  listCategoryRows,
  toggleCategoryStatus,
} from "$lib/server/category-admin";
import type { Actions, PageServerLoad } from "./$types";

/**
 * Halaman khusus kategori (pindahan dari blok "Kelola Kategori" di
 * /admin/services). Aksi toggle memakai helper bersama
 * `$lib/server/category-admin` supaya kontrak [manual-off] identik dengan
 * switch di rail kiri /admin/services — tidak boleh ada dua SQL berbeda.
 */
export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user) throw redirect(303, "/login");
  if (locals.user.level !== "Admin") throw redirect(303, "/");

  const q = String(url.searchParams.get("q") ?? "").trim();
  const st = String(url.searchParams.get("st") ?? "").trim();
  const [rows, all] = await Promise.all([
    listCategoryRows(),
    db.select({ id: categories.id }).from(categories),
  ]);

  return {
    categories: rows,
    totalCats: all.length,
    q,
    st: st === "on" || st === "off" ? st : "",
  };
};

export const actions: Actions = {
  /** Matikan/nyalakan semua layanan satu kategori (sync-safe, lihat helper). */
  toggleCategory: async ({ request, locals }) => {
    assertAdmin(locals);
    const _g = await assertAdminCan(locals, "services:edit");
    if (_g) return _g;
    const _rate = await assertAdminRate("category-toggle", (locals as any).ip ?? "0.0.0.0", 10, 60);
    if (_rate) return _rate;
    const form = await request.formData();
    const categoryId = Number(form.get("categoryId"));
    const res = await toggleCategoryStatus(categoryId);
    if (!res.ok) {
      if (res.reason === "not_found") return fail(404, { error: "Kategori tidak ditemukan." });
      if (res.reason === "empty") return fail(400, { error: "Kategori ini tidak punya layanan." });
      return fail(400, { error: "Kategori tidak valid." });
    }
    await logAudit({
      adminId: Number(locals.user!.id),
      action: "toggle_category_status",
      entity: "category",
      entityId: categoryId,
      detail: { category: res.name, mode: res.mode, affected: res.affected },
      ip: (locals as any).ip,
    });
    if (res.mode === "off") {
      return {
        success:
          res.affected === 0
            ? `Tidak ada layanan aktif di "${res.name}".`
            : `${res.affected} layanan di "${res.name}" → Nonaktif (tahan-sync).`,
      };
    }
    return {
      success:
        res.affected === 0
          ? `Tidak ada layanan yang dimatikan manual di "${res.name}".`
          : `${res.affected} layanan di "${res.name}" → Aktif.`,
    };
  },

  addCategory: async ({ request, locals }) => {
    assertAdmin(locals);
    const _g = await assertAdminCan(locals, "services:edit");
    if (_g) return _g;
    const _rate = await assertAdminRate("category-add", (locals as any).ip ?? "0.0.0.0", 30, 60);
    if (_rate) return _rate;
    const form = await request.formData();
    const name = String(form.get("name") ?? "").trim();
    if (!name) return fail(400, { error: "Nama kategori wajib." });
    const [row] = await db.insert(categories).values({ name }).$returningId();
    await logAudit({
      adminId: Number(locals.user.id),
      action: "add_category",
      entity: "category",
      entityId: row?.id,
      detail: { name },
      ip: (locals as any).ip,
    });
    return { success: `Kategori ${name} ditambah.` };
  },

  editCategory: async ({ request, locals }) => {
    assertAdmin(locals);
    const _g = await assertAdminCan(locals, "services:edit");
    if (_g) return _g;
    const _rate = await assertAdminRate("category-edit", (locals as any).ip ?? "0.0.0.0", 30, 60);
    if (_rate) return _rate;
    const form = await request.formData();
    const id = Number(form.get("id"));
    const name = String(form.get("name") ?? "").trim();
    if (!Number.isFinite(id) || id <= 0 || !name) return fail(400, { error: "Field wajib diisi." });
    await db.update(categories).set({ name }).where(eq(categories.id, id));
    await logAudit({
      adminId: Number(locals.user.id),
      action: "edit_category",
      entity: "category",
      entityId: id,
      detail: { name },
      ip: (locals as any).ip,
    });
    return { success: "Kategori diupdate." };
  },

  deleteCategory: async ({ request, locals }) => {
    assertAdmin(locals);
    const _g = await assertAdminCan(locals, "services:edit");
    if (_g) return _g;
    const _rate = await assertAdminRate("category-delete", (locals as any).ip ?? "0.0.0.0", 20, 60);
    if (_rate) return _rate;
    const form = await request.formData();
    const id = Number(form.get("id"));
    if (!Number.isFinite(id) || id <= 0) return fail(400, { error: "ID tidak valid." });
    const used = await countCategoryServices(id);
    if (used > 0)
      return fail(400, {
        error: `Tidak bisa hapus: ${used} layanan masih pakai kategori ini.`,
      });
    const [cat] = await db
      .select({ name: categories.name })
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);
    await db.delete(categories).where(eq(categories.id, id));
    await logAudit({
      adminId: Number(locals.user.id),
      action: "delete_category",
      entity: "category",
      entityId: id,
      detail: { name: cat?.name },
      ip: (locals as any).ip,
    });
    return { success: "Kategori dihapus." };
  },
};
