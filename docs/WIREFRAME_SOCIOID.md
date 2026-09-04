# Wireframe Design Guideline — Socio.id Landing

> **Versi**: 4 Sep 2026  
> **Scope**: Detailed design guideline + wireframe contract untuk landing `socio.id` (Cloudflare Pages, Astro 5 + Svelte 5 islands).  
> **Tujuan**: Konsistensi visual & interaksi lintas section, lintas device, lintas role (visitor / buyer / reseller).  
> **Companion docs**: `docs/DESIGN.md` (high-level contract), `docs/MOBILE_UX_GUIDE.md` (motion patterns), `docs/audit/landing-redesign.md` (audit findings + phase plan L1-L10), `docs/LANDING_DESIGN_PLAN.md` (existing detail spec), `docs/SMM_STANDOUT_RESEARCH.md` (competitor differentiation).

---

## 0. TL;DR

Socio.id landing adalah **SMM panel marketplace** (8.270 layanan × 6 platform × multi-tier pricing). Visitor persona:
- **Buyer langsung** (UMKM, content creator, personal brand) — beli followers/likes untuk akun sendiri.
- **Reseller** (target utama) — daftar Rp50.000 sekali, beli grosir, jual eceran dengan margin.

Visual identity: **premium cyan-teal accent + glass morphism + iOS-style floating dock**. Bukan "website marketing" — feel seperti **app yang kebetulan dibuka di browser**.

Prinsip wireframe:
1. **1-tap reach**: floating dock bawah + sticky CTA atas. Tidak ada hamburger.
2. **Transparan**: harga breakdown real-time (OrderSimulator), margin reseller visible, tidak ada hidden cost.
3. **Retention loop**: blog + newsletter + Telegram + repeat visit via fresh content.
4. **Mobile-first**: 390×844 viewport jadi acuan, scale up ke desktop.
5. **Per-section contract**: setiap section punya 1 tujuan, 1 CTA, 1 motion hook.

---

## 1. Design Tokens

### 1.1 Color Palette (OKLCH)

```css
/* Brand */
--accent-oklch: oklch(72% 0.16 195);          /* cyan-teal primary */
--accent-hover-oklch: oklch(68% 0.18 195);    /* hover state */
--accent-ink: oklch(45% 0.14 195);            /* AA-compliant button fill (L=0.42-0.48) */
--accent-focus-ring: oklch(72% 0.16 195 / 0.5);

/* Surface */
--paper: oklch(99% 0.005 95);                 /* bg main */
--paper-2: oklch(96% 0.008 95);               /* card bg, table row alt */
--ink-50: oklch(98% 0.005 240);               /* text dim */
--ink-200: oklch(90% 0.005 240);              /* border, hairline */
--ink-500: oklch(60% 0.01 240);               /* secondary text */
--ink-800: oklch(25% 0.015 240);              /* filled dark (active dock) */
--ink-900: oklch(15% 0.015 240);              /* heading */

/* Semantic */
--success: oklch(70% 0.18 145);
--warning: oklch(78% 0.16 80);
--danger: oklch(60% 0.22 25);
--info: oklch(70% 0.15 230);
```

**Rules**:
- AA contrast minimum: text 4.5:1, large text 3:1, UI components 3:1.
- Button fill pakai `--accent-ink` (L=0.45) supaya white text di atasnya dapat 4.7:1.
- Jangan pakai literal color hex/RGB di component — selalu via token CSS variable.

### 1.2 Typography

```css
/* Self-host (zero Google CDN, no FOUT) */
--font-sans: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
--font-display: 'Sora', var(--font-sans);

/* Scale */
--fs-xs: 0.75rem;     /* 12px — eyebrow, badge */
--fs-sm: 0.875rem;    /* 14px — caption, table */
--fs-base: 1rem;      /* 16px — body (no iOS zoom) */
--fs-lg: 1.125rem;    /* 18px — lead */
--fs-xl: 1.25rem;     /* 20px — small heading */
--fs-2xl: 1.5rem;     /* 24px — H3 mobile */
--fs-3xl: 1.875rem;   /* 30px — H2 mobile */
--fs-4xl: 2.25rem;    /* 36px — H1 mobile */
--fs-5xl: 3rem;       /* 48px — H1 desktop */
--fs-6xl: 3.75rem;    /* 60px — H1 hero desktop */

/* Weight */
--fw-regular: 400;
--fw-medium: 500;
--fw-semibold: 600;
--fw-bold: 700;
--fw-black: 800;

/* Line height */
--lh-tight: 1.1;      /* display heading */
--lh-snug: 1.25;      /* heading */
--lh-normal: 1.5;     /* body */
--lh-relaxed: 1.625;  /* long-form */
```

**Rules**:
- Display font (Sora) hanya untuk H1, H2, hero copy, big numbers.
- Body selalu Plus Jakarta (atau fallback system).
- Body text minimal 16px (no iOS zoom on input focus).
- Heading hierarchy: h1 (1 per page) → h2 (section) → h3 (subsection) → h4 (card title).

### 1.3 Spacing Scale (8pt grid)

