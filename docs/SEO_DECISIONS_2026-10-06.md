# SEO & EMAIL DECISIONS — 6 Oktober 2026

> **Dokumen keputusan user.** Ini bukan rencana kerja — ini catatan keputusan yang sudah diambil,
> supaya coding agent berikutnya tidak "memperbaiki" hal yang memang disengaja.
>
> Work order eksekusi email: `docs/EMAIL_PROMO_AUTOMATION_PLAN.md`.
> Bila dokumen ini bertentangan dengan `REBUILD_PLAN.md`, **tanya user** — jangan asumsi.

---

## 1. Keputusan yang SUDAH diambil user

### 1.1 Volume publish SEO: **TETAP 144 artikel/hari**

- [x] **PUTUSAN USER:** pertahankan 6 artikel/jam via `/etc/cron.d/seo-publish` → `/usr/local/bin/seo-publish-cycle`.
- Konsekuensi yang **diketahui dan diterima** user:
  - `seo/ramp-gate.mjs` terakhir memutuskan `hold — sample tipis (discovered 4 < min_sample 5)`
    dengan `daily_count: 3`. Artinya cron berjalan **48× lebih cepat** dari rekomendasi gate sendiri.
  - `seo/state.json` → GSC verdict `"URL is unknown to Google"`, `coverageState` belum terindeks.
  - 1.132 artikel berasal dari `seo/blog-expand.mjs` = **template murni tanpa LLM**.
    Risiko yang relevan: *scaled content abuse* (bukan sekadar "konten tipis").

- **Kompensasi wajib (agent tidak boleh menawar):**
  1. Gate `seo/qc-uniqueness.mjs` di `seo/publish.mjs` **tidak boleh di-skip**.
     Flag `--skip-uniqueness` **dilarang dipakai**.
  2. `seo/jsonld-validate.mjs --strict` (`publish.mjs`) tetap jalan.
  3. GSC dipantau **harian**. Kalau muncul *manual action* atau index rate tetap 0 setelah
     14 hari pada volume ini → **STOP publish, laporkan ke user**, jangan lanjut diam-diam.
  4. Agent **dilarang** menurunkan volume sendiri "demi keamanan". Itu keputusan user.
     Yang boleh agent lakukan: **melaporkan** data dan meminta keputusan ulang.

#### Insiden 6 Okt 2026: publish mati total karena karantina gate (SUDAH DIPERBAIKI)

Status `seo-status` menunjukkan `sukses=24 gagal=44` — nol artikel tayang per jam selama
berjam-jam. Penyebabnya **bukan** volume, tapi **deadlock logika di `publish.mjs`**:

```
Gate qc-uniqueness: ✗ beli-followers-tiktok-palembang DITOLAK
                    mirip: beli-followers-tiktok-pontianak (score 0.6215)
                    [1/6] ✗ GAGAL rc=1 ... (ulangi tiap jam, slug sama)
```
- `pickDrafts()` mengambil **persis `count` kandidat teratas**. Gate menolaknya →
  `cleared` kosong → `exit 1`.
- Slug itu tetap `status: 'draft'` dan tetap prioritas teratas → **siklus berikutnya mengulang
  slug yang sama, selamanya.**
- Diperparah: branch `!cleared.length` `return` **sebelum** `writeFileSync(QUEUE_PATH)`,
  jadi tidak ada penanda apa pun yang bisa bertahan antar-siklus.

**Perbaikan (commit `af79481`)** — gate tetap berkuasa, aturannya **tidak** dilonggarkan:
- `pickDrafts()` mengambil pool besar (`count * 12`, min `24`) supaya ada kandidat pengganti.
- Loop gate berhenti setelah `count` artikel lolos (tidak menguji seluruh pool).
- Slug yang ditolak dikarantina 7 hari (`qcBlockedUntil`, `qcBlockedDate`, `qcBlockCount`,
  `qcBlockedReason`) **dan ditulis ke queue** → siklus berikutnya melompatinya tanpa uji ulang.
- Branch "semua terkarantina" menulis queue dulu sebelum `return`.

