# Phase 2 — Audit Workflow Tiap Halaman User (2026-09-08)

Metode: baca `+page.server.ts` (action, ownership, query) + Playwright 11 halaman × 2 viewport
(m360/m390): semua HTTP 200, overflowX=0, console error=0.

## `/` Beranda
- Load 5 query. Banner dots 6px → FIXED hit-area 38px (`-m-2 p-2`).
- Copy OK. Tidak ada action destruktif.

## `/pesan` Order form
- Action `default`: validasi min/max → harga rules DB → kupon → deduct atomik →
  provider → insert → log → redirect. Ownership: layanan global (katalog), order milik user.
- Temuan kritis → Phase 1 (FIXED).
- Sisa minor: harga satuan tampil tanpa konteks unit (user bingung /k) → Phase 4.

## `/pesanan` Riwayat + refill/cancel
- 3 action: `refill` (hanya Success + layanan refillable + anti-duplikat Pending),
  `cancel` (hanya Pending + CAS idempotent + refund atomik), `massCancel`.
- Ownership dicek (`userId`) di semua action. ✅
- Minor: refill order `providerOrderId="0"` (legacy/manual) → provider error → `fail(500)`.
  Rencana: guard 400 "order ini tidak bisa refill otomatis" (Phase 4).

## `/saldo` + `/top-up` + `/riwayat`
- Top-up: min 20rb, max 10jt, max 2 pending, kode unik HMAC-signed, expire 24 jam,
  bonus 10% + instruksi email (queue). Upload bukti opsional (R2, max 2MB).
- Link "Isi"/"Semua"/"Ringkasan ›" <24px → FIXED `min-h-[24px]`.
- Riwayat: limit + filter, OK.

## `/tiket` Support
- `create/reply/close`, semua scope `user_id`. Pagination arrows 23px → FIXED 32px + aria-label.
- Copy OK.

## `/layanan` Katalog
- `toggleFav` scoped userId. Harga dari katalog (sudah markup). OK.

## `/affiliate` Komisi
- Withdraw scoped userId + status flow (Pending→Requested→Withdraw/Paid). OK, tidak diubah.

## `/akun` Profil/password/API key
- 5 action, semua `where id = locals.user.id`. Regenerate key ada konfirmasi.
- Tombol Regenerate uk. normal (Button sm). OK.

## `/notif` Notifikasi
- `read/readAll` scoped `userId`. OK.

## Pola aman yang dipakai konsisten (pertahankan)
- Ownership: `eq(x.userId, locals.user.id)` di semua query user.
- Finansial: CAS (`affectedRows`), tanpa read-then-write.
- Rate-limit: admin ada; user-submit mengandalkan deduct atomik (cukup).
