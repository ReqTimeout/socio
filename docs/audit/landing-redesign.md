# Landing Redesign — socio.id (Upgrade Visual + Motion + SEO + Retention)

> **Versi**: 4 Sep 2026  
> **Wireframe detail**: `docs/WIREFRAME_SOCIOID.md` (lihat §3 Mobile Floating Premium Dock, §4 Per-Section Contract, §5 Micro-Interaction Library)  
> **Scope**: Audit visual + upgrade landing `socio.id` (Cloudflare Pages, Astro 5 + Svelte 5 islands). Reference: **haloka.id** (visual pattern), `docs/LANDING_DESIGN_PLAN.md` (spec), `docs/MOBILE_UX_GUIDE.md` (motion contract), `docs/LANDING_SEO_SYSTEM.md` + `docs/SEO-KEYWORD-RESEARCH.md` + `docs/TRAFFIC-BOOST-STRATEGY-2026-08-27.md` (SEO pipeline).  
> **Goal**: bikin orang **repeat visit** socio.id — emotional hook di hero, live motion di mockup, sticky CTA conversion, blog SEO loop, micro-interactions nagih, retention lewat newsletter + simulasi order + content reuse.

---

## TL;DR — Temuan Audit & Prioritas

| Layer | Status | Δ |
|---|---|---|
| Branding & color | ✅ OK (cyan-teal accent, Plus Jakarta + Sora) | polish |
| Hero copy & mockup | ⚠️ Mockup live sudah jalan (HeroMockup.svelte 323 LOC), tapi copy wrap jelek "saldo Rp20 / ribu / langsung / jalan" | fix layout |
| Section order | ⚠️ FinalCTA sebelum FAQ (sebaiknya FAQ dulu untuk handle objection) | reorder |
| Animation | ✅ 13 animasi spec sudah ada (LANDING_DESIGN_PLAN §3g), beberapa jalan (hero-seq, reveal, progress), tapi **sticky CTA, ticker strip, FAQ accordion anim belum semua aktif** | audit + activate |
| FAQ cards | 🟠 6 card uniform chrome — violates variance rule | variance |
| Blog | ✅ Sudah ada 5 MDX article + index page, tapi tidak featured di landing & tidak ada CTA "Baca artikel" | promotion |
| SEO system | ✅ sitemap (19 URL), robots.txt, llms.txt, schema.org, meta OG/Twitter — semua sudah ada | scale up |
| Money pages | ✅ 10 page sudah live (beli-followers-instagram dll), tapi hero copy generic | optimize per intent |
| Sticky CTA | ❌ Tidak ada sticky bottom bar ("Belum yakin? Coba 7 hari") | add |
| Reality Check interaktif | ❌ Haloka punya interactive slider (Volume Chat Harian), socio tidak | add |
| Brain Engine mockup | ❌ Haloka punya mockup "Upload SOP_Toko_2026.pdf" — socio tidak ada emotional visual serupa | add |
| Pain cards | 🟠 Generic text-only, tidak ada visual konteks | enhance |
| Trust strip | ⚠️ Mono-naratif, tidak ada icon/visual proof | add icon |
| Footer | 🟠 Plain dark + 3-col link grid, tidak ada newsletter signup, social proof kosong | retention |
| Newsletter / retention | ❌ Tidak ada — kehilangan visitor 1x | add |
| Mobile dock premium | ⚠️ FloatingTabDock ada tapi inferior vs BottomNav app (no spring bounce, no badge, glass literal, no view-transition) | rewrite paritas |
| Performance | ⚠️ CF-cache DYNAMIC (bisa STATIC untuk landing static), Core Web Vitals belum diukur | measure + optimize |
| A11y | ⚠️ Skip link belum, aria-label belum lengkap | polish |

**Total**: ~35 issue utama → **10 phase (L1–L10)**, estimasi **~80 jam**.

---

## 1. Metode Audit

### 1.1 Tools
- **Live capture**: Playwright session `socioaudit2`, viewport 1440×1000 desktop + 390×844 mobile.
- **Reference**: `https://haloka.id` captured 4 section (hero, features, mid, bottom).
- **Spec cross-check**: `docs/LANDING_DESIGN_PLAN.md` (yang sudah sangat lengkap — 760 baris, 13 animasi defined), `docs/MOBILE_UX_GUIDE.md`, `docs/SMM_STANDOUT_RESEARCH.md`, AGENTS.md §7.
- **Code review**: `landing/src/pages/index.astro` (195 LOC), `HeroMockup.svelte` (323 LOC live animation), `OrderSimulator.svelte` (207 LOC), `global.css` (motion utility + .reveal).

### 1.2 Screenshot lokasi
- `docs/audit/landing/desktop/01-hero.png` `02-stat-band.png` `03-problem.png` `04-pricing.png` `05-faq-footer.png`
- `docs/audit/landing/haloka/01-hero.png` `02-features.png` `03-mid.png` `04-bottom.png`
- `docs/audit/landing/mobile/` — *belum*, capture menyusul setelah eksekusi phase

---

## 2. Pattern Audit — Socio.id vs Haloka.id

### 2.1 Socio.id Strengths (Pertahankan)
| Pattern | Lokasi | Note |
|---|---|---|
| **Live dashboard mockup** (HeroMockup.svelte) | `landing/src/components/HeroMockup.svelte:80+` | tweened counter + setInterval stream + platform rotate 2.4s + saldo jalan sendiri 8s + progress bar live. **Sudah polanya haloka, lebih halus.** |
| **Hero load-sequence** (eyebrow → H1 → USP → CTA) | `index.astro:21-89`, `global.css:131-150` | hero-seq-0..6 dengan delay 120ms tiap baris, blur-in 600ms |
| **USP ledger** (bukan card) | `index.astro:43-72` | hairline divide-y + flex justify-between, "Daftar reseller Rp50.000 sekali" |
| **Inline-stat prose** (bukan 4-col strip) | `index.astro:104-115` | "1.240 order aktif · 8.270 layanan · 882 kategori · 42 detik" — naratif ✓ anti-pattern gate |
| **Reveal observer** (semua section masuk viewport) | `global.css:112-128` + `is-visible` toggle | 60ms stagger per row |
| **Coba dulu, bayar belakang** (OrderSimulator interactive) | `OrderSimulator.svelte` | slider qty + count-up total + Pesan CTA |
| **Floating Premium Dock mobile** | `FloatingTabDock.svelte` (target: paritas BottomNav) | 5 items Beranda/Layanan/Blog/Reseller/CTA, glass token, dock-pop spring, badge, view-transition |
| **Reduced-motion respected** | `global.css:163-180` | duration 0.01ms, no transform |
| **Self-host font** | `global.css:5-26` | Plus Jakarta + Sora latin subset, zero Google CDN |
| **OG + Twitter meta + schema.org JSON-LD** | `index.astro:172-189` | `WebSite` + `SearchAction` + `Organization` |
| **Sitemap + robots + llms.txt** | `sitemap-index.xml`, `robots.txt`, `llms.txt` | 19 URL, AI bot allowlist GPTBot + CCBot |
| **Security headers** (HSTS, CSP, X-Frame) | `landing/public/_headers` | CSP strict, Permissions-Policy deny semua |
| **5 blog MDX + blog index + single** | `landing/src/content/blog/*.mdx`, `pages/blog/*` | Collection content Astro, schema di index |
| **10 money pages** (beli-*) | `sitemap-0.xml` | beli-followers-instagram dll semua live |

### 2.2 Socio.id Weaknesses (vs Haloka + DESIGN.md spec)

| # | Issue | Haloka reference | Severity |
|---|---|---|---|
| **L-A** | **Hero copy wrap jelek** — "saldo Rp20 ribu langsung jalan" dipaksa `<br>` dan jadi 4 baris di desktop: "saldo Rp20 / ribu / langsung / jalan." → rapikan max line | haloka: "WhatsApp AI Agent / untuk Customer Service," / "Bayar Cuma 20rb/Hari." (2 baris clean) | 🔴 |
| **L-B** | **Section whitespace** — banyak padding tinggi antar section, visual disconnection (pad py-16/24 di tiap section bikin "single card in void") | haloka: section bg subtle tint (paper-2) yang nyambung, lebih flow | 🟠 |
| **L-C** | **Pain section generic** — "Masalahnya kamu kenal baik" pakai ledger row tapi tidak ada visual konteks (icon + scenario spesifik) | haloka: 3 pain cards dengan visual nyata ("Customer Calon Buyer · chat lambat", "Gaji Admin · THR & Bonus", "Toko Tutup · Istirahat") | 🟠 |
| **L-D** | **FAQ variance lemah** — 6 card uniform border + chevron rotate, tidak ada differentiator | haloka: FAQ simple accordion, tapi socio bisa lebih baik: highlight top 1-2 Q sebagai featured | 🟠 |
| **L-E** | **Tidak ada sticky CTA bar** — kehilangan conversion point | haloka: sticky bottom bar "Belum yakin? Coba fitur juragan gratis 7 hari. → Ambil Trial" | 🔴 conversion |
| **L-F** | **Tidak ada Reality Check interaktif** — haloka punya slider "Volume Chat Harian 100/500/1000" dengan output perbandingan manual vs Haloka | socio: punya OrderSimulator tapi tidak ada "perbandingan dengan tanpa socio" emotional hook | 🟠 emotional |
| **L-G** | **Tidak ada Brain Engine / magic moment visual** — haloka punya mockup terminal "Uploading SOP_Toko_2026.pdf" + progress + "Status: Processing Knowledge..." | socio: hero mockup live sudah ada, tapi section "Cara Pakai" masih flat numbered list | 🟡 |
| **L-H** | **Trust band mono** — "1.240 order aktif · 8.270 layanan · 882 kategori · 42 detik" naratif OK tapi tidak ada icon/badge visual | haloka: 4 trust icon (lock/lightning/shield/brain) + label + subtitle | 🟡 |
| **L-I** | **FinalCTA sebelum FAQ** — momentum konversi kepotong | urutan ideal: FAQ → FinalCTA → Footer (FAQ handle objection dulu) | 🟡 order |
| **L-J** | **Footer plain** — tidak ada newsletter signup, social proof kosong, micro-copy | retention loop hilang | 🔴 retention |
| **L-K** | **Blog tidak promoted di landing** — landing tidak ada "Baca artikel terbaru" section | internal linking + trust | 🟡 |
| **L-L** | **Money pages generic hero** — setiap money page (beli-followers-instagram dll) copy generik, tidak ada unique selling per keyword intent | per-keyword optimization | 🟠 SEO |
| **L-M** | **OrderSimulator ada tapi tanpa Mode Reseller** — saat ini hanya menampilkan harga retail, tidak ada cara untuk visitor melihat "kalau jadi reseller, margin saya berapa?" — kehilangan funnel konversi reseller | haloka: implicit, socio bisa lebih powerful dengan toggle reseller + margin chip | 🟡 conversion |
| **L-N** | **CSS delivery bisa di-tune** — shared tailwind sudah external cache, tapi beberapa route CSS mungkin > 4KB inline threshold | check & inline critical | 🟢 perf |
| **L-O** | **Cache-control DYNAMIC** — CF bisa set STATIC untuk landing (zero dynamic content) | measure & adjust | 🟢 perf |
| **L-P** | **Lighthouse mobile belum diukur** — target ≥ 90 | measure | 🟢 perf |
| **L-Q** | **No skip link / a11y polish** — skip "Skip to main content", aria-label icon-only, focus order | polish | 🟢 a11y |
| **L-R** | **Ticker strip belum diimplementasi** — DESIGN.md §3g A3 sudah spec tapi di index.astro tidak ada | add | 🟠 |
| **L-S** | **FAQ accordion chevron rotate** sudah di spec (A8) — perlu audit motion berjalan | verify | 🟡 |
| **L-T** | **Reading progress bar** (A11b) untuk single blog — spec ada, mungkin belum | add | 🟢 blog |

