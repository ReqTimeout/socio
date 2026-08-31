# Audit Flow User — Socio.id Rebuild

> **Scope:** daftar (member/reseller), login, lupa-password → reset, verifikasi email, session. Fokus: apa yang siap, apa yang masih bug/gap, dan apa yang wajib diisi sebelum deploy VPS.
> Tanggal audit: 2026-08-26. Codebase: `app/src/routes/(auth)/*`, `lib/server/{signup,auth,email,session,rate-limit}`. Env ref: `.env.example` + `app/.env` (local).

---

## 1) Hasil verifikasi flow (yang sudah jalan)

| Flow | Status | Catatan |
|---|---|---|
| **Daftar Member** `POST /daftar` mode=member | ✅ Jalan | Validasi field, blok disposable email (`disposable-emails.ts:6`), rate-limit 5/15m, turnstile (env-gated), insert `users` + `accounts` + email verifikasi 24 jam. Patched 26 Agu: sisa `format.ts`/`signup.ts` unused vars fixed, prettier passed, `check` 0 error, `build` OK. |
| **Daftar Reseller** `POST /daftar` mode=reseller | ✅ Jalan | Buat user level=Reseller `verify=No` + deposit `Pending` `untuk_apa=reseller` `amount=50000+111..999` + email instruksi BCA. Aktivasi saat admin confirm deposit (`activateReseller` kredit Rp20.000 + email selamat datang). Biaya & saldo termasuk sudah benar (net 50k). |
| **Referral** `?r=username` → cookie `r_pr` 10 hari → `up_link` | ✅ Jalan | Ditangani di `daftar/+page.server.ts:23` (redirect tanpa query + validasi username exists). |
| **Login** `POST /login` | ✅ Jalan | Rate-limit 30/5m, turnstile env-gated, lookup `users`+`accounts` (credential), `bcrypt.compareSync`, `maybeRehashPassword`, buat `sessions` + `socio_session` cookie (custom, bukan better-auth). Admin → `/admin`, selain itu → `/`. Playwright verified (testadmin → dashboard, FAB muncul). |
| **Lupa password** `POST /lupa-password` | ✅ Jalan | Rate-limit 5/15m, turnstile env-gated, `auth.api.forgetPassword` dengan `redirectTo=/reset`, selalu return success (anti-enumeration). |
| **Reset password** `GET /reset?token=` + `POST /reset` | ✅ Jalan | Guard `if !token → /login`, validasi `password>=8` + `confirm==password`, `auth.api.resetPassword` lalu redirect `/login?reset=1`. |
| **Verifikasi email** `GET /verifikasi?token=` | ✅ Jalan | `auth.api.verifyEmail` dengan token, return `{ok:true/false}` → UI ✅/⚠️. Link dari `sendMemberVerificationEmail` (`/verifikasi?token=` 24h). |
| **Session** `socio_session` | ✅ Jalan | `hooks.server.ts` custom `readSocioSession` (direct Drizzle lookup) + fallback `auth.api.getSession`. 30 hari, updateAge 1 hari. |

---

## 2) Checklist deploy VPS (apa yang WAJIB diisi)

> Lihat `.env.example:1` untuk template. Jangan copy `app/.env` (localhost) ke VPS mentah-mentah.

**Wajib (app tidak jalan tanpa ini):**

