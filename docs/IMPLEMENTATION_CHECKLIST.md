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
| P4-01 | Pesan Cepat empty inline (user baru) | `(app)/+page.svelte` | [ ] |
| P4-02 | Chart empty branch copy diperjelas | `(app)/+page.svelte` | [ ] |
| P4-03 | Pesanan empty branch konsisten | `pesanan/+page.svelte` | [ ] |
| P4-04 | Tiket empty "Berarti semuanya lancar" — tetap | (verifikasi) | [ ] |

---

## Phase P5 — UX Journey (4)

| # | Issue | File | Done |
|---|---|---|---|
| P5-01 | Sidebar logout pakai ConfirmDialog (konsisten) | `packages/ui/src/components/Sidebar.svelte` | [ ] |
| P5-02 | Akun Regenerate API Key + Logout pakai ConfirmDialog (bukan native) | `akun/+page.svelte` | [ ] |
| P5-03 | AvatarUpload magic-bytes check | `akun/+page.server.ts` | [ ] |
| P5-04 | SavedLinks chips clickable primary style | `(app)/pesan/+page.svelte` | [ ] |

---

## Phase P6 — Information Architecture (3)

| # | Issue | File | Done |
|---|---|---|---|
| P6-01 | Quick action 4-item → 3-item (Top Up, Katalog, Bantuan) | `(app)/+page.svelte` | [ ] |
| P6-02 | Bottom dock 5 → 6 item (tambah "Pesan"), hapus FAB | `(app)/+layout.svelte`, `BottomNav.svelte` | [ ] |
| P6-03 | "Pesan Cepat" dipindah ke reorder FAB behavior | `(app)/+page.svelte` | [ ] |

---

## Phase P7 — Visual Identity (looks-expensive)

| # | Issue | File | Done |
|---|---|---|---|
| P7-01 | Anti-tell audit: tidak ada bullet > 3 / eyebrow pill > 0 / card > 2 | (semua) | [ ] |
| P7-02 | Konstanta palette `bg-white/75` mobile dock → token-driven | `(app)/+layout.svelte`, `BottomNav.svelte` | [ ] |
| P7-03 | Number tnum, balance-num global | `app.css` atau `tokens.css` | [ ] |

---

## Phase P8 — Accessibility / Motion / Polish (4)

| # | Issue | File | Done |
|---|---|---|---|
| P8-01 | Tombol icon-only aria-label verified | (audit) | [ ] |
| P8-02 | prefers-reduced-motion: semua animasi zero-animation | (audit) | [ ] |
| P8-03 | Focus trap di Sheet + ConfirmDialog | (audit) | [ ] |
| P8-04 | Back button browser kembali ke /akun dari /saldo | (audit) | [ ] |

---

## Beranda fokus batch 1 (high-impact, low-effort)

Dipilih yang paling kelihatan, butuh effort kecil:

- [ ] (P1-01, 02, 03) Chip "Live/Ready/Sync" → Indonesian di Beranda
- [ ] (P1-10) "5jt" → "5 juta"
- [ ] (P2-04) Status "Error" chip pucat — stronger danger bg
- [ ] (P3-04) Stats VIP jadi typographic strip (no card)
- [ ] (P3-05) Pesanan Terbaru jadi ledger
- [ ] (P4-01) Pesan Cepat empty inline
- [ ] (P6-01) Quick action 4→3 (hapus duplikat)
- [ ] (P6-02) Bottom dock 5→6 add Pesan, hapus FAB

---

## Notes & blockers

- (track di sini setiap ketemu new issue saat implementasi)
