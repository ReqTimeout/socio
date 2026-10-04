# Runbook: menyalakan engine SEO otomatis

> Ditulis 4 Okt 2026. Menjawab: "generate artikel semua keyword → set draft →
> publish harian sesuai kuota GSC, otomatis."
>
> **Status: belum live.** Kodenya siap dan sudah diuji sampai flip draft + build.
> Yang belum: deploy produksi pertama + env Coolify. Lihat §5.

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