---

## 3. SEO System — Current State + Improvement

> Lihat `docs/LANDING_SEO_SYSTEM.md` (171 baris, sangat lengkap) untuk full spec. Berikut audit + improvement 4 Sep 2026.

### 3.1 SEO Score Card

| Komponen | Status | Detail |
|---|---|---|
| **Sitemap** | ✅ Live | 19 URL (10 money + 5 blog + 4 misc) di `sitemap-0.xml`, di-link dari `sitemap-index.xml` |
| **robots.txt** | ✅ Live | Default Allow + Disallow `/api/ /404`, Sitemap directive, AI bot allowlist (GPTBot, CCBot) |
| **llms.txt** | ✅ Live | 28 baris, 10 money pages list + blog excerpt — feed untuk AI consumption (masa depan search) |
| **Meta OG/Twitter** | ✅ Live | og:title/description/image, twitter:card=summary_large_image, og:image=og-image.png |
| **Schema.org JSON-LD** | ✅ Live | WebSite + SearchAction (potentialAction) + Organization di homepage; Blog + BreadcrumbList di blog index; BlogPosting per article |
| **Canonical** | ✅ Live | `<link rel="canonical">` di homepage |
| **Hreflang** | ⚠️ Single bahasa (id-ID), tidak perlu multi — OK |
| **Money pages (10)** | ✅ Live | `/beli-followers-instagram/`, `/beli-followers-tiktok/`, `/beli-likes-instagram/`, dll — semua 308 redirect canonical |
| **Blog (5)** | ✅ Live | `/blog/apa-itu-smm-panel/`, dll |
| **Google Search Console** | ⚠️ Tidak terverifikasi | perlu setup (per `docs/TRAFFIC-BOOST-STRATEGY-2026-08-27.md` §1) |
| **Bing Webmaster Tools** | ⚠️ Belum | instant indexing, free, 5 menit setup |
| **Pinterest auto-pin** | ❌ | sumber traffic #1 untuk blog ID (per `TRAFFIC-BOOST-STRATEGY` §3) |
| **News.xml** (Google Publisher) | ❌ | blog article bisa masuk news carousel |
| **Internal linking** | 🟠 Lemah | homepage → blog belum ada section featured |
| **Keyword density** | 🟠 Belum diukur | perlu audit top 10 keyword (`SEO-KEYWORD-RESEARCH.md` punya 200+ keyword) |
| **Lighthouse SEO** | ⚠️ | audit mobile score ≥ 90 |

### 3.2 SEO Improvement Plan

#### A. Google Search Console + Bing Webmaster
- Setup `google90232eb1398e74e7.html` (sudah ada file) → verify via DNS TXT atau file
- Submit sitemap di GSC + Bing
- Monitor indexing per page
- Setup email alert untuk coverage issues

#### B. Auto-publish blog ke platform off-site
- **Pinterest auto-pin** (per `TRAFFIC-BOOST-STRATEGY §3`):
  - Setiap blog publish → auto-create pin dgn image OG + link canonical
  - Pinterest source traffic #1 blog ID gratis
  - Tool: `pinterest-api` atau manual cron pinboard (12 board: SMM Tips, Reseller, IG Growth, dll)
- **Medium repost** (canonical back to socio.id):
  - Mirror blog ke Medium publication "Socio.id Insights"
  - Tambahkan canonical link di Medium
- **Telegram channel auto-share**:
  - Channel `@socioid_berita` — auto-post link + excerpt tiap blog baru
  - Existing bot? perlu audit
- **LinkedIn Pulse** untuk artikel profesional (B2B reseller UMKM)

#### C. News sitemap
- Buat `/news.xml` khusus blog posts last 48h
- Submit ke Google News via Publisher Center
- Eligible untuk news carousel (boost CTR 3-5×)

#### D. Internal linking strengthening
- Homepage section **"Artikel Terbaru"** — 3 latest blog cards (compact) sebelum footer
- Blog single → **next article dock** (DESIGN.md A11) dengan progress %
- Money page → related blog CTA

#### E. Schema markup expansion
- Tambah `FAQPage` schema per FAQ section
- Tambah `HowTo` schema untuk OrderSimulator / Cara Pakai section
- Tambah `BreadcrumbList` per halaman (home, money, blog)
- Tambah `Product` schema per money page (offer: priceRange "Rp42/1k" + review)

#### F. Core Web Vitals target
- **LCP mobile < 2.5s** — hero copy text LCP, mockup image lazy load
- **INP < 200ms** — interaction delay
- **CLS < 0.1** — image aspect ratio set, no layout shift
- **TTFB < 800ms** — Cloudflare Pages edge
- Audit pakai `web-perf` (Chrome DevTools MCP) atau Lighthouse CI

#### G. Keyword density & content gap
- Audit top 20 keyword dari `SEO-KEYWORD-RESEARCH.md` — apakah sudah ada di landing?
- Tambah 10 new money page kalau search volume tinggi + competition low
- Refine copy existing money page dgn primary keyword di H1, H2, first paragraph

---

## 4. Phase Plan — L1 sampai L10

### Rekomendasi urutan eksekusi (highest ROI first):
1. **L1 Hero fix** (4h) — copy break, mockup enhance
2. **L2 Section reorder + content gap** (6h) — FAQ→FinalCTA, trust band icon, pain visual
3. **L3 Sticky CTA + Reality Check** (6h) — conversion point
4. **L4 Brain Engine / Magic Moment** (5h) — emotional visual
5. **L5 Mobile floating premium dock (paritas BottomNav app)** (4h) — glass token + dock-pop spring + badge + view-transition + haptic
6. **L6 Animation audit + activate** (8h) — semua 13 animasi spec jalan
7. **L7 FAQ variance + Footer retention** (5h) — newsletter, social proof
8. **L8 Blog integration + internal linking** (4h) — featured di landing, next-article dock
9. **L9 Money pages SEO optimize** (10h) — per-keyword copy + schema
10. **L10 Performance + Core Web Vitals** (6h) — CF cache static, image opt, critical CSS

**Total**: ~60 jam. Plus SEO system improvements ~20 jam. **Grand total: ~80 jam**.

---

## 5. Phase L1 — Hero Copy Fix + Mockup Polish

**Tujuan**: Hero copy tidak wrap jelek, mockup lebih "mesin hidup", copy lebih naratif + emotional hook.

### 5.1 Scope

**A. Copy restructure** (`index.astro:26-39`):
- Saat ini:
  ```
  Daftar reseller Rp50 ribu,
  saldo Rp20 ribu langsung jalan.
  ```
  → wrap jadi 4 baris di 1440px (karena `<br>` hard + max-width hero col).
- Fix: **single H1 + 2 line break natural**, hero copy + accent dengan 2 zone warna:
  ```
  Panel SMM Indonesia, mulai
  dari Rp50 ribu — saldo langsung jalan.
  ```
  → "Panel SMM Indonesia, mulai" (ink dark) → "dari Rp50 ribu — saldo langsung jalan." (accent cyan)
- Atau restructure jadi 3 layer naratif:
  - **H1 utama**: "Daftar Rp50rb, langsung dapat saldo Rp20rb + harga reseller."
  - **Subheadline**: "8.270 layanan Instagram, TikTok, YouTube, Telegram & SEO. Proses otomatis 24 jam, garansi refill 30 hari."
  - **USP ledger** tetap 5 row (Daftar / Saldo / Harga / Katalog / Proses)
- Update SEO `<h1>` sesuai (h1 baru, h2 section title)

**B. HeroMockup.svelte enhancement** (`landing/src/components/HeroMockup.svelte`):
- **Tambah micro-detail**:
  - Toast notification "Order #88233 selesai · +Rp3.500" masuk dari atas (2 detik sekali, fade out)
  - Bottom mini-chart "7-day order trend" line 7 titik (count-up animate in 1.2s)
  - Status badge color variance: pending yellow pulse, proses blue rotate, selesai green check, partial orange progress
- **Saldo "delta animation"**:
  - Setiap order selesai → saldo naik +counter tweened (250ms) + flash green text 1s
- **Floating metric cards** (DESIGN §3g A1, haloka pattern):
  - 3 mini-card mengambang di belakang phone: "Avg start time 42 detik", "Success rate 98.7%", "1.240 order aktif"
  - Float slow 4s ±6px, hidden mobile
- **Mobile mockup adaptation**:
  - Di mobile, mockup jadi full-width di bawah hero copy, max-width 360px center
  - Skip floating cards (hidden)
  - Mockup tetap jalan anim (user scroll ke mockup baru jalan — hemat CPU)

**C. Eyebrow upgrade**:
- Ganti teks statis `8.270 layanan aktif · semua platform` jadi **dynamic real-time counter**:
  - Hitung jumlah layanan aktif dari API `app.socio.id/api/stats/public` (cached 5 min)
  - Format: `8.270 layanan aktif · {N} order diproses sekarang`
- Live dot pulse lebih jelas (1.2s, accent-ink color bukan hijau)

### 5.2 Motion Spec

| Element | Animation | Spec |
|---|---|---|
| Hero H1 entrance | blur-in + fade | `blur(8px) → 0 + opacity 0 → 1`, 600ms cubic-bezier(0.16,1,0.3,1), delay 120ms setelah eyebrow |
| Eyebrow dot pulse | pulse | `box-shadow 0 0 0 0 → 0 0 0 8px transparent`, 1.2s infinite, accent-ink color |
| Eyebrow count-up | tweened | 0 → 8270, 800ms cubicOut, sekali on mount |
| USP ledger rows | reveal stagger | 60ms per row, fade + translate-y-2 → 0 |
| CTA primary | pop entrance | scale 0.96 → 1 + opacity 0 → 1, 320ms ease-out, delay 480ms |
| CTA secondary | same | delay 600ms |
| Mockup entrance | rotateY + scale | `rotateY(-8deg) perspective + scale(0.95) → 1`, 700ms ease-out, delay 200ms |
| Mockup glow breathing | opacity loop | 0.6 → 1, 6s infinite, ease-in-out |
| Mockup saldo count-up | tweened | 0 → 247500, 1.8s cubicOut, sekali on mount |
| Mockup saldo delta | fade + slide-up | translateY(8px) → 0 + opacity, 220ms in, 400ms hold, 220ms out |
| Order stream | slide-down + fade | translateY(-100%) → 0, 300ms ease-out, tiap 2.5s, max 4 row (replace, no CLS) |
| Progress bar loop | width 35% → 96% | 6s linear, restart tiap row baru |
| Platform rotate | bg swap + crossfade | 200ms bg, 250ms content crossfade, tiap 2.4s |
| Toast notif | slide-down from top | translateY(-100%) → 0, 280ms, hold 1.6s, fade out 200ms |
| Mini-chart entrance | SVG line draw | stroke-dasharray 0 → length, 800ms ease-out |
| Floating cards | float slow | translateY ±6px, 4s ease-in-out infinite, stagger 1s delay |
| Hover mockup (desktop) | tilt follow pointer | rotateX/Y ±3deg, 200ms, only desktop ≥1024px |
| Reduced-motion | pause total | state final instant, no float, no pulse, no rotate |

### 5.3 Copywriting

