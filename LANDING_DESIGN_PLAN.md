# LANDING DESIGN PLAN — socio.id

> **Untuk: coding agent frontend.** Redesign `landing/` (Astro 5 + Svelte 5 islands + Tailwind v4). **Out of the box, bold, bukan generic SMM panel.** Tujuan: konversi reseller SMM Indonesia 25-35 thn yang buka dari mobile.
>
> **BACA WAJIB**: `AGENTS.md`, `DESIGN.md`, `LANDING_DESIGN_PLAN.md` (file ini). Jangan ubah tech stack. Infra sudah live (`socio.id` di Cloudflare Pages, build `pnpm --filter landing build`).

---

## 0. Vision — "Out of the Box"

**Bukan panel SMM biasa** (biru tua + tabel + promo berkedip). Socio.id adalah **panel SMM yang terasa seperti app fintech modern** (GoPay/DANA/Linear/Stripe) — clean, percaya, cepat, premium.

**Scene sentence** (dari DESIGN.md):
> Reseller SMM Indonesia 25 tahun di café, buka HP mid-day, top up saldo Rp100k via QRIS, pesan 500 followers IG, tutup HP, lanjut kerja. Balik buka app 5 menit kemudian — status sudah Berhasil.

**Brand temperature**: Bold + High-Contrast (bukan hijau WA haloka, bukan biru generic). Accent cyan/indigo OKLCH. Tinted paper, bukan putih murni. Real photography, bukan illustration flat.

**3 kata kunci desain**: **Cepat** (load <1s, motion 150-400ms), **Percaya** (bukti nyata, bukan claim), **Profitable** (lihat untung, bukan jargon).

---

## 1. Tech Stack (JANGAN ubah — pakai versi terbaru dalam constraint)

| Lapisan | Teknologi | Versi | Catatan |
|---|---|---|---|
| Framework | **Astro 5** | ^5.17 | Static-first, islands hydration |
| Islands | **Svelte 5** | ^5.49 | Runes (`$state`, `$derived`, `$props`) |
| Styling | **Tailwind CSS v4** | ^4.0 | `@import "tailwindcss"` + `@theme` tokens |
| Fonts | **Plus Jakarta Sans** + **Sora** | Google Fonts | Display=Sora, Body=Jakarta Sans |
| Icons | **Lucide Svelte** | latest | Thin 1.5px stroke |
| Animasi | **Svelte transitions** + **CSS scroll-driven** | native | View Transitions API untuk page nav |
| Deploy | **Cloudflare Pages** | — | `wrangler pages deploy dist` |

**Tech modern yang WAJIB dipakai (selalu support browser modern):**
- **CSS View Transitions API** — halaman transisi mulus (`<ViewTransitions />` di Layout).
- **Scroll-driven animations** (`animation-timeline: view()`) untuk reveal section tanpa JS.
- **`:has()` selector** — stateful styling tanpa JS (parent select child state).
- **Container queries** (`@container`) — komponen adaptif berdasarkan container.
- **OKLCH color** — sudah di tokens, lebih konsisten perceptual.
- **CSS nesting** — native, gak perlu preprocessor.
- **`color-mix()`** — tint/shade dinamis dari token.
- **`@property`** — animated custom properties (gradient shift, counter).
- **Anchor positioning** (`anchor-name`/`position-anchor`) — tooltip/popover tanpa JS.
- **Lazy hydration** — `client:idle` / `client:visible` (Astro directive).

**DILARANG**: React/Vue/jQuery/Bootstrap, framework animasi berat (GSAP full), Lottie besar, illustration flat generic.

---

## 2. Design Tokens (dari `DESIGN.md` + `packages/ui/src/tokens.css`)

**Pakai token, jangan hardcode hex.** Ringkasan:

### Palette
| Token | Value | Use |
|---|---|---|
| `--color-primary` | `#4f46e5` (indigo 600) | CTA utama, link, active |
| `--color-primary-dark` | `#3730a3` (indigo 800) | Hover primary (DARKER) |
| `--color-accent` | `#06b6d4` (cyan 500) | Highlight, status energy |
| `--color-accent-dark` | `#0e7490` (cyan 700) | Hover accent |
| `--color-ink-900` | `#0f172a` | Text heading dark |
| `--color-ink-50` | `#f8fafc` | Surface light |
| Status: pending/progress/complete/canceled/partial | | Lihat DESIGN.md |

### Typography
- **Display**: Sora 700/800 (heading besar)
- **Body**: Plus Jakarta Sans 400/500/600
- **Mono**: JetBrains Mono (untuk angka/harga/data atom)
- Base **15px**, ratio 1.2. Heading scale: `text-5xl`(48) → `text-7xl`(72).

### Radius
`rounded-xs`(4) input → `rounded-2xl`(32) hero card → `rounded-full` pill/chip.

### Shadow
Soft layered: `shadow-sm` default, `shadow-2xl` untuk hero card (phone mockup).

### Motion
- Easing: `cubic-bezier(0.25, 1, 0.5, 1)` (haloka-style ease-out)
- Hover: 150-200ms
- Reveal: 400-600ms (scroll-driven, opacity+translateY)
- Entrance: 600-800ms (hero stagger)
- **Transform + opacity only** (GPU-safe). `prefers-reduced-motion` respected.

---

## 3. Section Flow (urutan wajib — adapt dari haloka, modifikasi untuk SMM)

```
1. Navbar (sticky, blur on scroll)
2. StickyCTA (mobile-only, bottom bar)
3. FloatingWhatsApp (bottom-right, above StickyCTA)
4. Hero + OrderSimulator (interactive phone mockup)
5. TrustBadges (stat strip + logo provider)
6. PainPoints (3 masalah reseller SMM)
7. Features (fitur unggulan — bukan list, storytelling)
8. HowItWorks (3 langkah, bukan 5)
9. SocialProof (testimoni + angka real)
10. PricingInteractive (table markup, bukan 3-card generik)
11. FinalCTA (big closing, gradient inverted)
12. FAQ (accordion)
13. Footer (link, sosial, payment logo)
```

---

## 4. Per-Section Spec (detail implementasi)

### 4.1 Navbar
- **Desktop**: transparent di top → `backdrop-blur` + `bg-white/80` setelah scroll 80px. Logo kiri, menu tengah (Fitur, Harga, Cara Kerja, FAQ), CTA "Masuk" + "Daftar" kanan.
- **Mobile**: logo kiri, hamburger kanan → buka **full-screen overlay menu** (bukan dropdown). Menu besar, jarak lega, CTA "Daftar Gratis" full-width di bawah.
- **Aktif state**: underline animated 2px accent, grow from center on hover.
- **Motion**: nav slide-down 200ms on load.

### 4.2 StickyCTA (mobile-only)
- Fixed bottom, `safe-area-inset-bottom`.
- 2 tombol: "Daftar Gratis" (primary, full-width) + "Lihat Harga" (ghost).
- Muncul setelah scroll 600px (Hero lewat).
- `backdrop-blur` + `bg-white/95` + shadow top.

### 4.3 FloatingWhatsApp
- FAB bottom-right, 56px circle, green WA logo.
- Pulse animation 2s infinite (gated reduced-motion).
- Tooltip "Chat dulu, gak susah!" muncul setelah 3s idle.

### 4.4 Hero + OrderSimulator (CENTERPIECE — wajib out of the box)

**Layout**: 2-col desktop (text kiri, phone mockup kanan), 1-col mobile (text atas, phone mockup bawah).

**Kiri (text)**:
- **Eyebrow pill**: `● Panel SMM #1 Indonesia 2026` (dot pulse accent).
- **H1**: "Naikkan Follower & Engagement Cuma Seminim **10 Ribu.**" — "10 Ribu" gradient text (primary→accent), display Sora 800.
- **Sub**: 1 kalimat, body Jakarta 18px, ink-600. Bukan paragraf panjang.
- **2 CTA**:
  - Primary: "Daftar Gratis, Rp0" — full pill, primary bg, white text, shadow-xl, shimmer on hover.
  - Ghost: "Lihat Demo 60 Detik" → scroll ke OrderSimulator.
