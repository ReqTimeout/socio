# Socio Whitelabel Starter Kit

Panel reseller siap jalan yang bisa kamu brand sendiri. Panel ini bicara ke
Socio Reseller API dari sisi server, jadi API key kamu tidak pernah sampai ke browser.

## Yang kamu dapat

- `panel.mjs` — panel Node.js single-file (tanpa dependensi, Node 18+):
  - Tampilan saldo
  - Dropdown katalog layanan (`services`)
  - Buat order (`add`) dengan dukungan retry aman via SDK
  - Cek status order (`status`)
  - Riwayat order terbaru (`orders`)
- Browser hanya memanggil proxy `/api` lokal kamu; proxy menyuntikkan key dan
  meneruskan ke Socio. White-label dengan mengganti nama dan warna aksen.

## Jalankan

```bash
SOCIO_API_KEY=key_reseller_kamu node panel.mjs
# → http://localhost:8080
```

Environment:

| Var              | Default                       | Fungsi                                       |
| ---------------- | ----------------------------- | -------------------------------------------- |
| `SOCIO_API_KEY`  | (wajib)                       | API key Reseller/Agen kamu dari app.socio.id |
| `SOCIO_API_BASE` | `https://app.socio.id/api/v1` | API upstream                                 |
| `PORT`           | `8080`                        | Port lokal                                   |
| `PANEL_NAME`     | `My SMM Panel`                | Nama brand kamu (header + title)             |
| `PANEL_ACCENT`   | `#4f46e5`                     | Warna aksen brand kamu                       |

## Checklist white-label

1. Set `PANEL_NAME` dan `PANEL_ACCENT` sesuai brand kamu.
2. Ganti markup header / tambah logo kamu di template `HTML`.
3. Deploy di domain kamu sendiri (host Node apa pun, atau container). Simpan
   `SOCIO_API_KEY` di secret/env store host — jangan pernah di kode client atau git.
4. Untuk produksi, tambah auth kamu sendiri di depan proxy (starter ini tidak punya)
   dan rate-limit. API Socio sendiri membatasi 60 request/menit/IP.

## Perluas

Proxy meneruskan action apa pun, jadi kamu bisa menambah panggilan `bulk_add`,
`refill`, `cancel`, `deposit`, `deposits`, `affiliate`, `set_webhook`, atau
`set_api_secret` dari frontend tanpa menyentuh server. Untuk client bertipe dan
HMAC signing, pakai SDK resmi di `../python`, `../php`, `../node`.

## Catatan keamanan

- Starter ini demonstrasi: **tidak punya autentikasi user**. Jangan ekspos publik
  apa adanya — taruh login/session kamu sendiri di depan, atau jalankan lokal.
- API key hanya dipegang sisi server. Jangan pindahkan ke browser.
- Deposit yang dibuat via API adalah **invoice pending** (transfer manual BCA);
  saldo baru dikredit setelah admin konfirmasi, persis seperti web app.