**Pelajaran untuk agent:** jangan pernah "memperbaiki" gate dengan `--skip-uniqueness` atau
menurunkan ambang `--fail 0.62`. Duplikat **memang** ada di korpus template — itu informasi,
bukan gangguan. Perbaikinya di sisi antrean, bukan di sisi aturan. Artikel terkarantina harus
dirombak (data unik / angle berbeda), bukan di-bypass.

> Catatan: ambang default `--fail 0.62` ditetapkan dari sebaran korpus saat itu. Jika Anda ingin
> menaikkan volume publish, **tanyakan ulang** — karena setiap lowering ambang berarti lebih
> banyak konten mirip yang tayang, dan `ramp-gate` + GSC tetap belum memberi bukti ini aman.

### 1.2 LLM untuk produksi artikel: **DITUNDA**

- [x] **PUTUSAN USER:** skip dulu. 1.132 artikel template dianggap cukup.
- Status kode (sudah jadi, hanya tidak tersambung):
  - `seo/generate.mjs` + `seo/prompts.ts` (471 baris: `SYSTEM_PROMPT`, `buildUserPrompt`,
    `buildPartPrompt` mode-split untuk model gratis, `parseOutput`, `assembleMdx`,
    `validateMdx`, `deriveMeta`) — **lengkap dan siap pakai**.
  - `seo/blog-expand.mjs` mencatat alasan template dipakai: LLM ~4 menit/artikel,
    success rate 58% di model gratis, 999 antrean ≈ 5 hari.
- Kondisi produksi saat ini (jangan diubah):
  - `SEO_SKIP_GENERATE=1` di `/etc/seo-runner/env`
  - **Tidak ada** `GROQ_API_KEY` / key LLM apa pun di env runner (terverifikasi: 0 key)
- **Catatan:** `seo/llms.mjs` **bukan** LLM. Itu generator `public/llms.txt` + `llms-full.txt`
  untuk AI crawler (0 panggilan AI). Jangan tertukar.
- Bila nanti diaktifkan: pasang key LLM di `/etc/seo-runner/env`, hapus `SEO_SKIP_GENERATE`,
  dan pastikan `runner/daily.mjs` terjadwal (lihat 1.4).

### 1.3 Infra email marketing: **SMTP VPS sendiri (budget $0)**

- [x] **PUTUSAN USER:** perbaiki SMTP VPS sendiri, **bukan** membeli Resend Audiences ($40/bln)
      dan **bukan** AWS SES.
- Blocker keras: **PTR / reverse DNS** — lihat `EMAIL_PROMO_AUTOMATION_PLAN.md` Task 0.1.
  - PTR **tidak bisa** diubah lewat SSH, Coolify, atau Cloudflare. Hanya TNA Hosting.
  - Kondisi sekarang: `130.254.47.93` → `static.130.254.47.93.hostname.com` (salah),
    `2607:adc0:5::215` → `static.2607:adc0:5::215.hostname.com` (salah).
  - Target: keduanya → `mta1.socio.id`.
- Yang sudah mendukung: **port 25 outbound ke Gmail TERBUKA** ✅, DKIM `mail._domainkey` ada ✅,
  DMARC `p=reject` ✅, `docker-mailserver:14` jalan ✅.
- Kalau PTR ditolak TNA Hosting → **jangan memaksa**. Kembali ke user dengan 3 alternatif
  yang tercatat di Fase 0 dokumen work order.
- **Transaksional tetap via Resend** sampai Fase 0 stabil ≥ 2 minggu. Jangan flip global
  (alasan: insiden Sep-2026, email verifikasi & reset password user hilang tanpa kabar).

### 1.4 `runner/daily.mjs` & `weekly.mjs`: **DIPUTUSKAN — OPSI A** ✅ 6 Okt 2026

**Keputusan: opsi A** — jadwalkan `daily.mjs` sebagai **pengukur saja**, `SEO_SKIP_PUBLISH=1` +
`SEO_SKIP_GENERATE=1` dipertahankan. Volume publish **tidak berubah** (tetap 6/jam via
`seo-publish-cycle`, sesuai keputusan 1.1), tapi rantai pengukuran menjadi hidup.

Dipasang di server:
```
/etc/cron.d/seo-measure
  20  6 * * *   root /usr/local/bin/seo-measure-cycle    # harian 06:20 WIB
  30  7 * * 1   root /usr/local/bin/seo-week-cycle       # Senin 07:30 WIB
/var/log/seo-measure.log
```
`seo-measure-cycle` pakai `flock` (anti dobel-run) + `timeout 900`, jadi tidak akan menumpuk
kalau siklus sebelumnya masih jalan.

