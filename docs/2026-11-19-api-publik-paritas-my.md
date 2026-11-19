# Jurnal — API Publik Paritas socio.my (14 Action) — 19 Nov 2026

> **Status: LIVE.** Image `59260b4f21060451488c67306b25a2bc8f64e910` (container
> `nqsjafrei6k8dkup1pxkcuwf-20261119T070307`, RestartCount=0). Commit `5f0ca94..59260b4`
> di `main` (8 commit). Dua deploy Coolify: `bcs6vedgxkcwtumka2homi6x` (batch API,
> finished 06:45:44) + `3luf6yyjquwcczrnfucdqejn` (fix CSRF, finished 07:06:50 waktu VPS).
> GO owner: **"Parity penuh 14 action seperti .my"** + **"GO penuh sampai live"**;
> perubahan BREAKING terhadap konsumen API lama disetujui owner.

## 1. Kontrak owner & scope

Owner melampirkan guide `08-agent-public-reseller-api.md` (agent-guide socio.my):
"tolong perbaiki API ini seperti yang sudah dilakukan di app.socio.my". Recon: API `.id`
masih legacy 5 action; `.my` sudah 14 action hardened. Owner memilih paritas penuh.

Yang dibangun (port 1:1 dari `.my`, adaptasi `.id` di §6):
- Endpoint `POST /api/v1` format flat panel SMM v2 (JSON + form-urlencoded), `key`
  (alias `api_key`). 14 action terdaftar di GET info: services, add, bulk_add, status,
  refill, refill_status, cancel, balance, orders, set_webhook, set_api_secret, deposit,
  deposits, affiliate. Handler juga melayani `profile` (tidak terdaftar di array info —
  parity persis `.my`). GET = info JSON (nama, versi, dokumentasi, currency IDR).
- Keamanan berlapis: rate-limit 60/60 detik sliding-window **fail-closed** → auth key →
  gate level **Reseller & Agen** (+ `resellerActivated` untuk Reseller) → tanda tangan
  HMAC-SHA256 **wajib bila `api_secret` diset** (timestamp ±300 detik, kanonikal
  urlencode sorted-keys, `timingSafeEqualHex`) → nonce anti-replay
  `UNIQUE(user_id, nonce)` TTL 600 detik fail-closed → idempotensi add/bulk_add.
- Uang **IDR integer string** di semua respons; sandbox balance `"1000"`, charge
  dihitung dari pricing nyata (bukan hardcode).
- Tabel baru: `api_idempotency`, `api_replay`, `api_webhook_deliveries`; kolom baru
  `users`: `api_secret`, `api_sign_required`, `webhook_url`, `webhook_secret`;
  `rate_limits.prev_count`. DDL additive probe-first via `ensureAdminSchema`
  (boot + worker defensif) — tanpa migration manual.
- Webhook order: HMAC + backoff 1m→5m→30m→2j→6j maks 5 percobaan; cron
  `api-webhooks` tiap menit + `api-hygiene` menit ke-20; 5 hook enqueue di
  status-polling (termasuk cabang error age>2h khas `.id`).
- UI: `/api-docs` rewrite Indonesia 14 action; `/akun` API key tersamar + muat dari DB.
- SDK resmi 3 bahasa (node/php/python) + contoh bot Telegram + whitelabel kit,
  README Indonesia, brand socio.id, IDR/BCA.

## 2. Urutan eksekusi

1. Recon source `.my` (endpoint, helper, schema, cron, SDK, docs, test) + titik
   adaptasi `.id` (pricing/money/deposit/affiliate/cron/ensure/akun).
2. Implementasi berurutan: schema+DDL → helper pure + 50 test → modul server →
   endpoint → cron → UI → SDK.
