# Socio.id — Review & Deploy Prep (Anchored Summary)

## Objective
- Review per-halaman user di local dev (8000) sebelum deploy VPS: pastikan responsif, fungsi utuh, dan bebas error JS/asset. Fokus terbaru: `order/history`, `balance/add`, `balance/history`, `affiliate`, `ticket`.

## Important Details
- DB lokal Mac = copy produksi. VPS produksi belum tersentuh.
- Dev server user: `php -S 127.0.0.1:8080 dev-router.php`. Test server temp: `SOCIO_DEV=1 php -S 127.0.0.1:8081` (captcha bypass). Login `testadmin@socio.local`/`admin123` (id 5669, level Admin — bukan Reseller).
- Verifikasi pakai **Playwright headless Chromium** (global `/Users/maabook/.nvm/versions/node/v24.13.0/lib/node_modules/playwright`). Ukur layout via scrollWidth/overflow (tidak bisa lihat screenshot).
- Cloudflare: token ada tapi akun SALAH → zone `socio.id` tidak ada. Blocker deploy.
- `AFFILIATE_RATE`=0.02. P1-3 Midtrans di-skip. `lib/pdo.php`: `pdo_one` return `null` bila row tak ada.
- `template/header_bootstrap.php` line 6 Notice `$data_website` di-fix `?? 'Socio'`.
- Test artifact lesson: Playwright harus kirim `csrf_token` (hidden input `input[name="csrf_token"]`) + isi `kodecaptcha` agar login berhasil; tanpa itu `$login` null → query orders/deposits kosong.
- **DEV-ROUTER BUG (FIXED)**: `dev-router.php` line 88 awalnya `file_exists(__DIR__.'/'.$target)` di mana `$target` mengandung query string (`?query_ticket_id=...`), sehingga `file_exists` gagal dan route dengan query (ticket/99001.html, admin/action-service/123.html, dll) 404 di dev. Di-fix jadi `file_exists(__DIR__.'/'.strtok($target,'?'))`. Produksi .htaccess tidak terdampak.

## Work State
### Completed
- **order/history-sosmed.php**: mobile Detail popup terverifikasi jalan. "0 cards" lalu artifact test (session tidak login + user test tidak punya order). Setelah login + insert 3 test order → 3 cards + 3 modal. Debug dibuang, test order dihapus.
- **balance/add.html** (`balance/add-balance.php` + `balance/add-action.php`): terverifikasi end-to-end. Fakta: hanya metode BCA manual (`method` hard-coded `BCA`); cabang Tripay/QRIS di `add-action.php:80-82` pakai test key & tidak terpakai; max 2 deposit pending.
- **balance/history-balance.php**: redesigned. Icon mata → tombol **"Detail"**; card view ≤768px; search filter table + card; fungsi utuh. Verified overflow 0 + modal + 0 error. Test deposit dibersihkan.
- **affiliasi/affi-edit.php**: redesigned + QR fix (Google Charts mati → `api.qrserver.com`). Reseller-only panel dipertahankan. Verified overflow 0, modal, QR toggle, 0 error. Test data dibersihkan.
- **ticket/view-ticket.php** (PERBAIKAN SELESAI & TERVERIFIKASI):
  - FIX 1 (script errors): hapus `app-chat-box.js` (no-op, throw `$ is not defined` sebelum jQuery); path `chat.js` salah (`javascript/chat.js` 404) → `<?=$config['web']['url']?>ticket/javascript/chat.js?v=7`. Chat kini load + kirim (verified: 2 pesan seeded load, kirim persist row baru via `ticket/php/insert-chat.php`).
  - FIX 2 (chat header): `<table>` inline-style → `.chat-header` flex classes + tombol **"Tutup"** (`.chat-close-btn`, merah), pertahankan POST `closed-ticket.php` + CSRF + logika Reseller/closed.
  - Verified desktop (1280) & mobile (390): overflow 0, list tampil, chat load/send/persist, close btn render, 0 error relevan. Test ticket (id 99001) dibersihkan, test server di-stop.
  - Console errors yg TERSISA (out of scope, pre-existing, dev-only): `notification-system.js` fetch fail + `gtag is not defined` — tidak berkaitan dengan ticket.

