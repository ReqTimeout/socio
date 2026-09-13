# LANDING V2 "PLAYFUL PREMIUM" — WIREFRAME DETAIL

> Pendamping `docs/LANDING_V2_PLAYFUL_PLAN.md` (baca plan dulu — spec copy/motion/SEO ada di sana).
> Notasi: `[CTA]` tombol · `«A1»` id animasi (plan §4.2) · `→ /route` link · `🖼` gambar asli · angka spasi dalam px.
> Breakpoint: mobile 360 (utama), tablet 768, desktop 1280. Grid desktop: max-w-6xl (1152) px-8.
> Semua section reserve tinggi tetap (CLS 0). Chrome sticker max 4 besar/halaman (plan §2.3).

---

## 1. HOME `/`

### 1.0 Urutan section (final)

```
1 Navbar        2 Hero           3 LiveTicker      4 MasalahKamu
5 OrderSimulator 6 PlatformBento 7 HowItWorks      8 TestiWall
9 PricingTable  10 ResellerBand  11 FAQ            12 FinalCTA   13 Footer
Floating: StickyCTA (mobile) · FloatingTabDock · FloatingWhatsApp · LiveOrderToast (desktop)
```

---

### 1.1 Navbar «A14»

```
DESKTOP 1280 (h 72 → 56 scrolled, bg paper/85 blur saat scrolled)
┌────────────────────────────────────────────────────────────────────────────┐
│ ✈ socio.id   Layanan  Reseller  Blog  Harga  FAQ      [Masuk] [Daftar Reseller]│
│ ↑maskot wiggle 1× load                          ghost ↑   ↑ accent-ink «A8» │
└────────────────────────────────────────────────────────────────────────────┘
MOBILE 360 (h 56)
┌──────────────────────────┐
│ ✈ socio.id          [≡]  │  ≡ → off-canvas: link + CTA daftar (focus-trap, Esc)
└──────────────────────────┘
```

---

### 1.2 Hero (load-sequence `.hero-seq-0..5`, stagger 90ms)

```
DESKTOP 1280 — grid 12 col: copy 5 | visual 7, py 160/96
┌──────────────────────────────────────────────────────────────────────────────┐
│ · · · · · (grid titik halus bg + sweep mango opacity .06)  · · · · ·         │
│                                                                              │
│  [● live] 8.270 layanan aktif · semua platform        ←eyebrow (1 saja/hal)  │
│                                                                              │
│  SMM Panel Indonesia yang bikin            ┌─────────────────────────────┐   │
│  sosmed kamu ▔terlihat ramai▔ «A11»,       │ ✦ sticker frame tilt +2°    │   │
│  dompet tetap aman.          ←H1 Sora 64   │ ┌───────────────────────┐   │   │
│                                            │ │  MOCKUP DASHBOARD     │   │   │
│  8.270 layanan Instagram, TikTok, YouTube, │ │  (HeroMockup + layar  │   │   │
│  Telegram & lainnya. Daftar reseller       │ │   OrderBoard live «») │   │   │
│  Rp50.000 sudah termasuk saldo Rp20.000 —  │ └───────────────────────┘   │   │
│  langsung order, otomatis 24 jam,          │   ╭──────────────────╮      │   │
│  garansi refill 30 hari.  ←lead 18px       │   │"sekali klik,     │ ←doodle│  │
│                                            │   │ order jalan ✦"   │  tangan │  │
│  ╔═ NOTA WARUNG (sticker, tilt -1°) ════╗  │   ╰──────────────────╯ «A10»  │   │
│  ║ Daftar reseller      Rp50.000 sekali║  │      ┌────┐ ┌───┐ ←sticker    │   │
│  ║ Saldo langsung masuk Rp20.000      ║  │      │ ❤  │ │ ▶ │  kecil float │   │
│  ║ Harga layanan        Grosir reseller║  │      └────┘ └───┘  «A10+A15»   │   │
│  ║ Katalog              8.270 · 882 kat║  └─────────────────────────────┘   │
│  ║ Proses               Otomatis 24 jam║                                    │
│  ╚═════════════════════════════════════╝   ←dl existing, restyle «A1»        │
│                                                                              │
│  [ Daftar Reseller Rp50rb → ]  [ Intip 8.270 Layanan ]                       │
│    accent-ink «A8» magnetik      outline paper                               │
│  ○○○ (3 avatar polaroid mini) Dipakai ribuan reseller & UMKM  ←wording D-4   │
│  Sekali bayar · tanpa password · garansi refill 30 hari                      │
└──────────────────────────────────────────────────────────────────────────────┘

MOBILE 360 — urutan: eyebrow → H1 (40px) → lead → CTA stack → nota → mockup
┌────────────────────────┐
│ [● live] 8.270 layanan │
│ SMM Panel Indonesia    │
│ yang bikin sosmed kamu │
│ ▔terlihat ramai▔,      │
│ dompet tetap aman.     │
│ 8.270 layanan IG, TikTok│
│ YouTube… garansi refill│
│                        │
│ [Daftar Reseller Rp50rb]│ ← full-width min-h 52 (thumb reach)
│ [Intip 8.270 Layanan  ] │
│ ○○○ ribuan reseller    │
│ ╔ NOTA (5 baris) ════╗ │
│ ╚════════════════════╝ │
│ ┌────────────────────┐ │
│ │ mockup sticker     │ │ ← tilt +2°, scale 92%, mt 24
│ │ + doodle + floaters│ │
│ └────────────────────┘ │
└────────────────────────┘
```

