# AGENT_MEMORY.md — Memori Operasional Socio.id (wajib baca tiap sesi)

> Untuk coding agent (semua model). Fakta terverifikasi dari sesi kerja s/d 2026-09-27 (pindah PC + fix backup).
> Urutan baca sesi baru: file ini → `AGENTS.md` → `REBUILD_PLAN.md §9` → `docs/audit/admin-mobile-audit.md` (kerja mobile).

## 0. Fakta kunci (TL;DR)
- App SvelteKit live: `https://app.socio.id` (Coolify, adapter-node). Landing Astro live: `https://socio.id`.
- DB: MySQL VPS (container `rebicrj57r3afbg9knieq9ks`, db `socio_smm`). **TiDB dibatalkan user.**
- Provider TUNGGAL: `Provider Utama` (id=2, smmturk.org, whitelabel — jangan sebut "SMMturk" di UI).
- Deposit 100% manual BCA (gateway nonaktif). Expire: top-up 24 jam, reseller 12 jam.
- Harga = `ceil(modal × (1+markup/100))`, markup dari `pricing_rules` (Member 195 / Agen 200 / Reseller 170 / Admin 0 — user bisa ubah).
- Halaman monitoring cron: `/admin/cron`. Health: `/admin/health`. Semua run tercatat di `cron_runs`.
- Test admin: user id 2395 (`admin`), 3154, 2393. Session cookie format `${sessionId}.${token}`.

## 1. Akses produksi
- VPS: `root@130.254.47.93` (SSH key, tanpa password — diverifikasi 27-Sep: `ssh root@130.254.47.93 'hostname'` sukses via key). ⚠️ IP lama `43.157.204.17` MATI. Remote git `vps` (dulunya `ubuntu@43.157.204.17:~/socio-repo.git`) **SUDAH DIHAPUS 27-Sep** — dead IP + bare repo tidak ada di VPS baru anyway. Deploy app = `git push origin main` → GitHub → Coolify auto-build (BUKAN git push ke VPS).
- ⚠️ SSH dari PC baru (IP publik `182.10.137.165`) kena **rate-limit intermiten** (kemungkinan proteksi Lighthouse): koneksi fresh sering `Permission denied` walau key benar. **Solusi: satu ControlMaster** (`ssh -o ControlMaster=auto -o ControlPath=/tmp/ssh-%r@%h:%p -o ControlPersist=900 -fN`), scp/ssh reuse socket; jangan spam koneksi paralel; kalau diblok, tunggu window (±3 mnt) lalu satu percobaan gabungan.
- Deploy API Coolify terbukti jalan 2026-09-27 dari PC baru: token tinker sekali-pakai → `POST /api/v1/deploy {"uuid":"nqsjafrei6k8dkup1pxkcuwf"}` → hapus token → poll `application_deployment_queues.status` di `coolify-db` sampai `finished` (~4 mnt).
- App container: prefix nama `nqsjafrei6k8dkup1pxkcuwf-` (ID berubah tiap deploy — selalu resolve via `docker ps --filter`).
- DB container: `rebicrj57r3afbg9knieq9ks`, user `socio`, db `socio_smm`.
- Password DB: ambil dari container app — `docker exec $APP printenv SOCIO_DB_URL | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p'`. **JANGAN hardcode/tulis password di file/repo.**
- Secret lain (API key dsb): hanya via env/Coolify, tidak pernah di kode.

## 1b. Auto-deploy Coolify + `watch_paths` (WAJIB PAHAM, diubah 2026-10-02)

`socio-app` (app.socio.id) **auto-deploy ON** dan `watch_paths` **sudah diisi** —
sebelum ini kosong, artinya push apa pun ke `main` me-rebuild app yang sedang dipakai user.

```
app/**
packages/**
package.json
pnpm-lock.yaml
pnpm-workspace.yaml
```

Artinya: `landing/`, `docs/`, `seo/`, `sparko/`, `scripts/`, `*.md`, `app.socio.id/`,
`socio.id/` **TIDAK** memicu deploy app → aman buat push dokumen/SEO.

Verified 2026-10-02: commit `9d570bd` (docs/ saja) → **0 deployment**, container app
tidak restart, `GET /` tetap 303 dalam 0,13s. Bukti: `docs/WATCHPATHS_TEST.md`.

### ⚠️ PENTING: auto-deploy webhook NYATA-NYATA TIDAK AKTIF (verified 2-Okt-2026)
`is_auto_deploy_enabled = t`, tapi **GitHub webhook tidak terpasang di repo**. Bukti:
`SELECT COUNT(*) FILTER (WHERE is_webhook) FROM application_deployment_queues` =
**0 dari 130 deployment** `socio-app` (2 Sep – 2 Okt). Semuanya `is_api = t` (manual).

Konsekuensi:
- Push ke `main` **tidak** me-rebuild app. App dilindungi karena webhook mati, bukan
  karena `watch_paths`.
- `watch_paths` = **jaring pengaman**, belum terbukti bekerja pada jalur webhook
  sungguhan. Uji `docs/` di atas **belum membuktikan apa-apa** soal gate-nya.
- **Jangan auto-deploy**. Alur wajib tetap §2: manual trigger API + verifikasi +
  smoke test. Jangan pernah menyalakan webhook tanpa重复 review dengan user —
  auto-deploy menghapus langkah verifikasi yang selama ini melindungi app.
- Kalau nanti webhook mau dinyalakan: (1) set watch_paths dulu, (2) uji commit di
  `app/` memang deploy, (3) uji commit di `docs/` memang tidak, (4) ingatkan batas
  20 commit di bawah.

**4 app lain aman otomatis** — webhook Coolify memfilter per repo, dan tiap app punya
repo sendiri: `seo-pipe-app` (`seo-pipeline.git`), `sgb-dashboard`, `capi-gateway`,
`socio-seo-runner` (`socio-seo-runner.git`). Tidak pernah ikut deploy dari monorepo.

### ⚠️ BAWAHAN: GitHub memotong payload push di 20 commit
`changed_files` diambil dari `commits.*.added/removed/modified` di payload push
(`Coolify: app/Http/Controllers/Webhook/Github.php`). Kalau `changed_files` kosong →
`isWatchPathsTriggered()` = false → **app TIDAK di-deploy**.

Konsekuensi: **push >20 commit sekaligus bisa terlewat deploy**, walau kodenya berubah.
Mitigasi wajib: setelah push besar → cek status deploy; kalau tertinggal, deploy manual
(langkah 3–6 di §2). Kalau ragu, pecah push jadi beberapa.

### Cara ubah / rollback `watch_paths`
Nilai lama (rollback) = `NULL`. Ubah via API resmi, **jangan UPDATE SQL manual**:
```bash
# token sekali pakai, lalu PATCH
curl -X PATCH -H "Authorization: Bearer $TOK" -H 'Content-Type: application/json' \
  --data '{"watch_paths":"app/**\npackages/**\npackage.json\npnpm-lock.yaml\npnpm-workspace.yaml"}' \
  http://127.0.0.1:8000/api/v1/applications/nqsjafrei6k8dkup1pxkcuwf
```
**Wajib pakai newline asli (`\n` di JSON), bukan teks literal `\n`.** Kalau `\n` masuk
sebagai teks biasa, 5 pola jadi satu baris dan **tidak match apa pun** → app tidak akan
lagi pernah deploy. Verifikasi setelah set:
```bash
docker exec coolify-db psql -U coolify -d coolify -t -A \
  -c "SELECT watch_paths FROM applications WHERE id=1;" | cat -A   # harus 5 baris, tiap baris diakhiri $
```
Semantik (Coolify 4.3.23, `app/Models/Application.php`): satu pola per baris; `!` =
exclusion; `*` = satu level; `**` = semua level; **pola yang match terakhir menang**.

## 2. Alur deploy standar (Wajib urut)
1. `git pull --rebase origin main` DULU (multi-sesi paralel di repo ini — push tanpa
   fetch = rejected; JANGAN force-push, JANGAN merge blind; cek `git log origin/main`).
1. Kalau total commit yang akan di-push ke `main` **>20**, ingat batas §1b — cek
   status deploy setelah push, deploy manual kalau tertinggal.
1. `pnpm --filter app check` (0 error) + `pnpm --filter app build` sukses.
2. `git add -A && git commit --no-verify -m "feat(M{X}): ..."` (`--no-verify` karena pre-existing lint errors, bukan dari kerjaan ini) + `git push origin main`.
3. SSH VPS → generate token Coolify: `docker exec coolify php artisan tinker --execute="session(['currentTeam' => App\Models\Team::find(1)]); echo App\Models\User::find(1)->createToken('<nama-unik>', ['*'])->plainTextToken;"` → ambil baris terakhir.
4. `curl -X POST -H "Authorization: Bearer $TOK" -H 'Content-Type: application/json' -d '{"uuid":"nqsjafrei6k8dkup1pxkcuwf"}' http://127.0.0.1:8000/api/v1/deploy` → catat `deployment_uuid`.
5. Hapus token (tinker `tokens()->where('id',$PID)->delete()`), tidur 240–600s.
6. Cek `docker exec coolify-db psql -U coolify -d coolify -t -c "SELECT status FROM application_deployment_queues ORDER BY id DESC LIMIT 1;"` = `finished`.
7. Verifikasi live (lihat §3), cleanup session.

### Deploy yang TIDAK boleh auto (harus manual & disengaja)
- `landing/` → `socio.id`. Bukan Coolify: `npx wrangler pages deploy`. Push ke monorepo
  **tidak** mendeploy landing, jadi publish konten SEO = deploy manual tersendiri.
- `socio-seo-runner` → Coolify **Scheduled Task** (`seo-daily-index` 06:00 WIB,
  `seo-weekly` Senin 09:00), bukan webhook.

## 3. Verifikasi live (pola baku)
- Buat session: `INSERT INTO sessions (id,user_id,token,expires_at,ip_address,user_agent,created_at,updated_at) VALUES ('$SID','2395','$TOK',NOW()+INTERVAL 15 MINUTE,'127.0.0.1','<nama-test-unik>',NOW(),NOW())`.
- GET: `curl -H "Cookie: socio_session=$SID.$TOK" https://app.socio.id/<path>`.
- POST form action: tambah `-H 'Origin: https://app.socio.id' -H 'Content-Type: application/x-www-form-urlencoded'` (wajib — kalau tidak, 403 CSRF).
- **JANGAN**: create order sungguhan (uang asli), kirim broadcast ke user, kirim email ke user asli, trigger backup manual berulang (berat).
- Setelah selesai: `DELETE FROM sessions WHERE user_agent='<nama-test-unik>'` + hapus data test lain.
- Untuk audit visual: pakai skill `pw-vision` (`~/.config/opencode/skills/pw-vision/`) — Playwright lokal, baca SKILL.md-nya.

## 4. Skema otorisasi (jangan dilanggar)
- Guard layout `(admin)/+layout.server.ts`: harus login + `level=Admin` + `requiredPermissionForPath()` (403 jika tidak).
- Semua action admin: `assertAdmin(locals)` + `assertAdminRate()` + permission `can(role, ...)` + `logAudit()` untuk aksi destruktif/finansial.
- Role: `super_admin` (wildcard) > `admin` > `operator` (orders/deposits read, tickets) > `finance` (deposits approve, refund).
- Route baru WAJIB didaftarkan di `ROUTE_PERMISSION` (`packages/core/src/rbac.ts`) + nav (`(admin)/+layout.svelte`).
- API key provider ter-encrypt AES-256-GCM (`enc:` prefix, key dari `SOCIO_PROVIDER_ENC_KEY`/`SOCIO_AUTH_SECRET`). Jangan log plaintext key.
- 2FA TOTP: enable/disable wajib password + kode; ada audit `2fa_enable`/`2fa_disable`.
- Download backup: cek `backup:manage` + `path.basename()` (anti traversal).
- File di `lib/server/*` TIDAK BOLEH diimport komponen client.

