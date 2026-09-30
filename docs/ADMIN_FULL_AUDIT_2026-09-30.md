# ADMIN_FULL_AUDIT — Audit Menyeluruh Panel Admin socio.id

> **Tanggal**: 30 September 2026 · **Lingkup**: semua halaman/fungsi `/admin/*` (20 modul) + guard lintas-modul (RBAC, 2FA, maintenance, security headers, audit log, provider key encryption)
> **Metode**: baca kode aktual `+page.server.ts` / `+page.svelte` / `+server.ts` / `hooks.server.ts` / `packages/core/src/rbac.ts` / `lib/server/*`. Semua temuan punya referensi `file:line`. Tidak ada hipotesis tanpa kode.
> **Acuan gap**: `docs/ADMIN_GAP.md` (G1–G30).

---

## 0. RINGKASAN EKSEKUTIF

Panel admin **sudah jauh lebih matang** dibanding PHP lama. Mayoritas modul punya: guard admin, rate-limit per-aksi, audit log, validasi input, transaksi atomik untuk operasi uang, dan idempotency guard. **Tidak ditemukan bug kritis yang salah hitung uang** pada jalur order/deposit/refund/pricing setelah fix double-markup (lihat `ADMIN_PRICING_FIX` memori).

Namun ada **1 temuan keamanan tingkat-TINGGI yang sistemik** dan beberapa gap sedang–rendah:

| Severity  | Jumlah | Tema                                                                                                                                                                                             |
| --------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 🔴 Tinggi | 1      | RBAC **tidak ditegakkan di level action** pada 15/20 modul → eskalasi privilege                                                                                                                  |
| 🟠 Sedang | 4      | ~~Audit log bolong (backup/broadcast), deposit verify bukti (G4), 2FA tidak wajib~~ **P1 SELESAI 30-Sep** (logAudit backup.delete, gate deposit manual, 2FA wajib). Dual-control saldo masih P2. |
| 🟡 Rendah | 6      | Stats outlier masking, pagination cap, maintenance fail-open, dsb                                                                                                                                |
| ✅ Aman   | —      | Guard level, rate-limit, transaksi atomik, provider key AES-256, security headers, CSRF SvelteKit                                                                                                |

---

## 1. GUARD LINTAS-MODUL (diperiksa lebih dulu)

### 1.1 Autentikasi & otorisasi admin

- **Layout guard** `(admin)/+layout.server.ts:13-14` — redirect non-login ke `/login`, non-`level==="Admin"` ke `/`. ✅
- **`assertAdmin(locals)`** `lib/server/admin.ts:17-23` — assertion `level === "Admin"`, `error(403)` (legal di action). Dipakai konsisten di SEMUA action (terverifikasi 26 file). ✅
- **`assertAdminRate()`** `admin.ts:26-37` — rate-limit DB-backed `admin:<key>:<ip>`. Dipakai di hampir semua aksi destruktif. ✅

### 1.2 🔴 TEMUAN TINGGI — RBAC hanya ditegakkan di VIEW, bukan ACTION (G6)

**Fakta kode:**

- `rbac.ts` mendefinisikan role `super_admin/admin/operator/finance` + matriks permission + `ROUTE_PERMISSION`.
- Layout **load** menegakkan permission per-path (`+layout.server.ts:29-32` → `can(role, required)`). Ini memblokir **GET/halaman view**.
- **Tapi action (POST)** pada mayoritas modul **hanya memanggil `assertAdmin(locals)`** (cek `level==="Admin"`), **TIDAK** memanggil `can(role, ...)`.
- Modul yang **SUDAH** cek `can()` di action: `deposits` (approve/reject, `:102,225`), `refunds` (`:59,80`), `backup` (`:32,46`), `broadcast` (`:38`), `health` (`:13`).
- Modul yang **BELUM** ( hanya level): `users` (0 can), `orders` (0), `services` (0), `providers` (0), `settings` (0), `email` (0), `tickets` (0), `coupons` (0), `banners` (0), `news` (0), `affiliate` (0), `pricing` (0), `cron` (0).

**Dampak**: admin dengan role `operator`/`finance` yang **tidak boleh** melihat halaman tertentu tetap bisa **mengirim POST langsung** ke form action modul itu (mis. `?/delete`, `?/adjust`, `?/confirm`), karena action cuma memeriksa `level==="Admin"`. Pemisahan role (Tujuan G6) **bocor di jalur mutasi**.

