/**
 * SELFTEST invariant UANG untuk cancel + refund (F12 — confirm-before-refund).
 *
 * Kontrak owner: "user cancel tapi di smmturk belum tercancel jadi modal sy belum
 * terefund tapi ke customer sudah terefund" = KERUGIAN. Test ini mengunci setiap
 * pintu yang bisa menghasilkan situasi itu, supaya regresi = test gagal, bukan
 * bug senyap yang membayar uang keluar.
 *
 * Empat kelas invariant:
 *  1. Klasifikasi status (live@provider / cancelable / final / cancel-pending).
 *  2. SET DISJOINT: status yang di-refund cron TIDAK BOLEH beririsan dengan status
 *     yang masih hidup di provider. Ini invariant uang paling utama.
 *  3. Simulasi poller: untuk order `Canceling`, refund HANYA boleh terjadi bila
 *     provider melapor status final yang benar-benar sah (H6).
 *  4. Kontrak sumber statik: cron/refund.ts, cron/status-polling.ts,
 *     lib/server/refund.ts dan lib/server/order-cancel.ts harus tetap sepadan.
 *
 * Port dari socio.my app/test/order-cancel-money.test.ts — adaptasi .id:
 * import relatif (bukan @socio/core), APP_ROOT menunjuk app/ repo ini, dan
 * assertion charset migration = utf8mb3 LIVE (bukan utf8mb4 + default .my).
 *
 * Run (dari packages/core): node --experimental-strip-types test/order-cancel-money.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CANCELABLE_STATUS,
  LIVE_AT_PROVIDER,
  isCancelableStatus,
  isCancelPending,
  isFinalStatus,
  isLiveAtProvider,
  mapProviderStatus,
  nextPollIntervalMs,
  type OrderStatus,
} from "../src/order-status.ts";

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

console.log("order-cancel money selftest");

// Test ini berada di packages/core/test → ../../../app = <root>/app.
const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../app");
const src = (rel: string) => readFileSync(path.join(APP_ROOT, rel), "utf8");

/** Semua nilai ENUM orders.status — harus sepadan dengan schema + migration. */
const ALL: OrderStatus[] = [
  "Pending",
  "Processing",
  "Error",
  "Partial",
  "Success",
  "In progress",
  "Canceled",
  "Refilling",
  "Canceling",
];

/** Set refund cron auto-refund (cron/refund.ts). */
const REFUND_SET = ["Partial", "Error", "Canceled"];
/** Set claim poller (cron/status-polling.ts). */
const POLL_SET = ["Pending", "In progress", "Processing", "Canceling"];

// ── 1. Klasifikasi status ───────────────────────────────────────────────────

check("Canceling BUKAN final — harus terus di-poll sampai provider konfirmasi", () => {
  assert.equal(isFinalStatus("Canceling"), false);
  assert.equal(isCancelPending("Canceling"), true);
});

check("Canceling = masih hidup di provider (modal owner tertahan)", () => {
  assert.equal(isLiveAtProvider("Canceling"), true);
});

check("setiap status live@provider TIDAK final (tanpa pengecualian)", () => {
  for (const s of LIVE_AT_PROVIDER) {
    assert.equal(isFinalStatus(s), false, `${s} live tapi final — bertentangan`);
  }
});

check("CANCELABLE_STATUS ⊆ LIVE_AT_PROVIDER (hanya order hidup boleh dibatalkan)", () => {
  for (const s of CANCELABLE_STATUS) {
    assert.equal(isLiveAtProvider(s), true, `${s} boleh cancel tapi bukan live`);
  }
});

check("F11: Processing + In progress boleh dimohon cancel (bukan hanya Pending)", () => {
  assert.equal(isCancelableStatus("Pending"), true);
  assert.equal(isCancelableStatus("Processing"), true);
  assert.equal(isCancelableStatus("In progress"), true);
});

check("status final / menunggu tidak boleh dimohon cancel dua kali", () => {
  for (const s of ["Success", "Canceled", "Error", "Partial", "Canceling", "Refilling"]) {
    assert.equal(isCancelableStatus(s), false, `${s} seharusnya tidak cancelable`);
  }
});

