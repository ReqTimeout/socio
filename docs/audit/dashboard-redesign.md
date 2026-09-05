# Dashboard Redesign — Socio.id User App + Admin Carryover

> **Versi**: 4 Sep 2026  
> **Scope**: Audit visual dashboard USER (8 routes) di desktop 1440×1000 + mobile 390×844, plus carryover Phase P3 admin (10 item dari `docs/planadmin.md`). **Tidak mengubah kode** di fase audit — proposal + acceptance per phase, eksekusi 1-1 setelah approval.  
> **Reference**: `docs/DESIGN.md`, `docs/MOBILE_UX_GUIDE.md`, `docs/ADMIN_GAP.md`, `docs/planadmin.md`, AGENTS.md §7 (8 anti-pattern `looks-expensive`).  
> **Skill discipline**: `svelte-core-bestpractices` + `web-design-guidelines` (visual + a11y audit) untuk fase eksekusi.

---

## TL;DR — Apa yang perlu diperbaiki

| Layer | Status | Δ Kritis |
|---|---|---|
| Branding & typography | ✅ OK (Plus Jakarta Sans + Sora, gradient indigo-cyan) | — |
| Containment variance | ⚠️ Lemah di Pesanan (4-col stat strip), Akun (6 card sejajar), Layanan (3-col grid card-uniform) | 3 route |
| Mobile comfort | 🔴 Bermasalah: dock 6 item bukan 5+FAB, form Pesan kepotong dock, hero PromosiBanner waste 200px | 4 route |
| Micro-interaction | ⚠️ Ada pop animation di Reseller badge, card-lift hover, tapi belum ada status pulse / live SSE dot anim | 2 route |
| Copywriting | ✅ Bagus — tidak ada banned word, tone hangat, ID-context | polish |
| A11y (focus ring, contrast, label) | ✅ Bagus (focus-visible ring cyan/indigo, AA contrast) | polish |
| Data freshness | 🔴 Order data tahun 2023 (mock), untuk audit OK, untuk prod wajib ada SSE live | paskaudit |

**Total 13 issue UX utama → 6 phase (UX1–UX6) untuk user**, **10 item carryover untuk admin P3**. Estimasi total ~62 jam.

---

## 1. Metode Audit

### 1.1 Tools
- **Playwright session** `socioaudit` (login auto via `/dev-admin-login?as=febian`).
- **Viewport**: Desktop 1440×1000 (Chrome stable), Mobile 390×844 (iPhone 14/15 emulation).
- **Routes captured** (16 screenshot):
  - Desktop: `01-beranda` `02-layanan` `03-pesan` `04-pesanan` `05-saldo` `06-topup` `07-riwayat` `08-affiliate` `09-akun` `10-tiket` `11-notif` → `docs/audit/dashboard/desktop/`
  - Mobile: `01-beranda` `02-pesan` `03-pesanan` `04-layanan` `05-akun` → `docs/audit/dashboard/mobile/`
- **Code cross-check**: `app/src/routes/(app)/+page.svelte` (759 LOC), `pesan/+page.svelte` (595), `pesanan/+page.svelte` (546), `saldo/top-up/+page.svelte` (505), `akun/+page.svelte` (476), dll.

### 1.2 Reference
- `looks-expensive` 8 anti-pattern (DESIGN.md §B.8):
  1. Bullet budget (max 5)
  2. Eyebrow pill (max 1)
  3. Card chrome (max 2 default)
  4. **3-tier pricing generik** (replace dgn table)
  5. **4-col stat strip** (replace dgn inline-stat)
  6. **No imagery** (pakai `<img>` real)
  7. Container identik (≥3 pola)
  8. Inter default (pakai sans lain — Plus Jakarta ✅)

---

## 2. Pattern Inventory — Yang Sudah Bagus (Pertahankan)

| Pattern | Lokasi | Catatan |
|---|---|---|
| Time-aware greeting (WIB) | `+page.svelte:33-58` | 4 phase (dawn/day/dusk/night) dgn emoji + ambient gradient, motion-safe pop animation 480ms |
| SaldoHero compact + insight 7-day | `+page.svelte:228-241`, `SaldoHero.svelte` | saldo + chart + Top Up CTA dalam 1 hero block |
| Reseller badge gradient + hover lift | `+page.svelte:212-221` | `pop_480ms cubic-bezier(0.16,1,0.3,1)`, hover `-translate-y-0.5` |
| Quick action card-lift + glow | `+page.svelte:251-275` | `hover:scale-110 group-hover:-rotate-6` pada icon chip |
| Pesan Cepat (1-tap repeat) | `+page.svelte:290-340` | snap-x scroll mobile / 4-col grid desktop, prefilled `serviceId` + `lastLink` |
| Filter chips + count | `pesanan/+page.svelte`, `saldo/riwayat/+page.svelte` | chip + badge count, swipeable |
| Wizard 3-step (NOMINAL > TRANSFER > KONFIRMASI) | `saldo/top-up/+page.svelte` | progress indicator di top, jelas |
| Empty state illustration | `tiket`, `notif`, `affiliate` | lucu + helpful hint, tidak sekadar "Tidak ada data" |
| StatusBadge warna-warni | semua list | konsisten sukses/proses/gagal/partial |
| ConfirmDialog untuk aksi destruktif | `akun` regenerate API key, `+page.svelte` bulk | already wired di admin (P0-05), perlu di-port untuk user regenerate API key |
| Bottom dock | `+layout.svelte` mobile | 6 items — lihat UX2 untuk fix ke 5+FAB |

---

## 3. Pattern Yang Perlu Diperbaiki (Mobile-First Priority)

### 3.1 Beranda `/` — High Impact

| # | Issue | Lokasi | Severity |
|---|---|---|---|
| U-01 | `PromoBanner` placeholder SMMTurk menghabiskan ~200px vertikal di mobile (gradient kosong + teks "Promo SMMTurk"). Tidak actionable. | `+page.svelte:222` | 🔴 Mobile waste |
| U-02 | `SaldoHero` terlalu tinggi di mobile — `Mutasi 7 hari` + `Top Up` + `Riwayat` stacked rapat, padding boros | `+page.svelte:228-241` | 🟡 Mobile density |
| U-03 | Quick action grid hanya tampil **3 item (Top Up / Affiliate / Akun)** — `Pesan` terpotong. Quick array punya 4 item di code (`revealDelay(i, 0, 60)`) tapi parent grid `grid-cols-3` di mobile | `+page.svelte:247` | 🔴 Quick action missing |
| U-04 | Bottom dock 6 items (Home/Katalog/Pesan/Pesanan/Saldo/Tiket) — `Akun` masuk ke "Lainnya", tapi FAB Pesan hilang (Pesan ada di dock urutan 3) | `+layout.svelte` | 🔴 vs DESIGN.md C.2 (5+FAB) |
| U-05 | Hero greeting terlalu panjang ("Siap bantu naikin performa sosmed — cepat & aman") kepotong jadi "...cepat" di 390px | `+page.svelte:189-200` | 🟡 Truncation |
| U-06 | "Pesan Baru" CTA di header Pesanan (screenshot mobile) **tidak muncul** karena ke-scroll + dock nutupin | `pesanan/+page.svelte` desktop header | 🟡 CTA discoverability |

### 3.2 Pesan `/pesan` — Form Critical Path

| # | Issue | Lokasi | Severity |
|---|---|---|---|
| U-07 | Total bayar + CTA "Pilih Layanan Dulu" **di belakang bottom dock** di mobile (390px). Tidak ada padding-bottom untuk dock. | `pesan/+page.svelte` bottom | 🔴 CTA invisible |
| U-08 | Desktop form max-w-2xl di tengah — 760px ruang kosong di kiri-kanan viewport 1440. Tidak ada 2-column optimization untuk desktop. | `pesan/+page.svelte` form layout | 🟡 Desktop waste |
| U-09 | Tidak ada validasi inline real-time saat user ketik link + jumlah — placeholder bilang "Pilih layanan dulu" tapi setelah pilih, tidak ada feedback "Quantity OK / di luar range" | `pesan/+page.svelte` qty stepper | 🟡 Error feedback |

### 3.3 Pesanan `/pesanan` — Stats Anti-pattern

| # | Issue | Lokasi | Severity |
|---|---|---|---|
| U-10 | **4-col stat strip** (TOTAL/PENDING/PROSES/SELESAI) — violate anti-pattern #5 (replace dgn inline-stat). Tapi di mobile cukup cramped. | `pesanan/+page.svelte` top | 🟠 anti-pattern |
| U-11 | Order cards uniform card chrome (border + bg-white) — semua order terlihat sama. Tidak ada variance: pending pulse, success calm, partial warning, error destructive. | `pesanan/+page.svelte` list | 🟠 variance |
| U-12 | Live SSE pulse (DESIGN.md sebut "live status pulse domain animation") — belum kelihatan animasi di screenshot. Mungkin ada tapi subtle, perlu audit motion duration. | `pesanan/+page.svelte` | 🟡 motion polish |

### 3.4 Akun `/akun` — Card Heavy

| # | Issue | Lokasi | Severity |
|---|---|---|---|
| U-13 | **6 card sejajar** (Profil + Ganti Password + API Key + Tema + 6 quick links) — violates containment variance rule #3 (max 2 default) + #7 (≥3 pola). Visual monotonous. | `akun/+page.svelte` | 🟠 variance |

