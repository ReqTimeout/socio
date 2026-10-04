# GOOGLE_CLOUD_SETUP — Runbook GSC + Indexing untuk SEO Engine socio.id

> **Status: SUDAH LIVE (diverifikasi 1 Okt 2026 lewat panggilan API sungguhan).** Dokumen ini replaces draft lama yang mengasumsikan "buat project + SA + property GSC baru dari nol" — asumsi itu **salah**; yang benar adalah kita memakai project & service account agency yang sudah ada, dan property GSC `sc-domain:socio.id` **sudah ada dan SA sudah punya akses Owner**.
> **Owner aksi**: User (~15 menit, mostly Bing) → lalu agent lanjut Sprint 3 `SEO_AUTOMATION_PLAN_V2.md`.
> **Blokir yang sudah terbuka**: GSC URL Inspection + Search Analytics **verified jalan** → `ramp-gate` (3→10 artikel/hari) tidak lagi blind.
> **Sisa blokir**: ~~Bing API key~~ **selesai 1 Okt 2026** (§5) — sisa: isi env prod + 3 keputusan GA4.
> **Biaya**: $0. Semua API di §2 gratis sampai kuota; tidak ada billing aktif.
> Runbook ini adalah **source of truth** untuk semua hal Google API di repo ini. Kalau bertentangan dengan `SEO_AUTOMATION_PLAN_V2.md`, dokumen ini menang untuk urusan credential/API.

---

## Daftar Isi

