/**
 * Regression test for cancel refund-gate (Fase 1 — Fix 2).
 *
 * Bug (port semantik dari socio.my Order #74): action `cancel`/`massCancel`
 * di socio.id melakukan `try { smmturkCancel } catch { /* ignore *\/ }` lalu
 * TETAP flip status Canceled + refund saldo — bahkan ketika provider MENOLAK
 * (order sudah mulai diproses). Akibatnya Socio bayar provider DAN kembalikan
 * saldo user → rugi ganda. Tidak ada guard `allow_cancel` sama sekali.
 *
 * Fix: `isProviderRejection(e)` membedakan penolakan eksplisit provider
 * (pesan diawali "Provider error:") dari kegagalan network. Caller harus:
 *   - provider-reject  → JANGAN refund (order tetap aktif)
 *   - network-failure  → BOLEH refund lokal (lindungi saldo user)
 *
 * ⚠ TEST MURNI OFFLINE — hanya fungsi pure klasifikasi error. TIDAK menyentuh
 * DB, order nyata, payment, atau API provider. Jangan tambah yang sentuh live.
 *
 * Run: node --experimental-strip-types packages/core/test/cancel-gate.test.ts
 */
import assert from "node:assert/strict";

import { isProviderRejection } from "../src/smmturk.ts";

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

// ── Provider menolak eksplisit → caller TIDAK BOLEH refund ───────────────────
test('Provider error (order sudah diproses) → isProviderRejection TRUE', () => {
  const e = new Error('Provider error: {"error":"Order already in progress"}');
  assert.equal(isProviderRejection(e), true);
});

test('prefix "Provider error:" dari postForm json.error cocok', () => {
  // Meniru tepat yang dilempar postForm di smmturk.ts (line 57).
  const e = new Error(`Provider error: ${JSON.stringify({ error: "cancel not allowed" })}`);
  assert.equal(isProviderRejection(e), true);
});

// ── Kegagalan network → caller BOLEH refund lokal (lindungi saldo) ───────────
test("network failure (TypeError fetch) → FALSE (lanjut refund lokal)", () => {
  const e = new TypeError("fetch failed");
  assert.equal(isProviderRejection(e), false);
});

test("non-JSON response → FALSE (provider tak terkonfirmasi)", () => {
  const e = new Error("SMMturk non-JSON response: <html>502 Bad Gateway</html>");
  assert.equal(isProviderRejection(e), false);
});

test("timeout / aborted → FALSE", () => {
  const e = new Error("The operation was timed out");
  assert.equal(isProviderRejection(e), false);
});

// ── Edge: input tidak wajar tidak boleh meledak ──────────────────────────────
test("undefined/null/string tanpa message → FALSE (bukan throw)", () => {
  assert.equal(isProviderRejection(undefined), false);
  assert.equal(isProviderRejection(null), false);
  assert.equal(isProviderRejection("Provider error: raw string"), false); // string bukan Error
  assert.equal(isProviderRejection({}), false);
  assert.equal(isProviderRejection(new Error("")), false);
});

test("hanya awalan persis 'Provider error' yang dihitung (bukan substring tengah)", () => {
  assert.equal(isProviderRejection(new Error("x Provider error")), false, "substring di tengah bukan penolakan");
  assert.equal(isProviderRejection(new Error("Provider errorx")), true, "prefix match — dikenal provider");
});

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
