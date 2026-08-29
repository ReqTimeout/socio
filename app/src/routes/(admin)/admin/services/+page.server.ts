import { db } from "@socio/db";
import { services, categories, provider, pricingRules } from "@socio/db/schema";
import { sql, eq, and, or, desc, asc } from "drizzle-orm";
import { redirect, fail } from "@sveltejs/kit";
import { logAudit, assertAdmin, assertAdminRate } from "$lib/server/admin";
import type { Actions, PageServerLoad } from "./$types";

const PAGE_SIZE = 25;

/**
 * Hitung harga jual per level dari `pricing_rules` (sumber kebenaran markup).
 * Mapping legacy: services.price = Member, services.priceApi = Agen,
 * services.priceReseller = Reseller. `base` = modal per 1000 (price_api provider).
 */
async function computePricing(base: number) {
  const rules = await db.select().from(pricingRules);
  const by: Record<string, any> = {};
  for (const r of rules) by[r.level] = r;
  const mk = (level: string, fallback: number) => {
    const r = by[level];
    if (!r) return base * (1 + fallback / 100);
    return base * (1 + Number(r.markupPercent) / 100) + Number(r.flatPer1k);
  };
  const price = mk("Member", 200); // retail
  const priceApi = mk("Agen", 150); // agen (price_api legacy)
  const priceReseller = mk("Reseller", 180); // reseller
  return {
    price,
    priceApi,
    priceReseller,
    profit: price - base,
    profitReseller: priceReseller - base,
    profitAgen: priceApi - base,
  };
}

export const load: PageServerLoad = async ({ locals, url }) => {
  if (!locals.user) throw redirect(303, "/login");
  if (locals.user.level !== "Admin") throw redirect(303, "/");

  const q = String(url.searchParams.get("q") ?? "").trim();
  const cat = String(url.searchParams.get("cat") ?? "").trim();
  const status = String(url.searchParams.get("status") ?? "").trim();
  const rawP = Number(url.searchParams.get("p") ?? 1);
  const page = Number.isFinite(rawP) && rawP >= 1 && rawP <= 1000 ? rawP : 1; // A-15

  // filters
  const conds: any[] = [];
  if (q) {
    conds.push(
      or(
        sql`${services.serviceName} LIKE ${"%" + q + "%"}`,
        sql`${services.note} LIKE ${"%" + q + "%"}`,
        sql`${services.providerServiceId} = ${Number(q) || 0}`,
      ),
    );
  }
  if (cat) conds.push(eq(services.categoryId, Number(cat)));
  if (status) conds.push(eq(services.status, status === "1" ? 1 : 0));
  const where = conds.length ? and(...conds) : undefined;

  const [rows, totalRow, statsRow, catRows, provRows] = await Promise.all([
    db
      .select({
        id: services.id,
        serviceName: services.serviceName,
        type: services.type,
        price: services.price,
        priceApi: services.priceApi,
        priceReseller: services.priceReseller,
        min: services.min,
        max: services.max,
        status: services.status,
        providerServiceId: services.providerServiceId,
        note: services.note,
        categoryId: services.categoryId,
        categoryName: categories.name,
        providerId: services.providerId,
        providerName: provider.name,
      })
      .from(services)
      .leftJoin(categories, eq(services.categoryId, categories.id))
      .leftJoin(provider, eq(services.providerId, provider.id))
      .where(where)
      .orderBy(desc(services.id))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db
      .select({ total: sql<number>`count(*)` })
      .from(services)
      .where(where),
    db
      .select({
        total: sql<number>`count(*)`,
        active: sql<number>`SUM(CASE WHEN ${services.status} = 1 THEN 1 ELSE 0 END)`,
        categories: sql<number>`(SELECT COUNT(*) FROM categories)`,
      })
      .from(services),
    db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .orderBy(asc(categories.name)),
    db.select({ id: provider.id, name: provider.name }).from(provider).orderBy(asc(provider.name)),
  ]);

  const total = Number(totalRow[0]?.total ?? 0);
  const s = statsRow[0] ?? { total: 0, active: 0, categories: 0 };

  const ruleRows = await db.select().from(pricingRules);

  return {
    services: rows,
    categories: catRows,
    providers: provRows,
    pricingRules: ruleRows,
    q,
    cat,
    status,
    page,
    total,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    stats: {
      total: Number(s.total ?? 0),
      active: Number(s.active ?? 0),
      categories: Number(s.categories ?? 0),
    },
  };
};

