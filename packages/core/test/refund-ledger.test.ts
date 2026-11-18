/**
 * F1 — Regression test fold bukti refund ledger (pengganti REGEXP per-baris
 * di list pesanan/admin-orders). Semantik WAJIB identik dengan SQL lama:
 *   note REGEXP CONCAT('order #', id, '([^0-9]|$)') — collation ci,
 *   SUM(amount) + MAX(created_at), hanya baris 'ref' milik user order.
 *
 * ⚠ TEST MURNI OFFLINE — hanya fungsi pure. TIDAK menyentuh DB, order nyata,
 * payment, atau API provider. Jangan tambah yang sentuh live.
 *
 * Run: node --experimental-strip-types packages/core/test/refund-ledger.test.ts
 */
import assert from "node:assert/strict";

import {
  foldRefundLedger,
  type LedgerRefundRow,
} from "../src/refund-ledger.ts";

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

const row = (
  userId: number,
  amount: number,
  note: string,
  createdAt: Date | string | null = new Date("2026-11-18T01:55:41Z"),
): LedgerRefundRow => ({ userId, amount, note, createdAt });

// ── Batas non-digit: "#7" tidak boleh menarik "#70"/"#700" ────────────────────
test("batas non-digit: #70/#700 tidak match #7; #7abc match (non-digit)", () => {
  const keys = [{ id: 7, userId: 1 }];
  const rows = [
    row(1, 100, "Pengembalian dana otomatis (Canceled) - order #70"),
    row(1, 200, "Pengembalian dana otomatis (Canceled) - order #700"),
    // 'a' = non-digit → batas '([^0-9]|$)' SQL lama TERPENUHI → ikut match.
    row(1, 300, "Refund cancel order #7abc"),
  ];
  const p = foldRefundLedger(keys, rows).get(7)!;
  assert.equal(p.refundedLedger, 300);
  assert.ok(p.refundedAt instanceof Date);
});

test("note berakhir tepat di id (format cron auto-refund)", () => {
  const p = foldRefundLedger(
    [{ id: 38025, userId: 9 }],
    [row(9, 11830, "Pengembalian dana otomatis (Partial) - order #38025")],
  ).get(38025)!;
  assert.equal(p.refundedLedger, 11830);
  assert.ok(p.refundedAt instanceof Date);
});

test("note admin manual dengan reason + status (format prod 18 Nov)", () => {
  const note =
    "Refund approved oleh admin #2393 — order #37827 (Goodwill owner: order Success di-refund manual, target instagram.com/angelinaindriyane) (Success)";
  const p = foldRefundLedger(
    [{ id: 37827, userId: 972337 }],
    [row(972337, 54587, note)],
  ).get(37827)!;
  assert.equal(p.refundedLedger, 54587);
  // "admin #2393" bukan "order #" → tidak boleh ikut menarik order lain.
  const q = foldRefundLedger(
    [{ id: 2393, userId: 972337 }],
    [row(972337, 54587, note)],
  ).get(2393)!;
  assert.equal(q.refundedLedger, 0);
});

test("note legacy user-cancel 'Refund cancel order #7'", () => {
  const p = foldRefundLedger(
    [{ id: 7, userId: 1 }],
    [row(1, 5000, "Refund cancel order #7")],
  ).get(7)!;
  assert.equal(p.refundedLedger, 5000);
});

// ── Agregasi: SUM + MAX ───────────────────────────────────────────────────────
test("multiple ref rows (partial bertahap) → SUM amount + MAX created_at", () => {
  const t1 = new Date("2026-11-10T00:00:00Z");
  const t2 = new Date("2026-11-15T00:00:00Z");
  const t3 = new Date("2026-11-12T00:00:00Z");
  const p = foldRefundLedger(
    [{ id: 42, userId: 2 }],
    [
      row(2, 1000, "Refund cancel order #42", t1),
      row(2, 2500, "Pengembalian dana otomatis (Partial) - order #42", t2),
      row(2, 500, "Refund approved oleh admin #1 — order #42 (sisa)", t3),
    ],
  ).get(42)!;
  assert.equal(p.refundedLedger, 4000);
  assert.equal(p.refundedAt, t2); // nilai asli baris terbaru dipertahankan
});

test("urutan baris ledger tidak memengaruhi hasil MAX", () => {
  const t1 = new Date("2026-11-10T00:00:00Z");
  const t2 = new Date("2026-11-15T00:00:00Z");
  const rows = [row(2, 1000, "order #42", t2), row(2, 1000, "order #42", t1)];
  const p = foldRefundLedger([{ id: 42, userId: 2 }], rows).get(42)!;
  assert.equal(p.refundedAt, t2);
  assert.equal(p.refundedLedger, 2000);
});