- **Eyebrow**: `🟢 8.270 layanan aktif · {N} order diproses sekarang`
- **H1**: `Panel SMM Indonesia, mulai dari **Rp50 ribu** — saldo **langsung jalan**.`
- **Sub**: `Daftar sekali di Socio.id, langsung dapat saldo Rp20.000 + akses harga reseller di 8.270 layanan Instagram, TikTok, YouTube, Telegram, Spotify & SEO. Proses otomatis 24/7, garansi refill 30 hari.`
- **USP rows** (5):
  - `Daftar reseller · Rp50.000 sekali`
  - `Saldo langsung masuk · Rp20.000 (siap order)`
  - `Harga layanan · Khusus reseller, lebih murah`
  - `Katalog · 8.270 layanan · 882 kategori`
  - `Proses · Otomatis 24 jam · refill garansi 30 hari`
- **CTA primary**: `Daftar Reseller — Rp50rb →` (keep)
- **CTA secondary**: `Coba Hitung Order (tanpa daftar) →` (ganti dari `Lihat 8.270 layanan` → fokus interactive)
- **Trust micro**: `Termasuk saldo Rp20.000 · langsung bisa order · garansi refill 30 hari`

### 5.4 A11y
- H1 single, semantic heading
- Mockup live region: `aria-live="polite"` untuk saldo + order stream updates (kalau too noisy, aria-live="off" + text "Simulasi dashboard — angka tidak real")
- Mockup: `aria-label="Simulasi dashboard socio.id: saldo Rp247.500, 4 order berjalan"`
- CTA accessible, focus-visible ring cyan
- Reduced-motion fully respected

### 5.5 Files diubah
- `landing/src/pages/index.astro:26-89` — H1 restructure + eyebrow dynamic
- `landing/src/components/HeroMockup.svelte:1+` — tambah toast notif, mini-chart, floating cards
- `landing/src/pages/api/stats/public.ts` (NEW) — endpoint stats cached 5min untuk eyebrow dynamic
- `landing/src/components/HeroEyebrow.astro` (NEW ~30 LOC) — komponen eyebrow dgn real-time count
- `landing/src/styles/global.css:76-95` — toast notif keyframe + mini-chart SVG stroke-dasharray helper

### 5.6 Acceptance
- ✅ H1 tidak wrap jelek di 1440×1000 (max 2 line)
- ✅ Eyebrow dynamic count dari API
- ✅ Mockup tambah 4 micro-detail: toast, mini-chart, floating cards, status variance
- ✅ Reduced-motion pause total
- ✅ A11y: H1 semantic, mockup aria-label, focus-visible
- ✅ Lint + astro check pass
- ✅ Manual test 1440×1000 + 390×844 + prefers-reduced-motion
- ✅ Lighthouse mobile LCP < 2.5s

### 5.7 Estimasi
~4 jam.

---

## 6. Phase L2 — Section Reorder + Content Gap Fix

**Tujuan**: Reorder FAQ sebelum FinalCTA, trust band dengan icon, pain section dengan visual.

### 6.1 Scope

**A. Section reorder** (`index.astro:80-180`):
- Current order: Hero → ProviderProof → InlineStat → ProblemLedger → OrderSimulator → OrderBoard → KapabilitasBento → HowItWorks → TestiLedger → PricingTable → **FinalCTA → FAQ** → Footer
- Target order: Hero → ProviderProof → InlineStat (icon) → ProblemLedger (visual) → OrderSimulator → **RealityCheck** (NEW) → OrderBoard → KapabilitasBento → HowItWorks → TestiLedger → PricingTable → **FAQ → FinalCTA** → Footer
- FAQ sebelum FinalCTA = objection handled dulu, conversion lebih tinggi (per haloka pattern + `LANDING_AUDIT.md §2`)

**B. Inline-stat icon upgrade** (`index.astro:104-115`):
- Tambah 4 icon mini di awal setiap metric:
  - 🟢 `8.270 layanan` (icon: layers/grid)
  - ⚡ `1.240 order aktif` (icon: zap/lightning)
  - 🕐 `42 detik mulai proses` (icon: clock)
  - 👥 `50.000+ reseller` (icon: users)
- Layout: flex horizontal di desktop, stack di mobile
- Icon: 16px, accent-tint background, rounded-lg
- Number pakai `NumberFlow` count-up saat masuk viewport

**C. ProblemLedger visual upgrade** (`ProblemLedger.astro`):
- Tambah 4 pain scenarios dengan visual mini-illustration:
  - 📉 **Followers turun sendiri?** → "Garansi refill 30 hari, sistem cek & isi ulang otomatis tanpa perlu tiket."
  - 💸 **Harga reseller lain mahal?** → "Daftar sekali di Socio.id, langsung dapat harga termurah di 8.270 layanan."
  - ⏳ **Order harus nunggu admin?** → "Diproses bot, rata-rata 42 detik setelah order — sistem yang jalan, bukan manusia."
  - 📞 **CS susah dihubungi tengah malam?** → "Status order & saldo masuk via Telegram dan web push — tengah malam pun jalan."
- Visual: tiap row punya icon chip kiri (32px, accent-tint) + label + arrow + solusi

**D. Reality Check interactive section** (NEW, inspired haloka):
- Lokasi: setelah OrderSimulator, sebelum OrderBoard
- Judul: "Reality Check · bandingin sendiri"
- Subheadline: "Coba geser slider volume order — lihat berapa lama kalau manual vs Socio.id"
- Slider: `Volume order harian` (10 / 100 / 1.000)
- Output 2-col:
  - **Manual** (red badge): "Butuh 5 admin · Rp4.5 juta/bulan · 6 jam/hari untuk balas chat"
  - **Socio.id** (accent badge): "Butuh 0 admin · Rp50rb sekali daftar · Auto 42 detik"
- Per slider position, output count-up animated
- CTA: "Daftar sekarang → hemat Rp4.5 juta/bulan"

### 6.2 Motion Spec

| Element | Animation | Spec |
|---|---|---|
| Trust icon entrance | fade + scale | 200ms ease-out, stagger 60ms |
| Number count-up | tweened NumberFlow | 0 → target, 800ms cubicOut, once on visible |
| Pain row reveal | row stagger | 80ms per row, translate-y-2 → 0 + fade |
| Pain icon chip entrance | scale 0.8 → 1 | 240ms spring, delay 100ms after row |
| Slider thumb | scale 1.1 + accent shadow | on active drag, hilang on release |
| RealityCheck output swap | crossfade + count-up | 300ms fade, NumberFlow spring 600ms |
| RealityCheck CTA | pop | scale 0.96 → 1, 320ms ease-out, delay 200ms after value |
| Section reveal | fade + translate-y-8 → 0 | 600ms ease-out, IntersectionObserver |
| Reduced-motion | instant | no count-up, no stagger |

### 6.3 Copywriting
- **Section title (InlineStat)**: hapus title, biar naratif inline
- **Pain row labels** (4 — lihat 6.1.C)
- **RealityCheck**:
  - Eyebrow: `🔥 REALITY CHECK · BISNIS`
  - Title: `Berapa Berat Beban Tim Anda?`
  - Sub: `Geser slider. Bandingkan manual vs **Socio.id membersihkan semuanya**.`
  - Slider label: `Volume order harian` + unit `order`
  - Slider scale: `Sepi (10) · Normal (100) · Viral (1.000)`
  - Manual column title: `🔴 Metode Manual` + subtitle `Estimasi beban tim`
  - Socio column title: `🚀 Solusi Socio.id` + subtitle `Otomatis 24/7`
  - Manual metrics dynamic:
    - 10: `1 admin part-time · Rp900rb/bulan · 1 jam/hari`
    - 100: `3 admin · Rp2.7jt/bulan · 4 jam/hari`
    - 1000: `5+ admin · Rp4.5jt/bulan · 6 jam/hari`
  - Socio metrics: `0 admin · Rp50rb sekali · Auto 42 detik`
  - CTA: `Hemat Rp4.5jt/bulan → Daftar Reseller`

### 6.4 A11y
- Slider: `<input type="range">` + label + output element + aria-valuenow/min/max
- Output cards: `role="region"` + `aria-label`
- CTA accessible, focus order logical
- Reduced-motion fully respected

### 6.5 Files diubah
- `landing/src/pages/index.astro:80-180` — reorder section, move FAQ before FinalCTA
- `landing/src/components/InlineStatIcons.astro` (NEW ~80 LOC) — trust strip dengan icon
- `landing/src/components/ProblemLedger.astro` — tambah visual + 4 scenarios
- `landing/src/components/RealityCheck.svelte` (NEW ~150 LOC) — interactive slider
- `landing/src/styles/global.css` — slider style custom, output card crossfade keyframe

### 6.6 Acceptance
- ✅ Section order: FAQ sebelum FinalCTA (verify di dev)
- ✅ Trust band punya 4 icon + count-up
- ✅ Pain section 4 scenarios dengan visual chip
- ✅ RealityCheck slider works, output update real-time
- ✅ Lint + astro check pass
- ✅ Screenshot before/after saved

### 6.7 Estimasi
~6 jam.

---

## 7. Phase L3 — Sticky CTA Bar + Conversion Architecture

**Tujuan**: Tambah sticky bottom CTA bar (haloka pattern) + improve conversion architecture (mid-page CTA di section penting).

### 7.1 Scope

**A. Sticky CTA bottom bar** (`StickyCTA.svelte` — sudah ada, audit motion + variant):
- Default state: `Belum yakin? Coba **7 hari** gratis — tanpa kartu kredit.` + CTA `Daftar Trial →`
- Show setelah user scroll > 30% page (below hero)
- Hide saat user di section FAQ atau FinalCTA (double CTA hindari)
- Hide di halaman conversion (blog single, money page yang sudah punya CTA besar)
- Mobile: full-width pill, safe-area-inset-bottom padding
- Desktop: centered pill max-w-md bottom-6
- Background: glass `bg-white/85 backdrop-blur-md shadow-lg border border-ink-100`
- A11y: `aria-label="CTA conversion"` + close button `aria-label="Tutup"`

**B. Inline CTA mid-page**:
- Setelah PricingTable: mini CTA strip `Siap jadi reseller? Daftar Rp50rb — saldo Rp20rb langsung jalan. [Daftar →]`
- Setelah TestiLedger: testimonial → CTA flow (testi + CTA dalam 1 row)
- OrderSimulator: existing CTA "Pesan →" sudah ada, polish jadi "Coba Pesan Tanpa Daftar →" (no signup barrier)

**D. Floating WhatsApp polish** (`FloatingWhatsApp.svelte`):
- Default state: tombol WA ijo dengan tooltip "Chat Tim Support" (haloka pattern)
- Idle 3s: pulse scale 1 → 1.06 → 1, 3s loop
- Click: open WA `wa.me/628xxxxxxxxxx` dengan pesan template "Halo Socio.id, saya mau tanya soal [topik]"
- Motion A12 dari spec

### 7.2 Motion Spec

| Element | Animation | Spec |
|---|---|---|
| StickyCTA entrance | translate-y-full → 0 + opacity 0 → 1 | 320ms ease-out, delay 200ms after scroll trigger |
| StickyCTA exit (di FAQ/FinalCTA section) | translate-y-0 → translate-y-full + opacity 1 → 0 | 240ms ease-in |
| Mid-page CTA row | reveal fade + translate-y-4 | 500ms ease-out, stagger 60ms |
| Floating WA idle pulse | scale 1 → 1.06 → 1 | 3s ease-in-out infinite |
| Floating WA click | scale 0.92 → 1 + haptic | 120ms |
| Reduced-motion | no pulse, no slide | instant |

