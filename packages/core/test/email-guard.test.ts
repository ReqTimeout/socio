/**
 * SELFTEST "email tidak boleh kosong" + batas data escape — port hardening
 * .my `email-blank.test.ts` (insiden 31 Okt 2026) ke socio.id.
 *
 * Mengunci perilaku:
 *  1. Guard `blankReason()` menolak email kosong/fragmen/preheader-saja dan
 *     meneruskan email yang benar-benar berisi isi.
 *  2. CHROME (header wordmark + footer ©) tidak dihitung sebagai isi.
 *  3. Data user (`User: Ali <ali@mail.com>`) TIDAK dimakan parser —
 *     `emailTextBlock`/`escapeHtml`escape, alamat tetap terlihat.
 *  4. CTA relatif jadi absolut (link relatif mati di email client).
 *  5. Header List-Unsubscribe: mailto selalu; HTTPS + One-Click bila ada URL.
 *  6. Jalur worker email-queue (body admin-alert + fallback non-JSON) tetap
 *     layak kirim — direplikasi dengan komponen render .id yang asli.
 *
 * Offline total: tanpa DB/provider/jaringan. `@socio/db` lazy (Proxy), import aman.
 * Run: node --experimental-strip-types --import ./test/register.mjs test/email-guard.test.ts
 */
import assert from "node:assert/strict";

import {
  blankReason,
  isBlankEmail,
  visibleText,
  describeEmail,
  MIN_VISIBLE_TEXT,
} from "../src/email-guard.ts";
import {
  emailShell,
  emailTextBlock,
  emailCta,
  emailFooterTransactional,
  emailAbsoluteUrl,
  escapeHtml,
} from "../../../app/src/lib/server/email/render.ts";
import {
  resetPasswordEmail,
  verificationEmail,
  listUnsubscribeHeader,
} from "../../../app/src/lib/server/email.ts";
import {
  depositInstructionMail,
  depositReminderMail,
  depositSuccessMail,
  depositCanceledMail,
} from "../../../app/src/lib/server/deposit-emails.ts";

let passed = 0;
const failures: string[] = [];

function check(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
  } catch (e) {
    failures.push(`${name}: ${(e as Error)?.message ?? e}`);
  }
}

