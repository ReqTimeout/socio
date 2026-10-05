# Runbook: menyalakan engine SEO otomatis

> Ditulis 4 Okt 2026, diperbarui 5 Okt 2026. Menjawab: "generate artikel semua keyword → set draft → publish harian sesuai kuota GSC, otomatis."
>
> **Status: LIVE.** Indexer + publish keduanya jalan di produksi. Publish berjalan
> 1 artikel/jam lewat task `seo-publish-hourly`. Tidak ada LLM di loop — artikel
> dibuat dari template (`blog-expand.mjs`), nol kuota.
>
> Baca juga: §9 (jebakan container/AppleDouble), §10 (bug persistensi state),
> §11 (slot AdSense yang masih kosong), §12 (cara deploy image — selalu manual).
>
> Catatan: §1–§8 ditulis saat sistem belum live; baris "belum" di sana sudah
> usang. §9–§12 yang otoritatif.

## 1. Yang sudah berjalan vs yang belum

| Tahap | Script | Status |
|---|---|---|
| Lock anti double-run | `runner/lib/lock.mjs` | ✅ jalan |
| Indexer: IndexNow → Bing → GSC → remedy → ramp-gate | `seo/indexer.mjs` | ✅ jalan tiap hari |
| **Generate draft baru** | `seo/generate.mjs` | ✅ **baru disambung 4 Okt** |
| **Publish draft sesuai kuota** | `seo/publish.mjs` | ✅ **baru disambung 4 Okt** |
| Laporan email harian | `runner/lib/notify.mjs` | ✅ jalan |
| Freshness loop mingguan | `runner/weekly.mjs` | ❌ masih no-op (§6.2) |

## 2. Kenapa publish dulu tidak bisa jalan

Bukan karena lupa. Dua sebab nyata:

1. **Image runner tidak punya `landing/`.** `runner/Dockerfile` lama hanya menyalin
   `package.json`, `seo/`, `runner/`. Tanpa source Astro, mustahil build. Karena itu
   `daily.mjs` menulis `publish: belum aktif — no-op eksplisit`.
2. **Token Cloudflare tidak ada di env.** Token sebenarnya ada di `accountcf.md`.

Keduanya sudah diperbaiki. Alternatif "Pages ← GitHub" **ditolak** karena
proyek `socio-id` berstatus Direct Upload dan Cloudflare tidak mengizinkan
mengubah `source` proyek yang ada — harus buat proyek baru + pindahkan domain
`socio.id` yang sedang live. Memperbesar runner ternyata tanpa langkah browser sama sekali.

## 3. Env yang wajib diisi di Coolify

Runner membaca env sendiri (tidak memuat `.env` repo). Isi di
**Coolify → project `socio-seo` → environment**.

| Env | Wajib | Cara mendapatkannya |
|---|---|---|
| `GROQ_API_KEY` | ✅ | console.groq.com — buat artikel. Tanpa ini tahap generate dilewati |
| `CLOUDFLARE_API_TOKEN` | ✅ | `accountcf.md` (token `cfat_…`) |
| `CLOUDFLARE_ACCOUNT_ID` | ✅ | `accountcf.md` (`0298214d…`) |
| `GSC_SERVICE_ACCOUNT_JSON` | ✅ | isi JSON SA `beriklanagency@project-e899f4b3-…` sebagai **satu baris** dengan `\n` di newline |
| `GSC_SITE_URL` | ✅ | `sc-domain:socio.id` (WAJIB domain property — URL prefix dapat 403) |
| `GSC_SITEMAP_URL` | ✅ | `https://socio.id/sitemap-index.xml` |
| `BING_API_KEY` | ✅ | Bing Webmaster Tools |
| `RESEND_API_KEY` | 🟡 | laporan email; kosong = hanya log |
| `NOTIFY_EMAIL_TO` | 🟡 | alamat tujuan laporan |
| `NOTIFY_EMAIL_FROM` | 🟡 | pengirim (Resend domain terverifikasi) |
| `PUBLIC_GA4_ID` | ✅ | `G-MDJCW053XR` — build landing butuh ini |
| `SEO_SKIP_PUBLISH` | — | `1` = uji dulu tanpa deploy |
| `SEO_SKIP_GENERATE` | — | `1` = matikan tahap generate |