| Env | Local saat ini | VPS harus isi apa |
|---|---|---|
| `SOCIO_DB_URL` | `mysql://socio_app@127.0.0.1:3306/socio_smm` | URL **TiDB Serverless Singapore** (bukan localhost). Format: `mysql://user:pass@gateway01...tidbcloud.com:4000/socio_smm?sslmode=require`. Pastikan TiDB user punya CREATE di `rate_limits`/`sessions` (auto-create di `rate-limit.ts:19`). |
| `SOCIO_AUTH_SECRET` | `jqbBRM9y...` (local) | **Ganti** random 32+ char baru untuk prod (jangan reuse local). Kalau diganti setelah ada `provider_services` ter-encrypt, set juga `SOCIO_PROVIDER_ENC_KEY` (lihat `.env.example:8`). |
| `SOCIO_APP_URL` | `http://localhost:3000` | `https://app.socio.id` — **wajib HTTPS untuk email link** (verifikasi & reset). Kalau masih localhost, email verifikasi/reset akan link ke localhost dan gagal di prod. |
| `BETTER_AUTH_URL` | `http://localhost:3000` | Set sama dengan `SOCIO_APP_URL` (`https://app.socio.id`). Kalau beda, `better-auth` generate token dengan base URL salah. |
| `RESEND_API_KEY` | `re_AY22...` (local, valid) | Isi key Resend prod yang verified domain `socio.id`. **Wajib** untuk M6 email flow; tanpa ini `sendEmail:19` cuma `console.info` di `dev` dan mengembalikan `false` — user daftar/reset tetap redirect sukses tapi **tidak dapat email** (silent fail). |
| `SOCIO_MAIL_FROM` | `noreply@socio.id` | Pastikan domain sudah verified di Resend (SPF/DKIM). Kalau belum, email masuk spam / ditolak. |

**Opsional tapi disarankan:**

| Env | Default | Rekom prod |
|---|---|---|
| `SOCIO_TURNSTILE_ENABLED` | `0` (off, safe) | `1` hanya jika sudah punya **production sitekey/secret** untuk `app.socio.id`. Jangan pakai test key `0x4AAAAA...` (`app/.env:15`) di prod — akan blokir semua login/daftar (`verifyTurnstile:30` return false). |
| `SOCIO_SECURE_COOKIES` | `0` | `1` di prod (HTTPS). Kalau 0 di prod, cookie `socio_session` bisa dikirim lewat HTTP (lihat `session.ts:30`). |
| `SOCIO_CRON_ENABLED` | `0` lokal | `1` di VPS (Coolify). Kalau 0, `provider-sync` & `status-polling` tidak jalan. |
| `R2_*` + `CF_ACCOUNT_ID` | sudah terisi (cdn.socio.id) | Pastikan `R2_PUBLIC_URL=https://cdn.socio.id` sudah CNAME ke R2 custom domain (skill `cloudflare`). |
| `VAPID_*` | terisi | Butuh untuk web push (M6). Tanpa ini, push subscription gagal. |
| `SOCIO_SMMTURK_KEY` | `cc9076...` | Wajib jika cron provider-sync mau jalan. |
| `SOCIO_BCA_NUMBER` / `SOCIO_BCA_NAME` / `SOCIO_RESELLER_BONUS` | fallback hardcoded `1392680815` / `Awangga Ramadhi` / `20000` (`signup.ts:151`) | Isi di VPS biar tidak hardcoded — memudahkan ganti rekening tanpa deploy. |
| `MIDTRANS_*` / `TRIPAY_*` | hanya client/server key terisi parsial | Lengkapi jika pakai payment gateway. |

**Infra VPS (REBUILD_PLAN §Hosting):**
- Image: SvelteKit `adapter-node` (bukan Cloudflare Workers — no MySQL TCP).
- Port: `3000` (Coolify mapping).
- Healthcheck: `GET /` (butuh DB, akan 503 jika TiDB unreachable — lihat `hooks.server.ts:57` fallback).
- Cron: jalan di process yang sama (`hooks.server.ts:14` `startCron()` saat `SOCIO_CRON_ENABLED=1`). No Redis.

---

## 3) Bug / Gap ditemukan

### P0 — blokir user / deploy

