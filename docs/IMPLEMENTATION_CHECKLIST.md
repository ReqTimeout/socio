# Implementation Checklist — UI/UX Dashboard Plan

Pendamping [`UIUX_DASHBOARD_PLAN.md`](./UIUX_DASHBOARD_PLAN.md). Centang tiap issue yang sudah rampung di-commit. Tetap update file ini tiap commit supaya progress termonitor.

---

## Phase P0 — Order-blocking bugs (3)

| # | Issue | File | Commit | Date | Done |
|---|---|---|---|---|---|
| P0-01 | Top-Up "Populer" chip hardcoded → data-driven (popularity % 30d) | `saldo/top-up/+page.server.ts`, `saldo/top-up/+page.svelte` | d6b2d0c | 2026-09-03 | [x] |
| P0-02 | Top-Up wizard: 1 metode BCA → tampilkan sebagai info-card (tanpa selector dropdown) + note "E-wallet & QRIS segera" | `saldo/top-up/+page.svelte` | d6b2d0c | 2026-09-03 | [x] |
| P0-03 | Top-Up empty copy unified: "<1 menit" → "±5 menit jam kerja / ±1 jam di luar" | `saldo/top-up/+page.svelte`, `packages/core/src/copy.ts` | d6b2d0c | 2026-09-03 | [x] |

---

## Phase P1 — Bahasa & Copy (15)

| # | Issue | File | Done |
|---|---|---|---|
| P1-01 | Chip "Live" → "Aktif" | `app/src/routes/(app)/+page.svelte` | [x] |
| P1-02 | Chip "Ready" → "Siap" | `app/src/routes/(app)/+page.svelte` | [x] |
| P1-03 | Trust line "Sync tiap jam" → "Sinkron tiap menit via SSE" | `app/src/routes/(app)/+page.svelte` | [x] |
| P1-04 | "Tap — link terakhir otomatis terisi" → "Sekali sentuh, link terisi otomatis" | `app/src/routes/(app)/+page.svelte` | [x] |
| P1-05 | "tap untuk pesan lagi" → "Sentuh untuk pesan lagi" | `app/src/routes/(app)/+page.svelte`, `pesanan/+page.svelte` | [x] |
| P1-06 | Typo "Bagarkan" → "Bagikan" | `packages/core/src/copy.ts` | [x] |
| P1-07 | "Withdraw / approve" → "Penarikan / setujui" | `app/src/routes/(app)/affiliate/+page.svelte`, `affiliate/+page.server.ts` | [x] |
| P1-08 | Empty notif "Tenang aja" → "Belum ada notifikasi baru" | `packages/core/src/copy.ts` | [x] |
| P1-09 | "Mulai dari 500 rupiah" factual error → ganti / jatuh | `packages/core/src/copy.ts` | [x] |
| P1-10 | "5jt / 5ribu" → "5 juta / 5 ribu" | `app/src/routes/(app)/+page.svelte`, `saldo/top-up/+page.svelte` | [x] |
| P1-11 | "sat-set" slang → "sekali klik" | `pesanan/+page.svelte` | [x] |
| P1-12 | "10 invoice terakhir" → "10 top-up terakhir" | `saldo/top-up/+page.svelte` | [x] |
| P1-13 | "Program Account" → "Program Affiliate" (jika bukan typo) | `app/src/routes/(app)/+layout.svelte` (pageTitles) | [x] |
| P1-14 | "Mulai" terlalu pendek di mobile → "Mulai Sekarang" | `packages/core/src/copy.ts` | [x] |
| P1-15 | Empty Pesan copy dirapikan (Bahasa konsisten) | `packages/core/src/copy.ts` | [x] |

---

## Phase P2 — Icon, Layout, Contrast (7)

| # | Issue | File | Done |
|---|---|---|---|
| P2-01 | Avatar circle pakai Icon `pencil` (bukan unicode `✎`) | `akun/+page.svelte` | [x] |
| P2-02 | FAB menutup card terakhir di mobile — tambah bottom-pad konten | `(app)/+page.svelte`, semua `(app)/+page.svelte` non-pesan | [x] |
| P2-03 | Saldo Hero tanpa copy → tambah subline / sparkline mini | `saldo/SaldoHero.svelte` | [x] |
| P2-04 | Status "Error" pucat di mobile → bg-danger/15 | `packages/ui/src/components/StatusBadge.svelte` | [x] |
| P2-05 | Quick action "Buat Pesanan" duplicate dengan FAB — hapus salah satu | `(app)/+page.svelte` | [x] |
| P2-06 | Footer link overlap primary "Buat Tiket" | `AppFooter.svelte` | [x] |
| P2-07 | Live chip background ketika dark mode — cek kontras 4.5:1 | `+page.svelte` | [x] |

---

## Phase P3 — Responsive mobile/desktop (6)

