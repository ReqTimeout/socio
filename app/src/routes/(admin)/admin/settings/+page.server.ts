import { db } from "@socio/db";
import { adminRoles, pricingRules } from "@socio/db/schema";
import { sql, eq, asc, inArray } from "drizzle-orm";
import { redirect, fail } from "@sveltejs/kit";
import { getSetting, setSetting, logAudit, assertAdmin, assertAdminRate } from "$lib/server/admin";
import { env } from "$env/dynamic/private";
import { DEFAULT_PRICING_RULES } from "$lib/server/pricing-defaults";
import type { Actions, PageServerLoad } from "./$types";

const ROLE_LIST = ["superadmin", "admin", "operator", "viewer"] as const;

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(303, "/login");
  if (locals.user.level !== "Admin") throw redirect(303, "/");

  // Settings umum
  const maintenance = (await getSetting("maintenance_mode")) === "1";
  const api2fa = false; // TODO M3.5: (await getSetting("admin_2fa_required")) === "1" — saat enforcement ada
  const apiPublic = (await getSetting("public_api_enabled")) === "1";
  const signupVerify = (await getSetting("signup_verify_required")) === "1";

  // Pricing rules
  const pricingList = await db.select().from(pricingRules).orderBy(asc(pricingRules.level));

  // Sample service untuk kalkulator harga — pakai MEDIAN harga (layanan pertama by id
  // pernah menampilkan outlier Rp8jt/1k; median = contoh yang representatif).
  const sampleRows = await db.execute(sql`
    SELECT x.id, x.service_name, x.price FROM (
      SELECT s.id, s.service_name, s.price,
        ROW_NUMBER() OVER (ORDER BY s.price, s.id) AS rp,
        COUNT(*) OVER () AS n
      FROM services s
      WHERE s.price > 0
    ) x
    WHERE x.rp = FLOOR((x.n + 1) / 2)
    LIMIT 1
  `);
  const sample = (
    Array.isArray((sampleRows as any)[0]) ? (sampleRows as any)[0] : (sampleRows as any)
  )[0] as { id: number | string; service_name: string; price: number | string } | undefined;

  // Admin roles + list admin users
  const adminRows = await db.execute(sql`
    SELECT u.id, u.username, u.email, u.level, u.created_at,
      ar.role, ar.permissions
    FROM users u
    LEFT JOIN admin_roles ar ON ar.user_id = u.id
    WHERE u.level = 'Admin'
    ORDER BY u.id ASC
  `);
  const adminUsers = ((adminRows as any)[0] ?? []).map((r: any) => ({
    id: Number(r.id),
    username: String(r.username),
    email: String(r.email ?? ""),
    level: String(r.level),
    createdAt: r.created_at,
    role: (r.role as string | null) ?? "admin",
    permissions: r.permissions as unknown,
  }));

  // System info
  const statsRaw = await db
    .execute(
      sql`
    SELECT
      (SELECT COUNT(*) FROM users) AS users_total,
      (SELECT COUNT(*) FROM users WHERE DATE(created_at) = CURDATE()) AS users_today,
      (SELECT COUNT(*) FROM orders) AS orders_total,
      (SELECT COUNT(*) FROM orders WHERE status IN ('Pending','Processing','In progress')) AS orders_active,
      (SELECT COUNT(*) FROM job_queue WHERE status = 'pending') AS queue_pending
  `,
    )
    .catch(() => [[{}]] as any);
  const stats = ((statsRaw as any)[0] ?? [{}])[0] ?? {};

  return {
    maintenance,
    api2fa,
    apiPublic,
    signupVerify,
    pricing: pricingList.map((p) => ({
      id: p.id,
      level: p.level,
      markupPercent: p.markupPercent,
      flatPer1k: p.flatPer1k,
      minProfitPer1k: p.minProfitPer1k,
      isActive: Boolean(p.isActive),
    })),
    adminUsers,
    roleList: ROLE_LIST,
    sampleService: sample
      ? {
          id: Number(sample.id),
          name: String(sample.service_name),
          basePrice: Number(sample.price),
        }
      : null,
    system: {
      usersTotal: Number((stats as any).users_total ?? 0),
      usersToday: Number((stats as any).users_today ?? 0),
      ordersTotal: Number((stats as any).orders_total ?? 0),
      ordersActive: Number((stats as any).orders_active ?? 0),
      queuePending: Number((stats as any).queue_pending ?? 0),
      hasSmmturk: !!env.SOCIO_SMMTURK_KEY,
      hasResend: !!env.RESEND_API_KEY,
      hasDbUrl: !!env.SOCIO_DB_URL,
      nodeEnv: env.NODE_ENV ?? "development",
    },
  };
};

