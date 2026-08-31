# AGENT CONTEXT — Socio.id Rebuild (memory untuk agent selanjutnya)

> Dibuat: 2026-08-26 (sesi audit ke-2). Ini ringkasan agar agent berikutnya langsung
> nyambung tanpa baca semua. SELALU baca `REBUILD_PLAN.md` + `AGENTS.md` dulu.

## 0) Posisi milestone
- M0–M3 sudah jalan (auth, DB, design, user app, admin, cron, email). Belum M4 full, M5 landing, M6 email, M7 cutover.
- Status terakhir git: banyak file modified (cron, admin, deposit, pricing, signup, dll) — cek `git status` sebelum lanjut.

## 1) KEPUTUSAN USER (penting, jangan dilanggar)
- **Deposit bonus 10% WAJIB ada** (PHP lama `add-action.php:35` kasih +10%). Rebuild BELUM ada → lihat `docs/BUG_REPORT.md` B-02.
- **Reseller**: biaya **Rp50.000**, detail rekening dikirim email, **admin approve manual**, saldo awal **Rp20.000** (sudah benar di `signup.ts`, jangan ubah ke 30rb seperti PHP lama!).
- **API system**: user punya API key (di `/akun`), endpoint `api/v1` (services/order/status/refill/profile). PHP lama juga punya `api/*`.

## 2) BUG KRITIS (P0 — sudah difix sesi 26 Agu 2026)
1. **B-01 Resend API key bocor** — file `api-keys-*.csv` **sudah dihapus** (gitignore sudah cover). ⚠️ **SISA: user harus revoke/rotate key di dashboard Resend** (token sempat tercatat di chat sesi).
2. **B-02 Bonus deposit 10%** — ✅ FIXED: `SOCIO_DEPOSIT_BONUS=0.10` di `.env.example`; `saldo/top-up/+page.server.ts` simpan `deposits.amount = postAmount + bonus`; UI tampil bonus + "saldo yang masuk"; admin confirm tidak perlu diubah (kredit `d.amount`).
3. **B-03 API oid lookup** — ✅ FIXED: `api/v1/+server.ts` status/refill cari by `orders.oid`, response return `oid`. Juga B-14: authByKey tolak `Blacklist`/`status!=="1"`.
4. **B-04 /register 404** — ✅ FIXED: redirect 301 `app/src/routes/register/+server.ts` (preserve query `?mode=reseller`); 6 file landing diganti ke `/daftar`.
5. Bonus fix: **B-07** max 2 pending deposit; **B-08** suffix acak 111-999 per deposit + HMAC (secret `SOCIO_AUTH_SECRET`); **B-05** `/api-docs` (app) + `/blog` placeholder (landing).
6. Halaman reseller: **BUILD** `landing/src/pages/reseller.astro` (rules Rp50k + saldo 20rb + approve manual).
- Semua detail: `docs/BUG_REPORT.md` (ada tabel STATUS FIX).
- Verifikasi: `app check` 0 error, `app lint` 0 error, `app build` OK, `landing build` 3 pages OK.

## 3) DOKUMEN BARU (sesi ini)
- `docs/BUG_REPORT.md` — konsolidasi bug + CSV leak + API bug + 10% bonus.
- `docs/DASHBOARD_UIUX_AUDIT.md` — premium + repeat-order (saved qty, "Pesan Lagi" 1-tap, empty-state, dark mode, AA contrast).
- `docs/LANDING_AUDIT.md` — section list, urutan (FinalCTA harus SETELAH FAQ), broken link (api-docs, /blog), claim angka.
- `docs/RESELLER_PAGE_SPEC.md` + **BUILD** `landing/src/pages/reseller.astro` (halaman penjelasan reseller, copywriting premium, rules).
- `docs/SMM_STANDOUT_RESEARCH.md` — riset referensi standout (whitelabel child panel, drip-feed, QRIS, API docs, blog SEO, AI-native).