### 3.5 Layanan `/layanan` — Duplicate Title

| # | Issue | Lokasi | Severity |
|---|---|---|---|
| U-14 | Desktop: header sidebar "Katalog Layanan" + page title "Katalog Layanan" — duplikasi. Mobile OK karena header di-hide. | `layanan/+page.svelte` desktop | 🟡 Redundancy |
| U-15 | Filter chip "Favorit 1" — angka 1 melepas text context (maksudnya 1 favorited, tapi tidak ada info "Tap untuk lihat favorit") | `layanan/+page.svelte:35-37` | 🟢 microcopy |

### 3.6 Saldo `/saldo` + `/saldo/top-up` + `/saldo/riwayat`

| # | Issue | Lokasi | Severity |
|---|---|---|---|
| U-16 | Hero saldo card di `/saldo` punya "Mutasi" button redundant dengan nav "Riwayat Saldo" di Akun | `saldo/+page.svelte` | 🟢 redundancy |
| U-17 | `/saldo/riwayat` kolom Keterangan terpotong (ellipsis) tanpa tooltip — "Pengembalian dana. ID Pesanan: 278…" | `saldo/riwayat/+page.svelte` | 🟢 tooltip |

### 3.7 Affiliate `/affiliate`

| # | Issue | Lokasi | Severity |
|---|---|---|---|
| U-18 | QR code cukup besar di desktop tapi tidak ada download QR / share image button | `affiliate/+page.svelte` | 🟢 feature gap |

### 3.8 Tiket `/tiket`

| # | Issue | Lokasi | Severity |
|---|---|---|---|
| U-19 | Empty state + form besar menumpuk vertikal di mobile — viewport 390×844 cuma muat empty state. Form harus di-sheet (bottom-up) atau collapsible. | `tiket/+page.svelte` | 🟡 Mobile density |

---

## 4. Phase UX1 — Mobile Dock + FAB (Quick Win, High Impact)

**Tujuan**: Dock 5 item + FAB Pesan sesuai DESIGN.md C.2. Quick win karena infrastruktur FAB sudah ada di admin (P1-04). 

### 4.1 Scope
- Refactor `app/src/routes/(app)/+layout.svelte`:
  - Dock items: **Beranda · Saldo · [FAB] · Pesanan · Akun** (5)
  - FAB center: rocket icon → buka Sheet "Buat Pesanan" (Buat Pesanan Baru / Pilih Layanan / Repeat Pesanan Cepat)
  - Hapus item `Pesan` & `Tiket` dari dock → pindah ke off-canvas "Lainnya" atau FAB Sheet
- Buat `MobileFab.svelte` (packages/ui, reusable) — Speed-dial single FAB (bukan expand), buka `Sheet.svelte` dengan quick actions.

### 4.2 Motion spec
- FAB entrance: `pop 320ms cubic-bezier(0.16,1,0.3,1)` saat page load (delay 200ms setelah dock)
- FAB tap: scale 0.92 → 1, haptic `navigator.vibrate(12)`, sheet slide-up 240ms
- Sheet backdrop: fade 200ms, blur(8px)
- Sheet content: stagger entrance 50ms per item
- Reduced-motion: skip pop animation, sheet tetap muncul tapi instant
- Active state dock: `transform: scale(1.08)` 240ms, ikon `rotate-6` pada hover (desktop only)

### 4.3 Copywriting
- FAB tooltip: "Pesan" (mobile long-press: "Buat pesanan baru")
- Sheet title: "Mau ngapain?" 
- Sheet items:
  - 🚀 **Pesan Baru** → `/pesan` "Pilih kategori, langsung order"
  - 🔁 **Pesan Lagi** → `/pesanan` (kalau ada history) "1-tap, link terisi otomatis"
  - 🎫 **Tiket Bantuan** → `/tiket` "Kami balas < 5 menit (24/7)"
- Dock labels: "Beranda · Saldo · Pesanan · Akun · Lainnya" (5, ringkas, max 6 char)

### 4.4 A11y
- FAB: `aria-label="Buka menu pesan"` + `aria-expanded` state
- Dock: `role="tablist"` + `aria-current="page"` untuk active
- Sheet: focus trap (Tab cycle), Escape close, `aria-modal="true"`
- Touch target: FAB 56×56 (≥44px guideline), dock item 48×48

### 4.5 File yang diubah
- `app/src/routes/(app)/+layout.svelte` — refactor dock (5 item), mount FAB
- `packages/ui/src/components/MobileFab.svelte` (NEW ~80 LOC)
- `packages/ui/src/components/Sheet.svelte` — sudah ada (audit), expose `aria-modal` + focus-trap helper
- `app/src/routes/(app)/+page.svelte:228-241` (SaldoHero) — kurangi padding mobile (pakai `lg:py-6 py-4`)
- `docs/DESIGN.md` C.2 — update sesuai fix

### 4.6 Acceptance
- ✅ Dock 5 items + FAB muncul di mobile ≤768px, hide di desktop
- ✅ FAB tap → Sheet terbuka, focus trap OK, Escape close
- ✅ Bottom dock tidak menutupi konten Pesan (cek padding-bottom = dock height + 16px)
- ✅ Lint + svelte-check pass
- ✅ Manual test di 390×844: Beranda, Pesan (scroll bawah), Pesanan, Akun

### 4.7 Estimasi
~4 jam (komponen sudah ada di admin, tinggal reuse + adapt).

---

## 5. Phase UX2 — Beranda Refresh (Hero + Quick Grid + Density)

**Tujuan**: Hilangkan waste vertical di Beranda mobile, expose semua 4 quick action, tambahkan live SSE dot anim.

### 5.1 Scope
- **Hapus/smart `PromoBanner`**:
  - Kalau `data.banners` kosong (current state) → JANGAN render section (save 200px)
  - Kalau ada banner → carousel swipe 1-banner per slide, height 120px mobile / 160px desktop, indicator dots
  - File: `packages/ui/src/components/PromoBanner.svelte` — tambahkan prop `mode="carousel|hide"` default `hide` kalau empty
- **`SaldoHero` mobile compaction**:
  - Padding `py-6` → `py-3 lg:py-6`
  - Insight 7-hari dipindah ke expandable di mobile (chevron + collapsible 240ms height anim)
  - Copy insight: "Pengeluaran 7 hari: Rp125.000" + "Top up: 3×" — narrative inline, bukan stat box
- **Quick action grid fix**:
  - Mobile: `grid-cols-2` bukan `grid-cols-3` (supaya 4 item muat dalam 2×2)
  - Items: **Pesan · Top Up · Layanan · Affiliate** (Pesan naik ke urutan 1 karena action utama)
  - Desktop: tetap 1×4 row di side panel (8/12 hero + 4/12 quick)
- **Live SSE dot di Pesanan Terbaru header**:
  - Pulse dot hijau-cyan 1.2s loop, "Live" text + last-update timestamp "Diperbarui 3 detik lalu"
  - Hide kalau tab hidden (`document.visibilityState === 'hidden'`)

### 5.2 Motion spec
- PromoBanner carousel: slide 320ms `cubic-bezier(0.16,1,0.3,1)`, auto-advance 6s, pause on hover/touch
- SaldoHero collapsible insight: `max-height` 0→200px + opacity 0→1, 240ms ease-out
- Quick action entrance: stagger 60ms `pop_320ms`, scale 0.95→1
- Live SSE dot pulse: `box-shadow 0 0 0 0 rgba(34,197,94,0.6)` → `0 0 0 8px transparent`, 1.2s infinite (CSS keyframe)
- Reduced-motion: collapsible instant, no pulse, no stagger

### 5.3 Copywriting
- Greeting (sudah ada, time-aware):
  - dawn "Selamat pagi, {name}" 🌅
  - day "Selamat siang, {name}" ☀️
  - dusk "Selamat sore, {name}" 🌇
  - night "Selamat malam, {name}" 🌙
- Subtitle (mobile compact): "Cek saldo & pesanan terbaru — 1 sentuh."
- Subtitle (desktop full): "Siap bantu naikin performa sosmed — cepat & aman."
- Quick action labels + desc:
  - 🚀 **Pesan** — "Kategori → order"
  - 💰 **Top Up** — "QRIS / transfer"
  - 📋 **Layanan** — "8.270 layanan"
  - 🤝 **Affiliate** — "Komisi downline"
- Pesan Terbaru header: "5 Pesanan Terakhir" + tap "Lihat semua →"

### 5.4 A11y
- PromoBanner: `role="region" aria-label="Promosi"`, slide `aria-live="polite"`
- SaldoHero: heading `h1` (sudah), saldo `aria-label="Saldo saat ini Rp4.962"`
- Quick action: `<a>` semantic, focus-visible ring, `aria-describedby` untuk desc
- Live dot: `aria-live="polite"` + text "Status pesanan diperbarui real-time"

