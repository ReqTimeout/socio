# Audit Mobile Dashboard Admin — 2026-09-08

> Memori agent: hasil audit + fix mobile admin. Baca file ini sebelum kerja mobile admin lagi.
> Skill dipakai: `svelte`, `ui-ux-pro-max`. Verifikasi via curl HTML (model tidak bisa lihat screenshot).

## Metode
- Baca markup 22 halaman `(admin)` + layout; grep pola anti-mobile (grid-cols tanpa breakpoint, table tanpa wrapper, touch target, overflow).
- Render check: curl live HTML per halaman (HTTP status + marker konten).
- Server load: hitung db-calls + limits per `+page.server.ts`; cek interval/SSE guard.
- **Keterbatasan**: tidak ada test visual screenshot — audit berbasis struktur DOM + pola Tailwind.

## Temuan & Fix (commit `c5be570` + `3c753c0`, live)

| # | Masalah | Lokasi | Fix |
|---|---|---|---|
| 1 HIGH | Tombol ⚡ topbar mobile link ke `/admin/services` padahal label "Notifikasi sistem" — user bingung ("button aksi cepat itu apa") | `(admin)/+layout.svelte` mobile header | Jadi popover notifikasi (sama kayak desktop), `w-[calc(100vw-2rem)]` |
| 2 HIGH | Refunds: tabel 6 kolom tampil mentah di mobile (sempit, tak terbaca) | `admin/refunds/+page.svelte` | Mobile cards `ul.lg:hidden` + tabel `hidden lg:block` (pola orders/deposits) |
| 3 MED | "Aksi cepat" ambigu — 4 link generik duplikat dock | `admin/+page.svelte` | Rename "Menu cepat" + sub-info live (N pending/aktif/baru) + Audit→Tiket (lebih relevan) + min-h 56px |
| 4 MED | Badge "Live · auto-refresh 10s" kepanjangan di 360px | `admin/+page.svelte` | "Live · 10s", countdown `hidden sm:block` |
| 5 MED | Queue cards grid-cols-3 tanpa `min-w-0` (grid item bisa overflow) | `admin/+page.svelte` | + `min-w-0`, padding mobile ramping |
| 6 LOW | Tabel kategori `min-w-[800px]` paksa scroll untuk 3 kolom sederhana | `admin/services` | Hapus min-width (fluid) |
| 7 LOW | Touch target topbar 32px (< 44pt rekomendasi) | layout mobile header | 32→40px (search, zap); username truncate max-w-90px |
| 8 BUG | `/admin/health` 500: `...def` sebar fungsi `run` ke load data (tidak serializable) | `health-metrics.ts` | Helper `pub()` — hanya field serializable |

## Yang sudah OK (tidak diubah)
- Dock 4+1=5 kolom pas; bottom sheet "Lainnya" grouped; safe-area-inset OK; `main` pb-32 anti-dock.
- Semua tabel besar (orders/deposits/users/services/coupons/news/banners/affiliate) sudah pola `hidden lg:block` + cards mobile.
- Chart pakai viewBox (responsif). Filter chips `overflow-x-auto`. Empty states ada.
- Pagination limit 25 di semua list; dashboard 19 query paralel Promise.all.
- SSE `/api/admin/events` tick 8s + sig-cache; invalidate 10s skip saat SSE live + `document.hidden` guard; health/cron auto-refresh skip saat hidden.
- Cron page + backup + broadcast composer sudah mobile-first dari awal.

## Verifikasi live (2026-09-08, sesi admin injeksi)
- 22/22 halaman admin HTTP 200 (termasuk health setelah fix).
- Marker: "Menu cepat" ✓, popover ⚡ ×2 (mobile+desktop) ✓, refunds 200 ✓.
- Session test selalu cleanup (`user_agent='m-*'`).

## Aturan untuk kerja mobile berikutnya
1. Tabel baru → wajib pola `ul.lg:hidden` cards + `hidden lg:block` table (jangan table mentah).
2. Grid ≥3 kolom di mobile → tambah `min-w-0` tiap child + cek 360px.
3. Tombol ikon topbar min 40px; label aria jujur (jangan label notif tapi link ke halaman lain).
4. Data dari `load` harus serializable — jangan spread objek registry yang berisi fungsi.
5. Setiap `setInterval`/SSE harus ada `document.hidden` guard + cleanup onMount.
6. List server wajib `.limit()`; dashboard query dibungkus Promise.all.