| # | Issue | File | Done |
|---|---|---|---|
| P3-01 | Mobile dock FAB overlap list terakhir → padding-bottom konsisten | `(app)/+page.svelte`, `+layout.svelte` | [x] |
| P3-02 | Sidebar Saldo mini tanpa nominal → icon-only | `packages/ui/src/components/Sidebar.svelte` | [x] |
| P3-03 | Pesanan mini-summary tambah "Pesanan Berjalan" label mobile | `pesanan/+page.svelte` | [x] |
| P3-04 | Beranda stats VIP pakai typographic strip (no card) | `(app)/+page.svelte` | [x] |
| P3-05 | Pesanan Terbaru pakai ledger rows (no card border) | `(app)/+page.svelte`, `pesanan/+page.svelte` | [x] |
| P3-06 | Top Up wizard stepper visible | `saldo/top-up/+page.svelte` | [x] |

---

## Phase P4 — Empty States (4)

| # | Issue | File | Done |
|---|---|---|---|
| P4-01 | Pesan Cepat empty inline (user baru) | `(app)/+page.svelte` | [x] |
| P4-02 | Chart empty branch copy diperjelas | `(app)/+page.svelte` | [x] |
| P4-03 | Pesanan empty branch konsisten | `pesanan/+page.svelte` | [x] |
| P4-04 | Tiket empty "Berarti semuanya lancar" — tetap | (verifikasi) | [x] |

---

## Phase P5 — UX Journey (4)

| # | Issue | File | Done |
|---|---|---|---|
| P5-01 | Sidebar logout pakai ConfirmDialog (konsisten) | `packages/ui/src/components/Sidebar.svelte` | [x] |
| P5-02 | Akun Regenerate API Key + Logout pakai ConfirmDialog (bukan native) | `akun/+page.svelte` | [x] |
| P5-03 | AvatarUpload magic-bytes check | `akun/+page.server.ts` | [x] |
| P5-04 | SavedLinks chips clickable primary style | `(app)/pesan/+page.svelte` | [x] |

---

## Phase P6 — Information Architecture (3)

| # | Issue | File | Done |
|---|---|---|---|
| P6-01 | Quick action 4-item → 3-item (Top Up, Affiliate, Akun) — hapus duplikat dengan FAB | `(app)/+page.svelte` | [x] |
| P6-02 | Bottom dock 5 → 6 item (Home, Katalog, Pesan, Pesanan, Saldo, Tiket), FAB dihapus | `(app)/+layout.svelte`, `BottomNav.svelte` | [x] |
| P6-03 | "Pesan Cepat" inline carousel di Beranda (1-tap reorder FAB behavior) | `(app)/+page.svelte` | [x] |

---

## Phase P7 — Visual Identity (looks-expensive)

| # | Issue | File | Done |
|---|---|---|---|
| P7-01 | Anti-tell audit: tidak ada bullet > 3 / eyebrow pill > 0 / card > 2 — lihat §Audit Summary | (semua) | [x] |
| P7-02 | Konstanta palette `bg-white/75` → token `.glass` (light+dark) | `packages/ui/src/tokens.css`, `primitives.css`, `BottomNav.svelte`, `(admin)/+layout.svelte` | [x] |
| P7-03 | Number `tnum` + `lnum` global di `:root` (numeric lock untuk saldo/totals/qty) | `packages/ui/src/primitives.css` | [x] |

---

## Phase P8 — Accessibility / Motion / Polish (4)

| # | Issue | File | Done |
|---|---|---|---|
| P8-01 | Tombol icon-only `aria-label` di BottomNav, Sidebar, Sheet, ConfirmDialog, NotifBell, Fab | (audit) | [x] |
| P8-02 | `prefers-reduced-motion`: semua animasi zero-animation (kecuali `.fab-premium`, `.saldo-hero`) | `theme.css`, `primitives.css`, seluruh animasi komponen | [x] |
| P8-03 | Focus trap di Sheet + ConfirmDialog (Tab cycle, Escape close, restore focus on close) + `aria-labelledby/describedby` | `packages/ui/src/components/Sheet.svelte`, `ConfirmDialog.svelte` | [x] |
| P8-04 | Back button browser (popstate) ke `/akun` dari `/saldo` — handled SvelteKit default, verified di phase P3 | — | [x] |

---

## Audit Summary (4 Sep 2026)

| Phase | Issues | Done | % | Catatan |
|---|---|---|---|---|
| P0 — Bugs | 3 | 3 | 100% | closed commit d6b2d0c |
| P1 — Copy | 15 | 15 | 100% | closed |
| P2 — Icon/Layout/Contrast | 7 | 7 | 100% | closed |
| P3 — Responsive | 6 | 6 | 100% | closed |
| P4 — Empty states | 4 | 4 | 100% | closed |
| P5 — UX journey | 4 | 4 | 100% | closed |
| P6 — Info architecture | 3 | 3 | 100% | closed (audit 4 Sep 2026) |
| P7 — Visual identity | 3 | 3 | 100% | closed (audit 4 Sep 2026) |
| P8 — A11y/Motion | 4 | 4 | 100% | closed (audit 4 Sep 2026) |
| **TOTAL** | **49** | **49** | **100%** | — |

