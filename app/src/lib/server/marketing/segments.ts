/**
 * G1 lifecycle — resolver penerima email per segmen (batch, anti-N+1).
 *
 * ADAPTASI .id (BUKAN salin .my mentah):
 *  - BASE_FILTER TIDAK mensyaratkan `verify='Yes'`. Di .id kolom `verify`
 *    merangkap penanda AKTIVASI RESELLER, bukan verifikasi email; memaksanya
 *    akan mengucilkan ~1.500 user secara salah. Kelayakan marketing = opt-in
 *    (`subs=1`) + email terisi + bukan level khusus + tidak di-suppress.
 *  - Saldo .id dalam RUPIAH (int), bukan sen → ambang balance_low Rp.
 *  - TANPA segmen `coupon_expiring` — .id belum punya dompet kupon personal
 *    (`user_coupons`). Nambah nanti bareng H3.
 *
 * Semua query menyaring di level SQL (verified-by-opt-in, bukan Admin/Developers/
 * Blacklist/Demo, tidak ada di `email_suppressions`). Segment memakai EXISTS /
 * NOT EXISTS (subquery korrelated) — BUKAN pola `IN (${join})` (bug id pertama).
 *
 * WP7 (port .my d8e531ef — activation sadar deposit + 2 lane baru):
 *  - activation: DIKECUALIKAN reseller belum aktivasi + user yang masih punya
 *    invoice Pending hidup (reminder transaksional WP6 sudah mengurus mereka).
 *  - deposit_canceled: pernah deposit Canceled (30 hari) tapi belum pernah
 *    Success → winback "invoice kedaluwarsa, buat baru".
 *  - reseller_unpaid: level Reseller + belum aktivasi + tanpa invoice Pending
 *    hidup → pengingat aktivasi dengan nilai bersih (kohort .id: 241 user).
 * Lane baru default OFF per-lane di cron (gate env EMAIL_LANE_*).
 */
import { db } from "@socio/db";
import { users } from "@socio/db/schema";
import { sql } from "drizzle-orm";
import { formatRupiah } from "$lib/format";
import { LOW_BALANCE_RP } from "./config.js";

export type SegmentKey =
  | "activation"
  | "winback_30"
  | "winback_60"
  | "winback_90"
  | "balance_low"
  /** WP7 — deposit pernah batal, belum pernah berhasil → winback top-up baru. */
  | "deposit_canceled"
  /** WP7 — reseller belum bayar aktivasi (tanpa invoice hidup) → /reseller. */
  | "reseller_unpaid";

export interface Recipient {
  userId: number;
  email: string;
  name: string;
  /** Saldo dalam RUPIAH (untuk statistik email balance_low). */
  balance: number;
}

function appBase(): string {
  return (process.env.SOCIO_APP_URL ?? "https://app.socio.id").replace(/\/+$/, "");
}

/** Kondisi wajib untuk SEMUA segmen marketing. */
const BASE_FILTER = sql.join(
  [
    sql`${users.subs} = 1`,
    sql`${users.email} <> ''`,
    sql`${users.level} NOT IN ('Admin','Developers','Blacklist','Demo')`,
    sql`NOT EXISTS (SELECT 1 FROM email_suppressions es WHERE es.email = ${users.email})`,
  ],
  sql` AND `,
);

const ORDERED = sql`EXISTS (SELECT 1 FROM orders o WHERE o.user_id = ${users.id})`;
function noOrderSince(days: number) {
  return sql`NOT EXISTS (SELECT 1 FROM orders o WHERE o.user_id = ${users.id} AND o.created_at >= DATE_SUB(NOW(), INTERVAL ${days} DAY))`;
}
function orderSince(days: number) {
  return sql`EXISTS (SELECT 1 FROM orders o WHERE o.user_id = ${users.id} AND o.created_at >= DATE_SUB(NOW(), INTERVAL ${days} DAY))`;
}

/** Sudah pernah deposit BERHASIL sepanjang masa (penanda "pernah top-up"). */
const DEPOSITED = sql`EXISTS (SELECT 1 FROM deposits d WHERE d.user_id = ${users.id} AND d.status = 'Success')`;
/** Invoice Pending yang MASIH hidup. Lane transaksional WP6 (mid-life / T-2h /
 *  H-2 / H-1) sudah mengingatkan mereka → marketing JANGAN menimpa. */
const LIVE_PENDING = sql`EXISTS (SELECT 1 FROM deposits d WHERE d.user_id = ${users.id} AND d.status = 'Pending' AND d.expire > NOW())`;
/** Reseller belum aktivasi: jalurnya `/reseller` (invoice aktivasi), BUKAN
 *  top-up biasa — jangan kirim mereka ke /saldo/top-up. */
const RESELLER_UNPAID = sql`(${users.level} = 'Reseller' AND ${users.resellerActivated} = 0)`;
function canceledDepositSince(days: number) {
  return sql`EXISTS (SELECT 1 FROM deposits d WHERE d.user_id = ${users.id} AND d.status = 'Canceled' AND d.created_at >= DATE_SUB(NOW(), INTERVAL ${days} DAY))`;
}