3. Gate lokal: prettier 2-pass converged (25 file); eslint per-file tersentuh vs
   baseline HEAD (0 error baru; `any` baru hanya di rate-limit dengan komentar alasan,
   pola ensure.ts, diizinkan AGENTS.md); svelte-check **0 error/53 warning** (baseline
   persis); core test chain 18 file **50/50**; build adapter-node ✓; scanner CJK/Melayu
   16 hit semua provenance "port socio.my"/false-positive; smoke HMAC lintas bahasa
   (NODE_CAPTURE_OK + SERVER_SIG_ACCEPTED + PYTHON_SIG_MATCH, unicode `é` + karakter
   tricky `!*'()&=`). PHP SDK tidak dilint (binary php tidak ada di mesin) — port 1:1
   file terbukti prod `.my`; `node --check` ×2 + `ast.parse` python OK.
4. 7 commit granular buildable → **L3 fresh** (owner: "Run L3 deep security review")
   **0 findings** → push FF `5f0ca94..9eaab62` + re-sync ref origin/main.
5. Deploy Coolify `bcs6ved…` finished 06:45:44. Verifikasi live: GET info ✓ (14 action,
   IDR), `/api-docs` 200 ✓, `/akun` 303→login ✓, JSON rusak → `{"error":"Internal error"}`
   ✓, **tapi POST form tanpa Origin → 403 CSRF** — blocker paritas (§4).
6. Fix CSRF (Option A) → gate ulang (prettier bersih, eslint 0 error/3 warning any
   pre-existing identik, svelte-check 0/53, build ✓ 18.42s, scan bersih) → commit
   `59260b4` → **L3 fresh kedua** 0 findings → push `9eaab62..59260b4` → redeploy
   `3luf6y…` finished 07:06:50 → **10 probe live lulus** (§5).
7. Evidence DB read-only (information_schema + hitung order API) + cek container/cron.

## 3. Commit (granular per fase)

| Commit | Fase | Isi |
|---|---|---|
| `d8fd68a` | schema+DDL | `packages/db/src/schema/{apiIdempotency,apiReplay,apiWebhook,security,users,index}.ts` + `ensure.ts` (DDL probe-first di ensureAdminSchema) |
| `25c9917` | helper+test | `api-compat.ts` (HMAC/kanonikal/nonce), `rate-limit.ts` sliding fail-closed + prev_count, `packages/core/test/api-compat.test.ts` (50 test) + chain package.json |
| `e5c680a` | modul server | `app/src/lib/server/{api-idempotency,api-replay,api-webhook,api-deposit}.ts` |
| `66c590b` | endpoint | `app/src/routes/api/v1/+server.ts` — 14 action flat-format + GET info (IDR, sandbox) |
| `6ae0ea2` | cron | `cron/jobs.ts` (api-webhooks + api-hygiene) + `cron/status-polling.ts` (5 hook enqueue) |
| `ab00f5b` | UI | `api-docs/+page.svelte` (Indonesia) + `(app)/akun/+page.{server.ts,svelte}` (key tersamar, muat DB) |
| `9eaab62` | SDK | `sdk/{node/socio-api.mjs,php/SocioApi.php,python/socio_api.py,examples/telegram-bot.py,whitelabel/panel.mjs,README.md,whitelabel/README.md}` |
| `59260b4` | fix CSRF | `app/svelte.config.js` (checkOrigin=false) + `app/src/hooks.server.ts` (csrfGuardHook) |

## 4. Blocker CSRF & fix (Option A)

- **Bukti**: probe live pasca-deploy pertama `POST /api/v1` form-urlencoded tanpa
  header Origin → **403 "Cross-site POST form submissions are forbidden"**. Probe
  identik ke `app.socio.my` → `{"error":"Wrong API Key"}` (diterima). Klien panel SMM
  server-to-server umumnya mengirim POST form tanpa Origin — paritas wajib.
- **Root cause**: SvelteKit `respond.js` L81-101 — content-type form + method mutasi +
  origin tidak cocok/absen → 403. Cek jalan **SEBELUM hooks**, jadi tidak bisa
  dikecualikan per-route dari hook biasa.
