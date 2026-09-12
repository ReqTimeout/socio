# LANDING V2 PLAN — Socio.id Premium Redesign (Baca Ulang Semua MD)

> **Status**: PLAN ONLY — tidak ada kode diubah. Dokumen ini adalah jawaban atas keluhan "designnya jelek semuanya" + audit mengapa Haloka terasa hidup tiap section sementara Socio flat.
> **CTA global sudah Daftar Gratis** (`https://app.socio.id/daftar` — R1 selesai `eeda59e`), jadi plan ini melanjutkan dari situ, bukan mengulang isu paywall. Warna **tanpa hijau Haloka** (`#25d366` haram) — brand Socio cyan-teal `accent-ink` menang.
> **Sumber MD yang dibaca ulang** (50+ file): `LANDING_DESIGN_PLAN.md`, `LANDING_REMAKE_HALOKA_PLAN.md`, `landing-redesign.md`, `WIREFRAME_SOCIOID.md`, `DESIGN.md`, `DESIGN_BRIEF.md`, `MOBILE_UX_GUIDE.md` implisit, `REBUILD_PLAN.md §0-§6`, `index.astro`, `Layout.astro`, `haloka/src` (15 komponen referensi).

---

## 1. Diagnosis: Kenapa Socio Terasa Jelek (7 Biang)

Auditor baca `index.astro:32-159` + `Layout.astro:96-141` + `haloka/src/components/*.svelte` live. Jeleknya bukan 1 hal, tapi 7 sekaligus:

| # | Gejala di live socio.id (Sep 2026) | Akar (dari MD) | Bukti file |
|---|---|---|---|
| **J1 — Flat, tidak ada koreografi** | Setiap section muncul statis. Haloka tiap grid punya `animate-on-scroll opacity-0 translate-y-10 → opacity-100 1000ms delay-200` `Features.svelte:70` + stagger `--d`, Socio hanya `.reveal` generic di `Layout.astro:98` tanpa stagger per-section. Koreografi `WIREFRAME §4 Per-Section Wireframe` + `LANDING_DESIGN_PLAN §3g.1` belum dieksekusi di `ProblemLedger`, `KapabilitasBento`, `PricingTable`, `TestiLedger`. | `landing-redesign.md §2.2 L-B` (whitespace void), `LANDING_DESIGN_PLAN §3g.1` table reveal kosong | `index.astro:110-138` stack 7 section tanpa `style="--d"` |
| **J2 — Container monoton** | Semua section pakai `max-w-6xl px-5 md:px-8 py-16` yang sama, bg `paper/paper-2/white` selang-seling saja. `DESIGN.md §5 #7 Identical containers` → harus ≥3 pola (ledger/table/bento/full-bleed/prose), Socio baru 2 (ledger + table) yang terasa beda. `WIREFRAME §4.4-4.12` contract variance belum kepakai. | `DESIGN.md §5 #7`, `WIREFRAME §4.5-4.12` | `index.astro` 7 section semua `border-y` + `bg-paper*` |
| **J3 — Hero ledger kaku** | USP ledger 4 row `divide-y py-2.5` terlihat seperti tabel invoice, bukan hero selling. Haloka hero pakai copy besar + SOP mockup hidup `PainPoints.svelte:82 blob` + shimmer. `landing-redesign.md L-A` (wrap jelek) sudah difix parsial tapi rhythm masih kaku. | `landing-redesign.md L-A, L-C` | `index.astro:54-71` |
| **J4 — Imagery hambar** | `LANDING_DESIGN_PLAN §2 Icon & art` mau SVG art system, kenyataan: hanya `HeroMockup.svelte` CSS + `KapabilitasBento` ikon generik. Tidak ada foto real `<img>` + `DESIGN.md §0 Real imagery` dilanggar. Haloka pakai `ChatSimulator` phone frame `hover:scale-105` + `animate-pulse` tiap card, jadi terasa tangible. | `DESIGN.md §0, §5 #6`, `WIREFRAME §7.2` | `landing/src/components/*` grep `img` = 0 di home |
| **J5 — Motion domain lemah** | `DESIGN.md §4 Motion: ≥1 domain-specific per screen` — Socio baru 2 (HeroMockup stream + OrderSimulator tween) yang hidup, sisanya hover biasa. Haloka punya 6 domain: blob, slider `tweened` jam, shimmer, CRM `setInterval 3s` `Features.svelte:30`, scroll `animate-scroll-up 120s` `SocialProof.svelte:128`. | `LANDING_DESIGN_PLAN §3g #A1-A13`, `WIREFRAME §5 Micro-Interaction` | `landing/src` grep `animate` = 6 hit vs haloka 18 |
| **J6 — Typo & hierarchy** | H1 `text-[length:var(--text-hero)]` benar, tapi section H2 semua `text-2xl/3xl font-bold` tanpa eyebrow/overline, jadi tidak ada hierarchy scan. `DESIGN_BRIEF Phase 1` scene "reseller rebahan scroll" butuh H2 yang bisa di-skim dalam 1 detik. | `WIREFRAME §1.2`, `DESIGN.md §3` | `index.astro:145` FAQ H2 tanpa kicker |
| **J7 — Trust tipis** | Inline-stat prose `1.240 order aktif...` benar anti-pattern, tapi hanya 1 baris teks. `WIREFRAME §4.3` mau provider proof + inline-stat icon, `landing-redesign.md L-H` trust band mono. Haloka trust pakai 4 icon lock/lightning/shield/brain. | `landing-redesign.md L-H`, `WIREFRAME §4.3` | `SmmProviderProof.svelte` belum icon grid |

