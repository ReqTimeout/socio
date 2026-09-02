# Setup Cloudflare R2 — Storage untuk socio.id

> Tujuan: simpan file upload user (avatar, banner, bukti transfer BCA) di object storage murah,
> disajikan via CDN `cdn.socio.id`. Dipakai `app/src/lib/server/r2.ts:8`.

## Kenapa R2 (bukan S3 biasa)?

- Free tier 10 GB/bulan + **free egress** (bandwidth publik gratis — beda S3/AWS)
- S3-compatible → AWS SDK v3 jalan tanpa modif
- Akun `socio.id` sudah ada di Cloudflare (Account ID `0298214d1069f75436f490b51ea4763e`,
  lihat `accountcf.md`), tinggal bikin bucket + token API

## Langkah

### 1. Login Cloudflare dashboard

- Akun: `socio.id` (Account ID di `accountcf.md`)
- <https://dash.cloudflare.com/>

### 2. Buka R2 → Overview

- Klik **R2** di sidebar kiri
- Kalau **Pay-as-you-go** belum diaktifkan, klik **Set up payment** →
  masukin kartu (isi $0 — R2 free sampai 10 GB/bulan)

### 3. Create bucket

- Klik **Create bucket**
- Name: **`socio`** (lowercase, no underscore)
- Location: **Automatic** (recommended)
- Klik **Create bucket**

### 4. Setup public domain `cdn.socio.id`

- Klik bucket `socio` → tab **Settings**
- Scroll ke **Public access**
- Klik **Connect domain** → ketik `cdn.socio.id` → klik **Connect**
- Cloudflare otomatis add CNAME record ke zone `socio.id` (no manual DNS needed)
- Verifikasi:
  ```bash
  dig cdn.socio.id
  # Harus resolve ke .r2.cloudflarestorage.com atau *.r2.dev
  ```

### 5. Generate API token (untuk app server)

- Kembali ke **R2 → Overview** → klik **Manage R2 API Tokens** (kanan atas)
- Klik **Create API Token**
  - Token name: `socio-app-prod-2026-09-02`
  - Permissions: **Object Read & Write**
  - Bucket scope: **Apply to specific buckets** → pilih `socio`
  - TTL: kosongkan (perpetual — rotate manual)
- Klik **Create API Token**
- ⚠️ **Copy IMMEDIATELY** — page ditutup, secret key hilang
- Simpan di password manager (1Password/Bitwarden). JANGAN commit ke git.

| Nilai | Simpan jadi env |
|---|---|
| Access Key ID | `R2_ACCESS_KEY_ID` |
| Secret Access Key | `R2_SECRET_ACCESS_KEY` |
| Endpoint | `R2_ENDPOINT` |

Endpoint value: `https://0298214d1069f75436f490b51ea4763e.r2.cloudflarestorage.com`
(sudah ke-set otomatis di Coolify, tinggal verify).

## Paste ke Coolify

| Key (di Coolify) | Value |
|---|---|
| `R2_ACCESS_KEY_ID` | Access Key ID dari step 5 |
| `R2_SECRET_ACCESS_KEY` | Secret Access Key dari step 5 |
| `R2_ENDPOINT` | `https://0298214d...r2.cloudflarestorage.com` (sudah benar, verify) |
| `R2_BUCKET` | `socio` (sudah ke-set) |
| `R2_PUBLIC_URL` | `https://cdn.socio.id` (sudah ke-set) |
| `CF_ACCOUNT_ID` | `0298214d1069f75436f490b51ea4763e` (sudah ke-set) |

⚠️ Jangan lupa `is_buildtime=false` saat tambah env baru — kalau true dan key ada di build
stage, key akan ke-baked ke dalam image Docker layer (security risk).

## Verifikasi

Setelah restart (auto via Save di Coolify):

```bash
# Public domain reachable
curl -I https://cdn.socio.id/
# Expected: 200 / 403 (no listing)

# Test upload dari UI
# Login https://app.socio.id/akun → upload foto profil
# Cek log: docker logs ... | grep -i r2
# Cek R2 dashboard → bucket 'socio' → folder 'avatars/' harus muncul file
```

## Troubleshooting

| Gejala | Fix |
|---|---|
| 403 Forbidden saat upload | cek Access Key ID / Secret (typo). |
| 404 `cdn.socio.id/avatars/x.jpg` | path upload ada di `app/src/lib/server/r2.ts:31` (key format `avatars/<userId>/<uuid>.<ext>`). |
| CORS error di browser | server upload lewat server kita, tidak butuh CORS di R2. Kalau pakai presigned URL nanti, baru perlu. |
| Quota 10 GB/bulan habis | cek "Storage Analytics" di R2 dashboard. Auto-purge old avatars via cron (M6+). |