## 4) FLOW LAMA vs REBUILD (ringkas)
- **Deposit**: lama BCA+Tripay+bonus10%; rebuild BCA manual ONLY + NO bonus (gap B-02), expire 24j (lama 3j), suffix deterministik (lama random — B-08).
- **Reseller**: lama saldo 30rb; rebuild 20rb (spec user menang).
- **Affiliate**: lama 2% langsung ke `balance_reff` (user withdraw sendiri); rebuild 2% ke antrian `affiliate` → admin approve (intentional, G-control).
- **Admin deposit confirm**: rebuild LEBIH aman (idempoten + transaksi atomik, A-05 fixed). Lama bisa double-credit.
- **API**: rebuild lebih lengkap (JSON+form, rate-limit) tapi ada bug lookup (B-03).

## 5) HAL YANG SUDAH AMAN (jangan utak-atik)
- Admin deposit confirm idempoten ✅
- Reseller flow match spec ✅
- Affiliate rate 2% ✅
- API key self-service `/akun` ✅
- CSP/rate-limit auth ✅

## 6) NEXT STEPS (urut)
1. ⚠️ **USER ACTION**: revoke/rotate Resend key di dashboard (sisa B-01), ganti `RESEND_API_KEY` di `.env` prod.
2. ⚠️ **USER ACTION**: top-up saldo SMMturk (saat ini $5.16, blocker order prod).
3. ⚠️ **DEPLOY PRE-FLIGHT**: baca `docs/VPS_DEPLOY_CHECKLIST.md` — ada 8 gap (G-1..G-8 di BUG_REPORT) yang harus close sebelum cutover.
4. Polish dashboard (checklist `docs/DASHBOARD_UIUX_AUDIT.md`: Pesan Lagi 1-tap, saved defaultQty, empty-state).
5. Landing: pindah FinalCTA setelah FAQ, audit claim angka.
6. Roadmap M4: Tripay webhook (B-06), rate-limit API per-key (B-13), affiliate UX docs (B-10), cron schedule (G-3).

## 9) SESSI 4 (26 Agu, lanjut test) — 5 P0 bugs FIXED + lapor lengkap
**Test E2E lokal — semua hijau** (HTTP + DB evidence). Order provider tidak diuji (uang).

### Bug P0 yang ditemukan & diperbaiki
| # | Label | Fix di |
|---|---|---|
| V-01 | Email verification (better-auth JWT vs raw token) → verify tidak pernah Yes, login 403 | `app/src/routes/(auth)/verifikasi/+page.server.ts` — verifikasi custom via DB |
| V-DEP2 | Admin confirm deposit selalu 409 (affectedRows undefined dari drizzle array) | `app/src/routes/(admin)/admin/deposits/+page.server.ts:131-138` — handle Array.isArray |
| V-DEP3 | Deposit reseller 50k aktivasi keliru dikredit sebagai saldo (vs RESELLER_PAGE_SPEC: 50k = fee, saldo 20k) | same file — skip generic credit untuk reseller |
| V-DEP4 | activateReseller deadlock di dalam tx (row lock conflict) | same file — side effects ke post-commit |
| V-LOGIN-SUSPENDED | Login tidak gate status='0' / 'Blacklist' | `app/src/routes/(auth)/login/+page.server.ts` |

### Test yang lewat end-to-end
✅ Member signup → verifikasi email → login → topup bonus 10% (100rb → +110rb) → limit 2 pending → admin confirm deposit → audit log → tiket create/reply/close → suspended user diblok 403.
✅ Reseller signup → deposit Pending (untuk_apa=reseller, target BCA, expire 12h) → admin confirm → verify=Yes + saldo 20rb (TANPA kredit 50rb fee) → welcome email.
✅ Admin: adjust saldo (+15rb/-5rb), setLevel (Reseller→Agen), suspend/unsuspend toggle, audit log 9 entries.
✅ Sweep 16 halaman admin semua 200.

