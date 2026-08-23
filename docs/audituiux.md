# Audit UI/UX — Socio.id Rebuild (User App + Admin)

> Method: Playwright (Chrome headless local) — 48 full-page screenshots (mobile 360×640 + desktop 1440×900, user & admin, saved di `.tmp_a` luar repo) + DOM audit 33 halaman (tap targets, a11y labels, headings, overflow) + code review terhadap shell/komponen. Sesi audit: 23 Agt 2026.
>
> Kriteria mana yang "harus bagus": **repeat flow** (user pesan lagi dalam <1 menit) adalah north star SMM panel. Semua improvement diranking prioritas terhadap itu.

---

## TL;DR — kondisi

**Fondasi sudah bagus** (jangan dirusak): bottom dock mobile dengan active-indicator + haptic + safe-bottom, FAB `+` untuk repeat, SaldoHero, sheet pattern konsisten, toast+ConfirmDialog di semua aksi destruktif, layout admin responsive (table desktop / cards mobile). Icon system single source (Icon.svelte, stroke-based).

**Gap prioritas (yang paling ngaruh ke repeat flow):**
1. Rapid reorder harus 1-tap dari Pesanan/detail, bukan 2-3 tap (sekarang `repeatOrder()` sudah prefill ke `/pesan`, tapi entry point masih tersembunyi di sheet).
2. Favorit aktif tapi tidak tersurface — user ga bisa pesan lagi dari favorit tanpa mencari-cari di `/pesan`.
3. Mobile menu "Lainnya" (Layanan, Affiliate, Akun, Notifikas, Logout) cuma 4-item dock — Layanan justru paling penting buat repeat, tapi harus lewat sheet.

---

## 1. Findings — User App

### 1.1 Mobile (prioritas)

| # | Finding | Evidence | Severity |
|---|---|---|---|
| U1 | Bottom dock 4-item tidak ada **Layanan**, padahal itu entry utama repeat order. User harus buka sheet untuk sampai ke katalog. | `(app)/+layout.svelte:10-15` navItems = Home/Pesanan/Saldo/Tiket | 🔴 high |
| U2 | FAB `+` (bottom 88px right) overlap dengan bottom dock saat konten pendek — aman secara posisi tapi tidak ber-span untuk menghindari double tap di area menyentuh. | `Fab.svelte:20` `bottom-[88px]`, `BottomNav` h-16 | 🟡 med |
| U3 | Tap targets kecil: icon-btn favorite 32×32 (`h-8 w-8`), footer link 16px tinggi, sidebar "Keluar" 32px. Standard iOS/Android min 44px. | DOM audit `/layanan`: `32x32 Tambah ke favorit`, `/` desktop `32x32 Keluar` | 🟡 med |
| U4 | Favorit di-save ke DB tapi tidak dipakai di dashboard/Pesan. `saved_links` ada di DB tapi hanya muncul di `/pesan` sebagai helper kecil "Simpan link untuk pesan lagi nanti". | grep `savedLinks` hanya di `pesan/+page.svelte:331` | 🔴 high (hilang fitur repeat) |
| U5 | Repeat order butuh 3 tap: Pesanan → tap row → sheet → "Pesan lagi". Flow harus <2 tap. | `pesanan/+page.svelte:91` repeatOrder di sheet | 🔴 high |
| U6 | `jumlah` di `/pesan` meminjam browser `input=search` spin buttons di desktop — tidak konsisten dengan design system (radius-sm, step-style). | code review /pesan | 🟢 low |
| U7 | Tidak ada dark mode (0 `dark:` variant, 0 class hook). Nice-to-have, bukan M3 blocker. | `app.css` grep `darkMode\|@custom-variant` = 0 hits | 🟢 low (defer M6) |
| U8 | Tidak ada skeleton/loading states for data-heavy pages (Pesanan/layanan list). First paint langsung tanpa shimmer. | grep `animate-pulse\|skeleton` = 0 | 🟡 med |
| U9 | Header mobile tanpa profil shortcut — hanya logo + notif. User ganti akun / logout harus ke Akun. | `+layout.svelte` header = logo+bell only | 🟢 low |

### 1.2 Desktop

