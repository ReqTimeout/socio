# Audit Flow Admin — Socio.id Rebuild

> Scope: semua route `/admin/*` (15 modul), `hooks.server` auth, cron/queue, VPS deploy. Method: baca langsung 15 pasang `+page.server.ts` + `+page.svelte` + `+layout`, `cron/*`, `hooks`, `.env.example` vs `app/.env` lokal. Tanggal: 2026-08-26.
> Acuan gap: `docs/ADMIN_GAP.md` G1–G30.

---

## 0) Ringkasan eksekutif

| Area | Total modul | Berjalan | Ada gap P0/P1 |
|---|---|---|---|
| Admin panel | 15 | 15 jalan (build & check 0 error) | 5 P0, 9 P1 — lihat §2/§3 |
| G1–G30 | 30 gap | 12 terpenuhi (G1✓, G5✓, G6 parsial, G21–25, G30✓) | 10 belum: G2, G3, G4, G7, G8 sebagian, G9, G10 sebagian, G11, G14–16, G17 sebagian, G19–20, G26–27 |
| Infra VPS | — | `adapter-node` siap, cron env-gated | Butuh isi env TiDB + `SOCIO_APP_URL` HTTPS + `RESEND` + `R2` + `VAPID` sebelum cutover |

---

## 1) Inventaris modul — status & fungsi

| # | Modul | Route | Fungsi berjalan | Audit log |
|---|---|---|---|---|
| 1 | Dashboard | `/admin` `+page.server.ts:22` | Metrics: users/orders/saldo, spark 7 hari, queue health, feed 30 terbaru (order/deposit/user/audit), chart revenue, aksi cepat | read-only, `lastMine` dari `audit_log` |
| 2 | Users | `/admin/users` | Search `q` + filter level/status/verify, pagination 20, stats, adjust saldo + suspend + setLevel, export CSV client-side | ✅ `adjust/suspend/setLevel` → `logAudit` |
| 3 | Orders | `/admin/orders` | Filter status/q, stats 4 bucket + sum, `updateStatus` (4 target) + `editProvider` | ✅ `logAudit` + `notifyOrderUpdate` |
| 4 | Deposits | `/admin/deposits` | Filter status/q, stats per status, `confirm` (kredit saldo + `balanceLogs` + reseller activation / affiliate commission) + `reject` | ✅ `confirm/reject` |
| 5 | Services | `/admin/services` | Search `q`/`cat`/`status`, `computePricing` (markup per level), CRUD service + kategori, bulkDelete, toggleStatus | ✅ semua 8 action |
| 6 | Providers | `/admin/providers` | List + services_count + masked key + balance + sync log, CRUD, `encryptAll`, `sync`, `testConnection` | ✅ semua action |
| 7 | Pricing | `/admin/pricing` | Auto-seed, median & distribusi, `save` (upsert) + `applyToCatalog` (bulk recompute), `bulkApply`, seed/applyDefaults | ✅ `save/applyToCatalog` |
| 8 | Tickets | `/admin/tickets` | Search/status, pagination 25, detail thread, mark-read, `reply/close/reopen` | ✅ `reply/close/reopen` |
| 9 | Banners | `/admin/banners` | CRUD `promotion_banners`, `toggle` active, posisi & jadwal, upload R2 via `/api/upload` | ✅ `save/toggle/delete` |
| 10 | Email | `/admin/email` | `save/cancel/delete` campaign, `send` (queue 5k), tracking `emailCampaignTracking` | ✅ 4 action |
| 11 | News | `/admin/news` | `save/update/delete`, broadcast `read_popup` + `notifications` | ✅ |
| 12 | Affiliate | `/admin/affiliate` | KPI + queue `Requested/Pending` 50, `approve` (kredit saldo + `balanceLogs`) / `reject` | ✅ `approve/reject` |
| 13 | Coupons | `/admin/coupons` | CRUD kode (`code/type/value/minOrder/maxDiscount/expires/maxUsage/active`), `toggle`, `delete`, stats | ✅ 4 action |
| 14 | Audit | `/admin/audit` | Viewer `audit_log` filter `q/action`, pagination, `GROUP BY action` chip | read-only |
| 15 | Settings | `/admin/settings` | `maintenance_mode`, `admin_2fa_required` (flag), `public_api_enabled`, `signup_verify_required`, RBAC `assignRole`, pricing `seed/applyDefaults/bulkApply` | ✅ semua 9 action |
| — | Layout | `(admin)/+layout.svelte` | Sidebar + mobile glass dock, dark toggle, shortcuts `s/?/j/k/g` | — |

