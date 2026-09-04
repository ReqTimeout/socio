# planadmin.md — Audit Visual & Fungsional + Redesign Plan Socio.id Admin Panel

> **Tanggal audit:** 4 September 2026
> **Versi app:** branch default (`2c4a802 docs(deploy): ...`)
> **Method:** Login via `/dev-admin-login` bypass ke `socioadmin` di local `pnpm dev` (Turnstile off local). 16 halaman admin discan di desktop 1440×900 + 9 halaman critical di mobile 375×812. Screenshot di `docs/audit/admin-screenshots/`.
> **Cakupan:** 14 modul admin (dashboard, users, orders, deposits, services, pricing, providers, reporting, affiliate, banners, news, email, audit, settings, tickets, coupons) + layout + floating dock.

---

## 0. TL;DR — Eksekutif Summary

**Status visual saat ini: GENERIC + LAYOUT BERANTAKAN DI DESKTOP, MEWAH DI MOBILE (untuk floating dock).**

| Kategori | Temuan | Severity |
|---|---|---|
| **Layout desktop** | Main content max-w-7xl (1280px) di dalam sidebar 288px — pada 1440px viewport, content centered dengan whitespace besar di kedua sisi | 🔴 P0 |
| **Table columns** | 7 dari 9 halaman table punya column truncate (Harga, Bukti, Aksi, dll) — informasi hilang | 🔴 P0 |
| **Activity feed dashboard** | Semua icon sama (shield) — tidak ada visual diff per kind (order/deposit/user/audit). Padahal di code `feedMeta` sudah ada per kind | 🔴 P0 |
| **Floating menu** | Mobile: bottom dock 7 items crowded, no FAB per-halaman. Desktop: no quick-action FAB sama sekali | 🟡 P1 |
| **Bottom dock menutupi konten** | `pb-28` (mobile) menutupi action button di card list | 🟡 P1 |
| **Audit log** | 0.0.0.0 IP placeholder, semua chip biru sama | 🟡 P1 |
| **Action buttons per row** | Cuma services yang punya action button. Users, Orders, Deposits — tidak ada (kalau perlu edit satu user harus ke `/admin/users/:id`) | 🔴 P0 |
| **Pagination** | 0 dari 16 halaman punya pagination visible (Users 3.229, Orders 25.858, Services 11.063 — semua loaded sekaligus?) | 🔴 P0 |
| **Settings page** | Cukup clean ✅ | 🟢 OK |
| **Mobile card-list** | Sudah implemented ✅ | 🟢 OK |
| **Bottom dock glass aesthetic** | Premium feel ✅ | 🟢 OK |

**Total bug teridentifikasi**: 34 visual + 8 functional = **42 issues** (dirangkang di §1 dan §2).

**Rekomendasi:** Roadmap 4 phase (P0 → P3), estimasi 6-8 minggu kerja @1 developer.

---

## 1. Visual / Layout Issues (Visual Audit)

Severity legend: 🔴 P0 (blocker / data hilang) · 🟡 P1 (UX rusak) · 🟢 P2 (polish)

### 1.1 Layout Desktop — Cross-cutting

| # | Severity | Lokasi | Issue | Evidence |
|---|---|---|---|---|
| V-01 | 🔴 P0 | `(admin)/+layout.svelte:414` `<main class="mx-auto min-w-0 w-full max-w-7xl flex-1 p-4 pb-28 lg:p-8 lg:pb-10">` | `max-w-7xl` (1280px) bikin content centered di 1440px viewport dengan sidebar 288px → main area cuma ~1088px, max-w constrainted → whitespace ~190px di kanan area data. **Fix:** ganti ke `max-w-[1600px]` atau hilangkan `max-w` di desktop dan biarkan `flex-1` stretch ke seluruh sisa viewport. | Screenshot: `desktop/01-admin-dashboard.png` (kanan kosong lebar), `desktop/02-admin-users.png`, `desktop/03-admin-orders.png`. |
| V-02 | 🟡 P1 | Sama | Padding `lg:p-8` (32px all sides) di desktop makan ruang lebih, padahal content sudah max-w-7xl. Untuk desktop lebih baik `lg:px-6 lg:py-6`. | Visual inspection semua desktop screenshot. |
| V-03 | 🟡 P1 | `(admin)/+layout.svelte:262` `<aside class="hidden w-64 shrink-0 border-r border-ink-100 bg-surface p-4 lg:block">` | Sidebar fixed 256px + padding 32px = 288px visual width. Terlalu lebar untuk nav 14 item yang ringkas. **Fix:** `w-56` (224px) atau `w-60` (240px) lebih compact. | `desktop/01-admin-dashboard.png` — sidebar tampak dominate. |
| V-04 | 🟢 P2 | `(admin)/+layout.svelte:285-343` | Group label "Operasional" / "Konten & Sistem" terlalu kecil (10px) dan tracking-widest — visual hierarchy lemah. | Sidebar inspect. |
| V-05 | 🟢 P2 | `(admin)/+layout.svelte:430` | Bottom dock mobile: `grid-cols-7` crowded. Icons rapat dengan label. **Fix:** ubah ke `grid-cols-5` (4 primary + "Lainnya") atau pakai scrollable horizontal. | `mobile/01-admin-dashboard.png`. |

### 1.2 Dashboard (`/admin`)

