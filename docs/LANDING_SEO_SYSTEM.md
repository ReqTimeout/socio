# Plan Sistem SEO Landing socio.id — Auto Draft & Post Harian (Lokal)

> Adaptasi dari `docs/SEO-SYSTEM-BERIKLAN-2026-08-26.md` + `docs/TRAFFIC-BOOST-STRATEGY-2026-08-27.md`, di-improve untuk keyword **SMM panel** dan stack socio.id (Astro static + Cloudflare Pages + node-cron lokal/VPS, NO Worker).
> Target: traffic SEO → **signup app.socio.id** (bukan AdSense — socio = SaaS transaksional, revenue dari margin order).

---

## 0. Pelajaran dari beriklan → keputusan desain socio.id

| Pelajaran beriklan | Keputusan socio.id |
|---|---|
| 391k keyword city-swap = thin content, 5 tahun tak habis, Helpful Content risk | Mulai **150-300 keyword terkurasi** SMM ID, ekspansi HANYA dari mining GSC (demand nyata) |
| Indexing = bottleneck (12.9k pending, avg pos 70, 0 klik) | Jangan kejar volume; kejar **quality + internal mesh + freshness**. Publish 1-2/hari |
| GSC Indexing API 200/hari | **DEPRECATED Google (mid-2026)** — jangan dipakai. Andalkan IndexNow (Bing/Yandex) + sitemap + internal link |
| sitemap-ping google.com/ping | Deprecated — cukup submit sitemap sekali di Search Console UI, `lastmod` jujur |
| Generate 12k draft di R2/D1 | Draft = **MDX file di repo** (`landing/src/content/blog/`), git-native, reviewable, zero infra baru |
| Cron jam-an di Worker (CF) | **NO Worker** (aturan stack). Cron = launchd lokal / node-cron VPS. Landing deploy via `wrangler pages deploy` |
| Adsense 4 slot/artikel | **Skip Adense V1.** Setiap artikel CTA → daftar. (Kalau nanti mau monetize: hanya blog info, seperti B7 beriklan) |
| Growth loop (GSC query→queue, CTR-fix, freshness, enrich) | **KEEP** — ini bagian paling bernilai, adaptasi versi file-based |

---

## 1. Arsitektur

**MDX + Cloudflare Pages bukan pilihan salah satu — keduanya satu pipeline:**

```
keyword_queue (seo/queue.json, ~200 terkurasi)
   │  pnpm seo:generate --count=2        ← LOKAL, AI free-tier (zen 6 model rotasi + groq fallback)
   ▼
drafts: landing/src/content/blog/*.mdx  (frontmatter draft:true — format konten, git-native)
   │  pnpm seo:publish --count=1        ← LOKAL: promote draft→publish, set date=now
   ▼
pnpm --filter landing build             ← Astro compile MDX → HTML static + sitemap + JSON-LD regen
   │  wrangler pages deploy landing/dist  ← HOSTING: Cloudflare Pages (project socio-id, sudah live)
   ▼
IndexNow ping (Bing/Yandex/DDG)         ← seo/indexnow.mjs, key file di public/
   │
   └─ Mingguan: export GSC CSV → seo/state.json → mining keyword baru + CTR-fix + refresh flag
```

**Kenapa MDX + static Pages (bukan Worker+D1 seperti beriklan):**
- Stack final REBUILD_PLAN §0 sudah menetapkan "Astro 5 + Svelte islands + **MDX** → **Cloudflare Pages**" — tidak ada Worker untuk landing
- Konten = file di git → reviewable (`git diff`), rollback gratis, tidak ada D1/R2/infra baru untuk maintain
- Setiap publish = rebuild → sitemap, JSON-LD, RSS, llms.txt regenerate otomatis — tidak ada drift antara konten dan meta
- Aturan stack §2: cron/app TIDAK di Worker (CPU limit + no MySQL TCP) — generate+publish jalan lokal/VPS via node, deploy hanya kirim `dist/` statis ke Pages
- Draft tidak pernah ke produksi: `draft:true` dikecualikan dari build (Astro content collections) — beda dgn beriklan yang pernah bocor junk slug

Semua state di file (`seo/*.json`), semua konten di git. Tanpa D1, tanpa R2, tanpa Worker, tanpa DB production. **Token-cheap: prompt template pendek + 1 call/artikel + summarize 0.**