### 5.5 File yang diubah
- `packages/ui/src/components/PromoBanner.svelte` — `mode="carousel|hide"`, hide default empty
- `packages/ui/src/components/SaldoHero.svelte` — collapsible insight, mobile padding
- `app/src/routes/(app)/+page.svelte:222,247,280` — quick grid `grid-cols-2 lg:grid-cols-1` (4 item)
- `packages/ui/src/components/LiveDot.svelte` (NEW ~30 LOC) — pulse anim + visibility API
- `app/src/routes/(app)/+page.svelte:280-300` — Pesan Terbaru header mount LiveDot
- `packages/ui/src/tokens.css` — keyframe `pulse-dot` (reuse dari admin P1)

### 5.6 Acceptance
- ✅ Mobile Beranda: tinggi viewport pertama (390×844) muat hero + saldo + quick grid 2×2 (top fold visible)
- ✅ PromoBanner tidak render saat empty (save 200px)
- ✅ Live dot pulse anim visible, pause saat tab hidden
- ✅ Lint + svelte-check pass
- ✅ Screenshot before/after `01-beranda.png` desktop + mobile

### 5.7 Estimasi
~6 jam.

---

## 6. Phase UX3 — Pesan Form (Mobile Bottom CTA + Desktop 2-col)

**Tujuan**: Fix CTA ketutup dock di mobile, optimalkan desktop pakai 2-col layout.

### 6.1 Scope
- **Mobile bottom-CTA pinned**:
  - Pindah blok Total bayar + CTA ke `position: fixed bottom-[64px] left-0 right-0` (di atas dock)
  - Backdrop blur `backdrop-blur-md` + `bg-surface/90`
  - Padding-bottom konten utama = bottom-CTA height + dock height + safe-area
- **Desktop 2-column form**:
  - Col kiri: Kategori → Layanan → Link (3 field utama, vertikal)
  - Col kanan: Jumlah stepper + Kode kupon + Saved links + Simpan checkbox
  - Bawah full-width: Total bayar + CTA + Saldo kamu
- **Real-time validation feedback**:
  - Link field: hijau check icon kalau match pattern platform (IG/TT/YT/TG), merah X kalau invalid
  - Jumlah field: live counter "Min: 100 · Max: 100.000.000", merah kalau out of range
  - Total bayar: count-up animation 320ms saat value berubah (NumberFlow reuse dari admin)

### 6.2 Motion spec
- Bottom CTA slide-up entrance: `translate-y-full → 0`, 320ms ease-out, delay 200ms setelah mount
- Field valid feedback: icon scale 0→1 `cubic-bezier(0.16,1,0.3,1)` 240ms + color transition
- Total bayar count-up: NumberFlow 320ms (sudah ada di admin P2-13)
- Reduced-motion: bottom-CTA instant, validation instant, count-up skip

### 6.3 Copywriting
- Kategori placeholder: "Pilih kategori layanan…"
- Layanan placeholder: "Pilih kategori dulu" / "Pilih layanan…"
- Link placeholder: `https://instagram.com/username` (contoh spesifik, bukan generic)
- Link hint: "💡 Tempel link publik — kalau private, order gagal. Pastikan bisa dibuka tanpa login."
- Jumlah hint: "Pilih layanan dulu untuk lihat min/max — semua angka tervalidasi otomatis."
- Kupon hint: "Punya kode promo? Masukkan di sini — diskon langsung di total."
- Simpan link: "Simpan link untuk pesan lagi nanti (1-tap repeat)"
- Total label: "Total bayar" (bukan "Total" — kata kerja lebih jelas)
- Saldo context: "Saldo kamu: Rp4.962 — kurang Rp175, top up dulu" (kalau saldo kurang) ATAU "Saldo kamu: Rp4.962 — cukup ✓"
- CTA states:
  - Disabled (belum pilih): "Pilih Layanan Dulu" faded
  - Disabled (saldo kurang): "Saldo Kurang · Top Up Dulu" orange
  - Active: "Pesan Sekarang · Rp15.300" gradient primary

### 6.4 A11y
- Bottom CTA: `role="region" aria-label="Ringkasan order"`
- Validation: `aria-invalid` + `aria-describedby` pointing to error/hint text
- Link field pattern: `inputmode="url"`, `autocomplete="off"` (URL pubblic, bukan login)
- Jumlah stepper: `<button>` accessible, `aria-label="Kurangi jumlah" / "Tambah jumlah"`, current value `aria-live="polite"`

### 6.5 File yang diubah
- `app/src/routes/(app)/pesan/+page.svelte` — restructure layout (mobile fixed bottom-CTA, desktop 2-col)
- `packages/ui/src/components/Input.svelte` — tambah `valid`/`invalid` prop + icon slot
- `packages/ui/src/components/Stepper.svelte` (NEW ~60 LOC) — accessible qty stepper reusable
- `packages/ui/src/components/NumberFlow.svelte` — reuse dari admin
- `app/src/routes/(app)/pesan/+page.svelte` stepper area — replace inline stepper dengan Stepper component
- `app/src/styles/global.css` atau layout — padding-bottom utility untuk pages dengan bottom CTA

### 6.6 Acceptance
- ✅ Mobile Pesan: Total bayar + CTA visible tanpa scroll di atas dock
- ✅ Desktop Pesan: 2-col layout, tidak ada waste horizontal space
- ✅ Real-time validation: link pattern check, jumlah range check, count-up total
- ✅ Touch target stepper: ≥44px, keyboard accessible
- ✅ Lint + svelte-check pass
- ✅ Screenshot before/after `02-pesan.png` desktop + mobile

### 6.7 Estimasi
~8 jam.

---

## 7. Phase UX4 — Pesanan (Inline-Stat + Variance + Live SSE Pulse)

**Tujuan**: Replace 4-col stat strip dengan inline-stat narrative, kasih variance per status, hidupkan SSE pulse anim.

### 7.1 Scope
- **Inline-stat replacement**:
  - Hapus 4-col strip TOTAL/PENDING/PROSES/SELESAI
  - Ganti dengan narrative hero: **"5.779 pesanan · 0 pending · 4.970 selesai (86%)"** — single line, 1 h2
  - Tambahkan mini sparkline di sebelah kanan (7-day order trend) — reuse Chart component area variant
- **Variance per status** (replace uniform card):
  - **Pending** (kuning): card dengan left-border 4px kuning + pulse dot di pojok kanan-atas
  - **Proses** (biru): card dengan left-border 4px biru + rotating arrow icon (motion subtle 4s loop)
  - **Selesai** (hijau): ledger row (no border, hairline divider only) + check icon green
  - **Gagal** (merah): card dengan left-border merah + X icon + "Auto-refund Rp9.000 → Saldo" mini info
  - **Partial** (orange): card dengan left-border orange + progress bar "% selesai"
- **Live SSE pulse**:
  - Banner top "🔴 LIVE · Diperbarui 5 detik lalu" dengan pulse dot
  - Pulse rate: 1.2s, opacity 1→0.4
  - Last-update time refresh tiap 5s, pause kalau tab hidden
  - SSE reconnect exponential backoff (1s → 2s → 4s → max 30s)
- **Swipe-left reorder (mobile)**:
  - Swipe left → reveal "Pesan Lagi" button (90px width slide-in 240ms)
  - Haptic feedback di swipe complete (10ms)
  - Long-press → context menu sheet (Salin Link · Detail · Tiket)
- **Bulk select** (kalau applicable, dari P5):
  - Checkbox kiri tiap row, slide-up bottom toolbar "Pilih Banyak · 3 dipilih · [Detail] [Tiket]"

### 7.2 Motion spec
- Pending pulse dot: `box-shadow 0 0 0 0 rgba(234,179,8,0.6) → 0 0 0 10px transparent`, 1.2s infinite
- Proses rotating arrow: `rotate 0 → 360deg`, 4s linear infinite
- Sparkline entrance: path stroke-dasharray 0 → length, 800ms ease-out
- Inline-stat hero entrance: fade + translate-y-2 → 0, 320ms
- Swipe-left: button width 0→90px, 240ms `cubic-bezier(0.16,1,0.3,1)`, content padding-left shift
- Long-press context menu: sheet slide-up 280ms
- Reduced-motion: no pulse, no rotate, swipe instant, no stagger

### 7.3 Copywriting
- Hero narrative: "5.779 pesanan · 0 pending · 4.970 selesai · 86% success rate bulan ini"
- Last update: "Diperbarui 5 detik lalu · LIVE" / "Diperbarui 2 menit lalu · pause"
- Filter chip counts: badge numeric "0 / 5.779" — small text
- Status text per status:
  - Pending: "Menunggu diproses provider…"
  - Proses: "Sedang berjalan, estimasi < 1 jam"
  - Selesai: "Selesai · 100% terpenuhi"
  - Gagal: "Gagal · Rp9.000 otomatis ke saldo"
  - Partial: "Sebagian selesai · sisa 49.831 otomatis direfund"
- Empty state (kalau 0): "Belum ada pesanan — pesan pertama kamu? [Pesan Baru]"

### 7.4 A11y
- Pulse dot: `aria-hidden="true"` (decorative), info conveyed via text
- Status badges: text + color (bukan color-only), `aria-label="Status: Selesai"`
- Swipe-left: juga expose via menu (3-dot button kanan), `aria-haspopup="menu"`
- Filter chips: `aria-pressed`, `role="tab"` semantics
- Live region: `aria-live="polite"` untuk update count + last-update time