check("helper terima null/undefined/kosong tanpa melempar (status DB bisa null)", () => {
  for (const v of [null, undefined, ""]) {
    assert.equal(isLiveAtProvider(v), false);
    assert.equal(isCancelableStatus(v), false);
    assert.equal(isCancelPending(v), false);
    assert.equal(isFinalStatus(v), false);
  }
});

check("Canceling di-poll paling rapat (1 mnt) tanpa memedulikan umur order", () => {
  const now = new Date(Date.UTC(2026, 10, 14, 12, 0, 0));
  for (const ageDays of [0, 1, 30]) {
    const created = new Date(now.getTime() - ageDays * 86400000);
    assert.equal(nextPollIntervalMs("Canceling", created, now), 60000);
  }
});

// ── 2. Invariant uang utama: SET DISJOINT ───────────────────────────────────

check("INTI UANG: set refund cron TIDAK beririsan dengan live@provider", () => {
  const overlap = REFUND_SET.filter((s) => isLiveAtProvider(s));
  assert.deepEqual(overlap, [], `refund akan bayar order hidup: ${overlap.join(", ")}`);
});

check("INTI UANG: Canceling tidak boleh di-refund (uang tunggu provider)", () => {
  assert.equal(REFUND_SET.includes("Canceling"), false);
  assert.equal(isLiveAtProvider("Canceling"), true);
});

check("setiap status final yang sah memang boleh di-refund atau Success", () => {
  for (const s of ["Canceled", "Error", "Partial"]) {
    assert.equal(REFUND_SET.includes(s), true);
    assert.equal(isLiveAtProvider(s), false);
  }
  // Success = layanan diberikan → tidak ada refund (benar).
  assert.equal(REFUND_SET.includes("Success"), false);
});

check("KPI admin: 4 bucket mencakup SEMUA status tepat sekali (angka relate)", () => {
  const buckets: Record<string, string[]> = {
    selesai: ["Success"],
    pending: ["Pending"],
    proses: ["Processing", "In progress", "Refilling", "Canceling"],
    errorBatal: ["Canceled", "Error", "Partial"],
  };
  for (const s of ALL) {
    const hits = Object.entries(buckets).filter(([, list]) => list.includes(s));
    assert.equal(hits.length, 1, `${s} masuk ${hits.length} bucket (harus tepat 1)`);
  }
});

// ── 3. Simulasi poller (H6) ─────────────────────────────────────────────────

/**
 * Cermin TEPAT logika cron/status-polling.ts:
 *   const isFinal = isFinalStatus(newStatus);
 *   const keepCanceling = cancelPending && !isFinal;
 *   if (newStatus && !keepCanceling) update.status = newStatus;
 */
function pollerDecision(current: string, providerRaw: string | null) {
  const newStatus = mapProviderStatus(providerRaw);
  const isFinal = isFinalStatus(newStatus);
  const keepCanceling = isCancelPending(current) && !isFinal;
  const status = newStatus && !keepCanceling ? newStatus : current;
  return { status, refund: REFUND_SET.includes(status) };
}

check("H6: provider lapor 'Canceling' → TETAP Canceling, TIDAK ada refund", () => {
  for (const raw of ["Canceling", "Cancelling", "canceling", "CANCELLING"]) {
    const d = pollerDecision("Canceling", raw);
    assert.equal(d.status, "Canceling", `${raw} → ${d.status}`);
    assert.equal(d.refund, false, `${raw} memicu refund!`);
  }
});

check("H6: 'Cancellation requested' / 'cancel failed' → TIDAK ada refund", () => {
  for (const raw of [
    "Cancellation requested",
    "Cancel requested",
    "Cancel pending",
    "Cancel in progress",
    "Cancel failed",
  ]) {
    const d = pollerDecision("Canceling", raw);
    assert.equal(d.refund, false, `${raw} memicu refund!`);
    assert.equal(d.status, "Canceling");
  }
});

check("H2: provider masih proses → intent cancel TIDAK ditimpa", () => {
  for (const raw of ["Processing", "In progress", "Pending", "running", "waiting"]) {
    const d = pollerDecision("Canceling", raw);
    assert.equal(d.status, "Canceling", `${raw} menimpa intent cancel`);
    assert.equal(d.refund, false);
  }
});

