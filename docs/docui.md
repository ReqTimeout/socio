# DOCUI — Design UI Socio.id (User & Admin, Mobile & Desktop)

> **Sumber kebenaran visual:** 36 screenshot Playwright Chrome headless 23 Agt 2026 — `docs/screenshots/docui/` (390×844 mobile + 1440×900 desktop, user `febian` & admin `socioadmin`). Semua klaim di doc ini cross-check ke DOM + `packages/ui/src/tokens.css` + `app/src/app.css`. **Standout = bukan template Bootstrap SMM panel generik.**

---

## 0. TL;DR — Kenapa ini standout & nyaman di mobile

| Masalah panel SMM generik | Socio.id rebuild |
|---|---|
| Tabel Bootstrap, card chrome sama semua, badge `pill` tiap section | **Variance adalah design**: hero gradient `indigo→cyan` + inline-stat ledger + chart + swipe strips — tiap section beda pattern |
| Navigasi hamburger, 2 tap buat pesan lagi | **Bottom dock 5 (mobile) + Pesan Cepat 1 tap** — repeat order <15 detik, jempol nggak perlu stretch |
| Tap target 32px, icon-only tanpa label | **Min 44×44** di semua CTA utama (`BottomNav`, `Sidebar h-11`, `admin checkbox label`), haptic 8-12ms tiap tap |
| Polling manual / refresh | **SSE live** (`/api/sse`) — status Pesanan update tanpa refresh, badge `Live` pulse |
| Desktop doang, mobile ancur | **Mobile-first** 390px → desktop 1440px via `@socio/ui` tokens, bukan 2 codebase |

**North star:** user buka HP satu tangan di café, top-up QRIS, pesan lagi layanan yang sama dalam 1 tap — tanpa cari-cari.

---

## 1. Design Tokens — Satu sumber (`@socio/ui`)

`packages/ui/src/tokens.css` → `@theme` Tailwind v4, import di `app/src/app.css` via `@source "../../packages/ui/src"`.

### 1.1 Palette — confident indigo + energetic cyan
- **Primary:** `50 #eef2ff → 900 #312e81`, brand `600 #4f46e5` (CTA, link, icon tint)
- **Accent:** `50 #ecfeff → 700 #0e7490`, brand `500 #06b6d4` (gradient `from-primary-500 to-accent-500`)
- **Ink:** `50 #f8fafc → 900 #0f172a` (text & border scale, AA contrast di `bg-surface #ffffff`)
- **Status:** `success #16a34a`, `warning #d97706`, `danger #dc2626` + `*-soft` pastel untuk badge
- **Order status semantic:** `pending #d97706` · `progress #2563eb` · `complete #16a34a` · `canceled #dc2626` · `partial #7c3aed`
- **Dark:** `.dark` remap `ink` + `surface #0f1623`, ready tapi belum expose (M6)

### 1.2 Typography — bukan Inter generik
- **Sans:** `Plus Jakarta Sans Variable` (body 15px, base produk UI mobile)
- **Display:** `Sora Variable` (heading, hero counter, kbd)
- Scale ratio 1.2–1.25 compact, weight 400/500/600/700, mono ≤14px untuk data atom (order ID, timestamp)

### 1.3 Radius / Shadow / Motion
- Radius: `sm 6 → md 10 → lg 14 → card 24 → pill 9999`
- Shadow: `card 0 1px 2px + 0 8px 30px` / `card-hover 0 4px 12px + 0 20px 40px`
- Motion: `--ease-out-soft cubic-bezier(0.16,1,0.3,1)` (reveal 400-600ms), `--ease-out-quad` (counter, hover 150-200ms), `transform+opacity` only, `prefers-reduced-motion` respected, `view-transition-name` untuk sidebar/topbar

**Font self-host** `@fontsource-variable` — nggak pakai Google CDN (privasi + cepat). Screenshot: teks rendering crisp di 390px tanpa FOIT.

---

## 2. User — Mobile (390×844, thumb-zone first)

> Semua halaman user mobile pakai **shell yang sama**: header sticky 56px (`logo + bell`), content `max-w-7xl mx-auto px-4`, bottom dock 5 + `pb-28` safe-area, toast di atas dock.

### 2.1 Bottom dock — 5 item (P1.1 fix U1)

![user-mobile-dashboard](../docs/screenshots/docui/user-mobile-dashboard.png)

- `flex 5 kolom` (`BottomNav.svelte`), active `bg-primary-50 text-primary-700`, inactive `text-ink-500`, icon `stroke 2.25` aktif / `1.75` idle, `h-11 w-11` tap target, `min-h-[56px]` card tidak pernah <44px — **Playwright verify 5 items, 145×55 hit area**
- Item: **Beranda · Layanan · Saldo · Pesanan · Akun** — Layanan masuk dock (sebelumnya cuma di sheet) karena itu entry repeat paling sering
- Haptic `navigator.vibrate(8)` tiap tap + `active:scale-95`, `focus-visible:ring-2`