## 5. Cron (8 job, `app/src/cron/jobs.ts` = sumber kebenaran)
| Job | Jadwal | Log |
|---|---|---|
| provider-sync (katalog 8268 + saldo) | tiap jam mnt 00 | `provider_sync_log` action=services |
| service-catalog (create/update harga/enable/disable) | chained setelah sync | `provider_sync_log` action=catalog |
| status-poll | tiap menit | `cron_runs` |
| refill-poll | tiap 5 mnt | `cron_runs` |
| auto-refund | tiap 15 mnt | `cron_runs` |
| email-queue | tiap 5 mnt | `cron_runs` |
| light (expire deposit + reminder T-2h) | tiap 15 mnt | `cron_runs` |
| backup | 03:00 | `backup_logs` |
- Semua run tercatat di `cron_runs` via `runJob()` (overlap dicegah, prune 200/job). Monitor: `/admin/cron`.
- Deploy saat sync jalan → row `running` yatim. Boot `startCron()` me-reap yang >30 mnt
  jadi error. Jangan bersihkan manual tanpa batas waktu (pernah salah tandai job yang
  sedang jalan). service-catalog tercatat via chained `runJob` (bukan hanya sync_log).
- Tambah job = 1 entry di `jobs.ts` (otomatis terjadwal + muncul di UI).
- **seedSmmturkProvider match by `apiUrlOrder`, BUKAN by name** (pelajaran: rename whitelabel pernah bikin provider duplikat tiap jam).

## 6. Model bisnis (jangan diubah tanpa user)
- **Pricing**: `services.price`=Member, `priceApi`=Agen base, `priceReseller`=Reseller; harga jual = `ceil(modal × (1+markup/100))` + floor `modal+minProfit`. Sync tulis ulang harga tiap jam — **edit manual akan ke-overwrite** (tawarkan flag kunci bila user minta).
- **Deposit**: manual BCA (Midtrans disabled, Tripay tidak ada). Expire 24 jam (top-up) / 12 jam (reseller). Confirm = transaksi atomik + idempotent CAS + audit + email sukses + komisi affiliate. Reseller = aktivasi (verify=Yes + bonus 20rb), BUKAN kredit 50rb.
- **Refund**: <Rp50rb auto, ≥Rp50rb approval admin kedua (self-approve diblokir).
- **Member**: wajib klik link verifikasi email (gate login). **Reseller**: exempt — aktivasinya = confirm pembayaran admin.
- **Email**: semua transaksional via `email_queue` (async ≤5 mnt, retry 3). Template di `lib/server/deposit-emails.ts` + `lib/server/email.ts` (`wrapEmail`). SMTP primary. Visibilitas: section Transaksional di `/admin/email`.
- **Email deliverability (audit 2026-09-08, JANGAN diulang kesalahannya)**:
  - From header PERNAH double-wrap (`Socio ID <Socio ID <...>>`) karena env sudah berformat +
    kode wrap lagi → fix `buildFrom()` di email.ts. Selalu verifikasi header via mailbox lokal.
  - DKIM: mailserver TIDAK signing (KeyTable/SigningTable kosong, milters off) → app sign
    sendiri via nodemailer (selector `mail`, key env `SOCIO_DKIM_PRIVATE_KEY`, d=socio.id).
    DNS `mail._domainkey` cocok. Jangan sentuh mailserver tanpa backup.
  - DMARC `p=reject` strict — header harus valid, kalau tidak Gmail tolak mentah-mentah.
  - Gmail 421-4.7.28 = rate-limit domain (bukan auth). Penyebab: blast massal. Jangan blast
    >100/jam ke Gmail; antrean basi Sep-2026 menumpuk 2945 + bounce 12k file (113M).
  - Test deliverability: enqueue ke noreply@socio.id → trigger email-queue → baca .eml di
    `/opt/mailu/scripts/mail-server/mail-data/socio.id/noreply/new/` (cek From/DKIM/List-Unsub).
  - Admin alerts (notifyAdmins) → email ke semua user level Admin + backup in-app
    `admin_notifications` (wajib — email admin semuanya Gmail yang bisa ter-throttle).
  - Gmail 421-4.7.28 throttle Sep-2026 penyebab: marketing automation (marketing-acquisition_*,
    marketing-upsell, ~24k) — BUKAN transaksional. Jangan blast massal; antrean basi
    di-flush via postsuper (satu-per-satu, batch postsuper -d multi-ID gagal), mailbox
    bounce dibersihkan via `doveadm expunge` (jangan grep 12k file manual — lambat).
  - Guard processor (email-queue.ts): ORDER BY priority DESC (transaksional dulu),
    marketing max 10/run, Gmail max 5/run. Jangan naikkan tanpa Postmaster spam <0.1%.
  - Import XLS: tabel `mailing_list` + action `importXls` (xlsx/csv, max 5MB/5000 baris,
    dedupe, validasi) + audience `xls_list` (userId=0 di tracking). Enum DB perlu ALTER
    manual bila tambah audience. Tidak ada sistem import lama (legacy tidak punya).
- **Broadcast**: 6 segmen, rate-limit 5/menit. **Jangan test kirim ke user asli.**
- **Backup**: mysqldump via mysql2 + gzip, 03:00, keep 10, `backup_logs`. Zero-date MySQL (`0000-00-00`) → handle Invalid Date.

## 7. Konvensi kode & anti-pattern
- Svelte 5 runes, Drizzle ORM (prepared statement otomatis), ESM, Prettier.
- Load data `load()` harus serializable (jangan spread objek berisi fungsi — pernah bikin 500).
- Group route `(admin)` TIDAK menambah segmen URL (`(admin)/api/events` = 404, yang benar `api/admin/events`).
- Drizzle MySQL: tidak ada `$returningId` (pakai select DESC limit 1); `db.run` tidak ada (pakai `db.execute`); `datetime` tanpa timezone.
- **KRITIS — Drizzle `sql` template bound parameter**: `sql`id IN (${ids.join(",")})`` menghasilkan
  SATU string parameter `'1,2,3'` yang hanya match ID pertama! Selalu pakai `inArray(col, arr)`
  untuk list. Bug ini pernah diam-diam merusak popular/refillMap/massCancel (2026-09-09).
- pdfmake: singleton CJS, `createPdf().getBuffer()`, `setLocalAccessPolicy` harus allow font name-refs.
- Template literal + backtick SQL: pakai helper `q()` (pernah syntax error).
- Mobile: tabel → cards `lg:hidden` + `hidden lg:block`; grid ≥3 kolom wajib `min-w-0`; touch target ≥24px (badge dikecualikan); interval/SSE wajib `document.hidden` guard + cleanup; list server wajib `.limit()`.
- `pnpm-lock.yaml` drift → `pnpm install --no-frozen-lockfile` lalu commit.
- **Model TIDAK buta gambar**: `Read` pada PNG mengembalikan image yang terlihat.
  Skill `pw-vision` untuk screenshot + ukur layout (jangan klaim buta lagi).
- Coolify unserialize bug: bila `ERR_SOCKET_BAD_PORT` + crash-loop setelah deploy,
  env vars tersimpan DOUBLE-serialized (`decrypt()` → `s:N:"...";`). Scan+fix via tinker:
  loop `EnvironmentVariable::where('resourceable_id',1)`, `decrypt(attributes[value])`,
  yang match `/^[sa]:[0-9]+[:;{]/` → `unserialize` → save ulang. Lalu REDEPLOY
  (restart saja tidak cukup — env baked saat container create). Pernah kejadian 2026-09-08
  (semua vars kena, app crash-loop, fix + redeploy pulih).
- **Kurs USD→IDR terpusat** (`lib/server/fx.ts`, tabel `fx_rates`): efektif =
  `max(live, floor)`. Live di-fetch harian (cron `fx-rate` 00:05, API gratis tanpa key);
  floor manual (default 20000, via `/admin/pricing`, audit `set_fx_floor`). SEMUA pemakaian
  rate WAJIB via `getUsdToIdr()` (pernah 3 default beda: 15000/15000/16000).
- **FX ikut di-hash diff provider-sync**: kurs berubah → semua modal IDR ditulis ulang.
  Tanpa ini, hash sama → row di-skip → modal pakai kurs lama selamanya (bug 2026-09-08).
  env vars tersimpan DOUBLE-serialized (`decrypt()` → `s:N:"...";`). Scan+fix via tinker:
  loop `EnvironmentVariable::where('resourceable_id',1)`, `decrypt(attributes[value])`,
  yang match `/^[sa]:[0-9]+[:;{]/` → `unserialize` → save ulang. Lalu REDEPLOY
  (restart saja tidak cukup — env baked saat container create). Pernah kejadian 2026-09-08
  (semua vars kena, app crash-loop, fix + redeploy pulih).

## 8. Status & sisa (update 2026-09-27)
- Selesai: M0–M4, M3 admin, M5 landing V2 playful F0–F8 + Sparko S/R/G **LIVE** (Pages deploy terakhir dgn fix polaroid 16 Sep terverifikasi di HTML produksi; app Coolify build `4ba0116`).
- Sisa: **M5 blocker** testimoni + foto asli owner (skip atas perintah user 27-Sep), Lighthouse formal landing, **M6** (bounce webhook, unsubscribe, template email sisa, Vitest), **M7** monitoring (ditunda).
- Pending keputusan user: flag "kunci harga" manual; UptimeRobot (ditunda); streak login & progress level Sparko (OPT di `APP_V3_SPARKO_PLAN §S4/S6`); roll-out maskot Sparko ke `pesan`/`akun`/`saldo` utama (belum — by design dashboard-first).
- Verifikasi tertunda: trigger 1× backup manual dari /admin/backup lalu pastikan dump baru bersih (terblokir rate-limit SSH saat sesi 27-Sep; cron 03:00 otomatis sudah pakai kode fix).

## 9. Checklist verifikasi per kerjaan
- [ ] `check` 0 error + `build` sukses + commit `--no-verify` + push + deploy `finished`
- [ ] Halaman: HTTP 200 semua rute tersentuh (+ marker konten bila ada perubahan UI)
- [ ] Aksi: test dengan session injeksi (baca §3 larangan), cek audit log bila destruktif
- [ ] Mobile: Playwright audit bila ubah UI (skill `pw-vision`), 0 overflow/error
- [ ] Schema baru: ALTER prod idempotent + catat di `scripts/db/migration-pre-deploy.sql`
- [ ] Cleanup: session + data test dihapus; tidak ada secret di git
- [ ] Update `REBUILD_PLAN.md §9` / docs terkait bila milestone berubah

## 10. PC baru 2026-09-27 (setup terverifikasi — untuk agent sesudahnya)

### ⚠️ PATH KANONIK BARU (27-Sep malam): `/Volumes/miniex/Users/maabook/web-project/socio.id`
- Project DIPINDAHKAN dari `/Volumes/macmini/Desktop/socio.id` (rsync penuh; folder lama cadangan, hapus setelah user konfirmasi workspace baru). ALASAN: pnpm store di volume miniex — beda volume = salin file (17 mnt nyangkut), se-volume = hardlink (13,8 detik). JANGAN kerja di dua copy sekaligus.
- Landing dev localhost:4321, app dev localhost:3000 (DB MariaDB lokal tetap 127.0.0.1, tidak ikut pindah).

### Deploy landing CF Pages — TERBUKTI JALAN 27-Sep (deploy `8916c3b9` = production socio.id sekarang)
```bash
cd /Volumes/miniex/Users/maabook/web-project/socio.id
pnpm --filter landing build
CLOUDFLARE_API_TOKEN=<token-1 di accountcf.md> CLOUDFLARE_ACCOUNT_ID=0298214d1069f75436f490b51ea4763e \
WRANGLER_SEND_METRICS=false CI=1 npx --yes wrangler pages deploy landing/dist \
  --project-name socio-id --branch main --commit-dirty=true
```
PENTING: pakai **npx**, BUKAN `pnpm dlx` (pnpm memblokir postinstall esbuild/workerd → gagal). Versi wrangler `latest` (v9 tidak ada). Verifikasi: `curl https://socio.id/ | grep sparko--`. Catatan: skill `.qoder/skills/cloudflare` memuat DNS lama (43.157.204.17 sudah MATI) — jangan dipercaya buta.

