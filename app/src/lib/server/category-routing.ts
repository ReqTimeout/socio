import { db } from "@socio/db";
import {
  categories,
  services,
  provider,
  categoryProviderRouting,
} from "@socio/db/schema";
import { eq, inArray, sql } from "drizzle-orm";
import {
  clearCategoryRoutingCache,
  getActiveProviderId,
  getCategoryRoutingMap,
} from "./active-provider";
import { getPricingRules } from "./pricing";
import { MANUAL_OFF_TAG, planReconcile, deriveServingState, type ServingState } from "@socio/core/routing-policy";
import { kindOf, type ServiceKind } from "@socio/core/kind-signature";

/**
 * category-routing.ts — sumber tunggal untuk halaman /admin/routing + badge
 * "Served by" di /admin/services & /admin/categories.
 *
 * Routing per-kategori (lihat schema routing.ts): kategori yang punya baris
 * `category_provider_routing` (is_active=1) dilayani provider itu walau bukan
 * provider aktif global. Kategori tanpa baris ikut aturan satu-aktif default.
 *
 * "Serving state" (apa yang dilihat owner):
 *   - routed        → ada baris routing → dilayani provider target (aktifkan
 *                     layanan provider itu, matikan provider lain di kategori ini)
 *   - active-global → tidak diroute, tapi provider-nya = provider aktif global
 *   - off-manual    → semua layanan mati + semuanya bertag [manual-off]
 *   - inactive      → tidak diroute & provider-nya bukan yang aktif (default off)
 *
 * Catatan .id: markup di .id bersifat PER-LEVEL (tabel pricing_rules) — tidak
 * ada override per kategori seperti .my. Jadi routing provider TIDAK mengubah
 * margin: harga jual tetap dihitung dari pricing_rules level yang sama.
 */

export type { ServingState } from "@socio/core/routing-policy";

export type RoutingRow = {
  id: number;
  name: string;
  kind: ServiceKind;
  total: number;
  active: number;
  providerIds: number[];
  providerNames: string[];
  routingProviderId: number | null;
  routingProviderName: string | null;
  state: ServingState;
  markup: { Member: number; Reseller: number; Agen: number };
};

type ProviderRef = { id: number; name: string };