export const actions: Actions = {
  maintenance: async ({ request, locals }) => {
    assertAdmin(locals);
    const _rate = await assertAdminRate(
      "settings-maintenance",
      (locals as any).ip ?? "0.0.0.0",
      10,
      60,
    );
    if (_rate) return _rate;
    const form = await request.formData();
    const on = form.get("on") === "1";
    await setSetting("maintenance_mode", on ? "1" : "0");
    await logAudit({
      adminId: Number(locals.user!.id),
      action: on ? "enable_maintenance" : "disable_maintenance",
      entity: "system",
      ip: (locals as any).ip,
    });
    return { success: on ? "Maintenance mode AKTIF." : "Maintenance mode nonaktif." };
  },

  // toggle2fa dihapus sampai enforcement TOTP ada (M3.5) — audit 1.5: display-only toggle = false sense of security.

  togglePublicApi: async ({ request, locals }) => {
    assertAdmin(locals);
    const _rate = await assertAdminRate(
      "settings-public-api",
      (locals as any).ip ?? "0.0.0.0",
      10,
      60,
    );
    if (_rate) return _rate;
    const form = await request.formData();
    const on = form.get("on") === "1";
    await setSetting("public_api_enabled", on ? "1" : "0");
    await logAudit({
      adminId: Number(locals.user!.id),
      action: on ? "enable_public_api" : "disable_public_api",
      entity: "api",
      ip: (locals as any).ip,
    });
    return { success: on ? "API publik AKTIF." : "API publik nonaktif." };
  },

  toggleSignupVerify: async ({ request, locals }) => {
    assertAdmin(locals);
    const _rate = await assertAdminRate(
      "settings-signup-verify",
      (locals as any).ip ?? "0.0.0.0",
      10,
      60,
    );
    if (_rate) return _rate;
    const form = await request.formData();
    const on = form.get("on") === "1";
    await setSetting("signup_verify_required", on ? "1" : "0");
    await logAudit({
      adminId: Number(locals.user!.id),
      action: on ? "enable_signup_verify" : "disable_signup_verify",
      entity: "auth",
      ip: (locals as any).ip,
    });
    return { success: on ? "Verifikasi signup AKTIF." : "Verifikasi signup nonaktif." };
  },

  updatePricing: async ({ request, locals }) => {
    assertAdmin(locals);
    const _rate = await assertAdminRate(
      "settings-pricing",
      (locals as any).ip ?? "0.0.0.0",
      10,
      60,
    );
    if (_rate) return _rate;
    const form = await request.formData();
    const id = Number(form.get("id"));
    const markup = Number(form.get("markupPercent"));
    const flat = Number(form.get("flatPer1k") ?? 0);
    const minProfit = Number(form.get("minProfitPer1k") ?? 0);
    if (!id) return fail(400, { error: "ID tidak valid." });
    if (Number.isNaN(markup) || markup < 0 || markup > 1000)
      return fail(400, { error: "Markup harus 0-1000." });

    await db
      .update(pricingRules)
      .set({ markupPercent: markup, flatPer1k: flat, minProfitPer1k: minProfit })
      .where(eq(pricingRules.id, id));
    await logAudit({
      adminId: Number(locals.user!.id),
      action: "update_pricing",
      entity: "pricing_rule",
      entityId: id,
      detail: { markup, flat, minProfit },
      ip: (locals as any).ip,
    });
    return { success: "Pricing rule diperbarui." };
  },

  /** Seed default pricing rules (hanya kalau tabel kosong). */
  seed: async ({ locals }) => {
    assertAdmin(locals);
    const _rate = await assertAdminRate("settings-seed", (locals as any).ip ?? "0.0.0.0", 3, 60);
    if (_rate) return _rate;
    const [count] = await db.select({ c: sql<number>`count(*)` }).from(pricingRules);
    if (Number(count?.c ?? 0) > 0)
      return fail(409, { error: "Pricing rule sudah ada. Pakai 'Terapkan default'." });
    await db.insert(pricingRules).values(
      DEFAULT_PRICING_RULES.map((r) => ({
        level: r.level,
        markupPercent: r.markupPercent,
        flatPer1k: r.flatPer1k,
        minProfitPer1k: r.minProfitPer1k,
        isActive: 1,
      })),
    );
    await logAudit({
      adminId: Number(locals.user!.id),
      action: "seed_pricing",
      entity: "pricing_rule",
      ip: (locals as any).ip,
    });
    return { success: "Default pricing rule dibuat." };
  },

  /** Terapkan default (Member+200/Agen+150/Reseller+180/Admin 0) ke semua level. */
  applyDefaults: async ({ locals }) => {
    assertAdmin(locals);
    const _rate = await assertAdminRate(
      "settings-apply-defaults",
      (locals as any).ip ?? "0.0.0.0",
      3,
      60,
    );
    if (_rate) return _rate;
    for (const r of DEFAULT_PRICING_RULES) {
      const [row] = await db
        .select({ id: pricingRules.id })
        .from(pricingRules)
        .where(eq(pricingRules.level, r.level))
        .limit(1);
      if (row) {
        await db
          .update(pricingRules)
          .set({
            markupPercent: r.markupPercent,
            flatPer1k: r.flatPer1k,
            minProfitPer1k: r.minProfitPer1k,
          })
          .where(eq(pricingRules.id, row.id));
      }
    }
    await logAudit({
      adminId: Number(locals.user!.id),
      action: "apply_default_pricing",
      entity: "pricing_rule",
      ip: (locals as any).ip,
    });
    return { success: "Default pricing diterapkan ke semua level." };
  },

  /** Salin markup Member ke semua level lain (rollback cepat). */
  bulkApply: async ({ request, locals }) => {
    assertAdmin(locals);
    const _rate = await assertAdminRate(
      "settings-bulk-apply",
      (locals as any).ip ?? "0.0.0.0",
      3,
      60,
    );
    if (_rate) return _rate;
    const form = await request.formData();
    const markup = Number(form.get("markup"));
    if (Number.isNaN(markup) || markup < 0 || markup > 1000)
      return fail(400, { error: "Markup tidak valid." });
    const rows = await db.select().from(pricingRules);
    const ids = rows.map((r) => r.id);
    if (ids.length)
      await db
        .update(pricingRules)
        .set({ markupPercent: markup })
        .where(inArray(pricingRules.id, ids));
    await logAudit({
      adminId: Number(locals.user!.id),
      action: "bulk_apply_pricing",
      entity: "pricing_rule",
      detail: { markup },
      ip: (locals as any).ip,
    });
    return { success: `Markup ${markup}% diterapkan ke semua level.` };
  },

  assignRole: async ({ request, locals }) => {
    assertAdmin(locals);
    const _rate = await assertAdminRate(
      "settings-assign-role",
      (locals as any).ip ?? "0.0.0.0",
      5,
      60,
    );
    if (_rate) return _rate;
    const form = await request.formData();
    const userId = Number(form.get("userId"));
    const role = String(form.get("role") ?? "admin");
    if (!userId) return fail(400, { error: "User wajib." });
    if (!ROLE_LIST.includes(role as (typeof ROLE_LIST)[number]))
      return fail(400, { error: "Role tidak valid." });

    // P0-10: hanya SuperAdmin yang boleh assign/ubah role (anti self-escalation).
    // Bootstrap: kalau belum ada satu pun role di tabel, admin mana pun boleh set pertama.
    const [mine] = await db
      .select({ role: adminRoles.role })
      .from(adminRoles)
      .where(eq(adminRoles.userId, Number(locals.user!.id)))
      .limit(1);
    if (!mine) {
      const [any] = await db.select({ id: adminRoles.id }).from(adminRoles).limit(1);
      if (any) return fail(403, { error: "Hanya SuperAdmin yang bisa mengubah role." });
    } else if (mine.role !== "superadmin") {
      return fail(403, { error: "Hanya SuperAdmin yang bisa mengubah role." });
    }

    const [existing] = await db
      .select()
      .from(adminRoles)
      .where(eq(adminRoles.userId, userId))
      .limit(1);
    if (existing) {
      await db.update(adminRoles).set({ role }).where(eq(adminRoles.userId, userId));
    } else {
      await db.insert(adminRoles).values({ userId, role });
    }
    await logAudit({
      adminId: Number(locals.user!.id),
      action: "assign_role",
      entity: "user",
      entityId: userId,
      detail: { role },
      ip: (locals as any).ip,
    });
    return { success: `Role @${form.get("username") || userId} → ${role}.` };
  },
};
