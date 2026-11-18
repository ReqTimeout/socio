/**
 * SELFTEST kuota provider email — port .my email-quota.test.ts (P2.5
 * gap-plan 2026-11-17, keputusan owner: activation TETAP diprioritaskan).
 *
 * Mengunci kontrak "activation TETAP, lane lain terlindungi, plafon Resend
 * tidak pernah dijebol":
 *  1. computeLaneBudgets normal (caps 35): protected 5 TIDAK boleh direbut
 *     activation; activation ≤25; winback HANYA bila headroom provider ≥15
 *     dan hanya dari sisa slot.
 *  2. Guard pace bulanan memangkas lane (winback 0, protected ≤2, activation ≤8).
 *  3. monthlyPaceGuardActive hanya menyala mulai hari ke-27 DAN ≥90% plafon.
 *  4. Kelas template: marketing (marketing-/campaign-), admin-alert (admin-),
 *     transaksional user tidak ikut tergerbang.
 *  5. Env override parse aman (angka positif; sampah → fallback default).
 *
 * Run: node --experimental-strip-types --import ./test/register.mjs test/email-quota.test.ts
 */
import assert from "node:assert/strict";

import {
  computeLaneBudgets,
  monthlyPaceGuardActive,
  normalLaneCaps,
  guardLaneCaps,
  isMarketingTemplate,
  isAdminAlertTemplate,
  providerDailyCap,
  providerMonthlyCap,
  marketingTotalCap,
  WINBACK_MIN_HEADROOM,
} from "../../../app/src/lib/server/email/quota.ts";

let blocks = 0;
const ok = (label: string) => console.log(`  ok - ${label}`);

// ── Blok 1: lane normal ────────────────────────────────────────────────────
{
  const caps = normalLaneCaps();
  assert.equal(caps.total, 35, "total marketing default 35");
  assert.equal(caps.activation, 25, "activation tetap ≤25 (keputusan owner)");
  assert.equal(caps.protected, 5, "protected lane 5");

  // Hari baru, headroom lega → 5 protected + 25 activation + 5 winback (sisa 35-30).
  const fresh = computeLaneBudgets(caps, 0, 80);
  assert.deepEqual(fresh, {
    protectedBudget: 5,
    activationBudget: 25,
    winbackBudget: 5,
  });

  // Headroom provider tipis (<15) → winback memang nol, dua lane lain utuh.
  const tight = computeLaneBudgets(caps, 0, WINBACK_MIN_HEADROOM - 1);
  assert.equal(tight.winbackBudget, 0, "winback mati saat headroom < 15");
  assert.equal(tight.protectedBudget, 5);
  assert.equal(tight.activationBudget, 25);

  // Activation TIDAK boleh memakan slot protected: sudah dipakai 30 hari ini
  // (mis. 25 activation + 5 lifecycle lain) → sisa left=5 HANYA untuk protected.
  const used = computeLaneBudgets(caps, 30, 80);
  assert.deepEqual(used, {
    protectedBudget: 5,
    activationBudget: 0,
    winbackBudget: 0,
  });

  // Budget habis → semua nol.
  const drained = computeLaneBudgets(caps, 35, 80);
  assert.deepEqual(drained, {
    protectedBudget: 0,
    activationBudget: 0,
    winbackBudget: 0,
  });
  blocks++;
  ok(
    "lane normal: reservasi protected + cap activation + gerbang headroom winback",
  );
}

// ── Blok 2: guard pace bulanan memangkas lane ──────────────────────────────
{
  const caps = guardLaneCaps();
  assert.equal(caps.total, 10);
  assert.equal(caps.winback, 0, "guard: winback off");
  const b = computeLaneBudgets(caps, 0, 500); // headroom besar pun winback tetap 0
  assert.deepEqual(b, {
    protectedBudget: 2,
    activationBudget: 8,
    winbackBudget: 0,
  });
  blocks++;
  ok("guard caps: 10 total = 2 protected + 8 activation, tanpa winback");
}

// ── Blok 3: ambang monthlyPaceGuardActive ───────────────────────────────────
{
  assert.equal(
    monthlyPaceGuardActive({ monthSent: 2700, monthCap: 3000, dayOfMonth: 27 }),
    true,
  );
  assert.equal(
    monthlyPaceGuardActive({ monthSent: 2699, monthCap: 3000, dayOfMonth: 27 }),
    false,
  );
  assert.equal(
    monthlyPaceGuardActive({ monthSent: 2999, monthCap: 3000, dayOfMonth: 26 }),
    false,
  );
  assert.equal(
    monthlyPaceGuardActive({ monthSent: 2701, monthCap: 3000, dayOfMonth: 31 }),
    true,
  );
  blocks++;
  ok("guard bulanan hanya menyala ≥hari-27 DAN ≥90% plafon bulan");
}

// ── Blok 4: kelas template ─────────────────────────────────────────────────
{
  assert.equal(isMarketingTemplate("marketing-activation"), true);
  assert.equal(isMarketingTemplate("campaign-7"), true);
  assert.equal(isMarketingTemplate("deposit-instruction"), false);
  assert.equal(isAdminAlertTemplate("admin-deposit-pending"), true);
  assert.equal(isAdminAlertTemplate("admin-alert"), true);
  assert.equal(isAdminAlertTemplate("deposit-success"), false);
  assert.equal(isAdminAlertTemplate(null), false);
  blocks++;
  ok("marketing vs admin-alert vs transaksional user terklasifikasi benar");
}

// ── Blok 5: env override ───────────────────────────────────────────────────
{
  const saved = { ...process.env };
  try {
    assert.equal(providerDailyCap(), 95, "default 95");
    process.env.EMAIL_PROVIDER_DAILY_CAP = "100";
    assert.equal(providerDailyCap(), 100);
    process.env.EMAIL_PROVIDER_DAILY_CAP = "abc";
    assert.equal(providerDailyCap(), 95, "sampah → fallback default");
    process.env.EMAIL_PROVIDER_DAILY_CAP = "-5";
    assert.equal(providerDailyCap(), 95, "negatif → fallback default");
    process.env.EMAIL_PROVIDER_MONTHLY_CAP = "2000";
    assert.equal(providerMonthlyCap(), 2000);
    process.env.EMAIL_MARKETING_TOTAL_CAP = "40";
    assert.equal(marketingTotalCap(), 40);
    assert.equal(
      normalLaneCaps().activation,
      25,
      "activation tetap terkunci 25 walau total naik",
    );
    assert.equal(normalLaneCaps().winback, 10);
  } finally {
    process.env = saved;
  }
  blocks++;
  ok(
    "env parse aman: override sah berlaku, sampah kembali ke default konservatif",
  );
}

console.log(`email-quota: ${blocks} blok OK`);
