/**
 * SELFTEST API publik kompatibel SMMturk (pure api-compat, tanpa DB).
 * Port socio.my — adaptasi .id: mata uang IDR (rupiah integer), gate level
 * hanya Reseller/Agen (Developers/Admin/Member/Demo/Blacklist ditolak).
 *
 * Mengunci: mapping status socio→SMMturk (Success→Completed); parse batch id
 * (dedup/trim/batas 100); pesan cancel reason; SSRF guard webhook (termasuk
 * IPv4-mapped IPv6); HMAC canonical urlencode + anti-replay timestamp; sandbox;
 * validasi deposit IDR; ambang withdraw affiliate.
 *
 * Run: node --experimental-strip-types test/api-compat.test.ts
 */
import assert from "node:assert/strict";
import {
  API_CURRENCY,
  API_MAX_BATCH,
  API_ORDER_STATUSES,
  isApiLevelAllowed,
  mapOrderStatus,
  parseBatchIds,
  cancelReasonMessage,
  socioStatusesForApiFilter,
  clampHistoryLimit,
  normalizeIdempotencyKey,
  parseBulkOrders,
  isSafeWebhookUrl,
  isPrivateOrLocalIp,
  webhookSignature,
  webhookBackoffMs,
  canonicalSignString,
  timingSafeEqualHex,
  checkApiSignature,
  isSandbox,
  sandboxOrderId,
  isSandboxOrderId,
  depositAmountError,
  affiliateCanWithdraw,
} from "../../../app/src/lib/server/api-compat.ts";

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

console.log("api-compat selftest (SMMturk-compatible API, IDR)");

check("mata uang IDR + batas batch 100", () => {
  assert.equal(API_CURRENCY, "IDR");
  assert.equal(API_MAX_BATCH, 100);
});

// Gate level (owner: hanya Reseller + Agen)
check("level Reseller & Agen diizinkan", () => {
  assert.equal(isApiLevelAllowed("Reseller"), true);
  assert.equal(isApiLevelAllowed("Agen"), true);
});
check("level Member/Admin/Demo/Blacklist/Developers ditolak", () => {
  assert.equal(isApiLevelAllowed("Member"), false);
  assert.equal(isApiLevelAllowed("Admin"), false);
  assert.equal(isApiLevelAllowed("Demo"), false);
  assert.equal(isApiLevelAllowed("Blacklist"), false);
  assert.equal(isApiLevelAllowed("Developers"), false);
});
check("level null/undefined/kosong ditolak", () => {
  assert.equal(isApiLevelAllowed(null), false);
  assert.equal(isApiLevelAllowed(undefined), false);
  assert.equal(isApiLevelAllowed(""), false);
});

// Mapping status socio → SMMturk
check("Success → Completed (enum SMMturk)", () => {
  assert.equal(mapOrderStatus("Success"), "Completed");
});
check("Refilling → In progress, Canceling → Processing", () => {
  assert.equal(mapOrderStatus("Refilling"), "In progress");
  assert.equal(mapOrderStatus("Canceling"), "Processing");
});
check("status lain tetap (Pending/Partial/In progress/Canceled/Error/Processing)", () => {
  for (const s of ["Pending", "Partial", "In progress", "Canceled", "Error", "Processing"]) {
    assert.equal(mapOrderStatus(s), s);
  }
});

// Parse batch id
check("parse '1,2,3' → ['1','2','3']", () => {
  assert.deepEqual(parseBatchIds("1,2,3"), ["1", "2", "3"]);
});
check("dedup '1,1,2' → ['1','2']", () => {
  assert.deepEqual(parseBatchIds("1,1,2"), ["1", "2"]);
});
check("trim + buang kosong ' 1 , ,2 ' → ['1','2']", () => {
  assert.deepEqual(parseBatchIds(" 1 , ,2 "), ["1", "2"]);
});
check("kosong → []", () => {
  assert.deepEqual(parseBatchIds(""), []);
  assert.deepEqual(parseBatchIds(" , , "), []);
});
check("batas 100 id (101 → 100)", () => {
  const raw = Array.from({ length: 101 }, (_, i) => String(i + 1)).join(",");
  assert.equal(parseBatchIds(raw).length, 100);
});

