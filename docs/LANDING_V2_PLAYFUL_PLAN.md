# LANDING V2 — "PLAYFUL PREMIUM" REDESIGN PLAN (socio.id)

> **Untuk coding agent.** Dokumen ini adalah plan redesign total landing `socio.id` (Astro) ke arah
> **standout, playful, human touch, kaya animasi, copywriting SEO**.
> Baca berurutan. Wireframe ASCII per-section ada di `docs/LANDING_V2_PLAYFUL_WIREFRAME.md`.
>
> Hierarki dokumen (AGENTS.md §1): `REBUILD_PLAN.md` > `DESIGN.md` (design contract M1.5) > dokumen ini.
> Dokumen ini **melengkapi** DESIGN.md, bukan mengganti. Semua gate anti-pattern §5 DESIGN.md TETAP berlaku —
> "playful" tidak boleh jadi "murahan".
>
> Status: APPROVED 2026-09-13 — D-1..D-5 dijawab user (semua ikut rekomendasi).
> Keputusan tercatat di §0.3. Eksekusi F1→F6 berjalan berurutan.

---

## 0. Cara pakai dokumen ini

### 0.1 Scope

Redesign visual + motion + copy untuk **semua halaman landing** yang sudah ada:

| Route | File | Status sekarang |
|---|---|---|
| `/` (home) | `landing/src/pages/index.astro` | editorial ledger style |
| `/layanan` | `landing/src/pages/layanan.astro` | katalog + search |
| `/reseller` | `landing/src/pages/reseller.astro` | money page (spec: `docs/RESELLER_PAGE_SPEC.md`) |
| `/blog`, `/blog/[slug]` | `landing/src/pages/blog/*` | seed articles (D7) |
| `/beli-*` + `/smm-panel-*` (10 money pages) | `landing/src/pages/[slug].astro` + `layouts/BeliPage.astro` | data di `landing/src/data/beli-pages.ts` |
| `/404` | `landing/src/pages/404.astro` | ada |

**TIDAK berubah**: tech stack (Astro 5 + Svelte 5 islands + Tailwind v4 → Cloudflare Pages), struktur konten SEO
(money pages, blog queue, schema), URL/slug, `landing/src/data/*` sebagai sumber angka.

### 0.2 Prinsip redesign (urut prioritas)

1. **Conversion tetap raja.** Playful adalah kendaraan, bukan tujuan. Setiap section punya 1 job (lihat §5).
2. **Playful ≠ cheap.** Patuh 8 anti-pattern DESIGN.md §5. Sticker/tilt/doodle boleh; neon gradient blob,
   emoji spam, clip-art kartunan DILARANG.
3. **Human touch = orang nyata + suara nyata.** Foto asli (reseller/UMKM Indonesia), chat bubble gaya WA,
   copy yang ngomong seperti teman — bukan korporat, bukan cringe.
4. **Motion punya arti.** Setiap animasi menjawab: "ini membantu user paham / merasakan apa?" (lihat §4).
5. **Mobile-first + perf budget.** Lighthouse mobile ≥ 90, LCP < 2.5s di 4G, CLS 0, total JS island < 90KB gzip.
6. **Angka harus real.** Semua klaim numerik diambil dari `landing/src/data/prices.json` / DB build-time —
   dilarang hardcode angka yang bisa basi (audit claim: `docs/LANDING_AUDIT.md` §4).

### 0.3 Decision points — WAJIB tanya user sebelum build (AGENTS.md §0.10)

| # | Keputusan | Rekomendasi | Dampak | **Keputusan user 2026-09-13** |
|---|---|---|---|---|
| D-1 | **Warna pop kedua** (mango/kuning hangat) di atas accent cyan-teal — ubah `DESIGN.md` §1? | YA, tambah token `--pop-*` (§2.3), accent-ink tetap satu-satunya fill CTA | Seluruh visual | **YA — token §2.3 diimplementasi di `tokens.css` (F1)** |
| D-2 | **Font aksara tulisan tangan** (self-host subset, mis. Caveat) khusus anotasi/doodle, max 2 pemakaian per halaman | YA, terbatas | Human touch | **YA terbatas — `Caveat Hand` variable 75KB self-host, `.font-hand`, tanpa preload (F1)** |
| D-3 | **Maskot "Si Socio"** — karakter SVG paper-plane bermata (metofora "boost"), muncul di HowItWorks + 404 + empty state | YA (versi SVG sederhana, bukan ilustrasi kompleks) | Brand recall | **YA — `SocioMascot.svelte` pose wave/fly/fall, inline <2KB (F1)** |
| D-4 | **Klaim "50.000+ reseller"** — pertahankan atau ganti "ribuan reseller & UMKM"? | Ganti kecuali ada data riil (audit B-12) | Legal/trust | **GANTI — pakai "ribuan reseller & UMKM" di semua copy V2 (F2+)** |
| D-5 | Hero H1 final — pilih dari 3 opsi di §5.2 | Opsi A | SEO + tone | **Opsi A: "SMM Panel Indonesia yang bikin sosmed kamu terlihat ramai, dompet tetap aman." (F2)** |

> Coding agent: JANGAN mulai implementasi sebelum D-1..D-5 dijawab user. Kalau sudah dijawab, update tabel ini dengan keputusannya.

---

## 1. Konteks bisnis (bekal copywriting — JANGAN diubah)

### 1.1 Apa itu socio.id

Panel SMM (social media marketing) Indonesia: user beli followers/likes/views/subscriber/players untuk
IG, TikTok, YouTube, Facebook, Telegram, X/Twitter, Spotify + layanan SEO. Provider upstream SMMturk,
order otomatis 24 jam via queue, garansi refill, API v1 publik, support tiket + WA.

### 1.2 Offer inti (source of truth harga: `landing/src/data/prices.json`, sync 1 Sep 2026)

