import { db } from "@socio/db";
import { provider } from "@socio/db/schema";
import { redirect, fail } from "@sveltejs/kit";
import { logAudit, assertAdmin, assertAdminRate, assertAdminCan } from "$lib/server/admin";
import { listRoutingRows, setRouting } from "$lib/server/category-routing";
import type { Actions, PageServerLoad } from "./$types";

/**
 * /admin/routing — routing per-kategori ke provider.
 *
 * Kategori yang punya baris routing dilayani provider itu (walau provider itu
 * bukan provider aktif global). Kategori tanpa routing ikut provider aktif
 * global.
 */

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(303, "/login");
  if (locals.user.level !== "Admin") throw redirect(303, "/");

  const rows = await listRoutingRows();
  const providers = await db
    .select({ id: provider.id, name: provider.name, status: provider.status })
    .from(provider)
    .orderBy(provider.id);

  return {
    rows,
    providers: providers.map((p) => ({
      id: Number(p.id),
      name: String(p.name),
      active: Number(p.status ?? 0) === 1,
    })),
  };
};

export const actions: Actions = {
  /** Set routing satu kategori (providerId kosong = lepas routing). */
  setRouting: async ({ request, locals }) => {
    assertAdmin(locals);
    const _g = await assertAdminCan(locals, "providers:edit");
    if (_g) return _g;
    const _rate = await assertAdminRate(
      "routing-set",
      (locals as any).ip ?? "0.0.0.0",
      20,
      60,
    );
    if (_rate) return _rate;

    const form = await request.formData();
    const categoryId = Number(form.get("categoryId"));
    const providerRaw = String(form.get("providerId") ?? "").trim();
    const providerId = providerRaw ? Number(providerRaw) : null;

    if (!Number.isFinite(categoryId) || categoryId <= 0) {
      return fail(400, { error: "Kategori tidak valid." });
    }
    if (providerId !== null && (!Number.isFinite(providerId) || providerId <= 0)) {
      return fail(400, { error: "Provider tidak valid." });
    }

    const result = await setRouting(categoryId, providerId);
    if (!result.ok) {
      const msg =
        result.reason === "no_services"
          ? "Kategori ini belum punya layanan — routing tak bisa dipasang."
          : result.reason === "provider_not_found"
            ? "Provider tidak ditemukan."
            : "Permintaan tidak valid.";
      return fail(400, { error: msg });
    }

    await logAudit({
      adminId: Number(locals.user!.id),
      action: providerId === null ? "unset_category_routing" : "set_category_routing",
      entity: "category",
      entityId: categoryId,
      detail: { providerId, affected: result.affected },
      ip: (locals as any).ip,
    });

    return {
      success:
        providerId === null
          ? `Routing kategori #${categoryId} dilepas — kembali ke provider aktif global. ${result.affected} layanan berubah.`
          : `Kategori #${categoryId} kini dilayani provider #${providerId}. ${result.affected} layanan berubah.`,
    };
  },
};