// Cancel reason → pesan SMMturk
check("cancel reason not_found → Incorrect order ID", () => {
  assert.equal(cancelReasonMessage("not_found"), "Incorrect order ID");
});
check("cancel reason lain → pesan sesuai", () => {
  assert.equal(cancelReasonMessage("not_supported"), "Cancel not available for this service");
  assert.equal(cancelReasonMessage("already"), "Cancel already requested");
  assert.equal(cancelReasonMessage("rejected"), "Provider rejected the cancel request");
  assert.equal(cancelReasonMessage("unreachable"), "Provider unreachable, try again later");
  assert.equal(cancelReasonMessage("unknown"), "Cancel failed");
});

// ── Tier 1: orders history filter + idempotency key
check("API_ORDER_STATUSES = enum output mapOrderStatus", () => {
  assert.deepEqual(API_ORDER_STATUSES, [
    "Pending",
    "Processing",
    "In progress",
    "Completed",
    "Partial",
    "Canceled",
    "Error",
  ]);
});
check("filter Completed → [Success]", () => {
  assert.deepEqual(socioStatusesForApiFilter("Completed"), ["Success"]);
});
check("filter In progress → [In progress, Refilling] (balikan banyak-ke-satu)", () => {
  assert.deepEqual(socioStatusesForApiFilter("In progress"), ["In progress", "Refilling"]);
});
check("filter Processing → [Processing, Canceling]", () => {
  assert.deepEqual(socioStatusesForApiFilter("Processing"), ["Processing", "Canceling"]);
});
check("filter status lain balikan tepat", () => {
  assert.deepEqual(socioStatusesForApiFilter("Pending"), ["Pending"]);
  assert.deepEqual(socioStatusesForApiFilter("Partial"), ["Partial"]);
  assert.deepEqual(socioStatusesForApiFilter("Canceled"), ["Canceled"]);
  assert.deepEqual(socioStatusesForApiFilter("Error"), ["Error"]);
});
check("filter tidak dikenal → null (ditolak)", () => {
  assert.equal(socioStatusesForApiFilter("Refilling"), null);
  assert.equal(socioStatusesForApiFilter("Success"), null);
  assert.equal(socioStatusesForApiFilter("bogus"), null);
  assert.equal(socioStatusesForApiFilter(""), null);
});
check("clampHistoryLimit default 50 / maks 100 / min 1", () => {
  assert.equal(clampHistoryLimit(undefined), 50);
  assert.equal(clampHistoryLimit(""), 50);
  assert.equal(clampHistoryLimit("0"), 50);
  assert.equal(clampHistoryLimit("-5"), 50);
  assert.equal(clampHistoryLimit("abc"), 50);
  assert.equal(clampHistoryLimit("25"), 25);
  assert.equal(clampHistoryLimit("25.9"), 25);
  assert.equal(clampHistoryLimit("500"), 100);
});
check("normalizeIdempotencyKey trim/batas100/null", () => {
  assert.equal(normalizeIdempotencyKey(undefined), null);
  assert.equal(normalizeIdempotencyKey(""), null);
  assert.equal(normalizeIdempotencyKey("   "), null);
  assert.equal(normalizeIdempotencyKey("  abc-123  "), "abc-123");
  assert.equal(normalizeIdempotencyKey("x".repeat(150))?.length, 100);
});

// ── Tier 2: bulk_add parse
check("parseBulkOrders array valid → items", () => {
  const r = parseBulkOrders('[{"service":1,"link":"a","quantity":100},{"service":2}]');
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.items.length, 2);
});
check("parseBulkOrders kosong/tidak ada → error", () => {
  assert.equal(parseBulkOrders("").ok, false);
  assert.equal(parseBulkOrders(undefined).ok, false);
  assert.equal(parseBulkOrders("   ").ok, false);
});
check("parseBulkOrders JSON rusak → error", () => {
  const r = parseBulkOrders("[{bad json");
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.error, "Invalid orders JSON");
});
check("parseBulkOrders bukan array → error", () => {
  const r = parseBulkOrders('{"service":1}');
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.error, "orders must be a JSON array");
});
check("parseBulkOrders array kosong → error", () => {
  const r = parseBulkOrders("[]");
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.error, "orders array is empty");
});
check("parseBulkOrders >100 item → error batas", () => {
  const raw = JSON.stringify(Array.from({ length: 101 }, () => ({ service: 1 })));
  const r = parseBulkOrders(raw);
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /Max 100/);
});

