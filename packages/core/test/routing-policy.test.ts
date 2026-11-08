/**
 * SELFTEST routing per-kategori (keputusan murni, tanpa DB).
 *
 * Mengunci logika "siapa melayani kategori" yang jadi tulang punggung halaman
 * /admin/routing + gate order. Fungsi-fungsi ini DIPANGGIL LANGSUNG oleh jalur
 * produksi (`$lib/server/active-provider.isProviderAllowedForCategory`,
 * `$lib/server/category-routing.setRouting/listRoutingRows`) — bukan salinan —
 * jadi regresi di keputusan = test ini gagal, bukan bug senyap di uang/admin.
 *
 * ⚠ TEST MURNI OFFLINE — hanya fungsi pure. TIDAK menyentuh DB, order nyata,
 * payment, atau provider.
 *
 * Run: node --experimental-strip-types packages/core/test/routing-policy.test.ts
 */
import assert from "node:assert/strict";

import { kindOf } from "../src/kind-signature.ts";
import {
  deriveServingState,
  planReconcile,
  allowedForRouting,
  type ReconcileSvc,
} from "../src/routing-policy.ts";

let passed = 0;
const failures: string[] = [];

function check(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    failures.push(`${name}: ${msg}`);
    console.log(`FAIL  ${name}: ${msg}`);
  }
}

const MANUAL_OFF = "[manual-off]";

console.log("routing-policy selftest");

// ── 1. kindOf: signature harus sama dipakai UI + generator; prioritas penting.
check("kindOf live sebelum views", () => {
  assert.equal(kindOf("TikTok Live Stream Views"), "live");
  assert.equal(kindOf("TikTok Video Views"), "views");
});
check("kindOf watchtime / comments / followers / subscribers / likes / shares / sound", () => {
  assert.equal(kindOf("TikTok Watch Time Hours"), "watchtime");
  assert.equal(kindOf("TikTok Comments Custom"), "comments");
  assert.equal(kindOf("TikTok Followers Auto"), "followers");
  assert.equal(kindOf("TikTok Subscribers"), "subscribers");
  assert.equal(kindOf("TikTok Likes Instant"), "likes");
  assert.equal(kindOf("TikTok Shares"), "shares");
  assert.equal(kindOf("TikTok Sound Plays"), "sound");
});
check("kindOf generic untuk nama tak jelas", () => {
  assert.equal(kindOf("TikTok Emergency Server"), "generic");
  assert.equal(kindOf("USA Follow Targeted"), "generic");
});

// ── 2. deriveServingState: prioritas routed > active-global > off-manual > inactive.
check("deriveServingState routed menang walau provider bukan aktif global", () => {
  assert.equal(
    deriveServingState({
      routingProviderId: 2,
      providerIds: [1],
      activeId: 1,
      total: 5,
      active: 0,
      manualOff: 0,
    }),
    "routed",
  );
});
check("deriveServingState active-global tanpa routing", () => {
  assert.equal(
    deriveServingState({
      routingProviderId: null,
      providerIds: [1],
      activeId: 1,
      total: 5,
      active: 5,
      manualOff: 0,
    }),
    "active-global",
  );
});
check("deriveServingState off-manual hanya bila SEMUA layanan bertag", () => {
  assert.equal(
    deriveServingState({
      routingProviderId: null,
      providerIds: [1],
      activeId: 2, // provider lain yang aktif global
      total: 4,
      active: 0,
      manualOff: 4,
    }),
    "off-manual",
  );
  // sebagian bertag → bukan off-manual (masih bisa ikut default)
  assert.notEqual(
    deriveServingState({
      routingProviderId: null,
      providerIds: [1],
      activeId: 2,
      total: 4,
      active: 0,
      manualOff: 2,
    }),
    "off-manual",
  );
});
check("deriveServingState inactive untuk sisanya", () => {
  assert.equal(
    deriveServingState({
      routingProviderId: null,
      providerIds: [1],
      activeId: 2,
      total: 0,
      active: 0,
      manualOff: 0,
    }),
    "inactive",
  );
});