// ── Isolasi user & default ────────────────────────────────────────────────────
test("baris ref user lain tidak ikut (fold per user)", () => {
  const p = foldRefundLedger(
    [{ id: 42, userId: 2 }],
    [row(3, 9999, "Pengembalian dana otomatis (Canceled) - order #42")],
  ).get(42)!;
  assert.equal(p.refundedLedger, 0);
  assert.equal(p.refundedAt, null);
});

test("tanpa baris ledger → default {0, null} untuk SETIAP order key", () => {
  const m = foldRefundLedger(
    [
      { id: 1, userId: 1 },
      { id: 2, userId: 1 },
    ],
    [],
  );
  assert.equal(m.size, 2);
  assert.deepEqual(m.get(1), { refundedLedger: 0, refundedAt: null });
  assert.deepEqual(m.get(2), { refundedLedger: 0, refundedAt: null });
});

test("orderKeys kosong → Map kosong", () => {
  assert.equal(foldRefundLedger([], [row(1, 100, "order #1")]).size, 0);
});

test("id tidak valid (0 / negatif / NaN) → default tanpa match", () => {
  const rows = [row(1, 100, "order #0"), row(1, 100, "order #NaN")];
  const m = foldRefundLedger(
    [
      { id: 0, userId: 1 },
      { id: -5, userId: 1 },
      { id: NaN, userId: 1 },
    ],
    rows,
  );
  assert.equal(m.get(0)!.refundedLedger, 0);
  assert.equal(m.get(-5)!.refundedLedger, 0);
  assert.equal(m.get(NaN)!.refundedLedger, 0);
});

// ── Ketahanan bentuk data ─────────────────────────────────────────────────────
test("case-insensitive meniru collation ci REGEXP MySQL", () => {
  const p = foldRefundLedger(
    [{ id: 7, userId: 1 }],
    [row(1, 700, "Refund Cancel Order #7")],
  ).get(7)!;
  assert.equal(p.refundedLedger, 700);
});

test("amount null/string + createdAt null dinormalisasi", () => {
  const p = foldRefundLedger(
    [{ id: 7, userId: 1 }],
    [
      { userId: 1, amount: null, note: "order #7", createdAt: null },
      {
        userId: 1,
        amount: "1500" as unknown as number,
        note: "order #7",
        createdAt: null,
      },
    ],
  ).get(7)!;
  assert.equal(p.refundedLedger, 1500);
  assert.equal(p.refundedAt, null); // semua createdAt null → tidak ada MAX
});

test("createdAt string tetap bisa dibandingkan (MAX benar)", () => {
  const p = foldRefundLedger(
    [{ id: 7, userId: 1 }],
    [
      row(1, 100, "order #7", "2026-11-10 00:00:00"),
      row(1, 100, "order #7", "2026-11-15 00:00:00"),
    ],
  ).get(7)!;
  assert.equal(p.refundedLedger, 200);
  assert.equal(p.refundedAt, "2026-11-15 00:00:00");
});

test("note null / kosong tidak melempar", () => {
  const p = foldRefundLedger(
    [{ id: 7, userId: 1 }],
    [{ userId: 1, amount: 100, note: null, createdAt: null }, row(1, 100, "")],
  ).get(7)!;
  assert.equal(p.refundedLedger, 0);
});

test("beberapa order sekaligus dalam satu fold (list 25-30 baris)", () => {
  const rows = [
    row(1, 1000, "Pengembalian dana otomatis (Canceled) - order #10"),
    row(1, 2000, "Refund cancel order #11"),
    row(2, 3000, "Pengembalian dana otomatis (Error) - order #20"),
    row(2, 500, "order #21 (partial)"),
  ];
  const m = foldRefundLedger(
    [
      { id: 10, userId: 1 },
      { id: 11, userId: 1 },
      { id: 20, userId: 2 },
      { id: 21, userId: 2 },
      { id: 22, userId: 2 },
    ],
    rows,
  );
  assert.equal(m.get(10)!.refundedLedger, 1000);
  assert.equal(m.get(11)!.refundedLedger, 2000);
  assert.equal(m.get(20)!.refundedLedger, 3000);
  assert.equal(m.get(21)!.refundedLedger, 500);
  assert.deepEqual(m.get(22), { refundedLedger: 0, refundedAt: null });
});

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
