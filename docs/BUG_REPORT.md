# BUG REPORT — Socio.id Rebuild (pre-deploy audit)

> Tanggal audit: 2026-08-26. Hasil audit bandingkan flow PHP lama (`app.socio.id/`) vs
> rebuild (`app/src`, `landing/src`). Tujuannya: SEMUA flow harus jalan *real* sebelum
> cutover VPS. Severity: **P0** = blokir uang/data/security, **P1** = operasional, **P2** = polish.

---

## 🔴 P0 — SECURITY / DATA LOSS (harus fix sebelum deploy)

### B-01 — Resend API key bocor di root repo  ⚠️ CRITICAL
- **File**: `api-keys-1784432518797.csv` (root repo)
- **Isi**: header `id,created_at,name,token,permission,domain,creator` + 1 baris berisi
  token `re_Lv74uGJr...` (Resend **full_access** API key) milik `aramadhi92@gmail.com`.
- **Dampak**: siapa pun yang punya akses repo bisa kirim email atas nama Socio.id, baca
  log, rotate key pihak ketiga. Leak credential.
- **Fix**:
  1. **Revoke/rotate** key di dashboard Resend SEKARANG (gak peduli sudah dipakai di `app/.env`).
  2. Hapus file dari working dir + `git rm --cached` (kalau sempat ke-commit) + tambah ke `.gitignore`.
  3. Generate key baru, taruh di `.env` (jangan di CSV di root).
- Status: **OPEN**. Ini harus dikerjakan hari ini, bukan nunggu deploy.

### B-02 — Bonus deposit 10% HILANG di rebuild  💸
- **PHP lama**: `app.socio.id/balance/add-action.php:35-50` → `$random=10; $bonus=0.10;`
  saldo masuk = `amount + 10%*amount`. Deposit Rp100rb → saldo +Rp110rb.
- **Rebuild**: `app/src/routes/(app)/saldo/top-up/+page.server.ts:64-82` insert `deposits`
  dengan `amount` (tanpa bonus). Admin confirm (`admin/deposits/+page.server.ts:120`)
  kredit `d.amount` mentah — **bonus 10% tidak ada**.
- **User explicitly minta**: "deposit harusnya bonus 10%".
- **Fix**: tambah kolom/flag `bonusRate` & simpan `creditedAmount = amount + 10%`.
  Di confirm, kredit `creditedAmount` (bukan `d.amount`). Atau env `SOCIO_DEPOSIT_BONUS=0.10`.
  Lihat `docs/USER_FLOW_AUDIT.md` §Addendum.
- Status: **OPEN** (gap fungsional, bukan crash).

### B-03 — API v1 `status`/`refill` lookup BROKEN  🐛
- **Sumber**: `app/src/routes/api/v1/+server.ts`
- **Bug**: `handleOrder` return `order_id: oid` (string `Date.now()`, lihat :249).
  Tapi `handleStatus` (:259) & `handleRefill` (:279) cari pakai
  `eq(orders.id, Number(form["id"]))` → `orders.id` adalah **autoincrement int**,
  sedangkan client dikasih `oid` string. `Number("1756...")` ≠ PK → selalu "Order ID not Found".
- **Dampak**: semua client API (bot reseller) gagal cek status/refill. Ini P0 buat
  use-case reseller/whitelabel.
- **Fix**: return & terima `oid` konsisten. Ganti `handleStatus`/`handleRefill` pakai
  `eq(orders.oid, form["id"])` (dan validasi kepemilikan user). Atau return numeric `id`
  (tapi `id` autoincrement leak jumlah order — prefer `oid`).
- Status: **OPEN**.

### B-04 — Landing CTA `/register` 404 setelah cutover  🔗
- **Landing**: `landing/src/pages/index.astro:17`, `Navbar.svelte:8`, `StickyCTA.svelte:6`,
  `PainPoints.svelte:20`, `FinalCTA.svelte:8`, `PricingInteractive.svelte:2` semua pakai
  `https://app.socio.id/register`.
- **Rebuild app**: route daftar = `/daftar` (tidak ada `/register`).
- **Dampak**: semua tombol "Daftar Gratis" → 404 di prod. Conversion = 0.
- **Fix (2 opsi)**:
  1. Ganti semua `register` → `daftar` di landing (6 file), ATAU
  2. Tambah redirect `/register` → `/daftar` di `app/src/routes/register/+server.ts`
     (aman untuk link lama/SEO). **Rekomendasi: opsi 2 + ganti link di landing**.
- Status: **OPEN**.

---