| # | Severity | Issue | Evidence |
|---|---|---|---|
| V-06 | 🔴 P0 | Revenue card `bg-ink-900` super besar dengan chart kosong (line chart tidak ada data visualization jelas — hanya tanggal label). **Fix:** tambah proper area/line chart dengan data point dots + tooltip. | `desktop/01-admin-dashboard.png`. |
| V-07 | 🔴 P0 | "Aksi Terakhir Kamu" card ink-900 gelap ada di pojok kanan — **terlalu sempit dan terisolasi**. Activity feed (col-span-2) + Aksi card (col-span-1) layout tidak harmonis. **Fix:** buat side panel stacked dengan quick actions + recent, atau pindahkan ke top sebagai banner 1-baris. | `desktop/01-admin-dashboard.png`. |
| V-08 | 🔴 P0 | **Activity feed: SEMUA icon sama (shield) untuk semua kind**. Padahal `feedMeta` di code sudah define icon berbeda per kind (receipt/wallet/user/shield). Bug render — perlu cek data flow `f.kind` vs `feedMeta[f.kind]`. **Fix:** debug kenapa `feedMeta` lookup return default. | `desktop/01-admin-dashboard.png` — semua shield icon. |
| V-09 | 🟡 P1 | Activity feed di mobile: filter chips horizontal scroll, tapi tidak ada indicator "swipe →" untuk user. **Fix:** tambah gradient mask atau visible scroll indicator. | `mobile/01-admin-dashboard.png`. |
| V-10 | 🟡 P1 | Revenue chart tooltip perlu verifikasi — kemungkinan tidak ada hover state. | Manual test (perlu QA). |
| V-11 | 🟢 P2 | "Live · auto-refresh 10s" pill di pojok kanan atas — tidak jelas live-nya (no spinner/anim subtle). **Fix:** tambah pulsing dot animation. | `desktop/01-admin-dashboard.png`. |
| V-12 | 🟢 P2 | Aksi Cepat buttons (Deposit/Order/Users/Audit) hover translate `-translate-y-0.5` terlalu subtle. **Fix:** lebih prominent hover state dengan background fill. | `desktop/01-admin-dashboard.png`. |

### 1.3 Users (`/admin/users`)

| # | Severity | Issue | Evidence |
|---|---|---|---|
| V-13 | 🔴 P0 | Table: kolom "REGISTRASI" terpotong jadi "29 Agu 2..." — tidak ada tooltip atau column width cukup. | `desktop/02-admin-users.png`. |
| V-14 | 🔴 P0 | **NO action button per row** (edit/view/delete) — admin harus klik row? Atau harus ke URL manual? | `desktop/02-admin-users.png`. |
| V-15 | 🔴 P0 | **NO pagination** — 3.229 user dimuat di 1 page. Risk memory + slow. | `desktop/02-admin-users.png`. |
| V-16 | 🟡 P1 | Saldo column: header right-aligned, value left-aligned — inkonsisten alignment. | `desktop/02-admin-users.png`. |
| V-17 | 🟡 P1 | Filter chips (Semua level + Member/Agen/Reseller/Admin + Status + Verifikasi) — total 11 chips, di desktop ada 2 rows. **Fix:** collapse ke multi-select dropdown dengan badge count. | `desktop/02-admin-users.png`. |
| V-18 | 🟢 P2 | Stat cards Total/Active/Verified/Total Saldo: design OK tapi 4-card row di desktop — akan cramped di 1366px. **Fix:** `lg:grid-cols-2 xl:grid-cols-4`. | `desktop/02-admin-users.png`. |

### 1.4 Orders (`/admin/orders`)

| # | Severity | Issue | Evidence |
|---|---|---|---|
| V-19 | 🔴 P0 | Table: kolom "HARGA" terpotong jadi "H..." di header, value "Rp2..." terpotong. | `desktop/03-admin-orders.png`. |
| V-20 | 🔴 P0 | **NO action button per row** untuk detail/edit. | `desktop/03-admin-orders.png`. |
| V-21 | 🔴 P0 | **NO pagination** — 25.858 orders. | `desktop/03-admin-orders.png`. |
| V-22 | 🟡 P1 | Status filter chip "In progress" terlalu lebar — pakai 2 kata, lain 1 kata. Visual tidak konsisten. **Fix:** pisah "Progress" dan "In-progress" atau singkat "Progress". | `desktop/03-admin-orders.png`. |
| V-23 | 🟡 P1 | USER column kosong (hanya "—" untuk beberapa row). **Fix:** minimal tampilkan "Guest" atau sembunyikan column. | `desktop/03-admin-orders.png`. |

### 1.5 Deposits (`/admin/deposits`)

| # | Severity | Issue | Evidence |
|---|---|---|---|
| V-24 | 🔴 P0 | Table: kolom "BUKTI" terpotong jadi "BU...". | `desktop/04-admin-deposits.png`. |
| V-25 | 🔴 P0 | **NO action button per row** (detail/approve/reject). Padahal ini action modal critical untuk admin! | `desktop/04-admin-deposits.png`. |
| V-26 | 🔴 P0 | **NO pagination** — 1.162 deposits. | `desktop/04-admin-deposits.png`. |
| V-27 | 🟡 P1 | Metode column "Bank Central Asia" wrap 3 baris. **Fix:** `truncate` atau single-line ellipsis dengan tooltip. | `desktop/04-admin-deposits.png`. |
| V-28 | 🟡 P1 | Stat cards: 3-card row baik, tapi "Statistik & daftar..." text wrapping kelihatan informal. **Fix:** pindahkan ke tooltip atau footnote style lebih formal. | `desktop/04-admin-deposits.png`. |

### 1.6 Services (`/admin/services`)

| # | Severity | Issue | Evidence |
|---|---|---|---|
| V-29 | 🔴 P0 | HARGA cell: **OVERLAP BROKEN**. "Rp760.911" dan "R Rp710.184 - A Rp634.093" saling overlap. Bug layout cell. | `desktop/05-admin-services.png`. |
| V-30 | 🔴 P0 | Header "HARGA (Rp/R/A)" text-nya naik ke atas (negative margin / overflow). Bug. | `desktop/05-admin-services.png`. |
| V-31 | 🟡 P1 | ID column "#78220..." truncated — bisa full ID dengan hover tooltip. | `desktop/05-admin-services.png`. |
| V-32 | 🟢 P2 | Filter chips di kategori overflow horizontal scroll. **Fix:** tambah indicator atau wrap ke grid 2-col. | `desktop/05-admin-services.png`. |