### 7.3 Copywriting
- **Sticky CTA**: `Belum yakin? Coba **7 hari gratis** tanpa kartu kredit.` + `[Daftar Trial →]`
- **Mid-page CTA setelah pricing**: `Siap jadi reseller? Daftar Rp50rb · saldo Rp20rb langsung jalan.` + `[Daftar Sekarang →]`
- **Mid-page CTA setelah testi**: `Cerita mereka — sekarang giliran kamu.` + `[Mulai Rp50rb →]`
- **WA tooltip**: `💬 Chat Tim Support — balas < 5 menit (24/7)`

### 7.4 A11y
- StickyCTA: `role="region"` + `aria-label`
- Close button: `<button aria-label="Tutup CTA">×</button>`
- Focus trap when visible? Tidak, karena non-modal
- Reduced-motion fully respected

### 7.5 Files diubah
- `landing/src/components/StickyCTA.svelte` — audit + improve motion + variant logic
- `landing/src/components/PricingTable.astro` — tambah mid-page CTA row after table
- `landing/src/components/TestiLedger.astro` — tambah inline CTA after ledger
- `landing/src/components/FloatingWhatsApp.svelte` — pulse motion + tooltip improve
- `landing/src/pages/index.astro` — tempatkan mid-page CTA di section yang tepat

### 7.6 Acceptance
- ✅ Sticky CTA muncul setelah scroll > 30%, hide di FAQ/FinalCTA
- ✅ Mid-page CTA di pricing + testi
- ✅ WA pulse motion jalan
- ✅ A11y verified
- ✅ Lint + astro check pass

### 7.7 Estimasi
~6 jam.

---

## 8. Phase L4 — Brain Engine / Magic Moment Visual

**Tujuan**: Tambah emotional visual section yang bikin user "wah" — seperti haloka Brain Engine mockup.

### 8.1 Scope

**A. Magic Moment section** (NEW, lokasi: setelah HowItWorks):
- Title: "Lupakan Training Manual. Setup Sekali, Langsung Paham."
- Sub: "Daftar reseller sekali, langsung bisa order semua layanan. Sistem kami yang handle sisanya — refill otomatis, status real-time, garansi 30 hari."
- Visual mockup (kiri, 60% desktop, full-width mobile):
  - Terminal/browser mockup dengan animasi typing
  - Step animation:
    1. `> Status: Mendaftar reseller #${randomId}...` (typing 800ms)
    2. `> ✓ Akun aktif · saldo Rp20.000 masuk` (fade-in success)
    3. `> Status: Order pertama #${randomId}...` (typing 600ms)
    4. `> ✓ Diproses · rata-rata 42 detik` (fade-in success)
    5. `> Status: Order selesai...` (typing 500ms)
    6. `> ✓ Selesai · +1.250 followers` (fade-in success)
  - Loop dengan interval 8 detik (full sequence)
  - Pause on hover
- Copy panel (kanan, 40% desktop):
  - "Tanpa training. Tanpa SOP. Tanpa admin 24/7."
  - 3 bullet mini (bukan 3 bullet besar — anti-pattern):
    - `Daftar → otomatis order`
    - `Order → otomatis refill kalau turun`
    - `Status → real-time update via WA & web push`

**B. Integration dengan existing `OrderSimulator`**:
- Pastikan simulator tetap prominent
- Magic Moment jadi "after" — user sudah lihat coba → sekarang lihat sistem jalan sendiri

### 8.2 Motion Spec

| Element | Animation | Spec |
|---|---|---|
| Section reveal | fade + translate-y-8 → 0 | 600ms ease-out, IntersectionObserver |
| Terminal typing | character-by-character | 60ms per char, total ~6s untuk 1 cycle |
| Status line success | fade + scale 0.9 → 1 + check icon draw | 300ms, after typing complete |
| Cursor blink | opacity 1 → 0 | 500ms loop, hide after complete sequence |
| Loop pause on hover | animation-play-state: paused | CSS |
| Copy panel reveal | fade + translate-x-4 → 0 | 500ms ease-out, delay 200ms after section |
| Bullet stagger | 80ms each | fade + translate-y-2 |
| Reduced-motion | no typing, no loop | static terminal state |

### 8.3 Copywriting
- **Section title**: `Lupakan Training Manual.\n**Setup sekali, langsung jalan.**`
- **Sub**: `Daftar reseller sekali, langsung bisa order semua layanan. Sistem kami yang handle sisanya — refill otomatis, status real-time, garansi 30 hari.`
- **Copy panel intro**: `Tanpa training. Tanpa SOP. Tanpa admin 24/7.`
- **Bullet copy**:
  - `Daftar → otomatis order`
  - `Order → otomatis refill kalau turun`
  - `Status → real-time via WA & web push`

### 8.4 A11y
- Terminal mockup: `role="img"` + `aria-label="Simulasi proses order Socio.id"`
- Text live region: `aria-live="polite"` untuk status success updates (announce "Order selesai")
- Pause on hover untuk kasih user control

### 8.5 Files diubah
- `landing/src/components/MagicMoment.astro` (NEW ~120 LOC) — terminal mockup dgn typing
- `landing/src/components/TerminalMockup.svelte` (NEW ~80 LOC) — reusable terminal
- `landing/src/pages/index.astro` — tambah section setelah HowItWorks
- `landing/src/styles/global.css` — typing animation keyframe `typing-cursor`

### 8.6 Acceptance
- ✅ Section visible di desktop + mobile
- ✅ Terminal typing animation jalan, pause on hover, loop tiap 8s
- ✅ Copy panel dengan 3 bullet mini
- ✅ A11y: terminal aria-label, success announce
- ✅ Lint + astro check pass

### 8.7 Estimasi
~5 jam.

---

## 9. Phase L5 — Mobile Floating Premium Dock (paritas user dashboard)

**Tujuan**: Upgrade `FloatingTabDock.svelte` socio.id agar paritas kualitas dengan `BottomNav.svelte` user dashboard (`packages/ui/src/components/BottomNav.svelte`).  
> **Wireframe detail**: lihat `docs/WIREFRAME_SOCIOID.md` §3 (full anatomy, per-item spec, states, CTA variants). Saat ini socio.id dock masih inferior: glass literal `bg-white/75`, no spring bounce, no badge notif, no view-transition, no haptic. Target: floating premium dock ala iOS yang bikin visitor feel "ini app, bukan website marketing".

**Prinsip**: 
- Bukan hamburger menu (visitor harus 2-tap untuk sampai konten).
- Bukan top menu panjang (butuh scroll balik).
- Floating bottom dock = 1-tap ke semua section penting + CTA.
- Premium quality = glass token + spring bounce + haptic + view-transition + badge + safe-area.

### 9.1 Audit Spec vs Implementation

| Aspek | User Dashboard BottomNav | Socio.id FloatingTabDock (sekarang) | Gap |
|---|---|---|---|
| Glass surface | `glass` token-driven (var-based) | Literal `bg-white/75 backdrop-blur-2xl` | 🔴 Hardcode warna, tidak adaptif dark mode |
| Corner radius | `rounded-[28px]` superellipse | `rounded-[28px]` ✓ | ✅ OK |
| Spring bounce active | `dock-pop` 420ms cubic-bezier(.34,1.56,.64,1) — scale 0.82→1.12→1.02 | Tidak ada (instant swap) | 🔴 Kurang premium feel |
| Tap feedback | `active:scale-[0.96]` + haptic(6/10) | `active:scale-[0.92]` saja | 🔴 No haptic, scale kurang subtle |
| Focus ring | `focus-visible:ring-2 ring-primary/30` + ring-offset | `focus-visible:outline-2 outline-[var(--accent-focus-ring)]` | 🟡 Beda pattern (outline vs ring) |
| Badge notif | Built-in badge (notif, ticket) + "99+" | Tidak ada | 🔴 Tidak bisa show unread count |
| View transition | `view-transition-name: bottom-nav` | Tidak ada | 🟡 Tidak ada cross-page morph |
| Safe area | `pb-[calc(0.5rem+env(safe-area-inset-bottom))]` | ✓ | ✅ OK |
| Item count | 5-6 (Home, Katalog, Pesan, Pesanan, Saldo, Tiket) | 3 + CTA slot | 🟡 Limited (no Blog) |
| Active state | `bg-ink-900 text-ink-50 shadow-[0_4px_16px_rgba(15,23,42,0.22)]` filled | Accent-ink bg (cyan-teal) | 🟡 Beda semantic (dark filled vs accent) |
| Reduced motion | `@media (prefers-reduced-motion: reduce) { animation: none !important; }` | `transition-[opacity,transform] duration-300` only | 🟡 No explicit spring respect |

### 9.2 Upgrade Spec — FloatingTabDock v2

**A. Glass token integration**:
- Ganti literal `bg-white/75 backdrop-blur-2xl` → pakai class `glass` yang sudah ada di `packages/ui/src/components/glass.css` (atau buat local equivalent di `landing/src/styles/glass.css`).
- Definisi: `background: color-mix(in oklab, var(--paper) 82%, transparent); backdrop-filter: blur(24px) saturate(180%); border: 1px solid color-mix(in oklab, white 40%, transparent);`
- Adaptif: kalau ada dark mode (future), glass otomatis ikut token.

**B. Spring bounce active state** (port dari BottomNav.svelte):
```css
.dock-pop {
  animation: dock-pop 420ms cubic-bezier(0.34, 1.56, 0.64, 1) 1;
}
@keyframes dock-pop {
  0%   { transform: scale(0.82) translateY(2px); }
  60%  { transform: scale(1.12) translateY(-2px); }
  100% { transform: scale(1.02) translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  .dock-pop { animation: none !important; }
}
```
- Trigger: saat item dapat `aria-current="page"` (route change).
- Reduced-motion respect.

**C. Tap feedback + haptic**:
- Scale: `active:scale-[0.96]` (lebih subtle dari 0.92).
- Haptic: import `haptic` dari `@socio/ui` (atau buat local util `landing/src/lib/haptic.ts` 5 LOC). Pattern: `haptic(10)` on tab tap, `haptic(6)` kalau tap item yang sedang active (acknowledge only).
- Visual: transition-all 300ms cubic-bezier(0.16, 1, 0.3, 1).

**D. Badge notif support**:
- Item type tambah optional `badge?: number` (count) dan `badgeMax?: number` (default 99).
- Render absolute top-right pada icon, `bg-danger text-ink-50 ring-2 ring-white` (atau `ring-paper`).
- Show "99+" kalau count > 99.
- Untuk landing: item yang bisa punya badge:
  - `/blog` → "3 baru" (new posts count, hitung dari sitemap lastmod di build)
  - `/layanan` → "8.270" (total layanan — informational, bukan notif urgent)
- Default hidden (badge=0 atau undefined).

**E. View transition integration**:
- Tambah `style="view-transition-name: floating-dock;"` pada `<nav>`.
- Define CSS di global.css: `:global(::view-transition-old(floating-dock)) { animation: 90ms vt-fade-out; }` dll (mirror pattern BottomNav app).
- Efek: dock "tahan" posisinya pas navigasi halaman — smooth morph, no jarring blink.

**F. Item restructure** (5 items, dari 3+CTA jadi 5 terpadu):
- Lama: `[Beranda, Layanan, Reseller, CTA: Masuk/Daftar]`
- Baru: `[Beranda, Layanan, Blog, Reseller, CTA: Daftar]`
- Rationale: Blog penting untuk retention (content loop) + SEO backlink. Reseller tetap ada (konversi afiliasi). CTA jadi item terakhir dengan `bg-accent-ink text-white` styling (different from other items, jadi primary action jelas).
- Plus: tambah FAB `StickyCTA` HANYA muncul di homepage (existing behavior), di page lain dock CTA sudah cukup.