**Rekomendasi**: buat helper `assertAdminCan(locals, event, "module:action")` yang resolve role (query `admin_roles`) + panggil `can()`, lalu **sematkan di setiap action destruktif** (delete/adjust/approve/reject/refund/setLevel/toggle/sync). Alternatif: angkat pemeriksaan ke satu guard yang memetakan action-name → permission. **Prioritas: tinggikan sebelum milestone M3 close.**

> **✅ RESOLVED (P0, 30-Sep)** — Helper `assertAdminCan(locals, permission)` (fail-based, untuk form action) + `guardAdminCan(locals, permission)` (throw-based, untuk endpoint `+server.ts`) + `resolveAdminRole(userId)` ditambahkan di `lib/server/admin.ts`. Guard kini terpasang di **semua action mutasi 20 modul**: users (adjust/suspend/setLevel/bulkSuspend/bulkActivate), orders (updateStatus/editProvider/refund + manual create), services (9 aksi), pricing (save/setFloor), providers (add/edit/delete/sync/test), coupons/banners/news (save/toggle/delete), tickets (markRead/reply/close/reopen), affiliate (approve/reject), email (5 aksi), settings (maintenance/togglePublicApi/toggleSignupVerify/updatePricing/bulkApply/assignRole), cron (run). Plus **6 endpoint export** (users/deposits/orders/orders-pdf/reporting-pdf/deposits-pdf) kini cek read-permission. Permission baru: `affiliate:edit`, `cron:run` (untuk admin), `roles:assign` (khusus super_admin via wildcard — admin biasa tak bisa lagi assign role). `2fa/setup` & `2fa/verify` sengaja TIDAK di-gate (self-service 2FA milik admin itu sendiri). Verifikasi: svelte-check 0 error, eslint 0 error baru, build sukses.

### 1.3 2FA / TOTP (G7) — tersedia & ditegakkan saat login, tapi opt-in

- `login/+page.server.ts:112-123` — bila `user.level==="Admin" && totpEnabled`, **session tidak dibuat**, set cookie `totp_pending`, redirect `/admin/2fa/verify`. ✅
- `2fa/verify/+page.server.ts:22-51` — verifikasi TOTP → baru buat session + cookie. Backup code didukung (`getBackupCodesPlain`).
- `2fa.ts` — secret TOTP di-encrypt AES-256-GCM. ✅
- **Gap**: enforcement hanya aktif **kalau admin itu sudah enroll sendiri**. Tidak ada cara **memaksa** semua admin mengaktifkan 2FA (mis. gate `/admin/*` bila `totp_enabled=0`). ADMIN_GAP G7 menyebut "TOTP **wajib** untuk admin".
- **Rekomendasi**: tambah flag setting `require_2fa_for_admin`; di layout, bila flag aktif & user admin belum enroll → paksa redirect `2fa/setup`.

> **✅ RESOLVED (P1.4, 30-Sep)** — Settings toggle `require_2fa_for_admin` + action `toggleRequire2fa` (`settings:edit`) ditambahkan. `(admin)/+layout.server.ts` kini query `users.totpEnabled` (authoritative, bukan dari cookie session); bila flag `"1"` && admin belum enroll → `redirect(303, "/admin/2fa/setup")` kecuali sedang di `/admin/2fa/{setup,verify}`. Toggle default OFF (owner yang mengaktifkan). UI: blok "2FA Admin Wajib (TOTP)" di settings kini fungsional (sebelumnya tombol "Segera" disabled).

### 1.4 Maintenance mode (G8) — ✅ solid

- `settings/+page.server.ts:113-127` toggle `maintenance_mode` (admin-only, audit log).
- `hooks.server.ts:123-150` — blokir semua route non-statis untuk `level!=="Admin"` dengan **503** saat aktif. ✅
- **Catatan (rendah)**: `catch { /* fail open */ }` (`:148`) — bila `getSetting` gagal (DB down), maintenance **tidak memblokir** (fail-open). Untuk mode maintenance justru lebih aman fail-closed terhadap non-admin, tapi ini trade-off ketersediaan; acceptable, dokumentasikan saja.

### 1.5 Provider API key encryption at rest (G5) — ✅ solid