> `GSC_SERVICE_ACCOUNT_JSON` harus **satu baris**. Cara aman:
> `jq -c . <sa.json>` lalu tempel. Jangan salin private key ke mana pun yang ter-commit.

## 3b. MODAL MINIMAL: indexer saja (tanpa publish)

Kalau tujuan pertama "indexer jalan", tidak perlu CLOUDFLARE_API_TOKEN sama sekali.
`runner/daily.mjs` punya env untuk mematikan tahap individual:

| Env | Efek |
|---|---|
| `SEO_SKIP_PUBLISH=1` | indexer jalan, publish tidak |
| `SEO_SKIP_GENERATE=1` | indexer jalan, generate tidak (hemat kuota Groq) |

**Env minimum untuk indexer saja — 2 variabel:**

```
GSC_SERVICE_ACCOUNT_JSON=<JSON SA satu baris>
GSC_SITE_URL=sc-domain:socio.id
BING_API_KEY=<dari Bing Webmaster Tools>
```

`GSC_SERVICE_ACCOUNT_JSON` WAJIB diisi di Coolify. Di lokal boleh pakai
`GSC_SA_FILE=/path/ke/sa.json` (yang sekarang dipakai). Cara safely ambil JSON
satu baris: `jq -c . <sa.json>`

Dengan 3 env di atas + `SEO_SKIP_PUBLISH=1` + `SEO_SKIP_GENERATE=1`, pipeline
menjadi 100% read-only terhadap website: hanya submit URL ke mesin pencari +
mengukur di GSC + menulis `state.json`. Tidak menyentuh `app.socio.id`, tidak
butuh Cloudflare, tidak boros token LLM.

**Terbukti jalan 5 Okt** (run lokal, 0 error):
`indexnow 0 ping (5 URL sudah pernah dikirim) · bing OK · gsc OK · remedy OK ·
ramp OK — index_rate 0.0% (0 indexed / 4 discovered), daily_count 3 (hold,
sample tipis: discovered 4 < min_sample 5)`

## 4. Menjadwalkan

Container memakai `CMD node runner/idle.mjs` (bukan pipeline) supaya Coolify tidak
meng-restart container yang exit. Pipa dijalankan lewat **Scheduled Task**:

```
Command : node runner/daily.mjs
Schedule: 06:00 Asia/Jakarta   (setiap hari)
```

Tahap yang dijalankan: indexer → generate → publish → laporan email.

## 5. Urutan penyalaan yang aman (jangan loncat)

1. Deploy image baru dulu, **tanpa** scheduled task. Pastikan container jalan.
2. Uji manual di dalam container, publish dimatikan dulu:
   ```
   docker exec -it <container> node seo/check-article.mjs <slug>
   docker exec -it <container> node runner/daily.mjs     # dengan SEO_SKIP_PUBLISH=1
   ```
3. Deploy produksi pertama secara manual, satu artikel:
   ```
   docker exec -it <container> node seo/publish.mjs --count=1
   ```
   Cek `https://socio.id` sudah muncul artikelnya.
4. Baru pasang scheduled task.

## 6. Cara kuota publish diputuskan

Tidak ada angka hardcode. `seo/ramp-gate.mjs` membaca `index_rate` dari GSC lalu
menulis `daily_count` di `seo/config.json` (persistent di volume `/app/data`):

| index_rate | daily_count |
|---|---|
| ≥ 85% | `+2` (batas `daily_count_max`, default 10) |
| 70–85% | hold |
| < 70% | `−1` (batas `daily_count_min`, default 1) + alert |
| `discovery_gap` ≥ 50% | hold + alert |
| `halt: true` | `0` — publish berhenti total, perlu reset manual |

**Status sekarang: `index_rate = 0%`** (0 dari 5 URL terindeks, GSC diukur 4 Okt),
jadi `daily_count = 3`. Selama indeksasi tidak membaik, kuota publish **turun
sendiri** — itu perilaku yang benar, bukan bug. Jangan naikkan manual kecuali
sengaja menambah beban crawl.

Override manual: `node seo/ramp-gate.mjs --set 5`.

## 7. Kalau publish mendadak tidak jalan

Pesan dan artinya:

