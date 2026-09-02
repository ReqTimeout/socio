# Setup SMMturk — Provider SMM Panel

> Tujuan: kasih app kemampuan order SMM (Instagram followers, TikTok views, dll) lewat
> provider SMMturk. Endpoint `https://smmturk.org/api/v2` sudah ke-set; tinggal API key.

## Kenapa SMMturk?

- 8185 layanan (vs kompetitor ~3000), harga kompetitif untuk pasar ID
- Auto-Fill, drip-feed, refill support
- API response time <1 detik (cron poll tiap 1 menit jalan smooth)
- Saldo + service catalog dicek via `packages/core/src/smmturk.ts`

## Langkah

### 1. Register / Login SMMturk

- Buka <https://smmturk.org>
- **Sign Up** (kanan atas) — pakai email + password
- Konfirmasi email (cek inbox / spam)

### 2. Top-up saldo (WAJIB)

⚠️ Saldo $0 = order gagal "Insufficient funds". Test order paling murah ~$0.05/layanan.

- Login → **Add Funds** (sidebar)
- Pilih metode (saldo minimum untuk test ~$5 cukup):
  - **Crypto**: BTC / ETH / USDT-TRC20 → instant
  - **Perfect Money** → instant
  - **Bank transfer** Turkey (kalau ada akses) → 1-24 jam manual
- **Catatan**: SMMturk bukan payment gateway Indonesia, jadi ga ada QRIS/VA lokal.
  Rekomendasi: pakai Binance → withdraw USDT-TRC20 → top-up via address TRC20 mereka.

### 3. Get API key

- Login → klik avatar/profile → tab **API**
- Klik **Generate New API Key**
- Copy key (format: string acak panjang, misal `a1b2c3d4e5f6...`)
- ⚠️ JANGAN share. Simpan di password manager.

### 4. (Opsional) Whitelist IP

- Di halaman API, tambah IP server baru: `130.254.47.93`
- Kalau ga di-whitelist, API key works dari IP manapun (default). Tambah whitelist kalau paranoid.

## Paste ke Coolify

| Key | Value |
|---|---|
| `SOCIO_SMMTURK_KEY` | `<api_key>` dari step 3 |
| `SOCIO_SMMTURK_URL` | `https://smmturk.org/api/v2` (sudah ke-set) |
| `SOCIO_USD_TO_IDR` | `16000` (sudah ke-set; kurs kasar, update kalau perlu) |

`SOCIO_USD_TO_IDR` adalah **markup fallback** untuk hitung harga IDR dari USD-provider.
Lebih ideal: pakai pricing_rules per level (`packages/db/src/schema/pricingRules.ts`).
Untuk sekarang single rate dipakai semua user.

## Verifikasi

```bash
ssh root@130.254.47.93
docker logs <container-app> 2>&1 | grep -i smmturk
```

Expected setelah cron jalan (tiap 1 menit):
- `[cron] status-polling provider N status: Pending → Processing`
- "Invalid API key" error **hilang**

Test dari UI:
1. Login <https://app.socio.id/pesan>
2. Pilih layanan (misal "Instagram Followers")
3. Submit order — order masuk `orders` table dengan `provider_order_id`
4. Tunggu 1-2 menit — status harus update (Pending → Processing → Completed)

## Troubleshooting

| Gejala | Fix |
|---|---|
| `Invalid API key` | cek key benar (paste fresh, no spasi), cek saldo > $0 di SMMturk. |
| `Service not found` | katalog belum sync — tunggu cron jam pertama (`packages/core/src/smmturk.ts` `fetchServices`). Cek log: `[cron] provider sync: 8185 services`. |
| `Insufficient funds` saldo $0 | top-up lagi (step 2). Kalau USDT-TRC20, butuh ~5 menit confirm di blockchain. |
| Provider 7/8 error | kalem — `SOCIO_SMMTURK_KEY` cuma untuk endpoint SMMturk. Provider JAP/IRVAN/SMC punya key terpisah (legacy providers yang belum dihapus — cleanup M7+). |

## Opsional: Sync catalog manual (kalau cron belum jalan)

```bash
# Trigger sync manual (dari server)
curl -X POST http://130.254.47.93:8000/api/v1/admin/providers/sync \
  -H "Authorization: Bearer <api_token_coolify>" \
  -d '{"provider":"smmturk"}'
```
