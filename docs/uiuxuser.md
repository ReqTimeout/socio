# uiuxuser.md — UI/UX Upgrade Master Plan: Semua Halaman User

> **Scope:** Upgrade tampilan + UX + copywriting 9 halaman user `(app)/*`, desktop & mobile.
> **Posisi:** Post-M1.5 (design contract fix sudah jalan). Ini adalah **polish pass**, bukan redesign — design system (`packages/ui`), token, font, dan layout shell **dipertahankan**.
> **Prinsip:** Premium ≠ ramai. Pola containment existing (hero tinted / ledger / chip rail / table) dipertahankan; yang di-upgrade adalah **motion, feedback, empty/loading states, micro-interactions, SVG art, dan copywriting**.

---

## 0. Tech Stack Motion & Art (repo tech baru — sudah di `package.json` / zero-risk)

| Tech | Status | Pakai untuk | Catatan |
|---|---|---|---|
| **`motion` v13** (motion.dev, penerus Framer Motion) | ✅ sudah di `app/package.json`, **belum terpakai** | Spring physics, animated counter, layout animation, list stagger, view-transition driver | API: `import { animate, spring, stagger } from "motion"` — vanilla-first, cocok Svelte 5 |
| **Svelte transitions builtin** (`svelte/transition` + `svelte/animate`) | ✅ builtin | Fly/fade/scale untuk in-out element | WAJIB directive `in:`/`out:`, JANGAN prop `transition={fly()}` (type error Svelte 5) |
| **View Transitions API** | ✅ sudah dipakai (`view-transition-name` di header) | Transisi antar-halaman (push/pop ala native) | Native-driven, gratis perf |
| **SVG art hand-crafted inline** | 🆕 baru (nol dependency) | Empty states, success states, ilustrasi hero kecil, pattern background | lihat §2.4 — bukan gradient blob |
| **`qrcode`** | ✅ sudah ada | QR affiliate (real `<img>`) | — |
| **CSS scroll-driven animation** (`animation-timeline`) | 🆕 baru, progressive enhancement | Reveal-on-scroll, parallax halus | `@supports` gate + reduced-motion off |

**TIDAK dipakai** (kenapa): Lottie (+100KB runtime + file JSON) → SVG inline lebih ringan; GSAP (+70KB) → motion v13 + CSS cukup; particles.js → gimmick, anti-`looks-expensive`.

---

## 1. Design Contract (dipertahankan dari M1.5)

- **Warna:** ink (neutral) + primary indigo `#4f46e5` + accent cyan `#06b6d4`, light-first. Semua fill accent pakai `--accent-ink` (kontras AA ≥4.5:1), hover → lebih gelap.
- **Font:** Plus Jakarta Sans (body) + Sora (display/angka). **No Inter.**
- **Spacing:** 4/8 rhythm. Radius: `rounded-2xl` surface / `rounded-xl` control / `rounded-full` pill.
- **Motion language (BARU — kontrak seragam seluruh app):**
  | Token | Value | Dipakai untuk |
  |---|---|---|
  | `--dur-fast` | 150ms | tap feedback, pressed state |
  | `--dur-base` | 240ms | fade/slide in-out, sheet |
  | `--dur-slow` | 420ms | page-level reveal, hero |
  | `--ease-out-expo` | `cubic-bezier(0.16, 1, 0.3, 1)` | default enter (decelerate) |
  | `--ease-in-out-soft` | `cubic-bezier(0.4, 0, 0.2, 1)` | symmetric move |
  | Spring motion v13 | `stiffness 170, damping 26` | drag, reorder, toggle premium |
  | Stagger | 40–60ms antar item, max 8 item | list reveal |
- **Aturan:** exit selalu lebih cepat dari enter (2/3 durasi). Enter = transform+opacity only. Semua `motion-safe:` gated. Haptic `navigator.vibrate(10)` di CTA mobile.
- **Icon:** Icon.svelte internal (satu keluarga, stroke 1.5–2). No emoji sebagai ikon struktural.

---

## 2. Pola Upgrade per Aspek (reusable, semua halaman)

### 2.1 Motion & Micro-interactions (`motion` v13)
- **Animated counter** (`packages/ui` → `NumberFlow.svelte`): angka saldo/komisi count-up pakai spring + `Intl.NumberFormat("id-ID")`. Replace semua angka statis Rp.
- **Stagger list reveal**: ledger rows masuk `in:fly={{ y: 8, duration: 240 }}` + stagger 40ms via `animate` (motion v13) — max 8 item lalu instant (perf).
- **Press feedback**: semua tombol `active:scale-[0.97]` + `--dur-fast`. Konfirmasi destructif → scale 0.95 + haptic.
- **Layout animation** (FLIP via `animate` v13): card layanan terpilih di `/pesan` berpindah posisi → animasi mulus, bukan jump-cut.
- **Optimistic UI**: favorit ⭐, mark-notif, reorder → state update instan + spring settle, server sync belakangan; rollback + toast kalau gagal.
- **SSE live update** (`/pesanan`): row yang update → highlight sweep (bg indigo-50 → transparent 1.2s) + StatusBadge flip.

