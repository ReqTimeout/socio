# MOBILE_UX_GUIDE.md — Screen Spec (M1.5 Phase 4)

> Per-route specification untuk app user + admin + landing. Source of truth untuk
> implementasi M2 (user app) dan M3 (admin). Audit 8 anti-pattern `looks-expensive`
> di-enforce sebelum tiap route ditandai "done" (AGENTS.md §7).

Token & primitives: `packages/ui` (DESIGN.md §1-4). Font: Plus Jakarta Sans (body) + Sora (display/number). Accent: indigo `#4f46e5` / cyan `#06b6d4`. Light-first.

---

## Global app shell (mobile)

- Header sticky 56px (judul + back + notif badge), `safe-top`.
- Content scrollable, `max-w-2xl mx-auto`, `safe-x` padding.
- Bottom nav 5: Beranda · Saldo · **[FAB Pesan]** · Pesanan · Akun.
- FAB → Sheet quick-action (Buat Pesanan · Layanan · Tiket · Affiliate).
- Hamburger kanan-atas → off-canvas (Profil, Pengaturan, Riwayat, Bantuan, Admin, Logout) dengan scroll-lock + focus-trap + Esc.
- Sticky CTA di bawah (jika ada): "Buat Pesanan" / "Top Up" / "Bayar".
- Haptic `navigator.vibrate(10)` pada tap CTA (gated reduced-motion).
- View Transition: `vt-slide-forward/back` pada `onNavigate` SvelteKit.

---

## App user — 8 screens

### 1. Dashboard `/`
- **Purpose:** cek saldo + pesanan terbaru + aksi cepat, satu tap.
- **Hero:** `SaldoHero` (animated counter, CTA Top Up). → containment: **full-bleed tinted hero** (bukan card).
- **QuickGrid 2×2:** Top Up · Pesan · Layanan · Affiliate. → containment: **icon-led grid cells** (Pattern 3 editorial rule, bukan card border).
- **Pesanan terbaru:** list 5 item `StatusBadge` warna-warni → containment: **ledger rows** (hairline, no card). Live badge "Live" pulse (domain-specific animation: status pulse).
- **Variance:** hero tinted / grid / ledger = 3 pola ✅. Max 2 card ✅.
- **Bullets:** 0. **Stats:** saldo = single hero stat (Pattern 6), bukan 4-col strip.
- **Imagery:** tidak wajib (kategori photography optional — fintech). ✅
- **States:** loading (skeleton saldo + skeleton rows), empty (EmptyState "Belum ada order"), error (inline retry).

### 2. Pesan `/pesan`
- **Purpose:** pilih layanan → isi link + qty → bayar.
- **Hero:** kategori chips horizontal scroll (Semua · IG · TT · YT · TG …). → containment: **chip rail** (bukan card).
- **Form:** ServiceCard terpilih + `Input` link + `QtyStepper` + realtime total (pricing.ts). → containment: **ledger / form rows**.
- **Sticky CTA:** "Pesan Sekarang" (hitung saldo cukup/tidak).
- **Saved links:** dropdown di Input link (reuse SavedLinks).
- **Variance:** chip / form / sticky = 3 ✅.

### 3. Layanan `/layanan`
- **Purpose:** cari + filter 6000+ layanan.
- **Search:** sticky di atas, auto-focus mobile. → containment: **sticky search bar**.
- **Filter chips:** kategori + sort (Termurah/Terlaris/Tercepat).
- **List:** `ServiceCard` infinite scroll (IntersectionObserver). Favorit toggle (star). → containment: **ledger rows**.
- **Variance:** search / chips / list = 3 ✅.

### 4. Pesanan `/pesanan`
- **Purpose:** riwayat + status live + quick reorder.
- **Filter chips:** Semua · Pending · Proses · Selesai.
- **List:** ledger rows dgn `StatusBadge`, SSE live update (status pulse = domain animation).
- **Swipe-left** → "Pesan Lagi" (Sheet pre-filled). **Long-press** → context menu (Salin Link · Detail · Tiket).
- **Detail:** Sheet bottom — timeline status + "Refill" (jika eligible).