```css
--space-0: 0;
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-20: 5rem;     /* 80px */
--space-24: 6rem;     /* 96px */
--space-32: 8rem;     /* 128px */
```

**Rules**:
- Section vertical padding: `py-16` mobile, `py-20` tablet, `py-24` desktop.
- Card padding: `p-4` mobile, `p-6` desktop.
- Gap between sections: `gap-12` minimum.
- Flex/grid child dengan `truncate` → wajib `min-w-0` (anti mobile overflow).

### 1.4 Motion

```css
/* Easings */
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);     /* entrance, default */
--ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);    /* subtle */
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);        /* state change */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);   /* dock-pop, success */

/* Durations */
--dur-instant: 100ms;
--dur-fast: 200ms;
--dur-base: 300ms;
--dur-slow: 600ms;
--dur-deliberate: 1000ms;

/* Reduced motion override */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

**Rules** (anti-pattern gate):
- ✅ Transform + opacity only (composited, no layout thrash).
- ❌ No `top/left/width/height` animation (forces reflow).
- ❌ No `transition: all` — be specific.
- ❌ No animation longer than 1s (unless deliberate loading state).
- Respect `prefers-reduced-motion` 100%.

### 1.5 Glass Surface (Token-Driven)

```css
/* Di shared landing/src/styles/glass.css atau @socio/ui */
.glass {
  background: color-mix(in oklab, var(--paper) 82%, transparent);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid color-mix(in oklab, white 40%, transparent);
  box-shadow:
    0 10px 40px -12px rgba(15, 23, 42, 0.18),
    0 4px 16px rgba(15, 23, 42, 0.08);
}
```

**Usage**: Floating dock, modal sheet, sticky CTA, dropdown menu, toast.  
**Rule**: Selalu pakai class `glass`, JANGAN literal `bg-white/75 backdrop-blur-2xl`.

### 1.6 Shadow

```css
--shadow-xs: 0 1px 2px rgba(15, 23, 42, 0.06);
--shadow-sm: 0 2px 8px rgba(15, 23, 42, 0.08);
--shadow-md: 0 4px 16px rgba(15, 23, 42, 0.12);
--shadow-lg: 0 10px 40px -12px rgba(15, 23, 42, 0.18);
--shadow-xl: 0 24px 64px -16px rgba(15, 23, 42, 0.24);
```

**Rule**: Glass component pakai `--shadow-lg`. Card hover pakai `--shadow-md → --shadow-lg` transition 200ms.

### 1.7 Border & Radius

```css
--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 16px;
--radius-xl: 20px;
--radius-2xl: 28px;       /* dock, sheet — superellipse */
--radius-full: 9999px;    /* pill button, badge */

/* Hairline divider */
--hairline: color-mix(in oklab, var(--ink-200) 70%, transparent);
--hairline-strong: var(--ink-200);
```

---

## 2. Breakpoints

```css
--bp-sm: 640px;    /* large mobile landscape */
--bp-md: 768px;    /* tablet portrait — dock hides, navbar full shows */
--bp-lg: 1024px;   /* tablet landscape / small desktop */
--bp-xl: 1280px;   /* desktop — max content width 1200px */
--bp-2xl: 1536px;  /* large desktop */
```

**Mobile-first**: design di 390×844 dulu, scale up.  
**Content max-width**: `max-w-6xl` (1152px) untuk prose, `max-w-7xl` (1280px) untuk dashboard-style grid.

---

## 3. Mobile Floating Premium Dock (Wireframe Detail)

> **Reference**: `packages/ui/src/components/BottomNav.svelte` (user dashboard). Spec lengkap lihat `landing-redesign.md §9 Phase L5`.

### 3.1 Wireframe (390×844)

```
┌─────────────────────────────────────────┐
│                                         │ ← safe-area-top (notch)
│   [Status bar iOS — time, battery]      │
│                                         │
├─────────────────────────────────────────┤
│  Navbar (sticky, transparent)           │ ← 64px height
│  ┌─Logo─────┐                            │
│  │ socio.id │   [Masuk] [Daftar]        │ ← desktop only (≥768px)
│  └──────────┘                            │
├─────────────────────────────────────────┤
│                                         │
│                                         │
│         [Hero section content]          │
│                                         │
│                                         │
│                                         │
│                                         │
├─────────────────────────────────────────┤
│   [Section 2 — Trust strip]             │
│   [Section 3 — ProblemLedger]           │
│   [Section 4 — OrderSimulator]          │
│   [Section 5 — ...]                     │
│   [Section 6 — Pricing]                 │
│   [Section 7 — FAQ]                     │
│   [Section 8 — Footer]                  │
│                                         │
│                                         │
│   pb-32 (128px) reserved for dock       │
│                                         │
├─────────────────────────────────────────┤
│                                         │ ← safe-area-bottom
│   ┌─────────────────────────────────┐   │
│   │ 🏠   ⚡   📰   👑   [Daftar →]  │   │ ← Floating premium dock
│   │Home Lay  Blog  Res   CTA accent │   │   72px + 16px gap = ~88px total
│   └─────────────────────────────────┘   │   inset-x-3, bottom-3
│                                         │
└─────────────────────────────────────────┘
```

### 3.2 Anatomy

```
┌──────────────────────────────────────────────────────────────┐
│  ◯ Beranda │ ⚡ Layanan │ 📰 Blog │ 👑 Reseller │ [Daftar →] │  ← 5 items
│   inactive  inactive     inactive   inactive    ACTIVE CTA  │
│             (label)      (badge 3)  (label)     bg-accent-ink│
└──────────────────────────────────────────────────────────────┘
   ↑ rounded-[28px] superellipse, glass class, padding 8px
