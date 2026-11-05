import { db } from "@socio/db";
import { orders, services, users, balanceLogs } from "@socio/db/schema";
import { eq, desc, sql, and, inArray, or, like } from "drizzle-orm";
import { fail } from "@sveltejs/kit";
import { smmturkCancel, isProviderRejection } from "@socio/core/smmturk";
import { requestOrderRefill } from "$lib/server/refill-request";
import { refillServerMsgs } from "$lib/refill-copy";
import { baseForLevel, effectivePer1k, type UserLevel } from "@socio/core/pricing";
import { getPricingRules } from "$lib/server/pricing";
import { notifyOrderCancel } from "$lib/server/notification";
import { notifyAdmins } from "$lib/server/email-templates";
import {
  ledgerRefundAmount,
  ledgerRefundAt,
  refundStateOf,
  charged,
} from "$lib/server/refund";
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
      isRefund: orders.isRefund,
      refundedLedger: ledgerRefundAmount,
      refundedAt: ledgerRefundAt,
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
        .select({ id: services.id, isRefill: services.isRefill, allowCancel: services.allowCancel, status: services.status })
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
  // JOIN dulu ke katalog aktif: top mentah dikuasai ID legacy yang tidak ada
  // di katalog (390099 dkk) sehingga tanpa join hasilnya selalu kosong.
  // Query ringan: aggregate + join 3 services. Hanya saat filter=all & kosong.
  let popular: { id: number; serviceName: string; price: number }[] = [];
  if (filter === "all" && rows.length === 0) {
    try {
      const top = (await db.execute(sql`
        SELECT o.service_id AS sid, COUNT(*) AS c FROM orders o
        JOIN services s ON s.provider_id = 2 AND s.provider_service_id = o.service_id AND s.status = 1
        WHERE o.provider_id = 2 AND o.service_id > 0
        GROUP BY o.service_id ORDER BY c DESC LIMIT 3
      `)) as any;
      const topRows: any[] = Array.isArray(top?.[0]) ? top[0] : Array.isArray(top) ? top : [];
      const pids = topRows.map((r: any) => Number(r.sid)).filter((n) => n > 0);
      if (pids.length) {
        const svc = await db
          .select({
            id: services.id,
            serviceName: services.serviceName,
            price: services.price,
            priceApi: services.priceApi,
            priceReseller: services.priceReseller,
            providerServiceId: services.providerServiceId,
          })
          .from(services)
          .where(
            and(
              eq(services.providerId, 2),
              eq(services.status, 1),
              inArray(services.providerServiceId, pids),
            ),
          );
        const order: Record<number, number> = {};
        pids.forEach((id, i) => (order[id] = i));
        const byPid = new Map(svc.map((s) => [Number((s as any).providerServiceId ?? 0), s]));
        // Harga populer = harga JUAL efektif per level user (bukan modal mentah),
        // supaya widget konsisten dgn apa yang dibayar saat order.
        const lvl = ((locals.user?.level as UserLevel) ?? "Member") as UserLevel;
        const rules = await getPricingRules();
        const rule = rules[lvl];
        popular = pids
          .map((pid) => byPid.get(pid))
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

  return {
    orders: rows.map((r) => ({
      ...r,
      isRefill: refillMap.get(Number(r.serviceId)) ?? 0,
      refillStatus: refillStatusMap.get(Number(r.id)) ?? null,
      allowCancel: cancelMap.get(Number(r.serviceId)) === true,
      serviceActive: activeMap.get(Number(r.serviceId)) === true,
      refunded: Number((r as any).refundedLedger ?? 0),
      refundState: refundStateOf({
        status: r.status,
        isRefund: (r as any).isRefund,
        refundedLedger: Number((r as any).refundedLedger ?? 0),
      }),
      charged: charged(Number(r.price ?? 0), Number((r as any).refundedLedger ?? 0)),
    })),
    filter,
    searchQuery: q,
    counts: tabCounts,
    popular,
    // UX4.3 — lastUpdate untuk LiveDot timestamp (initial dari server = now)
    lastUpdate: new Date().toISOString(),
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

    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, Number(locals.user!.id))))
      .limit(1);
    if (!order) return fail(404, { error: "Order tidak ditemukan" });
    if (order.status !== "Pending")
      return fail(400, { error: "Hanya order Pending yang bisa dibatalkan" });

    // Guard ganda: layanan harus support cancel (flag SMMturk tersimpan di
    // services.allow_cancel). UI sudah gate tombolnya — ini jaga-jaga request
    // lama/cache/direct POST supaya tidak bocor refund-butal seperti order #74.
    const [svc] = await db
      .select({ allowCancel: services.allowCancel })
      .from(services)
      .where(eq(services.id, Number(order.serviceId)))
      .limit(1);
    if (!svc || svc.allowCancel !== 1)
      return fail(400, { error: "Layanan ini tidak bisa dibatalkan setelah di-order." });

    // Try cancel di provider — HANYA proceed lokal kalau provider berhasil cancel
    // ATAU terjadi network error (proteksi saldo user). Kalau provider MENOLAK
    // secara eksplisit (order sudah mulai diproses), batalkan intent & beri tahu
    // user — kalau tetap refund, Socio bayar provider DAN kembalikan saldo (rugi).
    if (order.providerOrderId && order.providerOrderId !== "0") {
      try {
        await smmturkCancel([order.providerOrderId]);
      } catch (e: any) {
        if (isProviderRejection(e)) {
          // Provider eksplisit menolak (order sudah jalan/pending di SMMturk).
          // JANGAN cancel lokal — order masih diproses.
          console.warn(
            `[cancel] provider menolak cancel order #${orderId} (provId ${order.providerOrderId}): ${e.message}`,
          );
          return fail(400, { error: "Order sudah mulai diproses provider, tidak bisa dibatalkan." });
        }
        // Network/API failure → proceed cancel lokal untuk lindungi saldo user.
        console.error(
          `[cancel] provider tidak terjangkau utk order #${orderId}, lanjut cancel lokal:`,
          e,
        );
      }
    }

    // Update status + refund saldo (CAS: hanya 1 cancel yang lolos → idempotent).
    // Sekaligus set is_refund=1 supaya cron auto-refund TIDAK refund dua kali
    // (refund manual di sini sudah menandai order selesai-nya-refund).
    const res: any = await db
      .update(orders)
      .set({ status: "Canceled", isRefund: 1, updatedAt: new Date() })
      .where(and(eq(orders.id, orderId), eq(orders.status, "Pending")));
    const claimed = Array.isArray(res) ? res[0]?.affectedRows : res?.affectedRows;
    if (Number(claimed ?? 1) === 0)
      return fail(400, { error: "Order sedang diproses, tidak bisa dibatalkan" });

    // Refund saldo atomik (fix P0-1: bukan read-then-write)
    await db
      .update(users)
      .set({ balance: sql`${users.balance} + ${Number(order.price)}` })
      .where(eq(users.id, Number(locals.user!.id)));

    await db.insert(balanceLogs).values({
      userId: Number(locals.user!.id),
      type: "ref",
      amount: Number(order.price),
      note: `Refund cancel order #${orderId}`,
      createdAt: new Date(),
    });

    // Notif user (in-app + push) + alert admin (email + admin_notifications).
    await notifyOrderCancel(Number(locals.user!.id), orderId, Number(order.price));
    await notifyAdmins({
      subject: `[Cancel User] Order #${orderId}`,
      body: `User membatalkan order #${orderId} (status Pending). Refund ${new Intl.NumberFormat("id-ID").format(Number(order.price))} ke saldo user.`,
      ctaText: "Lihat Order",
      ctaUrl: `/admin/orders?order=${orderId}`,
      templateName: "admin-alert",
    });

    return { success: `Order dibatalkan. Saldo dikembalikan Rp ${order.price}` };
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
      .select()
      .from(orders)
      .where(and(eq(orders.userId, userId), inArray(orders.id, ids)));

    const pending = targets.filter((o) => o.status === "Pending");
    if (!pending.length)
      return fail(400, { error: "Tidak ada order Pending yang bisa dibatalkan" });

    // Prefilter: hanya order dengan service yang allowCancel=1 boleh dibatalkan
    // (flag SMMturk per-service). Lainnya dihitung rejected tanpa dipanggil API —
    // cegah Socio bayar provider DAN kembalikan saldo user (rugi ganda).
    const pendingSvcIds = [...new Set(pending.map((o) => Number(o.serviceId)))];
    const pendingSvcRows = pendingSvcIds.length
      ? await db
          .select({ id: services.id, allowCancel: services.allowCancel })
          .from(services)
          .where(inArray(services.id, pendingSvcIds))
      : [];
    const pendingCancelMap = new Map(pendingSvcRows.map((s) => [s.id, s.allowCancel === 1]));

    let refunded = 0;
    let rejectedCount = 0;
    for (const o of pending) {
      if (pendingCancelMap.get(Number(o.serviceId)) !== true) {
        // Layanan tidak mendukung cancel — skip, jangan panggil provider.
        rejectedCount++;
        continue;
      }
      if (o.providerOrderId && o.providerOrderId !== "0") {
        try {
          await smmturkCancel([o.providerOrderId]);
        } catch (e: any) {
          if (isProviderRejection(e)) {
            // Provider eksplisit menolak (order sudah jalan) — JANGAN refund lokal.
            console.warn(
              `[massCancel] provider menolak cancel #${o.id} (provId ${o.providerOrderId})`,
            );
            rejectedCount++;
            continue;
          }
          // Network error → proceed lokal untuk lindungi saldo user.
          console.error(`[massCancel] provider tidak terjangkau #${o.id}, lanjut lokal:`, e);
        }
      }
      await db
        .update(orders)
        .set({ status: "Canceled", isRefund: 1, updatedAt: new Date() })
        .where(and(eq(orders.id, o.id), eq(orders.status, "Pending")));
      refunded += Number(o.price);
    }

    const cancelledCount = pending.length - rejectedCount;
    if (cancelledCount === 0)
      return fail(400, {
        error: `Semua order (${rejectedCount}) sudah mulai diproses provider / tidak bisa dibatalkan.`,
      });

    // Refund saldo atomik (fix P0-1: bukan read-then-write)
    if (refunded > 0) {
      await db
        .update(users)
        .set({ balance: sql`${users.balance} + ${refunded}` })
        .where(eq(users.id, userId));
    }
    await db.insert(balanceLogs).values({
      userId,
      type: "ref",
      amount: refunded,
      note: `Mass refund ${cancelledCount} order dibatalkan${rejectedCount ? ` (${rejectedCount} ditolak provider)` : ""}`,
      createdAt: new Date(),
    });

    // Alert admin mass cancel (1 email agregat; tidak spam in-app user).
    await notifyAdmins({
      subject: `[Mass Cancel] ${cancelledCount} order user #${userId}`,
      body: `User melakukan pembatalan massal: ${cancelledCount} order Pending dibatalkan${rejectedCount ? `, ${rejectedCount} ditolak provider` : ""}. Total refund ${new Intl.NumberFormat("id-ID").format(refunded)}. IDs: ${pending.map((o) => o.id).join(", ")}`,
      ctaText: "Lihat Pesanan",
      ctaUrl: `/admin/orders`,
      templateName: "admin-alert",
    });

    if (rejectedCount > 0) {
      return {
        success: `Refund ${cancelledCount} order. Saldo +Rp ${refunded.toLocaleString("id-ID")}`,
        warning: `${rejectedCount} order ditolak provider (sudah diproses) — tidak di-refund.`,
      };
    }
    return {
      success: `Refund ${cancelledCount} order. Saldo +Rp ${refunded.toLocaleString("id-ID")}`,
    };
  },
};
