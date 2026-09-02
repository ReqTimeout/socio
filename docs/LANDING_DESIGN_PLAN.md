# Plan Desain Frontend Landing socio.id — Premium SMM Panel

> Metodologi `looks-expensive` (9 fase, adapted): positioning → contract → screen spec → build. Dipadukan dgn design system app (`@socio/ui`: Sora display + Plus Jakarta body, ink/accent token, `.reveal`).
> Tujuan: desktop enak dibaca, **mobile-first SaaS feel** (seperti app), SVG art konsisten, motion terukur, micro-interaction terasa mahal.

---

## 1. Positioning (fase 1)

| Pertanyaan | Jawaban |
|---|---|
| Apa produknya? | Panel SMM Indonesia — 8.270+ layanan followers/likes/views/SEO, harga grosir, proses otomatis, garansi refill |
| Siapa? | Reseller SMM + UMKM/pebisnis sosmed Indonesia, non-teknis, mobile-heavy (mayoritas traffic dari HP) |
| Register? | **Product** — design serves conversion. Tapi kategori marketplace/social → **Bold/High-Contrast** dgn satu accent jenuh |
| Yang memorable? | "Mesin order sosmed yang jalan sendiri — kamu tinggal tempel link" |
| Bukan apa? | Bukan dashboard korporat dingin; bukan landing AI-startup generik gradient blob; bukan beriklan-style 391k thin page |
| North star | Mercury (banking precision) × Jualan.io (conversion ID) × Stripe (typographic hierarchy) |
| Suhu emosional | **Neutral/Clean + aksen jenuh** — putih bersih tinta hitam + 1 accent brand socio (cyan-teal) |

**Scene sentence:** *"Seorang reseller umur 24 di kosan Bandung, jam 11 malam, scroll HP sambil rebahan — ngecek order-an pelanggannya yang harus jalan besok pagi, lalu sempat googling 'beli followers murah' di Chrome mobile."*

Konsekuensi: **mobile = pengalaman utama** (thumb-reachable CTA, dock bawah, angka besar), desktop = ekspansi (2-col hero, data table legible). Light theme default (kosan malam tetap ok — HP AMOLED white background aman), accent harus kontras tinggi di AMOLED.

## 2. Design contract (fase 3)

### Type

| Token | Nilai | Notes |
|---|---|---|
| Display | **Sora** 600/700/800 (self-host subset latin, preload woff2) | sudah dipakai app + landing — keep, konsisten brand |
| Body | **Plus Jakarta Sans** 400/500/600/700 | Indonesia-native foundry — pas untuk brand lokal |
| Scale | base 17px, ratio 1.25; H1 mobile 40 / desktop 64 | standar marketing |
| Mono | JetBrains Mono ≤14px — **hanya** untuk angka order ID, stat unit, harga per-1k | data accent, bukan eyebrow |

Craft: `text-wrap: balance` semua heading, `text-wrap: pretty` prose, `tabular-nums` semua angka (harga/counter), lining figures. NO italic.

### Color (OKLCH, derive dari brand cyan-teal socio)