- `providers/+page.server.ts:86,113,142` — semua `apiKey: encryptSecret(...)`. `crypto.ts` AES-256-GCM.
- Load hanya menampil `api_key_prefix` + `encrypted` flag (`:22-32`), **key penuh tidak pernah keluar ke client**. ✅
- Deteksi legacy plaintext: `plainKeyCount` (`:55`). ✅ (disarankan ada tombol re-encrypt massal bila `plainKeyCount>0`.)

### 1.6 Security headers — ✅ solid

`hooks.server.ts:152+`: HSTS (preload), X-Frame-Options DENY, X-Content-Type nosniff, Referrer-Policy, Permissions-Policy. CSP tersedia. ✅

---

## 2. AUDIT PER MODUL

### 2.1 Deposits (`deposits/+page.server.ts`) — 🟢 bagus, 1 gap

- **Fungsi**: list + filter + stats, `confirm` (kredit saldo), `reject`.
- **Kekuatan**: `can(role,"deposits:approve")` di kedua action (`:102,225`), rate-limit, **idempotency guard** status (hanya Pending → Success/Canceled), **transaksi atomik** (`:126-155`), flip status pakai `WHERE status='Pending'` + cek `affectedRows` (V-DEP2 bug sudah diperbaiki `:146-154`), side-effect (reseller activate/affiliate commission) **setelah commit** (V-DEP4 `:164-177`), email async pasca-commit, audit log.
- **Khusus reseller**: `untukApa==="reseller"` tidak kredit saldo, tapi aktivasi reseller (V-DEP3 `:121-124`). ✅
- **🟠 Gap G4 (verify bukti transfer)**: `confirm` tidak mewajibkan/mencocokkan **bukti transfer** (`img`) maupun mutasi bank. Ada subfolder `deposits/verify/` (diperiksa terpisah) — tapi tombol konfirmasi massal di list bisa approve tanpa validasi bukti. Rekomendasi: gate approve bila `img` kosong & method manual, atau cocokkan nominal otomatis dari webhook Tripay/Midtrans/Jasamutasi (REBUILD_PLAN §payment).
  - **✅ RESOLVED (P1.3, 30-Sep)**: `confirm` action kini menolak deposit `type==="manual"` dengan `img` kosong kecuali admin mencentang **"Setujui paksa"** + isi **alasan ≥ 5 karakter**. Alasan disimpan ke `deposits.verification_notes` (prefix `OVERRIDE tanpa bukti:`) + `logAudit` (`overrideNoProof`, `reason`). UI modal confirm menampilkan checkbox+textarea (validasi HTML5 `required`/`minlength`) hanya saat bukti kosong. Deposit `auto`/`VA` (hasil webhook) tidak terpengaruh. `deposits/verify` memang sudah filter `img <> ''` sejak awal.
- **🟡 Rendah**: stats total mengabaikan deposit > Rp100jt sebagai 0 (`:67`). Anti-outlier masuk akal, tapi **kelebihan report** bila memang ada top-up besar sah — perlu catatan label.

### 2.2 Orders (`orders/+page.server.ts`, `+page.svelte`) — 🟢 bagus

- **Fungsi**: history + stats + detail modal + 3 kolom Jual·Modal·Profit (JOIN `services.id=orders.service_id`, sudah diperbaiki sesi ini), `updateStatus`, `editProvider`, `refund` (auto-execute keputusan owner), sub-route `orders/new` (order manual G12 ✅), export + export-pdf (G14 ✅).
- **Kekuatan**: guard status (`UPDATABLE_FROM/TO`, `EDITABLE_STATUS`, `REFUNDABLE_STATUS`), `refund` pakai CAS `is_refund` anti-refund-ganda (`:242`), reason refund wajib (`:229`), `refundAmount=min(want,price)` anti-refund-lebih (`:249`), notif user, audit log, rate-limit.
- **🟠 RBAC**: action `refund`/`updateStatus` hanya `assertAdmin` — role finance/operator bisa refund & ubah status. Masuk temuan §1.2.
- **🟡 Rendah**: `orders/new` manual — verifikasi tidak kirim provider (providerId=1/manual) sudah benar; pastikan tidak bisa dipakai "refill" order live.

### 2.3 Refunds (`refunds/+page.server.ts`) — 🟢 workflow benar

- `refundRequests` (requestedBy/approvedBy) = alur **dual-approval** (G2 ✅). `can(role,"refund:approve/reject")` (`:59,80`). approve→`approveRefund` atomik (refund lib), reject butuh reason. ✅