**G. CTA slot copy variants** (extend existing):
- `/` atau `/layanan`: `[Daftar Rp50rb →]` (registrasi reseller, primary conversion)
- `/blog`: `[Masuk]` (existing — visitor baca blog mau lanjut ke dashboard)
- `/beli-*` atau `/smm-panel-*`: `[Pesan Sekarang →]` (high intent, conversion critical)
- `/reseller`: `[Jadi Reseller →]` (existing)
- Default: `[Daftar →]`

**H. CTA item styling** (bukan slot terpisah, tapi item dengan style khusus):
- Class berbeda dari tab biasa: `bg-accent-ink text-white shadow-md` (filled accent, distinct).
- `aria-label={variant-specific}` untuk screen reader.

### 9.3 Motion Spec

| Element | Animation | Spec |
|---|---|---|
| Dock entrance | translate-y-16 → 0 + opacity 0 → 1 | 300ms ease-out cubic-bezier(.16,1,.3,1), scroll > 50vh |
| Item active (route change) | dock-pop spring | 420ms cubic-bezier(.34,1.56,.64,1), scale 0.82→1.12→1.02 |
| Item tap | scale 0.96 | 150ms ease-out, + haptic(10) |
| Item tap active tab | scale 0.96 + haptic(6) | acknowledge only |
| CTA label change | instant + re-layout | 0ms (no anim, biar snappy) |
| Badge appear | scale 0.8 → 1 + fade | 200ms ease-out |
| Cross-page (view transition) | hold position | 90ms out + 210ms in cubic-bezier(.16,1,.3,1) |
| Reduced-motion | no entrance, no spring | instant |

### 9.4 Copywriting
- Tab labels: `Beranda · Layanan · Blog · Reseller · (CTA: Daftar)`
- CTA variants (per page):
  - `/`, `/layanan`: `[Daftar Rp50rb →]`
  - `/blog`: `[Masuk]`
  - `/beli-*`, `/smm-panel-*`: `[Pesan Sekarang →]`
  - `/reseller`: `[Jadi Reseller →]`
  - Default: `[Daftar →]`
- aria-label dinamis: `aria-label={\`Buka \${label}\`}` (untuk screen reader yang announce "Buka Beranda" bukan "Beranda link").

### 9.5 A11y
- `<nav aria-label="Navigasi utama mobile">` (existing) ✓
- `aria-current="page"` untuk active item (existing) ✓
- Focus-visible ring 2px primary/30 + ring-offset (upgrade dari outline)
- Tap target ≥ 48×52px (existing 52px min-h) ✓
- CTA item: `aria-label={\`CTA: \${ctaLabel}\`}` supaya screen reader tau ini primary action
- Badge: `aria-label={\`\${badge} notifikasi baru\`}` (sr-only)
- Reduced-motion: spring + entrance di-disable, instant state

### 9.6 Files diubah
- `landing/src/components/FloatingTabDock.svelte` — REWRITE 123 → ~180 LOC (glass class, dock-pop CSS, haptic import, badge support, view-transition-name, 5 item structure, CTA item styling)
- `landing/src/styles/glass.css` (NEW ~30 LOC) — `.glass` class token-driven (kalau belum ada di shared)
- `landing/src/lib/haptic.ts` (NEW ~15 LOC) — port dari `@socio/ui/haptic`, fallback ke navigator.vibrate(10) atau no-op (kalau @socio/ui tidak accessible dari landing workspace)
- `landing/src/styles/global.css` — tambah view-transition CSS untuk `floating-dock`
- `landing/src/components/Navbar.svelte` — minor: tambah comment "mobile nav ada di FloatingTabDock, BUKAN hamburger"

### 9.7 Acceptance
- ✅ Glass pakai class `glass` token, bukan literal `bg-white/75`
- ✅ Active item spring bounce `dock-pop` 420ms cubic-bezier(.34,1.56,.64,1)
- ✅ Tap feedback `active:scale-[0.96]` + haptic(10)
- ✅ Badge support built-in (item.badge, 99+ truncation)
- ✅ View transition `view-transition-name: floating-dock`
- ✅ 5 items structure: Beranda, Layanan, Blog, Reseller, CTA Daftar
- ✅ CTA item styling distinct (filled accent vs ghost tabs)
- ✅ Reduced-motion respected (no spring, no entrance)
- ✅ A11y: focus-visible ring + aria-current + aria-label dinamis + badge sr-only
- ✅ Tap target ≥ 48×52px
- ✅ Safe-area-inset-bottom respected (iOS notch)
- ✅ Cross-page: position hold saat navigasi via view transition
- ✅ A/B test plan (existing 3+CTA vs new 5 with Blog) → track click distribution per tab
- ✅ Lighthouse mobile ≥ 90 (bundle delta < +5KB gzipped)
- ✅ Visual regression test (per-tab screenshot 390×844 + 768×1024)
- ✅ Lint + astro check pass

### 9.8 Estimasi
~4 jam (1× rewrite component + 1× glass util + 1× haptic util + 1× verify + 1× commit).
---

## 10. Phase L6 — Animation Audit + Activate (Semua 13 Animasi Spec)

**Tujuan**: Pastikan semua 13 animasi dari `LANDING_DESIGN_PLAN.md §3g` berjalan. Audit mana yang jalan, mana yang belum, aktivasi yang belum.

### 10.1 Audit 13 Animasi

| # | Spec | Status | Action |
|---|---|---|---|
| A1 | Count-up intro stat | ⚠️ Partial — hero number statis di copy, belum count-up | Add NumberFlow ke hero |
| A2 | Live order mockup stream | ✅ Jalan di HeroMockup.svelte | verify |
| A3 | Live ticker strip | ❌ Belum — spec tapi tidak ada di index.astro | **Add komponen Ticker** |
| A4 | SVG check draw | ⚠️ OrderSimulator submit — perlu verify | audit |
| A5 | Gauge ring | ⚠️ OrderSimulator slider | audit |
| A6 | Ticker entrance stagger | ✅ `.reveal` pattern jalan | verify di semua section |
| A6b | Floating dock masuk | ⚠️ Perlu audit scroll trigger | add if missing |
| A7 | Dock CTA micro | ✅ Tap scale 0.92 | verify |
| A8 | FAQ chevron rotate | ⚠️ Perlu audit | add if missing |
| A9 | Platform glyph hover | ⚠️ HowItWorks cards | add hover scale 1.05 |
| A10 | Slider thumb glow | ⚠️ RealityCheck slider | add on active |
| A10b | Ticker pause on tap | ❌ Ticker belum ada | add dengan A3 |
| A11 | Related next-dock | ❌ Blog single belum punya next dock | add di blog |
| A11b | Reading progress | ❌ Blog single belum | add 2px top bar |
| A12 | WhatsApp float | ⚠️ Pulse belum? | add idle pulse |
| A13 | Bento mockup chart | ⚠️ KapabilitasBento chart | add SVG line draw |

### 10.2 Scope: Activasi Yang Belum

**A. Live ticker strip** (A3 + A10b):
- Lokasi: setelah hero, sebelum trust band
- Konten: marquee horizontal CSS animation, list klaim real-time
  - `✓ #88234 Selesai · 1.250 followers · 42 detik lalu`
  - `✓ #88233 Selesai · 5.000 Spotify Plays · 1 menit lalu`
  - `✓ #88232 Selesai · 500 Telegram Members · 2 menit lalu`
  - `🔥 #88231 Order baru masuk · 2.000 TikTok Likes`
  - `✓ #88230 Selesai · 25.000 IG Reels Views · 3 menit lalu`
- 40s linear infinite, pause on hover
- A11y: `role="marquee" aria-label="Aktivitas real-time socio.id"`

**B. FAQ chevron rotate** (A8):
- Toggle: rotate(90deg) + panel max-height 220ms
- Implement di `Faq.svelte` accordion

**C. Bento mockup chart** (A13):
- `KapabilitasBento.astro` cell besar — tambah SVG line chart dengan stroke-dasharray animation
- Data: trend dummy 7-day (up trend)

**D. WhatsApp pulse** (A12):
- `FloatingWhatsApp.svelte` — idle 3s trigger scale pulse 1 → 1.06 → 1 loop 3s

**E. Reading progress blog** (A11b):
- `landing/src/pages/blog/[slug].astro` — tambah 2px accent bar di top, width = scroll%
- Position: `fixed top-0 left-0 z-50 h-0.5 bg-accent-ink`

**F. Next article dock** (A11):
- Bottom blog single — muncul setelah scroll 80%
- Card kecil: thumbnail + title + "Selanjutnya →" + progress baca %

**G. SVG check draw** (A4):
- OrderSimulator submit success → check icon path draw dengan stroke-dasharray
- 400ms duration

### 10.3 Motion Spec (new components)

| Element | Animation | Spec |
|---|---|---|
| Ticker strip | translateX 0 → -50% infinite | 40s linear, 2 set konten (no gap) |
| Ticker pause on hover | animation-play-state: paused | CSS |
| Ticker pause on tap | animation-play-state: paused, resume 2s | JS |
| FAQ chevron | rotate(0 → 90deg) | 180ms ease |
| FAQ panel | max-height 0 → 500px + opacity | 220ms ease |
| Bento chart line draw | stroke-dasharray 0 → length | 600ms ease-out |
| WA pulse | scale 1 → 1.06 → 1 | 3s ease-in-out infinite, idle 3s trigger |
| Reading progress bar | width = scroll% | transition 100ms |
| Next article dock | translate-y-16 → 0 + opacity | 300ms, scroll 80% trigger |
| SVG check draw | stroke-dasharray 0 → length | 400ms ease-out |
| Reduced-motion | pause / static | state final |

### 10.4 Copywriting
- **Ticker content**: contoh di 10.2.A
- **Next article dock**: "📖 Artikel Selanjutnya · ~3 menit baca" + title + thumbnail
- **Reading progress**: implicit, no copy

### 10.5 A11y
- Ticker: `role="marquee"` + `aria-label`
- FAQ: `aria-expanded` + `aria-controls`
- Chart: `role="img"` + `aria-label="Tren 7 hari"`
- WA pulse: `aria-hidden` untuk decorative
- Reading progress: aria-hidden, implicit

### 10.6 Files diubah
- `landing/src/components/TickerStrip.svelte` (NEW ~80 LOC)
- `landing/src/components/Faq.svelte` — chevron rotate + max-height
- `landing/src/components/KapabilitasBento.astro` — chart SVG line draw
- `landing/src/components/FloatingWhatsApp.svelte` — idle pulse
- `landing/src/components/OrderSimulator.svelte` — SVG check draw on submit
- `landing/src/pages/blog/[slug].astro` — reading progress + next article dock
- `landing/src/components/NextArticleDock.svelte` (NEW ~80 LOC)
- `landing/src/components/ReadingProgress.svelte` (NEW ~30 LOC)

### 10.7 Acceptance
- ✅ 13/13 animasi spec aktif
- ✅ Ticker strip jalan dengan pause on hover/tap
- ✅ FAQ accordion smooth
- ✅ Bento chart line draw on viewport
- ✅ WA pulse jalan setelah 3s idle
- ✅ Blog reading progress + next article dock
- ✅ Lint + astro check pass

### 10.8 Estimasi
~8 jam.

---

## 11. Phase L7 — FAQ Variance + Footer Retention

**Tujuan**: FAQ redesign dengan variance + footer tambah retention mechanism (newsletter signup, social proof, repeat-visit hook).

### 11.1 Scope

**A. FAQ redesign** (`Faq.svelte`):
- Tambah **featured top 2** question dengan visual mini-icon (chip besar + label "Pertanyaan Populer")
- 6 regular FAQ (keep) dalam accordion
- Variance: featured beda visual dari regular (chip bg + label)
- Tambah search input di atas FAQ (filter by keyword)
- Tambah "Masih ada pertanyaan?" CTA bottom → WhatsApp