### 7.5 File yang diubah
- `app/src/routes/(app)/pesanan/+page.svelte` — refactor top (inline-stat), list (variance per status)
- `packages/ui/src/components/StatusBadge.svelte` — tambah prop `leftBorderColor` + `pulse` + `rotate`
- `packages/ui/src/components/Sparkline.svelte` (NEW ~80 LOC) — mini 7-day area chart inline
- `packages/ui/src/components/SwipeRow.svelte` (NEW ~100 LOC) — touch + keyboard accessible swipe
- `app/src/lib/sse.ts` — improve backoff, pause on hidden tab, expose `useSSE` hook
- `app/src/routes/(app)/pesanan/+page.svelte` — wire SSE ke status update + last-update counter

### 7.6 Acceptance
- ✅ Inline-stat replaces 4-col strip, tetap scannable dalam 1 glance
- ✅ Status variance terlihat jelas: pending pulse, proses rotate, selesai calm
- ✅ Swipe-left "Pesan Lagi" works di mobile + 3-dot menu di desktop
- ✅ SSE pulse + last-update banner, pause saat tab hidden
- ✅ Lint + svelte-check pass
- ✅ Screenshot before/after `03-pesanan.png` desktop + mobile

### 7.7 Estimasi
~10 jam.

---

## 8. Phase UX5 — Akun Refactor (Variance + Section Grouping)

**Tujuan**: Reduce 6 cards sejajar → 3 pola containment (header tinted + ledger rows + quick chips), tetap informatif.

### 8.1 Scope
- **Header tinted (pakai pola 1)**:
  - Avatar + Nama + Level badge + Saldo gradient besar dalam 1 hero block (sudah ada, pertahankan)
- **Ledger rows (pakai pola 2)**:
  - Group "Akun & Keamanan": Profil, Ganti Password, Passkey (future), API Key, Tema
  - Tiap row: icon kiri, label + deskripsi tengah, action kanan (chevron / switch)
  - No card chrome, hairline divider only
- **Quick chips (pakai pola 3)**:
  - Group "Navigasi Cepat": Top Up Saldo · Riwayat Saldo · Affiliate · Tiket · Notifikasi · Keluar
  - Horizontal scroll chips di mobile, grid 3×2 di desktop
- **API Key section polish**:
  - Default masked: `sk_xxxx_xxxx_xxxx_9a3f`
  - Eye toggle (240ms fade) untuk reveal full key
  - "Salin" button + "Regenerate" (ConfirmDialog sudah ada) di row action

### 8.2 Motion spec
- Row hover: bg `bg-ink-50` fade in 200ms
- API key reveal: blur 8px → 0 + opacity, 240ms ease-out
- Switch toggle (Tema): slide thumb 200ms `cubic-bezier(0.16,1,0.3,1)` + haptic 8ms
- Logout: `Keluar` button red hover bg fade 200ms, click scale 0.97
- Reduced-motion: skip fades, instant reveal

### 8.3 Copywriting
- Section labels:
  - "Akun & Keamanan" — "Profil, login, dan API akses kamu"
  - "Navigasi Cepat" — "Langsung ke fitur populer"
- Row labels + deskripsi:
  - **Profil** — "Nama & username publik"
  - **Ganti Password** — "Update rutin biar akun tetap aman"
  - **API Key** — "Integrasi dengan tools & bot kamu"
  - **Tema** — "Light (default) / Dark (untuk malam)"
  - **Logout** — "Keluar dari sesi ini" (red)
- Empty API key: "Belum ada API key — generate untuk integrasi"

### 8.4 A11y
- Rows: `<button>` atau `<a>` semantic, `aria-label` untuk icon-only actions
- Switch: `role="switch"` + `aria-checked`, label "Aktifkan tema gelap"
- Logout: ConfirmDialog fokus ke "Konfirmasi" button, Esc cancel
- API key reveal: `aria-pressed` toggle, screen-reader announce "API key revealed, jangan share"

### 8.5 File yang diubah
- `app/src/routes/(app)/akun/+page.svelte` — refactor jadi 3 section (hero, ledger, chips)
- `packages/ui/src/components/Row.svelte` (NEW ~50 LOC) — reusable list row dengan icon + label + action
- `packages/ui/src/components/Switch.svelte` (NEW ~40 LOC) — accessible toggle
- `packages/ui/src/components/Chip.svelte` (audit, mungkin sudah ada) — horizontal scroll variant
- `app/src/lib/server/api-key.ts` (audit) — mask function sudah ada? kalau belum, tambah `maskApiKey(key, visible=4)`

### 8.6 Acceptance
- ✅ Akun: 3 pola containment terlihat (hero tinted + ledger + chips)
- ✅ API key mask + reveal toggle works, Salin + Regenerate accessible
- ✅ Tema switch instant feedback + persisted di localStorage
- ✅ Logout ConfirmDialog fokus trap + Esc
- ✅ Lint + svelte-check pass
- ✅ Screenshot before/after `05-akun.png` desktop + mobile

### 8.7 Estimasi
~6 jam.

---

## 9. Phase UX6 — Copy & A11y Polish Pass (Cross-cutting)

**Tujuan**: Polish semua copy (DESIGN.md §E banned words), tambah a11y yang kurang, fix duplication kecil.

### 9.1 Scope
- **Layanan duplicate title**: hapus page title di desktop (header sidebar sudah cukup)
- **Filter chip "Favorit 1"**: ganti jadi "★ Favorit (1)" + tooltip "Layanan yang kamu bintang"
- **Saldo `/saldo` redundant "Mutasi" button**: ganti jadi "Lihat Riwayat" saja, atau hapus kalau nav Akun sudah ada
- **Tooltip for truncated text**: tambah `title` attribute di semua `{text}.slice(0, N) + "…"` — murah, native
- **Banned word audit** (DESIGN.md §E.3): scan semua route, replace yang masih ada
- **A11y pass**:
  - Verify `aria-label` di semua icon-only button
  - Verify focus-visible ring konsisten (cyan-500 2px)
  - Verify heading hierarchy (h1 → h2 → h3 tidak skip)
  - Verify form labels (semua `<input>` punya `<label>` atau `aria-label`)
  - Verify color contrast AA untuk accent-filled (button, badge) — minimum 4.5:1

### 9.2 Motion spec
- (Tidak ada motion baru, polish yang sudah ada)

### 9.3 Copywriting
- **Banned words audit** (DESIGN.md §E.3):
  - "Simpel" → "Cepat"
  - "Pelanggan" → "Member"
  - "Mudah" → "1 sentuh" / "Otomatis"
  - "Terbaik" / "Terpercaya" → hapus (claim tanpa bukti)
  - "Cuma-cuma" / "Gratis" → spesifikkan "Tanpa biaya admin" / "Rp0 admin"
- **Truncated text examples**:
  - Pengembalian dana ID Pesanan: 27883 → `title="Pengembalian dana · Pesanan #27883"`
  - Metode transfer "Bank Central Asia" → `title="Bank Central Asia · BCA Manual"`

### 9.4 A11y checklist
- [ ] Heading order h1 → h2 → h3 di semua route
- [ ] Form labels di semua input field
- [ ] Aria-label di icon-only buttons (back, close, more, dll)
- [ ] Focus-visible ring konsisten
- [ ] Color contrast AA verified via axe-core (sudah ada di static/axe.min.js)
- [ ] Skip link "Skip to main content" untuk keyboard users

### 9.5 File yang diubah
- `app/src/routes/(app)/layanan/+page.svelte:14` — hapus duplicate title
- `app/src/routes/(app)/saldo/+page.svelte` — hapus/ganti button "Mutasi"
- `packages/core/src/copy.ts` — banned words replacement
- `app/src/routes/**/+page.svelte` — a11y pass (label, aria, heading)
- `packages/ui/src/components/Input.svelte` — verify label association
- `app/src/routes/(app)/+layout.svelte` — tambah `<a href="#main" class="sr-only focus:not-sr-only">Skip to content</a>`

### 9.6 Acceptance
- ✅ No banned word di copy user app (scan via grep `grep -E "simpel|mudah|terbaik|terpercaya|gratis" app/src/routes/\(app\)`)
- ✅ Semua input punya label
- ✅ Heading hierarchy valid (cek via axe)
- ✅ Color contrast AA pass untuk accent buttons (cek via axe)
- ✅ Screenshot `04-layanan.png` desktop — no duplicate title

### 9.7 Estimasi
~4 jam (mostly grep + replace + axe verify).

---

## 10. Carryover Phase P3 — Admin Dashboard Outstanding

> Source: `docs/planadmin.md` Phase P3 (10 item, ~68 jam) — semua sesuai `docs/ADMIN_GAP.md` gap G2/G4/G6/G7/G9/G10/G12/G13/G14/G26.

### 10.1 P3-01 — RBAC: Super Admin / Admin / Operator / Finance

**Tujuan**: G6 — role-based permission per modul, ganti full-access admin saat ini.

**Scope**:
- Schema: tambah kolom `role ENUM('super_admin','admin','operator','finance')` di `users`
- Permission matrix di `packages/core/src/rbac.ts`:
  - **Super Admin**: all permissions
  - **Admin**: users (read/edit/suspend), orders, deposits, services, pricing, providers, banners, news, email, tickets, settings
  - **Operator**: orders (read/edit), deposits (read), tickets (read/reply), services (read)
  - **Finance**: deposits (approve/reject), balance_logs (read/adjust dengan approval), refund (request only)
