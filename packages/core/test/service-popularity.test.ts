/**
 * Selftest mesin "Paling laris" (rekomendasi /pesan) — port verbatim dari
 * socio.my `packages/core/test/service-popularity.test.ts` (21 assertion).
 *
 * Mengunci perilaku yang tak boleh bocor:
 *  - tier jendela bertingkat (hari ini → minggu ini → bulan ini) + hide
 *    kalau data kurang (jangan render kotak kosong);
 *  - hanya order `Success` yang dihitung sebagai bukti berhasil;
 *  - success-rate jadi kunci baru setelah 3 percobaan (data tipis → 1/1 = 100%);
 *  - filter keras kind/platform + preferensi kategori + urutan ranking.
 *
 * Run: node --experimental-strip-types packages/core/test/service-popularity.test.ts
 */
import assert from "node:assert/strict";

import {
  bucketPopularStats,
  isPopularEligible,
  pickPopularWindow,
  popularSuccessRate,
  rankPopular,
  POPULAR_DEFAULT_LIMIT,
  POPULAR_MIN_ITEMS,
  POPULAR_RATE_MIN_ATTEMPTS,
  POPULAR_SHOW_COUNT_FROM,
  type PopularCandidate,
  type PopularStats,
} from "../src/service-popularity.ts";

let pass = 0;
let fail = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    pass++;
    console.log(`  ok   ${name}`);
  } catch (e) {
    fail++;
    console.log(`  FAIL ${name}`);
    console.log(`       ${(e as Error).message.split("\n").join("\n       ")}`);
  }
}

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_800_000_000_000;

function stats(success: number, attempts: number, lastAt: number | null = null): PopularStats {
  return { success, attempts, lastAt };
}

/** Kandidat default: 1 success di semua jendela, tanpa attempts lain. */
function cand(
  id: number,
  over: Partial<PopularCandidate> = {},
): PopularCandidate {
  return {
    id,
    kind: "followers",
    platform: "instagram",
    categoryId: 100,
    pricePer1k: 1000,
    day: stats(1, 1, NOW - 1000),
    week: stats(1, 1, NOW - 1000),
    month: stats(1, 1, NOW - 1000),
    ...over,
  };
}

// ── pickPopularWindow ───────────────────────────────────────────────────────

test("pickPopularWindow null saat kandidat < minimum", () => {
  const c = [cand(1), cand(2)];
  assert.equal(POPULAR_MIN_ITEMS, 3);
  assert.equal(pickPopularWindow(c), null);
});

test("pickPopularWindow pilih 'day' kalau >=3 kandidat sukses 24 jam", () => {
  const c = [cand(1), cand(2), cand(3)];
  assert.equal(pickPopularWindow(c), "day");
});

test("pickPopularWindow turun ke 'week' saat tier day tak cukup", () => {
  const c = [
    cand(1, { day: stats(0, 0, null) }),
    cand(2, { day: stats(0, 0, null) }),
    cand(3, { day: stats(0, 0, null) }),
  ];
  assert.equal(pickPopularWindow(c), "week");
});

test("pickPopularWindow turun ke 'month' saat day & week kosong", () => {
  const c = [
    cand(1, { day: stats(0, 0, null), week: stats(0, 0, null) }),
    cand(2, { day: stats(0, 0, null), week: stats(0, 0, null) }),
    cand(3, { day: stats(0, 0, null), week: stats(0, 0, null) }),
  ];
  assert.equal(pickPopularWindow(c), "month");
});

test("pickPopularWindow null saat tak ada satu pun order sukses", () => {
  const c = [
    cand(1, { day: stats(0, 3, null), week: stats(0, 3, null), month: stats(0, 3, null) }),
    cand(2, { day: stats(0, 3, null), week: stats(0, 3, null), month: stats(0, 3, null) }),
    cand(3, { day: stats(0, 3, null), week: stats(0, 3, null), month: stats(0, 3, null) }),
  ];
  assert.equal(pickPopularWindow(c), null);
});

// ── bucketPopularStats ──────────────────────────────────────────────────────

test("bucketPopularStats menghitung 3 jendela dari order mentah", () => {
  const rows = [
    { serviceId: 7, status: "Success", createdAt: NOW - 2 * 60 * 60 * 1000 }, // 2 jam
    { serviceId: 7, status: "Canceled", createdAt: NOW - 3 * 24 * 60 * 60 * 1000 }, // 3 hari
    { serviceId: 7, status: "Success", createdAt: NOW - 10 * 24 * 60 * 60 * 1000 }, // 10 hari
  ];
  const m = bucketPopularStats(rows, NOW);
  const e = m.get(7)!;
  assert.equal(e.day.success, 1);
  assert.equal(e.day.attempts, 1);
  assert.equal(e.week.success, 1);
  assert.equal(e.week.attempts, 2);
  assert.equal(e.month.success, 2);
  assert.equal(e.month.attempts, 3);
});

