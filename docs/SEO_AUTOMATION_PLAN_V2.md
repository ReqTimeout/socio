# SEO_AUTOMATION_PLAN_V2 — Socio.id SEO Engine 24/7

> **Versi**: 2.1 — 2 Okt 2026 (dirapikan strukturnya).
> **Status**: **BERJALAN** — infrastruktur sudah live, sisa pekerjaan lihat [sisa pekerjaan](#sisa-pekerjaan).
> **Cara baca dokumen ini**: mulai dari **SNAPSHOT STATUS** di bawah. Bagian §0–§10 adalah
> strategi (jarang berubah). §14.1 = yang menunggu keputusan Anda. **§14.2–§14.16 = log bukti
> eksekusi, arsip, bukan daftar tugas.** Ujung dokumen = **Catatan Penutup**.
> **Mengapa v2**: v1 (v4.0) fokus ke pipeline publish; v2 menutup celah yang user angkat: **indexer belum beres**, **belum ada topical authority**, **belum ada akuisisi user beyond SEO**, **belum ada plan Coolify 24/7** end-to-end, dan **generator masih boros token** kalau dipakai harian.
> **Prinsip utama** (Jeff Bezos mode — baru ditulis dulu, dieksekusi setelah OK): **quality > volume**, **topical authority > scattered pages**, **acquisition multi-channel > SEO only**, **automation manusiawi > robot kaku**.


---

## SNAPSHOT STATUS — 2 Okt 2026 (SATU-SATUNYA angka progres yang sahih)

> Plan ini sebelumnya punya **tiga papan progres yang saling bertentangan** (§12 Sprint 3
> bilang "5/12", §14.2 bilang "17/21", §13 DoD bilang "6/18") dan Sprint 4/5/6 **tidak
> punya kolom status sama sekali**. Itu membuat posisi kerja tidak terbaca. Semua angka
> lama di bagian seksi sudah diberi tanda `[SUPERSEDED]` dan **snapshot ini yang dipakai.**

### Papan tunggal

| Bagian plan | Status | Fakta terukur |
|---|---|---|
| §0 GSC + Bing credential | ✅ **live** | property `sc-domain:socio.id`, sitemap 204, kuota Bing 98→93 |
| §1 Pillar-cluster + manifest | ✅ **live** | 12 pilar, 1.022 keyword terassign, cakupan 94,9% |
| §1b Routing 55 modifier | ✅ **live lokal** | **unassigned 0** · 51 di-route ke 10 money page · 4 di-park (tidak ada layanan) |
| §2 Generator v2 | ✅ **live** | zero-dep, token-efficient |
| §3 Indexer (GSC + IndexNow + Bing + remedy) | ✅ **live** | 4 tahap berurutan, backoff 7 hari, 2 task Coolify jalan |
| §4 Coolify engine | ✅ **live** | project `socio-seo`, 2 scheduled task, image dari repo private |
| §5 Schema JSON-LD | ✅ **live** | 56 halaman · 360 blok · 0 error / 0 warning |
| §6.1 Mesh 2-arah | ✅ **live** | `db2bd240`, idempoten, 0 broken link |
| §6.2 Freshness loop | ❌ **no-op** | `runner/weekly.mjs:101` mencatat sendiri |
| §7 GEO / AEO playbook | ❌ **0%** | belum ada prompt tracking / baseline share-of-voice |
| §8 Akuisisi multi-channel | ❌ **0%** | tidak ada `seo/distribute/`, Reddit/Quora/affiliate/newsletter semua nol |
| §9 Gate anti-scaled-abuse | ✅ **aktif + PASS** | **FAIL 0** · WARN 64 = skor kemiripan 0,48–0,62 antar varian kota (**expected**, bukan cacat — Backlog A) |
| §10 Cadence | 🟡 **sebagian** | daily + weekly live, `monthly.mjs` belum |

### Angka riil (bukanclaim)

```
55 keyword modifier →   0 unassigned (51 route + 4 park), 21 intent jasa/order jadi FAQ
12 pilar            →   2 punya artikel  (10 belum)
61 artikel korpus   →   5 published, 0 terindeks
1.077 item queue    →   5 published
864 cluster geo     →   0 published
68 → 64 WARN         →   skor kemiripan, BUKAN jumlah artikel cacat (7 glitch asli, semua sudah diperbaiki)
44 money page       →   2 terindeks  (/ dan /layanan/); 42 "Discovered - not indexed"
money page inbound  →   44/44 punya jalur crawl (perbaiki 2 Okt, deploy 6c9a7ab9)
```

### Ringkasan jujur

**Infrastruktur 100%, konten nyaris nol, akuisisi off-site belum mulai.** Kalau targetnya
trafik, yang tersisa bukan tooling — itu content (§Sprint 4) dan off-site (§8, Sprint 5–6).

### Sisa pekerjaan

> "Pihak" = siapa yang harus gerak. Kalau tertulis **waktu**, tidak ada yang bisa dikebut.
> Kalau tertulis **user**, agent tidak boleh menebak — tanya dulu.
> Kalau tertulis **agent**, itu pekerjaan sesi berikutnya.

| # | Sisa pekerjaan | Status | Aksi berikutnya | Pihak |
|---|---|---|---|---|
| 1 | W.1 ukur indeks (sitemap submit 1 Okt 09:42 UTC) | ⏳ menunggu | Baca GSC **8 Okt** (48–72 j) | waktu |
| 2 | §6.2 freshness loop `weekly.mjs` | 🔴 no-op | Isi `weekly.mjs` yang kini mencatat dirinya sendiri | agent |
| 3 | §10.3 `monthly.mjs` | 🔴 belum ada | Buat script monthly (tanggal 1) | agent |
| 4 | Publish otomatis runner (no-op) | 🔴 no-op | Butuh repo konten + credential deploy Cloudflare runner | agent |
| 5 | §7 GEO / AEO playbook | ❌ 0% | Putuskan prompt set + tooling (§7.4 butuh budget) | **user** |
| 6 | §8 akuisisi multi-channel | ❌ 0% | Putuskan channel mana dulu (matrix §8.2) | **user** |
| 7 | 10 artikel pilar (12 pilar, baru 2 ada) | ✍️ belum ada | Tulis 10 artikel pilar (corpus 61 sudah bersih — bukan terblokir, lihat Backlog A) | agent |
| 8 | Publish 61 draft (semua draft:true) | ✍️ tertunda | Gate sudah PASS (FAIL 0). Tinggal review + jadwal publish | agent |
| 9 | Off-site: Reddit/Quora/affiliate/newsletter/HARO | ❌ Sprint 5–6 | Tunggu keputusan channel | **user** |
| 10 | Infra kecil: Resend notify · `/app/data` · `RUNNER_GUIDE.md` | 🔧 sisa | Rapikan saat ada waktu | agent |

#### Backlog A — kualitas konten: ✅ RESOLUSI 4 Okt (tidak ada artikel terblokir)

> **Koreksi atas catatan 2 Okt.** Sempat ditulis "36 artikel terblokir". Angka itu
> **salah besar** — berasal dari salah baca `WARN` `qc-uniqueness` sebagai jumlah
> artikel cacat. Setelah diperiksa per kalimat (bukan cuma regex), glitch asli cuma
> **7 di 5 file**, dan semuanya **sudah diperbaiki**. Tidak ada artikel yang perlu
> ditulis ulang oleh manusia.

| Fakta | Angka |
|---|---|
| Total artikel korpus | **61** |
| Glitch asli ditemukan | **7** (di 5 file: `jayapura`, `palembang`, `pekanbaru`, `solo`, `bandung`) |
| Glitch terselesaikan | **7** — **0** tersisa |
| Artikel yang perlu ditulis ulang | **0** |

**Akar masalahnya — bug template, bukan kelemahan model.** Placeholder Liquid/Jekyll
(`{{ post.filters }}`) tidak ter-substitusi penuh: kata Indonesia di depannya tertinggal,
nama variannya bocor jadi ekor kata. Contoh: `yang_filters`, `daripada_posts`,
`karena_pattern`. Ditambah sisa teks Inggris: `sebelumellos. hasten.`,
`Pertanyaan about harga borongan`, `tidak cheapest di daftar`.

**Kelas yang terbukti aman (tidak perlu dikejar):** `Instagram for Business` (nama
brand), `posting before-after`, `to the point`, `fast respon`, `pay-as-you-go`,
`even`. Semuanya false positive, bukan defect. Ini sebabnya detektor kamus
`/usr/share/dict/words` dihapus — bising dan menyalakan rasa aman palsu.

**Soal angka gate, sekarang bisa dijelaskan akurat:**

| Angka | Arti sebenarnya | Arti |
|---|---|---|
| `qc-uniqueness` FAIL 0 | tidak ada pasangan artikel yang nyaris identik | aman publish |
| `qc-uniqueness` WARN 64 | skor kemiripan 0,48–0,62 antar varian kota — **mem.EXPECTED**, bukan cacat | abaikan |
| `check-article` 0 | kelas keras (CJK, junk `_`, frontmatter YAML) | bersih |

Jadi `WARN` itu **metrik kemiripan**, bukan hitungan artikel rusak. 61 artikel memang
varian kota dari template yang sama, jadi kemiripan 0,5 adalah **konsekuensi desain
yang disengaja**, bukan kebocoran generator. Gate sudah benar: **PASS**.

**Sisa pekerjaan nyata (kecil):** (a) perbaiki substitusi placeholder di sisi
generator supaya kelas `yang_filters` tidak muncul lagi; (b) tambahkan gate
sisa-teks-Inggris; (c) tulis 10 artikel pilar yang belum ada.

## Daftar Isi

0. [TL;DR + Diagnosis v1](#0-tldr--diagnosis-v1)
1. [Strategi Pillar-Cluster (Topical Authority)](#1-strategi-pillar-cluster-topical-authority)
2. [Generator v2: token-efficient batch](#2-generator-v2-token-efficient-batch)
3. [Indexer Pipeline (GSC + IndexNow + Bing + remedy)](#3-indexer-pipeline-gsc--indexnow--bing--remedy)
4. [Coolify Engine 24/7 (Dockerfile + 3 Scheduled Task)](#4-coolify-engine-247-dockerfile--3-scheduled-task)
5. [Schema & EEAT (JSON-LD)](#5-schema--eeat-json-ld)
6. [Internal Mesh & Freshness Loop](#6-internal-mesh--freshness-loop)
7. [GEO / AEO Playbook](#7-geo--aeo-playbook)
8. [User Acquisition Multi-Channel (beyond SEO)](#8-user-acquisition-multi-channel-beyond-seo)
9. [Anti Scaled-Content-Abuse Gates](#9-anti-scaled-content-abuse-gates)
10. [Cadence 24/7](#10-cadence-247)
11. [Scripts Catalog](#11-scripts-catalog)
12. [Sprint Roadmap](#12-sprint-roadmap)
13. [Definition of Done](#13-definition-of-done-sprint-3)
14. [Yang Menunggu dari User](#14-yang-menunggu-dari-user)
15. [Wireframes Appendix](#15-wireframes-appendix)

---

## 0. TL;DR + Diagnosis v1

### 0.1 Strategi satu paragraf

Bangun **SEO engine 24/7** berbasis **Coolify + repo konten terpisah** yang menghasilkan **30-60 artikel bermutu/bulan** (bukan 50/hari — bunuh diri scaled-content-abuse), dipandu **topical authority map** (12-15 pillar × cluster), di-**index cepat** lewat **IndexNow + Bing URL Submission + GSC URL Inspection API**, di-**boost ke posisi atas** lewat **schema lengkap, internal mesh 2-arah, EEAT, freshness loop**, dan **didistribusikan lintas kanal** (Reddit/Quora/YouTube/WA Group/affiliate) supaya traffic tidak 100% bergantung SEO Google yang volatile.

### 0.2 Diagnosis v1 — apa yang bolong

| Komponen | v1 status | Masalah |
|---|---|---|
| **Indexer** | IndexNow ✅ + GSC URL Inspection ✅ **LIVE 1 Okt 2026** (SA sudah Owner di `sc-domain:socio.id`, runbook `docs/GOOGLE_CLOUD_SETUP.md`) · Bing ⛔ butuh API key | `index_rate` bisa diukur → ramp-gate 3→10/hari di §3 v1 jalan. Sisa gap: Bing submit |
| **Topical authority** | ❌ tidak ada | 894 keyword approved = 864 geo + 30 intent, **nggak ada pillar page**, halaman scatter, tidak ada cluster mesh |
| **Schema JSON-LD** | sebagian (Article+FAQ+Breadcrumb+Speakable+Person+Organization) | Belum ada `Service`, `ItemList` di cluster, `WebPage` utama, `LocalBusiness` per kota (signaling lokal) |
| **Internal mesh** | 1-arah (artikel→money) | Pillar belum ada; cluster page tidak saling link; related hanya published (draft terisolasi) |
| **Freshness** | Badge `updated` saja, no real freshness | Tidak ada schedule re-inject data harga/stat per artikel |
| **Acquisition** | SEO only (zero coverage di v1) | Tidak ada Reddit/Quora/YouTube/Forum/WA plan, tidak ada referral engine |
| **Generator token cost** | ~10K token/artikel via LLM API, pass rate rendah | Butuh jalur tanpa LLM (template) atau hemat token (prompt minimal, body skeleton) |
| **Cadence 24/7** | Manual publish | Sprint 3 (Fase C) semua ⬜; Coolify belum dipakai untuk cron SEO | ---

## 1. Strategi Pillar-Cluster (Topical Authority)

### 1.1 Kenapa wajib (data, bukan opini)

- **March 2024 Google update**: "scaled content abuse" + "site reputation abuse". 894 artikel `smm-panel-<variasi>-<kota>` semua template sama → **red flag** kalau tak ada pillar + cluster mesh + data differentiation.
- **Topical authority 2026**: domain yang **menutup sub-topik secara komprehensif + link mesh** naik signifikan. Sebaliknya 1.000 halaman tanpa struktur = noise.
- **GEO/AEO**: model AI Overview mengutip **situs yang topik-nya selesai**, bukan 1 halaman random.
- **Praktikal**: 1 pillar page + 8-12 cluster page = ~15 entitas yang saling support. Kita bisa mencover 894 keyword dengan ~12 pillar + ~80 cluster (cluster article = piece panjang, link ke ~6-10 keyword turunan).

### 1.2 Pillar Map (12 pilar utama)

| # | Pillar | Cluster keyword (sudah ada di queue) | Target artikel |
|---|---|---|---|
| **P1** | `smm-panel` (definisi) | apa-itu-smm-panel, smm-panel-indonesia, smm-panel-murah | 1 pillar + 5 cluster = 6 |
| **P2** | `reseller-smm-panel` | modal-jualan-followers, reseller-smm-panel-\<kota\> | 1 pillar + 8 cluster = 9 |
| **P3** | `cara-menambah-followers-instagram` | cara-naik-followers, followers-instagram-murah | 1 pillar + 6 cluster = 7 |
| **P4** | `harga-smm-panel` | harga-followers, harga-likes, harga-views | 1 pillar + 6 cluster = 7 |
| **P5** | `smm-panel-terpercaya` | smm-panel-aman, smm-panel-legal | 1 pillar + 4 cluster = 5 |
| **P6** | `keamanan-smm-panel` | smm-panel-aman, smm-panel-bukan-bot | 1 pillar + 3 cluster = 4 |
| **P7** | `smm-panel-tiktok` | tambah-followers-tiktok, tambah-likes-tiktok | 1 pillar + 5 cluster = 6 |
| **P8** | `smm-panel-youtube` | tambah-viewers-yt, tambah-subscribe-yt | 1 pillar + 4 cluster = 5 |
| **P9** | `smm-panel-twitter` | followers-twitter, likes-twitter | 1 pillar + 3 cluster = 4 |
| **P10** | `smm-panel-per-kota` (geo) | smm-panel-\<kota\> + smm-panel-termurah-\<kota\> | 1 pillar + 72 kota (1 short per kota, link ke pillar) = 73 |
| **P11** | `affiliate-smm-panel` | affiliasi-smm, komisi-smm | 1 pillar + 3 cluster = 4 |
| **P12** | `faq-smm-panel` (cara-kerja) | bagaimana-smm-bekerja, smm-reseller-faq | 1 pillar + 4 cluster = 5 | **Total**: 12 pillar + ~125 cluster = **~137 artikel berstruktur** — feasible 4-6 bulan @ 30-50/bulan, **BUKAN 894 sekaligus**.

### 1.3 Mesh Rules (wajib)

- **Setiap cluster page** link ke: pillar (1×) + 2-3 cluster sekelompok (sibling) + 1 money page (layanan/daftar) + 1-2 kota tetangga.
- **Setiap pillar page** link ke: SEMUA cluster page-nya (full list) + 3 money page + 1 "/blog" (root).
- **Setiap geo page** (P10) link ke: pillar P1 + 2 kota tetangga (se-provinsi) + money `/layanan`.
- **Cluster interlink** harus natural di body (anchor text variasi), bukan footer mass-link.

### 1.4 Implementasi data

Tambah `seo/clusters.json` (manifest pillar ↔ cluster):

```json
{
  "pillars": [
    {
      "id": "P1",
      "slug": "smm-panel",
      "title": "SMM Panel: Panduan Lengkap 2026",
      "keyword_root": "smm panel",
      "clusters": ["apa-itu-smm-panel", "smm-panel-indonesia", "smm-panel-murah"],
      "money_links": ["/layanan", "/reseller", "/beli-followers-instagram"],
      "status": "live"
    },
    ...
  ]
}
```

`from-template.mjs` (v2) akan baca `clusters.json` → auto-link cluster ↔ pillar lewat `## Lihat juga` (extended version dari "Baca juga" v1).

---

## 2. Generator v2: token-efficient batch

### 2.1 Masalah v1 generator

| Aspek | v1 | v2 (target) |
|---|---|---|
| Token/artikel | ~10K (LLM CLI: 90-170 detik, pass rate rendah) | **≤500 token/artikel** (template assembler + skeleton) |
| Pass rate qc.mjs | ~40% (LLM CLI) | **≥90%** (kalibrasi terbukti di batch 4-5: 30/30 PASS) |
| Cacheable parts | Tidak (LLM re-gen per artikel) | **95% di-cache** (frontmatter, FAQ ×5, CTA, related) |
| Distinct data per page | Kota saja | Kota + 3 anchor lokal + cluster link + sibling link |

### 2.2 Arsitektur Generator v2

```
INPUT                                OUTPUT
┌──────────────────────┐            ┌──────────────────────┐
│ keywords.geo.json    │            │ blog/<slug>.mdx      │
│   approved+promoted  │            │   draft:true         │
│ clusters.json        │  ─────►    │   850-1400 kata      │
│ cities.json          │  from-     │   schema valid       │
│ content-shared/      │  template  │   linked ke pillar + │
│   faq-pool.json      │  v2.mjs    │   cluster + money    │
│   cta-pool.json      │            └──────────────────────┘
│   section-skeletons/ │
└──────────────────────┘
                  │
                  ▼
        ┌──────────────────────┐
        │ Parallel worker     │  (P concurrent, default 4)
        │ baca spec → splice  │  tidak ada panggilan LLM
        │ skeleton → fill     │  kecuali kalau spec butuh
        │ local anchor        │  extra body (rare)
        └──────────────────────┘
```

### 2.3 Komponen baru

| File | Fungsi |
|---|---|
| `seo/from-template.mjs` | **upgrade**: baca `clusters.json` → auto link pillar/cluster; validate uniqueness ratio (≥60% body vs tetangga cluster); output ke `landing/src/content/blog` ATAU ke clone repo konten (via `SEO_CONTENT_DIR`) |
| `seo/specs.batchN.json` | (sudah ada) — minimal prose spec per artikel |
| `seo/content-shared/faq-pool.json` | **baru**: 200+ FAQ Q&A pairs dikurasi per pilar/kategori → assembler pilih 5 by cluster |
| `seo/content-shared/cta-pool.json` | **baru**: variasi CTA per kategori (Lainnya/Reseller/Followers/TikTok) |
| `seo/content-shared/section-skeletons/<pilar>.json` | **baru**: skeleton 5 H2 + intro/closing per pilar — template tetap, agent tinggal fill `local_anchor`, `local_buyer`, `pricing_specifics` |
| `seo/generate-parallel.sh` | upgrade v1: pakai `node --experimental-worker` ATAU plain `Promise.all` worker pool (default 4 paralel, no race) |
| `seo/qc-uniqueness.mjs` | **baru**: cek similarity vs published + cluster siblings, threshold 0.55 (Jaccard) — kalau mirip → reject |
| `seo/spec-filler.mjs` | **baru**: opsi kalau author butuh LLM (mis. nambah kalimat spesifik) — panggil Groq HTTP (`GROQ_API_KEY`) hemat token via `max_tokens=400` |

### 2.4 Pipeline generate harian

```
generate-daily.sh
├─ ambil N item pending dari queue.json (default N=5)
├─ untuk tiap item:
│  ├─ spec filler (kalau ada skeleton kurang)
│  ├─ from-template.mjs (assemble + QC)
│  └─ kalau FAIL → tulis alasan ke queue.notes + skip (max 3 fail beruntun)
├─ commit + push ke repo konten
└─ summary ke log
```

Output: 5 draft PASS, commit `content(seo): 5 drafts`, push. **0 token LLM kalau skeleton lengkap**.

### 2.5 Estimasi token cost

| Skenario | Token/artikel | 50 artikel/bulan |
|---|---|---|
| v1 (LLM CLI) | ~10K | ~500K/bulan |
| v2 (template + Groq fallback 10%) | ~500 | ~25K/bulan (hemat 95%) | ---

## 3. Indexer Pipeline (GSC + IndexNow + Bing + remedy)

### 3.1 Arsitektur

```
                        ┌─────────────────────────────┐
                        │  COOLIFY CRON DAILY 06:00   │
                        │  runner/daily.mjs           │
                        └──────────────┬──────────────┘
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        ▼                              ▼                              ▼
┌────────────────┐           ┌────────────────┐           ┌────────────────┐
│ PUBLISH        │           │ INDEX          │           │ REPORT         │
│ publish.mjs    │           │ indexer.mjs    │           │ report-daily   │
│ N flip+build+  │           │ + indexnow.mjs │           │ .mjs           │
│ deploy+llms    │           └────────┬───────┘           └────────┬───────┘
└────────────────┘                    │                            │
                                      ▼                            ▼
                              ┌──────────────────┐        ┌─────────────┐
                              │  3 KANAL INDEX   │        │  Email/Resend│
                              │  ┌─────────────┐ │        │  ringkasan    │
                              │  │1 IndexNow   │ │        │  ke owner     │
                              │  │ (Bing/Yndx) │ │        └──────────────┘
                              │  ├─────────────┤ │
                              │  │2 Bing URL   │ │ ◄──── 10/hari quota
                              │  │  Submission │ │
                              │  ├─────────────┤ │
                              │  │3 GSC URL    │ │ ◄──── butuh SA
                              │  │  Inspection │ │
                              │  └─────────────┘ │
                              └────────┬─────────┘
                                       │
                                       ▼
                              ┌──────────────────┐
                              │ REMEDY           │
                              │ - "Crawled not   │
                              │   indexed" →     │
                              │   re-ping+inspect│
                              │ - "Discovered    │
                              │   not indexed" → │
                              │   back-link+wait │
                              │ - manual action  │
                              │   → halt+email   │
                              └──────────────────┘
```

### 3.2 Script baru

| File | Fungsi |
|---|---|
| `seo/indexnow.mjs` (upgrade) | batch ping ke IndexNow (sudah ada) — tambah: `--since=24h` (auto-detect dari state) |
| `seo/bing-submit.mjs` (baru) | Bing URL Submission API — OAuth2, batch 10/hari, prioritas money page + cluster baru |
| `seo/gsc-inspect.mjs` (baru) | Google URL Inspection API — butuh `GSC_SERVICE_ACCOUNT_JSON_B64` (SA ✅ verified live, zero-dep via `seo/lib/gsc.mjs`) — batch URL, store result ke `state.json` `{url: {verdict, coverageState, lastCrawlTime, indexingState}}` |
| `seo/remedy.mjs` (baru) | cek `state.json` → untuk URL status "Crawled – currently not indexed" → re-ping IndexNow + tunggu 7 hari → kalau masih gagal → email alert + tandai `needs_human` |
| `seo/ramp-gate.mjs` (baru) | hitung `index_rate_14d = indexed/published_14d` → set `seo/config.json` daily_count (3-10) sesuai plan §3 v1 |
| `seo/indexer.mjs` (orchestrator) | panggil indexnow + bing-submit + gsc-inspect + remedy berurutan, exit code 0/1 |

### 3.3 URL Inspection — detail implementasi

Quota **2.000/hari per property + 600/menit** (angka dokumentasi Google — koreksi dari draft lama yang menyebut "600/detik"; verifikasi di Console → Quotas). Praktikal untuk kita: **~10-50 URL/hari** sudah jauh di bawah batas. Strategi:

- Daily batch: inspect **URL yang baru dipublish 7 hari terakhir** (rolling window).
- Weekly batch: inspect **URL "Discovered/Crawled" tapi belum indexed** (remedy).
- Simpan hasil ke `state.json` field `gsc.inspections[url]`.
- Rate-limit internal: 1 request/200ms (anti-quota exceeded).

```js
// gsc-inspect.mjs skeleton
const auth = new google.auth.JWT(
  client_email, null, private_key,
  ['https://www.googleapis.com/auth/webmasters.readonly']
);
const searchconsole = google.searchconsole({ version: 'v1', auth });
async function inspect(url) {
  return await searchconsole.urlInspection.index.inspect({
    requestBody: { inspectionUrl: url, siteUrl: 'sc-domain:socio.id' }
  });
}
```

### 3.4 IndexNow — flow

```
publish.mjs ─► indexnow.mjs --from=queue.published_today
              └─► submit ke api.indexnow.org (auto-distribute Bing+Yandex+Seznam)
                  └─► update state.indexnow.submitted[]
```

IndexNow gratis, instant submit, **BUKAN ganti GSC** — cuma jalur tercepat ke Bing (yang dipakai ChatGPT search & Copilot).

### 3.5 Bing URL Submission API — flow

**Kuota 100 URL/hari + 3.100/bulan** (terverifikasi live 1 Okt 2026 via `GetUrlSubmissionQuota` — draft lama menyebut 10/hari, salah). URL wajib bentuk canonical trailing slash. Prioritas submit:
1. Semua URL publish hari itu (bukan cuma 3 money page — kuota cukup)
2. 3 money page (per minggu, bergantian)
3. URL lama yang gagal di IndexNow / belum terindeks (>7 hari)
4. Kalau kuota 100 habis: pakai IndexNow (unlimited) untuk sisanya — jangan skip, jangan double-submit

---

## 4. Coolify Engine 24/7 (Dockerfile + 3 Scheduled Task)

### 4.1 Kenapa Coolify, bukan GH Actions / cron VPS langsung

| Opsi | Pro | Kontra |
|---|---|---|
| **Coolify Scheduled Task** | UI management, env vars aman, log UI, restart otomatis, 1 platform sama dgn app | Butuh Docker image |
| GH Actions | Gratis, native git | Env vars di secrets, tidak bisa long-running heavy script, ada rate limit |
| VPS cron | Full control | Cron debugging susah, log scattered, restart manual |
| Cloudflare Worker cron | Gratis, edge | **Tidak bisa MySQL TCP** (kita pakai TiDB TCP) — di luar | **Coolify menang**: sama dgn stack Coolify yang sudah jadi host app, env vars reuse, Scheduled Task built-in.

### 4.2 Arsitektur Container

```
runner/
├── Dockerfile           # node:22-slim + pnpm + git + wrangler
├── .dockerignore
├── package.json         # deps: googleapis, @octokit/rest
├── daily.mjs            # 06:00 WIB — publish + index
├── indexer.mjs          # 06:30 WIB — gsc inspect + remedy
├── weekly.mjs           # Senin 09:00 — freshness + mining + report
├── monitor.mjs          # tiap 15 menit — health check (optional)
└── lib/
    ├── git.mjs          # clone/push/pull repo konten
    ├── gsc.mjs          # GSC SA auth + URL inspection
    ├── state.mjs        # read/write state.json
    └── notify.mjs       # Resend email + Resend webhook
```

### 4.3 Dockerfile

```dockerfile
FROM node:22-slim
RUN apt-get update && apt-get install -y git openssh-client ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile --prod
COPY . .
ENV NODE_ENV=production
CMD ["node", "daily.mjs"]
```

### 4.4 Scheduled Task Coolify (3 task)

| Task | Cron | Tujuan |
|---|---|---|
| **daily-publish** | `0 23 * * *` UTC = **06:00 WIB** | publish.mjs + indexnow + indexer ping |
| **weekly-freshness** | `0 2 * * 1` UTC = **Senin 09:00 WIB** | weekly.mjs: mining GSC, re-inject data harga, freshness badge update, report email |
| **daily-monitor** | `*/15 * * * *` UTC | health check (kalau gagal 3× → email alert) |

### 4.5 Env vars di Coolify

```
GH_TOKEN=<fine-grained PAT repo konten>
CLOUDFLARE_API_TOKEN=<CF Pages deploy>
CLOUDFLARE_ACCOUNT_ID=<0298214d…>
GROQ_API_KEY=<opsional, generator fallback>
RESEND_API_KEY=<email notif>
SOCIO_INDEXNOW_KEY=<278171ff…>
GSC_SERVICE_ACCOUNT_JSON_B64=<base64 SA JSON>
GCP_PROJECT_ID=project-e899f4b3-5062-40a0-b9a
GSC_SERVICE_ACCOUNT_EMAIL=beriklanagency@project-e899f4b3-5062-40a0-b9a.iam.gserviceaccount.com
GSC_SITE_URL=sc-domain:socio.id
GSC_SITEMAP_URL=https://socio.id/sitemap-index.xml
BING_API_KEY=<Bing Webmaster API>
PAGESPEED_API_KEY=<opsional, tanpa key kena 429>
SEO_RUNNER_SECRET=<shared secret dgn app>
NOTIFY_EMAIL_TO=owner@socio.id
NOTIFY_EMAIL_FROM=seo@socio.id
TZ=Asia/Jakarta
```

### 4.6 Flock anti double-run

```bash
# daily.mjs dijalankan via Coolify, di-dalam script:
exec 9>/var/lock/seo-daily.lock
flock -n 9 || { echo "already running, exit"; exit 0; }
# ... jalankan pipeline
```

---

## 5. Schema & EEAT (JSON-LD)

### 5.1 Schema per page type

| Halaman | Schema types | Wajib |
|---|---|---|
| `/blog/<slug>` (article) | `Article` + `FAQPage` + `BreadcrumbList` + `Person` (author) + `SpeakableSpecification` + `Organization` (publisher) | ✅ semua (sudah ada) |
| `/blog/<slug>` (geo) | **+ `Service`** (penawaran SMM panel untuk kota X) + **`AreaServed`** kota | tambah |
| `/blog/<slug>` (reseller) | **+ `Product`** (paket reseller) + `Offer` (harga) + `AggregateRating` (kalau ada) | tambah |
| Pillar `/<pillar>` | `WebPage` + `ItemList` (daftar cluster) + `BreadcrumbList` | tambah |
| Money page `/beli-*` | `Product` + `Offer` + `AggregateRating` + `FAQPage` + `BreadcrumbList` | sebagian ada |
| Home `/` | `WebSite` + `Organization` + `SiteNavigationElement` | ✅ ada |

### 5.2 EEAT sinyal

- **Experience**: author box "Tim Socio.id" pengalaman di industri → ganti generic author jadi real person (opsional nanti)
- **Expertise**: schema `Person` dengan `knowsAbout` array (list topik yang dikuasai)
- **Authoritativeness**: backlink dari PR (D8 di v1) + Reddit/forum (akuisisi)
- **Trustworthiness**: HTTPS ✅, contact page ✅, about page (cek), return policy (cek), privacy ✅, terms ✅

### 5.3 Validator

Tambah `seo/jsonld-validate.mjs` — parse setiap page Astro output, validasi schema via `schema-dts` ATAU fetch ke Google Rich Results Test endpoint internal. Wire di `runner/daily.mjs` post-build.

---

## 6. Internal Mesh & Freshness Loop

### 6.1 Mesh generator (`seo/mesh-build.mjs`)

- Input: `clusters.json` + daftar published + daftar draft
- Output: untuk tiap artikel, tentukan 3-5 link related:
  - 1 pillar
  - 2-3 sibling cluster (pilar sama)
  - 1 money page
  - 1 kota tetangga (kalau geo)
- Tulis ke frontmatter `related[]` saat build (override related statis dari queue).

### 6.2 Freshness loop (`weekly.mjs`)

- Senin 09:00 WIB: ambil `service_changelog` (perubahan harga dari minggu lalu) dari `landing/src/data/prices.json` + `seo/changelog.json`
- Untuk setiap artikel yang punya snippet harga: re-inject harga baru + set `updated: <today>`
- IndexNow ping ulang URL yang di-update (Bing cepat detect update)
- Buang artikel yang tidak diupdate >6 bulan dari sitemap "fresh feed" (tapi keep URL)

### 6.3 Sinyal ke Google

- `dateModified` di schema (sudah ada) — update tiap fresh
- `updated` badge di UI (sudah ada di B13)
- Internal link update → "tanda kehidupan" → crawl lebih sering

---

## 7. GEO / AEO Playbook

### 7.1 Target prompt sets

50-200 prompt per bulan, sampling jawaban ChatGPT/Perplexity/Gemini/Claude. Tool: **Otterly.ai** ATAU **Profound** (untuk produksi) ATAU **manual scrape** (gratis tapi makan waktu).

KPI: **share of voice** (berapa % jawaban menyebut socio.id) + **citation rate** (berapa % memuat link socio.id).

### 7.2 Taktik on-page (banyak sudah by-design)

| Taktik | Status |
|---|---|
| Kalimat pertama self-contained definisi ≤40 kata | ✅ by design |
| FAQ 5 per artikel + FAQPage schema | ✅ |
| Tabel harga real (deterministik dari `prices.json`) | ✅ sebagian |
| Citation ke sumber primer (mis. data BPS, jurnal, paper) | 🟡 tambah (kalau cluster butuh) |
| Statistics / angka spesifik | ✅ (pakai local anchor) |
| Entity clarity di homepage schema | ✅ |
| llms.txt + llms-full.txt regen tiap publish | ✅ |
| robots allowlist GPTBot/ClaudeBot/Perplexity | ✅ |
| `updated` badge freshness | ✅ |

### 7.3 Taktik off-page (baru di v2)

- **Reddit presence** (lihat §8)
- **YouTube shorts** (lihat §8)
- **Quora spaces** (lihat §8)
- **Wikipedia** (kemungkinan besar tidak eligible untuk socio.id — skip)

### 7.4 Tooling opsional

- **Otterly.ai** ($249/bulan) — prompt monitoring otomatis
- **Profound** (enterprise)
- **Manual**: spreadsheet + scraper sendiri

Rekomendasi: **manual dulu 1 bulan** dengan 50 prompt, ukur baseline, baru putuskan beli tool.

---

## 8. User Acquisition Multi-Channel (beyond SEO)

### 8.1 Kenapa multi-channel

- SEO baru mulai unjuk gigi setelah 3-6 bulan (domain muda)
- Traffic SEO Google = 1 sumber → kalau deindex/manual action = mati
- Akuisisi cepat butuh **sinyal sosial** (Reddit/Quora/forum) + **distribusi niche** (WA Group/Discord)

### 8.2 Channel matrix

| Channel | Effort | Tactic | Expected gain |
|---|---|---|---|
| **Reddit** | High (manual, hati-hati anti-spam) | Bangun 2-3 akun (u/socioid + u/socio-career), join r/Indonesia, r/Entrepreneur, r/smallbusiness, r/socialmedia, jawab pertanyaan natural + link ke artikel socio.id yang relevan (BUKAN drop link) | 100-500 visitor/bulan dari profile + comment |
| **Quora** | Medium | Answer 5-10 pertanyaan per minggu tentang social media / SMM / reseller, link ke artikel socio.id kalau natural | 50-200 visitor/bulan |
| **YouTube Shorts** | High (butuh produksi) | 1 short/hari: "Cara dapet followers organik + gratis", "Apakah SMM panel aman?", screen-record + voice-over sederhana. Link di desk ke artikel blog | 100-1000 view/hari, 10-50 klik ke blog |
| **TikTok organik** | High | Repurpose YouTube Shorts → TikTok, hashtag niche (#smmpanelindonesia #resellersmm #bisnis) | sama dgn YouTube |
| **WhatsApp Group / Telegram** | Medium | Buat 1 grup "Reseller Socio.id" — share tips + update harga mingguan + diskusi. Invite 5 reseller awal, tumbuh organic | 30-50 reseller aktif = repeat customer |
| **Forum niche Indonesia** | Medium | Kaskus, Female Daily (kecantikan/influencer), IDN Times Komentar (artikel lifestyle) | 50-200 visitor/bulan |
| **Affiliate program** | Medium-High | Onboarding 20-50 micro-affiliate (nano influencer IG/TT 5K-50K followers). Komisi 20-30%. Mereka review & kasih link | 100-300 sign-up reseller/bulan |
| **Referral user-to-user** | Low | "Ajak temen, dapet Rp10.000" — embed di dashboard app | 50-100 referral/bulan |
| **Email re-engagement** | Low | Kumpulin email (newsletter), kirim digest mingguan | 10-30 visit/minggu per 1000 email |

### 8.3 Implementation scripts (`seo/distribute/`)

```
seo/distribute/
├── reddit-poster.mjs     # NEW: post/comment via Reddit API (read-only research; manual post via web lebih aman)
├── quora-poster.mjs      # NEW: same (read-only research)
├── yt-short-cue.mjs      # NEW: generate short script + thumbnail prompt
├── newsletter-ping.mjs   # NEW: panggil app endpoint newsletter-digest
└── affiliate-stats.mjs   # NEW: sync affiliate commission data
```

### 8.4 PR / Backlink strategy (off-site authority)

- **HARO / Featured.com** — pitch 1×/bulan ke jurnalis Indonesia
- **Guest post** — tulis 1-2 guest post/bulan ke blog bisnis Indonesia (DailySocial, Tech in Asia ID, Marketeers)
- **Podcast appearance** — apply ke 1 podcast/bulan (Bisnis.com, Glints, dsb)

### 8.5 KPI akuisisi

| Channel | Baseline target (3 bln) | Goal (6 bln) |
|---|---|---|
| Reddit/Quora/Forum | 200 visit/bulan | 1000 visit/bulan |
| YouTube Shorts | 100 view/hari | 1000 view/hari |
| WA/Telegram group | 50 member | 200 member aktif |
| Affiliate | 10 micro-affiliate | 50 micro-affiliate + 20 sales/bulan |
| Newsletter | 100 subscriber | 500 subscriber |
| Direct/Brand search | 50/bulan | 500/bulan | ---

## 9. Anti Scaled-Content-Abuse Gates

### 9.1 Hard rules (wajib, otomatis)

| Gate | Threshold | Tool |
|---|---|---|
| **Body uniqueness vs cluster siblings** | Jaccard < 0.55 | `qc-uniqueness.mjs` |
| **Local anchor diversity** | Setiap geo page harus sebut ≥2 fakta lokal spesifik (industri, nama tempat, kejadian) — bukan cuma kota | `from-template.mjs` validator |
| **Internal link diversity** | Cluster link ke ≥2 sibling, ≥1 money, ≥1 pillar | `mesh-build.mjs` |
| **Schema validity** | Semua page lulus JSON-LD validator | `jsonld-validate.mjs` |
| **Publish rate ramp** | Awal 3/hari, naik max 10/hari kalau index_rate_14d ≥85% | `ramp-gate.mjs` |
| **Manual action monitor** | Setiap harian, GSC "manual action" endpoint dicek | `monitor.mjs` |
| **Quality scoring (e-score)** | Composite: word_count(20%) + uniqueness(30%) + source_diversity(20%) + readability(15%) + schema(15%) ≥ 75 | `qc.mjs` extension |

### 9.2 Soft rules (judgement user)

- Jangan publish semua keyword approved sekaligus. **Publish by cluster**, bukan by global queue.
- Selingi money page + pillar page dengan cluster page (jangan 100 cluster berturut).
- Untuk geo termurah, **jangan publish 50 kota dalam 1 minggu**. Mix: 5-10 kota/minggu + 2-3 pillar/cluster.

### 9.3 Halt conditions

- Manual action di GSC → **STOP publish + email alert + freeze queue**.
- Index rate turun < 50% dalam 7 hari → freeze + audit.
- 3 artikel baru kena "Crawled – not indexed" → slow ramp ke 1/hari, audit.

---

## 10. Cadence 24/7

### 10.1 Daily (06:00 WIB via Coolify)

```
runner/daily.mjs
├─ flock
├─ publish.mjs --count=$(config.daily_count) [default 3]
│  ├─ flip draft→published
│  ├─ pnpm --filter landing build
│  ├─ seo/llms.mjs (regen llms.txt dari koleksi)
│  ├─ salin llms ke dist
│  ├─ wrangler pages deploy
│  └─ log deploy id
├─ indexnow.mjs --from=published_today
├─ bing-submit.mjs --from=published_today --limit=10
├─ gsc-inspect.mjs --recent=7d (URL 7 hari terakhir)
├─ remedy.mjs --auto
├─ ramp-gate.mjs (update daily_count kalau Senin)
└─ notify.mjs --summary
```

### 10.2 Weekly (Senin 09:00 WIB)

```
runner/weekly.mjs
├─ flock
├─ mining.mjs (GSC Search Analytics 28 hari → query×page → tambah ke keywords.geo.json approved queue)
├─ freshness.mjs (re-inject data harga + updated badge)
├─ mesh-build.mjs (re-build internal links untuk published page)
├─ report.mjs (kirim email ringkasan: published minggu ini, index rate, top query, money page impression, dsb)
└─ sitemap-fix.mjs (regen sitemap dengan lastmod jujur)
```

### 10.3 Monthly (tanggal 1, 10:00 WIB)

```
runner/monthly.mjs
├─ audit-geo-pages.mjs (sampling 10% artikel geo, cek uniqueness vs tetangga, deprecation candidates)
├─ audit-money-pages.mjs (cek CTR, position, schema validity)
├─ PR-pitch.mjs (generate draft pitch email untuk HARO/podcast)
└─ backup.mjs (tar repo konten + state.json → R2)
```

---

## 11. Scripts Catalog

| Path | Status | Tujuan | Token cost |
|---|---|---|---|
| `seo/from-template.mjs` | upgrade v1 | generator utama | 0 (no LLM) |
| `seo/qc.mjs` | ada | gate pipeline (sudah jalan) | 0 |
| `seo/qc-uniqueness.mjs` | **baru** | cek similarity vs siblings | 0 |
| `seo/jsonld-validate.mjs` | **baru** | validasi schema | 0 |
| `seo/mesh-build.mjs` | **baru** | build internal mesh | 0 |
| `seo/cluster-manifest.mjs` | **baru** | baca/tulis clusters.json | 0 |
| `seo/spec-filler.mjs` | **baru** | Groq fallback hemat | ≤400 tok |
| `seo/content-shared/*` | **baru** | FAQ/CTA/skeleton pool | 0 |
| `seo/indexnow.mjs` | ada, upgrade | ping IndexNow | 0 |
| `seo/bing-submit.mjs` | **baru** | Bing URL Submission | 0 |
| `seo/gsc-inspect.mjs` | **baru** | GSC URL Inspection | 0 |
| `seo/remedy.mjs` | **baru** | auto remedy untuk "not indexed" | 0 |
| `seo/ramp-gate.mjs` | **baru** | hitung & set daily_count | 0 |
| `seo/indexer.mjs` | **baru** | orchestrator index | 0 |
| `runner/Dockerfile` | **baru** | image Coolify | 0 |
| `runner/daily.mjs` | **baru** | pipeline harian | 0 |
| `runner/weekly.mjs` | **baru** | pipeline mingguan | 0 |
| `runner/monthly.mjs` | **baru** | pipeline bulanan | 0 |
| `runner/lib/*` | **baru** | helpers | 0 |
| `seo/distribute/yt-short-cue.mjs` | **baru** | generator script YouTube Shorts | ≤300 tok |
| `seo/distribute/newsletter-ping.mjs` | **baru** | trigger email digest | 0 |
| `seo/distribute/affiliate-stats.mjs` | **baru** | sync komisi affiliate | 0 | **Total script baru**: ~22 file. **Total token cost per bulan**: ~25K token (95% hemat vs v1).

---

## 12. Sprint Roadmap

### Sprint 3 (minggu 1-2): Coolify Engine + Indexer

> ⚠️ `[SUPERSEDED]` Angka "5/12" di bawah **basi** — dihitung sebelum board §14.2 jalan.
> Sumber kebenaran = **SNAPSHOT STATUS** di atas. Tabel ini dipertahankan sebagai riwayat,
> tapi kolom Status-nya sudah sebagian besar benar di §14.2 / SNAPSHOT. | Task | Output | Hari | Status |
|---|---|---|---|
| `runner/Dockerfile` + 3 task | Coolify Scheduled Task live | 2 | ⬜ butuh 2.1 (env Coolify) |
| `seo/cluster-manifest.mjs` + `clusters.json` (12 pillar) | manifest initial | 1 | ⬜ |
| `seo/from-template.mjs` v2 (baca cluster, auto-link) | upgrade deployed | 2 | ⬜ |
| `seo/qc-uniqueness.mjs` | gate aktif | 1 | ⬜ |
| `seo/indexnow.mjs` upgrade | `--since=24h` mode | 0.5 | 🟡 partly — `indexnow.mjs` sudah ada (v1), upgrade flag belum |
| `seo/bing-submit.mjs` | script jalan | 1 | ✅ **selesai 1 Okt** — 5 URL submit, kuota 98→93 |
| `seo/gsc-inspect.mjs` | script jalan | 1 | ✅ **selesai 1 Okt** — 5 URL ter-inspect, idempotent |
| `seo/remedy.mjs` | auto-retry logic | 1 | ✅ **selesai 1 Okt** — backoff 7 hari, 3 siklus → `needs_human`, sudah jadi tahap `indexer.mjs` |
| `seo/ramp-gate.mjs` + `seo/config.json` | config harian otomatis | 0.5 | ✅ **selesai 1 Okt** — 11 skenario uji, hold 3→3 |
| `runner/daily.mjs` + `weekly.mjs` + `monthly.mjs` | orchestration | 2 | 🟡 partly — mesinnya sudah ada (`seo/indexer.mjs` ✅ 1 Okt, 4 tahap + preflight), wrapper `runner/` + jadwal Coolify belum |
| Notify via Resend | email report | 0.5 | ⬜ (butuh `runner/lib/notify.mjs`) |
| Doc `docs/RUNNER_GUIDE.md` | runbook Coolify | 1 | ⬜ | **Outcome**: 3 artikel/hari auto publish + index + report. **Token cost: 0**.
**Bonus di luar daftar**: `seo/lib/gsc.mjs` (client GSC zero-dep) + `seo/scripts/gsc-doctor.mjs` (diagnosa 8 check) + sitemap didaftarkan ke GSC — semuanya prasyarat yang tidak ada di daftar awal.

### Sprint 4 (minggu 3-4): Topical Authority + Schema

| Task | Output | Hari | Status (2 Okt) |
|---|---|---|---|
| 12 pillar pages (1 artikel panjang per pilar) | pillar live | 5 | 🟡 **2/12** — 10 artikel belum ada |
| `seo/mesh-build.mjs` deployed | mesh 2-arah | 1 | ✅ **live** `db2bd240` |
| Schema `Service` + `AreaServed` untuk geo pages | schema lengkap | 1 | ✅ **live** — 44 money page; cabang `City` belum teruji karena 0 money page geo (§14.10) |
| `seo/jsonld-validate.mjs` di runner | validator aktif | 0.5 | ❌ **belum** — ada di `publish.mjs`, belum masuk image runner |
| Freshness loop di weekly.mjs | badge updated | 1 | ❌ **no-op** (`runner/weekly.mjs:101`) |
| Akuisisi Reddit + Quora kickoff | 2-3 post manual | 2 | ❌ belum |
| YouTube Shorts: 5 video pertama (script generator) | 5 video publish | 3 | ❌ belum |

**Outcome**: 12 pillar + cluster mesh hidup, schema lengkap, 1 video Shorts/minggu.

### Sprint 5 (minggu 5-8): Scale Akuisisi + GEO Monitoring

| Task | Output | Status (2 Okt) |
|---|---|---|
| Reddit/Quora/Forum program jalan (5-10 post/minggu) | baseline akuisisi ukur | ❌ belum |
| Affiliate program on-board 10 micro-affiliate | 10 affiliate aktif | ❌ belum |
| Newsletter 100 subscriber | digest mingguan jalan | ❌ belum (`RESEND_API_KEY` kosong) |
| YouTube Shorts 5/minggu | 20 video | ❌ belum |
| GEO manual prompt tracking (50 prompt × 4 engine) | baseline share-of-voice | ❌ belum |
| Index rate check: target ≥85% | data-driven decision naik ramp | ⏳ baseline **0%** · ukur 8 Okt (W.1) | **Outcome**: traffic SEO + akuisisi = 1000+ visit/bulan.

### Sprint 6 (minggu 9-12): PR + Scale + Optimize

| Task | Output | Status (2 Okt) |
|---|---|---|
| HARO/podcast: 1 pitch/minggu | 2 backlink DR>50 | ❌ belum |
| Guest post 1-2 | 2 backlink | ❌ belum |
| IndexNow + Bing → coverage check | index rate tuned | 🟡 script jalan, efek belum terukur |
| Pillar refresh: tambah cluster kalau mining GSC muncul intent baru | 10-20 cluster baru | ❌ menunggu data GSC |
| A/B test pillar layout + CTA | lift CTR | ❌ belum |

---

## 13. Definition of Done (Sprint 3)

- [ ] Coolify runner container running, 3 Scheduled Task trigger setiap hari
- [ ] `daily.mjs` publish 3 artikel/hari (default), build landing sukses, deploy ke Cloudflare Pages sukses
- [x] Bing URL Submission ping jalan (1 Okt: 5 URL, kuota 98→93). IndexNow ping setelah publish belum diuji bareng pipeline
- [x] GSC URL Inspection → `state.json` populated (1 Okt: 5 URL ter-inspect, `state.json.gsc.inspections` terisi)
- [ ] Weekly report email jalan tiap Senin pagi
- [x] `ramp-gate.mjs` set `daily_count` otomatis (1 Okt: hold 3→3 + alert `discovery_gap`; `publish.mjs` sudah baca config)
- [x] `qc-uniqueness.mjs` aktif di pipeline (1 Okt) — **tapi FAIL rate 21,1%** (12/57 draft diblokir), belum < 10%. Semua yang diblokir = varian `smm-panel-termurah-<kota>` yang isinya nyaris sama
- [x] Baseline index rate tercatat (1 Okt: **0/5 = 0%**, semua `not_discovered` — reviu mingguan menyusul, lihat W.1 §14.2)
- [x] Auto-remedi untuk URL tidak terindeks (`seo/remedy.mjs` + `state.remedyAlert` untuk notifikasi email)
- [ ] Zero manual action di GSC
- [ ] 12 pillar + 30 cluster published total, mesh hidup
- [ ] Akuisisi baseline: 200 visitor/bulan dari non-SEO channel
- [ ] Dokumentasi `docs/RUNNER_GUIDE.md` lengkap
- [ ] Tidak ada commit ke `app/` (sesuai §0.2 v1: konten tidak boleh trigger Coolify deploy app)

---

## 14. Yang Menunggu dari User

> **Struktur bagian ini**: **§14.1** = item yang menunggu keputusan/aksi Anda.
> **§14.2–§14.16** = **log bukti eksekusi** (deploy, uji, temuan) — arsip untuk audit,
> **bukan daftar tugas**. Penomoran sengaja tidak diubah supaya referensi silang di
> seluruh dokumen tetap utuh.

|  #  | Item |  Mengapa penting  | Status |
|---|---|---|---|
| 1 |  ~~**Pasang GSC Service Account**~~  | **SELESAI 1 Okt 2026** — SA `beriklanagency@project-e899f4b3-…` sudah Owner di `sc-domain:socio.id`; URL Inspection + Search Analytics diverifikasi live. Runbook: `docs/GOOGLE_CLOUD_SETUP.md`. Tinggal isi env Coolify |  ramp-gate sudah bisa ukur `index_rate`  | ✅ done |
| 2 | ~~**Bing Webmaster Tools**~~ | **SELESAI 1 Okt 2026** — key user dipakai, submit `{"d":null}`, kuota 100→98 (bukti `docs/GOOGLE_CLOUD_SETUP.md` §5.4). Free tier ternyata **100/hari + 3.100/bulan**, bukan 10/hari | ✅ done |
| 3 | **GROQ_API_KEY** (gratis) di Coolify env | Opsional, generator fallback hemat | 🟡 nice-to-have |
| 4 | **Akun Reddit/Quora** untuk program akuisisi | Manual dulu, bukan automasi | 🟡 soon |
| 5 | **Brand guideline** (logo, warna, voice) untuk YouTube Shorts | Produksi video | 🟡 soon |
| 6 | **Affiliate program design** (komisi %, dashboard) | Butuh sentuh app (sesuai §0.2 v1: butuh persetujuan eksplisit) | ⛔ blocker + approval |
| 7 | **Newsletter infrastructure decision**: pakai app endpoint (E1 v1) ATAU standalone di landing | E1 butuh sentuh app | ⛔ blocker + approval |
| 8 | **Budget** untuk Otterly.ai / Profound kalau GEO monitoring mau full otomatis | $249-$499/bulan | 🟡 opsional |
| 9 | ~~**Pasang GA4 (`G-MDJCW053XR`)**~~ | **SELESAI 2 Okt 2026 (deploy `966555ba`)** — injeksi landing, CSP, event taxonomy, Consent Mode v2, verifikasi 15/15. `app.socio.id` **sengaja tidak dilacak** (area login). Detail: §14.1 + §14.1a | ✅ done |

### 14.1 GA4 cross-property — `G-MDJCW053XR` (queued 1 Okt 2026)

Measurement ID sudah diberikan user. **Belum diimplementasikan** — statusquo: nol GA4 di seluruh source (`landing/src`, `app/src`). | Sub-item | File yang akan berubah | Detail tajam yang sudah dicek |
|---|---|---|
| GA4-1 Injeksi landing | `landing/src/layouts/Layout.astro` | ✅ done — loader `async` via JS, Consent Mode default **denied** dipush sebelum gtag.js; nol jejak kalau `PUBLIC_GA4_ID` kosong (build terverifikasi 0 gtag) |
| GA4-2 Injeksi app | — | ⛔ **dibatalkan** — user putuskan app.socio.id **tidak dilacak** (area login). Tidak ada `app/src/app.html` yang disentuh |
| GA4-3 **CSP landing** | `landing/public/_headers` | ✅ done — `connect-src` += `https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com` (tanpa ini gtag load tapi hitungan drop). `script-src` sudah ada dari AdSense |
| GA4-4 **CSP app** |  —  | ⛔ tidak perlu (app tidak dilacak) |  `connect-src 'self' https: wss:` sudah wildcard ✅ · **`script-src` belum** ada `https://www.googletagmanager.com` → **wajib ditambah**  |
| GA4-5 Event taxonomy | `landing/src/layouts/Layout.astro` | ✅ done — `page_view` (otomatis) · `generate_lead` (link ke `app.socio.id`) · `outbound_click` (app/WA/Telegram) · `scroll_depth` 25/50/75/100 (toleransi 1% di 100) · `select_promotion` (CTA utama). Nol dependency, inline, tidak kirim PII, `page_location` dibuang query string |
| GA4-6 Privasi | `landing` | ✅ dijaga — `page_location` tanpa query string, tanpa `user_id`, tanpa PII. Domain ini memang tanpa data identitas |
| GA4-7 Config via env | `.env.example` | ✅ done — `PUBLIC_GA4_ID=G-MDJCW053XR`. Kosong = **tidak render sama sekali** (build tanpa env → 0 gtag, 0 banner, 0 event — diverifikasi) |
| GA4-8 Consent mode | `landing/src/components/ConsentBanner.astro` | ✅ done — Consent Mode v2, default `denied`. 3 pilihan: **Terima semua** / **Analitik saja** (iklan tetap cookieless) / **Essential saja**. Pilihan disimpan di cookie + localStorage, delay 1,2 dtk agar tidak mengganggu LCP, `prefers-reduced-motion` dihormati, keyboard-accessible. **Bonus: loader AdSense ikut ditahan sampai consent `all`** (menutup gap compliance AdSense yang sudah berjalan tanpa banner) |
| GA4-9 Cross-domain |  —  | ⛔ tidak dipakai — hanya 1 host yang dilacak, jadi `linker` jadi konfigurasi mati |  Jika 1 property untuk 2 host, perlu **`linker`** biar session nyambung landing→app (konversi attributable). Kalau pisah property, tidak perlu  |
| GA4-10 Verifikasi | uji browser (Chromium/Playwright) | ✅ 15/15 check hijau (lihat §14.1a). Verifikasi produksi (Realtime GA4 < 60 dtk) setelah deploy | **Keputusan yang dibutuhkan user sebelum mulai** (default rekomendasi agent):
1. **1 property ( rekomendasi)** — `socio.id` + `app.socio.id` dalam 1 property, pisah lewat dimensi `host_name`, plus `linker`. Lebih gampang untuk revenue/conversion satu tempat.
   Alternatif: 2 property terpisah (landing = traffic SEO, app = funnel) → laporan lebih bersih tapi 2× upkeep + GA4 Data API butuh 2 `GA4_PROPERTY_ID`.
2. **Consent** — banner + Consent Mode v2 (default `denied`), atau full analytics tanpa banner (_deviation_, kompromi AdSense_ready tapi tidak privacy-safe).
3. **Apakah `app.socio.id` (area login) boleh di-track sama sekali** — kalau tidak, cukup landing + install di app hanya untuk halaman publik (login/register).


---

---

### 14.2 Papan Kemajuan Sprint 3 (WAJIB berurutan)

> ⚠️ `[SUPERSEDED]` Angka "17/21" **basi** — tidak pernah mencakup §6.2, §7, §8, Sprint 5–6.
> Sumber kebenaran = **SNAPSHOT STATUS** di bagian atas dokumen. (angka sebelumnya "13/17" dihitung sebelum 4 item Stage 4 masuk daftar).
> **Stage 0–3 + W.2 selesai & live. Stage 4 (4.1–4.4) selesai 4/4 dan LIVE (deploy `db2bd240` + `6c9a7ab9`). 4.1/4.2 tooling tanpa deploy.**
> Sisa: W.1 (menunggu 48-72 jam sejak submit sitemap/Bing), plus pekerjaan non-agent: keputusan 792 varian geo, 55 keyword unassigned, 10 artikel pilar.
> Ringkasan honest per tahap: §14.5.
> **Semua item yang bisa dikerjakan tanpa keputusan/env user sudah habis** (Stage 1 + 3.4).
> **`2.1` SUDAH SELESAI** (tanpa perlu kamu buka UI): project Coolify `socio-seo` dibuat terpisah + 9 env var terisi — runbook `docs/COOLIFY_SEO_PROJECT.md`.
> GA4 sudah dikerjakan (landing-only, consent banner, §14.1) — **menunggu izin deploy landing**.
> **W.2 + GA4 sudah DEPLOY** ke produksi (`966555ba`, 1 Okt 15:06 UTC) dan diverifikasi live.
> **Aturan main**: satu item selesai → ubah `[ ]` jadi `[x]` + isi kolom Bukti di tabel ini, **dan** tambah 1 baris di `docs/AGENT_MEMORY.md`. Lanjut ke item berikutnya setelah item sekarang punya bukti angka nyata (bukan klaim).

**Stage 0 — Fondasi credential**

|  #  | Item |  Status  | Bukti angka/output |
|---|---|---|---|
| 0.1 | GSC SA + property `sc-domain:socio.id` | `[x]` | `sites.list` 2 property · inspect `PASS/Submitted and indexed` |
| 0.2 | Bing Webmaster API key | `[x]` | submit `{"d":null}` · kuota `100→98→93` |
| 0.3 | `seo/scripts/gsc-doctor.mjs` | `[x]` | 8 check `[ OK ]`, exit 0 |
| 0.4 | Env lokal (Bing key + `GSC_SA_FILE`) | `[x]` | `.env` gitignored, doctor jalan tanpa argumen |
| 0.5 | Sitemap GSC didaftarkan | `[x]` | submit `sitemap-index.xml` → 204, `errors: 0`, 9→10 sitemap | **Stage 1 — Agent, tanpa blokir** | # | Item | Status | Bukti angka/output |
|---|---|---|---|
| 1.1 | `seo/lib/gsc.mjs` | `[x]` | zero-dep; `sites.list` + inspect + SA 28d live, `node --check` OK |
| 1.2 | `seo/gsc-inspect.mjs` | `[x]` | 5 URL ter-inspect, run 2 skip (cache 24j) → idempotent |
| 1.3 | Baseline `index_rate` | `[x]` | **0/5 (0%)** — semua `not_discovered` (root cause di §14.4) |
| 1.4 | `seo/bing-submit.mjs` | `[x]` | 5 URL disubmit · kuota `98→93` · guard trailing slash terbukti |
| 1.5 | `seo/config.json` + `seo/ramp-gate.mjs` | `[x]` | 11 skenario uji · run nyata **hold 3→3 + `discovery_gap`** · `publish.mjs` default baca config |
| 1.6 | `seo/indexer.mjs` (orchestrator) | `[x]` | 4 tahap berurutan via subprocess · `--dry-run`/`--only`/`--skip`/`--days`/`--ramp` · preflight `--auth-only` (default ON saat live) · 4 exit code diuji (0/1/0/1) · run live penuh `ok=bing,gsc,ramp` → `state.indexer.lastRun` | **Stage 2 — Butuh user (blocking)** | # | Item | Status | Kenapa blocking |
|---|---|---|---|
| 2.1 | Isi env Coolify prod (GSC block + `BING_API_KEY`) | `[x]` **1 Okt** | ✅ project `socio-seo` (uuid `b8kxfwt22lswjkyrefw8fayl`, env id 5) + 9 env var project-level via API resmi Coolify. Runbook: `docs/COOLIFY_SEO_PROJECT.md` |
| 2.2 | Keputusan GA4 | `[x]` **1 Okt** | ✅ user: **1 property** · **consent banner + Consent Mode v2** · **app.socio.id tidak dilacak sama sekali**. Implementasi di §14.1 | **Stage 3 — Setelah Stage 1 + 2.1 beres** | # | Item | Status | Output |
|---|---|---|---|
| 3.1 | GA4 (§14.1) | `[x]` **live 1 Okt** | ✅ 14/14 uji browser hijau (consent denied → 0 request sebelum accept → gtag setelah accept → banner hilang → tidak muncul lagi setelah reload → kill switch `?consent=off` → consent parsial). CSP `connect-src` += GA4. Halaman `/privacy` baru + link footer. **Deploy `966555ba` live**, 11/11 URL smoke 200, uji browser produksi: banner muncul, **0 request sebelum accept**, gtag termuat setelah accept, 0 console error/CSP violation |
| 3.2 | `runner/` + image Coolify | `[x]` **1 Okt** | ✅ app `socio-seo-runner` (uuid `c9iqug5vvi9kjywt1fn6xnsc`) di project `socio-seo`, image ter-build dari repo **private** via deploy key, CMD idle (`RestartCount=0`), tanpa domain/port. Detail + 3 jebakan: `docs/COOLIFY_SEO_PROJECT.md` §6 |
| 3.3 | Coolify Scheduled Task | `[x]` **1 Okt** | ✅ 2 task live: `seo-daily-index` (`23 * * * *` UTC = 06:00 WIB) + `seo-weekly` (`2 2 * * 1` UTC = Senin 09:00 WIB). Uji `execute` manual → **status `success`**, 4,28 dtk, `exit 0`. Task monitor 15 mnt tidak dibuat (idle container + preflight sudah cukup; monitor = item opsional Sprint 6) |
| 3.4 | `seo/remedy.mjs` | `[x]` | klasifikasi `indexed`/`not_indexed`/`not_discovered`/`blocked`/`unknown` · backoff 7 hari · 3 siklus → `needs_human` + `state.remedyAlert` · 8 skenario uji · sudah jadi tahap ke-4 di `indexer.mjs` · bonus: repair `indexnow.mjs` (no-op kini exit 0) + flag `--urls=` di `bing-submit.mjs` |
| 3.5 | Runbook operasional | `[x]` sebagian — `docs/COOLIFY_SEO_PROJECT.md` (akses server, token, deploy key, env, image, task, cheat sheet, larangan). `docs/RUNNER_GUIDE.md` belum dipisah | **Stage 4 — Sprint 4 (topical authority)** — *NEXT, urut dari atas* | # | Item | Status | Kenapa penting |
|---|---|---|---|
| 4.1 | `seo/qc-uniqueness.mjs` (gate anti-duplicate) | `[x]` **1 Okt** | ✅ zero-dep (TF-cosinus + shingle-4 + overlap, prefilter inverted index). **1.000 file diuji 2 detik.** Terpasang di `publish.mjs` per-slug (fail-closed). Angka: korpus 62 file → **11 FAIL** (semua pasangan geo-kota) · 57 draft → **12 diblokir = FAIL rate 21,1%** |
| 4.2 |  `seo/cluster-manifest.mjs` + `clusters.json` (12 pilar)  | `[x]` **1 Okt** |  ✅ manifest dibangun dari data nyata (queue 1.077 + cities 72 + MDX). Cakupan **94,9%**. Temuan: **P10 punya 864 cluster = 12 varian/kota (rencana 1/kota) → 792 excess**; **10/12 artikel pilar belum ada**; **55 keyword unassigned** (spotify/telegram/reels/live/facebook tidak punya slot di pillar map §1.2)  | Topical authority: tanpa manifest, artikel tidak tahu topiknya dan hanya jadi scatter |
| 4.3 |  `seo/jsonld-validate.mjs` + schema `Service`/`ItemList`  | `[x]` **1 Okt — LIVE `db2bd240`** |  ✅ validator zero-dep (56 halaman · 360 blok · **0 error / 0 warning**, `--strict` exit 0) + `Service`+`AreaServed` di 44 money page, `ItemList` di `/blog/`, `CollectionPage`+`ItemList` di `/layanan`, `WebPage` di `/` + `/privacy`. Wired fail-closed post-build di `publish.mjs`  | Rich result + AEO/GEO (sinyal untuk AI answer engine) |
| 4.4 |  `seo/mesh-build.mjs` (link 2-arah)  | `[x]` **1 Okt — LIVE `db2bd240`** |  ✅ mesh 2-arah antar artikel published (pilar → sibling → kota tetangga se-provinsi), kurasi `related[]` lama dipertahankan, 5 artikel published jadi mesh penuh 3-slot, idempoten (2x jalan = 0 perubahan), 0 broken link, ter-render cocok di `dist/`. Wired di `publish.mjs` sebelum build  | Authority cluster + sinyal link graph ke crawler |

**Butuh menunggu waktu (blocked by waktu, bukan kode)**

| # | Item | Status | Kapan |
|---|---|---|---|
| W.1 | VerifikasiEfek sitemap + Bing: `node seo/gsc-inspect.mjs --all --force` | `[ ] menunggu` | 48-72 jam setelah 1 Okt 09:42 UTC |
| W.2 | Crawl path money page → artikel (mesh money→blog) | `[x]` **live 1 Okt** | ✅ `RelatedArticles.astro` dapat **fallback artikel terbaru** + link "Semua artikel → /blog/"; homepage dapat section **Artikel terbaru** (3 terbaru). **41 money page**: dari 0 link artikel → 3 link artikel + 3 link `/blog`; homepage 3+3. Deploy `966555ba` |
| ~~W.3~~ | ~~`/blog/` list 5 artikel~~ | ✅ **TIDAK BUG** (koreksi 1 Okt) | `/blog/` page 1 = 4 artikel + pagination → `/blog/page/2/` berisi artikel ke-5. Semua 5 terjangkau; klaim lama salah karena hanya cek page 1 |

### 14.3 Temuan 1 Okt 2026 — SEMUA sitemap terdaftar di GSC MATI

`listSitemaps()` dari `seo/lib/gsc.mjs` menunjukkan GSC punya **9 sitemap terdaftar, 9-duanya tidak bisa diambil** (status HTTP live di 1 Okt 2026): | Sitemap terdaftar di GSC | Status live |
|---|---|
| `https://socio.id/post_tag-sitemap.xml` | 404 |
| `https://socio.id/category-sitemap.xml` | 404 |
| `https://socio.id/page-sitemap.xml` | 404 |
| `https://socio.id/post-sitemap.xml` | 404 |
| `https://socio.id/sitemap.xml` | 404 |
| `https://socio.id/sitemap_index.xml` (underscore, era Yoast) | 404 |
| `http://socio.id/sitemap_index.xml` | 301 |
| `http://www.socio.id/sitemap_index.xml` | 301 |
| `https://landing.socio.id/sitemap.xml` (subdomain lama) | 000 (tidak resolve) | Yang **hidup**: `https://socio.id/sitemap-index.xml` (hyphen) → 200, 54 URL — tapi **tidak terdaftar** di GSC.

**Dampak**: sejak migrasi ke sitemap index baru, GSC hanya menemukan halaman lewat crawl, bukan lewat sitemap. Halaman barupublished butuh lebih lama untuk ditemukan (memperlambat ramp-gate).

**Fix** (2 panggilan API, `submitSitemap()` sudah ada di `seo/lib/gsc.mjs`):
1. Submit `https://socio.id/sitemap-index.xml`
2. Hapus 9 entri mati (via `DELETE /webmasters/v3/sites/sc-domain:socio.id/sitemaps/<path>`) — biar GSC tidak-reported error terus

Menunggu persetujuan user sebelum dijalankan (menulis ke property GSC produksi).

### 14.4 Temuan 1 Okt 2026 — 5 artikel published SEMUA `not_discovered` (baseline index_rate 0%)

`node seo/gsc-inspect.mjs --all` → **0/5 terindeks**. Rinciannya: |  URL  | verdict |  coverageState  | fetch |
|---|---|---|---|
| `/blog/apa-itu-smm-panel/` | NEUTRAL | URL is unknown to Google | `*_STATE_UNSPECIFIED` |
| `/blog/smm-panel/` | NEUTRAL | URL is unknown to Google | `*_STATE_UNSPECIFIED` |
| `/blog/smm-panel-indonesia/` | NEUTRAL | URL is unknown to Google | `*_STATE_UNSPECIFIED` |
| `/blog/cara-menambah-followers-instagram/` | NEUTRAL | URL is unknown to Google | `*_STATE_UNSPECIFIED` |
| `/blog/modal-jualan-followers/` | NEUTRAL | URL is unknown to Google | `*_STATE_UNSPECIFIED` | `robotsTxtState` = UNSPECIFIED (bukan `DISALLOWED`) → **bukan masalah robots.txt**. Halaman 200 ✅, `<meta name="robots" content="index, follow">` ✅, canonical ✅, dan URL-nya **sudah ada di `sitemap-0.xml`** ✅. Artinya: Google **tidak pernah menemukan** URL-nya sama sekali — masalah *discovery*, bukan kualitas konten.

**Penyebab (3, semuanya terverifikasi):**

1. **Sitemap tidak pernah terdaftar di GSC** → semua 9 entri lama mati (§14.3). **Sudah diperbaiki 1 Okt 09:42 UTC**: submit `https://socio.id/sitemap-index.xml` → 204, `isPending: true`, `errors: 0`. Efeknya baru terasa 1-3 hari.
2. **Money page tidak pernah link ke artikel** — dicek live: `/`, `/smm-panel-terbaik.html`, `/layanan-sosmed-termurah.html`, `/smm-reseller-panel-termurah` → **0 link** ke `/blog/`. Mesh yang diclair v1 "artikel→money" ternyata **tidak ada sisi money→blog**.
3. Crawl path blog hanya lewat navbar: `/` → `/blog` → artikel → `/blog/page/2/`. (Koreksi 1 Okt: `/blog/` **tidak** menghilangkan artikel — pagination sudah benar, diverifikasi ulang via curl ke kedua halaman.)

**Konsekuensi untuk ramp-gate (item 1.5):** `index_rate` mentah akan 0% selama 1-3 hari pertama setelah submit sitemap. Kalau ramp-gate memakai angka mentah, `daily_count` akan turun ke floor 1 dan plan berhenti. Jadi: rate dihitung dari URL `indexed` ÷ URL `discovered` (exclude `not_discovered`), plus kondisi khusus `not_discovered` → trigger remedy discovery (re-ping IndexNow + submit ulang sitemap), bukan penalti ramp.

**Tindakan lanjutan (belum dikerjakan, menunggu urutan):**
- [ ] Verifikasi ulang setelah 48-72 jam: `node seo/gsc-inspect.mjs --all --force` →→ hope `not_discovered` turun
- [ ] Tambah blok "artikel terbaru" di money page / footer agar ada crawl path money→blog (mesh 2-arah, plan Sprint 4 §6)
- [ ] Perbaiki `/blog/` supaya 5 artikel lengkap muncul
- [ ] Kirim 5 URL ke Bing (item 1.4) sebagai jalur discovery kedua

### 14.1a Bukti uji GA4 + consent (Chromium/Playwright, 1 Okt 2026)

15 check, semua hijau (build `landing/dist` disajikan sebagai statis di port lokal): | # | Check | Hasil |
|---|---|---|
| 1 | Banner muncul | ✅ setelah ~1,2 dtk |
| 2 | `dataLayer` awal | ✅ `["consent"]` — default **denied** yang pertama |
| 3 | **Request GA4 sebelum accept** | ✅ **0** — tidak ada request sama sekali |
| 4 | `gtag.js` setelah accept | ✅ termuat |
| 5 | `consent update` | ✅ `analytics/ad/ad_user_data/ad_personalization = granted` |
| 6 | Banner hilang setelah accept | ✅ |
| 7 | Banner **tidak muncul lagi** setelah reload | ✅ (pilihan persist di cookie + localStorage) |
| 8 | Kill switch `?consent=off` | ✅ `analytics_storage: denied`, `gtag` **tidak** dimuat, banner tidak muncul (default dipaksa di head script, bukan di banner — kalau hanya di banner, storage lama sempat terbaca granted) |
| 9 | Scroll depth | ✅ 25/50/75 terkirim (100% butuh scroll penuh — uji hanya mencapai 87% karena body `overflow: clip visible`, jadi **bukan bug**) |
| 10 | Consent parsial "Analitik saja" | ✅ `analytics granted` + `ads denied` → GA4 jalan, AdSense **tidak** dimuat |
| 11 | Env gate | ✅ build tanpa `PUBLIC_GA4_ID` → 0 gtag, 0 banner, 0 event (nol overhead) |
| 12 | `/privacy` | ✅ halaman dibuat + masuk sitemap + link dari banner & footer | **Yang berubah di produksi nanti (perlu izin deploy):** banner consent baru, **loader AdSense ditahan sampai consent `all`**, CSP `connect-src` diperluas, halaman `/privacy` baru.

### 14.5 Audit status jujur (1 Okt 2026) — apa yang benar-benar selesai

| Fase | Status | Bukti / yang kurang |
|---|---|---|
| **Stage 0 — credential** | ✅ **selesai** | GSC `sc-domain:socio.id` + SA Owner, Bing key live, 9 env var Coolify, sitemap terdaftar |
| **Stage 1 — engine index** | ✅ **selesai** | `gsc.mjs`, `gsc-inspect`, `bing-submit`, `config.json`+`ramp-gate`, `indexer` — semua live & teruji |
| **Stage 2 — keputusan user** | ✅ **selesai** | env Coolify diisi agent; 3 keputusan GA4 dijawab user |
| **Stage 3 — runner + GA4** | ✅ **selesai & LIVE** | image Coolify + 2 Scheduled Task (`success`), GA4 + consent + `/privacy` deploy `966555ba` |
| **W.2 — crawl path** | ✅ **live** | 41 money page 0→3 link artikel; homepage + section Artikel terbaru |
| **Stage 4 — Sprint 4** | ✅ **4/4** (kode) | ✅ `qc-uniqueness` (gate aktif) · ✅ `cluster-manifest` + `clusters.json` · ✅ `jsonld-validate` (+ schema Service/ItemList) · ✅ `mesh-build` (2-arah, idempoten). **4/4 selesai dan 4.3 + 4.4 sudah LIVE** di Cloudflare Pages `socio-id` (deploy `db2bd240`, 1 Okt 23:19 WIB). 4.1/4.2 memang tidak perlu deploy (tooling) |
| **W.1 — verifikasi** | ⏳ menunggu | cek ulang 8 Okt (48-72 jam setelah sitemap + deploy `966555ba`) |
| **Publish otomatis** | ⬜ **sengaja belum** | butuh repo konten terpisah + kredensial CF Pages. Jalur kodenya sudah ada sebagai no-op eksplisit di `daily.mjs` — **tidak ada publish diam-diam** |
| **Email laporan** | ⬜ opsional | `notify.mjs` sudah benar, tapi `RESEND_API_KEY` + `NOTIFY_EMAIL_*` belum diisi di Coolify |
| **Sprint 5 (GEO/acquisition)** | ⬜ **belum mulai** | butuh Reddit/Quora (manual), YouTube Shorts (butuh brand guideline), budget Otterly.ai |
| **Sprint 6 (PR/backlink)** | ⬜ **belum mulai** | PR manual, butuh volume artikel lebih dulu |
| **Affiliate & newsletter** | ⛔ **butuh approval** | §14 item 6 & 7 — menyentuh `app/`, butuh persetujuan eksplisit user |

**Angka jujur yang sering disalahpahami:**
- Skrip di §11: **17 ada / 5 belum** (`mesh-build`, `spec-filler`, `content-shared/*`, `runner/monthly.mjs`, `seo/distribute/*` ×3) — `qc-uniqueness`, `cluster-manifest`, `jsonld-validate` sudah ada.
- DoD §13: **6 dari 14 tercentang**. Yang belum: publish otomatis, email mingguan, `qc-uniqueness`, 12 pillar, akuisisi baseline, `RUNNER_GUIDE.md` terpisah.
- Artikel published: **5** (target Sprint 4 = 12 pillar + 30 cluster). Queue: 1.015 pending + 57 draft.
- AdSense: **belum pernah live** (`PUBLIC_ADSENSE_CLIENT` + slot IDs kosong di `.env`).

**Urutan kerja berikutnya:** ~~4.1 → 4.2 → 4.3 → 4.4~~ **selesai semua (kode)** → ~~(1) izin deploy 4.3 + 4.4~~ **selesai 1 Okt, deploy `db2bd240`** → (2) W.1 otomatis setelah 48-72j → (3) publish otomatis kalau repo konten siap → (4) `from-template.mjs` v2 yang mengonsumsi manifest untuk auto-link `## Lihat juga` di body (bukan cuma footer/related block).

### 14.6 Bukti 4.1 — `seo/qc-uniqueness.mjs` (1 Okt 2026)

**Kenapa file terpisah dari `qc.mjs`:** `qc.mjs` memeriksa satu draft (Markdown valid, FAQ, broken link) saat penulisan manual. Yang berbahaya bukan satu draft mirip satu draft, tapi **1.015 artikel queue yang semuanya template sama** — itu yang bikin Google menandai *scaled content abuse*. Gate ini menilai **seluruh corpus** dan dipakai sebelum publish.

**Cara kerja (zero dependency):**
1. Ambil corpus MDX → baca `title` + body; buang frontmatter, blok kode, link syntax, URL, markdown, angka.
2. Tokenisasi + buang stopword ID/EN (tapi **jaga** kata niche: smm/panel/follower/tiktok/reseller/…).
3. **TF-cosinus** (utama) + **shingle-4 Jaccard** (menangkap urutan identik) + **overlap kata** → skor gabungan `0,6·cos + 0,25·jac + 0,15·ovl`.
4. Tabrakan exact: **judul duplikat** (normalisasi case).
5. Konteks **klaster** dari `queue.json` — dua artikel di klaster sama wajib beda; lintas klaster (mis. 2 panduan kota berbeda) boleh mirip.

**Skala — ini yang bikin gate bisa dipakai:** cosine penuh di 1.000 file = 1,1 juta pasang. Solusinya **prefilter inverted index** atas token langka + cap 40 dokumen per token umum (deterministik, urut slug). Hasil: **1.000 file dalam 2 detik**, korpus asli 62 file **0,4 detik**.

**Hasil audit corpus sekarang (62 file):**
- **11 pasang FAIL** — seluruhnya pasangan `smm-panel-termurah-<kota>` (mis. `cilegon` ⇄ `pekanbaru`, cosine 0,825)
- 149 pasang WARN
- 0 judul duplikat
- Audit **57 draft** → **12 diblokir = FAIL rate 21,1%** (target DoD < 10%)

**Artinya:** gate langsung membuktikan dugaan plan §1.2 — varian geo-kota memang duplikat. Root cause-nya isi yang sama dengan nama kota ditukar. Perbaikannya bukan menurunkan ambang, tapi **diferensiasi isi per kota** (data lokal, harga riil, kasus lokal) — itu pekerjaan Sprint 4/5.

**Integrasi:** `publish.mjs` memanggil gate **per slug** sebelum flip (`--skip-uniqueness` untuk override manual yang disengaja). Kalau gate global, korpus warisan akan memblokir *semua* publish selamanya.

### 14.7 Bukti 4.2 — `seo/cluster-manifest.mjs` + `seo/clusters.json` (1 Okt 2026)

Manifest **dibangun dari data nyata**, bukan dari daftar harapan di §1.2. Sumber: `queue.json` (1.077 keyword) + `cities.json` (72 kota reviewed) + file MDX yang benar-benar ada.

```
cakupan            : 1.022 / 1.077 ter-assign (94,9%) · 55 unassigned · 864 geo → P10
artikel pilar      : 2/12 punya file (2 live: smm-panel, cara-menambah-followers-instagram)
P10 (geo)          : 72 kota · rata-rata 12 varian/kota (rencana §1.2 = 1/kota) → 792 excess
```

**Temuan yang mengubah prioritas (bukan cuma laporan):**

1. **P10 memegang 80% corpus.** 864 dari 1.077 keyword (80%) adalah varian geo, dan tiap kota punya **12 varian** (`smm-panel-jakarta`, `-termurah-`, `-terpercaya-`, `-umkm-`, …). Rencana §1.2 hanya meminta **1 short page per kota** (72 artikel). Artinya **792 artikel geo excess** — persis bahan *scaled content abuse* — tidak ada bedanya dengan rencana §1.2. Keputusan yang dibutuhkan: merge per kota (1 halaman lengkap) vs tetap 12/kota tapi **diferensiasi isi per varian**.
2. **10 dari 12 artikel pilar belum ada.** Pilar adalah tulang punggung mesh; tanpa file pilar, cluster page tidak punya tujuan link yang kuat. Urutan yang masuk akal: P1 & P3 sudah live → bikin P2 (`reseller-smm-panel`) dan P4 (`harga-smm-panel`) duluan karena intent-nya sudah ada di queue.
3. **P5 / P6 / P11 tidak punya cluster sama sekali** (`smm-panel-terpercaya`, `keamanan-smm-panel`, `affiliate-smm-panel`) — keyword-nya memang tidak ada di queue. Pilar tanpa keyword = perlu riset keyword dulu, atau dibuang.
4. **55 keyword unassigned**, terkelompok: reels 10 · facebook 8 · telegram 6 · spotify 12 · live 5 · lain-lain 2. **Pillar map §1.2 tidak punya slot untuk Spotify/Telegram/Reels/IG-live** → perlu keputusan: tambah pilar (P13+) atau gabung ke pilar terdekat.

**Cara pakai:**
```bash
node seo/cluster-manifest.mjs            # audit + laporan cakupan & masalah
node seo/cluster-manifest.mjs --build    # tulis/refresh seo/clusters.json
node seo/cluster-manifest.mjs --strict   # exit 1 kalau manifest rusak (CI)
node seo/cluster-manifest.mjs --json     # untuk/from-template.mjs v2
```
`clusters.json` berisi per pilar: `slug`, `title`, `keyword_root`, `money_links`, `clusters` (slug list), `clusters_meta` (status queue, punya artikel, draft, geo, provinsi), plus `totals`, `p10_city_report`, `unassigned_groups`. Build bersifat idempoten (hanya `generated_at` berubah).

**Selesai 1 Okt:** `mesh-build.mjs` (4.4) menulis link antar artikel ke frontmatter `related[]`, dan template sudah merendernya sebagai blok "Lanjut baca ini" (lihat §14.9). **Belum dikerjakan (terus terang):** `from-template.mjs` v2 yang *konsumsi* manifest untuk menyisipkan anchor teks varied **di dalam body artikel** (§1.4 "interlink natural di body") — mesh 4.4 sekarang masih ter-render sebagai blok related di akhir artikel, bukan inline di paragraf.

### 14.8 Bukti 4.3 — `seo/jsonld-validate.mjs` + schema Service/ItemList (1 Okt 2026)

**Kenapa tidak pakai `schema-dts`** (plan §5.3 menyebutnya): itu dependency baru di image runner yang sengaja zero-dep. **Kenapa tidak Rich Results Test**: tidak ada endpoint publik untuk validasi massal (1 request/halaman, prone rate limit). Jadi validasi lokal dengan tabel field wajib per `@type` — cukup untuk menangkap kesalahan nyata.

**Yang divalidasi:** JSON valid · `@context` schema.org · `@type` dikenal · field wajib per tipe · tidak ada placeholder (`TODO`/`lorem`/`xxx`) · `@id`/`url`/offers URL host sama dengan canonical · `AggregateRating` (di `Product.aggregateRating` **dan** `offers.aggregateRating`) punya `ratingValue` 1-5 + `reviewCount` > 0 · matriks coverage vs target plan §5.1.

**Hasil sekarang: 56 halaman · 360 blok · 0 ERROR · 0 WARNING** (`--strict` exit 0).

**Schema yang ditambahkan (belum deploy):**
| Halaman | Schema baru | Kenapa |
|---|---|---|
| 44 money page | `Service` + `AreaServed` + `provider` + `offers` | Money page = halaman **penawaran jasa** → `Service` paling tepat (plan §5.1). `AreaServed`: `City`+provinsi kalau slug geo, `Country` kalau tidak. **`AggregateRating` SENGAJA tidak ada** — rating palsu melanggar pedoman Google |
| `/blog/` | `ItemList` (semua artikel) | `page/2` sudah punya, page 1 tidak → inkonsisten; `ItemList` juga syarat plan §5.1 untuk halaman daftar |
| `/layanan` | `CollectionPage` + `ItemList` (kategori) | Ini halaman **indeks** katalog, bukan satu produk → `Product` akan salah merepresentasi isi |
| `/` | `WebPage` (+ `primaryImageOfPage`) | Sebelumnya root URL hanya terbaca sebagai `WebSite` |
| `/privacy` | `WebPage` | Halaman legal = dokumen | **Temuan validator yang membetulkan klaim plan:** plan §5.1 menyatakan artikel "✅ semua (sudah ada)" termasuk `Person` + `SpeakableSpecification` — **ternyata tidak ada sebagai node top-level**, hanya nested di `Article.author`/`Article.speakable`. Yang valid secara schema, tapi validator pertama saya salah-hitung (hanya top-level) → false warning. Validator diperbaiki supaya menghitung type nested.

**Wiring:** `publish.mjs` menjalankan `node seo/jsonld-validate.mjs --strict` **sesudah build, sebelum deploy**, dan **fail-closed** — schema rusak menahan deploy (rich result hilang = traffic hilang tanpa ada yangyzedah). Override: `--no-deploy` lalu deploy manual setelah dicek.

**Belum dikerjakan:** `AggregateRating` asli (butuh data review nyata — tidak boleh dikarang), `Product`+`Offer` untuk artikel reseller (butuh artikel reseller live dulu), dan `Service`+`AreaServed` untuk **artikel blog geo** (semua artikel geo masih draft).

### 14.9 Bukti 4.4 — `seo/mesh-build.mjs`, internal mesh 2-arah (1 Okt 2026)

**Yang diimplementasikan (plan §6.1 + aturan mesh §1.3).** Untuk tiap artikel **published**, `related[]` diisi maksimal 3 slot — batas itu bukan pilihan saya: `landing/src/content.config.ts` menetapkan `related: z.array(reference("blog")).max(3)`, jadi lebih dari 3 akan gagal build. Urutan prioritas:

1. **Pilar** — dari `seo/clusters.json` (peta slug → pilar, 1.022 keyword, 12 pilar).
2. **Sibling** — 1-2 artikel published lain di pilar sama, diurutkan kategori sama dulu.
3. **Kota tetangga se-provinsi** — khusus artikel geo, mis. `smm-panel-bogor` → artikel published lain di Jawa Barat.
4. **Fallback** — artikel published lain yang belum dipakai (hanya kalau mesh belum penuh).

**Aturan keras: target harus published.** `blog/[slug].astro` memfilter `!data.draft` di `getStaticPaths`, jadi artikel draft tidak punya halaman — link ke draft = broken link produksi. Karena itu 54 artikel geo yang masih draft **tidak** boleh jadi target, dan aturan "kota tetangga" otomatis diam sampai geo artikel mulai dipublish.

**Temuan penting — sumber data geo tidak ada di manifest.** `clusters.json` → `clusters_meta` hanya punya `slug/keyword/status/hasArticle/draft/priority`; **tidak ada `geo` maupun `provinsi`**, meskipun 864 cluster geo ada di P10. Sumber satu-satunya yang punya `provinsi` adalah `seo/cities.json` (72 kota, 33 provinsi), jadi kota diturunkan dari suffix slug (`smm-panel-termurah-jakarta` → `jakarta` → DKI Jakarta). Deteksi memuat 54 dari 62 artikel dengan provinsi yang benar — termasuk yang lintas provinsi (Tangerang → Banten, bukan Jawa Barat).

**Kurasi manusia tidak ditimpa diam-diam.** Percobaan pertama membiarkan `related[]` eksisting digantikan total, dan itu menimpa link yang sengaja dipilih: `smm-panel` kehilangan `smm-panel-indonesia` (topik terdekat) hanya karena sibling diurutkan alfabetis. Aturan sekarang **mempertahankan** related eksisting selama targetnya masih published, lalu melengkapi slot sisa; `--reset` dipakai kalau memang mau hitung ulang dari nol.

**Dua bug yang tertangkap sebelum sampai disk (dan satu yang sampai merusak file).**

- *Duplikat slot*: aturan pilar tidak mengecek `picked.includes()`, jadi `smm-panel` masuk dua kali (sekali dari kurasi, sekali dari aturan pilar) → link kembar. Sekarang ada guard output: artikel dengan `related[]` duplikat ditandai `invalid`, tidak ditulis, dan `mesh-build` keluar dengan exit 4.
- *`---` ikut terk Regex*: pola item list lama `\n[ \t]*-[ \t]*[^\n]*` menganggap baris penutup frontmatter `---` sebagai list item (`-` + `--`), sehingga **pagar `---` terhapus** dari 5 file MDX published. Ini merusak frontmatter sampai build mustahil. File sudah dipulihkan lewat `git checkout` (diff saat itu hanya `+1/-1 baris`, jadi tidak ada kerja lain yang hilang), regex diperbaiki menjadi `\n[ \t]+-[ \t]+` (wajib spasi setelah dash), dan sekarang ada guard berlapis: file dengan pagar `---` bukan 2 barulah ditolak (exit 3), dan hasil tulis diverifikasi ulang (pagar utuh + `related[]` terbaca sama) sebelum ditimpa.

**Link 2-arah dijamin, bukan sekadar hopes-and-prays.** Greedy picking tidak menjamin A→B berarti B→A karena kandidat A dan B berbeda. Pass resiprokal (fixpoint, maks 3 putaran) membalas setiap edge yang belum dibalas selama slot target masih cukup. Edge yang tidak bisa dibalas karena slot penuh dilaporkan sebagai `needs_manual_backlink` — bukan dipaksa, karena memaksanya berarti mengorbankan sibling yang lebih relevan. Pada korpus 5 artikel hasilnya `+0 edge` (semua sudah simetris) dan tidak ada back-link manual.

**Verifikasi (semua dijalankan, bukan asumsi).**

| Uji | Hasil |
|---|---|
| Laporan korpus nyata (5 published) | 5 artikel, `0 tanpa mesh`, `0 published tanpa pilar`, 0 duplikat |
| Tulis + jalankan lagi | `0 artikel akan berubah` (idempoten), 5/5 `[sama]` |
| Diff setelah tulis | **insert-only**: 5 file, 8 baris masuk, 0 dihapus |
| Pagar frontmatter | 2 per file (5/5 utuh) |
| `astro build` | 56 halaman sukses — `reference("blog")` resolve semua |
| HTML ter-render | related[] di `dist/` **cocok persis** dengan mesh yang dihitung, 5/5 artikel |
| Broken link internal | 0 (semua `/blog/*` yang dirujuk punya halaman) |
| `jsonld-validate --strict` | PASS, 0 error |
| Aturan "kota tetangga" | terbukti di korpus sintetis: neighbor se-provinsi beda pilar masuk sebagai `kota tetangga (Bogor)`, bukan sibling |
| Draft | tidak tersentuh (`draft: true` utuh, exit 0) | **Perintah:**

```bash
pnpm seo:mesh              # laporan (default, tidak menulis)
pnpm seo:mesh -- --write   # tulis related[] ke frontmatter
pnpm seo:mesh -- --slug s  # satu artikel
pnpm seo:mesh -- --all     # ikut sentuh draft
pnpm seo:mesh -- --reset   # hitung ulang dari nol
pnpm seo:mesh -- --json    # output JSON
```

**Wiring:** `publish.mjs` menjalankan `node seo/mesh-build.mjs --write` **sebelum** build (harus sebelum, supaya `related[]` ikut ter-render) dan fail-closed lewat exit code 3/4.

**Efek mesh sekarang masih kecil dan itu jujur:** baru 5 artikel published, jadi tiap artikel terisi 3 slot tapi 2 di antaranya masih "fallback" (belum ada sibling geo yang published). benefited baru terasa setelah artikel geo P10 mulai dipublish — itulah alasan keputusan 792 varian geo (merge vs 12 kota beda isi) yang masih menunggu user penting untuk diputuskan.

### 14.10 Deploy `db2bd240` — 4.3 + 4.4 live (1 Okt 2026, 23:19 WIB)

**Target: Cloudflare Pages `socio-id` saja** (`socio-id.pages.dev` → `socio.id` + `www.socio.id`). Targetnya landing, bukan app: **tidak ada `git push`, tidak ada panggilan API mutasi ke Coolify `socio-app`**. `app.socio.id` dicek sebelum & sesudah deploy dan jawabannya **tetap 303** (redirect login SvelteKit) dengan `updated_at` Coolify tidak berubah (`2026-10-01T16:10:37Z`, sama sekali tidak disentuh).

**Dua jebakan yang sempat muncul sebelum deploy — keduanya tertangkap:**

- **Token yang salah.** `accountcf.md` memuat **dua** API token (baris 4 dan baris 16). Token OAuth bawaan wrangler **gagal** (`Authentication error [code: 10000]`) untuk akun `0298214d…`. Kedua token diuji **read-only** dulu (`pages project list`): hanya token baris 4 yang punya akses. Jadi token yang dipakai tidak ditebak.
- **`fix-sitemap.mjs` terlewat.** Build manual `npx astro build` **tidak** menjalankan `landing/package.json` script (`astro build && node ../seo/fix-sitemap.mjs`), sehingga **51 `<lastmod>` hilang** dari `sitemap-0.xml`. Justru `lastmod` itu sinyal freshness yang dipantau W.1. Build diulang lewat `pnpm --filter landing build` (jalur benar) → `fix-sitemap: 51 lastmod ditulis ulang`. Deploy hanya setelah itu.

**Verifikasi produksi (semua dijalankan setelah deploy):**

| Cek | Hasil |
|---|---|
| Smoke URL landing (10 URL) | semua 200; `/beli-followers-tiktok-jakarta/` 404 **benar** — `draft: true`, tidak punya halaman |
| `app.socio.id` | 303 sebelum **dan** sesudah — tidak terganggu |
| Coolify `socio-app` | read-only: status `running`, `updated_at` tidak berubah |
| Schema di money page | `Service` + `Product` + `BreadcrumbList` + `FAQPage` + `HowTo` + `Organization` + `SoftwareApplication` |
| Mesh di `/blog/smm-panel/` | heading "Lanjut baca ini" + link `apa-itu-smm-panel`, `smm-panel-indonesia`, `cara-menambah-followers-instagram` (cocok persis dengan mesh yang dihitung) |
| `/blog/` | `ItemList` live |
| `/layanan/` | `CollectionPage` + `ItemList` live |
| `/privacy/` | `WebPage` live |
| GA4 + header keamanan | `G-MDJCW053XR` ada, CSP + HSTS + X-Frame-Options aktif |

**Dua hal yang HARUS jujur dicatat, bukan|language dibulatkan jadi "selesai":**

1. **Cabang `City` pada `areaServed` belum pernah dieksekusi produksi.** Semua 44 money page yang ada (10 tulis tangan + 34 generated) **non-geo** — tidak ada satu pun slug money page berakhiran nama kota. Jadi 42 halaman live memakai `areaServed: Country (Indonesia)`, dan `0` memakai `City`. Cabang geo **berada di kode dan logikanya diuji** (replikasi persis `BeliPage.astro:92-97` terhadap 8 slug: `beli-followers-instagram-jakarta` → Jakarta/DKI Jakarta, `harga-smm-panel-tangerang-selatan` → Tangerang Selatan/Banten via fallback dua-tail, `smm-panel-termurah-balikpapan` → Balikpapan, dan 2 slug non-geo → Country), tapi belum ada money page geo yang membuktikannya di server. Itu akan terlihat begitu money page kota pertama benar-benar dibuat.
2. **Mesh baru hanya 5 artikel.** 2 dari 3 slot di tiap artikel masih "fallback" karena belum ada artikel geo published. Setelah `AreaServed: City` dan mesh sama-sama terisi, nilainya baru terlihat — keduanya bergantung pada keputusan **792 varian geo** yang masih menunggu user.

### 14.11 Temuan 1 Okt — MONEY PAGE TIDAK TERINDEKS karena tidak ada jalur crawl internal (deploy `6c9a7ab9`)

Ini temuan yang **mengubah prioritas**, dan bukan dengan menambah artikel.

**Baseline GSC (diperiksa 1 Okt, satu URL per satu — bukan dari artikel saja):**

| URL | Status |
|---|---|
| `/` | ✅ indexed |
| `/layanan/` | ✅ indexed |
| `/beli-followers-instagram/` | ❌ Discovered - currently not indexed |
| `/beli-followers-tiktok/` | ❌ Discovered - currently not indexed |
| `/reseller/` | ❌ Discovered - currently not indexed |
| `/blog/smm-panel/` | ❌ Discovered - currently not indexed | Pola ini invite dugaan: **2 halaman yang paling banyak mendapat link internal justru yang satu-satunya terindeks.** Dulu kita mengira masalahnya "kurang artikel" (0/5 artikel terindeks), padahal money page — 42 halaman yang menghasilkan duit — juga tidak terindeks.

**Penyebabnya diukur, bukan ditebak:**

|  Cek  | Hasil |  Meaning  |
|---|---|---|
| robots meta money page | `index, follow` | bukan masalah robots |
| canonical vs sitemap vs URL live | identik, trailing slash konsisten | bukan masalah canonical |
| 308 tanpa slash → dengan slash | benar | bukan masalah redirect |
| ketebalan halaman | 642 kata rata-rata, ~300 unik | bukan thin content |
| similaritas antar money page (5-gram Jaccard) | 35–56% | template, bukan duplikat parah |
| **inbound link money page** | **37 dari 42 cuma punya 1–5 link; 5 punya 54 (nav/footer)** | **INI penyebabnya** |
| `/layanan/` (halaman yang terindeks) menaut money page | **hanya 5 dari 44** | katalog tidak mengaitkan katalog |
| artikel blog menaut money page (di dalam `<main>`) | **0 dari 44** | tidak ada jalur crawl dari konten |

Jadi: Google menemukan URL-nya (dari sitemap), Tapi tidak memilih mengindeks karena tidak punya jalur crawl + otoritas internal. Dan ini **arrears dari 4.4 yang harus diakui**: plan §1.3 minta tiap artikel punya "1 money page", tapi `related[]` cuma 3 slot dan terpakai untuk pilar + sibling + tetangga — link ke money page **tidak pernah ada**.

**Yang diperbaiki (satu deploy, `6c9a7ab9`):**

1. **`/layanan/` jadi hub.** Section baru "Halaman per layanan" menggrupkan **44 money page per platform** (Instagram 9, TikTok 8, Facebook 7, YouTube 7, Telegram 5, X/Twitter 5, Spotify 3). Verified: **44/44 tertaut** (sebelumnya 5). Sekalian `ItemList` pada `CollectionPage` diubah dari 50 anchor kategori (`/layanan#kategori`, yang bukan "item" menurut schema.org) menjadi 44 money page asli dengan URL nyata.
2. **Link kontekstual artikel → money page**, dipilih di server (`landing/src/lib/money-links.ts`) jadi ada di HTML statis — crawler tidak perlu menjalankan JS. Fallback ke `/layanan/` kalau tidak ada money page yang cukup nyambung.

**Tiga koreksi kualitas saat pengerjaan (semuanya ditemukan oleh pengukuran, bukan asumsi):**

- **Ambang matcher.** Versi pertama memakai ambang skor 2; artikel generik "SMM Panel" ikut ter-link ke `/beli-followers-twitter/` cuma karena sama-sama punya kata "followers". Link tak nyambung lebih buruk daripada tidak ada link. Ambang dinaikkan ke 6 + kandidat tambahan harus ≥ 60% dari terbaik.
- **Body artikel TIDAK boleh dipakai untuk scoring.** Percobaan kedua ikut menghitung isi body dan hasilnya lebih buruk lagi: body artikel memuat **tabel harga** yang mendaftarkan puluhan layanan, jadi artikel generik ikut nyangkut ke `/beli-jam-tayang-youtube/` atau `/beli-likes-tiktok/`. Sekarang hanya judul (bobot 3×) + deskripsi (2×).
- **Label platform per link itu redundan** — platform sudah tertulis di heading grup. Trace pertama memakai `truncate`, hasilnya **33 dari 44 judul terpotong ellipsis** di 360px. Sekarang tanpa truncate (wrap) dan tanpa span platform; tinggi link 44–59px, lebar 320px, 0 terpotong.

Hasil link kontekstual per artikel (verifikasi di produksi):

```
cara-menambah-followers-instagram  → /beli-followers-instagram/   "Beli Followers Instagram Murah & Terpercaya"
modal-jualan-followers             → /smm-panel-reseller/         "SMM Panel Reseller — Modal Rp50 Ribu"
smm-panel                          → /layanan/                   (fallback, artikelnya memang umum)
smm-panel-indonesia                → /layanan/                   (fallback)
apa-itu-smm-panel                  → /layanan/                   (fallback)
```

**Kesimpulan jujurnya:** ini memperbaiki **jalur crawl**, bukan menjamin indeks. Google butuh 1–2 minggu (bisa lebih lama) untukatial ulang halaman yang sudah `Discovered`. Tidak ada metrik yang boleh dievaluasi besok — itu noise. Yang bisa dievaluasi nanti: apakah `Discovered - currently not indexed` mulai turun.

### 14.12 Bug consent banner — "gabisa diklik" (deploy `6c9a7ab9`)

Keluhan user: banner consent tidak bisa diklik. Ukuran browser (headless Chromium, 390×844) menunjukkan banner **bukan** gagal klik — `elementFromPoint` tepat di tombol mengembalikan `BUTTON`, klik berhasil, consent tersimpan, 0 console error. Jadi ini **bukan bug fatal**, dan saya laporkan begitu adanya.

**Penyebab sebenarnya: banner menutupi konten.** Banner `position: fixed; bottom: 0` setinggi **231px** di mobile / **187px** di desktop, sementara ruang yang dipesan hanya **88px** (padding bawah dari `FloatingTabDock.svelte` untuk dock CTA mobile) — jadi **±143px konten tersembunyi** di mobile dan 187px di desktop. Tombol/CTA yang berada di area itu tidak bisa diklik karena memang tertutup banner. Komentar kode lama bahkan mengklaim "tanpa CLS (padding halaman saat tampil)" — padahal tidak ada kode yang menambah padding sama sekali.

**Perbaikan:**

- **Spacer, bukan padding.** `FloatingTabDock.svelte` menyuntik `body { padding-bottom: calc(88px + safe-area) }`. Kalau banner ikut menulis `padding-bottom`, keduanya berebut spesifisitas (mana menang tergantung urutan DOM). Banner sekarang memakai `<div id="consent-spacer">` di akhir flow: dock pakai padding, banner pakai spacer, keduanya menumpuk tanpa konflik. Tinggi diukur dari banner asli (`--consent-h`).
- **Ruang dipesan sebelum paint.** Dihitung saat parse (elemen ada walau `hidden`), bukan saat banner tampil → **CLS 0.0000** terukur di 360/390/768.
- **Layout mobile.** Tombol utama "Terima semua" **penuh lebar** (332×48) dengan dua tombol sekunder berdampingan (162×44). Versi lama menaruh 3 tombol dalam satu baris ~93px di 360px — sempit dan mudah salah tap.
- **Label "Essential saja" → "Tolak"** (lebih jelas sebagai penolakan; nilai consent `essential` tidak berubah jadi kontrak GA aman).
- **Smooth:** muncul di 700ms (bukan 1200ms), transisi 280ms `transform` + 200ms `opacity` saja, fokus otomatis ke tombol utama, `prefers-reduced-motion` dihormati.
- Kontak event `socio:consent` + `localStorage/cookie socio_consent` **tidak diubah** — itu kontrak yang didengar loader GA di `Layout.astro`.

**Verifikasi produksi:** banner 264px · spacer 263px · scroll ke bawah → konten duduk tepat di atas banner (tidak ada yang tertutup) · klik "Terima semua" → banner `hidden`, spacer 0px, `localStorage=all`, cookie ada · reload → banner tidak muncul lagi · **0 console error** · nol overflow horizontal di 360/390/768 untuk `/`, `/layanan/`, artikel, dan money page.

---

### 14.13 KEPUTUSAN 2 Okt — 792 varian geo & 55 keyword unassigned

User: *"kamu yang penting, asal long-tail tetap ada."* → **tidak ada halaman yang dihapus.
Yang berubah adalah urutan publish + syarat, bukan jumlah halaman.**

#### A. 792 varian geo — long-tail DIPERTAHANKAN, akar masalahnya yang dibenahi

**Kenapa tidak merge (mis. 1 halaman/kota):** 12 varian itu **bukan** duplikat, itu intent
berbeda — `smm-panel-`, `termurah`, `terpercaya`, `harga-`, `reseller-`, `agen-`, `umkm`,
`beli-followers-instagram`, `beli-followers-tiktok`, `beli-subscribers-youtube`,
`jasa-promosi-instagram`, `promosi-usaha-online`. Merge ke 1/kota berarti menghapus seluruh
lapisan intent itu — persis long-tail yang mau dijaga.

**Akar masalah yang sebenarnya ditemukan 2 Okt:** `seo/cities.json` sengaja designing field
`anchor` (fakta ekonomi lokal per kota) + `buyer` (siapa yang kemungkinan beli di kota itu) —
`_meta.note` bahkan menulis *"HARUS disebut di artikel supaya halaman punya nilai nyata
(anti-doorway)"*. **Hook itu tidak pernah tersambung ke generator.** Diuji: 0 dari 3 sampel
artikel geo memuat anchor kotanya. Itulah kenapa 12 varian per kota terdeteksi mirip
(overlap 0,58–0,68 antar-kota untuk varian yang sama) — isinya sama karena **fakta lokal
yang membedakan tidak pernah ditulis**, bukan karena strateginya salah.

**Keputusan:**

| #
| Keputusan | Detail |
|---|---|
| 1 | **Tidak ada halaman geo yang dihapus.** 72 kota × 12 varian = **864 tetap** |
| 2 | **Anchor kota jadi syarat wajib.** `geo-expand.mjs` wajib menyuntik `anchor` + `buyer` ke setiap artikel geo. Halaman tanpa anchor = **tidak boleh dipublish** |
| 3 | **Gate baru**: `qc-uniqueness.mjs` tambah satu pemeriksaan — geo page yang tidak memuat anchor kota-nya dihitung FAIL, sekelas duplikasi (karena memang duplikat secara isi) |
| 4 | **Publish per wave berdasarkan tier** (bukan 864 sekaligus) |

**Wave publish:**

| Wave | Tier | Kota | Varian | Halaman | Kapan |
|---|---|---|---|---|---|
| 1 | tier 1 | 16 | 12 | 192 | setelah anchor terpasang & gate hijau |
| 2 | tier 2 | 21 | 12 | 252 | setelah wave 1 terindeks & tidak kena penalty |
| 3 | tier 3 | 35 | 12 | 420 | setelah wave 2 |

Alasan bertahap: sekarang site baruterindeks 2 dari 56 halaman. Melepas 192 halaman doorway
sekaligus bisa kena penalti **seluruh situs** (bukan cuma halaman itu) — dan itu akan
merusak 44 money page yang baru saja kita beri jalur crawl. Satu wave per beberapa minggu,
ukur dulu, baru lanjut.

#### B. 55 keyword unassigned — 42 keyword realistis jadi **10 money page**, bukan 42 artikel

Pola 55 itu ternyata `{beli|jasa|order} × {layanan}` — **modifier dari layanan yang sudah ada**,
bukan topik baru. Klasifikasi aktual:

| Kategori | Jumlah |_nat_| weekday |
|---|---|---|
| Sudah tercakup money page yang ada | 13 | **liput** — cukup tambahkan sebagai FAQ/section di money page itu |
| Perlu money page baru | 42 keyword | tapi hanya **~10 service berbeda** × 4 modifier |

Service yang muncul 4× (karena `{beli|jasa|order}` + bentuk polos): `viewers-instagram-live`,
`story-viewers-instagram`, `reels-views-instagram`, `reels-plays-instagram`, `spotify-plays`,
`spotify-streams`, `spotify-listeners`, `post-reach-facebook`.

Plus 10 long-tail unik: `post-views-telegram`, `live-instagram`, `story-viewers`, `reels-views`,
`reels-plays`, `tweet-views`, `member-telegram-aman-tanpa-password`, `member-telegram-gradual-refill`,
`member-telegram-reseller-pemula`, `member-telegram-cara-cek`.

**Keputusan:** buat **10 money page baru** (satu per service). Varian `{jasa|order}` **tidak**
jadi halaman terpisah — dijawab di FAQ + satu H2 per variant di money page induknya.

**Kenapa ini lebih baik daripada 42 halaman:**
- Long-tail keyword tetap tercakup — secara on-page, yang justru lebih kuat daripada
  halaman terpisah yang tipis.
- 42 halaman Similarity-tinggi akan menambah beban duplikasi persis seperti yang sekarang
  menghambat indeks (0/5 artikel terindeks).
- `member-telegram-*` (aman-tanpa-password, gradual-refill, reseller-pemula, cara-cek) cocok
  jadi **section/FAQ**, bukan money page — itu intent informasi, bukan intent transaksi.

#### C. 55 unassigned jadi 0 — manifest harus bersih

Setelah keputusan ini, `cluster-manifest.mjs` harus/report `unassigned: 0`:
13 ditandai `covered_by_money_page` + 42 dipetakan ke 10 money page baru (atau section/FAQ).
Tidak ada keyword yang menggantung.

> **REALITA IMPLEMENTASI (2 Okt 2026) — asumsi di atas ternyata keliru dan ini penting.**
> Verifikasi langsung ke tabel `services` di DB produksi menunjukkan sebagian besar dari 42
> keyword **sudah punya** money page yang menjawab intent-nya. Tidak ada satu pun money page
> baru dibuat. Hasil akhir `cluster-manifest.mjs`:
>
> | Kategori | Jumlah | Keterangan |
> |---|---|---|
> | di-route ke money page yang **sudah ada** | **51** | 10 tujuan berbeda, tidak ada halaman baru |
> | di-park (`PARKED_NO_SERVICE`) | **4** | `post-reach-facebook` + `beli/jasa/order` — katalog **0 baris** layanannya |
> | **unassigned** | **0** | |
>
> Dua temuan yang menggugurkan asumsi: `reels-plays-instagram` dan `post-reach-facebook`
> **tidak ada** di katalog (0 baris), dan `reels-views-instagram` termurah Rp827.956 —
> tidak layak jadi halaman "termurah". Karena itu pendekatannya jadi **routing + FAQ**,
> bukan halaman baru. Varian `jasa-*`/`order-*` (21 intent) dijawab lewat 2 item FAQ generik
> di `seo/money-expand.mjs` + 4 FAQ info-intent di `/beli-members-telegram/`.

#### Urutan pengerjaan setelah keputusan ini

1. ~~Sambungkan `anchor`/`buyer` dari `cities.json` ke `geo-expand.mjs`~~ → ✅ selesai (`seo/lib/geo-anchor.mjs`)
2. ~~Buat 10 money page baru dari 55 unassigned~~ → ✅ **dibatalkan — tidak perlu halaman baru**, lihat REALITA di atas (selesai lewat routing + FAQ)
3. ⏸️ **Publish wave 1 geo (tier 1, 192 halaman) — TERTUNDA.** Terblokir backlog A:
   36 dari 61 artikel glitch, dan gate duplikasi saat ini mengukur glitch, bukan keunikan.
4. **8 Okt** — ukur W.1, pastikan tidak ada penalty
5. 🔴 Putuskan jalur penulisan konten (lihat [sisa pekerjaan](#sisa-pekerjaan) → Backlog A)

### 14.14 Implementasi anchor kota + **HASIL UKUR YANG MEMBONGKAR HIPOTES AWAL (2 Okt)**

Anchor kota sudah disambungkan dan **terbukti bergerak**, tapi pengukuran menunjukkan
hypotheses di §14.13 perlu dikoreksi.

**Yang dikerjakan:**

| File | Perubahan |
|---|---|
| `seo/lib/geo-anchor.mjs` (baru) | `renderGeoAnchor` + `injectGeoAnchor` + `hasGeoAnchor`. Suntik **deterministik** setelah `assembleMdx` — bukan bergantung LLM menulisnya, karena free model sering tidak patuh dan "kalau LLM kebetulan menulis" bukan jaminan. Idempoten (marker HTML, dan skip kalau LLM sudah menyebut 2 dari 3 kata khas) |
| `seo/generate.mjs` | import modul + suntik setelah `assembleMdx`, sebelum `validateMdx`. `const mdx` → `let mdx` |
| `seo/qc-uniqueness.mjs` | deteksi artikel geo (72 kota dari `cities.json`) + laporan `anchor kota: N/M` |

**Bug yang ditemukan saat implementasi:** `renderGeoAnchor` awalnya destructuring `anchor`,
padahal queue dari `geo-expand.mjs` memakai `local_anchor` (prefix `local_`). Akibatnya fungsi
selalu mengembalikan `null` dan tidak pernah menyuntik — lolos dari `node --check` dan lolos dari
`renderGeoAnchor` yang diuji langsung, tapi gagal saat diuji lewat `injectGeoAnchor`. Diperbaiki
dengan menerima kedua nama field.

**Uji helper (4/4 hijau):** anchor terinjeksi setelah H2 pertama · idempoten (jalan 2× tidak
berubah) · non-geo & anchor < 20 char tidak diinjeksi · LLM yang sudah menyebut anchor tidak
mendapat section kembar.

**Baseline terukur di korpus asli:** `anchor kota: 40/54` artikel geo sudah memuat fakta lokal —
**14 belum** (`agen-smm-panel-jakarta`, `beli-followers-instagram-jakarta`,
`beli-followers-tiktok-jakarta`, …). Ini mengoreksi dugaan "anchor tidak pernah dipakai" yang
tertulis di §14.13: sebelumnya ada di **4 dari 14** sampel, yaitu hanya pada template
`smm-panel-*`; pola `reseller-`, `beli-`, `harga-`, `agen-`, `umkm`, `terpercaya-` sama sekali
tidak memakainya. Jadi kustom, bukan nol, bukan nol.

### PENGUKURAN YANG MENGGUGURKAN "anchor cukup"

Korpus sintetis 12 artikel `smm-panel-termurah-<kota>` (templat identik, hanya nama kota yang
berbeda — sengaja kondisi terburuk), diukur dengan gate `qc-uniqueness` yang sungguhan:

| Konten lokal per kota | FAIL pairs | Skor tertinggi | Ambang FAIL |
|---|---|---|---|
| 0 kata (kondisi lama) | 66 / 66 | **0,964** | 0,62 |
| anchor 1 section (~25 kata) | 57 / 66 | **0,737** (body pendek) · **0,861** (body realistis) | 0,62 |
| +40 kata konten lokal | 66 / 66 | **0,862** | 0,62 |
| +80 kata konten lokal | 66 / 66 | **0,862** | 0,62 |

**Artinya:** satu section anchor menurunkan skor (0,964 → 0,861) tapi **tidak pernah melewati
ambang 0,62**, dan menambah 80 kata konten lokal pun **tidak mengubahnya** — karena boilerplate
bersama masih mendominasi vektor. Untuk melewati gate, mayoritas isi artikel harus unik per kota.

**Konsekuensi yang harus jujur Disebutkan:** §14.13 "anchor jadi syarat → publish
3 wave" **tidak akan jalan apa adanya.** Semua halaman geo akan tetap di-block gate. Dan itu
memang perilaku yang benar — gate melindungi kita dari melepas 864 halaman doorway. Yang salah
hanya rencana yang mengira anchor cukup.

**Tiga opsi nyata (perlu keputusan user):**

| Opsi | Isi | Yang bisa dihop |
|---|---|---|
| **1. Perkecil geo, tambah mutu** | 12 intent **nasional** (bukan per kota) + 1–2 halaman kota untuk tier 1 saja. Total ± 30–40 halaman geo | Hampir semua bisa lolos gate, karena pembeda utamanya intent + layanan, bukan nama kota |
| **2. Tulis lokal sungguhan per kota** | 1 artikel yang majority-nya isi lokal, ditulis manusia/editorial, untuk 5–10 kota tier 1 saja | Kualitas terbaik, tapi **tidak otomatis** — free model tidak bisa menulis ini konsisten |
| **3. Biarkan seperti sekarang** | 864 tetap jadi draft, tidak dipublish | Nol risiko, nol tambahan trafik dari geo |

Rekomendasi: **Opsi 1** — long-tail tetap hidup (12 intent × layanan, plus kota tier 1), tapi
yang dipublish hanya yang bisa dibuktikan unik. Jangan tambah halaman; tambah **beda isi**.

### 14.15 PILOT OPSI 2 — artikel geo "dari nol" untuk Solo (2 Okt). **METODE BERJALAN.**

Setelah §14.14 menyimpulkan bahwa anchor otomatis tidak cukup, user memilih **Opsi 2**: menulis
konten lokal sungguhan, sedikit demi sedikit, dan diukur per artikel.

**Aturan yang disepakati (dipakai di pilot ini):**
- Fakta lokal **hanya dari `seo/cities.json`** (72 kota, `approved` 30 Sep 2026). Tidak ada
  angka, statistik, atau nama yang ditambahkan dari luar dataset.
- Perbedaannya antar-kota datang dari **cara menyusun + kesimpulan yang mengikuti**, bukan
  dari fakta baru.
- Harga di artikel **hanya dari `landing/src/data/prices.json`** (synced 11 Sep 2026). Ada
  konfirmasi bahwa angka di artikel lama sudah basi (artikel 2 Sep menulis Instagram Video Views
  Rp81; prices.json sekarang Rp59).

**Kenapa Solo yang dipilih duluan:** tier 2, dan `anchor`-nya **paling tipis** di antara 16 kota
tier 1 (14 kata: "kota batik dan garmen dengan sentra mebel serta kuliner yang dijual lintas kota
lewat kanal online"). Kalau metodanya gagal di Solo, tempat gagalnya ketahuan sekarang, bukan
setelah 10 artikel.

**Cara kerjanya — bukan menempelkan anchor, tapi mengganti struktur artikelnya secara total:**

| Draft lama (template) | Draft baru (ditulis ulang) |
|---|---|
| H2: "Karakter Pasar Solo…" → "Menguji Murah…" → "Menampilkan Proses Produksi…" → "Rutinitas Ukur…" | H2: "Views tinggi belum tentu jadi pesanan" → "Tiga tahap, bukan daftar layanan" (Tahap 1 Jangkauan / Tahap 2 Bukti / Tahap 3 Pengikut) → "Layanan yang tidak perlu kamu beli" → "Cara menguji termurah…" → "Kuliner yang dijual lintas kota" → FAQ → Baca juga |
| Menjual fitur panel | Menjual **urutan operational**: views dulu untuk menguji, baru pengikut kalau tahap 1–2 sudah menghasilkan chat |

Intinya: pembeda tidak datang dari kalimat tambahan, tapi dari **urutan dan sudut bahasan yang
berbeda**. Bagian "Layanan yang tidak perlu kamu beli" misalnya — tidak ada artikel template
lain yang punya itu.

**HASIL UKUR (gate `qc-uniqueness` sungguhan, korpus 62 artikel):**

| Metrik | Sebelum | Sesudah | Ambang |
|---|---|---|---|
| Skor tertinggi Solo | **0,604** (WARN) | **0,337** | WARN 0,48 · FAIL 0,62 |
| Shingle 4-gram vs city terdekat | 0,367 | **0,010** | — |
| Pasangan Solo di daftar duplikat | 20 (semua WARN) | **0** | — |
| Total WARN korpus | 149 | **129** | — |
| Anchor kota terdeteksi | 40/54 | 40/54 (tetap; angle kuliner dipulihkan) | — |

Pasangan Solo yang tersisa (diukur dengan ambang diturunkan ke 0,05): `smm-panel-termurah-depok`
0,337 · `smm-panel-termurah-jakarta` 0,329 · `beli-followers-instagram-tangerang` 0,321. Bandingkan:
pasangan city lain yang paling mirip masih **0,715** (cilegon ⇄ Pekanbaru).

**Kesimpulan:** Opsi 2 **secara terukur berhasil** dan tidak seperti yang dikira dengan yang
dikkira sebelumnya. Yang membuatnya bekerja bukan "tambah konten lokal 80 kata" (itu sudah
diuji gagal di §14.14), tapi **menulis ulang struktur artikel** supaya isinya tidak sharing
frasa dengan articles city lain.

**Biaya & catatan jujur:**
- Satu artikel ≈ 1.090 kata, 7 H2, 5 FAQ, requiring penulisan penuh (bukan generate).
- Artikelnya masih **draft** (`draft: true`), tidak dipublish — `/blog/smm-panel-termurah-solo/`
  masih 404 di produksi, sesuai gate.
- Skor 0,337 memberi headroom besar:ambang 0,48 masih jauh. Ini membuka kemungkinan
  menambah satu-dua topik lokal per kota tanpa naik ke WARN.
- Korpus masih punya 11 pasang FAIL di city lain (tertinggi 0,715) — tidak tersentuh pilot ini.

**Lanjutan yang masuk akal:** ulangi pola ini untuk 4–9 kota tier 1 berikutnya (Bandung,
Batam, Surabaya, Medan, Makassar, Semarang, Yogyakarta, Denpasar, Malang, Palembang), satu
artikel per kota, ukur tiap selesai. Kalau 3 kota pertama bertahan di bawah 0,48, sisanya
cukup mengikuti kerangka yang sama.

### 14.16 HASIL AKHIR — 9 artikel geo ditulis ulang, **FAIL 11 → 0**

Setelah pilot Solo (§14.15) terbukti, pola yang sama diterapkan ke 8 kota lain. Yang dipenting:
**tiap kota memakai kerangka organise yang berbeda**, karena dua percobaan pertama menunjukkan
risiko baru — kalau semua artikel baru memakai kerangka yang sama, mereka akan saling mirip
lalu menjadi cluster duplikat baru (terbukti: Pekanbaru ⇄ Solo sempat naik ke 0,465 hanya
karena keduanya memakai "tiga lapis").

**Kerangka yang dipakai per kota (sengaja berbeda semua):**

| Kota | Skor sebelum → sesudah | Kerangka organise |
|---|---|---|
| Solo | 0,604 → **0,465** | Tahap funnel (jangkauan → bukti → pengikut) + "layanan yang tidak perlu dibeli" |
| Pekanbaru | 0,715 → **0,465** | B2B supplier: ditemukan → kapasitas → jangkauan |
| Cilegon | 0,685 → **0,430** | Kredibilitas: jejak pekerjaan, jejak respons, jejak rutinitas |
| Palembang | 0,690 → **0,437** | Rantai distribusi: 3 hal yang diperiksa distributor |
| Padang | 0,690 → **0,437** | Dua jalur: produk segar vs beku (tidak bisa disamakan) |
| Cirebon | 0,655 → **0,433** | Dua produk, dua cara dinilai: detail motif vs order ulang |
| Tasikmalaya | 0,641 → **0,410** | Musim: fase siap / fase final / fase sepi |
| Badung | 0,640 → **0,410** | Pengunjung ≠ pengikut: discovery, peta, satu frame |
| Jayapura | 0,625 → **0,432** | B2B offline: verifikasi (katalog, lokasi, kontak) bukan jangkauan |

**Angka akhir:**

| Metrik | Sebelum | Sesudah |
|---|---|---|
| Pasangan FAIL (>= 0,62) | **11** | **0** |
| Total WARN | 149 | **78** |
| Pasangan antar 9 artikel baru | — | 36 pasang, tertinggi **0,465** (masih di bawah ambang 0,48) |

Semua 9 artikel berstatus **AMAN** (di bawah ambang WARN), dan tidak ada satu pun yang menjadi
pasangan baru di atas ambang.

**Yang masih tersisa: 78 WARN**, dan ini memang status "boleh, tapi perhatikan" — bukan
pemblokir. Pasangan tertinggi yang tersisa:

```
0,611  purwokerto ⇄ serang          0,580  cianjur ⇄ pasuruan
0,610  banyuwangi ⇄ manado          0,576  garut ⇄ sidoarjo
0,596  pontianak ⇄ purwokerto        0,573  banjarmasin ⇄ pontianak
```

Artinya: **tidak ada lagi alasan menunda publish.** 9 artikel ini aman, dan sisanya masih draft
dengan status WARN yang tidak menghalangi.

**Dua catatan jujur:**
1. Semua 9 masih **`draft: true`** — tidak ada yang dipublish. Ini keputusan publish, bukan
   keputusan menulis.
2. **Tidak ada yang di-deploy.** Perubahan ini di level korpus konten, bukan landing template.
   Publish dilakukan lewat `publish.mjs` yang sudah punya gate mesh + JSON-LD.

---

## 15. Wireframes Appendix

### 15.1 Wireframe: Generator v2 Pipeline

```
┌──────────────────────────────────────────────────────────────────┐
│                       GENERATE-DAILY.SH                          │
│                                                                  │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────────┐    │
│  │ queue.json  │───▶│ spec-filler  │───▶│ from-template.mjs │    │
│  │ pending[]   │    │  (optional,  │    │  v2              │    │
│  │ (N=5)       │    │   Groq only  │    │  • parse spec    │    │
│  └─────────────┘    │   kalau      │    │  • splice section│    │
│                     │   skeleton   │    │    skeleton       │    │
│  ┌─────────────┐    │   kurang)    │    │  • inject anchor │    │
│  │ clusters.   │───▶│              │    │  • build mesh    │    │
│  │ json        │    └──────────────┘    │  • bake FAQ ×5   │    │
│  └─────────────┘                        │  • bake CTA      │    │
│                                          │  • flip queue    │    │
│  ┌─────────────┐    ┌──────────────┐    │  • write MDX     │    │
│  │ content-    │───▶│ qc.mjs       │───▶│  draft:true      │    │
│  │ shared/*    │    │ + uniqueness │    └─────────┬────────┘    │
│  │ (FAQ/CTA/   │    │ + jsonld     │              │             │
│  │  skeleton)  │    └──────┬───────┘              ▼             │
│  └─────────────┘           │              ┌─────────────┐      │
│                            ▼              │ blog/*.mdx  │      │
│                       ┌─────────┐         │ + queue flip│      │
│                       │ PASS/   │────────▶└─────────────┘      │
│                       │ FAIL    │                                │
│                       └────┬────┘                                │
│                            │                                     │
│                  FAIL ─────┘                                     │
│                  → log notes, skip (max 3 fail beruntun)        │
└──────────────────────────────────────────────────────────────────┘
```

### 15.2 Wireframe: Indexer Pipeline

```
┌───────────────────────────────────────────────────────────────────────┐
│                    INDEXER (post-publish)                             │
│                                                                       │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────────┐         │
│  │ published   │───▶│ indexnow.mjs │───▶│ api.indexnow.org │         │
│  │ today       │    │ batch ≤10    │    │ → Bing+Yndx      │         │
│  └─────────────┘    └──────┬───────┘    └──────────────────┘         │
│                            │                                          │
│                            ▼                                          │
│                     ┌──────────────┐    ┌──────────────────┐         │
│                     │ bing-submit  │───▶│ Bing Webmaster   │         │
│                     │ .mjs (≤10/h) │    │ URL Submission   │         │
│                     └──────┬───────┘    └──────────────────┘         │
│                            │                                          │
│                            ▼                                          │
│                     ┌──────────────┐    ┌──────────────────┐         │
│                     │ gsc-inspect  │───▶│ GSC URL Inspect  │         │
│                     │ .mjs (7d)    │    │ API              │         │
│                     └──────┬───────┘    └──────────────────┘         │
│                            │                                          │
│                            ▼                                          │
│                     ┌──────────────┐                                  │
│                     │ state.json   │                                  │
│                     │ updated:     │                                  │
│                     │ {verdict,    │                                  │
│                     │  lastCrawl,  │                                  │
│                     │  indexing}   │                                  │
│                     └──────┬───────┘                                  │
│                            │                                          │
│                            ▼                                          │
│                     ┌──────────────┐                                  │
│                     │ remedy.mjs   │                                  │
│                     │ • "Crawled   │                                  │
│                     │   not index" │                                  │
│                     │   → re-ping  │                                  │
│                     │   + wait 7d  │                                  │
│                     │ • "Discov    │                                  │
│                     │   not index" │                                  │
│                     │   → back-link│                                  │
│                     │   + wait     │                                  │
│                     │ • manual     │                                  │
│                     │   action →   │                                  │
│                     │   halt+email │                                  │
│                     └──────┬───────┘                                  │
│                            │                                          │
│                            ▼                                          │
│                     ┌──────────────┐                                  │
│                     │ ramp-gate    │  Senin:                          │
│                     │ .mjs         │  index_rate_14d                  │
│                     │ set          │  ≥85% → N+=2 (cap 10)           │
│                     │ daily_count  │  70-85% → tetap                  │
│                     └──────────────┘  <70% → N-=1 (floor 1)          │
└───────────────────────────────────────────────────────────────────────┘
```

### 15.3 Wireframe: Coolify Engine (Scheduled Task)

```
┌─────────────────────────────────────────────────────────────────────┐
│              COOLIFY INSTANCE (self-hosted)                          │
│                                                                       │
│  ┌───────────────────────────┐    ┌───────────────────────────┐      │
│  │ Service: app (SvelteKit)  │    │ Service: runner (SEO)     │      │
│  │ Port: 3000                │    │ Image: seo-runner:latest  │      │
│  │ URL: app.socio.id         │    │ Mode: Scheduled Task      │      │
│  │ Env: SOCIO_DB_URL, RESEND │    │ Env: GH_TOKEN, CF_TOKEN,  │      │
│  │       _API_KEY, R2_*      │    │       GSC_SA_JSON,        │      │
│  │       VAPID_*, AUTH_*    │    │       BING_API_KEY,       │      │
│  │ Auto-deploy: push main    │    │       RESEND_API_KEY,     │      │
│  └───────────────────────────┘    │       GROQ_API_KEY        │      │
│                                   │ Volume: /data → state,    │      │
│                                   │         queue mirror,     │      │
│                                   │         clone repo konten │      │
│                                   │ Tasks:                    │      │
│                                   │  • daily-publish  06:00   │      │
│                                   │  • weekly-freshness Sen09 │      │
│                                   │  • daily-monitor  */15    │      │
│                                   └───────────────────────────┘      │
│                                                                       │
│  External:                                                            │
│  • Cloudflare Pages (landing) — wrangler deploy dari runner          │
│  • GitHub: socio-seo-content-id (private) — runner clone/push        │
│  • GitHub: socio (app, public) — JANGAN disentuh oleh runner         │
└─────────────────────────────────────────────────────────────────────┘
```

### 15.4 Wireframe: Topical Authority Map

```
                          ┌──────────────┐
                          │    PILLAR    │
                          │  /smm-panel  │  ◄────── money page: /layanan
                          └──────┬───────┘
                                 │
        ┌─────────────────┬──────┴───────┬─────────────────┐
        │                 │              │                 │
   ┌────▼─────┐    ┌──────▼─────┐  ┌─────▼─────┐    ┌──────▼──────┐
   │ cluster  │    │  cluster   │  │  cluster  │    │   cluster   │
   │ apa-itu  │    │   smm-     │  │   smm-    │    │   cara-     │
   │ smm-     │    │  panel-    │  │  panel-   │    │   kerja-    │
   │ panel    │    │   murah    │  │  indonesia│    │   smm-      │
   │          │    │            │  │           │    │   panel     │
   └────┬─────┘    └──────┬─────┘  └─────┬─────┘    └──────┬──────┘
        │                 │              │                 │
        │   sibling links │ (cross)      │                 │
        └────────┬────────┴──────────────┘                 │
                 │                                         │
                 ▼                                         │
        ┌──────────────┐    ┌──────────────┐                │
        │  GEO PAGE    │    │  GEO PAGE    │ ◄──────────────┘
        │  /smm-panel  │    │  /smm-panel  │
        │   -jakarta   │    │   -bandung   │
        └──────┬───────┘    └──────┬───────┘
               │                   │
               └─────┬─────────────┘
                     │
                     ▼
            ┌──────────────────┐
            │   MONEY PAGES    │
            │  /beli-* (12)    │
            │  /layanan         │
            │  /reseller        │
            └──────────────────┘
```

### 15.5 Wireframe: Akuisisi Multi-Channel

```
┌─────────────────────────────────────────────────────────────────────┐
│                   USER ACQUISITION ENGINE                            │
│                                                                       │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐           │
│  │   Reddit     │    │   Quora      │    │   YouTube    │           │
│  │  • r/ID      │    │  • answers   │    │   Shorts     │           │
│  │  • r/Entre   │    │    niche     │    │  • script    │           │
│  │  • r/social  │    │  • link      │    │    generator │           │
│  │  • natural   │    │    natural   │    │  • upload    │           │
│  │    answer    │    │              │    │    (manual)  │           │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘           │
│         │                   │                   │                    │
│         └─────────┬─────────┴─────────┬─────────┘                    │
│                   ▼                   ▼                              │
│         ┌───────────────────────────────┐                            │
│         │      WA Group / Discord       │                            │
│         │      Reseller Socio.id        │                            │
│         │      • diskusi                │                            │
│         │      • weekly update          │                            │
│         │      • referral               │                            │
│         └──────────────┬────────────────┘                            │
│                        │                                             │
│                        ▼                                             │
│         ┌──────────────────────────────┐                            │
│         │   Affiliate Program           │                            │
│         │   • 20% komisi                │                            │
│         │   • micro-influencer 5K-50K   │                            │
│         │   • dashboard (sentuh app)    │                            │
│         └──────────────┬─────────────────┘                            │
│                        │                                             │
│                        ▼                                             │
│         ┌──────────────────────────────┐                            │
│         │   Newsletter (DOI)            │                            │
│         │   • double opt-in             │                            │
│         │   • digest mingguan           │                            │
│         │   • welcome series            │                            │
│         └───────────────────────────────┘                            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Catatan Penutup

Plan v2 ini adalah **peta lengkap**, bukan implementasi. Setelah user review & OK, eksekusi dilakukan **per sprint** (lihat §12). **Prinsip tetap**: quality > volume, topical authority > scattered pages, akuisisi multi-channel > SEO-only, automation manusiawi > robot kaku.

**Total script baru**: ~22 file. **Token cost/bulan**: ~25K (95% hemat). **Outcome 6 bulan**: 12 pillar + 80 cluster published, index rate ≥85%, akuisisi 1000+ visit/bulan dari multi-channel.