- **Daftar reseller Rp50.000 sekali** — sudah termasuk **saldo Rp20.000** langsung pakai.
- **Harga reseller lebih murah dari member di SEMUA layanan** (contoh: IG Followers Rp7.395/1k member → Rp6.902/1k reseller).
- **8.270 layanan · 882 kategori · 8 platform** (FB 759, IG 1.662, Lainnya 1.551, Spotify 273, Telegram 1.078, TikTok 1.527, X 544, YT 876).
- Layanan termurah mulai **Rp48/1k** (Twitter Tweet Views) — 357 layanan ≤ Rp500/1k.
- **Garansi refill 30 hari** untuk layanan bertanda refill — drop diisi ulang otomatis (cron).
- **Affiliate 2%** komisi seumur hidup referral.
- **API v1** (services/order/status/refill/profile) — self-service API key di dashboard.
- Proses order mulai jalan rata-rata **< 1 menit** setelah saldo masuk (klaim "42 detik" — verifikasi DB sebelum pakai).
- Tanpa password — cukup link publik. Pembayaran: BCA manual sekarang; QRIS/e-wallet (Tripay/Midtrans) menyusul (S-5).

### 1.3 Positioning (dari `docs/SMM_STANDOUT_RESEARCH.md` §6 — WAJIB dipakai)

> "Socio.id — panel SMM Indonesia dengan harga grosir, refill garansi transparan, & API siap reseller.
> Untuk UMKM, agency, & reseller yang mau cuan tanpa ribet."

**Bukan** "termurah" (klaim lemah, gampang disanggah, risiko isu iklan). Differentiator yang dijual:
**transparan + garansi refill + reseller-ready + katalog raksasa + otomatis 24 jam**.

### 1.4 Persona (3, urut prioritas)

| Persona | Siapa | Pain | Yang dia cari di landing | CTA utama |
|---|---|---|---|---|
| **Rina Reseller** (25-35) | Jualan jasa sosmed ke klien UMKM via WA/IG, cari margin | Panel lama: harga naik-turun, order manual, drop tanpa ganti | Harga grosir transparan, refill garansi, repeat order cepat, API | Daftar Reseller Rp50rb |
| **Bagas UMKM/Creator** (18-30) | Olshop/kreator yang mau terlihat ramai biar dipercaya pembeli | Takut akun ke-ban, takut ditipu panel abal-abal | Aman (tanpa password), gradual delivery, testimoni nyata, support | Lihat harga / Daftar |
| **Agus Agency** (28-45) | Social media agency kecil, handle 5-20 klien | Butuh API + dashboard + invoice rapi, kecepatan | API docs, katalog lengkap, kecepatan mulai proses | Daftar + API |

### 1.5 Keyword utama per halaman (dari `docs/SEO-KEYWORD-RESEARCH.md` + queue `seo/queue.json`)

| Halaman | Keyword utama | Supporting |
|---|---|---|
| `/` | smm panel, smm panel terpercaya, smm panel indonesia | smm panel termurah (AEO), panel sosmed |
| `/layanan` | layanan smm panel, katalog smm | jasa followers, jasa viewers (link ke money pages) |
| `/reseller` | reseller smm panel, smm panel reseller murah | daftar reseller sosmed, bisnis jasa followers |
| `/beli-followers-instagram` | beli followers instagram | (sudah di `beli-pages.ts`) |
| dst. 10 money pages | lihat `landing/src/data/beli-pages.ts` | jangan ubah slug/keyword |
| `/blog/*` | dari queue (p85 howto, p80 keamanan, p90 definisi) | AEO answer block |

---

## 2. Design direction — "Playful Premium"

### 2.1 Mood (satu kalimat per aspek)

- **Mood**: "Warung kopi modern yang jualan rocket fuel" — hangat, ramah, tapi serius soal performa.
- **Referensi vibe** (jangan copy mentah): Duolingo (playful + maskot), Mailchimp (human copy + doodle),
  Linear (motion craft), Haloka (hero interaktif — sudah ada). Anti-referensi: panel SMM kompetitor
  (neon ungu-pink, banner kedip, font Comic Sans) — kita harus terlihat **premium yang ramah**, beda 180°.
- **Bentuk**: rounded besar (sticker), border tinta 2px, hard offset shadow, tilt 1-3° pada elemen aksen.
- **Warna**: paper hangat + tinta dekat-hitam + cyan-teal (satu-satunya fill CTA) + mango (highlight/doodle SAJA).
- **Suara**: teman yang kebetulan jago sosmed marketing (lihat §3).

### 2.2 Yang DIPERTAHANKAN dari desain sekarang (jangan dibuang)

- Ledger/USP list hero (dl/dt/dd) — pola trust yang bagus, di-restyle jadi "nota warung" (sticker style).
- `OrderSimulator` interaktif — centerpiece, di-upgrade jadi gamified (§5.4).
- `OrderBoard` live — di-upgrade jadi ticker + toast "order masuk" (§5.3).
- `PricingTable` real `<table>` — anti-pattern #4 aman, tinggal restyle + toggle member/reseller.
- `FloatingTabDock`, `StickyCTA`, `FloatingWhatsApp`, `NextArticleDock` — pertahankan perilaku, restyle skin.
- Struktur SEO: schema WebSite+SearchAction, FAQ JSON-LD, money pages, blog mesh, `prices.json` build-time.
- Self-host font woff2 subset (privasi + kecepatan) — tambah 1 family baru dengan pola yang sama (D-2).

### 2.3 Token extension (proposal — butuh approval D-1/D-2)

Tambah di `landing/src/styles/tokens.css` (JANGAN hardcode hex di komponen — DESIGN.md §0):