```

### 3.3 Per-Item Spec

| Item | Icon | Label | Active style | Badge | Haptic |
|---|---|---|---|---|---|
| Beranda (`/`) | home | 7-9 char | bg-ink-800 fill + dock-pop spring | optional | 10 |
| Layanan (`/layanan`) | bolt/grid | 7-9 char | same | optional "8.270" informational | 10 |
| Blog (`/blog`) | newspaper | 7-9 char | same | "3 baru" (new posts) | 10 |
| Reseller (`/reseller`) | crown | 7-9 char | same | none | 10 |
| CTA Daftar | arrow-right | dinamis | bg-accent-ink fill (different) | none | 14 (more impactful) |

**Dimensions**:
- Item: min 48×52px tap target, padding `px-1 py-2`.
- Icon: 20×20px, stroke 1.9 (inactive) → 2.4 (active).
- Label: 9px bold tracking-wide, full opacity (AA).
- Dock: 28px superellipse, 8px inner padding, safe-area-inset-bottom.

### 3.4 States

| State | Trigger | Animation |
|---|---|---|
| Hidden (default) | scroll < 50vh | translate-y-4 opacity-0 (off-screen) |
| Visible | scroll > 50vh | translate-y-0 opacity-1, 300ms ease-out-expo |
| Tap (item) | touchstart | scale 0.96, 150ms, + haptic(10) |
| Active (route change) | $page.url.pathname changes | dock-pop 420ms cubic-bezier(.34,1.56,.64,1) |
| View transition | navigate() | hold position via `view-transition-name: floating-dock` |
| Reduced motion | OS preference | no entrance, no spring, instant |

### 3.5 CTA Slot Variants (per page)

```typescript
const ctaVariants = {
  '/': { label: 'Daftar Rp50rb', href: 'https://app.socio.id/daftar?mode=reseller' },
  '/layanan': { label: 'Daftar Rp50rb', href: 'https://app.socio.id/daftar?mode=reseller' },
  '/blog': { label: 'Masuk', href: 'https://app.socio.id/login' },
  '/reseller': { label: 'Jadi Reseller', href: 'https://app.socio.id/daftar?mode=reseller' },
  // Prefix match
  '/beli-*': { label: 'Pesan Sekarang', href: 'https://app.socio.id/daftar?mode=reseller' },
  '/smm-panel-*': { label: 'Pesan Sekarang', href: 'https://app.socio.id/daftar?mode=reseller' },
};
```

### 3.6 File Spec

```
landing/src/components/FloatingTabDock.svelte  — REWRITE 123 → ~180 LOC
landing/src/styles/glass.css                   — NEW ~30 LOC (.glass class)
landing/src/lib/haptic.ts                     — NEW ~15 LOC (vibrate wrapper)
landing/src/styles/global.css                 — view-transition CSS for floating-dock
landing/src/components/Navbar.svelte          — minor comment
```

---

## 4. Per-Section Wireframe Contract

> Format: setiap section punya 1 tujuan, 1 struktur, 1 motion hook, 1 CTA, 1 acceptance. Detail implementasi lihat `landing-redesign.md` per phase.

### 4.1 Section: Navbar (sticky top)

**Tujuan**: brand presence + Masuk/Daftar CTA + (mobile) trigger untuk dock.

**Struktur**:
```
[Logo socio.id] ──────── [Layanan] [Reseller] [Blog] | [Masuk] [Daftar →]
  ↑ 28px height, padding 16-20px