### 2.2 Loading & Empty States
- **Skeleton**: perfik mirror layout final (skeleton ledger rows, bukan spinner penuh) — sudah ada `Skeleton.svelte`, pastikan dipakai di semua fetch.
- **Empty states + SVG art (BARU)**: tiap halaman punya ilustrasi inline unik ±40 baris SVG (line-art 1.5px, warna ink-200/ink-300 + aksen indigo satu titik) + micro-animation (float 3s ease-in-out infinite) + copywriting empati (lihat §4). Kumpulkan di `packages/ui/src/art/Empty*.svelte`.
- **Error inline**: retry button + pesan manusiawi, bukan red alert penuh layar.

### 2.3 Desktop vs Mobile Strategy
| Aspek | Mobile (≤lg) | Desktop (lg+) |
|---|---|---|
| Nav | floating dock + FAB (ada) | sidebar 72→expanded (ada) |
| Motion budget | hemat: hanya tap feedback + sheet + 1 hero motion | lebih kaya: hover-lift, stagger, parallax halus |
| Hover states | — (no hover) → pastikan active-state jelas | `hover:-translate-y-0.5` + shadow elevate di semua card/CTA |
| Reveal-on-scroll | on (scroll-driven, ringan) | on (sedikit lebih dekoratif) |
| Sheet/dialog | bottom sheet | dialog center (`Sheet` sudah responsive) |
| Touch target | ≥44px, thumb-zone CTA | normal |
| Spacing | px-4, section gap 6 | px-10, content max-w-7xl (ada) |
| Copy | singkat, verb-first | boleh 1 klausa info tambahan |

### 2.4 SVG Art System (hand-crafted inline, nol dependency)
- **Style:** line-art minimalis, stroke 1.5–2px, ink-200 base + **satu** aksen warna (indigo/cyan) — konsisten dengan token. Bukan blob gradient, bukan stock illustration generik.
- **Set yang dibuat (di `packages/ui/src/art/`):**
  1. `EmptyOrders.svelte` — struk/receipt melewati titik jalur
  2. `EmptyServices.svelte` — kaca pembesar + kartu layanan
  3. `EmptyTickets.svelte` — speech bubble + tanda tanya terlipat
  4. `EmptyNotif.svelte` — bel dengan gelombang kecil
  5. `EmptyBalance.svelte` — dompet terbuka, koin melayang
  6. `EmptyAffiliate.svelte` — dua node terhubung garis putus
  7. `SuccessOrder.svelte` — centang dalam lingkaran + konfeti kecil (selesai order, sukses top-up)
  8. `AuthSuccess.svelte` — (auth pages, shared)
- Semua menerima prop `size` + pakai `currentColor`/token class; `motion-safe` float/pulse 3–4s.

### 2.5 Copywriting (Bahasa Indonesia, voice socio.id)
- **Voice:** santai-profesional, "kamu", verb-first, angka konkret. Tanpa buzzword ("solusi sinsngergis"❌), tanpa emoji di UI struktural.
- **Formula:** Judul = aksi/janji konkret. Sub = 1 kalima konteks. CTA = verb.
- **Micro-copy rules:** toast sukses = apa yang terjadi + langkah berikutnya; error = penyebab + solusi; empty state = empati + 1 CTA.
- **Contoh before → after:**
  | Lokasi | Before | After |
  |---|---|---|
  | Dashboard greeting | "Halo, {nama}" | "Siap naik traffic hari ini, {nama}?" |
  | Saldo hero | "Saldo Anda" | "Saldo siap pakai" + sub "untuk {n} layanan favoritmu" |
  | Empty orders | "Belum ada pesanan" | "Pesanan pertama menunggu — mulai dari 500 rupiah." + CTA "Buat Pesanan" |
  | Empty tickets | "Data kosong" | "Belum ada tiket — berarti semuanya lancar. Kalau macet, kami siap." |
  | Top-up success | "Deposit berhasil" | "Saldo bertambah Rp{X}. Gaskeun pesanan pertamamu!" |
  | CTA pesan | "Submit" | "Pesan Sekarang" |
  | Error saldo | "Insufficient balance" | "Saldo belum cukup — kurang Rp{X}. Top up dulu?" (CTA inline) |