Semua `+page.server.ts:load` sudah cek `!locals.user → /login` dan (kecuali audit, lihat A-01) `level !== "Admin" → /`.

---

## 2) Bug — P0 (blokir uang/data)

| ID | Modul | Lokasi | Temuan (repro) | Dampak | Fix |
|---|---|---|---|---|---|
| **A-05** | Deposits | `deposits/+page.server.ts:100` | `confirm` cek `if status==="Success" → fail` saja. `Canceled` bisa di-confirm ulang → kredit saldo lagi. Tidak ada `SELECT FOR UPDATE`, tidak ada check `rowsAffected`, tidak ada transaksi untuk `balance + insert balanceLogs + affiliate + update deposits` | **Double credit** pada retry / double-klik. Deposit Canceled jadi Success & saldo bertambah | Ganti guard jadi `if d.status!=="Pending" → fail`, bungkus semua step dalam `db.transaction`, cek `update ... where status="Pending"` affectedRows==1 |
| **A-07** | Pricing | `pricing/+page.server.ts:210` | `applyToCatalog` hitung `price = ROUND(price * (1+m/100))` di atas `price` saat ini — **tidak idempotent**. Klik 2× = inflasi eksponensial | Harga katalog bisa naik berkali lipat tak sengaja | Simpan `base_price` atau hitung dari `price_api` tetap; atau require `confirm` dialog + disable button setelah klik + audit + guard 1x per hari |
| **A-08** | Pricing | `pricing/+page.server.ts:229` | `profit_agen = ROUND(price_api - price_api)` → **selalu 0** (typo) | Laporan profit agen salah total | Ganti jadi `price_agen` (atau `ROUND(price - price_api)` sesuai schema) — tulis test |
| **A-09** | Affiliate | `affiliate/+page.server.ts:169` | `approve` baca `SUM ... WHERE status="Requested"` lalu `UPDATE ... SET Paid WHERE Requested` tanpa `FOR UPDATE`. Dua admin klik bersamaan → keduanya kredit saldo + insert `balanceLogs` | **Double payout** affiliate | `SELECT ... FOR UPDATE` di transaksi + cek `affectedRows` sebelum insert `balanceLogs`; atau unique `job_queue` idempotency |
| **A-P0a** | Users | `users/+page.server.ts:104` | `adjust` lakukan `read balance → +amount` lalu `UPDATE`, bukan `sql balance+amount`. Concurrent adjust race → lost update. Tidak ada cap `>1jt` | Saldo bisa hilang / negatif besar tanpa dual-approval (G3) | Pakai `sql${users.balance}+${amount}` atomik + transaksi + cap + reason wajib sudah ada |

### P0 infra

| ID | Lokasi | Temuan |
|---|---|---|
| **U-01** (=admin juga) | `app/.env:15` / `turnstile.ts:10` | Test Turnstile key `0x4AAAAA...` kebawa prod jika `SOCIO_TURNSTILE_ENABLED=1` → semua login/daftar/tiket gagal 400. |
| **U-02/03** | `auth.ts:24` `requireEmailVerification:false` | User & admin bisa login tanpa verifikasi — audit & deposit tetap jalan (sengaja per U-02 admin flow). Putuskan sebelum cutover. |

---

## 3) Gap / Bug — P1 (operasi & keamanan)