```

**States**:
- Top of page: transparent bg, no border.
- After scroll 24px: glass bg, hairline border-bottom, padding shrink.
- Mobile (<768px): logo only — semua nav ada di FloatingTabDock.

**Motion**:
- bg/border transition 300ms ease-out.
- Padding transition 300ms.

**A11y**:
- `<nav aria-label="Navigasi utama">`
- Logo: `<a aria-label="Socio.id — beranda">`
- Focus-visible ring pada setiap link.

---

### 4.2 Section: Hero (Above the fold)

**Tujuan**: hook visitor dalam 3 detik — tampilkan produk, USP, CTA.

**Struktur**:
```
┌──────────────────────────────────────────────────────────┐
│ [Eyebrow pill — cyan-teal bg, 12px]                       │
│ "🟢 8.270 LAYANAN AKTIF · SEMUA PLATFORM"                │
│                                                           │
│ [H1 — Sora bold 60px desktop / 36px mobile]              │
│ "Panel SMM #1 untuk Reseller & UMKM Indonesia"           │
│                                                           │
│ [Sub — 18-20px, ink-500, max-w-prose]                    │
│ "8.270 layanan, harga grosir, refill garansi 30 hari."    │
│                                                           │
│ [CTA group]                                               │
│ [Daftar Rp50rb →] [Lihat 8.270 Layanan →]                │
│                                                           │
│ [Hero mockup — dashboard live simulation]                │
│ ┌────────────────────────────────────────┐                │
│ │ Live order stream + saldo counter      │                │
│ │ Platform rotate 2.4s                   │                │
│ │ "Pesan #4827 — TikTok Views — +500"   │                │
│ └────────────────────────────────────────┘                │
└──────────────────────────────────────────────────────────┘
```

**Motion**:
- Hero load-sequence: eyebrow → H1 → USP → CTA → mockup, stagger 120ms tiap baris, blur-in 600ms.
- Mockup: live counter tweened + setInterval stream + platform rotate 2.4s.
- Scroll cue (down arrow) bounce.

**A11y**:
- H1 unik per halaman.
- Mockup: `role="img" aria-label="Simulasi dashboard Socio.id"` atau `aria-live="polite"` untuk stream.
- CTA: descriptive label.

**Acceptance**:
- LCP < 2.5s (mockup lazy load, critical CSS inline).
- Hero copy tidak wrap jelek (cek di 320px width).
- Mockup animasi jalan di reduced-motion (no infinite loop, just static state).

---

### 4.3 Section: ProviderProof (Trust band)

**Tujuan**: establish credibility — partner/provider logos + jumlah layanan.

**Struktur**:
```
[Inline-stat prose — bukan 4-col strip]
"1.240 order aktif · 8.270 layanan · 882 kategori · 42 detik"

Optional: provider logos (JAP/IRVAN/SMC/SMMturk) inline
```

**Anti-pattern gate**: ❌ no 4-col stat strip (looks generic). ✅ pakai inline-stat prose dengan divider.

---

### 4.4 Section: ProblemLedger (Pain)

**Tujuan**: emotional hook — "kamu pernah ngalamin ini?"

**Struktur**:
```
[H2 — Sora 30px]
"Masih Beli Followers Mahal Tanpa Garansi?"

[Ledger rows — hairline divide-y, flex justify-between]
| Masalah lama                      | Socio.id              |
| Followers turun tanpa refill       | Auto-refill 30 hari   |
| CS tidak responsif               | Live chat 24/7 WA     |
| Harga tidak transparan           | OrderSimulator live   |
| Pembayaran ribet                  | Tripay QRIS/VA/E-wallet|
```

**Motion**: rows fade + translate-y-2 stagger 80ms, IntersectionObserver.

---

### 4.5 Section: OrderSimulator (Conversion critical)

**Tujuan**: visitor lihat harga order tanpa login → trust + transparency.

**Struktur**:
```
[H2] "🧮 Simulasi Order — Cek Harga Tanpa Login"
[Sub] "Pilih jumlah, langsung lihat harga."

┌─────────────────────────────────────────────┐
│ [Slider Jumlah: 100 ──●──── 100.000]        │
│                                              │
│ Output (big chip):                           │
│ ┌─────────────────────────────────────┐     │
│ │ Estimasi: Rp 47.500                 │     │
│ │ Rp 475 / 1.000 × 100                │     │
│ │ Garansi refill 30 hari              │     │
│ └─────────────────────────────────────┘     │
│                                              │
│ [Toggle: ⚪ Mode Reseller]                   │
│  → on: + chip "Margin kamu: Rp 19.000 (~40%)"│
│  → on: + CTA "[Jadi Reseller →]"            │
│                                              │
│ [CTA Primary] "Lihat Semua Layanan →"        │
└─────────────────────────────────────────────┘
```

**Motion**:
- Slider drag → output count-up 600ms cubic-bezier(.16,1,.3,1).
- Toggle on → chip slide 250ms + CTA reveal 220ms delay 80ms.
- Initial mount → scale 0.95 → 1 + fade 280ms.

**State**:
- Reduced-motion: instant count, no slide.

**Detail**: `landing-redesign.md §11.2` (Motion Spec table) + `landing-redesign.md §11.3` (Copywriting block).

---

### 4.6 Section: OrderBoard (Live order stream public)

**Tujuan**: social proof — "orderan lagi masuk".

**Struktur**:
```
[Title] "Pesanan Masuk 5 Menit Terakhir"
[List rows — animate in/out]
- #4827 · TikTok Views · 1.000 · 2 menit lalu · "✅ Selesai"
- #4826 · Instagram Followers · 500 · 3 menit lalu · "⚡ Proses"
- #4825 · YouTube Subscribers · 100 · 4 menit lalu · "✅ Selesai"
```

**Motion**: new row fade-in dari top, 80ms stagger.

---

### 4.7 Section: KapabilitasBento

**Tujuan**: showcase breadth — 6 platform + 882 kategori.

**Struktur** (Bento grid):
```
┌──────────┬──────────┬──────────┐
│ Instagram│ TikTok   │ YouTube  │
│ 2.1k srv │ 1.8k srv │ 1.2k srv │
├──────────┼──────────┴──────────┤
│ Twitter  │    [Big card]      │
│ 890 srv  │    Premium chart   │
├──────────┼──────────┬──────────┤
│ Telegram │ Facebook│  Lainnya │
│ 450 srv  │ 320 srv │  1.5k srv│
└──────────┴──────────┴──────────┘
```

**Anti-pattern gate**: ✅ 4-col stat strip replacement = Bento grid (variance).

**Motion**: card entrance stagger 80ms + SVG line draw on chart card (1.2s ease-out-expo).

---

### 4.8 Section: HowItWorks

**Tujuan**: reduce friction — "gampang kok, 3 langkah".

**Struktur**:
```
[H2] "Cara Mulai Jadi Reseller"
[3 numbered steps + icon + description]
1. Daftar (Rp50.000 sekali)
2. Pilih Layanan (8.270 pilihan)
3. Pesan (auto-proses, refill otomatis)
```

**Motion**: step cards stagger + icon hover scale 1.05.

---

### 4.9 Section: TestiLedger

**Tujuan**: social proof testimonial.

**Struktur**:
```
[Title] "Kata Mereka"
[Ledger rows — avatar + quote + name + role]
| 🧑 "Saya reseller 2 tahun, Socio paling stabil"  | @budi_reseller      |
| 👩 "Order masuk 30 detik, refill otomatis"       | @sari_umkm         |
```

**Motion**: row fade stagger + avatar hover scale 1.05.

---

### 4.10 Section: PricingTable (Comparison)

**Tujuan**: transparan — bandingin tier reseller.

**Struktur**:
```
[H2] "Pilih Level Reseller"

