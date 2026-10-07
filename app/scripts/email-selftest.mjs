#!/usr/bin/env node
/* global process, console, Buffer */
/**
 * Self-test template email DNA — tanpa Vitest, tanpa install baru.
 * Cara kerja: transpile app/src/lib/server/email/*.ts pakai tsc lokal,
 * lalu assert hasil render. Gagal = exit 1.
 *
 * Yang dicek (lihat docs/EMAIL_PROMO_AUTOMATION_PLAN.md Fase 2):
 *  1. Tidak ada #94a3b8 di permukaan terang.
 *  2. Tidak ada teks #000000.
 *  3. Pasangan warna resmi lolos AA 4.5:1.
 *  4. Merge guard melempar bila tag bocor; greeting + escape benar.
 *  5. Email marketing penuh < 102 KB + ada link unsubscribe.
 *  6. Footer transaksional TIDAK berisi link unsubscribe.
 *
 * Usage: node scripts/email-selftest.mjs   (dari direktori app/)
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

// app/scripts/email-selftest.mjs → APP = app/
const APP = dirname(dirname(fileURLToPath(import.meta.url)));
const SRC = join(APP, "src/lib/server/email");

const out = mkdtempSync(join(tmpdir(), "email-selftest-"));
try {
  execFileSync(
    process.execPath,
    [
      join(APP, "node_modules/typescript/lib/tsc.js"),
      "--outDir",
      out,
      "--module",
      "nodenext",
      "--moduleResolution",
      "nodenext",
      "--target",
      "es2022",
      "--strict",
      "--skipLibCheck",
      join(SRC, "tokens.ts"),
      join(SRC, "render.ts"),
      join(SRC, "merge.ts"),
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
} catch (e) {
  console.error("FATAL: transpile email/*.ts gagal:");
  console.error(String(e?.stderr || e?.message || e).slice(0, 2000));
  process.exit(1);
}

const {
  EMAIL_COLORS: C,
  contrastRatio,
  assertContrast,
} = await import(pathToFileURL(join(out, "tokens.js")).href);
const R = await import(pathToFileURL(join(out, "render.js")).href);
const M = await import(pathToFileURL(join(out, "merge.js")).href);

let pass = 0;
function ok(name, cond, extra = "") {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    console.error(`  ✗ GAGAL: ${name} ${extra}`);
    process.exitCode = 1;
  }
}

// Sampel: shell transaksional + email marketing penuh.
const shellTx = R.emailShell({
  preheader: "Tes",
  headerSub: "Panel SMM Indonesia",
  maxWidth: 480,
  content:
    R.emailTitleBlock("Judul", "Intro") +
    R.emailCta({ label: "Klik", href: "https://app.socio.id/" }),
  footer: R.emailFooterTransactional("security"),
  afterCard: R.emailSupportAfterCard(),
});
const shellMkt = R.emailShell({
  preheader: "Promo",
  maxWidth: 600,
  content:
    R.emailHero({ eyebrow: "Promo", heading: "Diskon", sub: "Hemat" }) +
    R.emailPriceCard({ label: "Kupon", price: "Rp10.000", note: "Hari ini" }) +
    R.emailServiceGrid([
      { name: "IG Followers", price: "Rp15.000", href: "https://app.socio.id/layanan" },
      { name: "TikTok Views", price: "Rp5.000", href: "https://app.socio.id/layanan" },
    ]) +
    R.emailStatStrip([
      { value: "8.270", label: "Layanan" },
      { value: "24/7", label: "Support" },
    ]) +
    R.emailCta({ label: "Klaim", href: "https://app.socio.id/" }),
  footer: R.emailFooterMarketing({
    unsubscribeUrl: "https://app.socio.id/u/TOKEN",
    preferencesUrl: "https://app.socio.id/preferensi?token=TOKEN",
    address: "Jl. Contoh No. 1, Jakarta",
  }),
});

// 1-2: warna larangan di permukaan terang.
// #94a3b8 BOLEH hanya di dua tempat: blok <style> dark-mode (kartu jadi
// #1e293b → kontras ±5:1) dan kartu bank gelap. Kupas <style> dulu, lalu
// pastikan sisanya bersih.
function withoutStyle(html) {
  return html.replace(/<style>[\s\S]*?<\/style>/gi, "");
}
for (const [name, html] of [
  ["transaksional", shellTx],
  ["marketing", shellMkt],
]) {
  const light = withoutStyle(html);
  ok(`${name}: tanpa #94a3b8`, !light.toLowerCase().includes("#94a3b8"));
  ok(`${name}: tanpa indigo lama`, !light.includes("#4f46e5") && !light.includes("#06b6d4"));
  ok(
    `${name}: tanpa teks #000000`,
    !light.includes("color:#000000") && !light.includes("color: #000000"),
  );
}
// Pengecualian dark-mode memang ada dan memang disengaja (lolos kontras).
for (const [name, html] of [
  ["transaksional", shellTx],
  ["marketing", shellMkt],
]) {
  ok(`${name}: dark-mode terkendali`, /prefers-color-scheme:\s*dark/.test(html));
}

// 3: kontras AA pasangan resmi (tema socio.id: cyan-teal + mango).
const pairs = [
  [C.ctaText, C.accentInk, "CTA"],
  [C.inkBody, C.surface, "body"],
  [C.inkSecondary, C.surface, "sekunder"],
  [C.inkTitle, C.mango, "eyebrow mango"],
  [C.berryInk, C.surface, "urgency berry"],
  [C.accentBright, C.darkSurface, "angka-gelap"],
  [C.inkOnDark, C.darkSurface, "teks-gelap"],
  [C.inkMutedOnDark, C.darkSurface, "label-gelap"],
];
for (const [fg, bg, label] of pairs) {
  const r = contrastRatio(fg, bg);
  ok(`kontras ${label} ${r.toFixed(2)}:1 ≥ 4.5`, r >= 4.5);
}
// assertContrast sendiri harus melempar untuk pasangan buruk.
let threw = false;
try {
  assertContrast("#94a3b8", "#ffffff");
} catch {
  threw = true;
}
ok("assertContrast menolak #94a3b8 di putih", threw);

// 4: merge guard.
ok(
  "greeting bernama",
  M.renderMergeTags("{{greeting}}", { fullName: "Budi Santoso" }) === "Halo Budi,",
);
ok("greeting kosong", M.renderMergeTags("{{greeting}}", {}) === "Halo,");
ok("saldo format", M.renderMergeTags("{{saldoFormatted}}", { balance: 110327 }) === "Rp110.327");
ok("escape XSS", !M.renderMergeTags("{{fullName}}", { fullName: "<img src=x>" }).includes("<img"));
let leakThrew = false;
try {
  M.renderMergeTags("Halo {{unknownTag}}", {});
} catch {
  leakThrew = true;
}
ok("tag bocor melempar", leakThrew);
ok("tag valid terdaftar", M.validMergeTags().includes("greeting"));

// 5: ukuran + unsubscribe marketing.
ok("marketing < 102KB", Buffer.byteLength(shellMkt, "utf8") < 102 * 1024);
ok("marketing ada unsubscribe", shellMkt.includes("/u/TOKEN"));
ok("marketing ada alamat", shellMkt.includes("Jl. Contoh"));

// 6: transaksional tanpa unsubscribe.
ok("transaksional tanpa unsubscribe", !shellTx.includes("Berhenti berlangganan"));
ok("transaksional ada copy keamanan", shellTx.includes("Jika bukan Anda yang meminta"));

// 7: kartu bank tetap render (dark surface, pengecualian #94a3b8 yang sah).
const bank = R.emailBankCard({
  bankLabel: "Transfer BCA ke",
  accountNumber: "1392680815",
  accountName: "a.n Tes",
  amountLabel: "Nominal (transfer pas)",
  amount: "Rp110.327",
  meta: "Invoice X · Bayar sebelum Y",
});
ok("bankCard render nominal", bank.includes("Rp110.327") && bank.includes("1392680815"));

// 8: maskot Sparko — PNG https + alt + dimensi (wajib untuk klien gambar-mati).
for (const pose of ["idle", "wave", "celebrate", "sad"]) {
  const m = R.emailMascot(pose);
  ok(
    `maskot ${pose} valid`,
    m.includes(`https://socio.id/email/sparko-${pose}@2x.png`) &&
      m.includes("alt=") &&
      m.includes('width="72"') &&
      m.includes('height="78"'),
  );
}
// Pose tak dikenal harus melempar (bukan link gambar rusak diam-diam).
let badPose = false;
try {
  R.emailMascot("dance");
} catch {
  badPose = true;
}
ok("pose tak dikenal melempar", badPose);

rmSync(out, { recursive: true, force: true });
console.log(`\nSelf-test email: ${pass} cek lolos${process.exitCode ? " (ADA YANG GAGAL)" : ""}.`);