| Pesan | Arti |solusi |
|---|---|---|
| `GROQ_API_KEY tidak ada → tahap generate dilewati` | env belum diisi | isi `GROQ_API_KEY` |
| `CLOUDFLARE_API_TOKEN / ACCOUNT_ID belum di-set` | env belum diisi | isi keduanya |
| `indexer gagal → publish TIDAK dijalankan` | fail-closed | cek `indexer=` di laporan email, perbaiki itu dulu |
| `config.halt=true` | ramp-gate menghentikan | `node seo/ramp-gate.mjs --set N` |
| `Tidak ada draft siap publish` | buffer draft habis | tunggu tahap generate, atau `--count` turunkan |
| `✗ <slug> DITOLAK — mirip: …` | gate anti-scaled-content | normal, itu gate §9 yang bekerja |

## 8. Yang sengaja TIDAK ikut otomatis

- **Freshness loop** (`weekly.mjs`) masih mencatat dirinya sendiri sebagai no-op —
  belum ada yang menulis ulang artikel basi. Lihat plan §6.2.
- **Publish tidak pernah jalan kalau indexer gagal** (fail-closed). Ini disengaja.
- **Tidak ada auto-push ke GitHub.** Artikel terbit lewat Cloudflare Pages deploy
  langsung, bukan lewat commit. `app.socio.id` tidak tersentuh sama sekali.


---

## 9. STATUS 5 Okt 2026 — LIVE (indexer + publish keduanya jalan)

### Yang aktif
| Komponen | Status |
|---|---|
| Container `socio-seo-runner` | Up, restart policy `unless-stopped` |
| Image | 927 mdx · publish.mjs OK · astro OK · wrangler OK · pnpm 9.15.9 |
| `state.json` | persist di volume `/data/coolify/.../data` |
| Scheduled Task | `seo-daily-index` (`23 * * * *`), `seo-weekly` (`2 2 * * 1`) |
| Watchdog | `/usr/local/bin/seo-watchdog`, crontab tiap 10 menit |
| Env | GSC + Bing + CLOUDFLARE terisi. `GROQ_API_KEY` **kosong** → generate LLM nonaktif (hemat kuota) |

Pipeline `runner/daily.mjs`: lock → indexer (5 tahap) → generate (skip) → publish
(`--count=daily_count`) → laporan. Fail-closed: indexer gagal → publish tidak jalan.

**Bukti publish berhasil 5 Okt:** 3 artikel live sekaligus
(`cara-kerja-smm-panel`, `smm-panel-gratis-ada-gak`, `smm-panel-gratis`) —
`wrangler pages deploy` sukses, IndexNow `200 OK`, `exit 0`, `app.socio.id` HTTP 303
tidak tersentuh.

### Tiga jebakan yang ditemukan (dan perbaikannya)
1. **Runner dibangun dari repo TERPISAH.** App Coolify #5 clone dari
   `ReqTimeout/socio-seo-runner.git`, bukan repo `socio`. Push ke `socio` TIDAK
   akan rebuild runner — harus push ke repo runner juga.
2. **`cp -R src/seo ./seo` membuat nested `seo/seo/`.** Akibatnya image hanya berisi
   11 file (indexer, gsc, bing, ramp, remedy, indexnow). `publish.mjs`,
   `queue.json`, `generate.mjs`, `check-article.mjs`, `blog-expand.mjs`,
   `fix-sitemap.mjs` semua hilang. Indexer tetap jalan (butuh 11 itu), publish mustahil.
   Sekarang 26 file `.mjs`.
3. **File AppleDouble (`._*`) merusak `mesh-build.mjs`.** File ini dibuat macOS saat
   copy; `mesh-build` menghitung pagar `---` dan dapat 0 → fatal, publish terhenti
   sebelum build. Di-exclude di `.dockerignore` + `.gitignore`, dan tar pakai
   `--no-xattrs`.

### Risiko tersisa (jujur)
- **Coolify tidak tahu image baru.** `applications.status` = `exited` karena
  container dikelola manual. Kalau Coolify melakukan recreate, ia akan memakai image
  lamanya (tanpa `landing/`). **Watchdog menutup ini**: tiap 10 menit ia cek
  container hidup + `publish.mjs` ada; kalau tidak, recreate dengan image baru.
  Rollback: image lama tersimpan sebagai `ssoe-old:backup`.