```css
:root {
  /* Paper hangat: geser hue cool→warm sedikit, tetap near-white */
  --paper-warm: oklch(0.982 0.008 90);      /* section bg alternatif */
  --paper-warm-2: oklch(0.96 0.012 90);

  /* Pop colors — HANYA untuk highlight, doodle, sticker kecil.
     BUKAN fill CTA (CTA tetap --accent-ink, satu-satunya). */
  --pop-mango: oklch(0.84 0.15 85);          /* stabilo/underline/marker */
  --pop-mango-soft: oklch(0.84 0.15 85 / 0.25);
  --pop-berry: oklch(0.62 0.2 15);           /* aksen mikro maksimal (badge promo) */

  /* Sticker chrome */
  --sticker-border: 2px solid var(--ink);
  --sticker-shadow: 4px 4px 0 var(--ink);        /* hard offset, playful */
  --sticker-shadow-sm: 2px 2px 0 var(--ink);
  --sticker-shadow-hover: 6px 6px 0 var(--ink);  /* hover: shadow membesar + translate(-2px) */
  --radius-sticker: 20px;
  --radius-sticker-lg: 28px;

  /* Motion — spring playful untuk entrance elemen sticker;
     UI kalem tetap pakai --ease-out-soft dari contract */
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-dramatic: cubic-bezier(0.16, 1, 0.3, 1); /* = existing */
}
```

Aturan pakai token baru (gate audit):

1. `--pop-mango` maksimum untuk: stabilo kata di heading (1-2 kata per section), doodle SVG, marker highlight.
   Tinta di atas mango = `--ink` (AA lolos, mango L=0.84).
2. `--pop-berry` maksimum 1 elemen per halaman (mis. badge "Bonus" / promo).
3. Sticker chrome (border tinta + hard shadow) maksimum **4 elemen besar per halaman** — sisanya tetap
   chrome tenang (paper/hairline). Ini ekstensi anti-pattern #3: "sticker card" dihitung sebagai chrome ke-3 yang
   diizinkan, bukan default baru.
4. CTA fill TETAP hanya `--accent-ink` + teks putih (AA 5.4:1). Hover = `--accent-hover` (lebih gelap).
5. Tilt/rotate elemen: -3° s.d. +3° maksimum, hanya pada elemen aksen (sticker, polaroid, badge).

### 2.4 Tipografi

- **Display**: Sora 700-800, tracking -0.02em (kontrak). Hero H1: clamp 40→64px (token existing `--text-hero`).
- **Body**: Plus Jakarta Sans 17px (`--text-body`), line-height 1.5-1.6.
- **Aksara tangan (D-2)**: self-host subset latin (pola `@font-face` di `global.css`), weight 400-700,
  ukuran 18-24px, warna `--ink-2` atau `--pop-berry`. Budget: **max 2 instance per halaman** (anotasi doodle,
  tanda tangan founder, panah "ini penting!"). Dilarang untuk body/prose.
- Angka tetap `.num` tabular-nums.

### 2.5 Imagery (anti-pattern #6: real `<img>`, no blob)

| Kebutuhan | Sumber | Perlakuan |
|---|---|---|
| Foto testimoni | Foto asli user/reseller (minta ke user) atau Unsplash orang Indonesia (fallback, tandai TODO) | Polaroid frame: white border 8px, tilt -2°/+2°, sticker shadow |
| Foto section "human" (UMKM packing order, creator bikin konten) | Unsplash keyword: `indonesian small business`, `content creator phone` | Duotone ringan via CSS (mix-blend + overlay `--pop-mango-soft` / accent-tint) — JANGAN filter berat (perf) |
| Mockup dashboard/app | Screenshot app.socio.id asli (HeroMockup existing) | Dalam frame sticker + tilt, screen content live-animated |
| Doodle/maskot | SVG inline buatan sendiri (stroke `--ink`, fill pop) | Inline SVG, max 2KB per doodle, aria-hidden |
| OG image per halaman | Template build-time (satori/@vercel/og atau manual PNG) | 1200×630, playful sticker style |

---

## 3. Voice & copywriting (human touch)

### 3.1 Tone of voice

- Sapa **"kamu"**, bukan "Anda" (kecuali legal/T&C).
- Seperti teman yang jago marketing: antusias, jujur, sedikit bercanda — **max 1 momen bercanda per section**.
- Kalimat pendek. Subjek-predikat jelas. Angka konkret > adjektiva ("mulai proses < 1 menit" > "super cepat").
- Jujur soal batas: "followers bisa turun di platform manapun — makanya ada refill" > "dijamin tidak drop".
  Kejujuran = differentiator positioning (§1.3) dan membangun trust (AEO juga menyukai jawaban berimbang).

### 3.2 Bank kata/kalimat (pakai secukupnya, jangan semua)

- CTA: "Gasss Daftar" (button playful sekunder), "Daftar Reseller Rp50rb" (primer — jelas & SEO),
  "Intip Harga Dulu" (soft), "Coba Hitung Cuanmu" (kalkulator), "Lihat 8.270 Layanan".
- Mikro-kopi: "tanpa drama", "gak pake ribet", "sekali bayar, tanpa langganan", "saldo kamu, aturan kamu",
  "gagal? saldo balik", "link doang, password kagak", "buat kamu yang jualan jasa sosmed", "cuan jalan, tidur tenang".
- Empty/error state: "Yah, belum ada apa-apa di sini. Coba cari yang lain yuk."
- DILARANG: "solusi digital terbaik #1", "revolusioner", "synergy", klaim superlatif tanpa data,
  emoji di heading (emoji boleh max 1 di mikro-kopi/badge, itu pun sparing), "guys", bahasa alay berlebihan.

### 3.3 Aturan SEO copywriting (semua halaman)

1. **Title ≤ 70 char**, format: `{Keyword Utama} + {Benefit/Pembeda} | Socio.id`. Ada angka = CTR naik.
2. **Meta description ≤ 160 char**: keyword + harga konkret + CTA implicit. (money pages sudah ada di
   `beli-pages.ts` — pertahankan, jangan rewrite tanpa cek length.)
3. **H1 = 1 per halaman**, mengandung keyword utama, natural (bukan keyword stuffing).
4. Keyword utama muncul di: title, H1, 100 kata pertama body, minimal 1 H2, alt hero image, URL.
5. **AEO answer block**: untuk FAQ & pertanyaan definisi, jawab langsung 40-60 kata di paragraf pertama
   (pola: definisi → angka → syarat), lalu detail. Ini yang dikutip AI Overview/PAA.