0. [TL;DR — apa yang sudah jadi vs yang perlu](#0-tldr--apa-yang-sudah-jadi-vs-yang-perlu)
1. [Asset & kredensial (pakai yang ini)](#1-asset--kredensial-pakai-yang-ini)
2. [Status terverifikasi (live probe)](#2-status-terverifikasi-live-probe)
3. [Env vars](#3-env-vars)
4. [GSC property `sc-domain:socio.id`](#4-gsc-property-sc-domainsocioid)
5. [Bing Webmaster Tools — sisa blokir](#5-bing-webmaster-tools--sisa-blokir)
6. [API opsional (GA4 + PageSpeed)](#6-api-opsional-ga4--pagespeed)
7. [Wiring ke Coolify + runner](#7-wiring-ke-coolify--runner)
8. [Test scripts](#8-test-scripts)
9. [Kuota & biaya](#9-kuota--biaya)
10. [Yang dibutuhkan runner dari dokumen ini](#10-yang-dibutuhkan-runner-dari-dokumen-ini)
11. [Security](#11-security)
12. [Isolasi multi-client (baca sebelum pakai)](#12-isolasi-multi-client-baca-sebelum-pakai)
13. [Troubleshooting](#13-troubleshooting)
14. [Wireframes](#14-wireframes)

---

## 0. TL;DR — apa yang sudah jadi vs yang perlu

### 0.1 Koreksi terhadap draft lama

Draft dokumen ini (1 Okt 2026 pagi) ditulis dengan asumsi belum ada apa-apa. Setelah probe langsung, angkanya berubah drastis:

| Asumsi draft lama | Fakta terverifikasi (1 Okt 2026) |
|---|---|
| Buat project GCP baru `socio-seo-XXXXXX` | **Jangan buat.** Pakai project agency yang sudah ada: `project-e899f4b3-5062-40a0-b9a` |
| Buat SA baru `seo-runner` | **Jangan buat.** Pakai SA yang ada: `beriklanagency@project-e899f4b3-5062-40a0-b9a.iam.gserviceaccount.com` |
| Verify `socio.id` di GSC via DNS TXT | **Sudah verified** — property-nya `sc-domain:socio.id` (domain property) |
| Add SA sebagai Owner di GSC | **Sudah ada** — `sites.list` mengembalikan `sc-domain:socio.id` |
| `GSC_SITE_URL=https://socio.id/` (URL prefix) | **SALAH** → harus `sc-domain:socio.id`. URL prefix tidak ada di akun ini → 403 (bukti §13.1) |
| Bing Webmaster = blocker | Tetap blocker, 1 item saja (§5) |
| Butuh `googleapis` npm package | Tidak wajib — script dibuat **zero-dependency** (`node:crypto` + `fetch`), lihat §8.1 |

### 0.2 Checklist status

| # | Item | Status | Bukti |
|---|---|---|---|
| 1 | GCP project untuk SA | ✅ ada | `project-e899f4b3-5062-40a0-b9a` (project number `448996277477`) |
| 2 | Service account + JSON key | ✅ valid | token exchange HTTP 200, private_key_id `12c0c78c…` |
| 3 | Property GSC `sc-domain:socio.id` | ✅ verified | `sites.list` → `['https://sariglassbangunan.com/', 'sc-domain:socio.id']` |
| 4 | SA punya akses Owner di property itu | ✅ | URL Inspection + Search Analytics keduanya HTTP 200 |
| 5 | Search Console API enabled | ✅ | `searchconsole.googleapis.com` balas 200 |
| 6 | Indexing API enabled | ✅ | `indexing.googleapis.com` balas 400 (butuh param) / 404 (URL belum disubmit) = API hidup |
| 7 | `https://socio.id/` terindeks | ✅ | verdict `PASS`, coverage `Submitted and indexed`, crawl `2026-10-01T07:51:15Z` |
| 8 | Sitemap live | ✅ | `https://socio.id/sitemap-index.xml` → 200 |
| 9 | IndexNow key file live | ✅ | `https://socio.id/indexnow.txt` → 200, isi = `278171ff…` (match `.env.example`) |
| 10 | **Bing Webmaster API key** | ✅ **LIVE 1 Okt 2026** | key user + submit `{"d":null}`, kuota turun 100→98 (lihat §5.4) |
| 11 | PageSpeed API key | 🟡 belum | PSI tanpa key → HTTP **429** dari IP ini → §6.2 |
| 12 | GA4 Data API | 🟡 opsional | belum diperlukan sebelum Sprint 5 |
| 13 | Env var GSC terisi di Coolify | ⛔ **belum** | `.env` lokal & `.env.example` masih kosong → §3 + §7 |
| 14 | Billing alert $1 | 🟡 opsional | proyek shared agency — pasang hanya kalau ada API berbayar yang aktif; semua API di §2 free tier |

### 0.3 Sisa kerja (urutan)

```
1. ✅ [USER+AGENT] §5  Bing Webmaster key + submit test — SELESAI 1 Okt 2026
2. [USER  5 mnt]  §7  Isi env Coolify: GSC block + BING_API_KEY (prod)
3. [USER+AGENT]    §14.1  3 keputusan GA4 (1 vs 2 property, consent, track area login)
4. [AGENT]         §14.2  Urutan kerja Sprint 3 — mulai dari A1 (gsc-inspect baseline)
```

---

## 1. Asset & kredensial (pakai yang ini)

### 1.1 Project + Service Account

| Field | Nilai |
|---|---|
| Project ID | `project-e899f4b3-5062-40a0-b9a` |
| Project number | `448996277477` |
| Project name | project agency **Beriklan** (multi-client — lihat §12) |
| Service account email | `beriklanagency@project-e899f4b3-5062-40a0-b9a.iam.gserviceaccount.com` |
| OAuth client id | `110588780678595821064` |
| private_key_id | `12c0c78c9d6d76dba979ecbccfdeb331cc02c7da` |
| Token endpoint | `https://oauth2.googleapis.com/token` |
| GSC property | `sc-domain:socio.id` |
| Resource lain di SA yang sama | `https://sariglassbangunan.com/` (proyek klien lain) |

### 1.2 Lokasi file (JANGAN dipindah ke dalam repo)

| File | Ukuran | Isi | Status |
|---|---|---|---|
| `/Users/maabook/Downloads/sariglassbangunan.com/secrets/gcp-sa-sari-glass.json` | 2.412 B | JSON SA utuh (termasuk private key) | ✅ dipakai untuk dev lokal |
| `…/secrets/gcp-sa-b64.txt` | 3.184 char | base64 JSON SA | ✅ decode → email & key_id cocok |
| `…/secrets/gcp-sa-gzip-b64url.txt` | 2.263 char | gzip → base64url JSON SA | ✅ decode → cocok (varian aman untuk env manager yang memotong string panjang) |
| `…/secrets/LOGIN.md`, `VPS-CREDENTIALS.md` | — | kredensial lain (jangan disentuh) | gitignored |

> Ketiga file **sudah diverifikasi konsisten** (decode → `client_email` + `private_key_id` sama). Kalau nanti key dirotasi, regenerate ketiganya (§11.4).

### 1.3 Akun Google yang dipakai

Untuk masuk Console & GSC, pakai akun **agency Beriklan** yangZF owns project tersebut (bukan akun klien Sari Glass). Kalau tidak tahu email mana yang dipakai, cek di `…/secrets/VPS-CREDENTIALS.md` §Google Ads — project itu milik akun agency yang sama.

### 1.4 Repository

Semua credential **tidak pernah** masuk repo. Yang masuk repo hanya:
- `seo/scripts/gsc-doctor.mjs` — script diagnosa (§8.1, zero-dep, baca kredensial dari env/file)
- `.env.example` — nama variabel + komentar, nilai kosong (§3.2)

---

## 2. Status terverifikasi (live probe)

Probe dilakukan **1 Okt 2026** via JWT bearer langsung ke Google (bukan asumsi). Perintah untuk mengulang: §8.1.

```
[ OK ] creds loaded — beriklanagency@project-e899f4b3-5062-40a0-b9a.iam.gserviceaccount.com
[ OK ] token exchange — private key valid, SA aktif
[ OK ] GSC sites.list — SA punya akses: https://sariglassbangunan.com/, sc-domain:socio.id
[ OK ] URL Inspection — https://socio.id/ → PASS / Submitted and indexed
                             robots ALLOWED · canonical https://socio.id/ · crawledAs MOBILE
                             lastCrawl 2026-10-01T07:51:15Z
[ OK ] Search Analytics 28d — "socio id" 5 klik/7 imp (pos 1.1) · "panel sosmed" 1/21 (pos 49.5)
                             "smm indonesia" 1/8 · "smm indonesia termurah" 1/4 · "21panel" 0/2
[ OK ] Indexing API — enabled, URL ini belum pernah di-submit (NOT_FOUND)
[ OK ] public /indexnow.txt — 32 bytes
[ OK ] public /sitemap-index.xml — 200
```

### 2.1 Apa artinya angka Search Analytics ini

Baseline 28 hari: **8 klik total, 42 impressions**. Remarkable: query branded "socio id" sudah di posisi 1.1, sementara query generik ("panel sosmed", "smm indonesia") ada di posisi 46-52. Artinya:
- **Tidak ada tanda scaled-content-abuse / manual action** (verdict PASS, tidak ada exclusions).
- Konten generik masih di halaman 2 → masih banyak ruang naik tanpa perlu lebih banyak artikel.
- Ramp-gate mulai aman: target awal tetap **3 artikel/hari** (bukan langsung 10).

### 2.2 Yang TIDAK bisa diverifikasi dari sini

| Item | Kenapa tidak bisa dicek | Cara cek |
|---|---|---|
| Daftar API enabled di project | SA tidak punya role `serviceusage.serviceUsageViewer` (403 saat `services.list`) | Console → APIs & Services → Enabled APIs (butuh login agency) |
| Traversal WA / PageSpeed | Sudah di luar cakupan | — |
| Manual action / spam action | Butuh UI GSC (API tidak mengeksposnya) | GSC → Manual actions (cek mingguan) |
| Core Web Vitals | PSI tanpa key kena 429 | §6.2 |

---

## 3. Env vars

### 3.1 Nama variabel (final)

| Variabel | Nilai | Wajib? | Dipakai oleh |
|---|---|---|---|
| `GCP_PROJECT_ID` | `project-e899f4b3-5062-40a0-b9a` | ya (log only) | semua |
| `GSC_SERVICE_ACCOUNT_EMAIL` | `beriklanagency@…iam.gserviceaccount.com` | ya (log only) | semua |
| `GSC_SERVICE_ACCOUNT_JSON_B64` | base64 JSON SA (3.184 char) | **ya** | `runner/lib/gsc.mjs`, doctor |
| `GSC_SITE_URL` | `sc-domain:socio.id` | **ya** | semua panggilan GSC |
| `GSC_SITEMAP_URL` | `https://socio.id/sitemap-index.xml` | ya | re-submit sitemap |
| `BING_API_KEY` | dari Bing Webmaster §5 | ya untuk `bing-submit.mjs` | `seo/bing-submit.mjs` |
| `PAGESPEED_API_KEY` | opsional (§6.2) | tidak | audit CWV |
| `GA4_PROPERTY_ID` | opsional (§6.1) | tidak | Sprint 5 |

> **`GCP_PROJECT_ID` dan `GSC_SERVICE_ACCOUNT_EMAIL` bukan rahasia** — boleh tampil di log. Yang rahasia hanya `GSC_SERVICE_ACCOUNT_JSON_B64` (isi = private key).

### 3.2 Potongan untuk `.env.example` (sudah di-apply)

```bash
# --- Google Cloud / GSC (docs/GOOGLE_CLOUD_SETUP.md) ---
# SA agency Beriklan (shared multi-client project). Isi *_B64 = private key = RAHASIA.
GCP_PROJECT_ID=project-e899f4b3-5062-40a0-b9a
GSC_SERVICE_ACCOUNT_EMAIL=beriklanagency@project-e899f4b3-5062-40a0-b9a.iam.gserviceaccount.com
GSC_SERVICE_ACCOUNT_JSON_B64=
# PENTING: domain property, bukan URL prefix. URL prefix → 403 "You do not own this site".
GSC_SITE_URL=sc-domain:socio.id
GSC_SITEMAP_URL=https://socio.id/sitemap-index.xml
# Bing Webmaster API key (URL Submission, 10 URL/hari). Nama lama: BING_SITE_KEY (deprecated).
BING_API_KEY=
# Opsional — butuh API key dari console agar tidak kena 429
PAGESPEED_API_KEY=
```

### 3.3 Cara isi dari file lokal

```bash
# B64 (canonical, aman untuk Coolify/hostinger — 3.184 char)
base64 -i /Users/maabook/Downloads/sariglassbangunan.com/secrets/gcp-sa-sari-glass.json | tr -d '\n'

# Varian gzip+base64url (2.263 char) — kalau env manager memotong string >~2.500 char
# (terbukti di proyek lain: Hostinger MCP merusak 3.184 → 2.525 garbage)
gzip -9 -c /Users/maabook/Downloads/sariglassbangunan.com/secrets/gcp-sa-sari-glass.json \
  | base64 | tr '+/' '-_' | tr -d '='
```

Decode di runtime (dua-duanya harus didukung `runner/lib/gsc.mjs`):

```js
function loadCreds() {
  const gz = process.env.GSC_SERVICE_ACCOUNT_GZIP_B64URL;
  if (gz) return JSON.parse(gunzipSync(Buffer.from(gz, 'base64url')));
  const b64 = process.env.GSC_SERVICE_ACCOUNT_JSON_B64;
  if (b64) return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  if (process.env.GSC_SA_FILE) return JSON.parse(readFileSync(process.env.GSC_SA_FILE, 'utf8'));
  if (process.env.GSC_SERVICE_ACCOUNT_JSON) return JSON.parse(process.env.GSC_SERVICE_ACCOUNT_JSON.replace(/\\n/g, '\n'));
  throw new Error('No GSC credentials in env');
}
```

### 3.4 Dev lokal

`.env` lokal **boleh** diisi `GSC_SA_FILE=/Users/maabook/Downloads/…/gcp-sa-sari-glass.json` (path, bukan isi key) supaya tidak ada secret yang tersalin ke laptop. `.env` sudah gitignored — cek `.gitignore` sebelum commit.

---

## 4. GSC property `sc-domain:socio.id`

### 4.1 Status: sudah selesai, tidak perlu action

Property sudah **verified** dan SA sudah punya akses. Tidak ada DNS TXT yang perlu ditambahkan.

Kalau mau memastikan (opsional, 3 mnt):
1. `https://search.google.com/search-console` → pilih property `Domain` → `socio.id`
2. **Settings → Users and permissions** → cari `beriklanagency@project-e899f4b3-…iam.gserviceaccount.com`
3. Role harus **Owner** (Full/RESTRICTED tidak bisa inspect + search analytics)
4. **Sitemaps** → `sitemap-index.xml` status last read healthy

### 4.2 KenapaWAJIB pakai `sc-domain:` bukan `https://socio.id/`

| | `sc-domain:socio.id` (domain property) | `https://socio.id/` (URL prefix) |
|---|---|---|
| Cakupan | semua protocol + subdomain + path | hanya 1 prefix persis |
| Perlu DNS TXT | ya | tidak (meta tag / file HTML) |
| Status di akun ini | ✅ **ADA** | ❌ tidak ada → 403 |
| Env var | `GSC_SITE_URL=sc-domain:socio.id` | — |

Bukti 403 ada di §13.1 — jangan sampai salah set, karena gejalanya `PERMISSION_DENIED` yang menyesatkan (klooks like SA salah).

### 4.3 Sitemap

`https://socio.id/sitemap-index.xml` sudah 200 di produksi. Kalau `lastmod` di sitemap tidak jujur (selalu `now()`), itubaud penalty — regenerate dengan `lastmod` = tanggal publish asli (plan v2 §10.3 `sitemap-fix.mjs`).

---

## 5. Bing Webmaster Tools — ✅ LIVE 1 Okt 2026

**Status: aktif.** Key diberikan user, diuji live (§5.4), submit diterima Bing. Kuota **100 URL/hari + 3.100/bulan** — 10× lebih besar dari asumsi lama dokumen ini (10/hari), dan cukup jauh di atas kebutuhan 3-10 artikel/hari.

IndexNow sudah jalan (key file live, §2), tapi IndexNow **tidak menjamin** Bing meng-crawl. Bing Webmaster API adalah jalur resmi untuk:
- submit sitemap formal
- submit URL batch (kuota 10 URL/hari free tier)
- lihat coverage & crawl error Bing (invaluable saat Bing ≠ Google)

### 5.1 Add site (5 menit)

1. Buka `https://www.bing.com/webmasters` → **Add site**
2. Masukkan `socio.id`
3. Verifikasi lewat **Import from Google Search Console** (paling cepat — property `socio.id` sudah verified) atau file HTML `BingSiteAuth.xml` di `landing/public/`
4. Sitemap: `https://socio.id/sitemap-index.xml`

### 5.2 Ambil API key (2 menit)

1. `https://www.bing.com/webmasters` → site `socio.id` → **Settings → API Access → API Key**
2. Salin → simpan sebagai `BING_API_KEY` (§7.2)

> Nama env lama di `.env.example` adalah `BING_SITE_KEY` — itu salah nama (isi bukan site key, tapi API key). Sudah di-rename jadi `BING_API_KEY`. Kalau ada kode lama yang baca `BING_SITE_KEY`, migrate.

### 5.3 Test (30 detik)

```bash
curl -X POST "https://ssl.bing.com/webmaster/api.svc/json/SubmitUrlbatch?apikey=$BING_API_KEY" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{"siteUrl":"https://socio.id","urlList":["https://socio.id/"]}'
```

Expected: `{"d":null}` (200 = diterima, Bing antrikan).

> **WAJIB trailing slash**: URL canonical socio.id memakai bentuk `/blog/slug/`. Submit tanpa slash → Bing dapat 308, kuota terpakai, URL tidak ikut terindeks. Semua URL dari `state.json` sudah trailing slash ✅.

### 5.4 Bukti live (1 Okt 2026)

```bash
K=<BING_API_KEY>
# 1. key valid + site terdaftar
curl -s "https://ssl.bing.com/webmaster/api.svc/json/GetUrlSubmissionQuota?siteUrl=https%3A%2F%2Fsocio.id&apikey=$K"
# → {"d":{"__type":"UrlSubmissionQuota:#Microsoft.Bing.Webmaster.Api","DailyQuota":100,"MonthlyQuota":3100}}

# 2. kontrol key salah → harus error, bukan kuota
curl -s "…?siteUrl=https%3A%2F%2Fsocio.id&apikey=deadbeef"
# → {"ErrorCode":3,"Message":"ERROR!!! InvalidApiKey"}

# 3. submit 2 URL → diterima
curl -s -X POST "…/SubmitUrlbatch?apikey=$K" -H "Content-Type: application/json; charset=utf-8" \
  -d '{"siteUrl":"https://socio.id","urlList":["https://socio.id/","https://socio.id/blog/apa-itu-smm-panel"]}'
# → {"d":null}

# 4. kuota turun → bukti benar-benar submit, bukan no-op
# → {"DailyQuota":98,"MonthlyQuota":3098}   (100→98, 3100→3098)
```

Cara baca: `GetUrlSubmissionQuota` balas 200 = key hidup **dan** site `socio.id` sudah terdaftar/verified di Bing. Kontrol dengan key salah wajib membalas `ErrorCode 3` — kalau tidak berarti endpoint-nya tidak melakukan auth sungguhan.

---

## 6. API opsional (GA4 + PageSpeed)

### 6.1 Google Analytics Data API (Sprint 5+)

> **Status 1 Okt 2026**: measurement ID GA4 sudah ada (`G-MDJCW053XR`) tapi **belum terpasang** di source. Scope + sub-item lengkap: `docs/SEO_AUTOMATION_PLAN_V2.md` §14.1 (queued).

Cuma butuh kalau mau tarik traffic per artikel dari GA4 (bukan GSC). Butuh 3 langkah:
1. Console → **APIs & Services → Library** → enable **Google Analytics Data API** (`analyticsdata.googleapis.com`)
2. Tamahkan SA sebagai user di GA4 property: `analytics.google.com` → Admin → Property access management → Add user → email SA → role **Viewer**
3. Simpan numeric property ID ke `GA4_PROPERTY_ID`

Kuota: 25.000 token/hari free — cukup untuk 1 query/hari.

### 6.2 PageSpeed Insights API (rekomendasi, karena 429)

PSI **tanpa** API key dari IP server/shared-IP kena rate limit — terbukti saat probe: `runPagespeed?url=https://socio.id` → **HTTP 429**. Supaya andal:
1. Console → **APIs & Services → Credentials → Create credentials → API key**
2. Batasi: **PageSpeed Insights API** only + application restriction kalau perlu
3. Simpan ke `PAGESPEED_API_KEY`

Quota dengan key: 25.000 query/hari. Dipakai untuk audit CWV landing mingguan (plan v2 §8 `report`).

---

## 7. Wiring ke Coolify + runner

### 7.1 Di Coolify

1. Coolify Dashboard → Scheduled Task `daily-publish` (dan `weekly-freshness`) → **Environment Variables**
2. Isi §3.1 (Block GSC + `BING_API_KEY`). `GH_TOKEN`, `CLOUDFLARE_API_TOKEN`, `RESEND_API_KEY` sudah ada di block plan v2 §4.5
3. **Redeploy** — env hanya di-inject saat container start, restart biasa tidak cukup
4. Verifikasi dari dalam container:

```bash
node -e "console.log('site:', process.env.GSC_SITE_URL, '| b64 len:', process.env.GSC_SERVICE_ACCOUNT_JSON_B64?.length || 'NOT SET')"
```

Expected: `site: sc-domain:socio.id | b64 len: 3184`

### 7.2. Gotcha: env manager memotong string panjang

Terdokumentasi di proyek agency lain: sebagian env manager (Hostinger MCP) **merusak string >~2.500 char** (3.184 → 2.525 bytes garbage) sehingga `JSON.parse`/`gunzip` gagal. Mitigasi berlapis:

1. Coolify = DB text field → biasanya aman, tapi **verifikasi** setelah set (§7.1)
2. Kalau rusak → pakai varian `GSC_SERVICE_ACCOUNT_GZIP_B64URL` (2.263 char, §3.3)
3. Kalau masih rusak → simpan di DB/secret manager seperti proyek agency (pola `cron_settings.gsc_sa`)

### 7.3 Tidak perlu `googleapis` di image

Runner tidak perlu dependency Google sama sekali:
- Auth: `node:crypto` `createSign('RSA-SHA256')` → JWT assertion (20 baris)
- Request: global `fetch` (Node ≥ 18)
- Nol dependency = image `node:22-slim` tetap ramping + `pnpm install` tidak gagal karena lockfile

Library yang dipakai runner (rencana, sesuai plan v2 §4.2 `runner/lib/gsc.mjs`): `gsc.mjs`, `state.mjs`, `notify.mjs`, `git.mjs`. Modul auth GSR Putar di `seo/lib/gsc.mjs` supaya script lokal (`seo/gsc-inspect.mjs`) dan runner memakai kode yang sama — `runner/lib/gsc.mjs` re-export dari situ (keputusan arsitektur ini boleh di-veto user).

---

## 8. Test scripts

### 8.1 `seo/scripts/gsc-doctor.mjs` (zero-dep, utama)

Sudah ada di repo. Checks: creds → token → `sites.list` → URL Inspection → Search Analytics 28d → Indexing API → file publik (`indexnow.txt`, `sitemap-index.xml`). Exit code 1 kalau ada check wajib gagal.

```bash
cd /Volumes/miniex/Users/maabook/web-project/socio.id

# dev lokal (path file, tidak menyalin secret)
GSC_SA_FILE=/Users/maabook/Downloads/sariglassbangunan.com/secrets/gcp-sa-sari-glass.json \
  node seo/scripts/gsc-doctor.mjs

# dengan env production
set -a && source .env && set +a
node seo/scripts/gsc-doctor.mjs

# inspect URL tertentu
node seo/scripts/gsc-doctor.mjs https://socio.id/smm-panel-terbaik.html
```

Expected (semua wajib `[ OK ]`):

```
GSC DOCTOR — site: sc-domain:socio.id
[ OK ] creds loaded — beriklanagency@…
[ OK ] token exchange — private key valid, SA aktif
[ OK ] GSC sites.list — SA punya akses: …, sc-domain:socio.id
[ OK ] URL Inspection — https://socio.id/ → PASS / Submitted and indexed
[ OK ] Search Analytics 28d — …
[ OK ] Indexing API — enabled, …
[ OK ] public /indexnow.txt — 32 bytes
[ OK ] public /sitemap-index.xml — 200
✓ semua check wajib lolos
```

### 8.2 Test IndexNow (sudah live, verifikasi saja)

```bash
curl -X POST https://api.indexnow.org/indexnow \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{"host":"socio.id","key":"278171ffe6864b2ab698edb195272ea5",
       "keyLocation":"https://socio.id/indexnow.txt",
       "urlList":["https://socio.id/"]}'
```

Expected `200` atau `202`. Kalau `403`: key file ≠ env (`curl https://socio.id/indexnow.txt` harus print key yang sama persis).

### 8.3 Test Bing

§5.3.

### 8.4 Test PageSpeed

```bash
curl -s "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://socio.id&strategy=mobile&key=$PAGESPEED_API_KEY" \
  | head -c 400
```

Tanpa key → 429 (dibuktikan). Dengan key → JSON berisi `lighthouseResult.categories.performance.score`.

---

## 9. Kuota & biaya

Angka ini dari dokumentasi publik Google; **verifikasi aktual** di Console → APIs & Services → Quotas (SA tidak punya hak baca kuota via API — `serviceusage.services.list` balas 403).

| API | Free quota (dokumentasi) | Butuh nightly? | Catatan |
|---|---|---|---|
| Search Analytics | 1.200 request/hari per project | ya (mining mingguan = 1-2 call) | jauh di atas kebutuhan |
| URL Inspection | 2.000 URL/hari per property, 600/menit | ya (~10-50 URL/hari) | **angka plan v2 §3.3 "600/detik" itu salah** → koreksi ke 600/**menit** |
| Indexing API | 200 URL notification/hari per project | tidak (emergency only) | Google resmi cuma anggap valid untuk JobPosting/BroadcastEvent — jangan jadi primary indexer artikel |
| PageSpeed Insights | 25.000 query/hari (dengan key) | tidak | tanpa key gampang 429 |
| GA4 Data API | 25.000 token/hari | tidak | Sprint 5 |

**Total $0.** Tidak ada API Google untuk SEO yang berbayar. Kalau suatu hari ada tagihan, penyebabnya API di luar daftar ini.

> Catatan risiko: karena project dipakai multi-client (§12), kuota **terbagi** dengan klien lain (mis. 200 Indexing API/hari dibagi dengan Sari Glass). Untuk SA khusus socio, quotas jadi milik sendiri.

---

## 10. Yang dibutuhkan runner dari dokumen ini

| Kebutuhan | Sumber | Runnable? |
|---|---|---|
| Auth GSC (JWT + 2 scope) | §3.3 | ✅ |
| `inspectUrl(url)` → verdict/coverage/crawl | §2 proof | ✅ |
| `searchAnalytics(28d, dimension=query)` untuk mining | §2 proof | ✅ |
| Sitemap URL untuk re-submit | §4.3 | ✅ |
| IndexNow submit | §8.2 | ✅ |
| Bing submit | §5.3 | ✅ live (key user, kuota 100/hari) |
| Halt bila manual action | — | ⚠️ API tidak ekspos manual action → tetap cek manual GSC mingguan |

Scope yang harus diminta runner (**dua-duanya wajib** — kalau hanya `webmasters`, Indexing API balas `ACCESS_TOKEN_SCOPE_INSUFFICIENT`, terbukti):

```
https://www.googleapis.com/auth/webmasters
https://www.googleapis.com/auth/indexing
```

---

## 11. Security

### 11.1 Prinsip

1. **JSON SA = password.** Perlakukan seperti password DB.
2. **Shared SA** (§12) berarti kebocoran = akses 2+ properti. Mitigasi: rotasi tiap 6 bulan (bukan 12) selama masih shared.
3. **No key in git** — `.env` gitignored, `.env.example` cuma nama variabel.
4. **No key in logs** — jangan `console.log(process.env.GSC_SERVICE_ACCOUNT_JSON_B64)`. Doctor hanya print `length`.
5. **Least privilege di GSC**: SA butuh Owner untuk inspect+analytics, tapi **jangan** pernah pakai akun SA untuk login UI.

### 11.2 Hardening checklist

| Item | Status |
|---|---|
| `.env` di `.gitignore` | ✅ (verifikasi: `git check-ignore -v .env`) |
| `.env.example` tanpa nilai rahasia | ✅ |
| File SA di luar repo | ✅ `/Users/maabook/Downloads/…/secrets/` |
| Folder `secrets/` di project agency gitignored | ✅ (dari doc agency) |
| `accountcf.md` di `.gitignore` | wajib cek (`git check-ignore -v accountcf.md`) |
| 2FA akun Google agency | wajib |
| Coolify env tidak di-screenshot publik | wajib diingat |
| Key di password manager | recommended |
| Cloud Audit Logs aktif di project | recommended (free) — cek anomalies kalau ada SA mencurigakan |

### 11.3 Kalau SA bocor

1. `IAM & Admin → Service Accounts → beriklanagency → Keys → Delete` (hapus **semua** key lama)
2. Generate key baru → download JSON
3. Update `GSC_SERVICE_ACCOUNT_JSON_B64` di Coolify + redeploy
4. Update file lokal + regenerate `gcp-sa-b64.txt` + `gcp-sa-gzip-b64url.txt` (§1.2)
5. Cek Cloud Audit Logs untuk aktivitas mencurigakan selama key bocor
6. Karena shared, cek juga property `https://sariglassbangunan.com/` — kedua properti terdampak

### 11.4 Rotasi key (prosedur, ~10 menit)

```bash
SEC=~/Downloads/sariglassbangunan.com/secrets
NEW=~/Downloads/beriklanagency-$(date +%Y%m%d).json     # hasil download dari console
python3 - "$NEW" <<'PY'
import json,sys
d=json.load(open(sys.argv[1])); print("email:",d["client_email"],"key_id:",d["private_key_id"])
PY
base64 -i "$NEW" | tr -d '\n' > "$SEC/gcp-sa-b64.txt"
gzip -9 -c "$NEW" | base64 | tr '+/' '-_' | tr -d '=' > "$SEC/gcp-sa-gzip-b64url.txt"
mv "$NEW" "$SEC/gcp-sa-sari-glass.json"
# lalu update Coolify + jalankan doctor (§8.1) + hapus key lama di console
```

---

## 12. Isolasi multi-client (baca sebelum pakai)

SA `beriklanagency@…` + project `project-e899f4b3-…` itu **milik agency Beriklan dan dipakai lebih dari satu klien**. Untuk socio.id, SA ini memberi akses ke:

- `sc-domain:socio.id` (GSC)
- `https://sariglassbangunan.com/` (GSC klien lain — **sedang aktif dipakai Indexing API** di sana)

Implikasi:

| Risiko | Mitigasi |
|---|---|
| Satu key bocor = 2 properti terdampak | Rotasi 6 bulan (§11.4) + jangan simpan key di path yang sama |
| Kuota API terbagi antar klien | Kalau Indexing API benar-benar dipakai, buat SA khusus socio (butuh 5 mnt di console) |
| Salah hapus key = matikan pipeline klien lain | Selalu cek "kunci klien mana" sebelum delete di console |
| Salah set `GSC_SITE_URL` = inspect property lain | `GSC_SITE_URL` hardcoded di env, jangan ambil dari argumen CLI |

**Rekomendasi (opsional, tidak memblokir Sprint 3)**: buat SA `socio-seo-runner@project-e899f4b3-…`, grant hanya 2 role yang sama, add sebagai Owner di `sc-domain:socio.id`, lalu pakai key itu untuk runner socio. Semua langkah identik dengan §1–4, hanya credential-nya beda. Kalau dilakukan, update §1.1/§3.2.

---

## 13. Troubleshooting

### 13.1 `403 — You do not own this site` (Paling sering)

**Penyebab hampir selalu**: `GSC_SITE_URL=https://socio.id/` (URL prefix) — property itu tidak ada di akun ini.
**Fix**: `GSC_SITE_URL=sc-domain:socio.id`. Bukti: dengan URL prefix, `sites.list` tetap OK tapi inspect & analytics 403.

Kalau setelah diubah ke domain property masih 403:
1. `sites.list` → apakah `sc-domain:socio.id` ada di daftar? tidak → SA belum di-add di GSC (§4.1)
2. Role di GSC harus **Owner**, bukan Full/Restricted
3. Trailing slash: `sc-domain:socio.id` **tanpa** `https://` dan **tanpa** trailing slash

### 13.2 `ACCESS_TOKEN_SCOPE_INSUFFICIENT` (Indexing API)

Auth cuma minta scope `webmasters`. Fix: tambah `https://www.googleapis.com/auth/indexing` (§10).

### 13.3 `SERVICE_DISABLED` / 403 di API lain

API belum di-enable di project `project-e899f4b3-…`. Karena SA tidak bisa cek daftar API (§2.2), buka Console → APIs & Services → Library → enable yang perlu (`searchconsole`, `indexing`, `analyticsdata`, `pagespeedonline`).

### 13.4 `Invalid JWT Signature` / `Invalid private key`

- Key rusak saat copy-paste → pakai base64 (bukan JSON mentah dengan `\n`)
- `private_key` harus punya `\n` asli (decode base64, jangan escape manual)
- Doctor akan gagal di step `token exchange` — itu tanda key rusak, bukan masalah GSC

### 13.5 `Quota exceeded` URL Inspection

Default 2.000/hari per property, reset ±00:00 US Pacific (14:00 WIB). Naikkan lewat `https://support.google.com/webmasters/thread/new` (gratis, 3-7 hari). meantime: turunkan `SEO_INDEXER_DAILY_LIMIT` dan inspect cuma URL publish 7 hari terakhir (bukan semua).

### 13.6 Bing `403`

`BING_API_KEY` salah/expired, atau `siteUrl` tidak match dengan yang didaftarkan di Bing Webmaster (trailing slash berbeda), atau site belum verified.

### 13.7 IndexNow `403`

`SOCIO_INDEXNOW_KEY` ≠ isi `landing/public/indexnow.txt`, atau `keyLocation` tidak bisa di-fetch (deploy Pages belum selesai), atau `urlList` bukan host `socio.id`.

### 13.8 Env Coolify tidak ter-load

1. Cek env sudah diset di UI Scheduled Task yang benar (bukan app web)
2. **Redeploy** (bukan restart)
3. `docker exec -it <container> env | grep GSC_` → harus muncul
4. Kalau nilainya terpotong (bukan 3.184 char) → §7.2

---

## 14. Wireframes

### 14.1 Identity & permission chain (real, bukan ideal)

```
┌──────────────────────────────────────────────────────────────────┐
│  USER (akun agency Beriklan)                                    │
│    │  sudah punya: project GCP + GSC property sc-domain:socio.id │
│    ▼                                                             │
│  Google Cloud project-e899f4b3-5062-40a0-b9a                     │
│    │  • searchconsole.googleapis.com      ENABLED ✅             │
│    │  • indexing.googleapis.com           ENABLED ✅             │
│    │  • analyticsdata / pagespeedonline   belum / opsional       │
│    ▼                                                             │
│  Service Account beriklanagency@…iam.gserviceaccount.com        │
│    │  key: /Users/maabook/Downloads/…/secrets/gcp-sa-sari-glass.json
│    │  base64: gcp-sa-b64.txt (3184) · gzip: gcp-sa-gzip-b64url.txt (2263)
│    │                                                             │
│    ├──► GSC  sc-domain:socio.id        (Owner, ✅ verified)      │
│    └──► GSC  https://sariglassbangunan.com/ (Owner, klien lain) │
│    ▼                                                             │
│  Coolify runner container                                        │
│    seo/scripts/gsc-doctor.mjs  ·  runner/lib/gsc.mjs            │
│    zero-dep: node:crypto JWT + global fetch                     │
│    ▼                                                             │
│  Google APIs                                                     │
│    • URL Inspection   → state.json (basis ramp-gate)            │
│    • Search Analytics → mining keywords mingguan                 │
│    • Indexing API     → emergency submit saja                   │
│  Public (tanpa SA)                                               │
│    • api.indexnow.org (unlimited, key via /indexnow.txt)         │
│    • ssl.bing.com/webmaster/api.svc (⛔ butuh BING_API_KEY)       │
└──────────────────────────────────────────────────────────────────┘
```

### 14.2 Alur diagnosis harian (kalau runner gagal)

```
runner gagal
   │
   ├─► node seo/scripts/gsc-doctor.mjs
   │      ├─ [FAIL] token exchange  → §13.4 (key rusak)
   │      ├─ [FAIL] sites.list      → §13.1 (property / role)
   │      ├─ [FAIL] URL Inspection  → §13.1 / §13.2 (scope)
   │      ├─ [FAIL] Search Analytics→ §13.1 / §13.3 (API disabled)
   │      ├─ [SKIP] Indexing API    → §13.3
   │      └─ [FAIL] public file     → deploy Pages belum jalan
   │
   └─► kalau semua OK tapi ramp-gate tetap turun
          → bukan masalah credential; cek index_rate_14d di state.json
            + manual action di GSC UI (mingguan)
```

---

## Catatan penutup

Yang berubah dari draft pagi: **tidak ada project/SA/property baru yang perlu dibuat** — semuanya sudah ada dan sudah diverifikasi live. Sisa kerja nyata cuma 3: Bing API key (§5), isi env (§7), lalu langsung masuk Sprint 3 plan v2.

Jangan lupa: `.env.example` sudah di-update (§3.2) dan **jangan commit `.env`**.