### Pipeline landing (Cloudflare Pages) — terverifikasi via API 27-Sep
- Kredensial CF di `accountcf.md` (ROOT, **gitignored, JANGAN pernah commit/jadikan dokumen lain**). Token-1 (`cfat_9TXS...`) AKTIF: bisa baca Pages + R2 + list zones; TIDAK bisa baca DNS records zone (error 7003). Token-2 (`cfat_d9rQ...`) mati/tak berwenang API biasa (kemungkinan cuma utk S3-compat R2).
- Project Pages: **`socio-id`** (id 61cba457...), domain `socio.id`+`www.socio.id`, subdomain `socio-id.pages.dev`. **TIDAK terhubung GitHub (source null)** → deploy = DIRECT UPLOAD build lokal. Push git TIDAK auto-deploy landing.
- Deploy production terakhir: **`25afc65f` 13-Sep-2026 14:43 WIB** (pola 3 deploy manual berjarak menit: afa522d8/8da4bda1/25afc65f). ⚠️ Commit `06f7d7f` (16 Sep, fix polaroid testimoni mobile) **BELUM ter-deploy** — koreksi klaim sesi 27-Sep: grep `polaroid` di HTML live bukan bukti (string itu hanya ada di source, tidak pernah masuk build output).
- Cara deploy landing yang benar: `pnpm --filter landing build` → upload `landing/dist` via `wrangler pages deploy` / API Pages upload pakai token-1 (perlu dites scope Edit saat deploy pertama). Setelah deploy: verifikasi marker konten baru di `https://socio.id`.
- R2: bucket **`socio`** ada (sejak 16 Jul). `cdn.socio.id` resolving CF, root 404 = normal (custom domain bucket, hanya object path yang melayani).

- Repo: `/Volumes/miniex/Users/maabook/web-project/socio.id` (path kanonik sejak 27-Sep malam; sebelumnya `/Volumes/macmini/Desktop/socio.id`) (HOME user ada di volume eksternal `/Volumes/miniex` — bikin akses `~/.ssh` kadang terhambat sandbox; jangan panik lihat "Could not stat ~/.ssh").
- `.env` root terpasang (versi 18 Agu dari PC lama, chmod 600, gitignored). Key baru pasca-18 Agu TIDAK ada tapi kode punya fallback: `SOCIO_PROVIDER_ENC_KEY`→`SOCIO_AUTH_SECRET`, SMTP→`RESEND_API_KEY`, DKIM→tanpa tanda tangan. `.env` ini khusus DEV LOKAL (DB 127.0.0.1) — env produksi beda (Coolify).
- **DB dev lokal: MariaDB 12.3.3 Homebrew** (`sh.brew.mariadb`, port 3306) = mirror penuh produksi per 27-Sep-2026 03:00 (47 tabel; users 3312, orders 26083, services 8413). Akses root: `mariadb -u root` via **unix_socket tanpa password** (sengaja di-set begitu — tidak ada secret baru). User DB = `socio_app` sesuai `.env`.
- ⚠️ Restore dump produksi MySQL8→MariaDB butuh 3 tambalan LOKAL (produksi MySQL8 tidak perlu): `utf8mb4_0900_ai_ci`/`utf8mb3_*`→`utf8mb4_unicode_ci`, tipe `json`→`longtext` (hindari CHECK json_valid), + `SET FOREIGN_KEY_CHECKS=0` di awal.
- **BUG BACKUP KRITIS (ditemukan & diperbaiki 27-Sep, commit `efff5ff`, LIVE di produksi):** `backup.ts` lama menghasilkan INSERT dengan backtick dobel (syntax invalid untuk MySQL sekalipun) + tanpa header FOREIGN_KEY_CHECKS → SEMUA backup otomatis 22 Agu–27 Sep sebenarnya tidak restore-able apa adanya (masih bisa diselamatkan via tambalan seperti di atas — terbukti). Fix: `q()` per kolom + preamble SET + `START TRANSACTION WITH CONSISTENT SNAPSHOT` (dump kini titik-waktu konsisten). Round-trip teruji di MariaDB lokal (0 error, FK anak masuk). Sisa verifikasi: trigger 1× backup manual dari /admin/backup, pastikan file baru bersih (tertunda, lihat §8).
- Audit status dokumen: `LANDING_V2_PLAYFUL_PLAN.md` F1–F6 selesai+live (checkbox §9 belum dicentang manual — skip atas perintah user); `LANDING_V2_PLAN.md` SUPERSEDED oleh versi playful; `APP_V3_SPARKO_PLAN.md` S1–S5 live — Sparko di 8/11 halaman user + layout + 5 auth; `pesan`/`akun`/`saldo` sudah playful F4/F5 tanpa maskot (by design §S6).
- Handover files: `docs/SESSION_HANDOVER_77HARI_2026-09-27.md` + `sparko/` sudah **ter-push ke origin** (sempat terjebak untracked di PC lama). Backup file-file itu ada di `/tmp/socio-backup-2709/` sampai sengaja dihapus.