> ⚠️ **STATUS 6 Okt 2026 ~15:05 UTC — SEMUA CRON SEO DIMATIKAN SEMENTARA.**
> Insiden OOM (lihat §1.6). File cron dipindah ke `/root/seo-publish.DISABLED` dan
> `/root/seo-measure.DISABLED`. Jangan aktifkan lagi sebelum arsitektur build diperbaiki (§1.6).

**Hasil uji manual pertama (12:32 UTC / 19:32 WIB, rc=0):**
```
env      : GSC=ada · BING=ada · INDEXNOW=ada
GSC DOCTOR — site: sc-domain:socio.id
  [ OK ] creds loaded — beriklanagency@project-e899f4b3-….iam.gserviceaccount.com
  [ OK ] token exchange — private key valid, SA aktif
  [ OK ] GSC sites.list — SA punya akses: sc-domain:socio.id
indexnow · dilewati: tidak ada URL baru
bing     · OK (exit 0) — kuota hari ini 100/100
gsc      · OK (exit 0)
remedy   · OK (exit 0) — 37 URL: sehat 0 · perlu tindakan 0 · menunggu 5 · unknown 32
SEO_SKIP_GENERATE=1 — tahap generate dilewati
SEO_SKIP_PUBLISH=1  — tahap publish dilewati
[daily] exit 0
```
Artinya: indexer → bing → gsc-inspect → remedy → ramp-gate **jalan**, publish **tetap** di cron 6/jam.
`notify` masih hanya log (`RESEND_API_KEY` tidak ada di env runner) — lihat 1.5.

**Catatan baseline yang baru terlihat:** `unknown 32` dari 37 URL published. Itu artinya
sebagian besar URL published **belum pernah diinspeksi** GSC (kuota URL Inspection 2.000/hari,
hanya 37 yang submitted). Selama `unknown` masih 32, `index_rate` = n/a dan `ramp-gate` **tidak
pernah bisa naik** dari `daily_count: 3`. Ini yang membuat keputusan 1.1 berjalan tanpa pengukuran
sebenarnya — sekarang sudah terukur, tapi butuh waktu supaya URL selesai diinspeksi.

---

## 1.5 `RESEND_API_KEY` di env runner — belum ada

`daily.mjs` tahap 4 (`runner/lib/notify.mjs`) butuh `RESEND_API_KEY` + `NOTIFY_EMAIL_TO`, tapi
keduanya **tidak ada** di `/etc/seo-runner/env` → notifikasi harian hanya tercetak di log server.
Tidak reinstall apa pun; hanya relevan kalau Anda mau laporan harian masuk email.
Status saat ini: masih log (bukan error).

---

## 1.6 INSIDEN 6 Okt 2026: server OOM — build Astro di dalam container MEMBUNUH VPS

**Gejala:** `app.socio.id` HTTP 000 (mati total), SSH `Connection timed out during banner exchange`
(sshd pun tak bisa fork), semua port VPS tak menjawab. User reboot via panel TNA, server tetap
wedged sampai proses build selesai/mati.

**Penyebab (kesalahan arsitektur, diakui):**
- VPS hanya punya **3.9 GB RAM** (`free -m`, terverifikasi).
- `seo-publish-cycle` (cron yang dipasang sesi ini) menjalankan `publish.mjs --count=1` **6×/jam**
  (GAP=300), dan **setiap run = full `pnpm --filter landing build` 1.132 artikel Astro +
  `wrangler pages deploy` di dalam container runner**.
- Ditambah test build manual yang menumpuk. RAM habis → OOM → semua container kelaparan,
  termasuk app `nqsjafrei6k8dkup1pxkcuwf` dan sshd.

**Yang TIDAK terjadi:** container app **tidak pernah** di-stop/restart/exec oleh agent manapun
sesi ini. `docker inspect` pasca-reboot: `restarts=0`, start murni karena reboot. App mati karena
kelaparan resource, bukan karena diubah. (Bukti tercatat; verifikasi ulang bila perlu.)