- Permission middleware di `app/src/hooks.server.ts` (admin route guard)
- Admin UI: tambah role badge di header admin, hide menu items yang tidak diizinkan
- Admin user management: tambah role selector di user create/edit
- Audit log: record role change dengan before/after JSON

**Motion**: role badge pulse subtle saat role berubah, menu hide/show dengan fade 200ms

**Copy**: 
- Role labels: "Super Admin · Akses penuh", "Admin · Operasional", "Operator · Order & tiket", "Finance · Deposit & refund"
- Empty permission: "Kamu tidak punya akses ke halaman ini — hubungi super admin"
- 403 page: "Akses ditolak · role kamu: Operator · butuh: Admin"

**A11y**: role selector `aria-describedby` untuk permission list, hide menu items pakai `aria-hidden` + display none

**Files**:
- `packages/db/src/schema/users.ts` — tambah kolom `role`
- `packages/core/src/rbac.ts` (NEW ~80 LOC) — permission matrix + `can(role, action, target)` helper
- `app/src/hooks.server.ts` — admin route guard + permission check
- `app/src/routes/(admin)/admin/users/+page.svelte` — role selector di create/edit
- `app/src/routes/(admin)/admin/+layout.svelte` — role badge, hide menu items
- `app/src/routes/(admin)/+error.svelte` (NEW) — 403 page

**Acceptance**:
- ✅ 4 role bisa di-create + di-edit
- ✅ Permission matrix enforced di semua admin route
- ✅ 403 page informative + role badge visible
- ✅ Audit log entry untuk role change
- ✅ Lint + svelte-check + test pass
- ✅ Manual test: login sebagai Operator, coba akses /admin/deposits → 403

**Effort**: 12 jam

---

### 10.2 P3-02 — 2FA TOTP Wajib untuk Admin

**Tujuan**: G7 — semua admin wajib pakai TOTP (Google Authenticator) sebelum bisa akses panel.

**Scope**:
- Schema: tambah `totp_secret`, `totp_enabled`, `totp_backup_codes` di `users` (kolom tambahan atau tabel `user_2fa`)
- Setup flow:
  1. Admin login pertama → force setup TOTP (QR code + manual key + verify code)
  2. Backup codes (10 kode) — tampil 1× + simpan di R2 encrypted
  3. Recovery via backup code
- Verify per login: kalau TOTP enabled → setelah password, minta kode 6 digit
- Disable: butuh password + backup code (atau super admin override)

**Motion**:
- QR code entrance: scale 0.9→1 + fade 320ms
- Step indicator: 3 steps (Scan · Verify · Backup), progress bar fill 320ms
- Backup codes: stagger reveal 50ms per code (1× only, screensaver)
- Verify: shake animation kalau kode salah (160ms, 3 cycle)

**Copy**:
- Setup title: "Amankan akun kamu — 2FA wajib untuk admin"
- Step 1: "Scan QR dengan Google Authenticator / Authy / 1Password"
- Step 2: "Masukin 6 digit kode dari app untuk konfirmasi"
- Step 3: "Simpan 10 backup code — kalau HP hilang, ini jalan masuk kamu"
- Recovery: "Kehilangan HP? Pakai backup code atau hubungi super admin"
- Login: "Password OK · Verifikasi 2FA" → input 6-digit

**A11y**:
- QR code + manual key sebagai fallback (text selectable)
- Backup codes list dengan `role="list"` + numbered
- Verify input: `inputmode="numeric"` + `autocomplete="one-time-code"`

**Files**:
- `packages/db/src/schema/users.ts` — tambah kolom 2FA
- `packages/core/src/totp.ts` (NEW ~100 LOC) — generate secret, verify, backup codes
- `app/src/routes/(admin)/admin/2fa/setup/+page.svelte` (NEW) — 3-step wizard
- `app/src/routes/(admin)/admin/2fa/verify/+page.svelte` (NEW) — login verify
- `app/src/hooks.server.ts` — middleware cek `totp_enabled` + redirect ke verify
- `app/src/lib/server/2fa.ts` — server logic (encrypt secret at rest)

**Acceptance**:
- ✅ 2FA setup wizard works end-to-end
- ✅ Login flow: password → 2FA verify → dashboard
- ✅ Backup code recovery works
- ✅ Disable 2FA butuh password + backup code
- ✅ Lint + svelte-check + test pass
- ✅ Manual test: logout → login dengan TOTP code → masuk

**Effort**: 8 jam

---

### 10.3 P3-03 — Refund Workflow + Dual Approval

**Tujuan**: G2 — refund harus formal, refund > Rp50k butuh approval admin lain.

**Scope**:
- Schema: tambah tabel `refund_requests` (id, order_id, amount, reason, requested_by, status, approved_by, executed_at, created_at)
- Workflow:
  1. Admin request refund dari order detail (reason required, amount partial/full)
  2. Kalau amount < Rp50k → auto-execute + record ke audit
  3. Kalau amount >= Rp50k → status `pending_approval`, notif ke admin lain
  4. Admin kedua approve/reject (butuh reason kalau reject)
  5. Approved → execute refund (balance_logs entry) + audit
- UI: tab "Refund Pending" di admin dashboard dengan badge count + approve/reject buttons
- Filter: by status, by requester, by amount

**Motion**:
- Request modal: slide-up 320ms
- Approval badge pulse: pending = yellow pulse 1.5s, approved = green check, rejected = red X
- Toast notification: success "Refund Rp150.000 dieksekusi" + undo button (5s window)

**Copy**:
- Modal title: "Refund Pesanan #27953 — Rp150.000"
- Reason placeholder: "Order tidak sesuai · user request · partial fulfillment"
- Amount hint: "< Rp50.000 auto-approve · ≥ Rp50.000 butuh admin kedua"
- Pending list: "3 refund menunggu approval · oldest: 2 jam lalu"
- Approve: "Setujui · Refund Rp150.000 ke saldo user"
- Reject: "Tolak · alasan: ..."
- Success toast: "Refund dieksekusi · Saldo Mardian +Rp150.000"
- Undo (5s): "Undo · kembalikan ke status pending"

**A11y**:
- Modal: focus trap + Escape close (kalau belum approve)
- Approve button: confirm dialog (G30 sudah ada) sebelum execute
- Pending list: announce count update via aria-live

**Files**:
- `packages/db/src/schema/refund-requests.ts` (NEW)
- `app/src/routes/(admin)/admin/refunds/+page.svelte` (NEW) — pending list + history
- `app/src/routes/(admin)/admin/orders/[id]/+page.svelte` — tambah "Refund" button (kalau eligible)
- `app/src/lib/server/refund.ts` (NEW ~120 LOC) — workflow logic + balance update + audit
- `app/src/lib/server/notification.ts` — wire notif ke admin kedua

**Acceptance**:
- ✅ Refund < Rp50k auto-approve + execute + audit
- ✅ Refund ≥ Rp50k butuh approval admin kedua
- ✅ Approve kedua → execute + audit + balance update
- ✅ Reject butuh reason
- ✅ Lint + svelte-check + test pass
- ✅ Manual test: Admin A request refund Rp100k → Admin B approve → saldo user updated

**Effort**: 8 jam

---

### 10.4 P3-04 — Deposit Verify Bukti Transfer

**Tujuan**: G4 — konfirmasi deposit butuh bukti transfer (image), auto-match dengan mutasi bank kalau ada.

**Scope**:
- Schema: tambah `proof_image`, `verified_by`, `verified_at`, `verification_notes` di `deposits`
- Upload: drag-drop atau file picker, max 5MB, jpg/png/pdf, store di R2 (`deposits/proof/{deposit_id}.jpg`)
- Verify queue: tab "Deposit Pending Verify" di admin dengan thumbnail
- View: modal preview image + side-by-side nominal check
- Auto-match: kalau Tripay/Midtrans callback, auto-verify kalau nominal cocok (dengan grace ±Rp100 untuk fee)
- Manual verify: admin click "Cocok" / "Tidak Cocok" + notes

**Motion**:
- Upload: progress bar fill + thumbnail fade-in
- Image preview: zoom on hover 200ms (desktop), tap to fullscreen (mobile)
- Verify badge: pending = yellow pulse, verified = green check, rejected = red X

**Copy**:
- Upload hint (user side): "Upload bukti transfer · JPG/PNG/PDF maks 5MB"
- Verify queue title: "5 Deposit Menunggu Verifikasi · oldest 30 menit lalu"
- Match check: "Nominal: Rp50.775 · Cocok dengan mutasi" / "Nominal tidak cocok · selisih Rp225 (biaya admin?)"
- Manual verify: "Cocok & setujui" / "Tidak cocok & reject"
- Notes placeholder: "Bukti tidak terbaca · minta user upload ulang"

**A11y**:
- Image upload: `<input type="file">` dengan label visible
- Preview modal: focus ke close button, Esc close
- Verify buttons: keyboard accessible + confirm dialog (G30) untuk reject

