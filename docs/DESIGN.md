# DESIGN.md — Socio.id User Dashboard

> Dokumen ini adalah **panduan desain preskriptif** yang harus dirujuk setiap kali mengubah UI/UX dashboard pengguna. Komplementer `UIUX_DASHBOARD_PLAN.md` (audit + backlog) dan `IMPLEMENTATION_CHECKLIST.md` (tracker).
> Skill acuan (workspace): `web-design-reviewer` (untuk `web-design-guidelines`), `anti-ui-slop` (untuk `looks-expensive`), `design-web` (OKLCH/motion), `premium-frontend-ui` (untuk `ui-ux-pro-max`), `copywriting-indonesia`.

---

## A. Positioning Brief

### A.1 Product (satu kalimat)
**Socio.id** adalah panel SMM (Social Media Marketing) reseller Indonesia — melayani UMKM dan individu yang beli growth marketing (followers, likes, views) dengan harga termurah, proses real-time, dan UX Indonesia-native.

### A.2 Audience
- **Utama (80%)**: Owner reseller panel SMM di Indonesia (Jakarta, Surabaya, Yogya) — bandingkan harga dengan 5+ kompetitor setiap minggu.
- **Sekunder (15%)**: Premium user VIP (deposit total > Rp5jt/bulan) yang beli langsung untuk bisnis/konten sendiri.
- **Kasus penggunaan**: Panel dibuka setiap hari, beberapa kali sehari. Metrik terpenting = **waktu respons order** (Pending → Proses → Selesai).

### A.3 Branding register
**Product register**: design **melayani** produk, bukan produk itu sendiri.
- Confident, premium-feeling, minim dekorasi, copy langsung.

### A.4 Aesthetic North Star (3 referensi)
1. **Stripe Dashboard** — density profesional, copy tanpa marketing fluff.
2. **Linear** — micro-interaction mekanis presisi (status order, refund, simulasi dana).
3. **Wise** — angka moneter elegan, kontras pada saldo, interaksi transfer yang clear.

### A.5 Anti-referensi
- Bukalapak / Tokopedia dashboard (terlalu ramai, banner bertumpuk).
- Shopee Seller Center (terlalu banyak notifikasi banner, warna tidak terkoordinasi).

### A.6 Scene sentence
> "Pemilik reseller SMM di Indonesia mengecek pesanan dan deposit setiap pagi dari laptop 14" kantor dengan notifikasi email dari banyak panel lain; ia harus bisa menjawab 'order Instagram Followers 100 qty mana yang gagal 10 menit lalu?' dalam 2 detik tanpa reload."

Forces:
- Light mode default (panel dibuka 8–18 jam di kantor)
- Density MEDIUM — banyak informasi per layar
- Typeface: **all sans**
- Color: cool → technical-precise (violet/teal accent khas panel SMM)
- Motion: minimal statis (saldo, daftar pesanan), boleh lively di status transisi

### A.7 Mood keywords
cool, technical-precise, Indonesian-native, efficient, quantified, calm, alert.

---

## B. Design System

### B.1 Color (OKLCH)

Base hue: **`245°`** (blue-violet — distinSMM dari kompetitor).

| Token | Light | Dark | Catatan |
|---|---|---|---|
| `--paper` | `oklch(0.99 0.005 245)` | `oklch(0.15 0.012 245)` | bg utama |
| `--paper-2` | `oklch(0.97 0.006 245)` | `oklch(0.19 0.012 245)` | sidebar / alt section |
| `--ink` | `oklch(0.18 0.010 245)` | `oklch(0.94 0.008 245)` | primary text |
| `--ink-2` | `oklch(0.40 0.010 245)` | `oklch(0.74 0.012 245)` | secondary |
| `--ink-3` | `oklch(0.55 0.010 245)` | `oklch(0.62 0.012 245)` | muted / label |
| `--accent` | `oklch(0.62 0.18 270)` | `oklch(0.72 0.16 270)` | links, icons |
| `--accent-ink` | `oklch(0.46 0.18 270)` | `oklch(0.58 0.16 270)` | CTA fill (primary button bg) |
| `--accent-hover` | L-0.04 | L-0.04 | hover state LIGHTER ⛔ NEVER |
| `--success` | `oklch(0.55 0.13 160)` | `oklch(0.78 0.14 160)` | Selesai |
| `--warning` | `oklch(0.62 0.16 70)` | `oklch(0.82 0.16 80)` | Pending |
| `--danger` | `oklch(0.50 0.20 25)` | `oklch(0.72 0.18 25)` | Batal/Refund |