- **Misteri `.my`** (dicatat jujur, tidak memblokir fix): `svelte.config.js` kedua repo
  identik (tanpa key csrf), kit 2.69.3 identik (lockfile + node_modules), hooks `.my`
  tanpa penanganan origin, config `.my` tak pernah berubah sejak duplikasi awal
  (git log). Prod `.my` tetap menerima form POST — kemungkinan image prod `.my`
  dibangun dari state source berbeda. Fix `.id` tidak bergantung pada misteri ini.
- **Fix**: `kit.csrf.checkOrigin = false` + `csrfGuardHook` baru di
  `hooks.server.ts`, ditaruh **pertama** di sequence (request terlarang ditolak sebelum
  menyentuh DB/session). Mereplikasi persis kondisi framework: 4 content-type form
  (`application/x-www-form-urlencoded`, `multipart/form-data`, `text/plain`,
  `application/x-sveltekit-formdata`) + POST/PUT/PATCH/DELETE + `origin !==
  event.url.origin` → 403. Respons memakai helper `json`/`text` dari `@sveltejs/kit`
  sehingga pesan & format identik byte-per-byte dengan bawaan (`trustedOrigins`
  tidak dipakai app ini). Pengecualian **hanya `/api/v1`** + subpath: API mesin
  berbasis key + HMAC + nonce, bukan cookie — CSRF tidak berlaku. Route browser,
  form action, dan webhook (JSON) tetap dilindungi persis seperti sebelumnya.

## 5. Bukti verifikasi prod (read-only, tanpa test order)

- **Image tag = SHA push**: `nqsjafrei6k8dkup1pxkcuwf:59260b4f21060451488c67306b25a2bc8f64e910`;
  container Up, **RestartCount=0**, StartedAt 2026-11-19T07:06:00Z.
- **Cron**: log boot `[cron] 14 job terdaftar (1 chained): provider-sync, service-catalog,
  status-poll, refill-poll, api-webhooks, auto-refund, stale-refund, email-queue,
  email-lifecycle, light, backup, fx-rate, reconcile, api-hygiene`; status-polling
  jalan (`checked 1 orders`). `[404] GET /cron/*.php` = probe PHP legacy pre-existing
  (tercatat juga di jurnal P1), bukan error app.
- **Matriks 10 probe live** (semua lulus):

| # | Probe | Hasil |
|---|---|---|
| 1 | `/api/v1` FORM tanpa Origin (yang tadinya gagal) | 200 `{"error":"Wrong API Key"}` ✓ parity .my |
| 2 | `/api/v1` JSON tanpa Origin | 200 `{"error":"Wrong API Key"}` ✓ |
| 3 | `/api/v1` FORM + Origin cocok | 200 `{"error":"Wrong API Key"}` ✓ |
| 4 | `/api/v1` FORM + Origin asing | 200 `{"error":"Wrong API Key"}` ✓ (mesin dikecualikan) |
| 5 | GET `/api/v1` info | 200, 14 action, currency IDR, tidak berubah ✓ |
| 6 | Route browser FORM tanpa Origin | **403 text** pesan framework ✓ |
| 7 | Route browser FORM tanpa Origin + Accept JSON | **403 `{"message":…}`** ✓ |
| 8 | Route browser FORM + Origin asing | **403** ✓ |
| 9 | Route browser FORM + Origin cocok | 404 (lolos guard, route nonexistent) ✓ |
| 10 | Route browser JSON POST tanpa Origin | 404 (webhook-style tak terdampak) ✓ |

  Probe 6-10 memakai route nonexistent `csrf-probe-nonexistent` agar nol side-effect
  apa pun hasil guard; probe 1-4 dummy key (hanya menyentuh rate_limits, preseden sama).
- **DDL terverifikasi** (information_schema, read-only): tabel `api_idempotency`
  (id, user_id, idem_key, oid, status, created_at), `api_replay` (id, user_id, nonce,
  expires_at, created_at), `api_webhook_deliveries` (14 kolom: oid, event, url, payload,
  signature, status enum pending/delivered/failed, attempts, max_attempts, last_error,
  next_run_at, created_at, delivered_at), `api_usage`, `rate_limits` + `prev_count`;
  kolom `users`: api_secret, api_sign_required, webhook_url, webhook_secret.
