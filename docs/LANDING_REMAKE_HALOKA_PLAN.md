# Plan: Remake Haloka → Socio.id (Tanpa Hijau) — 1:1 Copy Rasa, Brand Socio

> Request user: "copy aja haloka tapi remake untuk smm socio, warnanya jangan hijau gini"
> Sumber: `/Users/maabook/Desktop/haloka` (Astro 5 + Svelte 5 + Tailwind 3, 15 komponen Svelte)
> Target: `landing/` Socio (Astro 5 + Svelte 5 + Tailwind 4 + MDX, `landing/src/pages/index.astro` dll)
> **JANGAN dikerjakan dulu** — file ini adalah PLAN untuk eksekusi bertahap. CTA utama diganti `Daftar Gratis` (bukan Rp50rb) sesuai instruksi terakhir.

## 1. Diagnosis singkat (verifikasi live)

| Aspek | Haloka (referensi) | Socio.id live (11 Sep) | Keputusan remake |
|---|---|---|---|
| Hero CTA | `Daftar Gratis` → `platform.haloka.id/register` | `Daftar Reseller Rp50rb` → `app.socio.id/daftar?mode=reseller` | **Ikut Haloka: `Daftar Gratis` → `https://app.socio.id/daftar`** (tanpa mode reseller) |
| Warna aksen | Hijau `#25d366` (WA), masih hijau di FinalCTA gradient | Socio sudah cyan-teal `accent-ink oklch(0.44)`. **Haram pakai hijau lagi** | Full soco: `accent`/`accent-ink`/`dark-panel` + `paper` |
| Layout | Navbar glass, hero kiri copy + kanan ChatSimulator, trust, pain, fitur, tutorial, sosial, pricing, final gut-dark, FAQ, footer | Sudah identik struktur (Navbar, HeroMockup, SmmProviderProof, ProblemLedger, OrderSimulator, OrderBoard, KapabilitasBento, HowItWorks, PricingTable, Testi, FinalCTA, FAQ, Footer) | Pertahankan struktur, **ganti skin token** + motion sama (tweened, reveal, staggered) |
| Motion | `tweened` Svelte, `requestAnimationFrame`, live-dot pulse | Sama (tweened `cubicOut`, `NumberFlow`) | Tidak perlu lib baru |

## 2. Apa yang di-copy (rasa Haloka)

1. **Struktur 1:1** — hero split, trust ledger, pain → problem ledger, interactive tutorial → OrderSimulator, social proof → TestiLedger, pricing interactive → PricingTable, final CTA dark dengan grid + shine.
2. **Motion per-section** — reveal stagger (`--d`), count-up, live-dot pulse 1.6s, order stream 2.2s, progress bar 6s, floatSlow, marquee ticker, FAQ rotate. Semua sudah tokenized, tinggal samakan timing.
3. **CTA raksasa** — FinalCTA primary `Daftar Gratis` + shine gradient (haloka style) — sekarang `Daftar Reseller Rp50rb` akan diganti.

## 3. Apa yang TIDAK di-copy (brand Socio menang)

- **Palette:** Haloka hijau → **diganti** `oklch` Socio (paper, ink, accent teal). Tidak ada `#25d366` lagi di mana pun.
- **Copy/angka:** Haloka "7 Hari Trial" → Socio tetap `8.295 layanan / 886 kategori / mulai Rp13` dinamis dari `prices.json` via `siteStats.ts` (tidak hardcode).
- **Model bisnis:** Haloka trial WA → Socio daftar gratis langsung (tanpa paywall reseller).

## 4. CTA Ganti: `Daftar Gratis`

### Sebelum (sekarang)
- Banyak titik: `app.socio.id/daftar?mode=reseller` → copy `Daftar Reseller Rp50rb`, `Daftar Rp50rb`, `Rp50.000 → Rp20.000 saldo`.
- File terkait: `Navbar.svelte:7`, `FloatingTabDock.svelte:11-40`, `StickyCTA.svelte:5`, `FinalCTA.svelte:6`, `index.astro:22`, `reseller.astro` (tetap reseller), `beli-pages`, `HeroMockup` secondary CTA, `Faq`.

### Sesudah (rencana)
- **HOME & global:** `https://app.socio.id/daftar` label `Daftar Gratis` (tanpa harga). Navbar, FloatingTabDock `/` + `/layanan`, FinalCTA, OrderBoard CTA, Footer, 404 fallback, beli-pages cross-sell default tetap gratis. StickyCTA home juga gratis.
- **SPESIALISASI:** `/reseller` tetap `Daftar Reseller Rp50rb` (halaman monetisasi), `/beli-*` & `/smm-panel-*` = `Pesan Sekarang` (sudah benar), `/blog` = `Masuk`.
- File ubah: `landing/src/components/Navbar.svelte`, `FloatingTabDock.svelte` (ctaExact `/`), `StickyCTA.svelte`, `FinalCTA.svelte`, `pages/index.astro` (regBase, hero secondary), `layouts/BeliPage` cross-sell, `data/beli-pages.ts` default fallback, `pages/404` CTA.

> Verifikasi: tidak ada lagi string `mode=reseller` di home flow. Hanya `/reseller` yang pakai.

## 5. Checklist anti-hijau

Grep `haloka` tidak ada, tapi grep socio untuk `#25d366` / `green` / `from-green` / `to-green`:

- `landing/src/components/FloatingWhatsApp.svelte` pakai `background:#25d366` inline? cek manual, ganti ke `var(--accent-ink)` atau `accent` Socio.
- `landing/src/styles/tokens.css` pastikan tidak ada `--green` sisa haloka clone.
- `FinalCTA` radial gradient `rgba(37,211,102,0.15)` → ganti ke `accent` token.

## 6. Fase eksekusi (detail 1:1, estimasi)

| Fase | Scope | File utama | Status |
|---|---|---|---|
| R0 | Plan ini (read-only) | `docs/LANDING_REMAKE_HALOKA_PLAN.md` | **IN PROGRESS** |
| R1 | CTA `Daftar Gratis` global (home flow) + audit no-green token | Navbar, FloatingTabDock, StickyCTA, FinalCTA, index | **NEXT** |
| R2 | Skin Haloka → Socio: hero copy alignment, mockup tint, trust/ticker spacing samakan rhythm haloka | `index.astro` + `SmmProviderProof` + `Ticker` | TBD |
| R3 | Simulasi haloka (ChatSimulator) → OrderSimulator polish: validasi shimmer + check-draw timing samakan 2500ms | `OrderSimulator.svelte` | TBD |
| R4 | Visual QA: screenshot repeat (`shot.mjs` fullPage) per section vs haloka reference | `docs/audit/landing/` | TBD |

## 7. Verifikasi per fase (wajib)

- `pnpm --filter landing check` 0 error, `build` 20 page complete, **Deploy Pages** → `curl sitemap-index/llms.txt/robots/Headers` → screenshot `shot-full.png` + part `p-mockup/s-sim/s-board`.
- Guard: tidak ada regresi angka dinamis (grep `8\.295` di `dist` tetap dari build, tidak hardcode baru).

## 8. Risiko

- Repo `ReqTimeout/haloka-landing` 404 → pakai lokal `/Users/maabook/Desktop/haloka` sebagai truth. Jika user push repo private, ganti remote `origin` cek ulang.
- Build mode aktif → perubahan landing tidak auto-deploy ke app VPS (pisah). Hanya `landing/dist` via Pages.