## 🟠 P1 — OPERASIONAL (fix sebelum/serah cutover)

### B-05 — Footer landing link `api-docs` & `/blog` 404
- `index.astro:193` → `https://app.socio.id/api-docs` (route tidak ada).
- `index.astro:201` → `/blog` (landing cuma punya `index.astro`).
- **Fix**: buat `app/src/routes/api/v1/docs/+page.svelte` (atau `/api-docs`),
  dan `landing/src/pages/blog/index.astro` (atau hapus link sampai ada).
- Status: **OPEN**.

### B-06 — Belum ada auto-confirm Tripay/Midtrans deposit
- Rebuild top-up saat ini **manual BCA only** (Midtrans disabled di `top-up/+page.server.ts:47`).
- Webhook ada `api/webhook/midtrans` saja; **tidak ada `tripay`** (LEGACY_GAP §1).
- **Dampak**: kalau nyalakan Tripay nanti, konfirmasi tetap manual. Bukan blocker sekarang
  karena flow manual jalan, tapi catat di roadmap.
- Status: **OPEN (low)**.

### B-07 — Deposit rebuild tidak batasi 2 pending (vs PHP lama)
- PHP lama `add-action.php:31` blokir kalau ada ≥2 deposit Pending.
- Rebuild `top-up/+page.server.ts` tidak cek jumlah pending → user bisa bikin banyak pending.
- **Fix**: tambah guard `count Pending >= 2 → fail`.
- Status: **OPEN (low)**.

### B-08 — `uniqueSuffix` rebuild deterministik per-user (beda behavior PHP)
- PHP lama: `rand(111,999)` acak tiap deposit.
- Rebuild: `100 + (userId*7 % 900)` — **sama untuk semua deposit user**.
  Kalau user punya 2 deposit pending, suffix-nya **identik** → admin sulit cocokin mutasi.
- **Fix**: generate random suffix per-deposit (simpan di `deposits.post_amount` sudah ada,
  tapi suffix harus random, bukan derivasi userId).
- Status: **OPEN**.

### B-09 — Reseller expire 24 jam (rebuild) vs 12 jam (PHP lama + email)
- `top-up` SMM expire 24 jam; reseller deposit `signup.ts:172` expire 12 jam (sesuai email).
  Tapi cron `light.ts` (deposit expire) — pastikan cover keduanya. Verifikasi cron hapus
  reseller Pending >12j.
- Status: **VERIFY** (cek `cron/light.ts`).

### B-10 — Affiliate komisi 2% masuk antrian approval (beda UX PHP lama)
- PHP lama: komisi langsung ke `balance_reff`, user bisa withdraw sendiri (min Rp5rb).
- Rebuild: `affiliate.ts:6` rate 0.02, insert `affiliate` status `Pending` → **admin approve**
  (`/admin/affiliate`). Intentional (G-control), tapi UX beda: reseller lama bisa kaget
  komisi "hilang". Dokumentasikan di FAQ/affiliate page.
- Status: **BY DESIGN** (catat di copywriting).

---

## 🟡 P2 — POLISH / CONSISTENCY

| ID | Temuan | Fix |
|---|---|---|
| B-11 | Dashboard dummy banner `"Top up saldo, bonus langsung masuk"` (`+page.server.ts:30`) — **bohong** karena bonus 10% belum ada (B-02) | Hapus klaim / atau aktifkan B-02 dulu |
| B-12 | `regBase` landing hardcode `app.socio.id` — gak pakai env, gak bisa test staging | Pakai relative `/daftar` |
| B-13 | API v1 rate-limit per-IP 60/menit, bukan per-key → bot reseller share IP kena limit | Tambah per-key bucket |
| B-14 | `handleProfile` return `balance` tapi gak cek `verify`/`status` suspended → user Blacklist masih bisa API order | Cek `level!=="Blacklist"` & `verify==="Yes"` |
| B-15 | Order via API: `profit` dihitung dari `svc.profit` lama (`+server.ts:217`), bukan profit rule baru | Audit apakah `profit` field masih relevan |

---

## ✅ SUDAH BENER (tidak perlu diutak-atik)
- Admin deposit confirm sudah **idempoten + transaksi atomik** (A-05 fixed, `deposits/+page.server.ts:104-140`).
- Reseller flow match spec: 50rb + suffix, email rekening BCA, admin manual approve, saldo awal **20rb** (`signup.ts:229` default `SOCIO_RESELLER_BONUS=20000`). PHP lama 30rb — **spec 20rb menang**.
- Affiliate rate 2% match PHP lama.
- API key generate + regenerate di `/akun` sudah ada (`akun/+page.server.ts:88`).
- CSP/rate-limit auth sudah ada.