**Files**:
- `packages/db/src/schema/deposits.ts` — tambah kolom verify
- `app/src/routes/(app)/saldo/top-up/+page.svelte` — upload proof step (kalau manual transfer)
- `app/src/routes/(admin)/admin/deposits/verify/+page.svelte` (NEW) — verify queue
- `app/src/lib/server/r2.ts` — helper upload proof
- `app/src/lib/server/deposit-verify.ts` (NEW ~80 LOC) — manual + auto match logic

**Acceptance**:
- ✅ User upload bukti transfer → tersimpan di R2
- ✅ Admin lihat thumbnail di verify queue
- ✅ Auto-match Tripay/Midtrans callback kalau nominal cocok
- ✅ Manual verify + reject dengan notes
- ✅ Lint + svelte-check + test pass

**Effort**: 6 jam

---

### 10.5 P3-05 — Order Manual (Custom Service)

**Tujuan**: G12 — admin bisa input order manual (status manual, tidak kirim ke provider API).

**Scope**:
- Schema: tambah `is_manual`, `manual_notes` di `orders`
- Admin UI: di order create form, toggle "Manual Order (skip provider)" → fields jadi opsional (no service mapping required)
- Status flow manual: `manual → done` (admin langsung tandai selesai)
- Price: admin input manual, no pricing rule apply
- Catatan wajib: kenapa order manual (mis. "Service custom · request user langsung")

**Motion**:
- Toggle switch: thumb slide 200ms + label fade
- Manual fields: slide-down 280ms saat toggle on

**Copy**:
- Toggle label: "Order manual · skip provider API"
- Hint: "Pakai untuk service custom / offline / request khusus · catatan wajib"
- Field label: "Catatan manual · kenapa order ini tidak lewat provider"

**A11y**: switch accessible, fields required indicated

**Files**:
- `packages/db/src/schema/orders.ts` — tambah kolom is_manual
- `app/src/routes/(admin)/admin/orders/new/+page.svelte` (NEW) — form dengan toggle
- `app/src/lib/server/order.ts` — skip provider sync kalau manual

**Acceptance**:
- ✅ Admin bisa create order manual
- ✅ Status langsung "done" tanpa provider sync
- ✅ Audit log entry "manual_order_created"
- ✅ Lint + svelte-check + test pass

**Effort**: 4 jam

---

### 10.6 P3-06 — Broadcast Notification (In-app + Web Push)

**Tujuan**: G13 — admin bisa kirim notif ke segment user (all / by level / by verification).

**Scope**:
- Schema: tambah `broadcast_campaigns` (id, title, body, target_segment, sent_count, sent_at, created_by)
- Segment builder: All / Member / Agen / Reseller / Verified / Unverified / by date range
- Channels: in-app only / web push only / both
- Schedule: now / scheduled (datetime picker)
- Web Push: kirim ke semua subscription yang match segment (batched, max 100/batch)
- In-app: insert ke tabel `notifications` per user match segment
- History: list campaign dengan sent_count + open_count (kalau web push)

**Motion**:
- Campaign composer: step indicator 3 (Segment · Content · Send)
- Preview: live preview di mobile mock-up frame
- Send progress: progress bar fill 0→100% dengan count update

**Copy**:
- Composer title: "Broadcast Notifikasi · kirim ke user segment"
- Step 1: "Pilih target · siapa yang mau dikabari"
- Step 2: "Tulis pesan · judul + body (push cuma 120 char judul, 240 body)"
- Step 3: "Kirim sekarang / jadwal · preview notifikasi"
- Success: "Broadcast terkirim ke 1.234 user · in-app: 1.234 · push: 890 (tersisa HP mati)"

**A11y**:
- Segment picker: checkbox group dengan label
- Content fields: input dengan counter character
- Preview frame: sebagai visual reference saja (decorative)

**Files**:
- `packages/db/src/schema/broadcasts.ts` (NEW)
- `app/src/routes/(admin)/admin/broadcast/+page.svelte` (NEW) — composer + history
- `app/src/lib/server/broadcast.ts` (NEW ~150 LOC) — segment evaluation + dispatch
- `app/src/lib/server/web-push.ts` — batch send helper (sudah ada?)
- `app/src/lib/server/notification.ts` — insert ke notifications table

**Acceptance**:
- ✅ Composer 3-step works
- ✅ Segment "All Member" → hitung user count sebelum kirim
- ✅ Send in-app + web push → count recorded
- ✅ History list campaign dengan sent_count
- ✅ Lint + svelte-check + test pass

**Effort**: 6 jam

---

### 10.7 P3-07 — Backup Management UI

**Tujuan**: G9 — admin bisa trigger backup on-demand, list backup, restore, schedule auto-backup.

**Scope**:
- Schema: tambah `backup_jobs` (id, type ENUM('full','schema-only'), status, file_path, size_bytes, created_at, created_by, restored_at)
- Backup:
  - On-demand: admin click "Backup Sekarang" → trigger mysqldump → upload ke R2 (`backups/{timestamp}.sql.gz`)
  - Schedule: cron daily 03:00 WIB (auto)
  - Retention: keep last 30 days, hapus yang lebih lama
- UI:
  - List backup dengan size + tanggal + status (success/failed)
  - Download button per backup
  - Restore button (ConfirmDialog G30) — caution: replace existing DB
  - Schedule editor: enable/disable + cron expression picker

**Motion**:
- Backup progress: progress bar indeterminate + estimated time
- Restore confirm: shake animation 200ms untuk emphasize danger

**Copy**:
- Page title: "Backup Database · R2 encrypted · 30 hari retention"
- On-demand: "Backup sekarang · estimasi 2-5 menit tergantung ukuran"
- List header: "Backup terakhir · 3 jam lalu · 142 MB"
- Restore warning: "Restore akan replace database · pastikan kamu yakin! Database saat ini akan di-backup dulu sebelum restore"
- Schedule: "Auto-backup harian · 03:00 WIB · enabled"

**A11y**:
- Confirm dialog G30 (sudah ada)
- Progress update: aria-live polite
- Cron picker: simple dropdown (jangan full cron UI)

**Files**:
- `packages/db/src/schema/backups.ts` (NEW)
- `app/src/routes/(admin)/admin/backups/+page.svelte` (NEW) — list + actions
- `app/src/lib/server/backup.ts` (NEW ~120 LOC) — mysqldump wrapper + R2 upload
- `app/src/cron/backup.ts` (NEW) — daily cron job
- `app/src/routes/api/admin/backup/restore/+server.ts` (NEW) — restore endpoint

**Acceptance**:
- ✅ Backup on-demand works, file di R2
- ✅ Auto-backup cron runs daily
- ✅ Restore works (test di staging dulu!)
- ✅ Retention auto-delete > 30 days
- ✅ Lint + svelte-check + test pass

**Effort**: 6 jam

---

### 10.8 P3-08 — Export PDF untuk Orders / Deposits / Reporting

**Tujuan**: G14 — export PDF (sudah ada CSV) untuk invoice / laporan pajak / audit.

**Scope**:
- Library: `@react-pdf/renderer` tidak cocok untuk SvelteKit → pakai `pdfmake` atau `puppeteer` headless
- Recommended: `puppeteer-core` + Chromium binary (atau `playwright-chromium` yang sudah ada)
- Template:
  - Invoice order: header logo + nomor invoice + tanggal + user info + service table + total + footer T&C
  - Deposit report: header + filter (date range) + table + total summary + signature line
  - Reporting summary: chart snapshot + table + insights
- UI: button "Export PDF" di halaman orders / deposits / reporting, dengan options (date range, status filter)
- Stream response: `application/pdf` dengan `Content-Disposition: attachment; filename=...`

**Motion**:
- Export progress: progress bar + estimated time
- Success toast: "PDF siap · 12 order · 234 KB" + download link

**Copy**:
- Export button: "Export PDF"
- Options modal: "Filter · Date range · Include details"
- Success: "PDF siap didownload · klik untuk simpan"
- Footer PDF: "Socio.id · Invoice generated {tanggal} · Halaman X dari Y"

**A11y**:
- Export button accessible
- Progress update aria-live
- PDF itu sendiri (generated): semantic HTML di-convert, heading + table proper

**Files**:
- `app/src/lib/server/pdf.ts` (NEW ~80 LOC) — template helpers (HTML → PDF via puppeteer)
- `app/src/routes/api/admin/orders/export-pdf/+server.ts` (NEW)
- `app/src/routes/api/admin/deposits/export-pdf/+server.ts` (NEW)
- `app/src/routes/api/admin/reporting/export-pdf/+server.ts` (NEW)
- `packages/ui/src/components/ExportButton.svelte` (NEW ~60 LOC) — date range + status filter + trigger

**Acceptance**:
- ✅ Export PDF orders dengan date range
- ✅ Export PDF deposits dengan status filter
- ✅ Export PDF reporting summary
- ✅ PDF layout rapi (header logo, table, footer T&C, page number)
- ✅ Lint + svelte-check + test pass

**Effort**: 8 jam

---

### 10.9 P3-09 — Realtime Activity Feed (SSE) untuk Dashboard

**Tujuan**: G26 — admin dashboard auto-update tanpa refresh manual, feed event real-time.