**Tindakan recovery (sudah dilakukan):**
1. Semua proses build di-kill (`astro build`, `vite`, `wrangler pages deploy`, `publish.mjs`).
2. `/etc/cron.d/seo-publish` → `/root/seo-publish.DISABLED`.
3. `/etc/cron.d/seo-measure` → `/root/seo-measure.DISABLED` (ikut dimatikan agar server istirahat total).
4. Verifikasi: tidak ada sisa proses build, `app.socio.id` → **303 dalam <1 detik**, `socio.id` → 200.

**Keputusan arsitektur yang harus diambil user (JANGAN coding dulu):**
- User benar: **jangan build di dalam container** — MDX di dalam image container adalah snapshot
  basi yang divergen dari git (terbukti: main repo 927 artikel vs runner repo 1.132, 205 artikel
  hanya ada di runner, file yang sama pun isinya beda).
- Pipeline yang benar: **runner di VPS hanya kelola queue/state + commit-push MDX ke git**,
  **Cloudflare Pages yang build dari git** (git integration atau GitHub Action, sesuai
  `docs/LANDING_DEPLOY.md` baris 96).
- Sampai user memutuskan: **TIDAK ADA publish/build/deploy SEO yang jalan.** Queue 48 published /
  149 pending / 880 draft dibekukan apa adanya. Menyalakan cron lagi tanpa ganti arsitektur =
  mengulang insiden ini.

#### Update 6 Okt 2026 (sore): alur GIT-BASED sudah ditulis — commit `40f289f`

- Fakta yang mengubah pilihan: Pages project `socio-id` punya `source: {}` =
  **tidak git-connected**, selama ini murni direct-upload `wrangler pages deploy`
  dari dalam container. Itu yang diganti.
- User menolak GitHub Actions → jalur yang dipakai: **Pages Git integration**
  (tanpa secrets di GitHub, tanpa menit Actions; build di infra Cloudflare).
- File baru di repo runner (sudah commit + push `40f289f`):
  - `seo/publish-git.mjs` — pull → pool+gate+karantina → flip → mesh → llms-mdx →
    commit+push (token via `http.extraHeader`, tidak di URL/config) → poll Pages API
    sampai deploy sukses → verifikasi URL → jsonld-live (warn-only) → indexnow.
  - `seo/llms-mdx.mjs` — llms.txt dari frontmatter MDX (regex, tanpa js-yaml/dist).
  - `seo/jsonld-live.mjs` — validasi JSON-LD dari HTML live (teruji ke 1 URL live).
  - `seo/runner-start.sh` — clone/pull ke `/app/data/repo` (volume), 4 langkah lama
    jalan di clone via `SEO_CONTENT_DIR`. Token dicabut dari remote setelah clone.
  - `Dockerfile` (+git), root `package.json` (pin `packageManager pnpm@9.15.9`).
- Terverifikasi sebelum ditulis ke dokumen ini:
  - Kode landing **identik** main vs runner (src/, public/, config SAMA) — divergensi
    hanya konten blog. Tidak perlu rekonsiliasi kode.
  - Root `pnpm install --frozen-lockfile` **sukses tanpa dir `app/`** (diuji nyata di /tmp).
  - `sync-content.mjs` tanpa `SEO_CONTENT_DIR` = no-op (aman di Pages).
  - Landing butuh `@socio/ui: workspace:*` dan `packages/ui` **ada** di runner repo.
- Batch: `--count=24`, cron tiap 4 jam → maks 144/hari, **6 build Pages/hari ≈ 180/bln**
  (di bawah kuota free 500/bln). VPS: hanya git + curl, nol build.
- **Menunggu aksi user (2 hal, lihat §1.7).** Sampai itu tiba: cron tetap OFF, queue beku.

---

## 2. Fakta produksi saat ini (snapshot 6 Okt 2026, terverifikasi)

### SEO
```
Container runner : c9iqug5vvi9kjywt1fn6xnsc-135758379657  (Up)
Total artikel    : 1.132 MDX
Live (draft:false): 36–37
Queue            : {"published":36,"pending":149,"draft":892}
Cron aktif       : /etc/cron.d/seo-publish → "7 * * * * root /usr/local/bin/seo-publish-cycle"
Loop             : 6 artikel/siklus, flock, GAP=300, TMO=480, log /var/log/seo-publish.log
Monitoring       : bash /usr/local/bin/seo-status
Volume state.json: 5 published (lokal, belum sinkron penuh) — migrate-state menyatukan saat start
GSC              : "URL is unknown to Google"
ramp-gate        : hold, daily_count=3, discovered 4 < min_sample 5
```