┌──────────────┬──────────────┬──────────────┬──────────────┐
│ Member       │ Agen         │ Reseller     │ Admin        │
│ +0% markup   │ +10% markup  │ +25% markup  │ +40% markup  │
│ Rp 50        │ Rp 100       │ Rp 150       │ Rp 200       │
│ / 1.000      │ / 1.000      │ / 1.000      │ / 1.000      │
│              │              │ [POPULER]    │              │
│ [Daftar →]   │ [Daftar →]   │ [Daftar →]   │ [Daftar →]   │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

**Anti-pattern gate**: ❌ generic 3-tier pricing card tanpa isi berbeda. ✅ comparison table dengan spec konkret (markup %, harga, benefit).

**Motion**: card hover lift + shadow grow 200ms.

---

### 4.11 Section: FAQ + Variance

**Tujuan**: handle objection + reduce support load.

**Struktur**:
```
[H2] "Pertanyaan Sering Ditanya"
[Search input — filter FAQ]
[Featured top 2 — chip accent]
  🔥 Berapa minimal daftar?
  🤔 Aman nggak? Bisa refund?
[Regular accordion — 6 items]
[Bottom CTA] "Masih ada yang belum terjawab? Chat Tim Support 24/7 →"
```

**Motion**:
- Search focus → border accent + shadow 200ms.
- Featured chip entrance scale 0.95→1 + fade 280ms stagger 60ms.
- Accordion expand → max-height collapse + fade 220ms.
- Chevron rotate 180° saat open.

**A11y**: `role="region"` + `aria-labelledby` + `<input aria-describedby="faq-count">`.

---

### 4.12 Section: Footer

**Tujuan**: secondary nav + newsletter + brand trust + legal.

**Struktur**:
```
┌──────────────────────────────────────────────────────────┐
│ [Newsletter signup]                                       │
│ "📬 Tips SMM & reseller mingguan"                         │
│ [email input] [Daftar Newsletter →]                       │
│                                                           │
│ [Trust strip]                                             │
│ "Dipercaya 50.000+ reseller & UMKM"                       │
│                                                           │
│ [Footer columns]                                          │
│ Layanan │ Reseller │ Perusahaan │ Legal                   │
│ - Instagram - Daftar - Tentang - Privacy                  │
│ - TikTok    - Margin  - Blog     - Terms                   │
│ - YouTube   - Komisi - Karir    - Refund                  │
│ - ...       - ...     - Kontak   - ...                     │
│                                                           │
│ [Micro-copy bottom]                                       │
│ "🇮🇩 Dibuat di Indonesia · PT Cipta Multikarya Propertindo│
│  Berdiri 2019 · 50.000+ UMKM"                            │
└──────────────────────────────────────────────────────────┘
```

**Motion**:
- Newsletter submit success → check icon draw + bg fade green 400ms.
- Footer link hover → underline accent.

---

### 4.13 Element: StickyCTA (mobile only)

**Tujuan**: conversion CTA sticky di atas dock.

**Struktur**:
```
┌────────────────────────────────┐
│ [Daftar Rp50rb →]              │  ← 48px height, glass
└────────────────────────────────┘
   ↑ position: bottom 76px (above dock)
```

**States**:
- Visible by default di `/`, `/layanan`.
- Hidden di `/reseller` (sudah ada FinalCTA), `/beli-*` (sudah conversion page), `/blog/*` (read mode).
- Per page CTA priority logic → `landing/src/lib/cta-priority.ts`.

**Motion**: slide up 300ms on mount, slide down 200ms on hide.

---

## 5. Micro-Interaction Library

### 5.1 Spring Presets