Copy persis & alternatif H1: plan §5.2 (D-5). Keyword "SMM Panel Indonesia" wajib di H1.

---

### 1.3 LiveTicker (strip baru)

```
FULL WIDTH h 44 — bg --dark-panel, text --on-dark, «A5» marquee 40s linear, pause on hover
┌──────────────────────────────────────────────────────────────────────────────┐
│ ✓ Budi·Bandung order 1.000 IG Followers · 2 mnt lalu   ✓ Sari·Surabaya order…│
└──────────────────────────────────────────────────────────────────────────────┘
  ↑ item dari data build-time (OrderBoard snapshot). JANGAN fetch runtime.
DESKTOP only: LiveOrderToast «A12» kiri-bawah (di atas dock), 1/25-40s jitter, max 3,
              stop jika scroll >60% / reduced-motion.
┌───────────────────────────┐
│ ✓ Order masuk             │  ← kartu kecil dark-panel, border mango 1px,
│ 1.000 TikTok Views · Solo │    auto-dismiss 4s
└───────────────────────────┘
```

---

### 1.4 MasalahKamu (chat bubble WA — ProblemLedger restyle)

```
bg --paper-warm, py 96/64
        H2: Jualan jasa sosmed itu gampang. ▔Panelnya▔ «A11» yang kadang bikin elus dada.

DESKTOP — 2 kolom asimetris (7|5): kiri 3 pasang bubble, kanan foto+caption
┌──────────────────────────────────────────────┬───────────────────┐
│        ╭─────────────────────────────╮       │                   │
│        │ "Order manual terus, klien  │       │      🖼 96px      │
│        │  rewel nanyain progres 😮‍💨"  │ ←bubble│   (duotone mango) │
│        ╰─────────────────────────────╯  putih│  "Rina, reseller  │
│ ╭─────────────────────────────╮              │   Jakarta"        │
│ │ ✓ Order otomatis 24 jam.    │ ←bubble      │                   │
│ │   Klien tanya? Kirim link   │  accent-tint │  (muncul terakhir,│
│ │   tracking.                 │  + ✓ hijau   │   «A1» +150ms)    │
│ ╰─────────────────────────────╯              │                   │
│        ╭─────────────────────────────╮       │                   │
│        │ "Followers drop, klien ngamuk│       │                   │
│        │  reputasi taruhannya"       │       │                   │
│        ╰─────────────────────────────╯       │                   │
│ ╭─────────────────────────────╮              │                   │
│ │ ✓ Layanan refill 30 hari —  │              │                   │
│ │   drop diisi ulang otomatis.│              │                   │
│ ╰─────────────────────────────╯              │                   │
│        …pasangan ke-3 (harga transparan) …   │                   │
└──────────────────────────────────────────────┴───────────────────┘
«A2» tiap bubble pop-in berurutan (seperti chat masuk), delay 150ms.
MOBILE: 1 kolom, foto pindah ke atas heading (64px inline, kiri).
```

