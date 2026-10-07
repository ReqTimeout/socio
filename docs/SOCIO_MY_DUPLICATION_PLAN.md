# PLAN — Duplikasi `socio.id` → `socio.my`

> **Status**: PLAN SAJA — belum ada implementasi. Dokumen ini hasil riset read-only
> terhadap codebase + audit live infra. Dibuat 7 Okt 2026, direview untuk akun
> Cloudflare terpisah pada 7 Okt 2026.
>
> **Batasan review akun Cloudflare**: `socio.my` memakai **akun Cloudflare berbeda**
> dari `socio.id`. Semua token, zone, Pages project, R2, Turnstile, dan kredensial
> deploy untuk MY harus terpisah dan tidak boleh tertukar dengan milik ID.
>
> **Sumber kebenaran**: dokumen ini **tidak** menggantikan `REBUILD_PLAN.md`. Kalau ada
> kontradiksi dengan `REBUILD_PLAN.md` atau `AGENTS.md`, yang dua terakhir menang dan
> dokumen ini harus diupdate.

---

## 0. Ringkasan Eksekutif

Duplikasi `socio.id` (Indonesia) menjadi `socio.my` (Malaysia) dengan **hanya 2 perubahan
pengguna**: bahasa (Melayu + English) dan metode pembayaran (Touch 'n Go QR). Semua sistem
lain — SEO, email, cron, provider SMM, admin, order, affiliate — harus tetap berjalan
persis seperti sekarang di `socio.id`.

**Kesimpulan riset utama**: tidak ada multi-tenancy di sistem ini sama sekali. Ini bukan
menambah tenant, tapi **deployment kedua yang penuh**. Karena itu pendekatan yang dipilih
adalah **satu codebase config-driven** (bukan fork / copy-paste), supaya risiko terhadap
`app.socio.id` mendekati nol.

### Temuan yang mengubah strategi

1. **Coolify tidak punya GitHub webhook** (`is_webhook = 0` dari 130 deployment terverifikasi
   2 Okt 2026). Artinya `app.socio.id` **tidak akan rebuild sendiri** saat kita push.
   Ini justru menjadi *jaring pengaman*: seluruh Fase 1–6 dikerjakan di satu commit series,
   lalu kedua app di-build di commit final yang sama. `app.socio.id` tetap jalan di image
   lama (`c6db14c`) sepanjang pengerjaan.
2. **Landing `astro.config.mjs:9` = `site: "https://socio.id"`** + ~45 literal domain di file
   `.astro`. Kalau tidak diparameterisasi, Google akan **canonical-kan seluruh `socio.my` ke
   `socio.id`** → situs kedua **tidak akan terindeks sama sekali**.
3. **RAM VPS ketat**: 3,8 GB total, 1,6 GB terpakai, **1,2 GB swap sudah terpakai**, 2 vCPU.
   Container `app.socio.id` **tidak punya memory limit sama sekali** — ini akar insiden OOM
   6 Okt 2026 yang sempat mematikan seluruh VPS.
4. **Akun Cloudflare berbeda adalah batas kegagalan baru.** Riwayat repo sudah mencatat
   insiden salah akun: deploy ke akun yang salah menghasilkan project duplikat
   `socio-id-er2.pages.dev` (`docs/LANDING_DEPLOY.md:19-21`). Untuk MY, token API,
   account ID, zone, Pages project, R2, Turnstile, dan file secret harus diisolasi per
   akun sejak Fase 0. Tanpa isolasi ini, “zona baru” dan “project baru” belum cukup aman.

---

## 1. Keputusan yang Sudah Dikunci (user)

| Item | Keputusan |
|---|---|
| Bahasa | **Melayu + English toggle** |
| Struktur URL bahasa | `socio.my` (MS, tanpa prefix) + `socio.my/en/...` (EN) |
| URL app | `app.socio.my` |
| Database | **Terpisah** — schema `socio_my`, kosong |
| Isi DB awal | **Kosong** — sync provider SMMturk saja, tanpa migrasi user |
| Hosting | **VPS TNA yang sama**, Coolify application baru |
| Payment | **QR TnG statis + konfirmasi manual admin**, tanpa upload bukti |
| Email | Resend, **sending domain `socio.my`**, DKIM `d=socio.my` |
| SEO | **Pipeline kedua terpisah total** (repo/container/queue/state/GSC sendiri) |
| Cloudflare | **Akun berbeda dari `socio.id`** untuk zone, Pages, R2, Turnstile, dan deploy MY |
| R2 | **Belum diputuskan** — bucket baru di akun MY atau bucket lama + prefix `my/` (lihat Q4) |

### Keputusan yang diambil agent (alasan kuat, tetap bisa di-overrule)

| Keputusan | Alasan |
|---|---|
| Route slug app **tetap** (`/daftar`, `/pesan`, `/saldo`) di kedua bahasa | Mengubah slug = ribuan broken link + rewrite 77 route. Nol keuntungan. Label UI berubah, URL tidak. |
| Prefix `/en` di-strip di **Traefik**, bukan di SvelteKit | Traefik v3.6 sudah dipakai (`coolify-proxy`). Nol perubahan route SvelteKit → nol risiko ke route yang sudah jalan. |
| `SOCIO_CRON_ENABLED=1` hanya di **satu** instance | Kalau dua-duanya aktif: SMMturk di-poll 2× (API waste + kuota), penulisan `provider_services` balapan. |
| Rate SEO MY awal konservatif **6/hari** | Domain baru + 0 konten. Langsung 144/hari = scaled content risk + bisa kena spam policy. |

---

## 2. Pertanyaan yang MASIH Terbuka (blocker)

Empat hal ini belum diputuskan dan **menahan eksekusi**:

| # | Pertanyaan | Kenapa penting |
|---|---|---|
| Q1 | **Mekanisme pencocokan TnG.** Usulan agent: user mengisi kolom *reference* di aplikasi TnG dengan `invoiceId` (mis. `DEP-1738-42`), admin mencocokkan reference itu di app TnG. Alternatif: batas 1 deposit pending per user + admin approve satu per satu. Alternatif lain: user mengetik 3 digit akhir transaksi TnG di halaman deposit. | TnG QR **tidak bisa pakai** trik sufiks 3-digit BCA (`top-up/+page.server.ts:139`). Tanpa ini, dua deposit dengan nominal sama tidak bisa dibedakan. |
| Q2 | **Terjemahan admin (Batch B5, ~1.300 string) sekarang atau ditunda?** | Volume terbesar. Admin cuma dipakai owner, bisa ditunda sampai setelah live. |
| Q3 | **Repo arrangement.** `socio.my` masuk `ReqTimeout/socio.git` yang sama (branch `main` sama, Coolify build 2× dari 1 commit — lebih murah & sinkron) atau repo terpisah? | Repo sama = 1 commit untuk 2 brand, selalu sinkron. Repo terpisah = 2× maintenance tapi isolation penuh. |
| Q4 | **R2 MY: bucket baru di akun Cloudflare MY atau bucket lama + prefix `my/`?** | Bucket baru lebih konsisten dengan akun terpisah, tetapi butuh endpoint/key/custom-domain baru. Bucket lama lebih cepat, tetapi membuat storage MY tetap bergantung pada akun Cloudflare ID. |

---

## 3. Fase 0 — Prasyarat (butuh user, tidak bisa dikerjakan agent)

| # | Yang perlu | Kenapa blocker |
|---|---|---|
| 0.1 | **Gambar QR TnG** (SVG/PNG resolusi tinggi) | Akan disimpan di R2, ditampilkan di halaman top-up |
| 0.2 | **Data merchant TnG** — nama merchant, nomor sama, jenis akaun (personal/business) | Teks instruksi deposit + verifikasi manual admin |
| 0.3 | **Tambah domain `socio.my` di Resend** → kirim 3 DNS record (SPF, DKIM, MX) | DMARC `p=reject` + `adkim=s aspf=s` = email tanpa DKIM `d=socio.my` akan **ditolak**, bukan cuma masuk spam |
| 0.4 | **DNS Cloudflare zona baru `socio.my` di akun MY**: delegasikan nameserver domain ke nameserver akun MY di registrar, lalu buat zone `socio.my` hanya di akun MY. Buat record: apex + `www` untuk Pages MY, `app.socio.my` A/AAAA ke `130.254.47.93` dengan proxy seperti pola ID, `cdn.socio.my` untuk R2 MY, dan record Resend/DKIM/SPF/DMARC. Record mail/DKIM memakai **DNS-only**, bukan proxied. Set SSL Full Strict. Snapshot semua record MY sebelum diubah. **Jangan menyentuh zone `socio.id`.** | Prasyarat Pages custom domain, app, CDN, dan email |
| 0.4a | **Account ID + API token Cloudflare khusus MY** dengan scope minimum untuk zone/project MY. Simpan di file secret terpisah dan gitignored, misalnya env khusus runner/deploy MY. Jangan menggabungkan secret ID dan MY dalam satu file env. Jangan memakai OAuth/default login Wrangler tanpa verifikasi akun. | Mencegah deploy/poll DNS/Pages/R2 salah akun |
| 0.4b | **Bucket + kredensial R2 khusus MY** bila Q4 = bucket baru: `R2_BUCKET`, `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, dan `R2_PUBLIC_URL=https://cdn.socio.my`. Verifikasi custom domain `cdn.socio.my` dan satu object test dapat diakses publik. Bila Q4 = bucket lama, catat sebagai pengecualian eksplisit dan tetap pakai `R2_PREFIX=my/`. | Upload avatar/banner/QR MY tidak boleh menimpa atau memakai identitas storage ID |
| 0.4c | **Widget Turnstile baru di akun MY** untuk `socio.my`, `www.socio.my`, dan `app.socio.my`. Jangan menyalin sitekey/secret produksi ID dan jangan memakai test key di production. Tetap `SOCIO_TURNSTILE_ENABLED=0` sampai widget MY lolos verifikasi. | Widget bersifat per-hostname; kunci ID tidak boleh dipakai untuk domain MY |
| 0.5 | **Buat repo baru** `ReqTimeout/socio-my-runner` (private) | Pipeline SEO kedua (kalau Q3 = repo terpisah untuk landing, tapi runner pasti terpisah) |
| 0.5a | **GitHub PAT baru** dengan scope hanya repo MY. Jangan memakai PAT repo ID. Simpan hanya di secret runner MY, bukan di dokumen atau chat. | Pipeline MY harus push ke repo MY tanpa akses repo ID |
| 0.6 | **Property GSC baru** `sc-domain:socio.my` | Indexing & monitoring terpisah dari `socio.id` |
| 0.6a | **Pages project `socio-my` di akun MY**: buat/verifikasi project, koneksi GitHub dari akun MY, production branch, build command, root, output, Node version, dan env Pages. Verifikasi custom domain `socio.my` + `www.socio.my`. Jangan memakai project `socio-id` atau kredensial akun ID. | Deploy landing MY harus milik akun/project MY sejak awal |
| 0.7 | **Angka bisnis MY**: markup per level reseller, min/maks top up, nilai aktivasi reseller, bonus deposit, affiliate rate | Agent **tidak akan menebak** angka ini |
| 0.8 | **GA4 property + AdSense account** baru (atau matikan analytics dulu) | Sekarang hanya ada 1 publisher ID (`ca-pub-4438184351486735`) + 1 GA4 (`G-MDJCW053XR`) |
| 0.9 | **Nomor WhatsApp / telepon Malaysia** | Sekarang hardcoded `6281221272016` di 6 tempat |
| 0.10 | **Review hukum**: PRIVASI harus di-review ulang untuk **PDPA Malaysia** (bukan hanya GDPR/UU PDP Indonesia). Plus `/tos` sama sekali belum ada — `reseller.astro:119` menaut ke halaman yang tidak pernah ada (gap lama, harus dibetulkan juga). | Risk legal nyata untuk pasar MY |

---

## 4. Fase 1 — Isolasi Instance

**Tujuan**: dua instance berjalan berdampingan dengan data terpisah, **sebelum** ada
perubahan bahasa/payment sama sekali. Fase ini harus bisa diverifikasi sebagai
"tidak merubah apa-apa yang dilihat user".

### 1.1 Currency core — netral untuk IDR

Sumber: `app/src/lib/format.ts:1-3`
```ts
// SEKARANG
export function formatRupiah(n: number): string {
  return "Rp" + Math.round(n).toLocaleString("id-ID");
}
```

Rencana — env-driven, default **persis sama**:
```ts
const SYM = process.env.SOCIO_CURRENCY_SYMBOL ?? "Rp";
const LOC = process.env.SOCIO_LOCALE_NUM ?? "id-ID";
export function formatMoney(n: number): string {
  return SYM + Math.round(n).toLocaleString(LOC);
}
export const formatRupiah = formatMoney; // alias kompatibilitas
```

Ada **20 duplikat implementasi** yang harus disatukan (hasil audit):
| File | Line |
|---|---|
| `app/src/lib/server/email/merge.ts` | 36 |
| `app/src/lib/server/pdf.ts` | 7, 16, 23 |
| `app/src/lib/server/deposit-emails.ts` | 17 |
| `app/src/lib/server/affiliate.ts` | 3 |
| `app/src/lib/server/notification.ts` | 83 |
| `app/src/routes/api/admin/events/+server.ts` | 57 |
| `packages/ui/src/components/SaldoHero.svelte` | 26 |
| `packages/ui/src/components/ServiceCard.svelte` | 44, 203 |
| `packages/ui/src/components/NumberFlow.svelte` | 17 |
| `packages/ui/src/components/BalancePill.svelte` | 3 |
| + ~10 lainnya di `packages/ui` dan `(admin)` | — |

**Penting**: `packages/ui` itu **client-side**. Config currency harus masuk lewat
`data` dari root `app/src/routes/+layout.server.ts` atau `data.c` prop — **bukan**
`process.env` langsung (tidak ada di browser).

Sebutan singkat Indonesia `jt`/`rb` (`Chart.svelte:47-48`, `(admin)/admin/reporting/+page.svelte:33-34`)
→ `K`/`J`/`M` (Malay) atau `K`/`M` (English).

### 1.2 FX (`app/src/lib/server/fx.ts`)

Sekarang `USD_IDR` + range sanity `1000–100000` (line 15, 16, 69, 88). Untuk MYR (~4,7)
range itu tidak masuk akal.

| Baris | Sekarang | Rencana |
|---|---|---|
| 15 | `ENV_FALLBACK = process.env.SOCIO_USD_TO_IDR ?? 20000` | `SOCIO_USD_TO_LOCAL` (default `20000`) |
| 26, 39, 72, 89 | `pair: "USD_IDR"` | `` `USD_${process.env.SOCIO_CURRENCY ?? "IDR"}` `` |
| 16, 69, 88 | `rate < 1000 \|\| rate > 100000` | range env-driven per currency |
| 87 | `j.rates.IDR` | `j.rates[process.env.SOCIO_CURRENCY ?? "IDR"]` |

`fxRates.pair` sudah berupa kolom varchar (`packages/db/src/schema/fxRates.ts:14`) →
**tidak perlu migrasi**. DB terpisah jadi tidak ada risiko tercampur.

### 1.3 Domain hardcoded → env

Ada **26 site** literal `https://app.socio.id` (audit `AGENT_MEMORY.md` §11.1). Kalau tidak
diparameterisasi, semua CTA email & API `socio.my` akan membawa user ke app Indonesia.

**Prioritas tinggi (langsung detrimental):**
| File:line | Isu |
|---|---|
| `app/src/lib/server/email/render.ts:271` | `EMAIL_ASSETS = "https://socio.id/email"` → Sparko MY akan salah |
| `app/src/lib/server/email/render.ts:114, 149` | link tiket hardcoded |
| `app/src/lib/server/deposit-emails.ts` | ×5 (`ctaUrl`) |
| `app/src/cron/light.ts:54, 116` | `ctaUrl` deposit |
| `app/src/routes/(app)/saldo/top-up/+page.server.ts:188, 200` | CTA email |
| `app/src/routes/(admin)/admin/deposits/+page.server.ts:217, 294` | CTA email |
| `app/src/lib/server/email-templates.ts:49-50` | link sample |
| `app/src/routes/api/v1/+server.ts:131` | `base_url` respons API publik |
| `app/src/routes/api-docs/+page.svelte:2` | `const baseUrl` |
| `packages/ui/src/components/AppFooter.svelte:24, 53` | brand name |
| `packages/ui/src/components/Wordmark.svelte` | brand name |

Env fallback yang sudah ada tapi masih hardcoded sebagai default (aman, tapi baik diubah):
`auth.ts:52`, `signup.ts:127`, `(app)/affiliate/+page.server.ts:13`, `(app)/akun/+page.server.ts:13`.

### 1.4 Brand sebagai token

`Socio.id` + `.id` ada di ~40 tempat (landing + app + email + PDF). Jadikan:
- `SOCIO_BRAND_NAME` = `Socio.id` / `Socio.my`
- `SOCIO_BRAND_TLD` = `.id` / `.my`
- `SOCIO_BRAND_TAGLINE` = `Panel SMM Indonesia` / `Panel SMM Malaysia`

Untuk landing, `landing/src/styles/tokens.css` sudah **100% tokenized** (semua OKLCH, tanpa
hex literal) → brand/theme kedua cukup override `:root`. Tapi `navbar:35` dan `Footer.astro:43`
masih hardcode `.id` sebagai text span → perlu token `--brand-suffix` atau prop.

### 1.5 Timezone & waktu

| File:line | Sekarang | Rencana |
|---|---|---|
| `app/src/routes/(app)/+page.svelte:52-58` | `hourWIB`, `Asia/Jakarta` | `Asia/Kuala_Lumpur` |
| `app/src/routes/(app)/+page.svelte:58` | `timeZone: "Asia/Jakarta"` | env |
| `app/src/lib/server/deposit-emails.ts:74` | `" WIB"` | `" MYT"` |
| `app/src/lib/format.ts:26-33` | `Intl.DateTimeFormat("id-ID")` | env locale |

### 1.6 Database

- **Container MySQL ke-2** di host yang sama.
  - **Memory limit 400 MB WAJIB** + `--innodb-buffer-pool-size=128M` (yang sekarang 258 MB tanpa limit)
  - Precedent: sudah ada MySQL kedua (`lmzgomlezarhl32f012v7ydm`)
- Schema `socio_my`, user `socio_my`, **password baru**
- Jalankan `drizzle-kit generate` + `migrate` terhadap DB baru
- `packages/db/src/ensure.ts` (DDL runtime, jalan di **setiap request** via `hooks.server.ts:115`)
  akan membuat 13 tabel otomatis — jalankan sekali, verifikasi
- **Seed**: `pricing_rules` per level (markup MY — lihat 0.7), `provider` (SMMturk).
  `SOCIO_SMMTURK_KEY` **boleh sama** — itu provider, bukan brand.

### 1.7 Coolify application baru

| Setting | Nilai |
|---|---|
| Repository | `ReqTimeout/socio.git` (sama — lihat Q3) |
| Branch | `main` |
| Build pack | Dockerfile (`app/Dockerfile`, **sama persis**) |
| FQDN | `https://app.socio.my` |
| **Memory limit** | **768 MB — WAJIB** |
| CPU limit | 0.5 (opsional, agar tidak monop 2 vCPU) |
| Project | `socio-my` (baru, pisah dari `socio-app`) |

> **Kenapa memory limit wajib**: container `app.socio.id` sekarang **nol limit**. Root cause
> OOM 6 Okt adalah build di dalam container yang_ram-sa habis sebelum container app kena.
> Tanpa limit, instance kedua bisa melakukan hal yang sama lagi.

### 1.8 Env vars wajib berbeda (32 var)

**Tidak boleh sama** (dari audit §9.1):
```
SOCIO_DB_URL, SOCIO_DB_NAME, SOCIO_DB_USER, SOCIO_DB_PASS, SOCIO_DB_HOST, SOCIO_DB_PORT
SOCIO_APP_URL, BETTER_AUTH_URL
SOCIO_AUTH_SECRET                 # juga jadi kunci TOTP + HMAC anti-tamper deposit
SOCIO_PROVIDER_ENC_KEY            # ⚠ JANGAN pernah diubah setelah data ada
SOCIO_CURRENCY, SOCIO_CURRENCY_SYMBOL, SOCIO_LOCALE_NUM, SOCIO_LOCALE_DEFAULT
SOCIO_BRAND_NAME, SOCIO_BRAND_TLD, SOCIO_BRAND_TAGLINE, SOCIO_TIMEZONE
SOCIO_USD_TO_LOCAL
SOCIO_MAIL_FROM, SOCIO_MAIL_FROM_NAME, SOCIO_MAIL_SUPPORT, SOCIO_MAIL_DOMAIN, SOCIO_DKIM_PRIVATE_KEY
RESEND_API_KEY                    # akun Resend boleh sama, tetapi domain pengiriman + DKIM harus milik socio.my
VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT   # ⚠ wajib baru (lihat §8)
SOCIO_TURNSTILE_SITEKEY, SOCIO_TURNSTILE_SECRET     # widget baru di akun MY, per hostname MY
R2_PREFIX                         # hanya bila Q4 = bucket lama; bila bucket baru, ganti dengan kredensial R2 MY di bawah
SOCIO_CRON_ENABLED                # hanya di satu instance
```

**Bila Q4 = bucket R2 baru di akun MY**, empat variabel berikut juga wajib berbeda dan
tidak boleh memakai nilai ID:

```
R2_BUCKET, R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
R2_PUBLIC_URL                     # harus https://cdn.socio.my bila custom domain MY dipakai
```

Kredensial Cloudflare untuk Pages/DNS/R2/deploy (`CLOUDFLARE_API_TOKEN`,
`CLOUDFLARE_ACCOUNT_ID`, dan token R2) **bukan env runtime app**. Simpan hanya di secret
store deploy/pipeline MY, bukan di env Coolify app kecuali variabel itu memang dibaca kode
app (`R2_*`, `SOCIO_TURNSTILE_*`). Jangan pernah menaruh token akun ID dan token akun MY
dalam file env yang sama.

**Boleh sama**: `SOCIO_SMMTURK_KEY`, `SOCIO_SMMTURK_URL`, `SOCIO_DEPOSIT_BONUS`,
`SOCIO_AFFILIATE_RATE`, `SOCIO_BACKUP_DIR`, `NODE_ENV`.

### 1.9 Guard anti-bencana (WAJIB)

`packages/db/src/ensure.ts` menjalankan `CREATE TABLE IF NOT EXISTS` di **DB tujuan** pada
setiap request. Kalau `SOCIO_DB_URL` salah set, instance MY akan **diam-diam menulis ke DB
`socio_smm`** dan mengubah `services`, `pricing_rules`, `admin_settings` (termasuk
`maintenance_mode`) milik Indonesia.

Tambahkan di `app/src/hooks.server.ts` (sebelum `getDb()`):
```ts
// Fail-closed: instance .my tidak boleh pernah menyentuh DB .id
const EXPECTED = process.env.SOCIO_EXPECT_DB_NAME;
if (EXPECTED && !process.env.SOCIO_DB_URL?.includes(EXPECTED)) {
  throw new Error(`SOCIO_DB_URL tidak cocok dengan SOCIO_EXPECT_DB_NAME="${EXPECTED}" — boot dibatalkan.`);
}
```
Set `SOCIO_EXPECT_DB_NAME=socio_my` di instance MY, `SOCIO_EXPECT_DB_NAME=socio_smm` di instance ID.

### 1.10 R2 isolation

Key R2 sekarang **tanpa tenant prefix**:
- `avatars/{userId}` — `(app)/akun/+page.server.ts:96`
- `proofs/{depositId}-{ts}` — `(app)/saldo/top-up/+page.server.ts:221`
- `banners/{ts}-{rand}` — `api/upload/+server.ts:25`

Karena `userId` mulai dari 1 di DB baru, `avatars/1` di MY akan **menimpa** `avatars/1` di ID.
Solusi: `R2_PREFIX=my/` di instance MY. Alternatif: bucket R2 terpisah (lebih bersih tapi
lebih banyak setup).

### 1.11 Isolasi kredensial Cloudflare (WAJIB untuk akun berbeda)

Kode app tidak mengetahui akun Cloudflare saat boot, jadi isolasi ini prosedural, bukan
guard runtime seperti `SOCIO_EXPECT_DB_NAME`:

- Gunakan token + account ID akun MY hanya untuk pekerjaan MY.
- Gunakan token + account ID akun ID hanya untuk pekerjaan ID.
- Jangan mengekspor kedua kredensial dalam satu shell global.
- Untuk perintah manual, set env hanya untuk satu perintah, lalu `unset`.
- Jangan memakai OAuth/default login Wrangler tanpa memastikan akun aktifnya adalah akun MY.
- Sebelum deploy Pages MY: cocokkan account, project `socio-my`, dan custom domain MY.
- Sebelum operasi DNS MY: cocokkan zone `socio.my` di akun MY.
- Sebelum operasi R2 MY: cocokkan endpoint, bucket, dan public URL MY.
- Simpan kredensial MY di secret store terpisah dan gitignored; jangan menyalin isi
  secret akun ID ke dokumen, chat, atau file plan.

### Gate Fase 1 — WAJIB lolos sebelum lanjut

- [ ] `pnpm --filter app check` → 0 error
- [ ] `pnpm --filter app build` → sukses
- [ ] `packages/core test` → lulus
- [ ] `node app/scripts/email-selftest.mjs` → 34 cek lolos
- [ ] **Regresi `socio.id`**: buka 5 halaman (dashboard, pesan, top-up, pesanan, admin) →
      angka & copy **identik** dengan sebelum perubahan
- [ ] Env app MY: `SOCIO_DB_URL` mengandung `socio_my`, `SOCIO_APP_URL` = `https://app.socio.my`,
      `SOCIO_MAIL_FROM` milik `socio.my`, dan `R2_PUBLIC_URL` milik MY bila bucket baru dipakai
- [ ] Tidak ada URL/endpoint publik ID (`app.socio.id`, `socio.id/email`, `cdn.socio.id`)
      di env dan smoke test instance MY
- [ ] 1 email tes ke `aramadhi92@gmail.com` → link **tetap `app.socio.id`**, bukan `socio.my`
- [ ] `app.socio.id` masih HTTP 303 + load normal

---

## 5. Fase 2 — Payment Touch 'n Go QR

**Keputusan user**: tanpa upload bukti, konfirmasi manual admin.

### 5.1 Yang DIPAKAI ULANG (bukan ditulis ulang)

| Komponen | Lokasi | Alasan |
|---|---|---|
| Renderer QR SVG | `app/src/routes/(app)/saldo/qr/+server.ts` | Sudah ada, pakai `qrcode` 1.5.4. Tinggal ganti sumber data. |
| Alur approve admin | `(admin)/admin/deposits/+page.server.ts:135-165` | Transaksi + balance_logs + audit + email. **Utuh.** |
| Idempotency claim | `+page.server.ts:151-154` | `UPDATE ... WHERE status='Pending'` — sudah benar |
| Credit affiliate | `lib/server/affiliate.ts` | Tidak berubah |
| Auto-expire pending | `app/src/cron/light.ts:18-33` | Tidak berubah |

### 5.2 Yang DIUBAH

| File:line | Perubahan |
|---|---|
| `packages/db/src/schema/deposits.ts:18` | enum `["pulsa","bank"]` → tambah `"qr"` → **perlu migrasi ALTER** |
| `packages/db/src/schema/deposits.ts:19` | enum `type` sudah punya `"auto"` + `"VA"` yang belum dipakai → pakai `"auto"` |
| `top-up/+page.server.ts:148-151` | `payment: "bank"` → `"qr"`, `type: "manual"` → `"auto"`, `methodName: "Transfer BCA"` → `"Touch 'n Go QR"`, `validasi: "BCA"` → `"TnG"` |
| `top-up/+page.server.ts:139` | **buang sufiks 3-digit** → `postAmount = amount` |
| `top-up/+page.server.ts:123-129` | batas 2 pending → **1** (kalau Q1 = reference) |
| `top-up/+page.server.ts:115-117` | guard `method !== "manual"` → allow `"tng"` |
| `top-up/+page.svelte:225-272` | kartu metode BCA → pilihan TnG QR + instruksi reference |
| `top-up/+page.svelte:320` | `<input type="hidden" name="method" value="manual" />` → radio |
| `top-up/+page.svelte:443-444` | `/saldo/qr?data=BCA ...` → `/saldo/qr?data=<qr_url_TnG>` |
| `app/src/lib/server/signup.ts:176-178` | aktivasi reseller: `"Bank Central Asia"`/`"BCA"` → TnG QR |
| `app/src/lib/server/deposit-emails.ts:41-57` | `bankCard()` / `steps()` → template TnG (ganti "Transfer pas sesuai nominal" → instruksi reference) |
| `(admin)/admin/deposits/+page.svelte:61-67` | heuristik ikon + **kolom reference** |
| `(admin)/admin/deposits/+page.server.ts:145` | note `"Deposit BCA dikonfirmasi #"` → generic |
| `(admin)/admin/deposits/verify/+page.server.ts:67` | sama seperti di atas — note hardcoded "Deposit BCA" |
| `app/src/hooks.server.ts:175, 180` | CSP `script-src`/`frame-src` — hanya kalau pakai TnG widget hosted |

**Konsistensi saldo**: `top-up/+page.server.ts:141-143` — `credited = postAmount + bonus`.
Setelah sufiks dibuang, `credited = amount + bonus`. Admin approveelease kredit
`deposits.amount` (`:136-140`) → tetap konsisten.

**Kebijakan aktivasi reseller (sudah live di ID, berlaku juga untuk MY)**:
expire 72 jam (`SOCIO_RESELLER_ACTIVATION_HOURS`), reminder 3 tahap H-2/H-1/T-2 jam
(`deposits.reminder_stage`), dashboard reseller belum aktif wajib selesaikan aktivasi
(banner + tombol kirim-ulang invoice), order diblokir sampai `verify=Yes`.
Untuk MY tinggal ganti metode/instruksi ke TnG QR + reference — kerangka gate,
reminder, dan re-invoice dipakai ulang apa adanya.

### 5.3 Angka bisnis (dari 0.7)

Semua hardcode IDR di `top-up` dipindah ke env:
```
SOCIO_TOPUP_MIN       (sekarang 20000 di :119, :50, +page.svelte:205,217, +page.svelte:256)
SOCIO_TOPUP_MAX       (sekarang 10_000_000 di :120)
SOCIO_TOPUP_CHIPS     (sekarang [50000,100000,200000,500000] di :28)
SOCIO_TOPUP_BUCKET    (sekarang 50000 di :51)
SOCIO_RESELLER_ACTIVATION  (sekarang 50000 + suffix di signup.ts:152)
SOCIO_RESELLER_BONUS  (sekarang env `SOCIO_RESELLER_BONUS ?? 20000` — sudah env-driven ✓)
SOCIO_DEPOSIT_BONUS   (sudah env-driven ✓)
```

### 5.4 Catatan penting soal sufiks 3-digit

Trik `postAmount = amount + suffix` (`top-up/+page.server.ts:139`) **khusus transfer bank**:
admin mencocokkan nominal **persis** dari mutasi rekening. DuitNow/TnG QR **tidak bisa
membawa instruksi "bayar tepat Rp50.123"** — user mengetik nominal sendiri. Jadi:
- `postAmount` harus **sama dengan** `amount` untuk QR
- Discriminator harus pindah ke **kode reference** (Q1)

Kalau nanti Q1 = "user ketik 3 digit akhir", implementasinya mirip: `postAmount` tetap amount,
dan simpan kode 3-digit di kolom `invoice_virtual` (sudah ada, `deposits.ts:31`, belum dipakai).

### Gate Fase 2 — WAJIB lolos sebelum lanjut

- [ ] Migrasi enum berhasil, `deposits.payment` menerima `"qr"`
- [ ] End-to-end di DB `socio_my`: buat deposit → dapat email instruksi → admin approve → saldo masuk
- [ ] **Nol** email terkirim ke user `socio.id` (semua test ke `aramadhi92@gmail.com`)
- [ ] Auto-expire cron masih membatalkan deposit pending TnG dengan benar
- [ ] Admin deposits list menampilkan reference + tombol approve untuk TnG
- [ ] Gambar QR TnG diambil dari storage/public URL MY, bukan URL ID
- [ ] `check` + `build` + `email-selftest` hijau
- [ ] Regresi `socio.id` top-up: kartu BCA masih tampil & flow masih jalan

---

## 6. Fase 3 — Infrastruktur i18n (MS/EN)

Fase **terbesar**. Angka audit (konservatif, berbasis hitungan line/literal):

| Area | String |
|---|---|
| `(admin)` — 27 halaman | 1.296 |
| `(app)` — 14 halaman | 489 |
| `packages/ui` — 48 komponen | 102 |
| `(auth)` — 5 halaman | 69 |
| Email | 40 |
| `cron/*` | 17 |
| `packages/core` (`copy.ts`, `pricing.ts`, `rbac.ts`) | 28 |
| `lib/` lain + service worker | 25 |
| **TOTAL** | **~2.100** |

### 6.1 Struktur katalog

```
packages/core/src/i18n/
  index.ts     type Locale = "id" | "ms" | "en"; setLocale(); t(); plural()
  ms.ts        katalog Melayu
  en.ts        katalog English
  id.ts        katalog Indonesia (migrasi copy.ts + semua string baru)
```

`packages/core/src/copy.ts:12` saat ini berisi guardrail:
> `DILARANG tambah/hapus/rename key (guardrail APP V2 #1) — hanya nilai string.`

Guardrail itu bagus untuk menjaga konsistensi **tapi bukan** pendekatan untuk 2 bahasa
× 2.100 string. Katalog baru **boleh tumbuh**; yang dijaga hanya konsistensi nada bahasa
(CTA = verb, error = penyebab + solusi, empty state = empati + 1 CTA, max 1 jenaka per layar).

### 6.2 Routing bahasa — via Traefik (rekomendasi)

Traefik v3.6 sudah ada (`coolify-proxy`). Tambahkan rule:
```
socio.my/en/*  →  strip prefix  →  app.socio.my/*
```
di **Route Rules / Middleware** di Coolify. Dampak:
- Nol perubahan di 77 route SvelteKit
- Session cookie tetap jalan (locale disimpan di cookie, default MS)
- `/en` bisa di-rewrite ke host + header `X-Socio-Locale: en` untuk `hooks.server.ts`

Alternatif yang lebih murni: pindahkan 77 route ke bawah `routes/(en)/` dengan `+layout.ts`
yang set locale. Lebih banyak file tapi tidak perlu menyentuh proxy.

### 6.3 Hook yang sudah ada

`app/src/lib/server/email/render.ts:37, 45` sudah punya:
```ts
lang?: string;  ...
<html lang="${o.lang ?? "id"}">   // ← hook SUDAH ADA, belum ada pemanggil
```
Free win saat copy MS masuk.

### 6.4 Prioritas terjemahan

| Batch | Isi | ~String | Blocking? |
|---|---|---|---|
| **B1** | `packages/core/i18n` + `packages/ui` (48 komponen) | 120 | Ya |
| **B2** | `(auth)` — login, daftar, lupa-password, reset, verifikasi | 70 | Ya |
| **B3** | `(app)` — dashboard, pesan, pesanan, saldo, akun, tiket, notif, affiliate, layanan | 490 | Ya |
| **B4** | Email — 40 string + merge tags | 45 | Ya |
| **B5** | `(admin)` — 27 halaman | 1.300 | **Tergantung Q2** |

B1–B3 + B4 ≈ **725 string**. B5 bisa menyusul setelah live.

### 6.5 File terbesar per batch

```
106  app/src/routes/(admin)/admin/orders/+page.svelte
 93  app/src/routes/(admin)/admin/users/+page.svelte
 89  app/src/routes/(admin)/admin/services/+page.svelte
 68  app/src/routes/(app)/pesanan/+page.svelte
 66  app/src/routes/(app)/+page.svelte
 65  app/src/routes/(app)/pesan/+page.svelte
 55  app/src/routes/(admin)/admin/pricing/+page.svelte
 51  app/src/routes/(admin)/admin/deposits/+page.svelte
 50  app/src/routes/(app)/+layout.svelte
 47  app/src/routes/(admin)/+layout.svelte
 46  app/src/routes/(app)/akun/+page.svelte
 44  app/src/routes/(admin)/admin/email/+page.svelte
```

### 6.6 Validasi

Tidak ada `zod` di kode (deklarasi tapi tidak pernah di-import — `app/package.json:34`).
Semua validasi manual `if (!x) return fail(400, {error: "..."})`. Jadi string validasi juga
perlu ikut diterjemahkan (contoh: `daftar/+page.server.ts:69` `"Username minimal 3 karakter."`).

### Gate Fase 3

- [ ] Toggle MS ↔ EN berfungsi di semua halaman user
- [ ] `<html lang>` benar (`ms-MY` / `en-MY`)
- [ ] Semua angka MYR benar (`RM`, `ms-MY` locale)
- [ ] Email MS & EN terkirim ke `aramadhi92@gmail.com`, keduanya tampil benar
- [ ] Route ID tetap 100% Bahasa Indonesia (tidak ada yang bocor "MS only")
- [ ] `check` + `build` + `email-selftest` hijau

---

## 7. Fase 4 — Landing `socio.my`

### 7.1 Blocker utama

`landing/astro.config.mjs:9`:
```js
site: "https://socio.id",
```
+ **~45 literal domain** di file `.astro`. Kalau tidak diubah → Google canonical-kan
seluruh `socio.my` ke `socio.id` → **situs kedua tidak akan terindeks sama sekali**.

### 7.2 Yang harus diparameterisasi

| Kategori | Lokasi |
|---|---|
| `site` | `landing/astro.config.mjs:9` |
| Canonical / OG | `Layout.astro:24-25` (sudah pakai `Astro.site` ✓) |
| JSON-LD `url`/`sameAs`/`isPartOf` | `Layout.astro:179, 198, 201, 206`; `index.astro:44-48, 278-291`; `layanan.astro:36, 43-44, 57-58`; `blog/*.astro` |
| `inLanguage` | `Layout.astro:188`, `index.astro:45`, `blog/[slug].astro:88`, `privacy.astro:22` |
| `priceCurrency` | `Layout.astro:185` (`"IDR"`) |
| `availableLanguage` | `Layout.astro:211` (`['Indonesian','English']`) → tambah Malay |
| Brand name | `Layout.astro:34, 36, 37, 46, 219`; `Navbar.svelte:35`; `Footer.astro:43` |
| Telepon | `Layout.astro:210`, `privacy.astro:123`, `FloatingWhatsApp.svelte:6`, `Footer.astro:31`, `Faq.svelte:67`, `TopLayananTable.svelte:176` |
| `public/robots.txt:11` | `Sitemap: https://socio.id/sitemap-index.xml` |
| `public/_headers:18` | CSP `form-action 'self' https://app.socio.id` |
| `public/llms.txt`, `llms-full.txt` | 56 occ masing-masing |
| `public/ads.txt` | publisher ID baru |
| RSS | `pages/rss.xml.js:14` |
| GA4 outbound_click | `Layout.astro:415` |

### 7.3 Yang tidak boleh dipakai ulang

| Aset | Alasan |
|---|---|
| `seo/cities.json` — 72 kota Indonesia | Risiko **doorway page**. Tidak boleh jadi "Kuala Lumpur version". |
| 927 MDX lokal / 1.132 di runner | Semua Bahasa Indonesia + targeting kata kunci ID + kota ID |
| `beli-pages.generated.ts` (34 dari 44) | Dibuat `seo/money-expand.mjs` dari kota ID |
| 12 `<title>` `… | Panel SMM Indonesia` | Harus ganti |

### 7.4 Struktur

- `socio.my/` (MS) + `socio.my/en/...` (EN) dengan `hreflang` lengkap + `x-default`
- `@astrojs/i18n` untuk locale routing
- Build hook yang di luar `landing/`: `seo/sync-content.mjs:30` + `seo/fix-sitemap.mjs:19`
  → harus diparameterisasi (`SEO_DIST_DIR`)

### 7.5 Konten Fase 4

Hanya **9 halaman inti + 44 money page × 2 bahasa** ≈ 106 URL. Artikel SEO menyusul di Fase 6.
Money page MY butuh keyword MY (campur Bahasa Melayu & English — pasar MY memang
biasa mencampur dua bahasa dalam satu query).
Legal: `/privacy` di-review untuk **PDPA Malaysia**, plus **buat `/tos`** (sekarang tidak ada).

### 7.6 Cloudflare

- Pages project baru `socio-my` **dibuat dan dioperasikan di akun MY**, bukan akun ID.
- Koneksi GitHub Pages dibuat dari akun MY; jangan memakai koneksi/token akun ID.
- Tetapkan production branch, build command, root, output, Node version, dan env Pages MY.
- Pasang custom domain `socio.my` + `www.socio.my` hanya setelah zone MY aktif di akun MY.
- Deploy manual atau pipeline MY harus memakai token + account ID akun MY.
- Sebelum deploy, verifikasi:
  - account aktif = akun MY;
  - project = `socio-my`;
  - custom domain = `socio.my`/`www.socio.my`;
  - tidak ada deploy yang mengarah ke project `socio-id`.
- Sampai Q3 diputuskan, jangan mengasumsikan repo/branch yang sama dapat dipakai dua
  Pages project tanpa konflik konten/locale/build.
- GA4 & AdSense **terpisah** (lihat 0.8)

### Gate Fase 4

- [ ] `astro build` sukses + `fix-sitemap.mjs` jalan
- [ ] `seo/jsonld-validate.mjs --strict` lolos untuk kedua locale
- [ ] Tidak ada literal `socio.id` di build output MY (`grep dist/`)
- [ ] `hreflang` + `x-default` valid
- [ ] Canonical semua halaman MY menunjuk ke `socio.my`, **tidak ada** yang ke `socio.id`
- [ ] Deployment MY milik account/project MY dan custom domain MY
- [ ] Tidak ada kredensial atau ID akun Cloudflare ID di env/build/log MY
- [ ] `socio.id` landing **tidak berubah sama sekali** (byte-compare `dist/`)

---

## 8. Fase 5 — Email brand MY

| File:line | Masalah | Rencana |
|---|---|---|
| `app/src/lib/server/email.ts:88` | `dkim: { domainName: "socio.id" }` **hardcoded tanpa env** | `SOCIO_MAIL_DOMAIN` |
| `app/src/lib/server/email.ts:11` | `SOCIO_MAIL_FROM ?? "noreply@socio.id"` | env (sudah ada, tinggal set) |
| `app/src/lib/server/email.ts:12` | `SOCIO_MAIL_FROM_NAME ?? "Socio ID"` | `"Socio MY"` |
| `app/src/lib/server/email.ts:13` | `SOCIO_MAIL_SUPPORT ?? "support@socio.id"` | env |
| `app/src/lib/server/email/render.ts:138, 141, 144, 168` | `© ${y} Socio.id — Panel SMM Indonesia` | brand token |
| `app/src/lib/server/email/render.ts:157` | `DEFAULT_MARKETING_ADDRESS = "Socio.id — Jakarta, Indonesia"` | `"Socio.my — Kuala Lumpur, Malaysia"` |
| `app/src/lib/server/email/render.ts:271` | `EMAIL_ASSETS = "https://socio.id/email"` | env → Sparko MY |
| `app/src/lib/server/notification.ts:8` | `webpush.setVapidDetails("mailto:admin@socio.id")` | env |
| `app/src/lib/server/broadcast.ts:9` | sama | env |
| `app/src/lib/server/pdf.ts:31, 35` | `"SOCIO.ID"`, `"SMM Panel Indonesia — socio.id"` | brand token |
| `app/src/cron/email-queue.ts:67` | `let subject = \`Socio.id\`` | brand token |
| `app/src/routes/(app)/+page.svelte:199` + 11 halaman lain | `<title>… | Panel SMM Indonesia</title>` | brand token |
| `packages/ui/.../AppFooter.svelte:24, 53` | brand | brand token |

### ⚠️ VAPID WAJIB BARU

`VAPID_PRIVATE_KEY` **tidak boleh dipakai bersama**. Subscription web push di DB
`web_push_subscriptions` terikat ke key pair itu. Kalau/shared, user `socio.id` akan
menerima notifikasi dari `socio.my` (dan sebaliknya). Perlu generate key pair baru via
`web-push generate-vapid-keys`.

### Email yang perlu Relevan ulang

Semua copy email Bahasa Indonesia → MS + EN (Fase 3 B4, ~40 string). `deposit-emails.ts`
butuh perhatian khusus karena instruksinya berubah total (BCA → TnG reference).

### Gate Fase 5

- [ ] Email tes ke `aramadhi92@gmail.com` **dari `noreply@socio.my`**, DKIM pass, DMARC pass
- [ ] Header email MY tidak memakai domain, selector, atau kunci DKIM milik ID
- [ ] `dig TXT _domainkey.socio.my` → DKIM record ada
- [ ] Email dari instance **ID** tetap Dari `noreply@socio.id` (tidak boleh bocor)
- [ ] Sparko MY load 200 dari `socio.my/email/`
- [ ] Notifikasi push instance MY tidak sampai ke user ID (cek `web_push_subscriptions`)

---

## 9. Fase 6 — Pipeline SEO MY (terpisah total)

### 9.1 Kenapa harus terpisah

`seo-publish-git-cycle` (host cron) **hardcode nama container** `c9iqug5vvi9kjywt1fn6xnsc-...`.
`seo-measure-cycle` resolve via `docker ps --filter name=ssoe-new|ancestor=ssoe-new | head -1`.
Kalau instance MY pakai nama/ancestor mirip, run socio.my bisa **masuk ke container socio.id**
atau sebaliknya. Plus `queue.json` + `state.json` **satu pool** — MY akan
menggerus kuota publish `socio.id` dan diukur dengan index rate GSC `socio.id`.

### 9.2 Yang harus terpisah

| Aset | socio.id (existing, JANGAN disentuh) | socio.my (baru) |
|---|---|---|
| Git repo | `ReqTimeout/socio-seo-runner` | `ReqTimeout/socio-my-runner` |
| GitHub PAT | PAT khusus repo ID | PAT baru khusus repo MY |
| Container | `c9iqug5vvi9kjywt1fn6xnsc` (`ssoe-new`) | uuid baru, image `ssoe-my` |
| Env/secret runner | env khusus ID | file env khusus MY, terpisah dan gitignored |
| Cloudflare API/account | token + account ID akun ID | token + account ID akun MY |
| Volume clone | `/app/data/repo` | `/app/data/repo` (container sendiri) |
| Cron | `/etc/cron.d/seo-publish-git` | `/etc/cron.d/seo-my-publish-git` |
| Wrapper cron | script/cycle khusus ID | script/cycle khusus MY, nama dan lock unik |
| Lock | `flock` existing | `flock` terpisah |
| Log | `/var/log/seo-publish.log` | `/var/log/seo-my-publish.log` |
| `queue.json` / `state.json` / `config.json` | existing | volume terpisah |
| IndexNow key | key `socio.id` | key baru `socio.my` |
| GSC | `sc-domain:socio.id` | `sc-domain:socio.my` |
| Pages project | `socio-id` | `socio-my` di akun MY |
| Content | 1.132 MDX Bahasa Indonesia | 0 → diisi gradual |

### 9.3 Script yang di-reuse tapi harus jadi env-driven

Untuk MY, hardcoded berikut tidak boleh dibiarkan menunjuk ke ID:

| File:line | Hardcoded | Rencana MY |
|---|---|---|
| `seo/publish-git.mjs:48` | `const SITE = 'https://socio.id'` | `SEO_SITE_URL` / `https://socio.my` |
| `seo/publish-git.mjs:185` | `/pages/projects/socio-id/deployments` | nama project dari env, misalnya `SEO_PAGES_PROJECT=socio-my` |
| `seo/indexnow.mjs:45` | `host: 'socio.id'` | host dari env / `https://socio.my` |
| `seo/indexnow.mjs:47` | `keyLocation: 'https://socio.id/indexnow.txt'` | key location MY |
| `seo/llms.mjs:19` / `seo/llms-mdx.mjs:27` | `const SITE = 'https://socio.id'` | `SEO_SITE_URL` |
| `seo/bootstrap-state.mjs:24` | `const SITE = 'https://socio.id'` | `SEO_SITE_URL` |
| `seo/migrate-state.mjs:75` | `https://socio.id/blog/${slug}/` | basis URL MY |
| `seo/from-template.mjs:4, 70, 73` | baked CTA `app.socio.id/daftar` | CTA `app.socio.my/daftar` |
| `seo/jsonld-live.mjs:14` | SITE | `SEO_SITE_URL` |
| `Dockerfile:3, 21` | `GSC_SITE_URL=sc-domain:socio.id` | `GSC_SITE_URL=sc-domain:socio.my` |

Sudah env-ready ( reusable): `GSC_SITE_URL`, `GSC_SITEMAP_URL`, `BING_SITE_URL`,
`SEO_CONTENT_DIR`, `SEO_QUEUE_PATH`, `SEO_STATE_PATH`, `SEO_CONFIG_PATH`, `seo/paths.mjs`.

Domain-agnostic (pakai apa adanya): `Dockerfile` (sebagian), `runner/`, `qc-*`, `mesh-build`,
`jsonld-*`, `paths.mjs`, `article-lint`, `gsc.mjs`.

### 9.4 Konten MY

- **Cities**: `cities.json` baru — state Malaysia. Tiering tetap (tier-1 = KL, Penang, JB,
  Johor Bahru, Kota Kinabalu, Shah Alam; dst). ~72 entri, `anchor` per state (MY, bukan ID).
- **Rate**: **6/hari** initially, naik via `ramp-gate.mjs` sesuai index rate GSC.
  **Dilarang** langsung 144/hari.
- **QC gate** `qc-uniqueness.mjs` (FAIL 0.62 / WARN 0.48) **tetap wajib** — threshold di-tune
  di korpus MY secara terpisah, bukan dipakai apa adanya dari korpus ID.
- **Prasyarat**: `public/indexnow.txt` key **baru** (key per-host, tidak bisa share).
  `SOCIO_INDEXNOW_KEY` baru untuk MY.

### Gate Fase 6

- [ ] Cron MY **tidak** menyentuh container/cron `socio.id` (verifikasi nama + lock + log)
- [ ] Runner MY memakai PAT repo MY, token/account Cloudflare MY, dan env file MY
- [ ] Pipeline MY mempoll Pages project MY di akun MY, bukan project ID
- [ ] `socio.id` publish tetap 24/run, `draft:false` count naik normal
- [ ] Pipeline MY: publish → Pages build → verify → IndexNow 200 (key MY)
- [ ] GSC MY accept sitemap
- [ ] Load guard di cron MY (skip bila load ≥8 atau RAM < 700 MB) — **wajib**, VPS sudah pernah OOM

---

## 10. Fase 7 — Hardening & Launch

### 10.1 Checklist teknis
- [ ] Memory limit **terverifikasi di kedua container** (`docker inspect`)
- [ ] Load/RAM guard di cron kedua
- [ ] Monitoring: RAM available, swap, load, disk — alert sebelum 80%
- [ ] `/var/log/mail/mail.log` rotation (insiden 45 GB, 7 Okt)
- [ ] Backup DB `socio_my` terjadwal (cron `backup` di dalam app sudah ada)
- [ ] Secret ID dan secret MY tersimpan di file/store terpisah; tidak ada token Cloudflare
      ID di environment/log/deploy MY
- [ ] Verifikasi akun Cloudflare sebelum deploy DNS/Pages/R2/pipeline MY
- [ ] Snapshot DNS MY tersimpan sebelum go-live
- [ ] Swap file adequate (sekarang 2 GB dengan 1,2 GB terpakai — **pertimbangkan 4 GB**)

### 10.2 Regression suite `socio.id` (wajib, tiap fase)
1. `app.socio.id` → 303 dalam < 1 detik
2. `/login` 200, `/daftar` 200
3. Load average < 2
4. 12 halaman inti render tanpa error (bukan hanya HTTP code)
5. `docker logs` app container bersih (grep `error|exception|failed|Cannot find`)
6. `email_queue` tidak menumpuk
7. Cron `socio.id` (`seo-publish-git`, `seo-measure`) masih jalan sesuai jadwal
8. 1 email tes ke `aramadhi92@gmail.com` → **link `app.socio.id`**
9. Tidak ada deploy/cron/DNS/pipeline MY yang memakai kredensial atau menyentuh aset ID
### 10.3 Rollback plan
- App MY: Coolify rollback ke image sebelumnya
- DB MY: backup sebelum go-live
- DNS: catat semua record sebelum diubah
- DNS MY: rollback memakai snapshot MY dan akun MY, bukan akun ID
- Landing MY: Pages rollback ke deploy sebelumnya memakai kredensial MY
- `socio.id`: **tidak pernah di-deploy** selama Fase 1–6 → zero rollback needed

### 10.4 Dokumentasi
- `docs/AGENT_MEMORY.md` → tambahkan section `socio.my`
- `docs/MY_LAUNCH.md` → runbook operasional harian (verify deposit TnG manual)
- `AGENTS.md` → catat bahwa ada 2 brand aktif + aturan tidak boleh disentuh untuk masing-masing

---

## 11. Matriks Risiko

| # | Risiko | Dampak | Mitigasi |
|---|---|---|---|
| 1 | **OOM kill dua app** | 🔴 Fatal | Memory limit 768 MB + 400 MB DB + load guard + monitoring |
| 2 | Env salah → MY nulis ke DB `socio_smm` | 🔴 Fatal | `SOCIO_EXPECT_DB_NAME` fail-closed di `hooks.server.ts` (Fase 1.9) |
| 3 | Canonical salah → MY tidak terindeks | 🟠 Tinggi | `PUBLIC_SITE_URL` + `jsonld-live` + verify `dist/` sebelum GSC submit |
| 4 | Double cron poll SMMturk | 🟠 Tinggi | `SOCIO_CRON_ENABLED` hanya di satu instance |
| 5 | Cron MY masuk container `socio.id` | 🟠 Tinggi | Nama container unik + lock + log terpisah (Fase 6.1) |
| 6 | Email MY masuk user ID / sebaliknya | 🟠 Tinggi | DB terpisah + test ke email Anda dulu |
| 7 | Email MY gagal DMARC | 🟠 Tinggi | DKIM `d=socio.my` + SPF + DMARC record (Fase 0.3) |
| 8 | Push notifikasi MY ke user ID | 🟡 Sedang | VAPID key baru |
| 9 | Avatar/proof tertimpa antar brand | 🟡 Sedang | `R2_PREFIX` |
| 10 | Text Bahasa Indonesia bocor di MY | 🟡 Sedang | Regression check per batch |
| 11 | `SOCIO_PROVIDER_ENC_KEY` diubah | 🟡 Sedang | ⚠️ **JANGAN pernah diubah** setelah data ada — provider key tidak bisa di-decode lagi |
| 12 | Deposit manual TnG ambigu | 🟡 Sedang | Q1 (mekanisme reference) |
| 13 | Copy credential dari `packages/db/seed-local.mjs` | 🟡 Rendah | File itu tidak dipakai untuk MY |
| 14 | Volume queue/state/config pipeline MY salah | 🟡 Rendah | Rate MY 6/hari, ramp gradual |
| 15 | Token/account Cloudflare MY tertukar dengan ID | 🔴 Fatal | Secret terpisah, scope minimum, verifikasi account/project/zone sebelum deploy |
| 16 | R2 MY memakai identitas storage ID | 🟠 Tinggi | Putuskan Q4; bila bucket baru, ganti endpoint/bucket/key/public URL MY |
| 17 | Pages project MY salah akun atau salah project | 🟠 Tinggi | Buat/verifikasi project di akun MY; polling deploy memakai kredensial MY |
| 18 | Delegasi NS atau DNS MY salah | 🟠 Tinggi | Delegasikan ke nameserver akun MY; snapshot DNS; jangan sentuh zone ID |

---

## 12. Yang TIDAK Akan Dilakukan Tanpa Izin Eksplisit

- ❌ Deploy ke `app.socio.id`
- ❌ Mengubah cron / pipeline / container `socio.id`
- ❌ Mengubah DNS atau DKIM record yang sudah live
- ❌ Mengubah `SOCIO_PROVIDER_ENC_KEY` yang sudah dipakai data existing
- ❌ Menyalakan promo email ke user socio.id tanpa validasi Fase 5
- ❌ Menyentuh item `AGENTS.md §3` ("Yang TIDAK boleh disentuh")
- ❌ Menghapus folder lama `app.socio.id/`, `socio.id/`
- ❌ Force-push atau merge blind di repo utama

---

## 13. Estimasi

| Fase | Isi | Waktu (agent) |
|---|---|---|
| 0 | Prasyarat | **Blokir user** |
| 1 | Isolasi instance | 1–2 hari kerja |
| 2 | TnG QR | 1 hari |
| 3 | i18n MS/EN (B1–B4) | 3–5 hari |
| 4 | Landing MY (2 locale) | 2–3 hari |
| 5 | Email brand MY | 0,5 hari |
| 6 | Pipeline SEO MY | 2–3 hari |
| 7 | Hardening + launch | 1 hari |
| — | **Total (tanpa B5 admin)** | **~11–16 hari kerja** |
| — | + B5 admin (~1.300 string) | +3–4 hari |

> Angka ini perkiraan kerja agent, bukan kalender. Creative/UX pass tetap butuh review user.

---

## 14. Checklist Pelacakan

### Fase 0 — Prasyarat
- [ ] 0.1 Gambar QR TnG diterima
- [ ] 0.2 Data merchant TnG (nama, nomor, jenis akaun)
- [ ] 0.3 Domain `socio.my` ditambahkan di Resend + 3 DNS record dikirim
- [ ] 0.4 Zona DNS Cloudflare `socio.my` dibuat **di akun MY**
- [ ] 0.4a Account ID + API token Cloudflare MY dibuat dan disimpan terpisah
- [ ] 0.4b Bucket/kredensial R2 MY disiapkan atau pengecualian bucket lama dicatat
- [ ] 0.4c Widget Turnstile MY dibuat untuk semua hostname MY
- [ ] 0.5 Repo `ReqTimeout/socio-my-runner` dibuat
- [ ] 0.5a GitHub PAT khusus repo MY dibuat
- [ ] 0.6 Property GSC `sc-domain:socio.my` dibuat
- [ ] 0.6a Pages project `socio-my` dibuat di akun MY + custom domain terpasang
- [ ] 0.7 Angka bisnis MY disetujui (markup, min/max top up, aktivasi reseller, bonus)
- [ ] 0.8 GA4 + AdSense property MY (atau matikan analytics dulu)
- [ ] 0.9 Nomor WhatsApp MY
- [ ] 0.10 PRIVASI di-review untuk PDPA + halaman `/tos` dibuat

### Keputusan tertunda
- [ ] Q1 Mekanisme pencocokan TnG
- [ ] Q2 Terjemahan admin (B5) sekarang atau ditunda
- [ ] Q3 Repo arrangement (sama vs terpisah)
- [ ] Q4 R2 MY: bucket baru di akun MY atau bucket lama + prefix

### Fase 1 — Isolasi
- [ ] `format.ts` env-driven + 20 duplikat disatukan
- [ ] `packages/ui` dapat currency via `data`
- [ ] `fx.ts` currency-agnostic
- [ ] 26 domain hardcoded diparameterisasi
- [ ] Brand token (`SOCIO_BRAND_*`)
- [ ] Timezone MYT
- [ ] Container MySQL #2 (400 MB) + schema `socio_my` + migrasi + seed
- [ ] Coolify app `app.socio.my` (768 MB)
- [ ] 32 env var diset
- [ ] Kredensial R2 MY lengkap bila Q4 = bucket baru
- [ ] Kredensial Cloudflare ID/MY tidak tercampur di env/file/log
- [ ] `SOCIO_EXPECT_DB_NAME` guard
- [ ] `R2_PREFIX=my/` bila Q4 = bucket lama
- [ ] **Gate Fase 1 hijau**

### Fase 2 — TnG QR
- [ ] Migrasi enum `payment` + `"qr"`
- [ ] `postAmount = amount` (buang sufiks)
- [ ] 1 pending deposit per user
- [ ] Halaman top-up MY (pilihan TnG + instruksi reference)
- [ ] Template email deposit TnG (MS)
- [ ] Admin deposits: kolom reference + approve
- [ ] Env angka bisnis MY
- [ ] **Gate Fase 2 hijau**

### Fase 3 — i18n
- [ ] `packages/core/src/i18n/` (index + ms + en + id)
- [ ] B1: `packages/ui` (~120)
- [ ] B2: `(auth)` (~70)
- [ ] B3: `(app)` (~490)
- [ ] B4: email (~45)
- [ ] Routing `/en` (Traefik atau route group)
- [ ] `<html lang>` + title + currency
- [ ] **Gate Fase 3 hijau**
- [ ] B5: `(admin)` (~1.300) — *setelah Q2*

### Fase 4 — Landing
- [ ] `PUBLIC_SITE_URL` + 45 literal domain
- [ ] `inLanguage` + `priceCurrency` + `availableLanguage`
- [ ] Brand + telepon + WhatsApp
- [ ] `robots.txt` / `_headers` / `llms.txt` / `ads.txt` / `indexnow.txt`
- [ ] `@astrojs/i18n` + hreflang + x-default
- [ ] `sync-content.mjs` + `fix-sitemap.mjs` diparameterisasi
- [ ] 9 halaman inti + 44 money page × 2 locale
- [ ] `/privacy` PDPA + `/tos` baru
- [ ] Pages project `socio-my` di akun MY + custom domain
- [ ] Deploy Pages MY memakai token/account MY
- [ ] `jsonld-validate --strict` lolos
- [ ] `dist/` MY tidak punya literal `socio.id`
- [ ] `dist/` `socio.id` byte-identical
- [ ] **Gate Fase 4 hijau**

### Fase 5 — Email
- [ ] `SOCIO_MAIL_DOMAIN` untuk DKIM (`email.ts:88`)
- [ ] Footer brand token (`render.ts`)
- [ ] `DEFAULT_MARKETING_ADDRESS` → KL
- [ ] Kunci DKIM MY dipasang; kunci ID tidak dipakai untuk MY
- [ ] VAPID key baru
- [ ] Email tes dari `noreply@socio.my` DKIM pass
- [ ] Email tes dari instance ID tetap `noreply@socio.id`
- [ ] Sparko MY 200
- [ ] **Gate Fase 5 hijau**

### Fase 6 — SEO pipeline
- [ ] Repo + container + cron + lock + log terpisah
- [ ] PAT GitHub, env file, token/account Cloudflare, dan IndexNow key MY terpisah
- [ ] 9 file script env-driven
- [ ] `cities.json` MY (72 state Malaysia)
- [ ] `indexnow.txt` key MY
- [ ] GSC MY accept sitemap
- [ ] Rate 6/hari + ramp gate
- [ ] QC gate `0.62/0.48` di-tune korpus MY
- [ ] Cron `socio.id` **terverifikasi tidak terganggu**
- [ ] **Gate Fase 6 hijau**

### Fase 7 — Launch
- [ ] Memory limit terverifikasi
- [ ] Load guard cron MY
- [ ] Rotation `mail.log`
- [ ] Backup DB `socio_my`
- [ ] Regression suite `socio.id` (9 item)
- [ ] Rollback plan terdokumentasi
- [ ] `docs/MY_LAUNCH.md` + update `AGENT_MEMORY.md` + `AGENTS.md`

---

## 15. Lampiran — Audit Referensi

### 15.1 Route app (77 direktori)
```
/                          /logout  /register(301→/daftar)  /verifikasi  /reset
/admin (27 sub-route)      /api-docs  /api/v1  /api/admin/*  /api/auth/[...all]
/api/cron/trigger          /api/notifications  /api/sse  /api/upload
/api/webhook/midtrans      ← SATU-SATUNYA webhook
/affiliate  /akun  /berita  /daftar  /layanan  /login  /lupa-password
/notif  /pesan  /pesan/coupon  /pesan/services  /pesanan  /saldo
/saldo/qr  /saldo/riwayat  /saldo/top-up  /tiket
/dev-admin-login (DEV only, 404 in prod)
```

### 15.2 Cron jobs (10, `app/src/cron/jobs.ts`)
| key | expr | interval | currency-specific? |
|---|---|---|---|
| `provider-sync` | `0 * * * *` | 60 m | tidak |
| `service-catalog` | `chained` | — | tidak |
| `status-poll` | `* * * * *` | 1 m | tidak |
| `refill-poll` | `*/5 * * * *` | 5 m | tidak |
| `auto-refund` | `*/15 * * * *` | 15 m | tidak |
| `email-queue` | `*/5 * * * *` | 5 m | tidak |
| `light` | `*/15 * * * *` | 15 m | tidak |
| `backup` | `0 3 * * *` | 24 j | tidak |
| **`fx-rate`** | `5 0 * * *` | 24 j | **YA — USD→IDR** |
| `reconcile` | `30 4 * * *` | 24 j | tidak |

`SOCIO_CRON_ENABLED === "1"` → `startCron()` di `hooks.server.ts:19-25`.

### 15.3 Env: boleh shared vs wajib berbeda
Sudah diuraikan di §1.8. Total 46 var terbaca; **32 wajib berbeda**, 14 boleh sama.

### 15.4 Hardcoded domain: 26 site app + ~50 site landing
Sudah diuraikan di §1.3 (app) dan §7.2 (landing).

### 15.5 Angka live infra (7 Okt 2026)
| Aset | Nilai |
|---|---|
| RAM | 3,8 GB total / 1,6 GB terpakai / **2,2 GB available** |
| Swap | 2 GB, **1,2 GB terpakai** |
| CPU | 2 vCPU (Intel Xeon E5-2690 v2) |
| Disk | 145 GB, 31 GB terpakai (22%) |
| Container | 16 (app 79 MB, MySQL 258 MB, coolify 156 MB, runner 96 MB, mailserver 91 MB) |
| MySQL | `8.0.46`, DB `socio_smm`, 50 tabel |
| Users | 3.341 · Orders 26.180 · Services 8.477 · Deposits 1.306 · Email queue 25.419 |
| Proxy | Traefik v3.6 (`coolify-proxy`), port 80/443/8080 |
| DB email | 24.085 marketing sudah terkirim |
| Uptime | 13,5 jam (reboot setelah OOM 6 Okt) |

### 15.6 Dokumen terkait yang harus dibaca sebelum eksekusi
1. `AGENTS.md` — aturan mutlak, tech stack, anti-pattern
2. `REBUILD_PLAN.md` §0, §1, §9 — stack & struktur (⚠️ TiDB sudah dibatalkan, MySQL self-hosted)
3. `docs/AGENT_MEMORY.md` §2 (deploy), §3 (verifikasi), §4 (otorisasi), §5 (cron)
4. `docs/SEO_DECISIONS_2026-10-06.md` — volume 144/hari wajib dipertahankan, LLM generate suspended
5. `docs/EMAIL_PROMO_AUTOMATION_PLAN.md` — DMARC strict, PTR blocker
6. `docs/LANDING_DEPLOY.md` — peringatan insiden salah akun Cloudflare dan pola deploy Pages ID; jangan menyalin kredensialnya untuk MY

---

*Dokumen ini dibuat 7 Okt 2026. Status: PLAN, belum ada implementasi. Update setiap kali
fase selesai — tandai `[x]` di §14.*