```css
/* dock-pop — premium iOS feel, scale 0.82→1.12→1.02 */
@keyframes dock-pop {
  0%   { transform: scale(0.82) translateY(2px); }
  60%  { transform: scale(1.12) translateY(-2px); }
  100% { transform: scale(1.02) translateY(0); }
}
/* Trigger: aria-current change on dock item */

/* bounce-in — element mount */
@keyframes bounce-in {
  0%   { transform: scale(0.95); opacity: 0; }
  60%  { transform: scale(1.02); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
/* Trigger: chip, badge, sheet mount */

/* count-up — number animation */
.count-up {
  display: inline-block;
  animation: count-up 600ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
/* Trigger: OrderSimulator output, stat reveal */
```

### 5.2 Transition Presets

| Name | Spec | Use case |
|---|---|---|
| `transition-default` | 200ms ease-out-quart | hover state, color, bg |
| `transition-page` | 300ms ease-out-expo | padding, margin, layout shift |
| `transition-sheet` | 250ms cubic-bezier(.16,1,.3,1) | Sheet open/close |
| `transition-spring` | 420ms cubic-bezier(.34,1.56,.64,1) | dock-pop |
| `transition-view` | 90ms out + 210ms in | view transition cross-page |

### 5.3 Easing Cheatsheet

```
ease-out-expo   = cubic-bezier(0.16, 1, 0.3, 1)     — entrance, default
ease-out-quart  = cubic-bezier(0.25, 1, 0.5, 1)     — subtle
ease-in-out     = cubic-bezier(0.4, 0, 0.2, 1)      — state change
ease-spring     = cubic-bezier(0.34, 1.56, 0.64, 1) — bounce
```

**Rule**: Pakai `ease-out-expo` sebagai default. `ease-in-out` untuk toggle on/off. `ease-spring` hanya untuk delight moments (dock-pop, success).

### 5.4 Haptic Wrapper

```typescript
// landing/src/lib/haptic.ts
export function haptic(ms = 10): void {
  if (typeof navigator === 'undefined') return;
  if (!navigator.vibrate) return;
  navigator.vibrate(ms);
}

// Pattern: 6 = acknowledge only, 10 = tap, 14 = primary CTA, 18 = success, [10,50,10] = error
```

---

## 6. Component Patterns

### 6.1 Button

**Variants**:
- **Primary** (filled accent): `bg-accent-ink text-white px-5 py-2.5 rounded-full shadow-sm`
- **Secondary** (outlined): `border border-ink-200 text-ink-900 px-5 py-2.5 rounded-full hover:bg-ink-50`
- **Ghost**: `text-ink-700 px-3 py-2 rounded-lg hover:bg-ink-50`
- **Danger**: `bg-danger text-white px-5 py-2.5 rounded-full`

**Sizes**: sm (32px), md (40px), lg (48px), xl (56px).

**Motion**: hover `bg-accent-hover`, active `scale-[0.97]`, focus-visible ring 2px accent.

**A11y**: `<button>` atau `<a>` semantic, descriptive label, never icon-only without aria-label.

### 6.2 Card

**Variants**:
- **Static**: `bg-paper-2 border border-ink-200 rounded-xl p-4`
- **Interactive** (hover): tambah `transition-shadow hover:shadow-md cursor-pointer`
- **Glass**: tambah class `glass`

**Anti-pattern gate**:
- ❌ no shadow tanpa purpose (no card chrome bloat)
- ❌ no 3-tier pricing generik
- ✅ variance: ledger / bento / mockup / inline-stat

### 6.3 Badge

**Variants**:
- **Count**: `bg-danger text-ink-50 ring-2 ring-paper rounded-full min-w-[16px] h-[16px] text-[9px] font-bold`
- **Status**: `bg-success/15 text-success-ink rounded-full px-2 py-0.5 text-xs`
- **Eyebrow**: `bg-accent-oklch/15 text-accent-ink rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase`

**Anti-pattern gate**: badge budget ≤1 per section (eyebrow) + ≤1 per item (count).

### 6.4 Input

**States**:
- Default: `border border-ink-200 bg-paper rounded-lg px-3 py-2.5 text-base`
- Focus: `border-accent ring-2 ring-accent/20`
- Error: `border-danger ring-2 ring-danger/20` + `<p role="alert">` message
- Disabled: `bg-ink-50 text-ink-500 cursor-not-allowed`

**A11y**: `<label for>` always, error `aria-describedby`, never placeholder-only.

### 6.5 Sheet (Bottom-up modal)

**Spec**: slide from bottom, max 80vh, dismiss on backdrop tap, `role="dialog" aria-modal="true"`, focus trap.

**Motion**: 250ms cubic-bezier(.16,1,.3,1) translate-y-full → translate-y-0, backdrop fade 200ms.

**A11y**: Escape to close, focus return to trigger, scroll lock body.

### 6.6 Toast

**Spec**: top-right (desktop) / top-center (mobile), auto-dismiss 4s, dismiss on tap.

**Motion**: slide + fade 250ms, exit fade 200ms.

**A11y**: `role="status"` (info) / `role="alert"` (error), `aria-live="polite"`.

