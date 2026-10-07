import { db } from "@socio/db";
import { services, categories, savedLinks, orders, users, balanceLogs, provider } from "@socio/db/schema";
import { eq, desc, asc, sql } from "drizzle-orm";
import { fail, redirect } from "@sveltejs/kit";
import { computePrice, baseForLevel, effectivePer1k, type UserLevel } from "@socio/core/pricing";
import { PLATFORMS, detectPlatform, detectKind, type PlatformId } from "@socio/core/catalog";
import { smmturkAddFor } from "@socio/core/smmturk";
import { decryptSecret } from "$lib/server/crypto";
import { getPricingRules } from "$lib/server/pricing";
import { validateCoupon, consumeCoupon, releaseCoupon } from "$lib/server/coupons";
import { asciiSafe, whitelabel } from "$lib/format";
import type { PageServerLoad, Actions } from "./$types";

export const load: PageServerLoad = async ({ url, locals }) => {
  const serviceId = Number(url.searchParams.get("service") ?? 0);
  const prefillLink = url.searchParams.get("link") ?? "";
  const prefillQty = Number(url.searchParams.get("qty") ?? 0);
  const level = ((locals.user!.level as UserLevel) ?? "Member") as UserLevel;

  // Platform + hitungan layanan AKTIF — dihitung live dari nama layanan
  // (status=1) sehingga yang dinonaktifkan hilang otomatis dari chip.
  // Nama kategori mentah TIDAK PERNAH dikirim ke client lagi (anti-sampah).
  const activeNames = await db
    .select({ serviceName: services.serviceName, categoryId: services.categoryId })
    .from(services)
    .where(eq(services.status, 1));
  const counts = new Map<PlatformId, number>();
  const catPlatforms = new Map<number, Set<PlatformId>>();
  const catKinds = new Map<number, Set<string>>();
  for (const r of activeNames) {
    const p = detectPlatform(r.serviceName);
    const k = detectKind(r.serviceName);
    counts.set(p, (counts.get(p) ?? 0) + 1);
    if (!catPlatforms.has(r.categoryId)) catPlatforms.set(r.categoryId, new Set());
    catPlatforms.get(r.categoryId)!.add(p);
    if (!catKinds.has(r.categoryId)) catKinds.set(r.categoryId, new Set());
    catKinds.get(r.categoryId)!.add(k);
  }
  const platforms = PLATFORMS.filter((p) => (counts.get(p.id) ?? 0) > 0)
    .map((p) => ({ ...p, count: counts.get(p.id) ?? 0 }))
    .sort((a, b) => b.count - a.count);

  // Daftar kategori PROVIDER (1132 row) — tetap jadi PRIMARY source of truth.
  // Whitelabel diterapkan server-side (SMMTURK/Own/Exclusive dll) supaya client
  // tidak pernah melihat brand hulu. Sort alfabetis, hanya kategori yang punya
  // layanan aktif (JOIN exclude mati).
  const catRows = await db
    .select({
      id: categories.id,
      name: categories.name,
      svcCount: sql<number>`COUNT(${services.id})`,
    })
    .from(categories)
    .leftJoin(services, sql`${services.categoryId} = ${categories.id} AND ${services.status} = 1`)
    .groupBy(categories.id, categories.name)
    .having(sql`COUNT(${services.id}) > 0`)
    .orderBy(asc(categories.name));
  const cats = catRows.map((c) => ({
    id: c.id,
    name: whitelabel(c.name),
    count: Number(c.svcCount) || 0,
    platforms: Array.from(catPlatforms.get(c.id) ?? []),
    kinds: Array.from(catKinds.get(c.id) ?? []),
  }));

  // Bentuk AMAN untuk client: TIDAK ada harga base/modal (price, price_api,
  // price_reseller) maupun providerId — hanya harga efektif per-1000 level user.
  // Platform/jenis ikut dihitung server supaya deep-link langsung buka bucket benar.
  let service: null | {
    id: number;
    serviceName: string;
    type: string;
    min: number;
    max: number;
    isRefill: number;
    note: string;
    waktu: string;
    categoryId: number;
    pricePer1k: number;
    platform: PlatformId;
    kind: string;
  } = null;

  if (serviceId) {
    const [s] = await db
      .select({
        id: services.id,
        serviceName: services.serviceName,
        type: services.type,
        price: services.price,
        priceApi: services.priceApi,
        priceReseller: services.priceReseller,
        min: services.min,
        max: services.max,
        isRefill: services.isRefill,
        note: services.note,
        waktu: services.waktu,
        categoryId: services.categoryId,
      })
      .from(services)
      .where(eq(services.id, serviceId))
      .limit(1);
    if (s) {
      const modal = Number(s.priceApi ?? 0);
      const base = baseForLevel(
        { price: Number(s.price), priceApi: modal, priceReseller: Number(s.priceReseller) },
        level,
      );
      const rule = (await getPricingRules())[level];
      service = {
        id: s.id,
        serviceName: s.serviceName,
        type: s.type,
        min: s.min,
        max: s.max,
        isRefill: s.isRefill,
        note: s.note,
        waktu: s.waktu,
        categoryId: s.categoryId,
        pricePer1k: effectivePer1k(base, level, rule, modal),
        platform: detectPlatform(s.serviceName),
        kind: detectKind(s.serviceName),
      };
    }
  }

  const saved = await db
    .select({
      id: savedLinks.id,
      label: savedLinks.label,
      link: savedLinks.link,
      serviceId: savedLinks.serviceId,
    })
    .from(savedLinks)
    .where(eq(savedLinks.userId, Number(locals.user!.id)))
    .orderBy(desc(savedLinks.createdAt))
    .limit(10);

  return {
    service,
    // Daftar platform bersih + jumlah layanan aktif (live count, anti-sampah).
    platforms,
    // Daftar kategori dari PROVIDER (1132 aktif, sudah whitelabel). PRIMARY —
    // dropdown /pesan. Filter tambahan (platform/kind icon) ada di client.
    cats,
    saved,
    balance: locals.user!.balance ?? 0,
    level,
    prefill: { link: prefillLink, qty: prefillQty },
    // Catatan: harga base/modal & persentase markup TIDAK dikirim ke client.
    // Harga efektif per-1000 sudah dihitung server per level (lihat `service`
    // dan endpoint /pesan/services). Anti-kebocoran margin.
  };
};