**Kesimpulan audit Haloka vs Socio (verifikasi svelte sama bisa)**: Stack identik `astro 5.17 + svelte 5.49 + tailwind`, tanpa `gsap/framer/lenis/motion` (`haloka/package.json:12`, `landing/package.json:12`). Haloka anim pakai **IntersectionObserver threshold 0.1 + svelte `fly/fade` + `@keyframes blob/shimmer/scroll`** + `tweened cubicOut`. Socio **bisa sama persis tanpa lib baru** — cuma belum dipasang global dan belum ada koreografi per-section `Features.svelte:15-27` pattern. Jawaban untuk "apakah kamu gabisa padahal sama pakai svelte": **bisa, tinggal copy pola ini**.

---

## 2. Tujuan V2 (Apa itu "Bagus" untuk Socio SMM)

**Positioning tetap** (`LANDING_DESIGN_PLAN §1`): panel SMM Indonesia, reseller 24 di kosan Bandung rebahan 11 malam, thumb-reachable, light theme. V2 bukan ganti positioning, tapi **naikkan craft level dari 6/10 → 9/10**.

North star: **Haloka motion + GoPay fintech clarity + Linear density**. Suhu: **Neutral/Clean + 1 accent jenuh cyan-teal** (bukan hijau). Scene Socio: `DESIGN_BRIEF` "Top up, pesan, status update — 1 tap".