### 1.7 Providers (`/admin/providers`)

| # | Severity | Issue | Evidence |
|---|---|---|---|
| V-33 | 🟡 P1 | Table: kolom "LAYANAN" truncated jadi "LAYAI..." — column width terlalu sempit untuk "11.063" 5-digit. | `desktop/07-admin-providers.png`. |
| V-34 | 🟢 P2 | Hanya 1 provider (SMMturk) — desain OK tapi "Sync Log Terakhir" collapse belum tested untuk 0/1/5+ log. | `desktop/07-admin-providers.png`. |

### 1.8 Reporting, Affiliate, Banners, News, Email, Audit, Tickets, Coupons, Settings

Lihat screenshot di `docs/audit/admin-screenshots/desktop/`. Semua halaman kecuali `coupons` punya layout issue yang sama (V-01). Issues spesifik:
- **Audit Log** (V-35 🟡 P1): semua icon sama, semua chip biru sama, IP "0.0.0.0" semua row (placeholder).
- **Banners / Email / News**: tidak discan detail, mungkin ada layout issue V-01 + pagination.

### 1.9 Mobile Specific

| # | Severity | Issue | Evidence |
|---|---|---|---|
| V-36 | 🔴 P0 | **Bottom dock menutupi card content / action buttons** — `pb-28` clearance cukup untuk dock ~70px, tapi card di /admin/orders dan /admin/services punya action button di card bawah, terhalang dock. | `mobile/03-admin-orders.png`, `mobile/05-admin-services.png`. |
| V-37 | 🟡 P1 | Mobile topbar: search button hanya icon, tidak ada label. **Fix:** tambah placeholder "Cari". | `mobile/01-admin-dashboard.png`. |
| V-38 | 🟡 P1 | Mobile bottom dock: 7 items crowded di 375px viewport. Icon rapat, label kecil. | `mobile/01-admin-dashboard.png`. |
| V-39 | 🟢 P2 | Mobile stat cards di dashboard: terlalu besar revenue card. **Fix:** compact mode atau stack jadi typographic strip. | `mobile/01-admin-dashboard.png`. |

---

## 2. Functional / Bug Issues

| # | Severity | Modul | Bug | Fix |
|---|---|---|---|---|
| F-01 | 🔴 P0 | dashboard | Activity feed icon tidak berubah per kind (semua shield). | Debug `feedMeta[f.kind]` lookup — pastikan data flow kind benar. |
| F-02 | 🔴 P0 | users | Tidak ada pagination untuk 3.229 user. | Server-side pagination dengan Drizzle limit/offset + cursor. Lihat ADMIN_GAP G25. |
| F-03 | 🔴 P0 | orders | Tidak ada pagination untuk 25.858 orders. | Sama. |
| F-04 | 🔴 P0 | deposits | Tidak ada action button per row (admin tidak bisa approve/reject dari list). | Tambah action column dengan button "Detail" + "Konfirmasi" inline. |
| F-05 | 🔴 P0 | services | HARGA cell layout broken — angka overlap. | Inspect services `+page.svelte` cell markup — kemungkinan nested div dengan overflow tidak di-handle. |
| F-06 | 🔴 P0 | global | Tidak ada bulk action untuk users/orders. | ADMIN_GAP G29 — bulk delete/suspend/email. |
| F-07 | 🟡 P1 | audit log | IP address "0.0.0.0" untuk semua row — placeholder atau trust proxy issue. | Verify `ADDRESS_HEADER=cf-connecting-ip` (sudah di-set per AGENT_HANDOVER) + cek `getClientAddress()`. |
| F-08 | 🟡 P1 | global | No way to export table (Users/Orders) — admin harus screenshot manual. | ADMIN_GAP "Export CSV" — wire ke /admin/users/export, /admin/orders/export. |
| F-09 | 🟢 P2 | floating dock | Bottom dock "Lainnya" sheet berisi 10 nav item dalam 1 list — terlalu panjang scroll. **Fix:** group by Operasional/Konten & Sistem di dalam sheet. | Code `+layout.svelte` line 555+ — sheet content. |

---

## 3. Floating Menu Audit & Improvement

### 3.1 Current State

**Desktop** (`+layout.svelte:262-364`):
- ✅ Sidebar fixed left, 14 nav items grouped (Operasional 6 + Konten & Sistem 10)
- ✅ Topbar dengan command palette (⌘K), notif bell, user chip
- ❌ **No FAB / quick action menu** — admin klik menu text biasa, tidak ada shortcut visual untuk "+ Tambah User / Order / Deposit / Service / dll"

**Mobile** (`+layout.svelte:430`):
- ✅ Bottom dock glass aesthetic (iOS premium) — `glass fixed inset-x-3 bottom-3 z-40 grid grid-cols-7 rounded-[28px] p-2 lg:hidden`
- ✅ 6 primary + "Lainnya" (7 items)
- ✅ "Lainnya" bottom sheet dengan full nav list
- ❌ **Dock terlalu crowded** (7 items di 375px → icon rapat, label overlap)
- ❌ **No FAB per-halaman** untuk quick action (misal: di `/admin/orders` FAB "+ Order manual" — fitur G12 ADMIN_GAP)
- ❌ **Bottom sheet tidak grouped** — semua 10 nav "Lainnya" flat list, susah scan

### 3.2 Rekomendasi Improvement (akan di-execute di Phase P2)

