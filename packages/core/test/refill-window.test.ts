/**
 * Selftest jendela waktu refill — port verbatim dari socio.my (11 check,
 * dokumen handover §8.5). MURNI OFFLINE: hanya computeRefillWindow (no DB,
 * no API, no order nyata). Jangan tambahkan yang menyentuh live.
 *
 * Run: node --experimental-strip-types packages/core/test/refill-window.test.ts
 */
import assert from "node:assert/strict";
import { computeRefillWindow, HOUR_MS, DAY_MS } from "../src/refill-window.ts";

let passed = 0;
const failures: string[] = [];
function check(name: string, fn: () => void): void {
  try { fn(); passed++; console.log(`  ok  ${name}`); }
  catch (e) { const msg = (e as Error)?.message ?? String(e); failures.push(`${name}: ${msg}`); console.log(`FAIL  ${name}: ${msg}`); }
}

console.log("refill-window selftest");
const NOW = Date.UTC(2026, 10, 5, 12, 0, 0);
const base = {
  status: "Success", isRefill: 1, providerOrderId: "260321770",
  quantity: 1000, remains: 940, successAt: new Date(NOW - DAY_MS),
  lastRefillAt: null as Date | null, inProgress: false, now: NOW,
};

check("drop>0 & jendela terbuka → refillable", () => {
  const w = computeRefillWindow(base);
  assert.equal(w.state, "refillable"); assert.equal(w.canRequest, true);
  assert.equal(w.estimate, 60); assert.equal(w.nextAvailableAt, null);
});
check("no drop → clean tapi boleh request", () => {
  const w = computeRefillWindow({ ...base, remains: 1000 });
  assert.equal(w.state, "clean"); assert.equal(w.estimate, 0); assert.equal(w.canRequest, true);
});
check("cooldown 2 jam lalu → cooldown, nextAvailable benar", () => {
  const w = computeRefillWindow({ ...base, lastRefillAt: new Date(NOW - 2 * HOUR_MS) });
  assert.equal(w.state, "cooldown"); assert.equal(w.canRequest, false);
  assert.equal(w.nextAvailableAt, NOW - 2 * HOUR_MS + 24 * HOUR_MS);
});
check("cooldown lewat 25 jam → refillable", () => {
  assert.equal(computeRefillWindow({ ...base, lastRefillAt: new Date(NOW - 25 * HOUR_MS) }).state, "refillable");
});
check("validity 8 hari lalu → expired", () => {
  const w = computeRefillWindow({ ...base, successAt: new Date(NOW - 8 * DAY_MS) });
  assert.equal(w.state, "expired"); assert.equal(w.canRequest, false);
  assert.equal(w.refillUntil, NOW - 8 * DAY_MS + 7 * DAY_MS);
});
check("in-progress menang → progress", () => {
  const w = computeRefillWindow({ ...base, inProgress: true });
  assert.equal(w.state, "progress"); assert.equal(w.canRequest, false);
});
check("expired menang atas cooldown", () => {
  assert.equal(computeRefillWindow({ ...base, successAt: new Date(NOW - 10 * DAY_MS), lastRefillAt: new Date(NOW - HOUR_MS) }).state, "expired");
});
check("bukan Success → not_success", () => {
  const w = computeRefillWindow({ ...base, status: "Processing", remains: 500 });
  assert.equal(w.state, "not_success"); assert.equal(w.estimate, 0); assert.equal(w.canRequest, false);
});
check("poid kosong/'0' → inactive", () => {
  assert.equal(computeRefillWindow({ ...base, providerOrderId: "0" }).state, "inactive");
  assert.equal(computeRefillWindow({ ...base, providerOrderId: "" }).canRequest, false);
});
check("isRefill=0 → inactive", () => {
  assert.equal(computeRefillWindow({ ...base, isRefill: 0 }).state, "inactive");
});
check("cooldown 0 = tak pernah cooldown", () => {
  const w = computeRefillWindow({ ...base, lastRefillAt: new Date(NOW - HOUR_MS), cooldownHours: 0 });
  assert.notEqual(w.state, "cooldown"); assert.equal(w.canRequest, true);
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) { console.error("\nFAILURES:\n" + failures.map((f) => " - " + f).join("\n")); process.exit(1); }