check("provider KONFIRMASI batal → Canceled, refund dibenarkan (satu jalan saja)", () => {
  for (const raw of ["Canceled", "Cancelled", "canceled", "CANCELLED"]) {
    const d = pollerDecision("Canceling", raw);
    assert.equal(d.status, "Canceled");
    assert.equal(d.refund, true);
  }
});

check("provider selesai walaupun cancel diminta → Success, TIDAK ada refund + alert", () => {
  for (const raw of ["Completed", "Success", "complete"]) {
    const d = pollerDecision("Canceling", raw);
    assert.equal(d.status, "Success");
    assert.equal(d.refund, false, "layanan diberikan tapi uang dikembalikan!");
  }
});

check("Partial / Error dari provider → refund (proporsional / penuh) dibenarkan", () => {
  assert.equal(pollerDecision("Canceling", "Partial").refund, true);
  assert.equal(pollerDecision("Canceling", "Error").refund, true);
});

check("status tak dikenali → null → tetap status saat ini, TIDAK ada refund", () => {
  for (const raw of [null, "", "   ", "weird-unknown-state"]) {
    const d = pollerDecision("Canceling", raw);
    assert.equal(d.status, "Canceling");
    assert.equal(d.refund, false);
  }
});

check("mapProviderStatus TIDAK pernah mengembalikan 'Canceling' (itu intent kita)", () => {
  const raws = [
    "Canceling",
    "Cancelling",
    "Canceled",
    "Cancelled",
    "Cancellation requested",
    "Processing",
    "In progress",
    "Pending",
    "Completed",
    "Partial",
    "Error",
    "Refilling",
  ];
  for (const r of raws) {
    assert.notEqual(mapProviderStatus(r), "Canceling", r);
  }
});

check("order BUKAN cancel-pending: 'Canceling' provider tidak mengubah status", () => {
  const d = pollerDecision("In progress", "Canceling");
  assert.equal(d.status, "In progress");
  assert.equal(d.refund, false);
});

// ── 4. Kontrak sumber statik (cegah drift senyap) ───────────────────────────