### Yang baru diperbaiki sesi ini
- `seo/fill-related.mjs` — mengisi frontmatter `related:` (internal link + seksi "Lanjut baca ini")
- `seo/runner-start.sh` sekarang **4 langkah** berurutan:
  1. `restore-published.mjs` 2. `heal-queue.mjs` 3. `fill-related.mjs` 4. `migrate-state.mjs`
- Hasil: **1.130 / 1.132 artikel punya `related` ≥ 3** (2 sisanya genuinely tanpa pasangan),
  0 frontmatter rusak, idempoten (run kedua = 0 artikel diproses)
- Bug yang diperbaiki di `fill-related.mjs`:
  - `relatedCount` menghitung **tanda hubung** di slug, bukan jumlah item
    (`relatedRaw.match(/-/g).length`) → artikel ber-2 item dilaporkan punya 6 → tidak pernah dilengkapi
  - filter target hanya `=== 0`, sehingga yang terisi 1–2 item tidak dilengkapi (perlu `< 3`)
  - penulisan menimpa blok lama → sekarang **merge** existing ∪ baru, capped 3

### Email / user
```
DB container : rebicrj57r3afbg9knieq9ks (mysql:8.0) → database socio_smm
App container: nqsjafrei6k8dkup1pxkcuwf-122951474254 (RESEND_API_KEY ✅, SMTP_HOST=mail.socio.id)
users        : 3.338 (verified 1.896) · Member 3.063 · Reseller 270 · Agen 3 · Admin 2
email_queue  : 25.302 baris, SEMUA 'sent' (24.085 marketing)
email_campaigns: 0 (fitur campaign belum pernah dipakai)
mailing_list : 0
Cap kirim    : marketing 10/run, Gmail 5/run, cron tiap 5 menit → 120 marketing/jam, 60 Gmail/jam
Estimasi     : blast 3.338 user ≈ 28 jam · blast 1.896 verified ≈ 16 jam
```

---

## 3. Yang TIDAK boleh disentuh

- `app.socio.id` — aplikasi produksi. Perubahan hanya lewat jalur deploy manual Coolify
  (`POST /api/v1/deploy`, prosedur di `docs/AGENT_MEMORY.md` §2).
  **Push ke `main` TIDAK me-rebuild app** (`is_webhook = 0`).
- Proyek lain di VPS yang sama: `xeamhqvjpz9x3dwzvguxbyz6` (sgb.beriklan.co.id),
  `/opt/seo-pipeline`, `igsbaxpsvuhopghoutiit2kk`, `searxng`, semua container `coolify*`.
- Folder lama `app.socio.id/` dan `socio.id/` — referensi saja (AGENTS.md §0.6, §0.8).
- DMARC `p=reject` — jangan dilonggarkan.
- Gate `qc-uniqueness` dan `jsonld-validate` di `publish.mjs`.

---

## 4. Koreksi dokumentasi

### 4.1 ✅ SELESAI — `AGENTS.md` §2 baris "App"

Sudah dikoreksi 6 Okt 2026:
> **App**: SvelteKit + adapter-node + Tailwind v4 → VPS **TNA Hosting** (130.254.47.93) + Coolify.
> **Bukan Hostinger** — jangan cari solusi lewat Hostinger API/MCP (itu shared hosting, tidak punya
> operasi VPS/PTR). Reverse DNS/PTR hanya bisa diubah lewat TNA Hosting.

Sekalian menambah peringatan di `AGENTS.md` §0.13 bahwa **Hostinger API/MCP yang tersedia di
environment tidak relevan** untuk VPS ini — environment punya MCP itu, jadi agent bisa salah
coba seperti yang terjadi sesi ini.

### 4.2 ⬜ TODO — `docs/AGENT_MEMORY.md` §6