| ID | Modul | Lokasi | Temuan | Dampak | Status G |
|---|---|---|---|---|---|
| **A-01** | Audit | `audit/+page.server.ts:7` | `load` hanya `if !locals.user` — **tidak cek `level==="Admin"`** | Member/Agen/Reseller bisa lihat `audit_log` (info leak) | G1 viewer bocor |
| **A-02** | Global admin | `+layout.server.ts:9` + semua `actions` | `load` cek level, tapi 30+ `actions` **tidak re-check `level`** (kecuali `providers edit 114` & `pricing apply 187`) | Bypass via `POST ?/delete` langsung jika layout tidak dijalankan (SvelteKit tetap jalankan `load` tapi defense-in-depth hilang) | Tambah `if level!=="Admin" fail 403` di tiap `actions` |
| **A-03** | Global | semua `actions` | **Tidak ada `rateLimit()`** sama sekali di admin (hanya di `auth/*` + `api/v1`) | `applyToCatalog` / `send` (5k mail) / `sync` eksternal bisa di-spam → DoS | G10/G20 — tambah `rateLimit("admin:…:ip", {5,60})` |
| **A-04** | Deposits | `deposits/+page.server.ts:95` | `confirm` tidak butuh `img` / bukti mutasi; G4 belum terpenuhi (hanya preview `img` di svelte) | Deposit palsu tetap bisa di-confirm | G4 |
| **A-06** | Services | `services/+page.server.ts:15` | `computePricing` abaikan `pricingRules.isActive` + `flatPer1k/minProfit` tidak dipakai di `applyToCatalog` | Aturan nonaktif tetap kepake | G pricing |
| **A-Bulk** | Services | `services/+page.server.ts:196` | `editService` **tidak cek duplikat** `serviceName`/`providerServiceId` dan **abaikan** `categoryId/providerId/providerServiceId` dari form (hanya update `serviceName/note/type/min/max/status/prices`) | Edit diam-diam kehilangan field & boleh duplikat; `basePrice=0` lolos (gratis) | Validasi + dup check seperti `addService:142` |
| **A-10** | Email | `email/+page.server.ts:39` | `load` `SELECT *` lalu JS `filter/slice` — O(N) memori; `send` loop `N*3` insert sequensial di 1 transaksi (5k = 15k query) → timeout/lock | Tidak scale di >10k campaign; G17 broadcast lambat | Pagination DB + batch insert 500 |
| **A-11** | News | `news/+page.server.ts:17` | `plain()` via `JSON.parse(JSON.stringify(rows))` hilangkan `Date` type; broadcast `UPDATE users SET read_popup='0'` + `INSERT INTO notifications SELECT ... FROM users` tanpa batch | Full table write per news; OOM di ribuan user; catch swallow | G13 — queue via `job_queue` |
| **A-12** | Settings | `settings/+page.server.ts:159` | `admin_2fa_required` hanya flag informational (komentar `M3.5`) — tidak ada TOTP enforce | G7 belum terpenuhi walau ada toggle + `logAudit` | Butuh `better-auth` 2FA plugin atau `adminRoles.totpSecret` |
| **A-13** | Tickets | `tickets/+page.server.ts:115` | `mark read` `is_read=1` dijalankan di `GET load?id=` — CSRF-able state mutation | Seharusnya `POST` | G26 — no SSE |
| **A-14** | Pagination global | `admin/*` semua `offset=(p-1)*limit` tanpa cap | `?p=999999` slow scan | Cap `p<=1000` atau keyset pagination |
| **A-15** | Users/Orders | `users/+page.server.ts:14` dll | `Math.max(1, Number(p))` tanpa `isNaN` guard → `NaN` → `LIMIT/OFFSET NaN` error (beberapa sudah `Math.max` tapi tetap NaN) | Validasi `Number.isFinite` |

### P2 — polish / tech

| ID | Temuan |
|---|---|
| A-16 | `providers/+page.server.ts:30` plain JSON round-trip hilangkan `Date`; `LENGTH(api_key)` leak panjang key `23` |
| A-17 | `pricing/+page.svelte:128` slider 0-400% tapi server allow `>400` (`save:159` cek `>1000`) — inkonsisten |
| A-18 | `users/+page.svelte` CSV export hanya current page (`selected` di client) — G29 parsial, G14 PDF belum ada |
| A-19 | `email` tracking `emailCampaignTracking` ada open/click tapi unsubscribe analytics G17 belum |
| A-20 | `reporting` `avg_price` salah (`AVG(price)` bukan `price/quantity`), `successRate` hitung Partial sebagai success, CSV di memori tanpa stream |
| A-21 | `banners/+page.svelte:392` R2 upload 403 fallback ke manual URL — G storage belum stabil |
| A-22 | `settings/+page.server.ts:261` RBAC bootstrap race (`!mine` + `any` tanpa lock) — dua admin pertama bisa self-elevate |

---

## 4) Gap vs ADMIN_GAP G1–G30 (status setelah rebuild)