**B. Footer retention** (`Footer.astro`):
- Tambah **newsletter signup** section:
  - "📬 Tips SMM & reseller mingguan — langsung ke inbox kamu"
  - Input email + button "Daftar Newsletter"
  - Submit ke `app.socio.id/api/newsletter/subscribe` (P3-09 broadcast ready, atau simple endpoint)
- Tambah **social proof** strip: "Dipercaya 50.000+ reseller & UMKM" + 5 avatar dummy atau logo strip (kalau ada)
- Tambah **link kategori** (per spec SEO §2 money pages list sebagai cluster)
- Tambah **micro-copy** bawah: "🇮🇩 Dibuat di Indonesia · PT Cipta Multikarya Propertindo" (kalau applicable) atau "Berdiri 2019 · 50.000+ UMKM"

**C. Retention hooks**:
- **"Simulasi Order"** interaktif: enhance `OrderSimulator` existing — toggle "Mode Reseller" munculkan margin 40% + secondary CTA daftar reseller. Conversion-focused untuk buyer (default: harga retail) + reseller (toggle on: lihat margin). Showcase breadth via breakdown `harga/1k × jumlah` yang transparan, bukan hidden cost.
- "Artikel Terbaru" section sebelum footer (3 latest blog cards)
- "Testimoni Video" mini section (kalau ada video, embed YouTube; kalau belum, placeholder)

### 11.2 Motion Spec

| Element | Animation | Spec |
|---|---|---|
| FAQ featured chip entrance | scale 0.95 → 1 + fade | 280ms ease-out, stagger 60ms |
| FAQ search input focus | border accent + shadow accent | 200ms |
| FAQ filter | max-height collapse + fade | 220ms ease |
| Newsletter input focus | border + shadow | 200ms |
| Newsletter submit success | check icon draw + bg fade green | 400ms |
| OrderSimulator slider drag | output count-up | 600ms spring |
| OrderSimulator breakdown fade in | opacity 0 → 1 + translate-y-1 | 200ms ease-out |
| OrderSimulator mode toggle | switch slide + chip scale 0.95 → 1 | 250ms ease-out |
| OrderSimulator reseller CTA reveal | translate-y-2 → 0 + fade | 220ms ease-out, delay 80ms after toggle |
| Blog cards stagger | 80ms each | fade + translate-y-2 |
| Reduced-motion | instant | no scale, no count-up |

### 11.3 Copywriting

- **Featured top 2 questions**:
  - `🔥 Berapa minimal daftar?` → "Cuma Rp50.000 sekali. Saldo Rp20.000 langsung masuk, siap order."
  - `🤔 Aman nggak? Bisa refund?` → "100% aman. Garansi refill 30 hari. Kalau order drop, otomatis di-refund ke saldo."
- **FAQ regular**: keep 6 existing
- **FAQ search placeholder**: "Cari pertanyaan…"
- **FAQ bottom CTA**: "Masih ada yang belum terjawab? Chat Tim Support 24/7 →"
- **Newsletter**:
  - Title: `📬 Tips SMM & reseller mingguan`
  - Sub: `Insight bisnis, harga layanan terkini, dan strategi reseller — langsung ke inbox. Tanpa spam.`
  - Placeholder: `email@kamu.com`
  - Button: `Daftar Newsletter →`
  - Success: `✓ Sip! Cek email kamu untuk konfirmasi.`
  - Error: `Wah, emailnya kurang valid. Coba lagi?`
- **OrderSimulator (enhanced — sudah ada, tinggal tambah toggle)**:
  - Title: `🧮 Simulasi Order — Cek Harga Tanpa Login`
  - Sub: `Pilih jumlah, langsung lihat harga. Aktifkan Mode Reseller untuk hitung margin kamu.`
  - Slider/input: `Jumlah` (existing — min/max sesuai service)
  - Toggle: `Mode Reseller` (NEW — off default → harga retail / on → tampilkan margin chip)
  - Output: `Estimasi: Rp___` (existing) + breakdown `Rp___ / 1.000 × [jumlah]` (NEW) + `Garansi refill 30 hari` (existing)
  - Toggle on: + chip `Margin kamu: Rp___ (~40%)` (NEW) + secondary CTA `Jadi Reseller →` (NEW)
  - CTA primary: `Lihat Semua Layanan →` → `/layanan` (existing)
- **Artikel Terbaru**: title + 3 blog cards (image, title, excerpt, date, read time)

### 11.4 A11y
- FAQ: `role="region"` + `aria-labelledby` + accordion proper
- Search: `<label>` + `aria-describedby` (result count)
- Newsletter: `<label for>`, error message `aria-describedby`
- OrderSimulator toggle: `<button role="switch" aria-checked>` + `aria-label="Mode Reseller"`, slider existing sudah punya label, output breakdown pakai `<output aria-live="polite">`, focus-visible ring 2px cyan
- Blog cards: semantic `<a>` + focus

### 11.5 Files diubah
- `landing/src/components/Faq.svelte` — featured top 2 + search + bottom CTA
- `landing/src/components/Footer.astro` — newsletter signup + social proof + kategori link
- `landing/src/components/NewsletterSignup.svelte` (NEW ~80 LOC)
- `landing/src/components/OrderSimulator.svelte` (ENHANCE existing 207 LOC: tambah `Mode Reseller` toggle + breakdown `harga/1k × jumlah` + margin chip + secondary CTA daftar reseller. Reuse toggle pattern dari RealityCheck.svelte. Tidak bikin component baru.)
- `landing/src/components/RecentArticles.astro` (NEW ~80 LOC) — 3 latest blog
- `landing/src/pages/api/newsletter/subscribe.ts` (NEW) — endpoint subscribe
- `landing/src/pages/index.astro` — tambah section sebelum FAQ: OrderSimulator + RecentArticles (OrderSimulator lebih tinggi di fold karena conversion-critical)

### 11.6 Acceptance
- ✅ FAQ featured top 2 + search + bottom CTA
- ✅ Footer newsletter signup works
- ✅ OrderSimulator `Mode Reseller` toggle interactive (off→harga retail / on→margin chip muncul)
- ✅ OrderSimulator breakdown `harga/1k × jumlah` ditambahkan di output
- ✅ OrderSimulator secondary CTA `Jadi Reseller →` muncul saat toggle on
- ✅ OrderSimulator a11y: toggle `role="switch"` + `aria-checked`, output `aria-live="polite"`
- ✅ OrderSimulator mobile 390×844 layout OK (toggle tap-friendly, output tidak overflow)
- ✅ OrderSimulator reduced-motion respected (no scale on toggle)
- ✅ OrderSimulator copy transparan (breakdown harga jelas, tidak ada hidden cost)
- ✅ LCP OrderSimulator < 1.5s (tidak nambah island baru, hanya enhance existing)
- ✅ Bundle OrderSimulator delta < +3KB gzipped (hanya tambah toggle + breakdown)
- ✅ OrderSimulator analytics event (`mode_reseller_on`, `reseller_cta_click`)
- ✅ OrderSimulator fallback kalau JS disabled (existing behavior tetap)
- ✅ Konversi A/B test plan (baseline vs with-reseller-toggle)
- ✅ Lint + astro check pass
- ✅ Recent articles 3 latest
- ✅ A11y verified
- ✅ Lint + astro check pass

### 11.7 Estimasi
~5 jam.

---

## 12. Phase L8 — Blog Integration + Internal Linking

**Tujuan**: Blog featured di landing, internal linking strengthening, single blog experience polish.

### 12.1 Scope

**A. Recent Articles section** (sudah di L7 — verify)
**B. Blog index improvement** (`/blog`):
- Featured article hero (1 large card dengan image)
- Category chip filter (Semua / Followers / TikTok / Reseller / Lainnya)
- Ledger rows (bukan card grid) — sudah ada per LANDING_DESIGN_PLAN
- Pagination windowed
- SEO: schema.org Blog + BreadcrumbList sudah ada — verify

**C. Blog single enhancement** (`/blog/[slug]`):
- **Reading progress bar** (sudah di L6 A11b)
- **Next article dock** (sudah di L6 A11)
- **TOC sidebar desktop** (Table of Contents dari headings)
- **Related articles** bottom (3 related by category)
- **Share buttons** (Twitter, Facebook, WhatsApp, copy link)
- **Newsletter inline** mid-article
- **Author bio** box (kalau multi-author, dummy kalau 1 author)

**D. Internal linking strategy**:
- Money page → CTA "Baca: [related blog article]"
- Blog single → related articles + money page CTA
- Footer → blog + money pages + reseller + layanan
- Hero → blog section mini (kalau ada)

### 12.2 Motion Spec

| Element | Animation | Spec |
|---|---|---|
| Featured article hero | fade + scale 0.95 → 1 | 500ms ease-out |
| Category chip | bg swap | 200ms |
| Blog row stagger | 80ms each | fade + translate-y-2 |
| Reading progress | width = scroll% | transition 100ms |
| Next article dock | translate-y-16 → 0 | 300ms, scroll 80% |
| TOC sidebar sticky | (no animation, sticky position) | — |
| Share button hover | scale 1.05 | 200ms |
| Newsletter inline | fade + slide-up | 500ms, on viewport |
| Reduced-motion | instant | no transform |

### 12.3 Copywriting
- **Blog index title**: `Blog Socio.id · Tips SMM, harga, & panduan reseller`
- **Featured label**: `📌 Featured`
- **Category chips**: keep
- **Article excerpt**: 1-2 kalimat dari intro
- **Read time**: `5 menit baca`
- **Date**: `4 Sep 2026`
- **Next article**: `📖 Selanjutnya · ~3 menit baca`
- **Related bottom**: `📚 Artikel Terkait`
- **Share**: `📤 Bagikan artikel ini`

### 12.4 A11y
- TOC: `<nav>` + `aria-label="Daftar isi"` + skip-link
- Share buttons: `<button>` dengan `aria-label="Bagikan ke Twitter"` dll
- Article: semantic `<article>` + `<header>` + heading hierarchy
- Reduced-motion respected

### 12.5 Files diubah
- `landing/src/pages/blog/index.astro` — audit + improve featured + filter
- `landing/src/pages/blog/[slug].astro` — reading progress + next dock + TOC + related + share
- `landing/src/components/TableOfContents.astro` (NEW ~80 LOC)
- `landing/src/components/ShareButtons.svelte` (NEW ~60 LOC)
- `landing/src/components/AuthorBio.astro` (NEW ~50 LOC)
- `landing/src/components/RelatedArticles.astro` (NEW ~80 LOC)
- `landing/src/components/NewsletterSignup.svelte` (sudah di L7) — reuse inline

### 12.6 Acceptance
- ✅ Blog index featured + filter
- ✅ Single blog: reading progress + next dock + TOC + related + share + newsletter
- ✅ A11y verified
- ✅ Lint + astro check pass

### 12.7 Estimasi
~4 jam.

---

## 13. Phase L9 — Money Pages SEO Optimize

**Tujuan**: Optimize 10 money page untuk SEO — per-keyword copy, schema, internal linking.

### 13.1 Scope

Per `SEO-KEYWORD-RESEARCH.md`:
- 10 money page existing:
  - `/beli-followers-facebook/`
  - `/beli-followers-instagram/`
  - `/beli-followers-tiktok/`
  - `/beli-likes-instagram/`
  - `/beli-members-telegram/`
  - `/beli-subscribers-youtube/`
  - `/beli-views-tiktok/`
  - `/beli-views-youtube/`
  - (cek list lengkap)