/** Assert sebuah email layak kirim (tidak kosong, utuh, tanpa merge tag bocor). */
function assertRenderable(label: string, html: string): void {
  const reason = blankReason(html);
  assert.equal(reason, null, `${label} — dianggap kosong: ${reason}`);
  assert.ok(html.length > 800, `${label} — HTML cuma ${html.length} byte (terlalu kecil)`);
  assert.ok(/<html[\s>]/i.test(html), `${label} — tag <html> hilang`);
  assert.ok(/<\/html>\s*$/i.test(html.trimEnd()), `${label} — dokumen tak ditutup </html>`);
  const text = visibleText(html);
  assert.ok(
    text.length > MIN_VISIBLE_TEXT,
    `${label} — teks terlihat cuma ${text.length} karakter`,
  );
  assert.ok(!text.includes("{{"), `${label} — merge tag mentah bocor ke user: ${text.slice(0, 80)}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Template transaksional .id harus layak kirim
// ─────────────────────────────────────────────────────────────────────────────

const EXPIRE = new Date(Date.now() + 6 * 3600_000);

const transactional: [string, string][] = [
  ["deposit-instruction", depositInstructionMail({ name: "Ali", amount: 100297, invoiceId: "DEP-1", expireAt: EXPIRE }).html],
  ["deposit-instruction (reseller)", depositInstructionMail({ name: "Ali", amount: 100297, invoiceId: "DEP-1", expireAt: EXPIRE, isReseller: true }).html],
  ["deposit-reminder", depositReminderMail({ name: "Ali", amount: 100297, invoiceId: "DEP-1", expireAt: EXPIRE, leftText: "1 jam 30 mnt" }).html],
  ["deposit-success", depositSuccessMail({ name: "Ali", amount: 110327 }).html],
  ["deposit-success (reseller)", depositSuccessMail({ name: "Ali", amount: 110327, isReseller: true }).html],
  ["deposit-canceled", depositCanceledMail({ name: "Ali", amount: 100297, reason: "melewati batas waktu pembayaran" }).html],
  ["reset-password", resetPasswordEmail("https://app.socio.id/reset?token=abc").html],
  ["verification", verificationEmail("https://app.socio.id/verifikasi?token=abc").html],
];

for (const [label, html] of transactional) {
  check(`transaksional: ${label} tidak kosong`, () => assertRenderable(label, html));
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Guard anti-kosong
// ─────────────────────────────────────────────────────────────────────────────

check("guard: HTML kosong ditolak", () => {
  assert.ok(isBlankEmail(""), "HTML kosong lolos");
  assert.ok(isBlankEmail("   "), "HTML spasi lolos");
  assert.ok(blankReason("") !== null, "blankReason harus mengembalikan alasan");
});

check("guard: dokumen tanpa <html> ditolak", () => {
  assert.ok(isBlankEmail("<p>halo dunia</p>"), "fragmen HTML lolos");
});

check("guard: shell dengan preheader saja ditolak (preheader tak terlihat)", () => {
  const html = emailShell({
    preheader: "Deposit Rp11.629 segera kedaluwarsa — bayar sebelum 17.00",
    content: "",
    footer: emailFooterTransactional("bare"),
  });
  assert.ok(isBlankEmail(html), "preheader tersembunyi dianggap isi");
});

check("guard: shell header+footer saja ditolak (chrome bukan isi)", () => {
  const html = emailShell({
    maxWidth: 480,
    content: "",
    footer: emailFooterTransactional("security"),
  });
  assert.ok(isBlankEmail(html), "chrome header/footer lolos sebagai isi");
});

check("guard: email berisi isi lolos", () => {
  assert.equal(
    blankReason(depositSuccessMail({ name: "Ali", amount: 10000 }).html),
    null,
  );
});

check("describeEmail memberi ringkasan diagnostik", () => {
  const d = describeEmail(depositSuccessMail({ name: "Ali", amount: 10000 }).html);
  assert.ok(d.includes("html="), "ringkasan tak memuat ukuran HTML");
  assert.ok(d.includes("text="), "ringkasan tak memuat ukuran teks");
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Batas data: escape (regresi `User: Ali <ali@mail.com>` dimakan parser)
// ─────────────────────────────────────────────────────────────────────────────

check("emailTextBlock meng-escape < dan >", () => {
  const html = emailTextBlock("User: Ali <info@beriklan.co.id>");
  assert.ok(html.includes("&lt;info@beriklan.co.id&gt;"), "tanda < > tak di-escape");
  assert.ok(visibleText(html).includes("info@beriklan.co.id"), "alamat email hilang");
});

check("isi tiket dengan & dan < tidak merusak email", () => {
  const html = emailTextBlock("cek https://x.com/a?b=1&c=2 <b>halo</b>");
  assert.ok(!html.includes("<b>halo</b>"), "markup mentah bocor");
  assert.ok(html.includes("b=1&amp;c=2"), "URL dengan & rusak");
  assert.ok(visibleText(html).includes("b=1&c=2"), "URL tak terbaca utuh");
});

check("escapeHtml menangani & < > \"", () => {
  assert.equal(escapeHtml(`a&b<c>d"e`), "a&amp;b&lt;c&gt;d&quot;e");
});

check("emailTextBlock multi-baris jadi <br>", () => {
  const html = emailTextBlock("baris 1\nbaris 2");
  assert.ok(html.includes("<br>"), "newline tak jadi <br>");
});

check("nama user berisi markup tidak merusak email deposit", () => {
  const html = depositInstructionMail({
    name: "Ali <b>bold</b>",
    amount: 10000,
    invoiceId: "DEP-2",
    expireAt: EXPIRE,
  }).html;
  assert.ok(!html.includes("<b>bold</b>"), "markup mentah bocor ke user");
  assert.ok(html.includes("&lt;b&gt;"), "nama tak di-escape");
  assert.ok(visibleText(html).includes("Ali"), "nama hilang");
});