### SEO Engine credential — GSC + Bing LIVE 1 Okt 2026 (runbook: `docs/GOOGLE_CLOUD_SETUP.md`)
- **Jangan buat project/SA baru.** Pakih yang sudah ada: project `project-e899f4b3-5062-40a0-b9a` (agency Beriklan, multi-client) + SA `beriklanagency@project-e899f4b3-5062-40a0-b9a.iam.gserviceaccount.com`. File key: `/Users/maabook/Downloads/sariglassbangunan.com/secrets/gcp-sa-sari-glass.json` (+ `gcp-sa-b64.txt` 3.184 char, `gcp-sa-gzip-b64url.txt` 2.263 char — semua decode ke SA yang sama, sudah diverifikasi).
- **GSC property = `sc-domain:socio.id` (domain property), SUDAH verified + SA sudah Owner.** `GSC_SITE_URL=https://socio.id/` → **403 "You do not own this site"** (URL prefix tidak ada di akun itu). Ini kesalahan yang paling mudah terjadi — jangan set ulang ke URL prefix. `.env.example` sudah dikoreksi.
- Baseline 1 Okt 2026 (28 hari): **8 klik / 42 impressions**, branded "socio id" pos 1.1, generik pos 46-52. `https://socio.id/` verdict **PASS / Submitted and indexed**, crawl 2026-10-01T07:51:15Z, crawledAs MOBILE. Tidak ada tanda scaled-content-abuse.
- **Bing API key user = valid.** Submit `{"d":null}`, kuota turun **100→98** (bukti nyata). **Free tier Bing = 100 URL/hari + 3.100/bulan** — draft dokumen lama menyebut 10/hari, itu SALAH. Cek kuota: `GET …/GetUrlSubmissionQuota?siteUrl=…&apikey=…` (200 = key hidup + site terdaftar); key salah balas `ErrorCode 3`. **URL wajib trailing slash** (canonical `/blog/slug/`) — tanpa slash kena 308 dan kuota tetap terpakai.
- **Runner tak perlu `googleapis`** — cukup `node:crypto` (RS256 JWT) + global `fetch`, nol dependency. Indexing API wajib minta scope `https://www.googleapis.com/auth/indexing` (cuma `webmasters` → `ACCESS_TOKEN_SCOPE_INSUFFICIENT`).
- Script diagnosa (baru, zero-dep): **`node seo/scripts/gsc-doctor.mjs`** — 8 check (creds → token → sites.list → URL Inspection → Search Analytics 28d → Indexing API → indexnow.txt → sitemap). Dev lokal cukup `set -a && source .env && set +a` (`.env` sudah diisi `GSC_SA_FILE` = path, bukan isi key). Exit 1 kalau check wajib gagal.
- Gotcha killers: (1) `process.exit()` di Node **memotong stdout saat di-pipe** → pakai `process.exitCode`; (2) jangan lupa panggil fungsi report di jalur sukses (saya sempat bug, script exit 0 tanpa output); (3) `serviceusage.services.list` balas 403 untuk SA ini → daftar API enabled hanya bisa dicek via Console.
- `.env` lokal sekarang punya `BING_API_KEY` + block GSC (`GCP_PROJECT_ID`, `GSC_SITE_URL=sc-domain:socio.id`, `GSC_SITEMAP_URL`, `GCP_PROJECT_ID`, `GSC_SERVICE_ACCOUNT_EMAIL`). `.env` gitignored ✅. Key **tidak** masuk `.env.example`.
- **GA4 queued (belum dipasang)**: measurement ID `G-MDJCW053XR`, target `socio.id` + `app.socio.id`. Nol GA4 di seluruh source. Scope 10 sub-item + 3 keputusan user ada di `docs/SEO_AUTOMATION_PLAN_V2.md` §14.1. Temuan tajam: CSP `landing/public/_headers` `connect-src` belum izinkan `*.google-analytics.com` (wajib ditambah), CSP `app/src/hooks.server.ts:175` `script-src` belum izinkan `www.googletagmanager.com` (wajib ditambah). Belum ada cookie banner di landing maupun app padahal AdSense sudah jalan.
- Urutan kerja + aturan tandai selesai ada di `docs/SEO_AUTOMATION_PLAN_V2.md` §14.2 (Stage 0 selesai → 1.1 `seo/lib/gsc.mjs` → 1.2 `gsc-inspect.mjs` → …).
- **1.1 `seo/lib/gsc.mjs` SELESAI 1 Okt 2026.** Zero-dep (node:crypto RS256 + fetch). Export: `loadCreds` (4 sumber: GZIP_B64URL → JSON_B64 → SA_FILE → JSON), `getToken` (cache per proses), `listSites`, `inspectUrl`, `toStateEntry`, `isIndexed`, `searchAnalytics`, `listSitemaps`, `submitSitemap`, `publishIndexing`, `sleep`, `SITE_URL`, `SCOPE_WEBMASTER`, `SCOPE_INDEXING`. Verifikasi live: `sites.list` → 2 property · inspect `PASS / Submitted and indexed` · SA 28d → 3 baris.
- **BUG PENTING: semua 9 sitemap terdaftar di GSC itu MATI** (404/301/000) — `post_tag-`, `category-`, `page-`, `post-sitemap.xml`, `sitemap.xml`, `sitemap_index.xml` (underscore era Yoast), `landing.socio.id/sitemap.xml`. Yang hidup `https://socio.id/sitemap-index.xml` (HYPHEN, 200, 54 URL) tapi **tidak terdaftar** di GSC. Detail + fix ada di `docs/SEO_AUTOMATION_PLAN_V2.md` §14.3. Dampak: penemuan halaman baru cuma lewat crawl.
- **Akses Coolify/VPS (READ-ONLY, sudah dicek 1 Okt 2026)**: SSH jalan dengan `ssh -i ~/.ssh/id_rsa root@130.254.47.93` (BatchMode OK). ⚠️ key `~/.ssh/socio_vps` **tidak** bisa login (Permission denied) walau docs/deploy/APPSOCIOID_VPS.md menyebutnya — pakai `id_rsa`. Coolify `coollabsio/coolify:4.3.23` healthy, panel **localhost:8000 saja** (butuh SSH tunnel), tidak ada token API Coolify di laptop, tidak ada CLI coolify/docker lokal → semua operasi Coolify lewat SSH. **Belum ada Scheduled Task** (0 container cron) → runner Sprint 3 belum dibuat. Prod app = container `nqsjafrei6k8dkup1pxkcuwf-<hash>`, image `1cab404c…` = commit terbaru ✅, up 23 jam, **tanpa env GSC_/BING_**. Ada juga project Coolify `igsbaxpsvuhopghoutiit2kk` (dashboard agency, punya `GSC_SA_JSON` untuk klien lain — jangan dicampur). VPS: uptime 32 hari, load ~1, disk 19%.
- **1.2 `seo/gsc-inspect.mjs` + 1.3 baseline SELESAI 1 Okt 2026.** Tulis `state.json.gsc.inspections[url]` + `published[].indexed`/`.lastChecked` + `gsc.lastRun`; rate-limit 200ms; cache 24j (idempotent, `--force` bypass); atomic write via `.tmp`+rename. **BASELINE `index_rate` = 0/5 (0%)** — kelima artikel published `NEUTRAL / "URL is unknown to Google"` dengan semua field `*_STATE_UNSPECIFIED` (artinya Google belum pernah lihat, BUKAN robots blocked).
- **Sitemap GSC SUDAH DIPERBAIKI 1 Okt 09:42 UTC**: submit `https://socio.id/sitemap-index.xml` → HTTP 204, `isPending: true`, `errors: 0`, total sitemap GSC 9→10. Entri mati **tidak** dihapus (user pilih submit saja). ⚠️ **Endpoint submit yang benar: `PUT /webmasters/v3/sites/{site}/sitemaps/{feedpath}` — TANPA suffix `/submit`** (dengan `/submit` → 404 HTML dari Google). Raw colon `sc-domain:socio.id` juga 404; harus `encodeURIComponent` → `sc-domain%3Asocio.id`.
- **Bug label yang sudah diperbaiki**: `robotsTxtState !== 'ALLOWED'` sempat menandai semua URL `blocked` — SALAH, karena `ROBOTS_TXT_STATE_UNSPECIFIED` = belum ditemukan. Logic benar: hanya `DISALLOWED` → blocked; `unknown to Google` → `not_discovered`.
- **Tiga penyebab artikel tidak ditemukan Google** (verified live): (1) sitemap tidak pernah terdaftar — sudah diperbaiki; (2) **money page 0 link ke /blog/** (`/`, `/smm-panel-terbaik.html`, `/layanan-sosmed-termurah.html`, `/smm-reseller-panel-termurah` semua nol) → mesh money→blog tidak ada; (3) `/blog/` cuma list 4 dari 5 artikel (`apa-itu-smm-panel` hilang). Crawl path cuma navbar `/` → `/blog` → artikel.
- **Syarat baru untuk ramp-gate (1.5)**: `index_rate` harus = `indexed` ÷ `discovered`, EXCLUDE `not_discovered`. Kalau pakai angka mentah, rate 0% selama 1-3 hari → daily_count jatuh ke floor 1 dan plan berhenti.
- Normalisasi URL: canonical socio.id **selalu trailing slash** (`/blog/slug/`). Tanpa slash → 308, kuota Bing kepakai, sitemap tidak match.
- **1.4 `seo/bing-submit.mjs` SELESAI 1 Okt 2026.** 5 URL artikel disubmit ke Bing → `{"d":null}`, kuota **98→93** (turun persis 5). `state.bing.submitted[url].at` + `bing.lastRun{quotaBefore,quotaAfter}` ditulis. Fitur wajib: guard URL non-canonical (trailing slash), `GetUrlSubmissionQuota` lebih dulu, cap `--limit` (default 90 dari 100), pecah batch 10/request, cooldown 30 hari per URL, `--dry-run`, atomic write. Run kedua otomatis skip semua (cooldown) → idempotent.
- Bukti API Bing: `SubmitUrlbatch` sukses = **HTTP 200 + body `{"d":null}`**; key salah = `{"ErrorCode":3,"Message":"ERROR!!! InvalidApiKey"}`; `GetUrlSubmissionQuota` 200 berarti key hidup **dan** site terdaftar. Endpoint: `https://ssl.bing.com/webmaster/api.svc/json/<Method>?apikey=<KEY>` (POST body `{siteUrl,urlList}`), `siteUrl` = `https://socio.id` tanpa trailing slash, `urlList` = URL canonical **dengan** trailing slash.
- Script SEO baru punya pnpm script: `pnpm seo:gsc-doctor`, `pnpm seo:gsc-inspect`, `pnpm seo:bing-submit`. Root `package.json` tidak punya lint/typecheck (hanya app + landing workspace yang punya), seo/*.mjs di luar scope lint → verifikasinya = `node --check` + eksekusi nyata.
- Catatan Estimate: sitemap submit ke GSC barusan (09:42 UTC) + 5 URL ke Bing (09:50 UTC). **Verifikasi ulang setelah 48-72 jam** dengan `node seo/gsc-inspect.mjs --all --force`; kalau masih `not_discovered` semua, perlu investigasi lanjut (cek Fetch di GSC UI, pastikan sitemap terbaca).
- **Papan kemajuan resmi ada di `docs/SEO_AUTOMATION_PLAN_V2.md` §14.2** (tabel `[x]`/`[ ]` + kolom Bukti angka + baris `NEXT:` di atas tabel). §12 Sprint 3 & §13 DoD juga sudah ditandai. Perubahan status harus update 3 tempat: §14.2 + §13 (bila DoD tercapai) + 1 baris AGENT_MEMORY ini.
- **1.5 `seo/config.json` + `seo/ramp-gate.mjs` SELESAI 1 Okt 2026.** `config.json`: `daily_count: 3`, `min 1`, `max 10`, `threshold_up 0.85`, `threshold_down 0.7`, `min_sample 5`, `discovery_gap_alert 0.5`, `index_window_days 14`, `halt: false`, `history[]` (max 30). Run nyata: **hold 3→3 + alert `discovery_gap`** — bukan turun ke floor 1. `publish.mjs` default count sekarang baca `config.daily_count` (`--count=N` eksplisit tetap menang, fallback 1 kalau config hilang). Alert juga ditulis ke `state.json.rampGate.alert` supaya `notify.mjs` (Stage 3) bisa email. Test override env `SEO_STATE_PATH` + `SEO_CONFIG_PATH` buat matrix test tanpa sentuh state asli.
- **ATURAN LOGIKA ramp-gate (jangan diubah tanpa sengaja):** `index_rate = indexed / discovered`; `discovered = indexed + not_indexed + blocked`; `not_discovered` + `unknown` **dikecualikan** dari pembilang. Gap ≥50% → hold + `discovery_gap` alert (bukan penalti ramp). Rate ≥85% → +2 (cap 10). 70-85% → hold. <70% → -1 (floor 1) + `quality_drop` alert. `discovered < 5` → hold `insufficient_sample`. `halt:true` → 0 (butuh `--reset`).
- 🚨 **KESALAHAN SAYA 1 Okt 2026 — jangan diulang:** untuk menguji `publish.mjs` saya melakukan `await import('./seo/publish.mjs')` — **script itu bukan modul pure**, top-level-nya langsung menjalankan pipeline publish. Akibatnya **3 draft ter-flip jadi published** (`cara-kerja-smm-panel`, `cara-daftar-ssm-panel`, `smm-panel-gratis`) + `queue.json` ikut berubah. **Berhasil saya revert penuh sebelum ada build/deploy** (dicek: `landing/dist` tidak berubah, tidak ada IndexNow baru, 3 URL tetap **404 di produksi**, tidak masuk sitemap, `queue.json` kembali 5 published / 1015 pending / 57 draft, 3 MDX kembali `draft: true`).
  **Aturan keras**: jangan pernah `import()` file `seo/*.mjs` untuk "sanity check" — semua script itu side-effect di top level. Verifikasi pakai `node --check <file>` (syntax only) atau jalankan dengan flag yang aman (`--dry-run`, `--help`). Untuk unit test, pakai env path override, bukan import.
- **1.6 `seo/indexer.mjs` SELESAI 1 Okt 2026** → **Stage 1 TUTUP.** Orchestrator 4 tahap: `indexnow` → `bing-submit` → `gsc-inspect` → `ramp-gate` (ramp hanya Senin UTC / `--ramp`; env `SEO_RAMP_DAY`). Semua tahap jalan sebagai **subprocess** (`spawn(process.execPath, …)`), bukan `import()` — ini sengaja untuk mencegah kelas insiden "flip draft" 1 Okt dan menghindari write race ke `state.json`. Flag: `--dry-run`, `--days N` (dua bentuk: `--days=7` DAN `--days 7`, konsisten dengan script lain), `--only=a,b`, `--skip=c`, `--ramp`, `--json`, `--no-preflight`. Ringkasan ditulis ke `state.indexer.lastRun`.
- **Preflight di indexer**: default ON saat live → `seo/scripts/gsc-doctor.mjs --auth-only` (creds + token + sites.list saja, ~2 request) jalan **sebelum** tahap lain. Kalau gagal → pipeline berhenti, tidak ada tahap yang jalan. Alasan: tanpa preflight, tahap `gsc`/`bing` keluar "OK" padahal kredensial rusak, karena tidak ada URL yang perlu diproses jadi kredensialnya tidak pernah disentuh — fail baru ketahuan saat publish sudah jalan. Flag baru di doctor: `--auth-only`.
- Exit code indexer teruji: kredensial benar 0 · kredensial rusak 1 · `--dry-run` 0 · `BING_API_KEY` kosong 1. Tahap kritikal = `bing` + `gsc` (gagal → jangan publish); `indexnow` + `ramp` = opsional (gagal → WARN, tetap 0).
- Pnpm script baru: `pnpm seo:gsc-doctor`, `seo:gsc-inspect`, `seo:bing-submit`, `seo:ramp-gate`, `seo:index`.
- **Status 1 Okt 2026 setelah 1.6**: Stage 1 habis. Sisa butuh user → **2.1** isi env Coolify prod, **2.2** jawab 3 keputusan GA4. Sisa yang bisa agent kerjakan tanpa blokir → **3.4 `seo/remedy.mjs`**. Menunggu waktu: **W.1** verifikasi 48-72 jam (`seo:gsc-inspect --all --force`).
- **3.4 `seo/remedy.mjs` SELESAI 1 Okt 2026** → agent-side work habis. Klasifikasi per URL dari `published[].indexed`: `indexed` (reset riwayat) · `not_indexed` (IndexNow + Bing re-submit kalau cooldown 30h lewat) · `not_discovered` (IndexNow + submit ulang sitemap GSC, throttle 24 jam) · `blocked` (langsung `needs_human`, robots/noindex) · `unknown` (tunggu). Backoff `recheckDays` 7 hari, `maxAttempts` 3 → habis = `needs_human: true`. Alert ditulis ke `state.remedyAlert{level,code,msg,urls}` (dibaca `notify.mjs` nanti), detail per URL di `state.remedy[url]`. Flag: `--dry-run --force --max-pings N --recheck-days N --max-attempts N --json`. Env override `SEO_STATE_PATH` untuk uji skenario.
- **Bug integrasi yang ketemu saat run live**: `seo/indexnow.mjs` **exit 1 saat semua URL sudah pernah disubmit** (no-op dianggap "semua endpoint gagal"). Akibatnya `remedy.mjs` + `publish.mjs` bisa salah mengira IndexNow gagal. **Sudah diperbaiki**: no-op kini exit 0 dengan pesan "✓ tidak ada URL baru".
- **`bing-submit.mjs` dapat flag baru `--urls=<a,b>`** (daftar eksplisit) untuk re-submit selektif dari remedy — sebelumnya hanya bisa `--url` tunggal / semua published. Hormati kuota + cooldown tetap berlaku.
- **`indexer.mjs` sekarang 5 tahap**: `indexnow → bing → gsc → remedy → ramp` (ramp tetap hanya Senin / `--ramp`). Semua opsional selain bing+gsc.
- Pnpm script lengkap: `seo:gsc-doctor` · `seo:gsc-inspect` · `seo:bing-submit` · `seo:ramp-gate` · `seo:index` · `seo:remedy`.
- **Budget attempts di-reset ke 0** untuk 5 URL setelah 2 siklus remedy pertama ternyata cuma uji coba manual (bukan kegagalan nyata). `nextCheckAt` = 2026-10-08. Kalau tidak di-reset, siklus ke-3 dalam 1 minggu akan memicu `needs_human` palsu.
- **2.1 SELESAI 1 Okt 2026 tanpa sentuh UI Coolify.** Project Coolify **`socio-seo`** dibuat via API resmi: project uuid `b8kxfwt22lswjkyrefw8fayl` (id 4), environment `production` otomatis (env id 5, uuid `c1gnvpjfyihhhtxmkr8kjghw`). 9 env var diisi di level **project** (diwarisi resource nanti): `GCP_PROJECT_ID`, `GSC_SERVICE_ACCOUNT_EMAIL`, `GSC_SERVICE_ACCOUNT_JSON_B64` (3.216 char), `GSC_SITE_URL=sc-domain:socio.id`, `GSC_SITEMAP_URL`, `BING_API_KEY`, `SEO_INDEXER_DAILY_LIMIT=3`, `SEO_RAMP_DAY=1`, `TZ=Asia/Jakarta`. Runbook lengkap: **`docs/COOLIFY_SEO_PROJECT.md`**.
- 🚨 **BAHAYA PRODUKSI: `git push` ke `ReqTimeout/socio.git` `main` = deploy ulang app.socio.id.** Bukti: `socio-app` pakai GitHub App + `is_auto_deploy_enabled=t` + `watch_paths` kosong; image container = `nqsjafrei6k8dkup1pxkcuwf:1cab404c…` (= commit `1cab404`, 25 jam lalu), image sebelumnya `9e38c3d…`. **Semua perubahan SEO-ku sengaja BELUM di-push** (lokal saja) sampai user memutuskan sumber kode runner.
- **Project Coolify `seo-pipeline` itu milik beriklan.co.id, BUKAN socio.id** — isinya app `seo-pipe-app` (cron internal `[cron news-ping]`/`[cron distribute]` + IndexNow ke beriklan.co.id). Namanya mirip tapi jangan dipakai. Peta lengkap: projects 1 `socio-app`, 2 `seo-pipeline`(agency), 3 `agency-beriklan`, 4 `socio-seo`(baru).
- **Cara buat token API Coolify tanpa UI (2 jebakan)**: token disimpan sebagai **SHA-256 hash** (Laravel Sanctum) — plaintext → 401; kolom `abilities` **wajib** (JSON) — NULL → HTTP **500** `in_array(): Argument #2 ($haystack) must be of type array`. Token saya: `opencode-socio-seo`, abilities `["read","write"]` (bukan root/deploy), plaintext di `/root/.coolify-api-token` (chmod 600, di server, bukan repo). Token milik tool lain jangan dipakai: `deploy-token`, `codex-deploy`, `seo-pipeline`, `sociodev`, `agency-agent`, `beriklan`, `sgb`.
- Endpoint env level **project hanya terima `key`+`value`** (`is_buildtime`/`is_runtime` → 422). Nilai env **terenkripsi at rest** (Laravel encrypted cast) jadi panjang di DB ≠ panjang asli (3.216 → 5.920). Description project juga menolak em-dash (422) — pakai ASCII.
- `GH_TOKEN` di `.env` **valid**: user `ReqTimeout`, admin/push di repo `socio` (public). `gh` CLI tidak terpasang. Repo `ReqTimeout/socio-seo-content-id` (planned) **belum ada** (404). Coolify tidak ada `coolify` CLI lokal dan tidak ada `docker` di laptop → semua operasi lewat SSH.
- **Coolify Scheduled Tasks = 0** di seluruh instance (verified) → runner 06:00 / Senin / monitor belum ada sama sekali.
- **Opsi A dipakai** (keputusan user 1 Okt): repo **`ReqTimeout/socio-seo-runner`** (private, 19 file) sebagai rumah image runner; monorepo tetap source of truth; sinkron via **`node runner/publish-repo.mjs`** (git over SSH, allowlist 19 file, guard menolak private key / token GH / BING_API_KEY produksi / file >300 KB). Last commit `085964f`.
- ⚠️ **`GH_TOKEN` (fine-grained PAT) tidak bisa dipakai untuk repo baru**: `POST /git/blobs` → 404, push HTTPS → 403 "Write access not granted", dan `GET /repos/...` → 404 (token ter-scope per repo). **SSH key lokal TERDAFTAR di GitHub** (`ssh -T git@github.com` → "Hi ReqTimeout!") → itu jalur yang dipakai `publish-repo.mjs`. Coolify juga tidak bisa: DB-nya cuma punya source "Public GitHub" (`app_id`/`installation_id` kosong = clone tanpa auth), jadi **repo private tidak bisa di-clone Coolify** → blokir tersisa: jadikan public atau pasang Coolify GitHub App (`docs/COOLIFY_SEO_PROJECT.md` §6.1).
- **Image runner proven jalan di produksi host**: `docker build -t socio-seo-runner:test` (326 MB, tanpa `npm install` karena zero-dep) → `docker run --env-file … node runner/daily.mjs` **exit 0**: preflight `gsc-doctor --auth-only` OK (auth Google nyata dari VPS) · bing cooldown → 0 · gsc cache 24j → 0 · remedy 5 backoff · notify graceful tanpa Resend · lock ambil/lepas · publish no-op eksplisit. `weekly.mjs` juga OK (mining GSC 100 query real). Volume `/app/data` terbukti persisten (`state.json`, `config.json`, `keywords.mined.json`).
- File env sementara di VPS **sudah dihapus** (`shred -u /tmp/runner.env`) setelah uji. Cara scp tanpa noise xattr macOS: `COPYFILE_DISABLE=1 tar …`.
- `runner/publish-repo.mjs` dua bug yang sudah diperbaiki: (1) `ensureClone()` dipanggil **setelah** menyalin file → `rmSync` menghapus file yang baru disalin (harus sebelum); (2) `git rev-parse HEAD` gagal di repo tanpa commit → fallback `'root'`. `ensureClone()` sekarang `git init -b <branch>` + tolerant checkout.
- **Coolify 4.3.23 punya opsi "GitHub Private Repository (deploy key)"** (`app/Livewire/Project/New/GithubPrivateRepositoryDeployKey.php`) — jauh lebih gampang daripada bikin GitHub App. Deploy key untuk repo `socio-seo-runner` sudah disiapkan: `private_keys` id **1** uuid `ftdt1pym28uaduhqhfvpgki2`, private key hanya di `/root/.ssh/coolify-seo-runner` (600), fingerprint `SHA256:gwOxfqUMGbFuq140uI3oQNWszOHVDZl3pH1MrhCPfjM`, versi DB-nya **terenkripsi**. Cara bikin baris `private_keys`: salin key ke `/tmp`, `docker cp` ke container, jalankan script PHP yang bootstrap Laravel + `PrivateKey::create()` (cast `encrypted` harus lewat model, bukan SQL mentah — kolomnya Laravel encrypted). File sementara di container harus dihapus dengan `docker exec -u 0` (file hasil `docker cp` milik root).
- ⚠️ gotcha: `docker exec coolify sh -c 'rm …'` **gagal** ("Operation not permitted") untuk file hasil `docker cp` → pakai `docker exec -u 0`.
- Public key deploy key (dipakai di GitHub Settings → Deploy keys, **tanpa** centang write): `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGFaO5mlwiijHdRfxcbSK92TqsyOgHNSj/ApD8sFAAhm coolify-seo-runner-deploykey`
- **3.2 + 3.3 LIVE 1 Okt 2026.** App Coolify `socio-seo-runner` uuid `c9iqug5vvi9kjywt1fn6xnsc` di project `socio-seo`, image `c9iqug5vvi9kjywt1fn6xnsc:<sha>` (326 MB), CMD `node runner/idle.mjs` (RestartCount 0), tanpa fqdn/ports. 2 Scheduled Task: `seo-daily-index` `23 * * * *` UTC (06:00 WIB, uuid `typijvbcwldn4xjljls2zw4o`) dan `seo-weekly` `2 2 * * 1` UTC (Senin 09:00 WIB, uuid `raovpgwn2fzhs5fttjrkidge`). Uji `execute` → `scheduled_task_executions` status **success**, 4,28 dtk, retry 0, log `exit 0` + `env: GSC=ada · BING=ada · INDEXNOW=ada`.
- **Tiga jebakan Coolify 4.3.23 (sudah painfully dicek, jangan diulang):** (1) `git_repository` **wajib SSH URL** (`git@github.com:...git`) — `https://` → clone tanpa auth → `could not read Username` → deploy failed; (2) **shared env var level project TIDAK terinjeksi ke container aplikasi** di versi ini → harus level aplikasi (`POST /applications/{uuid}/envs`, `is_runtime: true`); (3) **CMD Dockerfile harus idle** — kalau `CMD` = pipeline yang exit, container restart-loop dan `docker exec` (Scheduled Task) balapan.Selesai.
- **`POST /api/v1/deploy` butuh `api.ability:deploy`** (`routes/api.php:145`). Token `opencode-socio-seo` sengaja `["read","write"]`; saat deploy ability ditambah sementara lalu dikembalikan (kalau `deploy` menetap, token bisa mendeploy `socio-app` juga).
- Endpoint penting untuk Coolify API: `POST /applications/{app_uuid}/scheduled-tasks` (wajib `name`,`command`,`frequency`), `POST /applications/{app_uuid}/scheduled-tasks/{task_uuid}/execute`, `POST /deploy?uuid=`. Payload `applications/private-deploy-key` butuh `project_uuid`, `server_uuid`, `environment_name`/`environment_uuid`, `private_key_uuid`, `git_repository`, `git_branch`, `build_pack`.
- **GA4 (item 3.1 + 2.2) kode selesai 1 Okt 2026, BELUM DEPLOY.** Keputusan user: **1 property** · **consent banner + Consent Mode v2** · **app.socio.id TIDAK dilacak sama sekali** (area login) → gtag `linker` tidak dipakai (cuma 1 host, jadi konfigurasi mati). ID `G-MDJCW053XR`, env `PUBLIC_GA4_ID`.
- File baru: `landing/src/components/ConsentBanner.astro`, `landing/src/pages/privacy.astro`. File diubah: `landing/src/layouts/Layout.astro` (head: consent default denied → loader async; body: banner + event tracking), `landing/src/components/Footer.astro` (link privasi), `landing/public/_headers` (CSP `connect-src` += `*.google-analytics.com` `*.analytics.google.com` `*.googletagmanager.com`), `.env.example`.
- ⚠️ **Efek samping penting**: loader AdSense sekarang **ditahan sampai consent `all`** (sebelumnya langsung di-load). Ini menutup gap compliance, tapi mengubah perilaku iklan di produksi → butuh persetujuan deploy.
- **Consent Mode v2 wajib push default SEBELUM gtag.js dimuat** — kalau dibalik, consent cuma hiasan dan Google tetap kirim cookie. Urutan di `Layout.astro`: consent default → cek storage → `wait_for_update: 500` → baru muat gtag.
- Event taxonomy landing: `page_view` (otomatis), `generate_lead` (link ke `app.socio.id`), `outbound_click` (app/WA/Telegram), `scroll_depth` 25/50/75/100 (toleransi 1% agar 100 tidak hilang), `select_promotion` (CTA `cta-glow`). Privacy: `page_location` tanpa query string, tanpa `user_id`, tanpa PII.
- Kill switch QA: `?consent=off` diproses di **head script** (memaksa `essential` sebelum default dipush) — kalau hanya di banner, storage lama sempat terbaca `granted`. Flag ini juga berguna untuk revenue test.
- **Tooling verifikasi GA4**: browser Chromium sudah ada di `~/Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`, tapi `playwright-core@1.61` (skill pw-vision) **expects build 1228** yang belum terinstall → harus launch dengan `executablePath` eksplisit. Cara: sajikan `landing/dist` sebagai statis lalu pakai `dataLayer` + `page.on('request')` untuk assert (bukan cuma grep HTML).
- **Bug UX yang ketemu & diperbaiki**: `scroll_depth` 100% tidak pernah terkirim → toleransi `pct >= depth - 1`.
- **W.2 + GA4 DEPLOY LIVE 1 Okt 2026 15:06 UTC — deployment `966555ba`** (Pages `socio-id`, branch main, direct upload via `npx wrangler pages deploy landing/dist`, **pakai `npx` bukan `pnpm dlx`**). Smoke 11/11 URL 200. Uji browser produksi: banner muncul, **0 request GA4/AdSense sebelum accept**, gtag termuat setelah accept, `consent update` granted, **0 console error / 0 CSP violation**. `/privacy` 308→200 (trailing slash).
- **W.2 fixes (mesh money→blog)**: `RelatedArticles.astro` sudah ada sejak lama tapi hanya merender kalau ada artikel yang cocok platform → money page TikTok/YouTube/Telegram **0 link**. Sekarang ada **fallback artikel terbaru** sampai 3 + link "Semua artikel → /blog/" selalu. Hasil: **41 money page** dari 0 → 3 link artikel + 3 link `/blog`. Homepage sebelumnya **tidak punya jalur artikel sama sekali** (cuma navbar) → ditambah section **Artikel terbaru** (3 terbaru, reuse `ArticleRow.astro`, sebelum FAQ).
- ✅ **KOREKSI KLAIM SALAH (W.3)**: "`/blog/` cuma list 4 dari 5 artikel" itu **SALAH** — pagination-nya sudah benar, artikel ke-5 ada di `/blog/page/2/`. Saya hanya melihat page 1. Sudah dikoreksi di plan.
- 🔴 **TEMUAN: AdSense tidak pernah live.** `PUBLIC_ADSENSE_CLIENT` **tidak ada di `.env`** (hanya di `.env.example`) → semua build lokal (dan semua deploy sebelumnya) merender **0 slot iklan**; produksi juga `ca-pub` = 0. Jadi **tidak ada regresi pendapatan** dari perubahan consent-gating. Slot IDs (`PUBLIC_ADSENSE_SLOT_*`) juga masih kosong di `.env.example`. AdSense baru hidup setelah client + slot ID diisi di `.env` → lalu rebuild + deploy.
- Catatan tools: `curl` ke `*.pages.dev` mengembalikan halaman kecil 16 KB (bukan isi deploy) → **jangan pakai pages.dev untuk verifikasi produksi**, pakai domain produksi (`socio.id`) + `--compressed`.
- **4.1 `seo/qc-uniqueness.mjs` SELESAI 1 Okt 2026** (Stage 4item 1 dari 4). Zero-dep: TF-cosinus + shingle-4 Jaccard + overlap kata, skor `0.6·cos + 0.25·jac + 0.15·ovl`, plus deteksi judul duplikat, plus konteks klaster dari queue.json. Ambang default FAIL 0.62 / WARN 0.48. Exit 0/1/2. Flag: `--slug` (berulang), `--fail`, `--warn`, `--top`, `--json`, `--strict-cluster`.
- **Skalagate:** prefilter inverted index atas token langga + **cap 40 dokumen per token umum** (sorted by slug, deterministik). 1.000 file = **2 detik**; 62 file = 0,4 detik. **Pelajaran:** versi pertama me-*skip* token dengan df>40 → korpus homogen (justru kasus yang paling dituju) lolos dengan **0 pasang** saat diuji 1.000 file near-duplicate. Cap, jangan skip.
- **Angka kunci (1 Okt):** korpus 62 MDX → 11 FAIL (semua pasangan varian `smm-panel-termurah-<kota>`, cosine 0.72-0.83) + 149 WARN + 0 title dup. Audit 57 draft → **12 diblokir, FAIL rate 21,1%** (DoD §13 minta < 10%). Jadi gate membuktikan dugaan plan §1.2: varian geo-kota itu duplikat_isinya.
- **Integrasi publish:** `publish.mjs` memanggil gate **per slug** (`execFileSync node seo/qc-uniqueness.mjs --slug X --json`), exit 1 = blokir slug itu saja + tampilkan 3 pasangan mirip, `--skip-uniqueness` untuk override manual. Gate **global** akan salah: korpus warisan punya 11 FAIL → semua publish terblokir selamanya.
- ⚠️ **Tidak saya verifikasi end-to-end**: `publish.mjs` sendiri tidak dijalankan (efeknya flip draft + build + **deploy** produksi). Gate diverifikasi lewat simulasi perintah persis yang dipanggilnya untuk 57 draft. Kalau mau uji penuh → `node seo/publish.mjs --count=1 --no-deploy` (tanpa `--no-deploy` akan deploy!).
- **Bug kelas yang terulang (sekarang ke-3 kali):** `process.exit()` **setelah menulis stdout besar** memotong output saat stdout adalah pipe → selalu pakai `process.exitCode = n; return;`. Dan `parseArgs` dipanggil di luar try/catch → arg invalid keluar 1, bukan 2.
- **4.2 `seo/cluster-manifest.mjs` + `seo/clusters.json` SELESAI 1 Okt 2026.** Manifest dibangun dari data nyata (queue 1.077 + cities.json 72 kota + MDX existing), bukan dari daftar harapan plan §1.2. Zero-dep. Mode: default audit · `--build` tulis (idempoten) · `--strict` exit 1 · `--json`.
- **Angka kunci (1 Okt):** cakupan **94,9%** (1.022/1.077) · 864 geo → P10 · **792 varian geo excess** (72 kota × 12 varian, rencana cuma 1/kota) · **10/12 artikel pilar belum ada** (hanya P1 smm-panel & P3 cara-menambah-followers-instagram yang live) · P5/P6/P11 **0 cluster** (keyword-nya memang tidak ada di queue) · 55 unassigned terkelompok (spotify 12, reels 10, facebook 8, telegram 6, live 5) → **pillar map §1.2 tidak punya slot untuk platform itu**.
- Clustering: geo dikenali dari `cluster: geo-<kota>` atau slug berakhiran nama kota dari `cities.json` → semua masuk P10 (supaya varian geo tidak memecah pilar intent). Intent dipetakan via pola `slug.includes(pattern)` per pilar.
- **Belum dipakai downstream**: `from-template.mjs` v2 belum membaca clusters.json untuk auto-link `## Lihat juga` (§1.4) — itu pekerjaan terpisah.
- **4.3 `seo/jsonld-validate.mjs` SELESAI 1 Okt 2026 (kode, BELUM deploy).** Zero-dep (tidak pakai `schema-dts` — akan merusak image runner zero-dep; tidak pakai Rich Results Test — tidak ada endpoint publik). Validasi: JSON valid · `@context` · `@type` dikenal · field wajib per tipe · placeholder · URL host vs canonical · `AggregateRating` (di Product **dan** offers) · coverage matrix vs plan §5.1. Hasil: **56 halaman · 360 blok · 0 error · 0 warning** (`--strict` exit 0).
- Schema ditambahkan: **44 money page** `Service`+`AreaServed` (City+provinsi dari `cities.json` kalau geo, Country kalau tidak; **`AggregateRating` sengaja TIDAK dikarang** — fake rating = pelanggaran Google) · `/blog/` `ItemList` (page/2 sudah punya, page 1 belum = inkonsisten) · `/layanan` `CollectionPage`+`ItemList` (indeks katalog, bukan Product) · `/` `WebPage`+`primaryImageOfPage` · `/privacy` `WebPage`.
- **Landing bisa import file dari luar root**: `import cities from '../../../seo/cities.json'` di `landing/src/layouts/BeliPage.astro` **berhasil** — jadi tidak perlu duplikat `cities.json` ke `landing/src/data/`. (Versi pertama menyalin file → risiko drift, dibatalkan.)
- 🎯 **Validator saya sendiri yang salah, bukan sitenya**: `Person` + `SpeakableSpecification` dianggap hilang karena hanya menghitung `@type` **top-level**, padahal keduanya valid nested di `Article.author`/`Article.speakable`. Ditambah fungsi `collectTypes()` yang menelusuri nested. Ini pola yang perlu diingat: validator schema harus memperhitungkan node nested, bukan cuma blok root.
- Wiring: `publish.mjs` jalankan `node seo/jsonld-validate.mjs --strict` **post-build, pre-deploy, fail-closed**. Pnpm script `seo:jsonld`.

## 1 Okt 2026 — 4.4 mesh-build.mjs (internal mesh 2-arah) + insiden regex frontmatter

**Stage 4 sekarang 4/4 di level kode** (4.1 qc-uniqueness, 4.2 cluster-manifest, 4.3 jsonld-validate, 4.4 mesh-build). **Nol deploy** — 4.3 dan 4.4 masih lokal, tunggu izin user.

**Yang jadi di `seo/mesh-build.mjs`:** mengisi `related[]` (maks 3, batas `content.config.ts`) dengan prioritas pilar → sibling (pilar sama, kategori sama dulu) → kota tetangga se-provinsi → fallback. Target **harus published** (draft tidak punya halaman karena `getStaticPaths` memfilter `!draft`, jadi link ke draft = broken link). Kurasi `related[]` lama **dipertahankan** (bukan ditimpa) kecuali `--reset`. Pass resiprokal membalas edge satu arah selama slot target cukup. Default **laporan saja**; `--write` untuk menulis. Idempoten (dibuktikan: 2x jalan = 0 perubahan).

**`clusters.json` TIDAK menyimpan geo/provinsi.** `clusters_meta` cuma `slug/keyword/status/hasArticle/draft/priority`; 864 cluster geo ada di P10 tapi tanpa info kota. Sumber provinsi satu-satunya = `seo/cities.json` (72 kota, 33 provinsi). Deteksi kota dari **suffix slug** (`smm-panel-termurah-jakarta` → jakarta). 54/62 artikel terdeteksi geo dengan provinsi benar.

**⚠️ INSIDEN — regex `---` menghapus pagar frontmatter (5 file MDX rusak, sudah dipulihkan).** Pola item list lama `\n[ \t]*-[ \t]*[^\n]*` menandai baris `---` sebagai list item (`-` + `--`), jadi regex menelan pagar penutup frontmatter. 5 file published kehilangan `---` → frontmatter rusak, `indexOf('\n---')` = -1, build mustahil. **Pulih:** `git checkout --` 5 file; diff saat itu hanya `+1/-1 baris` per file jadi tidak ada kerja lain yang hilang. **Perbaikan:** regex jadi `\n[ \t]+-[ \t]+` (wajib spasi setelah dash) + guard berlapis — file dengan pagar `---` bukan 2 langsung ditolak (exit 3), dan hasil tulis diverifikasi ulang (pagar utuh + `related[]` terbaca identik) sebelum ditimpa. Duplikat `related[]` → exit 4.

**Pelajaran:** regex untuk YAML list HARUS mewajibkan `- ` (dash + spasi). Pola `-\s*` atau `[ \t]*-` akan menelan `---`. Selalu verifikasi jumlah pagar `---` sebelum/sesudah tulis file frontmatter, dan pakai `git diff --stat` untuk memastikan perubahan `insert-only`.

**Wiring:** `publish.mjs` jalankan `node seo/mesh-build.mjs --write` **sebelum** build (harus sebelum supaya `related[]` ikut ter-render); fail-closed. `package.json`: `seo:mesh`, `seo:clusters`, `seo:qc-uniqueness`, `seo:jsonld`.

**Verifikasi:** 56 halaman build sukses · related[] di `dist/` cocok persis dengan mesh yang dihitung (5/5) · 0 broken link internal · `jsonld-validate --strict` PASS · diff insert-only (5 file, +8 baris, 0 hapus) · draft tidak tersentuh · aturan "kota tetangga" terbukti di korpus sintetis.

**Efek mesh masih kecil (jujur):** baru 5 artikel published, 2 dari 3 slot masih "fallback" karena belum ada sibling geo yang published. Mesh baru jadi benar-benar bermakna setelah artikel geo P10 dipublish — itulah alasan keputusan 792 varian geo (merge vs 12 kota beda isi) penting.

## 1 Okt 2026 — deploy `db2bd240`: 4.3 + 4.4 LIVE di Cloudflare Pages `socio-id`

**Stage 4 selesai 4/4 dan 4.3+4.4 sudah live.** Target hanya Cloudflare Pages `socio-id` (→ `socio.id`, `www.socio.id`). **Tidak ada `git push`, tidak ada mutasi ke Coolify `socio-app`** — `app.socio.id` dicek sebelum & sesudah: **tetap 303**, dan `socio-app.updated_at` tidak berubah (`2026-10-01T16:10:37Z`).

⚠️ **Token CF: `accountcf.md` punya DUA API token (baris 4 & 16), dan token OAuth bawaan wrangler gagal** (`Authentication error [code: 10000]`) untuk akun `0298214d…`. Kedua token **diuji read-only** dulu pakai `pages project list`; hanya **baris 4** yang punya akses. Jangan pernah deploy dengan menebak token.

⚠️ **Jangan build landing pakai `npx astro build` langsung.** `landing/package.json` build script = `astro build && node ../seo/fix-sitemap.mjs`; `fix-sitemap.mjs` menulis **51 `<lastmod>`** ke `sitemap-0.xml` (sinyal freshness yang dipantau W.1). Build manual melewatkan langkah itu → sitemap kehilangan `lastmod`. Selalu `pnpm --filter landing build`, dan cek `rg -o '<lastmod>' landing/dist/sitemap-0.xml | wc -l` = 51 sebelum deploy.

**Deploy:** `CLOUDFLARE_API_TOKEN=<baris 4> CLOUDFLARE_ACCOUNT_ID=0298214d… npx wrangler pages deploy landing/dist --project-name socio-id --branch main --commit-dirty=true`

**Verifikasi produksi:** 10 URL landing 200 · `/beli-followers-tiktok-jakarta/` 404 **benar** (`draft: true`) · `Service`+`Product`+`FAQPage`+`HowTo` di money page · mesh `/blog/smm-panel/` = 3 link cocok persis · `ItemList` di `/blog/` · `CollectionPage`+`ItemList` di `/layanan/` · `WebPage` di `/privacy/` · GA4 + CSP/HSTS aktif.

**⚠️ Dua hal yang belum terbukti (jangan diklaim selesai):**
1. **Cabang `areaServed: City` belum pernah jalan di produksi** — 44 money page semuanya non-geo (10 tulis tangan + 34 generated), jadi 42 halaman live pakai `Country (Indonesia)` dan **0** pakai `City`. Logikanya sudah diuji (replikasi `BeliPage.astro:92-97` ke 8 slug, termasuk fallback dua-tail untuk `tangerang-selatan`), tapi butuh money page kota pertama untuk terbukti di server.
2. **Mesh masih 5 artikel**, 2 dari 3 slot masih fallback. Butuh artikel geo published.

**Untuk agent berikutnya:** `app.socio.id` = Coolify `socio-app`, auto-deploy dari GitHub App dengan `watch_paths` kosong → **jangan pernah `git push` ke branch `main` repo itu.** Semua kerja SEO cukup lewat Cloudflare Pages CLI.

## 2 Okt 2026 — deploy `6c9a7ab9`: money page akhirnya punya jalur crawl + bug consent banner

**Temuan yang mengubah prioritas (bukan "kurang artikel"):** 42 money page — halaman yang menghasilkan duit — juga `Discovered - currently not indexed`, bukan cuma 5 artikel. Yang terindeks cuma `/` dan `/layanan/`, dan keduanya adalah halaman yang **paling banyak mendapat link internal**. Penyebabnya diukur: robots/canonical/sitemap/ketebalan/similaritas semua bersih; yang rusak adalah **inbound link** — 37 dari 42 money page cuma punya 1–5 link, `/layanan/` hanya menaut 5 dari 44, dan **0 dari 44** tertaut dari artikel.

**Perbaikan (semua di Cloudflare Pages `socio-id`; `app.socio.id` tetap 303, tanpa `git push`):**
1. `/layanan/` dapat section hub "Halaman per layanan" — 44 money page dikelompokkan per platform, **44/44 tertaut**. `ItemList` pada `CollectionPage` diubah dari anchor kategori jadi 44 money page dengan URL nyata.
2. `landing/src/lib/money-links.ts` (baru) — pilih money page relevan dari **judul (3×) + deskripsi (2×) saja**, ambang 6, tambahan harus ≥60% dari terbaik, fallback `/layanan/`. Dipanggil di server dari `blog/[slug].astro` supaya link ada di HTML statis.

**Pelajaran matcher (3 koreksi, semua dari pengukuran):** ambang rendah → artikel generik nyangkut ke `/beli-followers-twitter/`; **body artikel tidak boleh dipakai scoring** karena tabel harga mendaftarkan semua layanan (artikel generik nyangkut ke `/beli-jam-tayang-youtube/`); `truncate` + span platform redundan membuat **33 dari 44** label terpotong ellipsis di 360px.

**Consent banner "gabisa diklik":** bukan bug fatal — klik di browser berhasil, `elementFromPoint` mengembalikan BUTTON. Penyebabnya banner 231px menutupi konten yang ruangnya cuma 88px (padding dari `FloatingTabDock.svelte`), jadi ±143px konten tersembunyi. Diperbaiki dengan **spacer** `#consent-spacer` (bukan `body padding-bottom`, supaya tidak berebut spesifisitas dengan dock), ruang dipesan sebelum paint (**CLS 0.0000**), tombol utama full-width 332×48, "Essential saja" → "Tolak", muncul 700ms. Kontrak `socio:consent` + `socio_consent` tidak diubah.

**Pelajaran Astro:** komentar `{/* ... */}` **tidak boleh** menjadi saudara langsung sebuah elemen di dalam arrow function `map` — parser gagal dengan `Expected ")" but found "$$render"`. Taruh komentarnya di luar `.map()`.

**Belum terbukti:** jalur crawl sudah diperbaiki, indeks **belum** pasti ikut. Butuh 1–2 minggu. Jangan evaluasi GSC besok — itu noise. Yang dievaluasi nanti: apakah `Discovered - currently not indexed` mulai turun.

## 2 Okt 2026 — Plan dirapikan (satu papan) + keputusan 792 geo & 55 unassigned

**Plan sebelumnya punya 3 papan progres yang bertentangan** — §12 Sprint 3 bilang "5/12", §14.2 bilang "17/21", §13 DoD bilang "6/18", dan Sprint 4/5/6 **tidak punya kolom status sama sekali**.  Itu sebabnya user bingung "sudah sampai mana". Sekarang: **SNAPSHOT STATUS** di paling atas = satu-satunya angka yang sahih; angka lama ditandai `[SUPERSEDED]`. Sprint 4/5/6 dapat kolom Status. Ringkasan jujur: **infrastruktur 100% (live), konten nyaris nol, akuisisi off-site nol.**

⚠️ **Saya sempat merusak struktur plan saat menambal** (penggantian string berulang bikin heading ketempel ke baris tabel, dan `replace_table` menelan baris). Semuanya **berhasil diperbaiki & diverifikasi**: 0 heading hilang, 0 struktur glued, semua §0–§15 utuh. Pelajaran: **jangan patch markdown besar dengan `.replace()` beruntun** — pakai edit terarah + verifikasi heading setelahnya.

**KEPUTUSAN geo (user: "kamu yang penting, longtail tetap ada") → tidak ada halaman dihapus.**
Akar masalah ditemukan: `cities.json` punya field `anchor` + `buyer` per kota yang didesain **khusus** supaya geo page bukan doorway page — tapi **tidak pernah tersambung ke `geo-expand.mjs`**. Terbukti 0 dari 3 sampel memuat anchor. Itu sebabnya 12 varian/kota mirip (0,58–0,68): fakta lokal yang membedakan tidak pernah ditulis. Fix = pasang anchor jadi syarat + gate di `qc-uniqueness.mjs` + publish per wave tier (1: 16 kota = 192 halaman; 2: 21 kota = 252; 3: 35 kota = 420). 864 tetap utuh.

**KEPUTUSAN 55 unassigned:** 13 sudah tercakup money page → cukup jadi FAQ/section. 42 keyword = hanya **~10 service berbeda** × modifier `{beli|jasa|order}` → buat **10 money page baru**, modifier dijawab di FAQ/H2, bukan 42 halaman tipis.

## 2 Okt 2026 — anchor kota disambungkan, tapi hypothes "anchor cukup" TERBUKTI SALAH

**Baru:** `seo/lib/geo-anchor.mjs` (`renderGeoAnchor` / `injectGeoAnchor` / `hasGeoAnchor`), disuntik **deterministik** di `seo/generate.mjs` setelah `assembleMdx` (bukan bergantung LLM — free model sering tidak patuh). `seo/qc-uniqueness.mjs` sekarang mendeteksi artikel geo (72 kota) + melaporkan `anchor kota: N/M`.

**Koreksi dugaan sebelumnya:** anchor kota BUKAN tidak pernah dipakai. Terukur **40/54** artikel geo sudah memuatnya; yang tidak cuma 14, dan semuanya pola `reseller-` / `beli-` / `harga-` / `agen-` / `umkm` / `ter eléctricos-` (template `smm-panel-*` memang memakainya). Dugaan awal saya bertumpu pada 3 sampel yang salah pilih.

**Bug yang tertangkap saat implementasi:** `renderGeoAnchor` destructuring `anchor`, tapi queue `geo-expand.mjs` mengirim `local_anchor` → selalu `null`, tidak pernah menyuntik. Lolos `node --check`, lolos uji langsung `renderGeoAnchor`, tapi gagal lewat `injectGeoAnchor`. **Pelajaran: uji fungsi lewatjalur yang sama dengan pemakaian nyata, bukan langsung ke fungsi intinya.**

**Hasil ukurnya (paling penting):** korpus sintetis 12 artikel templat identik, diukur dengan gate asli —

| konten lokal | FAIL pairs | skor top | (ambang 0,62) |
|---|---|---|---|
| 0 kata | 66/66 | 0,964 | |
| anchor ~25 kata | 57/66 | 0,861 | |
| +40 kata | 66/66 | 0,862 | |
| +80 kata | 66/66 | 0,862 | |

**Anchor menurunkan skor tapi TIDAK PERNAH melewati ambang.** Menambah 80 kata konten lokal tidak mengubahnya — boilerplate bersama masih mendominasi. Artinya §14.13 "anchor jadi syarat → publish 3 wave" **tidak akan jalan**; semua halaman geo tetap di-block gate. Itu perilaku yang benar (gate melindungi dari 864 doorway page), tapi artinya:** jangan tambah halaman, tambah BEDA ISI.**

Rekomendasi (§14.14): perkecil geo jadi 12 intent nasional + 1-2 halaman kota tier 1 (± 30-40 halaman), atau tulis lokal sungguhan untuk 5-10 kota. Butuh keputusan user.

## 2 Okt 2026 — OPSI 2 proven: artikel geo ditulis ulang, Solo 0.604 → 0.337

User pilih Opsi 2 (tulis konten lokal sungguhan). **Methodenya berhasil, terukur.**

**Aturan yang disepakati:** fakta lokal hanya dari `seo/cities.json` (approved 30 Sep); harga hanya dari `prices.json` (synced 11 Sep — angka di artikel lama sudah basi: IG Video Views 81 → 59). Yang membedakan antar-kota = **cara menyusun + kesimpulan**, bukan fakta baru.

**Cara yang berhasil (bukan menempelkan anchor):** artikel `smm-panel-termurah-solo` ditulis ULANG dengan struktur berbeda — diurutkan **tahap funnel** (jangkauan → bukti → pengikut), bukan topik; plus section "Layanan yang tidak perlu kamu beli" yang tidak ada di artikel template lain. 1.090 kata · 7 H2 · 5 FAQ.

**Hasil:**

| metrik | sebelum | sesudah | ambang |
|---|---|---|---|
| skor Solo | 0,604 | **0,337** | WARN 0,48 |
| shingle-4 | 0,367 | **0,010** | — |
| pasangan Solo di daftar duplikat | 20 | **0** | — |
| WARN korpus | 149 | **129** | — |

Pasangan city lain yang paling mirip masih **0,715** (cilegon⇄Pekanbaru) — jadi Solo sekarang jadi salah satu yang paling bersih di korpus.

**Pelajaran utama (lawan §14.14):** menambah 80 kata konten lokal lokal TIDAK menurunkan skor (0,862 tetap 0,862), tapi **menulis ulang struktur artikel** turunkan 0,604 → 0,337. YangACKNOWLEDGE duplikasi adalah STRUKTUR & SUDUT, bukan volume.

**Pelajaran teknis: jangan pernah `re.sub(r"[ 	]{2,}", " ", s)` pada file MDX** — itu merusak indentasi YAML frontmatter (`faq:`/`a:` jadi tidak valid). Sapu spasi hanya di dalam body, atau pakai editor yang menjaga indentasi.

**Status:** artikel masih `draft: true` (produksi 404 — sesuai gate). Lanjutan: ulangi pola untuk 4–9 kota tier 1, satu artikel per kota, ukur tiap selesai.

## 2 Okt 2026 — 9 artikel geo ditulis ulang, FAIL 11 → 0

Pola dari pilot Solo diterapkan ke 8 kota lagi. **Penting: tiap kota pakai kerangka organise YANG BERBEDA.** Dua percobaan pertama membuktikan risikonya — Pekanbaru ⇄ Solo naik ke 0,465 hanya karena keduanya pakai "tiga lapis". Kalau kerangkanya seragam, artikel baru jadi cluster duplikat baru.

Kerangka per kota: Solo=tahap funnel · Pekanbaru=B2B supplier · Cilegon=kredibilitas/jejak · Palembang=rantai distributor · Padang=segar vs beku · Cirebon=detail motif vs order ulang · Tasikmalaya=fase musim · Badung=pengunjung≠pengikut · Jayapura=verifikasi bukan jangkauan.

**Hasil:** FAIL **11 → 0 pair**, WARN 149 → **78**. Sembilan artikel semua AMAN (0,410–0,465). Pasangan antar 9 artikel baru: 36, tertinggi 0,465 (ambang 0,48).

**Status:** semua masih `draft: true`, tidak ada yang dipublish. Tidak ada deploy — ini perubahan korpus konten, bukan template landing. Publish lewat `publish.mjs` (gate mesh + JSON-LD sudah aktif di sana).

**Sisa:** 78 WARN (status "boleh, yang dibangun dengan memperhatikan", bukan pemblokir). Tertinggi 0,611 (purwokerto⇄serang). Tidak ada lagi alasan menunda publish.

⚠️ **Pelajaran teknis yang terjadi!** Menulis artikel panjang bahasa Indonesia sering menyisipkan karakter asing (CJK/slovak/cyrillic) dan kata campuran huruf di tengah. Selalu jalankan 3 pemeriksaan setelah menulis: (1) scan CJK/cyrillic, (2) scan `[a-z]+[A-Z]{3,}[a-z]*` untuk kata campuran, (3) `yaml.safe_load(frontmatter)` untuk memastikan YAML valid. Dan **JANGAN** `re.sub(r"[ 	]{2,}", " ", s)` pada seluruh file — itu merusak indentasi YAML `faq:`; sapu spasi hanya di bagian body.

## 2 Okt 2026 (lanjutan) — 3 BUG KERJA SENDIRI ketahuan saat verifikasi

Setelah 9 artikel ditulis, verifikasi menyeluruh menemukan **3 kerusakan yang saya buat sendiri** dan tidak terlihat di gate mana pun:

1. **8 file kehilangan pagar frontmatter.** Skrip bersih saya melakukan `s = "---" + fm + body` dengan `fm = s[4:end]` — itu membuang `---\n` (4 karakter termasuk newline) lalu menempelkan `---` tanpa newline → jadi `---title: "..."`. Astro tidak bisa baca. **Tertangkap oleh guard `mesh-build.mjs`** (pagar `---` harus 2) — guard itu yang menyelamatkan. Tanpa guard, build baru gagal belakangan.
2. **Solo punya `- q::` (dua titik dua)** di 5 FAQ — off-by-one `line[4:]` di skrip perbaikan indentasi YAML.
3. **9 artikel melanggar schema Astro:** `description` > 160 karakter (8 file) dan `title` > 70 karakter (4 file). Gate `qc-uniqueness` **tidak** memvalidasi schema content collection — hanya `astro build` yang menangkapnya.

**Pelajaran:** `qc-uniqueness` + `yaml.safe_load` itu BELUM cukup untuk menyatakan artikel "selesai". Wajib ditambahkan:
```bash
node seo/qc-uniqueness.mjs --slug <slug>          # duplikasi
python3 -c "import yaml;d=yaml.safe_load(open(f).read().split('---')[1]);assert len(d['title'])<=70 and len(d['description'])<=160 and len(d['faq'])==5"
node seo/mesh-build.mjs                            # pagar frontmatter
PUBLIC_GA4_ID=... pnpm --filter landing build      # validasi schema Astro sebenarnya
```

**Status akhir:** FAIL **0** (dari 11), WARN 78 (dari 149). 9 artikel: 0,407–0,464, semua di bawah ambang WARN 0,48. Semua masih `draft: true` — belum dipublish.

## 2026-10-02 — 55 keyword `unassigned` ditutup (unassigned: 0)

**Klasifikasi awal salah, dan itu penting.** Saya sempatlysan8 money page baru
untuk 8 "cluster" dan certaines averted itu katalog tidak punya. Verifikasi
langsung ke tabel `services` di DB produksi membalikkan gambaran:

- `reels-plays-instagram` → **0 baris** (tidak ada)
- `post-reach-facebook` → **0 baris** (tidak ada)
- `reels-views-instagram` → 12 baris, termurah **Rp827.956** (tidak layak bikin halaman "murah")
- `spotify-plays` → 258 baris, `spotify-streams` → 14, `spotify-listeners` → 4

Sebagian besar dari 42 keyword ternyata **sudah punya** money page yang menjawab
intent yang sama (mis. `spotify-listeners` → `/beli-listeners-spotify/` sudah ada).
Saya tidak membuat 55 artikel tipis.

**Yang dikerjakan:**
1. `seo/cluster-manifest.mjs` dapat tabel `ROUTES` (51 keyword → 10 money page)
   + `PARKED_NO_SERVICE` (4 keyword FB reach, karena memang tidak ada produknya).
   Cabang routing wajib `continue` — tanpa itu jatuh ke `byPillar.get(null)` → crash.
2. `seo/money-expand.mjs`: `baseFaq()` dapat 2 item FAQ generik
   ("Jasa X" + "Bagaimana cara order X") → menutup 21 intent `jasa-*`/`order-*`
   di 7 money page, tanpa halaman baru. Generated file naik dari 5 → 7 FAQ per page.
3. `landing/src/data/beli-pages.ts`: `/beli-members-telegram/` dapat 4 FAQ
   info-intent (aman-tanpa-password, gradual+refill, reseller pemula, cara cek member).

**Hasil gate:** unassigned `0` · 51 routed · 4 parked · 0 route ke halaman hilang ·
build 56 halaman / 51 lastmod · `jsonld-validate --strict` PASS · 0 karakter non-Latin.

**Belum live.** Deploy perlu konfirmasi. Tidak menyentuh `app.socio.id`.

## 2026-10-02 - `check-article.mjs` dua bug yang menutupi 6 file korup

Gate ini semula terlihat "lolos" padahal 6 artikel korup. Dua sebab:

1. **Regex `ASING` kurang luas.** Cuma cover CJK + Cyrillic + Latin-Extended.
   Yang lolos: Hangul (U+C8FC, U+BB38), fullwidth (U+FF0C), dan emoji (U+1F62D).
   Sekarang ditambah: blok Hangul, blok fullwidth, dan blok astral
   (U+1F000-1FAFF, U+2600-27BF, U+2B00-2BFF).
   Tanda baca Latin sah (em-dash, middle dot, panah, kurung tidak urut) sengaja dikecualikan.

2. **Frontmatter di-parse pakai regex, bukan YAML.** Ini yang paling berbahaya:
   `smm-panel-termurah-bekasi` punya jawaban FAQ dengan escape quote di tengah
   dan **tanpa penutup** - YAML rusak. Regex tetap menghitung 4/5 dan build tetap hijau.
   Kenapa build tidak menangkap? **File `draft: true` tidak pernah dirender Astro**,
   jadi frontmatter rusak di draft tak terlihat sampai dipublish.
   Perbaikan: `js-yaml` (ada di workspace `landing`, di-resolve via `createRequire`)
   dipakai `YAML.load()`; regex hanya fallback. Jumlah FAQ dihitung dari object hasil parse.

6 file yang semula "lolos": `bekasi`, `cilegon`, `cirebon`, `padang`, `serang`,
`purwokerto`. Semuanya juga punya substituted English (`formed`, `Pavlov`,
`isnumber`, `jogging-around`) - kelas glitch yang sama.

**Pelajaran: gate regex untuk YAML itu bohong. Draft = wilayah buta build.**
## 2026-10-02 - `SEO_AUTOMATION_PLAN_V2.md` dirapikan strukturnya

Dokumen 1.613 baris itu sebelumnya tidak bisa dibaca sampai habis: `## Catatan Penutup`
(niatnya penutup) berdiri di **baris 985**, sementara 1613 baris sisanya adalah
`§14.2`-`§14.16` yang berjalan setelahnya. Penutup ada di tengah.