/** Semua kategori + kondisi routing-nya, terurut nama. Dipakai /admin/routing. */
export async function listRoutingRows(): Promise<RoutingRow[]> {
  const [catRows, provRows, routingMap, activeId, rules] = await Promise.all([
    db
      .select({
        id: categories.id,
        name: categories.name,
        total: sql<number>`COUNT(${services.id})`,
        active: sql<number>`COALESCE(SUM(CASE WHEN ${services.status} = 1 THEN 1 ELSE 0 END), 0)`,
        providerIds: sql<string>`COALESCE(GROUP_CONCAT(DISTINCT ${services.providerId}), '')`,
        manualOff: sql<number>`COALESCE(SUM(CASE WHEN ${services.note} LIKE ${`%${MANUAL_OFF_TAG}%`} THEN 1 ELSE 0 END), 0)`,
      })
      .from(categories)
      .leftJoin(services, eq(services.categoryId, categories.id))
      .groupBy(categories.id, categories.name),
    db.select({ id: provider.id, name: provider.name }).from(provider),
    getCategoryRoutingMap(),
    getActiveProviderId(),
    getPricingRules(),
  ]);

  const provById = new Map<number, ProviderRef>(
    provRows.map((p) => [Number(p.id), { id: Number(p.id), name: String(p.name) }]),
  );

  const out: RoutingRow[] = [];
  for (const r of catRows) {
    const id = Number(r.id);
    const providerIds = String(r.providerIds)
      .split(",")
      .map((x) => Number(x.trim()))
      .filter((n) => Number.isFinite(n) && n > 0);
    const routingProviderId = routingMap.get(id) ?? null;
    const total = Number(r.total ?? 0);
    const active = Number(r.active ?? 0);
    const manualOff = Number(r.manualOff ?? 0);

    const state = deriveServingState({
      routingProviderId,
      providerIds,
      activeId,
      total,
      active,
      manualOff,
    });

    out.push({
      id,
      name: String(r.name),
      kind: kindOf(String(r.name)),
      total,
      active,
      providerIds,
      providerNames: providerIds
        .map((pid) => provById.get(pid)?.name)
        .filter((x): x is string => !!x),
      routingProviderId,
      routingProviderName:
        routingProviderId !== null ? provById.get(routingProviderId)?.name ?? null : null,
      state,
      markup: {
        Member: rules.Member?.markupPercent ?? 0,
        Reseller: rules.Reseller?.markupPercent ?? 0,
        Agen: rules.Agen?.markupPercent ?? 0,
      },
    });
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

export type SetRoutingResult =
  | { ok: true; categoryId: number; providerId: number | null; affected: number }
  | { ok: false; reason: "invalid" | "provider_not_found" | "no_services" };

/**
 * Tulis/hapus routing satu kategori lalu rekonsiliasi status layanan kategori itu
 * LANGSUNG (tanpa menunggu cron): provider target di-enable (kecuali layanan yang
 * owner matikan manual via [manual-off]), provider lain di kategori itu di-disable
 * (TANPA tag [manual-off] — routing-lah yang membuatnya non-orderable, jadi lepas
 * routing otomatis mengembalikan keadaan default).
 *
 * providerId = null → lepas routing → kategori ikut aturan provider aktif global.
 */
export async function setRouting(
  categoryId: number,
  providerId: number | null,
): Promise<SetRoutingResult> {
  if (!Number.isFinite(categoryId) || categoryId <= 0) {
    return { ok: false, reason: "invalid" };
  }
  if (providerId !== null && (!Number.isFinite(providerId) || providerId <= 0)) {
    return { ok: false, reason: "invalid" };
  }

  // Validasi provider ada (kalau assign) + kategori punya layanan. Ambil
  // status+note sekali — juga jadi bahan rencana rekonsiliasi di bawah.
  const svc = await db
    .select({
      id: services.id,
      providerId: services.providerId,
      note: services.note,
      status: services.status,
    })
    .from(services)
    .where(eq(services.categoryId, categoryId));
  if (!svc.length) return { ok: false, reason: "no_services" };

  if (providerId !== null) {
    const [prov] = await db
      .select({ id: provider.id })
      .from(provider)
      .where(eq(provider.id, providerId))
      .limit(1);
    if (!prov) return { ok: false, reason: "provider_not_found" };

    await db
      .insert(categoryProviderRouting)
      .values({
        categoryId,
        providerId,
        isActive: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onDuplicateKeyUpdate({
        set: { providerId, isActive: 1, updatedAt: new Date() },
      });
  } else {
    await db
      .delete(categoryProviderRouting)
      .where(eq(categoryProviderRouting.categoryId, categoryId));
  }

  // Provider yang seharusnya melayani kategori ini setelah operasi:
  //   assign → providerId; unassign → provider aktif global (boleh null).
  const winner = providerId ?? (await getActiveProviderId());

  // Rekonsiliasi LANGSUNG via rencana murni (planReconcile = satu sumber dengan
  // selftest). Hanya baris yang benar-benar perlu flip yang ditulis, jadi
  // `affected` = jumlah perubahan nyata, dan routing yang dilepas mengembalikan
  // status default tanpa menyentuh layanan yang owner matikan manual.
  const plan = planReconcile(
    svc.map((s) => ({
      id: Number(s.id),
      providerId: Number(s.providerId),
      note: s.note == null ? null : String(s.note),
      status: Number(s.status ?? 0),
    })),
    winner,
  );
  let affected = 0;
  if (plan.enable.length) {
    await db
      .update(services)
      .set({ status: 1, updatedAt: new Date() })
      .where(inArray(services.id, plan.enable));
    affected += plan.enable.length;
  }
  if (plan.disable.length) {
    await db
      .update(services)
      .set({ status: 0, updatedAt: new Date() })
      .where(inArray(services.id, plan.disable));
    affected += plan.disable.length;
  }

  clearCategoryRoutingCache();
  return { ok: true, categoryId, providerId, affected };
}

/**
 * Rekonsiliasi MASAL status layanan seluruh katalog setelah provider aktif
 * berubah (dipakai action setActive). Satu UPDATE JOIN per arah — raw SQL
 * karena Drizzle tak mendukung UPDATE multi-tabel; performance-critical
 * (8.000+ baris per flip, harus selesai dalam 1 query).
 *
 * Aturan (sama dgn gerbang service-sync):
 *   - winner tiap kategori = provider target routing (kalau ada baris routing)
 *     atau provider aktif global (kalau kategori tak diroute).
 *   - layanan winner → status=1, KECUALI yang bertag [manual-off] (kontrak F2).
 *   - layanan selain winner → status=0 (TANPA tag: lepas routing/aktif akan
 *     menghidupkannya lagi).
 */
export async function reconcileAllServices(
  activeId: number | null,
): Promise<{ enabled: number; disabled: number }> {
  // Nonaktifkan dulu (winner tak tersentuh) — aman walau process di tengah jalan.
  const disabled = await db.execute(sql`
    UPDATE services s
    JOIN categories c ON c.id = s.category_id
    LEFT JOIN category_provider_routing r ON r.category_id = c.id AND r.is_active = 1
    SET s.status = 0
    WHERE s.status = 1
      AND NOT (
        (r.provider_id IS NOT NULL AND s.provider_id = r.provider_id)
        OR (r.provider_id IS NULL AND s.provider_id = ${activeId ?? -1})
      )
  `);
  const enabled = await db.execute(sql`
    UPDATE services s
    JOIN categories c ON c.id = s.category_id
    LEFT JOIN category_provider_routing r ON r.category_id = c.id AND r.is_active = 1
    SET s.status = 1
    WHERE s.status = 0
      AND s.note NOT LIKE ${"%[manual-off]%"}
      AND (
        (r.provider_id IS NOT NULL AND s.provider_id = r.provider_id)
        OR (r.provider_id IS NULL AND s.provider_id = ${activeId ?? -1})
      )
  `);
  const affected = (res: unknown): number => {
    const rows = res as any;
    const first = Array.isArray(rows?.[0]) ? rows[0] : Array.isArray(rows) ? rows : [];
    return Number(first?.[0]?.affectedRows ?? 0);
  };
  return { enabled: affected(enabled), disabled: affected(disabled) };
}
