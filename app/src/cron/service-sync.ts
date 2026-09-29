/**
 * Service catalog sync — port dari app.socio.id/lib/provider-sync.php (auto_price_update=1).
 *
 * Setelah provider_services ter-mirror (provider-sync.ts), cron ini:
 *  1. Auto-create kategori (resolve_category PHP) dari nama kategori provider
 *  2. Auto-create layanan baru ke `services` (status=1 aktif)
 *  3. Update harga + field lain layanan aktif yang berubah:
 *     price (Member) = ceil(rate_idr * (1 + markup_member/100))
 *     price_reseller = ceil(rate_idr * (1 + markup_reseller/100))
 *     price_api (Agen base) = ceil(rate_idr * (1 + markup_agen/100))
 *  4. Auto-disable (status=0) layanan aktif yang sudah tidak ada di provider
 *     dan auto-enable (status=1) yang kembali muncul (kalau tidak di-disable manual).
 *
 * PRD Service Sync v2 (§6-§10) — v2:
 *  - Simpan `type` ASLI dari API (sebelumnya hardcoded "Default" → bug).
 *  - Simpan flag `is_dripfeed` + `allow_cancel` dari API.
 *  - Simpan `service_name_raw` + `categories.name_raw` (jejak mentah provider untuk admin).
 *  - `service_name` + `categories.name` = display whitelabel (Socio, tanpa brand provider).
 *  - Set `created_at` / `updated_at` / `price_changed_at` secara akurat.
 *  - Tulis `service_changelog` per-field (retensi di cron cleanup).
 *  - Auto-tayang `news` (source='sync', event_type terstruktur) dengan dedupe 24 jam
 *    per (service_id + event_type) + cap 20 row per sync tick. Prioritas:
 *    new_service > discontinued > price_down > price_up.
 *  - Notif admin agregat per sync.
 *
 * BASELINE migration: baris lama punya `service_name_raw = ''` (default kolom baru).
 * Pada sync pertama setelah deploy, kolom audit di-fill tapi **tidak ada** event
 * `service_changelog`/`news` yang ditulis — mencegah banjir 8.000+ baris palsu.
 * Mulai sync ke-2 dst, diff-deteksi aktif normal.
 *
 * Markup diambil dari tabel pricing_rules (sumber kebenaran, di-cache 60s
 * via getPricingRules). Rate USD -> IDR via SOCIO_USD_TO_IDR (default 15.000).
 * Layanan yang di-disable manual oleh admin (manual_disabled) tidak akan
 * di-enable ulang otomatis — dilacak via kolom `note` tag [manual-off].
 */
import { db } from "@socio/db";
import {
  provider,
  providerServices,
  services,
  categories,
  adminNotifications,
  users,
  serviceChangelog,
  news,
} from "@socio/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { logSync } from "./provider-sync";
import { getPricingRules } from "$lib/server/pricing";
import { whitelabel } from "$lib/format";

// NOTE: konversi USD→IDR terjadi di provider-sync via getUsdToIdr() (kurs terpusat).
// File ini membaca ps.rate yang SUDAH IDR — tidak pakai rate langsung.
const MANUAL_OFF_TAG = "[manual-off]";
const NEWS_CAP_PER_SYNC = 20;
const NEWS_DEDUPE_HOURS = 24;

type ChangelogEvent =
  | "created"
  | "name_changed"
  | "category_changed"
  | "price_up"
  | "price_down"
  | "minmax_changed"
  | "type_changed"
  | "refill_changed"
  | "cancel_changed"
  | "dripfeed_changed"
  | "enabled"
  | "disabled";

interface ChangelogRow {
  providerId: number;
  serviceId: number;
  event: ChangelogEvent;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  detectedAt: Date;
}