6. Heading hierarchy ketat: H1 > H2 per section > H3 sub. Tidak skip level.
7. **Internal mesh**: tiap halaman minimal 3 internal link kontekstual (bukan footer-only):
   home → money pages ("beli followers instagram mulai Rp7.395/1k") → /reseller → /blog terkait.
   Money page → 3 cross-sell (sudah di `beli-pages.ts.crossSell`). Blog → money page + home.
8. Alt text deskriptif natural (bukan keyword spam): "Reseller socio.id membalas chat klien dari HP di warung kopinya".
9. Copy body min. 600 kata untuk home (SEO), money pages sesuai template existing, blog ≥ 1.200 kata (spec SEO §2).
10. Jangan ubah slug/URL yang sudah ter-index (canonical intact). Redesign = visual+copy, bukan arsitektur URL.

### 3.4 Schema.org (pertahankan + tambah)

| Halaman | Schema |
|---|---|
| `/` | WebSite+SearchAction (ada), Organization, FAQPage, ItemList (platform/layanan top) |
| `/beli-*` | FAQPage (ada), Product+Offer (harga dari prices.json), BreadcrumbList |
| `/reseller` | FAQPage, Service |
| `/blog/[slug]` | Article, BreadcrumbList |
| `/layanan` | ItemList, BreadcrumbList |

---

## 4. Motion system (kaya animasi, tapi disiplin)

### 4.1 Aturan global (DESIGN.md §4 + skill review-animations)

- Hanya **transform + opacity** (GPU). Dilarang animasi width/height/top/left/margin.
  Pengecualian teknis: SVG `stroke-dashoffset` (line-draw) dan `background-position` (gradient/marquee) — tetap compositor-friendly.
- Timing token: micro 120-200ms · UI 250-400ms · entrance section 500-800ms · dramatic/celebration 800-1200ms.
- Easing: entrance `--ease-dramatic`; playful bounce `--ease-spring` (max 1-2 elemen per viewport — kalau semua
  spring, tidak ada yang spesial); exit ease-in 200-300ms.
- **`prefers-reduced-motion`**: semua animasi non-esensial off (state akhir langsung terlihat). Marquee → daftar
  statis. Counter → angka final. Word-rotate → kata pertama. Confetti → tidak muncul. Gunakan media query global
  yang sudah ada di `global.css` + cek per island Svelte (`matchMedia`).
- **CLS 0**: elemen animasi reserve ruang (min-height / aspect-ratio). Reveal on scroll pakai opacity+translate
  yang tidak menggeser layout.
- Perf: IntersectionObserver (satu observer global, pattern existing `.reveal`), `content-visibility: auto` untuk
  section jauh di bawah fold, lazy `client:visible` untuk island di bawah fold, `client:load` hanya untuk
  Navbar+Hero (above fold). Dilarang scroll-listener tanpa throttle/rAF.

### 4.2 Vocabulary animasi per jenis (ID dipakai di wireframe & spec section)

| ID | Nama | Spec | Dipakai di |
|---|---|---|---|
| A1 | Stagger reveal | opacity 0→1, translateY 24→0, 600ms `--ease-dramatic`, delay anak +80ms, trigger IO threshold 0.15 | hampir semua section |
| A2 | Pop-in spring | scale 0.8→1 + opacity, 500ms `--ease-spring` | sticker badge, chip platform, angka stat |
| A3 | Word rotate | 2 kata swap: keluar translateY -100% + fade 250ms ease-in, masuk +100%→0 350ms `--ease-dramatic`; interval 2.2s; container fixed-height | H1 hero, H2 tertentu |
| A4 | Counter roll | angka 0→final, 900ms, ease-out quad, tabular-nums, trigger IO sekali | stat, harga, kalkulator hasil |
| A5 | Marquee ticker | translateX linear infinite 30-45s, duplikat konten untuk loop mulus, pause on hover (`animation-play-state`) | live order ticker, logo platform |
| A6 | Line-draw path | SVG stroke-dashoffset 100%→0 mengikuti scroll (scroll-linked, rAF+passive) | HowItWorks roadmap |
| A7 | Tilt hover | rotate ±2° + translate -2px + shadow membesar, 250ms `--ease-spring` | sticker card, polaroid, tombol playful |
| A8 | Magnetic button | translate max 6px ke arah kursor (desktop only, pointer: fine), lerp rAF, reset on leave 300ms | CTA primer hero + final |
| A9 | Confetti burst | 24-36 partikel SVG/div, physics sederhana (translate+rotate+fade), 1.2s, sekali per interaksi | order simulator "Pesan!", reseller CTA click |
| A10 | Float idle | translateY ±6px + rotate ±1°, 5-7s ease-in-out infinite, delay acak | doodle, maskot, sticker hero |
| A11 | Marker swipe | pseudo-element scaleX 0→1 di belakang kata (stabilo mango), 450ms `--ease-dramatic`, trigger IO | kata kunci di heading |
| A12 | Toast slide-in | translateX 110%→0, 400ms `--ease-dramatic`, auto-dismiss 4s + fade 300ms | "order masuk" live toast, WA bubble |
| A13 | Accordion FAQ | grid-template-rows 0fr→1fr 300ms (satu-satunya exception layout-anim, pakai CSS murni) + chevron rotate | FAQ |
| A14 | Scroll morph navbar | height 72→56px + shadow + bg blur muncul, 250ms, class toggle via IO di top sentinel | Navbar |
| A15 | Parallax ringan | translateY = scrollProgress × 20px max, rAF passive, hanya elemen doodle/dekorasi (bukan konten) | hero decoration, section divider |

**Budget motion per halaman**: max 3 animasi infinite berjalan bersamaan di viewport manapun (ticker + float + live-dot
= ok). Infinite animation wajib pause saat tab hidden (`document.visibilityState`) — hemat baterai.

### 4.3 Orkestrasi scroll (koreografi wajib tiap section — pola existing dipertahankan)

1. Section masuk viewport (IO threshold 0.15, rootMargin `0px 0px -50px`) → tambah `.is-visible`.
2. Heading muncul duluan (A1 0ms) → subcopy (+120ms) → elemen visual (+200ms) → CTA (+320ms).
3. Satu section = satu momen utama (hero word-rotate, simulator confetti, roadmap line-draw). Jangan tabrakan:
   jika section punya A6/A9, animasi lain di section itu cukup A1 polos.