---

## STATUS FIX (update 26 Agu 2026, sesi 2)

| ID | Status | Catatan |
|---|---|---|
| B-01 | 🟡 File CSV dihapus dari repo; **.gitignore sudah cover `api-keys*.csv`**; **USER WAJIB revoke/rotate key di dashboard Resend** (tokennya sempat tercatat di sesi) | buat key baru → taruh di `.env` saja |
| B-02 | ✅ FIXED | `SOCIO_DEPOSIT_BONUS=0.10`; `deposits.amount` = postAmount + bonus (paritas PHP lama); UI tampilkan bonus & "saldo yang masuk" |
| B-03 | ✅ FIXED | `status`/`refill` cari by `orders.oid`; response return `oid` |
| B-04 | ✅ FIXED | redirect 301 `/register`→`/daftar` (+query); 6 file landing diganti ke `/daftar` |
| B-05 | ✅ FIXED | `app/src/routes/api-docs` dibuat; `landing/src/pages/blog/index.astro` placeholder dibuat |
| B-07 | ✅ FIXED | max 2 deposit Pending per user di top-up |
| B-08 | ✅ FIXED | suffix acak 111–999 per deposit + HMAC signature (anti-tamper); sheet pakai nominal dari server |
| B-09 | ✅ VERIFIED | `cron/light.ts` expire SEMUA deposit Pending lewat `expire` (termasuk reseller 12 jam) |
| B-11 | ✅ FIXED | klaim banner dashboard kini benar karena B-02 diimplementasi |
| B-14 | ✅ FIXED | API tolak user `Blacklist` / `status!=="1"` |
| B-06 | OPEN | Tripay webhook belum ada (roadmap M4) |
| B-10 | BY DESIGN | affiliate antrian approval — jelaskan di FAQ |
| B-12 | OPEN | landing hardcode domain (staging test) |
| B-13 | OPEN | rate-limit API masih per-IP (per-key later) |
| B-15 | OPEN | audit `profit` legacy di order API |

---

## CHECKLIST SEBELUM DEPLOY
- [x] **B-01** hapus CSV + gitignore — **SISA: revoke key di Resend dashboard (butuh user)**
- [x] **B-02** implement bonus 10% deposit
- [x] **B-03** fix API oid/id lookup
- [x] **B-04** redirect /register → /daftar
- [x] **B-05** api-docs + blog 404
- [x] **B-07/B-08** pending limit + random suffix
- [ ] Smoke test end-to-end (daftar member, daftar reseller→admin approve→20rb, deposit+bonus, order web, order API status)

---

## 🟣 Sesi 4 (26 Agu 2026, lanjut test) — Tambah 5 P0 fixed + 8 gap

### V-01 — Email verification tidak pernah set `users.verify='Yes'`  ⚠️ P0
- **Lokasi**: `app/src/routes/(auth)/verifikasi/+page.server.ts`
- **Gejala**: klik link verifikasi di email → page sukses, tapi `users.verify` tetap `No`. Login diblokir 403 "Email belum diverifikasi."
- **Root cause**: `auth.api.verifyEmail({query:{token}})` di better-auth 1.2.7 menjalankan `jwtVerify(token, secret)` (ekspektasi **JWT**). `sendMemberVerificationEmail` insert token hex mentah → `jwtVerify` gagal → caught → ok:false.
- **Fix**: verifikasi custom via DB di `verifikasi/+page.server.ts` — lookup by `value=token` + identifier `email-verification:*` + not expired → `UPDATE users SET verify='Yes'` + `DELETE verifications`. Plus cleanup token lama di `signup.ts` agar 1 email = 1 token aktif.
- **Verified**: signup memberqa → verifikasi dengan token dari DB → `verify=Yes` → login 200.

### V-DEP2 — Admin confirm deposit selalu 409 "DEPOSIT_NOT_PENDING"  ⚠️ P0
- **Lokasi**: `app/src/routes/(admin)/admin/deposits/+page.server.ts:131-138`
- **Gejala**: admin klik "Konfirmasi" di /admin/deposits → 409 "Deposit sudah dikonfirmasi sebelumnya." tapi deposit status masih `Pending`, balance belum dikredit.
- **Root cause**: `tx.execute(sql\`…\`)` di drizzle-mysql return `[ResultSetHeader, FieldPacket[]]`. Kode lama baca `upd.affectedRows` di array → undefined → `?? 0 = 0` → throw `DEPOSIT_NOT_PENDING` → transaction rollback.
- **Fix**: handle `Array.isArray(upd)` sebelum baca `.affectedRows`. Pattern sama sudah dipakai `pesanan/+page.server.ts` & `api/webhook/midtrans/+server.ts`.
- **Verified**: confirm #1975 → status Success, balance += 110.304 (bonus 10% included), audit_log entry.

