# socio.id — Brand Guidelines & Design System

> **Tujuan dokumen**: Panduan ini adalah sumber kebenaran tunggal untuk visual brand socio.id.
> Baca sebelum generate **banner, promo, social media post, ilustrasi, atau materi visual apapun**.
> Semua angka, warna, font, dan komponen di sini **wajib dipakai konsisten** — jangan improvisasi.

> **Versi**: 1.0 · 16 September 2026
> **Brand essence**: "Panel SMM Indonesia yang hangat, transparan, dan gak nge-judge."
> **Tone**: Teman yang kebetulan jago sosmed marketing — bukan korporat, bukan kekanakan.
> **Persona utama**: Rina (reseller, 25-35), Bagas (UMKM/creator, 18-30), Agus (agency, 28-45).

---

## 📑 Daftar Isi

1. [Brand essence & mood](#1-brand-essence--mood)
2. [Palet warna](#2-palet-warna)
3. [Tipografi](#3-tipografi)
4. [Maskot — Sparko](#4-maskot--sparko)
5. [Logo & iconography](#5-logo--iconography)
6. [Tombol / CTA](#6-tombol--cta)
7. [Permukaan (surfaces)](#7-permukaan-surfaces)
8. [Elemen dekoratif](#8-elemen-dekoratif)
9. [Ilustrasi & doodle style](#9-ilustrasi--doodle-style)
10. [Fotografi](#10-fotografi)
11. [Motion / animasi](#11-motion--animasi)
12. [Voice & copy](#12-voice--copy)
13. [Anti-pattern (JANGAN)](#13-anti-pattern-jangan)
14. [Template banner & social media](#14-template-banner--social-media)
15. [Quick-reference checklist](#15-quick-reference-checklist)

---

## 1. Brand essence & mood

### Satu kalimat
**"Warung kopi modern yang jualan rocket fuel"** — hangat, ramah, tapi serius soal performa.

### Tiga pilar visual

| Pilar | Arti | Cara kelihatan di desain |
|---|---|---|
| **Hangat** | Gak kaku, gak korporat | Paper warm, doodle tulisan tangan, foto orang asli Indonesia |
| **Trasparan** | Jujur, gak ada gimmick | Warna solid (no gradient blob), harga ditampilkan apa adanya |
| **Playful premium** | Lucu tapi gak murahan | Sparko maskot, sticker chrome, tilt 1-3° — bukan emoji spam |

### Referensi vibe (untuk gas desain)

| ✅ Pakai referensi | ❌ Jangan samain |
|---|---|
| Duolingo (playful + maskot kuat) | Kompetitor SMM Indo (neon ungu-pink, font Comic Sans) |
| Mailchimp (hand-drawn doodle + human copy) | Crypto/NFT landing (gradient blob gelap) |
| Linear (motion craft, clean) | MLM landing (emas-hitam, foto model bule) |
| Haloka (hero interaktif) | SaaS korporat (stock photo kantor) |

---

## 2. Palet warna

### 2.1 Token utama (WAJIB dipakai, jangan hardcode hex lain)

```css
:root {
  /* === INK (warna tinta utama) === */
  --ink:          #1a1a1a;  /* stroke, teks utama, "hitam" yang gak murni hitam */
  --ink-2:        #404040;  /* teks sekunder, label kecil */
  --ink-3:        #6b6b6b;  /* hint, placeholder */
  --on-dark:      #fdfdf8;  /* teks di atas dark surface */
  --on-dark-2:    #a8a89c;  /* teks muted di atas dark surface */

  /* === PAPER (warna latar, warm white) === */
  --paper:        #fdfdf8;  /* default page bg, high contrast dgn ink */
  --paper-warm:   #faf6ec;  /* section bg alternatif */
  --paper-warm-2: #f5efde;  /* section bg lebih dalam */

  /* === ACCENT (satu-satunya fill CTA) === */
  --accent-ink:   #1a1a1a;  /* CTA fill primer */
  --accent-hover: #000000;  /* CTA hover (lebih gelap) */

  /* === CYAN-TEAL (signature brand color) === */
  --color-sky-300: #7dd3fc;  /* highlight, tear drop Sparko, glow */
  --color-sky-400: #38bdf8;  /* BRAND SIGNATURE — body Sparko, ilustrasi primer */
  --color-sky-500: #0ea5e9;  /* deep accent, link, hover state */

  /* === POP (highlight, doodle, dekorasi SAJA — BUKAN fill utama) === */
  --pop-mango:     #fbbf24;  /* stabilo, sparkle, confetti, badge cheerful */
  --pop-mango-soft: rgba(251, 191, 36, 0.25); /* marker highlight */
  --pop-berry:     #ef4444;  /* cheek Sparko, dekorasi pop, badge alert dekoratif */
  --pop-berry-ink: #dc2626;  /* badge fill dgn teks putih (AA 4.5:1) */

  /* === DARK PANEL === */
  --dark-panel:   #1a1a1a;  /* bg section inverted */
}
```

### 2.2 Aturan pakai (gate audit)

1. **CTA fill**: HARUS `--accent-ink` (atau `--accent-hover` saat hover). Tidak pernah warna lain.
2. **`--pop-mango`**: max 1-2 kata per section (sebagai stabilo/highlight). Gak boleh fill besar.
3. **`--pop-berry`**: max 1 elemen per halaman, dekorasi saja. Badge teks putih → fill `--pop-berry-ink`.
4. **`--color-sky-*`**: aman dipakai luas untuk ilustrasi, elemen visual, badge bg, link.
5. **Gradient**: DILARANG gradient blob / mesh / radial fancy. Boleh subtle linear 2-stop max (mis. sky-400 → sky-500).
6. **Shadow**: Hard offset saja (`4px 4px 0 var(--ink)`), bukan blur halus.

### 2.3 Pasangan kontras yang aman (untuk teks)

| Kombinasi | Kontras | Status |
|---|---|---|
| `--ink` di `--paper` | ~16:1 | ✅ AAA |
| `--ink` di `--color-sky-400` | ~8:1 | ✅ AA |
| `--on-dark` di `--dark-panel` | ~16:1 | ✅ AAA |
| `--on-dark-2` di `--dark-panel` | ~7:1 | ✅ AA |
| White di `--color-sky-500` | ~4.7:1 | ✅ AA |
| White di `--pop-berry` | ~3.4:1 | ⚠️ Sub-AA (badge besar saja) |
| White di `--pop-berry-ink` | ~4.6:1 | ✅ AA |
| `--ink` di `--pop-mango` | ~9:1 | ✅ AAA |

> **Rule**: Teks kecil (<18px) butuh AA 4.5:1. Teks besar boleh 3:1. Kalau ragu → pakai `--ink` di atas warna terang, atau `--on-dark` di atas `--dark-panel`.

---

## 3. Tipografi

### 3.1 Font families (WAJIB pakai ini, jangan substitute)

| Role | Font | Source | Weight tersedia |
|---|---|---|---|
| **Display** (heading besar) | **Sora** | Google Fonts (open source) | 600, 700, 800 |
| **Body** (paragraph, UI) | **Plus Jakarta Sans** | Google Fonts (open source) | 400, 500, 600, 700, 800 |
| **Handwritten** (anotasi, doodle) | **Caveat** | Google Fonts (open source) | 400, 500, 600, 700 |

> Untuk project production: self-host subset latin (`.woff2`) via `@font-face` di `global.css`. Privasi + performa.

### 3.2 Type scale

| Token | Size (desktop) | Size (mobile) | Line-height | Weight | Font |
|---|---|---|---|---|---|
| `--text-hero` | clamp(40px, 5vw, 64px) | 40px | 1.05 - 1.1 | 800 | Sora |
| `--text-h1` | 36 - 44px | 32px | 1.15 | 800 | Sora |
| `--text-h2` | 28 - 32px | 24px | 1.2 | 700 | Sora |
| `--text-h3` | 20 - 24px | 18px | 1.3 | 700 | Sora |
| `--text-h4` | 18 - 20px | 16px | 1.4 | 600 | Plus Jakarta Sans |
| `--text-body` | 17px | 16px | 1.55 | 400 | Plus Jakarta Sans |
| `--text-body-lg` | 19px | 17px | 1.5 | 400 | Plus Jakarta Sans |
| `--text-small` | 14px | 13px | 1.45 | 500 | Plus Jakarta Sans |
| `--text-eyebrow` | 12 - 13px | 11px | 1.2 | 700 (UPPERCASE, tracking +0.05em) | Plus Jakarta Sans |
| `--text-handwritten` | 20 - 28px | 18px | 1.2 | 600 | Caveat |

### 3.3 Aturan pakai

- **Display Sora** hanya untuk H1, H2 hero, dan angka besar (stat). Jangan untuk body.
- **Body Plus Jakarta Sans** untuk semua UI text, paragraph, button, label.
- **Caveat** max 2 instance per halaman (anotasi doodle, panah, tanda tangan founder). Gak boleh untuk body atau heading.
- **Tracking**: Display -0.02em, body 0, eyebrow +0.05em.
- **Angka** (harga, stat): pakai `.num` class dengan `font-variant-numeric: tabular-nums` — biar gak goyang saat counter roll.
- **Warna teks**: 90% pakai `--ink`. `--ink-2` untuk subcopy/label. `--ink-3` untuk hint/placeholder.

### 3.4 Hierarchy visual

```
┌─────────────────────────────────────────┐
│ H1 Sora 800 64px   (display, hero)      │  ← 1 per halaman
│                                         │
│ H2 Sora 700 28px   "Sub-headline"       │  ← per section
│   ↑ kata kunci distabilo mango          │
│                                         │
│ Body PJS 17px Lorem ipsum dolor sit     │  ← paragraph
│ amet, consectetur adipiscing elit.      │
│                                         │
│ Caveat 22px "← ini penting!"  ← handwritten annotation (max 2)
└─────────────────────────────────────────┘
```

---

## 4. Maskot — Sparko

> ⚠️ Sparko adalah maskot **resmi**. **WAJIB** pakai ini untuk semua ilustrasi karakter di socio.id.
> Dilarang bikin karakter lain (petir biru abstract, robot helper, dll) tanpa approval.

### 4.1 Anatomi dasar

```
       ✦           ← top sparkle (mango, ∅~8px)
       │
      ╱│╲          ← spike ke-2 (sky-400 + ink stroke 3px)
     ╱ │ ╲
    ╱  ●  ╲        ← MATA KIRI (∅ 12px white + ink stroke)
   ╱  ── ── ╲      ← senyum
  ╱   ╲╱   ╲
  ╲    │    ╱      ← badan utama Z-shape
   ╲   │   ╱
    ╲  │  ╱
     ╲ │ ╱
      ╲│╱
       ╲
        ╲
         ╲           ← bottom point
```

### 4.2 Spec warna Sparko

| Bagian | Warna | Hex |
|---|---|---|
| Body utama (lightning bolt) | sky-400 | `#38bdf8` |
| Stroke / outline | ink | `#1a1a1a` (3px stroke) |
| Eye whites | white | `#ffffff` |
| Pupil | ink | `#1a1a1a` |
| Cheeks (blush) | berry | `#ef4444` @ 45% opacity |
| Top sparkle (✨) | mango | `#fbbf24` |
| Belly highlight (gloss) | white | `#ffffff` @ 35% opacity |
| Mouth (senyum) | ink | `#1a1a1a` |
| Confetti (celebrate pose) | mix mango + berry + sky-300 | — |
| Tear drop (sad pose) | sky-300 | `#7dd3fc` @ 85% |

### 4.3 6 Pose resmi

| Pose | Mata | Mulut | Tangan | Pose khusus | Dipakai di |
|---|---|---|---|---|---|
| **idle** | ● ● (bulat, pupil di tengah) | senyum kecil `︶` | hanging subtle | float 4s loop + blink acak | Navbar mini, hero default, section dekoratif |
| **wave** | ● ● (sama tapi senyum lebar) | senyum lebar | kanan ngacung, kiri hanging | tilt 2.5° ke kanan loop | HowItWorks step 1, "selamat datang", hero CTA |
| **celebrate** | ^_^ (squint) | O (mulut terbuka) | dua tangan ke atas | bounce 0.5s + 5 confetti dots | Order sukses, signup ok, promo |
| **sad** | ● ● (lebih kecil, pupil turun) | cembereng `︵` | dua lunglai | tilt -1.5° + air mata | Saldo habis, empty cart, "kok sepi" |
| **error** | × × | zigzag | kanan bingung ke atas, kiri hanging | shake 0.4s + 3 fizzle sparks berry | 500, API down |
| **sleep** | ‿ ‿ (garis tutup) | mulut kecil terbuka | tucked in (kecil) | breathe 5s + 3× "z" di atas | 404, maintenance |

### 4.4 Ukuran pakai Sparko

| Ukuran | Lokasi |
|---|---|
| **24px** | Logo di navbar (idle, no animation, simplified — sparkle + bolt + mata only) |
| **48 - 64px** | HowItWorks step icons, badge promo, dekorasi inline |
| **96 - 120px** | Hero section accent, empty state |
| **160 - 200px** | 404 page, celebration moment besar |

### 4.5 Do & Don't pakai Sparko

| ✅ Do | ❌ Don't |
|---|---|
| Pakai 1 dari 6 pose resmi | Gambar ulang Sparko dengan gaya beda |
| Stroke 3px konsisten | Stroke tipis/tipis gak konsisten |
| Sky-400 sebagai body | Ganti warna body (mis. ijo, ungu) |
| Sparkle di atas (idle/wave/celebrate) | Sparkle warna lain / dihilangin total |
| Cheeks berry subtle | Cheeks merah besar kayak badut |
| Pose konsisten dgn konteks (jangan celebrate di error state) | Random pose tanpa pertimbangkan mood |
| Self-host SVG inline (~1.6KB gzip) | Pakai raster PNG (gak scalable) |

### 4.6 File resource

- Component: `Sparko.svelte` (6 pose via prop, production-ready)
- Static: `sparko-static.svg` (untuk OG image, Figma import)
- Reference showcase: `sparko-preview.html`

---

## 5. Logo & iconography

### 5.1 Logo socio.id

**Versi saat ini**: wordmark "socio.id" lowercase, sans-serif tebal, dengan maskot/ikon di kiri.

**Spesifikasi**:
- Wordmark: Sora 800, tracking -0.04em, lowercase
- Ikon default: **Sparko pose idle, size 24px** (menggantikan paper-plane lama)
- Jarak ikon ↔ wordmark: 8px
- Alignment: baseline-aligned

```
[⚡Sparko] socio.id
```

**Variasi logo**:
1. **Primary (default)**: ikon + wordmark, warna ink, bg paper
2. **On dark**: ikon + wordmark, warna on-dark, bg dark-panel
3. **Icon only**: hanya Sparko (avatar, favicon, app icon)
4. **Wordmark only**: kalau space terlalu sempit untuk ikon

**Clear space**: minimum 1× tinggi ikon di semua sisi. Jangan letakkan elemen lain dalam area ini.

**Minimum size**:
- Icon only: 16×16px
- Wordmark only: 80px wide
- Full logo: 110px wide

### 5.2 Icon style guide

| Aturan | Detail |
|---|---|
| Style | Outline 2px, rounded line cap, rounded join |
| Ukuran default | 20×20 atau 24×24 |
| Warna default | `--ink` (atau `--on-dark` di atas dark bg) |
| State | Default, hover (scale 1.1), active (scale 0.95) |
| Library | Pakai **Lucide** atau **Heroicons outline** (kalau perlu flat icons) |
| Custom | Icon platform (IG, TikTok, YT, dll) = brand resmi masing-masing |

**Jangan**:
- Pakai emoji sebagai icon di UI
- Campur style (stroke + filled) dalam satu set
- Warna icon lebih dari 2 per section

---

## 6. Tombol / CTA

### 6.1 Style primer — Sticker Button

**Anatomi**:
- Border: 2px solid `--ink`
- Fill: `--accent-ink` (CTA primer) atau `--paper` (sekunder)
- Text color: `--on-dark` (di atas accent-ink) atau `--ink` (di atas paper)
- Border radius: 12px
- Shadow: `4px 4px 0 var(--ink)` (hard offset, NO blur)
- Hover: shadow membesar ke `6px 6px 0 var(--ink)` + `translate(-2px, -2px)` (spring 250ms)
- Active: shadow kembali `2px 2px 0` + `translate(2px, 2px)` (pressed feel)

**Typography**:
- Font: Plus Jakarta Sans, 600 weight
- Size: 16px (default), 17px (large)
- Padding: 12px 24px (default), 14px 28px (large)
- Tracking: 0
- Text: Sentence case ("Daftar Reseller", bukan "DAFTAR RESELLER")

### 6.2 Variasi tombol

| Variant | Fill | Text | Border | Use case |
|---|---|---|---|---|
| **Primary** | `--accent-ink` | `--on-dark` | 2px ink | CTA utama (Daftar, Pesan) |
| **Secondary** | `--paper` | `--ink` | 2px ink | CTA alternatif (Lihat Layanan) |
| **Ghost** | transparent | `--ink` | none | Link, "Lainnya" |
| **Mango accent** | `--pop-mango` | `--ink` | 2px ink | Highlight CTA (Promo Terbatas) — sparingly |
| **On dark** | `--on-dark` | `--dark-panel` | none | Di atas dark-panel section |

### 6.3 Contoh copy CTA

| ✅ Pakai | ❌ Jangan |
|---|---|
| "Daftar Reseller Rp50rb" | "Daftar Sekarang!" (terlalu generic) |
| "Intip 8.270 Layanan" | "Klik di sini" (gak ada info) |
| "Coba Hitung Cuanmu" | "Coba Gratis" (overclaim) |
| "Lihat Harga Dulu" | "Selengkapnya" (vague) |
| "Gas Mulai" | "Start Now" (gak Indonesia) |

### 6.4 Icon dalam tombol

- Icon di kiri atau kanan teks (konsisten, jangan gonta-ganti)
- Jarak icon ↔ text: 8px
- Icon size: 16-18px
- Icon stroke sama dengan text color

---

## 7. Permukaan (surfaces)

### 7.1 Tipe permukaan

| Tipe | Background | Border | Shadow | Use case |
|---|---|---|---|---|
| **Paper** (default) | `--paper` | none | none | Body section |
| **Paper warm** | `--paper-warm` | none | none | Section alternatif (selang-seling) |
| **Sticker** | `--paper` | 2px ink | 4px 4px 0 ink | Card promo, badge, harga card (max 4/halaman) |
| **Sticker warm** | `--paper-warm` | 2px ink | 4px 4px 0 ink | Variant sticker |
| **Sticker mango** | `--pop-mango` | 2px ink | 4px 4px 0 ink | Highlight card (max 1/halaman) |
| **Dark panel** | `--dark-panel` | none | none | Section inverted (FinalCTA, ResellerBand) |

### 7.2 Sticker chrome (paling kuat, jangan overuse)

**Rules**:
- Max **4 sticker besar per halaman** (card >200px wide)
- Sisanya: paper surface biasa dengan hairline border (`1px solid var(--ink-3)`)
- Tilt: `-3° sampai +3°` (acak natural, jangan semua miring ke arah yang sama)
- Hover: tilt jadi 0° + shadow membesar

**Template card sticker**:

```css
.sticker {
  background: var(--paper);
  border: 2px solid var(--ink);
  border-radius: 20px;
  box-shadow: 4px 4px 0 var(--ink);
  padding: 24px;
  transition: transform 250ms var(--ease-spring), box-shadow 250ms var(--ease-spring);
}
.sticker:hover {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0 var(--ink);
}
.sticker--tilt-left  { transform: rotate(-1.5deg); }
.sticker--tilt-right { transform: rotate(1.5deg); }
```

### 7.3 Section dividers

- **Gelombang/sudut tajam**: ❌ Dilarang
- **Hard line divider**: `1px solid var(--ink)` dengan margin section 64px atas/bawah
- **Doodle divider**: SVG garis tangan dengan sparkle kecil (1 per halaman, max)
- **Background swap**: cukup pindah dari `--paper` ke `--paper-warm` (atau sebaliknya)

---

## 8. Elemen dekoratif

### 8.1 Sparkle ✦

**Style**: 4-pointed star (bukan 5 atau 6), inline SVG, max 12×12px.

**Variasi**:
- Solid mango (`#fbbf24`)
- Outline ink (stroke only, 1.5px)
- Sky-400 solid (jarang, untuk variasi)

**Pakai di**:
- Samping kata penting di heading (sebagai bullet dekoratif)
- Dekorasi melayang di sekitar card
- Background hero (3-5 sparkle dengan opacity 0.3-0.6, posisi acak)

**Jangan**:
- Sparkle > 16px (jadi terlalu besar, mendominasi)
- Lebih dari 5 sparkle per section
- Sparkle warna random (pakai palette saja)

### 8.2 Doodle / hand-drawn elements

**Style**:
- Stroke: ink, 1.5-2px, linecap round, linejoin round
- Fill: none (outline only)
- Slight imperfection (jangan perfectly geometric — pakai Bezier curve dengan handle acak)
- Warna: ink untuk dominan, mango/berry untuk highlight

**Contoh doodle yang boleh**:
- Panah melingkar (anotasi "→ ini penting!")
- Bintang scribble
- Garis bawah bergelombang di bawah kata
- Bingkai foto polaroid-style (kotak miring + border + tape)
- Centang ✓ dan silang ✗ (gaya tulisan tangan)

**Jangan**:
- Doodle yang terlalu kompleks / ilustrasi kartun lengkap
- Doodle > 3 per section
- Doodle warna warni (palette saja)

### 8.3 Pattern / texture

**Background pattern (pilih salah satu per section)**:

| Pattern | CSS | Use case |
|---|---|---|
| **Dot grid** | `radial-gradient(circle, rgba(26,26,26,0.06) 1px, transparent 1px) 0 0/16px 16px` | Default section bg |
| **Cross hatch** | SVG pattern 24×24 dengan garis diagonal | Section hero bg |
| **Diagonal stripe** | SVG pattern 8×8 garis 45° | Section promo (rarely) |
| **None (clean paper)** | none | Section dengan banyak konten |

**Gak boleh**: gradient mesh, blob, noise halus, foto abstrak sebagai pattern.

### 8.4 Confetti (untuk celebrate moment)

**Style**:
- Bentuk: circle (60%), rectangle miring 15° (30%), star sparkle (10%)
- Ukuran: 6-12px
- Warna: dari palette (mango, berry, sky-300, ink, white)
- Physics: gravity + rotation random, 1.2s duration
- Max 36 partikel per burst

**Pakai di**:
- Sparko celebrate pose
- Tombol "Pesan!" saat simulator submit
- Order sukses toast
- Signup ok modal

---

## 9. Ilustrasi & doodle style

### 9.1 Prinsip umum

- **Outline-first**: selalu mulai dari garis (stroke 2px ink), baru isi warna
- **Geometris + sedikit imperfect**: bentuk dasar geometric, tapi dengan handle acak biar organic
- **Limited palette**: max 3-4 warna per ilustrasi
- **No realistic shading**: cukup flat color + 1 highlight opsional
- **Sparko-friendly**: ilustrasi lain harus "ngobrol" sama Sparko (gaya line weight konsisten)

### 9.2 Template ilustrasi promo

**Struktur umum**:
1. Sparko (1 pose) sebagai hero left/right
2. Object/ikon tengah (mis. dashboard mockup, HP dengan sosmed, dll)
3. Doodle panah/annotation (max 2)
4. Sparkle scattered (3-5)
5. Text area (heading + subcopy + angka)

**Color rules per ilustrasi**:
- Background: paper atau paper-warm (atau sky-300 soft untuk hero promo)
- Sparko: sesuai pose (lihat §4)
- Object: sky-400 fill + ink stroke 2px
- Highlight: mango / white
- Doodle: ink stroke 2px

### 9.3 Library komponen ilustrasi (yang boleh dipakai ulang)

| Komponen | Style | Use case |
|---|---|---|
| Mockup dashboard | Frame sticker + tilt 2°, isi dengan UI mini | Hero, banner "panel" |
| Mockup HP | Outline phone, screen dengan sosmed icon | Hero, banner sosmed |
| Orang memegang HP | Outline figure, abstrak (gak detail wajah) | Section human touch |
| Petir besar | Sparko style, lebih besar, tanpa mata | Dekorasi, pattern |
| Bintang scribble | 5-pointed star outline | Sparkle variant |
| Centang ✓ / silang ✗ | Hand-drawn style | Checklist, FAQ |
| Bingkai polaroid | Kotak + tape di sudut | Testimoni foto |
| Amplop / chat bubble | Outline + tail | Notifikasi, support |
| Dompet / uang | Simple icon style | Reseller section |
| Roket | Simple rocket (gaya Sparko) | "Boost", speed |

---

## 10. Fotografi

### 10.1 Style

| Aturan | Detail |
|---|---|
| Subjek | Orang Indonesia asli (wajah, tangan, aktivitas nyata) |
| Tone | Natural, candid, dokumenter — bukan stock photo kaku |
| Komposisi | Subject jelas, gak terlalu posed |
| Background | Konteks (warung, rumah, kerja) — bukan studio polos |

### 10.2 Perlakuan visual

**Duotone treatment** (untuk foto inline di landing):
```css
.photo-duotone {
  filter: grayscale(100%) contrast(1.1);
  mix-blend-mode: multiply;
  position: relative;
}
.photo-duotone::after {
  content: "";
  position: absolute;
  inset: 0;
  background: var(--color-sky-400);  /* atau mango untuk warm tone */
  mix-blend-mode: screen;
  opacity: 0.4;
}
```

**Polaroid frame** (untuk testimoni):
- White border 8px
- Tilt -2° sampai +2° (acak)
- Sticker shadow: `4px 4px 0 var(--ink)`
- Caption di bawah (handwritten Caveat, 16-20px)

### 10.3 Sumber foto

- **Priority 1**: Foto asli user/reseller socio.id (minta ke owner, lebih trustworthy)
- **Priority 2**: Unsplash keyword: `indonesian small business`, `umkm indonesia`, `content creator phone`, `jakarta street vendor`
- **Dilarang**: stock photo bule/asing untuk konten Indonesia, AI-generated face (deepfake risk), foto terlalu posed/korporat

---

## 11. Motion / animasi

### 11.1 Prinsip

> "Setiap animasi harus menjawab: ini bantu user paham / merasakan apa?"

| Prinsip | Detail |
|---|---|
| **GPU-only** | Hanya `transform` + `opacity`. NO `width/height/top/left/margin`. |
| **Duration token** | micro 120-200ms · UI 250-400ms · entrance 500-800ms · celebration 800-1200ms |
| **Easing** | entrance `--ease-dramatic` (= `cubic-bezier(0.16, 1, 0.3, 1)`); bounce `--ease-spring` (= `cubic-bezier(0.34, 1.56, 0.64, 1)`) max 1-2 elemen/viewport |
| **Reduced motion** | Semua animasi non-esensial off. Final state langsung visible. WAJIB implementasi. |
| **CLS 0** | Reserve space (min-height / aspect-ratio). Reveal on scroll pakai opacity+translate tanpa layout shift. |
| **Budget** | Max 3 infinite animation bersamaan di viewport manapun. Pause saat tab hidden. |

### 11.2 Vocabulary animasi (pakai ID ini saat specify)

| ID | Nama | Spec |
|---|---|---|
| A1 | Stagger reveal | opacity 0→1, translateY 24→0, 600ms ease-dramatic, delay anak +80ms |
| A2 | Pop-in spring | scale 0.8→1 + opacity, 500ms ease-spring |
| A3 | Word rotate | swap 2-3 kata, container fixed-height, interval 2.2s |
| A4 | Counter roll | angka 0→final, 900ms ease-out quad, tabular-nums |
| A5 | Marquee | translateX linear infinite 30-45s, duplikat konten, pause on hover |
| A6 | Line-draw | SVG stroke-dashoffset 100%→0, scroll-linked |
| A7 | Tilt hover | rotate ±2° + translate -2px + shadow membesar, 250ms spring |
| A8 | Magnetic button | translate max 6px ke arah kursor (desktop only, pointer:fine), lerp rAF |
| A9 | Confetti burst | 24-36 partikel, physics sederhana, 1.2s, sekali per interaksi |
| A10 | Float idle | translateY ±6px + rotate ±1°, 5-7s ease-in-out infinite |
| A11 | Marker swipe | pseudo-element scaleX 0→1 di belakang kata (stabilo mango), 450ms |
| A12 | Toast slide-in | translateX 110%→0, 400ms, auto-dismiss 4s |
| A13 | Accordion | grid-template-rows 0fr→1fr 300ms (satu-satunya layout-anim exception) |
| A14 | Scroll morph navbar | height 72→56px + shadow, 250ms, IO trigger |
| A15 | Parallax ringan | translateY = scrollProgress × 20px max, rAF passive |

### 11.3 Sparko animasi bawaan

Sparko component sudah punya animasi per pose (lihat §4.3). Saat generate banner:
- **Idle**: float 4s loop + blink acak → untuk banner statis, atau looping animation untuk GIF/MP4
- **Wave**: tilt 2.5° loop 1.8s → cocok untuk banner "hallo newbie"
- **Celebrate**: bounce 0.5s loop + confetti → cocok untuk promo/order sukses
- **Sad**: tilt -1.5° slow 3.5s → cocok untuk empathy message
- **Error**: shake 0.4s → jangan dipakai di banner (terlalu agresif)
- **Sleep**: breathe 5s + tilt -2° → cocok untuk banner malam/maintenance

---

## 12. Voice & copy

### 12.1 Tone of voice

- Sapa **"kamu"**, bukan "Anda" (kecuali legal/T&C)
- Seperti teman yang jago marketing: antusias, jujur, sedikit bercanda
- **Max 1 momen bercanda per section** — jangan jadi komedian
- Kalimat pendek, subjek-predikat jelas
- Angka konkret > adjektiva ("mulai proses < 1 menit" > "super cepat")
- **Jujur soal batas**: "followers bisa turun di platform manapun — makanya ada refill"

### 12.2 Bank kata/kalimat

**CTA**:
- "Daftar Reseller Rp50rb"
- "Intip 8.270 Layanan"
- "Coba Hitung Cuanmu"
- "Lihat Harga Dulu"
- "Gas Mulai"
- "Coba Pesan"

**Mikro-kopi** (pakai secukupnya):
- "tanpa drama"
- "gak pake ribet"
- "sekali bayar, tanpa langganan"
- "saldo kamu, aturan kamu"
- "gagal? saldo balik"
- "link doang, password kagak"
- "cuan jalan, tidur tenang"
- "buat kamu yang jualan jasa sosmed"

**Empty/error state**:
- "Yah, belum ada apa-apa di sini. Coba cari yang lain yuk."
- "Hmm, gak ketemu. Mungkin salah ketik?"
- "Waduh, ada yang error. Coba lagi sebentar, ya."

### 12.3 DILARANG

- "Solusi digital terbaik #1" / "revolusioner" / "synergy"
- Klaim superlatif tanpa data
- Emoji di heading (boleh max 1 di mikro-kopi/badge, itu pun sparing)
- "Guys", bahasa alay berlebihan
- Bahasa Inggris campur sembarangan ("Best panel SMM", "Number one panel")
- Clickbait / fear of missing out ("Jangan sampai ketinggalan!")

### 12.4 Aturan SEO (kalau untuk konten web, bukan banner)

1. Title ≤ 70 char, format: `{Keyword} + {Benefit} | Socio.id`
2. Meta description ≤ 160 char
3. H1 = 1 per halaman, mengandung keyword
4. Heading hierarchy ketat: H1 > H2 > H3 (no skip)
5. AEO answer block: 40-60 kata jawab langsung di paragraf pertama
6. Internal mesh: min 3 link kontekstual per halaman

---

## 13. Anti-pattern (JANGAN)

> ⚠️ Ini adalah **taboo list**. Kalau design agent generate hal-hal di bawah, **reject** dan regenerate.

### 13.1 Visual anti-pattern

| ❌ Anti-pattern | Kenapa | ✅ Alternatif |
|---|---|---|
| Gradient blob / mesh gradient | Generik, kekanakan, semua orang pakai | Solid color + dot grid pattern |
| Neon purple-pink-orange palette | Kelihatan seperti "affiliate scam" panel SMM abal-abal | Sky-400 + mango + ink |
| Font Comic Sans / Impact / Papyrus | Tidak profesional | Sora + Plus Jakarta Sans |
| Emoji spam di heading (🔥🚀💯⭐) | Gak classy, gak trustworthy | Sparko + sparkle ✦ SVG |
| Clip-art kartunan (Style freepik/vecteezy) | Tidak original, terlalu generic | Custom SVG Sparko style |
| Foto model bule stockphoto | Audience Indonesia, gak relatable | Foto asli orang Indonesia |
| Gradient gold/black "premium" MLM vibe | Terlalu korporat, MLM | Paper warm + ink + sky-400 |
| Background gelap dengan teks kontras rendah | Susah dibaca, melelahkan | Paper warm bg, dark panel inverted |
| Border radius 50% di semua elemen (lingkaran semua) | Kekanakan | Rounded 12-20px, sticker 20-28px |
| Shadow blur halus (`box-shadow: 0 4px 12px rgba(0,0,0,0.1)`) | Biasa, gak playful | Hard offset `4px 4px 0 ink` |

### 13.2 Copy anti-pattern

| ❌ Anti-pattern | ✅ Alternatif |
|---|---|
| "Solusi Terbaik #1 di Indonesia!" | "Panel SMM dengan harga grosir & garansi refill" |
| "100% aman no risk no banned" (overclaim) | "Tetap ada risiko penurunan — makanya ada refill 30 hari" |
| "Jutaan orang sudah pakai!" (kalau belum terbukti) | "Dipakai ribuan reseller & UMKM" (kalau ada datanya) |
| "Super murah banget cuan melimpah!" | "Mulai Rp48/1k · 357 layanan ≤ Rp500/1k" |
| "Daftar sekarang juga!" (pushy) | "Daftar Reseller Rp50rb" |

### 13.3 Structural anti-pattern

| ❌ Anti-pattern | ✅ Alternatif |
|---|---|
| Sticker chrome > 4 per halaman | Max 4, sisanya paper biasa |
| Bullet list panjang tanpa visual | Card / chat bubble / icon list |
| Tabel harga disembunyikan ("kontak admin") | Tabel real dengan harga transparan |
| Inline-stat angka tanpa konteks | "Sekarang 1.2xx order aktif diproses · rata-rata < 1 menit" |
| Real `<img>` diganti background | Pakai `<img>` dengan alt text deskriptif |

---

## 14. Template banner & social media

### 14.1 Standar ukuran

| Platform | Ukuran | Aspect Ratio | Format |
|---|---|---|---|
| Instagram Post (square) | 1080×1080 | 1:1 | PNG/MP4 |
| Instagram Portrait | 1080×1350 | 4:5 | PNG/MP4 |
| Instagram Story / Reel | 1080×1920 | 9:16 | PNG/MP4 |
| Instagram Carousel slide | 1080×1080 atau 1080×1350 | 1:1 atau 4:5 | PNG |
| Twitter/X Post | 1600×900 | 16:9 | PNG |
| Facebook Post | 1200×630 | ~1.91:1 | PNG |
| LinkedIn Post | 1200×627 | ~1.91:1 | PNG |
| YouTube Thumbnail | 1280×720 | 16:9 | PNG |
| TikTok Safe Zone | 1080×1920 (avoid top/bottom 200px) | 9:16 | MP4 |
| Web Banner (Hero) | 1920×1080 (responsive) | 16:9 | PNG/WebP |
| WhatsApp Share Preview | 1200×630 | ~1.91:1 | PNG |
| Email Header | 600×200 | 3:1 | PNG |

### 14.2 Layout patterns

#### Pattern A — "Sparko + angka" (untuk promo harga)

```
┌──────────────────────────────────────┐
│  ╔═══════════╗    "Mulai dari"      │
│  ║   ⚡IDR    ║    ┌─────────────┐ │
│  ║   48/1k   ║    │   48        │ │ ← Mango sticker, big number
│  ╚═══════════╝    │   /1k       │ │
│                   └─────────────┘ │
│  ✦ Sparko idle            ↓        │
│  "Twitter Tweet Views"             │
└──────────────────────────────────────┘

Palette: paper bg + sky-400 Sparko + mango sticker
Font: Sora 800 untuk angka, Plus Jakarta Sans untuk label
```

#### Pattern B — "Sparko ngomong" (untuk announcement)

```
┌──────────────────────────────────────┐
│                                      │
│   "Hallo, hari ini kami umumkan     │
│    bahwa..."                          │
│                                      │
│        ┌──────────────────┐          │
│        │   ⚡ Sparko     │          │
│        │   ┌──────────┐  │          │ ← Chat bubble style
│        │   │ Hi, baru │  │          │
│        │   │ Rp50rb!  │  │          │
│        │   └──────────┘  │          │
│        └──────────────────┘          │
│                                      │
│   CTA: Daftar →                      │
└──────────────────────────────────────┘

Palette: paper-warm bg + ink stroke + sky Sparko
Chat bubble: paper + 2px ink border + hard shadow
```

#### Pattern C — "Before / After" (untuk testimoni / case study)

```
┌──────────────────────────────────────┐
│ BEFORE              AFTER            │
│ ┌────────┐          ┌────────┐       │
│ │  ⚡    │          │  ⚡    │       │
│ │  sad   │          │  wave │       │
│ │  100   │   →      │  10K   │      │
│ │ follow │          │ follow │      │
│ └────────┘          └────────┘       │
│                                      │
│ "Order 10K followers IG,             │
│  proses 42 detik, refill 30 hari"    │
└──────────────────────────────────────┘

Palette: paper bg + sticker (before = muted, after = mango sticker)
```

#### Pattern D — "Step list" (untuk how-to / promo langkah)

```
┌──────────────────────────────────────┐
│   ✦ ✦ ✦                               │
│                                      │
│   1. 📝 Daftar    ────   ⚡ Sparko  │
│                      │               │
│   2. 💳 Top up    ────   idle        │
│                      │               │
│   3. 🚀 Order     ────   celebrate   │
│                                      │
│   "Mulai dalam 3 langkah."          │
└──────────────────────────────────────┘

Palette: paper bg + ink stroke + sky Sparko + mango ✦
Icon: outline Lucide style
```

#### Pattern E — "Stat card" (untuk milestone / social proof)

```
┌──────────────────────────────────────┐
│  ╔══════════════════════════╗        │
│  ║                          ║        │
│  ║     8.270                ║        │
│  ║     Layanan SMM          ║        │
│  ║                          ║        │
│  ║     ⚡ Sparko celebrating║        │
│  ╚══════════════════════════╝        │
│                                      │
│  "Semua platform, satu panel."      │
└──────────────────────────────────────┘

Palette: mango sticker (max 1/halaman) + ink + white
Number: Sora 800, 96px+
```

### 14.3 Contoh copy per konteks

| Konteks | Headline | Subcopy | CTA |
|---|---|---|---|
| Promo harga | "Mulai Rp48/1k" | "357 layanan di bawah Rp500/1k" | "Lihat Harga" |
| Reseller signup | "Modal Rp50rb, mulai bisnis hari ini" | "Termasuk saldo Rp20rb. Sekali bayar." | "Daftar Reseller" |
| New feature | "Sekarang ada QRIS" | "Top up otomatis, gak perlu transfer manual" | "Coba Sekarang" |
| Testimoni | "+3.000 followers dalam 1 jam" | "Order dari Rina, reseller Jakarta" | "Mulai Juga" |
| Empty state | "Belum ada order, nih" | "Coba pesan pertama kamu — simulasi gratis di /layanan" | "Coba Simulator" |
| Maintenance | "Panel istirahat bentar" | "Biasanya balik dalam 30 menit. Ngopi dulu yuk ☕" | "Status Page" |
| 404 | "Waduh, halaman ini terbang entah ke mana" | "Coba cek URL, atau pilih halaman populer di bawah" | "Balik ke Home" |

---

## 15. Quick-reference checklist

> Sebelum submit / publish design apapun, cek list ini.

### Visual
- [ ] Pakai palette dari §2 (tidak ada warna baru)
- [ ] Font dari §3 (Sora / Plus Jakarta Sans / Caveat) — tidak ada substitute
- [ ] Sparko dari §4 — pose konsisten dengan konteks
- [ ] Maksimal 4 sticker chrome besar per halaman
- [ ] Tilt dalam range -3° sampai +3°
- [ ] Hard offset shadow (`4px 4px 0 ink`), tidak ada blur halus
- [ ] Border radius konsisten (12-20px, sticker 20-28px)
- [ ] Dot grid pattern atau clean paper — tidak ada gradient blob

### Typography
- [ ] H1 hanya 1 per halaman/artikel
- [ ] Hierarchy H1 > H2 > H3 tidak ada skip
- [ ] Caveat (handwritten) max 2 instance
- [ ] Body text kontras minimal AA (4.5:1)
- [ ] Angka pakai tabular-nums
- [ ] Tidak ada font di < 12px

### Copy
- [ ] Sapa "kamu", bukan "Anda"
- [ ] Tidak ada emoji di heading (max 1 di mikro-kopi)
- [ ] Tidak ada klaim superlatif tanpa data
- [ ] Tidak ada jargon korporat (solusi, revolusioner, synergy)
- [ ] CTA informatif ("Daftar Reseller Rp50rb" bukan "Klik di sini")

### A11y & motion
- [ ] Reduced motion: animasi punya fallback final state
- [ ] Contrast ratio dicek (gunakan Stark / Colour Contrast Analyser)
- [ ] Alt text untuk semua foto (deskriptif natural)
- [ ] Icon button punya `aria-label`
- [ ] Sparko punya `role="img"` + `<title>`

### Brand consistency
- [ ] Sparko pose match konteks (lihat §4.3)
- [ ] Logo clear space minimum (1× tinggi ikon)
- [ ] Tidak ada emoji sebagai UI icon
- [ ] Tidak ada foto stockphoto bule untuk konten Indonesia

---

## 📚 Lampiran / File pendukung

| File | Tujuan |
|---|---|
| `Sparko.svelte` | Component production (Astro/Svelte) |
| `sparko-static.svg` | Static version untuk OG / Figma |
| `sparko-preview.html` | Showcase semua pose + size |
| `SPARKO_README.md` | Sparko usage guide |
| `LANDING_V2_PLAYFUL_PLAN.md` | Plan redesign lengkap (context) |

---

## 🤖 Untuk AI Design Agent

Jika kamu adalah AI yang generate visual untuk socio.id:

1. **Selalu mulai dengan membaca brand ini dulu** — jangan improvisasi warna / font / maskot
2. **Pakai file resource yang disebut di §lampiran** — jangan gambar ulang Sparko atau bikin karakter lain
3. **Pilih pattern dari §14** yang paling cocok untuk konteks, jangan bikin layout dari nol
4. **Cek anti-pattern §13 sebelum submit** — kalau ada yang muncul, regenerate
5. **Kalau ada unsure**: tampilkan beberapa opsi (maks 3), jelaskan trade-off-nya, minta user pilih
6. **Selalu sertakan alt text deskriptif** untuk setiap elemen visual dalam output text

**Prinsip utama**: Kalau ragu antara "lebih rame" atau "lebih clean", pilih **clean**. Lebih baik under-design yang on-brand, daripada over-design yang murahan.

---

*Dokumen ini adalah living document. Update setiap kali ada keputusan desain baru.*
*Last updated: 16 September 2026 · v1.0*