| ID | Severity | Lokasi | Temuan | Dampak | Fix |
|---|---|---|---|---|---|
| U-01 | **P0** | `app/.env:15` / `.env.example:31` | Test Turnstile key `0x4AAAAAAD3RtU...` terbawa ke prod jika `SOCIO_TURNSTILE_ENABLED=1` | Semua daftar/login/lupa-password akan `400 Verifikasi humans failed` karena test key tidak valid untuk `app.socio.id` | Sebelum deploy: ganti `SOCIO_TURNSTILE_SITEKEY/SECRET` dengan production keys dari Cloudflare, atau biarkan `SOCIO_TURNSTILE_ENABLED=0` |
| U-02 | **P0** | `signup.ts:29` / `hooks.server.ts:41` | `users.verify` masih enum legacy (`"Yes"/"No"`) dan tidak pernah di-check saat login | User yang belum verifikasi email tetap bisa login penuh ke `/` dan pesan/order — verifikasi jadi opsional tanpa gate | **Putuskan**: jika verifikasi wajib, tambah guard di `login/+page.server.ts:48` → `if user.verify!=="Yes" return fail(403, resend link)` atau tampilkan banner di `app/+layout.svelte` |
| U-03 | **P0** | `auth.ts:24` | `requireEmailVerification: false` | Sama dengan U-02 — better-auth tidak enforce verifikasi | Sinkron dengan U-02 |
| U-04 | **P1** | `email.ts:19` | `sendEmail` fail silent (`return false`) di prod jika `RESEND_API_KEY` kosong / domain belum verified | User daftar & lupa-password terlihat sukses (redirect) tapi tidak menerima email — support ticket membengkak | Tambah fallback UI: jika `sendEmail` false, tampilkan `flash: "Email gagal terkirim, hubungi admin"` atau jobs retry ke `job_queue` |

### P1 — UX / keamanan

| ID | Lokasi | Temuan | Dampak | Fix |
|---|---|---|---|---|
| U-05 | `lupa-password/+page.server.ts:38` | Anti-enumeration benar, tapi tidak ada cooldown UI | User bisa spam klik "Kirim link reset" 5x lalu baru kena 429 — tidak ada feedback "cek email (termasuk spam)" yang jelas | Tambah `toast("Jika terdaftar, link sudah dikirim — cek spam")` dan disable button 60s setelah success |
| U-06 | `verifikasi/+page.server.ts:8` | `new Headers()` kosong saat `auth.api.verifyEmail` | Token verification tidak mengirim `x-forwarded-for`/cookies — bisa gagal di rate-limit atau audit IP | Kirim `event.request.headers` seperti `lupa-password:41` |
| U-07 | `disposable-emails.ts:6` | Blocklist 40 domain, tapi miss domain populer baru (`tempmail.lol`, `mail.tm`, `1secmail.*`, `proton` disposable tier) | User masih bisa pakai temp mail lolos | Tambah 30-50 domain dari `disposable-email-domains` npm atau API check |
| U-08 | `signup.ts:32` | Username sanitasi `replace(/[^a-z0-9]/g,"")` tanpa cek panjang setelah sanitasi | Input `a@b` → `ab` (2 char) lolos validasi awal `>=3` tapi jadi 2 char setelah sanitasi — DB insert tetap jalan dengan username pendek | Validasi ulang `username.length>=3` setelah sanitasi (sudah ada throw di `createUserRow:35` tapi error message tidak diteruskan cantik ke form — jadi 400 generic) |
| U-09 | `rate-limit.ts:41` | Window dihitung via `Math.floor(now/windowSec)*windowSec` (fixed window), bukan sliding | Burst di boundary window bisa 2× limit (mis. 5 di detik 899 + 5 di detik 901) | Ganti ke sliding window via `INSERT ... ON DUPLICATE` + `count` masih fixed — acceptable untuk auth (low risk). Catat saja. |
| U-10 | `hooks.server.ts:177` | CSP `connect-src 'self' https: wss:` terlalu longgar | Izinkan koneksi ke host mana pun — kurang ketat untuk panel yang hanya butuh Resend + SMMturk | Ketatkan ke `https://api.resend.com https://smmturk.org https://challenges.cloudflare.com` |
| U-11 | `session.ts:30` | `SOCIO_SECURE_COOKIES` default `0` | Cookie `socio_session` tidak `Secure` di prod (rentan sniff di downgrade) | Set `1` di VPS + pastikan `SOCIO_APP_URL` https — sudah ada di checklist §2 |

### P2 — improvement (tidak blokir)