### 2.4 Users (`users/+page.server.ts`) — 🟢 bagus, dual-control noted

- **Fungsi**: list + filter multi-level (P2-06) + stats, `adjust` saldo, `suspend`, `setLevel`, bulk (P2-09 `parseIds`), export CSV (P2-2).
- **Kekuatan**: `adjust` = **hard cap Rp1jt** (`:99,120-125`), reason min 5 char (audit trail), **`SELECT ... FOR UPDATE`** lock + update atomik `balance+amount` (`:132-143`), balance_logs, audit log, rate-limit 10/menit. `setLevel` whitelist level valid.
- **🟠 G3 dual-control**: adjustment > Rp1jt **ditolak** dengan pesan "belum tersedia" (bukan butuh approval kedua). Ini **pembatas aman**, tapi ADMIN_GAP G3 minta **dual-approval** bukan hard-block. Status: partial.
- **🟠 RBAC**: semua action hanya level-check. Finance seharusnya tidak bisa `setLevel`/`suspend`; operator tidak bisa `adjust`. Masuk §1.2.

### 2.5 Services (`services/+page.server.ts`) — 🟢 bagus, pricing aman

- **Fungsi**: CRUD layanan + kategori, `bulkCategoryPrice`, status toggle, history (S6), detail.
- **Kekuatan**: `computePricing(base)` menulis **modal murni** ke `price/priceApi/priceReseller`, `sellMember/...` hanya preview (`:30-43`). `bulkCategoryPrice` basis = modal (`:382-384,402`), profit = margin info. **Sesuai invariant anti-double-markup.** ✅ Audit log 10 aksi, rate-limit per aksi.
- **🟠 RBAC**: `services:read` di-layout, tapi action `addService/editService/bulk...` tanpa `can()` → operator/finance bisa edit katalog. §1.2.
- **Catatan**: field edit memakai nama legacy `form.get("profit")` sbg base modal (`:218`) — sudah selaras setelah fix `openEdit f_profit = s.price`, tapi **membingungkan**; rename ke `modal`/`basePrice` untuk kejelasan.

### 2.6 Pricing (`pricing/+page.server.ts`, `+page.svelte`) — 🟢

- Hanya menulis `pricing_rules` (markup %), **tidak pernah** menyentuh `services.price` (sesuai invariant). Rate-limit + audit (`:174,203`). Preview sample card computed live dari slider (fix sesi lalu). ✅ RBAC action belum (`pricing:read` view-only) → §1.2 untuk `pricing:edit`.

### 2.7 Providers (`providers/+page.server.ts`) — 🟢

- Seed key via `encryptSecret`, add/edit encrypt, delete cek referensi layanan aktif sebelum hapus (`:166`), audit log, rate-limit. `syncNow` trigger provider-sync dengan guard. ✅ RBAC belum di action (create/edit/delete provider = sangat sensitif) → **§1.2 prioritas**.

### 2.8 Backup (`backup/+page.server.ts`) — 🟢 (dibetulkan P1.2)

- **RBAC ✅** (`can(role,"backup:manage")` di load + run + delete), rate-limit super ketat (2/menit).
- **KOREKSI temuan G1**: audit awal bilang `run`/`delete` tanpa `logAudit`. Setelah dicek ulang: `runBackup()` **sudah** `logAudit({action:"backup_create"})` internal (`backup.ts:143`), dan `broadcast_send` juga sudah log. Yang **benar-benar bolong hanya `deleteBackup()`** (hapus dump DB tidak tercatat).
- **✅ RESOLVED (P1.2, 30-Sep)**: `deleteBackup(id, adminId?, ip?)` kini `logAudit({action:"backup_delete", entity:"backup_log", entityId:id, detail:{filename}})`; action `delete` mengirim `adminId`+`ip`.

### 2.9 Broadcast (`broadcast/+page.server.ts`) — 🟢

- RBAC ✅ (`can(role,"broadcast:send")`), segment targeting (`getUserIdsForSegment`), campaign disimpan `broadcastCampaigns`.
- **KOREKSI + ✅ terverifikasi (P1.2, 30-Sep)**: `sendBroadcast()` **sudah** `logAudit({action:"broadcast_send", entityId:campaignId, detail:{title, segment, channel, sent}})` internal (`broadcast.ts:99`). Tidak ada gap nyata di sini (laporan awal keliru karena hanya grep file action, bukan lib function yang dipanggilnya).