// ── Tier 2: webhook SSRF guard + sign + backoff
check("isSafeWebhookUrl https publik diterima", () => {
  assert.equal(isSafeWebhookUrl("https://example.com/hook"), true);
  assert.equal(isSafeWebhookUrl("https://panel.reseller.id/api/callback"), true);
});
check("isSafeWebhookUrl http/non-URL ditolak", () => {
  assert.equal(isSafeWebhookUrl("http://example.com/hook"), false);
  assert.equal(isSafeWebhookUrl("not a url"), false);
  assert.equal(isSafeWebhookUrl(""), false);
  assert.equal(isSafeWebhookUrl("ftp://example.com"), false);
});
check("isSafeWebhookUrl localhost/private/loopback/link-local ditolak (SSRF)", () => {
  for (const u of [
    "https://localhost/hook",
    "https://foo.local/hook",
    "https://foo.internal/hook",
    "https://127.0.0.1/hook",
    "https://10.0.0.5/hook",
    "https://192.168.1.1/hook",
    "https://172.16.0.1/hook",
    "https://172.31.255.255/hook",
    "https://169.254.169.254/latest/meta-data",
    "https://100.64.0.1/hook",
    "https://0.0.0.0/hook",
    "https://[::1]/hook",
  ]) {
    assert.equal(isSafeWebhookUrl(u), false, u);
  }
});
check("isSafeWebhookUrl IPv4 publik diterima", () => {
  assert.equal(isSafeWebhookUrl("https://8.8.8.8/hook"), true);
  assert.equal(isSafeWebhookUrl("https://172.32.0.1/hook"), true);
});
check("isSafeWebhookUrl IPv4-mapped IPv6 loopback/metadata DITOLAK (Susulan 50)", () => {
  for (const u of [
    "https://[::ffff:127.0.0.1]/hook",
    "https://[::ffff:169.254.169.254]/latest",
    "https://[::ffff:10.0.0.1]/hook",
    "https://[::ffff:7f00:1]/hook",
    "https://[::]/hook",
  ]) {
    assert.equal(isSafeWebhookUrl(u), false, u);
  }
});
check("isPrivateOrLocalIp private/loopback/link-local/CGNAT/multicast = true", () => {
  for (const ip of [
    "127.0.0.1",
    "10.1.2.3",
    "192.168.0.1",
    "172.16.0.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "224.0.0.1",
    "255.255.255.255",
    "::1",
    "::",
    "fc00::1",
    "fd12::1",
    "fe80::1",
    "::ffff:127.0.0.1",
    "::ffff:7f00:1",
    "not-an-ip",
  ]) {
    assert.equal(isPrivateOrLocalIp(ip), true, ip);
  }
});
check("isPrivateOrLocalIp publik = false", () => {
  for (const ip of ["8.8.8.8", "172.32.0.1", "1.1.1.1", "2606:4700::1111"]) {
    assert.equal(isPrivateOrLocalIp(ip), false, ip);
  }
});
check("webhookSignature HMAC-SHA256 hex deterministik", () => {
  const a = webhookSignature('{"order":"1"}', "secret");
  const b = webhookSignature('{"order":"1"}', "secret");
  assert.equal(a, b);
  assert.match(a, /^[0-9a-f]{64}$/);
  assert.notEqual(a, webhookSignature('{"order":"1"}', "other"));
});
check("webhookBackoffMs naik + cap", () => {
  assert.equal(webhookBackoffMs(0), 60_000);
  assert.equal(webhookBackoffMs(1), 300_000);
  assert.equal(webhookBackoffMs(2), 1_800_000);
  assert.equal(webhookBackoffMs(99), 21_600_000);
});