4. Hero = load-sequence (bukan scroll): pola `.hero-seq-*` existing dipertahankan, stagger 90ms.

---

## 5. Spec halaman `/` (home) — section by section

Urutan section final (FAQ SEBELUM FinalCTA — fix audit `docs/LANDING_AUDIT.md` §2):

```
Navbar → Hero → LiveTicker → MasalahKamu (ProblemLedger restyle) → OrderSimulator (centerpiece)
→ PlatformBento (KapabilitasBento restyle) → HowItWorks (roadmap A6 + maskot) → TestiWall (polaroid+chat)
→ PricingTable (toggle member/reseller) → ResellerBand (inverted) → FAQ → FinalCTA → Footer
+ elemen melayang: StickyCTA (mobile), FloatingTabDock, FloatingWhatsApp, LiveOrderToast (desktop, A12, throttled)
```

Detail lengkap layout + wireframe ASCII: `LANDING_V2_PLAYFUL_WIREFRAME.md` §1. Di sini spec konten/motion/copy:

### 5.1 Navbar (restyle `Navbar.svelte`)

- Tinggi 72px → 56px saat scroll (A14), bg `paper/85 + backdrop-blur(8px)` saat scrolled (blur boleh — sudah ada di Haloka pattern; reduced-motion tidak影响 blur).
- Logo socio.id + maskot paper-plane kecil di kiri; wiggle 1× saat first load (450ms spring).
- Link: Layanan · Reseller · Blog · Harga (anchor) · FAQ (anchor). CTA kanan: "Masuk" (ghost) + "Daftar Reseller" (accent-ink fill, A8 magnetic desktop).
- Mobile: hamburger → off-canvas (focus-trap + scroll-lock + Esc — kontrak).

### 5.2 Hero (rewrite copy + upgrade `HeroMockup.svelte`)

Job: 5 detik pertama user paham **apa ini, untuk siapa, kenapa beda** → klik.

- **H1 (D-5, pilih salah satu — keyword "SMM Panel" harus ada untuk SEO home):**
  - A. "SMM Panel Indonesia yang bikin sosmed kamu **terlihat ramai**, dompet tetap aman." (default/rekomendasi)
  - B. "Panel SMM grosir buat kamu yang jualan jasa sosmed."
  - C. "Naikkan followers, viewers, dan omzet — dari satu panel SMM."
  - Kata yang di-stabilo (A11): "terlihat ramai" / rotating word (A3) untuk opsi C: followers→viewers→omzet.
- Sub (100 kata pertama mengandung keyword): 2 kalimat — apa + untuk siapa + bukti angka:
  "8.270 layanan Instagram, TikTok, YouTube, Telegram & lainnya. Daftar reseller Rp50.000 sudah termasuk saldo
  Rp20.000 — langsung order, proses otomatis 24 jam, garansi refill 30 hari."
- **USP nota-warung** (dl existing → sticker style, border tinta + hard shadow + tilt -1°): 5 baris data (daftar, saldo, harga, katalog, proses) — angka dari prices.json/build-time.
- CTA primer: "Daftar Reseller Rp50rb →" (A8). CTA sekunder: "Intip 8.270 Layanan" (outline).
- Trust line kecil di bawah CTA: "Sekali bayar · tanpa password · garansi refill 30 hari" + 3 avatar foto asli (polaroid mini) "dipakai ribuan reseller & UMKM" (final wording = D-4).
- Visual kanan: mockup dashboard dalam frame sticker tilt +2°, layar berisi OrderBoard live mini; doodle panah tulisan tangan (D-2) nunjuk ke tombol order: "sekali klik, order jalan ✦"; A10 float idle untuk 2-3 sticker kecil (❤️ ▶ 👁 sebagai SVG, bukan emoji text) di sekitar frame; A15 parallax doodle.
- Background: paper + grid titik halus (radial-gradient 16px) + 1 sweep gradient mango sangat tipis (opacity ≤ 0.08) — bukan blob.

### 5.3 LiveTicker (baru, ganti posisi `SmmProviderProof` + inline-stat)

Job: bukti sosial bergerak — "panel ini hidup, order jalan terus".