function segmentCondition(key: SegmentKey): {
  where: ReturnType<typeof sql>;
  order: ReturnType<typeof sql>;
} {
  switch (key) {
    case "activation":
      // Akun >= 3 hari yang BELUM pernah order sama sekali → konversi pertama.
      return {
        where: sql.join(
          [
            sql`${users.createdAt} <= DATE_SUB(NOW(), INTERVAL 3 DAY)`,
            sql`NOT ${ORDERED}`,
            // WP7: reseller belum aktivasi → segmen khusus reseller_unpaid.
            sql`NOT ${RESELLER_UNPAID}`,
            // WP7: invoice hidup → reminder transaksional WP6 sudah jalan.
            sql`NOT ${LIVE_PENDING}`,
          ],
          sql` AND `,
        ),
        order: sql`${users.createdAt} ASC`, // akun terlama dulu (paling siap dikonversi)
      };
    case "deposit_canceled":
      // WP7 — pernah coba top-up tapi invoice mati, dan belum pernah berhasil.
      // Bukan winback order (mereka belum pernah order).
      return {
        where: sql.join(
          [
            canceledDepositSince(30),
            sql`NOT ${DEPOSITED}`,
            sql`NOT ${LIVE_PENDING}`,
            sql`NOT ${RESELLER_UNPAID}`,
          ],
          sql` AND `,
        ),
        order: sql`${users.createdAt} ASC`,
      };
    case "reseller_unpaid":
      // WP7 — reseller belum bayar aktivasi. Invoice hidup dikecualikan
      // (reminder transaksional H-2/H-1 sedang jalan); sisanya = invoice sudah
      // mati/belum pernah terbit → perlu invoice aktivasi baru di /reseller.
      return {
        where: sql.join(
          [
            RESELLER_UNPAID,
            sql`${users.createdAt} <= DATE_SUB(NOW(), INTERVAL 3 DAY)`,
            sql`NOT ${LIVE_PENDING}`,
          ],
          sql` AND `,
        ),
        order: sql`${users.createdAt} ASC`,
      };
    case "winback_30":
      return {
        where: sql.join([ORDERED, noOrderSince(30)], sql` AND `),
        order: sql`${users.createdAt} ASC`,
      };
    case "winback_60":
      return {
        where: sql.join([ORDERED, noOrderSince(60)], sql` AND `),
        order: sql`${users.createdAt} ASC`,
      };
    case "winback_90":
      return {
        where: sql.join([ORDERED, noOrderSince(90)], sql` AND `),
        order: sql`${users.createdAt} ASC`,
      };
    case "balance_low":
      // 0 < saldo < Rp10.000 DAN masih aktif order 30 hari terakhir → reminder top-up.
      return {
        where: sql.join(
          [sql`${users.balance} > 0`, sql`${users.balance} < ${LOW_BALANCE_RP}`, orderSince(30)],
          sql` AND `,
        ),
        order: sql`${users.balance} ASC`, // saldo paling seret dulu
      };
  }
}

/**
 * Ambil penerima untuk satu segmen. `limit` = batas atas query (guard).
 * Budget harian + cooldown ditegakkan di level cron/enqueue, bukan di sini.
 */
export async function resolveSegment(key: SegmentKey, limit = 200): Promise<Recipient[]> {
  const { where, order } = segmentCondition(key);
  try {
    const rows = await db
      .select({
        userId: users.id,
        email: users.email,
        name: users.fullName,
        balance: users.balance,
      })
      .from(users)
      .where(sql`${BASE_FILTER} AND ${where}`)
      .orderBy(order, sql`${users.id} ASC`)
      .limit(limit);
    return rows.map((r) => ({
      userId: Number(r.userId),
      email: String(r.email ?? "").toLowerCase(),
      name: String(r.name ?? "").trim(),
      balance: Number(r.balance ?? 0),
    }));
  } catch (e) {
    console.error(`[marketing] resolveSegment(${key}) gagal:`, e);
    return [];
  }
}

export interface GridItem {
  name: string;
  price: string;
  href: string;
}

/** Baris pertama hasil db.execute (mysql2 mengembalikan [rows, fields]). */
function rowsOf(res: unknown): any[] {
  const a = res as any[];
  return Array.isArray(a?.[0]) ? a[0] : (a ?? []);
}

/**
 * Kategori terlaris (jumlah order Success/Processing/In progress 30 hari) +
 * harga mulai terendah (rate per-1000 IDR). Dipakai grid layanan di email
 * activation/winback. Non-fatal → [] (template menghilangkan grid) bila query
 * gagal, jadi email tetap terkirim dengan konten inti.
 */
export async function fetchPopularCategories(limit = 6): Promise<GridItem[]> {
  try {
    const res = await db.execute(sql`
      SELECT c.name AS category, MIN(s.price) AS min_rate, COUNT(o.id) AS cnt
      FROM categories c
      JOIN services s ON s.category_id = c.id AND s.status = 1
      LEFT JOIN orders o ON o.service_id = s.id
        AND o.status IN ('Success','Processing','In progress')
        AND o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY c.id, c.name
      HAVING cnt > 0
      ORDER BY cnt DESC
      LIMIT ${limit}
    `);
    const rows = rowsOf(res) as { category: string; min_rate: number; cnt: number }[];
    return rows
      .filter((r) => r.category)
      .slice(0, limit)
      .map((r) => ({
        name: String(r.category).slice(0, 40),
        price: `mulai ${formatRupiah(Number(r.min_rate) || 0)}/1k`,
        href: `${appBase()}/pesan`,
      }));
  } catch (e) {
    console.error("[marketing] fetchPopularCategories gagal:", e);
    return [];
  }
}
