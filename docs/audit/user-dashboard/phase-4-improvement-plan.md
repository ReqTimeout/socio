# Phase 4 — Rencana Improvement Dashboard User (backlog prioritas)

## P0 — Sudah dikerjakan (commit bersama audit ini)
- [x] Money-safety order: try/catch + refund + pre-check saldo provider + slice link 100
- [x] Banner dots hit-area, pagination tickets, back-link/username/logo min-24px
- [x] Refill guard `providerOrderId="0"` → 400 jelas (ringan, ikut commit ini bila disetujui)

## P1 — Stabilitas uang (disarankan berikutnya)
- [ ] Job rekonsiliasi harian: `users.balance` vs Σ(`balance_logs`) vs Σ(`orders.price` belum refund)
  → alert ke `admin_notifications` bila selisih. Menutup sisa risiko Phase 1.
- [ ] Kolom `user` varchar(100) → TEXT (link panjang tidak terpotong diam-diam).
- [ ] Refill: tombol hanya render bila `providerOrderId` valid (hindari klik sia-sia).

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