**Scope**:
- SSE endpoint: `app/src/routes/api/admin/events/+server.ts` — stream event
- Events: order_created, order_status_changed, deposit_pending, ticket_created, error_logged
- Backend: pub/sub via `EventTarget` atau simple in-memory emitter (single process)
- UI: dashboard widget "Activity Feed" dengan list 10 event terakhir + filter by type + counter per type
- Badge: header "🔴 LIVE" + reconnect state

**Motion**:
- New event entry: slide-down from top + green flash 1.5s
- Counter update: count-up animation 320ms (NumberFlow)
- Feed filter chips: switch smooth

**Copy**:
- Widget title: "Activity Feed · real-time"
- Filter chips: "Semua · Order · Deposit · Tiket · Error"
- Event messages:
  - Order: "Order baru · #27953 · Mardian Supriadi · Instagram Views · Rp15.300"
  - Deposit: "Deposit pending · Rp50.775 · BCA Manual · Mardian"
  - Tiket: "Tiket baru · #142 · Mardian · 'Order belum masuk'"
  - Error: "SMMturk API timeout · 5 retry · backoff 4h"
- Empty state: "Belum ada activity · refresh otomatis dalam 30s"

**A11y**:
- Feed: `role="log" aria-live="polite"`
- Filter chips: `aria-pressed`
- Timestamp relative: `aria-label="2 menit lalu"`

**Files**:
- `app/src/routes/api/admin/events/+server.ts` (NEW) — SSE stream
- `app/src/lib/server/event-bus.ts` (NEW ~60 LOC) — in-memory emitter
- `app/src/routes/(admin)/admin/+page.svelte` — tambah ActivityFeed widget
- `packages/ui/src/components/ActivityFeed.svelte` (NEW ~120 LOC) — reusable

**Acceptance**:
- ✅ SSE stream works, event muncul real-time
- ✅ Activity Feed widget di admin dashboard
- ✅ Filter by type works
- ✅ Reconnect on disconnect
- ✅ Lint + svelte-check + test pass

**Effort**: 4 jam

---

### 10.10 P3-10 — Queue/Cron Monitoring Dashboard

**Tujuan**: G10 — admin bisa monitor cron job + queue + provider API health dari 1 dashboard.

**Scope**:
- Widget "Cron Health":
  - Last run setiap cron job (provider-sync, status-poll, deposit-verify, backup, broadcast)
  - Status: success / failed / running / never
  - Duration last run + average
  - Next run countdown
  - Error count last 24h
- Widget "Queue Depth":
  - job_queue table count by status (pending, running, completed, failed)
  - Oldest pending job age
  - Throughput last hour (jobs/min)
- Widget "Provider Health":
  - SMMturk balance (cached 5min)
  - API response time last 1h (avg)
  - Error rate last 1h (%)
  - Last successful call
- Widget "DB Size":
  - Total size
  - Top 5 table size
  - Growth last 7 days

**Motion**:
- Status badge pulse: red pulse kalau error count > threshold
- Chart sparkline: line chart 24h untuk error rate
- Refresh: auto-refresh 30s, pause on hidden tab

**Copy**:
- Page title: "System Health · Cron + Queue + DB"
- Cron widget: "Provider Sync · last run 45 menit lalu · success · next run 14 menit lagi"
- Queue widget: "3 job pending · oldest 2 menit · 12 jobs/menit throughput"
- Provider widget: "SMMturk · balance $124.50 · API 230ms avg · error 0.5% last 1h"
- DB widget: "DB 2.4 GB · orders 1.1 GB (45%) · +120 MB last 7 days"

**A11y**:
- Widgets: `role="region" aria-label="..."`
- Status badge: text + color
- Auto-refresh: announce "Data diperbarui 30 detik lalu"

**Files**:
- `app/src/routes/(admin)/admin/health/+page.svelte` (NEW) — 4 widgets
- `app/src/lib/server/metrics.ts` (NEW ~120 LOC) — collect dari various tables + provider API
- `app/src/lib/server/cron-registry.ts` — expose list cron jobs + last run timestamps
- `app/src/routes/api/admin/health/+server.ts` (NEW) — JSON untuk widget fetch

**Acceptance**:
- ✅ 4 widget tampil dengan data real-time
- ✅ Auto-refresh 30s works
- ✅ Pulse badge kalau error count tinggi
- ✅ Lint + svelte-check + test pass

**Effort**: 6 jam

---

## 11. Tabel Prioritas Eksekusi

| Phase | Scope | Effort | Dependency | Impact |
|---|---|---|---|---|
| **UX1** | Mobile dock + FAB | 4h | Tidak ada | 🔴 High (mobile critical path) |
| **UX2** | Beranda refresh | 6h | UX1 (FAB mount) | 🔴 High (mobile density) |
| **UX3** | Pesan form mobile CTA + desktop 2-col | 8h | Tidak ada | 🔴 High (CTA visibility) |
| **UX4** | Pesanan inline-stat + variance + SSE pulse | 10h | Tidak ada | 🟠 Medium-High (anti-pattern) |
| **UX5** | Akun refactor variance | 6h | Tidak ada | 🟠 Medium |
| **UX6** | Copy + a11y polish | 4h | UX1-5 selesai | 🟢 Medium |
| **P3-01** | RBAC | 12h | Tidak ada | 🔴 High (security) |
| **P3-02** | 2FA TOTP | 8h | Tidak ada | 🔴 High (security) |
| **P3-03** | Refund workflow | 8h | P3-01 (audit role) | 🟠 Medium-High |
| **P3-04** | Deposit verify | 6h | P3-01 | 🟠 Medium |
| **P3-05** | Order manual | 4h | Tidak ada | 🟢 Medium |
| **P3-06** | Broadcast | 6h | Web push ready | 🟡 Medium-Low |
| **P3-07** | Backup UI | 6h | Tidak ada | 🟢 Medium |
| **P3-08** | Export PDF | 8h | Tidak ada | 🟡 Medium-Low |
| **P3-09** | Realtime activity feed | 4h | Tidak ada | 🟡 Medium |
| **P3-10** | Health dashboard | 6h | Tidak ada | 🟢 Medium |
| **TOTAL UX1-6** | | **38 jam** | | |
| **TOTAL P3-01..10** | | **68 jam** | | |
| **GRAND TOTAL** | | **106 jam** | | |

**Rekomendasi urutan eksekusi** (highest ROI first):
1. **UX1** (4h) — quick win mobile
2. **UX2** (6h) — density hero + quick grid
3. **UX3** (8h) — form critical path
4. **P3-01** (12h) — security foundation
5. **P3-02** (8h) — security TOTP
6. **UX4** (10h) — anti-pattern fix + SSE
7. **UX5** (6h) — variance polish
8. **P3-03** (8h) — refund workflow
9. **UX6** (4h) — final polish
10. **P3-04** (6h) — deposit verify
11. **P3-05** (4h) — order manual
12. **P3-07** (6h) — backup UI
13. **P3-10** (6h) — health dashboard
14. **P3-09** (4h) — activity feed
15. **P3-06** (6h) — broadcast
16. **P3-08** (8h) — export PDF

---

## 12. Cross-Cutting Concerns

### 12.1 Design tokens (no change unless approved)
- Color OKLCH sudah ada di `packages/ui/src/tokens.css` (indigo `#4f46e5` accent + cyan `#06b6d4`)
- Font: Plus Jakarta Sans (body) + Sora (display/number)
- Spacing scale: 4/8/12/16/24/32/48/64
- Motion: 200ms (micro) / 320ms (macro) / cubic-bezier(0.16,1,0.3,1) (ease-out emphasis)
- Radius: 8/12/16/24

### 12.2 Reusable components dari admin (reuse, jangan duplikasi)
- `NumberFlow.svelte` (P2-13) → count-up total bayar
- `ConfirmDialog.svelte` (P0-05) → refund, regenerate API key, restore backup
- `FilterDropdown.svelte` (P2-06) → kalau filter chips jadi banyak
- `Sheet.svelte` (admin) → FAB quick actions, ticket reply
- `Chart.svelte` (P2-01) → sparkline pesanan, balance trend
- `LiveDot.svelte` (akan dibuat di UX2) → SSE pulse

### 12.3 A11y non-negotiable (semua phase)
- Heading hierarchy h1 → h2 → h3 (no skip)
- Form labels (visible atau aria-label)
- Focus-visible ring 2px cyan-500 (atau accent-500) di semua interactive
- Color contrast AA 4.5:1 minimum
- Reduced-motion respected untuk semua animasi baru
- Touch target ≥ 44×44px di mobile
- Skip link "Skip to main content" di semua layout

### 12.4 Performance budget (no regression)
- Initial JS bundle: < 200KB gzipped (saat ini 32KB shared + 200KB lazy)
- CSS: route CSS < 4KB inline, shared external
- LCP mobile < 2.5s
- INP < 200ms
- Lighthouse mobile ≥ 90 untuk halaman publik, ≥ 85 untuk admin authenticated

---

## 13. Verifikasi Cross-Phase (AGENTS.md §7)

Setiap phase **WAJIB** lulus sebelum bilang selesai:

