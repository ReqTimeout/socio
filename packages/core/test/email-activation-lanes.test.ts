/**
 * SELFTEST WP7 — lane activation/winback deposit (port .my
 * email-activation-lanes.test.ts, P2.7 gap-plan 2026-11-17, disesuaikan
 * copy Indonesia + rute + Rupiah .id).
 *
 * Mengunci kontrak supaya regresi tidak lolos diam-diam:
 *  1. CTA top-up WAJIB `/saldo/top-up`. Route mati `/saldo/topup` (404) tidak
 *     boleh muncul lagi di email mana pun.
 *  2. Lane activation SADAR DEPOSIT: balanceRp 0 → ajak top-up dulu; saldo > 0
 *     → ajak order (perilaku lama UTUH); undefined → dianggap belum deposit.
 *  3. Winback deposit batal copy JUJUR: tanpa klaim palsu "tidak ada tagihan",
 *     ada fakta "saldo tidak bertambah" + fallback bukti transfer, CTA top-up baru.
 *  4. Reseller belum bayar → `/reseller` + nilai bersih dari env + 72 jam +
 *     kode unik 3 digit, BUKAN top-up biasa (mereka perlu invoice aktivasi).
 *  5. Bonus tidak dijanjikan bila rate 0 (env-driven, bukan hardcode).
 *  6. Semua trigger render DNA brand (tidak kosong + footer berhenti berlangganan).
 *  7. Kelas template marketing → kill switch/suppression/cap terpakai otomatis.
 *
 * Run: node --experimental-strip-types --import ./test/register.mjs test/email-activation-lanes.test.ts
 */
import assert from "node:assert/strict";

import { buildLifecycleEmail } from "../../../app/src/lib/server/marketing/templates.ts";
import { blankReason, visibleText } from "../src/email-guard.ts";
import { isMarketingTemplate } from "../../../app/src/lib/server/email/quota.ts";
import type { SegmentKey } from "../../../app/src/lib/server/marketing/segments.ts";

let blocks = 0;
const ok = (label: string) => console.log(`  ok - ${label}`);

// Basis URL sama dengan emailAbsoluteUrl (CTA dirakit saat modul di-import).
const APP = process.env.SOCIO_APP_URL ?? "https://app.socio.id";
const TOPUP = `${APP}/saldo/top-up`;
const ORDER = `${APP}/pesan`;
const RESELLER = `${APP}/reseller`;

const ALL: SegmentKey[] = [
  "activation",
  "balance_low",
  "deposit_canceled",
  "reseller_unpaid",
  "winback_30",
  "winback_60",
  "winback_90",
];

const ctx = {
  name: "Ali",
  unsubscribeUrl: `${APP}/u/token`,
  preferencesUrl: `${APP}/u/token`,
  grid: [],
};

// Env deterministik untuk ujian (getter $lib/format baca process.env live).
const saved = { ...process.env };
process.env.SOCIO_DEPOSIT_BONUS = "0.10";
process.env.SOCIO_TOPUP_MIN = "20000";
process.env.SOCIO_RESELLER_ACTIVATION_AMOUNT = "50000";
process.env.SOCIO_RESELLER_BONUS = "20000";