---

### 1.5 OrderSimulator (centerpiece gamified)

```
bg white, py 96 — kartu simulator = STICKER CARD #1 (border 2px ink, shadow 4px, radius 28)
   H2: Coba dulu, GRATIS. Rasain gampangnya.
   sub: Ini simulasi — order benerannya bahkan lebih gampang.

┌────────────────────────────────────────────────────────────────────┐
│ 1│ PILIH PLATFORM     «A2» chip squishy saat dipilih                │
│  (IG✓) (TikTok) (YouTube) (Telegram) (X) (Spotify) (FB) (…)         │
│                                                                    │
│ 2│ PILIH LAYANAN      (select/datalist dari prices.json)            │
│  ┌──────────────────────────────────────────┐                      │
│  │ Instagram Followers — refill ✓           ▾│                     │
│  └──────────────────────────────────────────┘                      │
│                                                                    │
│ 3│ JUMLAH             slider + input angka                          │
│  500 ────────●────────────────── 100.000      tick: 1k/5k/10k/50k  │
│  [ 1.000 ]  ← input langsung, .num                                 │
│                                                                    │
│ ┌──────────────────────────────────────────────┐                   │
│ │ Estimasi biaya        Rp7.395  «A4» roll      │  ← hasil sticky   │
│ │ [Harga Reseller ○──]  ON: Rp7.395 ~~Rp7.868~~ │    di bottom      │
│ │                       badge mango "hemat"«A2» │    (mobile)       │
│ │ Mulai proses: < 1 menit setelah saldo masuk   │                   │
│ └──────────────────────────────────────────────┘                   │
│ [ Coba Pesan → ] «A9» confetti + toast: "Order #SOC-82xx masuk!"    │
│  label jujur kecil: "simulasi ya, belum order beneran 🙂"           │
│  link kontekstual: "Beli followers Instagram mulai Rp7.395/1k →"   │
│                    → /beli-followers-instagram  (mesh)             │
└────────────────────────────────────────────────────────────────────┘
DESKTOP: 2 kolom dalam kartu — form kiri (7), panel hasil kanan (5, sticky).
MOBILE: 1 kolom; panel hasil jadi bar sticky bottom di dalam kartu.
A11y: slider = input[type=range] native; hasil aria-live="polite"; chip = <button aria-pressed>.
```

---

### 1.6 PlatformBento (KapabilitasBento restyle)

```
bg --paper, py 96 — H2: Satu panel, semua platform yang kamu jualan.
DESKTOP grid 4×2 asimetris (tile besar span 2):
┌───────────────┬───────────────┬────────────┬────────────┐
│ ▣ Instagram   │ ♪ TikTok      │ ▶ YouTube  │ ✈ Telegram │
│ 1.662 layanan │ 1.527 layanan │ 876        │ 1.078      │ ← «A4» counter
│ (tile besar,  │ (tile besar,  ├────────────┼────────────┤   saat reveal
│  foto duotone │  foto duotone │ 𝕏 544      │ f Facebook │
│  creator)     │  kreator)     ├────────────┤ 759        │
├───────────────┴───────────────┤ ♫ Spotify  ├────────────┤
│ ✎ doodle tile: "+ SEO & lain- │ 273        │ Lainnya    │
│   nya — 882 kategori total"   │            │ 1.551      │
│   panah tulisan tangan «A10»  │            │            │
└───────────────────────────────┴────────────┴────────────┘
hover tile: «A7» tilt 2° + ikon bounce 1×. klik → /layanan?platform=X
MOBILE: grid 2 col (tile besar full-width), doodle tile terakhir.
```