Baris yang menyebut path `/opt/mailu/scripts/mail-server/` **path-nya benar** (mount container
`mailserver` memang di sana) tapi image-nya `mailserver/docker-mailserver:14`, bukan Mailu.
Perjelas supaya agent tidak salah mengira sudah install Mailu (yang punya OpenDKIM built-in).

Detail lain yang perlu ditambahkan di §6:
- Fase 0 deliverability (PTR via TNA Hosting) → status dan target `mta1.socio.id`
- Tabel `email_suppressions` + rute unsubscribe + preference center (fase 1 work order)
- Pitfall baru: deadlock `publish.mjs` (lihat §1.1) — **jangan** "diperbaiki" dengan `--skip-uniqueness`
- Catatan karakter CJK: beberapa file pernah mengandungi karakter asing hasil proses edit.
  Sebelum commit, jalankan scan (regex `[\u4e00-\u9fff\u3040-\u30ff\u0400-\u04ff]`) di `seo/` dan `runner/`.

### 4.3 ⬜ TODO — `docs/SEO_PIPELINE_PROGRESS.md`

Masih menyebut:
- VPS lama `43.157.204.17` (Tencent Lighthouse Jakarta) DOWN — sudah tidak relevan, VPS sekarang `130.254.47.93`.
- DB sebagai "MySQL 8.0 docker `socio-db`" — nama container sebenarnya
  `rebicrj57r3afbg9knieq9ks`, database `socio_smm`.
- Branch lokal `main` "21+ commits ahead remote (belum push)" — sudah tidak berlaku, repo utama
  dan repo runner (`socio-seo-runner`) sudah punya remote `github.com/ReqTimeout/socio-seo-runner`.

---

## 1.7 AKSI USER — 2 hal sebelum pipeline git-based bisa jalan (6 Okt 2026 sore)

**A. Token GitHub untuk VPS (sudah disetujui user: "Buatkan PAT sekarang")**
- Buat di GitHub → Settings → Developer settings → Personal access tokens →
  **Fine-grained tokens** → Generate new token:
  - Repository access: **Only select repositories** → `ReqTimeout/socio-seo-runner`
  - Permissions → Contents: **Read and write**
  - Expiration: 90 hari
- Kirim tokennya ke agent (disimpan di `/etc/seo-runner/env` sebagai `GITHUB_TOKEN`,
  tidak pernah di-print ke log/layar). Tanpa ini VPS tidak bisa clone/push (repo private).

**B. Konek Pages ke GitHub (dashboard Cloudflare, ±2 menit, tanpa secrets)**
- ⚠️ **Verifikasi project (6 Okt 2026, via API — bukan asumsi):**
  akun `0298214d…` ✅, project **`socio-id`** melayani custom domain
  `['socio-id.pages.dev', 'socio.id', 'www.socio.id']` ✅, production branch `main` ✅,
  deploy terakhir sukses.
  Project duplikat `socio-id-er2` dulu ada di **akun yang salah** — jangan sentuh itu.
  Selalu cek `domains` memuat `socio.id` sebelum mengubah project apa pun.
- Cloudflare dashboard → Workers & Pages → project **`socio-id`** → Settings →
  Builds & deployments → **Connect to Git** → pilih repo `ReqTimeout/socio-seo-runner`,
  branch production `main`.
- Build configuration (isi persis):
  - Framework preset: **Astro**
  - Root directory: *(kosong = repo root)*
  - Build command: `pnpm --filter landing build`
  - Build output directory: `landing/dist`
- Environment variables (Production — tambahkan, ketiganya BUKAN secret):
  - `NODE_VERSION` = `22`
  - `PUBLIC_ADSENSE_CLIENT` = `ca-pub-4438184351486735` (dari ads.txt live)
  - `PUBLIC_GA4_ID` = `G-MDJCW053XR` (dari HTML live)
- `accountcf.md` (23 baris, di root repo) TIDAK berisi ketiga nilai di atas — jangan cari di sana.
  Nilai AdSense/GA4 diambil dari situs live (keduanya ID publik).
- Build pertama akan jalan otomatis setelah konek (dari commit `40f289f`). Pantau sampai hijau.

**Setelah A + B beres**, agent akan (tanpa build di VPS):
1. Clone repo ke `/app/data/repo`, pasang `runner-start.sh` baru ke container (`docker cp`, ringan).
2. Pasang cron ringan baru (`seo-publish-git-cycle`, tiap 4 jam, `--count=24`) + aktifkan lagi
   `seo-measure` (indexer API-only, ringan).