- **Coolify build tidak bisa dipicu lewat API** (queue worker `deployments` tidak ada;
  `POST /api/v1/deploy` diam-diam gagal). Image dibangun langsung dengan `docker build`
  lalu dikirim lewat `scp`. Kalau mau image baru di masa depan: ulangi pola ini.
- **Kuota publish 3/hari.** 918 draft tersisa ≈ 306 hari. `ramp-gate` menaikkan
  otomatis ke `daily_count_max=10` bila `index_rate` ≥ 85%, menurunkannya bila < 70%.
  Saat ini `index_rate` 0% (5 URL, 4 `not_discovered` + 1 belum ketemu) dengan
  `discovery_gap` 100% — itu yang menahan, bukan volume.

---

## 10. STATUS 5 Okt 2026 (sore) — persistensi publish diperbaiki

Jadwal produksi sekarang **1 artikel/jam** (24/hari), bukan 3/hari:

| Task | Cron | Perintah | Status |
|---|---|---|---|
| `seo-publish-hourly` | `41 * * * *` | `node seo/publish.mjs --count=1` | enabled |
| `seo-daily-index` | `23 * * * *` | `node runner/daily.mjs` | enabled |
| `seo-weekly` | `2 2 * * 1` | — | enabled |

`SEO_SKIP_PUBLISH=1` dan `SEO_SKIP_GENERATE=1` diset di container, jadi
`runner/daily.mjs` tidak lagi ikut publish — itu tugasnya task per-jam. Tidak ada
dobel-publish.

### Dua jebakan data yang baru ditemukan (keduanya sudah diperbaiki)

Sepanjang sesi sore ini ditemukan bahwa klaim "status publish persisten" **sebenarnya
tidak benar** untuk artikel yang terbit setelah baseline. Polanya berulang, bukan
kebetulan: `10 → 7 → 7 → 7`. Pattern-nya berulang, bukan kebetulan.

**1. `indexnow.mjs` menulis ke path yang salah.**
`seo/indexnow.mjs` pernah punya `const STATE_PATH = \`${ROOT}/seo/state.json\`` sendiri,
yang **menggantukan** path kanonik dari `paths.mjs`. Di runner, `paths.mjs` menghormati
`SEO_STATE_PATH=/app/data/state.json` (volume), tapi `indexnow` tetap menulis ke
`/app/seo/state.json` — yang ada di **layer image**, hilang tiap container rebuild.
Akibatnya dua file state berbeda pendapat: volume beku di 7, image di 5, sementara 8
file MDX benar-benar `draft: false`. Diperbaiki: `indexnow` kini mengimpor `STATE_PATH`
dari `paths.mjs`.

**2. `restore-published.mjs` hanya percaya `state.published`.**
Ini penyebab sebenarnya artikel hilang. `publish.mjs` mencatat status publish **hanya**
di `queue.json` (`t.status = 'published'`) dan tidak pernah append ke `state.published[]`
— array itu cuma baseline dari `bootstrap-state.mjs`. Maka setiap artikel yang terbit
sesudah baseline tidak ada di daftar restore, dan di-flip balik jadi `draft:true` pada
rebuild berikutnya. Terverifikasi nyata: `cara-kerja-smm-panel` terbit 18:38, tayang,
lalu hilang lagi saat image dibangun ulang.

Diperbaiki: `restore-published` memakai **union** `state.published` ∪
`queue.items[status=published]`. `queue.json` sekarang persisten di volume
(`SEO_QUEUE_PATH=/app/data/queue.json`).

Uji: **8 → 8 → 8 → 8** pada empat kali `docker rm` + `run` berturut-turut.

### Dua skrip baru

| Skrip | Fungsi |
|---|---|
| `seo/heal-queue.mjs` | Selaraskan `queue.json` dengan frontmatter MDX. Sumber kebenaran = file MDX. Dipanggil `runner-start.sh` tiap start. `--check` untuk dry-run (exit 1 kalau perlu heal). |
| `seo/migrate-state.mjs` | Satukan state yang terpecah jadi satu authoritative di volume, ambil juga slug dari frontmatter MDX. Idempoten, backup `.bak`. |

`heal-queue` penting karena `publish.mjs` menandai queue `published` **sebelum** deploy.
Kalau proses mati di tengah (timeout Pages, Ctrl-C, OOM), queue dan file berbeda
pendapat, dan publish berikutnya berhenti dengan
`FATAL: frontmatter tidak berubah — draft:true tidak ditemukan?` — melumpuhkan task
per-jam **setiap jam** sampai ada intervensi manual. Ini terjadi dua kali selama sesi ini.

