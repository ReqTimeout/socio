# Setup Secrets — Server Baru socio.id

> Status: 2026-09-02. Server baru `130.254.47.93` sudah live di Coolify.
> Auth (signup/login), deposit manual BCA, dan cron jalan **tanpa secrets apapun** —
> deposit di-approve manual admin lewat `/admin/deposits`.
>
> Yang masih kosong: secrets untuk fitur enrich (R2 upload, SMMturk order, Resend email,
> VAPID push, Turnstile anti-bot). Auth/login SUDAH jalan tanpa ini.

## Daftar guide (urutan eksekusi)

| # | File | Tujuan | Biaya | Wajib? |
|---|---|---|---|---|
| 1 | [`01-cloudflare-r2.md`](./01-cloudflare-r2.md) | Storage avatar/banner/bukti transfer (CDN via `cdn.socio.id`) | Free 10GB/bulan | WAJIB untuk upload bukti |
| 2 | [`02-smmturk-api.md`](./02-smmturk-api.md) | Provider SMM (order panel nyata) | Bayar pakai saldo API | WAJIB untuk order create |
| 3 | [`03-resend-email.md`](./03-resend-email.md) | Email verifikasi + notifikasi order/deposit | Free 3000/bulan | WAJIB untuk kirim email |
| 4 | [`04-vapid-keys.md`](./04-vapid-keys.md) | Web push notif browser | Free | Opsional (M6+) |
| 5 | [`05-turnstile.md`](./05-turnstile.md) | Anti-bot signup + login | Free | Opsional |

Yang di-skip (tidak dipakai codebase sekarang):

- `TRIPAY_API_KEY` / `TRIPAY_PRIVATE_KEY` / `TRIPAY_MERCHANT_CODE` — variable ada di `.env.example` tapi **tidak dibaca** oleh kode; top-up cuma support `manual` BCA (`app/src/routes/(app)/saldo/top-up/+page.server.ts:68`)
- `MIDTRANS_SERVER_KEY` / `MIDTRANS_CLIENT_KEY` — di-import di `app/src/lib/server/payment.ts:26` tapi **alur disabled**; tidak ada menu otomatis di UI
- `JASAMUTASI_API_KEY` — feature tidak di-implement; webhook route tidak ada

## Cara paste ke Coolify (SEMUA env)

1. Login dashboard Coolify: <http://130.254.47.93:8000>
   - Email: `admin@socio.id`
   - Password: `SocioAdmin2026!`
2. Buka <http://130.254.47.93:8000/project/ijkli6u16adifocsc8q0fjb0/production/application/nqsjafrei6k8dkup1pxkcuwf>
3. Tab **Environment**
4. Tambah/edit tiap key sesuai guide per topik
5. Klik **Save** (otomatis restart service, ~30 detik)
   - **Catatan**: kalau env berubah tidak menyentuh Dockerfile atau labels container, cuma restart.
   - Kalau berubah label (mis. set `SOCIO_TURNSTILE_ENABLED=1` mengubah label `traefik.http.routers`),
     Coolify trigger **redeploy image** (~3-10 menit karena multi-stage pnpm rebuild).

**Toggle is_buildtime**: kalau ragu, set `is_buildtime=false` dulu. Default-nya `true` yang ngirim env
ke build step pnpm — itu bisa bikin `pnpm install` skip devDependencies kalau `NODE_ENV=production`
(VPS_DEPLOY_CHECKlist §B.1).

## Verifikasi umum

```bash
# App live?
curl -I https://app.socio.id/

# Login endpoint jalan?
curl -X POST https://app.socio.id/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{"email":"newuser3@socio.id","password":"NewPass1234!"}'

# Log app real-time (via Coolify Logs UI lebih enak)
ssh root@130.254.47.93 "docker logs -f nqsjafrei6k8dkup1pxkcuwf-\$(docker ps -a --filter label=coolify.applicationId=1 --format '{{.Names}}' | grep -v Up | head -1)"
```

## Reset kalau ada yg salah

Semua secret bisa diupdate kapanpun — re-paste di Coolify Environment → Save → restart.
Tidak perlu hapus DB atau re-deploy manual.