---

### 1.7 HowItWorks — roadmap line-draw «A6»

```
bg --paper-warm, py 96 — H2: Mulai dalam 3 langkah. Serius, sesimpel itu.
DESKTOP: jalur SVG horizontal berkelok, stroke --ink 3px, dashoffset mengikuti scroll
     ✈maskot terbang ke ujung saat draw selesai «A2»+«A10»
   ●───────────────╮
  (1)               ╰────●──────────╮
 ┌──────────┐          (2)          ╰────● ✈
 │ DAFTAR   │        ┌──────────┐       ┌──────────┐
 │ form 1   │        │ TOP UP   │       │ ORDER    │
 │ menit.   │        │ transfer/│       │ pilih    │
 │ Rp50rb = │        │ QRIS(se- │       │ layanan, │
 │ saldo    │        │ gera).   │       │ tempel   │
 │ 20rb.    │        │ otomatis │       │ link,klik│
 └──────────┘        └──────────┘       └──────────┘
  kartu pos = sticker chrome #2 (kecil-kecil, tilt selang-seling ±1°)
MOBILE: jalur vertikal di kiri (x=24), kartu di kanan; draw on scroll tetap.
Tiap pos max 2 baris (anti-pattern #1). Tanpa bullet.
```

---

### 1.8 TestiWall (polaroid + chat — human touch puncak)

```
bg white, py 96 — H2: Kata mereka yang udah duluan ▔cuan▔ «A11»
DESKTOP: kiri = 2 kolom marquee vertikal «A5» (h 480, mask fade atas-bawah, pause hover)
         kanan = 3 polaroid terserak
┌──────────────────────────────┬──────────────────────┐
│ ╭──────────────────────────╮ │    ┌────────────┐    │
│ │ "Order 5k followers klien│ │    │ 🖼 foto    │    │ ← polaroid: border
│ │  olshop, jalan 10 menit. │ │    │  (tilt -3°)│      putih 8px, sticker
│ │  Drop 200, refill oto-   │ │    ├────────────┤      shadow, «A7» hover
│ │  matis tanpa ditagih ✓✓" │ │    │"klien pertama│    │
│ │  — Rina · Reseller IG    │ │    │ dari TikTok"│   │
│ ╰──────────────────────────╯ │    └────────────┘    │ ← caption tulisan
│ ╭──────────────────────────╮ │  ┌────────────┐      │   tangan (D-2)
│ │ "API-nya rapi. 20 klien  │ │  │ 🖼 (tilt+2°)│     │
│ │  satu dashboard, invoice │ │  └────────────┘      │
│ │  ekspor beres ✓✓"        │ │   ┌────────────┐     │
│ │  — Agus · Agency Surabaya│ │   │ 🖼 (tilt-1°)│    │
│ ╰──────────────────────────╯ │   └────────────┘     │
└──────────────────────────────┴──────────────────────┘
MOBILE: 1 kolom marquee (h 420) + polaroid horizontal scroll-snap row (3 kartu).
⚠ konten = testimoni RIIL dari owner; sebelum ada → placeholder + TODO (plan §5.8).
```

---

### 1.9 PricingTable (toggle member/reseller)