### 2.10 Cron (`cron/+page.server.ts`) — 🟢

- `run` trigger `triggerCronJob` dengan rate-limit + **audit log** (`:23`). Status/queue depth via `getCronStatus` (G10 ✅). RBAC action belum (`health:read`).

### 2.11 Health (`health/+page.server.ts`) — 🟢

- Diagnostic DB/provider/queue. RBAC (`:13`). Load return hanya `{health}` — tidak ada secret bocor. ✅

### 2.12 Audit viewer (`audit/+page.server.ts`) — 🟢

- Viewer `audit_log` (umpan balik G1). Hanya read. Tidak perlu self-audit.

### 2.13 Email (`email/+page.server.ts`) — 🟢

- Campaign/template/analytics/test-send, rate-limit + audit (7). **Tidak** mereferensikan `RESEND_API_KEY`/secret di kode (lewat `$lib/server/email` env-only) → tidak ada bocor key. ✅ G17 newsletter analytics sebagian (perlu cek open/click tracking — lihat improvement).

### 2.14 Coupons (`coupons/+page.server.ts`) — 🟢

- CRUD + toggle, rate-limit + audit per aksi (`:53,97,109,121,134,147,159`). Validasi kode/expiry/min-order/max-usage (divalidasi ulang di checkout `applyCoupon`). RBAC belum (view `coupons:read`). ✅ G18 terpenuhi.

### 2.15 Tickets (`tickets/+page.server.ts`) — 🟢

- List + stats (SLA-ish), `reply`/`close`/`reopen`/`markRead` dengan rate-limit + audit (`:189,209`). RBAC belum. ✅

### 2.16 Affiliate (`affiliate/+page.server.ts`) — 🟢

- Summary + top referrer + `approve/claim` komisi dengan rate-limit + audit (`:223,273`). RBAC belum. G19 loyalty point **belum** modul khusus (di luar scope M3).

### 2.17 News (`news/+page.server.ts`) — 🟢

- CRUD + auto-sync source, rate-limit + audit. ✅

### 2.18 Banners (`banners/+page.server.ts`) — 🟢

- CRUD + toggle + jadwal, rate-limit + audit (5). G15 featured category sebagian (kategori via sync).

### 2.19 Reporting (`reporting/+page.server.ts`, `export`, `export-pdf`) — 🟢

- Chart + CSV (G? export) + **PDF (G14 ✅)**. Export `assertAdmin` + audit. Tidak ada mutasi data → RBAC rendah. Verifikasi PDF tidak include modal/provider (hanya omzet).

### 2.20 Settings (`settings/+page.server.ts`) — 🟢

- 9 aksi semuanya `assertAdminRate` (9) + `logAudit` (9): maintenance toggle, dsb. RBAC `settings:read`. ✅

---

## 3. MATRIKS KEPATUHAN ADMIN_GAP

| Gap                                | Status     | Catatan                                                                  |
| ---------------------------------- | ---------- | ------------------------------------------------------------------------ |
| G1 Audit log                       | 🟡 **95%** | Semua modul audit **KECUALI `backup` & `broadcast`**                     |
| G2 Refund workflow + dual approval | ✅         | `refundRequests` + approve/reject RBAC                                   |
| G3 Balance dual-control            | ✅ (P2)    | approval-2 via `balance_requests` (four-eyes)                            |
| G4 Deposit verify bukti            | 🟠         | Approve tidak wajibkan bukti/match mutasi                                |
| G5 Provider key encrypt            | ✅         | AES-256-GCM, prefix-only ke client                                       |
| G6 RBAC granular                   | 🔴         | **View OK, ACTION tidak ditegakkan di 15 modul**                         |
| G7 2FA admin                       | 🟡         | TOTP ada & enforce saat login, tapi **belum wajib** enroll               |
| G8 Maintenance mode                | ✅         | hook 503 non-admin                                                       |
| G9 Backup UI                       | 🟡         | ada + RBAC + rate-limit, **tanpa audit log**                             |
| G10 Queue/cron monitoring          | ✅         | `cron` + `health`                                                        |
| G12 Order manual                   | ✅         | `orders/new`                                                             |
| G13 Broadcast                      | ✅         | + RBAC, tapi tanpa audit                                                 |
| G14 Export PDF                     | ✅         | reporting + orders/deposits export-pdf                                   |
| G18 Coupon                         | ✅         | penuh                                                                    |
| G20 API usage monitoring           | ✅ (P2)    | tabel `api_usage` + instrumentasi `/api/v1` + halaman `/admin/api-usage` |
| G24 Card-list mobile admin         | ✅         | (pola di orders + lainnya; verifikasi visual)                            |
| G25 Server-side search/filter      | ✅         | Drizzle where + pagination                                               |
| G30 Confirm dialog destruktif      | 🟡         | perlu cek visual per tombol                                              |