- **Dampak breaking** (read-only): `orders.is_api=1` → total **19** sepanjang sejarah,
  **0** dalam 30 hari, **0** dalam 90 hari; daftar konsumen 90 hari kosong. Tidak ada
  konsumen API aktif yang terdampak perubahan format legacy 5 action → 14 action flat.

## 6. Adaptasi `.id` terhadap `.my` (bukan port mentah)

- Uang IDR integer `String(x)`; `API_CURRENCY="IDR"`; sandbox balance `"1000"`,
  charge add/bulk_add dihitung `String(ctx.totalPrice)`.
- Pricing: `computePrice(basePer1k, qty, level, rules[level], Number(svc.priceApi),
  svc.type)` + `effectivePer1k` 4-param + `modalAmountFor` profit.
- `prepareOrder`: gate `isProviderAllowedForCategory` pre-deduct + `resellerActivated`
  Reseller + gate TOCTOU post-deduct; `placeOrderAfterPricing`: `p.name==="MANUAL"` +
  `svc.providerId !== 1` (MANUAL=1, SMMturk=2); `balanceLogs` type **"ord"** + note
  asciiSafe; error provider generik; insert try/catch refund.
- Refill: guard `providerOrderId` + INSERT refill `api_log_status='Pending'` +
  status `"Refilling"`.
- Deposit **BCA manual** (bukan QR .my): suffix unik `randomInt(111,1000)`, bonus
  `Math.round(amount × getDepositBonusRate())` default 0.1, min `getTopupMin()` 20000,
  maks 10.000.000, maks 2 pending, invoice `DEP-${Date.now()}-${userId}`, expire 24 jam,
  `bank_number`/`bank_name` env `SOCIO_BCA_NUMBER`/`SOCIO_BCA_NAME`. Loop kupon `.my`
  **tidak** diport (di luar scope).
- Affiliate: `MIN_WITHDRAW=5000`, `ref_link ${APP_URL}/daftar?ref=${code}`
  (`SOCIO_APP_URL`, default `https://app.socio.id`).
- `mapOrderStatus`: Success→Completed, Refilling→In progress, Canceling→Processing;
  `refill_status`: Pending/In progress/Success.
- `users.apiSignRequired` tinyint→Boolean; ensure DDL probe-first di dalam
  `ensureAdminSchema` memoized (pola repo).
- String error protokol tetap **English** (parity panel SMM); komentar/UI/docs/commit
  **Indonesia** (scanner CJK/Melayu bersih).

## 7. Rollback

- Kode: revert `5f0ca94..59260b4` + redeploy (image lama pre-batch masih ada di VPS).
- DB: **additive backward-compatible** — tabel baru + kolom baru dengan default;
  kode lama tidak membaca/menulisnya, jadi tidak perlu rollback DB.
- CSRF: revert fix mengembalikan perilaku framework lama (form POST tanpa Origin →
  403 di semua route termasuk /api/v1); proteksi browser aman di kedua arah.

## 8. Sisa / follow-up

- Observasi pasif konsumen API nyata pertama: order via API → webhook delivery →
  idempotensi/nonce bekerja di prod (belum ada traffic API 90 hari terakhir).
- Konsumen legacy dormant (19 order historis) bila aktif lagi wajib migrasi ke format
  baru + SDK (docs `/api-docs`, `sdk/README.md`).
- Landing tidak punya halaman `/api`; semua tautan docs menunjuk
  `https://app.socio.id/api-docs` (sudah diverifikasi 200 live).
- PHP SDK: lint lokal tidak mungkin (binary php absen) — verifikasi syntax manual +
  port 1:1 dari file terbukti prod `.my`; smoke HMAC lintas bahasa sudah hijau.