### Env dipindah keluar dari /tmp

Semua env runner (31 baris, termasuk `CLOUDFLARE_API_TOKEN`, GSC, Bing, IndexNow)
tadinya di `/tmp/env-backup.txt`, dan `seo-watchdog` membacanya dari sana untuk recreate
container. `/tmp` dibersihkan `systemd-tmpfiles` saat reboot — setelah reboot, watchdog
tidak bisa recreate dan seluruh pipeline publikasi mati. Sekarang:

```
/etc/seo-runner/env      0600 root-only, 31 baris
```

Watchdog sudah diarahkan ke sana dan `/tmp/env-backup.txt` dihapus.

### Status website

| Item | Nilai |
|---|---|
| Artikel live | **8** (semua HTTP 200, ada di sitemap) |
| Total URL sitemap | 57 |
| `ads.txt` | HTTP 200, `google.com, pub-4438184351486735, DIRECT, f08c47fec0942fa0` |
| Spacer consent | 0px (sebelumnya 156px) |
| `app.socio.id` | HTTP 303, tidak tersentuh |

### Yang masih perlu dari Anda

Slot ID AdSense (`PUBLIC_ADSENSE_SLOT_TOP/MID/BOTTOM/SIDEBAR`) masih kosong, jadi
belum ada unit iklan yang tampil. `ads.txt` itu otorisasi publisher; slot ID hanya ada di
dashboard AdSense. Lihat §11.

## 11. Slot AdSense belum terisi

`landing/src/components/AdsenseSlot.astro` sengaja `return null` kalau client atau slot
kosong — supaya halaman tetap build bersih dan tidak ada CLS. Efeknya: script AdSense
dimuat, tapi tidak ada unit yang bisa dirender.

Butuh 4 slot ID dari **AdSense → Ads → Overview** (unit Display):

```
PUBLIC_ADSENSE_SLOT_TOP=...
PUBLIC_ADSENSE_SLOT_MID=...
PUBLIC_ADSENSE_SLOT_BOTTOM=...
PUBLIC_ADSENSE_SLOT_SIDEBAR=...
```

Setelah diisi, rebuild image agar `import.meta.env` ikut ter-bake. Jangan karang ID —
ID palsu bikin iklan tidak muncul dan bisa kena pelanggaran kebijakan AdSense.

## 12. Cara deploy image baru (semua image dibangun manual)

Coolify tidak bisa build lewat API (queue worker `deployments` tidak ada), jadi polanya:

```bash
# 1. di lokal: salin perubahan ke /tmp/ssoe (clone repo runner), commit, push
# 2. kirim source
cd /tmp && rm -rf ssoe-build && cp -R ssoe ssoe-build && rm -rf ssoe-build/.git
find ssoe-build -name '._*' -delete
COPYFILE_DISABLE=1 tar --no-xattrs -czf /tmp/ssoe-build.tgz ssoe-build
scp -i ~/.ssh/id_rsa /tmp/ssoe-build.tgz root@130.254.47.93:/tmp/

# 3. di server: build + recreate dengan env persisten
ssh -i ~/.ssh/id_rsa root@130.254.47.93
cd /tmp && rm -rf ssoe-build && tar --no-xattrs -xzf ssoe-build.tgz
cd /tmp/ssoe-build && find . -name '._*' -delete
docker build -t ssoe-new:latest .
docker rm -f c9iqug5vvi9kjywt1fn6xnsc-135758379657
docker run -d --name c9iqug5vvi9kjywt1fn6xnsc-135758379657 \
  --restart unless-stopped --env-file /etc/seo-runner/env \
  -v /data/coolify/applications/c9iqug5vvi9kjywt1fn6xnsc/data:/app/data \
  ssoe-new:latest
```

`--env-file /etc/seo-runner/env` (bukan `/tmp/env-backup.txt`). `--no-xattrs` wajib
karena file `._*` AppleDouble merusak `mesh-build.mjs` (§9 jebakan 3). Cek hasil:
`docker logs <nama> | grep -E 'restore-published|heal-queue'` harus `live` = jumlah
artikel yang diharapkan.

Rollback: image lama ada sebagai `ssoe-old:backup`.
