import { db } from "@socio/db";
import { orders, services } from "@socio/db/schema";
import { eq, desc, sql, and, inArray, or, like } from "drizzle-orm";
import { fail } from "@sveltejs/kit";
import { isCancelableStatus } from "@socio/core/order-status";
import { requestOrderRefill } from "$lib/server/refill-request";
import { requestOrderCancel } from "$lib/server/order-cancel";
import { refillServerMsgs } from "$lib/refill-copy";
import { baseForLevel, effectivePer1k, type UserLevel } from "@socio/core/pricing";
import { getPricingRules } from "$lib/server/pricing";
import { ledgerRefundProofs, refundStateOf, charged } from "$lib/server/refund";
import type { PageServerLoad, Actions } from "./$types";

export const load: PageServerLoad = async ({ url, locals }) => {
  const filter = url.searchParams.get("f") ?? "all";
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 64);
  const userId = Number(locals.user!.id);

  const conditions = [eq(orders.userId, userId)];
  if (filter === "pending") conditions.push(eq(orders.status, "Pending"));
  else if (filter === "proses")
    conditions.push(sql`${orders.status} IN ('Processing','In progress')`);
  else if (filter === "selesai") conditions.push(eq(orders.status, "Success"));
  else if (filter === "gagal") conditions.push(sql`${orders.status} IN ('Error','Canceled')`);
  else if (filter === "partial") conditions.push(eq(orders.status, "Partial"));

  // B6 search order — owner: "penting buat sy dan user". ID internal (#id), oid,
  // nama layanan, atau link. Selalu SCOPE userId (tak pernah bocor order user lain).
  if (q) {
    const likeArg = `%${q}%`;
    if (/^\d+$/.test(q)) {
      const num = Number(q);
      conditions.push(
        or(
          eq(orders.id, num),
          like(orders.oid, likeArg),
          like(orders.serviceName, likeArg),
          like(orders.data, likeArg),
        )!,
      );
    } else {
      conditions.push(
        or(
          like(orders.serviceName, likeArg),
          like(orders.data, likeArg),
          like(orders.oid, likeArg),
        )!,
      );
    }
  }

  const rows = await db
    .select({
      id: orders.id,
      oid: orders.oid,
      serviceName: orders.serviceName,
      data: orders.data,
      quantity: orders.quantity,
      price: orders.price,
      status: orders.status,
      createdAt: orders.createdAt,
      remains: orders.remains,
      serviceId: orders.serviceId,
      providerOrderId: orders.providerOrderId,
      // Label refund user = ledger saldo (balance_logs 'ref'), bukan flag is_refund.
      // F1: bukti ledger di-fold setelah query (ledgerRefundProofs), tanpa REGEXP.
      isRefund: orders.isRefund,
    })
    .from(orders)
    .where(and(...conditions))
    .orderBy(desc(orders.createdAt))
    .limit(30);

  // Get isRefill flag per service (inArray — JANGAN string-join ke sql``:
  // bound parameter '1,2,3' hanya match ID pertama!)
  const svcIds = [...new Set(rows.map((r) => Number(r.serviceId)))];
  const svcRows = svcIds.length
    ? await db
        .select({
          id: services.id,
          isRefill: services.isRefill,
          allowCancel: services.allowCancel,
          status: services.status,
        })
        .from(services)
        .where(inArray(services.id, svcIds))
    : [];
  const refillMap = new Map(svcRows.map((s) => [s.id, s.isRefill]));
  // Flag SMMturk per layanan apakah order bisa di-cancel. Gate tombol Cancel di
  // UI + guard aksi cancel (lihat action `cancel`) — cegah refund buta seperti
  // order #74 di mana provider tetap memproses tapi saldo user sudah di-refund.
  const cancelMap = new Map(svcRows.map((s) => [s.id, s.allowCancel === 1]));
  // Layanan masih aktif (status=1)? Untuk gate "Pesan lagi" di klien — cegah
  // deep-link order ulang ke layanan yang sudah di-disable/dihapus (parity guard
  // submit). Layanan dihapus dari katalog otomatis `false` (tidak ada di map).
  const activeMap = new Map(svcRows.map((s) => [s.id, s.status === 1]));

  // Status refill per order (tabel `refill` — di luar drizzle schema, raw SQL
  // parameterized). Kalau ada baris Pending → order sedang dalam proses refill,
  // jadi UI bisa tampil 'Refill diproses' + cegah klaim dobel.
  const orderIds = rows.map((r) => Number(r.id)).filter((n) => n > 0);
  const refillStatusMap = new Map<number, string>();
  if (orderIds.length) {
    const rf = (await db.execute(
      sql`SELECT order_id, status FROM refill WHERE order_id IN (${sql.join(
        orderIds.map((id) => sql`${id}`),
        sql`, `,
      )})`,
    )) as any;
    const arr: any[] = Array.isArray(rf?.[0]) ? rf[0] : Array.isArray(rf) ? rf : [];
    for (const row of arr) {
      const oid = Number(row.order_id);
      const st = String(row.status ?? "");
      if (st === "Pending") refillStatusMap.set(oid, "Pending");
      else if (!refillStatusMap.has(oid) && st) refillStatusMap.set(oid, st);
    }
  }

  // Counts per tab — tanpa query tambahan berat: hitung dari 30 rows terbaru sudah representatif
  // Untuk total yang akurat, hitung via group-by sekali (ringan, index userId+status)
  const allCounts = await db
    .select({ status: orders.status, c: sql<number>`count(*)` })
    .from(orders)
    .where(eq(orders.userId, userId))
    .groupBy(orders.status);
  const countMap: Record<string, number> = {};
  let totalCount = 0;
  for (const r of allCounts) {
    const k = String(r.status).toLowerCase();
    countMap[k] = (countMap[k] ?? 0) + Number(r.c);
    totalCount += Number(r.c);
  }
  // Normalisasi kategori tab — Partial BUKAN gagal: sebagian order sukses,
  // sisanya direfund. Ini mencegah user Reseller berat melihat "809 gagal"
  // padahal banyak di antaranya sukses parsial.
  const tabCounts = {
    all: totalCount,
    pending: countMap["pending"] ?? 0,
    proses: (countMap["processing"] ?? 0) + (countMap["in progress"] ?? 0),
    selesai: countMap["success"] ?? 0,
    gagal: (countMap["error"] ?? 0) + (countMap["canceled"] ?? 0),
    partial: countMap["partial"] ?? 0,
  };

  // Layanan populer global (top 3 by order, untuk cross-sell di empty state).
  // JOIN ke katalog aktif: top mentah dikuasai ID legacy yang tidak ada
  // di katalog (390099 dkk) sehingga tanpa join hasilnya selalu kosong.
  // Hanya saat filter=all & kosong.
  //
  // PERF (insiden 17 Nov 2026): JANGAN join orders×services SEBELUM aggregate —
  // tanpa index di provider_service_id itu nested-loop ratusan juta baris
  // (4 query jalan 20+ menit → MDL convoy yang memblokir /layanan saat boot).
  // Aggregate orders DULU (sekali scan + GROUP BY), baru join grup hasilnya
  // ke katalog lewat index idx_provider_service (provider_service_id, provider_id).
  //
  // Multi-provider: TIDAK lagi hardcode provider_id=2. Order membawa provider_id
  // sendiri (lama & baru), jadi popular ikut provider mana pun yang melayani.
  // Kunci join tetap provider_service_id (generasi order lama PHP), tapi dicocokkan
  // BERSAMA provider-nya supaya id yang sama di provider berbeda tak tertukar.
  let popular: { id: number; serviceName: string; price: number }[] = [];
  if (filter === "all" && rows.length === 0) {
    try {
      const top = (await db.execute(sql`
        SELECT t.sid AS sid, t.pid AS pid, t.c AS c FROM (
          SELECT o.service_id AS sid, o.provider_id AS pid, COUNT(*) AS c
          FROM orders o WHERE o.service_id > 0
          GROUP BY o.service_id, o.provider_id
        ) t JOIN services s
          ON s.provider_service_id = t.sid AND s.provider_id = t.pid AND s.status = 1
        ORDER BY t.c DESC LIMIT 3
      `)) as any;
      const topRows: any[] = Array.isArray(top?.[0]) ? top[0] : Array.isArray(top) ? top : [];
      const pairs = topRows
        .map((r: any) => ({
          sid: Number(r.sid),
          pid: Number(r.pid) || 0,
          c: Number(r.c) || 0,
        }))
        .filter((r: any) => r.sid > 0);
      if (pairs.length) {
        const svc = await db
          .select({
            id: services.id,
            serviceName: services.serviceName,
            price: services.price,
            priceApi: services.priceApi,
            priceReseller: services.priceReseller,
            providerServiceId: services.providerServiceId,
            providerId: services.providerId,
          })
          .from(services)
          .where(
            and(
              eq(services.status, 1),
              inArray(
                services.providerServiceId,
                pairs.map((r: any) => r.sid),
              ),
            ),
          );
        // Kunci (providerId, providerServiceId) — id yang sama di provider
        // berbeda tidak boleh tertukar (multi-provider).
        const byKey = new Map(svc.map((s) => [`${s.providerId}|${s.providerServiceId}`, s]));
        // Harga populer = harga JUAL efektif per level user (bukan modal mentah),
        // supaya widget konsisten dgn apa yang dibayar saat order.
        const lvl = ((locals.user?.level as UserLevel) ?? "Member") as UserLevel;
        const rules = await getPricingRules();
        const rule = rules[lvl];
        popular = pairs
          .map((r: any) => byKey.get(`${r.pid}|${r.sid}`))
          .filter((s): s is NonNullable<typeof s> => !!s)
          .slice(0, 3)
          .map((s) => {
            const base = baseForLevel(
              {
                price: Number(s.price),
                priceApi: Number((s as any).priceApi ?? 0),
                priceReseller: Number((s as any).priceReseller ?? 0),
              },
              lvl,
            );
            const modal = Math.max(Number((s as any).priceApi ?? 0), 0);
            return {
              id: s.id,
              serviceName: s.serviceName,
              price: Math.round(effectivePer1k(base, lvl, rule, modal)),
            };
          });
      }
    } catch {
      // cross-sell populer bersifat opsional — gagal diam, jangan pecahkan list
    }
  }

  // C2 deep-link dari riwayat saldo (/pesanan?oid=<oid>): order target bisa saja
  // di luar 30 terbaru. Ambil eksplisit (scoped userId+oid), sisipkan ke rows
  // supaya client dapat membuka sheet detail-nya. balance_logs tidak punya FK →
  // penghubung = oid (provider order ID, string unik per order).
  const deepOid = (url.searchParams.get("oid") ?? "").trim();
  let deepLinkId: number | null = null;
  if (deepOid) {
    const [target] = await db
      .select({
        id: orders.id,
        oid: orders.oid,
        serviceName: orders.serviceName,
        data: orders.data,
        quantity: orders.quantity,
        price: orders.price,
        status: orders.status,
        createdAt: orders.createdAt,
        remains: orders.remains,
        serviceId: orders.serviceId,
        providerOrderId: orders.providerOrderId,
        isRefund: orders.isRefund,
      })
      .from(orders)
      .where(and(eq(orders.userId, userId), eq(orders.oid, deepOid)))
      .limit(1);
    if (target) {
      deepLinkId = Number(target.id);
      if (!rows.some((r) => Number(r.id) === deepLinkId)) rows.unshift(target);
    }
  }

  // F1 — bukti refund ledger di-fold sekali untuk semua rows (termasuk target
  // deep-link yang di-unshift di atas), pengganti subquery REGEXP per baris (~7s).
  // Semua rows scoped userId yang sama (query di atas) → key fold pakai userId load.
  const proofs = await ledgerRefundProofs(rows.map((r) => ({ id: Number(r.id), userId })));

  return {
    orders: rows.map((r) => {
      const p = proofs.get(Number(r.id)) ?? { refundedLedger: 0, refundedAt: null };
      return {
        ...r,
        refundedLedger: p.refundedLedger,
        refundedAt: p.refundedAt,
        isRefill: refillMap.get(Number(r.serviceId)) ?? 0,
        refillStatus: refillStatusMap.get(Number(r.id)) ?? null,
        allowCancel: cancelMap.get(Number(r.serviceId)) === true,
        serviceActive: activeMap.get(Number(r.serviceId)) === true,
        refunded: p.refundedLedger,
        refundState: refundStateOf({
          status: r.status,
          isRefund: r.isRefund,
          refundedLedger: p.refundedLedger,
        }),
        charged: charged(Number(r.price ?? 0), p.refundedLedger),
      };
    }),
    filter,
    searchQuery: q,
    counts: tabCounts,
    popular,
    // UX4.3 — lastUpdate untuk LiveDot timestamp (initial dari server = now)
    lastUpdate: new Date().toISOString(),
    deepLinkId,
  };
};