**Kenapa standout:** panel SMM lain pakai hamburger; Socio.id pakai fintech pattern (GoPay/DANA) — 1 tap ke katalog, jempol di bawah.

### 2.2 Dashboard — Pesan Cepat adalah hero repeat

- **Header greeting** `Selamat pagi, Febian ☀️` + `level Member` pill gradient `primary→accent`
- **Promo banner** `PromoBanner` (CMS `promotion_banners` → dummy fallback) — dots 6×6, swipe
- **SaldoHero** (`SaldoHero.svelte`) + quick-grid 2×2 (Pesan/Layanan/Bantuan/Affiliate) — kartu `rounded-card shadow-card`, icon gradient `from-primary-500 to-accent-500`
- **Pesan Cepat strip** (P2.1) — 2–4 kartu `min-w-[230px] min-h-[56px]`, `overflow-x-auto [scrollbar-width:none]`, icon `h-11 w-11` gradient, `1 tap → /pesan?service=X&link=lastLink` (prefill server-side). Verified febian 5.779 order → 2 kartu aktif (legacy `service_id` lama di-resolve via prefix-match `LIKE 'Instagram Likes%'`)
- **Aktivitas 7 Hari** chart + **Pesanan Terbaru** (5 item) — `StatusBadge` 7 warna, `timeAgo` tabular-nums

**Nyaman di mobile karena:** semua di atas lipatan tanpa scroll panjang, kartu Pesan Cepat swipe horizontal (kayak GoFood "Pesan lagi") — nggak perlu buka menu.

![user-mobile-pesan](../docs/screenshots/docui/user-mobile-pesan.png)
![user-mobile-pesanan](../docs/screenshots/docui/user-mobile-pesanan.png)

### 2.3 Pesan — form 1 tangan, chip Favorit

- **Kategori `Select`** searchable + **Layanan `Select`** (fetch `/pesan/services?cat=X`, `orderBy price asc`)
- **Link / Username** + **chip Favorit** horizontal scroll (`Favorit` label 10px uppercase) — klik chip `goto(/pesan?service=X&link=Y)` preselect kategori+layanan (P2.3, deep-link bukan cuma isi link)
- **QtyStepper** `h-10 w-10` ± + input, custom-comments textarea 5 baris
- **Ringkasan total** `rounded-2xl bg-ink-900 text-white` + balance check (`enough ? text-success : text-danger`)
- **Simpan link** checkbox untuk next repeat

Desktop punya aside sticky `Ringkasan` + `Ketentuan Penting` di kanan (tidak ada di mobile — hemat ruang).

### 2.4 Layanan / Pesanan — grid yang tidak bocor

- **Layanan:** search sticky `top-14` + filter `Select` kategori + sort + tab Favorit (star `h-11 w-11`), grid `grid-cols-1 sm:grid-cols-2 xl:grid-cols-3`, `ServiceCard` (`name`, `categoryName`, `price/1k`, `min/max`, `refill ♻`, `href /pesan?service=X`)
- **Pesanan:** filter chips `Semua/Pending/Proses/...` (`-mx-4 flex overflow-x-auto`), list `grid-cols-1 lg:grid-cols-2 xl:grid-cols-3`, tiap kartu ada tombol **Pesan ulang 44×44** (`refresh` 17px) tanpa buka sheet — **verified 30 tombol, 0 nested link-in-button**
- Keduanya pakai `grid-cols-1` eksplisit di mobile (tanpa ini track implicit `auto` mengembang ke 781/1080px — bug yang sudah di-fix 4c6b198)

![user-mobile-layanan](../docs/screenshots/docui/user-mobile-layanan.png) ![user-mobile-saldo-topup](../docs/screenshots/docui/user-mobile-saldo-topup.png)

### 2.5 Saldo top-up / Affiliate / Tiket / Akun

- **Top-up:** amount chips `50k/100k/...` + QRIS Midtrans, riwayat deposit
- **Affiliate:** kartu komisi + link referral + QR + Web Share, withdraw via approval queue (Pending→Requested→Paid)
- **Tiket & Akun:** form label bold 14px, input `h-11 rounded-xl border-ink-200 focus:border-accent-ink`, avatar `h-14 w-14` di Akun

---

## 3. User — Desktop (1440×900)

![user-desktop-dashboard](../docs/screenshots/docui/user-desktop-dashboard.png)
![user-desktop-layanan](../docs/screenshots/docui/user-desktop-layanan.png) ![user-desktop-pesan](../docs/screenshots/docui/user-desktop-pesan.png)

