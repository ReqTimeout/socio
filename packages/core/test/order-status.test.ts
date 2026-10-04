/**
 * Regression test for order status mapping.
 *
 * Bug (2026-10-02): SMMturk reports `"Processing"`. The old mapStatus() in
 * `app/src/cron/status-polling.ts` used `v.includes("progress")` which does
 * NOT match `"processing"`, so it returned `null` → status never updated →
 * admin/orders showed `Pending` while the provider was processing.
 *
 * This test pins the mapping contract for every status SMM panels emit.
 * Run: node --experimental-strip-types packages/core/test/order-status.test.ts
 */
import assert from "node:assert/strict";

import {
  mapProviderStatus,
  nextPollIntervalMs,
  isFinalStatus,
} from "../src/order-status.ts";

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

// ── The reported bug ────────────────────────────────────────────────────────
test('provider "Processing" maps to In progress (bukan null)', () => {
  const got = mapProviderStatus("Processing");
  assert.notEqual(
    got,
    null,
    'null = status tidak di-update, order nyangkut di "Pending" (BUG ASLI)',
  );
  assert.equal(got, "In progress");
});

// ── Every status SMM panels realistically emit ─────────────────────────────
const CASES: Array<[string, string | null]> = [
  // terminal
  ["Pending", "Pending"],
  ["pending", "Pending"],
  ["In progress", "In progress"],
  ["Processing", "In progress"], // ← SMMturk; the bug
  ["processing", "In progress"],
  ["Running", "In progress"],
  ["Completed", "Success"],
  ["completed", "Success"],
  ["Success", "Success"],
  ["Partial", "Partial"],
  ["Canceled", "Canceled"],
  ["cancelled", "Canceled"],
  ["Error", "Error"],
  ["Failed", "Error"],
  // other real-world states → must NOT be null (would freeze the order)
  ["Waiting", "Pending"],
  ["Hold", "Pending"],
  ["Refunded", null], // unknown on purpose: caller keeps existing status
  ["", null],
];

for (const [input, expected] of CASES) {
  test(`mapProviderStatus(${JSON.stringify(input)}) === ${JSON.stringify(expected)}`, () => {
    assert.equal(mapProviderStatus(input), expected);
  });
}

test("mapProviderStatus(undefined/null) === null", () => {
  assert.equal(mapProviderStatus(undefined), null);
  assert.equal(mapProviderStatus(null), null);
});

// ── Non-final statuses MUST stay pollable ───────────────────────────────────
test("In progress & Processing dijadwalkan ulang (bukan final)", () => {
  const created = new Date(Date.now() - 10 * 60 * 1000);
  assert.equal(isFinalStatus("In progress"), false);
  assert.equal(isFinalStatus("Processing"), false);
  assert.equal(nextPollIntervalMs("In progress", created), 5 * 60 * 1000);
  assert.equal(nextPollIntervalMs("Processing", created), 5 * 60 * 1000);
});

test("status final dijadwalkan 0 (stop polling)", () => {
  const created = new Date();
  for (const s of ["Success", "Canceled", "Partial", "Error"]) {
    assert.equal(isFinalStatus(s), true, `${s} harus final`);
    assert.equal(nextPollIntervalMs(s, created), 0);
  }
});

test("Pending stratified: <1j = 1menit, 1-6j = 5menit, >6j = 30menit", () => {
  const now = new Date("2026-10-02T12:00:00Z");
  const mk = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000);
  assert.equal(nextPollIntervalMs("Pending", mk(0.5), now), 60_000);
  assert.equal(nextPollIntervalMs("Pending", mk(3), now), 5 * 60_000);
  assert.equal(nextPollIntervalMs("Pending", mk(20), now), 30 * 60_000);
});

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
