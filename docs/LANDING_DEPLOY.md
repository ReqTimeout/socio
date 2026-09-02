# Landing Deploy Runbook — socio.id (Cloudflare Pages)

> Dokumen operasional untuk deploy landing `socio.id`. Dibuat saat cutover 2 Sep 2026.
> Kredensial TIDAK di dokumen ini — lihat `accountcf.md` (gitignored) di root repo.

## 1. Infrastruktur

| Item | Nilai |
|---|---|
| Cloudflare account (socio.id) | `0298214d1069f75436f490b51ea4763e` (lihat `accountcf.md` untuk token) |
| Zone `socio.id` | `22e8176e6577d5eee25d891747ff37e7` (active, NS jewel/carlos) |
| Pages project | `socio-id` → `socio-id.pages.dev` |
| Production branch | `main` |
| Custom domains | `socio.id`, `www.socio.id` (ter-attach ke project) |
| DNS apex | CNAME `socio.id` → `socio-id.pages.dev` (proxied) |
| DNS www | CNAME `www.socio.id` → `socio-id.pages.dev` (proxied) |
| R2 | bucket via S3 endpoint `https://0298214d…r2.cloudflarestorage.com`, creds di `accountcf.md` |

**Catatan penting**: Ada 2 akun Cloudflare yang dipakai bergantian di repo ini:
- Akun **socio.id** (`0298214d…`) — zone `socio.id`, project Pages `socio-id` (production, domain live). **INI yang dipakai untuk deploy landing.**
- Akun 3smedianet (`766dfffa…`) — OAuth wrangler default (`~/Library/Preferences/.wrangler/`), project `socio-id-er2.pages.dev` (preview duplikat, TIDAK dipakai). Jangan tertukar — nama `socio-id` sudah diambil akun socio.id, makanya akun lain dapat suffix `-er2`.

## 2. Deploy manual (wrangler direct upload)

```bash
# 1. Set env ke akun socio.id (token dari accountcf.md)
export CLOUDFLARE_API_TOKEN="<cfat_… dari accountcf.md>"
export CLOUDFLARE_ACCOUNT_ID="0298214d1069f75436f490b51ea4763e"

# 2. Build
pnpm --filter landing build

# 3. Deploy (production = branch main)
npx wrangler pages deploy landing/dist --project-name socio-id --branch main --commit-dirty=true
```

Deploy otomatis live di `socio.id` dalam ~30 detik (DNS sudah CNAME ke project, tidak perlu ubah DNS apa pun).

**Verifikasi post-deploy** (semua harus lolos):

```bash
curl -s https://socio.id | rg '<title>'                      # title landing baru
curl -sI https://socio.id | rg -i 'content-security-policy'  # headers live
curl -s -o /dev/null -w '%{http_code}' https://socio.id/sitemap-index.xml   # 200
curl -s -o /dev/null -w '%{http_code}' https://socio.id/llms.txt           # 200
```

## 3. Security headers & cache

Didefinisikan di `landing/public/_headers` (auto-deploy bersama build):

- HSTS `max-age=31536000; includeSubDomains; preload`
- `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- Permissions-Policy: camera/mic/geo/payment/usb/interest-cohort all denied
- CSP: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://app.socio.id; object-src 'none'`
  - `'unsafe-inline'` script diperlukan untuk JSON-LD + inline module; style untuk style attr. Semua font/aset self-host dari `/_astro/*`.
- Cache: `/_astro/*` → `public, max-age=31536000, immutable` (hashed filenames, safe)

## 4. Riwayat cutover (2 Sep 2026)

| Waktu (UTC) | Event |
|---|---|
| 02:21 | Percobaan attach domain via akun 3smedianet GAGAL (zone tidak ada di akun itu) |
| ~02:30 | Ditemukan akun benar (`0298214d…`) + token dari user. Zone `socio.id` active. |
| 02:30 | Audit DNS: `socio.id` + `www` SUDAH CNAME ke `socio-id.pages.dev` (proxied) — sisa setup era Juli 2026. Project `socio-id` di akun ini sudah ada + domain ter-attach, tapi konten masih landing LAMA (deploy 17 Jul `feea964a`). |
| 02:35 | Deploy build baru (`9c8e6686`, 70 file) via wrangler direct upload → **cutover instan**, tanpa ubah DNS. |
| 02:36 | Verifikasi: homepage baru 93KB (lama 159KB), title baru, CSP/HSTS live, 3 artikel blog 200, sitemap 200 (host `https://socio.id`), llms.txt 200, cache immutable live, www serve konten sama. |

**Yang TIDAK disentuh saat cutover**: semua DNS records lain (`app`, `cdn`, `coolify`, `mail`, MX, TXT/SPF/DKIM/DMARC) — snapshot lengkap di `/tmp/dns-rollback-socio-id.txt` dan bisa di-regenerate (lihat §5).

## 5. Rollback

**Rollback konten** (landing baru → lama):

```bash
# List deployments, lalu rollback ke deployment sebelumnya
npx wrangler pages deployment list --project-name socio-id
npx wrangler pages deployment rollback <deployment-id> --project-name socio-id  # atau via dashboard
```

Deployment lama (pre-cutover): `feea964a` (17 Jul 2026, landing haloka-clone).

**Rollback DNS** (extreme case — balikin ke situs PHP lama):
Snapshot DNS tersimpan `/tmp/dns-rollback-socio-id.txt`. Record apex/www saat ini:
- `f1d9066a806673c78aedf67b97dc2d8c` CNAME `socio.id` → `socio-id.pages.dev` proxied
- `8f89b37c99eeeb1c9d8d25b0fe8b9517` CNAME `www.socio.id` → `socio-id.pages.dev` proxied

Sitius PHP lama TIDAK lagi punya DNS record aktif (apex sudah bukan A record ke origin) — rollback penuh ke PHP butuh info origin server lama dari user.

## 6. CI/CD (belum ada — manual deploy)

Saat ini deploy manual via wrangler (§2). Kalau mau otomatis via git push:
1. Connect repo GitHub ke project `socio-id` di dashboard Pages, ATAU
2. GitHub Actions: build + `wrangler pages deploy` dengan secret `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`.

Belum dikerjakan — deploy manual dulu sampai M7.

## 7. Masalah diketahui

- `app.socio.id` HTTP 522 (origin VPS 43.157.204.17 down) — **pre-existing, bukan akibat cutover** (DNS app tidak disentuh). User akan kasih akses VPS untuk setup Coolify + DB + app deploy (M1/M2 infra).
- Project duplikat `socio-id-er2.pages.dev` di akun 3smedianet — artefak salah akun saat CF1. Bisa dihapus kalau sudah tidak dipakai (preview URL lama `https://socio-id-er2.pages.dev` akan mati).