| ID | Lokasi | Temuan | Usulan |
|---|---|---|---|
| U-12 | `daftar/+page.svelte:191` | Field WhatsApp tidak ada mask / contoh `62812...` + validasi `10-14 digit` hanya server | Tambah `inputmode=numeric` sudah ada, tapi butuh live hint "08 → 628..." di client |
| U-13 | `login/+page.svelte:1` | Tidak ada link "Kirim ulang verifikasi" | Jika `verify=="No"` (U-02), tampilkan banner "Email belum verifikasi — kirim ulang" → `POST /verifikasi/resend` |
| U-14 | `reset/+page.svelte:1` | Token dari URL tidak di-mask | Tambah info "Link berlaku 1 jam, sekali pakai" (sudah ada di email, tapi tidak di halaman) |
| U-15 | `signup.ts:135` | `suffix 111..999` random untuk reseller, tapi user bisa salah transfer (mis. 50000 tanpa suffix) | Admin sudah harus manual match; pertimbangkan Midtrans VA untuk reseller (otomatis) |
| U-16 | `app/.env:3` | `SOCIO_DB_URL` masih localhost — mudah ter-copy ke prod | Tambah `SOCIO_DB_URL_TIDB=` kosong di `.env.example:18` sebagai placeholder TiDB yang jelas |

---

## 4) Langkah verifikasi sebelum cutover (checklist tester)

1. **Daftar Member** di `https://app.socio.id/daftar` (mode Akun Gratis) → cek email verifikasi masuk (Resend dashboard) → klik `/verifikasi?token=` → harus ✅ → login sukses → `users.verify` jadi `Yes` (atau `verifications` row consumed).
2. **Daftar Reseller** di `/daftar` (toggle Jadi Reseller + WA) → cek email instruksi BCA (Rp50.xxx) → deposit `Pending` muncul di `/admin/deposits` → confirm → `users.verify=Yes` + `balanceLogs +20000`.
3. **Login** salah password → `401 Email atau password salah` (jangan bocorkan "email tidak ada").
4. **Lupa password** → masukkan email terdaftar → cek email reset → klik `/reset?token=` → reset → login dengan password baru sukses. Token tidak bisa dipakai 2×.
5. **Disposable email** → daftar dengan `yopmail.com` harus `400 Gunakan email asli`.
6. **Rate limit** → 6× daftar dari IP sama dalam 15m harus `429`.
7. **Turnstile** (jika diaktifkan) → daftar tanpa token harus `400 Verifikasi humans failed`.

---

## 5) Perubahan yang sudah masuk sesi ini (26 Agu 2026)

- Fix 8 error ESLint P0 di 5 file (`format.ts`, `signup.ts`, `admin/news`, `admin/pricing`, `app/pesan`, `pesan/coupon`) — `pnpm --filter app check` sekarang 0 error.
- `prettier --write` di `app` + `@socio/ui` — 44 file diformat.
- `Fab.svelte` → single responsive FAB (mobile 151×44, desktop 197×58, `lgLabel="Pesan Sekarang"`, posisi `right:28 bottom:28` desktop).
- `+layout.svelte` → pakai 1 `Fab` (hapus duplikat desktop inline + `:global(.fab-desktop)`).
- `primitives.css` → `card-lift` & `surface-pop` konsisten, `motion.ts` `hoverLift="card-lift"`.
- `/saldo/*` polish (shadow dedupe, top-up ringkasan, reseller flow).
- Email template Resend sudah ada (`verificationEmail`, `resetPasswordEmail`, `sendResellerInstructionsEmail`, `activateReseller`).
- Dev server masih di `http://localhost:5199` (butuh login `testadmin@socio.local / admin123` yang di-seed untuk Playwright — sudah di-cleanup setelah verifikasi, buat ulang jika perlu).

> **Next:** isi env VPS sesuai §2, lalu `pnpm --filter app build` di VPS dan `pnpm --filter app lint && pnpm --filter app check` harus 0 error sebelum `git push vps/main`.

---

## 6) ADDENDUM — Bandingkan dengan PHP lama (audit 26 Agu 2026, sesi 2)

> Fokus user: deposit bonus 10%, sistem API, reseller, affiliate. Ref: `docs/BUG_REPORT.md`.