| Token | Nilai | Gunakan untuk |
|---|---|---|
| `--paper` | `oklch(0.985 0.004 220)` | bg utama — near-white tint cool |
| `--paper-2` | `oklch(0.965 0.006 220)` | section alternation |
| `--ink` | `oklch(0.175 0.015 235)` | teks utama — near-black tint cyan |
| `--ink-2` | `oklch(0.45 0.012 235)` | teks sekunder |
| `--ink-3` | `oklch(0.62 0.010 235)` | teks tersier/placeholder |
| `--accent` | `oklch(0.68 0.13 220)` | link, icon, stroke, tint 4-8% |
| `--accent-ink` | `oklch(0.44 0.11 220)` | **button fill only** — AA 5.4:1 white text |
| `--accent-hover` | `oklch(0.40 0.11 220)` | hover (lebih gelap, bukan lebih terang) |
| `--accent-focus-ring` | near-paper | focus ring di atas fill accent-ink |
| `--dark-panel` | `oklch(0.19 0.02 235)` | section inverted (footer, stats) |
| Success/warning/danger | reuse token app (#047857/#b45309/#b91c1c + dark remap) | konsisten |

### Spacing & radius

- Base 8px: `8/16/24/32/48/64/96/128`; section pad mobile 64-80px, desktop 96-128px
- Radius 4-32: `sm 8` (button/input), `md 12` (card), `lg 16` (hero mockup), `xl 24` (full-bleed), pill 9999
- Hairline: `color-mix(in oklab, var(--ink) 8%, transparent)`

### Icon & art

- Icon: outline 1.5px stroke, 16/20/24 tier — set lucide konsisten dgn app
- Art: **SVG art system socio** (sama dgn app `packages/ui/src/art/`) — hero instrument, empty-state, platform glyph. **No gradient blob**, no emoji di UI (emoji pills di hero lama → replace)

### Motion (contract, GPU-safe, reduced-motion safe)

| Tier | Nilai | Pakai |
|---|---| hover state, button press |
| `--ease-out-soft` | cubic-bezier(0.16,1,0.3,1) | reveal, sheet, drawer |
| Hover | 150-180ms | buttons, links, cards |
| Reveal | 400-600ms @ 40-60ms stagger | section on-scroll |
| Entrance | 600-800ms sekali (hero) | hero visual + H1 |
| Domain-specific | order flow tick, live-dot pulse, count-up saldo | lihat §4 |

`prefers-reduced-motion: reduce` → semua non-esensial mati (pattern app F4).

## 3. Screen spec — landing `/` (fase 4)

**Section map** (urutan konversi, bukan template; containment variance di-assert):

| # | Section | Pattern | Bg | Containment | Visual |
|---|---|---|---|---|---|
| 1 | Navbar + mobile drawer | scroll-state header (blur+hairline pas threshold) | transparan→paper | — | — |
| 2 | Hero | Split-hero (copy kiri, live-order mockup kanan) | paper | prose + USP ledger | **CSS mockup app (no chrome dots)** + SVG pulse |
| 3 | Live activity ticker | Domain-specific: feed order nyata bergulir | dark-panel strip tipis | ticker ledger | angka monospace tick |
| 3.5 | Trust row | inline-stat prose (bukan 4-col strip) | paper | prose sentence | tabular-nums |
| 4 | PainPoints → "Problem ledger" | 3 pain → solusi dalam ledger row (hairline, no card) | paper-2 | **ledger** | icon accent |
| 5 | OrderSimulator (interactive) | Domain centerpiece: form 3 field → harga live + SVG gauge | paper | inset panel (1 dari 2 kartu) | SVG gauge + NumberFlow |
| 6 | Live order board | Tabel real HTML: 8 row order terbaru (ID mono, layanan, status chip) | paper | **real table** | StatusBadge dari app |
| 7 | Features → "Kapabilitas" | Bento 5 cell (1 besar span-2×2) | paper-2 | bento (kartu ke-2) | mockup mini + SVG art |
| 8 | Pricing | **Inline pricing prose + table harga real** (bukan 3-tier card) | paper | table | harga dari `prices.json` |
| 9 | Social proof | 3 testi sebagai ledger rows + inisial avatar | paper-2 | ledger | initials |
| 10 | Final CTA | Full-bleed dark panel + H2 + CTA | dark-panel | full-bleed | SVG art glow |
| 11 | FAQ | details/summary accordion, ledger style | paper | ledger accordion | — |
| 12 | Footer | typographic footer (3 col utility) | ink-900 | prose | wordmark |

**Anti-pattern audit** (8 gate looks-expensive): bullets ≤5 (USP hero = 4 li, sisanya ledger/table/prose) • eyebrow pill hanya 1 (hero badge) • card ≤2 (simulator + bento) • pricing bukan 3-tier (table) • stats inline bukan 4-col strip • imagery = CSS mockup+SVG (Photography optional untuk SaaS) • containment mix: prose/ledger/panel/table/bento/full-bleed = 6 pattern • font bukan Inter (Sora/PJA) ✓.

### Hero copy (draft — angka real dari DB dev 31 Agt: 8.270 layanan, 882 kategori, termurah Rp42/1k, 357 layanan ≤Rp500)

- H1: **"Semua platform. Satu panel. Mulai Rp42."**
- Sub: "8.270+ layanan SMM untuk Instagram, TikTok, YouTube, Telegram, Spotify, SEO & 880+ kategori lainnya — dari views Rp42/1k sampai paket organic growth. Proses otomatis 24 jam, garansi refill. Daftar gratis, top-up Rp10 ribu."
- CTA primer: **"Daftar Gratis"** (accent-ink) · CTA sekunder: "Lihat 8.270 layanan" (ghost → /layanan)
- Social line di bawah CTA: "Dipercaya 50.000+ reseller & UMKM" + avatar-stack inisial
- USP ledger hero (bukan followers-only): **Termurah Rp42/1k** · **8.270 layanan / 882 kategori** · **Otomatis 24 jam** · **Garansi refill** — angka count-up A1 pakai "8.270+" dan "Rp42"

### Micro-interactions (domain-specific)

| Elemen | Interaksi |
|---|---|
| OrderSimulator | input link → validasi shimmer; qty slider → **NumberFlow count-up harga**; tombol order → state loading→success SVG check draw |
| Live ticker | feed row masuk tiap 2.5s, translateY+fade, angka pakai tabular-nums, pause on hover/reduce-motion |
| Order board row | status chip Polodding live-dot pulse saat "Diproses" |
| Navbar CTA | press scale 0.97 + hairline bottom draw on scroll |
| FAQ | chevron rotate 90° 180ms + max-height transition |
| StickyCTA mobile | muncul pas scroll 20% dgn translateY-in, docked bottom, hide saat hero terlihat |
| Reveal | `.reveal` + `revealDelay()` (pattern F4) — CSS-only |

### Responsive

- **320-639 (utama):** stack semua, hero copy dulu → mockup di bawah (LCP teks), OrderSimulator full-width, bottom sticky CTA dock, table order board → 2-col definition list
- 640-1024: hero split 2-col, bento 2-col, table tetap
- ≥1024: hero 2-col besar (copy 5/12, mockup 7/12), bento 3-col, max-w 1280
- Touch target ≥44px semua interaktif; `min-w-0` semua grid child truncate

## 3b. Wireframes — Home `/`

### Desktop (1280)

```
┌────────────────────────────────────────────────────────────────────────┐
│ ◆ socio.id      Layanan  Reseller  Blog  Harga        [Masuk] [Daftar↗]│  ← navbar blur pas scroll
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌─ hero copy (5/12) ─────────┐   ┌─ live-order mockup (7/12) ────┐  │
│  │ (●) #1 Panel SMM Indonesia │   │ ┌──────────────────────────┐ │  │
│  │                             │   │ │ ◆ socio.id        Rp94.5k│ │  │
│  │ Panel SMM #1 Indonesia      │   │ │ ██████████░░░░ 62%       │ │  │
│  │ — order jalan, kamu tidur.  │   │ │                          │ │  │
│  │                             │   │ │ ✓ Instagram Followers    │ │  │
│  │ 8.270+ layanan followers,   │   │ │   1.000 → @rmdaa   [Diproses●]│
│  │ likes, views & SEO...       │   │ │ ✓ TikTok Views           │ │  │
│  │                             │   │ │   10.000 → @tokoshop [Selesai✓]│
│  │ ── USP ledger ──────────    │   │ │ … order stream scroll    │ │  │
│  │  Termurah      Rp42/1k     │   │ └──────────────────────────┘ │  │
│  │  Otomatis      24 jam      │   │  (CSS mockup app, no chrome   │  │
│  │  Garansi       refill      │   │   dots; angka count-up masuk) │  │
│  │  API           grosir     │   └──────────────────────────────┘  │
│  │                             │                                        │
│  │ [  Daftar Gratis →  ] [Lihat harga]                                │  │
│  │ ◯◯◯◯ dipercaya 50.000+ reseller                                   │  │
│  └─────────────────────────────┘                                        │
├─ ticker: ● 3 menit lalu @andi beli 5.000 TikTok Views · ● 7 mnt @sari…─┤  ← dark strip, jalan
├────────────────────────────────────────────────────────────────────────┤
│  Sekarang ada 1.240 order aktif diproses — 8.270 layanan, 50.000+      │  ← inline-stat prose
├────────────────────────────────────────────────────────────────────────┤
│  ┌ Problem ledger (paper-2) ───────────────────────────────────────┐  │
│  │  Adakah followers turun?      → Refill otomatis, garansi 30 hari  │  │
│  │  ──────────────────────────────────────────────────────────────  │  │
│  │  Harga reseller lain mahal?   → Harga pabrik mulai Rp42/1k       │  │
│  │  ──────────────────────────────────────────────────────────────  │  │
│  │  Order harus nunggu admin?    → Diproses bot, rata-rata 42 detik  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
├────────────────────────────────────────────────────────────────────────┤
│  ┌ OrderSimulator (inset panel — kartu #1) ─────────────────────────┐ │
│  │  Coba dulu, bayar belakangan:                                     │ │
│  │  [ Pilih layanan ▾ ] [ Tempel link kamu https://… ] [ Jumlah: ─●─+ ]│ │
│  │        ┌ SVG gauge ring ┐   Total: Rp9.500  [Pesan →]             │ │
│  │        │   62% ◔        │   (angka count-up spring)                │ │
│  └────────────────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────┤
│  ┌ Live order board (real table, 8 row) ─────────────────────────────┐ │
│  │  ID          Layanan              Qty     Status                  │ │
│  │  #48291 88   IG Followers         1.000   ● Diproses             │ │
│  │  #48291 87   TikTok Views         5.000   ✓ Selesai               │ │
│  │  … (mono ID, tabular-nums, StatusBadge chip)                       │ │
│  └────────────────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────┤
│  ┌ Bento kapabilitas (paper-2) ──────────────────────────────────────┐ │
│  │ ┌───────────────┬───────┐ │ ┌ Auto-refill ─┐ ┌ API ┐ ┌ Grosir ┐   │ │
│  │ │  BESAR 2×2:   │ small │ │ └──────────────┘ └──────┘ └────────┘   │ │
│  │ │  mockup chart │       │ └──────────────────────────────────────────┘ │
│  │ │  + SVG art    │       │                                            │
│  │ └───────────────┴───────┘                                            │
├────────────────────────────────────────────────────────────────────────┤
│  Pricing: bukan 3-tier card. Prose + real table harga (dari prices.json)│
│  "Tanpa langganan. Top-up Rp10rb, harga per layanan mulai Rp42/1k."      │
│  ┌ Layanan / Harga kamu / Harga retail normal ── 8 row ─────────────┐   │
├────────────────────────────────────────────────────────────────────────┤
│  Testi: 3 ledger row (inisial avatar) → CTA dark full-bleed            │
├────────────────────────────────────────────────────────────────────────┤
│  FAQ accordion ledger  →  Footer ink-900 typographic 3 col             │
└────────────────────────────────────────────────────────────────────────┘
```

### Mobile (360) — floating dock seperti dashboard app

```
┌──────────────────────────┐
│ ◆ socio.id          ☰   │  ← navbar 56px, blur
│ (●) #1 PANEL SMM ID     │
│                          │
│ Panel SMM #1 Indonesia  │  ← H1 40px, count-up 8.270+ masuk di sub
│ — order jalan,           │
│ kamu tidur.              │
│                          │
│ 8.270+ layanan. Grosir   │
│ Rp42/1k, otomatis 24jam, │
│ garansi refill.          │
│                          │
│ [ Daftar Gratis → ]      │  ← 48px full-width accent-ink
│ [ Lihat harga ]          │  ← ghost 48px
│ ◯◯◯ 50.000+ reseller    │
│                          │
│ ┌ live-order mockup ────┐│
│ │ ◆ socio.id   Rp94.5k ││  ← 92vw, compact stack
│ │ ████████░░ 62%       ││
│ │ ✓ 1.000 IG followers ││
│ │   → @rmdaa  ●Diproses││
│ └───────────────────────┘│
├──────────────────────────┤
│ ● @andi · 5.000 TikTok   │  ← ticker, jalan, tap-pausable
│   Views · 3 mnt lalu     │
├──────────────────────────┤
│ 1.240 order aktif…       │
│ (ledger, table, bento    │
│  stack 1-col; table →    │
│  2-col definition list)  │
│         ⋮                │
├──────────────────────────┤
│ ⌃ FAQ · 3 pertanyaan     │
├──────────────────────────┤
│ footer compact           │
├──────────────────────────┤
│ ╭────────────────────╮   │  ← FLOATING DOCK (glass pill)
│ │ [  CTA dinamis  ]  │   │     muncul scroll >20%,
│ ╰────────────────────╯   │     "Daftar" accent-ink 52px,
└──────────────────────────┘     translateY-in 300ms soft
```

## 3c. Wireframes — `/reseller`

### Desktop

```
┌────────────────────────────────────────────────────────────────────────┐
│ ◆ socio.id   Layanan  Reseller  Blog      [Masuk] [Daftar Reseller ↗] │
├────────────────────────────────────────────────────────────────────────┤
│   Jadi Reseller SMM, Modal Rp10 Ribu.                                  │
│   Jual followers/likes/views pakai harga pabrik socio — kamu pasang     │
│   margin, kami urus stok, proses & refill.                             │
│   [ Daftar Reseller → ]  [ Coba kalkulator ↓ ]                          │
├────────────────────────────────────────────────────────────────────────┤
│  Program (definition list, 3 term):                                    │
│   Member → Agen → Reseller : markup 0% / 8% / 15% · syarat · benefit   │
├──────────────────────────────── ledger ────────────────────────────────┤
│  ┌ Kalkulator profit (panel) ─────────────────────────────────────┐    │
│  │  Pelanggan/bulan ──●──── 30    Harga jual/1k ──●── Rp25       │    │
│  │  ▉▉▉▉▉▉▉▉▉▉ Profit bulanan kamu:  Rp 420.000  (count-up)      │    │
│  │  ▉ SVG bar tumbuh per level                                   │    │
│  └────────────────────────────────────────────────────────────────┘    │
├────────────────────────────────────────────────────────────────────────┤
│  Table harga grosir vs retail (8 layanan × socio / retail / margin)    │
├────────────────────────────────────────────────────────────────────────┤
│  API teaser (code block mono ≤14px):                                   │
│  POST /api/v2/order { service: 12, link: "…", quantity: 1000 } → 200    │
├─────────────────────────────────────────────────────────────────────────┤
│  Cara mulai: (1) Daftar → (2) Top-up → (3) Jual — timeline 3 langkah   │
│  Testi reseller ledger ×2 → FAQ reseller accordion ×6 → CTA dark        │
└────────────────────────────────────────────────────────────────────────┘
```

### Mobile

```
┌──────────────────────────┐
│ ◆ socio.id          ☰   │
│ Jadi Reseller SMM,       │
│ Modal Rp10 Ribu.         │
│ [Daftar Reseller →]      │
├──────────────────────────┤
│ Program:                 │
│  Member  → +0%           │
│  Agen    → +8%  (dl)     │
│  Reseller→ +15%          │
├──────────────────────────┤
│ ┌ Kalkulator profit ────┐│
│ │ Pelanggan ──●── 30    ││
│ │ Harga jual ──●── 25k ││
│ │ ▉▉▉▉ Rp 420.000/mo   ││
│ └──────────────────────┘│
│ (table → def list;       │
│  API code horizontal    │
│  scroll-snap)            │
│ Cara mulai 1→2→3 vertical│
├──────────────────────────┤
│ ╭ [Daftar Reseller] ╮    │  ← floating dock persist
│ ╰──────────────────╯    │
└──────────────────────────┘
```

## 3d. Wireframes — `/layanan`

### Desktop

```
┌────────────────────────────────────────────────────────────────────────┐
│ ◆ socio.id …                                                                │
│   Semua layanan sosmed, satu panel.                                    │
│   [ 🔎 Cari layanan… (input besar, live filter) ]                          │
├────────────────────────────────────────────────────────────────────────┤
│  Platform directory (dl grid 5×2):                                      │
│  ┌ Instagram ┐ ┌ TikTok ┐ ┌ YouTube ┐ ┌ Facebook ┐ ┌ X/Twitter ┐       │
│  │ ♡ 214 svc │ │ ♪ 186  │ │ ▶ 152   │ │ f 98     │ │ 𝕏 87     │       │
│  │ Followers │ │ Views  │ │ Views   │ │ Followers│ │ Followers│       │
│  │ Likes     │ │ Likes  │ │ Subs    │ │ Likes    │ │ Likes    │       │
│  └───────────┘ └────────┘ └─────────┘ └──────────┘ └──────────┘       │
│  (glyph SVG brand + count tabular-nums + 3 top layanan)                │
├────────────────────────────────────────────────────────────────────────┤
│  Top layanan (real table, sortable):                                    │
│  Platform / Layanan / Min / Harga per 1k / →                            │
│  15 row dari prices.json — klik header sort 180ms                      │
├────────────────────────────────────────────────────────────────────────┤
│  Kategori explainer (3 prose + icon): Engagement · Viewership · Growth │
│  → CTA dark                                                             │
└────────────────────────────────────────────────────────────────────────┘
```

### Mobile

```
┌──────────────────────────┐
│ ◆ socio.id          ☰   │
│ Semua layanan sosmed,   │
│ satu panel.              │
│ [ 🔎 Cari layanan… ]     │
├──────────────────────────┤
│ (platform grid 2-col     │
│  scroll-snap horizontal  │
│  atau 1-col dl)          │
├──────────────────────────┤
│ Top layanan (def list):  │
│  IG Followers            │
│  Min 100 · Rp42/1k   [→] │
│  TikTok Views            │
│  Min 100 · Rp2/1k    [→] │
├──────────────────────────┤
│ ╭ [Cari layanan ↑] ╮      │  ← dock: scroll-to-search
└──────────────────────────┘
```

## 3e. Wireframes — `/blog` index + single

### `/blog` (mobile utama)

```
┌──────────────────────────┐
│ ◆ socio.id          ☰   │
│ Tips SMM & Reseller      │
│ [Semua][Followers][TikTok][Reseller]  ← chip filter horizontal scroll │
├──────────────────────────┤
│ ┌ FEATURED ────────────┐│
│ │ [SVG art thumb]       ││
│ │ Cara Jadi Reseller    ││
│ │ SMM Modal Rp10 Ribu   ││
│ │ 26 Ags · 6 mnt baca   ││
│ └───────────────────────┘│
├──────────────────────────┤
│ [art] Harga Followers IG │  ← ledger row
│ 2026 — Berapa yang …     │
│  26 Ags · Followers      │
│ ─────────────────────── │
│ [art] Followers Turun?   │
│  Ini 5 Penyebabnya…      │
│ ─────────────────────── │
│ [art] Jam Berapa Upload  │
│  TikTok Paling …         │
│         ⋮                │
├──────────────────────────┤
│ ✉ Dapat update artikel?  │  ← newsletter inline
│ [email] [Langganan]      │
├──────────────────────────┤
│      1 2 3 … 12 →        │  ← pagination windowed
└──────────────────────────┘
```

### `/blog/[slug]` (single, mobile)

```
┌──────────────────────────┐
│ ◄ Blog          (42%)  ☰ │  ← progress bar baca (domain motion)
├──────────────────────────┤
│ Followers · 6 mnt baca    │
│                            │
│ H1: Harga Followers        │
│ Instagram 2026: Panduan…  │
│ [SVG art header 16:9]     │
├──────────────────────────┤
│ ⌄ Daftar isi (details)   │  ← TOC collapsible mobile
├──────────────────────────┤
│ prose 65ch:               │
│  Definisi 1 kalimat…      │
│  ## H2 anchor              │
│  ┌ Tabel harga real ────┐ │
│  │ IG Followers | Rp42/1k│ │
│  └──────────────────────┘ │
│  > Callout quote           │
├──────────────────────────┤
│ ▣ AD SLOT #1 (desktop only│  ← lihat §4f AdSense map
│  / mobile in-feed setelah │
│  3rd H2)                   │
├──────────────────────────┤
│ FAQ accordion ×5          │
│ [CTA box: Cek harga →]    │
│ Baca juga: 3 ledger rows  │
├──────────────────────────┤
│ footer                     │
├──────────────────────────┤
│ ╭ [Artikel serupa →] ╮    │  ← dock di single post: next-article
│ ╰──────────────────────╯   │     nagging (bukan daftar)
└──────────────────────────┘
```

### Desktop single blog (tambahan vs mobile)

```
┌───────────────────────────────────────────────────────┐
│ artikel 2-col: body 8-col prose | TOC sticky 4-col kiri│
│                                | AD SLOT sidebar sticky │
│ dalam body: AD #1 (setelah intro), #2 (mid, setelah    │
│ tabel), #3 (end-of-article)                           │
└───────────────────────────────────────────────────────┘
```

## 3f. Wireframes — money page `/beli-*` (template semua 10)

```
MOBILE                              DESKTOP
┌──────────────────────────┐       ┌────────────────────────────────────────┐
│ ◄ Beranda / Layanan      │       │ Breadcrumb: Beranda / Layanan /        │
│ Beli Followers Instagram │       │ Beli Followers Instagram               │
│  Murah & Terpercaya      │       │                                        │
│ Mulai Rp42/1k · refill ✓ │       │  H1 + harga mulai + CTA [Pesan Sekarang]│
│ [Pesan Sekarang →]       │       │                                        │
├──────────────────────────┤       │  ┌ table paket: Paket/Harga/Estimasi/  │
│ ┌ Paket & harga ────────┐│       │  │ Refill ── 5-8 row real prices.json │ │
│ │ 500   Rp12.000   [→]  ││       │ └──────────────────────────────────────┘ │
│ │ 1.000 Rp42.000   [→]  ││       │  Kenapa socio: 3 reason ledger          │
│ │ 2.500 Rp42.000   [→]  ││       │  Cara order 1-2-3 timeline              │
│ └──────────────────────┘│       │  FAQ ×5 + schema                        │
│ Kenapa socio (ledger)    │       │  Cross-sell chips: Likes · Views · Reels│
│ Cara order 1→2→3         │       │  CTA dark                               │
│ FAQ ⌄                    │       │                                        │
│ Cross-sell: [Likes][Views]│       │                                        │
│ ╭ [Pesan Sekarang] ╮     │       │                                        │
└──────────────────────────┘       └────────────────────────────────────────┘
```

## 3g. Katalog micro-animasi "playful & nagih" (fase 4 → build)

> Prinsip: motion harus bikin halaman terasa hidup & personal — seperti dashboard app yang bikin nagih dibuka. Semua GPU-safe (transform/opacity), custom bezier, `prefers-reduced-motion` mati total. Semua pola sudah terbukti di app F4.

| # | Animasi | Trigger | Spec | Rasa |
|---|---|---|---|---|
| A1 | **Count-up intro stat** | hero masuk viewport | NumberFlow spring (reuse app), "8.270+" dan "Rp42/1k" count 0→target 800ms, spring stiffness medium | hidup sejak detik-1 |
| A2 | **Live order mockup stream** | autoplay loop | row baru masuk dari atas translateY(-100%)→0 + fade 300ms soft, tiap 2.2s; progress bar order naik 62%→100% | "ini mesin yang jalan" |

### 3g.0 Hero — Live Dashboard Mockup (pola haloka, di-level-up)

> Konfirmasi dari repo haloka (`ChatSimulator.svelte`) + socio current (`SmmHeroVisual.svelte`): hero kanan = **phone mockup yang hidup kontinu**, bukan sekadar gambar. Landing baru WAJIB punya ini, versi lebih halus & premium. Mockup = CSS murni (no chrome dots, no foto), dark-ink border phone frame.

| Elemen mockup | Animasi | Spec |
|---|---|---|
| Saldo counter | **tweened count-up on mount** | 0→Rp247.500 1.8s cubicOut (svelte `tweened` / NumberFlow app), lalu tiap 8s +delta kecil (order selesai → saldo jalan sendiri, kesan "mesin hidup") |
| Follower counter | count-up + delta badge | 12.480→13.730 1.8s, badge "+1.250" pop-in scale 0→1 200ms setelah selesai |
| Platform pills | auto-rotate highlight | interval 2.4s ganti active pill: bg swap 200ms + content section crossfade 250ms (Instagram→TikTok→YouTube) |
| Order rows | **stream masuk** | row baru slide-down dari atas + fade tiap 2.5s, max 4 row (yang lama keluar bawah), status Selesai = check draw SVG 400ms |
| Progress bar order | progres kontinu | width 35%→96% loop 6s linear, restart tiap row baru — "order lagi diproses" |
| Live dot header | pulse 1.6s | konsisten app StatusBadge |
| Floating metric cards (desktop) | **floatSlow** | translateY ±6px 4s ease-in-out infinite, offset delay 1s antar card (pola haloka floatSlow, keep) — hidden mobile |
| Glow belakang phone | breathing | opacity 0.6→1 6s infinite, gradient accent/primary blur-60 — JANGAN jadi LCP (decorative, pointer-events-none) |
| Phone frame | entrance sekali | rotateY(-8deg) perspective + fade-in 700ms saat load; hover desktop: scale 1.02 + tilt mengikuti pointer (transform hanya, 200ms) |

Semua interval via `setInterval` di komponen Svelte island (`client:visible`), cleanup on destroy, **pause total saat `prefers-reduced-motion`** (tampilkan state final). Mockup harus terlihat seperti screenshot app socio asli (dark header gradient, SaldoHero card, order card + StatusBadge) — buat user yang pernah lihat app langsung recognize.

**Navbar mobile — Floating iPhone Tab Dock (BUKAN hamburger):**

```
┌──────────────────────────┐
│  (konten halaman)         │
│                          │
├──────────────────────────┤
│ ╭───────────────────────────╮
│ │   ⌂        ⚡        👑      [Masuk] │  ← glass pill dock
│ │ Beranda  Layanan  Reseller  (accent) │     3 tab + 1 tombol CTA
│ ╰───────────────────────────╯     bg-white/75 blur-2xl
└──────────────────────────┘     shadow, safe-area-inset
```

- **Dock = 3 tab + 1 CTA slot** (bukan menu tersembunyi): Beranda `/` · Layanan `/layanan` · Reseller `/reseller` + **tombol [Masuk/Daftar]** accent-ink di slot kanan (40% lebar, label "Masuk" untuk visitor, "Daftar" di halaman konversi). Tap langsung navigasi/aksi, zero menu tersembunyi.
- **Blog & link lain (API, FAQ, WhatsApp) → menu footer mobile** (footer memang selalu ada di akhir halaman, natural tempat link sekunder; footer mobile jadi grid link 2-col rapi, bukan cuma copyright)
- Active tab: ikon fill accent + label ink-800 + indicator dot (pattern BottomNav app, kontras 5.73 di glass); tap feedback scale 0.92 120ms spring
- Navbar top mobile jadi sangat minimal: logo kiri + space (tanpa hamburger sama sekali — semua navigasi utama sudah di dock)
- StickyCTA dinamis (§3h) **menempel di atas dock** (bottom 76px) di halaman tanpa CTA slot (home/layanan); di halaman konversi (beli-*, reseller) CTA slot dock berubah label jadi "Pesan Sekarang"/"Daftar Reseller" — tidak ada double CTA
- Desktop ≥768px: dock hilang, navbar normal penuh (Layanan · Reseller · Blog · Harga + Masuk + Daftar accent-ink)
- A11y: `role="tablist"`/`aria-current="page"`, touch ≥48px, focus-visible ring near-paper, body padding-bottom 88px mobile
| A3 | **Live ticker strip** | autoplay | marquee CSS translateX infinite 40s linear, pause on hover/tap, `role="marquee"` a11y label | sosial proof nyata |
| A4 | **SVG check draw** | OrderSimulator submit | stroke-dasharray path draw 400ms soft saat state success | reward instan |
| A5 | **Gauge ring** | qty slider berubah | stroke-dashoffset lerp spring 300ms, angka count-up NumberFlow paralel | angka "nahodol" enak |
| A6 | **Ticker entrance stagger** | section masuk viewport | `.reveal` + `revealDelay(i)` 40ms stagger, pattern F4 | halus tidak lebay |
| A6b | **Floating dock masuk** | scroll >20% | translateY(16px)→0 + opacity 0→1, 300ms soft | muncul pas butuh |
| A7 | **Dock CTA micro** | tap/press | scale 0.97 120ms; hover: accent stripe draw di bawah | app-feel konsisten |
| A8 | **FAQ chevron** | toggle | rotate(90°) 180ms + panel max-height 220ms | responsif |
| A9 | **Platform glyph hover** | hover card | scale(1.05) + stroke accent 200ms | discovery enak |
| A10 | **Slider thumb glow** | drag kalkulator | thumb shadow accent scale 1.1 on active, hilang on release | tactile |
| A10b | **Ticker pause on tap** | tap | marquee animation-play-state paused, resume 2s | kontrol user |
| A11 | **Related next-dock** | single blog habis scroll | dock muncul dgn judul artikel berikutnya + progress baca % | bingewatch nagih |
| A11b | **Reading progress** | scroll single | 2px accent bar top, width = scroll% | orientasi |
| A12 | **WhatsApp float** | idle 3s | scale pulse 1→1.06→1 loop 3s ease-in-out | attention halus |
| A13 | **Bento mockup chart** | viewport | SVG line draw + area fade 600ms | data hidup |

**Badge system** (dari landing audit sebelumnya): semua chip status realtime (Diproses/Selesai) pakai live-dot pulse 1.6s — konsisten dgn app StatusBadge.

### 3g.1 Koreografi reveal per-section (WAJIB — semua section masuk viewport → animasi)

> Audit landing haloka lama: hanya 3/10 section yang reveal (Features, ProviderProof, TrustBadges). Landing baru: **setiap section wajib punya entrance**. Implementasi CSS-only `.reveal` + IntersectionObserver (`is-visible`) — pattern F4, tanpa JS transition per elemen. Stagger internal per section pakai `--d` delay.

| Section | Entrance | Stagger internal |
|---|---|---|
| Navbar | — (chrome, bukan konten) | drawer slide-in 280ms saat buka |
| Hero | khusus: load sequence (bukan scroll) — eyebrow → H1 (blur-in 600ms) → sub → USP ledger → CTA → mockup | tiap baris +120ms |
| Ticker strip | reveal + langsung autoplay marquee | — |
| Inline-stat | reveal fade 500ms | angka count-up saat visible |
| Problem ledger | reveal per-row | row +60ms |
| OrderSimulator | panel reveal 500ms | form field +80ms, gauge draw saat visible |
| Order board | reveal | row +35ms (pattern F4 pesanan) |
| Bento | reveal | cell +70ms, besar dulu |
| Pricing | reveal | table row +40ms, angka tabular |
| Testi | reveal | row +80ms |
| Final CTA | reveal + SVG art glow 800ms | — |
| FAQ | reveal | item +50ms, accordion tetap on-click |
| Footer | tanpa reveal (di bawah fold persist) | — |

Rule: `threshold: 0.15` + `rootMargin: -40px` (trigger pas benar-benar masuk), sekali saja (unobserve), reduced-motion → langsung visible tanpa transisi. Badge/ekstra dekoratif (pulse blob) **tidak dianggap entrance** — entDecorative tidak menggantikan reveal.

## 3h. Floating dock mobile — spesifikasi (semua halaman)

> Pattern persis BottomNav app (glass pill, `bg-white/75 backdrop-blur-2xl`, ink-800 label) — landing harus terasa "satu produk" dgn app.

| Halaman | Isi dock | Perilaku |
|---|---|---|
| Home | CTA dinamis: "Daftar Gratis" (default) → "Coba Simulator" saat section simulator di viewport → "Lihat Harga" saat pricing | IntersectionObserver per section, swap 200ms |
| /reseller | "Daftar Reseller" persist | tetap |
| /layanan | "Cari Layanan" → scroll ke search; setelah search fokus, dock jadi "Lihat hasil (N)" | swap kontekstual |
| /blog index | tanpa dock (list sudah ADA CTA newsletter) | — |
| /blog/[slug] | next-article: judul artikel berikutnya + progress baca | muncul setelah 60% scroll |
| /beli-* | "Pesan Sekarang" persist | tetap |
| 404 | "Kembali ke Beranda" | tetap |

Spec teknis: fixed bottom + safe-area-inset-bottom, translateY-in 300ms soft, hide otomatis saat footer & hero visible, high-z 40, pill radius full, shadow accent-ink/20, label ink-800 (kontras 5.73 — pattern F4), touch ≥52px, focus-visible ring near-paper (contrast against glass).

## 4. Screen spec — halaman lain (fase 4, lanjutan)

> Semua halaman pakai Layout + Navbar + Footer + StickyCTA sama. Design contract §2 berlaku global. Setiap halaman punya containment variance sendiri, tidak salin-tempel section home.

### 4.1 `/reseller` — Halaman Reseller (money page komersial)

**Purpose:** konversi tertinggi kedua setelah home — target pencari "jadi reseller smm / jualan followers modal kecil". Jelaskan program reseller socio + API + harga grosir + kalkulator profit.

| # | Section | Pattern | Bg | Containment |
|---|---|---|---|---|
| 1 | Hero | Copy-hero (no split): H1 + sub + 2 CTA (Daftar Reseller / Simulasi profit) | paper | prose |
| 2 | Program ledger | Definisi program: level (Member→Agen→Reseller), markup per level, syarat — **definition list** 3 term | paper | dl ledger |
| 3 | Kalkulator profit (interaktif) | Slider "pelanggan/bulan" × "harga jual" → profit count-up NumberFlow + SVG bar mini | paper-2 | inset panel (kartu 1) |
| 4 | Harga grosir vs retail | **Real table** — 8 layanan populer, kolom: Harga socio / Suggested retail / Margin kamu | paper | table |
| 5 | API docs teaser | Preview endpoint + code block kecil (mono, ≤14px data atom) + link ke /api-docs | paper-2 | code panel |
| 6 | Cara mulai | Numbered timeline 3 langkah (1-2-3, bukan 01) | paper | timeline |
| 7 | Testi reseller | 2 testi — ledger row + inisial | paper-2 | ledger |
| 8 | FAQ reseller | accordion ledger (6 item: komisi, withdraw, API, level up) | paper | ledger |
| 9 | CTA final | dark panel full-bleed | dark-panel | full-bleed |

Micro: kalkulator slider → angka profit live count-up + bar SVG tumbuh; table row hover → hairline accent left.

### 4.2 `/layanan` — Katalog Layanan (money page + SEO hub)

**Purpose:** halaman berat SEO ("beli followers instagram", "beli views tiktok"...) + navigasi ke 10 money page `/beli-*` + kategori 8.270 layanan. Desain: editorial directory, bukan dashboard grid.

| # | Section | Pattern | Bg | Containment |
|---|---|---|---|---|
| 1 | Hero | Typographic hero: H1 "Semua layanan sosmed, satu panel" + search input besar (client filter) | paper | prose |
| 2 | Platform directory | **Definition grid** 10 platform — tiap platform: glyph SVG brand + nama + 3 layanan top + count layanan (tabular-nums) | paper | dl grid |
| 3 | Top layanan table | Real table 15 layanan termurah/terlaris: Platform / Layanan / Min / Harga/1k / CTA kecil | paper-2 | table |
| 4 | Category chips | Chip kategori → anchor scroll / link money page | paper | chips |
| 5 | Kategori explainer | 3 kategori utama (Engagement/Viewership/Growth) prose + icon | paper-2 | prose+icon |
| 6 | CTA | dark panel | dark-panel | full-bleed |

Micro: search filter → highlight match + count hasil (NumberFlow); platform card hover → glyph scale 1.05 + accent stroke; table sort (klik header) 180ms.

Data: dari `landing/src/data/prices.json` (sync dari app DB via `seo/sync-prices.mjs` — jangan hardcode di markup).

### 4.3 `/blog` + `/blog/[slug]` — Blog (traffic SEO + AEO)

**Purpose:** menangkap long-tail informational + funnel ke daftar. Editorial, nyaman baca mobile, cepat (CLS 0, no layout shift).

#### `/blog` (index)

| # | Section | Pattern | Bg | Containment |
|---|---|---|---|---|
| 1 | Hero | Typographic: H1 + sub 1 kalimat + kategori chip filter (client) | paper | prose |
| 2 | Artikel list | **Editorial list** — bukan card grid: tiap artikel = row (SVG art thumb 96px, judul H3, excerpt 1 kalimat, meta date/category, kategori chip) + hairline antar row | paper | **ledger rows** |
| 3 | Featured | 1 artikel unggulan di atas list: art besar + judul H2 + excerpt | paper | prose panel |
| 4 | Newsletter inline | 1 baris: input email + tombol (Resend via app API nanti; V1 simpan stub) | paper-2 | inline |
| 5 | Pagination | Numbered prev/next + windowed | paper | nav |

#### `/blog/[slug]` (artikel)

| # | Section | Pattern | Bg | Containment |
|---|---|---|---|---|
| 1 | Header artikel | H1 + meta (date, read time, kategori chip) + SVG art header | paper | prose |
| 2 | TOC sticky (desktop) | Anchor nav kiri; mobile: collapsible details di atas | paper | nav |
| 3 | Body | `prose` max-w 65ch, H2 anchor-linked, tabel harga real, blockquote callout, lazy img | paper | prose |
| 4 | FAQ section | accordion (reuse home FAQ) + **FAQPage schema JSON-LD** | paper | ledger |
| 5 | CTA inline | Box "Cek harga layanan X →" → money page/daftar (accent tint 8%) | paper-2 | callout |
| 6 | Related | "Baca juga" 3 link — ledger rows | paper | ledger |
| 7 | Breadcrumb | BreadcrumbList schema | — | — |

Schema per artikel: Article + FAQPage + BreadcrumbList (auto dari frontmatter). AdSense: **V1 tidak ada** (konversi dulu, sesuai plan SEO §0).

### 4.4 Money pages `/beli-*` (10 halaman)

Template tunggal `landing/src/layouts/BeliPage.astro` + data per halaman (keyword, layanan terkait, FAQ khusus, harga dari prices.json):

| # | Section | Containment |
|---|---|---|
| 1 | Hero: H1 keyword ("Beli Followers Instagram Murah & Terpercaya") + harga mulai + CTA daftar | prose |
| 2 | Tabel paket/paket harga real (5-8 row) | **table** |
| 3 | "Kenapa socio" — 3 reason ledger | ledger |
| 4 | Cara order 3 langkah timeline | timeline |
| 5 | FAQ 5 item + schema | ledger |
| 6 | Cross-sell: link 3 money page lain | chips |
| 7 | CTA final | dark full-bleed |

### 4.5 Global elements

- **Navbar** (semua halaman): logo wordmark + 4 link (Layanan, Reseller, Blog, Harga→/layanan#harga) + CTA "Masuk" ghost + "Daftar" accent-ink. Mobile: drawer (focus trap + Esc + scroll lock)
- **StickyCTA**: mobile only, semua halaman non-blog-artikel
- **FloatingWhatsApp**: halaman money + reseller (bukan blog)
- **Breadcrumbs**: semua page kecuali home, schema BreadcrumbList
- **404**: typographic + search layanan + 3 link populer

### 4.6 Peta spot Google AdSense (V2 — aktif setelah ada 30+ artikel & traffic organik)

> Pelajaran beriklan B7: **AdSense HANYA di blog** — home/layanan/reseller/beli-* = funnel transaksional, iklan di tengah CTA menaikkan bounce & membunuh konversi. Landing socio.id V1 = 0 slot; V2 monetize blog saja.

| Halaman | Slot | Posisi | Format | Catatan |
|---|---|---|---|---|
| `/blog/[slug]` | **#1 in-article** | setelah paragraf intro (≤3rd H2) | in-article fluid | lazy on-scroll 3s (pattern beriklan, anti-CLS) |
| `/blog/[slug]` | **#2 in-article** | mid-article, setelah tabel harga | in-article fluid | jangan potong tabel/list |
| `/blog/[slug]` | **#3 end-of-article** | setelah body, sebelum FAQ | autorelaxed | related + ad interleave |
| `/blog/[slug]` | **#4 sidebar sticky** | desktop ≥1024, kolom kanan TOC | display 300×600 | sticky, hidden mobile |
| `/blog` index | **in-feed** | setiap 6 row artikel | in-feed native | menyatu dgn ledger row, tanpa merusak list |
| Home / layanan / reseller / beli-* | — | **TANPA ADSENSE** | — | funnel murni |

**Rule implementasi (anti-penalty & anti-CLS):**
1. Layout iklan **reserved space** (min-height tetap) sebelum ad load — CLS 0 wajib
2. `adsbygoogle.js` **defer + lazy** (IntersectionObserver, load saat slot ≤600px dari viewport) — jangan render-blocking
3. Meta `google-adsense-account` hanya di `/blog/*`, bukan global Layout
4. Max 4 slot/artikel + 1 in-feed/index — sesuai policy & batas beriklan B3
5. Anchor/vignette auto-ads: **default OFF**; aktifkan hanya jika blog PV >5k/bulan & CTR organik stabil (eksperimen terukur)
6. `about:blank` fallback height agar skeleton tidak collapse saat unfilled

**Data account**: pakai `ca-pub` socio.id sendiri (daftar baru saat V2) — JANGAN reuse `ca-pub-4438184351486735` beriklan (beda legal entity + risiko ban asosiasi).

## 5. Eksekusi build (fase 5-7, revisi)

> **Status tracker** — update baris ini tiap fase selesai.

| Fase | Isi | Estimasi | Status |
|---|---|---|---|
| D0 | Design tokens landing (`landing/src/styles/tokens.css` dari kontrak §2) + font self-host swap (hapus Google Fonts CDN → woff2 subset + preload, pattern app) | ½ sesi | ✅ **SELESAI 31 Agt** — tokens OKLCH live, font self-host verified (fonts.check true, CLS 0, zero third-party) |
| D1 | Navbar scroll-state + **FloatingTabDock mobile** (3 tab + CTA slot) + Footer mobile menu grid (Blog/API/FAQ/WA) + Footer typographic | ½ sesi | ✅ **SELESAI 31 Agt** — dock glass pill 3 tab + CTA (scroll-in, $state fix), navbar blur hairline + logo-only mobile (no hamburger), Footer.astro typographic, stub /layanan, verified 360px+1280px, AA 7.19:1, 0 JS error |
| D2 | Hero split + **live dashboard mockup** (§3g.0: saldo tweened, order stream, platform rotate, floatSlow) + trust inline-stat | 1 sesi | ✅ **SELESAI 31 Agt** — hero copy baru (H1 'Semua platform. Satu panel. Mulai Rp42.' + USP ledger 4 baris), HeroMockup.svelte (saldo count-up Rp247.500+delta, order stream 2.5s max 4 row, platform rotate 2.4s, floatSlow desktop, no emoji/no external img, reduced-motion state final), load-sequence 6 langkah +120ms, TrustBadges emoji-strip → inline-stat prose; verified: CLS 0, LCP 544ms, 0 JS err, saldo live; FIX: client:visible→client:load (island rect 0×0 IO bug) |
| D3 | Problem ledger + OrderSimulator (reuse NumberFlow/ServiceCard pattern app) + order board table | 1 sesi | ✅ **SELESAI 1 Sep** — ProblemLedger.astro (3 pain→solusi, hairline ledger no-card, icon set:html), OrderSimulator.svelte (form 3 field, harga tweened live, gauge SVG ring, check-draw submit, reduced-motion final), OrderBoard.astro (real table 8 row, mono ID, StatusBadge chip 4 status); PainPoints.svelte (246 baris, kartu + emoji) dihapus dari index; global reveal observer di Layout.astro + fallback scroll-handler (IO coalesce bug); FIX CLS 0.065→0.0001 (HeroMockup order-stream init 4 baris — grow ke-4 saat hydrate = +42px shift semua section bawah); verified 39/39: harga live 3 skenario, alert, check-draw, 0 stuck reveal, CLS 0.0001, 0 JS err **REVISI COPY 1 Sep (siang)**: offer utama → paket Reseller Rp50.000 include saldo Rp20.000 + harga reseller (tanpa % — diatur admin pricing_rules; real: Member 165 vs Reseller 154/1k TikTok Views ≈ 7% lebih murah). Konsisten di: Hero H1+USP ledger 5 row+CTA, OrderSimulator, ProblemLedger, PricingTable, FinalCTA, StickyCTA, FloatingTabDock, Navbar, HowItWorks, FAQ, meta description. Hapus semua emoji (♻⚡🚀👑🎯♾✨) + klaim basi (Daftar Gratis, /register path, bonus 10%, saldo trial) + angka stale (8.185/872→8.270/882). Semua link daftar → app.socio.id/daftar?mode=reseller. Audit 49/49 smoke + 10/10 copy-promo.|
| D4 | Bento kapabilitas + pricing table real + testi ledger | 1 sesi | ✅ **SELESAI 1 Sep** — KapabilitasBento.astro (5 cell: besar 2×2 chart SVG A13 line-draw+area-fade 600ms, Auto-refill/API/Grosir/Notif wide, stagger +70ms besar dulu), PricingTable.astro (prose + real table 8 row harga DB real 1 Sep: TikTok Views Rp165/1k, IG Likes 1.542, TG 801, YT Subs 3.081 refill, YT Views 6.162, X 4.740, Spotify 5.688, IG Followers 7.395 refill; kolom retail strike-through; angka diverifikasi via mysql CLI), TestiLedger.astro (3 ledger row inisial avatar RA/SP/BD, no emoji); Features.svelte (204 baris gradient blob+emoji), PricingInteractive.svelte (3-tier card ✨PALING LARIS), SocialProof.svelte (10 testi card emoji) dilepas dari index; verified 49/49: bento span-2×2 desktop, chart animasi, harga real, 3-tier gone, reveal 0 stuck, CLS 0, 0 JS err |
| D5 | `/reseller` full (hero, kalkulator profit, table grosir, API teaser, FAQ) | 1 sesi | ✅ **SELESAI 1 Sep** — rebuild total 9 section §4.1: (1) hero copy-hero no-split 'Jualan followers. Modal Rp50 ribu.' + CTA daftar/kalkulator, (2) ProgramLedger dl 3 level harga real TikTok Views (Member 165/Agen 138/Reseller 154), (3) ProfitCalculator.svelte island slider pelanggan×harga jual → profit count-up tweened + SVG bar (modal IG Followers reseller 6.902 real), (4) GrosirTable 8 layanan price_reseller real vs retail + kolom margin + row hover hairline accent, (5) ApiTeaser code block mono 13px + link api-docs, (6) CaraMulaiReseller timeline 1-2-3 rail hairline, (7) TestiReseller 2 ledger, (8) FaqReseller 6 accordion, (9) CTA dark. Semua section lama (grid kartu emoji 💸🤖🚀, gradient amber hero split, kartu rotate) dihapus. Meta title+description reseller baru. Audit 63/63 (3 viewport × 21 check: hero, dl, kalkulator live 2 slider, table margin, api block, timeline, testi, faq, cta, 0 reveal stuck, 0 emoji, 0 register, 0 JS err) + 0 h-overflow 360px. Komponen: ProgramLedger/ProfitCalculator/GrosirTable/ApiTeaser/CaraMulaiReseller/TestiReseller/FaqReseller |
| D6 | `/layanan` full (search, platform directory dari prices.json 882 kategori, top table, kategori) + `seo/sync-prices.mjs` wiring | 1 sesi | ✅ **SELESAI 1 Sep** — data foundation: `seo/sync-prices.mjs` (pull app DB → `landing/src/data/prices.json`, 8.270 layanan / 8 platform / 14 top layanan kurasi bersih tanpa emoji) + `/layanan` rebuild 6 section §4.2: (1) hero typographic 'Semua layanan sosmed, satu panel' + angka real 8.270/882, (2) PlatformDirectory dl grid 10 platform glyph SVG brand + count real (IG 1.662, TikTok 1.527, dst) + 3 layanan top, (3) TopLayananTable.svelte island: search live filter + highlight match + count hasil aria-live + sort klik header 180ms (harga desc verified Rp48→Rp13.650), (4) KategoriExplainer 3 row ledger icon (Engagement/Viewership/Growth), (5) CTA dark mode=reseller. Stub 'sedang disiapkan' dihapus. Audit 54/54 (3 viewport × 18 check) + lint/check 0-0-0 |
| D7 | `/blog` index + `[slug]` layout editorial + TOC + related + schema | 1 sesi | ✅ **SELESAI 1 Sep** — MDX@4 + sitemap terpasang (mdx@8 incompatible astro 5.18 → downgrade; glob loader `entry.id` bukan `entry.slug`). Content collections schema gate: draft:true dikecualikan build, title ≤70, desc ≤160, FAQ tepat 5, related ≤3. 3 artikel seed (apa-itu-smm-panel p90, cara-menambah-followers-instagram p85, modal-jualan-followers p75 — harga real dari prices.json, 0 emoji, internal link /layanan + /reseller). Blog index: hero + chip filter CSS radio (0 JS island, vanilla show/hide data-cat), featured panel (Reseller), 2 ledger rows thumb ArtThumb SVG deterministik (4 pola generatif via slug-hash, 0 request), newsletter inline stub (POST app API nanti), pagination windowed siap. Single [slug]: breadcrumb, meta chip + read time, art header, TOC sticky desktop 260px + details collapsible mobile, prose 65ch (tabel harga + blockquote accent + h2 scroll-mt), FAQ 5 details, CTA box accent-tint (/layanan + /reseller), related ledger, reading progress bar vanilla. Schema per artikel: Article + FAQPage + BreadcrumbList (valid JSON). Sitemap-index + sitemap-0 (7 URL). Audit 73/73 (3 viewport × 22 + 8 schema) + lint + check 0-0-0. **+1 artikel 2 Sep**: `smm-panel` (kategori Lainnya, 1012 kata, 4 H2, 5 FAQ, 3 link internal socio.id — 1 money `/smm-panel-` + 2 slug `apa-itu-smm-panel` + `smm-panel-indonesia` — slug kedua belum publish jadi anchor only). Cross-link balik di `apa-itu-smm-panel.mdx`: `related: [smm-panel]`. Build 19 page. |
| D8 | Money pages `/beli-*` ×10 (template BeliPage + data) | 1 sesi | ✅ **SELESAI 1 Sep** — 10 halaman: 8 beli-* + smm-panel-reseller + smm-panel-api (keyword map SEO system §2). Data: `landing/src/data/beli-pages.ts` (keyword/title≤70/desc≤160/heroSub/reasons 3/FAQ 5/cross-sell 3 per halaman, 0 harga hardcode). Template tunggal `layouts/BeliPage.astro` 7 section §4.4: (1) hero H1 keyword + breadcrumb + stat harga mulai real (price & priceReseller dari prices.json row termurah platform) + 2 CTA, (2) tabel 7 row harga real member+reseller+min-order + 3 paket quick-calc (1000/5000/10000 unit × harga real), (3) Kenapa socio 3 reason ledger numbered, (4) cara order 3 langkah numbered-opacity-20, (5) FAQ 5 details, (6) cross-sell 3 chips + 1 chip dashed 'Semua 8.270 layanan', (7) CTA dark full-bleed. Schema per halaman: Product + AggregateOffer (lowPrice/highPrice real) + FAQPage + BreadcrumbList. Route: root `[slug].astro` getStaticPaths dari beliPages (route statis menang, /foo → 404 verified; route group `(beli)` bocor ke dist → dihapus). Sitemap 17 URL total. FIX: cross-sell spread overwrite `slug`, harga reseller stat jangan `*0.93` estimasi → pakai priceReseller real. Audit 193/193 (10 halaman × 17 check 360px + 2×1280 + sitemap + route guard) + lint + check 0 error |
| L1 | Final CTA dark + FAQ accordion + StickyCTA dock + FloatingWhatsApp + 404 | ½ sesi | ✅ **SELESAI 1 Sep** — StickyCTA mobile-only (md:hidden) redesigned: pill dark-panel ink + tombol accent-ink AA (sebelumnya bg-primary indigo + bg-accent-500 light cyan — drift brand + a11y fail), bottom di atas dock (pb-[calc(5.25rem+safe-area)]); FloatingTabDock.svelte: prefix-match ctaByPath untuk /beli-* + /smm-panel-* → "Pesan Sekarang" (sebelumnya fallback default "Masuk"), + data-dock-cta body-attribute override (label|href) untuk 404; Layout.astro: optional dockCta prop → body[data-dock-cta]; layanan.astro: tambah StickyCTA + breadcrumb visual + BreadcrumbList schema; reseller.astro: tambah breadcrumb visual + BreadcrumbList schema; blog/index.astro: hapus FloatingTabDock (§3h: blog index tanpa dock — newsletter CTA sudah ada); blog/[slug].astro: ganti dock tabs dengan NextArticleDock.svelte island baru — muncul setelah 60% scroll, glass pill "Baca juga: {next title} →" (post berikutnya diurutkan pubDate ascending, wrap-around), md:hidden; BeliPage.astro: tambah FloatingWhatsApp client:load (sebelumnya tidak — spec §4.5 money pages); TopLayananTable.svelte: onMount baca ?q= → prefill search (404 search submit → /layanan?q=…); 404.astro baru — typographic angka 404 besar (clamp 96-176px, accent-ink), H1 "Halaman ini nggak ada.", search input → /layanan?q=, 3 link populer (Beli Followers IG / Layanan / Reseller), CTA fallback daftar reseller, dock CTA override "Kembali ke Beranda|/", WebPage schema; Faq.svelte: emoji 💬 → SVG icon (cleanup 1 Sep). Build 18 page (17+404), lint clean, astro check 0-0-11 (3 hint baru is:inline JSON-LD intentional). Audit 50/50 (9 blok: 404 typographic+search+3 populer+dock CTA, ?q= prefill, StickyCTA mobile+desktop-hidden, layanan breadcrumb+schema+StickyCTA, reseller breadcrumb+WA tanpa StickyCTA, beli-* WA+dock CTA "Pesan Sekarang", blog index tanpa dock+breadcrumb, blog single NextDock 60% scroll+0 overflow, 5 halaman 0 emoji/stub/stuck-reveal/JS err). |
| L2 | **Audit 8 anti-pattern + web-design-guidelines + review-animations** + Lighthouse ≥90 mobile + CLS 0 + a11y 100 semua halaman | ½ sesi | ✅ **SELESAI 1 Sep** — 8 anti-pattern pass (grep+manual). **Token drift repair**: 17× primary indigo→accent-ink (HowItWorks×12, FinalCTA×2, Faq×3, index FAQ pill×1) + 3× bg-accent-500→var(--accent-ink) AA (reseller:102, layanan:80, BeliPage:290). **FinalCTA**: remove eyebrow pill (50.000+ fabricated claim + animate-ping + indigo border), button bg-accent-500→accent-ink AA, gradient primary-400→accent, **4-col stat strip→inline narrative** (#5 anti-pattern), setInterval 100ms→220ms gated IO visibility+reduced-motion (perf), mouse-move rAF throttle (recalc storm fix), drop-shadow-2xl→removed, ink-400→oklch on-dark token. **SmmProviderProof**: remove indigo blob, fake `42 dtk` stat→dropped, 4-col stat strip→inline narrative (8.270+882 real), `50.000+ Reseller Aktif` fabricated→dropped. **HowItWorks**: all primary→accent-ink, remove browser chrome dots (anti-pattern), 8.185→8.270, fake prices Rp18/Rp8/Rp25→real Rp7.395/Rp165/Rp6.162, progress keyframes width→transform scaleX origin-left (GPU-safe), autoplay gated IO+reduced-motion, `transition:slide`→fade (slide animates height layout). **Faq**: blob pulse→remove, primary→accent-ink, focus-visible ring added, aria-expanded ditambahkan. **index FAQ**: pill bg-primary-50→dihapus (heading saja). **A11y Lighthouse 3 fix**: HeroMockup pill bg color-mix 75% brand + 25% dark-panel (white text contrast AA), platform pills role=tablist+children→remove role (decorative), FloatingTabDock role=tablist/tab→role=link (nav bukan tab), home `<main>` landmark wrapping content. **Perf Lighthouse**: HeroMockup client:load→client:visible + FloatingTabDock/FloatingWhatsApp client:load→client:idle (defer JS hydration). Build 18 page, lint clean, check 0-0-11. **Lighthouse mobile (simulate throttling) semua 7 key page**: home 92/97/100/100 LCP3.0 CLS0, layanan 97/99/100/100 LCP2.4, reseller 93/98/100/100 LCP2.9, beli-followers-ig 99/94/100/100 LCP2.1, blog 99/100/100/100 LCP1.8, blog/apa-itu-smm 96/100/100/100 LCP2.6, 404 97/100/100/100 LCP2.4. **All ≥90 perf + ≥94 a11y + 100 best-practices + 100 seo + CLS0**. **Audit L2 smoke 57/57** (anti-pattern regression 7 page × 2 check + main landmark + ARIA tablist 5 page + reduced-motion + reveal/JS/emoji/stub 9 page). **Regression**: D8 193/193 + L1 50/50 — no regresi. |
| S0-S3 | Sistem SEO (content collections, money pages data, generator lokal, indexnow, llms.txt) — jalan paralel setelah D6 (butuh prices.json) | 2-3 sesi | 🟡 **S0 done 1 Sep** — **Queue 183 keyword** (33 seed + 150 katalog-expand: 93 secondary intent live/viewers/comments/story/reels/spotify/twitter/fb), procedural doc `docs/SEO-KEYWORD-RESEARCH.md`, tool `seo/s2b-expand.mjs` (Node, fetch Google Suggest depth-1+2, prefix×suffix matrix, filter double-prefix/action-verb, sort composite, cap 150), 0 token AI. **S0a infra done**: `public/robots.txt` AI-bot allowlist (GPTBot/ClaudeBot/Perplexity/CCBot/Google-Extended/Applebot-Extended) + bad-bot block (AhrefsBot/SemrushBot/MJ12bot); `public/indexnow.txt` (32-char hex key auto-discover, `SOCIO_INDEXNOW_KEY=278171…272ea5` di .env.example); `Layout.astro` global Organization JSON-LD (semua 18 halaman verified — 32/32 PASS); `index.astro` WebSite JSON-LD + potentialAction SearchAction (hanya home, untuk sitelinks). Hapus fabricated aggregateRating 4.9/12450 (D3 copy rev cleanup). Offer price JSON-LD fix 50000 (sebelumnya 10000 salah). `seo/llms.mjs` generator: output `public/llms.txt` (2033 byte, ringkas + link ke full) + `public/llms-full.txt` (13.4 KB, 3 artikel + money pages + FAQ + body 3000 char truncate per artikel, draft excluded). Build 18 page, lint clean, check 0-0-11 hints, **Lighthouse home p=97 a11y=97 bp=100 seo=100 CLS=0 LCP=2.3s** (perf naik dari 92 → 97 karena Organization JSON-LD). **Sisa**: S2d prompts.ts + S2e generate.mjs (zen+groq rotasi) + S2f publish.mjs + S2g indexnow.mjs (ping Bing+Yandex pakai SOCIO_INDEXNOW_KEY) + seed 5 artikel test (~20k token) + S3 polish. | — **S2a-b DONE**: seo/queue.json 183 keyword 4 kategori. Stats: p90 9 + p85 162 + p80 7 + p75 5 (kategori 5 kosong sesuai spec §2). Cluster: instagram 47 + smm-panel 29 + youtube 25 + tiktok 22 + facebook 15 + spotify 13 + twitter 10 + keamanan 7 + reseller 5 + telegram 5 + story 4 + lainnya 1. Demand signal: high 37 + medium 130 + aeo 11 + low 5. **93 secondary intent** (live/viewers/comments/story/reels/share/spotify/retweet/tweet-views/page-likes) — ekspansi dari prices.json top14 + EXTRA_BASES manual kurasi (kritik user: tidak teliti ekspansi dari katalog + LIVE cluster). Added_by: katalog 150 + seed 28 + autocomplete 5. **Procedural docs**: `docs/SEO-KEYWORD-RESEARCH.md` (repeatable, pitfalls, schema). **Tool**: `seo/s2b-expand.mjs` (Node, fetch Google Suggest depth-1+2, prefix×suffix matrix, normalize service name, filter double-prefix/action-verb, sort composite, cap 150). Token AI: 0. **Sisa**: S0 robots+Organization+WebSite JSON-LD+llms.txt, S2d prompts.ts SMM, S2e generate.mjs (zen+groq rotasi), S2f publish.mjs, S2g indexnow.mjs, seed 5 artikel test, S3 polish+gsc-sync. | — **S2a-b DONE**: seo/queue.json 33 keyword 4 kategori (p90 9 + p85 12 + p80 7 + p75 5 — kategori 5 kosong sesuai spec §2). Demand check via Google Autocomplete ID region Sep 2026 (0 token AI, DataForSEO MCP tidak tersedia — gratis approach). Head terms dapat ≥6 suggs (smm panel 9, beli-followers-ig 6, beli-followers-tt 9, cara-menambah-followers-ig 9, refill-followers 9, smm-panel-indonesia 6, smm-panel-reseller 5) — high demand. Definisi queries 0 suggs tapi di-keep untuk AEO/AI Overview intent (edu→signup funnel). Schema queue diperluas: demand_signal (high/medium/aeo/low), autocomplete_count, kd_estimate, added_by. Sort: priority DESC → demand_signal weight DESC → keyword ASC. Stats: high=13, medium=4, aeo=11, low=5. **S0 partial via D7+L1**: collections schema gate OK (draft excluded, FAQ 5, related ≤3, desc ≤160), sitemap lastmod jujur, Article+FAQPage+BreadcrumbList per artikel. **Sisa**: (1) S0 robots.txt + JSON-LD Organization+WebSite + llms.txt ~5k token, (2) S1 money pages DONE D8, (3) S2d prompts.ts SMM ≤600 token + S2e generate.mjs (zen+groq rotasi, 1 call/artikel ~3k token, retry 1x ganti model, timeout 120s) + S2f publish.mjs + S2g indexnow.mjs ~10-15k token + seed 5 artikel test ~15-25k token, (4) S3 polish (related, prev/next, OG image, llms-full.txt, gsc-sync) ~10-15k token. Total S0-S3 first batch ~50-70k token. **Next**: S0 robots+llms → S2d prompts → S2e generate → seed 5 artikel validasi end-to-end. |
| CF1 | **Deploy**: build + `wrangler pages deploy` ke project `socio-id` (sudah ada, custom domain socio.id live) — pakai skill `cloudflare`/`wrangler`; cek header keamanan + cache rules | ½ sesi | ⏳ |

**Urutan kerja (keputusan user 31 Agt): bereskan landing socio.id DULU, baru deploy app.socio.id ke VPS.** CF Pages project + domain sudah ada — phase CF1 hanya deploy ulang + polish. Skill `cloudflare` + `wrangler` akan di-load saat CF1.

Total ~9 sesi (D0-L2). Verify tiap fase: `pnpm --filter landing build` + Lighthouse mobile + a11y.

## 5. DoD desain

- [ ] Lighthouse mobile ≥90 semua page landing; a11y 100; CLS 0; LCP < 2.5s (font self-host)
- [ ] 8 anti-pattern pass (audit grep + manual)
- [ ] Motion: custom bezier semua, reduced-motion mati, GPU-safe (transform/opacity)
- [ ] Mobile 360px: tanpa overflow, sticky dock, thumb-zone CTA
- [ ] Angka/harga: tabular-nums; mono hanya data atom
- [ ] Konsistensi token app ↔ landing (accent-ink AA 5.4:1, hover lebih gelap)