**Tech stack additions** — lihat §Tech Stack Audit di bawah.

---

## Beranda fokus batch 1 (high-impact, low-effort)

Dipilih yang paling kelihatan, butuh effort kecil:

- [x] (P1-01, 02, 03) Chip "Live/Ready/Sync" → Indonesian di Beranda
- [x] (P1-10) "5jt" → "5 juta"
- [x] (P2-04) Status "Error" chip pucat — stronger danger bg
- [x] (P3-04) Stats VIP jadi typographic strip (no card)
- [x] (P3-05) Pesanan Terbaru jadi ledger
- [x] (P4-01) Pesan Cepat empty inline
- [x] (P6-01) Quick action 4→3 (hapus duplikat)
- [x] (P6-02) Bottom dock 5→6 add Pesan, hapus FAB

---

## Tech Stack Audit (4 Sep 2026)

### Stack aktif (sudah cukup untuk audit visual + dashboard)

| Layer | Tool | Versi | Catatan |
|---|---|---|---|
| Framework | SvelteKit + adapter-node | 2.8.1 | Adapter `node` untuk Coolify VPS Jakarta |
| Component | Svelte 5 (runes) | 5.2.7 | `$state`, `$derived`, `$props`, `$effect`, `$bindable` |
| Styling | Tailwind v4 + `@theme` tokens | 4.1.0 | Custom tokens di `packages/ui/src/tokens.css` |
| Motion | `motion` (motion-v) | 13.1.1 | Untuk NumberFlow, dock bounce, FAB pop |
| DB | Drizzle ORM + MySQL/TiDB | 0.45.2 | Prepared statement, tidak ada raw concat |
| Auth | better-auth | 1.2.7 | + bcryptjs (kompatibel PHP hash) |
| Icon | Custom feather-style SVG | — | Stroke 1.75–2px, no emoji structural |
| Font | Plus Jakarta Sans Variable + Sora | 5.3.0 | Self-host via `@fontsource-variable/*` |
| Validation | zod | 4.4.3 | |
| Email | Resend + nodemailer | 6.17.2 / 9.1.1 | |
| Cron | node-cron | 3.0.3 | DB-backed queue, no Redis |
| Push | web-push (VAPID) | 3.6.7 | |
| Object storage | AWS SDK v3 + R2 | 3.1088.0 | Cloudflare R2 S3-compatible |
| QR | qrcode | 1.5.4 | |

### Rekomendasi tambahan (prioritas)

1. **`vitest` + `@vitest/ui`** — unit test `packages/core/src/pricing.ts`, `smmturk.ts`, `packages/ui/src/lib/*.ts`. Effort ~1 hari setup + test pola Svelte 5 component.
2. **`@axe-core/playwright`** — a11y audit otomasi di CI. Effort ~½ hari.
3. **`tailwind-variants`** (opsional) — type-safe `variants()` untuk komponen multi-state. Saat ini pakai `Record<string, string>` manual; gantikan kalau Card+Button refactor besar.
4. **`clsx` + `tailwind-merge`** (opsional) — `cn()` helper. Saat ini Svelte template langsung; tambahkan kalau conditional class mulai banyak (>5 kondisi per komponen).
5. **`@number-flow/svelte`** (rejected) — direferensikan DESIGN.md §A.5; sudah di-rolling manual pakai `motion@13` di `NumberFlow.svelte`. Tidak perlu dependency tambahan.

### Skill referensi untuk dev (4 Sep 2026)

| Skill | Untuk apa |
|---|---|
| `web-design-reviewer` | Audit visual live + identifikasi layout/responsive/a11y issue |
| `anti-ui-slop` | Anti-pattern audit + design contract + finish gate (P7-01) |
| `design-web` | OKLCH palette, motion language, editorial typography |
| `premium-frontend-ui` | Immersive motion + architecture craftsmanship |
| `copywriting-indonesia` | Tone Indonesia natural (copywriting skill untuk travel — adapt untuk SMM) |
| `seo-marketing` | Meta tag, JSON-LD schema (untuk landing) |
| `cloudflare-pages-static-deploy` | Deploy landing ke CF Pages |
| `workers-best-practices` + `wrangler` | Kalau perlu Worker untuk SEO injection |

> Catatan: `DESIGN.md` §A.0 merujuk skill `looks-expensive`, `web-design-guidelines`, `ui-ux-pro-max`, `theming-components` yang **tidak ada** di workspace saat ini. Mapping fungsional: gunakan `anti-ui-slop` (untuk looks-expensive anti-tell) + `web-design-reviewer` (untuk web-design-guidelines) + `design-web` (untuk OKLCH/motion) + `premium-frontend-ui` (untuk ui-ux-pro-max).

---

## Notes & blockers

- (track di sini setiap ketemu new issue saat implementasi)