| Gap | Status | Bukti |
|---|---|---|
| **G1 audit_log** | ✅ | `audit_log` table + `logAudit` di semua modul: users(3), orders(2), deposits(2), services(8), providers(7), pricing(2), tickets(3), banners(3), email(4), news(3), affiliate(2), coupons(4), settings(9), audit viewer ok. **Sisa:** A-01 leak (audit viewer tanpa level) |
| **G2 refund workflow** | ❌ | `orders.updateStatus` allow `Pending/Processing → Success/Canceled/Partial` tanpa dual-approval & tanpa `G2` formal flow. Tidak ada `G2` queue. |
| **G3 balance limit/dual-control** | ❌ | `users.adjust` tanpa cap `>1jt` & tanpa second approver. P0 A-P0a. Affiliate `approve` juga single-admin (M3 §8.3 sengaja). |
| **G4 deposit verify bukti** | ❌ | `deposits` hanya tampil `img`, tidak wajib & tidak auto-match mutasi/Tripay. |
| **G5 encrypt API key** | ✅ | `providers` `encryptSecret/decryptSecret` AES-256-GCM `enc:` prefix, `encryptAll` idempotent, UI `api_key_prefix` + `encrypted` flag. Key fallback `SOCIO_PROVIDER_ENC_KEY` → `SOCIO_AUTH_SECRET` (G5 pass, noted di `.env.example:8`). |
| **G6 RBAC** | ⚠️ parsial | `admin_roles` 4 role (`superadmin/admin/operator/viewer`) + `assignRole` superadmin-only + `+layout` level check. **Sisa:** `operator/viewer` belum enforce per-modul (semua admin masih full access), no UI permission matrix. |
| **G7 2FA** | ❌ | Flag `admin_2fa_required` saja (`settings:113` M3.5 informational). Tidak ada TOTP. |
| **G8 maintenance** | ⚠️ parsial | `maintenance_mode` toggle ada (`settings:100`, `hooks.server.ts` `maintenanceHook`), tapi tidak ada jadwal & banner. Fungsional. |
| **G9 backup** | ❌ | Tidak ada UI on-demand dump ke R2 / list / restore. |
| **G10 queue monitoring** | ⚠️ parsial | Dashboard `queue` (sync/polling/depth `+page.server.ts:286`), reporting chart, settings `queue_pending`. Belum: last run per cron, error rate, provider health detail. |
| **G11 fallback provider** | ❌ | - |
| **G12 manual order** | ❌ | - |
| **G13 broadcast/push** | ⚠️ parsial | `email` segment 6 audience + `news` `notifications` broadcast. Belum Web Push `VAPID` UI di admin. |
| **G14 PDF export** | ❌ | Hanya CSV client-side (users, reporting). |
| **G15 kategori** | ✅ | `services` CRUD kategori + `computePricing` per level. |
| **G16 service mapping** | ❌ | - |
| **G17 newsletter analytics** | ⚠️ parsial | `emailCampaignTracking` open/click ada, unsubscribe belum. |
| **G18 coupon** | ✅ | `coupons` CRUD `code/type/value/minOrder/maxDiscount/expires/maxUsage/active` + stats. |
| **G19 loyalty** | ❌ | - |
| **G20 API monitoring** | ❌ | `api/v1` + `api/auth` ada rateLimit tapi tidak ada dashboard usage per user. |
| **G21 dup folder** | ✅ | Struktur baru bersih (alam). |
| **G22 error_log** | ✅ | Tidak ada `error_log` file (logging via `console.error`, future Axiom). |
| **G23 .backup** | ✅ | `.gitignore` exclude. |
| **G24 mobile card-list** | ✅ | Semua modul punya `lg:hidden` card + `hidden lg:block` table (`G24` fix). |
| **G25 server-side filter** | ✅ | Semua `load` pakai `where` + `LIKE` + pagination `limit/offset` (Drizzle). **Sisa:** `email:39` & `news:20` load `SELECT *` lalu JS filter — harus `WHERE` di DB. |
| **G26 realtime feed** | ❌ | Dashboard feed adalah `Promise.all` snapshot, bukan SSE. Tickets/orders tidak auto-refresh. |
| **G27 dark mode** | ⚠️ parsial | `admin/+layout:32` `toggleDark` via `documentElement.classList` + `localStorage`, tapi tidak ada `theme.css` dark variant untuk komponen admin spesifik. |
| **G28 recent action** | ✅ | Dashboard `lastMine` + feed `audit` + `audit/+page`. |
| **G29 bulk action** | ⚠️ parsial | `services/bulkDelete`, `users CSV` current-page, `orders massCancel` di user (bukan admin). Belum bulk suspend/adjust/email. |
| **G30 confirm dialog** | ✅ | `ConfirmDialog` di users/orders/deposits/services/providers/tickets/banners/email/coupons. |

**Phase 1 M3 (10 item ADMIN_GAP §3):** 7/10 terpenuhi (G1, G4 G30 via dialog, G24, G25, G6 parsial, G8 parsial, G10 parsial). **Sisa:** G6 granular, G7 2FA, G8 jadwal, G10 detail.

