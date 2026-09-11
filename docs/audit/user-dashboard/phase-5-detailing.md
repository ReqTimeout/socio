# Phase 5 — Detailing Dashboard User (audit Playwright + skill, 2026-09-09)

Metode: skill `pw-vision` (Playwright lokal) 11 halaman × 360px + database UX
`ui-ux-pro-max` (truncation guideline, keyboard guideline). Baseline SEMUA HIJAU:
HTTP 200, overflow 0, target <24px nol, console error nol, h1=1, tombol tanpa nama nol.

## Dikerjakan (commit menyusul di bawah)
1. **Nama layanan katalog full** (`ServiceCard`): `displayName()` memotong semua teks
   dari `[` (spesifikasi Max/Refill/Speed hilang → varian tak terbedakan).
   Fix: tampilkan nama penuh `line-clamp-2` (rekomendasi guideline: clamp + tetap rapi).
2. **Keyboard numerik** (`QtyStepper`, nominal custom top-up): tambah `inputmode="numeric"`
   (guideline Forms/Mobile Keyboards). Link pesan sudah `inputmode="url"`.
3. **Tiket chat UX**: auto-scroll ke pesan terbaru (bila >3 pesan) + Ctrl/Cmd+Enter
   untuk kirim + hint. Tanpa ini user scroll manual tiap buka tiket.
4. **QR pembayaran lokal** (`/saldo/qr` endpoint SVG): ganti `api.qrserver.com` pihak
   ketiga. Alasan: norek + nominal bocor ke eksternal + mati bila API down.
   SVG tajam, cache 1 jam, cap 200 char.

## Diterima apa adanya (compliant, tidak diubah)
- **t44 (11–22/halaman)**: elemen 24–44px (chip, link kecil, icon-button).
  Lolos WCAG 2.5.8 minimum 24px. Naikkan ke 44 semua = UI gemuk, tidak worth it.
- **Link inline footer** ("Buat tiket"): exempt WCAG (inline dalam kalimat).
- **Checkbox dalam label 44px + slider thumb 24px + sr-only skip-link**: pola benar.

## Backlog detailing lanjutan (belum dikerjakan)
- [ ] Dark mode audit per-halaman user (scope besar, terpisah).
- [ ] `autocomplete` di form auth (di luar dashboard user).
- [ ] Test réduksi-motion di semua animasi reveal (kode ada, belum diverifikasi device).
- [ ] Engagement email/html kosong? (tidak ada temuan — kosongkan bila muncul).
