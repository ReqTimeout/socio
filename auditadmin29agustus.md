# Audit Admin-Side — 29 Agustus 2026

> Sesi: login admin via `/dev-admin-login` (dev-only) — 16 rute admin (Home, Users, Orders, Saldo, Layanan, Harga, Kupon, Tickets, Provider, Reporting, Affiliate, Banners, Berita, Email, Audit Log, Settings).
> Metode: load semua rute (desktop 1440×900 + mobile 390×844), DOM dump + Playwright measurement (model tidak bisa baca screenshot — audit visual via text dump + ukur `scrollWidth`/`boundingRect`), review kode semua `+page.server.ts` actions (guard, transaksi, audit log, rate-limit), verifikasi angka UI vs DB langsung (MySQL CLI), perbandingan flow vs PHP legacy (`app.socio.id/admin/`).
>
> **Eksklusi (sengaja tidak diuji)**: confirm deposit (mutasi saldo real), approve affiliate withdrawal (mutasi saldo), sync provider jalan penuh (API call berbayar), hapus/edit data live. Actions destruktif hanya diaudit di level kode.
> Referensi: `docs/ADMIN_GAP.md` (inventory fitur PHP lama), `audituser29agustus.md` (audit sisi user).

---

## Ringkasan Eksekutif

| Severity | Jumlah | Item |
|---|---|---|
| **P0 — bug uang/logic kritis** | 2 | (1) Approve affiliate withdrawal SELALU rollback tapi toast "sukses"; (2) search box mati total di 5 halaman (users/orders/deposits/tickets/affiliate) |
| **P1 — UX blocking / data menyesatkan** | 4 | Filter level menampilkan 3 level yang tidak ada di DB; stat tickets "8 dibalas / 113 ditutup" dihitung per-pesan bukan per-tiket (tab filter tidak konsisten dengan stat bar); toggle 2FA & RBAC hanya "display-only" tanpa enforcement; overflow mobile di `/admin/pricing` (scrollWidth 578px di viewport 390) |
| **P2 — gap fitur / logic menyesatkan** | 5 | Tidak ada bulk operations; tidak ada export dari listing halaman (hanya di reporting); kalkulator pricing contoh layanan Rp8.390.322/1k (angka sampah); data deposit legacy sampah (canceled Rp22 M dari 1 order #1456); news module berisi 186 berita legacy 2023-2025 |
| **P3 — polish / konsistensi** | 4 | Copy campur bahasa ("Home", "Users" vs "Berita", "Saldo"); angka dashboard admin exclude level Admin tanpa label; modal Kelola user tidak bisa diakses di mobile (drawer tidak ada tombol Kelola di mobile view); typo minor |

Total 15 temuan. **Tidak ada critical security hole**: `assertAdmin` + rate-limit + audit log terpasang konsisten di semua 30+ actions yang direview; API key provider ter-encrypt at rest (G5 ✅); audit log terpasang di semua action destruktif (G1 ✅); deposit confirm idempotent + atomic (lebih solid dari PHP legacy). Kelemahan utama adalah **2 bug fungsional** dan **RBAC yang belum enforced**.

**Sorotan positif**:
- **Perf bagus semua halaman**: load tercepat 114ms, terberat `/admin/services` 691ms (11.063 layanan, dengan pagination server-side ✅).
- **Deposit confirm** jauh lebih solid dari PHP legacy: idempotent (hanya `Pending` yang bisa diproses, 409 kalau sudah diproses), transaksi atomik (lock row + update balance + insert balance_logs + update status), audit log, reseller activation tidak kredit saldo (biaya aktivasi, bukan top-up).
- **Users adjust balance** ada hard cap Rp1.000.000/aksi + atomic `balance + amount` (bukan read-then-write) + alasan wajib ≥5 char untuk audit trail — mitigasi G3 yang layak.
- **Providers**: encrypt at rest + tombol "encrypt all" untuk key legacy plain + guard hapus provider yang masih dipakai services (409) + test connection.
- **Pricing 2-step** (simpan markup → apply to catalog) dengan peringatan backup + audit log — desain sadar risiko.
- **Banners**: validasi URL `http(s)` anti `javascript:` XSS.
- **Coupons**: validasi lengkap (kode duplikat 409, persen ≤100, non-negatif).

---

## Phase 1 — Flow & Logic

### 1.1 ⛔ P0 — Approve affiliate withdrawal: ROLLBACK selalu terjadi, tapi admin lihat "sukses" — ✅ FIXED 29 Agu (3 bug berlapis)

**Lokasi**: `app/src/routes/(admin)/admin/affiliate/+page.server.ts` + `+page.svelte`

Saat investigasi fix ditemukan **tiga bug berlapis** di flow yang sama — approve tidak pernah bisa sukses lewat UI:

**Bug A — `__commit` hack** (ditemukan di audit awal): developer "commit" via `throw { __commit: true }`, tapi drizzle mysql2 ROLLBACK semua throw (`session.js`: `catch (err) { rollback; throw }`).

**Bug B — enhance callback salah fase** (`+page.svelte`, ditemukan saat verifikasi): `onResult()` dipanggil di template menghasilkan callback fase-2 (`async ({result, update})`) langsung sebagai submit-callback → dipanggil dengan `{action, formData}` (tanpa `result`) → `TypeError: Cannot read properties of undefined (reading 'type')` → **POST tidak pernah terkirim**. Halaman admin lain (services/tickets/users/coupons) pakai pola curried yang benar — hanya affiliate yang salah.

**Bug C — `affectedRows` tuple** (`+page.server.ts`, ditemukan saat verifikasi): `tx.execute()` drizzle mysql2 return tuple `[ResultSetHeader, fields]` — `affectedRows` ada di elemen `[0]`, bukan di res langsung → `affected = NaN → 0` → guard idempoten throw `ALREADY_PROCESSED` → **rollback + 409 "Withdrawal sudah diproses admin lain" untuk setiap approve yang sampai server**.

**Fix yang diterapkan**:
1. Hapus `__commit` hack — `total` disimpan ke variable scope-luar, return normal dari callback; audit log dipindah keluar transaction.
2. `onResult` diubah ke pola curried dua-fase (sama seperti services/tickets/users) + template `use:enhance={onResult}` (tanpa panggil `()`).
3. `affectedRows` dibaca dari `flip[0]` dengan guard `Array.isArray`.

**Verifikasi**: Playwright klik Setujui → POST 200 → `affiliate.status='Paid'`, `users.balance` +Rp5.000, `balance_logs` type `wd` entry ada, toast sukses. Data test dikembalikan ke kondisi awal (status `Withdraw`, saldo 0, log & audit entry test dihapus). Idempotensi terjaga: approve kedua → 400 "Tidak ada penarikan menunggu".

### 1.2 ⛔ P0 — Search box tidak bisa diketik di 5 halaman (users, orders, deposits, tickets, affiliate) — ✅ FIXED 29 Agu

**Lokasi**: `app/src/routes/(admin)/admin/{users,orders,deposits,tickets,affiliate}/+page.svelte` — line 26/24/24/21/22:
```svelte
$effect(() => {
  if (q !== data.q) q = data.q;   // ← membaca `q` = dependency → infinite reset loop
});
```

**Mekanisme bug (terkonfirmasi via Playwright `fill`/`type`/`insertText` semua gagal)**: user mengetik 1 karakter → `q` berubah → `$effect` re-run (karena `q` dibaca di dalamnya) → kondisi `q !== data.q` true → `q` di-set balik ke `data.q` (nilai lama, biasanya `""`) → input ter-reset ke kosong. Hasil: keyboard event masuk, tapi value tidak pernah bertahan.

**Server-side filter sendiri sehat** — dibuktikan dengan akses langsung URL: `/admin/users?q=febian` → 3 hasil, `/admin/audit?q=deposit` (form GET, tanpa hydration issue) → jalan. Jadi fix hanya di Svelte.

**Halaman yang TERSELAMATKAN** karena pakai pola yang benar: `services/+page.svelte:14-16` — `$effect(() => { q = data.q; })` tanpa membaca `q` (tidak ada self-dependency).

**Fix yang direkomendasikan**: samakan dengan pola services di 5 halaman itu.

### 1.3 ✅ FIXED (P1) — Stat bar tickets: angka per-PESAN, tab filter per-TIKET → tidak konsisten

**Lokasi**: `app/src/routes/(admin)/admin/tickets/+page.server.ts:54-63` (stats query `FROM message` tanpa `rn=1` filter) vs list query (agregasi `rn = 1` per ticket).

**Fakta (verifikasi DB)**: 76 tiket unik. Stat bar menampilkan "76 total · 34 pending · 8 dibalas · 113 ditutup" — 34+8+113=155 ≠ 76 karena stat menghitung **jumlah pesan**, bukan jumlah tiket. Tab filter "Pending 34 / Answered 8 / Closed 113" juga angka pesan; klik tab "Pending" hanya muncul 30 tiket, tapi label bilang 34.

**Dampak**: admin tidak bisa memakai stat bar untuk prioritas triase harian ("berapa tiket yang harus saya balas?") — angkanya bukan jumlah pekerjaan nyata.

**Fix yang direkomendasikan**: hitung stat dari subquery `rn=1` (1 row per tiket, status = status pesan terakhir): `Pending 30 · Answered 7 · Closed 46 = 83`... tetap ≠ 76 karena status disimpan per-pesan dan tiket bisa punya pesan dengan status campur (30+7+46=83; 76 tiket punya 155 pesan). Opsi lain: tambahkan kolom `status` di tabel tiket (normalisasi), atau minimal samakan basis hitung + label "tiket" vs "pesan".

**FIX applied**: stats query pakai `COUNT(DISTINCT CASE WHEN status=X THEN ticket_id END)` — basis hitung = per-TIKET per-status, identik dengan perilaku tab filter (tiket muncul di tab X kalau PESAN TERAKHIR yang match filter X — query list apply filter di dalam subquery rn=1, jadi tiket yang pernah Pending juga masuk tab Pending). Verifikasi DB: stat `Pending 30 · Answered 7 · Closed 46 · total 76` = jumlah baris yang benar-benar muncul saat klik tiap tab (30/7/46) ✅. `totalMessages` dihapus dari payload (tidak dipakai UI).

### 1.4 ✅ FIXED (P1) — Filter level Users menampilkan level yang tidak ada (Demo/Blacklist/Developers)

**Lokasi**: `app/src/routes/(admin)/admin/users/+page.svelte:116`

`const levels = ["Demo","Member","Agen","Reseller","Blacklist","Admin","Developers"]` — tapi verifikasi DB: level yang ada hanya `Member 2.973 · Reseller 248 · Agen 4 · Admin 4`. Tiga filter (Demo, Blacklist, Developers) selalu kosong — noise di UI yang bikin admin bingung level mana yang real.

**FIX applied**: `levels = ["Member","Agen","Reseller","Admin"]` (filter chips + dropdown manage setLevel). Verifikasi: 0 user di DB punya level di luar 4 real — tidak ada edge case user legacy yang option-nya hilang.

**1.4b ✅ FIXED (P1) — `setLevel` whitelist level mati**: `app/src/routes/(admin)/admin/users/+page.server.ts:187` — `const allowed = ["Member","Agen","Reseller","Admin"]` sekarang. Admin tidak bisa lagi set user ke `Blacklist`/`Developers`/`Demo` (level tidak dikenal pricing & tanpa enforcement order-block). Mekanisme suspend (`status='0'`) tetap ada sebagai cara blokir user yang benar.

### 1.5 ✅ FIXED (P1) — 2FA admin & RBAC roles: toggle ada, enforcement tidak ada

**Lokasi**: `app/src/routes/(admin)/admin/settings/+page.server.ts:115-128` (toggle2fa), `app/src/lib/server/admin.ts:15-21` (assertAdmin).

- **2FA**: toggle menyimpan `admin_2fa_required` ke `admin_settings`, tapi `rg "admin_2fa_required" app/src` → hanya 1 file (settings page sendiri). Tidak ada cek di login admin. UI sudah jujur: "(M3.5 — saat ini informational.)" — tapi risikonya admin lupa toggle ini tidak melindungi apa-apa.
- **RBAC**: halaman settings menampilkan matriks 4 admin × 4 role (superadmin/admin/operator/viewer), tapi `assertAdmin()` hanya cek `level === "Admin"`. **Tabel role tidak dipakai di gate manapun** — semua admin punya akses penuh termasuk adjust saldo & hapus provider. Ini gap ADMIN_GAP yang sudah dikenal (RBAC enforcement = target M3.5).

**Fix yang direkomendasikan**: (a) jadikan toggle 2FA disabled + label "M3.5" sampai enforcement ada (hindari rasa aman palsu), atau implementasi TOTP check di login; (b) RBAC: minimal pisahkan `superadmin-only` actions (settings, provider delete, pricing apply) vs admin biasa di `assertAdmin` sebelum M3.5.

**FIX applied (a)**: action `toggle2fa` dihapus dari server (dead endpoint tidak bisa di-POST manual), toggle UI → button disabled "Segera" + label "Belum di-enforce — menunggu implementasi M3.5". `api2fa` hardcode `false` + TODO M3.5. **RBAC (b) DROPPED** — keputusan user 29 Agustus 2026: ikuti PHP legacy, satu role admin penuh (`level='Admin'`), tidak ada superadmin. Tabel matriks role di settings hanya display informational.

### 1.6 ✅ FIXED (P1) — `/admin/pricing` overflow horizontal di mobile (scrollWidth 578px di 390px viewport)

**Lokasi**: `app/src/routes/(admin)/admin/pricing/+page.svelte:239-249` (sample cards).

Grid `sm:grid-cols-3` turun ke 1 kolom di mobile — benar — tapi anak grid tidak punya `min-w-0`, dan teks `Base Rp317.010 · Modal Rp264.175` (nama layanan panjang + angka tabular) melebihi track → track melebihi viewport → horizontal scroll 578-390 = **188px**. Ini melanggar konvensi `min-w-0` yang sudah tercatat di AGENTS.md.

**FIX applied**: `min-w-0` di div anak grid + `truncate` di baris "Base … · Modal …" (pattern sama dengan fix `audituser29agustus` sebelumnya).

### 1.7 ✅ FIXED (P2) — Dashboard & listing: angka exclude level Admin tanpa label

**Lokasi**: `app/src/routes/(admin)/admin/deposits/+page.server.ts` (query `ne(users.level,"Admin")`), orders serupa.

Angka "665 deposits · Rp116.301.257 Success" exclude order/deposit milik admin (by design, terverifikasi exact match dengan query DB). Tapi tidak ada footnote/tooltip yang menjelaskan — admin yang rekonsiliasi dengan total mentah DB (26.031 orders) akan menemukan selisih 173 dan bingung. **Fix murah**: satu baris caption "Mengexclude akun Admin" di bawah stat.

**FIX applied**: caption "Statistik & daftar mengexclude akun Admin…" di deposits + "Statistik mengexclude akun Admin…" di orders, di bawah KPI strip. Dashboard tidak exclude-admin → tanpa caption (perilaku benar). Playwright-verified.

### 1.8 ✅ FIXED (P2, keputusan user 29 Agustus 2026) — Deposit #1456 amount Rp22.000.008.650 status Canceled

Legacy trash data: satu deposit canceled bernilai Rp22 Membuat stat "Canceled Rp22.056.391.705" di dashboard admin terlihat seperti bencana keuangan. Sama pola dengan temuan user-audit (order Partial 2023). **Rekomendasi**: HANYA fix via script SQL dengan approval user (data legacy = sumber kebenaran historis), atau filter anomali amount > Rp100jt di stat display. Jangan hapus tanpa backup.

**FIX applied (pilihan user: filter display, tanpa mutasi data)**: stat `Canceled` deposits kini `SUM(CASE WHEN amount > 100000000 THEN 0 ELSE amount END)` → "Tolak Rp56.390.840" (bukan Rp22 miliar). Data legacy tidak disentuh. Caption diperluas: "Total Batal mengexclude deposit legacy >Rp100jt (anomali #1456)". Playwright-verified.

### 1.9 ✅ Deposit confirm — solid (pembanding PHP)

Rebuild sudah melewati PHP legacy di semua aspek: idempotent (409 kalau bukan Pending), atomic (lock → balance+log+status dalam 1 transaksi), audit log, reseller activation tidak kredit saldo. PHP legacy (`app.socio.id/admin/balance/confirm.php`) tidak punya lock, tidak idempotent (race 2 admin = double kredit), dan balance reseller hardcode Rp30.000. **Tidak ada action item** — dicatat sebagai baseline kualitas.

---

## Phase 2 — UI/UX

### Desktop (1440×900)

- **Layout konsisten**: sidebar 16 item + topbar semua halaman, hierarchy jelas (page title → stat strip → filter bar → table). Tidak ada layout drift antar halaman.
- **Stat strip pattern**: dashboard (orders/deposits/tickets) pakai kartu angka besar + delta — bagus, tapi admin mobile lihat 4 kartu dalam 1 baris scroll horizontal — di bawah 400px label seperti "PENDING" terpotong.
- **Tables**: padat & informatif (username, email, level, saldo, action). Kolom aksi konsisten kanan. Truncate benar di username email panjang.
- **Drawer/detail**: orders & deposits punya drawer detail (klik row) — bagus untuk konteks tanpa navigasi. Tickets punya panel percakapan (list kiri, thread kanan) yang berfungsi baik.
- **Modal Kelola user** (users): form level + status + adjust saldo dalam 1 modal dengan confirm dialog terpisah untuk aksi uang (G30 ✅) — dua-step yang tepat untuk aksi destruktif.
- ~~**Modal Kelola user tidak tersedia di mobile**~~ ✅ COVERED — tombol "Kelola" sudah ada di card view mobile (stale finding saat audit); Playwright-verified 390×844: 40 tombol Kelola, klik → modal level terbuka.

### Mobile (390×844)

- **Sidebar → off-canvas drawer**: jalan (hamburger toggle). 16 menu item scrollable di drawer.
- **Tables → card list** di users/orders/deposits ✅ — pola transform yang benar untuk mobile.
- ~~**Modal Kelola user tidak tersedia di mobile**~~: list card mobile tidak punya tombol/klik untuk buka modal Kelola — ✅ stale/covered (tombol Kelola ada di card view, lihat Desktop notes).
- **Stat strip 4-kolom** men jadi 2×2 atau scroll — per halaman beda perilaku (konsistensi P3).
- **Overflow**: hanya `/admin/pricing` (lihat 1.6). 15 halaman lain scrollWidth == viewport ✅.

### Copywriting (halaman-halaman utama)

| Halaman | Temuan |
|---|---|
| Dashboard | "Pesanan berjalan" tanpa penjelasan exclude-admin — ok tapi bisa mislead (1.7) |
| Pricing | Instruksi 2-step jelas & copy peringatan backup bagus — salah satu copy terbaik |
| Settings kalkulator | Contoh layanan "🎈 Square Bookmark [Save]... base 8.390.322/1k" — angka contoh Rp8jt/1k untuk layanan bookmark tidak realistis, terlihat seperti bug data (P2 1.10) |
| News | Tip "💡 setiap Simpan akan push ke NotifBell..." — informatif tapi panjang; placeholder form ok |
| Umum | Campur EN/ID: menu "Users/Orders/Saldo/Layanan/Harga" + "Berita/Settings" — konsisten pilih satu bahasa untuk label menu (P3) |

### 1.10 ✅ FIXED (P2) — Kalkulator pricing di Settings: contoh layanan tidak realistis

"Square Bookmark [Save] | base 8.390.322/1k" → jual Member Rp25.170.966/1k. Ini bukan bug query (sample ambil 1 layanan real dari DB) tapi layanan contoh yang dipilih adalah outlier mahal — admin tidak bisa pakai kalkulator untuk "rasakan" harga normal. **Fix**: pakai layanan median harga atau hardcode contoh nominal jelas (seperti pricing page yang pakai median Rp154.728/1k — lebih baik).

**FIX applied**: sample via SQL median (`ROW_NUMBER() OVER (ORDER BY price, id)` + `rp = FLOOR((n+1)/2)`) → Instagram Turkey Random Comment Rp154.728/1k (bukan outlier Rp8jt). Playwright-verified: "Square Bookmark" tidak lagi muncul.

---

## Phase 3 — Gap Fitur vs PHP legacy (referensi `docs/ADMIN_GAP.md`)

Sudah ada & lebih baik: audit log (G1 ✅ semua action destruktif), encrypt API key (G5 ✅), confirm deposit idempotent, pricing 2-step apply, RBAC UI (belum enforced — 1.5), rate-limit semua action, pagination server-side semua listing besar, CSV export di reporting.

**Gap yang masih terasa untuk operasional admin (prioritas dari user request "pengelolaan cepat")**:

| Gap | Dampak operasional | Prioritas |
|---|---|---|
| ~~**Bulk price set per-kategori**~~ ✅ DONE | Action `bulkCategoryPrice` di services/+page.server.ts: mode `set_base` (modal nominal/1k) & `adjust` (±%), rekonstruksi base=`price-profit`, recompute via pricing_rules dalam transaction, audit `bulk_category_price`, rate-limit 5/60s. UI: button "Harga Kategori" saat filter kategori aktif + modal + ConfirmDialog. Playwright+DB-verified: 3 layanan test base 1000→2000 → Member 3000→6000, Agen 2500→5000, Reseller 2800→5600 | Tinggi |
| **Bulk user actions** (select-all suspend/unsuspend, bulk level change) | Saat ini select box hanya untuk export CSV; tidak ada aksi massal | Sedang |
| **Banner promo wizard** | Banner CRUD ada (upload via URL R2 manual) — tidak ada upload file langsung; harus upload ke R2 dulu lalu tempel URL | Sedang |
| **News → broadcast segmented** | News push ke semua user status 1; PHP lama punya broadcast per level (member/reseller). Email campaign segment ada (M3 CRUD) tapi worker kirim baru jalan di cron M4 | Sedang |
| ~~**Order manual refund**~~ ✅ DONE | Action `refund` di orders/+page.server.ts: `REFUNDABLE_STATUS` (Pending/Processing/In progress/Error/Partial/Canceled), amount 0=full `min(amount,price)`, CAS `SET is_refund=1 WHERE is_refund=0` → 409 idempotent, balance+`balance_logs type='ref'`+audit `manual_refund_order`+notif best-effort, rate-limit 10/60s. UI: input amount + confirm dialog di drawer. Playwright+DB-verified: full refund Rp3.000 → saldo user naik, tombol refund hilang setelah is_refund=1 | Tinggi |
| **Quick balance top-up tanpa deposit** (deposit manual entry) | PHP lama: admin bisa input deposit manual tanpa bukti. Rebuild: hanya confirm deposit yang sudah ada — tidak bisa input manual | Rendah (bisa di-cover adjust balance + cap Rp1jt) |

---

## Phase 4 — Prioritas Aksi

### P0 — fix sebelum admin dipakai harian — ✅ SELESAI 29 Agustus 2026
1. ~~**Affiliate approve rollback-silent**~~ ✅ — 3 bug berlapis di-fix (`__commit` hack, enhance salah fase, affectedRows tuple) & diverifikasi fungsional via Playwright + DB (approve → Paid + saldo kredit + log wd; idempoten 400).
2. ~~**Search 5 halaman**~~ ✅ — pola services diterapkan; diverifikasi Playwright: ketik "febian" → value persist + URL `?q=` di semua 5 halaman.

### P1 — fix minggu ini — ✅ SELESAI 29 Agustus 2026 (verified E2E, lihat verify-p1.mjs)
3. ~~Stat tickets per-tiket (1.3) + label basis hitung~~ ✅ — `COUNT(DISTINCT CASE WHEN m.status=X THEN m.ticket_id END)`; tab Pending 30 = match 100%.
4. ~~Filter level users: hapus Demo/Blacklist/Developers + whitelist `setLevel`~~ ✅ — 4 real level (Member/Agen/Reseller/Admin) di filter + whitelist server (DB: 0 user di luar 4 level).
5. ~~2FA toggle: disable sampai enforcement / implement (1.5a)~~ ✅ — action `toggle2fa` dihapus dari server; button disabled "Segera" (TODO M3.5).
6. ~~Pricing mobile overflow `min-w-0` (1.6)~~ ✅ — sample cards `min-w-0` + `truncate`; scrollWidth 390 == viewport.

### P2 — backlog dekat — ✅ SELESAI 29 Agustus 2026
7. ~~RBAC enforcement minimal superadmin vs admin (1.5b, M3.5 scope)~~ ✅ DROPPED — keputusan user: ikuti PHP legacy, hanya `level='Admin'` satu role admin penuh, tidak ada superadmin (`check_session_admin.php` verifikasi: PHP lama juga cuma cek `level='Admin'`).
8. ~~Caption exclude-admin di stat (1.7)~~ ✅ — deposits + orders; Playwright-verified.
9. ~~Kalkulator settings pakai layanan median (1.10)~~ ✅ — SQL median; Playwright-verified.
10. ~~Bulk price per kategori + refund manual per order~~ ✅ — action `bulkCategoryPrice` + `refund`; Playwright+DB-verified (test data dibuat & dibersihkan).
11. ~~Mobile: tombol Kelola user di card view~~ ✅ — stale finding, tombol sudah ada; Playwright-verified.
12. ~~Cleanup data legacy deposit #1456~~ ✅ — keputusan user: filter display `amount > Rp100jt` dari stat Canceled (tanpa mutasi data legacy); "Tolak" kini Rp56.390.840; Playwright-verified.

### P3 — polish
13. Konsistensi bahasa menu (pilih ID atau EN semua).
14. Konsistensi stat strip mobile (2×2 semua halaman).
15. Copy dashboard tickets "76 total" vs "155 pesan" — samakan istilah tiket/pesan.

---

## Lampiran — Bukti verifikasi

- **Load time** (Playwright, dev server): `/admin` 114ms · `/admin/services` 691ms · `/admin/orders` 292ms · `/admin/users` 121ms · `/admin/news` 136ms · `/admin/settings` 123ms · `/admin/reporting` 149ms — semua sehat.
- **Mobile overflow**: hanya `/admin/pricing` 578px (viewport 390). 15 lainnya == viewport.
- **DB check affiliate**: `status='Paid'` 0 rows · `balance_logs type='wd'` 0 rows · hanya 1 row legacy `Withdraw` — konsisten dengan bug 1.1 (flow approve tidak pernah sukses commit).
- **DB check tickets**: 76 tiket / 155 pesan (Pending 34 pesan/30 tiket · Answered 8/7 · Closed 113/46).
- **DB check levels**: Member 2.973 · Reseller 248 · Agen 4 · Admin 4 — tidak ada Demo/Blacklist/Developers. `setLevel` whitelist (users/+page.server.ts:187) tetap memuat 7 level.
- **DB check deposits**: UI 665/Rp116.301.257 = exact query dengan `ne(users.level,"Admin")` ✅.
- **Drizzle transaction rollback**: `app/node_modules/drizzle-orm/mysql2/session.js` — `catch (err) { await tx.execute(sql\`rollback\`); throw err; }` untuk semua throw termasuk `{ __commit: true }`.
- **Pola `__commit`**: `rg "__commit" app/src packages` → hanya affiliate/+page.server.ts.
- **Search server-side jalan**: `/admin/users?q=febian` → 3 hasil; `/admin/audit?q=deposit` (GET form) jalan — bug murni hydration `$effect` Svelte 5.
- **P2 verify (verify-p2*.mjs, 29 Agustus 2026)**: caption deposits/orders OK · kalkulator median sample "Instagram Turkey Random Comment Rp154.728" (bukan Square Bookmark) · mobile Kelola 40 tombol + modal terbuka · bulk price: 3 layanan test (kategori 999999 buatan) base 1000→2000 → Member 6000/Agen 5000/Reseller 5600, audit `bulk_category_price` tercatat · refund manual: order test #900001 full Rp3.000 → `is_refund=1`, `price` 3000→0, saldo testuser 0→3000, `balance_logs type='ref'`, audit `manual_refund_order`, tombol refund hilang setelah refunded · semua test data dibersihkan (orders/services/categories/audit_log/balance_logs). Fix tambahan saat verify: ConfirmDialog services kini punya `label`/`danger` per-action (bulk price pakai "Ya, Update Harga", aksi hapus tetap default "Hapus").
- **Anomali #1456 verify**: stat "Tolak" deposits 22.062.572.280 → Rp56.390.840 setelah `SUM(CASE WHEN amount > 100000000 THEN 0 ELSE amount END)`; 496 count non-admin; angka Rp22 miliar tidak lagi muncul; caption menyebut exclude legacy >Rp100jt. RBAC superadmin di-drop per keputusan user (PHP legacy: hanya `level='Admin'`).
