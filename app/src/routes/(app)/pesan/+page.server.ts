import { db } from "@socio/db";
import { services, categories, savedLinks, orders, users, balanceLogs, provider } from "@socio/db/schema";
import { eq, desc, asc, sql, and } from "drizzle-orm";
import { fail, redirect } from "@sveltejs/kit";
import {
  computePrice,
  baseForLevel,
  effectivePer1k,
  qtyDivisorFor,
  modalAmountFor,
  type UserLevel,
} from "@socio/core/pricing";
import {
  PLATFORMS,
  detectPlatform,
  detectKind,
  orderFieldSpec,
  type PlatformId,
} from "@socio/core/catalog";
import { serviceIsOrderable } from "@socio/core/order-guard";
import { smmturkAddFor } from "@socio/core/smmturk";
import { decryptSecret } from "$lib/server/crypto";
import { getPricingRules } from "$lib/server/pricing";
import { validateCoupon, consumeCoupon, releaseCoupon } from "$lib/server/coupons";
import { getServicePopularity } from "$lib/server/service-popularity";
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

  // Daftar kategori PROVIDER — tetap jadi PRIMARY source of truth.
  // Whitelabel diterapkan server-side (SMMTURK/[Provider]/Own/Exclusive dll)
  // supaya client tidak pernah melihat brand hulu. Hanya kategori yang punya
  // layanan aktif (JOIN exclude mati).
  // Sort = layanan PALING BARU DI-UPDATE dulu (port B3 socio.my 30 Okt).
  // Owner .my: khawatir user mengorder kategori yang "sudah lama tidak
  // di-update". `services.updated_at` diisi service-sync HANYA saat provider
  // benar-benar mengubah layanan (harga/nama/min-max/aktif) — bukan tiap
  // sync — jadi sinyal kesegaran yang andal. GREATEST(created_at,
  // updated_at) supaya kategori berisi layanan baru TETAP naik, dan kategori
  // tertinggal turun ke bawah. Tiebreak alfabetis; COALESCE ke epoch agar
  // baris tanpa timestamp jatuh ke bawah (NULLS handling eksplisit).
  const catRows = await db
    .select({
      id: categories.id,
      name: categories.name,
      svcCount: sql<number>`COUNT(${services.id})`,
      latestAt: sql<string | null>`MAX(GREATEST(COALESCE(${services.createdAt}, '1970-01-01'), COALESCE(${services.updatedAt}, '1970-01-01')))`
    })
    .from(categories)
    .leftJoin(services, sql`${services.categoryId} = ${categories.id} AND ${services.status} = 1`)
    .groupBy(categories.id, categories.name)
    .having(sql`COUNT(${services.id}) > 0`)
    .orderBy(
      sql`COALESCE(MAX(GREATEST(COALESCE(${services.createdAt}, '1970-01-01'), COALESCE(${services.updatedAt}, '1970-01-01'))), '1970-01-01') DESC`,
      asc(categories.name),
    );
  const cats = catRows.map((c) => ({
    id: c.id,
    name: whitelabel(c.name),
    count: Number(c.svcCount) || 0,
    latestAt: c.latestAt ? new Date(c.latestAt).toISOString() : null,
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
      .where(and(eq(services.id, serviceId), eq(services.status, 1)))
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
        // Rate jual: per-1000 utk type biasa, PER-PACK utk Package/Custom Comments
        // Package. Client menerapkan pembagi yang sama (`qtyDivisorFor(type)`)
        // supaya preview selalu identik dgn tagihan server.
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
    // Deep-link ke layanan yang sudah di-disable admin (status=0) ATAU dihapus dari
    // katalog: `service` jadi null (query di-gate status=1) → flag ini menyalakan
    // banner penjelas di client, bukan form kosong misterius. Guard uang sebenarnya
    // tetap di action `default` (cek `s.status !== 1` sebelum potong saldo).
    serviceUnavailable: serviceId > 0 && !service,
    // Daftar platform bersih + jumlah layanan aktif (live count, anti-sampah).
    platforms,
    // Daftar kategori dari PROVIDER (1132 aktif, sudah whitelabel). PRIMARY —
    // dropdown /pesan. Filter tambahan (platform/kind icon) ada di client.
    cats,
    saved,
    balance: locals.user!.balance ?? 0,
    level,
    prefill: { link: prefillLink, qty: prefillQty },
    // Rekomendasi "Paling laris" (port B4 socio.my) — order SUKSES semua user
    // (jendela 24j/7h/30h), dicocokkan client-side dengan chip JENIS yang
    // dipilih. KOSONG = band tak dirender (data belum cukup; jangan tampil
    // kotak kosong).
    popular: await getServicePopularity(level),
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

/** Kirim order ke provider — payload dinamis per `services.type` (B5, lihat `orderFieldSpec`). */
async function sendToProvider(
  svc: {
    providerId: number;
    providerServiceId: number;
    type: string;
    isRefill: number;
  },
  fields: {
    link: string;
    quantity: number;
    komen: string;
    username: string;
    extra: Record<string, string>;
  },
): Promise<{ providerOrderId: string } | { error: string }> {
  if (svc.providerId === 1) return { providerOrderId: "0" }; // MANUAL

  const [p] = await db.select().from(provider).where(eq(provider.id, svc.providerId)).limit(1);
  if (!p || !p.apiKey || p.name === "MANUAL") return { providerOrderId: "0" };

  const key = decryptSecret(p.apiKey);
  if (!key) return { providerOrderId: "0" };

  try {
    // B5: bangun payload berdasar spesifikasi tipe (docs SMMturk) — tiap field
    // independen: link/quantity/comments/username + param tambahan per tipe
    // (usernames/hashtag/groups/answer_number/keywords/min/max/delay).
    const spec = orderFieldSpec(svc.type);
    const params: Parameters<typeof smmturkAddFor>[2] = {
      service: String(svc.providerServiceId),
    };
    if (spec.needsLink) params.link = fields.link;
    if (spec.isComments) params.comments = fields.komen;
    else if (spec.hasQuantity) params.quantity = fields.quantity;
    if (spec.needsUsername) params.username = fields.username;
    const extra: Record<string, string> = {};
    for (const ep of spec.extra) {
      const v = fields.extra[ep];
      if (v) extra[ep] = v;
    }
    if (Object.keys(extra).length > 0) params.extra = extra;

    const result = await smmturkAddFor(p.apiUrlOrder, key, params);
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
    const username = String(form.get("username") ?? "").trim();
    const saveLink = form.get("saveLink") === "on";
    // B5: param tambahan per tipe (docs SMMturk): usernames/hashtag/groups/
    // answer_number/keywords + min/max/delay (Subscriptions).
    const extra: Record<string, string> = {
      usernames: String(form.get("usernames") ?? "").trim(),
      hashtag: String(form.get("hashtag") ?? "").trim(),
      groups: String(form.get("groups") ?? "").trim(),
      answer_number: String(form.get("answer_number") ?? "").trim(),
      keywords: String(form.get("keywords") ?? "").trim(),
      min: String(form.get("min") ?? "").trim(),
      max: String(form.get("max") ?? "").trim(),
      delay: String(form.get("delay") ?? "").trim(),
    };

    if (!serviceId) {
      return fail(400, { error: "Layanan belum dipilih." });
    }

    const [s] = await db.select().from(services).where(eq(services.id, serviceId)).limit(1);
    if (!s) return fail(400, { error: "Layanan tidak ditemukan." });
    // Gate layanan nonaktif (status!=1): admin manual-off / kategori mati / provider
    // mati menulis status=0. Tanpa cek ini, order tetap lolos ke layanan mati (parity
    // API v1 yang sudah filter status=1). Saldo BELUM dipotong di titik ini → aman.
    if (!serviceIsOrderable(s))
      return fail(400, { error: "Layanan ini sudah tidak tersedia. Pilih layanan lain." });

    // B5: validasi dinamis per tipe — spec menentukan field mana yang wajib,
    // bukan lagi cabang hardcoded link/komen.
    const spec = orderFieldSpec(s.type, s.serviceName);
    const isCustomComments = spec.isComments;

    // Link wajib kecuali tipe tanpa link (Subscriptions → username+min+max+delay).
    if (spec.needsLink && !link) {
      return fail(400, { error: "Link wajib diisi." });
    }
    if (isCustomComments && !komen) {
      return fail(400, { error: "Komentar wajib diisi untuk layanan Custom Comments." });
    }
    if (spec.needsUsername && !username) {
      return fail(400, { error: "Username wajib diisi untuk layanan ini." });
    }
    const EXTRA_LABELS: Record<string, string> = {
      keywords: "kata kunci",
      usernames: "daftar username",
      hashtag: "hashtag",
      groups: "ID grup",
      answer_number: "nomor jawaban polling",
      min: "min per post",
      max: "max per post",
      delay: "delay antar post",
    };
    for (const p of spec.extra) {
      if (!extra[p]) {
        return fail(400, { error: `${EXTRA_LABELS[p] ?? p} wajib diisi untuk layanan ini.` });
      }
    }

    // Qty tertagih: Custom Comments → jumlah baris komen; Subscriptions → max
    // per post (field `max` form, divalidasi dalam range layanan); sisanya → stepper.
    let finalQty: number;
    if (isCustomComments) finalQty = komen.split("\n").filter(Boolean).length;
    else if (s.type === "Subscriptions") finalQty = Number(extra.max) || 0;
    else finalQty = quantity;

    if (!finalQty || finalQty < s.min) {
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
    // `s.type` WAJIB ikut dikirim: layanan Package punya rate per-pack, bukan
    // per-1000 (lihat pricing.ts `isFixedPackageType`) — tanpa ini Package
    // ditagih 1/1000 harga sebenarnya.
    const finalPrice = computePrice(
      basePer1k,
      finalQty,
      level,
      rule,
      Number(s.priceApi),
      s.type,
    );
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
        // Provider menagih dengan semantik rate yang sama dgn katalog: per-1000
        // utk type biasa, per-pack utk Package → pakai pembagi dari `qtyDivisorFor`.
        const needUsd = (modalIdr / usdRate) * (finalQty / qtyDivisorFor(s.type));
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
      // Kirim order ke provider (per-provider key + URL, B5 payload dinamis per tipe)
      const sent = await sendToProvider(
        {
          providerId: s.providerId,
          providerServiceId: s.providerServiceId,
          type: s.type,
          isRefill: s.isRefill,
        },
        { link, quantity: finalQty, komen, username, extra },
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
        user: link || (username ? `@${username.replace(/^@/, "")}` : ""),
        serviceName: s.serviceName,
        serviceId: s.id,
        data: link || (username ? `@${username.replace(/^@/, "")}` : ""),
        komen: isCustomComments ? komen : "",
        quantity: finalQty,
        remains: finalQty,
        startCount: 0,
        price: payable,
        // Profit riil = dibayar (pasca-kupon) − modal provider untuk qty ini.
        // Katalog menyimpan modal murni di price_api (lihat service-sync), dan
        // `modalAmountFor` menyesuaikan semantik rate per type (per-1000 / per-pack).
        profit: Math.round(payable - modalAmountFor(s.type, Number(s.priceApi), finalQty)),
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