### V-DEP3 — Deposit reseller (50k aktivasi) keliru dikredit sebagai saldo  ⚠️ P0 (business rule)
- **Lokasi**: same file, baris `balance += d.amount`.
- **Gejala**: reseller bayar 50k untuk aktivasi, setelah admin confirm reseller terima `50rb + 20rb = 70.702` saldo. Tapi `docs/RESELLER_PAGE_SPEC.md` Rule #1/#4: 50rb = **biaya aktivasi**, saldo awal cuma `SOCIO_RESELLER_BONUS=20rb`.
- **Fix**: skip generic credit jika `d.untukApa === 'reseller'`. Hanya flip status; `activateReseller` (post-commit) yang set verify='Yes' + credit 20rb.

### V-DEP4 — Side effect `activateReseller` dead-lock dengan outer tx  ⚠️ P0
- **Lokasi**: same file, side effect di dalam `db.transaction()` block.
- **Gejala**: `activateReseller` gagal dengan `Failed query: update users set verify = ? where users.id = ? params: Yes,5674`. Reseller tidak pernah ter-verify.
- **Root cause**: outer tx pegang row lock `users id=X` (untuk `balance +=`). `activateReseller` pakai global `db` pool (connection lain) → lock conflict.
- **Fix**: pindahkan `activateReseller` / `creditAffiliateCommission` ke **post-commit** (di luar `db.transaction`).
- **Verified**: confirm deposit reseller #1978 → verify=Yes, balance=20.000 (cuma bonus), email welcome terkirim.

### V-LOGIN-SUSPENDED — Login tidak gate status='0' / 'Blacklist'  ⚠️ P1
- **Lokasi**: `app/src/routes/(auth)/login/+page.server.ts`
- **Gejala**: admin suspend user → user masih bisa login & akses /saldo/top-up.
- **Fix**: tambah gate sebelum `setSocioSessionCookie`. Return 403 `Akun kamu disuspend` / `Blacklist`.
- **Verified**: create user → suspend via admin → login → 403 (sebelumnya 303 → /).

### Bug tetap ada (belum fix / bukan blocker deploy)
| Label | Severity | Note |
|---|---|---|
| G-1 auth.fields emailVerified mapping ke varchar | Medium | `users.verify` varchar Yes/No + better-auth boolean true/false → tulis langsung akan jadi "1" bukan "Yes". Sesi ini mitigasi dengan verifikasi custom (V-01), tapi `auth.fields` mapping di `auth.ts:80` masih ada. Sebaiknya hapus mapping atau migrate kolom ke boolean. |
| G-2 8 admin page 404 | Scope M3 | audit-log, pricing-rules, reports, email-templates, maintenance, notify, api-keys, loyalty. Path di rebuild sudah di-rename (audit, pricing, reporting, email). Konfirmasi owner mana yang masih dipakai. |
| G-3 Cron belum dijadwalkan | Medium | `app/src/cron/refund.ts` aman, tapi belum ada `node-cron` schedule. Wajib di process VPS. |
| G-4 Saldo SMMturk $5.16 | Blocker prod | Top-up dulu sebelum launch order. |
| G-5 Resend verify domain | Blocker deploy | SPF + DKIM + DMARC di Cloudflare DNS belum di-setup (kalau pakai `noreply@socio.id`). |
| G-6 Resend key rotation | Blocker deploy | Sisa B-01 — key `re_AY22...` masih aktif di app/.env, wajib rotate. |
| G-7 Maintenance mode | Low | Belum ada toggle `/admin/maintenance`. Tambah inline `if (MAINTENANCE_MODE) redirect` di hooks. |
| G-8 Edge rate-limit Cloudflare | Low | Rate-limit per-IP saat ini DB-store. Tambah WAF rule di Cloudflare untuk endpoint sensitif. |

### Lihat juga
- `docs/TEST_REPORT.md` — bukti lengkap user flow + admin flow test, PHP vs rebuild parity table
- `docs/VPS_DEPLOY_CHECKLIST.md` — checklist deploy VPS (env, Resend, Turnstile, SMMturk, cron, smoke test, rollback)