```
bg --paper, py 96 — H2: Harga grosir, terbuka. Gak ada harga "kontak admin".
toggle:  ( Member | ●Reseller )  pill switch «A2» — default RESELLER
┌──────────────────────────────────────────────────────────────────────┐
│ Layanan            │ Min. order │ Member/1k │ Reseller/1k │ Refill    │ ← header th sticky (desktop)
│ Instagram Followers│ 100        │ Rp7.395   │ Rp6.902 ◆   │ ✓ 30 hari │   kolom aktif: bg mango-soft
│ TikTok Followers   │ …          │ …         │ …           │ ✓         │
│ Twitter Tweet Views│ 100        │ Rp48      │ Rp45        │ –         │ ← 8-10 baris prices.json top[]
│ …                  │            │           │             │           │   row hover: bg paper-warm +2px x
└──────────────────────────────────────────────────────────────────────┘
baris mesh (link keyword, bukan bullet):
  Beli followers Instagram mulai Rp7.395/1k → · Jasa viewers TikTok → · Beli Spotify plays → · +7 lainnya
[ Lihat semua 8.270 harga → /layanan ]
MOBILE: tabel scroll-x (kolom Refill merge ke badge di nama layanan), toggle sticky atas tabel.
```

---

### 1.10 ResellerBand (inverted)

```
bg --dark-panel full-bleed, py 96 — text --on-dark
┌──────────────────────────────────────────────────────────────────────┐
│  Modal Rp50 ribu,            │   ┌──────────────────────────┐        │
│  mulai bisnis jasa           │   │ KARTU RESELLER (mockup)  │        │
│  sosmed hari ini.            │   │ ✈ SOCIO RESLLER          │ ←sticker│
│                              │   │ Rina · sejak 2026        │  tilt   │
│  saldo awal Rp20.000      ✓  │   │ ████ ████ 20K            │  «A10» │
│  harga grosir semua layanan ✓│   └──────────────────────────┘        │
│  API + dashboard            ✓│                                       │
│  affiliate 2% seumur hidup  ✓│  ← ledger on-dark 4 baris (bukan card)│
│                              │                                       │
│  [ Ambil Slot Reseller → ] «A9» confetti on click → app…/daftar?mode=reseller
└──────────────────────────────────────────────────────────────────────┘
MOBILE: copy dulu, kartu di bawah (h 160), CTA full-width + StickyCTA tetap muncul.
```

---

### 1.11 FAQ «A13»

```
bg white, py 96 — max-w-3xl — H2: Masih ragu? Wajar. Nih jawaban jujur.
┌──────────────────────────────────────────────────────┐
│ ▾ Aman gak sih beli followers? (terbuka default)     │
│   Jawab 40-60 kata, jujur: tanpa password, gradual,  │ ← AEO block + FAQPage schema
│   risiko drop ada di platform manapun → refill.      │
│ ▸ Berapa lama prosesnya?                             │
│ ▸ Followers bisa drop?                               │
│ ▸ Bedanya member & reseller?                         │
│ ▸ Bayarnya pakai apa? (BCA manual; QRIS segera)      │
│ ▸ Bisa pakai API untuk klien?                        │
│ ▸ Kalau ada masalah, lapor ke siapa? (tiket+WA 24/7) │
└──────────────────────────────────────────────────────┘
  Masih ada yang mengganjal? Chat manusia beneran via WA — dibalas, bukan bot. [💬 WA]
```

---

### 1.12 FinalCTA + Footer

```
FinalCTA — bg --paper-warm, py 96, center:
        ✈ maskot lambai «A10»
        H2: Siap bikin sosmed-mu (dan klienmu) bahagia?
        [ Daftar Reseller Rp50rb → ] «A8»   ← CTA tunggal
        sekali bayar · saldo 20rb langsung masuk · garansi refill 30 hari

Footer — bg --dark-panel:
┌──────────────────────────────────────────────────────────────────────┐
│ ✈ socio.id          LAYANAN (10 money pages)   PANDUAN    LEGAL      │
│ Panel SMM Indonesia Beli followers Instagram   Blog       S&K       │
│ harga grosir +      Jasa viewers TikTok        Reseller   Privasi   │
│ garansi refill.     Beli Spotify plays         API docs   Refund    │
│                     +7 lainnya →               Bantuan              │
│ [logo payment: BCA · QRIS(segera) · Tripay]                          │
│ © 2026 socio.id · Dibuat oleh manusia (dibantu mesin) di Indonesia 🇮🇩│
└──────────────────────────────────────────────────────────────────────┘
```