- **admin/index-edit.php** (DASHBOARD redesign): gradient welcome card (nama + tanggal), 6 stat cards berwarna (icon badge + accent) responsif 2 kolom mobile → 3 tablet → 6 desktop, panel Quick Actions (2x2→4) + chart card ber-Boxicons. Chart ApexCharts dipertahankan persis. Verified: mobile/tablet/desktop overflow 0, chart SVG render, 0 error.
- **template/admin-header.php**: fix overflow desktop (nav 12 link ~1738px menyebabkan document 2430px lebar). Tambah `lg:min-w-0 lg:overflow-x-auto` + sembunyi scrollbar pada menu `lg:flex`. BUTUH `npm run build:css` (regenerate `assets/css/output.css`) agar kelas Tailwind baru masuk — SUDAH di-build lokal. **PENTING: deploy VPS harus jalankan `npm run build:css` (output.css adalah hasil build, bukan source).**

### Auth pages redesign (login / signup / reset)
- **assets/css/auth.css** (BARU): premium split-screen auth design (brand panel gradient + form card, icon inputs, captcha styled, password meter, responsive stack <900px).
- **template/header_bootstrap.php**: link `assets/css/auth.css` (hanya dipakai auth pages: signin, signup, forgot, signup-reseller).
- **auth/signin-edit.php, auth/signup-edit.php, auth/forgot-edit.php**: redesign split-layout, FUNGSI DIYAKIN SAMA (field names, csrf, captcha, links, PHP logic utuh). Perubahan: logo URL hardcoded `app.socio.id` → `$config['web']['url']assets/images/logologin.png` (fix 404 dev); tambah link "Login sebagai Admin" di signin; guard `gtag_report_conversion()` (undefined → JS error) di signup. Catatan: route reset = `/auth/forgot-password.html` (BUKAN `/auth/forgot.html`).
- Verified: login/signup/reset overflow 0 desktop+mobile, logo load, 0 console errors; admin login (testadmin@socio.local/admin123) → dashboard user, lalu /admin.html → "Selamat Datang, Test Admin".
- FOLLOW-UP: mobile aside di-hide (redundan dgn logo di card → jelek); `.auth-main` jadi full-screen gradient di mobile. Tambah efek modern: animated gradient aside + floating orbs, card pop-in, staggered fade-up fields/features, focus icon color/scale. Admin creds lokal: testadmin@socio.local / admin123 (id 5669, Admin). Admin produksi lain (socioadmin/aramadhi92@gmail.com, admin/info@beriklan.co.id, diomaulana/maulanadiodm@gmail.com) ada tapi password tdk diketahui.

### Blocked
- Cloudflare zone `socio.id` (akun salah) → P1.5, P3-3 WA Bot, P0-3 Access.
- Turnstile aktif → butuh env `SOCIO_TURNSTILE_*`.
- Email nyata → butuh SMTP/Mailgun valid.
- Deploy VPS → butuh SSH user.
- Hapus jQuery → ditunda (admin bergantung jQuery).
- WA Bot → butuh WA API eksternal.

## Next Move
1. (Selesai) Verifikasi `ticket.html`: chat load 200, tidak ada `$ is not defined`, pesan load + kirim via endpoint. User hard-refresh (Cmd+Shift+R) untuk cek error console hilang.
2. Lanjut review per-halaman lain bila diminta; lalu minta akses CF benar + SSH VPS untuk deploy.

## Relevant Files
- dev-router.php — FIX: `strtok($target,'?')` agar route ber-query tidak 404 di dev
- ticket/view-ticket.php — hapus app-chat-box.js, path chat.js benar, header chat redesign (.chat-header + .chat-close-btn "Tutup")
- ticket/javascript/chat.js — vanilla JS chat (XHR insert/get), kini ter-load benar
- ticket/php/insert-chat.php, ticket/php/get-chat.php — endpoint chat ada & fungsional (verified)
- order/history-sosmed.php — mobile Detail popup OK
- balance/add-balance.php / balance/add-action.php — BCA manual only; Tripay/QRIS unused
- balance/history-balance.php — "Detail" btn, card ≤768px, search filter table+card
- affiliasi/affi-edit.php — redesign + QR fix (api.qrserver.com)
- assets/css/mobile-screens.css — FIX overflow
- lib/pdo.php — `pdo_one` return null bila tak ada row
- PERSIAPAN_DEPLOY.md, PHASE.md — tracker/deploy docs