### Struktur file baru

```
seo/
  queue.json          # keyword + priority + status (pending/draft/published)
  state.json          # published urls, indexnow submitted, last gsc sync
  prompts.ts          # system prompt template SMM (definisi+H2 wajib+FAQ+internal link)
  generate.mjs        # generator (zen → groq fallback, timeout 120s)
  publish.mjs         # promote draft + tanggal + kategori
  indexnow.mjs        # ping URL baru (bing.com/indexnow + yandex)
  gsc-sync.mjs        # parse export CSV Search Console → queue update
  sync-prices.mjs     # pull top-100 layanan + harga dari app DB → landing/src/data/prices.json
landing/
  src/content/blog/   # *.mdx (draft + published)
  src/content.config.ts
  src/data/prices.json  # harga real (dipakai money pages + injeksi artikel)
  public/indexnow.txt   # key IndexNow
  src/pages/api/...     # tidak ada — full static
```

---

## 2. Keyword — SMM Panel Indonesia (phase 1 terkurasi)

### Money pages (static, dibuat sekali, refresh kuartalan)

10 halaman `/beli-<produk>` — 1 per produk utama, konten = harga real dari `prices.json` + FAQ + schema Product/Offer + review:

| URL | Keyword utama | Modifier sekunder |
|---|---|---|
| `/beli-followers-instagram` | beli followers instagram | murah, terpercaya, proses instan |
| `/beli-likes-instagram` | beli likes instagram | murah, harga |
| `/beli-views-tiktok` | beli views tiktok | murah, instan |
| `/beli-followers-tiktok` | beli followers tiktok | murah, terpercaya |
| `/beli-subscribers-youtube` | beli subscribers youtube | murah, aman |
| `/beli-views-youtube` | beli views youtube | murah |
| `/beli-members-telegram` | beli member telegram | murah |
| `/beli-followers-facebook` | beli followers facebook | murah |
| `/smm-panel-reseller` | smm panel reseller, jadi reseller smm | api, harga grosir |
| `/smm-panel-api` | smm panel api | dokumentasi, gratis daftar |

**ANTI-pattern beriklan**: JANGAN buat platform×layanan×kota (8185 × 40 kota = ratusan ribu thin page). 10 money page ini cukup, masing-masing dengan data harga real — bukan doorway.

### Blog informational (draft harian, sumber queue)

Kategori keyword queue (priority):

1. **AEO/definisi (p90)**: apa itu smm panel, cara daftar smm panel, cara pakai smm panel, smm panel gratis ada gak, cara jadi reseller smm — format: definisi 1 kalimat (≤40 kata) + FAQ 5 + tabel
2. **How-to platform (p85)**: cara menambah followers instagram, cara dapat 1000 views tiktok, cara naikkan engagement, cara aman beli followers — langkah 1-2-3 + tabel harga real
3. **Keamanan/mitra (p80)**: apakah beli followers aman, kenapa followers turun, refill itu apa, cek followers bot
4. **Bisnis reseller (p75)**: modal jualan followers, untung berapa persen, harga grosir vs retail, tips jualan sosmed
5. **Trend/long-tail (p40)**: dari mining GSC mingguan — hanya yang impresi ≥20/minggu

### Format artikel (gates — improve dari beriklan)

- 900-1.400 kata (bukan 1.800 — lebih padat, less fluff, hemat token)
- H1 = keyword, kalimat pertama = **definisi langsung** (AEO/AI Overview)
- 3-5 H2, salah satunya **tabel harga real** dari `prices.json` (bukan teks generik — ini diferensiator)
- FAQ 5 item + FAQPage schema otomatis
- 3 internal link auto (money page relevan + 2 artikel terkait via keyword match)
- CTA: 1 blok "Cek harga & pesan sekarang" → app.socio.id/daftar (bukan WA)
- Featured visual: **SVG art component** dari set yang sama dgn landing (bukan foto AI — konsisten brand, 0 request)
- Gate reject: <900 kata, no H2, duplikat intro (hash 4-gram), tak ada tabel harga

---

## 3. Generator lokal (hemat token, cepat)

