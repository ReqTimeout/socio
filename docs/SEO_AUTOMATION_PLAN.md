# SEO_AUTOMATION_PLAN — Sistem Automated SEO + Marketing socio.id

> **Status**: PLAN — menunggu review user. JANGAN eksekusi sebelum disetujui.
> **Tanggal**: 30 Sep 2026
> **Sumber**: adaptasi `LANDING_SEO_SYSTEM.md` (spec) + `SEO-KEYWORD-RESEARCH.md` (keyword) +
> `SEO_PIPELINE_PROGRESS.md` (state pipeline, PAUSED 2 Sep) + `SEO-SYSTEM-BERIKLAN-2026-08-26.md`
> (pelajaran sistem beriklan) + audit kode/env live 30 Sep 2026.
> **Keputusan user (30 Sep)**: AdSense ID menyusul · generate LOKAL (opencode CLI) → push draft →
> cron VPS publish harian · GSC Service Account menyusul (indexer otomatis, deep-dive fitur) ·
> Runner = **Coolify Scheduled Task di VPS**.
> **Revisi 2 (30 Sep, pasca-review user + deep-dive kode)**: konten pindah ke **repo git TERPISAH**
> `socio-seo-content` — lihat §0. Plus: lock flock, aturan kepemilikan file, guard anti-duplikat
> artikel, dan koreksi noindex pagination.
> **Revisi 3 (30 Sep)**: Runner **TIDAK punya akses MySQL langsung** — semua data via HTTP
> endpoint app (`/api/internal/seo-prices`, `/api/internal/seo-changelog`). Prioritas Fase F:
> **geo + longtail intent dulu** sebelum layanan luas. Gate: **list keyword wajib siap
> (≥ buffer 2× target publish/minggu) sebelum generate artikel dimulai**.

---

## Daftar Isi