### 5. Saldo/Top-up `/saldo/top-up`
- **Purpose:** top-up saldo via QRIS/Midtrans.
- **Amount chips:** Rp50k · 100k · 200k · 500k · custom. → containment: **chip grid**.
- **QRIS:** deep-link Midtrans Snap (QR image real `<img>` dari Midtrans). → imagery: QR adalah data, boleh `<img>` real.
- **Riwayat:** tab "Riwayat" → ledger (deposit history).
- **Pricing:** tidak ada tier → inline.

### 6. Affiliate `/affiliate`
- **Purpose:** komisi + referral.
- **Hero:** `SaldoHero`-style "Total Komisi" (counter). → tinted hero.
- **Referral:** link + QR (`qrcode` lib, `<img>` real) + Web Share API.
- **Stats:** inline-stat narrative ("X downline · RpY bulan ini"), bukan 4-col strip.
- **Withdraw:** tombol → Sheet form.

### 7. Tiket `/tiket`
- **Purpose:** bantuan.
- **List:** ledger rows (status). Buat → Sheet. Balas → Sheet.
- **Empty:** EmptyState "Belum ada tiket" + CTA buat.

### 8. Akun `/akun`
- **Purpose:** profil + settings + passkey + logout.
- **Header:** `Avatar` + nama + level badge.
- **Ledger rows:** Profil, Ganti Password, API Key (regenerate), Tema (light/dark), Passkey, Logout.
- **Passkey:** register WebAuthn (M1 sisa).

---

## Admin — 8 screens (desktop primary, mobile off-canvas)

| Screen | Layout | Containment |
|---|---|---|
| `/admin` | sidebar + stat cards + activity feed (SSE) | dense grid (ledger + table) |
| `/admin/users` | server-side filter + table + card-list mobile | **real HTML table** (Pattern 7) |
| `/admin/services` | table CRUD + kategori | table |
| `/admin/providers` | list + sync trigger + balance + log | table + ledger |
| `/admin/pricing` | markup per level | **real HTML table** (bukan 3 card) |
| `/admin/deposits` | approve/cancel table | table |
| `/admin/orders` | filter + refill/refund | table |
| `/admin/tickets` | reply/close | ledger |

**Pricing admin:** Pakai **HTML table** (Member/Agen/Reseller/Admin × markup/flat/min-profit) — BUKAN 3-tier card (anti-pattern #4). ✅

---

## Landing `socio.id` (M5, baseline haloka)

- Navbar → Hero + **OrderSimulator** (simulasi alur pesan, bukan chat WA) → TrustBadges → PainPoints (reseller SMM) → Features (6000+ layanan, auto-sync, markup, affiliate) → Tutorial (top up→pilih→status) → SocialProof → **Pricing** (Member/Agen/Reseller/Admin sebagai **table**, bukan 3 card) → FinalCTA → FAQ (accordion) → Footer.
- Sticky CTA "Daftar Gratis" → `app.socio.id/daftar`.
- **Imagery:** photography optional (SaaS). Pakai CSS mockup OrderSimulator, BUKAN gradient blob.

---

## Anti-pattern audit (enforced per route, pre-"done")

| # | Rule | Enforcement |
|---|---|---|
| 1 | ≤5 `<li>`/page | Order history/features → ledger/table |
| 2 | ≤1 eyebrow pill/page | Judul section cukup |
| 3 | ≤2 default card | Hero tinted / ledger / table / chip dominate |
| 4 | No 3-tier pricing card | Pricing → HTML table |
| 5 | No 4-col stat strip | Single hero stat / inline narrative |
| 6 | Real imagery where needed | QR/avatar real `<img>`, no gradient blob |
| 7 | ≥3 containment patterns | Hero/grid/ledger verified per screen |
| 8 | No Inter | Plus Jakarta Sans / Sora |

**AA contrast:** accent-filled (button, badge, active tab) pakai `--accent-ink` L=0.42–0.48, white text ≥4.5:1, hover DARKER. Focus ring paper on accent fill.

**Reduced-motion:** semua transform/opacity animation di-disable (primitives.css sudah handle).
