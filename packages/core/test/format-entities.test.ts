/**
 * SELFTEST decode entitas HTML di jalur display/sync nama (port E2 socio.my
 * 1 Nov 2026 — 9 assertion).
 *
 * Audit read-only DB `.id` 5 Nov 2026: 167 nama layanan + 20 kategori berisi
 * entitas mentah ("Music &amp; Sound Promotion") karena provider mengembalikan
 * nama ter-escape HTML dan `whitelabel()` tidak pernah men-decode. Selftest
 * ini mengunci:
 *
 *  1. `decodeHtmlEntities` menormalkan entitas bernama + numeric (des/hex).
 *  2. Idempotent — string bersih & '&' yang bukan entitas tidak berubah.
 *  3. `whitelabel` / `serviceDisplayName` ikut terbebas dari '&amp;' (jalur
 *     tulis cron + jalur baca UI), tanpa merusak whitelist brand/mojibake.
 *
 * Run: node --experimental-strip-types packages/core/test/format-entities.test.ts
 */
import assert from "node:assert/strict";

import { decodeHtmlEntities, whitelabel, serviceDisplayName } from "../../../app/src/lib/format.ts";

let passed = 0;
const failures: string[] = [];
function check(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`  ok   ${name}`);
  } catch (e) {
    failures.push(`${name} — ${(e as Error).message}`);
    console.error(`  FAIL ${name}: ${(e as Error).message}`);
  }
}

console.log("format-entities selftest");

check("decode: &amp; → &", () => {
  assert.equal(decodeHtmlEntities("Music &amp; Sound"), "Music & Sound");
});

check("decode: numeric des & hex", () => {
  assert.equal(decodeHtmlEntities("It&#039;s"), "It's");
  assert.equal(decodeHtmlEntities("It&#x27;s"), "It's");
  assert.equal(decodeHtmlEntities("A &#8211; B"), "A \u2013 B");
});

check("decode: amp/lt/gt/quot/apos/named lain", () => {
  assert.equal(decodeHtmlEntities("&lt;b&gt;&quot;x&quot;"), '<b>"x"');
  assert.equal(decodeHtmlEntities("&nbsp;"), " ");
  assert.equal(decodeHtmlEntities("&rsquo;"), "\u2019");
});

check("decode: idempotent utk teks bersih", () => {
  assert.equal(decodeHtmlEntities("Instagram Followers"), "Instagram Followers");
});

check("decode: '&' yang bukan entitas tidak ditelan", () => {
  assert.equal(decodeHtmlEntities("R&B and 5 & 6"), "R&B and 5 & 6");
});

check("decode: entitas tak dikenal dibiarkan utuh", () => {
  assert.equal(decodeHtmlEntities("&foobar;"), "&foobar;");
});

check("whitelabel: 'Music &amp; Sound Promotion' ter-decode", () => {
  assert.equal(whitelabel("Music &amp; Sound Promotion"), "Music & Sound Promotion");
});

check("whitelabel: brand strip tetap jalan + entity bersih", () => {
  // brand "SMMTURK" dinetral → "Socio"; entity di-decode; tidak ada '&amp;' sisa
  const out = whitelabel("Tokyo &amp; SMMTURK Likes");
  assert.ok(!out.includes("&amp;"), `masih ada &amp;: ${out}`);
});

check("serviceDisplayName: 'Followers &amp; More' ter-decode", () => {
  assert.equal(serviceDisplayName("Followers &amp; More"), "Followers & More");
});

console.log(`format-entities: ${passed} assertion lulus, ${failures.length} gagal`);
if (failures.length) {
  for (const f of failures) console.error("  ✗ " + f);
  process.exit(1);
}