0. [Keputusan Revisi 2: Repo Konten Terpisah](#0-keputusan-revisi-2-repo-konten-terpisah)
1. [Temuan Audit (state aktual terverifikasi)](#1-temuan-audit)
2. [Arsitektur Final + Wireframe](#2-arsitektur-final--wireframe)
3. [Keputusan Ritme Publish (ramp-gate, bukan 30/hari)](#3-keputusan-ritme-publish)
4. [Fase A — Perbaiki Pipeline Lokal](#4-fase-a--perbaiki-pipeline-lokal)
5. [Fase B — Theme Blog + AdSense](#5-fase-b--theme-blog--adsense)
6. [Fase C — Runner Coolify di VPS](#6-fase-c--runner-coolify-di-vps)
7. [Fase D — Menangkan Google + AI Search (SA deep-dive)](#7-fase-d--menangkan-google--ai-search)
8. [Fase E — Email List + Penawaran Client Baru](#8-fase-e--email-list--penawaran-client-baru)
9. [Wireframe Workflow per Komponen](#9-wireframe-workflow-per-komponen)
10. [Env / Secrets yang Dibutuhkan](#10-env--secrets-yang-dibutuhkan)
11. [Urutan Eksekusi (Sprint)](#11-urutan-eksekusi)
12. [Definition of Done](#12-definition-of-done)
13. [Yang Menunggu dari User](#13-yang-menunggu-dari-user)
14. [Appendix: Deep Dive Script Eksisting](#14-appendix-deep-dive-script-eksisting)
15. [Fase F — Keyword & Geo Engine (winning semua kota besar)](#15-fase-f--keyword--geo-engine)
16. [Status Eksekusi & Changelog Implementasi](#16-status-eksekusi--changelog-implementasi)
17. [Phase Tracker — Checklist 1-per-1 & Status](#17-phase-tracker--checklist-1-per-1--status)

---

## 0. Keputusan Revisi 2: Repo Konten Terpisah

**Keputusan user 30 Sep**: konten SEO dipindah ke repo git khusus, terpisah dari repo aplikasi.
Ini sekaligus menutup risiko terbesar revisi 1 (push konten memicu auto-deploy app Coolify).

### 0.1 Repo konten (baru, private) — **CONFIRMED 30 Sep: `https://github.com/ReqTimeout/socio-seo-content-id.git`**

```
socio-seo-content-id/
├── blog/                     # SEMUA MDX (draft:true + published) — 5 artikel live ikut pindah
├── queue.json                # state mesin lama, di-bootstrap (status draft dipertahankan)
├── queue.mined.json          # hasil mining GSC mingguan (runner-only writes)
├── state.json                # bootstrap dari nol (file ini HILANG di mesin lokal saat ini)
├── prices.json               # output sync-prices mingguan
├── llms/llms.txt + llms-full.txt
├── deploy.json               # { landingSha, cfDeploymentId } — penanda deploy terakhir
└── seo-schema.md             # dokumentasi skema + aturan kepemilikan file
```

### 0.2 Integrasi ke build landing

- `landing/astro.config.mjs`: `base` collection blog = `process.env.SEO_CONTENT_DIR ?? 'src/content/blog'`.
- Runner clone repo konten → set `SEO_CONTENT_DIR=/work/socio-seo-content/blog` saat `pnpm --filter landing build`.
- Repo utama `socio.id`: folder `landing/src/content/blog/` dikosongkan (sisa 5 artikel pindah);
  lokal (tanpa env) build pakai fallback kosong → draft tidak pernah numpang di repo app.
- **Konsekuensi utama**: commit `content(seo): …` TIDAK PERNAH lewat repo app → webhook Coolify
  tidak pernah terpicu oleh publish harian. Runner hanya push repo konten. Landing di-rebuild
  runner via `wrangler` eksplisit; kalau runner mengubah source landing (jarang, manual),
  deploy app tetap keputusan manusia.

### 0.3 Aturan kepemilikan file (anti merge-conflict — konflik senyap = pipeline mati tanpa alert)

| File | LOKAL boleh tulis | RUNNER boleh tulis |
|---|---|---|
| `queue.json` | item baru + `pending→draft` | flip `draft→published` (daily) |
| `queue.mined.json` | boleh di-merge & di-rotate oleh `s2b-expand` | append (weekly mining) |
| `state.json`, `deploy.json`, `prices.json`, `llms/*` | ❌ read-only (pull saja) | ✅ satu-satunya writer |
| `blog/*.mdx` | buat draft baru | flip frontmatter + freshness `updated` |

Lokal **wajib** `git pull --rebase` sebelum `seo:push-drafts`. Rule keras: lokal tidak pernah
menyentuh field `status: published`, runner tidak pernah menyentuh item `pending`.

---

## 1. Temuan Audit

State per 30 Sep 2026, diverifikasi via kode + curl live (bukan asumsi):

### 1.1 Landing (CF Pages — project `socio-id`, akun `0298214d…`)

| Item | Status |
|---|---|
| `https://socio.id` | LIVE 200 (cutover 2 Sep, deploy `9c8e6686`) |
| Sitemap | 20 URL: 10 money page `/beli-*` + `/smm-panel-*`, 5 artikel blog, halaman utama |
| `llms.txt` / `llms-full.txt` | LIVE 200 — **STALE**: masih tulis "3 articles" padahal 5 (publish tidak regen llms) |
| `robots.txt` | AI-bot allowlist sudah ada (GPTBot, ClaudeBot, Perplexity-Bot, Google-Extended, CCBot, Applebot-Extended) + block Ahrefs/Semrush |
| IndexNow key | `landing/public/indexnow.txt` ada; env `SOCIO_INDEXNOW_KEY` belum di-set lokal |
| Deploy | Manual `wrangler pages deploy` — **belum ada CI/CD otomatis** |
| Schema | Article + FAQPage + Breadcrumb (blog), WebSite + Organization (home) — sudah ada |
| Canonical/OG | Layout.astro sudah render canonical + OG + twitter card |

### 1.2 Pipeline SEO (`seo/` — PAUSED sejak 2 Sep)

| File | Kondisi |
|---|---|
| `generate.mjs` | **RUSAK**: `ROOT` hardcode `/Users/maabook/Desktop/socio.id` (path mesin lama). Pakai `opencode run` CLI → tidak bisa jalan di VPS. 2 test run terakhir **GATES FAIL** |
| `llms.mjs` | **RUSAK**: ROOT hardcode path lama yang sama |
| `prompts.ts` | **BUG**: LLM tulis `## Pertanyaan Umum` (bukan `## FAQ`) → `stripFaqSection` no-op → FAQ dobel (body + frontmatter). LLM sering output link sebagai plain URL → gate internal-link fail |
| `publish.mjs` | OK (ROOT dinamis) tapi **tidak panggil `llms.mjs`** sebelum build |
| `indexnow.mjs` | OK — batch ≤10, endpoint api.indexnow.org + yandex, state `seo/state.json` |
| `s2b-expand.mjs` | OK — 183 keyword di `queue.json` (5 published, 178 pending) |
| `sync-prices.mjs` (di `landing/seo/`) | **PELANGGARAN SECRET**: password MySQL prod hardcode di file + jalur SSH. Harus pindah ke env + akses langsung via Docker network. Bug tambahan: building `LIKE '${like}'` tanpa escaping |
| `state.json` | **HILANG** — tidak ada di `seo/` mesin lokal (bekas mesin lama). IndexNow dedup + status indexer harus bootstrap dari nol di runner |
| Root `package.json` | Belum ada script `seo:*` (todo lama belum dikerjakan) |

### 1.3 Blog (theme)

| Item | Kondisi |
|---|---|
| `/blog` index + `/blog/[slug]` | **Sudah sesuai DNA** (paper/ink/accent-tint, ledger rows, hairline, ArtThumb SVG, prose 65ch, TOC sticky/collapsible, FAQ accordion, reading progress bar) |
| `/blog/page/[n]` | **ROUTE TIDAK ADA** — index.astro link ke sana → 404 begitu artikel >6 (PER_PAGE=6). Blocking untuk scale |
| AdSense | **Belum ada sama sekali**. CSP di `landing/public/_headers` (`script-src 'self' 'unsafe-inline'`) **akan memblokir** AdSense — wajib update bareng pemasangan |
| Author/E-E-A-T | Article schema pakai `Organization` — belum ada author Person + badge "Diperbarui" |
| RSS | Tidak ada (`@astrojs/rss` belum terpasang) |
| Sitemap lastmod | Default @astrojs/sitemap (build-time) — belum "lastmod jujur" dari frontmatter sesuai spec §5 |
| Form newsletter `/blog` | POST ke `https://app.socio.id/newsletter` → **route TIDAK ADA (404)** — stub sejak D7 |

### 1.4 App (VPS `130.254.47.93`, Coolify v4)

| Item | Kondisi |
|---|---|
| Infra | Coolify: app container :3000 (SvelteKit + node-cron), MySQL 8 container, mailserver, Traefik |
| Email infra | **LENGKAP**: `email_queue` + cron drain tiap 5 mnt (`app/src/cron/email-queue.ts`) dengan guard anti-throttle pasca insiden Gmail 421: marketing max 10/run, Gmail max 5/run, transaksional prioritas |
| Campaign | `email_campaigns` + admin UI `/admin/email`: create/send/cancel, tracking open/click, **import XLS/CSV → `mailing_list`**, audience `xls_list`/`new_user`/`inactive`/`churn_risk`/`high_spender` |
| Broadcast | `/admin/broadcast`: in-app notification + web push per segment |
| Cron registry | `app/src/cron/jobs.ts` (node-cron) — tempat hook job baru (digest, welcome series) |
| Newsletter endpoint | **TIDAK ADA** — perlu dibuat (Fase E1) |

---

## 2. Arsitektur Final + Wireframe

**Prinsip**: konten = file MDX di **repo git terpisah** `socio-seo-content` (reviewable, rollback
gratis, TIDAK pernah memicu webhook deploy app). Generate = lokal (opencode CLI, sesuai keputusan
user). Publish/deploy/indexing/monitoring = otomatis di VPS via Coolify Scheduled Task.
Email = infra app yang sudah ada (jangan bangun baru).

```
┌─────────────────────────── LOKAL (Mac user) ───────────────────────────┐
│                                                                        │
│  pnpm seo:generate --count=20   (opencode run, model free rotasi)      │
│    queue.json (178 pending + merge queue.mined.json)                    │
│      └► prompt (prompts.ts) ─► LLM ─► gates + anti-dup ─► MDX draft    │
│  pnpm seo:push-drafts           (pull --rebase + git add+commit+push)   │
│                                                                        │
└──────────────────────────────┬───────────────────────────────────── ─┘
                               │ git push → REPO KONTEN (bukan repo app)
                               ▼
┌──────── GitHub: ReqTimeout/socio-seo-content (main) ───────────────────┐
│  blog/*.mdx · queue.json · queue.mined.json · state.json · prices.json │
└──────────────┬─────────────────────────────────────────────────────────┘
               │ git clone/pull (runner)          webhook push repo APP →
               ▼                                  ▼
┌─────────── VPS 130.254.47.93 — Coolify ──────────┐  ┌──────────────────┐
│                                                  │  │ app.socio.id     │
│  APP: socio-seo-runner (container node:22 +      │  │ (SvelteKit +     │
│       pnpm + git + wrangler; clone repo APP +    │  │  node-cron)      │
│       repo KONTEN — build landing pakai          │  │  TIDAK pernah    │
│       SEO_CONTENT_DIR)                           │  │  disentuh commit │
│  ┌────────────────────────────────────────────┐  │  │  konten          │
│  │ Coolify Scheduled Tasks (semua flock):     │  │  │                  │
│  │ ① 06:00 WIB  daily-publish                 │  │  │ • POST /newslet… │
│  │    flip N draft → llms → build → gates →   │  │  │ • /api/internal/ │
│  │    wrangler deploy → push KONTEN → IndexNow│  ├──┼─►   seo-notify     │
│  │ ② hourly     indexer                       │  │  │ • cron digest    │
│  │    GSC URL Inspection + Bing submit +      │  │  │   mingguan       │
│  │    IndexNow retry + auto-remedy            │  │  │ • cron welcome   │
│  │ ③ Senin 02:00 weekly                       │  │  │   series         │
│  │    sync-prices(HTTP app) → freshness →     │  │  │ • email_queue    │
│  │    gsc-mining → report email               │  │  │   drain 5 mnt    │
│  └────────────────────────────────────────────┘  │  └──────────────────┘
│       │ HTTP (BUKAN MySQL langsung)             │
│       ▼                                          │
│  ┌──────────────┐                                │
│  │ MySQL socio  │ ← app pool saja, runner TIDAK │
│  └──────────────┘   konek (Revisi 3)            │
└──────────────┬───────────────────────────────────┘
               │ wrangler pages deploy landing/dist
               ▼
┌──────── Cloudflare Pages `socio-id` → socio.id ─────────┐
│ HTML static + sitemap + JSON-LD + llms.txt + RSS        │
└──────┬───────────────────┬───────────────────┬──────────┘
       │ IndexNow ping     │ crawl             │ crawl (allowlisted)
       ▼                   ▼                   ▼
  Bing/Yandex/         Google              GPTBot/ClaudeBot/
  Naver/Seznam         (GSC SA monitor)    PerplexityBot/CCBot
  (= jalur ChatGPT     (= jalur AI         (= jalur Gemini/
   search & Copilot)    Overview)            Claude/Perplexity)
```

**Pembagian tanggung jawab:**

| Lokasi | Tugas | Kenapa di situ |
|---|---|---|
| Lokal (Mac) | Generate draft (AI), expand keyword, review `git diff` — push ke **repo konten** | opencode CLI + model free hanya praktis lokal; human-in-the-loop untuk kualitas |
| Repo konten (GitHub) | Menyimpan MDX draft/published + queue + state + prices + llms | Terpisah dari repo app = publish harian tidak pernah memicu rebuild app |
| VPS (Coolify runner) | Publish harian, build, deploy CF Pages, indexing, monitoring GSC/Bing, freshness, mining, sync harga (via HTTP app), report | 24/7, dekat app (HTTP internal endpoint), sesuai keputusan user |
| App (SvelteKit) | Newsletter subscribe, digest email, welcome series, campaign promo, notify endpoint | Infra email + queue + throttle guard sudah ada — jangan duplikasi |
| Cloudflare | Pages hosting, DNS, CDN, headers/CSP | Sudah live |

---

## 3. Keputusan Ritme Publish

User minta 20-30 artikel/hari. **Rekomendasi plan: ramp-gate 3 → 10/hari**, alasan (data, bukan opini):

1. **Google spam policy "scaled content abuse"** (berlaku sejak Mar 2024) persis menargetkan pola
   "ratusan artikel AI/hari di domain muda". Risiko: manual action → seluruh domain deindex,
   bukan cuma artikelnya.
2. **Pelajaran beriklan** (dokumen 26 Agu): 12.6k artikel live, hasil = avg posisi 70, ~0 klik,
   12.9k URL pending indexing. Volume bukan solusi — indexing + quality yang jadi bottleneck.
3. **Domain socio.id baru live ~1 bulan** (cutover 2 Sep) — belum ada trust history.
4. Queue cuma 178 pending — 30/hari habis dalam 6 hari, lalu publish apa? Growth harus dari
   mining GSC (demand nyata), bukan volume.
5. AdSense aktif + scaled AI content = risiko kebijakan AdSense (inventory traffic/scaled abuse).

**Mekanisme ramp-gate (otomatis di runner):**

```
N (artikel/hari) mulai = 3
Setiap Senin: index_rate = indexed_14d / published_14d   (dari URL Inspection API)
  index_rate ≥ 0.85 DAN 0 manual action  → N += 2   (cap 10)
  index_rate ≥ 0.70                      → N tetap
  index_rate < 0.70                      → N -= 1   (floor 1) + flag di report email
```

Buffer draft lokal tetap dibuat besar (300-600) — ritme dikontrol `seo/config.json` di runner,
bukan dari kecepatan generate. Kalau dalam 4 minggu index-rate konsisten ≥90% dan klik GSC naik,
cap bisa direvisi (keputusan user, data dari report mingguan).

---

## 4. Fase A — Perbaiki Pipeline Lokal

**Output**: `pnpm seo:generate` jalan lagi, gates PASS konsisten, buffer draft ter-push.

| # | Task | File | Detail |
|---|---|---|---|
| A1 | Fix ROOT hardcode | `seo/generate.mjs:30`, `seo/llms.mjs:17`, `seo/s2b-expand.mjs:9` | Ganti ke pola `new URL('..', import.meta.url)` (sudah benar di `publish.mjs`/`indexnow.mjs`) + env `SEO_CONTENT_DIR` menunjuk repo konten (path MDX/queue tidak lagi di bawah ROOT) — portable antar mesin |
| A2 | Fix FAQ heading mismatch | `seo/prompts.ts` | SYSTEM_PROMPT: heading FAQ wajib literal `## FAQ`. `stripFaqSection` relax: `/##\s*(FAQ\|Pertanyaan[^\n]*)[\s\S]*$/i`. Pastikan FAQ tidak dobel (body di-strip, frontmatter sumber tunggal) |
| A3 | Internal link deterministik | `seo/prompts.ts` (`assembleMdx`) | Jangan andalkan LLM untuk 3 link: auto-append section `## Baca juga` berisi 2 link related (dari frontmatter `related`) — LLM cukup 1 link money page natural di body. Gate ≥3 link selalu lulus |
| A4 | Related hanya slug existing | `seo/generate.mjs` (`pickRelated`) | Kandidat = item queue status `published` ATAU file MDX-nya ada di `landing/src/content/blog/` — cegah 404 internal link |
| A5 | Validasi link post-assemble | `seo/prompts.ts` (`validateMdx`) | Ekstrak semua link internal dari body → cek slug ada di koleksi → FAIL kalau ada yang 404 |
| A5b | **Guard anti-duplikat artikel** | `seo/generate.mjs` (baru) | Sebelum tulis MDX: bandingkan vs semua MDX existing — token-set keyword identik ATAU Jaccard 3-gram body ≥0.7 → FAIL "near-duplicate". Ini benteng nyata terhadap scaled-content-abuse (178 keyword + mining GSC bisa menghasilkan intent kembar: "harga followers ig" vs "jual followers instagram murah") |
| A5c | **Parser YAML frontmatter proper** | `seo/llms.mjs` | Ganti parser hand-rolled (~80 baris state machine, rapuh — title/description mengandung `:` atau quote dalam newline pecah) dengan `js-yaml` — dipakai juga oleh runner daily/weekly |
| A6 | Prompt tightening | `seo/prompts.ts` | Contoh format link markdown eksplisit di SYSTEM_PROMPT; target kata LLM 1100+ (biar setelah strip FAQ ≥850); tegaskan "output body markdown saja" |
| A7 | Script root | `package.json` (root) | `seo:generate`, `seo:publish`, `seo:expand`, `seo:llms`, `seo:prices`, `seo:push-drafts` |
| A8 | Batch generator | `seo/generate-batch.sh` (baru) | Loop `generate.mjs --count=10` × N, log ringkas per artikel (PASS/FAIL + alasan), stop-on-3-fail beruntun, summary di akhir. Target sesi: 50-100 draft |
| A9 | Push drafts | `seo/push-drafts.mjs` (baru) | `git pull --rebase` → `git add blog/ queue.json` → commit `content(seo): N drafts` → **push ke repo `socio-seo-content`** (bukan repo app!). Draft `draft:true` TIDAK ikut ter-build Astro jadi aman push kapan pun |
| A9b | Bootstrap repo konten | GitHub + `landing/astro.config.mjs` | Buat repo private `socio-seo-content`; pindahkan 5 MDX published + `seo/queue.json`; `state.json` di-bootstrap generator sederhana (deterministik dari queue status published); astro config: `base: process.env.SEO_CONTENT_DIR ?? 'src/content/blog'`; kosongkan `landing/src/content/blog` di repo app |
| A10 | llms regen di publish | `seo/publish.mjs` + `seo/llms.mjs` | Panggil `llms.mjs` di alur publish (fix llms.txt stale). **Catatan dependensi**: `llms.mjs` baca `dist/sitemap-0.xml` → harus jalan SETELAH build; solusinya refactor `llms.mjs` ambil daftar URL dari koleksi Astro (bukan dist) supaya bisa sekali jalan pra-build — lihat §14 |
| A11 | Hapus secret + hilangkan akses DB runner | `landing/seo/sync-prices.mjs` (HAPUS), app endpoint baru (E1b) | **Revisi 3**: `sync-prices.mjs` dihapus total (password MySQL hardcoded + SSH — pelangaran secret). Diganti: runner panggil `GET /api/internal/seo-prices` (endpoint app pakai Drizzle existing, tanpa kredensial tambahan di runner). **Rotasi password MySQL** (sudah pernah ter-commit: `git log -S 58a16bc8` + gitleaks scan sekali). |
| A12 | Env | `.env.example` + `.env` lokal | `SOCIO_INDEXNOW_KEY=278171ff…` (dari progress doc), `GSC_SERVICE_ACCOUNT_JSON`, `GSC_SITE_URL`, `BING_SITE_KEY`, `PUBLIC_ADSENSE_CLIENT`, `SEO_RUNNER_SECRET` |

**Test acceptance A**: `SEO_DEBUG=1 node seo/generate.mjs --count=1` → GATES PASS → MDX valid
(`draft:true`, FAQ 5 di frontmatter, body tanpa section FAQ, ≥3 internal link ke slug existing) →
`pnpm --filter landing build` sukses → artikel tidak muncul di `dist/` (draft).

---

## 5. Fase B — Theme Blog + AdSense

**Prinsip**: theme existing sudah DNA — jangan rombak, hanya tambah yang kurang. AdSense HANYA di
artikel blog (pelajaran B7 beriklan: halaman funnel/money page = 0 iklan, biar conversion path bersih).

| # | Task | File | Detail |
|---|---|---|---|
| B1 | **Route pagination** `/blog/page/[n]` | `landing/src/pages/blog/page/[n].astro` (baru) | `getStaticPaths` dari jumlah artikel non-draft, PER_PAGE=6 sama dengan index; ledger rows DNA sama; windowed pagination `1 2 … N`; **SEMUA halaman indexable + canonical self-referensi** (bukan noindex ≥2 — noindex justru menyembunyikan artikel lama dari crawl/discovery; Google sudah hapus `rel=next/prev` sebagai sinyal, pagination cukup link `href` biasa + tidak masuk sitemap); schema ItemList + Breadcrumb |
| B2 | Komponen `AdsenseSlot.astro` | `landing/src/components/AdsenseSlot.astro` (baru) | Props: `slot`, `format`, `class`. Render `<ins class="adsbygoogle">` HANYA jika `PUBLIC_ADSENSE_CLIENT` terisi. **Reserve min-height per slot (anti-CLS)**: inline-top 280px, mid 250px, after-article 280px (mobile) / 90px desktop. Lazy: script `pagead2` baru load saat scroll pertama / idle 3s (pola beriklan `__loadAdSense`) |
| B3 | Pasang 3 slot di artikel | `landing/src/pages/blog/[slug].astro` | ① setelah paragraf pembuka (sebelum H2 pertama) ② mid-body (setelah H2 ke-2) ③ setelah FAQ/sebelum "Baca juga". Max 3 — lebih dari itu viewability turun + CLS naik (pelajaran B3 beriklan) |
| B4 | Meta + auto ads | `landing/src/layouts/Layout.astro` | Prop `adsense: boolean` (default false) → render `<meta name="google-adsense-account">` + loader script hanya di `[slug].astro`. Auto ads (anchor mobile) ON — vignette OFF (ganggu reading) |
| B5 | **Update CSP** | `landing/public/_headers` | `script-src` += `https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.googleadservices.com https://www.googletagmanager.com`; `frame-src` += `https://googleads.g.doubleclick.net https://tpc.googlesyndication.com`; `connect-src` += `https://pagead2.googlesyndication.com https://*.adtrafficquality.google https://ep1.adtrafficquality.google`. **Test setelah deploy**: 0 error CSP di console dengan ads aktif |
| B6 | Author box E-E-A-T | `[slug].astro` | Blok kecil setelah artikel: nama penulis (Person, mis. "Tim Socio.id" → schema `Person` + `sameAs` link ke halaman tentang/profil), 1 kalimat kredibilitas. Article schema `author` ganti Organization → Person (publisher tetap Organization) |
| B7 | Badge freshness | `[slug].astro` | Jika frontmatter `updated` ada → badge "Diperbarui {tanggal}" + `dateModified` schema (sudah ada di schema, tinggal UI) — sinyal recency untuk user + AI |
| B8 | Speakable schema | `[slug].astro` | Tambah `speakable` (cssSelector `h1` + paragraf pertama) di Article JSON-LD — dipakai Google Assistant/AEO |
| B9 | RSS | `landing/src/pages/rss.xml.js` (baru) + `@astrojs/rss` | Feed 20 artikel terakhir; `<link rel="alternate" type="application/rss+xml">` di Layout; referensi di robots.txt tidak wajib (auto-discovery) |
| B10 | Sitemap lastmod jujur | `landing/astro.config.mjs` | `sitemap({ serialize: { '/blog/:slug': ... } })` — lastmod dari `updated ?? pubDate` frontmatter; money page lastmod dari `syncedAt` prices.json |
| B11 | Related mesh 2 arah | `landing/src/layouts/BeliPage.astro` + komponen baru `RelatedArticles.astro` | Money page dapat section "Artikel terkait" — filter artikel blog per cluster/platform (match dari slug/category), max 3, build-time. Ini D9: crawl discovery 1-hop dari halaman yang sudah ranking |
| B12 | Verifikasi visual | — | pw-vision audit mobile 360×640 + desktop: slot ads tidak geser layout (CLS 0), DNA konsisten, dark-ink contrast AA |

**Catatan AdSense**: slot dirender conditional — sebelum `PUBLIC_ADSENSE_CLIENT` diisi, tidak ada
markup ads sama sekali (build bersih). Setelah ID diberikan: isi env di runner + rebuild.

---

## 6. Fase C — Runner Coolify di VPS

**Service baru**: Coolify Application `socio-seo-runner` — bukan bagian app SvelteKit.
Runner clone **dua repo**: repo app (source landing) + repo **konten** (`socio-seo-content`).
Push harian hanya ke repo konten → webhook auto-deploy app tidak pernah terpicu.

**Mutex (WAJIB di semua task)**: schedule Coolify dipanggil `flock -n /lock/<task>.lock node …`
— `flock -n` = skip kalau run sebelumnya masih hidup (build lama/overlap), bukan jalan paralel
yang saling merusak `git index` + `state.json`. Skip juga di-log + counter di state (kalau
3 skip beruntun → flag di report).

### C1. Dockerfile runner (`seo/runner/Dockerfile`)

```
node:22-alpine
 + git, pnpm, bash, util-linux (flock)
 + clone repo app + repo konten saat build → /work/{app,content}
 + pnpm install (landing workspace only, --frozen-lockfile)
 + wrangler via npx (tidak di-install global)
 ENTRYPOINT sleep infinity   ← container hidup, Scheduled Task = docker exec + flock
```

Keputusan tetap: **re-clone/reset hard tiap run** (`git fetch && git reset --hard origin/main`)
— anti drift; repo konten kecil (~detik). `state.json`/`queue.json` = sumber kebenaran di git,
bukan di container.

### C2. Scheduled Tasks (Coolify → app socio-seo-runner → tab Scheduled Tasks)

| Task | Schedule (WIB) | Command | Fungsi |
|---|---|---|---|
| `seo-daily` | `0 6 * * *` | `flock -n /lock/daily.lock node seo/runner/daily.mjs` | Publish N artikel + deploy + ping |
| `seo-indexer` | `15 * * * *` (tiap jam menit 15) | `flock -n /lock/indexer.lock node seo/runner/indexer.mjs` | Verifikasi index + retry submit |
| `seo-weekly` | `0 2 * * 1` (Senin 02:00) | `flock -n /lock/weekly.lock node seo/runner/weekly.mjs` | Harga, freshness, mining, report |

Semua run dicatat ke `seo/runner/logs/YYYY-MM-DD-<task>.log` (dalam container) + ringkasan di-push
ke `state.json` **di repo konten** supaya bisa diaudit dari lokal tanpa SSH.

> **Pilihan pola eksekusi (putuskan eksplisit saat setup Sprint 3, jangan digantung)**:
> (a) Coolify Scheduled Task (`docker exec` + flock) — terlihat di UI Coolify, tapi log CLI tidak
> tertangkap baik; atau (b) **crontab di dalam container runner** + log ke volume mount, Coolify
> task hanya watchdog (`flock … daily.mjs --check-heartbeat`, alert kalau >36 jam tidak publish).
> Rekomendasi: (b) — log andal, heartbeat bisa diverifikasi antar task.

### C3. `daily.mjs` — workflow publish harian

```
1  repo app: git fetch + reset --hard origin/main; repo konten: sama
2  baca seo/config.json → N (ramp-gate §3) + daily cap
3  ambil N draft terbaik dari queue.json (status='draft', priority DESC,
   lama duduk ASC) yang file MDX-nya ada di repo konten + draft:true
4  flip frontmatter: draft:false, pubDate=today
5  SEO_CONTENT_DIR=repo-konten/blog pnpm --filter landing build
6  regen llms.txt/llms-full.txt (llms.mjs jalan SETELAH build — dia baca
   dist/sitemap-0.xml; output ke landing/public/ yang sudah terlanjur ter-salin
   ke dist → salin ulang manual 2 file ke dist, atau build ulang ringan ~30s).
   Alternatif bersih (rekomendasi A10): refactor llms.mjs baca daftar URL dari
   koleksi Astro, bukan dist → bisa jalan sebelum build sekali jalan)
7  POST-BUILD GATES (gagal = abort deploy + git checkout . + email alert):
   a. parse semua JSON-LD di dist/blog/* → valid & field wajib ada
   b. crawl internal link di dist/ → 0 link ke URL 404 (set lokal terhadap
      daftar file dist)
   c. dist/sitemap-index.xml memuat URL baru
   d. dist/llms.txt menyebut jumlah artikel yang benar
8  wrangler pages deploy landing/dist --project-name socio-id --branch main
9  curl verifikasi live: URL baru 200 + title benar
10 repo konten: git add (MDX terflip + queue.json + state.json + llms* +
   deploy.json) → commit "content(seo): publish N artikel YYYY-MM-DD" →
   push origin main   ← HANYA repo konten, TIDAK pernah push repo app
11 node seo/indexnow.mjs <N url baru>
12 POST https://app.socio.id/api/internal/seo-notify (secret di header,
    rate-limit per-IP, jangan echo payload di response) → app simpan metadata
    artikel untuk digest mingguan (E2)
13 update state.json: published[], tanggal, N, ramp-gate snapshot → commit push
```

**Rollback**: deploy CF Pages = deployment id tercatat di `deploy.json` (repo konten) →
`wrangler pages deployment rollback <id>` (pola LANDING_DEPLOY.md §5) + flip balik frontmatter
+ commit `content(seo): rollback <slug>`.

**Catatan webhook (berubah pasca Revisi 2)**: publish harian TIDAK menyentuh repo app sama sekali
→ tidak ada lagi masalah rebuild app tiap pagi. Repo app hanya di-push manual untuk perubahan
kode landing (proses biasa, tetap lewat review user).

### C4. `indexer.mjs` — workflow indexing (lihat juga §7)

```
1  repo konten: git pull; baca state.json → daftar URL published ≤14 hari + status index
2  GSC URL Inspection API (SA): batch 50/run, cek coverageState tiap URL baru
   → simpan: indexed / discovered-not-indexed / crawled-not-indexed
   (hemat kuota: prefilter pakai jumlah sitemap GSC API, Inspection hanya
   untuk URL yang butuh detail remedy)
3  URL belum ter-submit Bing → Bing URL Submission API (cap 10/hari;
   prioritas: money page dulu, lalu artikel baru)
4  URL published >48 jam + belum indexed → retry IndexNow (batch ≤10)
5  URL published >7 hari + masih "discovered/crawled-not-indexed" →
   AUTO-REMEDY: tandai di state → weekly.mjs menambahkan internal link dari
   2 money page relevan + section "Artikel terbaru" (mesh boost) saat
   rebuild berikutnya; kalau masih belum indexed 14 hari → flag REVIEW di
   report (mungkin konten tipis — kandidat regenerate lokal)
6  kuota aman: Inspection API 2000/hari — kita pakai ≤150/hari
```

### C5. `weekly.mjs` — growth loop mingguan

```
1  sync-prices via HTTP: fetch app endpoint (BUKAN MySQL langsung):
     GET https://app.socio.id/api/internal/seo-prices (secret header)
     → response identik prices.json (top14 + platform counts + syncedAt)
   → tulis ke prices.json di REPO KONTEN → commit
   (fallback: kalau endpoint error 3× beruntun → pakai prices.json terakhir,
   skip sync, flag di report. Runner TIDAK punya kredensial DB sama sekali)
2  freshness deterministik (0 AI):
   - pilih 3 artikel: prioritas = (a) punya `updated` tertua / belum pernah,
     (b) dari state GSC: impresi >0 tapi posisi menurun
   - re-inject tabel harga terbaru (renderPriceTable dari prices.json — blok
     template, bukan karangan AI) + set frontmatter `updated: today`
3  GSC mining (Search Analytics API, 28 hari) → tulis ke queue.mined.json
   (file khusus runner — lokal yang merge ke queue.json, lihat §0.3):
   - query impresi ≥20 tanpa URL socio.id yang cocok → append (added_by:'gsc',
     priority 40+imps/5) SETELAH dedup vs token-set keyword queue existing
     (cegah intent kembar → cegah artikel kembar)
   - posisi 4-20 → flag `push_refresh` (diproses indexer: IndexNow + inspect)
   - CTR ≤2% & posisi ≤20 & impresi ≥50 → flag `ctr_fix` → REWRITE
     DETERMINISTIK title/description dari template (pola: angka + harga +
     tahun), commit — tanpa AI di VPS. Kalau hasil template jelek, flag ke
     report untuk rewrite manual/lokal
4  build + deploy + push ke REPO KONTEN (seperti daily langkah 6-10)
5  report email (POST ke app endpoint → email_queue priority tinggi):
   - published minggu ini, indexed-rate, N minggu depan (ramp-gate)
   - avg position, klik, impresi, top 5 gain / top 5 decline
   - daftar flag: ctr_fix, push_refresh, REVIEW
   - kuota IndexNow/Bing terpakai
```

### C6. Env runner (di-set via Coolify UI, JANGAN commit)

`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID=0298214d…`, `GH_TOKEN` (PAT **scope hanya repo
konten** — runner tidak punya hak push repo app), `SEO_CONTENT_REPO_URL`, `SEO_CONTENT_DIR`,
`SOCIO_INDEXNOW_KEY`, `GSC_SERVICE_ACCOUNT_JSON`, `GSC_SITE_URL=https://socio.id/`,
`BING_SITE_KEY`, `SOCIO_APP_URL=https://app.socio.id`, `SEO_RUNNER_SECRET` (bearer
untuk panggil endpoint app), `PUBLIC_ADSENSE_CLIENT`.

> **Revisi 3: TIDAK ADA `SOCIO_DB_*` di runner.** Koneksi MySQL app terproteksi —
> runner hanya HTTP call ke endpoint app (lebih aman, no credential spread, no pool contention).

---

## 7. Fase D — Menangkan Google + AI Search

Deep-dive fitur yang bisa diotomatiskan (jawab permintaan "jangan biasa"):

| # | Fitur | Kanal | Cara | Status |
|---|---|---|---|---|
| D1 | **Search Analytics harian** | GSC SA | Tarik query×page 28 hari tiap pagi → `state.json` ranks. Menggantikan export CSV manual sepenuhnya. Dasar semua loop lain | baru |
| D2 | **URL Inspection verifier** | GSC SA | Lihat C4. Deteksi dini "Discovered – currently not indexed" (penyakit beriklan) + auto-remedy mesh | baru |
| D3 | **IndexNow multi-endpoint** | Bing/Yandex/Naver/Seznam | Sudah ada `indexnow.mjs` — wire ke daily + retry di indexer. **Bing index = jalur ke ChatGPT search & Copilot** | ada, wire |
| D4 | **Bing URL Submission API** | Bing Webmaster | 10 URL/hari (kuota API), prioritas money page → artikel baru | baru |
| D5 | **llms.txt + llms-full.txt** | AI crawlers | Regen tiap publish (A10) — Gemini/Perplexity/Claude/CCBot ingest via allowlist robots | ada, wire |
| D6 | **Schema lengkap + validasi** | Google/AI | Article+Person author, FAQPage, Breadcrumb, Speakable, WebSite+Organization (ada). **Validator JSON-LD otomatis post-build** (C3.7a) — schema rusak = tidak pernah deploy | sebagian |
| D7 | **Freshness deterministik** | Google | Weekly re-inject tabel harga + `updated` (C5.2) — recency signal tanpa AI, tidak bisa "halu" | baru |
| D8 | **CTR-fix loop** | GSC | Posisi 4-20 + CTR rendah → rewrite title/desc template deterministik (C5.3). Versi AI (zen HTTP) opsional kalau key tersedia di runner | baru |
| D9 | **Internal mesh 2 arah** | Google crawl | Money page → artikel (B11) + artikel → money page (sudah di CTA/body) + related antar artikel (frontmatter). Artikel baru selalu 1-hop dari halaman ter-index | sebagian |
| D10 | **Report email mingguan** | Resend via app | C5.5 — monitoring tanpa buka dashboard, ada di inbox tiap Senin | baru |
| D11 | **AEO format konten** | AI Overview | Sudah by-design: kalimat pertama = definisi ≤40 kata (gate validateMdx), FAQ 5, tabel harga real. Pertahankan | ada |
| D12 | **RSS feed** | Bing/agregator | B9 — sinyal freshness, murah | baru |
| D13 | **Broken-link + gate deploy** | kualitas | C3.7b — 0 internal link 404 pernah lolos ke produksi | baru |

**Manual sekali (butuh user)** — tidak bisa diotomatiskan:
1. GSC: verifikasi property `socio.id` (DNS TXT via Cloudflare) → add service account sebagai **Owner** → submit `sitemap-index.xml` sekali.
2. Bing Webmaster Tools: import dari GSC (5 menit) → ambil **API key** (D4) → submit sitemap.
3. Google Indexing API: **JANGAN dipakai** — deprecated mid-2026 (spec §0) & memang hanya untuk JobPosting/LiveStream. Pengganti = D2/D3/D4.
4. (Opsional) Google Publisher Center: skip — blog bukan news, kemungkinan besar ditolak.

**Strategi AI search (kenapa ini menang di "semua AI")**:
- **ChatGPT/Copilot** → ambil dari index **Bing** → D3 IndexNow + D4 Bing submit = jalur tercepat.
- **Gemini/Google AI Overview** → dari index Google + allowlist `Google-Extended` (sudah) → D1/D2/D7.
- **Perplexity** → crawl sendiri (`Perplexity-Bot` allowlisted) + index Bing/Google → D5 llms.txt memberi jalur ingest langsung.
- **Claude** → `ClaudeBot`/`anthropic-ai` allowlisted (sudah) + llms-full.txt.
- Semua jawaban AI mengutip halaman yang **ter-index + FAQ schema + definisi kalimat pertama** — format artikel kita sudah dirancang untuk itu (D6/D11).

---

## 8. Fase E — Email List + Penawaran Client Baru

Prinsip: **pakai infra app yang sudah ada** (email_queue + guard throttle + campaign UI + mailing_list).
Yang dibangun hanya: endpoint newsletter, 2 cron kecil, 1 tabel metadata artikel, template.

### E1. Newsletter subscribe (fix 404)

```
POST https://app.socio.id/newsletter        (form /blog + end-of-article)
  ├─ validasi email + rate-limit per-IP (infra ada) + Turnstile (kalau aktif)
  ├─ insert mailing_list (source='newsletter', subscribed=0, token konfirmasi)
  └─ kirim email konfirmasi (Resend, transaksional → prioritas tinggi di queue)
GET  /newsletter/confirm?token=…  → subscribed=1 + halaman thanks (DNA app)
GET  /newsletter/unsubscribe?token=… → subscribed=0 (link wajib di tiap email)
```

Double opt-in sengaja: pasca insiden Gmail 421 (Sep 2026), list yang tidak dikonfirmasi =
risiko spam-rate. Perlu kolom token di `mailing_list` (migration kecil).

### E1b. SEO internal endpoints (Revisi 3 — DITANGGUHKAN 30 Sep)

> ⚠️ **REVISI 30 Sep (instruksi user: JANGAN sentuh app.socio.id yang berjalan)** — endpoint
> `seo-prices` sempat selesai lalu **DI-REVERT TOTAL** (`app/` bersih 0 perubahan, terverifikasi
> via `git status`). Rencana di bawah ini **DITANGGUHKAN**, bukan dibatalkan: pengganti sync harga
> untuk runner perlu desain ulang tanpa endpoint app (opsi: GitHub Action terjadwal / script lokal
> admin — putuskan Sprint 3, lihat A11). Prinsip Revisi 3 tetap: runner tidak pegang kredensial DB.

Runner **tidak punya credential MySQL sama sekali** (keputusan user 30 Sep: takut error/bentrok).
Semua data yang runner butuhkan di-expose app via 2 endpoint tipis:

```
app/src/routes/api/internal/seo-prices/+server.ts     GET → JSON { syncedAt, totalServices, top[14], platforms }
app/src/routes/api/internal/seo-changelog/+server.ts  GET ?days=7 → JSON [ { service_id, change_type, name, price_old, price_new } ]
```

Auth: `Authorization: Bearer <SEO_RUNNER_SECRET>` (env sama yang dipakai notify). Rate-limit 10/mnt/IP.
Query pakai Drizzle connection pool app existing → tidak ada DB baru, tidak ada kredensial tambahan.
Response di-cache 1 jam di app (module-level `lastFetch` sederhana, tanpa Redis).

File ≈ 40 baris per endpoint, tidak menyentuh logic app lain. Dibuat Sprint 5 bareng E1.

### E2. Digest mingguan otomatis ("Kabar Socio")

```
runner daily.mjs ──POST /api/internal/seo-notify (secret)──► app: tabel
  seo_articles (slug, title, description, published_at, emailed=0)

cron app baru `newsletter-digest` (Jumat 09:00 WIB):
  ambil artikel 7 hari terakhir (max 3) + 1 highlight (harga turun/layanan baru
  dari service_changelog) → render template email (DNA socio: 1 kolom, teks
  pendek, CTA "Baca di blog" + CTA kedua "Cek harga layanan")
  → insert email_queue templateName='campaign-digest-…' per subscriber
  → drain cronexisting kirim dengan guard (10/run marketing, Gmail 5/run)
```

Frekuensi digest ikut throttle guard — kalau list besar, pengiriman otomatis
nyicil beberapa hari. Tidak perlu infra baru.

### E3. Welcome series signup baru (konversi → order pertama)

```
cron app baru `welcome-series` (harian 08:00):
  D+2 setelah daftar, belum order  → email "Cara order pertama dalam 5 menit"
                                     (link artikel blog relevan + CTA /pesan)
  D+7 setelah daftar, belum order  → email "Hitungan untung reseller"
                                     (link /blog/modal-jualan-followers + CTA)
  D+14, belum deposit              → email promo bonus deposit 10%
                                     (SOCIO_DEPOSIT_BONUS sudah ada)
  semua: skip kalau sudah order/deposit; 1 email/user/hari max
```

### E4. Penawaran ke client baru (list eksternal)

Pakai yang SUDAH ada: `/admin/email` → import XLS/CSV → audience `xls_list` → kampanye.
**Aturan main (wajib, jaga reputasi domain)**:
- Pace 30-60/hari (guard queue sudah memaksa: marketing 10/run × cron 5 mnt ≈ max 120/jam —
  set daily campaign cap manual di bawah itu, mis. 50).
- Wajib header `List-Unsubscribe` + `List-Unsubscribe-Post` (RFC 8058 — syarat Gmail/Yahoo 2024)
  dan link unsubscribe di body.
- Kirim dari subdomain/alamat terpisah? → pakai `newsletter@socio.id` (mailserver VPS sudah ada /
  Resend) — cek SPF/DKIM/DMARC record zona socio.id sebelum kampanye pertama.
- Monitor Google Postmaster Tools tiap minggu; spam rate <0.1% sebelum naikkan pace.
- **Jangan kirim artikel digest ke xls_list** — digest hanya untuk subscriber terkonfirmasi.
  xls_list = penawaran (promo deposit, harga reseller), 1-2×/bulan max.

### E5. Template kampanye bulanan (kalender, dieksekusi via admin UI yang ada)

| Bulan-minggu | Kampanye | Audience |
|---|---|---|
| W1 | Promo bonus deposit 10% | active + inactive |
| W2 | Digest (otomatis E2) | newsletter |
| W3 | "Layanan baru/turun harga" (dari service_changelog) | all users |
| W4 | Win-back: saldo mengendap / 30 hari tidak order | churn_risk |

---

## 9. Wireframe Workflow per Komponen

### 9.1 Alur besar (siapa mengerjakan apa, kapan)

```
 MINGGU N
 ────────
 [User, lokal, kapan saja ~30 mnt]
   pnpm seo:generate --count=30   → draft MDX baru (gates PASS)
   pnpm seo:push-drafts           → git push
                    │
                    ▼ (draft nunggu di repo — TIDAK live, draft:true)
 [VPS, tiap hari 06:00 WIB — OTOMATIS]
   daily.mjs: flip 3-10 draft → build → gates → deploy CF Pages → push →
              IndexNow → notify app
                    │
                    ├──► [Cloudflare Pages] socio.id live ≤5 mnt setelah flip
                    ├──► [Bing/Yandex] IndexNow ping → index jam-harian
                    └──► [App] metadata artikel tersimpan untuk digest
 [VPS, tiap jam — OTOMATIS]
   indexer.mjs: cek URL baru ter-index? belum → retry + remedy
 [VPS, Senin 02:00 — OTOMATIS]
   weekly.mjs: harga sync → freshness → mining keyword GSC → report email
                    │
                    ▼
 [User, Senin pagi] baca report email → keputusan: naikkan N? regenerate
   artikel yang di-flag REVIEW? (satu-satunya langkah manual rutin)
 [App, Jumat 09:00 — OTOMATIS]
   digest "Kabar Socio" → email_queue → subscriber newsletter
```

### 9.2 State machine satu artikel

```
 keyword (queue.json)
   │  status: pending
   ▼  [LOKAL] generate.mjs — LLM + template + gates
 draft MDX (draft:true) ──git push──► repo
   │  status: draft
   ▼  [VPS] daily.mjs (antri priority DESC; N/hari ramp-gate)
 published (draft:false, pubDate) ──deploy──► LIVE socio.id/blog/<slug>
   │  status: published        │
   │                           ├─► IndexNow ping (D+0)
   │                           ├─► Bing URL submit (D+0..1, antre 10/hari)
   │                           ├─► URL Inspection (D+1, D+3, D+7) ── indexed? ──► DONE
   │                           │        └─ belum: mesh boost (weekly) ─► inspect lagi
   │                           │        └─ 14 hari belum: flag REVIEW → regenerate lokal
   │                           └─► digest email (Jumat berikutnya)
   ▼  [VPS weekly, berulang]
 refreshed (tabel harga baru + updated=today) → re-index signal
   │
   ▼  [VPS weekly, dari data GSC]
 optimized (ctr_fix title/desc · push_refresh posisi 4-20)
```

### 9.3 Alur uang/traffic (kenapa semua ini nyambung ke revenue)

```
 Google/Bing/AI search
   │  (artikel how-to & definisi — informational)
   ▼
 socio.id/blog/<slug>  ← AdSense 3 slot (revenue pasif)
   │  CTA dalam artikel + Baca juga + money page mesh
   ▼
 socio.id/beli-* & /layanan & /reseller  (money page, 0 iklan — fokus konversi)
   │  CTA "Daftar reseller Rp50.000"
   ▼
 app.socio.id/daftar  ──► welcome series email (E3) ──► order pertama
   │                                    │
   ▼                                    ▼
 revenue margin order            newsletter subscriber
                                         │
                                 digest mingguan (E2) → retention → repeat order
 Daftar email eksternal (XLS) ──► kampanye penawaran (E4, pace aman) ──► signup
```

---

## 10. Env / Secrets yang Dibutuhkan

| Variable | Dipakai | Sumber | Status |
|---|---|---|---|
| `PUBLIC_ADSENSE_CLIENT` | Fase B (slot blog) | **user (menyusul)** | ⏳ |
| `GSC_SERVICE_ACCOUNT_JSON` | Fase C/D indexer | **user (menyusul)** | ⏳ |
| `GSC_SITE_URL` | indexer | `https://socio.id/` (atau `sc-domain:socio.id` kalau property domain) | ikut SA |
| `BING_SITE_KEY` | D4 URL submission | Bing Webmaster Tools (setelah user setup) | ⏳ |
| `CLOUDFLARE_API_TOKEN` / `_ACCOUNT_ID` | deploy Pages | `accountcf.md` (sudah ada) | ✅ |
| `SOCIO_INDEXNOW_KEY` | indexnow.mjs | `landing/public/indexnow.txt` = `278171ff…` | ✅ (tinggal set env) |
| `GH_TOKEN` | runner push content commit | GitHub PAT — **fine-grained, scope HANYA repo `socio-seo-content`** (runner fisik tidak bisa push repo app) | ✅ tersimpan di `.env` lokal 30 Sep (gitignored; API 200 login ReqTimeout) — tinggal verifikasi scope repo saat Sprint 3 |
| `SEO_CONTENT_REPO_URL` / `SEO_CONTENT_DIR` | runner + lokal | URL repo konten + path mount saat build | baru (Revisi 2) |
| `SEO_RUNNER_SECRET` | notify runner→app | generate random 32 char | baru |
| `SOCIO_DB_*` (runner) | ~~sync-prices langsung~~ | **DIHAPUS Revisi 3** — runner tidak punya credential MySQL. Data via HTTP endpoint app | ❌ tidak ada |
| `RESEND_API_KEY` | digest/report (via app, sudah ada) | env app | ✅ |

Semua di-set via **Coolify UI (Environment Variables)** untuk runner dan `.env` lokal (gitignored)
untuk generate — JANGAN commit (AGENTS.md §6).

---

## 11. Urutan Eksekusi

| Sprint | Isi | Dependensi | Output terukur |
|---|---|---|---|
| **0** | ✅ **SELESAI 30 Sep (kode)** — path portabel `seo/paths.mjs`, ROOT hardcode hilang, `SEO_CONTENT_DIR` di astro config, llms regen masuk ke `publish.mjs`, `stripFaqSection` match `## Pertanyaan*`, `## Baca juga` deterministik. **BELUM**: bootstrap repo `socio-seo-content-id` (A9b) + rotasi password MySQL (A11) — butuh token/user | — | build landing lokal 20 page OK dengan pipeline baru |
| **1** | 🟡 **Fase A lokal SELESAI 30 Sep** (A1–A10, A12, S0 ✅; A9b repo konten ✅; A11 file secret terhapus, endpoint app di-revert, rotasi pwd pending user). **Fase F SELESAI (menunggu approval user)**: `seo/cities.json` 69 kota + `seo/geo-expand.mjs` → 858 kandidat (828 geo + 30 intent) + **gate kode aktif**: `generate.mjs` exit 1 kalau daftar keyword belum di-approve. **BELUM dibuka**: batch 50-100 draft (menunggu item §13 no.9) | Sprint 0 | `keywords.geo.json` terisi; gate terbukti menolak generate sebelum approval |
| **2** | ✅ **SELESAI 30 Sep — Fase B B1–B12 + B13 (redesign)**: pagination, AdSense blog-only (`ca-pub-4438184351486735`), CSP, E-E-A-T Person, RSS, lastmod jujur, mesh money page, rewrite total `[slug]` + `/blog` (Unsplash terverifikasi, drop-cap, H2 bernomor, share, OG per-artikel), anti-kesimpulan di 3 MDX + prompt/gate. Sisa B12: audit visual browser + test CSP real (butuh preview/deploy) | — | build 20 page ✅, check 0 error, lint bersih*, 29 JSON-LD valid (*kecuali pre-existing `beli-pages.ts`) |
| **3** | Fase C (Dockerfile runner + Coolify app + 3 scheduled task flock + daily publish ramp N=3) | Sprint 0+1+2, CF token, GH_TOKEN | artikel terbit otomatis tiap 06:00; state.json ter-push ke repo konten; repo app tidak tersentuh; IndexNow 200 |
| **4** | Fase D (indexer SA + Bing + report) | **SA JSON + GSC/Bing setup dari user** | indexed-rate terukur; report email Senin pertama |
| **5** | Fase E (newsletter endpoint + DOI + digest + welcome series) | Sprint 3 (notify) | form /blog 200; digest Jumat pertama; welcome series aktif |
| **6** | Kalender kampanye E4/E5 (ops via admin UI) | Sprint 5 + list XLS user | kampanye penawaran pertama (pace aman) |

Sprint 1-2 bisa jalan paralel. Sprint 3 tanpa Sprint 4 tetap berguna (IndexNow jalan tanpa SA;
SA hanya menambah verifikasi + Bing submit + mining otomatis).

---

## 12. Definition of Done

Per sprint, semua wajib:

- [ ] `pnpm lint && pnpm typecheck && pnpm --filter landing build` (dan `--filter app` untuk Fase E) lulus
- [ ] Audit mobile 360×640 + 768×1024 (pw-vision) untuk perubahan UI blog
- [ ] Lighthouse blog mobile ≥90, CLS 0 **dengan slot ads terisi**
- [ ] 0 internal link 404 (gate C3.7b)
- [ ] llms.txt + sitemap konsisten dengan jumlah artikel live setelah tiap publish
- [ ] Untuk runner: 3 hari run berturut-turut sukses tanpa intervensi + log ter-push
- [ ] Update checklist di dokumen ini + `REBUILD_PLAN.md §9` bila relevan
- [ ] Commit format: `feat(seo): …` / `fix(seo): …` / `content(seo): …`

**KPI 90 hari** (dilacak report mingguan D10):

| Metric | Target 90 hari |
|---|---|
| Artikel published | 150-250 (ramp 3→10/hari) |
| Indexed rate (URL ≤14 hari) | ≥85% |
| Money page terindex semua | 10/10 (`site:socio.id/beli-`) |
| Klik organik GSC/minggu (minggu ke-12) | ≥100 |
| Avg position | ≤30 (dari ~70-an baseline domain baru) |
| Newsletter subscriber terkonfirmasi | ≥200 |
| ChatGPT/Perplexity citation | muncul ≥1 query brand ("socio.id", "smm panel") — cek manual bulanan |
| Insiden | 0 manual action, 0 spam-rate warning, CLS 0 |

---

## 13. Yang Menunggu dari User

| # | Item | Kapan dibutuhkan | Status 30 Sep |
|---|---|---|---|
| 1 | ~~`ca-pub-…` AdSense~~ → **Slot ID unit manual** (3 slot: top/mid/bottom) ATAU aktifkan Auto Ads di dashboard | Slot ID: kapan saja (page-level script sudah live) | ✅ client `ca-pub-4438184351486735` diterima + terpasang blog-only |
| 2 | GSC: verifikasi property socio.id + add service account sebagai Owner + submit sitemap | sebelum Sprint 4 | ⬜ |
| 3 | Bing Webmaster: import GSC + API key | sebelum Sprint 4 | ⬜ |
| 4 | ~~GH_TOKEN + repo private~~ | Sprint 0–3 | ✅ PAT tersimpan di `.env` lokal (gitignored, API 200); repo `socio-seo-content-id` private ✅ (A9b) |
| 5 | Keputusan: setuju ramp-gate 3→10/hari (§3) atau override | Sprint 1 | ⬜ (default plan: 3→10) |
| 6 | ~~Persona penulis (B6)~~ | Sprint 2 | ✅ default "Tim Socio.id" terpasang; bisa diganti kapan pun |
| 7 | List XLS client (kalau mau E4) + persetujuan pace 50/hari | Sprint 6 | ⬜ |
| 8 | Rotasi password MySQL prod (A11 — password pernah ter-commit, sudah ter-push `origin/main`) + keputusan nasib `seo/sync-prices.mjs` varian-2 + desain ulang sync harga tanpa sentuh app | Sprint 1–3 | ⬜ (instruksi: tanpa ubah kode — ganti di DB + env Coolify) |
| 9 | Koreksi/approval dataset kota + anchor ekonomi lokal di `cities.json`, isi `_meta.approved_at` + `approved:true` di `seo/keywords.geo.json` | Sprint 1 | ✅ SELESAI 30 Sep (delegasi): 72 kota reviewed, 894 kandidat approved + promote, queue 1077 |
| 10 | Deploy landing (wrangler) agar B13 live di socio.id + audit visual pasca-deploy | sekarang | ✅ DEPLOYED 30 Sep ~21:55 (`930b2df1`, 31 file baru/54 reuse). Verifikasi live: title home IDENTIK pre-deploy, harga money page utuh, artikel 200 + meta AdSense + foto Unsplash + OG per-artikel, money page 0 iklan, CSP AdSense live, sitemap/llms/rss 200, llms.txt kini "5 articles" (stale-3 sembuh). Rollback: `wrangler pages deployment rollback` / dashboard |

---

## 14. Appendix: Deep Dive Script Eksisting

Hasil baca penuh `seo/*.mjs` + `landing/seo/sync-prices.mjs` per 30 Sep (dasar amandemen §0/§4/§6):

| Script | Temuan deep-dive | Implikasi ke plan |
|---|---|---|
| `generate.mjs` (477 ln) | ROOT hardcode `:30`. **Anti-pattern berbahaya**: `prompts.ts` dibaca sebagai teks, fungsi di-extract regex + `eval` via `new Function` dengan TS di-strip kasar (`stripTs` — replace `: string` dsb dengan regex; rusak kalau prompt pakai tipe di string literal). Retry 3× rotasi model ✓. FAQ parse 3 format (yaml/bold/numbered) + pad generik = **pad spammy masuk frontmatter tanpa gate kualitas** (`Pertanyaan umum tentang X?` ×N). `pickRelated` ambil kandidat dari queue termasuk status `pending` → link ke slug yang belum ada | A1; A4; A5b; tambah gate: tolak FAQ hasil-pad (deteksi string "Penjelasan ada di artikel"); exit code `fail>0 → 1` sudah benar untuk batch script |
| `publish.mjs` (130 ln) | ROOT dinamis ✓. Logika flip/pick/build/deploy/indexnow sudah benar — tapi TIDAK panggil llms.mjs, tidak ada post-build gates, tidak ada git commit, tidak ada notify. `--no-deploy` berguna untuk dry-run runner | Jadi **cikal bakal `runner/daily.mjs`**: port + tambah langkah 5,7,10,12,13 (§C3). Jangan tulis ulang dari nol |
| `indexnow.mjs` (94 ln) | Portabel ✓. Batch ≤10 ✓ tapi **`urls.slice(0,10)` diam-diam membuang URL ke-11+** tanpa loop — kalau daily publish 10 + money page refresh, yang overflow hilang | Fix: loop chunk semua URL (sebut di C4/IndexNow retry). State `submitted` tumbuh tanpa bound — berkala prune ke URL indexed (dari indexer) |
| `llms.mjs` (220 ln) | ROOT hardcode `:17`. Parser YAML frontmatter hand-rolled ~80 ln — rapuh (`:` dalam quoted title, nested arrays, multiline non-`|`). Body di-strip MDX lalu truncate 3000 char ✓ (sesuai llms.txt org). Baca `dist/sitemap-0.xml` → **harus jalan SETELAH build**, tapi §C3 urut sebelum build → bug laten (money page list kosong/stale) | A5c (js-yaml); A1; **reorder daily: build dulu → llms regen → deploy** (llms_full butuh sitemap hasil build) |
| `s2b-expand.mjs` | ROOT hardcode `:9` (dokumen revisi 1 belum sebut). Query autocomplete Google live ✓. Menulis ulang seluruh queue.json dengan `writeFileSync` — tabrakan langsung dengan merge `queue.mined.json` dari runner | A1; aturan §0.3: expand hanya jalan lokal, hasil mining di-merge oleh expand (bukan dua writer ke satu file) |
| `sync-prices.mjs` (115 ln) | Secret SSH+password MySQL hardcoded `:19-21`. SQL dirakit string (`LIKE '${like}'` tanpa escaping — ironis untuk script yang mengakses DB prod). Output `prices.json` ~14 top + platform counts ✓ | A11: rewrite pakai `mysql2` prepared statement + env; query identik cukup 2 (kategori + top per platform via window, bukan 7 query LIKE) |
| `state.json` | **File tidak ada di mesin lokal saat ini** (indexnow akan create-on-write dengan shape default) | Bootstrap deterministik dari `queue.json` status `published` (Sprint 0) supaya indexer tidak mulai dari nol buta |
| `content.config.ts` (landing) | Schema z: FAQ tepat 5 ✓, `related: reference("blog")` — **reference collection = build gagal kalau related slug tidak ada** (bukan sekadar 404) | A4 jadi double-critical: `pickRelated` wajib filter ke file yang benar-benar ada, atau ganti z.string() + validasi manual |

---

## 15. Fase F — Keyword & Geo Engine

**Brief user (30 Sep)**: menangkan head term `smm panel termurah indonesia` + semua nama kota
besar → ribuan keyword. Diverifikasi live via Google Suggest: frasa geo persis (`smm panel
surabaya`) = 0 suggs (di bawah ambang autocomplete) → strategi benar bukan "tambang suggestion",
tapi **matriks head-term × template × kota dengan konteks lokal asli**.

### F.1 Head term tervalidasi (hasil curl suggestqueries live, Sep 2026)

`smm panel indonesia terbaik dan termurah` (paling panas), `smm panel sosmed murah`,
`smm panel itu apa`, `smm panel youtube`, `smm panel instagram`, `smm panel api`,
`smm panel luar negeri`, `smm panel apk`, `jasa pembuatan smm panel`. Serves sebagai seed
rotation engine (F2/F3).

### F.2 Dataset kota (lokal-only, 0 AI) — `seo/cities.json` (baru)

~80–100 kota: ibu kota provinsi + kota besar (Jakarta, Surabaya, Bandung, Medan, Semarang,
Makassar, Palembang, Batam, Bali/Denpasar, Malang, Bekasi, Depok, Tangerang, Tangerang Selatan,
Cirebon, Solo, Yogyakarta, Padang, Pekanbaru, Balikpapan, Banjarmasin, Manado, Sorong, dll).
Per kota: `{ name, province, tier (populasi), anchor_lokal[] }` — anchor_lokal = fakta ekonomi
sektoral nyata (Bandung: garmen & fesyen; Surabaya: bisnis lokal & event; Bali: industri pariwisata
& hotel; Medan: F&B; Makassar: umkm khu timur; Jakarta: agency & personal brand). **Fakta nyata,
bukan karangan AI** — inilah pembeda dari doorway page.

### F.3 Matriks template (per kota × ~10–13 pola, deterministik)

| Intent | Template | Catatan |
|---|---|---|
| Komersial | `smm panel {kota}` · `smm panel termurah {kota}` · `jasa smm panel {kota}` · `agen smm panel {kota}` | core geo |
| Head-term × geo | `smm panel indonesia terbaik dan termurah {kota}` (dipotong natural) → varian `panel smm termurah di {kota} 2026` | annual = freshness |
| Reseller/lokal | `cara jadi reseller smm panel di {kota}` · `smm panel untuk UMKM {kota}` · `side job anak {kota} ngonten` | intent agen |
| Platform × geo | `beli followers instagram {kota}` · `jasa views tiktok {kota}` — HANYA kota tier-1 (15 kota) × platform utama | sample suggs dulu, skip 0-demand |
| AEO geo | `smm panel {kota} terpercaya atau scam` · `kenapa bisnis {kota} pakai smm panel` | format definisi ≤40 kata |

Estimasi kasar: 100 kota × ~10 pola + 15 kota tier-1 × ~6 platform ≈ **~1.900 keyword geo**;
ditambah corong F1 katalog-expand + F3 PAA (`?rs=qt` — question variants per pola) + head term
→ **buffer realistis 3.000–4.000 kandidat**, setelah dedup token-set + gate A5b tersisa ±2.5k.
Supply aman berbulan-bulan pada N=10/hari.

### F.4 Smart variant engine — `seo/geo-expand.mjs` (baru, lokal, 0 token AI untuk generate kandidat)

> **GATE WAJIB (keputusan user 30 Sep)**: sebelum SATU ARTIKEL GEO pun di-generate,
> `queue.geo.json` sudah harus berisi ≥200 keyword geo terkurasi + `cities.json` approved
> user. Prinsip: list keyword = produk jadi, artikel = eksekusi. Prioritas urutan:
> 1. **Geo + longtail intent** (kota × smm panel + intent lokal) — duluan
> 2. **Head term nasional** (`smm panel termurah indonesia` + varian) — kedua
> 3. **Layanan luas** (katalog expand) — terakhir (corong lama tetap jalan, tapi prioritas
>    antrian geo > head term > katalog — priority number geo naik ke 88)

1. Load `cities.json` + head term + `prices.json` → bangun matriks kandidat (regex filter
   `isNoDouble` warisan s2b-expand).
2. **Demand-check sample** (bukan semua — hemat): per kata-tier 1 (±15 kota) query prefix
   `smm panel {kota 3 huruf}` + `jasa {kota}` → kota dengan suggs geo naik priority; sisanya
   priority default tier (population proxy). Delay 200–300ms, ~10 mnt/run.
3. Output `queue.geo.json` → di-merge manual ke `queue.json` oleh operator (aturan §0.3:
   satu writer per file, `added_by: 'geo'`).
4. Generator `generate.mjs` sudah mendukung `--keyword=` → item geo masuk antrian prioritas;
   **prompt geo** (task baru F-PR): `buildUserPrompt` menerima `cityContext` dari cities.json →
   narasi wajib menyebut provinsi + 2 anchor ekonomi lokal nyata; tabel harga & struktur tetap
   template deterministik.

### F.5 AI-friendly & anti doorway (syarat kualitas, bagian dari gate)

- **Uniqueness lokal**: gate tolak artikel geo yang similarity-nya ≥0.7 vs artikel geo kota lain
  (A5b di-scoped per cluster) — klaim kota harus asli (dari cities.json), bukan swap nama kota.
- **JSON-LD**: `Article` + `about: LocalBusiness/Service` `areaServed: { city, province, country:
  "ID" }` + FAQ geo-relevan → bahan baku jawaban ChatGPT/Perplexity/Gemini untuk query
  "panel smm termurah di [kota]" (jalur Bing index → ChatGPT sudah di D3/D4).
- **Internal mesh lokal**: artikel 1 kota saling link dalam provinsi (related 2 arah); money page
  tetap 1 URL nasional (TIDAK buat route `/beli-*-kota` per kota — itu invent fitur baru, perlu
  approval user separately). Hub opsional kemudian: `/smm-panel-indonesia/` daftar kota per
  provinsi — dicatat sebagai kandidat, bukan bagian Fase F.
- **Ritme geo**: artikel geo hanya boleh occupies ≤50% dari N harian (campur dengan cluster
  nasional — domain 1 bulan publish 10 halaman kota identik = pola doorway).

### F.6 Validasi belakang (Sprint 4, butuh SA)

GSC filter `query ~ kota` (regex client-side di weekly.mjs): kota yang mulai dapat impresi →
priority boost + refresh deterministik (harga terbaru) khusus kota itu; kota 0 impresi setelah
90 hari → freeze (tidak di-refresh, tidak dihapus — biar ter-index diam).

**Dependensi F**: dataset kota + script = lokal (Sprint 1, tanpa SA). Tidak menyentuh runner.

---

## 16. Status Eksekusi & Changelog Implementasi

### 16.1 Yang sudah jalan di kode (30 Sep, Sprint 0 + sebagian Sprint 1)

| File | Perubahan | Verifikasi |
|---|---|---|
| `seo/paths.mjs` (baru) | Satu sumber path: `ROOT`, `BLOG_DIR` (override `SEO_CONTENT_DIR`), `QUEUE_PATH`, `STATE_PATH`, `PRICES_PATH`, `PROMPTS_PATH`, `PUBLIC_DIR`, `SITEMAP_PATH`, `CITIES_PATH`, `GEO_OUT_PATH` | dipakai semua script seo/ |
| `seo/generate.mjs` | ROOT hardcode hilang; `stripFaqSection` match `## FAQ` **dan** `## Pertanyaan*`; helper murni baru: `publishedSlugs()`, `pickRelated(available)` (A4), `cleanProse/gramSet/jaccard/duplicateDraftInfo` (A5b, ambang 0.55), `paddedFaqInfo` (A6); **pad FAQ generik dihapus** → artikel ditolak, bukan disulam; `keywordGate()` (F); **30 Sep — antrean KOTA DULU** (`pickTargets`: geo didahulukan, round-robin per kota + offset diagonal intent, kota tier-1 di ronde awal; head term setelah geo habis) | harness eval: anchor lolos/blokir sesuai harapan; guard diuji unit (dup→slug, FAQ dobel→tolak, FAQ normal→lolos); `--dry` 24 target = 24 kota beda × intent campur |
| `seo/prompts.ts` | `buildUserPrompt` terima `localAnchor` + `localBuyer` → blok **KONTEKS LOKAL (WAJIB dipakai)** hanya muncul untuk keyword geo; `assembleMdx` append `## Baca juga` deterministik; **fix gate H2**: `validateMdx` tidak lagi menghitung `## FAQ` / `## Baca juga` sebagai H2 naratif (sebelum fix: 4+2=6 → *semua* generate gagal) | `h2Count=4` pada sampel artikel, errors kosong |
| `seo/geo-expand.mjs` (baru) | Matriks 12 pola geo x 69 kota + 5 intent x 6 basis; tulis `seo/keywords.geo.json` berisi kandidat `approved:false`; `--promote` wajib `_meta.approved_at` + jumlah approved >= `--min-approved` (default 200); anti-doorway: kota tanpa `anchor` ≥20 char = FATAL; dedup vs queue + slug MDX | `--expand` → 858 kandidat (828 geo, 30 intent), duplikat 0 |
| `seo/cities.json` (baru) | 69 kota, tiap entri: `city, slug, provinsi, tier, anchor, buyer`. **Status DRAFT — menunggu koreksi fakta oleh user** | JSON valid |
| `seo/publish.mjs` | Alur: flip draft → tulis queue → build → **regen llms** → salin llms ke dist → deploy → IndexNow | build 20 page OK |
| `seo/llms.mjs`, `seo/s2b-expand.mjs` | Path dari `paths.mjs` | `node seo/llms.mjs` nulis llms.txt + llms-full.txt; s2b `--dry` normal |
| `package.json` (root) | `seo:generate`, `seo:publish`, `seo:indexnow`, `seo:llms`, `seo:geo`, `seo:geo:promote`, `seo:s2b` | — |

### 16.2 Gate user yang sekarang DIPAKSA oleh kode

`node seo/generate.mjs` **exit 1** kalau salah satu ini belumenuhi (`--ignore-gate` hanya dengan
warning keras; ambang bisa diubah lewat `SEO_MIN_KEYWORDS`):

1. `seo/keywords.geo.json` ada
2. `_meta.approved_at` terisi (bukti kamu sudah review)
3. jumlah item `approved: true` >= 200
4. sudah ada keyword `added_by: geo|intent` berstatus `pending` di `queue.json` (artinya `--promote` dijalankan)

Urutan yang benar: `pnpm seo:geo` → koreksi `cities.json` + set `approved` per baris + isi
`_meta.approved_at` → `pnpm seo:geo:promote` → baru `pnpm seo:generate`.

### 16.3 Catatan teknis buat agent berikutnya (penting, jangan diulang salah)

- **Editor berbasis string-replace merusak escape `\n` di dalam regex** di `seo/generate.mjs` dan
  `seo/prompts.ts` (diubah jadi newline literal → regex pecah jadi 5 baris, `node --check` masih
  lolos tapi `new Function` mati saat runtime). Untuk edit file-file itu: pakai script Node yang
  me-*splice* baris berdasarkan anchor teks tanpa backslash, atau pulihkan blok dari
  `git show HEAD:<file>` dengan brace-counting. Setelah edit selalu cek: `node --check` **dan**
  eval `SHARED_HELPERS` (pola di §16.1 baris `generate.mjs`).
- `SHARED_HELPERS` itu template literal yang dieval: di dalamnya escape harus **dobel** (`\\n`),
  sedangkan function biasa di `prompts.ts` pakai single (`\n`).
- `state.json` sampai sekarang masih belum ada (IndexNow create-on-write) — bootstrap deterministik
  dari `queue.json` status `published` belum dikerjakan.

### 16.4 Sisa Sprint 1 (per 30 Sep malam — setelah B13)

- ~~Bootstrap repo konten~~ ✅ SELESAI (A9b: repo private `socio-seo-content-id`, 13 file di `main`).
- ~~Hapus `landing/seo/sync-prices.mjs`~~ ✅ SELESAI (file terhapus; `app/` 0 perubahan).
- ⬜ Rotasi password MySQL prod (A11) — aksi user di DB + env Coolify, tanpa ubah kode.
- ⬜ Keputusan nasib `seo/sync-prices.mjs` varian-2 + desain ulang sync harga tanpa sentuh app (Sprint 3).
- ⬜ Koreksi + approval `cities.json` / `keywords.geo.json` (item §13 no.9) → membuka gate generate.
- ⬜ Batch 50–100 draft **setelah** gate approval terbuka (A8 siap).

### 16.5 Sesi B13 + secrets (30 Sep malam — cara kerja yang tercatat)

**Redesign blog (cara kerja)**:
- Foto hero: `landing/src/data/blogHeroes.ts` — mapping deterministik slug/kategori → 9 ID
  Unsplash **terverifikasi manual** (curl 200 + dilihat isinya; 2 ditolak: logo Netflix, 404).
  `heroFor()` (w=1200, hero + OG) / `thumbFor()` (w=400, rows/related). Prioritas mapping:
  pembayaran → uang → platform → aman/tips → default. Tambah artikel baru = otomatis dapat
  foto tanpa ubah schema (tambah entri HEROES hanya kalau topik benar-benar baru).
- Iklan blog-only: `Layout adsense` baca `PUBLIC_ADSENSE_CLIENT`; meta + pagead2 + loader lazy
  HANYA render di `[slug].astro`. Pelajaran penting: `<script>` Astro **tanpa `is:inline`
  di-hoist keluar conditional** — semua script kondisional wajib `is:inline`.
- Slot manual (`AdsenseSlot slot=…`) render hanya jika Slot ID terisi; tanpa Slot ID yang jalan
  hanya page-level (Auto Ads dari dashboard).
- Anti-kesimpulan: `prompts.ts` aturan 10–11 + gate `Banned closing heading`; 3 MDX existing
  dibedah (H2 count tetap 4, penutup CTA-forward dipertahankan).

**Secrets (cara simpan)**:
- `GH_TOKEN` (fine-grained PAT user) → `.env` root (gitignored, terverifikasi `git check-ignore`
  + API 200). **Jangan pernah** tulis ke file ter-commit / tampilkan di output.
- `PUBLIC_ADSENSE_CLIENT=ca-pub-4438184351486735` → `.env.example` (publisher ID = publik,
  tampil di source HTML; aman di-commit). Build lokal/prod baca dari env.

### 16.6 Sesi 1 Okt — Generate draft manual via assembler template (tanpa API LLM)

**Cara kerja (jalur cepat baru, substitusi worker Groq/CLI yang pass-rate-nya rendah):**
agent menulis *spec* prosa ringkas per artikel (`seo/specs.batchN.json`), lalu
`node seo/from-template.mjs <specs> [--force]` bake semua bagian kaku (frontmatter, FAQ ×5 di
2 tempat, CTA link wajib `/layanan` + `app.socio.id/daftar`, `## Baca juga` ke slug published,
flip queue pending→draft atomic). Verdict gate otoritatif dari `node seo/qc.mjs <slug...>`.
**Nol panggilan LLM API** → hemat token + pass-rate ~100% setelah kalibrasi panjang body.

**Hasil sesi ini — 30 draft geo `smm-panel-termurah-<kota>`, SEMUA lolos qc.mjs (850–878 kata),
bersih CJK, `pnpm --filter landing build` OK (55 halaman; draft sengaja tidak di-render):**

| Sub-batch | Kota |
|---|---|
| 4A | Semarang, Yogyakarta, Medan, Batam, Palembang |
| 4B | Makassar, Denpasar, Cirebon, Sidoarjo, Banyuwangi |
| 4C | Solo, Padang, Bandar Lampung, Gresik, Tasikmalaya |
| 5A | Cilegon, Serang, Pasuruan, Purwokerto, Pekanbaru |
| 5B | Balikpapan, Samarinda, Pontianak, Banjarmasin, Manado |
| 5C | Gianyar, Badung, Jayapura, Garut, Cianjur |

**State queue akhir sesi**: `{published:5, pending:1015, draft:57}` (draft 27 → 57; +30 sesi ini).
**PUSH KE REPO KONTEN SELESAI 1 Okt**: commit `92687e6` di `socio-seo-content-id@main` — 57 draft baru + queue flip + 3 MDX published versi anti-kesimpulan (bedah B13); terverifikasi API: 62 MDX
di `blog/` remote. Clone kerja: `.content-repo-tmp/` (sudah di-`git remote set-url` tanpa token
+ di-exclude dari repo app). Catatan: `push-drafts.mjs` dijalankan MANUAL via git di clone
(script as-is punya bug staging path saat `SEO_CONTENT_DIR` di luar ROOT — perlu fix kecil Sprint 3).

**Catatan mutu (untuk batch berikutnya):** estimator kata agent ~10-15% DI BAWAS hit assembler →
sering "Body too short" lalu tambah 1-2 kalimat penutup + `--force`. Vigilance token asing
(CJK/Inggris) manual karena validateMdx tidak menandainya — tertangkap & difix: `效应`→`efek`,
`feeds`→`beranda`, `niche`→`bidang yang tak terkait`, `buyers`→`pembeli`, `rampat`→`ramping`.
Strategi dedup "15 kota berbeda" terbukti bertahan di 30 artikel setemplate (Jaccard < 0.55).

---

## 17. Phase Tracker — Checklist 1-per-1 & Status

> Satu tabel otoritatif per fase. Legenda: ✅ **SELESAI & terverifikasi** · 🟡 **sebagian / draft** ·
> ⬜ **belum mulai** · ⛔ **blocker (butuh user/token)**. Status diverifikasi dari kode per 30 Sep 2026
> (`node --check`, grep fungsional, harness eval), bukan asumsi. Sprint 0+1 = lokal Mac,
> Sprint 2+ = butuh keputusan/kredensial user.

### Fase A — Pipeline Lokal (Sprint 0–1)

| # | Task | Status | Catatan verifikasi |
|---|---|---|---|
| A1 | ROOT hardcode → `seo/paths.mjs` portabel + `SEO_CONTENT_DIR` | ✅ | semua `seo/*.mjs` lolos `node --check`; tak ada lagi `/Users/maabook/Desktop` |
| A2 | Fix FAQ heading mismatch (`## Pertanyaan*`) | ✅ | `stripFaqSection` match `## FAQ` + `## Pertanyaan`; FAQ dobel hilang |
| A3 | Internal link deterministik (`## Baca juga`) | ✅ | `assembleMdx` append 2 related; gate link ≥3 lulus |
| A4 | Related HANYA slug existing | ✅ | `publishedSlugs()` + `pickRelated()` dari MDX `draft:false` di disk |
| A5 | Validasi eksistensi link `/blog/<slug>` | ✅ | pure fn `blogLinkBrokenInfo()` cek tiap `/blog/<slug>` di body → harus ada sebagai MDX `draft:false` di disk; tidak → REJECT. Money page tak dicek (route dinamis, selalu dari `pickMoneyLink`) |
| A5b | Guard anti-duplikat (Jaccard 3-gram) | ✅ | `duplicateDraftInfo` ambang 0.55; uji unit dup→tolak, topik beda→lolos |
| A5c | Parser YAML `js-yaml` di `llms.mjs` | ✅ | manual state-machine ~70 ln digantikan `yaml.load()`; frontmatter rusak → skip file (llms tak crash). Output identik (2607/23019 B) |
| A6 | Prompt tightening + tolak FAQ hasil-pad | ✅ | `paddedFaqInfo` (section hilang/Q dobel) + pad generik DIHAPUS → artikel ditolak |
| A7 | Script `seo:*` root `package.json` | ✅ | 9 script: generate/batch/publish/indexnow/llms/geo/geo:promote/s2b/state |
| A8 | Batch generator `generate-batch.sh` | ✅ | loop `--count=1`, stop-setelah-3-gagal-beruntun + summary. Hormat gate (generate exit 1 → batch berhenti ≤3 iter). Script `seo:batch` |
| A9 | `push-drafts.mjs` (pull --rebase + commit + push repo konten) | ✅ | guard anti-salah-repo (remote wajib `socio-seo-content`), tanpa token embedded (auth git user). Terbukti menolak push ke repo app. Script `seo:push-drafts` |
| A9b | Bootstrap repo `socio-seo-content-id` | ✅ | **30 Sep via API+git**: repo **private** berisi **13 file di `main`** (5 MDX + queue/keywords/state/prices + llms/* + deploy.json + seo-schema.md). `landing/src/content/blog` app **belum dikosongkan** (sengaja — cutover penuh di Sprint 3 saat runner pakai `SEO_CONTENT_DIR`) |
| A10 | llms regen masuk alur `publish.mjs` | ✅ | publish: flip → build → regen llms → salin dist → deploy → IndexNow |
| A11 | Hapus secret `sync-prices.mjs` + endpoint app + rotasi pwd MySQL | 🟡 | **REVISI 30 Sep (instruksi user: JANGAN sentuh app.socio.id yg berjalan)**: `landing/seo/sync-prices.mjs` (password MySQL hardcoded + SSH) **TETAP DIHAPUS** (file landing, bukan runtime app). Endpoint app `GET /api/internal/seo-prices` + bypass maintenance yang sempat dibuat **DI-REVERT TOTAL** (`app/` bersih 100% di `git status`, terverifikasi) — prod VPS tidak pernah tersentuh (deploy hanya dari push `main`). **SISA (user-only)**: **rotasi password MySQL** — secret `58a16bc8…` ter-commit di `7a58016` yang **SUDAH ter-push ke `origin/main`** → wajib dianggap bocor; rotasi = ganti di DB + update env Coolify (tanpa ubah kode). Pengganti sync harga untuk runner **perlu desain ulang tanpa sentuh app** (opsi: GitHub Action terjadwal / script lokal admin; putuskan Sprint 3). `seo/sync-prices.mjs` (varian ke-2, baca `SOCIO_DB_PASS` env, tanpa secret hardcoded) masih ada — **perlu keputusan user**: hapus atau pertahankan sbg alat lokal admin |
| A12 | `.env.example` keys SEO lengkap | ✅ | blok "SEO AUTOMATION": `SEO_CONTENT_*`, `GH_TOKEN`, `SEO_MIN_KEYWORDS`, CF token, `GSC_*`, `BING_SITE_KEY`, `SEO_RUNNER_SECRET`, `PUBLIC_ADSENSE_CLIENT` |
| S0 | Bootstrap `state.json` deterministik | ✅ | `bootstrap-state.mjs` (`seo:state`): published[] + indexnow.submitted prefill dari 5 artikel publish terverifikasi di disk. Idempoten (--force/--dry) |

**Fase A LOKAL TUNTAS** (A1–A10, A12, S0 ✅; A9b bootstrap repo konten ✅; A11 file secret terhapus,
endpoint app di-revert total atas instruksi user — `app/` 0 perubahan). Batch draft (A8) sudah siap,
tapi gate Fase F tetap menutup sampai user approve keyword.

### Fase F — Keyword & Geo Engine (Sprint 1)

| # | Task | Status | Catatan verifikasi |
|---|---|---|---|
| F1 | `cities.json` dataset kota + anchor ekonomi | ✅ | **30 Sep — review + approval selesai (delegasi user)**: 9 koreksi fakta (Bogor talam bojong→roti unyil/lapis talas/asinan; Garut hapus denim; Cirebon kreksi→kerupuk udang; Gresik utas→bonggolan; Kediri sepatu→tahu kuning/Gudang Garam; Brebes buyer→pedagang bawang/telur; Pemalang tekstil→konveksi; Palangkaraya hapus jasa pertanahan; Bima buyer→jagung/garam/tenun) + 3 kota baru (Batam t1, Serang t2, Tasikmalaya t2). **69→72 kota**, slug unik, anchor ≥20 char, validasi lolos. `--expand` → **894 kandidat** (864 geo + 30 intent), duplikat 0 → approved massal (output deterministik dari kota reviewed) → `--promote` → **queue 183→1077 pending**. Gate generate TERBUKTI lolos (`--dry` tanpa exit 1) |
| F2 | `geo-expand.mjs` matriks pola × kota | ✅ | `--expand` → **858 kandidat** (828 geo + 30 intent), duplikat 0 |
| F-PR | Prompt geo `localAnchor`/`localBuyer` | ✅ | blok KONTEKS LOKAL hanya muncul utk keyword geo |
| GATE | Gate kode: generate exit-1 sebelum approval | ✅ | terbukti: file belum ada → exit 1; belum approved → exit 1 |
| F6 | Validasi belakang GSC (`query ~ kota`) | ⛔ | butuh SA (Fase D) |

**Urutan benar**: `pnpm seo:geo` → koreksi `cities.json` + set `approved:true` ≥200 + `_meta.approved_at` → `pnpm seo:geo:promote` → `pnpm seo:generate`.

### Fase B — Theme Blog + AdSense (Sprint 2)

| # | Task | Status | Catatan |
|---|---|---|---|
| B1 | Route pagination `/blog/page/[n]` | ✅ | `page/[n].astro` baru: PER_PAGE=6 sinkron index, windowed `1 2 … N` + prev/next, ItemList+Breadcrumb schema, canonical self (Layout), indexable. Compile OK di build (5 artikel → totalPages=1 → 0 halaman turunan; logika windowed/slice diverifikasi via node eval) |
| B2 | `AdsenseSlot.astro` (conditional + anti-CLS min-height) | ✅ | render HANYA jika `PUBLIC_ADSENSE_CLIENT` + slot ID terisi; reserve min-h per placement (top 280/mid 250/bottom 280·120) + border DNA |
| B3 | 3 slot iklan di artikel | ✅ | top (setelah ArtThumb) + mid (relokasi sinkron setelah H2 ke-2, fallback setelah prose tanpa JS) + bottom (sebelum "Baca juga"). Terbukti render 3 slot dgn env dummy; money page/home = 0 |
| B4 | Meta + auto ads (prop `adsense`) | ✅ | `Layout adsense` → meta `google-adsense-account` + pagead2 async + loader push lazy (scroll/touch/click/idle 3s). **Bug ditemukan & difix**: `<script>` Astro tanpa `is:inline` di-hoist keluar conditional → loader sempat render di semua halaman; fix `is:inline`, verifikasi 0 markup ads tanpa env |
| B5 | Update CSP `_headers` utk AdSense | ✅ | script/connect/frame-src dibuka utk googlesyndication/googleadservices/doubleclick/adtrafficquality. Test CSP real menunggu deploy + ID AdSense |
| B6 | Author box E-E-A-T (schema Person) | ✅ | author Article Organization → **Person "Tim Socio.id"** (publisher tetap Organization); author box DNA di akhir artikel. Persona final tetap bisa diganti (keputusan user sebelumnya) |
| B7 | Badge freshness (`updated`) | ✅ | badge "Diperbarui {tgl}" conditional + `dateModified` dari `updated ?? pubDate` |
| B8 | Speakable schema | ✅ | `speakable` cssSelector `h1` + paragraf pertama prose |
| B9 | RSS feed (`@astrojs/rss`) | ✅ | `@astrojs/rss` terpasang; `/rss.xml` 20 artikel terakhir OK di dist; `<link rel="alternate">` di Layout |
| B10 | Sitemap lastmod jujur | ✅ | `seo/fix-sitemap.mjs` post-build (wire di `landing build`): sisip `<lastmod>` dari frontmatter (`updated ?? pubDate`) utk blog + `prices.json syncedAt` utk money pages. **Bug ditemukan & difix**: `@astrojs/sitemap` default tanpa lastmod → script awal replace-only = 0 perubahan; fix jadi insert. Terverifikasi: 17 lastmod (5 blog + 12 money) |
| B11 | Related mesh 2 arah (money page → artikel) | ✅ | `RelatedArticles.astro` baru (match platform dari judul/slug/kategori, max 3, kosong = tidak render) + dipasang di `BeliPage.astro` sebelum CTA. Terverifikasi "Artikel terkait" di dist money page |
| B12 | Verifikasi build + lint + audit visual | 🟡 | `landing build` ✅ (20 page + rss + fix-sitemap 17) · `astro check` ✅ 0 error (2 error `as any` milik script baru ditemukan & difix) · `prettier lint` ⚠️ 1 file pre-existing (`beli-pages.ts`, tidak disentuh) · JSON-LD semua halaman **valid** (sekalian fix bug lama: Organization schema berisi template literal mentah → invalid JSON di semua halaman, kini `JSON.stringify`) · **visual browser (pw-vision) BELUM** — tidak ada tool browser di sesi ini; wajib cek preview URL (slot reserve, CLS, mobile 360) sebelum cutover + test CSP real setelah ID AdSense diisi |
| B13 | Redesign total blog + AdSense client (30 Sep, request user) | ✅ | **AdSense**: `PUBLIC_ADSENSE_CLIENT=ca-pub-4438184351486735` (blog-only, money page/home 0 — terverifikasi). Page-level script + meta aktif; **slot unit manual butuh Slot ID dari dashboard** (atau aktifkan Auto Ads) — tanpa slot ID, slot tidak render. **Redesign single post**: mesh hero blobs, breadcrumb pill, sticker kategori mango miring, H1 Sora 52px, meta + tombol salin-link & share WA, foto Unsplash topikal (sticker frame + credit) + OG image per-artikel, TOC sticker card + CTA mini, drop-cap, H2 bernomor otomatis (CSS counter), tabel sticker + scroll mobile, blockquote mango, FAQ accordion bernomor, CTA sticker press-effect, related berfoto, author box bahasa manusia. **Redesign /blog**: headline raksasa + marker, doodle sparkle, stats, featured sticker 2-kolom + tombol baca, rows berfoto (`ArticleRow.astro` dipakai index + arsip), newsletter panel gelap. **Foto**: 9 ID Unsplash diverifikasi manual (curl 200 + lihat isi; tolak 2: logo Netflix & 404) via `src/data/blogHeroes.ts` (mapping topik; thumb w=400, hero w=1200). **Anti-kesimpulan**: 3 MDX existing dibedah headingnya (isi penutup CTA-forward dipertahankan, H2 count tetap 4); `prompts.ts` +aturan 10-11 (larang heading kesimpulan/penutup + gaya manusia: variasi kalimat, "kamu", contoh konkret) + gate validator. Verifikasi: build 20 page ✅, check 0 error ✅, lint bersih ✅, 29 blok JSON-LD valid ✅, mapping hero 5/5 tepat ✅ |
| B14 | Portal grid + sidebar + tag topik + pagination hidup (30 Sep, request user) | ✅ | Masalah: pagination sembunyi (5 artikel muat 1 hal) + layout list, bukan portal. **Solusi**: `/blog` + `/blog/page/[n]` jadi portal DNA Socio — grid kartu 2 kolom (`BlogCard.astro`: foto, sticker kategori, tag #topik, tanggal/baca) + sidebar sticky (`BlogSidebar.astro`: cari client-side, Topik populer + count, Kategori + count, Terbaru bernomor, CTA reseller). Tag deterministik (`blogTags.ts`: platform → angle → kategori, max 4). Filter kombinasi AND (topik + kategori + cari) + empty-state + counter. PER_PAGE 3 dari `rest` → pagination 1-2 langsung terlihat (21 page di build, `/blog/page/2` OK). Verifikasi: check 0 error, lint bersih*, 4 data-tags index + 1 arsip, schema Blog/ItemList utuh. *kecuali pre-existing `beli-pages.ts` |
| B15 | Single post: background + sidebar kanan + slot iklan ke-4 (30 Sep, request user) | ✅ | Masalah: bodi polos tanpa background/sidebar, slot iklan tak terlihat. **Solusi**: main `paper-2` + blobs, artikel jadi kartu paper terangkat, grid `1fr 320px` + sidebar sticky kanan (TOC card, slot iklan sidebar `PUBLIC_ADSENSE_SLOT_SIDEBAR`, Terbaru bernomor, Topik + count, CTA reseller); mobile: TOC details di atas, sidebar menumpuk di bawah. Verifikasi: 21 page, check 0 error, lint bersih*, 5 JSON-LD valid. **Catatan iklan**: slot top/mid/bottom/sidebar kodenya siap TAPI tak render tanpa Slot ID — yang tayang baru page-level (Auto Ads). Minta Slot ID (4 unit) ke user ATAU aktifkan Auto Ads di dashboard. *kecuali pre-existing `beli-pages.ts` | DEPLOYED `e3ebdd2c` 30 Sep (B14+B15 live: portal + sidebar single post; home identik, money utuh) |

### Fase C — Runner Coolify VPS (Sprint 3)

| # | Task | Status | Catatan |
|---|---|---|---|
| C1 | `runner/Dockerfile` (node:22 + git/pnpm/wrangler + flock) | ⬜ | clone repo app + konten |
| C2 | 3 Scheduled Task (daily/indexer/weekly) + flock | ⬜ | butuh CF token + GH_TOKEN |
| C3 | `daily.mjs` publish + gates + deploy + IndexNow + notify | ⬜ | port `publish.mjs` + langkah 5/7/10/12/13 |
| C4 | `indexer.mjs` GSC inspect + Bing + retry + remedy | ⬜ | butuh SA |
| C5 | `weekly.mjs` sync + freshness + mining + report | ⬜ | sync harga via HTTP **DITANGGUHKAN** (E1b di-revert) — desain ulang Sprint 3; freshness/mining/report tetap jalan |
| C6 | Env runner (Coolify UI) | ⬜ | tanpa `SOCIO_DB_*` (Revisi 3) |

### Fase D — Menangkan Google + AI Search (Sprint 4)

Semua ⬜. **Blocker utama: `GSC_SERVICE_ACCOUNT_JSON` + verifikasi property GSC + Bing API key dari user.** Yang sudah ada & tinggal wire: D3 IndexNow (`indexnow.mjs` ✅), D5 llms.txt (✅ regen di publish), D11 format AEO (✅ by-design). D1/D2/D4/D6/D7/D8/D10/D12/D13 butuh runner + SA.

### Fase E — Email List (Sprint 5–6)

| # | Task | Status | Catatan |
|---|---|---|---|
| E1 | Endpoint `/newsletter` + DOI (fix 404) | ⬜ | infra email app sudah ada |
| E1b | Endpoint internal `seo-prices`/`seo-changelog` | ⬜ | **REVISI 30 Sep**: `seo-prices` sempat selesai lalu **DI-REVERT TOTAL** atas instruksi user (jangan sentuh app.socio.id). Kembali ⬜ — butuh desain ulang pengganti sync harga tanpa endpoint app (putuskan Sprint 3). `seo-changelog` tetap ⬜ (dibuat Sprint 5) |
| E2 | Digest mingguan `newsletter-digest` | ⬜ | cron app |
| E3 | Welcome series signup | ⬜ | cron app |
| E4/E5 | Kampanye XLS + kalender bulanan | ⬜ | via admin UI existing; butuh list XLS user |

### Ringkasan posisi + NEXT berurutan 1-1 (30 Sep malam)

**SELESAI (lokal, terverifikasi)** — Fase A (kecuali rotasi pwd), Fase F (menunggu approval),
Fase B B1–B13. `app/` 0 perubahan — prod VPS tidak pernah tersentuh.

**NEXT — kerjakan berurutan, satu per satu sampai selesai:**

| Urut | Langkah | Siapa | Output |
|---|---|---|---|
| 1 | Deploy landing (wrangler) → B13 + AdSense live di socio.id; audit visual + CSP real pasca-deploy | ✅ SELESAI 30 Sep (deploy `930b2df1`; verifikasi: home identik, money utuh, artikel +iklan, llms 5 artikel) | blog baru live, iklan page-level tayang |
| 2 | Koreksi + approval `cities.json` / `keywords.geo.json` (§13 no.9) | ✅ SELESAI 30 Sep (72 kota, 894 approved, queue 1077, gate lolos) |
| 3 | Batch 50–100 draft (`pnpm seo:batch`) + `pnpm seo:push-drafts` ke repo konten | 🟡 57 draft TERPUSH 1 Okt (`92687e6`); sisa pending 1015 bisa ditambahkan bertahap | buffer draft di repo konten |
| 4 | Keputusan ramp-gate 3→10/hari (§13 no.5) | kamu | N awal daily publish |
| 5 | Rotasi password MySQL (DB + env Coolify, tanpa kode) + putuskan nasib `seo/sync-prices.mjs` varian-2 + desain sync harga tanpa app | kamu putuskan, agent eksekusi yg kode | A11 tuntas penuh |
| 6 | Sprint 3: Dockerfile runner + Coolify app + daily/indexer/weekly (GH_TOKEN ✅, CF token dari `accountcf.md`) | agent | publish otomatis 06:00 |
| 7 | GSC verifikasi + SA Owner + submit sitemap; Bing import + API key (§13 no.2–3) | kamu | Sprint 4 terbuka |
| 8 | Sprint 4: indexer + mining + report mingguan | agent | indexed-rate terukur |
| 9 | Sprint 5: newsletter DOI + digest + welcome series (E1b seo-changelog dibuat di sini) | agent (menyentuh app — perlu persetujuan eksplisit per perubahan, seperti A11) | email jalan |
| 10 | Sprint 6: kampanye XLS + kalender (butuh list + pace) | kamu + agent | penawaran pertama terkirim |

- **GERGAN GENERATE ARTIKEL**: gate kode Fase F menutup sampai langkah 2 selesai → **jangan generate sebelum ini terbuka**.

---

*Versi 4.0 — 1 Okt 2026 — **Jalur cepat generate**: provider Groq HTTP (`GROQ_API_KEY`, model gpt-oss-120b, ~20-40 dtk) + fallback CLI; `--list/--defer-queue/--merge-queue` + `generate-parallel.sh` (P worker, merge sekali, anti-race; portabel bash 3.2); SEO_MODEL override. KUNCI Groq belum ada → worker masih CLI (~90-170 dtk, pass rate rendah: FAQ 0/5, body <850). Minta GROQ_API_KEY gratis ke user. Sebelumnya v3.9 (no.3 batch).*
