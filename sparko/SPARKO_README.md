# Sparko — Maskot Socio.id

Karakter petir (lightning bolt) netral gender, multi-pose, menggantikan paper-plane logo sebelumnya.

## 📦 File yang dihasilkan

| File | Tujuan |
|---|---|
| `Sparko.svelte` | Component production-ready (Astro + Svelte 5). Import & render langsung. |
| `sparko-static.svg` | Versi statis tanpa animasi (untuk OG image, fallback, preview di Figma) |
| `sparko-preview.html` | Showcase semua 6 pose live di browser — buka file ini di Chrome untuk lihat |
| `SPARKO_README.md` | Dokumen ini |

## 🎨 Design rationale

- **Bentuk**: lightning bolt chubby — metafora "boost" / "instan" (sama dengan paper-plane original) tapi lebih berani dan memorable
- **Warna**: sky-400 (cyan-teal brand) sebagai body utama, dengan mango sparkle, berry cheeks, dan ink stroke 3px
- **One gender, totally neutral**: gak ada indikator gender sama sekali (kumis, eyelash, body shape gender). Bisa diapa-apain tanpa risiko representational
- **Cheeks**: blush subtle untuk warmth, tapi hilang di pose sad/error/sleep (emosi lebih kuat dari cuteness)
- **Top sparkle**: emoji/star mini di atas kepala — kasih personality "ide muncul terus"

## 🎭 6 Pose — kapan dipakai

| Pose | Visual cue | Dipakai di |
|---|---|---|
| **idle** | mata bulat, senyum kecil, float halus 4s | Navbar logo mini (24px), hero default, semua section yang gak ada momen khusus |
| **wave** | mata ^_^, senyum lebar, tangan kanan ngacung | HowItWorks step 1, hero CTA hover, "hallo newbie" welcome screen |
| **celebrate** | mata tertutup ^_^, mulut O, dua tangan ke atas, confetti | Order sukses, signup confirmation, confetti moment |
| **sad** | mata turun, mulut cembereng, air mata turun, tangan lunglai | Saldo habis, empty cart, "kok hasilnya kosong ya?" |
| **error** | mata X X, mulut zigzag, tangan satu bingung ke atas, fizzle sparks | 500 page, API down, form gagal submit |
| **sleep** | mata tutup garis, mulut kecil, zZz di atas, badan miring | 404 page, maintenance mode, "panel istirahat dulu ya" |

## 🛠️ Integrasi ke project

Letakkan di `landing/src/components/Sparko.svelte`. Lalu import:

```svelte
<script>
  import Sparko from '../components/Sparko.svelte';
</script>

<!-- Hero mockup -->
<Sparko pose="idle" size={96} />

<!-- HowItWorks step 1 -->
<Sparko pose="wave" size={48} />

<!-- Order sukses toast -->
<Sparko pose="celebrate" size={64} />

<!-- 404 page -->
<Sparko pose="sleep" size={160} />

<!-- Empty cart / saldo habis -->
<Sparko pose="sad" size={80} />
```

## ⚡ Performance budget

- **SVG size**: ~1.6KB gzip per instance (semua pose dalam 1 file karena prop-based)
- **Render**: pure SVG, no Canvas, no external dependency
- **Animations**: transform-only (GPU compositor), single animation per instance saat idle
- **Reduced-motion**: otomatis off via `@media (prefers-reduced-motion: reduce)`
- **A11y**: `role="img"` + `<title>` + dynamic `aria-label` per pose
- **Reuse**: 1 file untuk 6 pose (gak perlu 6 file terpisah)

## 🎯 Spec warna (pakai design tokens, jangan hardcode)

```css
/* Wajib ada di tokens.css project */
--ink: #1a1a1a;              /* stroke + pupils */
--color-sky-400: #38bdf8;    /* body main */
--color-sky-300: #7dd3fc;    /* tear drop (sad pose) */
--pop-mango: #fbbf24;        /* top sparkle, confetti */
--pop-berry: #ef4444;        /* cheeks, fizzle sparks */
```

Fallback hex di component akan handle kalau token belum didefine.

## 🧪 QA checklist (sebelum masuk FASE 1 design system)

- [ ] Buka `sparko-preview.html` di Chrome — semua 6 pose harus jalan & smooth
- [ ] Toggle OS "Reduce motion" — animasi harus mati, pose final tetap kelihatan jelas
- [ ] Resize ke 24px (navbar) — masih recognizable sebagai petir? Eyes masih kelihatan?
- [ ] Resize ke 160px (404 hero) — gak pixelated? Stroke masih proporsional?
- [ ] Kontras: body sky-400 di atas paper-warm — readable? (untuk AA, cuma perlu kalau ada teks di mascot — Sparko pure visual jadi gak masuk hitungan kontras WCAG, tapi stroke ink membantu definisi)
- [ ] Screen reader: aria-label "Sparko — wave" terdengar meaningful?
- [ ] Cek bundle: tambah Sparko ke hero, jalankan `pnpm build`, lighthouse perf masih ≥ 90?

## 📝 Decision log

| Date | Decision | Rationale |
|---|---|---|
| 2026-09-16 | **Konsep A (Petir/Spark)** dipilih | Diferensiasi tinggi, simple shapes, color-on-brand, metafora "boost" masih kuat |
| 2026-09-16 | Nama: **Sparko** | Catchy, netral, easy to remember, references "spark" (petir) |
| 2026-09-16 | **6 pose** termasuk sedih/error/sleep | Coverage penuh untuk state machine UI modern (loading → success → error → empty → maintenance) |
| 2026-09-16 | **One gender, neutral** | Inclusive default, gak ada representasi gender sama sekali |
| 2026-09-16 | Sky-400 sebagai body color | Cocok dengan accent-ink & cyan-teal brand, vibrant tapi gak neon |

## 🔄 Next steps (kalau di-approve)

1. Replace paper-plane di logo navbar (`Navbar.svelte`) dengan `<Sparko pose="idle" size={24} />`
2. Replace "Si Socio" di `HowItWorks.svelte` dengan `<Sparko pose="wave" size={48} />`
3. Tambah `<Sparko pose="celebrate" />` di OrderSimulator success state
4. Replace empty state mascot di `/layanan` dengan `<Sparko pose="sad" />`
5. 404 page: `<Sparko pose="sleep" size={160} />`
6. Maintenance page: `<Sparko pose="sleep" />` + "panel istirahat" copy
7. Update D-3 di LANDING_V2_PLAYFUL_PLAN.md §0.3: dari "paper-plane bermata" → "Sparko (lightning bolt character, 6 pose, file: Sparko.svelte)"

---

*Built with ⚡ by Mavis · 16 September 2026*