**Yang diubah:**

1. Blok `§14.2`-`§14.16` (1613 baris) dipindah ke **sebelum** `## 15. Wireframes`,
   sehingga urutan jadi §14 → §15 → `Catatan Penutup` (terakhir sungguhan).
   Penomoran sengaja **tidak** diubah - ada 17 referensi silang `§14.x` di seluruh dokumen.
2. Level heading `§14.13` salah (H2) padahal `§14.1`-`§14.16` semuanya H3.
   Diturunkan ke H3; anak `A.`, `B.`, `C.`, `Urutan pengerjaan` (semula H3) jadi H4.
3. TOC: anchor `#13-definition-of-done` salah, sungguhan `#13-definition-of-done-sprint-3`.
   Total 16 entri TOC, sekarang 0 rusak (dicek pakai algoritma slug GitHub:
   lowercase, buang tanda baca, **setiap** spasi jadi satu `-` - bukan collapse.
   Validator pertama salah karena collapse, jadi menandai 7 anchor palsu).
4. Header masih bilang `Status: PLAN - JANGAN eksekusi sebelum disetujui` padahal
   plan sudah dieksekusi penuh. Diubah jadi `Status: BERJALAN`.
5. Baris "62 artikel korpus" → 61 (lihat entri tentang `banyuwangi`).
   `§9 Gate` masih menulis `FAIL 11 pasang` padahal kini `FAIL 0`.
   Baris `Pasang GA4 ... ⬜ queued` padahal sudah `done` (deploy `966555ba`).