// ── Tier 3: HMAC request signing + sandbox
check("canonicalSignString urut key, buang signature", () => {
  const s = canonicalSignString({ action: "add", service: "1", signature: "x", quantity: "100" });
  assert.equal(s, "action=add&quantity=100&service=1");
});
check("canonicalSignString urlencode hindari collision (Susulan 50)", () => {
  const a = canonicalSignString({ a: "1&b=2" });
  const b = canonicalSignString({ a: "1", b: "2" });
  assert.equal(a, "a=1%26b%3D2");
  assert.equal(b, "a=1&b=2");
  assert.notEqual(a, b);
  assert.equal(
    canonicalSignString({ link: "https://x.com/a?b=1&c=2" }),
    "link=https%3A%2F%2Fx.com%2Fa%3Fb%3D1%26c%3D2",
  );
});
check("timingSafeEqualHex sama/beda/panjang", () => {
  assert.equal(timingSafeEqualHex("abcd", "abcd"), true);
  assert.equal(timingSafeEqualHex("abcd", "abce"), false);
  assert.equal(timingSafeEqualHex("abc", "abcd"), false);
  assert.equal(timingSafeEqualHex("", ""), false);
});
check("checkApiSignature tanpa secret → lolos (legacy key polos)", () => {
  assert.equal(
    checkApiSignature({ apiSecret: "", apiSignRequired: false }, { action: "add" }),
    null,
  );
});
check("checkApiSignature wajib signature tapi tidak ada → error", () => {
  const e = checkApiSignature({ apiSecret: "s", apiSignRequired: true }, { action: "add" });
  assert.match(e ?? "", /Signature required/);
});
check("checkApiSignature secret ada + signature dihilangkan → error (enforced Susulan 50)", () => {
  const e = checkApiSignature({ apiSecret: "s", apiSignRequired: false }, { action: "add" });
  assert.match(e ?? "", /Signature required/);
});
check("checkApiSignature signature valid → lolos", () => {
  const now = 1_700_000_000_000;
  const params = { action: "add", service: "1", timestamp: String(now / 1000) };
  const sig = webhookSignature(canonicalSignString(params), "secret");
  assert.equal(
    checkApiSignature(
      { apiSecret: "secret", apiSignRequired: true },
      { ...params, signature: sig },
      now,
    ),
    null,
  );
});
check("checkApiSignature signature salah → error", () => {
  const now = 1_700_000_000_000;
  const params = { action: "add", timestamp: String(now / 1000), signature: "deadbeef" };
  const e = checkApiSignature({ apiSecret: "secret", apiSignRequired: false }, params, now);
  assert.match(e ?? "", /Invalid signature/);
});
check("checkApiSignature timestamp expired → error", () => {
  const now = 1_700_000_000_000;
  const params = { action: "add", timestamp: String(now / 1000 - 9999) };
  const sig = webhookSignature(canonicalSignString(params), "secret");
  const e = checkApiSignature(
    { apiSecret: "secret", apiSignRequired: false },
    { ...params, signature: sig },
    now,
  );
  assert.match(e ?? "", /timestamp/);
});
check("isSandbox 1/true/yes → true, lain false", () => {
  assert.equal(isSandbox({ sandbox: "1" }), true);
  assert.equal(isSandbox({ sandbox: "true" }), true);
  assert.equal(isSandbox({ sandbox: "YES" }), true);
  assert.equal(isSandbox({ sandbox: "0" }), false);
  assert.equal(isSandbox({}), false);
});
check("sandboxOrderId prefix SBX- + isSandboxOrderId", () => {
  const id = sandboxOrderId();
  assert.match(id, /^SBX-\d+$/);
  assert.equal(isSandboxOrderId(id), true);
  assert.equal(isSandboxOrderId("1731900000000"), false);
});

// ── Tier 4: deposit IDR + affiliate (ambang .id: min Rp20000, maks Rp10jt, withdraw Rp5000)
check("depositAmountError validasi min/max/invalid (IDR)", () => {
  assert.equal(depositAmountError(50000, 20000, 10000000), null);
  assert.equal(depositAmountError("50000.4", 20000, 10000000), null);
  assert.equal(depositAmountError(0, 20000, 10000000), "Invalid amount. Provide amount in IDR.");
  assert.equal(
    depositAmountError("abc", 20000, 10000000),
    "Invalid amount. Provide amount in IDR.",
  );
  assert.equal(depositAmountError(-5, 20000, 10000000), "Invalid amount. Provide amount in IDR.");
  assert.equal(depositAmountError(10000, 20000, 10000000), "Minimum top up is Rp20000.");
  assert.equal(depositAmountError(20000000, 20000, 10000000), "Maximum top up is Rp10000000.");
  assert.equal(depositAmountError(20000, 20000, 10000000), null);
  assert.equal(depositAmountError(10000000, 20000, 10000000), null);
});
check("affiliateCanWithdraw ambang min + tanpa requested", () => {
  assert.equal(affiliateCanWithdraw(5000, 0, 5000), true);
  assert.equal(affiliateCanWithdraw(10000, 0, 5000), true);
  assert.equal(affiliateCanWithdraw(4999.99, 0, 5000), false);
  assert.equal(affiliateCanWithdraw(10000, 10, 5000), false);
  assert.equal(affiliateCanWithdraw(0, 0, 5000), false);
});

// ── ringkas
console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.error("\nFAILURES:\n" + failures.map((f) => " - " + f).join("\n"));
  process.exit(1);
}