interface NewsCandidate {
  kategori: string;
  content: string;
  eventType: "new_service" | "price_up" | "price_down" | "discontinued";
  serviceId: number;
}

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
      await logSync(
        providerId,
        "catalog",
        "error",
        0,
        0,
        0,
        "provider_services kosong — jalankan provider sync dulu",
      );
      return;
    }

    // Markup per level — dari pricing_rules (cache 60s)
    const rules = await getPricingRules();
    const mm = rules.Member?.markupPercent ?? 200; // default legacy: Member +200%
    const mr = rules.Reseller?.markupPercent ?? 150;
    const ma = rules.Agen?.markupPercent ?? 30;

    // Kategori: build display (whitelabel) + raw per display, lalu resolve/create.
    const catDisplayToRaw = new Map<string, string>();
    for (const ps of psRows) {
      const disp = whitelabel((ps.category || "").trim() || "Uncategorized");
      const raw = (ps.category || "").trim() || "Uncategorized";
      catDisplayToRaw.set(disp, raw);
    }
    const catIdByName = new Map<string, number>();
    for (const [disp, raw] of catDisplayToRaw) {
      const [existing] = await db
        .select({ id: categories.id, nameRaw: categories.nameRaw })
        .from(categories)
        .where(sql`${categories.name} = ${disp}`)
        .limit(1);
      if (existing) {
        catIdByName.set(disp, existing.id);
        // Update raw kalau beda (baseline-safe, tanpa event emit — kolom raw bukan
        // untuk user display, cukup jejak admin).
        if (existing.nameRaw !== raw) {
          await db.update(categories).set({ nameRaw: raw }).where(eq(categories.id, existing.id));
        }
      } else {
        await db.insert(categories).values({ name: disp, nameRaw: raw });
        const [row] = await db
          .select({ id: categories.id })
          .from(categories)
          .where(sql`${categories.name} = ${disp}`)
          .limit(1);
        catIdByName.set(disp, row?.id ?? 1);
      }
    }

    // Layanan existing milik provider ini — select kolom selengkap mungkin
    // untuk diff-deteksi granular.
    const svcRows = await db
      .select({
        id: services.id,
        providerServiceId: services.providerServiceId,
        categoryId: services.categoryId,
        type: services.type,
        serviceName: services.serviceName,
        serviceNameRaw: services.serviceNameRaw,
        price: services.price,
        min: services.min,
        max: services.max,
        isRefill: services.isRefill,
        allowCancel: services.allowCancel,
        isDripfeed: services.isDripfeed,
        status: services.status,
        note: services.note,
        createdAt: services.createdAt,
      })
      .from(services)
      .where(eq(services.providerId, providerId));
    const svcByPid = new Map(svcRows.map((s) => [String(s.providerServiceId), s]));

    let created = 0;
    let updated = 0;
    let enabled = 0;
    const priceChanges = { up: 0, down: 0 };
    const changelogRows: ChangelogRow[] = [];
    const newsCandidates: NewsCandidate[] = [];

    const now = new Date();
    const nowStr = now.toISOString().slice(0, 19).replace("T", " ");
    const rpFmt = new Intl.NumberFormat("id-ID");

    for (const ps of psRows) {
      const pid = String(ps.providerServiceId);
      const rateIdr = Number(ps.rate ?? 0); // sudah IDR dari provider-sync
      const priceMember = Math.ceil(rateIdr * (1 + mm / 100));
      const priceReseller = Math.ceil(rateIdr * (1 + mr / 100));
      const priceAgen = Math.ceil(rateIdr * (1 + ma / 100));

      // Parse field tambahan dari raw JSON API (type + dripfeed — kolom tidak ada di
      // provider_services, hanya di payload mentah).
      const rawObj =
        (typeof ps.raw === "string"
          ? (JSON.parse(ps.raw as unknown as string) as any)
          : (ps.raw as any)) ?? {};
      const apiType = String(rawObj.type ?? "Default");
      const apiDrip =
        rawObj.dripfeed === true || rawObj.dripfeed === 1 || rawObj.dripfeed === "1" ? 1 : 0;
      const apiCancel = ps.cancel ? 1 : 0;
      const apiRefill = ps.refill ? 1 : 0;

      const rawName = ps.name;
      const dispName = whitelabel(rawName);
      const dispCat = whitelabel((ps.category || "").trim() || "Uncategorized");
      const catId = catIdByName.get(dispCat) ?? 1;
      const min = Number(ps.min ?? 0);
      const max = Number(ps.max ?? 0);

      const svc = svcByPid.get(pid);

      if (!svc) {
        // ── CREATE baru ──
        await db.insert(services).values({
          categoryId: catId,
          type: apiType,
          serviceName: dispName,
          serviceNameRaw: rawName,
          note: "",
          price: priceMember,
          priceApi: priceAgen,
          priceReseller: priceReseller,
          profit: priceMember - rateIdr,
          profitReseller: priceReseller - rateIdr,
          profitAgen: priceAgen - rateIdr,
          min,
          max,
          status: 1,
          providerId,
          providerServiceId: Number(pid) || 0,
          waktu: nowStr,
          isRefill: apiRefill,
          allowCancel: apiCancel,
          isDripfeed: apiDrip,
          createdAt: now,
          updatedAt: now,
        });
        created++;

        // Ambil id service baru (untuk changelog + news + deep-link /pesan?service=)
        const [row] = await db
          .select({ id: services.id })
          .from(services)
          .where(
            and(
              eq(services.providerId, providerId),
              eq(services.providerServiceId, Number(pid) || 0),
            ),
          )
          .orderBy(sql`${services.id} DESC`)
          .limit(1);
        const newSvcId = Number(row?.id ?? 0);
        if (newSvcId) {
          changelogRows.push({
            providerId,
            serviceId: newSvcId,
            event: "created",
            field: "service_name",
            oldValue: null,
            newValue: dispName,
            detectedAt: now,
          });
          newsCandidates.push({
            kategori: "Layanan Baru",
            content: `Layanan baru tersedia: ${dispName}`,
            eventType: "new_service",
            serviceId: newSvcId,
          });
        }
      } else {
        // ── UPDATE / ENABLE ulang ──
        // Baseline = kolom raw masih kosong (default kolom baru dari ALTER).
        // Pada sync pertama setelah deploy, kita tulis raw + type + flags + timestamps
        // TAPI tidak emit changelog/news (mencegah banjir 8.000 baris palsu).
        const isBaseline = !svc.serviceNameRaw;
        const isManualOff = (svc.note ?? "").includes(MANUAL_OFF_TAG);

        const patch: Record<string, unknown> = {
          categoryId: catId,
          type: apiType,
          serviceName: dispName,
          serviceNameRaw: rawName,
          price: priceMember,
          priceApi: priceAgen,
          priceReseller: priceReseller,
          profit: priceMember - rateIdr,
          profitReseller: priceReseller - rateIdr,
          profitAgen: priceAgen - rateIdr,
          min,
          max,
          isRefill: apiRefill,
          allowCancel: apiCancel,
          isDripfeed: apiDrip,
          waktu: nowStr,
        };
        if (!svc.createdAt) patch.createdAt = now;

        // Hitung diff PER FIELD (untuk changelog + updatedAt/priceChangedAt).
        type Diff = { event: ChangelogEvent; field: string; old: string; cur: string };
        const diffs: Diff[] = [];
        if (svc.serviceName !== dispName)
          diffs.push({
            event: "name_changed",
            field: "service_name",
            old: svc.serviceName,
            cur: dispName,
          });
        if (svc.categoryId !== catId)
          diffs.push({
            event: "category_changed",
            field: "category_id",
            old: String(svc.categoryId),
            cur: String(catId),
          });
        if (svc.type !== apiType)
          diffs.push({ event: "type_changed", field: "type", old: svc.type, cur: apiType });
        if (svc.min !== min || svc.max !== max)
          diffs.push({
            event: "minmax_changed",
            field: "min_max",
            old: `${svc.min}-${svc.max}`,
            cur: `${min}-${max}`,
          });
        if (svc.isRefill !== apiRefill)
          diffs.push({
            event: "refill_changed",
            field: "is_refill",
            old: String(svc.isRefill),
            cur: String(apiRefill),
          });
        if (svc.allowCancel !== apiCancel)
          diffs.push({
            event: "cancel_changed",
            field: "allow_cancel",
            old: String(svc.allowCancel),
            cur: String(apiCancel),
          });
        if (svc.isDripfeed !== apiDrip)
          diffs.push({
            event: "dripfeed_changed",
            field: "is_dripfeed",
            old: String(svc.isDripfeed),
            cur: String(apiDrip),
          });
        if (svc.price !== priceMember) {
          patch.priceChangedAt = now;
          diffs.push({
            event: priceMember > svc.price ? "price_up" : "price_down",
            field: "price",
            old: String(svc.price),
            cur: String(priceMember),
          });
        }

        // Set updatedAt HANYA kalau benar-benar ada diff (bukan sekadar sync-time).
        if (diffs.length > 0 || isBaseline) patch.updatedAt = now;

        if (svc.status === 1) {
          await db.update(services).set(patch).where(eq(services.id, svc.id));
          updated++;
        } else if (!isManualOff) {
          await db
            .update(services)
            .set({ ...patch, status: 1 })
            .where(eq(services.id, svc.id));
          enabled++;
          if (!isBaseline) {
            diffs.push({ event: "enabled", field: "status", old: "0", cur: "1" });
          }
        }

        // Emit changelog + news hanya kalau BUKAN baseline (first run = migration silent).
        if (!isBaseline) {
          for (const d of diffs) {
            changelogRows.push({
              providerId,
              serviceId: svc.id,
              event: d.event,
              field: d.field,
              oldValue: d.old,
              newValue: d.cur,
              detectedAt: now,
            });
            if (d.event === "price_up" || d.event === "price_down") {
              priceChanges[d.event === "price_up" ? "up" : "down"]++;
              const isUp = d.event === "price_up";
              newsCandidates.push({
                kategori: isUp ? "Harga Naik" : "Harga Turun",
                content: `${dispName} — ${isUp ? "harga naik" : "harga turun"} Rp ${rpFmt.format(
                  Number(d.old),
                )} → Rp ${rpFmt.format(Number(d.cur))} /1k`,
                eventType: d.event,
                serviceId: svc.id,
              });
            }
          }
        }
      }
    }

    // Auto-disable: layanan aktif yang TIDAK ada di provider lagi
    const livePids = psRows.map((r) => Number(r.providerServiceId) || 0);
    const activeSvcs = svcRows.filter((s) => s.status === 1);
    const toDisable = activeSvcs.filter((s) => !livePids.includes(Number(s.providerServiceId)));
    for (const s of toDisable) {
      await db.update(services).set({ status: 0, updatedAt: now }).where(eq(services.id, s.id));
      const isBaseline = !s.serviceNameRaw;
      if (!isBaseline) {
        changelogRows.push({
          providerId,
          serviceId: s.id,
          event: "disabled",
          field: "status",
          oldValue: "1",
          newValue: "0",
          detectedAt: now,
        });
        newsCandidates.push({
          kategori: "Layanan Dihentikan",
          content: `Layanan dihentikan: ${s.serviceName}`,
          eventType: "discontinued",
          serviceId: s.id,
        });
      }
    }

    // Bulk insert changelog (batch, 1 statement — murah).
    if (changelogRows.length) {
      try {
        await db.insert(serviceChangelog).values(changelogRows);
      } catch (e) {
        console.error("[cron] service-sync changelog insert failed:", e);
      }
    }

    // News: dedupe per (service_id + event_type) dalam 24 jam + cap 20 + sort prioritas.
    let newsInserted = 0;
    if (newsCandidates.length) {
      try {
        const since = new Date(Date.now() - NEWS_DEDUPE_HOURS * 3600 * 1000);
        const existing = await db
          .select({ serviceId: news.serviceId, eventType: news.eventType })
          .from(news)
          .where(and(eq(news.source, "sync"), sql`${news.createdAt} > ${since}`))
          .limit(5000);
        const existingKeys = new Set(existing.map((e) => `${e.serviceId}:${e.eventType}`));
        const fresh = newsCandidates.filter(
          (n) => !existingKeys.has(`${n.serviceId}:${n.eventType}`),
        );
        const prio = (t: NewsCandidate["eventType"]) =>
          t === "new_service" ? 0 : t === "discontinued" ? 1 : t === "price_down" ? 2 : 3;
        fresh.sort((a, b) => prio(a.eventType) - prio(b.eventType));
        const toInsert = fresh.slice(0, NEWS_CAP_PER_SYNC);
        if (toInsert.length) {
          await db.insert(news).values(
            toInsert.map((n) => ({
              kategori: n.kategori,
              content: n.content,
              eventType: n.eventType,
              source: "sync" as const,
              serviceId: n.serviceId,
              isHidden: 0,
              createdAt: now,
            })),
          );
          newsInserted = toInsert.length;
        }
      } catch (e) {
        console.error("[cron] service-sync news insert failed:", e);
      }
    }

    await logSync(
      providerId,
      "catalog",
      "ok",
      Date.now() - start,
      psRows.length,
      created,
      `updated=${updated} enabled=${enabled} disabled=${toDisable.length} priceUp=${priceChanges.up} priceDown=${priceChanges.down}`,
    );

    // Notif admin agregat per sync (PRD §8).
    // Harga berubah = dihitung; tidak per-row (spam). Admin bisa drill-down
    // ke /admin/services?tab=history.
    const hasChanges =
      created > 0 || toDisable.length > 0 || enabled > 0 || priceChanges.up + priceChanges.down > 0;
    if (hasChanges) {
      try {
        const parts: string[] = [];
        if (created > 0) parts.push(`${created} baru`);
        if (enabled > 0) parts.push(`${enabled} aktif lagi`);
        if (toDisable.length > 0) parts.push(`${toDisable.length} dihentikan`);
        if (priceChanges.down > 0) parts.push(`${priceChanges.down} harga turun`);
        if (priceChanges.up > 0) parts.push(`${priceChanges.up} harga naik`);
        const admins = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.level, "Admin" as any))
          .limit(50);
        for (const a of admins) {
          await db.insert(adminNotifications).values({
            adminId: Number(a.id),
            type: "system",
            title: `Sync layanan: ${parts.join(" · ")}`,
            message: `Provider ${p.name} (id ${providerId}) — detail di tab Riwayat.`,
            actionUrl: "/admin/services?tab=history",
            priority: created > 50 || toDisable.length > 50 ? "high" : "low",
            createdAt: now,
          } as any);
        }
      } catch {
        /* best-effort — jangan gagalin sync karena notif gagal */
      }
    }

    console.log(
      `[cron] service-sync: fetched=${psRows.length} created=${created} updated=${updated} enabled=${enabled} disabled=${toDisable.length} priceUp=${priceChanges.up} priceDown=${priceChanges.down} changelog=${changelogRows.length} newsIns=${newsInserted}`,
    );
  } catch (e: any) {
    await logSync(
      providerId,
      "catalog",
      "error",
      Date.now() - start,
      0,
      0,
      String(e?.message ?? e),
    );
    console.error("[cron] service-sync error:", e);
    throw e;
  }
}

export async function runAllServiceSync(): Promise<void> {
  const rows = await db
    .select({ id: provider.id })
    .from(provider)
    .where(
      and(
        sql`${provider.apiKey} <> ''`,
        sql`${provider.apiKey} IS NOT NULL`,
        sql`${provider.id} <> 1`,
      ),
    );
  for (const r of rows) {
    try {
      await runServiceSync(Number(r.id));
    } catch (e: any) {
      console.error(`[cron] service-sync provider ${r.id} failed:`, e?.message ?? e);
    }
  }
}