try {
  // ── Blok 1: integritas route CTA ──────────────────────────────────────────
  {
    for (const t of ALL) {
      const built = buildLifecycleEmail(t, { ...ctx, balanceRp: 0 });
      assert.ok(
        !built.html.includes(`${APP}/saldo/topup`),
        `${t}: CTA /saldo/topup (route 404) muncul lagi`,
      );
      assert.ok(
        !built.text.includes(`${APP}/saldo/topup`),
        `${t}: versi teks pakai /saldo/topup`,
      );
    }
    // Lane yang memang mengajak top-up harus menunjuk route sebenarnya.
    for (const t of ["deposit_canceled", "balance_low"] as const) {
      const built = buildLifecycleEmail(t, { ...ctx, balanceRp: 5000 });
      assert.ok(
        built.html.includes(TOPUP),
        `${t}: CTA top-up bukan /saldo/top-up`,
      );
    }
    blocks++;
    ok(
      "CTA top-up = /saldo/top-up; route mati /saldo/topup tidak muncul dalam 7 trigger",
    );
  }

  // ── Blok 2: activation sadar deposit ──────────────────────────────────────
  {
    const zero = buildLifecycleEmail("activation", { ...ctx, balanceRp: 0 });
    assert.ok(zero.html.includes(TOPUP), "saldo 0: CTA top-up hilang");
    assert.ok(
      zero.html.includes("Top up &amp; mulai") ||
        zero.html.includes("Top up & mulai"),
      "saldo 0: label CTA top-up hilang",
    );
    assert.ok(
      !zero.html.includes("Mulai pesan sekarang"),
      "saldo 0: masih ajak order (jalan buntu)",
    );
    assert.ok(
      /3 digit/i.test(zero.html),
      "saldo 0: kode unik 3 digit tidak diterangkan",
    );
    assert.ok(zero.html.includes("+10%"), "saldo 0: bonus 10% tidak dipapar");

    // Saldo > 0 → perilaku lama UTUH (ajak order, bukan top-up).
    const funded = buildLifecycleEmail("activation", {
      ...ctx,
      balanceRp: 50000,
    });
    assert.ok(
      funded.html.includes("Mulai pesan sekarang"),
      "saldo > 0: CTA order lama hilang",
    );
    assert.ok(
      !funded.html.includes("Top up &amp; mulai") &&
        !funded.html.includes("Top up & mulai"),
      "saldo > 0: terajak top-up",
    );
    assert.ok(funded.html.includes(ORDER), "saldo > 0: CTA order hilang");

    // balanceRp tidak dikirim (undefined) → dianggap belum deposit (aman).
    const unset = buildLifecycleEmail("activation", { ...ctx });
    assert.ok(
      unset.html.includes(TOPUP),
      "balanceRp undefined: seharusnya lane top-up",
    );
    blocks++;
    ok(
      "activation: saldo 0 → top-up + kode 3 digit + bonus; saldo > 0 → order (lama utuh)",
    );
  }

  // ── Blok 3: winback deposit batal — copy jujur ────────────────────────────
  {
    const built = buildLifecycleEmail("deposit_canceled", {
      ...ctx,
      balanceRp: 0,
    });
    const lower = built.html.toLowerCase();
    assert.ok(
      !lower.includes("tidak ada tagihan"),
      "klaim palsu 'tidak ada tagihan' muncul",
    );
    assert.ok(
      !lower.includes("tidak ada uang yang ditarik"),
      "klaim palsu 'tidak ada uang yang ditarik' muncul",
    );
    assert.ok(
      lower.includes("saldo tidak bertambah"),
      "fakta sebenarnya (saldo tidak bertambah) hilang",
    );
    assert.ok(
      /bukti transfer/i.test(built.html),
      "fallback bukti transfer hilang",
    );
    assert.ok(built.html.includes(TOPUP), "CTA buat top-up baru hilang");
    assert.ok(
      built.html.includes("Buat top-up baru"),
      "label CTA winback hilang",
    );
    assert.ok(
      /kedaluwarsa/i.test(built.subject),
      "subjek tidak menyatakan invoice kedaluwarsa",
    );
    blocks++;
    ok(
      "deposit_canceled: jujur (saldo tidak bertambah + fallback bukti), CTA top-up baru",
    );
  }

  // ── Blok 4: reseller belum bayar → /reseller + nilai bersih env ───────────
  {
    const built = buildLifecycleEmail("reseller_unpaid", {
      ...ctx,
      balanceRp: 0,
    });
    assert.ok(built.html.includes(RESELLER), "CTA /reseller hilang");
    assert.ok(
      !built.html.includes(TOPUP),
      "reseller belum aktivasi dikirim ke top-up biasa (salah)",
    );
    assert.ok(
      built.html.includes("Selesaikan aktivasi"),
      "label CTA aktivasi hilang",
    );
    // base 50.000 − bonus 20.000 = net 30.000 (angka dari env, bukan hardcode).
    assert.ok(
      /30\.000/.test(visibleText(built.html)),
      "nilai bersih (net) tidak dipapar",
    );
    assert.ok(
      /72 jam/.test(built.html),
      "masa berlaku invoice 72 jam tidak diterangkan",
    );
    assert.ok(
      /3 digit/i.test(built.html),
      "kode unik 3 digit tidak diterangkan",
    );

    // Env berubah → angka ikut (bukti bukan hardcode).
    process.env.SOCIO_RESELLER_ACTIVATION_AMOUNT = "60000";
    process.env.SOCIO_RESELLER_BONUS = "25000";
    const changed = buildLifecycleEmail("reseller_unpaid", {
      ...ctx,
      balanceRp: 0,
    });
    assert.ok(
      /35\.000/.test(visibleText(changed.html)),
      "net tidak dihitung ulang dari env (60.000−25.000=35.000)",
    );
    process.env.SOCIO_RESELLER_ACTIVATION_AMOUNT = "50000";
    process.env.SOCIO_RESELLER_BONUS = "20000";
    blocks++;
    ok(
      "reseller_unpaid: /reseller + net dari env (50−20=30rb, 60−25=35rb) + 72 jam + 3 digit",
    );
  }

  // ── Blok 5: bonus 0 → jangan janji ────────────────────────────────────────
  {
    process.env.SOCIO_DEPOSIT_BONUS = "0";
    for (const t of ["activation", "deposit_canceled"] as const) {
      const built = buildLifecycleEmail(t, { ...ctx, balanceRp: 0 });
      assert.ok(!built.html.includes("+0%"), `${t}: menjanjikan bonus +0%`);
      assert.ok(
        !built.html.includes("Bonus deposit"),
        `${t}: kartu bonus muncul walau rate 0`,
      );
      assert.ok(!/bonus 0%/i.test(built.text), `${t}: teks janji bonus 0%`);
      assert.ok(
        /Minimum top-up/i.test(visibleText(built.html)),
        `${t}: minimum top-up tetap perlu dimaklumkan`,
      );
    }
    process.env.SOCIO_RESELLER_BONUS = "0";
    const r = buildLifecycleEmail("reseller_unpaid", { ...ctx, balanceRp: 0 });
    assert.ok(
      !/bersih/i.test(r.subject),
      "reseller: subjek janji kredit walau bonus 0",
    );
    assert.ok(
      !r.html.includes("Saldo termasuk"),
      "reseller: stat saldo termasuk muncul walau bonus 0",
    );
    process.env.SOCIO_RESELLER_BONUS = "20000";
    process.env.SOCIO_DEPOSIT_BONUS = "0.10";
    blocks++;
    ok(
      "bonus rate 0 → tanpa janji bonus (deposit + reseller), minimum top-up tetap",
    );
  }

  // ── Blok 6: DNA brand — tidak kosong + unsubscribe + teks terlihat ────────
  {
    for (const t of ALL) {
      const built = buildLifecycleEmail(t, { ...ctx, balanceRp: 0 });
      assert.equal(blankReason(built.html), null, `${t}: dianggap kosong`);
      assert.ok(/<html[\s>]/i.test(built.html), `${t}: tag <html> hilang`);
      assert.ok(
        built.html.includes("Berhenti berlangganan"),
        `${t}: footer unsubscribe hilang`,
      );
      assert.ok(
        built.html.includes(`${APP}/u/token`),
        `${t}: URL unsubscribe hilang`,
      );
      assert.ok(
        visibleText(built.html).length > 120,
        `${t}: teks terlihat terlalu pendek`,
      );
      assert.ok(
        built.subject.length > 10 && built.subject.length < 120,
        `${t}: subjek tidak wajar`,
      );
      // Nama user dengan markup tidak boleh bocor sebagai HTML mentah.
      const hostile = buildLifecycleEmail(t, {
        ...ctx,
        name: "Ali <b>x</b>",
        balanceRp: 0,
      });
      assert.ok(!hostile.html.includes("<b>x</b>"), `${t}: markup nama bocor`);
    }
    blocks++;
    ok(
      "7 trigger: render DNA brand (tak kosong, unsubscribe, teks terlihat, nama di-escape)",
    );
  }

  // ── Blok 7: kelas marketing → guard otomatis terpakai ─────────────────────
  {
    for (const t of [
      "activation",
      "deposit_canceled",
      "reseller_unpaid",
    ] as const) {
      assert.equal(
        isMarketingTemplate(`marketing-${t}`),
        true,
        `${t}: bukan kelas marketing`,
      );
    }
    // Transaksional WP6 tetap bukan marketing (tidak kena kill switch/cap).
    assert.equal(isMarketingTemplate("deposit-reminder"), false);
    assert.equal(isMarketingTemplate("deposit-instruction"), false);
    blocks++;
    ok(
      "lane baru = kelas marketing (kill switch + suppression + cap terpakai); WP6 transaksional tetap",
    );
  }
} finally {
  process.env = saved;
}

console.log(`email-activation-lanes: ${blocks} blok OK`);