// ── 3. planReconcile (jalur tulis setRouting). (a) assign, (b) unassign, (d) overlap.
const catOverlap: ReconcileSvc[] = [
  { id: 11, providerId: 1, note: null, status: 1 },
  { id: 12, providerId: 1, note: "ok", status: 1 },
  { id: 13, providerId: 2, note: null, status: 0 },
  { id: 14, providerId: 2, note: `cheap ${MANUAL_OFF}`, status: 0 },
];

check("(a) route→P2: enable P2 non-manual-off, disable semua P1 aktif", () => {
  const plan = planReconcile(catOverlap, 2);
  assert.deepEqual(plan.enable, [13]); // 14 punya [manual-off] → jangan hidupkan
  assert.deepEqual(plan.disable.sort((a, b) => a - b), [11, 12]); // P1 aktif → off
});

check("(b) unassign (winner=aktif global P1): enable P1 mati, disable P2 aktif", () => {
  // keadaan sebelum: P2 dilayani (status?), P1 mati — pakai dataset lain.
  const svcs: ReconcileSvc[] = [
    { id: 21, providerId: 1, note: null, status: 0 },
    { id: 22, providerId: 2, note: null, status: 1 },
  ];
  const plan = planReconcile(svcs, 1);
  assert.deepEqual(plan.enable, [21]);
  assert.deepEqual(plan.disable, [22]);
});

check("(b') unassign tanpa provider aktif (winner=null): matikan semua yang aktif", () => {
  const svcs: ReconcileSvc[] = [
    { id: 31, providerId: 1, note: null, status: 1 },
    { id: 32, providerId: 2, note: null, status: 1 },
  ];
  const plan = planReconcile(svcs, null);
  assert.deepEqual(plan.enable, []);
  assert.deepEqual(plan.disable.sort((a, b) => a - b), [31, 32]);
});

check("(d) overlap: id kategori sama, route→Y paksa X keluar dalam kategori itu", () => {
  // Satu kategori dipakai layanan provider 1 & 2; route ke provider 2.
  const plan = planReconcile(catOverlap, 2);
  // Tidak ada layanan P1 yang boleh tetap aktif:
  for (const s of catOverlap) {
    if (s.providerId !== 2 && s.status === 1) {
      assert.ok(plan.disable.includes(s.id), `P1 svc ${s.id} harus di-disable`);
    }
  }
  // Dan hanya P2 non-manual-off yang di-enable:
  assert.ok(!plan.enable.includes(14), "P2 [manual-off] tidak boleh di-enable");
});

check("planReconcile idempoten: sudah benar → tidak ada flip", () => {
  const settled: ReconcileSvc[] = [
    { id: 41, providerId: 2, note: null, status: 1 },
    { id: 42, providerId: 1, note: null, status: 0 },
  ];
  const plan = planReconcile(settled, 2);
  assert.deepEqual(plan.enable, []);
  assert.deepEqual(plan.disable, []);
});

// ── 4. allowedForRouting (jalur order-gate isProviderAllowedForCategory). (c)
check("(c) kategori diroute → hanya provider routing yang boleh", () => {
  assert.equal(allowedForRouting(2, /*routed*/ 2, /*active*/ 1), true);
  assert.equal(allowedForRouting(1, /*routed*/ 2, /*active*/ 1), false); // aktif global pun ditolak
});
check("(c) kategori tak diroute → hanya provider aktif global yang boleh", () => {
  assert.equal(allowedForRouting(1, /*routed*/ undefined, /*active*/ 1), true);
  assert.equal(allowedForRouting(2, /*routed*/ undefined, /*active*/ 1), false);
});
check("(c) tak ada routing & tak ada provider aktif → tolak semua", () => {
  assert.equal(allowedForRouting(1, undefined, null), false);
  assert.equal(allowedForRouting(2, undefined, null), false);
});

// ── ringkas
console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.error("\nFAILURES:\n" + failures.map((f) => " - " + f).join("\n"));
  process.exit(1);
}
