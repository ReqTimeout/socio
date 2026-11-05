/**
 * Regression test for fixed-package billing dispatch (Fase 1 — Fix 1).
 *
 * Bug (2026-11-05, semantik port dari socio.my Order #58): `computePrice`
 * selalu membagi qty dengan 1000, padahal SMMturk menyimpan rate PER-PACK
 * (bukan per-1000) pada layanan bertipe `Package` / `Custom Comments Package`
 * (min = max = 1). Akibatnya Package ditagih 1/1000 harga sebenarnya sementara
 * provider dibayar penuh → rugi sampai ~1000× per order. Terukur di DB produksi
 * socio.id: 1.042 `Package` + 136 `Custom Comments Package` aktif.
 *
 * ⚠ TEST MURNI OFFLINE — fungsi pricing pure, TIDAK menyentuh DB, order,
 * payment, atau API provider sama sekali. Jangan tambah yang sentuh live.
 *
 * Test ini mem-pin dispatcher `qtyDivisorFor`/`orderBillableFor`/
 * `modalAmountFor`/`computePrice(serviceType)` — satu-satunya jalur sah untuk
 * menghitung tagihan & modal untuk kedua semantik rate.
 *
 * Run: node --experimental-strip-types packages/core/test/pricing-package.test.ts
 */
import assert from "node:assert/strict";

import {
  isFixedPackageType,
  qtyDivisorFor,
  orderBillableFor,
  modalAmountFor,
  computePrice,
  type PricingRule,
} from "../src/pricing.ts";

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

// ── Pengenalan tipe ─────────────────────────────────────────────────────────
test('isFixedPackageType: hanya "Package" dan "Custom Comments Package"', () => {
  assert.equal(isFixedPackageType("Package"), true);
  assert.equal(isFixedPackageType("Custom Comments Package"), true);
  assert.equal(isFixedPackageType("Default"), false);
  assert.equal(isFixedPackageType("Custom Comments"), false);
  assert.equal(isFixedPackageType("Subscriptions"), false);
  assert.equal(isFixedPackageType(null), false);
  assert.equal(isFixedPackageType(undefined), false);
  assert.equal(isFixedPackageType(""), false);
});

test("qtyDivisorFor: 1 utk pack, 1000 utk lainnya", () => {
  assert.equal(qtyDivisorFor("Package"), 1);
  assert.equal(qtyDivisorFor("Custom Comments Package"), 1);
  assert.equal(qtyDivisorFor("Default"), 1000);
  assert.equal(qtyDivisorFor(null), 1000);
});

// ── Tagihan (rate jual) ─────────────────────────────────────────────────────
test("BUG ASLI: Package Rp15rb/pack qty 1 → tagih Rp15rb, bukan Rp15", () => {
  // Regresi Order #58: formula per-1000 menagih 1/1000 harga pack.
  const packRate = 15000;
  assert.equal(orderBillableFor("Package", packRate, 1), 15000);
  assert.notEqual(
    orderBillableFor("Package", packRate, 1),
    Math.round((1 / 1000) * packRate),
    "jangan pernah kembali ke formula per-1000 utk Package",
  );
});

test("Package qty>1 (bulk pack) → qty × rate pack", () => {
  assert.equal(orderBillableFor("Package", 15000, 3), 45000);
});

test("Default per-1000 tidak berubah: qty 1000 → 1× rate, qty 500 → setengah", () => {
  assert.equal(orderBillableFor("Default", 40000, 1000), 40000);
  assert.equal(orderBillableFor("Default", 40000, 500), 20000);
  assert.equal(orderBillableFor(undefined, 40000, 2000), 80000);
});

test("Custom Comments (bukan Package!) tetap per-1000", () => {
  // Rate CC = per-1000 komentar; hanya "Custom Comments Package" yang per-pack.
  assert.equal(orderBillableFor("Custom Comments", 60000, 100), 6000);
  assert.equal(orderBillableFor("Custom Comments Package", 60000, 1), 60000);
});

test("rate/qty invalid → 0 (bukan NaN)", () => {
  assert.equal(orderBillableFor("Package", 0, 1), 0);
  assert.equal(orderBillableFor("Package", NaN, 1), 0);
  assert.equal(orderBillableFor("Default", 1000, NaN), 0);
});

// ── Modal provider ──────────────────────────────────────────────────────────
test("modalAmountFor: Package per-pack, Default per-1000", () => {
  assert.equal(modalAmountFor("Package", 9000, 1), 9000);
  assert.equal(modalAmountFor("Package", 9000, 2), 18000);
  assert.equal(modalAmountFor("Default", 9000, 1000), 9000);
  assert.equal(modalAmountFor("Default", 9000, 500), 4500);
  assert.equal(modalAmountFor("Default", -100, 1000), 0, "modal negatif clamp 0");
});

// ── computePrice end-to-end (dispatcher + markup + floor) ───────────────────
const rule: PricingRule = {
  level: "Member",
  markupPercent: 30,
  flatPer1k: 0,
  minProfitPer1k: 2000,
  isActive: true,
};

test("computePrice Default: markup 30% per-1000, qty 2000 → 2× rate", () => {
  // jual/1k = 40000×1.3 = 52000; floor modal+minProfit = 40000+2000 ok.
  assert.equal(computePrice(40000, 2000, "Member", rule, 40000, "Default"), 104000);
});

test("computePrice Package: rate per-pack 12000 markup 30% qty 1 → 15600", () => {
  // jual/pack = 12000×1.3 = 15600; floor 12000+2000=14000 < 15600 → lolos.
  assert.equal(computePrice(12000, 1, "Member", rule, 12000, "Package"), 15600);
});

test("computePrice Package TANPA serviceType = regresi lama — pin agar selalu dikirim", () => {
  // Tanpa type, Package jatuh ke per-1000 (rugi 1000×). Test ini dokumentasi:
  // pemanggil order WAJIB kirim argumen ke-6.
  const withType = computePrice(12000, 1, "Member", rule, 12000, "Package");
  const withoutType = computePrice(12000, 1, "Member", rule, 12000, null);
  assert.ok(withoutType < withType / 100, "null type = formula per-1000 (bahaya)");
  assert.equal(withType, 15600);
});

test("computePrice Package floor anti-rugi: markup 0% tetap ≥ modal + minProfit", () => {
  const zero: PricingRule = { ...rule, markupPercent: 0, minProfitPer1k: 5000 };
  // jual = 20000×1.0 = 20000; floor = 20000 + 5000 = 25000 → tagih 25000/pack.
  assert.equal(computePrice(20000, 1, "Member", zero, 20000, "Package"), 25000);
});

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