### 1.13 Floating layer (mobile 360)

```
┌────────────────────────┐
│ Navbar 56              │ sticky
│                        │
│  konten                │
│                        │
│ ┌────────────────────┐ │ StickyCTA: [Daftar Reseller Rp50rb] muncul
│ │ StickyCTA          │ │ setelah hero lewat; hide saat footer terlihat
│ ├────────────────────┤ │
│ │ FloatingTabDock    │ │ dock existing (Home·Layanan·Reseller·Blog·Harga)
│ └────────────────────┘ │ auto-hide on scroll-down (sudah ada)
│              (💬 WA)   │ FloatingWhatsApp kanan-bawah, di atas dock
└────────────────────────┘
safe-area: env(safe-area-inset-bottom) di dock + StickyCTA. z-index: dock 40 < sticky 45 < toast 50.
```

---

## 2. `/layanan` (katalog)

```
MOBILE 360                              DESKTOP 1280
┌────────────────────────┐   H1: 8.270 Layanan SMM — Harga Live, Tanpa Kode Promo Palsu.
│ ← H1 + sub 1 kalimat   │   sub: Harga update otomatis dari provider. Toggle harga reseller
│ 🔍 [cari layanan…   ]  │        buat lihat margin cuanmu. (search kanan atas, w 360)
│ chip: (Semua✓)(IG)(TT) │   ┌────────────────────────────────────────────────────────┐
│ (YT)(TG)(X)(Spotify)…  │   │ Layanan           │ Min  │ Member │ Reseller │ Refill │Pesan│
│ «A2» squishy, scroll-x │   │ Instagram Followers│ 100 │ Rp7.395│ Rp6.902  │ ✓     │[→] │
├────────────────────────┤   │ … 25 baris/page, pagination atau infinite (existing)    │
│ kartu layanan:         │   └────────────────────────────────────────────────────────┘
│ ┌────────────────────┐ │   toggle ( Member | ●Reseller ) di atas tabel «A2»
│ │ IG · Followers ✓ref│ │   sidebar kiri (desktop): kategori populer + link money pages
│ │ min 100            │ │   (mesh): "Panduan: beli followers IG →", "jasa viewers TikTok →"
│ │ Rp7.395 /1k        │ │   empty state: ✈ maskot jatuh pelan «A10» +
│ │ [Pesan →app]       │ │   "Gak ketemu? 882 kategori kadang bikin pusing sendiri. Chat kami →"
│ └────────────────────┘ │
│ … list «A1» stagger    │
│ └ dock existing        │
└────────────────────────┘
```

---

## 3. `/reseller` (money page — skin V2, struktur ikut `docs/RESELLER_PAGE_SPEC.md`)

```
1. Hero reseller: H1 "Reseller SMM Panel — modal Rp50 ribu, cuan mulai hari pertama"
   + nota sticker (isi offer §5.2 plan) + CTA + foto orang (duotone) «A1»
2. Kalkulator cuan (ProfitCalculator upgrade): input harga jual klien & jumlah order/bulan
   → hasil profit «A4» + «A9» confetti saat profit > 0. Label: "estimasi, hasil tergantung usahamu 🙂"
3. "Cocok buat kamu kalau…" — 3 sticker card persona (Rina/Bagas/Agus, chrome #2-4) «A7»
4. Tabel hak Member vs Reseller (<table>, kolom reseller highlight mango-soft)
5. Cara daftar 3 langkah (pola roadmap HowItWorks, versi mini)
6. Testi reseller (2 polaroid + 1 chat)
7. FAQ reseller + FAQPage schema (dari spec existing)
8. CTA band inverted (pola ResellerBand)
```

---