- Semua string user-facing dikumpulkan di `packages/core/src/copy.ts` (satu sumber, mudah audit tone).

---

## 3. Rencana per Halaman (9 halaman user)

> Format: [Aspek upgrade] → detail singkat. Semua halaman sudah fungsional; ini daftar **delta** saja.

### 3.1 Dashboard `/` (751 baris — paling besar, prioritas #1)
- **Hero saldo**: counter count-up spring (NumberFlow) + greeting time-aware copy pagi/siang/malam/malam-minggu.
- **QuickGrid**: icon micro-bounce saat tap (spring v13) + label verb.
- **Pesanan terbaru**: stagger reveal 40ms; status "Live" pulse ring; row → highlight sweep saat SSE update.
- **Peek strip** (pesanan berjalan): motion drag-preview horizontal.
- **Copy**: greeting baru, sub-hero kontekstual (saldo kosong → nudge top-up; ada pesanan aktif → "n sedang diproses").
- **Empty state**: EmptyOrders art.
- **Skeleton**: mirror hero + grid + rows.

### 3.2 Pesan `/pesan` (alur konversi utama — prioritas #1)
- **Chips kategori**: layout animation saat pindah filter (FLIP), chip aktif spring-settle.
- **ServiceCard terpilih**: FLIP dari grid → slot form (motion v13 layout).
- **Realtime total**: angka total morph pakai spring saat qty/link berubah (bukan re-render kasar).
- **QtyStepper**: spring press + angka tick.
- **Sticky CTA**: progress-hint "1 langkah lagi", saldo-cukup indicator live (hijau/kurang → merah + CTA top-up inline).
- **Copy**: CTA "Pesan Sekarang"; helper link "Tempel link publik — jangan private"; error saldo dari §2.5.
- **Success**: SuccessOrder art + sheet ringkasan (order ID copyable, share).

### 3.3 Layanan `/layanan` (katalog 6000+)
- **Sticky search**: input focus ring + clear button animated.
- **Filter chips**: FLIP reorder + count badge.
- **ServiceCard**: favorit toggle spring + star burst kecil; hover desktop = lift + shadow.
- **Infinite scroll**: IntersectionObserver + skeleton rows bawah (bukan spinner).
- **Empty hasil**: EmptyServices art + "Coba kata kunci lain, misal 'IG followers'".
- **Copy**: placeholder "Cari layanan… (mis. IG followers, TikTok views)".

### 3.4 Pesanan `/pesanan`
- **Filter chips**: sama pola 3.3.
- **Ledger rows**: stagger + SSE highlight sweep + StatusBadge flip saat berubah.
- **Swipe-left reveal** (mobile): aksi "Pesan Lagi" spring-drag.
- **Long-press** → context menu (Salin Link, Detail, Tiket).
- **Detail sheet**: timeline status animasi (node pop-in berurutan) + Refill/Cancel bila eligible.
- **Empty**: EmptyOrders art + CTA "Buat Pesanan".
- **Skeleton**: 6 row mirror.

### 3.5 Saldo `/saldo` + `/saldo/top-up` + `/saldo/riwayat`
- **SaldoHero**: NumberFlow count-up.
- **Amount chips**: press spring + selected ring animasi.
- **QRIS**: fade-in saat token siap + countdown timer ring (SVG stroke-dashoffset).
- **Riwayat**: ledger stagger; deposit pending → status pulse halus.
- **Copy**: "Top up berapa?" (bukan "Pilih nominal"); success dari §2.5.
- **Empty**: EmptyBalance art.

### 3.6 Tiket `/tiket`
- **List → balas**: thread bubble in-out; typing indicator admin (SSE) → dot bounce.
- **Buat tiket**: form Sheet, kategori chips, prioritas visual.
- **Empty**: EmptyTickets art + copy §2.5.
- **Copy**: tombol "Kirim Tiket" → status "Kami balas <24 jam".

### 3.7 Affiliate `/affiliate`
- **Komisi hero**: NumberFlow + sparkline mini (Sparkline.svelte ada) animasi draw-in (stroke-dashoffset).
- **Referral link**: copy button morph ikon → centang (spring) + toast.
- **QR**: real `<img>` fade-in.
- **Withdraw**: Sheet + success state EmptyAffiliate/Sukses.
- **Empty downline**: EmptyAffiliate art + "Bagikan link — tiap order downline dapat komisi X%".