### Verifikasi build
`pnpm --filter app check` → 0 errors 52 warnings • `lint` → 0 errors 554 warnings • `build` → ✓ 47.60s (adapter-node).

### Docs ditulis sesi ini
- **`docs/TEST_REPORT.md`** (261 baris) — scope, env, user flow evidence, admin flow evidence, bug tabel, PHP parity table, lampiran DB.
- **`docs/VPS_DEPLOY_CHECKLIST.md`** (356 baris) — prasyarat service, env vars (B.1-B.8), Cloudflare setup, Coolify Dockerfile, TiDB migration, Resend email verification, SMMturk top-up, smoke test 10 step, rollback plan.
- **`docs/BUG_REPORT.md`** updated — sesi 4 appended (V-01..V-LOGIN-SUSPENDED + G-1..G-8 gap).

### Akun test tersisa di DB lokal
- 5672 memberqa1787725708 (Member, verify=Yes, balance=120.304 setelah adjust)
- 5673 resellerqa1787725708 (Agen setelah setLevel test, verify=Yes, balance=20.000)
- 5674 reseller2qa1787725708 (Reseller, verify=Yes, balance=20.000)
- 5675 suspqa (Member, status=1, balance=0, setelah unsuspend)
Deposit 1975 Success • 1976 Pending • 1977/1978 Success (reseller).
Tiket 1787726885460 Closed.
Audit log 9 entries.

## 8) QUICK WIN DONE + SMMturk verify (26 Agu, sesi 3)
**SMMturk API — LIVE-TESTED dari lokal (key valid):**
- `balance` → **$5.16 USD** (RENDAH — top up dulu!)
- `services` → **8.285 layanan aktif**, **444 support refill**, 3306 support cancel
- `add/status/refill/refill_status/cancel` semua action dikenali (dummy id → error spesifik, bukan "unknown action")
- Client `packages/core/src/smmturk.ts` sudah lengkap — tidak perlu ubah.

**Quick win landing SELESAI:**
- Hero USP: "Bonus 10% tiap top up", "garansi refill layanan ber-badge", "proses otomatis", "API reseller"
- `TrustBadges`: Proses Kilat / **Bonus 10%** / **Garansi Refill** / Transaksi Aman
- `Faq` umum: + "Apakah ada bonus deposit?" (10%), refill policy transparan (badge 🔄, tombol Refill di Pesanan, gagal=saldo balik full), top-up BCA+kode unik (bukan QRIS/e-wallet — copy lama salah), reseller Rp50k/saldo20k + link /reseller
- Angka layanan di FAQ: 8.285 (live count). Claim "8.185+" di hero tetap valid.
- Copy refill **jujur**: hanya layanan ber-badge refill (444 dari 8.285) — jangan klaim "refill otomatis semua".

**Smoke test lokal LOLOS (dev :3000, DB lokal hidup):**
- `/register?mode=reseller` → 301 → `/daftar?mode=reseller` ✅
- `/daftar` 200, `/api-docs` 200 ✅
- `/api/v1` GET → info JSON; POST `services/profile/status` pakai key asli DB → `status:true` ✅
- `pnpm --filter app lint/check/build` 0 error; `landing build` 3 pages (/, /reseller, /blog) ✅

## 7) ENV kritis (lihat `.env.example`)
`SOCIO_DB_URL` (TiDB), `SOCIO_AUTH_SECRET` (fresh), `SOCIO_APP_URL`/`BETTER_AUTH_URL` (https),
`RESEND_API_KEY`, `SOCIO_BCA_NUMBER`/`SOCIO_BCA_NAME`, `SOCIO_RESELLER_BONUS=20000`,
`SOCIO_AFFILIATE_RATE=0.02`, `SOCIO_SMMTURK_KEY`, `SOCIO_CRON_ENABLED=1` (VPS).