| # | Finding | Evidence | Severity |
|---|---|---|---|
| U10 | Sidebar desktop dengan section "Menu"/"Lainnya" — bagus, tapi page title di header breadcrumb kadang duplicate dengan H1 halaman. | structure extract: `header w=0 h=0` (sticky) + h1 di main | 🟢 low |
| U11 | Topbar height 36px untuk "Top up saldo" + avatar — avatar tap target 36×36 (<44px ideal). | DOM audit desktop: `36x36 Top up saldo` | 🟢 low |

---

## 2. Findings — Admin

| # | Finding | Evidence | Severity |
|---|---|---|---|
| A1 | Bottom dock mobile 6 kolom — cukup bagus, tapi badge/balance display tidak pakai view apiuilias (floating dock sudah ada active bg-primary-50, text-primary-700, cukup). | admin `+layout.svelte:126-139` | OK |
| A2 | Dropdown select untuk dropdown jangkauan level (Member/Agen/Reseller/Blacklist/Admin) tanpa label di admin/users modal. | DOM audit `/admin/users` 4 inputs without label | 🟡 med |
| A3 | Checkbox bulk select rows `13x13` — tap target jauh di bawah 44px. Harus pakai row-tap atau padding the full cell. | DOM audit `/admin/users`: `13x13 Pilih user` | 🟡 med |
| A4 | `ADMIN` module toolbar (Sync/Tes/Edit) button height 34px (<44px). | DOM audit `/admin/providers`: `89x34 Sync/Tes/Edit` | 🟢 low |
| A5 | Table desktop + cards mobile sudah konsisten di semua modul ✓ — tidak ada catatan. | code verify | OK |
| A6 | Audit log list tidak ada filter by action type — dapat 100+ rows tanpa narrowing. | code review admin/audit | 🟢 low |
| A7 | Admin page titles missing `<title>` — 10 admin pages tanpa `<title>` (users, deposits, orders, pricing, providers, reporting, services, settings, tickets). | `grep -L "<title>"` | 🟡 med (SEO-lite, tapi mostly tab label UX) |

---

## 3. Repeat-Flow assessment (north star SMM)

**Goal:** user buka app → repeat order last service in <60 seconds.

| Path | Taps saat ini | Target |
|---|---|---|
| Repeat last order | Saldo FAB → Sheet → menguntungkan = 2 if sheet quick last, tapi tidak ada preferensi "last order". | 1 tap (Direct dari Pesanan row action) |
| Reorder from Pesanan row | 3 (row → sheet → Keuntungan) | 2 (quick action di kartu, tanpa sheet) |
| Repeat dari Favorit | Tidak tersedia | 2 (Dashboard/Favorit tab → Pesan) |

**Verdict:** modern features tersedia (FAB, saved_links, repeatOrder prefill) tapi tidak tersambung jadi 1-tap repeat. Yang perlu difix: surface "Pesan lagi" di top of Pesanan list + favorite section di dashboard.

---

## 4. Phased Improvements

### Phase 1 — Quick wins, no back-end change ✅ DONE (23 Agt 2026)

| Item | Status |
|---|---|
| P1.1 Bottom dock mobile jadi 5 item — **Layanan masuk dock** (repeat flow 1 tap) | ✅ verified: 5 items, hit area 145×55 |
| P1.2 Quick-action "Pesan ulang" di setiap kartu Pesanan (44×44, tanpa buka sheet) | ✅ verified: 30 button, 0 nested, 44×44 |
| P1.3 Tap targets <44px difix: favorite star → 44 hit area, sidebar logout & top-up → h-11 w-11, footer link padding, admin checkbox → label 44×44 | ✅ verified: min checkbox label 44×44 |
| P1.4 `<title>` di 10 admin pages | ✅ "Users — Admin Socio.id" dkk |
| P1.5 Focus-visible rings: BottomNav, sidebar admin nav, logout button | ✅ |

### Phase 2 — Flow improvements ✅ DONE (23 Agt 2026)

