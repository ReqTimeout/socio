# Phase 1 — KRITIS: 500 Saat Submit Order (FIXED, deploy bersama audit ini)

## Laporan user
Klik submit di `/pesan` → halaman 500 error. Tidak ada order tercatat.

## Root cause analysis (tanpa test order real)
Audit kode `pesan/+page.server.ts` (action `default`):

1. **Saldo di-deduct DULU (line 228), proteksi refund HANYA di 1 jalur** (provider return `{error}`).
   Semua `throw` lain setelah deduct = uang hilang + halaman 500:
   - `consumeCoupon()` throw (DB hiccup) → charged, no refund, 500.
   - `db.select().from(provider)` throw (di `sendToProvider`, di LUAR try/catch) → charged, no refund, 500.
   - `db.insert(orders)` throw SETELAH provider ter-charge (constraint/strict-mode) → charged 2×, no order row, 500.
   - `db.insert(balanceLogs)` / `savedLinks` throw → charged + provider charged, 500 walau order tercipta.
2. **Tidak ada pre-check saldo provider.** Saldo provider saat itu $3.88 (sekarang $1.95).
   Order di atas saldo → provider error → `fail(500)` (status code salah untuk business error).
3. **`user: link.slice` tidak ada** — `user` varchar(100) + strict mode = 500 untuk link >100 char (URL TikTok/YouTube berparameter bisa lewat).

## Fix (commit bersama file ini)
- `app/src/routes/(app)/pesan/+page.server.ts`:
  - Pre-check: estimasi modal USD = `(priceApi - profitAgen) / USD_TO_IDR × qty/1000` vs `provider.balance_provider` (cached hourly, tanpa API call tambahan) → `fail(400)` pesan jelas bila kurang.
  - Seluruh blok provider-send + insert + log dalam **satu try/catch dengan refund best-effort** (balance + lepas kuota kupon). Redirect sukses tetap di luar try.
  - Provider error → `fail(502)` (semantik benar; toast path sama). Unexpected → `fail(500)` + pesan "saldo dikembalikan".
  - `user: link.slice(0, 100)` (strict-mode guard).

## Verifikasi (tanpa order real — uang asli)
- [ ] build + check lolos
- [ ] POST serviceId fiktif → 400 "Layanan tidak ditemukan" (action live)
- [ ] POST qty 0 → 400 min (validasi hidup)
- [ ] Hitung `orders` + balance user test SEBELUM/Sesudah probe → tidak berubah
- [ ] Skenario deduct-lalu-throw tidak mungkin lagi tanpa refund (review kode)

## Sisa risiko yang diterima
- Refund best-effort pakai `try {}` — bila DB down total saat refund, perlu rekonsiliasi manual via `balance_logs` vs `orders`. (Belum ada job rekonsiliasi — kandidat Phase 4.)
