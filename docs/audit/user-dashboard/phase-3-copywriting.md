# Phase 3 — Audit Copywriting Halaman User (2026-09-08)

Tone eksisting: Indonesia santai + jelas ("Sahabat Socio", "Terima kasih sudah percaya").
Tidak ada typo ditemukan. Temuan = kejelasan, bukan bahasa.

## Temuan + rencana microcopy

### 1. Harga satuan tanpa konteks (PESAN) — prioritas tertinggi
- Sekarang: angka `Rp43.200` tanpa unit (label `/1k` dihapus atas permintaan user yang bingung).
- Masalah: user tidak tahu itu harga 1000 pcs → kaget lihat total CTA.
- Rencana: JANGAN kembalikan "/1k". Ganti pola: **total sebagai hero**.
  - Unit price kecil + caption "Harga dasar per 1000 — total menyesuaikan jumlah".
  - CTA tetap tampil total bayar (sudah ada via `ctaWithTotal`).
  - Butuh persetujuan user untuk wording final (sensitif — user pernah bingung).

### 2. Error provider (PESAN)
- Sekarang (post-fix): "Gagal mengirim order ke provider: … Saldo dikembalikan." (502),
  "Stok provider tidak cukup untuk N (butuh ~$X)…" (400 pre-check),
  "Terjadi kesalahan… Saldo dikembalikan — coba lagi." (500 unexpected).
- Sudah jelas + menenangkan (penekanan refund). Tidak perlu ubah.

### 3. Deposit (SALDO)
- Instruksi transfer + expire + email konsisten. Reminder T-2h subject jelas.
- Saran: tambah countdown live di halaman saldo untuk deposit pending
  ("Berakhir dalam 3j 12m") — kini hanya tanggal statis. (Phase 4)

### 4. Empty states
- Beranda/pesanan/saldo punya empty state ramah + CTA. Tiket/notif standar.
- Saran: empty pesanan tampilkan 3 layanan populer (cross-sell). (Phase 4)

### 5. Konsistensi kecil (opsional)
- "Top up" vs "Top Up" vs "Isi" — seragamkan jadi "Top Up" di semua label user.
- "Batal" (user) vs "Canceled" (sistem) — pertahankan "Batal" di UI user.

## Yang TIDAK diubah phase ini
- Semua copy error/sukses flow order-deposit (sudah jelas, berisiko bila diubah tanpa test).