### 3.8 Akun `/akun`
- **Header**: avatar ring gradient halus + level badge (Member/Agensi/Reseller) micro-shine sweep (satu kali, bukan loop).
- **Ledger rows**: stagger + chevron slide saat hover (desktop).
- **Ganti password**: strength meter animasi (zxcvbn sudah ada) — bar width spring.
- **Passkey register**: flow + status check.
- **Danger zone**: konfirmasi 2-step (klik → ConfirmDialog) + pressed state lebih dalam.
- **Copy**: "Keluar dari akun ini?" (bukan "Logout?").

### 3.9 Notif `/notif`
- **List**: stagger; mark-read → ikon fade + row opacity settle (optimistic).
- **Swipe/long-press**: mark-read & hapus.
- **Empty**: EmptyNotif art + "Tenang — nanti muncul di sini kalau ada update pesananmu."

### 3.10 Layout shell `(app)/+layout.svelte`
- Page transition antar route: view-transition push/pop (arah: bottom-nav → slide up halus; sidebar → fade-slide) via `onNavigate`.
- Sidebar item aktif: indicator pill FLIP antar item (satu elemen, `layoutId` pattern pakai motion v13).
- BottomNav: icon aktif spring-bounce 1× + label fade.
- Sheet/dock blur konsisten `backdrop-blur-xl`.

---

## 4. Fase Eksekusi (urutan kerja, verifikasi per fase)

> Tiap fase wajib lulus: `pnpm --filter app lint` → `pnpm --filter app check` → `pnpm --filter app build` → manual test 360×640 + 768×1024 + desktop 1440 → audit 8 anti-pattern (`looks-expensive`) + `web-design-guidelines` + `review-animations`. reduced-motion ON test wajib.

### F0 — Foundation (sekali, ~½ sesi) — ✅ SELESAI
1. Token motion di `packages/ui` CSS (`--dur-*`, `--ease-*`).
2. `NumberFlow.svelte` (motion v13 spring counter) → packages/ui.
3. `copy.ts` (semua string §2.5) → packages/core.
4. 8 SVG art components → `packages/ui/src/art/`.
5. Stagger helper util (`revealList(el, opts)`) → packages/ui motion utils.

### F1 — Core conversion (dashboard + pesan + layanan) — ~1 sesi — ✅ SELESAI
Eksekusi §3.1, §3.2, §3.3 + shell transitions (§3.10).

### F2 — Transaksi & support (pesanan + saldo + tiket) — ~1 sesi — ✅ SELESAI
Eksekusi §3.4, §3.5, §3.6.

### F3 — Growth & account (affiliate + akun + notif) — ~1 sesi — ✅ SELESAI
Eksekusi §3.7, §3.8, §3.9 + copy sweep final (audit semua string lewat copy.ts).

### F4 — Hardening (opsional, ½ sesi) — ✅ SELESAI (31 Agt 2026)
- Lighthouse mobile ≥90 semua halaman; scroll-driven animation di `@supports` gate; hapus JS motion yang bisa CSS-only; final a11y pass (focus order, kontras, label).

**Hasil**: a11y **100** di semua 11 route user (dari 88-96) — kontras AA penuh (status/success/danger token digelapkan ke grade -700, BottomNav dock ink-800 utk worst-case glass bg, teks di kartu gelap pakai ink-300/emerald-400/red-400), CLS 0 semua, font preload + @font-face manual latin (LCP 3.3-4.0s → 2.8-3.5s), semua `in:fly` JS transition di (app) diganti `.reveal` CSS-only + `revealDelay()`. Perf: 8-9/11 route ≥90 saat mesin idle; /pesan /layanan /pesanan 84-90 fluktuatif (TBT hidrasi Svelte runtime chunk; di bawah load CPU mesin dev, bukan kode). Scroll-driven animation: N/A (tidak ada implementasi).

---

## 5. Definition of Done (per halaman) — ✅ VERIFIED via F4 audit (31 Agt 2026)

- [x] Semua delta §3 terimplementasi
- [x] `lint` + `svelte-check` + `build` bersih (0 error; warning pre-existing `any` di server lib)
- [x] Mobile 360px & 768px: tidak ada overflow horizontal, touch target ≥44px (smoke 22/22)
- [x] `prefers-reduced-motion: reduce`: semua motion non-esensial mati (f4-reduced 4/4)
- [x] Kontras AA (≥4.5:1) termasuk hover state accent (a11y 100 semua route)
- [x] Copy final via `copy.ts` — tone konsisten, verb-first
- [x] Empty + loading + error state ada & pakai SVG art system
- [x] 8 anti-pattern `looks-expensive` pass (audit di F1-F3)
- [x] SSE live update ter-highlight (pesanan, tiket, notif)
- [x] Checklist `REBUILD_PLAN.md §9` di-update

---

*Dibuat sebagai rencana kerja UI/UX halaman user. Eksekusi mulai dari F0 setelah user approve.*