## 4. `/beli-*` (template 10 money pages — `BeliPage.astro`)

```
breadcrumb: Home › Layanan › Beli Followers Instagram  «A1» (BreadcrumbList schema)
┌──────────────────────────────────────────────┐
│ H1 = keyword (beli-pages.ts, JANGAN ubah)    │
│ heroSub + harga live serviceMatch «A4»:      │
│   "Instagram Followers mulai Rp7.395/1k"     │
│ [Daftar & Pesan →app] [Simulasi dulu →#sim]  │
│ ╭ doodle anotasi (1/halaman, D-2):           │
│ │ "tanpa password, link doang ✦"             │
│ ╰────────────────────────────────────────────│
│ 3 reasons (ledger ✓ — data existing)         │
│ tabel harga mini (member/reseller toggle)    │
│ OrderSimulator versi mini (preselect layanan │
│   sesuai serviceMatch, anchor #sim)          │
│ cross-sell chips «A2» (3 slug existing)      │
│ FAQ (5 item existing) «A13» + FAQPage schema │
│ CTA band                                     │
└──────────────────────────────────────────────┘
```

---

## 5. `/blog` + `/blog/[slug]`

```
INDEX MOBILE                          SINGLE MOBILE
┌────────────────────────┐  ┌────────────────────────┐
│ H1: Belajar Jualan     │  │ ▔▔▔▔ progress bar baca │ ← scaleX scroll-linked (transform)
│ Jasa Sosmed (bukan     │  │ H1 artikel (Sora 28)   │
│ "Blog")                │  │ meta: tanggal · 5 mnt  │
│ ┌────────────────────┐ │  │ baca · cluster tag     │
│ │🖼 FEATURED polaroid│ │  │ 🖼 hero duotone        │
│ │ tilt -2° «A7»      │ │  │ ─────────────────────  │
│ ├────────────────────┤ │  │ prose 68ch PJS 18px    │
│ │🖼 kartu 2 (thumb   │ │  │ H2/H3, AEO block,      │
│ │ duotone, hover tilt)│ │  │ tabel/ledger          │
│ └────────────────────┘ │  │ ┌ CTA band di tengah ┐ │
│ … grid 2 col mobile,   │  │ │ coba di socio.id → │ │
│ 3 col desktop          │  │ └────────────────────┘ │
│ NextArticleDock (ada)  │  │ author card: 🖼 + ttd  │
└────────────────────────┘  │ tangan (D-2)           │
                            │ artikel terkait (mesh) │
                            │ CTA akhir + FAQ mini   │
                            └────────────────────────┘
```

---

## 6. `/404`

```
        ✈ …parasut… «A10» float turun pelan (maskot jatuh, SVG)
        H1: 404 — Waduh, halaman ini terbang entah ke mana.
        sub: Mungkin linknya typo, atau halamannya udah pensiun.
        [🔍 cari layanan]  atau lewat sini aja:
        Beranda → · 8.270 Layanan → · Reseller → · Beli Followers IG → · Jasa Viewers TikTok →
```

---

## 7. Checklist visual per halaman (sebelum bilang "selesai")

- [ ] Screenshot pw-vision 360×640 / 768 / 1280 → `docs/screenshots/landing-v2/{route}-{vp}.png`
- [ ] Sticker chrome besar ≤ 4 · eyebrow pill ≤ 1 · bullet ≤5/section · chrome patterns ≥ 3
- [ ] Semua «A-id» punya fallback reduced-motion (plan §4.1)
- [ ] CLS 0 (verifikasi DevTools), LCP hero < 2.5s (4G throttle)
- [ ] Kontras AA: teks di mango (ink), dark-panel (on-dark), accent-ink (white) — cek tool
- [ ] Tidak ada horizontal overflow di 320px (grid min-w-0 — AGENTS.md §5)
- [ ] Link mesh ≥ 3 kontekstual; tidak ada href 404 (api-docs/blog hidup — B-05)