1. ✅ `pnpm --filter app lint` — 0 error
2. ✅ `pnpm --filter app typecheck` (`svelte-check`) — 0 error
3. ✅ `pnpm --filter app test` (Vitest) — kalau ada test
4. ✅ `pnpm --filter app build` — sukses
5. ✅ Manual test `pnpm dev`:
   - Desktop 1440×1000 — page discan via Playwright
   - Mobile 390×844 — viewport emulation
   - Semua interaksi kerja (click, hover, focus, swipe)
6. ✅ A11y audit (axe-core via `app/static/axe.min.js` — sudah ada)
7. ✅ Lighthouse mobile ≥ 90 (user pages) / ≥ 85 (admin authenticated)
8. ✅ Screenshot before/after di `docs/audit/dashboard/{desktop,mobile}/`
9. ✅ Update checklist di file ini (mark `[x]`) + `docs/IMPLEMENTATION_CHECKLIST.md`
10. ✅ Commit message format: `fix(UX{N}): {item} — {deskripsi}` atau `feat(P3-N): {item} — {deskripsi}`
11. ✅ **Tunggu approval user** sebelum lanjut ke phase berikutnya

---

## 14. Anti-pattern Audit (looks-expensive 8 rules)

Setiap phase wajib cek 8 anti-pattern dari `docs/DESIGN.md` §B.8:

| # | Anti-pattern | Cek |
|---|---|---|
| 1 | Bullet budget (max 5) | List di copy — jangan ada bullet lebih dari 5 |
| 2 | Eyebrow pill (max 1) | Tiap section cuma boleh 1 eyebrow pill |
| 3 | Card chrome (max 2 default) | Tiap halaman max 2 card dengan border+bg, sisanya variance |
| 4 | 3-tier pricing generik | Kalau ada pricing comparison, pakai table bukan card |
| 5 | **4-col stat strip** | Replace dengan inline narrative + sparkline |
| 6 | No imagery | Pakai `<img>` real untuk avatar, banner, illustration |
| 7 | Container identik (≥3 pola) | Tiap halaman harus ada ≥3 containment pattern berbeda |
| 8 | Inter default | Plus Jakarta Sans (body) + Sora (display) — bukan Inter |

---

## 15. Tracking Checklist (centang tiap selesai)

### UX1 — Mobile Dock + FAB [ ]
- [ ] Dock items 5 (Beranda · Saldo · [FAB] · Pesanan · Akun)
- [ ] FAB center → Sheet quick actions
- [ ] A11y: aria-modal + focus trap + Escape close
- [ ] Lint + svelte-check pass
- [ ] Screenshot before/after saved
- [ ] Commit: `fix(UX1): mobile dock 5 items + FAB Pesan`

### UX2 — Beranda Refresh [ ]
- [ ] PromoBanner hide kalau empty, carousel kalau ada
- [ ] SaldoHero mobile compaction + collapsible insight
- [ ] Quick grid 2×2 (Pesan · Top Up · Layanan · Affiliate)
- [ ] LiveDot SSE pulse di Pesan Terbaru
- [ ] Lint + svelte-check pass
- [ ] Screenshot before/after saved
- [ ] Commit: `fix(UX2): beranda hero compaction + quick grid 2x2`

### UX3 — Pesan Form [ ]
- [ ] Mobile bottom-CTA pinned (di atas dock)
- [ ] Desktop 2-column form
- [ ] Real-time validation (link pattern + qty range)
- [ ] NumberFlow count-up total bayar
- [ ] Lint + svelte-check pass
- [ ] Screenshot before/after saved
- [ ] Commit: `fix(UX3): pesan form mobile CTA + desktop 2-col`

### UX4 — Pesanan [ ]
- [ ] Inline-stat narrative replaces 4-col strip
- [ ] Variance per status (pending pulse, proses rotate, selesai calm, partial progress, error destructive)
- [ ] Swipe-left "Pesan Lagi" mobile + 3-dot menu desktop
- [ ] SSE live banner + pause on hidden tab
- [ ] Lint + svelte-check pass
- [ ] Screenshot before/after saved
- [ ] Commit: `fix(UX4): pesanan inline-stat + status variance + SSE pulse`

### UX5 — Akun Refactor [ ]
- [ ] 3 containment patterns (hero tinted + ledger rows + quick chips)
- [ ] API Key mask + reveal toggle + Salin + Regenerate ConfirmDialog
- [ ] Tema switch accessible + persisted
- [ ] Logout ConfirmDialog fokus trap
- [ ] Lint + svelte-check pass
- [ ] Screenshot before/after saved
- [ ] Commit: `fix(UX5): akun refactor variance + API key mask`

### UX6 — Copy + A11y Polish [ ]
- [ ] No banned word (grep clean)
- [ ] Heading hierarchy valid (axe pass)
- [ ] Color contrast AA verified (axe pass)
- [ ] Form labels di semua input
- [ ] Skip link "Skip to content" di layout
- [ ] Truncated text punya title tooltip
- [ ] Commit: `fix(UX6): copy + a11y polish pass`

### P3-01 — RBAC [ ]
- [ ] 4 role (super_admin / admin / operator / finance)
- [ ] Permission matrix di rbac.ts
- [ ] Hook guard + 403 page
- [ ] Role badge di header admin
- [ ] Audit log role change
- [ ] Manual test: Operator akses /admin/deposits → 403
- [ ] Commit: `feat(P3-01): RBAC with 4 roles + permission matrix`

### P3-02 — 2FA TOTP [ ]
- [ ] Setup wizard 3-step (Scan · Verify · Backup)
- [ ] Login verify page
- [ ] Backup codes + recovery
- [ ] Disable butuh password + backup
- [ ] Manual test: logout → login with TOTP
- [ ] Commit: `feat(P3-02): 2FA TOTP mandatory for admin`

### P3-03 — Refund Workflow [ ]
- [ ] refund_requests table
- [ ] Auto-approve < Rp50k
- [ ] Dual approval ≥ Rp50k
- [ ] Pending list di admin dashboard
- [ ] Execute + audit + balance update
- [ ] Manual test: Admin A request Rp100k → Admin B approve
- [ ] Commit: `feat(P3-03): refund workflow with dual approval`

### P3-04 — Deposit Verify [ ]
- [ ] Upload bukti transfer (R2)
- [ ] Verify queue di admin
- [ ] Auto-match Tripay/Midtrans nominal
- [ ] Manual verify + reject + notes
- [ ] Commit: `feat(P3-04): deposit verify with proof upload`

### P3-05 — Order Manual [ ]
- [ ] is_manual + manual_notes di orders
- [ ] Toggle di order create form
- [ ] Status manual → done (skip provider)
- [ ] Audit log manual_order_created
- [ ] Commit: `feat(P3-05): manual order for custom service`

### P3-06 — Broadcast [ ]
- [ ] broadcast_campaigns table
- [ ] Composer 3-step (Segment · Content · Send)
- [ ] In-app + web push dispatch
- [ ] History list dengan sent_count
- [ ] Commit: `feat(P3-06): broadcast notification admin → user segment`

### P3-07 — Backup UI [ ]
- [ ] backup_jobs table
- [ ] On-demand backup + R2 upload
- [ ] Daily auto-backup cron
- [ ] Restore with ConfirmDialog
- [ ] 30-day retention auto-delete
- [ ] Commit: `feat(P3-07): backup management UI with R2 + cron`

### P3-08 — Export PDF [ ]
- [ ] Orders PDF (invoice layout)
- [ ] Deposits PDF (report layout)
- [ ] Reporting PDF (chart + table)
- [ ] Date range + filter options
- [ ] Commit: `feat(P3-08): export PDF for orders/deposits/reporting`

### P3-09 — Realtime Activity Feed [ ]
- [ ] SSE endpoint /api/admin/events
- [ ] Event bus in-memory
- [ ] ActivityFeed widget di dashboard
- [ ] Filter by type + reconnect
- [ ] Commit: `feat(P3-09): realtime activity feed via SSE`

### P3-10 — Health Dashboard [ ]
- [ ] Cron health widget
- [ ] Queue depth widget
- [ ] Provider health widget
- [ ] DB size widget
- [ ] Auto-refresh 30s + pause on hidden
- [ ] Commit: `feat(P3-10): system health dashboard (cron+queue+provider+db)`

---

## 16. Reference

- `docs/DESIGN.md` — palette OKLCH, type, motion, containment variance
- `docs/MOBILE_UX_GUIDE.md` — per-screen spec (M1.5)
- `docs/ADMIN_GAP.md` — 30 gap (G1-G30) yang jadi source P3
- `docs/planadmin.md` — P0-P2 done (✅), P3 carryover (10 item)
- `docs/audit/admin-screenshots/` — screenshot audit admin sebelumnya (referensi)
- `docs/audit/dashboard/{desktop,mobile}/` — screenshot audit user (16 file)
- `app/src/routes/(app)/+page.svelte` — Beranda source (759 LOC)
- `app/src/routes/(app)/pesan/+page.svelte` — Pesan source (595 LOC)
- `app/src/routes/(app)/pesanan/+page.svelte` — Pesanan source (546 LOC)
- AGENTS.md §7 — verifikasi per-modul
- AGENTS.md §B.8 — 8 anti-pattern `looks-expensive`

---

**Status**: 📋 Plan siap ditinjau user. Tunggu approval per-phase sebelum eksekusi. Update checklist tiap commit.