check("cron/refund.ts: set refund tetap Partial/Error/Canceled, TIDAK ada Canceling", () => {
  const t = src("src/cron/refund.ts");
  const m = t.match(/IN \(([^)]*)\)/);
  assert.ok(m, "set refund tidak ditemui");
  const list = m![1].split(",").map((x) => x.trim().replace(/'/g, ""));
  assert.deepEqual(list.sort(), [...REFUND_SET].sort());
  assert.equal(/'Canceling'/.test(t), false, "cron refund membaca Canceling!");
});

check("cron/status-polling.ts: set claim HARUS termasuk Canceling", () => {
  const t = src("src/cron/status-polling.ts");
  const m = t.match(/IN \(([^)]*)\)/);
  assert.ok(m);
  const list = m![1].split(",").map((x) => x.trim().replace(/'/g, ""));
  assert.deepEqual(list.sort(), [...POLL_SET].sort());
});

check("lib/server/refund.ts: guard live@provider ada di DUA pintu", () => {
  const t = src("src/lib/server/refund.ts");
  const hits = t.match(/isLiveAtProvider\(/g) ?? [];
  // executeRefund (choke point) + approveRefund (pintu kedua) = 2.
  assert.equal(hits.length, 2, `guard ditemui ${hits.length} kali, harus 2`);
  assert.equal(/ackProvider/.test(t), true, "override sadar tidak didukung");
});

check("lib/server/order-cancel.ts: TIDAK ada tulisan uang langsung (H1–H4)", () => {
  const t = src("src/lib/server/order-cancel.ts");
  assert.equal(/users\.balance/.test(t), false, "helper cancel menulis saldo!");
  assert.equal(/balanceLogs/.test(t), false, "helper cancel menulis ledger!");
  assert.equal(/isRefund:\s*1/.test(t), false, "helper cancel menandai refund!");
});

check("order-cancel.ts: rejected DAN unreachable keduanya tidak menulis DB", () => {
  const t = src("src/lib/server/order-cancel.ts");
  // Kedua cabang harus return sebelum blok UPDATE.
  const iReject = t.indexOf('if (r === "rejected")');
  const iUnreach = t.indexOf('if (r === "unreachable")');
  const iUpdate = t.indexOf(".update(orders)");
  assert.ok(iReject > 0 && iUnreach > 0 && iUpdate > 0);
  assert.ok(iReject < iUpdate, "rejected tidak return sebelum UPDATE");
  assert.ok(iUnreach < iUpdate, "unreachable tidak return sebelum UPDATE");
});

check("admin/orders: refund override harus datang dari checkbox ackProvider", () => {
  const t = src("src/routes/(admin)/admin/orders/+page.server.ts");
  assert.equal(/ackProvider:\s*String\(form\.get\("ackProvider"\)/.test(t), true);
  assert.equal(/isLiveAtProvider\(o\.status\)/.test(t), true);
});

check("schema + migration: ENUM 9 nilai dalam urutan TEPAT (ordinal aman)", () => {
  const schema = src("../packages/db/src/schema/orders.ts");
  const mig = src("../scripts/db/migration-2026-11-18-order-canceling.sql");

  // Drizzle: mysqlEnum("status", [ ... ]) — ambil daftar sebenarnya, bukan komentar.
  const sm = schema.match(/mysqlEnum\("status",\s*\[([\s\S]*?)\]\)/);
  assert.ok(sm, "schema: mysqlEnum status tidak ditemui");
  const schemaVals = [...sm![1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);

  // Migration: ENUM(''Pending'',...) di dalam literal SQL (kutip digandakan).
  const mm = mig.match(/ENUM\(([^)]*)\)/);
  assert.ok(mm, "migration: ENUM tidak ditemui");
  const migVals = mm![1].split(",").map((x) => x.trim().replace(/^''|''$/g, ""));

  // MySQL menyimpan ENUM sebagai indeks ordinal: menambah nilai di TENGAH akan
  // mengubah makna baris yang ada. 'Canceling' HARUS di ujung, dan delapan nilai
  // asal harus tetap dalam urutan asal.
  assert.deepEqual(schemaVals, ALL, "schema: urutan ENUM menyimpang");
  assert.deepEqual(migVals, ALL, "migration: urutan ENUM menyimpang");
  assert.equal(schemaVals[schemaVals.length - 1], "Canceling");
  assert.equal(migVals[migVals.length - 1], "Canceling");
});

check("migration: charset/collation/nullability dikunci utf8mb3 LIVE (cegah drift)", () => {
  const mig = src("../scripts/db/migration-2026-11-18-order-canceling.sql");
  // Ambil HANYA substring ALTER — header migration menyebut utf8mb4 sebagai
  // peringatan (jangan rebuild), jadi assert negatif harus scoped ke ALTER.
  const alter = mig.match(/ALTER TABLE orders MODIFY COLUMN status[\s\S]*?LOCK=NONE/);
  assert.ok(alter, "migration: pernyataan ALTER tidak ditemui");
  const a = alter![0];
  // LIVE .id = utf8mb3 / utf8mb3_swedish_ci / NOT NULL TANPA default (gap-plan
  // §1.4). utf8mb4 = rebuild 26.507 baris = MDL convoy; DEFAULT baru = drift.
  assert.equal(/CHARACTER SET utf8mb3\b/.test(a), true);
  assert.equal(/COLLATE utf8mb3_swedish_ci/.test(a), true);
  assert.equal(/NOT NULL/.test(a), true);
  assert.equal(/DEFAULT/.test(a), false, "migration menambah DEFAULT (LIVE tak punya)");
  assert.equal(/utf8mb4/.test(a), false, "utf8mb4 = rebuild tabel = MDL convoy");
  assert.equal(/ALGORITHM=INPLACE/.test(a), true);
  assert.equal(/LOCK=NONE/.test(a), true);
  // Idempotent: harus ada guard information_schema sebelum ALTER.
  assert.equal(/information_schema\.COLUMNS/.test(mig), true);
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}