**Prinsip V2 (dari DESIGN.md §0 + WIREFRAME §10 Do/Don't)**:
1. **Variance is the design** — tiap section ganti containment (prose / ledger / inset panel / table / bento / full-bleed / editorial list). Jangan 7 section kotak putih ber-border sama.
2. **Real imagery > blob** — tiap 2 section, 1 punya `<img>`/`SVG art`/`phone frame` hidup. Blob blur Haloka dipakai hemat (1–2 saja).
3. **1 tujuan 1 CTA 1 motion per section** (`WIREFRAME §4`). Hero jual, ticker bukti hidup, ledger problem → simulator bukti transparan, bento bukti breadth.
4. **Mobile-first koreografi** — 360×640 acuan, reveal stagger + dock + stickyCTA sinergi. Desktop adalah ekspansi, bukan sumber.
5. **AA contrast + reduced-motion** selalu — `accent-ink` fill + `prefers-reduced-motion` mati total (pattern `Layout.astro:96` + `Features.svelte:30` interval cleanup).

**Yang bukan V2**: ganti stack ke Next/Nuxt, ganti font Inter, pakai Redis/GSAP ScrollTrigger berat, invent fitur baru di luar plan tanpa approval (`AGENTS.md §0 #4`).

---

## 3. Kontrak Desain V2 (Token & Aturan Pakai — Kompilasi DESIGN.md + WIREFRAME §1)

**Palette tetap** (`DESIGN.md §1`, `WIREFRAME §1.1`): OKLCH cyan-teal `accent-ink oklch(0.44)` untuk button fill AA 5.4:1, `paper oklch(0.985)` bg utama, `ink oklch(0.175)` heading. **Jangan invent warna baru** di komponen — pakai `var(--accent-ink)`, `var(--paper-2)`, `var(--hairline)`. Hijau Haloka hanya sisa di `FloatingWhatsApp` `bg:#25d366` inline → ganti `var(--accent-ink)` (checklist `LANDING_REMAKE_HALOKA_PLAN §5`).

**Type tetap** (`DESIGN.md §3`): `Sora 600-800` display (H1/H2/angka), `Plus Jakarta Sans 400-700` body, mono `≤14px` hanya ID order/harga/1k. `text-wrap balance` heading, `tabular-nums` angka.

**Spacing tetap** (`LANDING_DESIGN_PLAN §2`): base 8, section pad `64-80 mobile / 96-128 desktop`, radius `8/12/16/24/9999`, hairline `color-mix(ink 8%)`.

**Motion kontrak V2** (gabungan `DESIGN.md §4` + `WIREFRAME §1.4` + `LANDING_DESIGN_PLAN §3g`): 
- `transform/opacity` only, dur `150-350 enter`, `ease-out-soft cubic-bezier(0.16,1,0.3,1)`, `ease-spring 0.34,1.56,0.64,1` hanya dock-pop/delight.
- **Koreografi global** (`LANDING_DESIGN_PLAN §3g.1` + `WIREFRAME §4`): hero load-sequence 120ms stagger, tiap section scroll reveal `threshold 0.15 rootMargin -40px` sekali (`Layout.astro:104`), internal stagger 40-80ms via `style="--d: 40ms"` dan `is-visible` toggle. **V2 wajibkan ini di 9 section** — sekarang baru 2 yang pakai `--d`.

---

## 4. Motion System V2 — Jawab "Kenapa Haloka Hidup Tiap Section & Socio Engga"

**Haloka hidup karena** (verifikasi `haloka/src`):
- `Features.svelte:15` `new IntersectionObserver(... threshold 0.1) → remove opacity-0 translate-y-10 → add opacity-100` per `.animate-on-scroll` + stagger `delay-200`.
- Tiap card punya `in:fly {y:20}`, `in:fade {duration:300}`, `transition: all duration-500 hover:-translate-y-2`, `setInterval 3s` CRM state `Features.svelte:30`, `animate-blob 7s infinite` `PainPoints.svelte:277`, `animate-scroll-up 120s linear` `SocialProof.svelte:128`.

**Socio sudah punya mesin yang sama tapi idle**:
- `Layout.astro:96` observer + `global.css .reveal → .is-visible 400-600ms stagger` sudah jalan, **tapi** `ProblemLedger.astro`, `KapabilitasBento.astro`, `PricingTable.astro`, `TestiLedger.astro` tidak assign `class="reveal"` + `--d` per row.
- `HeroMockup.svelte:38` + `OrderSimulator.svelte:41` sudah `tweened + reduced` gated, tapi `KapabilitasBento` chart, `HowItWorks` panels, `Ticker` marquee, `Faq` chevron belum connect ke observer.

**Fix V2 tanpa lib baru (Svelte 5 cukup)** — copy pattern Haloka 1:1:
1. Tambah util `landing/src/lib/reveal.ts` (observer + reduced + fallback scroll — mirip `Layout.astro:122 checkScroll` yang sudah anti-coalesce). Semua section import atau pakai global script yang ada.
2. Tiap section: `class="reveal"` di container + `style="--d: ${i*60}ms"` per row/card (contoh `Haloka Features.svelte:70` + `delay-200`). Hover: `group-hover:scale-105 -translate-y-1 shadow-xl` (pattern Haloka card).
3. Domain pulse: `live-dot 1.6s pulse` tetap, CRM-style interval untuk `KapabilitasBento` card rotasi tiap 3s (copy `Features.svelte:30`), ticker `40s linear infinite pause on hover` tetap.

**Jika mau terasa lebih premium 2026** (opsional, bukan wajib):
- `motion` (ex-framer) `npm i motion` untuk spring natural `stiffness/damping` ganti `tweened cubicOut` — tetap Svelte, bundle +6kb.
- `lenis` smooth scroll ganti `scrollIntoView smooth` Haloka — rasa iOS, tapi tambah +3kb + perlu `prefers-reduced-motion` off. **V2 default: jangan tambah dulu** (jaga Lighthouse ≥90).

---

## 5. IA & Struktur V2 (Urutan Konversi — Dari LANDING_DESIGN_PLAN §3 + WIREFRAME §4, Koreksi L-I)

**Urutan V2** (per `landing-redesign.md L-I FinalCTA sebelum FAQ` → fixed: **FAQ dulu baru FinalCTA**):

| # | Section | Pola V2 (variance) | Bg | Motion V2 | File |
|---|---|---|---|---|---|
| 1 | Navbar + FloatingTabDock | glass pill dock 3 tab + CTA Daftar Gratis + blur threshold | transparan→paper | dock entrance `translateY 300ms` + `dock-pop spring` | `Navbar.svelte`, `FloatingTabDock.svelte` |
| 2 | Hero | split 5/12 copy + 7/12 live phone mockup (CSS, no chrome dots) | paper | load-sequence blur-in 600ms stagger 120ms | `index.astro:32`, `HeroMockup.svelte` |
| 3 | Ticker strip | domain marquee + status chip live-dot | dark-panel tipis | marquee 40s linear pause hover | `Ticker.astro` |
| 3.5 | Trust inline-stat + ProviderProof | icon mini (layers/zap/clock/users) + inline prose, bukan 4-col strip | paper | icon fade scale 200ms + NumberFlow count-up | `SmmProviderProof.svelte` (upgrade) |
| 4 | ProblemLedger | 4 row hairline → ledger, tiap row icon chip 32px + solusi Socio | paper-2 | row stagger 60ms + icon scale 1.1 | `ProblemLedger.astro` |
| 5 | OrderSimulator | inset panel (1 dari 2 kartu landing) — 3 field + gauge SVG | paper | gauge `stroke-dashoffset spring 300ms` + `in:fly y:16` panel | `OrderSimulator.svelte` |
| 6 | OrderBoard | real table 8 row (ID mono, StatusBadge pulse) → mobile 2-col def list | paper | row stagger 35ms + live-dot pulse Diproses | `OrderBoard.astro` |
| 7 | KapabilitasBento | bento 5 cell (1 besar 2×2 mockup chart) — variance utama | paper-2 | cell stagger 70ms + chart SVG draw 600ms + floatSlow phone | `KapabilitasBento.astro` |
| 8 | HowItWorks | timeline 3 langkah + phone preview kartu | paper | step card reveal 80ms + panel `fly y:20` | `HowItWorks.svelte` |
| 9 | TestiLedger | 3 ledger rows + inisial avatar (bukan card grid) | paper-2 | row stagger 80ms + avatar hover scale | `TestiLedger.astro` |
| 10 | PricingTable | inline prose + real table harga `prices.json` (bukan 3-tier) | paper | row stagger 40ms + tabular-nums | `PricingTable.astro` |
| 11 | FAQ | accordion ledger + featured 2 Q chip accent | paper-2 | chevron rotate 180ms + panel max-height 220ms + search filter | `Faq.svelte` |
| 12 | FinalCTA | full-bleed dark + grid shine + CTA Daftar Gratis | dark-panel | glow breathing 6s + glow hover | `FinalCTA.svelte` |
| 13 | Footer | typographic 3 col + newsletter retention hook (phase L7) | ink-900 | — | `Footer.astro` |

**Wireframe delta vs sekarang**: kutip `WIREFRAME_SOCIOID.md §3 Mobile Floating Premium Dock` (dock 5 item Beranda/Layanan/Blog/Reseller/CTA) + `WIREFRAME §4.X` per-section contract — Socio sudah 80% conform, yang kurang adalah stagger + imagery + trust icon yang V2 isi.

---

## 6. Redesign Per-Komponen (Apa Ubah Biar Tidak Jelek)

| Komponen | Jelek sekarang | Bagus V2 (dari MD + Haloka rasa) | Token/Pattern |
|---|---|---|---|
| **Hero ledger** `index.astro:54` | 4 row invoice flat | Jadi selling ledger: `Termurah Rp42/1k → Otomatis 24 jam → Refill → API grosir` dengan accent right `→` + hover `ink → accent-ink` | ledger + tabular-nums |
| **Trust band** | teks 1 baris | + 4 icon chip 20px `bg-accent/8` + count-up `NumberFlow` saat visible | inline-stat + icon |
| **ProblemLedger** | 3 row generic | 4 scenario spesifik (followers turun / harga mahal / nunggu admin / CS midnight) + icon chip 32px `WIREFRAME §4.4` | ledger + icon |
| **KapabilitasBento** | flat grid | Besar 2×2: phone mini + SVG line area `stroke-dasharray` draw 600ms + 4 small stat chip hover lift | bento + floatSlow |
| **PricingTable** | 1 papan harga? | Prose `Tanpa langganan. Top-up Rp10rb` + table 8 layanan `prices.json` + row `border-l 2px accent` on hover | table prose |
| **FAQ** | accordion basic | Featured top 2 `chip 'Pertanyaan Populer'` + search filter + bottom CTA `Chat Support → wa.me` | ledger accordion |
| **Imagery** | 0 foto | `HeroMockup` phone tetap CSS, `KapabilitasBento` tambah 1 `<img>` real platform collage (Unsplash) `DESIGN.md §0` | `<img>` real |

---

## 7. Tech Stack V2 (Tetap Svelte 5, Tidak Ganti Framework)

`REBUILD_PLAN.md §2` stack final: **Astro 5 + Svelte 5 islands + Tailwind v4 + MDX → Cloudflare Pages** (jangan ubah). Build check `pnpm --filter landing check` harus 0 error sebelum claim selesai (`AGENTS.md §7`).

- **Tidak perlu** ganti ke Next/Nuxt, tidak perlu `gsap`, `framer`, `lenis` untuk V2 — Haloka bukti Svelte built-in cukup.
- **Opsional V2.1** (jika user mau extra premium setelah V2 live): `motion` untuk spring + `astro:transitions` View Transitions untuk dock hold cross-page.
- **A11y non-negotiable**: `prefers-reduced-motion`, `focus-visible`, `min-w-0` truncate, touch `≥44px` (`AGENTS.md §5.0.2`).

---

## 8. Fase Eksekusi V2 (Setelah Plan Ini Approve — Jangan Lompat M1.5)

| Fase | Scope | File utama | DoD |
|---|---|---|---|
| **V2-0** | Plan ini (read-only) | `docs/LANDING_V2_PLAN.md` | doc ini approve |
| **V2-1** | Motion global: `reveal + --d` di 6 section yang belum (Problem, Bento, Board, Pricing, Testi, HowItWorks) | tiap `.astro` + `Layout.astro:98` | tiap section masuk viewport → stagger hidup, reduced off → instant |
| **V2-2** | Trust+imagery: icon chip + 1 `<img>` real di bento + phone frame hover | `SmmProviderProof`, `KapabilitasBento` | 4 icon + count-up + image lazy + LCP tetap teks |
| **V2-3** | Hero polish: ledger rhythm + micro hover + ticker sync | `index.astro`, `Ticker.astro` | ledger hover accent + ticker pause tap |
| **V2-4** | QA visual: `~/.config/opencode/skills/pw-vision` screenshot fullPage + mid-nav + a11y/contrast check `design-system` | `docs/audit/landing/v2/` | `pnpm check` 0, build 20 page, Lighthouse ≥90 mobile |

Estimasi total **~12 jam** (tanpa lib baru). Mulai hanya setelah user setuju plan ini — `AGENTS.md §0 #3 Dilarang ngoding route sebelum M1.5 selesai` (alias sebelum kontrak fix) — plan ini adalah kontrak fix V2.

---

## 9. Verifikasi & Anti-Regresi (Wajib Tiap Fase)

Checklist `AGENTS.md §7` + `DESIGN.md §8`:
1. `pnpm --filter landing lint && pnpm --filter landing check` 0 error.
2. `pnpm --filter landing build` 20 page complete, `dist` harga tetap dinamis `totalLayanan/totalKategori` dari `siteStats.ts` (grep `8\.` tidak hardcode baru).
3. Screenshot `pw-vision` fullPage 1440 + mobile 360 — simpan `docs/audit/landing/v2/`.
4. AA contrast `accent-ink` button `4.5:1`, focus ring visible, `prefers-reduced-motion` benar.
5. Container variance audit: `grep -c "reveal"` ≥7 section, bg pattern tidak 3× identik.

> Jika ada kontradiksi antar dokumen → `REBUILD_PLAN.md` menang. Tanya user sebelum invent fitur (`AGENTS.md §0 #10`).

---

## 10. Strategi — Pakai POLA Anim Haloka, Bukan Copy Semua Section (Revisi User 12 Sep)

> **Bisa visual: ya.** Pakai skill `pw-vision` lokal (Playwright `headless-shell 1228` di `~/.config/opencode/skills/pw-vision/scripts/`), screenshot `fullPage + mid-nav + mobile` 100% lokal tanpa upload. Kita sudah pakai untuk `admin-mobile-audit.md` dan `landing/desktop/*`. Nanti V2 tiap fase di-screenshot sebelum/sesudah untuk bukti.
> **Revisi sesuai instruksi user 12 Sep:** "ga minta copy semua section — pikirkan sendiri section yang pantas untuk socio, tapi ikutin pola animnya enak itu". Jadi **tidak 1:1 copy 15 komponen Haloka**, tapi **ambil pola motion-nya** untuk section yang memang pantas SMM panel. C1 `KapabilitasBento` tadi sudah pantas (order lifecycle Pending→Selesai — keep), sisanya selektif.

**Yang diambil dari Haloka = POLA, bukan section:**
- `animate-on-scroll opacity-0 translate-y-10 → opacity-100 1000ms delay-200 + --d stagger` (`Features.svelte:15-27`)
- `tweened cubicOut 500ms` untuk angka (`PainPoints.svelte:38`)
- `interval 3s` rotasi card + `in:fade 300ms / in:fly y:20` (`Features.svelte:30`)
- `animate-blob 7s` + `shimmer` + `scroll-up 120s infinite` (`PainPoints:277`, `SocialProof:128`)
- `group hover:-translate-y-1 shadow-xl scale-105`, `live-dot pulse 1.6s`
- Stack **identik** (`astro 5.17 + svelte 5.49`) jadi pola ini jalan tanpa lib baru — tinggal re-skin `accent-ink` Socio + inject `prices.json`.

**Section Socio yang PANTAS (kurasi, bukan copy Haloka semua):**

| Haloka source `haloka/src/components/` | Socio target `landing/src/components/` | Modif wajib (tanpa hijau, SMM) | Motion keep |
|---|---|---|---|
| `Navbar.svelte:10 Intersection` | `Navbar.svelte` | logo `socio.id`, link `Layanan/Reseller/Blog`, CTA `Daftar Gratis` `eeda59e`, scroll blur threshold sama | `onMount scroll → hairline` keep |
| `Hero: ChatSimulator.svelte + Welcome.astro` | `HeroMockup.svelte` (sudah ada, polish) | Ganti copy WA → `IG Followers 1.000 → @rmdaa`, saldo `Rp247.500`, platform pills `IG/TikTok/YT` | `fly y:10 400ms`, `tweened saldo 1.8s`, `setInterval 2.5s stream` keep |
| `PainPoints.svelte:38 tweened hours/daily` | `ProblemLedger.astro` + `RealityCheck.svelte` (baru, clone slider) | Slider `Volume Chat 100/500/1000` → `Volume Order 10/100/1000`, biaya admin `Rp4.5jt` → `Rp4.5jt` keep, emoji `💸` jadi `📦` SMM | `tweened cubicOut 500ms`, `animate-blob 7s`, `shake-hard` saat critical keep |
**Kurasi — section Socio yang pantas (pakai pola, bukan copy mentah):**

| Socio section `landing/src` | Pantas? | Pola Haloka yang dipakai | Tidak diambil dari Haloka |
|---|---|---|---|
| `HeroMockup.svelte` | ✅ keep | `fly y:10 + tweened 1.8s + interval 2.5s stream` | Chat WA simulator Haloka |
| `Ticker.astro` | ✅ keep | `marquee 40s pause hover` | — |
| `SmmProviderProof` (trust) | ✅ | `fade + count-up` (bukan 4-col strip) | SOP upload mockup Haloka |
| `ProblemLedger.astro` | ✅ | `animate-on-scroll stagger 60ms + blob` | Slider Volume Chat Haloka (tidak relevan) |
| `OrderSimulator.svelte` | ✅ core SMM | `tweened + gauge spring + fly` | CRM COLD/WARM/HOT Haloka |
| `OrderBoard.astro` | ✅ social proof | `row stagger 35ms + live-dot pulse` | `animate-scroll-up 120s` Haloka (terlalu sibuk) |
| `KapabilitasBento.astro` | ✅ **C1 DONE** | `interval 3s rotator Pending→Selesai + blob + group hover` | Copy chat Haloka |
| `HowItWorks.svelte` | ✅ | `slide + fly y:20` | Timeline WA Haloka |
| `TestiLedger.astro` | ✅ | `ledger row stagger 80ms` | — |
| `PricingTable.astro` | ✅ | `table row stagger 40ms` | Pricing Rp20rb/Hari Haloka (beda model) |
| `Faq.svelte` | ✅ | `slide cubicOut + chevron rotate` | — |
| Haloka `PainPoints` slider 1000 chat | ❌ skip | — | Tidak pantas untuk SMM panel (overkill) |
| Haloka `InteractiveTutorial` 4 langkah click | ❌ skip | — | Socio sudah `OrderSimulator` |
| Haloka `ChatSimulator` phone WA | ❌ skip | — | Socio phone = order SMM, bukan WA |

**Token re-skin (1 tempat):** hijau Haloka `#25d366` → `var(--accent-ink) oklch(0.44)` Socio di `tokens.css` + `FloatingWhatsApp`. Angka tetap dinamis `siteStats.ts` (8.295 layanan).

**Roadmap selektif (pakai pola, kurasi Socio):**

| Fase | Pola Haloka dipakai | Socio pantas | File | Visual check |
|---|---|---|---|---|
| **C1 DONE** | `Features observer+interval 3s + blob` | `KapabilitasBento` rotator order | `StatusRotator.svelte` | pw-vision vs haloka features — done `f92bb12` |
| **C2 NEXT** | `stagger reveal + tweened` | `ProblemLedger` 4 row + `OrderSimulator` gauge polish (tanpa slider Haloka) | `ProblemLedger.astro`, `OrderSimulator.svelte` | reveal 60ms per row, gauge spring |
| **C3** | `row stagger + hover lift` | `OrderBoard` + `PricingTable` | `OrderBoard.astro`, `PricingTable.astro` | table row 35ms, hover accent |
| **C4** | `scroll trigger + reduced gate` | `HowItWorks + Faq + FinalCTA` | `HowItWorks.svelte`, `Faq.svelte` | slide/fly gated |
| **C5** | Build + no-green + Daftar Gratis + Lighthouse | — | `dist/` | `pnpm check 0 + pw-vision fullPage` |

Estimasi selektif **~8 jam**. Tetap `AGENTS.md §7` verification.

> Keputusan revisi: **tidak copy semua Haloka — kurasi SMM, pakai pola animnya yang enak**. Approve C2?

---

## 11. Accent Fix + Background Playful Interaktif + Library Pendukung (User Request 12 Sep)

### 11.1 Accent warna diperbaiki

**Masalah kini** `landing/src/styles/tokens.css:19-23`: hanya 1 accent cyan-teal `accent oklch(0.68 0.13 220)` + `accent-ink 0.44`. Terasa datar, tidak ada `accent-2` untuk bento/blob playful. Haloka pakai 3 hue (blue 220 + purple 300 + green 145) jadi terasa kaya. `DESIGN.md #1` sebenarnya sudah ada `primary indigo #4f46e5 + accent cyan #06b6d4` (beda dari landing).

**Fix V2 — palette 2-accent playful tapi tetap premium (tanpa hijau Haloka):**

```css
/* landing/src/styles/tokens.css — tambah */
--accent-2: oklch(0.62 0.16 285); /* indigo-violet — untuk blob kedua, SHIMMER */
--accent-2-tint: oklch(0.62 0.16 285 / 0.08);
--accent-soft: oklch(0.72 0.10 220 / 0.14); /* untuk mesh wash */
--paper-lift: oklch(0.99 0.004 220); /* highlight card */
```

Aturan: `accent` (cyan 220) untuk CTA/primary, `accent-2` (violet 285) untuk aksen sekunder/blob/gradient mesh saja — **jangan pakai untuk teks di atas putih** (contrast check). Semua blob baru pakai `color-mix(accent 40%, accent-2 30%) blur 52px saturate 1.28` seperti `codefronts mesh gradient` (5 nodes oklch, anim 26s alternate, grain overlay 0.22). AA tetap: button fill hanya `accent-ink` (bukan accent-2).

### 11.2 Background anim semuanya interaktif playful

**Sekarang:** hanya 1 blob statis di `KapabilitasBento` (`blur 80px opacity 60` — sudah C1). Hero, problem, pricing masih flat `paper/paper-2` solid.

**Target V2:** tiap 2 section, background punya gerak halus yang **merespon pointer/scroll, tapi tidak ganggu baca** :

| Section | Background playful | Interaksi |
|---|---|---|
| Hero `pt-28` | mesh 5 radial `blur 52px` (teknik codefronts `bga-14` — 5 `oklch` nodes anim 26s alternate) + grain `0.22 overlay` | `pointerSource: fine` — mesh condong ke cursor ±6% (JS update `--p1x/--p1y`), pause `prefers-reduced-motion` |
| ProblemLedger | 2 blob `accent/ accent-2` 420px `blur 80px` 60% (sudah ada) | follow scroll `translateY` ±8px parallax ringan (transform only) |
| KapabilitasBento | mesh + rotator `C1 DONE` | rotator interval 3s sudah interaktif |
| PricingTable | dotGrid `16px` + `hover: accent-2` tint | rows hover lift already, plus subtle dot parallax on scroll |

Semua `pointer-events-none`, `opacity 0.5-0.6`, `filter blur() scale 1.15` (hindari vignette), `animation: mesh 26s ease-in-out alternate infinite` — cost 1 paint layer, 60fps (codefronts), no WebGL, no 400KB JPEG.

### 11.3 Library pendukung — riset 12 Sep 2026

**Stack tetap `astro 5 + svelte 5 + tailwind 4` (jangan ganti). Tambah max 2 lib, tree-shakeable, MIT:**

| Library | Untuk playful apa | Size | Kapan pakai | Svelte 5 ready |
|---|---|---|---|---|
| **`@humanspeak/svelte-motion` 0.9.4** (Framer Motion untuk Svelte 5, MIT, 8.9k weekly) — `motion.svelte.page` | `whileHover/whileTap/whileInView + variants + AnimatePresence + useScroll/useTransform` ganti manual `IntersectionObserver` + `fly/fade` — untuk bento/ledger stagger deklaratif | ~18kb gz | **WAJIB V2-2** — untuk `motion.div whileInView + staggerChildren` di bento/ledger, `whileHover scale 1.05` | ✅ Svelte 5 runes native |
| **Pure CSS mesh** (no npm, codefronts `bga-14`) — 5 radial `oclch` + `@property --p1x` + `blur 52px` + grain SVG | hero mesh drift 26s + pointer lean | 0kb js (CSS only) | **WAJIB V2-1** hero bg — copy `bga-14__mesh` teknik, 5 tokens oklch dalam lightness 0.12 | ✅ universal |
| `@tummycrypt/tinyvectors` (Svelte 5 blobs physics + scroll/deviceMotion) | blobs follow pointer/scroll dengan spring physics (opsional pengganti CSS mesh jika mau lebih hidup) | ~12kb | **OPSIONAL V2.1** — hanya jika CSS mesh terasa kurang, ganti blob di `ProblemLedger` | ✅ Svelte 5 |
| `@anarkisti/igyb` (generative backgrounds interactive, WebGL/Canvas) | `aurora/plasma/particles` `interactive:true` | ~20kb | **TIDAK V2** — overkill WebGL untuk SMM panel, simpan untuk kampanye khusus | ✅ wrapper Svelte |

**Keputusan library V2:** `svelte-motion` + `CSS mesh` saja (0+18kb, tidak ada WebGL/Canvas berat). `tinyvectors/igyb` dicatat tapi tidak di-install V2 — jika user mau extra playful setelah V2 live, tinggal `npx` add.

Instal: `pnpm add @humanspeak/svelte-motion motion` (peer `motion 13.1.1`). Tidak tambah `gsap` (timeline berat, imperative) — `svelte-motion` sudah cover spring/scroll declaratively.

### 11.4 Checklist per-phase berurutan — verif visual, kalau jelek benerin sendiri

> User: "kita kerja berurutan dulu per phase, kamu susun checklist kalau sudah verif visual, kalau jelek km benerin sendiri"

**Workflow per fase (WAJIB urut, tidak paralel):**

| Fase | Scope (kurasi Socio) | DoD — visual self-heal loop |
|---|---|---|
| **V2-1** | **Accent + hero mesh**: tambah `--accent-2` di `tokens.css` + hero mesh 5 nodes `26s alternate` + grain (CSS only) | `pnpm check 0` + `build 20 page` → `pw-vision shot fullPage 1440 + mobile 360` → **cek**: mesh tidak nutup teks, lightness oklch ≤0.12 beda, AA `accent-ink` masih 4.5:1 → **kalau jelek (muddy/banding)**: ubah chroma <0.08 atau blur 52→80, **ulangi shot** sampai enak |
| **V2-2** | **Motion deklaratif**: ganti manual `reveal` di `ProblemLedger/CapabilitasBento/PricingTable` jadi `svelte-motion` `whileInView + variants stagger 60ms` + `whileHover` lift | `pnpm add svelte-motion` → `pw-vision shot sections` → **cek**: stagger tidak lebay (>1s), reduced-motion instant → **kalau jelek**: kurangi durasi 1000→600ms, **benerin sendiri** + re-shot |
| **V2-3** | **Background playful scroll**: blob parallax `translateY ±8px` di `ProblemLedger/PricingTable` (transform only) + dotGrid parallax | `pw-vision scroll 50%` → **cek**: background `pointer-events-none`, tidak bikin jank, 60fps → **kalau jelek**: turun opacity 0.6→0.4 atau hapus 1 blob |
| **V2-4** | **Polish + QA**: `Ticker marquee 40s`, `Faq chevron rotate 180ms`, `Footer ink` + `Lighthouse ≥90 + AA contrast + grep no-green` | `pnpm lint/check + wrangler deploy + curl headers` → `pw-vision final` → **kalau Lighthouse <90 atau jelek**: audit `web-vision` trace, benerin CLS/bundle |

**Self-heal rule (tertulis di plan):** setiap fase **wajib screenshot `pw-vision` sebelum claim selesai**. Jika `looks cheap / banding / muddy / jank / contrast fail` → **jangan lanjut fase berikutnya**, benerin di fase sama (max 2 iterasi) — tulis di commit message `fix(V2-X): ...` .

**Estimasi baru dengan accent+motion:** V2-1 3j + V2-2 3j + V2-3 2j + V2-4 2j = **~10 jam**. Approval V2-1 → mulai accent+mesh. 

> Jika ada kontradiksi antar dokumen → `REBUILD_PLAN.md` menang. Tanya user sebelum invent fitur (`AGENTS.md §0 #10`).