export const actions: Actions = {
  addService: async ({ request, locals }) => {
    assertAdmin(locals);
    await assertAdminRate("service-add", (locals as any).ip ?? "0.0.0.0", 30, 60);
    const form = await request.formData();
    const categoryId = Number(form.get("categoryId"));
    const providerId = Number(form.get("providerId"));
    const providerServiceId = Number(form.get("providerServiceId"));
    const serviceName = String(form.get("serviceName") ?? "").trim();
    const note = String(form.get("note") ?? "").trim();
    const min = Number(form.get("min")) || 1;
    const max = Number(form.get("max")) || 1000;
    const type = String(form.get("type") ?? "Default");
    const basePrice = Number(form.get("profit")) || 0;

    if (!categoryId || !providerId || !providerServiceId || !serviceName || basePrice <= 0)
      return fail(400, { error: "Semua field wajib diisi." });
    if (min > max) return fail(400, { error: "Min tidak boleh > Max." });

    // unique checks (samakan legacy)
    const [dupName] = await db
      .select({ c: sql<number>`count(*)` })
      .from(services)
      .where(sql`BINARY ${services.serviceName} = ${serviceName}`);
    if (Number(dupName?.c ?? 0) > 0) return fail(400, { error: "Nama layanan sudah ada." });

    const [dupApi] = await db
      .select({ c: sql<number>`count(*)` })
      .from(services)
      .where(eq(services.providerServiceId, providerServiceId));
    if (Number(dupApi?.c ?? 0) > 0)
      return fail(400, { error: "Provider service ID sudah dipakai." });

    const p = await computePricing(basePrice);
    const [row] = await db
      .insert(services)
      .values({
        categoryId,
        providerId,
        providerServiceId,
        serviceName,
        note,
        type,
        min,
        max,
        // Harga jual per level (price_api = harga Agen, nama legacy)
        price: p.price,
        priceApi: p.priceApi,
        priceReseller: p.priceReseller,
        // Profit nominal per level
        profit: p.profit,
        profitReseller: p.profitReseller,
        profitAgen: p.profitAgen,
        status: 1,
        waktu: new Date().toISOString(),
      })
      .$returningId();
    const newId = row?.id ?? 0;

    await logAudit({
      adminId: Number(locals.user!.id),
      action: "add_service",
      entity: "service",
      entityId: newId,
      detail: { serviceName, basePrice, ...p },
      ip: (locals as any).ip,
    });
    return { success: `Layanan ${serviceName} ditambah.` };
  },

  editService: async ({ request, locals }) => {
    assertAdmin(locals);
    await assertAdminRate("service-edit", (locals as any).ip ?? "0.0.0.0", 30, 60);
    const form = await request.formData();
    const id = Number(form.get("id"));
    if (!Number.isFinite(id) || id <= 0) return fail(400, { error: "ID layanan tidak valid." });

    const basePrice = Number(form.get("profit")) || 0;
    const min = Number(form.get("min")) || 1;
    const max = Number(form.get("max")) || 1000;
    const serviceName = String(form.get("serviceName") ?? "").trim();
    const note = String(form.get("note") ?? "").trim();
    const status = form.get("status") === "1" ? 1 : 0;
    const type = String(form.get("type") ?? "Default");

    if (!serviceName) return fail(400, { error: "Nama layanan wajib." });
    if (basePrice <= 0) return fail(400, { error: "Profit/harga harus > 0." });
    if (min > max) return fail(400, { error: "Min tidak boleh > Max." });

    const p = await computePricing(basePrice);
    await db
      .update(services)
      .set({
        serviceName,
        note,
        type,
        min,
        max,
        status,
        // Harga jual per level
        price: p.price,
        priceApi: p.priceApi,
        priceReseller: p.priceReseller,
        // Profit nominal per level
        profit: p.profit,
        profitReseller: p.profitReseller,
        profitAgen: p.profitAgen,
      })
      .where(eq(services.id, id));

    await logAudit({
      adminId: Number(locals.user!.id),
      action: "edit_service",
      entity: "service",
      entityId: id,
      detail: { serviceName, basePrice, status },
      ip: (locals as any).ip,
    });
    return { success: `Layanan ${serviceName} diupdate.` };
  },

  deleteService: async ({ request, locals }) => {
    assertAdmin(locals);
    await assertAdminRate("service-delete", (locals as any).ip ?? "0.0.0.0", 20, 60);
    const form = await request.formData();
    const id = Number(form.get("id"));
    if (!Number.isFinite(id) || id <= 0) return fail(400, { error: "ID tidak valid." });
    const [s] = await db
      .select({ name: services.serviceName })
      .from(services)
      .where(eq(services.id, id))
      .limit(1);
    await db.delete(services).where(eq(services.id, id));
    await logAudit({
      adminId: Number(locals.user!.id),
      action: "delete_service",
      entity: "service",
      entityId: id,
      detail: { name: s?.name },
      ip: (locals as any).ip,
    });
    return { success: `Layanan dihapus.` };
  },

  bulkDelete: async ({ request, locals }) => {
    assertAdmin(locals);
    await assertAdminRate("service-bulk", (locals as any).ip ?? "0.0.0.0", 5, 60);
    const form = await request.formData();
    const ids = form
      .getAll("id")
      .map((v) => Number(v))
      .filter((v) => Number.isFinite(v) && v > 0)
      .slice(0, 500); // safety cap — cegah IN(...10000)
    if (!ids.length) return fail(400, { error: "Pilih minimal 1 layanan." });
    await db.delete(services).where(
      sql`${services.id} IN (${sql.join(
        ids.map((i) => sql`${i}`),
        sql`, `,
      )})`,
    );
    await logAudit({
      adminId: Number(locals.user!.id),
      action: "bulk_delete_service",
      entity: "service",
      detail: { count: ids.length, ids },
      ip: (locals as any).ip,
    });
    return { success: `${ids.length} layanan dihapus.` };
  },

  /**
   * Bulk price per kategori (G16): set ulang harga semua layanan dalam satu
   * kategori. Mode `set_base` = modal baru nominal per 1k; mode `adjust` =
   * geser modal sebesar ±%. Harga jual per level dihitung ulang via
   * computePricing (pricing_rules tetap sumber kebenaran markup).
   */
  bulkCategoryPrice: async ({ request, locals }) => {
    assertAdmin(locals);
    await assertAdminRate("service-bulk-price", (locals as any).ip ?? "0.0.0.0", 5, 60);
    const form = await request.formData();
    const categoryId = Number(form.get("categoryId"));
    const mode = String(form.get("mode") ?? "adjust");
    const value = Number(form.get("value"));

    if (!Number.isFinite(categoryId) || categoryId <= 0)
      return fail(400, { error: "Kategori tidak valid." });
    if (!["set_base", "adjust"].includes(mode)) return fail(400, { error: "Mode tidak valid." });
    if (!Number.isFinite(value)) return fail(400, { error: "Nilai tidak valid." });
    if (mode === "set_base" && value <= 0) return fail(400, { error: "Modal baru harus > 0." });
    if (mode === "adjust" && (value <= -100 || value > 1000))
      return fail(400, { error: "Persentase harus antara -100% sampai +1000%." });

    const [cat] = await db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(eq(categories.id, categoryId))
      .limit(1);
    if (!cat) return fail(404, { error: "Kategori tidak ditemukan." });

    const rows = await db
      .select({
        id: services.id,
        price: services.price,
        profit: services.profit,
      })
      .from(services)
      .where(eq(services.categoryId, categoryId));

    // Layanan tanpa modal rekonstruksi yang sehat di-skip (harga 0 / profit aneh)
    const targets = rows.filter((r) => r.price > 0 && r.price > r.profit && r.profit >= 0);
    if (!targets.length)
      return fail(400, { error: "Tidak ada layanan dengan harga valid di kategori ini." });

    const rules = await db.select().from(pricingRules);
    const by: Record<string, any> = {};
    for (const r of rules) by[r.level] = r;
    const prices = (base: number) => {
      const mk = (level: string, fallback: number) => {
        const r = by[level];
        const v = r
          ? base * (1 + Number(r.markupPercent) / 100) + Number(r.flatPer1k)
          : base * (1 + fallback / 100);
        return Math.round(v * 100) / 100;
      };
      const price = mk("Member", 200);
      const priceApi = mk("Agen", 150);
      const priceReseller = mk("Reseller", 180);
      return {
        price,
        priceApi,
        priceReseller,
        profit: price - base,
        profitReseller: priceReseller - base,
        profitAgen: priceApi - base,
      };
    };

    const updated = await db.transaction(async (tx) => {
      let n = 0;
      for (const r of targets) {
        const baseOld = r.price - r.profit;
        const base =
          mode === "set_base" ? value : Math.round(baseOld * (1 + value / 100) * 100) / 100;
        if (base <= 0) continue;
        const hp = prices(base);
        await tx
          .update(services)
          .set({
            price: hp.price,
            priceApi: hp.priceApi,
            priceReseller: hp.priceReseller,
            profit: hp.profit,
            profitReseller: hp.profitReseller,
            profitAgen: hp.profitAgen,
          })
          .where(eq(services.id, r.id));
        n++;
      }
      return n;
    });

    await logAudit({
      adminId: Number(locals.user!.id),
      action: "bulk_category_price",
      entity: "service",
      entityId: categoryId,
      detail: {
        category: cat.name,
        mode,
        value,
        affected: updated,
      },
      ip: (locals as any).ip,
    });
    return {
      success: `Harga ${updated} layanan kategori "${cat.name}" diupdate (mode: ${mode === "set_base" ? `modal baru ${value}/1k` : `${value > 0 ? "+" : ""}${value}%`}).`,
    };
  },

  toggleStatus: async ({ request, locals }) => {
    assertAdmin(locals);
    await assertAdminRate("service-toggle", (locals as any).ip ?? "0.0.0.0", 30, 60);
    const form = await request.formData();
    const id = Number(form.get("id"));
    if (!Number.isFinite(id) || id <= 0) return fail(400, { error: "ID tidak valid." });
    const [cur] = await db
      .select({ status: services.status, name: services.serviceName })
      .from(services)
      .where(eq(services.id, id))
      .limit(1);
    if (!cur) return fail(404, { error: "Layanan tidak ditemukan." });
    const next = cur.status === 1 ? 0 : 1;
    await db.update(services).set({ status: next }).where(eq(services.id, id));
    await logAudit({
      adminId: Number(locals.user!.id),
      action: "toggle_service_status",
      entity: "service",
      entityId: id,
      detail: { from: cur.status, to: next },
      ip: (locals as any).ip,
    });
    return { success: `${cur.name} → ${next === 1 ? "Aktif" : "Nonaktif"}.` };
  },

  addCategory: async ({ request, locals }) => {
    assertAdmin(locals);
    await assertAdminRate("category-add", (locals as any).ip ?? "0.0.0.0", 30, 60);
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
    await assertAdminRate("category-edit", (locals as any).ip ?? "0.0.0.0", 30, 60);
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
    return { success: `Kategori diupdate.` };
  },

  deleteCategory: async ({ request, locals }) => {
    assertAdmin(locals);
    await assertAdminRate("category-delete", (locals as any).ip ?? "0.0.0.0", 20, 60);
    const form = await request.formData();
    const id = Number(form.get("id"));
    if (!Number.isFinite(id) || id <= 0) return fail(400, { error: "ID tidak valid." });
    const [used] = await db
      .select({ c: sql<number>`count(*)` })
      .from(services)
      .where(eq(services.categoryId, id));
    if (Number(used?.c ?? 0) > 0)
      return fail(400, {
        error: `Tidak bisa hapus: ${used?.c} layanan masih pakai kategori ini.`,
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
    return { success: `Kategori dihapus.` };
  },
};