3. Uji 1 artikel end-to-end: push → Pages build → live → IndexNow.
4. Verifikasi server tetap ringan + app.socio.id 303.

#### Insiden 6 Okt 2026 (sore): deploy git pertama 404 — build command kosong + rollback

- Setelah user konek GitHub, Pages langsung build commit `fdb0c71` → sukses (`8dcd9c58`).
- TAPI build log: **"No build command specified. Skipping build step."** — user konek repo
  tanpa mengisi build command. Pages meng-upload 1.356 file repo MENTAH (mdx, mjs, json).
- Akibat: semua URL fresh = **404** (yang 200 sebelumnya hanya cache edge lama).
- Perbaikan: **rollback via API** ke deploy sehat `8c97ab47` (direct-upload 05:39, 48 artikel
  + related) — `POST .../deployments/8c97ab47/rollback` → sukses. Situs kembali 200.
- Pelajaran: JANGAN anggap "konek Git" = selesai. Build command + env WAJIB diisi
  (lihat §1.7-B). Verifikasi SELALU dengan cache-buster (`?v=...`), bukan URL polos.

#### Update 6 Okt 2026 (malam): pipeline git-based LIVE — publish pertama sukses

- PAT kedua valid (read+write). Clone `/app/data/repo` di server (1.132 MDX).
- `runner-start.sh` baru terpasang di container. 4 langkah jalan di clone.
- Uji end-to-end 1 artikel (`beli-followers-instagram-jakarta`):
  push `e2fd551` → Pages build `b3cf9e48` sukses → URL 200 (90KB) →
  JSON-LD 5 blok valid → IndexNow 200, state updated.
- Cron aktif: `seo-publish-git` (`7 */4 * * *`, batch 24 = maks 144/hari, ~180 build/bln)
  + `seo-measure` (indexer API-only). Cron lama tetap OFF permanen.
- Server: load ~2 turun terus, app.socio.id 303 <1s.

#### ⚠️ TOKEN PAT BOCOR — WAJIB ROTASI

- Saat debug, pesan error git mencetak `AUTHORIZATION: basic <base64>` yang isinya
  `x-access-token:PAT` (mudah di-decode). Token yang bocor = PAT kedua.
- Kode sudah diperbaiki (safeErr menyaring bentuk base64 + execFile array).
- TAPI token yang terlanjur bocor HARUS diganti: revoke di GitHub → kirim PAT baru →
  agent ganti di `/etc/seo-runner/env` + recreate container + verifikasi.
- Sampai rotasi selesai, risiko terbatas (fine-grained, hanya Contents read+write
  di 1 repo), tapi JANGAN ditunda.

#### Rotasi PAT SELESAI + cron otonom terbukti jalan sendiri (6 Okt 2026 malam)

- PAT baru diterima, hash cocok (`a6d75288c555faba`), disimpan di `/etc/seo-runner/env`
  (chmod 600), container recreate, git reinstall, runner-start dipasang ulang.
- Verifikasi baca+tulis OK tanpa bocor token ke log.
- **Cron `seo-publish-git` jalan otonom pertama:** push `f08ca17` (24 artikel) →
  Pages deploy `485341a8` sukses → "Done: 24 artikel live via git", rc=0.
  Spot-check 2 URL: 200. Server load ~2.5, app.socio.id 303.
- Sisa: pastikan PAT LAMA sudah di-revoke di GitHub (tugas user, 1 klik).

#### Hardening pasca-insiden (6 Okt 2026 malam) — agar mustahil terulang

1. `seo/publish.mjs` (lama) sekarang **menolak jalan di dalam container**
   (deteksi `/.dockerenv`, exit 1). Override darurat `SEO_ALLOW_LOCAL_BUILD=1`
   butuh persetujuan user. Commit `e0fe6b1`, ter-copy ke container aktif.
2. `seo-publish-git-cycle` punya **load guard**: skip bila load ≥8 atau RAM
   tersedia <700MB (app.socio.id prioritas). Tercatat di log tiap skip.
3. Cron lama (`seo-publish`, 6x/jam build) tetap OFF permanen di `/root/*.DISABLED`.
