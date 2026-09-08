/**
 * Service catalog sync — port dari app.socio.id/lib/provider-sync.php (auto_price_update=1).
 *
 * Setelah provider_services ter-mirror (provider-sync.ts), cron ini:
 *  1. Auto-create kategori (resolve_category PHP) dari nama kategori provider
 *  2. Auto-create layanan baru ke `services` (status=1 aktif)
 *  3. Update harga layanan aktif yang rate-nya berubah:
 *     price (Member) = ceil(rate_idr * (1 + markup_member/100))
 *     price_reseller = ceil(rate_idr * (1 + markup_reseller/100))
 *     price_api (Agen base) = ceil(rate_idr * (1 + markup_agen/100))
 *  4. Auto-disable (status=0) layanan aktif yang sudah tidak ada di provider
 *     dan auto-enable (status=1) yang kembali muncul (kalau tidak di-disable manual).
 *
 * Markup diambil dari tabel pricing_rules (sumber kebenaran, di-cache 60s
 * via getPricingRules). Rate USD -> IDR via SOCIO_USD_TO_IDR (default 15.000).
 * Layanan yang di-disable manual oleh admin (manual_disabled) tidak akan
 * di-enable ulang otomatis — dilacak via kolom `note` tag [manual-off].
 */
import { db } from "@socio/db";
import { provider, providerServices, services, categories } from "@socio/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { logSync } from "./provider-sync";
import { getPricingRules } from "$lib/server/pricing";

const USD_TO_IDR = Number(process.env.SOCIO_USD_TO_IDR ?? "15000");
const MANUAL_OFF_TAG = "[manual-off]";

export async function runServiceSync(providerId: number): Promise<void> {
  const start = Date.now();
  try {
    const [p] = await db.select().from(provider).where(eq(provider.id, providerId)).limit(1);
    if (!p) {
      await logSync(providerId, "catalog", "error", 0, 0, 0, "provider not found");
      return;
    }

    // Ambil mirror katalog provider
    const psRows = await db
      .select()
      .from(providerServices)
      .where(eq(providerServices.providerId, providerId));
    if (psRows.length === 0) {
      await logSync(providerId, "catalog", "error", 0, 0, 0, "provider_services kosong — jalankan provider sync dulu");
      return;
    }

    // Markup per level — dari pricing_rules (cache 60s)
    const rules = await getPricingRules();
    const mm = rules.Member?.markupPercent ?? 200; // default legacy: Member +200%
    const mr = rules.Reseller?.markupPercent ?? 150;
    const ma = rules.Agen?.markupPercent ?? 30;

    // Kategori: resolve/create semua kategori unik
    const catNames = [...new Set(psRows.map((r) => (r.category || "").trim() || "Uncategorized"))];
    const catIdByName = new Map<string, number>();
    for (const cname of catNames) {
      const [existing] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(sql`${categories.name} = ${cname}`)
        .limit(1);
      if (existing) catIdByName.set(cname, existing.id);
      else {
        const ins = await db.insert(categories).values({ name: cname });
        const [row] = await db.select({ id: categories.id }).from(categories).where(sql`${categories.name} = ${cname}`).limit(1);
        catIdByName.set(cname, row?.id ?? 1);
      }
    }

    // Layanan aktif milik provider ini
    const svcRows = await db
      .select({
        id: services.id,
        providerServiceId: services.providerServiceId,
        status: services.status,
        note: services.note,
      })
      .from(services)
      .where(eq(services.providerId, providerId));
    const svcByPid = new Map(svcRows.map((s) => [String(s.providerServiceId), s]));

    let created = 0;
    let updated = 0;
    let enabled = 0;

    for (const ps of psRows) {
      const pid = String(ps.providerServiceId);
      const rateIdr = Number(ps.rate ?? 0); // sudah IDR dari provider-sync
      const priceMember = Math.ceil(rateIdr * (1 + mm / 100));
      const priceReseller = Math.ceil(rateIdr * (1 + mr / 100));
      const priceAgen = Math.ceil(rateIdr * (1 + ma / 100));
      const catId = catIdByName.get((ps.category || "").trim() || "Uncategorized") ?? 1;
      const svc = svcByPid.get(pid);

      if (!svc) {
        // Create baru — aktif
        await db.insert(services).values({
          categoryId: catId,
          type: "Default",
          serviceName: ps.name,
          note: "",
          price: priceMember,
          priceApi: priceAgen,
          priceReseller: priceReseller,
          profit: priceMember - rateIdr,
          profitReseller: priceReseller - rateIdr,
          profitAgen: priceAgen - rateIdr,
          min: Number(ps.min ?? 0),
          max: Number(ps.max ?? 0),
          status: 1,
          providerId,
          providerServiceId: Number(pid) || 0,
          waktu: new Date().toISOString().slice(0, 19).replace("T", " "),
          isRefill: ps.refill ? 1 : 0,
        });
        created++;
      } else {
        // Update harga kalau masih aktif ATAU auto-enable kalau kembali muncul
        // (kecuali manual-off — admin sengaja matikan)
        const isManualOff = (svc.note ?? "").includes(MANUAL_OFF_TAG);
        const patch: any = {
          price: priceMember,
          priceApi: priceAgen,
          priceReseller: priceReseller,
          profit: priceMember - rateIdr,
          profitReseller: priceReseller - rateIdr,
          profitAgen: priceAgen - rateIdr,
          min: Number(ps.min ?? 0),
          max: Number(ps.max ?? 0),
          isRefill: ps.refill ? 1 : 0,
          waktu: new Date().toISOString().slice(0, 19).replace("T", " "),
        };
        if (svc.status === 1) {
          await db.update(services).set(patch).where(eq(services.id, svc.id));
          updated++;
        } else if (!isManualOff) {
          // kembali muncul di provider & tidak manual-off → enable
          await db
            .update(services)
            .set({ ...patch, status: 1 })
            .where(eq(services.id, svc.id));
          enabled++;
        }
      }
    }

    // Auto-disable: layanan aktif yang TIDAK ada di provider lagi
    const livePids = psRows.map((r) => Number(r.providerServiceId) || 0);
    const activeSvcs = svcRows.filter((s) => s.status === 1);
    const toDisable = activeSvcs.filter((s) => !livePids.includes(Number(s.providerServiceId)));
    for (const s of toDisable) {
      await db.update(services).set({ status: 0 }).where(eq(services.id, s.id));
    }

    await logSync(
      providerId,
      "catalog",
      "ok",
      Date.now() - start,
      psRows.length,
      created,
      `updated=${updated} enabled=${enabled} disabled=${toDisable.length}`,
    );
    console.log(
      `[cron] service-sync: fetched=${psRows.length} created=${created} updated=${updated} enabled=${enabled} disabled=${toDisable.length}`,
    );
  } catch (e: any) {
    await logSync(providerId, "catalog", "error", Date.now() - start, 0, 0, String(e?.message ?? e));
    console.error("[cron] service-sync error:", e);
    throw e;
  }
}

export async function runAllServiceSync(): Promise<void> {
  const rows = await db
    .select({ id: provider.id })
    .from(provider)
    .where(and(sql`${provider.apiKey} <> ''`, sql`${provider.apiKey} IS NOT NULL`, sql`${provider.id} <> 1`));
  for (const r of rows) {
    try {
      await runServiceSync(Number(r.id));
    } catch (e: any) {
      console.error(`[cron] service-sync provider ${r.id} failed:`, e?.message ?? e);
    }
  }
}
