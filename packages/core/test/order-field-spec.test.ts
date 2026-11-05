/**
 * SELFTEST B5 — spesifikasi field order dinamis per `services.type` (port
 * kontrak socio.my 2026-10-27 order-filter-live-notif-smmturk-fields).
 *
 * Distribusi tipe aktual di katalog produksi .id (probe 6 Nov 2026, read-only):
 * Default 7264, Package 1042, Custom Comments 287, Custom Comments Package 136,
 * Subscriptions 92, Invites from Groups 15, Comment Likes 14, Poll 4, SEO 3,
 * Mentions Hashtag 2, Mentions User Followers 1, Mentions Custom List 1,
 * Mentions with Hashtags 1, kosong 4 — semuanya harus punya spec eksplisit
 * ATAU fallback Default yang benar.
 *
 * Kunci perilaku:
 *  1. Subscriptions TANPA link/quantity — username + min/max/delay (extra).
 *  2. Package hanya butuh link (tanpa quantity).
 *  3. Poll → answer_number; Invites → groups; SEO → keywords;
 *     Mentions Hashtag → hashtag; Mentions Custom List → usernames;
 *     Comment Likes / Mentions User Followers → username (base, bukan extra).
 *  4. Custom Comments terdeteksi dari type ATAU nama saat type masih Default
 *     (data pra-sinkron v2).
 *  5. Tipe tak dikenal → fallback Default (link + quantity).
 *
 * Run: node --experimental-strip-types packages/core/test/order-field-spec.test.ts
 */
import assert from "node:assert/strict";
import { orderFieldSpec, orderFieldParams } from "../src/catalog.ts";

// 1. Subscriptions: tanpa link, tanpa quantity stepper; username base + 3 extra.
const subs = orderFieldSpec("Subscriptions");
assert.equal(subs.needsLink, false);
assert.equal(subs.hasQuantity, false);
assert.equal(subs.needsUsername, true);
assert.deepEqual(subs.extra, ["min", "max", "delay"]);

// 2. Package: hanya link.
const pkg = orderFieldSpec("Package");
assert.equal(pkg.needsLink, true);
assert.equal(pkg.hasQuantity, false);
assert.equal(pkg.isComments, false);
assert.deepEqual(pkg.extra, []);

// 3. Default: link + quantity.
const def = orderFieldSpec("Default");
assert.deepEqual(def.params, ["link", "quantity"]);
assert.deepEqual(def.extra, []);

// 4. Poll → answer_number extra.
const poll = orderFieldSpec("Poll");
assert.equal(poll.hasQuantity, true);
assert.deepEqual(poll.extra, ["answer_number"]);

// 5. Invites from Groups → groups; SEO → keywords; Mentions Hashtag → hashtag.
assert.deepEqual(orderFieldSpec("Invites from Groups").extra, ["groups"]);
assert.deepEqual(orderFieldSpec("SEO").extra, ["keywords"]);
assert.deepEqual(orderFieldSpec("Mentions Hashtag").extra, ["hashtag"]);

// 6. Mentions Custom List: usernames extra, TANPA quantity.
const mcl = orderFieldSpec("Mentions Custom List");
assert.equal(mcl.hasQuantity, false);
assert.deepEqual(mcl.extra, ["usernames"]);

// 7. Comment Likes + Mentions User Followers: username = param BASE (input
//    khusus di form), bukan extra.
assert.deepEqual(orderFieldSpec("Comment Likes").extra, []);
assert.equal(orderFieldSpec("Comment Likes").needsUsername, true);
assert.equal(orderFieldSpec("Mentions User Followers").needsUsername, true);

// 8. Custom Comments via type, dan fallback dari nama saat type Default/kosong.
const cc = orderFieldSpec("Custom Comments");
assert.equal(cc.isComments, true);
assert.equal(cc.hasQuantity, false);
const ccByName = orderFieldSpec("Default", "Instagram Custom Comments 1000");
assert.equal(ccByName.isComments, true);
const ccpByName = orderFieldSpec("", "TT Custom Comments Package");
assert.equal(ccpByName.isComments, true);

// 9. Tipe tak dikenal / string kosong → fallback Default.
assert.deepEqual(orderFieldParams("Nonsense Type").length, 2);

// 10. "Mentions with Hashtags" (varian nama produksi, 1 layanan) punya entri
//     eksplisit — param sama dgn Mentions Hashtag (docs SMMturk).
const mwh = orderFieldSpec("Mentions with Hashtags");
assert.equal(mwh.needsLink, true);
assert.deepEqual(mwh.extra, ["hashtag"]);

console.log("order-field-spec.test.ts: SEMUA ASSERTION LULUS (B5 spec per tipe)");