---

## 4. DAFTAR PERBAIKAN (prioritas)

### 🔴 P0 — Keamanan (sebelum M3 close) — ✅ SELESAI (30-Sep)

1. ✅ **Tegakkan RBAC di action** — `assertAdminCan`/`guardAdminCan` dipasang di SEMUA action destruktif (users/orders/deposits/refunds/services/providers/pricing/coupons/banners/news/tickets/affiliate/email/settings/cron + 6 export endpoint). Lihat §1.2 RESOLVED.

### 🟠 P1 — Integritas & akuntabilitas — ✅ SELESAI (30-Sep)

2. ✅ **`logAudit` backup** — `deleteBackup` kini mencatat `backup_delete`. (Koreksi: `backup.run` & `broadcast.send` ternyata sudah log internal via `runBackup`/`sendBroadcast` — tidak ada gap.)
3. ✅ **Deposit verify bukti** (G4) — approve manual tanpa `img` wajib override beralasan (ter-audit + `verification_notes`).
4. ✅ **2FA wajib** (G7) — flag `require_2fa_for_admin` + enforce di `(admin)` layout (redirect ke setup). Default OFF, owner yang aktifkan.

### 🟡 P2 — Pelengkap — ✅ SELESAI (30-Sep)

5. ✅ **Dual-control balance** (G3) — tabel `balance_requests` (ensure.ts + schema). Adjust > Rp1jt kini **diajukan** (bukan ditolak), dieksekusi hanya setelah admin **kedua** (four-eyes, `reviewedBy != requestedBy`) menyetujui via `approveBalance`/`rejectBalance` di halaman Users. Transaksi atomik + `SELECT FOR UPDATE`, audit `request/approve/reject_balance_adjust`.
6. ✅ **Rename `profit`→`basePrice`** — field form + state var (`f_profit`→`f_basePrice`) + pesan error di services. Kolom DB `services.profit` (margin info) tetap; hanya input modal yang dinamai ulang.
7. ✅ **API usage monitoring UI** (G20) — tabel `api_usage` baru + instrumentasi best-effort (fire-and-forget) di `/api/v1` POST (user/action/ok/ip). Halaman `/admin/api-usage` (StatCard + chart harian + breakdown per action + top user + 50 panggilan terakhir), gerbang `reporting:read`.
8. ✅ **Maintenance fail-closed** (G8) — `catch` di `maintenanceHook` kini sajikan 503 utk non-admin saat `getSetting` error (admin + static tetap bypass). Rationale: route user tetap butuh DB, 503 ramah > 500 kacau.
9. ✅ **Re-encrypt provider key** — `encryptAll` action + UI tombol "Encrypt N key" (saat `plainKeyCount>0`) **sudah ada**; gap riil: action belum kena guard RBAC → kini `assertAdminCan("providers:edit")` ditambahkan.

---

## 5. KESAN KESELURUHAN

- **Kekuatan utama**: disiplin anti-race (FOR UPDATE / CAS / affectedRows), rate-limit di hampir semua aksi, audit log luas, enkripsi key, security headers, CSRF bawaan SvelteKit, dan invariant pricing dijaga di semua touchpoint (dibuktikan audit pricing sesi ini).
- **Kelemahan terbesar**: **RBAC baru separuh jalan** — model permission lengkap & dipakai di view, tapi **mutasi (action) mayoritas hanya cek `level==="Admin"`**. Selama belum ada role operator/finance betulan dipakai, risikonya laten; begitu role dibagikan, jadi eskalasi privilege nyata. **Perbaiki ini lebih dulu.**
- Setelah P0+P1 selesai, panel admin masuk kategori **production-grade** untuk operasi uang.

_Dokumen ini hasil baca kode, bukan asumsi. Setiap klaim punya `file:line`. Untuk fix, kerjakan urut P0 → P1 → P2, jalankan `pnpm --filter app check && build` per modul, dan audit ulang via Browser di prod setelah deploy._