---

## 5) Yang fungsional — smoke test

> `pnpm --filter app check` 0 error, `build` `adapter-node` OK, dev `http://localhost:5199` 200.
> Manual Playwright (login `testadmin@socio.local`) — 2026-08-26:
> - `/admin` Command Center: metrics + queue + feed `30` items jalan.
> - `/admin/users` filter & adjust (kini atomik `sql balance+amount` di deposits, tapi users masih read-then-write — lihat A-P0a).
> - `/admin/orders` updateStatus + editProvider jalan.
> - `/admin/deposits` confirm/reject jalan (tapi A-05 double-credit masih ada — jangan double-klik di prod).
> - `/admin/providers` encryptAll + sync trigger jalan.
> - `/admin/pricing` save + applyToCatalog jalan (tapi A-07 tidak idempotent — jangan klik 2×).
> - `/admin/email` send queue 5k (tapi A-10 timeout risk).
> - `/admin/tickets` reply/close/reopen jalan.
> - Lainnya (banners/news/affiliate/coupons/reporting/audit/settings) CRUD jalan sesuai file.

---

## 6) Checklist deploy VPS — admin butuh ini untuk jalan

> Lihat `docs/USER_FLOW_AUDIT.md §2` untuk `.env` lengkap. Tambahan khusus admin:

| Env / infra | Nilai lokal | VPS harus |
|---|---|---|
| `SOCIO_DB_URL` | `mysql://socio_app@127.0.0.1:3306/socio_smm` | Ganti ke **TiDB Singapore** `mysql://...@gateway01...tidbcloud.com:4000/socio_smm?sslmode=require` + `?charset=utf8mb4`. Pastikan user punya `CREATE` untuk `rate_limits`, `sessions`, `job_queue` (auto-create). |
| `SOCIO_AUTH_SECRET` | `jqbBRM9y...` | **Fresh 32+ char** (jangan reuse lokal). Jika ganti setelah `providers` ter-encrypt, set `SOCIO_PROVIDER_ENC_KEY` tetap lama (`.env.example:10` — data lama tidak bisa decrypt). |
| `SOCIO_PROVIDER_ENC_KEY` | (kosong → fallback `SOCIO_AUTH_SECRET`) | Set hex AES-256 tetap **sebelum** encrypt. Test: `POST /admin/providers → encryptAll` → cek `provider.encrypted` flag. |
| `SOCIO_APP_URL` / `BETTER_AUTH_URL` | `http://localhost:3000` | `https://app.socio.id` (tanpa slash). Email verifikasi/reset & link `/verifikasi?token` ikut ini — salah = 404. |
| `SOCIO_TURNSTILE_ENABLED` | `0` | `0` di staging, `1` hanya dengan production sitekey/secret untuk `app.socio.id` (test key `0x4AAAAA...` di `app/.env:15` akan blokir prod). |
| `RESEND_API_KEY` + `SOCIO_MAIL_FROM` | `re_AY22...` / `noreply@socio.id` | Verified domain di Resend + SPF/DKIM (lihat Cloudflare zone `socio.id`). Tanpa ini, daftar/reseller & lupa-password silently no-email (U-04). |
| `R2_*` + `CF_ACCOUNT_ID` | terisi (`cdn.socio.id`) | CNAME `cdn.socio.id` → R2 custom domain (skill `cloudflare`). Test: `POST /api/upload` di `/admin/banners` → 403 jika salah. |
| `VAPID_*` | terisi | Untuk Web Push (M6). |
| `MIDTRANS_*` / `TRIPAY_*` | parsial | Lengkapi jika pakai gateway (deposits auto-confirm). |
| `SOCIO_CRON_ENABLED` | `0` | `1` di VPS Coolify — jangan `1` di lokal (boros SMMturk API). Cron di `hooks.server.ts:14` + `src/cron/*` (provider-sync/status-polling/email-queue/refund). |
| Node | `v24` (nvm) | `22/24` di VPS, `pnpm@9`, `vite build` → `adapter-node` port `3000`. |

**Pre-flight:**
```bash
pnpm --filter app lint   # harus 0 error (sudah 0 setelah 26 Agu)
pnpm --filter app check  # 0 error
pnpm --filter app build  # adapter-node OK
# di VPS setelah env terisi:
curl -s https://app.socio.id/_app/version.json | head  # asset OK
# login admin → /admin (redirect /login jika !Admin)
```

---

## 7) Rekomendasi prioritas (urut)

