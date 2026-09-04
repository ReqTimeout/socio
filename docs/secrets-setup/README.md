# Setup Secrets — Server Baru socio.id

> Status: 2026-09-02 (updated). Server `130.254.47.93` live di Coolify.
> Auth (signup/login), deposit manual BCA, cron, dan **email via self-hosted SMTP** jalan.
>
> Yang sudah ter-set di Coolify env (verified live di container):
> R2 storage, SMTP mail.socio.id, VAPID push, Turnstile (test keys).
> Yang masih kosong: **SMMturk API key** (order ke provider real) — manual register + top-up.

## Status per secret (2026-09-02)

| # | Secret | Status | Env di container |
|---|---|---|---|
| 1 | R2 storage | ✅ SET | `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ENDPOINT`, `R2_PUBLIC_URL` |
| 2 | SMMturk | ❌ **KOSONG** | `SOCIO_SMMTURK_KEY` belum ada — cron sync masih "Invalid API key" |
| 3 | Email | ✅ SET (self-hosted) | `SMTP_HOST=mail.socio.id`, `SMTP_PORT=587`, `SMTP_USER`, `SMTP_PASS`, `SMTP_REJECT_UNAUTH=false` |
| 4 | VAPID push | ✅ SET | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` |
| 5 | Turnstile | ⚠️ TEST KEYS | `SOCIO_TURNSTILE_SECRET/SITEKEY` = test keys (permissive). Prod keys manual. |

## Daftar guide

| # | File | Tujuan | Status |
|---|---|---|---|
| 1 | [`01-cloudflare-r2.md`](./01-cloudflare-r2.md) | Storage avatar/banner/bukti transfer (`cdn.socio.id`) | ✅ DONE |
| 2 | [`02-smmturk-api.md`](./02-smmturk-api.md) | Provider SMM (order panel nyata) | ❌ **PENDING — manual register smmturk.org + top-up USDT** |
| 3 | [`03-resend-email.md`](./03-resend-email.md) | Email verifikasi + notifikasi | ✅ **DIGANTI self-hosted SMTP** — Resend sekarang cuma fallback opsional |
| 4 | [`04-vapid-keys.md`](./04-vapid-keys.md) | Web push notif browser | ✅ DONE |
| 5 | [`05-turnstile.md`](./05-turnstile.md) | Anti-bot signup + login | ⚠️ Test keys aktif — prod keys manual |

## Email: self-hosted SMTP (bukan Resend lagi)

Primary sender sekarang **mail.socio.id** (docker-mailserver v14 di VPS sama):

- Postfix submission 587 STARTTLS + SASL auth `noreply@socio.id`
- DNS: MX, SPF, DKIM (`mail._domainkey`), DMARC strict (`p=reject`) — semua via CF API
- App: `app/src/lib/server/email.ts` — nodemailer SMTP primary, Resend fallback kalau `RESEND_API_KEY` di-set
- Verified: cron `email-queue: sent=30 failed=0`

Yang belum (opsional, hygiene deliverability):

- **PTR/rDNS** `130.254.47.93` → `mail.socio.id` — manual di Tencent Cloud console (tanpa PTR, Gmail berisiko spam)
- **CF Origin CA cert** ganti self-signed cert → setelah itu `SMTP_REJECT_UNAUTH=true`
- Resend fallback: ikut guide `03-resend-email.md` kalau mau redundancy

## Yang di-skip (tidak dipakai codebase sekarang)

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

**⚠️ Bug Coolify v4.3.14**: env yang dibuat via UI/API bisa ke-inject kosong ke container
(decrypt/unserialize bug). Kalau env kosong padahal ke-save, apply
`scripts/coolify-patches/apply-env-decrypt-fix.sh` lalu redeploy. Detail: `scripts/coolify-patches/README.md`.

## Verifikasi umum

```bash
# App live?
curl -I https://app.socio.id/

# Login endpoint jalan?
curl -X POST https://app.socio.id/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{"email":"newuser3@socio.id","password":"NewPass1234!"}'

# Env container live (harus keluar SMTP_/R2_/VAPID_ terisi)
ssh root@130.254.47.93 "docker exec \$(docker ps --format '{{.Names}}' | grep nqsj | head -1) env | grep -E 'SMTP_|R2_|VAPID_'"

# Email cron flush?
ssh root@130.254.47.93 "docker logs --tail 20 \$(docker ps --format '{{.Names}}' | grep nqsj | head -1) 2>&1 | grep email-queue"
```

## Reset kalau ada yg salah

Semua secret bisa diupdate kapanpun — re-paste di Coolify Environment → Save → restart.
Tidak perlu hapus DB atau re-deploy manual.