- **Layout:** `lg:flex` — sidebar `w-60` tidak ada di user (hanya admin), user desktop pakai header full + grid `lg:grid-cols-3` (saldo hero 2/3 + quick-grid 2 kolom) dan `lg:grid-cols-5` (chart 3/5 + pesanan terbaru 2/5)
- **Pesan Cepat** di desktop jadi `lg:grid lg:grid-cols-4` (bukan scroll) — 2–4 kartu `273×74` di 1440px
- **Layanan** `sm:grid-cols-2 xl:grid-cols-3` — hover `translate-y-0.5` + `shadow-card-hover`
- Semua tap target 36×36 di desktop itu **sengaja** (mouse, bukan jari) — audit `tap<44` di desktop diabaikan, yang dihitung cuma mobile

---

## 4. Admin — Mobile (390×844, dock 6 + sheet)

![admin-mobile-admin](../docs/screenshots/docui/admin-mobile-admin.png)
![admin-mobile-admin-users](../docs/screenshots/docui/admin-mobile-admin-users.png) ![admin-mobile-admin-orders](../docs/screenshots/docui/admin-mobile-admin-orders.png)

- **Topbar sticky** `Admin | @socioadmin` (compact, `lg:hidden`)
- **Bottom dock 6 kolom** (`grid-cols-6`, `gap-0.5`, `rounded-2xl border bg-surface/95 backdrop-blur`) — Home/Users/Orders/Saldo/Layanan/Harga + tombol **Lainnya** (`more_horizontal`) yang buka bottom sheet
- **Sheet Lainnya** (`slide-up 0.25s --ease-out-soft`) — Tickets/Provider/Reporting/Affiliate/Banners/Berita/Email/Audit Log/Settings + Kembali ke App + Logout, `view-transition-name: admin-sidebar/topbar`
- **Cards mobile** (bukan tabel): `rounded-2xl border bg-surface p-3.5` per row, `reveal` stagger `30-35ms`, checkbox `h-11 w-11 label` (P1.3 fix dari 13×13), bulk bar fixed `bottom-0 pb-[safe-area]`
- **Filter chips** (`-mx-1 flex overflow-x-auto [scrollbar-width:none]`) — Semua/Aktif/Nonaktif, search `rounded-full`

**Nyaman di mobile karena:** admin bisa approve deposit/tiket sambil jalan — semua aksi destruktif pakai `ConfirmDialog` + audit log, nggak perlu pinch-zoom tabel.

---

## 5. Admin — Desktop (1440×900, sidebar 60 + dense table)

![admin-desktop-admin](../docs/screenshots/docui/admin-desktop-admin.png)
![admin-desktop-admin-services](../docs/screenshots/docui/admin-desktop-admin-services.png) ![admin-desktop-admin-users](../docs/screenshots/docui/admin-desktop-admin-users.png)

- **Sidebar `w-60 shrink-0 border-r bg-surface`** — logo `shield` + `Socio.id` + nav `primaryNav` (Home/Users/Orders/Saldo/Layanan/Harga) + divider + `moreNav` (9 item) + Kembali ke App. Active `bg-ink-900 text-white`, inactive `hover:bg-ink-100`, `focus-visible:ring-2` (P1.5)
- **Main `min-w-0 flex-1 p-8`** — `min-w-0` fix flex `min-width:auto` yang sebelumnya bikin tabel 22kpx melebar
- **Tabel desktop `table-fixed w-full`** dengan lebar kolom eksplisit (`w-10` checkbox, `w-20` ID, `w-40` Kategori, Layanan flex, `w-28` Harga/Provider, `w-20` Status, `w-28` Aksi) + `truncate` di kategori/layanan — **verified tdMax 702px, docW 1280px** (sebelumnya 15.824px / 22.295px)
- **Audit Log** (`/admin/audit`) — search `Cari action/entity/admin/IP…` + chips per action (`count` badge), list `space-y-2` card `rounded-2xl`, detail `flex-wrap gap-x-3` + pagination `rel=next/prev`
- **Keyboard shortcuts (P3.4):** `s`/`/` fokus search, `j`/`k` next/prev halaman, `g h/u/o/a` quick-nav, `?` help overlay, `Esc` tutup sheet/blur — guarded saat typing

---

## 6. Components — inventory yang dipakai di screenshot