- Tambah money page baru kalau search volume tinggi:
  - `/beli-views-instagram/` (?)
  - `/beli-likes-tiktok/` (?)
  - `/beli-views-reels/` (?)
  - `/beli-followers-twitter/` (?)

**Per-page optimization**:
- **H1** dengan primary keyword + modifier (contoh: "Beli Followers Instagram Indonesia · Mulai Rp42/1k · 100% Aman")
- **Subheadline** dengan secondary keyword
- **Intro paragraph** dengan keyword density optimal (1-2%)
- **H2 sections**:
  - "Cara Beli di Socio.id" (HowTo schema)
  - "Harga & Paket" (table dengan platform comparison)
  - "FAQ" (FAQPage schema)
  - "Testimoni" (kalau ada)
  - "Kenapa Pilih Socio.id" (USP list)
  - "Mulai Sekarang" (CTA)
- **Schema.org**:
  - `FAQPage` schema di FAQ section
  - `HowTo` schema di cara beli section
  - `Product` schema dengan `offers.priceRange`
  - `BreadcrumbList` (Home > Beli Followers Instagram)
  - `Article` schema untuk blog
- **Internal linking**:
  - → related blog article
  - → related money page (cluster)
  - → /reseller untuk upsell
- **Image**:
  - OG image per page (kalau belum, generate generic per category)
  - In-content image real (bukan emoji) untuk hero mockup

### 13.2 Motion Spec

| Element | Animation | Spec |
|---|---|---|
| Hero copy entrance | fade + translate-y-2 → 0 | 400ms ease-out |
| Price table row stagger | 40ms each | fade + translate-y-2 |
| FAQ accordion | chevron rotate + max-height | 220ms (sama dengan L6 A8) |
| CTA pop | scale 0.96 → 1 | 320ms ease-out |
| Section reveal | fade + translate-y-4 → 0 | 500ms |
| Reduced-motion | instant | no transform |

### 13.3 Copywriting Template (per money page)
- **H1**: `Beli {service} {platform} · Mulai Rp{termurah}/1k · 100% Aman`
- **Sub**: `Pesan {service} {platform} sekarang di Socio.id. {benefit_1}, {benefit_2}, {benefit_3}. Cocok untuk {use_case_1}, {use_case_2}.`
- **Trust micro**: `⭐ 50.000+ UMKM · 🔒 Garansi refill 30 hari · ⚡ Rata-rata 42 detik`
- **CTA primary**: `Pesan {Service} Sekarang →`
- **CTA secondary**: `Lihat Cara Pesan ↓`

### 13.4 A11y
- H1 + H2 + H3 semantic
- Table accessible (proper `<th>` `<td>`)
- FAQ with proper accordion
- CTA accessible
- Reduced-motion respected

### 13.5 Files diubah (template-based, apply ke 10+ pages)
- `landing/src/pages/beli-*/+page.astro` atau `.md` — optimize per page
- `landing/src/components/money/HeroOptimized.astro` (NEW ~80 LOC) — template hero
- `landing/src/components/money/PriceTable.astro` (NEW ~100 LOC)
- `landing/src/components/money/HowToSchema.astro` (NEW ~60 LOC)
- `landing/src/components/money/FaqSchema.astro` (NEW ~60 LOC)
- `landing/src/lib/seo/schema.ts` (NEW ~80 LOC) — schema generator helpers
- `landing/src/lib/seo/keyword-density.ts` (NEW ~40 LOC) — audit tool

### 13.6 Acceptance
- ✅ 10 money page H1 dengan primary keyword
- ✅ Schema.org lengkap (FAQPage, HowTo, Product, BreadcrumbList)
- ✅ Internal linking ke related blog + reseller
- ✅ Lint + astro check pass
- ✅ Lighthouse SEO score 100
- ✅ Google Search Console coverage improved (target: 100% indexed dalam 7 hari)

### 13.7 Estimasi
~10 jam.

---

## 14. Phase L10 — Performance + Core Web Vitals

**Tujuan**: Landing mobile Lighthouse ≥ 90, LCP < 2.5s, INP < 200ms, CLS < 0.1.

### 14.1 Scope

**A. Audit baseline**:
- Jalankan Lighthouse mobile di `/`, `/beli-followers-instagram`, `/blog/apa-itu-smm-panel`
- Catat LCP, INP, CLS, TBT, Speed Index
- Identifikasi bottleneck

**B. Image optimization**:
- Semua `<img>` pakai `astro:assets` `<Image>` component
- Format: AVIF + WebP fallback
- Lazy load below the fold
- Explicit width/height (prevent CLS)
- OG image per money page

**C. Font optimization**:
- Already self-hosted (✓) — verify preload
- Subset lebih kecil kalau ada karakter yang tidak terpakai
- `font-display: swap` (✓)

**D. CSS optimization**:
- Critical CSS inline per route (Astro default)
- Defer non-critical CSS
- Tailwind v4 purge — verify unused classes
- `kit.inlineStyleThreshold: 4096` (sudah dipakai di app, perlu verify landing)

**F. JavaScript optimization**:
- Astro islands `client:visible` (default sudah)
- Defer non-critical Svelte islands
- Bundle analysis — verify chunk size < 50KB shared
- Tree-shake unused dependencies

**G. Cache strategy** (`_headers` file):
- `/_astro/*` → `public, max-age=31536000, immutable` (✓ sudah)
- `/*.html` → `public, max-age=0, must-revalidate` (current DYNAMIC, cek apakah bisa STATIC)
- `/sitemap*` → `public, max-age=3600`
- `/llms.txt` → `public, max-age=3600`

**H. Third-party**:
- No Google Fonts CDN (✓ self-host)
- No analytics script yang blocking
- Preconnect ke `app.socio.id` API endpoint

**I. CF Pages config**:
- Set `cache-control: public, max-age=300` di homepage HTML untuk cache CDN edge 5 menit
- Atau tetap dynamic dengan edge cache via CF rules
- Compression Brotli (✓ CF default)
- HTTP/3 (✓ CF default)

### 14.2 Motion Spec
- Tidak ada motion baru di phase ini
- Verify existing motion tidak trigger layout shift (transform only, no width/height animation kecuali opacity)
- `prefers-reduced-motion` reduces animation duration 0.01ms (✓)

### 14.3 Copywriting
- Tidak ada copy baru
- Verify meta description + OG image optimal per page

### 14.4 A11y
- Tidak ada a11y baru
- Lighthouse Accessibility ≥ 95

### 14.5 Files diubah
- `landing/src/components/**/*.astro|.svelte` — convert `<img>` ke `<Image>` (astro:assets)
- `landing/public/_headers` — adjust cache-control
- `landing/astro.config.mjs` — verify inlineStyleThreshold + image config
- `landing/src/pages/index.astro` — preload critical font + OG image
- `landing/src/styles/global.css` — verify no layout shift

### 14.6 Acceptance
- ✅ Lighthouse mobile ≥ 90 (target 95+)
- ✅ LCP < 2.5s (target < 2.0s)
- ✅ INP < 200ms
- ✅ CLS < 0.1
- ✅ Speed Index < 3.0s
- ✅ TBT < 200ms
- ✅ Lint + astro check pass
- ✅ WebPageTest grade A

### 14.7 Estimasi
~6 jam.

---

## 15. SEO System Improvements (Cross-cutting)

### 15.1 Search Console Setup (2h)
- Verify `google90232eb1398e74e7.html` (file sudah ada)
- Submit sitemap di GSC
- Submit sitemap di Bing Webmaster Tools
- Monitor coverage per URL

### 15.2 AI Bot Allowlist (1h)
- Pastikan robots.txt mengizinkan GPTBot, CCBot, Claude-Web, anthropic-ai, PerplexityBot (per `LANDING_SEO_SYSTEM.md §5`)
- Generate `llms-full.txt` (full content) selain `llms.txt` (ringkas)

### 15.3 Schema Expansion (3h)
- `FAQPage` per FAQ section
- `HowTo` per OrderSimulator / Cara Pakai
- `Product` + `Offer` per money page (priceRange, availability, review)
- `BreadcrumbList` per page (home, money, blog, blog single)
- `Organization` lengkap dengan sameAs (Twitter, Facebook, LinkedIn)

### 15.4 Auto-Publish Off-Platform (4h)
- **Pinterest auto-pin** (per `TRAFFIC-BOOST-STRATEGY §3`):
  - Pinterest API token setup
  - Cron job: tiap blog publish → create pin dgn image OG
  - 12 boards: SMM Tips, Reseller, IG Growth, TT TikTok, YT YouTube, dll
- **Medium repost** (canonical):
  - Medium publication "Socio.id Insights"
  - Mirror blog per minggu (manual atau zapier)
- **Telegram channel auto-share**:
  - Bot + channel `@socioid_berita`
  - Auto-post tiap blog baru
- **LinkedIn Pulse** (optional, B2B reseller UMKM)

### 15.5 News Sitemap (2h)
- Generate `/news.xml` dengan blog posts last 48h
- Submit ke Google News via Publisher Center
- Verify eligibility

### 15.6 Internal Linking Strengthening (2h)
- Audit existing internal links
- Tambah "Baca juga" di blog single (related 3 article)
- Tambah "Related layanan" di money page
- Tambah "Baca: [blog]" CTA di setiap section landing yang relevan

### 15.7 Keyword Density Audit (2h)
- Top 20 keyword dari `SEO-KEYWORD-RESEARCH.md`
- Audit density per landing page (target 1-2%)
- Refine copy untuk keyword utama + secondary

### 15.8 New Money Pages (4h)
- Research keyword volume + competition
- Tambah 5-10 new money page untuk long-tail:
  - `/beli-views-reels-instagram/`
  - `/beli-likes-tiktok/`
  - `/beli-followers-twitter-x/`
  - `/beli-views-spotify/`
  - `/beli-members-telegram-channel/`
- Template-based, apply L9 optimization

### 15.9 Estimasi SEO Total
~20 jam (di luar 10 phase utama).

---

## 16. Cross-Cutting Concerns

### 16.1 Design Tokens (no change)
- OKLCH cyan-teal accent + Plus Jakarta + Sora (sudah)
- Spacing, radius, motion — keep

### 16.2 Anti-Pattern Audit (looks-expensive 8 rules)
Setiap phase wajib cek:

| # | Anti-pattern | Cek di landing |
|---|---|---|
| 1 | Bullet budget (max 5) | USP hero = 5 ✓, section bullets ≤ 3 |
| 2 | Eyebrow pill (max 1) | Hero 1 ✓, FAQ jangan ada eyebrow |
| 3 | Card chrome (max 2 default) | Magic Moment + RealityCheck = 2 ✓, FAQ accordion bukan card |
| 4 | 3-tier pricing generik | Tidak ada ✓, pakai table |
| 5 | 4-col stat strip | Replace dgn inline-stat + icon ✓ |
| 6 | No imagery | Hero mockup ✓, blog images real ✓ |
| 7 | Container identik | Minimal 3 pola: prose, ledger, mockup ✓ |
| 8 | Inter default | Plus Jakarta + Sora ✓ |

### 16.3 Performance Budget
- Initial JS: < 50KB shared + lazy islands
- CSS: critical inline < 4KB, shared external
- LCP mobile < 2.5s
- INP < 200ms
- CLS < 0.1
- Lighthouse mobile ≥ 90

### 16.4 Retention Loop (Goal: Repeat Visit)
1. **Newsletter** — weekly tips + promo → return visit
2. **OrderSimulator** — share-able "harga order kamu" → social proof + conversion (lebih universal dari income calc, berguna untuk buyer & reseller)
3. **Blog fresh content** — SEO + bookmark
4. **Sticky CTA** — convert on second visit (kalau belum daftar)
5. **Testimoni social proof** — trust over time
6. **Magic Moment visual** — memorable, share-able
7. **Pinterest auto-pin** — visual discovery di platform lain
8. **Telegram channel** — push notification untuk return visit

