# Socio.id — Cloudflare Domain Operations

> **Domain utama:** `socio.id` (landing) + `app.socio.id` (application)
> **Provider:** Cloudflare (Account ID `0298214d1069f75436f490b51ea4763e`)
> **Peran Cloudflare:** DNS authoritative + edge cache + DDoS + WAF + SSL termination + Email Routing (jika diaktifkan)

> **Dokumen ini** = operasional harian untuk operator. Untuk setup awal lihat
> [`docs/secrets-setup/01-cloudflare-r2.md`](../secrets-setup/01-cloudflare-r2.md) dan
> [`docs/secrets-setup/04-email-routing.md`](../secrets-setup/04-email-routing.md).
> Untuk runbook awal deploy lihat [`docs/VPS_DEPLOY_RUNBOOK.md`](../VPS_DEPLOY_RUNBOOK.md).

---

## Daftar Isi

1. [Arsitektur zona](#1-arsitektur-zona)
2. [Record DNS aktif](#2-record-dns-aktif)
3. [SSL / TLS](#3-ssl--tls)
4. [Security headers & WAF](#4-security-headers--waf)
5. [Cache rules & Performance](#5-cache-rules--performance)
6. [R2 object storage](#6-r2-object-storage)
7. [Turnstile](#7-turnstile)
8. [Email routing](#8-email-routing)
9. [Operasional harian](#9-operasional-harian)
10. [Troubleshooting](#10-troubleshooting)
11. [Disaster recovery](#11-disaster-recovery)

---

## 1. Arsitektur zona

```
┌─────────────────────── Cloudflare account socio.id ───────────────────────┐
│ Account ID: 0298214d1069f75436f490b51ea4763e                         │
│ Plan: Pro (WAF + Rate Limit + Bot Management aktif)                    │
├─────────────────────────────────────────────────────────────────────────┤
│ Zone: socio.id                                                          │
│   ├─ socio.id          (A) → Cloudflare Pages (landing Astro)         │
│   ├─ app.socio.id      (A) → 130.254.47.93 (proxied, orange cloud)    │
│   ├─ cdn.socio.id      (CNAME) → socio.b-cdn.r2.dev (R2 bucket)       │
│   └─ admin.socio.id    (opsional, masa depan)                          │
│                                                                        │
│ Worker (opsional): SEO redirect, security, edge logic                 │
│ R2 bucket: socio (10 GB free)                                         │
│ Turnstile widgets: 2 (Socio ID / socio-signup-prod)                   │
│ Pages project: socio-id                                                │
└─────────────────────────────────────────────────────────────────────────┘
```

- **`socio.id`** → Cloudflare Pages (landing Astro). Edge cache SG/JKT latency ~10-20ms.
- **`app.socio.id`** → VPS Coolify (130.254.47.93) via Cloudflare proxy (orange cloud) → Traefik → app container.
- **`cdn.socio.id`** → R2 public custom domain untuk asset (avatar, banner, bukti transfer).

Login Cloudflare: <https://dash.cloudflare.com/> → pilih akun `socio.id` (bukan `Reza Ramadhi` jika ada beberapa akun).

---

## 2. Record DNS aktif

| Type | Name | Content | Proxy | TTL | Catatan |
|---|---|---|---|---|---|
| `A` | `socio.id` | `<cloudflare-pages-ipv6>` | **Proxied** (orange) | Auto | Landing Astro di Pages |
| `A` | `app.socio.id` | `130.254.47.93` | **Proxied** (orange) | Auto | App VPS — perlu orange agar CF security headers aktif |
| `CNAME` | `cdn.socio.id` | `socio.b-cdn.r2.dev` | **Proxied** (orange) | Auto | R2 public domain — auto-setup oleh Cloudflare saat connect domain |
| `CNAME` | `_dmarc.socio.id` | `dmarc.socio.id` | — | — | Wajib untuk email auth (lihat §8) |

> **Catatan keamanan**: Semua record app/cdn **WAJIB proxied (orange cloud)** untuk mendapat:
> - DDoS protection
> - WAF rules
> - Rate limiting
> - Security headers via Transform Rules
>
> Jika dilepas (DNS only), fitur-fitur di atas **tidak aktif** untuk record tersebut.

### Cara verifikasi cepat

```bash
# Dari workstation lokal — pastikan pakai CF resolver (1.1.1.1)
dig +short socio.id A @1.1.1.1            # → 104.x.x.x (CF anycast IPv4)
dig +short app.socio.id A @1.1.1.1       # → 104.x.x.x (CF proxied)
dig +short cdn.socio.id CNAME @1.1.1.1    # → socio.b-cdn.r2.dev
# Periksa apakah proxied (orange cloud):
dig app.socio.id +short                  # dari local resolver (returns CF IP if proxied)
```

Kalau pakai `dig` dari local resolver (bukan `1.1.1.1`) untuk `app.socio.id` dan dapat `130.254.47.93` langsung → record **TIDAK proxied** (security turun). Perbaiki: edit record di dashboard, klik toggle orange cloud.

---

## 3. SSL / TLS

Mode SSL untuk `app.socio.id` & `cdn.socio.id`: **Full (strict)** — **WAJIB**.

- **Full (strict)** = encrypt end-to-end, validasi cert origin. Tidak ada loop.
- **Full** = encrypt tapi percaya apapun di origin (tidak validasi). Risky.
- **Flexible** = traffic CF→origin adalah HTTP polos. **JANGAN** dipakai — bikin loop redirect kalau origin juga HTTPS.

### Universal SSL

Setiap zone baru secara otomatis dapat Universal SSL certificate (masa aktif 90 hari, auto-renew). Cek di **SSL/TLS → Edge Certificates**:
- `socio.id` (apex) → certificate aktif, expiry normal (>30 hari)
- `app.socio.id` → SAN (Subject Alternative Name) pada certificate socio.id

Untuk cert custom (misal wildcard `*.socio.id` dari CA lain), upload di tab **Custom Hostnames**.

### Cara cek expiry

```bash
echo | openssl s_client -connect socio.id:443 -servername socio.id 2>/dev/null | openssl x509 -noout -dates
# Expected: notAfter=... >30 hari dari sekarang
```

Atau di dashboard **SSL/TLS → Edge Certificates**: lihat kolom "Expires".

---

## 4. Security headers & WAF

Cloudflare Transform Rules dipakai untuk menambah security headers ke response app (yang awalnya hanya dikirim via `app/src/hooks.server.ts`). Kenapa duplikasi? Karena beberapa header (CSP, HSTS) harus **di-set sedekat mungkin ke user** — kalau pakai hanya origin, jika ada bug/konfigurasi salah, header hilang.

### Transform Rules aktif

Lokasi: **Rules → Transform Rules → Modify Response Headers**

| Rule name | Header | Value | Match |
|---|---|---|---|
| `socio-security-headers` | `X-Frame-Options` | `DENY` | All incoming requests |
| `socio-security-headers` | `X-Content-Type-Options` | `nosniff` | All incoming requests |
| `socio-security-headers` | `Referrer-Policy` | `strict-origin-when-cross-origin` | All incoming requests |
| `socio-security-headers` | `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), interest-cohort=()` | All incoming requests |
| `socio-security-headers` | `X-DNS-Prefetch-Control` | `on` | All incoming requests |
| `socio-strict-transport` | `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | All HTTPS responses |

> **Pre-flight**: setelah edit rule, klik **Deploy** di kanan atas. Verifikasi:
> ```bash
> curl -I https://app.socio.id/ | grep -iE "x-frame|x-content|referrer|permissions"
> # Expected: 6 headers
> ```

### WAF (Web Application Firewall)

Lokasi: **Security → WAF → Managed Rules** (otomatis aktif di plan Pro):
- Cloudflare Managed Ruleset (sangat agresif, false positive rendah)
- Cloudflare OWASP Top 10
- Cloudflare Leaked Credentials (cek apakah request membawa credentials yang bocor)

Mode: **Block** untuk rules yang jelas-jelas attack, **Challenge** untuk suspect.

### Rate Limit Rules

Lokasi: **Security → WAF → Rate Limit Rules**

```bash
# API auth endpoints — 3 req/10s per IP+colo (Cloudflare free plan limit)
# Lihat raw rule di dashboard atau operations/server-migration-2026-09-02.md
```

Sample:
| Path pattern | Rate | Action |
|---|---|---|
| `/api/auth/sign-in/*`, `/api/auth/sign-up/*` | 3 per 10s per `cf.colo.id + ip.src` | Block |

### Bot Management

Plan Pro punya Bot Fight Mode aktif:
- **Security → Bots → Bot Fight Mode** = **ON**
- Verified bots (Google, Bing) otomatis di-allow
- Auto-block bot berbahaya

---

## 5. Cache rules & Performance

Lokasi: **Caching → Cache Rules**

### Page Rules / Cache Rules

| URL pattern | Cache eligibility | TTL | Bypass on cookie |
|---|---|---|---|
| `cdn.socio.id/*` (R2 public) | Eligible (default) | Browser cache 1y, edge 30d | — |
| `socio.id/_astro/*` (Pages static) | Eligible | 1y | — |
| `socio.id/api/*` | **Bypass** | — | — |
| `app.socio.id/api/*` | **Bypass** | — | — |
| `app.socio.id/*` (HTML) | **Bypass** (cookie `socio_session` = logged in) | — | yes |

Untuk `app.socio.id` dan `socio.id` di-manage via `hooks.server.ts` Cache-Control header (origin side).

### Browser Integrity Check

Lokasi: **Security → Settings → Browser Integrity Check** = **ON** — otomatis challenge browser tanpa User-Agent standar.

---

## 6. R2 object storage

Lokasi: **R2** (sidebar kiri) → bucket `socio`.

Setup lengkap: [`docs/secrets-setup/01-cloudflare-r2.md`](../secrets-setup/01-cloudflare-r2.md)

### Struktur object

```
socio/                              ← bucket
├── avatars/<userId>/<uuid>.jpg    ← avatar upload dari /akun
├── proofs/<depositId>-<ts>.jpg    ← bukti transfer BCA top-up
├── banners/<id>.jpg                ← banner promo (M5+)
└── order-attachments/<id>/...      ← (future) bukti screenshot order
```

### Operasional rutin

```bash
# List avatars via dashboard: R2 → socio → folder avatars/
# Atau via wrangler CLI (harus install dulu)
npx wrangler r2 object list --bucket socio --prefix avatars/
```

### Rotate API token

R2 API token sudah di-set sejak 2026-09-02. Saat rotate:

1. **R2 → Overview → Manage R2 API Tokens → Create API Token** (nama baru `socio-app-2027-09-02`)
2. **Permissions**: Object Read & Write, scope ke bucket `socio`
3. Simpan Access Key + Secret di password manager
4. Update env Coolify (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`) dengan `is_buildtime=false`
5. Redeploy app
6. Hapus token lama setelah 24 jam observasi

> Token lama **JANGAN langsung dihapus** — jika ada proses lama (cron job, backup) yang masih pakai token lama, akan error.

---

## 7. Turnstile

Lokasi: **Turnstile** (sidebar kiri)

Widget aktif:
| Sitekey | Name | Domain | Mode |
|---|---|---|---|
| `0x4AAAAAAD3RtU-MhZPHl3Fw` | Socio ID | `app.socio.id`, `localhost`, `socio.id` | managed |
| `0x4AAAAAAEk_qXXRbvVq2htn` | socio-signup-prod | `app.socio.id` | managed |

Untuk update domain (misal tambah subdomain baru):
```bash
curl -X PUT "https://api.cloudflare.com/client/v4/accounts/$CF_ACC/challenges/widgets/$SITEKEY" \
  -H "Authorization: Bearer $CF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Socio ID","mode":"managed","domains":["socio.id","app.socio.id","localhost"]}'
```

Lihat widget analytics: **Turnstile → Analytics** untuk failure rate spike (jika >5% mungkin ada masalah secret-key/sitekey mismatch).

Setup lengkap: [`docs/secrets-setup/05-turnstile.md`](../secrets-setup/05-turnstile.md)

---

## 8. Email routing

Lokasi: **Email → Email Routing**

Jika email domain dipakai (`@socio.id`), setup:
- MX record auto: prioritas 1, target `route1.mx.cloudflare.net`
- SPF record: `v=spf1 include:_spf.mx.cloudflare.net ~all`
- DKIM: enable auto-generated
- DMARC: lihat tabel DNS di §2 (`_dmarc.socio.id`)

Catch-all address: `*@socio.id` → forward ke `info@beriklan.co.id` (atau email admin).

Lihat detail: [`docs/secrets-setup/04-email-routing.md`](../secrets-setup/04-email-routing.md)

---

## 9. Operasional harian

### Health check harian (5 menit)

```bash
# 1. Public app reachable?
curl -sI https://app.socio.id/ | head -1     # expected: HTTP/2 200
curl -sI https://socio.id/ | head -1          # expected: HTTP/2 200

# 2. Login endpoint (rate-limit test, 1 req)
curl -sX POST https://app.socio.id/login \
  -d "email=admin@socio.id&password=&turnstile=" \
  -H "content-type: application/x-www-form-urlencoded" \
  -H "origin: https://app.socio.id" -o /dev/null -w "%{http_code}\n"
# expected: 400 atau 429 (validation/rate-limit), bukan 5xx

# 3. R2 public asset
curl -sI https://cdn.socio.id/ | head -1      # expected: HTTP/2 200

# 4. SSL cert expiry (per domain, ambil 5-10 domain)
for d in socio.id app.socio.id cdn.socio.id; do
  echo "$d: $(echo | openssl s_client -connect $d:443 -servername $d 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)"
done
# expected: >30 hari dari sekarang
```

### Cek DNS propagation setelah edit

```bash
# Cek dari beberapa resolver
for ns in 1.1.1.1 8.8.8.8 9.9.9.9; do
  echo "=== $ns ==="
  dig +short app.socio.id @${ns} A
done
```

### Cek Cloudflare Workers/Pages deployment (jika ada)

```bash
# Pages
npx wrangler pages deployment list --project-name socio-id

# Workers
npx wrangler deployments list --name <worker-name>
```

### Akses VPS dari workstation

Lihat: [`docs/deploy/APPSOCIOID_VPS.md`](./APPSOCIOID_VPS.md#3-akses-ssh-dan-docker-ke-vps)

---

## 10. Troubleshooting

| Gejala | Root cause | Fix |
|---|---|---|
| `app.socio.id` tidak load (browser) | DNS unproxied (grey-cloud) | Dashboard → toggle orange cloud ON |
| `app.socio.id` redirect loop 308 | SSL mode Flexible + origin HTTPS | Dashboard → SSL/TLS → set Full (strict) |
| Turnstile widget error 110200 | Domain widget tidak include hostname | Widget config → add domain |
| Login gagal terus meski password benar | Origin server down | Cek VPS, lihat `APPSOCIOID_VPS.md` |
| Static asset (`/_astro/`) 404 di Pages | Deployment gagal / route salah | Cek Pages deployment log |
| Email tidak sampai ke inbox | MX record salah / SPF fail | Lihat §8 |
| API request lambat | Rate Limit salah konfigurasi | WAF → Rate Limit → review rule |
| Bot attack spike | WAF rule lemah | Security → Events → lihat pattern → tambah rule |

---

## 11. Disaster recovery

### RPO/RTO targets

| Asset | RPO (data loss tolerance) | RTO (recovery time) |
|---|---|---|
| DNS records | ~0 (CF auto-replicated global) | ~5 menit (recreate di dashboard) |
| R2 objects | 24 jam (daily backup ke Glacier di M6) | ~30 menit (restore dari backup) |
| App container | 0 (rebuild dari git) | ~3-5 menit (deploy trigger) |
| MySQL database | 24 jam (daily dump) | ~1 jam (restore dari dump + redeploy) |
| Turnstile secret | 0 (CF-managed, regenerate di dashboard) | ~5 menit |

### Backup prosedural

```bash
# 1. MySQL dump harian (otomatis di cron job container)
docker exec $(docker ps --format '{{.Names}}' | grep '^rebicrj57r3afbg9knieq9ks$') \
  mysqldump -usocio -p"$DB_PASS" socio_smm | gzip > /data/backups/db-$(date +%F).sql.gz

# 2. R2 list + download critical folders (monthly)
npx wrangler r2 object list --bucket socio --prefix avatars/ > /tmp/avatars-list.txt

# 3. Verify backup integrity
gunzip -t /data/backups/db-$(date +%F).sql.gz && echo "DB backup OK"
```

### Restore procedure

```bash
# 1. Restore MySQL dari dump
gunzip < /data/backups/db-2026-09-02.sql.gz | \
  docker exec -i $(docker ps --format '{{.Names}}' | grep '^rebicrj57r3afbg9knieq9ks$') mysql -usocio -p"$DB_PASS" socio_smm

# 2. Trigger redeploy
curl -X POST -H "Authorization: Bearer $COOLIFY_TOK" \
  -H "Content-Type: application/json" \
  -d '{"uuid":"nqsjafrei6k8dkup1pxkcuwf"}' \
  "http://130.254.47.93:8000/api/v1/deploy"

# 3. Verify
curl -I https://app.socio.id/  # HTTP/2 200
```

### DR escalation

1. Cek status Cloudflare: <https://www.cloudflarestatus.com/>
2. Cek status VPS provider (Tencent Cloud)
3. Kalau lebih dari 30 menit outage → aktifkan static "We are down" page (Pages deploy manual)
4. Update status di social media
