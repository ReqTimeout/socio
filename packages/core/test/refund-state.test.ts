/**
 * Regression test for refund LABEL derived from ledger, not is_refund flag
 * (Fase 1 — Fix 4). Port semantik dari socio.my (admin #1 refund-label bug).
 *
 * Bug: admin & user menandai "Refunded" hanya dari `orders.is_refund`. Data prod
 * membuktikan flag bisa bohong DUA arah — order Success dengan refund kecil di
 * ledger (flag 0), dan order Canceled flag 1 tanpa potongan price. Sumber
 * kebenaran uang = balance_logs type 'ref'. Flag tetap dipakai menandai anomali.
 *
 * ⚠ TEST MURNI OFFLINE — hanya fungsi pure keputusan/rekonstruksi nominal.
 * TIDAK menyentuh DB, order nyata, payment, atau API provider. Jangan tambah
 * yang sentuh live.
 *
 * Run: node --experimental-strip-types packages/core/test/refund-state.test.ts
 */
import assert from "node:assert/strict";

import { refundStateOf, charged } from "../src/refund-state.ts";

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

// ── refundStateOf: ledger membuktikan refund → "refunded" (paling utama) ──────
test("ledger > 0 → refunded, apapun flag/status (flag boleh bohong)", () => {
  assert.equal(refundStateOf({ status: "Success", isRefund: 0, refundedLedger: 4000 }), "refunded");
  // BUG ASLI #1: order Success, flag 0, TAPI ada refund di ledger → harus "refunded".
  assert.equal(refundStateOf({ status: "Success", isRefund: 0, refundedLedger: 1 }), "refunded");
});

test("ledger=0 & flag=1 → flag-no-ledger (ditandai, selidiki)", () => {
  // BUG ASLI #2 arah lain: is_refund=1 tapi saldo belum tentu kembali.
  assert.equal(refundStateOf({ status: "Canceled", isRefund: 1, refundedLedger: 0 }), "flag-no-ledger");
});

test("ledger=0 & flag=0 & status final-unfulfilled → pending (cron akan proses)", () => {
  for (const st of ["Canceled", "Error", "Partial"]) {
    assert.equal(refundStateOf({ status: st, isRefund: 0, refundedLedger: 0 }), "pending", st);
  }
});

test("ledger=0 & flag=0 & status aktif (Pending/Processing/Success) → none", () => {
  for (const st of ["Pending", "Processing", "In progress", "Success", "Refilling"]) {
    assert.equal(refundStateOf({ status: st, isRefund: 0, refundedLedger: 0 }), "none", st);
  }
});

test("flag boolean true / null / undefined ditoleransi", () => {
 assert.equal(refundStateOf({ status: "Canceled", isRefund: true, refundedLedger: 0 }), "flag-no-ledger");
  assert.equal(refundStateOf({ status: "Canceled", isRefund: null, refundedLedger: 0 }), "pending");
  // isRefund & refundedLedger absen (undefined) → jatuh ke status check, bukan NaN.
  assert.equal(refundStateOf({ status: "Success" }), "none");
  assert.equal(refundStateOf({ status: "Error" }), "pending");
});

test("prioritas: ledger mengalahkan flag (refunded > flag-no-ledger)", () => {
  // flag=1 DAN ledger>0 → refunded (ledger uang yang bicara).
  assert.equal(refundStateOf({ status: "Canceled", isRefund: 1, refundedLedger: 99999 }), "refunded");
});

// ── charged: rekonstruksi harga awal yang sebenarnya dibayar user ──────────────
test("charged: price=0 & ada refund → refund-lah harga awalnya (refund penuh)", () => {
  assert.equal(charged(0, 250000), 250000);
});

test("charged: refund == price (cancel user) → price adalah harga awal", () => {
  assert.equal(charged(120000, 120000), 120000);
});

test("charged: Partial (price sisa + refund) → dijumlahkan", () => {
  assert.equal(charged(80000, 20000), 100000);
});

test("charged: tanpa refund (harga normal)", () => {
  assert.equal(charged(150000, 0), 150000);
});

test("charged: price=0 & refund=0 → 0", () => {
  assert.equal(charged(0, 0), 0);
});

test("charged: input tidak tentu (undefined/null) dinormalisasi pemanggil via Number(x)||0", () => {
  // Kontrak call site: admin/pesanan server selalu meng-Normalisasi sebelum
  // memanggil charged — jadi charged hanya perlu benar utk angka valid.
  assert.equal(charged(Number(undefined) || 0, Number(null) || 0), 0);
});

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