export const actions: Actions = {
  refill: async ({ request, locals }) => {
    // Helper bersama (port .my) — provider-safe + set 'Refilling' + guard jendela
    // waktu. Bug lama: hardcoded smmturkRefill (salah key utk provider lain) dan
    // status tak di-set → runRefillPolling tidak pernah memantau request.
    const sm = { ...refillServerMsgs, locale: "id" };
    const form = await request.formData();
    const orderId = Number(form.get("id"));
    const r = await requestOrderRefill(orderId, Number(locals.user!.id), sm);
    if (!r.ok) return fail(400, { error: r.error });
    return { success: sm.refillOk };
  },

  cancel: async ({ request, locals }) => {
    const form = await request.formData();
    const orderId = Number(form.get("id"));
    if (!orderId) return fail(400, { error: "ID order tidak valid" });

    // F12 — SATU jalur cancel (helper bersama, dipakai juga oleh admin).
    // TIDAK ada uang ditulis di sini: permintaan dikirim ke provider MILIK order,
    // dan refund hanya dibayar cron auto-refund setelah provider konfirmasi
    // Canceled/Error/Partial. Dulu "unreachable" pun refund (modal owner hangus)
    // dan "ok" cuma berarti permintaan DITERIMA, bukan order sudah batal.
    const r = await requestOrderCancel(orderId, { userId: Number(locals.user!.id) });
    if (!r.ok) {
      switch (r.reason) {
        case "not_found":
          return fail(404, { error: "Order tidak ditemukan" });
        case "not_supported":
          return fail(400, { error: "Layanan ini tidak bisa dibatalkan setelah di-order." });
        case "rejected":
          return fail(400, {
            error: "Order sudah mulai diproses provider, tidak bisa dibatalkan.",
          });
        case "unreachable":
          return fail(503, {
            error:
              "Provider tidak terjangkau. Order TIDAK dibatalkan — coba lagi sebentar. Saldo kamu aman (tidak di-refund sampai provider konfirmasi).",
          });
        case "already":
          return fail(409, {
            error: "Cancel order ini sudah diminta, sedang menunggu konfirmasi provider.",
          });
        case "race":
          return fail(400, { error: "Order sedang diproses, tidak bisa dibatalkan" });
        default:
          return fail(400, {
            error: "Order ini tidak bisa dibatalkan (status sudah final / sedang diproses).",
          });
      }
    }
    return {
      success:
        r.state === "canceling"
          ? "Cancel diminta ke provider. Order menunggu konfirmasi batal — saldo BELUM dikembalikan. Dana otomatis kembali setelah provider konfirmasi."
          : "Order dibatalkan (tak terlacak di provider). Saldo akan dikembalikan oleh cron auto-refund.",
    };
  },

  massCancel: async ({ request, locals }) => {
    const form = await request.formData();
    const ids = String(form.get("ids") ?? "")
      .split(",")
      .map((x) => Number(x.trim()))
      .filter(Boolean);
    if (!ids.length) return fail(400, { error: "Pilih minimal 1 order" });

    const userId = Number(locals.user!.id);
    const targets = await db
      .select({ id: orders.id, status: orders.status })
      .from(orders)
      .where(and(eq(orders.userId, userId), inArray(orders.id, ids)));

    // F11 — cancelable = Pending/Processing/In progress (bukan hanya Pending).
    const cancelable = targets.filter((o) => isCancelableStatus(o.status));
    if (!cancelable.length)
      return fail(400, {
        error: "Tidak ada order yang bisa dibatalkan (Pending/Processing/In progress)",
      });

    // F12/H4 — helper bersama mengurus allowCancel, panggilan provider dan CAS.
    // TIDAK ada refund dan TIDAK ada baris ledger di sini: cron auto-refund
    // membayar setelah provider konfirmasi. Dulu `refunded += price` tanpa cek
    // affectedRows (bisa refund ganda) dan ledger ditulis walau refunded = 0
    // (baris hantu). Sekarang hasil per order dihitung jujur.
    let sent = 0;
    let rejected = 0;
    let unreachable = 0;
    let skipped = 0;
    for (const o of cancelable) {
      const r = await requestOrderCancel(Number(o.id), { userId });
      if (r.ok) sent++;
      else if (r.reason === "rejected") rejected++;
      else if (r.reason === "unreachable") unreachable++;
      else skipped++;
    }

    if (sent === 0) {
      if (unreachable > 0)
        return fail(503, {
          error: `${unreachable} order: provider tidak terjangkau — TIDAK dibatalkan, saldo aman. Coba lagi sebentar.`,
        });
      return fail(400, {
        error: `Semua order (${rejected + skipped}) sudah mulai diproses provider / tidak bisa dibatalkan.`,
      });
    }
    const warning =
      rejected + skipped > 0
        ? `${rejected + skipped} order ditolak provider (sudah diproses) / tidak bisa dibatalkan — tidak di-refund.`
        : unreachable > 0
          ? `${unreachable} order: provider tidak terjangkau — belum dibatalkan, coba lagi.`
          : undefined;
    const success = `Cancel diminta untuk ${sent} order. Menunggu konfirmasi provider — saldo BELUM dikembalikan. Dana otomatis kembali setelah provider konfirmasi batal.`;
    return warning ? { success, warning } : { success };
  },
};