/**
 * Deduct saldo atomik: `UPDATE users SET balance = balance - ? WHERE id = ? AND balance >= ?`.
 * Kembalikan jumlah row terdampak (0 = saldo tidak cukup). Anti race condition
 * kalau 2 request order paralel — tidak ada read-then-write.
 */
async function deductBalance(userId: number, amount: number): Promise<number> {
  const res = await db
    .update(users)
    .set({ balance: sql`${users.balance} - ${amount}` })
    .where(sql`${users.id} = ${userId} AND ${users.balance} >= ${amount}`);
  const rows: any = res;
  if (Array.isArray(rows) && typeof rows[0]?.affectedRows === "number") return rows[0].affectedRows;
  return Number(rows?.affectedRows ?? 1);
}

/** Kirim order ke provider sesuai mapping legacy (port order/new-action.php). */
async function sendToProvider(
  svc: {
    providerId: number;
    providerServiceId: number;
    type: string;
    isRefill: number;
  },
  link: string,
  quantity: number,
  komen: string,
): Promise<{ providerOrderId: string } | { error: string }> {
  if (svc.providerId === 1) return { providerOrderId: "0" }; // MANUAL

  const [p] = await db.select().from(provider).where(eq(provider.id, svc.providerId)).limit(1);
  if (!p || !p.apiKey || p.name === "MANUAL") return { providerOrderId: "0" };

  const key = decryptSecret(p.apiKey);
  if (!key) return { providerOrderId: "0" };

  try {
    const result =
      svc.type === "Custom Comments"
        ? await smmturkAddFor(p.apiUrlOrder, key, {
            service: String(svc.providerServiceId),
            link,
            comments: komen,
          })
        : svc.type === "Package"
          ? await smmturkAddFor(p.apiUrlOrder, key, {
              service: String(svc.providerServiceId),
              link,
            })
          : await smmturkAddFor(p.apiUrlOrder, key, {
              service: String(svc.providerServiceId),
              link,
              quantity,
            });
    if (result.error) return { error: result.error };
    return { providerOrderId: result.order ?? "0" };
  } catch (e: any) {
    return { error: e?.message ?? String(e) };
  }
}

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const form = await request.formData();
    const serviceId = Number(form.get("serviceId"));
    const link = String(form.get("link") ?? "").trim();
    const quantity = Number(form.get("quantity")) || 0;
    const komen = String(form.get("komen") ?? "").trim();
    const saveLink = form.get("saveLink") === "on";

    if (!serviceId || !link) {
      return fail(400, { error: "Layanan dan link wajib diisi." });
    }

    const [s] = await db.select().from(services).where(eq(services.id, serviceId)).limit(1);
    if (!s) return fail(400, { error: "Layanan tidak ditemukan." });

    // Custom Comments: qty dari line count komen, bukan input quantity
    const isCustomComments = s.type === "Custom Comments";
    const finalQty = isCustomComments ? komen.split("\n").filter(Boolean).length : quantity;

    if (isCustomComments && !komen) {
      return fail(400, { error: "Komentar wajib diisi untuk layanan Custom Comments." });
    }
    if (!isCustomComments && (!finalQty || finalQty < s.min)) {
      return fail(400, { error: `Jumlah minimal ${s.min}.` });
    }
    if (finalQty > s.max) {
      return fail(400, { error: `Jumlah maksimal ${s.max}.` });
    }

    const userId = Number(locals.user!.id);
    const level = (locals.user!.level as UserLevel) ?? "Member";

    // Gate aktivasi reseller: order diblokir sampai verify=Yes (biaya
    // pendaftaran lunas + admin confirm). Login/dashboard tetap boleh.
    if (level === "Reseller") {
      const [ru] = await db
        .select({ verify: users.verify })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      if (!ru || ru.verify !== "Yes") {
        return fail(403, {
          error: "Akun reseller belum aktif. Selesaikan pembayaran aktivasi dulu — cek dashboard.",
        });
      }
    }

    // Harga dari rules DB + base per level (port lib/pricing.php)
    const rules = await getPricingRules();
    const rule = rules[level];
    const basePer1k = baseForLevel(
      {
        price: Number(s.price),
        priceApi: Number(s.priceApi),
        priceReseller: Number(s.priceReseller),
      },
      level,
    );
    const finalPrice = computePrice(basePer1k, finalQty, level, rule, Number(s.priceApi));
    if (!Number.isFinite(finalPrice) || finalPrice <= 0) {
      return fail(400, { error: "Harga layanan tidak valid." });
    }

    // Kupon: validasi ulang secara authoritative (live preview hanyalah preview).
    const couponCodeRaw = String(form.get("coupon") ?? "")
      .trim()
      .toUpperCase();
    let discount = 0;
    let couponId: number | undefined;
    let applyCode: string | null = null;
    if (couponCodeRaw) {
      const chk = await validateCoupon(couponCodeRaw, finalPrice);
      if (!chk.valid) return fail(400, { error: chk.message });
      discount = chk.discount;
      couponId = chk.couponId;
      applyCode = chk.couponId ? couponCodeRaw : null;
    }
    const payable = Math.max(finalPrice - discount, 0);

    // Pre-check saldo provider (cached hourly di provider.balance_provider)
    // supaya tidak deduct user lalu gagal di provider.
    // Katalog menyimpan modal murni (price_api = rate provider IDR/1k), jadi
    // estimasi modal USD = price_api / kurs efektif.
    if (s.providerId !== 1) {
      try {
        const [pv] = await db.select().from(provider).where(eq(provider.id, s.providerId)).limit(1);
        const modalIdr = Math.max(Number(s.priceApi), 0);
        const { getUsdToIdr } = await import("$lib/server/fx");
        const usdRate = await getUsdToIdr();
        const needUsd = (modalIdr / usdRate) * (finalQty / 1000);
        const haveUsd = pv ? Number((pv as any).balanceProvider ?? 0) : 0;
        if (pv && modalIdr > 0 && haveUsd > 0 && needUsd > haveUsd) {
          return fail(400, {
            error: `Stok provider tidak cukup untuk ${finalQty.toLocaleString("id-ID")} (butuh ~$${needUsd.toFixed(2)}). Kecilkan jumlah atau coba lagi nanti.`,
          });
        }
      } catch {
        // Pre-check best-effort — jangan blokir order kalau cek gagal.
      }
    }

    // Deduct saldo SECARA ATOMIK sebelum kontak provider — anti double-spend.
    const affected = await deductBalance(userId, payable);
    if (affected === 0) {
      return fail(400, { error: "Saldo tidak cukup. Silakan top up terlebih dahulu." });
    }

    // Klaim kuota kupon atomik setelah saldo terpotong (anti race kuota).
    if (couponId !== undefined) {
      const claimed = await consumeCoupon(couponId);
      if (!claimed) {
        await db
          .update(users)
          .set({ balance: sql`${users.balance} + ${payable}` })
          .where(eq(users.id, userId));
        return fail(400, { error: "Kuota kupon baru saja habis. Coba kupon lain." });
      }
    }

    // Kirim order ke provider + tulis order row + log — SEMUA dalam try/catch.
    // Alasan: saldo user SUDAH ter-deduct di atas. Throw tak terduga di sini
    // (DB hiccup, insert gagal, dsb) WAJIB refund, kalau tidak user kehilangan
    // uang + dapat halaman 500. Redirect sukses tetap di luar try.
    let providerOrderId = "0";
    let oid = "";
    try {
      // Kirim order ke provider (per-provider key + URL, custom comments supported)
      const sent = await sendToProvider(
        {
          providerId: s.providerId,
          providerServiceId: s.providerServiceId,
          type: s.type,
          isRefill: s.isRefill,
        },
        link,
        finalQty,
        komen,
      );
      if ("error" in sent) {
        throw new Error(`PROVIDER: ${sent.error}`);
      }
      providerOrderId = sent.providerOrderId;

      oid = `SOC-${Date.now()}`;
      await db.insert(orders).values({
        userId,
        oid,
        sid: String(s.providerServiceId),
        providerOrderId,
        user: link,
        serviceName: s.serviceName,
        serviceId: s.id,
        data: link,
        komen: isCustomComments ? komen : "",
        quantity: finalQty,
        remains: finalQty,
        startCount: 0,
        price: payable,
        // Profit riil = dibayar (pasca-kupon) − modal provider untuk qty ini.
        // Katalog menyimpan modal murni di price_api (lihat service-sync).
        profit: Math.round(payable - (Math.max(Number(s.priceApi), 0) * finalQty) / 1000),
        status: "Pending",
        date: new Date().toISOString().slice(0, 10),
        time: new Date().toISOString().slice(11, 19),
        createdAt: new Date(),
        updatedAt: new Date(),
        providerId: s.providerId,
        isApi: 0,
        isRefund: 0,
        couponCode: applyCode,
        discount,
        nextPollAt: new Date(Date.now() + 60_000),
      });

      // Saldo sudah dideduct atomik di awal (sebelum kontak provider).
      // NOTE di-sanitize ke ASCII: balance_logs.note = utf8mb3 (3-byte) di TiDB,
      // nama layanan ber-emoji (🇮🇩) bikin insert gagal → order bocor (live tapi ke-refund).
      await db.insert(balanceLogs).values({
        userId,
        type: "order",
        amount: -payable,
        note: asciiSafe(
          applyCode
            ? `Pesan ${s.serviceName} (${oid}) — kupon ${applyCode}`
            : `Pesan ${s.serviceName} (${oid})`,
        ),
        createdAt: new Date(),
      });

      if (saveLink) {
        await db
          .insert(savedLinks)
          .values({ userId, label: s.serviceName.slice(0, 100), link, serviceId: s.id });
      }
    } catch (e: any) {
      // Refund best-effort atas deduct di awal (jangan sampai uang hilang).
      try {
        await db
          .update(users)
          .set({ balance: sql`${users.balance} + ${payable}` })
          .where(eq(users.id, userId));
      } catch {
        /* refund best-effort */
      }
      if (couponId !== undefined) {
        try {
          await releaseCoupon(couponId);
        } catch {
          /* release best-effort */
        }
      }
      const msg = String(e?.message ?? e);
      if (msg.startsWith("PROVIDER:")) {
        return fail(502, {
          error: `Gagal mengirim order ke provider: ${msg.slice(9)}. Saldo dikembalikan.`,
        });
      }
      console.error("[order] unexpected failure (refunded):", msg);
      return fail(500, {
        error: "Terjadi kesalahan saat memproses order. Saldo dikembalikan — coba lagi.",
      });
    }

    throw redirect(303, "/pesanan");
  },
};