- **Social proof mini**: 3 avatar (real photo Unsplash) + "Dipercaya 12.847 reseller" + ★ 4.9.

**Kanan (OrderSimulator — interactive phone mockup)**:
- **Phone frame**: border-ink-900 [12px], rounded-[2.5rem], shadow-2xl primary-900/40.
- **Tilt 3D**: `rotateY(-8deg) rotateX(5deg)`, hover → rotate-0 (CSS, 700ms).
- **Glow**: blur-[80px] radial accent/20 di belakang phone, animate-pulse.
- **Auto-play scenario** (4 step, loop):
  1. Pilih layanan "Instagram Followers 🔥" (list scroll, highlight).
  2. Input link + qty 1000 (stepper animasi count up).
  3. "Cek stok SMMturk…" (skeleton shimmer).
  4. "Order masuk antrean 🚀" → confetti micro (5 dot accent), status → "Berhasil" hijau.
- **User bisa interaktif**: tap layanan ganti, qty stepper manual, "Pesan Sekarang" → redirect `/daftar`.
- **Real-time price**: formatIDR, mono font, count-up animation.

### 4.5 TrustBadges
**Bukan** logo dump abu-abu. Pakai **inline-stat row** (anti-pattern #5 dari looks-expensive):
```
[12.847 reseller] [8.153 layanan] [1.2M+ order] [99.2% uptime] [★★ 4.9]
```
- Setiap stat: angka besar (display Sora 800), label kecil (ink-500), divider vertikal tipis.
- Real angka dari DB (kalau bisa fetch), atau hardcoded realistis.
- Background: subtle gradient `from-ink-50 to-white`.

### 4.6 PainPoints (3 masalah reseller SMM)
**Format**: 3 card dengan icon besar (Lucide 48px) + heading + 1 kalimat. **Bukan list bullet.**
1. **"Harga gak transparan"** — icon Eye-off. "Panel lain sembunyikan biaya admin & rate USD. Socio tampilkan harga IDR final + untung kamu."
2. **"Order lama, gak real-time"** — icon Clock. "Tunggu berjam-jam gak jelas. Socio polling tiap menit, status update <60 detik."
3. **"Salah pilih provider"** — icon AlertTriangle. "8185 layanan dari SMMturk, susah milih. Socio filter + rating + best-seller tag."

**Motion**: stagger reveal scroll-driven, card lift on hover (-4px translateY, shadow-lg).

### 4.7 Features (storytelling, bukan grid 6 icon)
**3 feature besar, alternating layout** (text kiri/kanan, screenshot/mockup sebelahnya):
1. **"Pesan 1 layanan, jalan dalam 60 detik"** — mockup form pesan + countdown timer.
2. **"Saldo IDR, bukan USD bikin pusing"** — mockup saldo hero + QRIS top-up.
3. **"Reseller? Auto-API key + webhook status"** — mockup API doc + code snippet.

**Tiap feature**: heading display 4xl, body 18px, 1 CTA secondary "Pelajari →".

### 4.8 HowItWorks (3 langkah, bukan 5)
**Horizontal timeline** (desktop) / **vertical timeline** (mobile):
1. **Daftar & Top Up** — 30 detik, QRIS/VA.
2. **Pilih Layanan** — 8.153 layanan, search + filter.
3. **Order Jalan** — otomatis ke SMMturk, status real-time.

**Nomor besar gradient** (1, 2, 3) + icon + 1 kalimat. Connector line dashed accent.

### 4.9 SocialProof
- **Testimoni 3 card** (avatar real photo, nama, @username, platform, 1 kalimat).
- **Stat besar**: "12.847 reseller aktif" center, display 7xl gradient.
- **Logo brand** (Instagram, TikTok, YouTube, Telegram) — grayscale, hover color.

### 4.10 PricingInteractive (TABLE, bukan 3-card)
**Anti-pattern #4**: ganti 3-tier pricing card dengan **HTML table markup**:
```
| Level    | Min Deposit | Markup  | Fitur                           |
|----------|-------------|---------|---------------------------------|
| Member   | Rp0         | 0%      | Semua layanan, support basic    |
| Agen     | Rp50k       | -10%    | API akses, priority support     |
| Reseller | Rp200k      | -20%    | API + webhook, white-label opt  |
```
- Highlight row "Agen" sebagai **recommended** (accent tint bg, badge "Paling Populer").
- CTA per row: "Daftar [Level]".
- **Interactive**: slider deposit → highlight level yang eligible.

### 4.11 FinalCTA (big closing, inverted)
- **Background dark**: `bg-ink-900` + radial gradient accent/20.
- **Heading display 7xl white**: "Mulai jualan followers hari ini."
- **Sub**: 1 kalimat ink-300.
- **CTA primary besar** (full pill, white bg, ink-900 text): "Daftar Gratis →".
- **Trust micro**: "Rp0 daftar • Tanpa kartu kredit • Bayar cuma saat order".

### 4.12 FAQ
- Accordion (native `<details>` atau Svelte component).
- 6 pertanyaan: Apa itu SMM panel? Berapa minimal deposit? Berapa lama order selesai? Ada garansi? Cara jadi reseller? Metode pembayaran?
- Plus link "Chat WhatsApp" untuk pertanyaan lain.

### 4.13 Footer
- 4 kolom: Brand+desc, Produk (Layanan, Harga, API), Perusahaan (Tentang, Blog, Kontak), Legal (ToS, Privacy, Refund).
- Payment logo: BCA, QRIS, Midtrans (real logo, grayscale).
- Sosial: IG, TikTok, WA, Telegram.
- Copyright + "Dibuat di Jakarta 🇮🇩".

---

## 5. Motion & Interaction Spec

### Global
- **View Transitions**: page nav mulus (`<ViewTransitions />` di Layout.astro).
- **Scroll reveal**: `animation-timeline: view()` — fade+translateY 20px, 400ms, ease-out.
- **Hover lift**: `-translate-y-1` + `shadow-lg`, 200ms.
- **Stagger**: child elements reveal bertahap (nth-child delay).

### Hero-specific
- **Phone tilt**: rotateY/X, hover rotate-0, 700ms.
- **Glow pulse**: `animate-pulse` 2s pada blur circle.
- **Count-up**: angka harga 0 → total, 800ms, ease-out.
- **Shimmer**: CTA primary, gradient sweep 1.5s on hover.

### Micro-interactions
- `navigator.vibrate(10)` on CTA tap (gated reduced-motion).
- Button press: `active:scale-95`, 100ms.
- Toast/feedback: fly-in bottom, 300ms.

---

## 6. Imagery & Assets

**Pakai real photo** (Unsplash/Picsum), bukan illustration flat generic:
- Avatar testimoni: `https://images.unsplash.com/photo-...` ( portrait wajah Indonesia).
- Background hero: subtle pattern SVG (geometric, bukan blob).
- Phone mockup: render dari komponen Svelte (bukan screenshot).
- Logo provider: real SVG (Instagram/TikTok/YouTube/Telegram).

**R2 storage** (`cdn.socio.id`): untuk asset berat (foto blog, banner). Landing page assets inline (Astro optimasi).

---

## 7. SEO & Performance

- **Meta**: title `Socio.id — Panel SMM Termurah & Tercepat Indonesia`, desc 155 char.
- **OG image**: 1200×630, generated dari hero.
- **Schema.org**: Organization + Product + FAQPage + BreadcrumbList (JSON-LD).
- **Sitemap**: `astro:sitemap`.
- **Lighthouse mobile target**: ≥95 Performance, ≥90 Accessibility, ≥95 Best Practices, ≥90 SEO.
- **Image**: `<Image>` astro:assets (WebP/AVIF auto), lazy load.
- **Font**: `font-display: swap`, preload Jakarta + Sora.
- **CSS**: critical inline, defer non-critical.
- **JS**: islands hydration selective (`client:idle`/`client:visible`), tidak `client:load` kecuali Navbar.

---

## 8. Anti-Pattern Audit (8 rules dari `looks-expensive`)

Sebelum bilang "done", cek:
1. ✅ Bullet budget ≤5 per section (Features = 3, bukan 6).
2. ✅ Eyebrow pill ≤1 per section (hanya Hero).
3. ✅ Card chrome ≤2 default (border OR shadow, bukan keduanya berlebih).
4. ✅ Pricing = HTML table, bukan 3-card generik.
5. ✅ Stat = inline-stat row, bukan 4-col grid terpisah.
6. ✅ Imagery = real photo, bukan blob/illustration flat.
7. ✅ Container variance ≥3 pattern (full-bleed, card, timeline, table, dark-inverted).
8. ✅ Font = Plus Jakarta Sans + Sora, bukan Inter default.

---

## 9. Mobile-First Checklist (WAJIB)

- [ ] Viewport 360×640 minimum, test di DevTools mobile.
- [ ] Touch target ≥44×44px.
- [ ] Text body ≥14px (base 15px).
- [ ] No horizontal scroll.
- [ ] StickyCTA + safe-area-inset-bottom.
- [ ] Hamburger → full-screen overlay menu (bukan dropdown).
- [ ] Hero text center mobile, left desktop.
- [ ] Phone mockup scale down 280px width mobile.
- [ ] Pricing table → card stack mobile.
- [ ] Timeline → vertical mobile.
- [ ] Lighthouse mobile ≥95.

---

## 10. Verification (sebelum bilang "done")

1. `pnpm --filter landing build` — sukses, output `dist/`.
2. `pnpm --filter landing dev` — manual test 360×640 + 768×1024 + 1280×800.
3. Lighthouse mobile ≥95.
4. Cek semua section ada (§3 flow).
5. Cek AA contrast untuk accent-filled (CTA primary, recommended row).
6. `prefers-reduced-motion` — animasi disable.
7. View Transitions antar page (kalau ada page lain).
8. Commit: `feat(M5): {section} — {item}` atau `fix(M5): {masalah}`.
9. Deploy: `wrangler pages deploy landing/dist` (atau push, Cloudflare auto-build).

---

## 11. Referensi Steal/Avoid

**Steal dari** (per DESIGN.md):
- **GoPay/DANA**: saldo hero gradient, quick grid, bottom nav feel.
- **Linear**: dark accent, motion easing, typography scale.
- **Stripe**: pricing table, real photo, clean spacing.
- **haloka**: phone mockup tilt 3D, scroll-driven reveal, sticky CTA.

**Avoid** (panel SMM jelek):
- Biru tua + tabel + promo berkedip.
- "CHEAPEST PANEL!!!1" caps lock.
- Ilustrasi flat orang kartun.
- Logo provider berderet abu tanpa konteks.
- Background gradient rainbow.
- Harga coret `(Rp50k ~~Rp30k~~)`.

---

## 12. Konten Copy (siap pakai, Bahasa Indonesia)

- **Hero H1**: "Naikkan Follower & Engagement Cuma Seminim 10 Ribu."
- **Hero sub**: "Panel SMM termurah & tercepat di Indonesia. 8.153 layanan, proses otomatis, status real-time."
- **CTA primary**: "Daftar Gratis, Rp0"
- **CTA ghost**: "Lihat Demo 60 Detik"
- **PainPoints**: "Harga gak transparan" / "Order lama" / "Salah pilih provider"
- **FinalCTA**: "Mulai jualan followers hari ini."
- **Trust**: "Dipercaya 12.847 reseller • 8.153 layanan • 1.2M+ order • 99.2% uptime"

---

*Dokumen ini kontrak untuk frontend agent. Kalau kontradiksi dengan `REBUILD_PLAN.md`, REBUILD_PLAN menang.*