| Komponen (`packages/ui`) | Pakai di | Standout detail |
|---|---|---|
| `BottomNav` / `Sidebar` | user & admin shell | 5 vs 6 kolom, `safe-area-inset-bottom`, haptic |
| `SaldoHero` | dashboard | animated counter `tweened`, trend sparkline |
| `ServiceCard` | layanan | harga `price/1k`, `min/max`, `refill ♻`, `truncate` |
| `StatusBadge` | pesanan, admin orders | 7 warna mapping `status-pending/progress/...` |
| `Select` | pesan, layanan filter, admin users | searchable, `focus-visible:ring`, `min-h 44` mobile |
| `QtyStepper` | pesan | `h-10 w-10` ±, `active:scale-90`, realtime total `computePrice` |
| `Sheet` | pesanan detail, admin Lainnya | drag handle `w-10 h-1 bg-ink-200`, `backdrop-blur` |
| `ConfirmDialog` | admin users/orders/providers | G30 — semua aksi destruktif |
| `Chart` | dashboard (7 hari), admin reporting | `Chart.svelte` 190px, `hasActivity` empty state |
| `PromoBanner` | dashboard | CMS `promotion_banners` → dummy, dots `w-6/w-1.5 bg-white` |
| `Icon` | everywhere | stroke `1.75` idle / `2.25` active, single source |

---

## 7. Interaksi & Aksesibilitas — yang bikin nyaman

- **Haptic:** `navigator.vibrate(8-12)` di semua CTA primary, FAB, BottomNav, checkbox — gate `prefers-reduced-motion`
- **Motion:** `staggerIn` (`y 6-12, step 30-60ms`), `fly`, `reveal --d` — cuma `transform+opacity`, nggak ada layout thrash
- **Focus:** `focus-visible:outline-none ring-2 ring-primary/40 ring-inset` di dock + sidebar + logout + top-up (P1.5)
- **Tap target:** audit ulang 23 Agt — mobile `min 44×44` di semua CTA utama, admin checkbox dibungkus label `h-11 w-11`, footer link `px-2 py-1.5`
- **Overflow:** semua `grid` mobile pakai `grid-cols-1` eksplisit (`minmax(0,1fr)`) + `overflow-x-auto [scrollbar-width:none]` untuk strip — nggak ada `docW > clientW` lagi (verified 360/360, 1280/1280)
- **SSE:** `EventSource /api/sse` → `order_update` → `orders = orders.map(...)` + `haptic(12)` kalau sheet detail terbuka
- **Shortcuts admin:** `?` overlay ada `kbd` style `border bg-ink-50 px-1.5`

---

## 8. Screenshot index — buka langsung untuk cek visual

> Path relatif dari `docs/` → `screenshots/docui/`. File ada lokal (gitignored via `docs/screenshots/`), tapi 100% fresh dari `localhost:3000` 23 Agt 2026.

**User mobile:** `user-mobile-dashboard.png` · `user-mobile-pesan.png` · `user-mobile-pesanan.png` · `user-mobile-layanan.png` · `user-mobile-saldo-topup.png` · `user-mobile-affiliate.png` · `user-mobile-tiket.png` · `user-mobile-akun.png`

**User desktop:** `user-desktop-dashboard.png` · `user-desktop-pesan.png` · `user-desktop-pesanan.png` · `user-desktop-layanan.png` · ...

**Admin mobile:** `admin-mobile-admin.png` · `admin-mobile-admin-users.png` · `admin-mobile-admin-orders.png` · `admin-mobile-admin-services.png` · `admin-mobile-admin-providers.png` · `admin-mobile-admin-audit.png` · ...

**Admin desktop:** `admin-desktop-admin.png` · `admin-desktop-admin-users.png` · `admin-desktop-admin-services.png` · `admin-desktop-admin-audit.png` · ...

*Full 36 file di `docs/screenshots/docui/` — tiap perbaikan Phase 1-3 sudah ter-capture (dock 5, Pesan Cepat strip, chip Favorit deep-link, `table-fixed` services, `min-w-0` main, help overlay `?`).*

---

## 9. Apa yang sengaja TIDAK di-“standout”-in (biar nggak norak)

- Nggak ada `pill` eyebrow tiap section (cuma 1 di hero kalau perlu)
- Nggak ada 3-tier pricing card generik (pakai real table `pricing` di admin, inline-stat di user)
- Nggak ada 4-col stat strip (pakai `inline-stat` ledger di dashboard)
- Nggak ada card chrome sama di >2 section — variance adalah design (hero gradient, ledger stat, chart card, swipe strip)
- Nggak pakai `Inter` — `Plus Jakarta Sans` + `Sora` yang dipakai

> Doc ini auto-generated dari screenshot + DOM audit + `tokens.css` 23 Agt 2026. Kalau ada yang terasa kurang nyaman di HP kamu, screenshot + sebut path (`/pesan`, `/admin/users` mobile, dll) — gue fix langsung.