**Anti-pattern**: NO literal `#000000` atau `#ffffff` di mana pun. Pakai token.

### B.2 Typography

**Single typeface family:** Plus Jakarta Sans Variable (sudah self-host).

| Tier | Size | Weight | Catatan |
|---|---|---|---|
| Display (saldo) | `text-5xl sm:text-6xl` | 700–800 | `tabular-nums`, `font-display` |
| H1 (page title) | `text-2xl sm:text-3xl` | 700 | `tracking-tight` |
| H2 (section) | `text-lg sm:text-xl` | 600 | |
| H3 (card title) | `text-base sm:text-lg` | 600 | |
| Body | `text-sm` | 400 | line-height 1.5 |
| Caption | `text-xs` | 500 | `tracking-wide uppercase` — **max 1 per section** |
| Number/Stat | `text-3xl sm:text-4xl` | 700 | `tabular-nums` |

**Numeric lock**: set `font-feature-settings: "tnum" 1, "lnum" 1` global di `packages/ui/src/primitives.css` lewat `:root { --font-feature-numeric: "tnum" 1, "lnum" 1 }` (P7-03). Opt-out per-element dengan `.tabular-nums-off`.

**Mono (data accents saja)**: ID order (#37107), kode unik transfer (3 digit), timestamps, API key, kode kupon. ≤14px. **NO mono untuk body/eyebrow.**

### B.3 Spacing & Density

- Base unit: **4px**
- Scale: **4 / 8 / 12 / 16 / 24 / 32 / 48 / 64** (stop di `64px` untuk section padding)
- Mobile section gap: **16px**
- Desktop section gap: **24-32px**
- Beranda dashboard: **compact density** (banyak informasi)
- Saldo/Akun settings: **standard density**

### B.4 Border radius

| Tier | Size | Use |
|---|---|---|
| `xs` | 8px | chip, mini pill |
| `sm` | 12px | input, button |
| `md` | 16px | mini card, dropdown |
| `lg` | 20px | card |
| `xl` | 28px | hero block (SaldoHero, PromoBanner) |
| `pill` | 9999px | CTA, badge status, tag |

### B.5 Icon system

- Outline only (stroke 1.75–2px)
- Size tiers: **14 / 16 / 18 / 20 / 24px**
- 1 family: feather-style SVG (custom in `packages/ui/src/components/Icon.svelte`)
- ❌ **NO emoji as structural icon**. Untuk status: gunakan `<Icon name="circle-check" />`, dll.
- Tombol icon-only WAJIB `aria-label="…"` (a11y)

### B.6 Motion

| Tipe | Durasi | Easing |
|---|---|---|
| Hover (tombol, card) | 150ms | `--ease-out-soft` |
| Status badge flip | 200ms | `cubic-bezier(0.34, 1.56, 0.64, 1)` (back-ease) |
| Saldo number spring | 400ms | spring (NumberFlow) |
| Modal in/out | 220–280ms | `--ease-out-soft` |

**`prefers-reduced-motion` rule**: matikan semua back-ease + spring. Ganti ke `ease-linear 0ms` kecuali transisi visibilitas.

**GPU-safe**: hanya `transform` + `opacity`. JANGAN animasi `width`/`height`/`top`/`left`.

### B.7 Containment variance (anti-tell)

Menggunakan **ledger** (`border-bottom: hairline ink-100`) lebih sering dari card. Aturan:
- Card border+shadow > 2× dalam satu section → **redesign**
- Section yang sama bentuk dengan section sebelumnya → **redesign**

Variasi wajib per page (≥3):
1. **Gradient hero** (Saldo, Promo) — full-bleed atau 2xl radius
2. **Ledger rows** (Pesanan list, Mutasi) — no card, no shadow
3. **Flat grid + icon tile** (Quick actions) — border-hairline ink-100
4. **Typographic strip** (Stats VIP) — no chrome, just number+label
5. **Plain background section** (Trust line, footer) — no chrome

### B.8 Anti-pattern budget

| Item | Max | Current |
|---|---|---|
| Bullet (`<li>` luar nav) | **3 / page** | ~6 (Quota, KetentuanPenting, Quick Actions pseudo) |
| Card border+shadow sections | **2 / page** | 3–4 (Saldo, Stats, Chart, Pesanan card) |
| Eyebrow pill (`UPPERCASE tracked`) | **0** | beberapa caption — audit |
| Italic | **0** | tidak ada |
| Mono for body/eyebrow | **0** | tidak ada |
| Inter font | **NO** | Plus Jakarta Sans ✅ |
| Browser chrome dots (R/Y/G) | **0** | tidak ada ✅ |

---

## C. Information Architecture

### C.1 User-side routes (verified via `find app/src/routes/(app)`)

```
/
├── +layout.server.ts          (auth gate + unread notif)
├── +layout.svelte             (Sidebar 1440 / Topbar mobile / BottomNav / FAB)
├── +page.svelte               Beranda (home dashboard)
├── affiliate/                 referral, komisi
├── akun/                      profile, password, API key, theme
├── layanan/                   katalog SMM
├── notif/                     notifikasi list
├── pesan/                     form buat order baru
├── pesanan/                   order list
├── saldo/
│   ├── +page.svelte           hero + mutasi + topup history
│   ├── riwayat/               mutasi detail
│   └── top-up/                topup wizard
└── tiket/                     support
```

### C.2 Bottom dock (mobile, 6 item)

| Pos | Icon | Label | Href |
|---|---|---|---|
| 1 | home | Beranda | `/` |
| 2 | grid | Katalog | `/layanan` |
| 3 | rocket | Pesan | `/pesan` |
| 4 | wallet | Saldo | `/saldo` |
| 5 | help | Tiket | `/tiket` |
| 6 | user | Akun | `/akun` |

(FAB dihapus — redundant)

### C.3 Sidebar (desktop, lg fixed)

```
socio.id (logo)
MENU
  • Beranda     /
  • Pesanan    /pesanan
  • Saldo      /saldo
  • Tiket      /tiket
LAINNYA
  • Layanan    /layanan
  • Affiliate  /affiliate
  • Akun       /akun
  • Notifikasi /notif
─────────────────
[icon] (Saldo mini, hanya icon — tap buka /saldo)
─────
@admin • Logout
```

**NOTIFIKASI BEL DIPINDAH KE TOPBAR** (sejajar dengan title) —bukan di sidebar.

### C.4 Topbar (desktop, sticky)

```
┌─────────────────────────────────────────────────────────────┐
│   Cari halaman / aksi…       ⌘K      [bell]  │  A @admin  │
└─────────────────────────────────────────────────────────────┘
```

---

## D. Per-Screen Design Contract

### D.1 Beranda (`/`)

**Tujuan**: user yang baru balik hari ini → merasa "semua aman, ada X berjalan, saya bisa langsung order lagi kalau perlu".

**Di atas lipatan (mobile):**
1. **Saldo Hero** — saldo + sparkline + Top Up (high) / Riwayat (medium) / Mutasi (link)
2. **Greeting band** — "Selamat {waktu}, {nama} {emoji}" + subtitle "● Aktif · X pesanan berjalan — kami proses otomatis."
3. **Quick actions (3)** — Top Up, Katalog, Bantuan (flat icon tile)
4. **Pesan Cepat** (horizontal carousel of saved-links) — **hidden jika user belum punya repeat order** (ganti dengan empty state inline)

**Di bawah lipatan:**
5. **Stats VIP strip** (typographic only, no card) — Pesanan | Deposit ↑ | Belanja | [VIP badge kalau > 5jt]
6. **Chart** (card md) — Aktivitas 7 Hari, area chart + Live SSE hint
7. **Pesanan Terbaru** (ledger rows, no card) — Name + status pill + qty + harga. Truncated link.
8. **Trust line** — "Diproses 1–5 menit di jam kerja · Sinkron tiap menit via SSE"

**Empty state untuk user baru:**
- Greeting: "Selamat datang di Socio.id 🌟 — pesanan pertama kamu akan muncul di sini dalam hitungan menit."
- Stats: tiga angka dengan em-dash
- Chart: skeleton
- Pesanan: empty-state inline "Belum ada pesan terbaru — pesan pertama kamu akan muncul di sini setelah selesai."
- CTA utama: Top Up atau Pesan (FAB-equivalent di desktop: Top Up prominent di hero saldo)

### D.2 Pesanan (`/pesanan`)

**Tujuan**: user cek status order real-time. Confidence tinggi bahwa "semua aman".

**Layout (mobile):**
```
[Beranda]   Riwayat Pesanan       [bell] [A]
─────────────────────────────────────────
Real-time. Refill & batal di sini.
─────────────────────────────────────────
[Pill: Semua 168] [Pending 4] [Proses 0]
[Selesai 109] [Gagal 49] [Partial 6]
─────────────────────────────────────────
Instagram Real Likes              Error
https://deepl.com                  -Rp3.000
10 qty          6 Jan 2026         ›
─────────────────────────────────────────
[Pilih Banyak]  (sticky top setelah list)
```

**Order card** (mobile): edge-to-edge. Inline elements:
- Title (Service name, ink) + status pill (top-right)
- Link (truncate 1 bar, ink-3)
- Bottom row: qty · date · price

**Progress bar visual** (NEW): garis horizontal putus-putus dari "Pending" ke "Selesai" dengan marker di status saat ini. Memberikan journey visual.

**Mass action** (saat user pilih >1 order): sticky **TOP** bar dengan counter + "Batalkan & Refund [nominal]". Bukan floating bottom (saat ini tumpang tindih dengan dock).

### D.3 Saldo (`/saldo`)

**Tujuan**: user cek saldo + mutasi. Confidence tinggi, link ke top-up jelas.

**Layout:**
```
Saldo Anda
Rp701.954                     [Top Up +] [Mutasi]
↑ +Rp1,2jt 7 hari    sparkline
─────────────────────────────────────────
Mutasi Terbaru      [Lihat semua →]    [Top Up Terakhir]
```

Saldo hero sama persis seperti di Beranda (component di-share).

**Mutasi list**: ledger rows, dengan icon in/out (chip 8px di kiri). Color: masuk `success`, keluar `ink` atau `danger` (untuk refund).

**Right column (desktop)**: Top Up Terakhir dengan chip "Canceled/Success/Cancelled" real-time.

### D.4 Top Up (`/saldo/top-up`)

**Tujuan**: user top-up dalam 30–60 detik.

**Step indicator** di atas:
```
[Nominal] ─── [Metode] ─── [Ringkasan]
   ✓                ·               ·
```

**Nominal (3 card grid):** + field "Nominal lain". Chip "Populer" data-driven (rolling 7d, min 20% adopted).

**Metode Pembayaran (direct info-card, bukan selector):**
```
┌─────────────────────────────────────────┐
│ [BCA] Transfer Bank BCA                  │
│       Gratis · Dikonfirmasi admin ±5    │
│       menit di jam kerja                │
│       BCA 123-456-7890 a/n Socio.id    │
└─────────────────────────────────────────┘
   E-wallet, QRIS, & kripto segera hadir.
```

**Summary block** (dark, sticky di bottom mobile):
```
Nominal top up            Rp50.000
Kode unik (3 digit)       +774
Bonus deposit 10%         +Rp5.000
─────────────────────────────────
Total transfer            Rp55.774
Saldo setelah konfirmasi +Rp55.774
```

**CTA sticky**: [Top Up Sekarang · Rp55.774]

### D.5 Akun (`/akun`)

**Tujuan**: user ubah profil/password/API key dengan zero-error.

**Layout:**
```
Admin    [ADMIN]
@admin                  [Saldo: Rp701.954]
[avatar 80×80 + Icon edit pencil]
─────────────────────────────────────────
Profil
[Admin] [Simpan Profil] (primary)
─────────────────────────────────────────
Ganti Password
[Password saat ini]  
[Password baru (min 8)]
[Kekuatan: Lemah/Sedang/Kuat — bar]
[Ubah Password] (danger-color)
─────────────────────────────────────────
API Key
[sk_xxxxxxxxxxxxx]    [Lihat] [Salin] [Regenerate]  
Last regenerated: 3 Sep 2026
─────────────────────────────────────────
Tema
[Light] [Dark] (toggle, instant client-side)
─────────────────────────────────────────
[Top Up Saldo] [Riwayat Saldo]
[Affiliate]    [Tiket Bantuan]
[Notifikasi]   [Keluar] (danger)
```

**Logout bukan native confirm()**: pakai ConfirmDialog dengan `danger`.

### D.6 Pesan (`/pesan`)

**Tujuan**: bikin order baru dalam ≤ 30 detik (target: 3 ketukan untuk repeat-order).

**Hero gradient** (konsisten): "Buat Pesanan Baru"

**Form steps (sticky mobile scroll):**
1. **Kategori** (chip multi-select)
2. **Layanan** (search + scroll list + tap to select)
3. **Link / Username** (text input, show format hint)
4. **Jumlah / Komen** (toggle 2 mode: qty atau 1-per-baris komentar)
5. **Kupon** (optional, debounced check 400ms)
6. **Ringkasan** (live calculate, sticky bottom on mobile)

**Saved links chips** (primary tint, bukan ink-100).

**"Ketentuan Penting"** direstruktur: 3-bullet max, sisanya sebagai plain prose "Dengan memesan, kamu menyetujui …"

---

## E. Copy & Bahasa Guidelines

### E.1 Bahasa
- **Bahasa utama**: Indonesian, natural (formal-tapi-hangat), bukan birokrasi
- **Bahasa inggris**: hanya untuk brand term yang tidak ada padanannya (mis. "Live", "Top Up", "API Key") — boleh dipakai minimal, konsisten

### E.2 Tone Rules
1. **CTAs**: 2–4 kata. Indonesian verb. Eks:
   - ✅ "Top Up Sekarang", "Buat Pesanan", "Ubah Password", "Kirim Tiket"
   - ❌ "Top Up Now", "Buat Pesanan Baru!", "Ubah Password Anda Sekarang"

2. **Status badges**: 1 kata
   - ✅ Pending | Proses | Selesai | Gagal | Partial (5 kata saja)
   - ❌ "Sedang Berjalan", "Selesai 100%", "Failed - Coba Lagi"

3. **Empty state title (max 6 kata)**: eks
   - ✅ "Belum ada notifikasi"
   - ✅ "Belum ada tiket"
   - ❌ "Tenang aja" (slang)
   - ❌ "Sepertinya belum ada apa-apa di sini" (terlalu panjang)

4. **Empty state description (max 2 baris, ~15-20 kata)**: eks
   - "Top up pertama bakal tampil di sini — prosesnya ±5 menit di jam kerja."

5. **CTA dengan harga**: "Top Up Sekarang · Rp50.000"

6. **Tooltip**: bahasa natural + 1 emoji yg relevan (opsional)
   - "Saldo terlihat kosong — isi dulu sebelum order pertama"

### E.3 Banned words (harus diganti)
- ❌ "Mulai" (terlalu pendek)
- ❌ "Withdraw" → "Penarikan"
- ❌ "approve" → "setujui"
- ❌ "sat-set" → "sekali klik"
- ❌ "5jt" → "5 juta"
- ❌ "Tap" → "Sentuh"
- ❌ "Sync" → "Sinkron"
- ❌ "Live" → "Aktif"
- ❌ "Ready" → "Siap"
- ❌ "5ribu" → "5 ribu"

### E.4 Single source of truth
- `packages/core/src/copy.ts` — semua string copy dashboard. **DILARANG** hardcode string di component `+page.svelte` kecuali untuk dynamic values.

---

## F. Accessibility (web-design-guidelines)

- **Contrast**: all text ≥ 4.5:1 (AA normal); ≥ 3:1 untuk large text (≥18px atau 14px bold)
- **Tap target**: ≥ 44×44pt
- **Focus indicator**: 2px ring `color-mix(in oklab, accent, paper)` — visible di semua state
- **Aria-label** untuk icon-only buttons
- **Skip-to-content** link di `<main>` pertama
- **prefers-reduced-motion**: matikan spring, ganti ke linear/fade

---

## G. Build & Deploy Checklist (per AGENTS.md §7)

Tiap kali mengubah Beranda atau halaman utama user:

- [ ] `pnpm --filter app lint` → 0 error
- [ ] `pnpm --filter app check` → 0 error
- [ ] `pnpm --filter app build` → ok
- [ ] Manual test di `pnpm dev` mobile 360×640, tablet 768×1024, desktop 1440×900
- [ ] Visual audit 8 anti-tells (looks-expensive)
- [ ] Color contrast AA pass
- [ ] Update `IMPLEMENTATION_CHECKLIST.md` centang tiap issue rampung
- [ ] Commit: `feat(M5): {modul} — {item}` atau `fix(M5): {masalah}`

---

## H. Reference Cepat

| Dokumen | Tujuan |
|---|---|
| [`UIUX_DASHBOARD_PLAN.md`](./UIUX_DASHBOARD_PLAN.md) | Audit + backlog 49 issue, 9 phase (P0–P8) — selesai 4 Sep 2026 |
| [`IMPLEMENTATION_CHECKLIST.md`](./IMPLEMENTATION_CHECKLIST.md) | Tracker per-issue checklist + tech stack audit |
| [`DESIGN.md`](./DESIGN.md) (file ini) | Panduan desain preskriptif |
| [`MOBILE_UX_GUIDE.md`](./MOBILE_UX_GUIDE.md) | Design system phone-specific |

---

## I. Status design system (4 Sep 2026)

- **Palette OKLCH**: sudah diterapkan (lihat `packages/ui/src/tokens.css`)
- **Plus Jakarta Sans**: sudah dimuat self-host
- **NumberFlow**: dipakai untuk saldo animasi (custom impl pakai `motion@13`)
- **Web Interface Guidelines**: AA 4.5:1 sudah diverify di iterasi sebelumnya
- **Dark mode**: pakai class toggle `.dark` (sudah di setup dengan `@custom-variant`)
- **CTA construction**: `--accent-ink` dipakai untuk primary button fill (sudah)
- **Glass system**: `.glass` utility + token `--glass-bg/border/ring` di `packages/ui/src/tokens.css` (P7-02). Menggantikan literal `bg-white/75` di BottomNav + admin nav glass.
- **Numeric lock**: tnum + lnum global di `:root` lewat `--font-feature-numeric` (P7-03)
- **Anti-pattern audit terakhir**: ✅ Pass — bullet ≤ 3/page, eyebrow pill = 0, card border+shadow ≤ 2/page di Beranda (P7-01)
- **Phase P0–P8 (49 issue)**: ✅ 100% done — lihat `IMPLEMENTATION_CHECKLIST.md §Audit Summary`