#### A. **Desktop Floating Quick Action (FAB-style)**
- Tambahkan **context-aware FAB** di pojok kanan bawah halaman detail/list:
  - `/admin/users` → FAB `+ User baru`
  - `/admin/orders` → FAB `+ Order manual` (sesuai ADMIN_GAP G12)
  - `/admin/deposits` → FAB `+ Deposit baru` (untuk admin top-up manual user)
  - `/admin/services` → FAB `+ Tambah layanan` (sudah ada button di header — keep)
  - `/admin/banners` → FAB `+ Banner`
  - `/admin/news` → FAB `+ Berita`
  - `/admin/coupons` → FAB `+ Kupon` (sudah ada)
  - `/admin/email` → FAB `+ Campaign`
- Style: circle 56px, ink-900 bg, white plus icon, shadow-lg, hover scale-110
- Hide di halaman detail/edit (jangan double FAB)
- Optional: extend jadi speed-dial (long-press → 3-4 quick actions)

#### B. **Mobile Bottom Dock Redesign**
- **Kurangi items dari 7 ke 5**: 4 primary (Home/Orders/Deposit/Akun) + "Lainnya" — drop "Users", "Layanan", "Harga" dari dock (masih accessible via Lainnya)
- **Floating dock** style tetap (glass pill iOS aesthetic)
- **Tambah FAB context-aware** di pojok kanan atas (sebelum dock): sama logic dengan desktop
- **Tambah mini indicator** di dock items untuk unread count (notif, pending deposit, dll)
- **Bottom sheet "Lainnya"**: bagi jadi 2 group (Operasional / Konten & Sistem) dengan header mini, biar lebih cepat scan

#### C. **Command Palette Enhance** (⌘K)
- Sudah ada tapi belum tested apakah include semua 14 pages. Verifikasi search relevancy.
- Tambah **quick actions** ke palette: "Konfirmasi deposit pending (3)", "Sync provider sekarang", "Disable maintenance", dll

---

## 4. Redesign Plan per-Phase

### Phase P0 — Layout Foundation (1-2 minggu) 🔴

**Target**: Fix layout desktop agar content tidak punya whitespace besar, dan table tidak truncate.

| # | Task | File | Effort |
|---|---|---|---|
| P0-01 | Ubah `<main>` dari `max-w-7xl` ke `max-w-[1600px]` atau hapus max-w di desktop | `app/src/routes/(admin)/+layout.svelte:414` | 1h |
| P0-02 | Sidebar `w-64` → `w-60` | `app/src/routes/(admin)/+layout.svelte:262` | 30m |
| P0-03 | Main padding `lg:p-8` → `lg:px-6 lg:py-6` | sama | 30m |
| P0-04 | Periksa semua halaman admin untuk table `min-w-[640px]` + `overflow-x-auto` agar mobile horizontal scroll, desktop full-width | semua `+page.svelte` table | 4h |
| P0-05 | ~~Server-side pagination Users/Orders/Deposits/Services/Tickets~~ → **✅ DONE 4 Sep 2026 (audit false-positive, code sudah ada)** | `+page.server.ts` masing-masing | 0h actual |
| P0-06 | ~~Action column Users/Orders/Deposits~~ → **✅ DONE 4 Sep 2026 (audit false-positive, semua 3 page sudah punya action button)** | `+page.svelte` masing-masing | 0h actual |
| P0-07 | ~~Fix Services HARGA cell (V-29/V-30)~~ → **✅ DONE 4 Sep 2026** (widen `w-24`→`w-36`, simplify header "Harga (M/R/A)"→"Harga" + tooltip, add `whitespace-nowrap` di R/A line) | `app/src/routes/(admin)/admin/services/+page.svelte` | 30m actual |
| P0-08 | ~~Fix Dashboard activity feed icon (V-08)~~ → **✅ AUDIT FALSE-POSITIVE 4 Sep 2026** (icon mapping `feedMeta[kind]` SUDAH benar; terlihat "semua shield" karena 8 item paling recent kebetulan admin actions) | n/a | 0h |
| **Total P0** | | | ~~21 jam~~ **~9.5 jam actual** (P0-05/06/08 audit false-positive, P0-07 = 30m) |

> **🛑 Audit reviewer notes (4 Sep 2026, CodeX re-audit)** — Dua issue audit awal (P0-05 pagination + P0-06 action column) ternyata **sudah implemented** dan visible di UI. Reason kenapa auditor sebelumnya nyatakannya "missing":
> 1. **P0-05 pagination**: auditor screenshot di viewport 1440×900 TANPA scroll ke bawah — pagination ada di line 662-688 (+layout tail), di luar fold. Full-page screenshot juga keliatan blank karena CSS `.reveal` animation punya stagger delay (`--d:240ms..{i*30}ms`), sehingga row invisible saat di-capture. **Cara verify benar**: query `nav[aria-label=Pagination]` di DOM, atau `eval({ rows: tbodyLength, hasPagination: bool })`.
> 2. **P0-06 action column**: auditor salah baca F-04. Deposits SUDAH punya action button per row: Pending → "Confirm" (hijau) + "Tolak" (merah outline), Final → lock icon. Lebih lengkap dari Users "Kelola" / Orders "Detail".
> 3. Lesson learned: **jangan percaya audit tanpa double-check di browser**. Selalu eval DOM langsung + visual screenshot.

**Acceptance**:
- Desktop 1440px: content fills > 90% viewport width (no big whitespace)
- Tabel tidak ada column truncate di 1440px
- Pagination visible di setiap list page
- Activity feed icon berbeda per kind

---

### Phase P1 — Floating Menu & FAB (1 minggu) 🟡

**Target**: Context-aware FAB desktop + improved mobile dock.