- Strip full-width bg `--dark-panel`, tinggi 44px, marquee (A5) item: `✓ Budi dari Bandung order 1.000 IG Followers · 2 menit lalu` (data: OrderBoard existing / snapshot build-time + rotasi client-side; JANGAN fetch API runtime di landing — Cloudflare Pages statis; refresh data saat build).
- Di atas strip: 1 kalimat inline-stat (pola existing, anti-pattern #5 aman): "Sekarang 1.2xx order aktif sedang diproses · rata-rata mulai < 1 menit setelah order." (angka build-time dari DB/prices.json — verifikasi, jangan halusinasi).
- Desktop tambahan: **LiveOrderToast** (A12) pojok kiri-bawah, 1 toast / 25-40s (jitter acak), max 3 per sesi, skip jika reduced-motion atau user sudah scroll > 60% halaman.

### 5.4 MasalahKamu — `ProblemLedger.astro` restyle

Job: empati dulu ("kita ngerti masalahmu"), baru solusi. Human touch utama.

- Heading H2: "Jualan jasa sosmed itu gampang. **Panelnya** yang kadang bikin elus dada." (marker swipe A11 di "Panelnya").
- Format: 3 "keluhan" gaya chat bubble WA (bubble putih + tail, bg section paper-warm) — masing-masing dijawab
  baris "Jawaban Socio" (bubble accent-tint + centang):
  1. "Order manual terus, klien rewel nanyain progres." → "Order otomatis 24 jam. Klien tanya? Kirim link tracking."
  2. "Followers drop, klien ngamuk, reputasi taruhannya." → "Layanan refill 30 hari — drop diisi ulang otomatis, kamu tinggal tenang."
  3. "Harga panel naik-turun, marginku jadi judi." → "Harga grosir transparan di katalog live. Hitung margin sebelum order, bukan sesudah."
- Motion: A1 stagger bubble (chat muncul seperti diketik: bubble scale-in A2, delay berurutan 150ms).
- Foto kecil orang (duotone, 96px rounded) di samping bubble pertama — "Rina, reseller Jakarta" (persona §1.4; foto asli/Unsplash TODO).

### 5.5 OrderSimulator — upgrade jadi gamified (centerpiece, `OrderSimulator.svelte`)

Job: user **merasakan** produk sebelum daftar — momen "oh, gampang banget".

- Pertahankan mekanika existing (pilih platform → layanan → jumlah → harga live dari prices.json).
- Upgrade playful:
  - Chip platform squishy (A2 saat dipilih: scale spring; aktif = border tinta + sticker shadow).
  - Slider jumlah dengan tick marks; saat drag, harga counter-roll (A4, 200ms) — angka terasa hidup.
  - Toggle "Harga Reseller" — saat ON, harga lama coret + harga baru pop (A2) + badge mango "hemat RpXXX" (counter).
  - Tombol "Coba Pesan" → **confetti (A9)** + mock toast sukses "Order #SOC-82xx masuk! Mulai proses < 1 menit ✦" (ini simulasi — WAJIB ada label kecil "simulasi, belum order beneran 🙂" biar jujur/human).
  - Hasil estimasi: "1.000 followers ≈ mulai Rp7.395" dengan link kontekstual ke `/beli-followers-instagram` (internal mesh §3.3).
- Reduced-motion: tanpa confetti/squish, hasil tetap muncul instan.
- Keyboard accessible: slider = input range native, chip = button, hasil di aria-live polite.

### 5.6 PlatformBento — `KapabilitasBento.astro` restyle

Job: tunjukkan keluasan katalog tanpa bullet spam.

- Heading H2 (keyword): "Satu panel, semua platform yang kamu jualan."
- Grid bento asimetris (existing pattern): tile besar IG (1.662 layanan) + TikTok (1.527), tile sedang YT/Telegram, tile kecil FB/X/Spotify/Lainnya — angka dari prices.json (A4 counter saat reveal).
- Tiap tile: ikon platform SVG stroke (buatan sendiri, bukan generic icon pack), hover → tilt A7 + ikon "bounce" 1×.
- 1 tile spesial bergaya doodle: "+ layanan SEO & lainnya (882 kategori)" dengan panah tulisan tangan (D-2).
- Link tiap tile → `/layanan?platform=X` (query param sudah didukung? cek `layanan.astro`; kalau belum, tambah filter param — kecil).

### 5.7 HowItWorks — roadmap (upgrade `HowItWorks.svelte`)

Job: hapus rasa "ribet" — 3 langkah, terlihat seperti jalan kaki santai.

- H2: "Mulai dalam 3 langkah. Serius, sesimpel itu."
- Layout: jalur SVG berkelok (line-draw A6 mengikuti scroll) menghubungkan 3 pos:
  1. **Daftar** — "Isi form 1 menit. Reseller Rp50rb sudah termasuk saldo Rp20rb." (ikon form + maskot melambai)
  2. **Top up** — "Transfer / QRIS (segera). Saldo masuk otomatis." (ikon dompet)
  3. **Order** — "Pilih layanan, tempel link, klik. Sistem yang kerja 24 jam." (ikon rocket — maskot paper-plane terbang di ujung jalur saat line-draw selesai, A2 pop + A10 float)
- Desktop: jalur horizontal; mobile: vertikal di kiri, kartu pos di kanan.
- Anti-pattern #1 aman: tiap pos max 2 baris teks, tanpa bullet list.

### 5.8 TestiWall — `TestiLedger.astro` restyle (human touch puncak)

Job: "orang seperti saya sudah pakai dan berhasil" — format paling dipercaya: chat + polaroid.

- H2: "Kata mereka yang udah duluan cuan." (stabilo "cuan" A11).
- Pola containment #1: **kolom marquee vertikal** (2 kolom desktop / 1 mobile, A5 versi Y, pause on hover, reduced-motion → grid statis) berisi kartu chat gaya WA (bubble + nama + peran "Reseller TikTok" + centang hijau).
- Pola containment #2: **3 polaroid** terserak (tilt -3°/+2°/-1°, A7 hover, foto asli orang + caption tulisan tangan D-2).
- Isi testimoni: spesifik & believable (sebut layanan + hasil + waktu), bukan "pelayanan sangat baik".
  Contoh: "Order 5k followers IG buat klien olshop, jalan dalam 10 menit. Drop 200-an, refill otomatis tanpa aku tagih. Klien perpanjang kontrak. — Rina, reseller Jakarta".
  **PENTING**: testimoni harus data riil dari user (minta ke owner). Jika belum ada → placeholder yang ditandai `<!-- TODO: testimoni asli -->` dan JANGAN publish dengan testimoni fiktif (risiko iklan menyesatkan, audit §4).
- Angka sosial proof (jumlah reseller/order) = D-4.

### 5.9 PricingTable — restyle + toggle (pertahankan `<table>`, anti-pattern #4)

Job: transparansi harga = positioning utama. Keyword: "harga smm panel".

- H2: "Harga grosir, terbuka. Gak ada harga 'kontak admin'."
- Toggle member/reseller (pill switch, A2 knob spring). Default: **reseller** (hero offer). Kolom yang aktif diberi header sticker mango-soft.
- Tabel: 8-10 layanan terpopuler (prices.json `top[]`) — kolom: Layanan · Min. order · Harga/1k member · Harga/1k reseller · Refill. Row hover → bg paper-warm + translate-x 2px.
- Di bawah tabel: baris link money pages (internal mesh, mengandung keyword): "Beli followers Instagram mulai Rp7.395/1k → · Jasa viewers TikTok → · Beli Spotify plays → (+7)".
- CTA bawah tabel: "Lihat semua 8.270 harga" → `/layanan`.

### 5.10 ResellerBand — inverted (restyle `FinalCTA.svelte` jadi 2 momen berbeda)

Job: dorongan terakhir offer reseller, kontras visual (bg `--dark-panel`).

- Layout split: kiri copy besar (H2: "Modal Rp50 ribu, mulai bisnis jasa sosmed hari ini.") + daftar mini "yang kamu dapat" (saldo 20rb ✓, harga grosir ✓, API ✓, affiliate 2% ✓ — 4 baris ledger on-dark, bukan bullet-card); kanan mockup kartu member reseller (sticker style, tilt, A10).
- CTA: "Ambil Slot Reseller →" + confetti A9 on click (sebelum redirect ke app.socio.id/daftar?mode=reseller).
- On-dark text: `--on-dark`/`--on-dark-2`, AA dicek.

### 5.11 FAQ (restyle `Faq.svelte`)

Job: objection handling + AEO/FAQPage schema. Posisi SETELAH pricing, SEBELUM FinalCTA.

- 6-8 Q (dari existing + beli-pages faq, konsisten): keamanan (tanpa password?), drop/refill (berapa hari?), proses berapa lama, pembayaran (BCA/QRIS segera), beda member vs reseller, bisa untuk klien (whitelabel? jawab jujur: belum, roadmap), API, komplain/support.
- Jawaban = AEO answer block 40-60 kata, jujur (§3.1).
- Accordion A13, satu terbuka default (yang paling tinggi keraguannya: "Aman gak sih?"), aria-expanded benar.
- Di bawah FAQ: "Masih ada yang mengganjal? Chat manusia beneran via WA — dibalas, bukan bot." (human touch + FloatingWhatsApp).

### 5.12 FinalCTA + Footer

- FinalCTA: sederhana & hangat — H2 "Siap bikin sosmed-mu (dan klienmu) bahagia?" + CTA tunggal accent-ink besar (A8) + trust line. Background paper-warm + doodle maskot melambai (A10).
- Footer (dark): kolom link (Produk/Layanan populer 10 money pages/Perusahaan/Legal), payment icons, "Dibuat oleh manusia (dibantu mesin) di Indonesia 🇮🇩" — 1 emoji diizinkan di sini (satu-satunya), sitemap link, schema Organization. Link `api-docs` & `/blog` WAJIB hidup (fix B-05 sebelum redesign di-merge).

---

## 6. Spec halaman lain (ringkas — wireframe di dokumen wireframe §2-5)

### 6.1 `/layanan` (katalog)

- Skin baru mengikuti home (paper-warm bg, chip platform squishy, search prominent).
- H1: "8.270 Layanan SMM — Harga Live, Tanpa Kode Promo Palsu."
- Search bar sticky (mobile), filter platform chips (A2), tabel layanan: harga member/reseller + badge refill (mango-soft).
- Baris tabel hover highlight; CTA per baris "Pesan" → app; link "Panduan beli followers IG" → money page (mesh).
- Empty state: maskot + "Gak ketemu? Coba kata lain, atau chat kami — 882 kategori kadang bikin pusing sendiri."

### 6.2 `/reseller` (money page — ikuti `docs/RESELLER_PAGE_SPEC.md`, skin playful)

- Hero khusus reseller: kalkulator cuan (`ProfitCalculator.svelte` existing — upgrade A4 counter + confetti saat hasil profit muncul).
- Section "siapa yang cocok" (3 persona §1.4 sebagai sticker card — chrome sticker #3-4, masih dalam budget).
- Tabel hak member vs reseller (`<table>`, anti-pattern #4), FAQ reseller + FAQPage schema, CTA band.

### 6.3 `/beli-*` (10 money pages via `BeliPage.astro`)

- Restyle layout mengikuti skin V2; struktur & data `beli-pages.ts` TETAP (keyword/title/desc/faq sudah SEO-tuned).
- Tambah: breadcrumb visual playful, harga live serviceMatch dari prices.json (A4), 1 doodle anotasi per halaman (budget D-2), cross-sell chips (A2).
- FAQPage + Product/Offer schema dipertahankan.

### 6.4 `/blog` + `/blog/[slug]`

- Index: grid kartu artikel dengan thumb duotone, hover tilt A7; featured post besar (polaroid style).
- Single: typography-first (baca nyaman: max-width 68ch, PJS 18px), progress bar baca (transform scaleX, scroll-linked), author card dengan foto + tulisan tangan (D-2), `NextArticleDock` existing dipertahankan, CTA band socio di tengah & akhir artikel, Article schema.
- Aturan konten tetap dari `docs/LANDING_SEO_SYSTEM.md` (jangan redesign sistemnya, cuma skin).

### 6.5 `/404`

- Maskot paper-plane jatuh + parasut (SVG, A10), copy: "Waduh, halaman ini terbang entah ke mana." + search + link populer (home, /layanan, /reseller, 3 money page).

---

## 7. Inventory komponen (reuse vs baru)

| Komponen | File | Aksi |
|---|---|---|
| Navbar | `components/Navbar.svelte` | restyle (A14 morph, logo maskot) |
| HeroMockup | `components/HeroMockup.svelte` | restyle frame sticker + doodle |
| (baru) HeroCopy | inline `index.astro` | rewrite copy §5.2 |
| SmmProviderProof | `components/SmmProviderProof.svelte` | **ganti** → LiveTicker (baru) |
| ProblemLedger | `components/ProblemLedger.astro` | restyle → chat bubble WA |
| OrderSimulator | `components/OrderSimulator.svelte` | upgrade gamified §5.5 |
| OrderBoard | `components/OrderBoard.astro` | dipakai di dalam hero mockup + data LiveTicker |
| KapabilitasBento | `components/KapabilitasBento.astro` | restyle §5.6 |
| HowItWorks | `components/HowItWorks.svelte` | **rewrite** → roadmap A6 + maskot |
| TestiLedger | `components/TestiLedger.astro` | restyle → TestiWall §5.8 |
| PricingTable | `components/PricingTable.astro` | restyle + toggle §5.9 |
| FinalCTA | `components/FinalCTA.svelte` | split → ResellerBand + FinalCTA |
| Faq | `components/Faq.svelte` | restyle A13 |
| Footer | `components/Footer.astro` | restyle + mesh money pages |
| StickyCTA / FloatingTabDock / FloatingWhatsApp / NextArticleDock | existing | skin saja, perilaku tetap |
| (baru) SocioMascot.svelte | SVG paper-plane, props: pose (wave/fly/fall) | D-3 |
| (baru) Doodle.svelte / doodle SVG inline | panah, bintang, garis tangan | D-2/D-3 |
| (baru) LiveTicker.astro + LiveOrderToast.svelte | §5.3 |
| (baru) Confetti.svelte | A9, vanilla, <3KB, no lib |
| (baru) StickerCard.astro | wrapper chrome sticker (budget §2.3#3) |

Aturan island (perf): `client:load` hanya Navbar, HeroMockup, OrderSimulator (above-fold). Sisanya `client:visible`.
Komponen tanpa interaktivitas = pure Astro (0 JS): LiveTicker marquee CSS-only, StickerCard, ProblemLedger, PricingTable (toggle = `<details>`/radio CSS atau island kecil), TestiWall marquee CSS-only.

---

## 8. Eksekusi (fase — kerjakan berurutan, verifikasi per fase)

> Preflight (sebelum fase 1): jawab D-1..D-5, fix B-04/B-05 (link daftar, api-docs, blog), audit angka claim (D-4),
> kumpulkan foto/testimoni asli dari owner (TODO list §5.8).

- **F1 — Foundation (0.5 hari)**: token extension §2.3 di `tokens.css`, font aksara (D-2) self-host, keyframes &
  utility class global (A1-A15 yang CSS-only: `.reveal`, `.pop-in`, `.marker`, `.sticker`, `.tilt-*`, marquee),
  reduced-motion global audit, `SocioMascot` + `Confetti` + `Doodle` primitives. DoD: halaman existing tidak rusak
  (token additive), lint+build clean.
- **F2 — Home hero + ticker (1 hari)**: §5.1-5.3. DoD: hero load-sequence ≤ 1.2s terasa, LCP hero < 2.5s (4G throttle),
  CLS 0, screenshot 360/768/1280 (pw-vision) disetujui.
- **F3 — Home body (1-1.5 hari)**: §5.4-5.8. DoD: simulator gamified jalan (mouse+touch+keyboard), roadmap line-draw
  smooth 60fps (cek DevTools perf), testi wall punya data (atau TODO marker), anti-pattern audit lolos.
- **F4 — Home closing + SEO (1 hari)**: §5.9-5.12 + schema lengkap + internal mesh + meta/OG. DoD: FAQPage valid
  (Rich Results Test), title/desc ≤ limit, Lighthouse mobile ≥ 90 SEO & ≥ 90 perf.
- **F5 — Halaman lain (1-2 hari)**: §6 /layanan, /reseller, BeliPage, blog, 404 (skin konsisten, data tidak berubah).
- **F6 — Audit & polish (0.5-1 hari)**: AGENTS.md §7 penuh — lint/typecheck/build, pw-vision mobile 360×640 + 768 + 1280,
  web-design-guidelines (a11y: focus, contrast AA semua permukaan pop/mango/dark, aria), review-animations
  (craft bar), reduced-motion manual test (emulasi OS), Lighthouse, kontras checker untuk `--pop-mango`+ink dan `--pop-berry`+white.

Commit format: `feat(M5): landing-v2 F{X} — {item}`. Jangan commit sebelum lint+build clean.

---

## 9. Acceptance criteria (DoD total redesign)

- [ ] D-1..D-5 terjawab & tercatat di §0.3
- [ ] Semua halaman di §0.1 ber-skin V2 konsisten, tidak ada link 404 (B-04/B-05 fixed)
- [ ] 8 anti-pattern DESIGN.md §5 lolos per halaman (hitung `<li>`, eyebrow pill ≤1, chrome patterns ≥3, tabel pricing, inline-stat, real `<img>`, font non-Inter)
- [ ] AA 4.5:1 semua teks (termasuk di atas mango, dark-panel, accent fill) — tooling kontras
- [ ] `prefers-reduced-motion`: semua A1-A15 punya fallback; tidak ada infinite animation yang jalan
- [ ] CLS 0, LCP < 2.5s (4G), JS island total < 90KB gzip, Lighthouse mobile perf/SEO/a11y/bp ≥ 90
- [ ] Copy: positioning §1.3 konsisten, tidak ada klaim angka tanpa sumber (semua dari prices.json/DB build-time), tidak ada testimoni fiktif yang dipublish
- [ ] SEO: title/desc/H1 per halaman sesuai §3.3, schema §3.4 valid, internal mesh ≥3 link kontekstual per halaman
- [ ] Screenshot audit (pw-vision) 360/768/1280 untuk home + tiap halaman, disimpan di `docs/screenshots/landing-v2/`
- [ ] `pnpm --filter landing build` sukses; deploy staging Cloudflare Pages preview diverifikasi user sebelum prod

---

## 10. Guardrails (anti-halu untuk coding agent)

1. Jangan ubah: URL/slug, `beli-pages.ts` (kecuali restyle yang ditampilkan), sistem SEO (`seo/*`, queue), stack, struktur folder.
2. Jangan invent fitur baru di luar dokumen ini (mis. dark mode landing, i18n, animasi library eksternal —
   confetti & motion semuanya hand-rolled CSS/vanilla, DILARANG tambah dependency tanpa approval).
3. Jangan pakai gradient blob, neon, emoji di heading, font Comic Sans/Impact, sticker > 4 elemen besar per halaman.
4. Angka: hanya dari `prices.json` / DB build-time / dokumen ini. Kalau butuh angka baru → tanya user.
5. Testimoni/foto orang asli belum ada → pakai placeholder berlabel TODO, lapor ke user, jangan karang.
6. Bertentangan dengan DESIGN.md → DESIGN.md menang, kecuali §2.3 dokumen ini SUDAH di-approve user (D-1/D-2),
   maka token extension berlaku sebagai amendemen kontrak (catat di DESIGN.md setelah merge).