test("bucketPopularStats hanya 'Success' yang dihitung sebagai bukti berhasil", () => {
  const rows = [
    { serviceId: 7, status: "Partial", createdAt: NOW - 1000 },
    { serviceId: 7, status: "In progress", createdAt: NOW - 1000 },
    { serviceId: 7, status: "Pending", createdAt: NOW - 1000 },
    { serviceId: 7, status: "Success", createdAt: NOW - 1000 },
  ];
  const e = bucketPopularStats(rows, NOW).get(7)!;
  assert.equal(e.day.success, 1);
  assert.equal(e.day.attempts, 4);
});

test("bucketPopularStats mengabaikan order > 30 hari dan tanggal masa depan", () => {
  const rows = [
    { serviceId: 7, status: "Success", createdAt: NOW - 31 * DAY },
    { serviceId: 7, status: "Success", createdAt: NOW + 5 * DAY },
  ];
  assert.equal(bucketPopularStats(rows, NOW).size, 0);
});

test("bucketPopularStats menyimpan waktu Sukses terakhir", () => {
  const rows = [
    { serviceId: 7, status: "Success", createdAt: NOW - 5000 },
    { serviceId: 7, status: "Success", createdAt: NOW - 1000 },
    { serviceId: 7, status: "Canceled", createdAt: NOW - 100 },
  ];
  const e = bucketPopularStats(rows, NOW).get(7)!;
  assert.equal(e.day.lastAt, NOW - 1000);
});

// ── eligibility + success-rate ──────────────────────────────────────────────

test("success-rate = success / attempts, 0 kalau belum ada percobaan", () => {
  const c = cand(1, { day: stats(0, 0, null) });
  assert.equal(popularSuccessRate(c, "day"), 0);
  const c2 = cand(2, { day: stats(2, 4, null) });
  assert.equal(popularSuccessRate(c2, "day"), 0.5);
});

test("eligibility: 1 dari 1 percobaan tetap lolos (data tipis)", () => {
  assert.equal(isPopularEligible(cand(1), "day"), true);
});

test("eligibility: 1 sukses dari 4 percobaan DITOLAK (rate < 50%)", () => {
  const c = cand(1, { day: stats(1, 4, null) });
  assert.equal(POPULAR_RATE_MIN_ATTEMPTS, 3);
  assert.equal(isPopularEligible(c, "day"), false);
});

test("eligibility: 2 dari 3 percobaan lolos (rate 66%)", () => {
  const c = cand(1, { day: stats(2, 3, null) });
  assert.equal(isPopularEligible(c, "day"), true);
});

test("eligibility: tanpa order Sukses di tier berjalan DITOLAK", () => {
  const c = cand(1, { day: stats(0, 5, null) });
  assert.equal(isPopularEligible(c, "day"), false);
});

// ── rankPopular ─────────────────────────────────────────────────────────────

test("rankPopular menyaring kind terpilih (filter keras)", () => {
  const list = [
    cand(1, { kind: "followers" }),
    cand(2, { kind: "likes" }),
    cand(3, { kind: "likes" }),
  ];
  const out = rankPopular(list, { window: "day", kind: "likes" });
  assert.deepEqual(out.map((c) => c.id), [2, 3]);
});

test("rankPopular menyaring platform terpilih (filter keras)", () => {
  const list = [cand(1, { platform: "instagram" }), cand(2, { platform: "tiktok" })];
  const out = rankPopular(list, { window: "day", platform: "tiktok" });
  assert.deepEqual(out.map((c) => c.id), [2]);
});

test("rankPopular mengurutkan jumlah Sukses menurun", () => {
  const list = [
    cand(1, { day: stats(1, 1, NOW) }),
    cand(2, { day: stats(5, 5, NOW) }),
    cand(3, { day: stats(3, 3, NOW) }),
  ];
  const out = rankPopular(list, { window: "day" });
  assert.deepEqual(out.map((c) => c.id), [2, 3, 1]);
});

test("rankPopular menaruh item dalam kategori terpilih di depan", () => {
  const list = [
    cand(1, { categoryId: 999, day: stats(9, 9, NOW) }),
    cand(2, { categoryId: 100, day: stats(2, 2, NOW) }),
    cand(3, { categoryId: 100, day: stats(1, 1, NOW) }),
  ];
  const out = rankPopular(list, { window: "day", categoryId: 100 });
  assert.deepEqual(out.map((c) => c.id), [2, 3, 1]);
});

test("rankPopular memecah seri dengan success-rate lalu harga", () => {
  const list = [
    cand(1, { day: stats(2, 4, NOW), pricePer1k: 500 }),
    cand(2, { day: stats(2, 2, NOW), pricePer1k: 900 }),
  ];
  const out = rankPopular(list, { window: "day" });
  assert.deepEqual(out.map((c) => c.id), [2, 1]);
});

test("rankPopular membatasi jumlah item (default limit)", () => {
  const list = Array.from({ length: 9 }, (_, i) => cand(i + 1));
  const out = rankPopular(list, { window: "day" });
  assert.equal(POPULAR_DEFAULT_LIMIT, 4);
  assert.equal(out.length, 4);
  assert.equal(rankPopular(list, { window: "day", limit: 2 }).length, 2);
});

test("angka social proof hanya ditampilkan mulai 2 (Paling sering dipesan)", () => {
  assert.equal(POPULAR_SHOW_COUNT_FROM, 2);
});

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);