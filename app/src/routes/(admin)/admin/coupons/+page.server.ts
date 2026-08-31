import { db } from "@socio/db";
import { coupons } from "@socio/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { redirect, fail } from "@sveltejs/kit";
import { logAudit, assertAdmin, assertAdminRate } from "$lib/server/admin";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(303, "/login");
  if (locals.user.level !== "Admin") throw redirect(303, "/");

  const rows = await db.select().from(coupons).orderBy(desc(coupons.createdAt));

  const [stats] = await db
    .select({
      total: sql<number>`COUNT(*)`,
      active: sql<number>`SUM(${coupons.active} = '1')`,
      used: sql<number>`COALESCE(SUM(${coupons.used}), 0)`,
    })
    .from(coupons);

  return {
    coupons: rows.map((c) => ({
      id: c.id,
      code: c.code,
      type: c.type,
      value: Number(c.value),
      minOrder: Number(c.minOrder),
      maxDiscount: Number(c.maxDiscount),
      expiresAt: c.expiresAt,
      maxUsage: c.maxUsage,
      used: c.used,
      active: c.active,
      createdAt: c.createdAt,
    })),
    stats: {
      total: Number(stats?.total ?? 0),
      active: Number(stats?.active ?? 0),
      used: Number(stats?.used ?? 0),
    },
  };
};

function parseDate(v: string): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export const actions: Actions = {
  save: async ({ request, locals }) => {
    assertAdmin(locals);
    const _rate = await assertAdminRate("coupon-save", (locals as any).ip ?? "0.0.0.0", 20, 60);
    if (_rate) return _rate;
    const form = await request.formData();
    const id = Number(form.get("id") ?? 0);
    const code = String(form.get("code") ?? "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, "");
    const type = (form.get("type") === "fixed" ? "fixed" : "percent") as "fixed" | "percent";
    const value = Number(form.get("value") ?? 0);
    const minOrder = Number(form.get("minOrder") ?? 0);
    const maxDiscount = Number(form.get("maxDiscount") ?? 0);
    const expiresAt = parseDate(String(form.get("expiresAt") ?? ""));
    const maxUsage = Number(form.get("maxUsage") ?? 0);
    const active = (form.get("active") === "1" ? "1" : "0") as "0" | "1";

    if (!code || code.length < 3) return fail(400, { error: "Kode kupon minimal 3 karakter." });
    if (!(value > 0)) return fail(400, { error: "Nilai diskon wajib lebih dari 0." });
    if (type === "percent" && value > 100)
      return fail(400, { error: "Diskon persen maksimal 100%." });
    if (minOrder < 0 || maxDiscount < 0)
      return fail(400, { error: "Min. order & max diskon tidak boleh negatif." });

    // No duplikat kode (kecuali edit row yang sama)
    const [dup] = await db
      .select({ id: coupons.id })
      .from(coupons)
      .where(eq(coupons.code, code))
      .limit(1);
    if (dup && dup.id !== id) return fail(409, { error: `Kode ${code} sudah dipakai.` });

    const values = {
      code,
      type,
      value,
      minOrder,
      maxDiscount,
      expiresAt,
      maxUsage: Number.isFinite(maxUsage) ? Math.max(0, maxUsage) : 0,
      active,
    };

    if (id > 0) {
      await db.update(coupons).set(values).where(eq(coupons.id, id));
      await logAudit({
        adminId: Number(locals.user!.id),
        action: "update_coupon",
        entity: "coupon",
        entityId: id,
        detail: { code, type, value },
        ip: (locals as any).ip,
      });
      return { success: `Kupon ${code} diperbarui.` };
    }

    await db.insert(coupons).values({ ...values, used: 0, createdAt: new Date() });
    await logAudit({
      adminId: Number(locals.user!.id),
      action: "create_coupon",
      entity: "coupon",
      detail: { code, type, value },
      ip: (locals as any).ip,
    });
    return { success: `Kupon ${code} dibuat.` };
  },

  toggle: async ({ request, locals }) => {
    assertAdmin(locals);
    const _rate = await assertAdminRate("coupon-toggle", (locals as any).ip ?? "0.0.0.0", 20, 60);
    if (_rate) return _rate;
    const form = await request.formData();
    const id = Number(form.get("id"));
    if (!id) return fail(400, { error: "ID wajib." });
    const [c] = await db
      .select({ id: coupons.id, code: coupons.code, active: coupons.active })
      .from(coupons)
      .where(eq(coupons.id, id))
      .limit(1);
    if (!c) return fail(404, { error: "Kupon tidak ditemukan." });
    const next = c.active === "1" ? "0" : "1";
    await db.update(coupons).set({ active: next }).where(eq(coupons.id, id));
    await logAudit({
      adminId: Number(locals.user!.id),
      action: next === "1" ? "activate_coupon" : "deactivate_coupon",
      entity: "coupon",
      entityId: id,
      detail: { code: c.code },
      ip: (locals as any).ip,
    });
    return { success: `Kupon ${c.code} ${next === "1" ? "diaktifkan" : "dinonaktifkan"}.` };
  },

  delete: async ({ request, locals }) => {
    assertAdmin(locals);
    const _rate = await assertAdminRate("coupon-delete", (locals as any).ip ?? "0.0.0.0", 20, 60);
    if (_rate) return _rate;
    const form = await request.formData();
    const id = Number(form.get("id"));
    if (!id) return fail(400, { error: "ID wajib." });
    const [c] = await db
      .select({ id: coupons.id, code: coupons.code })
      .from(coupons)
      .where(eq(coupons.id, id))
      .limit(1);
    if (!c) return fail(404, { error: "Kupon tidak ditemukan." });
    await db.delete(coupons).where(eq(coupons.id, id));
    await logAudit({
      adminId: Number(locals.user!.id),
      action: "delete_coupon",
      entity: "coupon",
      entityId: id,
      detail: { code: c.code },
      ip: (locals as any).ip,
    });
    return { success: `Kupon ${c.code} dihapus.` };
  },
};