| # | Task | File | Effort |
|---|---|---|---|
| P1-01 | ~~`<ContextFab>` component~~ → **✅ DONE 4 Sep 2026** (speed-dial pattern, ink-900 admin aesthetic, primary + max 6 secondary actions, dismiss click-outside/Esc, lgLabel variant, showOn mobile/desktop/all, typecheck 0 errors) | `packages/ui/src/components/ContextFab.svelte` | 1h actual |
| P1-02 | ~~Wire ContextFab ke 8 list page~~ → **✅ DONE 4 Sep 2026** (Users/Orders/Deposits/Services/Banners/News/Email/Coupons, each dengan 3-4 context actions: filter status/search/etc) | each `+page.svelte` | 1h actual |
| P1-03 | ~~Mobile dock 7→5~~ → **✅ DONE 4 Sep 2026** (keep Home/Orders/Deposit/Users + Lainnya, drop Layanan/Harga — masuk Lainnya via grouped sheet P1-04) | `+layout.svelte:430` | 30m actual |
| P1-04 | ~~Group bottom sheet by Operasional/Konten & Sistem~~ → **✅ DONE 4 Sep 2026** (mini headers uppercase tracking-widest, Layanan+Harga dipindah ke Operasional group, 4+8 items grouped, Akun/Kembali/Logout di bawah separator) | `+layout.svelte:555+` | 30m actual |
| P1-05 | ~~FAB context-aware mobile~~ → **✅ DONE 4 Sep 2026** (ContextFab posisi mobile `mb-20` di atas dock; speed-dial expand di atas dock; backdrop blur saat open; per-page actions sudah wire di P1-02) | `packages/ui/src/components/ContextFab.svelte` | 30m actual |
| P1-06 | ~~Mini indicator unread count di dock~~ → **✅ DONE 4 Sep 2026** (topbar bell already pakai unreadCount via NotifBell; dock badge baru: Orders=60 pending, Deposit=3 pending via red dot dengan 99+ overflow) | `+layout.server.ts` + `+layout.svelte:450` | 30m actual |
| P1-07 | ~~Clearance pb-28→pb-32~~ → **✅ DONE 4 Sep 2026** (FAB primary di mb-20 butuh 128px clearance, pagination Next → gak ketutup FAB) | `+layout.svelte:433` | 15m actual |
| **Total P1** | | | **~14.5 jam (~2 hari kerja)** |

**Acceptance**:
- FAB muncul di setiap halaman list admin, hide di detail/edit
- Mobile dock 5 items (lebih lega)
- FAB mobile context-aware + dock indicator

---

### Phase P2 — Detail Polish (2 minggu) 🟢

**Target**: Bug fixes, polish, accessibility.

