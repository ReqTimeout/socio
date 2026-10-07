#!/usr/bin/env node
/* global process, console */
/**
 * Render SEMUA template email ke HTML statis untuk preview visual.
 *
 * Komposisi disalin persis dari fungsi produksi (email.ts, deposit-emails.ts,
 * signup.ts, cron/email-queue.ts) dengan data contoh yang sama seperti
 * listSystemTemplates ("Contoh Pengguna", dst). Primitif render = kode yang
 * sama persis dengan produksi (email/render.ts) — jadi yang terlihat di sini
 * = yang diterima user.
 *
 * Usage: node scripts/email-preview.mjs [outdir]
 * Output: <outdir>/*.html + index.html (daftar + subjek + pemicu).
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const APP = dirname(dirname(fileURLToPath(import.meta.url)));
const SRC = join(APP, "src/lib/server/email");
const OUT = process.argv[2] || "/tmp/email-preview";

const build = mkdtempSync(join(tmpdir(), "email-preview-"));
execFileSync(
  process.execPath,
  [
    join(APP, "node_modules/typescript/lib/tsc.js"),
    "--outDir",
    build,
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
  { stdio: "inherit" },
);
const R = await import(pathToFileURL(join(build, "render.js")).href);
const M = await import(pathToFileURL(join(build, "merge.js")).href);

mkdirSync(OUT, { recursive: true });
const pages = [];
function page(key, label, subject, trigger, html) {
  writeFileSync(join(OUT, `${key}.html`), html);
  pages.push({ key, label, subject, trigger });
}

// ---------- 1-4: deposit (komposisi = deposit-emails.ts) ----------
const BCA = { no: "1392680815", name: "Awangga Ramadhi" };
const exp = "6 Okt, 16:30 WIB";
function depositShell(pre, sub, body, mascot) {
  return R.emailShell({
    preheader: pre,
    headerSub: sub,
    maxWidth: 480,
    content: body,
    footer: R.emailFooterTransactional("help"),
    mascot,
  });
}
page(
  "deposit-instruction",
  "1 · Instruksi Deposit",
  "Deposit Rp100.297 — bayar sebelum 6 Okt, 16:30 WIB",
  "User buat top-up",
  depositShell(
    "Instruksi pembayaran Rp100.297 via BCA",
    "Instruksi Deposit",
    `<p style="margin:0 0 4px 0">Halo <b>Contoh Pengguna</b>,</p>
    <p style="margin:8px 0 0 0">Silakan transfer <b>Rp100.297</b> ke rekening berikut. Saldo masuk otomatis setelah admin verifikasi mutasi.</p>
    ${R.emailBankCard({ bankLabel: "Transfer BCA ke", accountNumber: BCA.no, accountName: `a.n ${BCA.name}`, amountLabel: "Nominal (transfer pas)", amount: "Rp100.297", meta: `Invoice DEP-0000-contoh · Bayar sebelum ${exp}` })}
    <ol style="margin:12px 0 0 0;padding-left:20px;font-size:13px;color:#4f565b"><li>Transfer <b>pas sesuai nominal</b> (termasuk 3 digit terakhir).</li><li>Tunggu konfirmasi otomatis.</li><li>Jangan transfer setelah batas waktu.</li></ol>
    ${R.emailCta({ label: "Lihat status deposit", href: "https://app.socio.id/saldo" })}`,
    "idle",
  ),
);
page(
  "deposit-reminder",
  "2 · Pengingat Deposit",
  "Segera berakhir: deposit Rp100.297 sisa 1 jam 30 mnt",
  "Cron: deposit Pending < 2 jam",
  depositShell(
    "Deposit Rp100.297 segera kedaluwarsa",
    "Pengingat Deposit",
    `<p style="margin:0 0 4px 0">Halo <b>Contoh Pengguna</b>,</p>
    <p style="margin:8px 0 0 0">Deposit <b>Rp100.297</b> (invoice DEP-0000-contoh) <b style="color:#c01242">segera kedaluwarsa — sisa 1 jam 30 mnt</b>. Transfer sekarang agar tidak batal otomatis:</p>
    ${R.emailBankCard({ bankLabel: "Transfer BCA ke", accountNumber: BCA.no, accountName: `a.n ${BCA.name}`, amountLabel: "Nominal (transfer pas)", amount: "Rp100.297", meta: `Invoice DEP-0000-contoh · Bayar sebelum ${exp}` })}
    ${R.emailCta({ label: "Bayar sekarang", href: "https://app.socio.id/saldo" })}`,
    "idle",
  ),
);
page(
  "deposit-success",
  "3 · Deposit Berhasil",
  "Deposit Rp110.327 masuk ✅",
  "Admin Confirm top-up",
  depositShell(
    "Deposit Rp110.327 berhasil",
    "Konfirmasi",
    `<p style="margin:0 0 4px 0">Halo <b>Contoh Pengguna</b>,</p>
    <p style="margin:8px 0 0 0">Deposit <b>Rp110.327</b> sudah masuk ke saldo Anda dan siap dipakai order.</p>
    ${R.emailCta({ label: "Buat pesanan", href: "https://app.socio.id/pesan" })}`,
    "celebrate",
  ),
);
page(
  "deposit-canceled",
  "4 · Deposit Batal",
  "Deposit Rp100.297 batal",
  "Admin Reject / auto-expire",
  depositShell(
    "Deposit Rp100.297 batal",
    "Pembatalan",
    `<p style="margin:0 0 4px 0">Halo <b>Contoh Pengguna</b>,</p>
    <p style="margin:8px 0 0 0">Deposit <b>Rp100.297</b> (invoice DEP-0000-contoh) dibatalkan karena melewati batas waktu pembayaran. Dana tidak terpotong — silakan buat deposit baru bila masih butuh.</p>`,
    "sad",
  ),
);

// ---------- 5-6: wrapEmail (komposisi = email.ts) ----------
function wrapSample(title, intro, ctaLabel, mascot) {
  return R.emailShell({
    preheader: title,
    headerSub: "Panel SMM Indonesia",
    maxWidth: 480,
    content:
      R.emailTitleBlock(title, intro) +
      R.emailCta({ label: ctaLabel, href: "https://app.socio.id/contoh" }) +
      R.emailCopyLink("https://app.socio.id/contoh", "Contoh catatan keamanan."),
    footer: R.emailFooterTransactional("security"),
    afterCard: R.emailSupportAfterCard(),
    mascot,
  });
}
page(
  "reset-password",
  "5 · Reset Password",
  "Atur ulang password Socio.id",
  "User klik lupa password",
  wrapSample(
    "Atur ulang password",
    "Kami menerima permintaan untuk mengatur ulang password akun Socio.id Anda. Klik tombol di bawah — link berlaku 1 jam dan hanya bisa dipakai sekali.",
    "Reset password",
    "idle",
  ),
);
page(
  "verification",
  "6 · Verifikasi Email",
  "Verifikasi email Socio.id",
  "User daftar (gate login)",
  wrapSample(
    "Verifikasi email Anda",
    "Selamat datang di Socio.id! Klik tombol di bawah untuk memverifikasi email dan mengaktifkan akun Anda. Proses hanya butuh beberapa detik.",
    "Verifikasi email",
    "wave",
  ),
);

// ---------- 7-8: reseller (komposisi = signup.ts) ----------
page(
  "reseller-activation",
  "7 · Aktivasi Reseller",
  "Aktivasi Akun Reseller — Socio.id",
  "User daftar reseller",
  R.emailShell({
    headerSub: "Aktivasi Akun Reseller",
    maxWidth: 480,
    content:
      `<p style="margin:0 0 12px">Halo <b>Contoh Pengguna</b>,</p>` +
      `<p style="margin:0 0 12px">Terima kasih sudah mendaftar sebagai <b>Reseller Socio.id</b>. Tinggal selangkah lagi! Silakan transfer biaya aktivasi sebesar:</p>` +
      R.emailAmountBox({ amount: "Rp50.000", caption: "1392680815 a.n Awangga Ramadhi (BCA)" }) +
      `<p style="margin:0 0 12px"><b>Penting:</b> transfer <u>sesuai nominal</u> (termasuk 3 digit terakhir) supaya bisa dicocokkan, maksimal <b>12 jam</b> dari email ini.</p>` +
      `<p style="margin:0 0 12px">Akun reseller kamu otomatis aktif dan saldo <b>Rp20.000 sudah termasuk</b> dalam pembayaranmu — langsung bisa dipakai pesan. Nikmati harga khusus untuk jualan ulang!</p>` +
      `<p style="margin:0;color:#4f565b;font-size:13px">Selamat bergabung!<br>Tim Socio.id</p>`,
    footer: R.emailFooterTransactional("bare"),
    mascot: "wave",
  }),
);
page(
  "reseller-welcome",
  "8 · Welcome Reseller",
  "Selamat Datang Reseller — Socio.id",
  "Admin confirm aktivasi",
  R.emailShell({
    headerSub: "Selamat Datang Reseller",
    maxWidth: 480,
    content:
      `<p style="margin:0 0 12px">Halo <b>Contoh Pengguna</b>,</p>` +
      `<p style="margin:0 0 12px">Pembayaran aktivasi reseller kamu sudah kami terima. 🎉</p>` +
      `<p style="margin:0 0 12px">Akun kamu sudah aktif — saldo <b>Rp20.000 sudah masuk</b> dan siap dipakai. Nikmati harga spesial reseller!</p>` +
      `<p style="margin:0;color:#4f565b;font-size:13px">Sukses selalu!<br>Tim Socio.id</p>`,
    footer: R.emailFooterTransactional("bare"),
    mascot: "celebrate",
  }),
);

// ---------- 9-10: marketing BARU (komponen DNA, contoh isi) ----------
const mktFooter = R.emailFooterMarketing({
  unsubscribeUrl: "https://app.socio.id/u/contoh",
  preferencesUrl: "https://app.socio.id/preferensi?token=contoh",
  address: "Socio.id — Jakarta, Indonesia",
});
page(
  "marketing-coupon",
  "9 · Promo Kupon (BARU)",
  "[CONTOH] Kupon Rp10.000 untukmu, Budi",
  "Trigger: balance-low / winback",
  R.emailShell({
    preheader: "Kupon Rp10.000 menunggumu",
    maxWidth: 600,
    content:
      R.emailHero({
        eyebrow: "Promo minggu ini",
        heading: "Kupon Rp10.000 untuk order berikutnya",
        sub: M.renderMergeTags(
          "{{greeting}} Saldo kamu {{saldoFormatted}} — pakai kupon ini biar makin hemat.",
          { fullName: "Budi Santoso", balance: 12500 },
        ),
      }) +
      R.emailPriceCard({
        label: "Kode kupon",
        price: "HEMAT10K",
        note: "Berlaku sampai Minggu, sekali pakai",
      }) +
      R.emailCta({ label: "Klaim & order", href: "https://app.socio.id/pesan" }),
    footer: mktFooter,
    mascot: "celebrate",
  }),
);
page(
  "marketing-digest",
  "10 · Digest Mingguan (BARU)",
  "[CONTOH] 3 layanan terlaris minggu ini",
  "Trigger: digest Jumat",
  R.emailShell({
    preheader: "Layanan terlaris + artikel terbaru",
    maxWidth: 600,
    content:
      R.emailHero({ heading: "Yang paling laris minggu ini" }) +
      R.emailServiceGrid([
        { name: "IG Followers", price: "Rp15.000", href: "https://app.socio.id/layanan" },
        { name: "TikTok Views", price: "Rp5.000", href: "https://app.socio.id/layanan" },
        { name: "YouTube Subs", price: "Rp25.000", href: "https://app.socio.id/layanan" },
      ]) +
      R.emailStatStrip([
        { value: "8.270", label: "Layanan aktif" },
        { value: "~5 mnt", label: "Rata-rata mulai" },
      ]) +
      R.emailCta({ label: "Lihat semua layanan", href: "https://app.socio.id/layanan" }),
    footer: mktFooter,
    mascot: "idle",
  }),
);

// ---------- index ----------
const index = `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>body{font-family:system-ui,sans-serif;max-width:720px;margin:0 auto;padding:24px;background:#f7fbfc;color:#041116}h1{font-size:22px}a{color:#005f7c}.card{background:#fff;border:1px solid #ebecec;border-radius:12px;padding:14px 16px;margin:10px 0}.card small{color:#4f565b}.tag{display:inline-block;font-size:11px;font-weight:700;border-radius:999px;padding:2px 10px;margin-left:8px}.tx{background:#eef4f5;color:#005f7c}.nw{background:#dcfce7;color:#047857}.wr{background:#fef3c7;color:#92400e}</style></head><body>
<h1>Template Email Socio.id — ${pages.length} template</h1>
<p>Render dari kode produksi yang sama (<code>email/render.ts</code>). Buka tiap template, screenshot mobile 360px.</p>
${pages
  .map((p, i) => {
    const tag = p.key.startsWith("marketing-")
      ? '<span class="tag nw">BARU</span>'
      : p.key.startsWith("reseller-")
        ? '<span class="tag wr">PERLU KEPUTUSAN</span>'
        : '<span class="tag tx">LIVE</span>';
    return `<div class="card"><b>${i + 1}. <a href="${p.key}.html">${p.label}</a></b>${tag}<br><small>Subjek: ${p.subject}<br>Pemicu: ${p.trigger}</small></div>`;
  })
  .join("\n")}
</body></html>`;
writeFileSync(join(OUT, "index.html"), index);
rmSync(build, { recursive: true, force: true });
console.log(`Preview: ${pages.length} template → ${OUT}/`);
