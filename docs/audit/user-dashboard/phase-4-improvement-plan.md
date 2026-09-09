# Phase 4 — Rencana Improvement Dashboard User (backlog prioritas)

## P0 — Sudah dikerjakan (commit bersama audit ini)
- [x] Money-safety order: try/catch + refund + pre-check saldo provider + slice link 100
- [x] Banner dots hit-area, pagination tickets, back-link/username/logo min-24px
- [x] Refill guard `providerOrderId="0"` → 400 jelas (ringan, ikut commit ini bila disetujui)

## P1 — Stabilitas uang (SELESAI 2026-09-09, commit `decdfe6`)
- [x] Job rekonsiliasi harian (`cron/reconcile.ts`, 04:30, alert-only ke admin_notifications
      critical): unrefunded Error/Canceled/Partial >1 jam + saldo negatif. Verified: ok 132ms, 0 temuan.
- [x] Kolom `user` varchar(100) → TEXT (ALTER prod OK, 26030 row utuh; zero-date legacy
      butuh `SET SESSION sql_mode='ALLOW_INVALID_DATES'` saat ALTER). Verified insert 204 char.
      Bonus: ketemu + perbaiki API v1 yang tidak kirim field `user` (akan 500).
- [x] Refill guard server sudah ada; tambah UI gate (tombol hanya bila Success + refillable +
      providerOrderId valid).

## P2 — UX order (butuh persetujuan wording)
- [ ] Hero-kan TOTAL bayar di form pesan; harga satuan + caption "dasar per 1000".
- [ ] Countdown expire deposit live di halaman saldo.
- [ ] Empty pesanan + 3 layanan populer (cross-sell).
- [ ] Seragamkan "Top Up" (sekarang campur "Top up"/"Isi").

## P3 — Polish
- [ ] Skeleton loading daftar pesanan (kini flash empty-state saat hydration — lihat komentar kode line 38).
- [ ] Prefill link validation message inline (sudah ada, ujiidla di device lambat).
- [ ] Lighthouse mobile halaman `/pesan` (target ≥90).

## Estimasi
- P1: ±2 jam (1 deploy). P2: ±3 jam + review copy user. P3: ±2 jam.
- Semua P1–P3 bisa diverifikasi tanpa order real (probe 400 + Playwright + review).