| Item | Status |
|---|---|
| P2.1 Dashboard section **"Pesan Cepat"** — 4 layanan terlaris user, 1 tap → `/pesan` prefill service + link terakhir | ✅ Playwright: section render mobile+desktop, deep-link prefill verified |
| P2.2 Pesanan list: sticky "Pesan ulang" 44×44 tanpa buka sheet | ✅ done di Phase 1 (30 button, 0 nested) |
| P2.3 `/pesan`: chip saved-links di bawah field Link — klik chip preselect service + link (deep-link, bukan hanya isi link) | ✅ Playwright: chip render, deep-link + prefill verified |
| P2.4 Loading shimmer di Pesanan/List | deferred ke M4 (skeleton component baru) |

**Data temuan legacy (wajib tahu)** — repeat flow mapping tidaklah trivial:
- `orders.service_id` legacy menyimpan **provider service id lama**, dan katalog `services` pernah di-reimport (ids berubah: 41745 → 771139+, provider_service_id max 10320). Join `order.service_id = services.provider_service_id` → **hampir selalu miss**.
- Nama layanan lama mengandung **mojibake emoji** (`â›”` alih-alih `⛔`) → exact-match nama gagal untuk sebagian besar.
- Solusi 2-tahap di `+page.server.ts`: (1) join psid→provider_service_id aktif; (2) fallback **prefix-match** nama (`"Instagram Likes [..."` → strip brackets → `LIKE 'Instagram Likes%'`), tertip termurah, dedupe prefix. Verified: febian (5.779 order) → 2 quick chips aktif vs 0 dengan join naif.
- Implikasi: user yang layanannya sudah tidak ada di katalog baru melihat **<4 kartu** — itu benar, bukan bug. Kirim M4: auto-update `orders.service_id` saat sync katalog SMMturk supaya mapping pulih bertahap.
- Screenshot evidence: `docs/screenshots/phase2/` (FINAL-mobile-dashboard, FINAL-desktop-dashboard, FINAL-mobile-pesan-chips, FINAL-mobile-pesan-deeplink, deeplink-chip-prefill). Gates: lint 0 err, svelte-check 0 err, build ok.

### Phase 3 — Refinement (M5/M6) ✅ DONE 23 Agt 2026

| Item | Status |
|---|---|
| P3.1 Dark mode (0 class saat ini) — Tailwind v4 `@custom-variant dark` | ⏸ deferred ke M6 (butuh design-token pass; fondasi siap, no `dark:` class ditambah agar tidak half-baked) |
| P3.2 Email templates proper — inline → `wrapEmail()` table-based, brand header, CTA bulletproof (VML), preheader, footer | ✅ `app/src/lib/server/email.ts` — `resetPasswordEmail`/`verificationEmail` pakai template baru; no deps baru; plain-text tetap ada |
| P3.3 Admin audit filter by action-type | ✅ sudah ada sejak M3: chips `?action=` + search `?q=` di `+page.server.ts`/`+page.svelte`; verified |
| P3.4 Keyboard shortcuts admin (s focus search, j/k prev/next halaman, g h/u/o/a quick-nav, ? help) | ✅ `app/src/routes/(admin)/+layout.svelte` — `onKeydown` global + help overlay (`?`); guarded saat typing |

---

## 5. Tech-stack / visual notes

- Tailwind v4 + design tokens sudah konsisten (`ink-` scale, `primary`, `success/danger`). Tidak perlu re-token.
- Icon set stroke-based 1.75/2.25 konsisten di seluruh app — pertahankan, jangan ganti ke icon library lain.
- Haptic helper sudah dipakai luas — bagus, pertahankan tap feedback di semua button mobile.
- `view-transition-name` dipakai bagus untuk shared elements — bisa diperluas ke modal sheet di Phase 2.
- Viewport meta `viewport-fit=cover` + `safe-bottom` class sudah ada ✓.
- Reference untuk "expensive feel": strip zig-zag, hero SaldoHero sudah cukup besar. Phase 3 bisa tambah editorial typography treatment di landing (bukan app).

---

## 6. Acceptance criteria per phase

- Phase 1 done = bottom dock Layanan, repeat 2-tap, no tap-target <44 (verify dengan DOM audit script), titles, focus rings.
- Phase 2 done = favorite section di dashboard, quick Ulangi di Pesanan, saved-links chip di /pesan.
- Visual verify: re-run `capture.js` + `audit-dom.js` — bandingkan findings count sebelum/sesudah.