check("reason deposit dibatalkan di-escape", () => {
  const html = depositCanceledMail({
    name: "Ali",
    amount: 10000,
    reason: "admin <b>tolak</b>",
  }).html;
  assert.ok(!html.includes("<b>tolak</b>"), "markup reason bocor");
  assert.ok(visibleText(html).includes("admin <b>tolak</b>"), "reason hilang dari teks");
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Jalur worker email-queue: admin-alert + fallback non-JSON (replikasi
//    compose cron/email-queue.ts dengan komponen .id asli)
// ─────────────────────────────────────────────────────────────────────────────

function workerCompose(body: string, ctaText?: string, ctaUrl?: string): string {
  const ctaHref = ctaUrl ? emailAbsoluteUrl(String(ctaUrl)) : "";
  const contentHtml =
    emailTextBlock(body) +
    (ctaText && ctaHref ? emailCta({ label: String(ctaText), href: ctaHref }) : "");
  return emailShell({
    preheader: body.slice(0, 100),
    maxWidth: 520,
    content: contentHtml,
    footer: emailFooterTransactional("bare"),
  });
}

const adminAlert = workerCompose(
  "Deposit manual Rp11.629 (DEP-1793429105627-2) menunggu konfirmasi.\nUser: Admin Beriklan <info@beriklan.co.id>",
  "Buka deposits",
  "/admin/deposits",
);

check("alert admin tidak kosong", () => assertRenderable("admin-alert", adminAlert));
check("alert admin: alamat email user TAK hilang", () => {
  const text = visibleText(adminAlert);
  assert.ok(
    text.includes("info@beriklan.co.id"),
    `alamat email hilang dari email — teks: "${text.slice(0, 160)}"`,
  );
});
check("alert admin: CTA relatif jadi absolut", () => {
  assert.ok(
    adminAlert.includes("https://app.socio.id/admin/deposits"),
    "CTA masih relatif → link mati di email client",
  );
});

check("fallback non-JSON bangun shell (bukan <pre> polos)", () => {
  const raw = "Teks templateData rusak: Halo pengguna, ada pesanan selesai hari ini ya.";
  const html = emailShell({
    preheader: raw.slice(0, 100),
    maxWidth: 520,
    content: emailTextBlock(raw),
    footer: emailFooterTransactional("bare"),
  });
  assertRenderable("fallback-plain", html);
  assert.ok(!html.includes("<pre>"), "masih pakai <pre> polos");
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. CTA absolut
// ─────────────────────────────────────────────────────────────────────────────

check("emailAbsoluteUrl membuat link relatif jadi absolut", () => {
  delete process.env.SOCIO_APP_URL;
  assert.equal(emailAbsoluteUrl("/admin/deposits"), "https://app.socio.id/admin/deposits");
  assert.equal(emailAbsoluteUrl("admin/deposits"), "https://app.socio.id/admin/deposits");
  assert.equal(emailAbsoluteUrl("https://app.socio.id/x"), "https://app.socio.id/x");
  assert.equal(emailAbsoluteUrl("mailto:a@b.c"), "mailto:a@b.c");
  assert.equal(emailAbsoluteUrl(""), "");
  process.env.SOCIO_APP_URL = "https://app.example.test";
  assert.equal(emailAbsoluteUrl("/t"), "https://app.example.test/t");
  delete process.env.SOCIO_APP_URL;
});

check("emailCta menaruh href absolut di dalam HTML", () => {
  const html = emailCta({ label: "Buka", href: emailAbsoluteUrl("/admin/orders") });
  assert.ok(html.includes('href="https://app.socio.id/admin/orders"'), "href tak absolut");
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Header List-Unsubscribe (G1 belum ada → plumbing, mailto tetap default)
// ─────────────────────────────────────────────────────────────────────────────

check("List-Unsubscribe default mailto-only", () => {
  const h = listUnsubscribeHeader();
  assert.match(h, /^<mailto:[^>]+subject=unsubscribe>$/);
  assert.ok(!h.includes(", <"), "mailto-only tidak boleh ada URL kedua");
});

check("List-Unsubscribe menambah HTTPS bila unsubscribeUrl diisi", () => {
  const h = listUnsubscribeHeader("https://app.socio.id/u/TOKEN");
  assert.ok(h.endsWith(", <https://app.socio.id/u/TOKEN>"), `header salah: ${h}`);
  assert.ok(h.includes("<mailto:"), "mailto hilang saat ada HTTPS");
});

// ─────────────────────────────────────────────────────────────────────────────

console.log(`email-guard: ${passed} assertion lulus, ${failures.length} gagal`);
if (failures.length) {
  for (const f of failures) console.error("  ✗ " + f);
  process.exit(1);
}
