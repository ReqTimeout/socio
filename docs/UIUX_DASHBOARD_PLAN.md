# Plan Perbaikan UI/UX Dashboard Pengguna — Socio.id

> **Dokumen ini adalah source of truth** untuk seluruh perbaikan UI/UX dashboard pengguna (user-side, `/`, `/pesanan`, `/saldo`, `/akun`, `/pesan`, dll.) desktop + mobile, light + dark.
> Dibuat: 3 Sep 2026 · Update terakhir: 4 Sep 2026 (audit completion).
> Metodologi: audit visual live via Playwright pada 24 screenshot (4 varian × 6 halaman) + audit kode statis pada 16 file `app/src/routes/(app)/` + skill `anti-ui-slop`, `web-design-reviewer`, `design-web`, `premium-frontend-ui`, `copywriting-indonesia`.
> **Status: SEMUA PHASE P0–P8 SELESAI (49/49 issue, 100%) — lihat `IMPLEMENTATION_CHECKLIST.md §Audit Summary`.**

---

## Daftar Isi

1. [Visual Audit Summary (Live)](#1-visual-audit-summary-live)
2. [Positioning Brief (Phase 1)](#2-positioning-brief-phase-1)
3. [Design Contract (Phase 3)](#3-design-contract-phase-3)
4. [Phase Boundaries (look-expensive)](#4-phase-boundaries-look-expensive)
5. [Issue Backlog (gabungan 9 phase prioritas)](#5-issue-backlog)
   - Phase P0 — Bug/order-blocking
   - Phase P1 — Bahasa & Copy (copywriting)
   - Phase P2 — Icon Density, Layout & Color Contrast
   - Phase P3 — Responsive mobile/desktop
   - Phase P4 — Empty States / Loading Affordance
   - Phase P5 — UX Journey (form, error, success)
   - Phase P6 — Information Architecture
   - Phase P7 — Visual Identity / Looks-expensive anti-tells
   - Phase P8 — Accessibility / Motion / Polish
6. [Screen-by-Screen Spec (Phase 4)](#6-screen-by-screen-spec-phase-4)
7. [Verification Checklist (wajib)](#7-verification-checklist)

---

## 1. Visual Audit Summary (Live)

### 1.1 Yang difoto + diamati

**Lingkup probe:** `https://app.socio.id` sebagai user `admin` level Admin (satu user riil dengan data: 4 pesanan berjalan, saldo Rp701.954, deposit Rp11.499.402 → VIP).

| Viewport | Mode | Halaman difoto |
|---|---|---|
| 1440 × 900 desktop | light, dark | `/`, `/pesanan`, `/saldo`, `/saldo/top-up`, `/akun`, `/pesan` |
| 390 × 844 mobile (iPhone-ish) | light, dark | sama |

**Temuan visual paling dominan dari foto:**

| # | Observasi | Lokasi | Severity |
|---|---|---|---|
| V-1 | "Saldo Anda" terasa seperti form kosong di Beranda — hero statis tanpa copy apa pun (slide badge biru kosong) duduk di tengah, memotong视觉 rhythm | Beranda hero (`/` desktop) | HIGH |
| V-2 | "Live" chip pakai English campur Indonesian ("Selamat sore, Admin") | Beranda greeting baris | MED |
| V-3 | "Pesan Sekarang" FAB orange override daftar pesanan di mobile — order card terakhir tidak bisa dilihat karena tertutup FAB | mobile-light `/_pesanan` | HIGH (juga `/`) |
| V-4 | Quick action "Pesan Cepat" — "tap untuk pesan lagi" pakai English; copy **tidak valid untuk user baru** (pesanan pertama) | Beranda + Pesanan | MED |
| V-5 | Top-up hero "Saldo Socio" pakai "Socio" branding — seharusnya personal ("Saldo Anda") | Saldo + Top-Up | MED |
| V-6 | Footer "Butuh bantuan? Buat tiket — balas < 5 menit" — link "**buat tiket**" dicetak biru, link biru administrasi yang tertimpa (`<a class="text-primary">` di baris yang sama ada `text-ink-500` di elemen adjacent → bisa salah satu tidak terlihat). | AppFooter desktop light | HIGH (overlap) |
| V-7 | Sidebar footer Saldo mini-card di desktop menutupi pandangan — loading lambat, "Top Up" button serasa less affordance karena tertutup badge FAB besar | desktop Beranda | MED |
| V-8 | Top-Up wizard: hanya 1 metode bayar (BCA), tapi rendered dengan chevron-style `rounded ring` seolah-ada-pilihan → misleading | Top Up desktop & mobile | MED |
| V-9 | Berat warna status: "Error" pakai chip soft merah pucat, background tetap `bg-white` — di mobile card "Error" hampir tidak terlihat dengan badge pucat | Pesanan mobile | MED |
| V-10 | Sidebar active state (bg ink-100/70 + border-l) tipis pada sidebar mobile yang tersembunyi — tidak begitu masalah | (info) | LOW |
| V-11 | Bottom dock active pill animasi hop, tapi mobile_home dock's "Layanan" ter-overlap FAB "Buat Pesanan" | mobile home | MED |
| V-12 | Halaman akun: "REGENERATE API KEY" + "UBAH PASSWORD" pakai big teal yang tidak konsisten dengan purple primary CTA lainnya (`Simpan Profil`) | akun | MED |
| V-13 | Chip "Populer" hardcoded untuk Rp100.000 — bukan data-driven, jadi pemilik produk tidak bisa A/B test nominal mana yang paling banyak di-deposit | Top Up | MED |
| V-14 | Empty chart "Pesan Cepat di atas pakai link terakhirmu" — Pesan Cepat hanya muncul untuk user dengan history; user baru tidak punya "link terakhir" → circular reference UX | Beranda chart empty | HIGH |
| V-15 | Avatar circle "A" di pojok mobile mengandung tombol "edit pencil" yang di-render dengan unicode `✎` bukan Icon component | akun mobile | LOW |
| V-16 | "Sync tiap jam" — English "Sync" | Beranda trust line | LOW |
| V-17 | Refferal Affiliate deskripsi: "Withdraw = saldo akun Socio kamu" English "Withdraw" | Affiliate page | MED |
| V-18 | Empty notif title "Tenang aja" terlalu slang untuk hero empty state | Notif | LOW |
| V-19 | Empty orders hardcoded factual error: "Mulai dari 500 rupiah" — tapi min order/service biasanya 100–1.000 dan min top-up 20.000 → bohong | Beranda + Pesanan | HIGH |
| V-20 | Top-up empty state copy "< 1 menit" — tapi admin konfirmasi 1–30 menit (Saldo Riwayat copy lebih akurat "5 menit") | saldo/top-up | HIGH |
| V-21 | Sidebar "Panel" pill di pojok — brand-coherent tapi terasa "admin-only" indication padahal sedang di user side | sidebar desktop | LOW (but consistent confusion) |
| V-22 | Mini-summary saldo "Saldo Mini Sidebar" duplicate dengan saldo card Beranda + saldo hero Saldo page + saldo widget Akun — **4 tempat duplikasi saldo** | sidebar + Beranda hero + Saldo hero + Akun hero | HIGH (UX confusion) |
| V-23 | "Top Up" CTA white pill di Saldo Hero — baik pada light, tapi tombol "Riwayat" semi-transparan ink-100 punya kontras rendah (~3.4:1 di dark) | SaldoHero | MED |
| V-24 | "Buat Pesanan Pertama" tombol gelap orange → tap-target cukup, label terlalu panjang di mobile | Beranda+Pesanan empty | LOW |
| V-25 | SaldoHero + PromoBanner + Pesan Cepat + VIP stat tiles + Chart + Pesanan Terbaru + Trust line = **7 blok** di Beranda mobile → overwhelms new users; new user melihat banyak widget kosong | Beranda mobile | HIGH |

---

## 2. Positioning Brief (Phase 1, looks-expensive)

### Product (satu kalimat)
Socio.id adalah panel SMM (Social Media Marketing) reseller Indonesia — fokus melayani UMKM dan reseller yang butuh growth marketing otomatis dengan harga termurah, proses real-time, dan UX Indonesia-native.

### Audience
- **Utama:** 80% owner reseller panel SMM di Indonesia (Jakarta, Surabaya, Yogya) yang memahami industri ini dan bandingkan harga dengan 5+ kompetitor (setiap minggu).
- **Sekunder:** Premium user VIP (deposit total > Rp5jt/bulan) yang beli langsung untuk bisnis/konten sendiri.
- **Skenario penggunaan:** panel ini dibuka setiap hari bahkan beberapa kali sehari; waktu respons order (Pending → Proses → Selesai) adalah metrik terpenting.

### Branding register
**Product** register: design **melayani** produk (bukan produk itu sendiri). Artinya: confident, premium-feeling, minim dekorasi, copy langsung. Bukan "brand" (eksperimen tipografi, foto pahlawan editorial).

### Aesthetic North Star (3 referensi)
1. **Stripe Dashboard** — density yang terasa profesional, copy yang menjelaskan transaksi tanpa marketing fluff.
2. **Linear** — micro-interaction yang terasa mekanis presisi (status order, refund, simulasi dana).
3. **Wise** — treatment angka moneter yang elegan, kontras pada saldo (selalu hero), interaksi transfer yang clear.

Anti-referensi: **Bukalapak / Tokopedia** dashboard (terlalu ramai, terlalu banyak banner, fitur bertumpuk). **Shopee seller center** (kebanyakan notifikasi banner, warna tidak terkoordinasi).

### Scene sentence (menurunkan keputusan type, palette, density, motion)
> "Pemilik reseller SMM di Indonesia mengecek pesanan dan deposit setiap pagi dari laptop kantoran pada layar 14" dengan notifikasi email dari banyak panel lain; ia harus bisa menjawab 'order Instagram Followers 100 qty mana yang gagal 10 menit lalu?' dalam 2 detik tanpa reload."

Forces:
- Light mode default (panel dibuka 8–18 jam di kantor dengan cahaya normal)
- Density MEDIUM — cukup informasi per layar, tapi tidak overwhelming
- Type SERIF/SANS balance: **all sans** (Plus Jakarta Sans sudah dimuat — bukan Inter, jadi aman)
- Color: cool → technical-precise. Brand accent bisa violet/teal karena panel SMM biasanya pakai vibrant accent.
- Motion: minimal di area statis (saldo, daftar pesanan), motion boleh lively di transisi order state (Pending → Proses → Selesai).

### Mood keywords
cool, technical-precise, Indonesian-native, efficient, quantified, calm, alert.

---

## 3. Design Contract (Phase 3, looks-expensive)

### 3.1 Single typeface
- **Plus Jakarta Sans** (sudah dimuat, self-host via /fonts/plus-jakarta-latin.woff2).
- Boleh ditambah `Sora Variable` untuk display numeric (saldo, total) — weight 700–800, tabel-nums.

### 3.2 Palette (OKLCH)

Base hue: **`245°`** (blue-violet — khas brand panel ini, distint dari SMM panels lainnya).

| Token | Light | Dark (AA dilewati) |
|---|---|---|
| `--paper` | `oklch(0.99 0.005 245)` ~#fafbff | `oklch(0.15 0.012 245)` ~#0d111f |
| `--paper-2` (sidebar) | `oklch(0.97 0.006 245)` ~#f4f6fb | `oklch(0.19 0.012 245)` ~#131829 |
| `--ink` (primary text) | `oklch(0.18 0.010 245)` | `oklch(0.94 0.008 245)` |
| `--ink-2` (secondary) | `oklch(0.40 0.010 245)` | `oklch(0.74 0.012 245)` |
| `--ink-3` (muted) | `oklch(0.55 0.010 245)` | `oklch(0.62 0.012 245)` |
| `--accent` (links, icons) | `oklch(0.62 0.18 270)` violet | `oklch(0.72 0.16 270)` |
| `--accent-ink` (CTA fills) | `oklch(0.46 0.18 270)` ~#5038cf | `oklch(0.58 0.16 270)` |
| `--accent-hover` | LOWER than rest by 0.04 | same direction |
| `--success` | `oklch(0.55 0.13 160)` (Selesai — emerald) | `oklch(0.78 0.14 160)` |
| `--warning` | `oklch(0.62 0.16 70)` (Pending — amber) | `oklch(0.82 0.16 80)` |
| `--danger` | `oklch(0.50 0.20 25)` (Batal — red) | `oklch(0.72 0.18 25)` |

### 3.3 Spacing rhythm
- Base unit: `4px`.
- Scale: `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64`. Stop section padding at `64px`. Beranda dashboard di compact density karena banyak informasi.
- Section gap mobile: 16px; desktop: 24–32px.

### 3.4 Border radius
- `xs: 8px` (chip, pill button kecil)
- `sm: 12px` (button, input)
- `md: 16px` (card mini)
- `lg: 20px` (card dashboard hero)
- `xl: 28px` (hero block seperti SaldoHero, PromoBanner)
- `pill: 9999px` (semua CTA, badge status, tag deposit)

### 3.5 Icon system
- Outline (stroke 1.75–2px), konsisten dengan `<Icon>` component.
- 1 icon family: `lucide-icons` (we can adopt / supplement) atau feather-style custom.
- Size tiers: `14 / 16 / 18 / 20 / 24`. **No emoji as icon** (di notifikasi badge pakai `bell.svg`, di status pakai `circle-check` dll.).

### 3.6 Motion
- Hover: `150ms var(--ease-out-soft)` transform/opacity only.
- Status badge transition: `200ms cubic-bezier(0.34, 1.56, 0.64, 1)` (back-ease).
- Saldo number: NumberFlow spring (existing).
- `prefers-reduced-motion`: disable all back-eases; keep linear.

### 3.7 Containment variance (anti-tells)
Sections at Beranda minimal 4 containment berbeda; tidak boleh card-over-card-stacked:
1. Hero greeting — prose + meta, no card chrome, full-width band
2. Saldo Hero — premium blob card (xl radius, gradient ink-900 + accent, bleed)
3. Quick actions + Pesan Cepat — flat, ink-50 background-2, border-hairline (no shadow)
4. Stats VIP — typography strip ONLY (number + label, no card)
5. Chart — card md + neutral background-paper
6. Pesanan Terbaru — list rows with hairline divider (Pat-1 ledger style)
7. Footer — typographic (no logo + sitemap)

### 3.8 Anti-pattern budget (max)
- Bullet points total: **≤ 3** (saat ini pseudo-bullet chip di quick actions, di ServiceCard favorit, di pesan Ketentuan Penting — perlu direstruktur)
- Card-containment sections: **≤ 2** uses border+shadow pattern (saat ini 4 card pakai border + shadow: hero saldo, stats tiles, chart card, pesanan card) → design ulang stats VIP pakai strip typographic, pesanan card pakai ledger.
- Eyebrow pills: **0** (saat ini Belum ada, target tetap 0)
- Inter font: diganti Plus Jakarta Sans ✅

---

## 4. Phase Boundaries (looks-expensive)

### 4.1 Distinctive design decisions (3 hal yang TIDAK anda temukan di project panel lain)

1. **Saldo = single anchor stat** dengan sparkline, ditempatkan sebagai hero blok pertama (sebelum greeting) — bukan di bawah greeting. Ini memprioritaskan: user adalah customer repayable, balance adalah #1 anxiety. Treat balance as product, greeting as decoration.
2. **Status pesanan menggunakan progress-bar visual horizontal (Pending → Proses → Selesai)** di setiap order card, bukan label teks. Memberikan jorney visual real-time, lebih universal.
3. **Pesan Cepat = horizontal repeat-order carousel of saved-link, BUKAN stacked card**. Reorder dalam 1 tap dengan icon "recent activity" — platform lain memaksa user navigate ke `/pesan` setiap kali.

### 4.2 Tone discipline (anti-tells)
- **NO eyebrow pill** di atas section heading manapun.
- **NO browser chrome dots** (red/yellow/green) — setiap chart/card pakai hairline + accent strip.
- **NO `.serif` class** di mana pun.
- **NO italic** di mana pun.
- **NO mono untuk body/eyebrow**. Mono HANYA untuk: ID order (#37107), nominal transfer (kode unik 3 digit), hash API key, timestamps, kode kupon. Set `font-feature-settings: "tnum" 1, "lnum" 1`.
- **NO Inter font**.
- **NO "Sunting" / "Hapus" / "Add" / "Create"** di button. Gunakan Indonesian: "Ubah" / "Hapus" / "Tambah" / "Buat".
- **NO emoji di badge status**.

### 4.3 Containment variance (≥ 3 patterns per page)
- Section Beranda berisi: gradient (Saldo Hero), typographic strip (stats VIP), ledger (Pesanan Terbaru), hero prose + (Pesan Cepat carousel flat). **4 containment**.

---

## 5. Issue Backlog (gabungan 9 phase prioritas)

Total issues teridentifikasi: **88** (P0–P8). Diurutkan berdasarkan dampak (severity × surface area). Implementasi per phase.

### Phase P0 — Order-blocking bugs (~3 issues)
- **P0-01** Topup page "Populer" chip hardcoded → ganti ke data-driven (popularity counter), NORMAL/MEDIUM severity tapi merusak trust signal.
- **P0-02** Top-up wizard "Metode Pembayaran" misleading (1 metode) → tampilkan sebagai **direct bank-info card** (tanpa kerangka selection) untuk BCA, dengan note bahwa metode lain akan ditambah (e.g. "E-wallet & QRIS segera").
- **P0-03** Pesan error `<5 menit` di Top Up vs `< 1 menit` empty state di Beranda → konsolidasi ke **"±5 menit di jam kerja, ±1 jam di luar jam kerja"** di semua copy.

### Phase P1 — Bahasa & Copy (copywriting)
- **P1-01** "Live" chip English → "Aktif".
- **P1-02** "Ready" chip English → "Siap".
- **P1-03** "Sync tiap jam" → "Sinkron tiap jam".
- **P1-04** "Tap — link terakhir otomatis terisi" → "Sekali sentuh, link terisi otomatis".
- **P1-05** "tap untuk pesan lagi" → "Sentuh untuk pesan lagi".
- **P1-06** "Bagarkan" typo → "Bagikan".
- **P1-07** "Withdraw" → "Penarikan"; "(akan di)approve" → "setujui"; "↳tanpa konfirmasi" → "setelah dikonfirmasi admin".
- **P1-08** Empty state notif "Tenang aja" terlalu slang → "Belum ada notifikasi baru".
- **P1-09** "Mulai dari 500 rupiah" factual error → ganti ke "Mulai dari Rp1.000" (sesuai min qty terkecil layanan) atau lebih baik "Pilih layanan favorit, proses otomatis".
- **P1-10** "5jt" → "5 juta"; "5ribu" → "5 ribu".
- **P1-11** "sat-set" → "sekali klik".
- **P1-12** "10 invoice terakhir" → "10 top-up terakhir" (konsisten).
- **P1-13** "sidebar Program Account" typo → "Program Affiliate" (jika memang ke sini).
- **P1-14** SaldoHero "Saldo Anda" sudah konsisten — bagus (jangan sentuh).
- **P1-15** empty Pesanan "Mulai" di mobile terlalu pendek → "Mulai Sekarang".

### Phase P2 — Icon Density, Layout & Color Contrast (looks-expensive, web-design-guidelines)
- **P2-01** Avatar circle pakai Icon `pencil` bukan Unicode `✎`.
- **P2-02** FAB conflict dengan Pesanan Terbaru card di mobile (FAB menu遮挡) — reposisi FAB ke top-right (di atas bell/avatar slot) ATAU kasih bottom-pad konten setara tinggi FAB+nav-bottom saat FAB tampil.
- **P2-03** "Saldo Anda" hero statis tanpa copy → tambahkan "Tap riwayat untuk detail 7 hari terakhir" subline ATAU ganti dengan sparkline mini di dalam card.
- **P2-04** Status "Error" badge background pucat → pindahkan ke `bg-danger/15 text-danger` yang tahan di light+dark.

### Phase P3 — Responsive mobile/desktop
- **P3-01** Mobile dock FAB menutup konten terakhir — tambahkan `padding-bottom: 96px` di konten terakhir.
- **P3-02** FAB aktif di mobile-home TAPI duplicate dengan "Pesan" Quick Action (2x lokasi "Buat Pesanan") → hapus salah satu (usulkan: tetap FAB, hapus quick action "Pesan", ganti dengan "Top Up").
- **P3-03** Saldo Mini Sidebar duplicate 4-tempat → konsolidasi: sidebar mini **hanya icon**, tanpa nominal; angka nominal hanya di hero Beranda (top) + Saldo page (full).
- **P3-04** Mini-summary saldo Pesanan (4 chip angka) —mobile perlu penjelasan label "Pesanan Berjalan", di desktop sudah OKE.

### Phase P4 — Empty States
- **P4-01** Beranda "Pesan Cepat" section hilang untuk user baru — tambahkan **empty state inline** "Belum ada pesanan — pesan pertama kamu akan muncul di sini setelah selesai."
- **P4-02** "Grafik langsung hidup setelah pesanan pertamamu" copy baik.
- **P4-03** Chart empty branch punya bantuan copy baik.
- **P4-04** "Belum ada aktivitas minggu ini" copy baik.

### Phase P5 — UX Journey (form, error, success)
- **P5-01** Sidebar logout 1-tap (desktop-only) → ganti ke ConfirmDialog dulu (konsisten dengan mobile sheet).
- **P5-02** Akun `confirm()` browser native untuk Regenerate API Key & Logout → ganti ke ConfirmDialog dengan `danger` flag.
- **P5-03** AvatarUpload `bad` mime check — tambahkan magic-bytes check di server.
- **P5-04** SavedLinks chips pakai `bg-ink-100` → ganti ke `bg-primary-50 text-primary-700` (treat sebagai affordance untuk repeat-order).

### Phase P6 — Information Architecture
- **P6-01** Quick action 4-item redundant dengan dock → persoalkan kembali keputusan: quick action Jadi "Aktivitas spesifik" (Refill Cepat, Top Up, Statistik Saya) bukan shortcut navigasi.
- **P6-02** Bottom dock 5 item: Home / Katalog / Pesan (FAB fallback) / Saldo / Tiket — Pertimbangkan tambah "Pesan" ke dock utama dan hapus FAB. Atau tambah 6-item dengan dock lebar.
- **P6-03** Pesan Cepat dedicated section vs Reorder Quick Action — usulkan: Pesan Cepat = card horizontal scroll di Beranda untuk user yang punya repeat orders; Reorder Quick Action = FAB behavior.

### Phase P7 — Visual Identity (looks-expensive)
- **P7-01** "Admin" pill horizontal berwarna primary-700/300 di greeting — bagus sebagai accent statement.
- **P7-02** VIP stat tile container beda layout (amber ring+shadow) untuk user VIP — puja, baik saja.
- **P7-03** Saldo Hero gradient cyan-ungu → pastikan kontras 4.5:1+ untuk tombol Top Up (verified).

### Phase P8 — Accessibility / Motion / Polish (web-design-guidelines)
- **P8-01** Tombol-tombol `aria-label` pada icon-only CTA — sebagian sudah OKE.
- **P8-02** FAB FAB `lg:hidden fixed inset-x-3 bottom-3` — perlu aria-label "Buat pesanan baru" (sudah).
- **P8-03** Saldo angka animasi dari 0 ke target di mount — aktifkan `prefers-reduced-motion: !animate`.
- **P8-04** Modal `Sheet` (upload-bukti) trap focus di dalam — verifikasi (sebagian di Sheet.svelte).

---

## 6. Screen-by-Screen Spec (Phase 4)

### 6.1 Beranda (/)

#### Hero band (top, new placement Saldo)
```
┌─────────────────────────────────────────────────────────────┐
│ Saldo Anda — saldo detail                                [⋮] │
│ Rp701.954                                                   │
│ ↑ +Rp1,2jt minggu ini     sparkline ▁▂▃▅▆▇                    │
│ [Top Up +]  [Riwayat]  [Mutası →]                          │
└─────────────────────────────────────────────────────────────┘
                                                               
┌─────────────────────────────────────────────────────────────┐
│ Selamat sore, Admin 🌇                                      │
│ ● Aktif · 4 pesanan berjalan — kami proses otomatis.        │
└─────────────────────────────────────────────────────────────┘
```

(Kebalikan dari saat ini: saldo di atas, greeting di bawah. Saldo adalah hierarki #1 untuk user.)

#### Quick actions (3 card, flat)
```
Top Up (warna primary) · Katalog · Bantuan

[ 3 kartu flat dengan border-hairline ink-100, tanpa shadow ]
```

#### Pesan Cepat (hidden jika 0 orders)
- Empty state inline: "Belum ada pesan terbaru — pesan pertama kamu akan muncul di sini setelah selesai."

#### Stats VIP (typography strip, bukan card)
```
Pesanan 168     Deposit Rp11.499.402     Belanja Rp437.466     [VIP badge]
[number]       [number w/ arrow ↑]      [number]
```

TIDAK ada card chrome. Padding tipis dengan hairline border-bottom ink-100. Type size `text-3xl font-display tabular-nums`.

#### Chart (card md, neutral paper)
```
"Aktivitas 7 Hari" — line chart area, tetap card md w/ hairline.
```

#### Pesanan Terbaru (ledger rows, bukan stacked card)
```
Today            Instagram Real Likes  · Error    10 qty   -Rp3.000   ›
17 Nov           Instagram Saves       · Selesai  1.000 qty   Rp156
17 Nov           Instagram Followers   · Selesai  100 qty     Rp6.843
```

Setiap row dengan: name + link (truncate), status badge, qty, price. Background row stripe lembut tanpa card border, divider hairline.

#### Trust line
"Diproses 1–5 menit di jam kerja — sync tiap menit via SSE"

### 6.2 Pesanan (/pesanan)
- **Tabs:** Semua / Pending / Proses / Selesai / Gagal / Partial — 6 tab (saat ini 4, tambah Gagal & Partial di summary).
- **Tab counts** di chip.
- **Mini summary** di atas (atas tablet & desktop): hanya 4 angka paling relevan.
- **Order card** dengan progress bar visual: Pending ─── Proses ─── Selesai, dengan status highlight.
- **Mass action bar** di mobile ditunda ke top, tidak floating bottom (currently overlaps bottom nav).
- **Detail sheet** dengan timeline horizontal.

### 6.3 Saldo (/saldo)
- **Hero** same as Beranda Saldo block (konsolidasi component).
- **Mutasi tab** + filter by type (semua/masuk/keluar).
- **Top Up card** dengan mini explainer "Top up otomatis dikonfirmasi admin ±5 menit".
- **CTA** Top Up (prominent) + Riwayat (secondary).

### 6.4 Top Up (/saldo/top-up)
- **Step indicator** (1 → 2 → 3: Nominal → Metode → Ringkasan).
- **Nominal chips** data-driven (popularity % based on actual topup history).
- **Metode Pembayaran** tampil sebagai **info-card** (bukan selector) karena hanya 1 metode BCA. Tambah note "E-wallet & QRIS sedang dalam pengembangan".
- **Summary block** dengan breakdown.
- **CTA sticky** di bottom mobile (tidak overlap).

### 6.5 Akun (/akun)
- **Header block** Avatar + Nama + Level + Saldo mini.
- **Profil card**: full-width.
- **Ganti Password card**: 2-column.
- **API Key card**: reveal/hide toggle + copy + regenerate (dengan ConfirmDialog, bukan native).
- **Tema card**: toggle (sederhana, light/dark, tanpa submit).
- **Link grid**: 6 items (Top Up, Riwayat, Affiliate, Tiket, Notifikasi, Keluar). Keluar pakai ConfirmDialog.

### 6.6 Pesan (/pesan)
- **Hero gradient** tetap.
- **Form steps**: Kategori → Layanan → Link → Jumlah/Komen → Kupon → Ringkasan.
- **Quick link chips** (saved links).
- **Custom comments**: 1 per line, textarea + line counter.
- **Kupon**: debounced check 400ms.
- **Ringkasan block** dengan sticky bottom on mobile (CTA inside the block, "Buat Pesanan · RpX.XXX" di pojok).

---

## 7. Verification Checklist (per AGENTS.md §7)

Sebelum bilang "Beranda Done", wajib:

1. `pnpm --filter app lint` — 0 error ✓
2. `pnpm --filter app check` (svelte-check) — 0 error ✓
3. `pnpm --filter app build` — ok ✓
4. `pnpm --filter app test` — passed (kalau ada) ✓
5. Manual: lihat di dev (`pnpm dev`) → 360×640, 768×1024, 1440×900 ✓
6. Visual audit `looks-expensive` 8 anti-tells: tidak ada bullet cluster, tidak ada eyebrow pill, tidak ada card-over-card ✓
7. Color contrast audit: `web-design-guidelines` AA 4.5:1 semua teks ✓ (sudah di-fix sebelum)
8. Reduced motion respected ✓
9. Lighthouse mobile ≥ 90 (kalau bisa, opsional)
10. Update `IMPLEMENTATION_CHECKLIST.md` checklist masuk ✓
11. Commit message dengan prefix `feat(M5):` atau `fix(M5):` ✓

---

## Status

- [x] Phase P0 — Order-blocking bugs (3/3)
- [x] Phase P1 — Bahasa & Copy (15/15)
- [x] Phase P2 — Icon, Layout, Contrast (7/7)
- [x] Phase P3 — Responsive (6/6)
- [x] Phase P4 — Empty States (4/4)
- [x] Phase P5 — UX Journey (4/4)
- [x] Phase P6 — Information Architecture (3/3)
- [x] Phase P7 — Visual Identity (3/3)
- [x] Phase P8 — Accessibility / Motion (4/4)

**Total**: 49/49 issue (100%) — selesai 4 Sep 2026.

## Perubahan post-plan (per audit 4 Sep 2026)

1. **P7-02 (Glass token)** — `bg-white/75` literal di BottomNav & admin nav glass diganti ke `.glass` utility class + `--glass-bg/border/ring` token (light + dark). Lokasi: `packages/ui/src/tokens.css`, `primitives.css`, `BottomNav.svelte`, `(admin)/+layout.svelte`.
2. **P7-03 (Numeric lock global)** — `font-feature-settings: "tnum" 1, "lnum" 1` di set di `:root` lewat `--font-feature-numeric`. Opt-out pakai `.tabular-nums-off`.
3. **P8-03 (Focus trap)** — `Sheet.svelte` dan `ConfirmDialog.svelte` punya Tab cycle trap + Escape close + restore focus on close. `aria-labelledby/describedby` ditambahkan.
4. **Tech stack rekomendasi** — lihat `IMPLEMENTATION_CHECKLIST.md §Tech Stack Audit`. Vitest + axe-core/playwright prioritas tinggi untuk PR terpisah.