---

## 7. Asset Grid + Dimensions

### 7.1 Icon

- Source: Phosphor Icons (regular + bold), self-host SVG.
- Size: 16 / 20 / 24 / 32 px.
- Stroke: 1.5 (regular) / 1.9 (default) / 2.4 (active dock) / 2.8 (display).
- Color: currentColor (inherit text color).
- A11y: `aria-hidden="true"` kalau dekoratif, `aria-label` kalau informative.

### 7.2 Image

- Format: AVIF (primary, 50% smaller than WebP), WebP fallback, JPEG fallback.
- Lazy load: `loading="lazy"` + `decoding="async"` (except hero LCP).
- Responsive: `srcset` + `sizes`, `astro:assets` `<Image>` component.
- Hero mockup: PNG/SVG inline (no external load delay).
- Blog: featured 1200×630 (OG ratio), inline 800×450.

### 7.3 Logo

- SVG inline, 2 versi: full ("socio.id") 28px height, mark-only 24px height.
- Color: `text-ink` untuk "socio" + `text-accent-ink` untuk ".id".
- Min clear-space: 1× cap-height di semua sisi.
- Min size: full 80px wide, mark 24px wide.

### 7.4 Mockup

- Source: live (HeroMockup.svelte) atau screenshot (case study).
- Live: HTML+CSS animated, no static image.
- Screenshot: 1440×900 max, JPEG quality 80, max 200KB.

---

## 8. Copy Rules

### 8.1 Voice

- **Ramah, profesional, tidak berlebihan**.
- Pakai "kamu" (bukan "Anda" — too formal untuk SMM).
- Hindari jargon tanpa penjelasan ("API endpoint" → "API endpoint (koneksi otomatis ke sistem kamu)").
- Emoji: boleh, jangan lebih dari 1 per baris, jangan sebagai pengganti kata.

### 8.2 Length

- Heading: max 8 kata.
- Sub-heading: max 16 kata.
- Body: max 20 kata per kalimat.
- CTA label: 2-4 kata + arrow ("Daftar Rp50rb →", "Lihat Layanan →").

### 8.3 Terminology

| Pakai | Jangan |
|---|---|
| Saldo | Balance |
| Pesanan | Order |
| Layanan | Service (kecuali konteks API) |
| Reseller | Dropshipper (terlalu generic) |
| Refill | Top-up ulang (ambigu dengan deposit) |
| Margin | Profit, Keuntungan |
| Markup | Mark-up price |

### 8.4 Number Format

- IDR: `Rp 50.000` (titik sebagai ribuan, no decimal).
- Quantity: `1.000` (titik) atau `1K`/`100rb` di inline.
- Percentage: `40%` (no space).
- Time: `30 detik`, `5 menit`, `2 jam` (lowercase).

---

## 9. Accessibility Rules (WCAG 2.1 AA)

### 9.1 Contrast

- Text normal: 4.5:1 minimum.
- Text large (≥18px bold / ≥24px regular): 3:1 minimum.
- UI components (button border, focus ring): 3:1 minimum.
- Button fill pakai `--accent-ink` (L=0.45) supaya white text di atasnya 4.7:1.

### 9.2 Focus

- Visible focus ring 2px accent/30 + ring-offset 2px paper.
- Tidak pernah `outline: none` tanpa replacement.
- Logical tab order: visual order = DOM order.

### 9.3 Motion

- Respect `prefers-reduced-motion: reduce` (lihat §1.4).
- Tidak ada infinite animation tanpa pause (auto-pause on hover/tap).
- Tidak ada parallax > 1.5× (motion sickness).

### 9.4 Screen Reader

- `<nav aria-label="...">` per nav region.
- Icon-only button: `aria-label` wajib.
- Image: `alt` (atau `alt=""` kalau dekoratif).
- Live region: `aria-live="polite"` untuk non-urgent update, `"assertive"` untuk urgent (rare).
- Skip link: `<a href="#main-content" class="sr-only focus:not-sr-only">Skip to main content</a>`.

### 9.5 Tap Target

- Minimum 48×48px (recommended 48×52px untuk bottom dock).
- Spacing antar tap target: minimal 8px gap.

---

## 10. Brand Guidelines

### 10.1 Logo Usage

- ✅ Gunakan logo full di header/footer, mark di dock/favicon.
- ✅ Minimum size 80px (full) / 24px (mark).
- ✅ Clear-space 1× cap-height di semua sisi.
- ❌ Jangan ubah warna logo (selain yang di-spesifik).
- ❌ Jangan rotate, skew, atau stretch.
- ❌ Jangan taruh di atas pattern/image yang terlalu busy.

### 10.2 Color Usage

- Cyan-teal accent: CTA, link, focus, badge informational.
- Dark ink (ink-900): heading, body text.
- Ink-500: secondary text, caption, label.
- Ink-200: hairline, divider, border.
- Paper: background.
- Paper-2: card bg, table row alt.

### 10.3 Do / Don't