### 16.5 Accessibility (WCAG AA)
- Heading hierarchy h1 → h2 → h3
- Form labels (newsletter, search)
- Focus-visible ring 2px cyan
- Reduced-motion respected
- Touch target ≥ 48×48 mobile
- Skip link "Skip to main content"
- aria-label icon-only buttons
- Color contrast AA 4.5:1

---

## 17. Verifikasi Cross-Phase (AGENTS.md §7)

Setiap phase **WAJIB** lulus sebelum bilang selesai:

1. ✅ `pnpm --filter landing lint` — 0 error
3. ✅ `pnpm --filter landing check` (`astro check`) — 0 error
4. ✅ `pnpm --filter landing build` — sukses, bundle < target
5. ✅ Manual test `pnpm --filter landing dev`:
   - Desktop 1440×1000 — scan semua section dengan Playwright
   - Mobile 390×844 — viewport emulation, dock + StickyCTA verified
   - Reduced-motion — toggle di browser DevTools
   - Slow network — throttling 3G
6. ✅ Lighthouse mobile ≥ 90 di `/`, `/beli-followers-instagram`, `/blog/apa-itu-smm-panel`
7. ✅ A11y audit (axe-core via Playwright)
8. ✅ Screenshot before/after di `docs/audit/landing/{desktop,mobile}/`
9. ✅ SEO verify: meta + schema + sitemap + robots + llms.txt
10. ✅ Update checklist di file ini (centang tiap selesai)
11. ✅ Commit message format: `feat(L{N}): {item} — {deskripsi}`
12. ✅ **Tunggu approval user** sebelum lanjut phase berikutnya

---

## 18. Tracking Checklist

### L1 — Hero Fix + Mockup Polish [ ]
- [ ] H1 restructure, no wrap jelek
- [ ] Eyebrow dynamic count
- [ ] HeroMockup: toast notif, mini-chart, floating cards, status variance
- [ ] Saldo delta animation
- [ ] A11y verified, reduced-motion OK
- [ ] Lint + astro check pass
- [ ] Screenshot before/after saved
- [ ] Commit: `feat(L1): hero copy fix + mockup polish`

### L2 — Section Reorder + Content Gap [ ]
- [ ] FAQ before FinalCTA (section order verified)
- [ ] Trust band dengan 4 icon + count-up
- [ ] Pain section 4 scenarios + visual chip
- [ ] RealityCheck slider interaktif works
- [ ] Lint + astro check pass
- [ ] Commit: `feat(L2): section reorder + trust icon + RealityCheck`

### L3 — Sticky CTA + Conversion [ ]
- [ ] Sticky CTA muncul scroll > 30%, hide di FAQ/FinalCTA
- [ ] Mid-page CTA di pricing + testi
- [ ] WA pulse motion
- [ ] A11y verified
- [ ] Commit: `feat(L3): sticky CTA + mid-page CTA + WA polish`

### L4 — Magic Moment Visual [ ]
- [ ] Terminal mockup typing animation jalan
- [ ] Loop tiap 8s, pause on hover
- [ ] Copy panel dengan 3 bullet
- [ ] A11y: aria-label, success announce
- [ ] Commit: `feat(L4): magic moment terminal mockup`

### L5 — Mobile Floating Premium Dock (paritas BottomNav) [ ]
- [ ] Glass pakai class `glass` token (bukan literal `bg-white/75`)
- [ ] `dock-pop` spring bounce 420ms cubic-bezier(.34,1.56,.64,1) saat item active
- [ ] Tap feedback `active:scale-[0.96]` + haptic(10)
- [ ] Badge support built-in (item.badge + 99+ truncate)
- [ ] View transition `view-transition-name: floating-dock` (cross-page hold position)
- [ ] 5 items: Beranda, Layanan, Blog, Reseller, CTA Daftar
- [ ] CTA item styling distinct (filled accent vs ghost tabs)
- [ ] Reduced-motion respected (no spring, no entrance)
- [ ] A11y: focus-visible ring + aria-current + aria-label dinamis + badge sr-only
- [ ] Tap target ≥ 48×52px + safe-area-inset-bottom
- [ ] A/B test plan (3+CTA lama vs 5 terpadu baru)
- [ ] Lighthouse mobile ≥ 90 (bundle delta < +5KB gzipped)
- [ ] Visual regression test (per-tab screenshot 390×844 + 768×1024)
- [ ] Lint + astro check pass
- [ ] Commit: `feat(L5): floating premium dock paritas BottomNav`

### L6 — Animation Audit (13/13) [ ]
- [ ] Ticker strip jalan + pause on hover/tap
- [ ] FAQ chevron rotate
- [ ] Bento chart line draw
- [ ] WA pulse
- [ ] Blog reading progress + next dock
- [ ] SVG check draw
- [ ] Commit: `feat(L6): activate all 13 animations spec`

### L7 — FAQ + Footer Retention [ ]
- [ ] FAQ featured top 2 + search + bottom CTA
- [ ] Newsletter signup works
- [ ] OrderSimulator `Mode Reseller` toggle (off → on, margin chip + secondary CTA muncul)
- [ ] OrderSimulator breakdown `harga/1k × jumlah` ditambahkan
- [ ] OrderSimulator analytics event `mode_reseller_on` + `reseller_cta_click` tracked
- [ ] Recent articles 3 latest
- [ ] Commit: `feat(L7): FAQ variance + footer retention`

### L8 — Blog Integration [ ]
- [ ] Blog index featured + filter
- [ ] Single: reading progress + next dock + TOC + related + share + newsletter
- [ ] Internal linking strengthened
- [ ] Commit: `feat(L8): blog integration + internal linking`

### L9 — Money Pages SEO [ ]
- [ ] 10 money page H1 dengan primary keyword
- [ ] Schema.org lengkap
- [ ] Internal linking
- [ ] Lighthouse SEO 100
- [ ] Commit: `feat(L9): money pages SEO optimization`

### L10 — Performance + CWV [ ]
- [ ] Lighthouse mobile ≥ 90
- [ ] LCP < 2.5s, INP < 200ms, CLS < 0.1
- [ ] Image optimization (astro:assets)
- [ ] Cache-control tuned
- [ ] Commit: `feat(L10): performance + Core Web Vitals optimization`

### SEO Cross-cutting [ ]
- [ ] Google Search Console verified + sitemap submit
- [ ] Bing Webmaster Tools setup
- [ ] robots.txt AI bot allowlist
- [ ] llms-full.txt generated
- [ ] FAQPage + HowTo + Product + BreadcrumbList schema
- [ ] Pinterest auto-pin setup
- [ ] Medium repost (manual/cron)
- [ ] Telegram channel auto-share
- [ ] News sitemap + Publisher Center
- [ ] Internal linking audit
- [ ] Keyword density audit
- [ ] 5-10 new money pages
- [ ] Commit: `docs(seo): full SEO system activate`

---

## 19. Haloka.id Reference vs Socio.id — Gap Analysis

| Aspek | Haloka (Reference) | Socio.id (Current) | Socio.id (Target L1-L10) |
|---|---|---|---|
| **Hero display font** | Sora bold ~80px | Sora bold ~64px | Same + no wrap |
| **Eyebrow pill** | "🟢 SOLUSI BISNIS OTOMATIS 2026" | "🟢 8.270 LAYANAN AKTIF · SEMUA PLATFORM" | Dynamic count + "X order diproses" |
| **Hero mockup** | WhatsApp chat typing live | Dashboard mockup live (lebih kaya) | + Toast notif + mini-chart + floating cards |
| **Trust strip** | 4 icon statis (lock/lightning/shield/brain) | Inline naratif | Inline + icon + count-up |
| **Pain section** | 3 illustrated scenarios (chat/gaji/toko tutup) | 4 ledger rows generik | 4 ledger rows + visual chip |
| **Reality Check** | Interactive slider "Volume Chat Harian" | Tidak ada | Tambah — bandingin manual vs socio |
| **Brain Engine** | Terminal mockup "Uploading SOP" | Tidak ada | Tambah Magic Moment terminal |
| **Sticky CTA** | "Belum yakin? Coba fitur juragan 7 hari" | Tidak ada | Tambah dengan hide logic |
| **Footer newsletter** | Tidak ada | Tidak ada | Tambah signup |
| **FAQ variance** | Simple accordion | Highlight featured top 2 | Tambah featured + search |
| **OrderSimulator** | Tidak ada | Tidak ada | Tambah — cek harga order interaktif untuk buyer & reseller |
| **Animation count** | ~8 (chat, slider, etc) | ~7 (mockup, reveal, hero-seq, progress) | 13/13 spec aktif |
| **Retention loop** | CTA + email capture | Tidak ada | Newsletter + OrderSimulator + Blog + Telegram |
| **Money pages SEO** | Tidak ada money page | 10 money pages | +5 new + schema + internal link |
| **Internal linking** | Simple | Simple | Strong (blog + money cluster) |
| **Off-platform SEO** | Bing/Medium | Bing + GSC belum | Pinterest auto-pin + Medium + Telegram + GSC |

**Summary**: Haloka punya emotional design bagus tapi sederhana (1 produk, 1 use case). Socio.id punya scope lebih kaya (8.270 layanan × 6 platform × multi-tier) — harus pakai pattern haloka + scale content richness + SEO system untuk repeat visit. **Catatan**: Income Calculator sebelumnya diganti dengan OrderSimulator karena terlalu reseller-only (narrow), OrderSimulator lebih conversion-focused untuk kedua persona (buyer + reseller).

---

## 20. Reference

- `docs/DESIGN.md` — palette OKLCH, type, motion contract
- `docs/WIREFRAME_SOCIOID.md` — **wireframe design guideline komprehensif** (tokens + per-section contract + mobile dock detail + micro-interaction library + a11y rules + brand do/don't) — 998 baris
- `docs/MOBILE_UX_GUIDE.md` — motion spec + animation library
- `docs/LANDING_DESIGN_PLAN.md` — comprehensive design spec (760 baris, 13 animasi)
- `docs/LANDING_AUDIT.md` — section audit + broken links
- `docs/LANDING_DEPLOY.md` — Cloudflare Pages runbook
- `docs/LANDING_SEO_SYSTEM.md` — SEO architecture (171 baris)
- `docs/SEO-KEYWORD-RESEARCH.md` — keyword expansion tool
- `docs/SEO_PIPELINE_PROGRESS.md` — SEO pipeline status
- `docs/TRAFFIC-BOOST-STRATEGY-2026-08-27.md` — off-platform distribution
- `docs/SMM_STANDOUT_RESEARCH.md` — kompetitor research
- `docs/RESELLER_PAGE_SPEC.md` — reseller page spec
- `landing/src/pages/index.astro` — homepage
- `landing/src/components/HeroMockup.svelte` — live dashboard mockup (323 LOC)
- `landing/src/components/OrderSimulator.svelte` — coba dulu bayar belakang (207 LOC)
- `landing/src/components/FloatingTabDock.svelte` — mobile floating premium dock (paritas BottomNav app)
- `landing/src/components/StickyCTA.svelte` — sticky CTA bar
- `landing/src/styles/global.css` — motion utilities + .reveal
- `https://haloka.id` — visual reference (captured `docs/audit/landing/haloka/`)

---

**Status**: 📋 Plan siap ditinjau user. Tunggu approval per-phase sebelum eksekusi. Update checklist tiap commit. **Goal**: socio.id jadi SMM panel dengan experience terbaik — repeat visit melalui newsletter, content, retention loop.