```mjs
// seo/prompts.ts — inti
system: "Kamu editor socio.id (panel SMM #1 ID). Tulis artikel SEO Bahasa Indonesia,
formal-santai, verb-first, angka konkret, tanpa fluff. WAJIB: definisi di kalimat pertama,
tabel harga dari data yang diberikan, FAQ 5. Jangan menulis harga selain dari data."
user: { keyword, outline H2, prices: top-8 relevan (dari prices.json), related: [3 slug] }
```

- Provider: `ZEN` (opencode zen, 6 free model rotasi round-robin) → fallback `GROQ` (gpt-oss-120b → qwen). Keys di `.env` root, JANGAN hardcode.
- 1 artikel = 1 call (system+user ≤ 600 token, output ~2.5k) → **±3k token/artikel**.
- `--count=2`/hari (pagi), `--count=1` kalau queue tipis. Parallel 2, timeout 120s/artikel, retry 1x ganti model.
- MDX output ditulis dengan frontmatter lengkap → langsung jadi draft valid.

## 4. Publish harian

`pnpm seo:publish --count=1`:
1. Ambil draft terbaik (priority DESC, lama duduk ASC) → `draft:false`, `pubDate=now`
2. Build + `wrangler pages deploy landing/dist` (CF API token env, sudah ada pattern M5)
3. `indexnow.mjs` ping URL baru (batch ≤10/call) + update `state.json`
4. Log ringkas ke terminal (bukan email — sederhana)

Ritme aman anti-spam: **1-2 artikel/hari, 5-7/minggu** + refresh 2 artikel lama/minggu (`growth-freshness` versi manual: ganti `updated` + revisi 1 paragraf + tabel harga termutakhir).

## 5. Indexing & distribusi 2026 (realita, bukan fantasi quota)

| Kanal | Cara | Frekuensi |
|---|---|---|
| Sitemap | `@astrojs/sitemap` + `lastmod` jujur dari frontmatter; submit sekali di GSC UI | regen tiap deploy |
| IndexNow | key `public/indexnow.txt`, ping bing + yandex endpoint tiap publish | tiap publish |
| Internal mesh | money page ↔ artikel 2 arah, "Artikel terkait" + breadcrumb | otomatis via build |
| Bing Webmaster | daftarkan manual sekali (submit sitemap + 10 URL) | sekali setup |
| llms.txt + llms-full.txt | generate di build (50 artikel + FAQ) untuk AI crawler | tiap deploy |
| Off-platform (opsional, manual) | Medium canonical repost 1/minggu, Quora seeding 2 jawaban/minggu, Pinterest pin via art SVG→PNG | manual |

## 6. Growth loop mingguan (adaptasi file-based)

`pnpm seo:gsc-sync` (input: export CSV Performance GSC 28 hari):
- Query impresi ≥20 tanpa URL cocok → tambah queue (p = 40 + imps/5)
- Posisi 4-20 → flag `push_refresh` (refresh konten + updated)
- CTR ≤2% & posisi ≤20 → flag `ctr_fix` (regenerate judul+desc saja, ±300 token)
- Laporan mini ke terminal: top gain/decline

## 7. Fase eksekusi

| Fase | Isi | Estimasi |
|---|---|---|
| S0 | content collections + schema MDX + blog index/[slug] layout + sitemap + robots + JSON-LD (Article/FAQ/Breadcrumb/Organization/WebSite) | 1 sesi |
| S1 | money pages ×10 (data prices.json + template) + `sync-prices.mjs` | 1 sesi |
| S2 | `generate.mjs` + `publish.mjs` + queue.json terkurasi (~200 kw) + indexnow | 1 sesi |
| S3 | llms.txt, blog SEO polish (related, prev/next, OG image), gsc-sync, seed 5 artikel perdana | ½ sesi |
| S4 | Ritme harian jalan + monitor GSC 4 minggu → evaluasi | ongoing |

## 8. DoD

- [ ] Draft MDX tampil dengan `draft:true` tidak di-build; publish = flip frontmatter + redeploy < 3 menit
- [ ] Artikel lulus gates; tabel harga real ada di tiap artikel how-to
- [ ] Lighthouse blog ≥90 mobile, a11y 100, CLS 0 (pattern sama F4)
- [ ] Sitemap valid + lastmod jujur; IndexNow 200 OK
- [ ] 10 money page terindex (cek `site:socio.id/beli-`) dalam 30 hari
- [ ] 0 thin/spam page; internal mesh tiap artikel ≥3 link