| ✅ Do | ❌ Don't |
|---|---|
| Glass morphism (token-driven) | Hardcode `bg-white/75` |
| Floating dock (1-tap reach) | Hamburger menu |
| Inline-stat prose | 4-col stat strip generik |
| Ledger rows (hairline divide-y) | Card chrome bloat |
| Bento grid (variance) | 3-col card identical |
| Spring bounce (dock-pop) | Instant state swap |
| Haptic feedback | No tactile response |
| View transition (cross-page hold) | Hard navigation blink |
| Real imagery (mockup, blog) | Lorem ipsum placeholder |
| Plus Jakarta + Sora | Inter default |

---

## 11. Implementation Checklist (Per Component)

Untuk setiap component baru, verify sebelum bilang "selesai":

- [ ] Pakai design token (no literal color/spacing)
- [ ] Glass component pakai class `glass` (no literal)
- [ ] Tap target ≥ 48px
- [ ] A11y: semantic HTML + aria-label + focus ring
- [ ] Motion: transform/opacity only (no layout anim)
- [ ] Reduced-motion respected
- [ ] Reduced-motion visible fallback (no missing state)
- [ ] Bundle < budget (component delta tracked)
- [ ] Visual regression test (390×844 + 768×1024 + 1440×1000)
- [ ] Lighthouse mobile ≥ 90 (kalau component di landing page)
- [ ] Lint + astro check pass
- [ ] Cross-link update di `landing-redesign.md` phase tracker

---

## 12. Cross-Reference

### 12.1 Phase Plan → Wireframe Section

| Phase | Section di Wireframe | File perubahan utama |
|---|---|---|
| L1 — Hero fix + mockup polish | §4.2 | `HeroMockup.svelte`, `index.astro` |
| L2 — Trust band + provider proof | §4.3 | `SmmProviderProof.svelte`, `index.astro` |
| L3 — Problem ledger + visual | §4.4 | `ProblemLedger.svelte` |
| L4 — OrderSimulator transparency | §4.5 + §3 (OrderSimulator section) | `OrderSimulator.svelte` (Mode Reseller toggle) |
| L5 — Mobile Floating Premium Dock | §3 (full detail) | `FloatingTabDock.svelte` REWRITE, `glass.css`, `haptic.ts` |
| L6 — Animation audit + 13 spec | §5 (Micro-interaction Library) | per-component motion |
| L7 — FAQ variance + footer retention | §4.11 + §4.12 | `Faq.svelte`, `Footer.astro`, `NewsletterSignup.svelte` |
| L8 — Blog integration | — (existing) | `blog/*`, `NextArticleDock.svelte` |
| L9 — Money pages SEO | — (existing) | 10 money pages H1 + schema |
| L10 — Performance + CWV | §2 (Breakpoints) + §7 (Asset) | per-component lazy load |

### 12.2 Component Library Map

| Component | Path | LOC | Used by |
|---|---|---|---|
| Navbar | `landing/src/components/Navbar.svelte` | 53 | All pages (sticky top) |
| FloatingTabDock | `landing/src/components/FloatingTabDock.svelte` | 123 → 180 | All pages (mobile only) |
| StickyCTA | `landing/src/components/StickyCTA.svelte` | 37 | Home, Layanan (mobile only) |
| HeroMockup | `landing/src/components/HeroMockup.svelte` | 323 | Home hero |
| OrderSimulator | `landing/src/components/OrderSimulator.svelte` | 207 | Home (above fold → conversion) |
| OrderBoard | `landing/src/components/OrderBoard.astro` | ~120 | Home (social proof) |
| KapabilitasBento | `landing/src/components/KapabilitasBento.astro` | ~150 | Home (showcase breadth) |
| HowItWorks | `landing/src/components/HowItWorks.svelte` | ~80 | Home / Layanan |
| TestiLedger | `landing/src/components/TestiLedger.astro` | ~100 | Home |
| PricingTable | `landing/src/components/PricingTable.astro` | ~150 | Home / Reseller |
| Faq | `landing/src/components/Faq.svelte` | ~120 | Home (objection handler) |
| Footer | `landing/src/components/Footer.astro` | ~150 | All pages |
| FloatingWhatsApp | `landing/src/components/FloatingWhatsApp.svelte` | ~30 | All pages (chat trigger) |
| NextArticleDock | `landing/src/components/NextArticleDock.svelte` | ~80 | Blog single |

### 12.3 Reference

- User dashboard premium dock: `packages/ui/src/components/BottomNav.svelte` (113 LOC) → paritas target.
- Glass token: `packages/ui/src/components/glass.css` (atau `landing/src/styles/glass.css` lokal).
- Haptic util: `packages/ui/src/haptic.ts` (port ke `landing/src/lib/haptic.ts`).
- View transition: `app/src/routes/+layout.svelte` (cross-fade pattern).
- Design tokens: `docs/DESIGN.md` §1 (palette OKLCH), §2 (typography).
- Motion contract: `docs/MOBILE_UX_GUIDE.md` (spring + ease curves).

---

## 13. Update History

- **4 Sep 2026** — Initial wireframe doc created. Phase L5 (Mobile Floating Premium Dock) rewritten untuk paritas dengan BottomNav app.
- **Future**: update per phase execution (L1-L10), visual regression screenshots, accessibility audit results.