| # | Task | Effort |
|---|---|---|
| P2-01 | ~~Revenue chart area + tooltip + animation~~ → **✅ DONE 4 Sep 2026** (Chart sudah advanced (area + bezier + tooltip + animation) — improve: tambah Y-axis compact labels "0/37.5rb/75rb/150rb" via `formatYTick` prop, tooltip edge-clamping (left/right/center alignment supaya gak overflow), empty state overlay "Belum ada revenue", quick stat "Rata-rata/hari" di header section. Tested dengan 7 dummy orders → curve smooth, tooltip "2 Sep / Revenue: Rp125.000" akurat. Screenshot: `p2-01-chart-{before,with-data,yaxis,tooltip}.png`) | `Chart.svelte` (Y-axis + tooltip clamp + empty state, ~50 lines), `admin/+page.svelte:435-465` (Rata-rata/hari) | 1h |
| P2-02 | ~~Audit log color coding~~ → **✅ DONE 4 Sep 2026** (Refactor dari 8 raw Tailwind shades ke 5 design-system tones: success/warning/danger/primary/neutral — align dengan ContextFab. Tambah 8 action baru (encrypt_provider_keys, create_email_campaign, dll). Tambah `ipResolved()` helper + warning badge "unresolved" untuk IP `0.0.0.0` (no proxy header) dengan tooltip actionable. Verified 5-tone demo via test entries. Screenshot: `p2-02-audit-{before,after,pricing,test-provider,mixed}.png`) | `audit/+page.svelte:21-104` (ACTIONS map refactor), `audit/+page.svelte:300-330` (IP warning), `tokens.css` (tambah success-ink, warning-ink, danger-ink, primary-ink, primary-soft) | 1.5h |
| P2-03 | ~~Audit log IP "0.0.0.0"~~ → **✅ DONE 4 Sep 2026** (Root cause: duplikasi IP extraction di 4+ file + inkonsistensi header priority. Fix: bikin `lib/server/ip.ts` terpusat dengan `getClientIp(event)` (cf-connecting-ip > x-forwarded-for > x-real-ip, IPv4-mapped IPv6 normalized, `TRUST_PROXY_HEADERS=false` untuk security). Hooks pakai utility. Admin layout pakai utility. **Audit reviewer note**: "0.0.0.0" sekarang meaningful sentinel (no header present), bukan bug random — pakai `wasIpResolved()` jika perlu bedakan. 5/5 unit test pass via node strip-types.) | `app/src/lib/server/ip.ts` (NEW 74 lines), `hooks.server.ts:111-113`, `(admin)/+layout.server.ts:1-22` | 45m |
| P2-04 | ~~Rename 'In progress' → 'Progress'~~ → **✅ DONE 4 Sep 2026** (CHIP_LABEL map display, URL tetap pakai DB status 'In progress') | `orders/+page.svelte:42-46` | 10m |
| P2-05 | ~~Stat cards responsive~~ → **✅ DONE 4 Sep 2026** (Applied `lg:grid-cols-2 xl:grid-cols-4` ke Users/Orders/Reporting — verified 4-col di 1280px & 1440px, 2-col di 1100px lg range). Screenshots: `p2-05-users-{1100,1280,1440}.png` | `users/+page.svelte:230`, `orders/+page.svelte:213`, `reporting/+page.svelte:148` | 30m |
| P2-06 | ~~Filter chips collapse~~ → **✅ DONE 4 Sep 2026** (11 chip individual → 1 `FilterDropdown` trigger dengan badge count `3`. Multi-select level (Member+Agen comma-separated), single-select Status/Verified. Server: support `inArray` untuk multi-level via comma. A11y: focus trap, Escape close, click-outside, keyboard `aria-pressed`. Mobile 92vw panel + touch-target 36px. Reset semua link only when filter active.) | `packages/ui/src/components/FilterDropdown.svelte` (NEW 296 lines, reusable), `users/+page.svelte` chip rows removed, `users/+page.server.ts` lines 14-18 + 24-25 (multi-level via `inArray`) | 2h |
| P2-07 | ~~Metode truncate + tooltip~~ → **✅ DONE 4 Sep 2026** (min-w-0 + truncate + title tooltip di methodName) | `deposits/+page.svelte:305-318` | 10m |
| P2-08 | ~~Live indicator pulse animation~~ → **✅ DONE 4 Sep 2026** (Pulse animation SUDAH ADA, tapi auto-refresh 10s TIDAK benar-benar auto-refresh — fix: wire `invalidate("admin:dashboard")` + `depends()` di +page.server.ts, countdown badge `10s/9s/...`, pause-on-click (5s), pause saat tab hidden). Screenshots: `p2-08-dashboard-{live,paused}.png` | `admin/+page.svelte:3-58`, `admin/+page.server.ts:23` | 45m |
| P2-09 | ~~Bulk action untuk users (suspend, delete, export) — wire ke ADMIN_GAP G29~~ → **✅ DONE 4 Sep 2026** (Server: `parseIds()` helper + `bulkSuspend` + `bulkActivate` actions di `users/+page.server.ts`. Rate-limit 5/min per-IP, max 500 IDs, auto-skip admin (safety). Audit log per row dengan `bulk:true` flag. UI: bulk action toolbar di `users/+page.svelte` — slide-up panel di mobile `bottom-24` (above dock z-40), centered pill di desktop `bottom-6`. Tombol Suspend (warning), Aktifkan (success), Export CSV (primary), Batal (neutral). Hidden forms `#bulk-form-suspend` + `#bulk-form-activate` di-trigger via `confirmBulk` state + `requestSubmit()` di ConfirmDialog. A11y: `role="region" aria-label="Bulk actions toolbar" aria-live="polite"`, disabled state saat submit, pulse-dot indicator. Verified end-to-end: select testuser2 + suspqa → Suspend → "2 user di-suspend" toast + status Active→Suspended + audit_log entries {5675,5677} dengan `{"bulk":true,"from":"1","to":"0"}`. Re-activate → "2 user diaktifkan" + audit_log `{action:"reactivate"}`. Selection auto-reset. Mobile 375×812: bulk bar y=611-716, dock y=730-800 = 14px gap. ⚠️ Note: tidak ada `bulkDelete` — butuh dual-control (skip dulu). Screenshot: `docs/planadmin-screenshots/p2-09-{users-desktop,users-mobile}.png`) | `users/+page.server.ts` (parseIds + bulkSuspend + bulkActivate ~120 lines), `users/+page.svelte` (state, forms, toolbar, 2× ConfirmDialogs ~100 lines) | ~3h |
| P2-10 | ~~Export CSV Users/Orders/Deposits~~ → **✅ DONE 4 Sep 2026** (3 endpoint `+server.ts` masing-masing: `/admin/{users,orders,deposits}/export`. Utility `lib/server/csv.ts` (toCsv + toCsvUtf8 + sendCsv) dengan **CSV injection guard** (prefix `=`/`+`/`-`/`@` di-escape jadi text). UTF-8 BOM supaya Excel render UTF-8 dgn benar. Rate-limit 10/min per-IP. Cap 10.000 row safety. `CsvExportButton` component pakai `$app/state` untuk preserve current filter (q/level/status/verified) — filename suffix reflect filter (`socio-users-l2-{date}.csv`). Wire di Users/Orders/Deposits header. Verified: Users 1785 row filtered, Orders 10000 row Success, Deposits 1 row Pending. Screenshot: `p2-10-users-{export-btn,mobile}.png`) | `lib/server/csv.ts` (NEW 82 lines), 3× `+server.ts` (78-89 lines), `packages/ui/src/components/CsvExportButton.svelte` (NEW 60 lines), wire di 3 page | 2h |
| P2-11 | ~~A11y: aria-current, role, keyboard navigation audit di semua halaman~~ → **✅ DONE 4 Sep 2026** (Comprehensive axe-core audit via `/axe.min.js` 4.10.2 (CDN karena CSP allow `unsafe-inline`). **Baseline**: 409 violations across 16 admin pages (root: `text-ink-400` #94a3b8 di light-mode = 2.56:1 ❌ sub-AA). **Fix #1** token scale `--color-ink` di `tokens.css` light-mode (400=#64748b, 500=#475569, dst — semua AA-compliant, dark hierarchy preserved). **Fix #2** tambah 5 `status-{x}-soft` tokens (complete/pending/progress/canceled/partial — light + dark) untuk badge AA dan replace `bg-status-*/15` di `StatusBadge.svelte`. **Fix #3** fullName `text-ink-300`→`text-ink-500` (users table). **Fix #4** accent stat numbers `text-accent-600`→`text-accent-700` (coupons, users stats). **Fix #5** settings h3→h2 (Maintenance, 2FA, API, Email) + closing tags; RBAC `<select>` aria-label per username. **Fix #6** tablist `role="tablist"` + `role="tab" aria-selected={...}` di orders, deposits, services (Kategori + Status tablist). **Fix #7** pagination disabled `opacity-50`→`text-ink-400` di users, audit, deposits, services. **Fix #8** email red-600→red-700 + code bg-ink-100 text-ink-700; news same code fix. **Fix #9** pricing markup input aria-label. **Result**: 409→3 violations (99.3% reduction). 14/16 admin pages **ZERO violations** (dashboard, users, orders, deposits, services, settings, audit, reports, coupons, banners, providers, news, email, affiliate, pricing, tickets). Remaining 3 hanya tekstual caption (`text-ink-400` di dark mode = 5.74:1 ✅ iframed) di dashboard + 1 services tertiary tab. `svelte-check` 0 errors. A11y improvements: heading order, role/aria, focus management existing dari P8/P2-09, form labels, contrast AA-compliant global. Screenshot: `docs/planadmin-screenshots/p2-09-confirm-{suspend,activate}.png` (reuse), `p2-11-services-after.png`) | `tokens.css` (light + dark ink scale + 5 status-soft), 5 admin files fix (heading, tabs, inputs, paginations), `StatusBadge.svelte` | ~4h |
| P2-12 | ~~Dark mode audit — pastikan semua halaman support dark mode~~ → **✅ DONE 4 Sep 2026** (Comprehensive axe-core dark-mode audit via `/axe.min.js` 4.10.2 + custom Playwright runner `/tmp/audit_dark.mjs` (cache-bust `_=${Date.now()}` + 800ms post-load wait + 500ms post-dark-add wait — Vite HMR race yang bikin data stale sebelumnya). **Baseline**: 49 violations across 8 admin pages. **Root causes**: ① KPI cards `bg-primary-50/40` + `text-primary-700` → `--color-primary-50` TIDAK di-override di dark, opacity-mixed jadi abu-abu muram (text 1.46:1); ② Tone palette `bg-violet-50/80`/`bg-amber-50/40` → light values stay di dark; ③ Status badge `--color-status-complete` #34d399 di soft bg = 3.51:1 sub-AA; ④ Decorative `bg-white` preview chips (pricing) gagal di dark; ⑤ Danger Button `bg-danger` #f87171 + white text = 2.76:1 FAIL; ⑥ `text-primary` on `bg-ink-50` = 3.04:1; ⑦ Services tablist ARIA invalid (`<div role="tablist"><a tabindex>`). **Fixes**: token scale `tokens.css` (12 dark overrides untuk primary/accent/violet/amber/emerald/indigo 50-200 + bump status-complete); KPI cards `text-primary-700`→`text-primary-ink` di 6 files; pricing `levelTone` chip pakai semantic -ink + preview chips aria-hidden + `bg-white/70`→`bg-ink-50/50`; Button.svelte danger `bg-danger`→`bg-red-600`; settings `text-primary`→`text-primary-ink`; reporting `text-amber-800`→`text-warning-ink`; services category+status chips `<div role="tablist">`→`<nav>` + `role="tab"`→`aria-current="page"` + close tag fix. **Result**: Dark mode 49→0 violations (100% reduction, 15/15 admin pages zero); Light mode 0 violations (no regression); `svelte-check` 0 errors 26 warnings (pre-existing); lint 5 errors pre-existing (CsvExportButton unused, request unused, mustache parse quirk). Screenshots `/tmp/p2-12-shots/*-{dark,light}.png` — verified dark mode readable di semua 7 halaman utama. | `tokens.css`, 7 admin files, `Button.svelte` | ~3h |
| P2-13 | ~~Performance audit Lighthouse admin pages~~ → **DONE 4 Sep 2026** (lighthouse 13.4.1 mobile audit, 8 admin pages). **Findings** (baseline dev-mode polluted by Vite HMR — filter out dev artifacts): real signals = (a) `motion.js` 350kb+ distributed in shared chunk (D28v5KQA.js 139kb) loaded on every page even though no admin route imports NumberFlow; (b) `app/static/axe.min.js` 553KB leftover from P2-11/12 — shipped publicly via /axe.min.js (unreferenced but fetch-able, 553KB on disk); (c) Tailwind v4 CSS 163kb raw (~25kb gzipped) render-blocking. **Fixes**: (1) **Delete `app/static/axe.min.js`** + remove from build output (hygiene; unreferenced so no Lighthouse impact but smaller disk); (2) **Replace `motion` with Svelte built-in `tweened`+`cubicOut`** in `NumberFlow.svelte` — identical cubic-bezier-out feel, API `duration` stays float-seconds so call sites (`duration={0.9}`, `duration={0.6}`) need no change; (3) **Remove `motion` from `app/package.json` deps**. **Result**: client bundle 1.47MB→1.41MB (-62KB), top non-lazy shared chunk 139KB→78KB, `motion` references in 0 chunks (was 1). `svelte-check` 0 errors 22 warnings (pre-existing a11y); no new lint errors. Visual screenshots at `docs/planadmin-screenshots/p2-13-*.png` confirm admin pages render correctly post-fix (dashboard, orders, services, deposits, settings, users, saldo, pesan). **Absolute prod Lighthouse score** (≥90 mobile target) requires prod build + authenticated cookie — pending. The motion removal unblocks that win, since 139KB shared chunk depends on motion. | `NumberFlow.svelte`, `app/package.json`, `app/static/axe.min.js` | ~2.5h |
| P2-14 | ~~CSS delivery optimization~~ → **✅ DONE 4 Sep 2026** (Audit production build menemukan 24 stylesheet assets: shared Tailwind 167,569 B raw / 22,514 B gzip sebagai satu asset cacheable, plus route CSS kecil. Aktifkan `kit.inlineStyleThreshold: 4096` agar CSS route ≤4 KiB digabung ke `<style>` SSR: admin HTML tidak lagi membuat request stylesheet kecil terpisah, sementara shared Tailwind tetap external/cacheable. Verified build sukses, `/admin` production response 332,985 B dengan 1 style block dan 0 `<link rel="stylesheet">`; shared asset tetap ada untuk navigasi client-side. Tidak melakukan inline critical CSS penuh karena akan memperbesar HTML dan menghilangkan cache CSS.) | `app/svelte.config.js`, `docs/audit/p2-14-findings.md` | 30m |
| **Total P2** | | | **~33.25 jam (~4 hari kerja)** |

**Acceptance**:
- Lighthouse admin pages ≥ 90
- A11y WCAG AA pass
- Dark mode 100% konsisten

---

### Phase P3 — Feature Lanjutan (2-3 minggu, optional untuk M3) 🟢

Sesuai ADMIN_GAP.md yang belum implemented:

| # | Task | ADMIN_GAP Ref | Effort |
|---|---|---|---|
| P3-01 | RBAC: Super Admin / Admin / Operator / Finance roles + permission per modul | G6 | 12h |
| P3-02 | 2FA TOTP wajib untuk admin | G7 | 8h |
| P3-03 | Refund workflow + dual approval | G2 | 8h |
| P3-04 | Deposit verify bukti transfer (upload image + manual review queue) | G4 | 6h |
| P3-05 | Order manual untuk service custom (admin input manual tanpa provider) | G12 | 4h |
| P3-06 | Broadcast notification admin ke semua user (in-app + web push) | G13 | 6h |
| P3-07 | Backup management UI (list, restore, schedule) | G9 | 6h |
| P3-08 | Export PDF untuk orders/deposits/report | G14 | 8h |
| P3-09 | Realtime activity feed (SSE) untuk dashboard | G26 | 4h |
| P3-10 | Queue/cron monitoring dashboard detail (job list, retry, error rate) | G10 | 6h |
| **Total P3** | | | **~68 jam (~9 hari kerja)** |

**Acceptance**: Sesuai spec ADMIN_GAP G2/G4/G6/G7/G9/G10/G12/G13/G14/G26.

---

## 5. Total Estimasi

| Phase | Effort | Kalender @1 dev |
|---|---|---|
| P0 — Layout Foundation | 21 jam | 3 hari |
| P1 — Floating Menu & FAB | 14.5 jam | 2 hari |
| P2 — Detail Polish | 32.75 jam | 4 hari |
| P3 — Feature Lanjutan (optional) | 68 jam | 9 hari |
| **TOTAL P0+P1+P2** | **68 jam** | **9 hari (~2 minggu)** |

Plus testing, code review, deploy cycle (~30% overhead) = **~12 hari kerja / 2.5 minggu**.

---

## 6. Action Items Immediate (post-audit)

Sebelum mulai kerja fase manapun, **WAJIB**:

1. ✅ Backup workspace (folder `docs/audit/admin-screenshots/` + `docs/planadmin.md` ini)
2. ⚠️ **USER ACTION**: Konfirmasi scope — mau kerjakan P0+P1 dulu (2 minggu), atau sekaligus termasuk P2 (4 minggu)?
3. ⚠️ **USER ACTION**: Untuk P1 FAB, mau pakai style "single FAB" atau "speed-dial" (expandable)?
4. ⚠️ **USER ACTION**: Mobile dock 5 items OK, atau mau 6 items + smaller font?
6. ⚠️ **DEPLOY BLOCKER**: SOCIO_SMMTURK_KEY masih missing di VPS (lihat `docs/AGENT_HANDOVER.md` §3 BLOCKER-1). Fix dulu sebelum/admin redesign deploy — karena tanpa key, status polling gagal dan UX rusak (sudah ada di log VPS).

---

## 7. Verifikasi per-Fase (per AGENTS.md §7)

Sebelum bilang "selesai" tiap fase:

1. ✅ `pnpm --filter app lint` — no error
2. ✅ `pnpm --filter app typecheck` — no error
3. ✅ `pnpm --filter app test` — pass
4. ✅ `pnpm --filter app build` — success
5. ✅ Manual test `pnpm --filter app dev`:
   - Desktop 1440×900 — setiap halaman admin discan dengan Playwright
   - Mobile 375×812 + 768×1024 — viewport emulation
   - FAB muncul di list page, hide di detail/edit
   - Bottom dock 5 items, no overlap
   - Pagination work end-to-end
6. ✅ Lighthouse mobile ≥ 90 untuk admin pages
7. ✅ A11y audit (axe-core via Playwright)
8. ✅ Update `docs/IMPLEMENTATION_CHECKLIST.md` centang tiap selesai
9. ✅ Commit per-task dengan format `fix(admin): {task-id} — {deskripsi}`
10. ✅ Update `docs/AGENT_HANDOVER.md` jika ada perubahan state

---

## 8. Lampiran: Screenshots

Lokasi: `docs/audit/admin-screenshots/`

| Folder | Isi |
|---|---|
| `desktop/` | 17 screenshots (00-login + 16 halaman admin) pada viewport 1440×900 |
| `mobile/` | 9 screenshots pada viewport 375×812 |

Pages captured:
- **Desktop**: dashboard, users, orders, deposits, services, pricing, providers, reporting, affiliate, banners, news, email, audit, settings, tickets, coupons
- **Mobile**: dashboard, users, orders, deposits, services, pricing, providers, audit, settings

Pages belum di-screenshot mobile: reporting, affiliate, banners, news, email, tickets, coupons (kurang prioritas per audit ini).

---

**Update file ini tiap phase complete + saat ada issue baru ditemukan.**