**Isi baru (ini yang diminta user):**

- `### Sisa pekerjaan` - tabel satu halaman: **status - aksi berikutnya - pihak**.
  Kolom "pihak" dipisah tiga jenis: `waktu` (tidak bisa dikebut),
  `user` (agent tidak boleh menebak), `agent` (pekerjaan sesi berikutnya).
  10 baris, semuanya punya aksi, tidak ada baris yang menggantung.
- `#### Backlog A` - **36 dari 61 artikel butuh ditulis ulang** (58%).
  Terdiri dari 9 yang pernah dilaporkan "selesai" + 27 draft WARN (irisan `padang`)
  + `serang`. Status: **terblokir, jangan disentuh dulu** (keputusan user).

**Alasan backlog, dicatat biar tidak ditanyakan ulang:** menulis prosa Indonesia
sekitar 900 kata hasilkan glitch tiap ±20 kata. Gate yang ada hanya menangkap kelas
keras (CJK, camelCase menempel, junk `_`/`&[]`) - **bukan** kata Inggris yang menyisip
dan tetap terbaca gramatis. Detektor kamus `/usr/share/dict/words` sudah dicoba lalu
dihapus: bising (menandai `angka`, `paling`, `batik`, `villa`) dan menimbulkan
rasa aman palsu.

**Satu kesalahan baca angka yang harus diingat:** `0 FAIL - 68 WARN` selama ini
**mengukur kebocoran generator, bukan keunikan konten**. Skor rendah pada artikel
glitch bukan bukti tulisan bagus. Jangan dipakai sebagai klaim kualitas.
Angka itu sudah ditulis di bagian `Catatan penting soal angka gate` di snapshot.

**§14.13C juga dikoreksi:** dokumen awalnya bercerita "buat 10 money page baru".
Realitanya tidak ada satu pun halaman baru dibuat - 51 keyword di-route ke money page
yang sudah ada, 4 dipark. Ditulis sebagai blok `REALITA IMPLEMENTASI` supaya keputusan
lama tidak dihapus tapi juga tidak menyesatkan.

Diketahui juga: dokumen ini sekarang `## terakhir` = `Catatan Penutup` (baris 1676),
0 karakter CJK/Hangul/fullwidth, 16 anchor TOC utuh.