### 6.1 Deposit — bonus 10% HILANG di rebuild ❌ (P0, lihat BUG B-02)
| Item | PHP lama | Rebuild |
|---|---|---|
| Bonus | `+10%` (`add-action.php:35` `$random=10`) | **tidak ada** — `top-up/+page.server.ts` kredit `d.amount` mentah |
| Min deposit | Rp20.000 | Rp20.000 ✅ |
| Max deposit | (tidak ada) | Rp10.000.000 |
| Metode | BCA manual + Tripay (VA/QRIS) | BCA manual ONLY (Midtrans disabled) |
| Unique code | `rand(111,999)` acak | `100+(userId*7%900)` deterministik ⚠️ (BUG B-08) |
| Expire | 3 jam | 24 jam |
| Limit pending | max 2 pending | tidak dibatasi ⚠️ (BUG B-07) |
| Auto-confirm | cekmutasi (legacy) | manual admin |

**Keputusan**: implementasikan bonus 10% via `SOCIO_DEPOSIT_BONUS=0.10` + simpan
`creditedAmount` di `deposits`, kredit itu di confirm.

### 6.2 Sistem API publik — rebuild LEBIH lengkap, tapi ada bug lookup (P0, BUG B-03)
| Item | PHP lama (`api/*-edit.php`) | Rebuild (`api/v1/+server.ts`) |
|---|---|---|
| Endpoint | order, status, services, profile, refill, refill-status | order, status, services, profile, refill ✅ |
| Auth | `api_key` di `users.api_key` (generate saat daftar) | sama ✅, display+regenerate di `/akun` ✅ |
| Format | form-encoded `action`+`api_key` | JSON **atau** form ✅ (lebih fleksibel) |
| Pricing per level | Member=`price`, Reseller=`price_reseller`, Agen=`price_api` | pakai `pricing.ts` rules ✅ (lebih konsisten) |
| Rate limit | tidak ada | 60/ip/menit ✅ (tapi per-IP not per-key, BUG B-13) |
| **Bug** | — | return `oid`, cari by `id` → status/refill selalu not found ❌ |

**Fix B-03**: `handleStatus`/`handleRefill` cari by `orders.oid`.

### 6.3 Reseller — rebuild SUDAH match spec (20rb), PHP lama 30rb
| Item | PHP lama | Rebuild | Spec user |
|---|---|---|---|
| Biaya | Rp50.000 + suffix | Rp50.000 + suffix ✅ | 50.000 ✅ |
| Rekening dikirim email | ya (BCA 1392680815) | ya ✅ | ya ✅ |
| Admin approve manual | ya (confirm.php) | ya ✅ | ya ✅ |
| Saldo awal reseller | **Rp30.000** (hardcode `confirm.php:23`) | **Rp20.000** (`SOCIO_RESELLER_BONUS=20000`) | **20.000** ✅ |
| Verify | `No`→`Yes` saat confirm | sama ✅ | — |

→ Rebuild BENAR menurut spec user. PHP lama salah (30rb). Catat di changelog.

### 6.4 Affiliate — rate 2% sama, UX antrian beda
| Item | PHP lama | Rebuild |
|---|---|---|
| Rate | 2% dari deposit referral | 2% (`SOCIO_AFFILIATE_RATE=0.02`) ✅ |
| Tujuan | langsung ke `balance_reff`, user withdraw sendiri (min Rp5rb) | ke tabel `affiliate` status `Pending` → **admin approve** |
| Withdraw | `affiliasi/wd.php` langsung convert | `/admin/affiliate` approve → masuk saldo |

→ Intentional (G-control). Harus dijelaskan di FAQ supaya reseller lama tidak bingung.

### 6.5 Kesimpulan gap user-facing (pre-deploy)
1. **Bonus 10% deposit** — MUST implement (B-02).
2. **API status/refill** — MUST fix lookup (B-03).
3. **Reseller** — already correct, but BUTUH halaman penjelasan di landing (lihat `docs/RESELLER_PAGE_SPEC.md`).
4. **Affiliate** — ok, but dokumentasikan perubahan UX.