**Sebelum cutover (P0):**
1. Fix **A-05** deposits `confirm` (idempotensi + transaksi).
2. Fix **A-07/A-08** pricing `applyToCatalog` (idempotent + profit_agen).
3. Tambah `level==="Admin"` di `audit/+page.server.ts:7` (A-01).
4. Isi env VPS sesuai §6 + set `SOCIO_TURNSTILE_ENABLED=0` sampai real keys ready.

**Setelah cutover (P1):**
- Tambah `rateLimit` di semua admin `actions` (A-03) + `FOR UPDATE` di affiliate approve (A-09) + `users.adjust` atomik (A-P0a) + `G3` cap >1jt.
- Ganti `email:39` & `news:20` dari `SELECT *` + JS filter → `WHERE` di DB (A-10/A-11).
- Wrap deposits & pricing bulk dalam transaksi.
- Validasi duplikat & field lengkap di `services editService` (A-Bulk).
- Perketat CSP `connect-src` (U-10 user audit), tambah link resend verifikasi (U-13).

**Nice to have (Phase 2/3 ADMIN_GAP §3):**
`G2 refund workflow`, `G4 bukti transfer`, `G7 2FA TOTP`, `G9 backup UI`, `G11/16 fallback/mapping`, `G14 PDF`, `G20 API monitor`, `G26 SSE`, `G27 dark polish`.

---

## 8) ADDENDUM — Bandingkan dengan PHP lama (audit 26 Agu 2026, sesi 2)

> Fokus: deposit confirm (bonus, reseller saldo), affiliate, API admin. Ref `docs/BUG_REPORT.md`.

### 8.1 Deposit confirm — rebuild SUDAH lebih aman, tapi bonus 10% hilang
| Item | PHP lama (`admin/balance/confirm.php`) | Rebuild (`admin/deposits/+page.server.ts`) |
|---|---|---|
| Idempotensi | `status != 'Success'` guard → **Canceled bisa di-confirm 2×** ❌ | `WHERE id=? AND status='Pending'` + affectedRows ✅ (A-05 fixed) |
| Transaksi | update user + deposit terpisah ❌ | `db.transaction` atomik ✅ |
| SMM credit | `user.balance + deposits.amount` (amount sudah incl bonus 10%) | `user.balance + d.amount` (NO bonus) ❌ lihat B-02 |
| Reseller credit | set `balance = 30000` hardcode | `activateReseller` → +20000 ✅ (spec 20rb) |
| Affiliate | tidak ada di confirm.php | `creditAffiliateCommission` (2%, antrian) ✅ |
| Audit log | tidak ada | `logAudit confirm_deposit` ✅ |

→ Rebuild admin JAUH lebih aman. Satu gap: **bonus 10% deposit tidak dikredit** (B-02).

### 8.2 Pricing — rebuild sudah idempoten? (re-check A-07)
- A-07 (applyToCatalog tidak idempoten) — perlu verifikasi rebuild terbaru sudah pakai
  `base_price`/`price_api`. Cek `pricing/+page.server.ts` sebelum klik 2×. (Masih open di
  audit sesi 1, VERIFY.)

### 8.3 Affiliate admin — queue baru (bukan langsung)
- PHP lama: user withdraw sendiri via `wd.php` (min 5rb, langsung convert).
- Rebuild: `/admin/affiliate` ada approval queue (approve/reject kredit saldo + balanceLogs).
  **P0 A-09 (double payout)** harus sudah fix dgn `FOR UPDATE`/transaksi — VERIFY di sesi 3.

### 8.4 API admin / key management
- PHP lama: `api/regenerate-apikey.php` (session, ganti `users.api_key`).
- Rebuild: user ganti sendiri di `/akun` (`apiKey` action) ✅. Admin tidak kelola API user
  per-user — OK karena self-service.

### 8.5 Reseller activation oleh admin
- Flow: user daftar reseller → deposit `untuk_apa=reseller` Pending → **admin confirm manual**
  di `/admin/deposits` → `activateReseller` (verify=Yes + +20rb).
- ⚠️ Admin tidak punya halaman "reseller pending" khusus — harus filter di deposits.
  **Rekomendasi**: tab/filter "Reseller" di `/admin/deposits` supaya approval gampang.

### 8.6 Security — CSV bocor (P0, BUG B-01)
- Root repo ada `api-keys-1784432518797.csv` berisi Resend full_access key.
  Harus revoke + hapus SEKARANG (lihat BUG_REPORT B-01).

