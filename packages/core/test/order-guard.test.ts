/**
 * Regression test for disabled-service order guard (Fase 1 — Fix 3).
 *
 * Bug (port semantik dari socio.my Order #39): action order web mencari layanan
 * hanya dengan `eq(services.id, serviceId)` dan TIDAK memeriksa `status`, lalu
 * memotong saldo + mengirim ke provider. API v1 sudah benar (`status=1`), jadi
 * asimetri ini membuat bug tak terlihat saat uji API — 5 order "bocor" ke
 * layanan yang sudah di-disable admin selama 30 hari.
 *
 * ⚠ TEST MURNI OFFLINE — hanya fungsi pure keputusan. TIDAK menyentuh DB, order
 * nyata, payment, atau provider. Jangan tambah yang sentuh live.
 *
 * Run: node --experimental-strip-types packages/core/test/order-guard.test.ts
 */
import assert from "node:assert/strict";

import { serviceIsOrderable, serviceUnavailable } from "../src/order-guard.ts";

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

// ── serviceIsOrderable ───────────────────────────────────────────────────────
test("status=1 (aktif) → boleh di-order", () => {
  assert.equal(serviceIsOrderable({ status: 1 }), true);
});

test('status string "1" (driver MySQL) → boleh', () => {
  assert.equal(serviceIsOrderable({ status: "1" }), true);
});

test("BUG ASLI: status=0 (manual-off admin) → TOLAK", () => {
  // Persis kasus order #39: layanan ber-status 0 tapi sempat lolos.
  assert.equal(serviceIsOrderable({ status: 0 }), false);
});

test("status selain 0/1 (mis. 2/null/undefined) → TOLAK (hanya 1 yang boleh)", () => {
  assert.equal(serviceIsOrderable({ status: 2 }), false);
  assert.equal(serviceIsOrderable({ status: null }), false);
  assert.equal(serviceIsOrderable({ status: undefined }), false);
});

test("baris layanan hilang (dihapus dari katalog) → TOLAK", () => {
  assert.equal(serviceIsOrderable(null), false);
  assert.equal(serviceIsOrderable(undefined), false);
});

// ── serviceUnavailable (deep-link load) ──────────────────────────────────────
test("deep-link tanpa serviceId (halaman bersih) → BUKAN unavailable", () => {
  assert.equal(serviceUnavailable(0, null), false);
});

test("deep-link ke layanan aktif → TIDAK unavailable", () => {
  assert.equal(serviceUnavailable(5264, { status: 1 }), false);
});

test("BUG ASLI: deep-link ke layanan mati (id>0, status!=1) → unavailable", () => {
  assert.equal(serviceUnavailable(5264, { status: 0 }), true);
  assert.equal(serviceUnavailable(5264, null), true, "dihapus pun = unavailable");
});

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
