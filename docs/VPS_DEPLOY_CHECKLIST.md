# VPS_DEPLOY_CHECKLIST — Socio.id Rebuild

> Dokumen ini jadi **acuan owner** sebelum & sesudah deploy rebuild SvelteKit ke VPS Tencent Lighthouse Jakarta (Coolify). Baca berurutan dari atas ke bawah.

---

## A. Prasyarat (siapkan sebelum mulai)

### A.1 Akun & service yang harus sudah aktif
- [ ] **Cloudflare** zone `socio.id` + `app.socio.id` + `cdn.socio.id` aktif (free plan cukup)
- [ ] **TiDB Serverless** cluster (Singapore region), buat database `socio_smm`
- [ ] **Cloudflare R2** bucket `socio` + custom domain `cdn.socio.id` (public access ON)
- [ ] **Resend** akun + domain `socio.id` verified (SPF + DKIM + DMARC)
- [ ] **SMMturk** akun + API key (`SOCIO_SMMTURK_KEY`) — **WAJIB top-up dulu**, saldo live test 26 Agu = **$5.16** (tidak cukup untuk order prod)
- [ ] **Tripay** production credentials (`SOCIO_TRIPAY_API_KEY`, `SOCIO_TRIPAY_PRIVATE_KEY`, `SOCIO_TRIPAY_MERCHANT_CODE`)
- [ ] **Midtrans** production credentials (server + client key, untuk fallback)
- [ ] **VPS Tencent Lighthouse Jakarta** (atau Coolify-managed), 2 vCPU / 4 GB cukup untuk awal
- [ ] **Coolify** self-hosted (recommended) di VPS — `coolify.socio.id` di belakang Cloudflare Tunnel
- [ ] **Domain DNS**: `socio.id` (landing, Cloudflare Pages), `app.socio.id` (VPS via Cloudflare proxy orange-cloud), `cdn.socio.id` (R2)

### A.2 Tools lokal
- `pnpm`, `node ≥ 20`, `git`, `mysql` client, `wrangler` (untuk Cloudflare), `turnstile-spin` skill (untuk Turnstile)

---

## B. Environment Variables (`.env`)

Salin `.env.example` di root → `.env`, isi sesuai environment. **WAJIB dirahasiakan** (jangan commit).

### B.1 Inti (WAJIB ada)
```bash
NODE_ENV=production
SOCIO_APP_URL=https://app.socio.id
SOCIO_AUTH_SECRET=<openssl rand -hex 32>       # 64 char hex, sessions/JWT/HMAC suffix
SOCIO_DEPOSIT_BONUS=0.10                       # 10% bonus deposit
SOCIO_RESELLER_BONUS=20000                     # saldo awal reseller (IDR)
SOCIO_AFFILIATE_RATE=0.02                      # 2% komisi referral
```

### B.2 Database (TiDB)
```bash
SOCIO_DB_URL=mysql://<user>:<pass>@<host>.tidbcloud.com:4000/socio_smm?ssl={"rejectUnauthorized":true}
SOCIO_DB_TLS_CA=...                            # kalau pakai self-signed CA
```
⚠️ TiDB Serverless butuh TLS — pastikan `sslmode=require` atau `rejectUnauthorized:true` di connection string. Coolify env var aman dari shell history.

### B.3 Cloudflare R2 (avatar / banner / payment proof)
```bash
R2_ACCOUNT_ID=<your-account-id>
R2_ACCESS_KEY_ID=<access-key>
R2_SECRET_ACCESS_KEY=<secret>
R2_BUCKET=socio
R2_PUBLIC_URL=https://cdn.socio.id
```

### B.4 Resend (email verifikasi + notifikasi)
```bash
RESEND_API_KEY=re_<NEW-KEY>     # ⚠️ ROTATE dulu — key lama pernah ke-commit di repo (B-01)
SOCIO_MAIL_FROM=Socio ID <noreply@socio.id>
SOCIO_MAIL_FROM_NAME=Socio ID
```
**WAJIB**: sebelum set ini, pastikan domain `socio.id` sudah verified di Resend dashboard (SPF + DKIM via Cloudflare, DMARC policy `p=quarantine`).

### B.5 SMMturk (provider SMM)
```bash
SOCIO_SMMTURK_KEY=<your-smmturk-api-key>
SOCIO_USD_TO_IDR=16000          # opsional, default 16.000
SOCIO_SMMTURK_BASE=https://smmturk.org/api/v2
```

### B.6 Turnstile (opsional tapi direkomendasikan)
```bash
SOCIO_TURNSTILE_ENABLED=1
SOCIO_TURNSTILE_SITEKEY=0x4AAA...
SOCIO_TURNSTILE_SECRET=0x4AAA...
```
⚠️ Matikan dulu (`SOCIO_TURNSTILE_ENABLED=0`) saat staging, nyalakan saat prod launch. Pakai skill `turnstile-spin` untuk setup widget.

### B.7 Web Push VAPID (M6)
```bash
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@socio.id
```

### B.8 Coolify / VPS
```bash
PORT=3000                       # adapter-node listen port
COOLIFY_URL=https://coolify.socio.id
```

---

## C. Setup Cloudflare (skill `cloudflare`)

### C.1 DNS records
| Type | Name | Target | Proxy |
|---|---|---|---|
| A | `socio.id` | Cloudflare Pages (auto) | Proxied |
| A | `app.socio.id` | `<VPS_PUBLIC_IP>` | **Proxied (orange cloud)** |
| CNAME | `cdn.socio.id` | `<bucket>.r2.dev` | Proxied |

### C.2 SSL/TLS
- Mode: **Full (strict)**
- Always HTTPS: ON
- Minimum TLS: 1.2
- Auto-minify: HTML+CSS+JS
- Brotli: ON

### C.3 Security headers (di Cloudflare Transform Rules atau di `hooks.server.ts`)
```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://app.midtrans.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https: https://cdn.socio.id; connect-src 'self' https: wss:; frame-src https://challenges.cloudflare.com https://app.midtrans.com
```
Headers ini sudah di-set di `app/src/hooks.server.ts` — tinggal verify via `curl -I https://app.socio.id`.

### C.4 WAF rules
- Rate-limit: 50 req/10s per IP untuk `/login`, `/daftar`, `/verifikasi`, `/forgot`
- Bot Fight Mode: ON
- Challenge WP-Login / wp-admin: ON (jaga-jaga legacy paths)
- Block negara di luar ID untuk `/admin/*` (opsional)

### C.5 R2
- Bucket `socio` dibuat, public access ON
- Custom domain `cdn.socio.id` di-bind
- CORS: `AllowedOrigins = ["https://app.socio.id", "https://socio.id"]`
- Lifecycle: hapus object `tmp/*` > 30 hari (opsional)

### C.6 Cloudflare Pages (landing `socio.id`)
- Repo: `socio.id` / branch `main`
- Build command: `pnpm --filter landing build`
- Output: `landing/dist`
- Root directory: kosongkan (atau `./landing`)
- Env vars sama seperti §B tapi tanpa `SOCIO_DB_URL`

---

## D. Deploy VPS App (`app.socio.id`) via Coolify

### D.1 Dockerfile (`Dockerfile`)
```Dockerfile
FROM node:20-bookworm-slim AS deps
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY app/package.json app/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN corepack enable && pnpm install --frozen-lockfile

FROM deps AS build
WORKDIR /repo
COPY . .
RUN pnpm --filter app build

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
COPY --from=build /repo/app/build ./build
COPY --from=build /repo/app/package.json ./
COPY --from=build /repo/packages ./packages
COPY --from=build /repo/app/node_modules ./node_modules
COPY --from=build /repo/packages/db/node_modules ./node_modules/db
COPY --from=build /repo/packages/core/node_modules ./node_modules/core
COPY --from=build /repo/packages/ui/node_modules ./node_modules/ui
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["node", "build/index.js"]
```

### D.2 Coolify resource
- Type: Application (Node)
- Port: 3000
- Domain: `app.socio.id` (otomatis dapet Let's Encrypt via Cloudflare Full Strict)
- Env vars: salin dari §B
- Healthcheck: `/` (200 expected, di-redirect ke `/login` oleh SvelteKit → tetap 200 OK)
- Persistent storage: tidak perlu (DB di TiDB, file di R2)

### D.3 Cron
Jalankan di **process terpisah** di Coolify (Application kedua, command `node build/cron.js`), atau pakai `node-cron` di process app:
```ts
// app/src/cron/index.ts (TODO M4)
import cron from "node-cron";
import { runProviderSync } from "./provider-sync";
import { runStatusPolling } from "./status-polling";
import { runAutoRefund } from "./refund";

cron.schedule("0 * * * *", runProviderSync);     // tiap jam
cron.schedule("* * * * *", runStatusPolling);   // tiap menit
cron.schedule("*/15 * * * *", runAutoRefund);   // tiap 15 menit
```
⚠️ JANGAN pakai Cloudflare Workers untuk cron/app (CPU limit + no MySQL TCP). Wajib jalan di VPS.

---

## E. Database Migration (TiDB → rebuild schema)

### E.1 Import dump legacy
```bash
mysqldump -h <old-host> -u root -p --single-transaction --routines --triggers socio_smm > dump.sql
# edit dump.sql: ganti ENGINE=InnoDB/CHARSET latin1 → utf8mb4
mysql -h <tidb-host>.tidbcloud.com -P 4000 -u root -p socio_smm < dump.sql
```

### E.2 Tabel baru (di-generate Drizzle)
```bash
cd packages/db
pnpm drizzle-kit generate               # generate migration dari schema
pnpm drizzle-kit migrate                # apply ke TiDB
```
Tabel baru: `audit_log`, `job_queue`, `web_push_subscriptions`, `saved_links`, `coupons`, `loyalty_points`, `service_mapping`, `api_usage`. (lihat `packages/db/src/schema/rebuild.ts`)

### E.3 Seed pricing rules + provider
```bash
pnpm --filter app exec tsx scripts/seed-pricing.ts
pnpm --filter app exec tsx scripts/seed-provider.ts
```
Provider SMMturk ditambah via UI `/admin/providers` (lebih aman, tidak hardcode API key).

---

## F. Email Verification (Resend) — end-to-end

### F.1 Setup domain di Cloudflare DNS
Tambahkan records (Resend dashboard kasih nilai-nya):
```
TXT  @  "v=spf1 include:amazonses.com ~all"
TXT  resend._domainkey  "v=DKIM1; k=rsa; p=<public-key>"
TXT  _dmarc  "v=DMARC1; p=quarantine; rua=mailto:dmarc@socio.id"
```

### F.2 Verifikasi domain di Resend
- Login Resend → Domains → Add `socio.id`
- Copy SPF/DKIM records → paste di Cloudflare DNS
- Tunggu propagasi (biasanya < 5 menit) → klik **Verify**

### F.3 Test alur email dari VPS
1. Create user baru di `/daftar` dengan email asli owner
2. Cek inbox (juga Spam/Promotions)
3. Klik link verifikasi → harusnya redirect ke `/login` dengan notifikasi sukses
4. Coba login → harusnya bisa

⚠️ Email body di-generate dari `app/src/lib/server/email.ts`. Template HTML sudah di-port dari PHP, tapi **wajib dicek manual di production** (format tabel email, fallback plaintext, karakter Unicode).

### F.4 Email fallback saat Resend down
`sendEmail()` di `app/src/lib/server/email.ts:19` return `false` kalau Resend gagal → `sendMemberVerificationEmail` di `signup.ts:139` tetap insert user, lalu redirect ke `/verifikasi?resend=1` dengan banner "Link verifikasi baru sudah dikirim". User bisa klik **Kirim ulang** untuk retry. Aman.

---

## G. SMMturk — Top-up Provider (BLOCKER)

### G.1 Cek saldo (production)
```bash
curl -X POST https://smmturk.org/api/v2 \
  -d "key=$SOCIO_SMMTURK_KEY&action=balance"
```
Output JSON: `{"balance":"5.1573349","currency":"USD"}` (per 26 Agu — terlalu rendah).

### G.2 Top-up minimum
SMMturk menerima deposit via crypto / beberapa payment gateway lokal. Minimum top-up biasanya **$10 USD**. Sebelum launch, top-up **~$100 USD** (cukup untuk ~500 order Instagram followers @ 1.000 qty).

### G.3 Verify post-top-up
```bash
curl -X POST https://smmturk.org/api/v2 \
  -d "key=$SOCIO_SMMTURK_KEY&action=services" | jq '. | length'
# Expect: ~8.285 services
```

---

## H. Post-deploy smoke test (jalankan dalam 10 menit setelah deploy)

```bash
# 1. HTTPS + headers
curl -I https://app.socio.id | grep -E "HTTP|strict-transport|x-frame"

# 2. Landing reachable
curl -I https://socio.id | grep "200"

# 3. Register redirect
curl -sI https://app.socio.id/register | grep -E "HTTP|location"
# Expect: 301 → /daftar

# 4. Email verifikasi flow
# - Buka https://app.socio.id/daftar
# - Submit form member
# - Cek inbox email asli → klik link verifikasi
# - Login harusnya sukses

# 5. Top-up + bonus 10%
# - Login member
# - Buka /saldo/top-up → submit Rp 100.000
# - Cek response: postAmount=100XXX credited=110XXX
# - Screenshot dashboard saldo widget

# 6. Admin smoke
# - Login admin via /login (password asli, JANGAN /dev-admin-login di prod)
# - Buka /admin/deposits → confirm deposit Pending → Success
# - Cek /admin/audit-log → entry confirm_deposit ada

# 7. SMMturk order (TEST ORDER PERTAMA, owner approve manual)
# - Pilih layanan test, quantity 100
# - Submit order → response oid
# - Cek status via /admin/orders atau polling
# - Pastikan status flip ke In Progress / Completed dalam 1-5 menit

# 8. Provider sync cron
# - Cek log Coolify: [cron] provider-sync: synced N services
# - Cek /admin/providers → services ke-update

# 9. Backup harian TiDB aktif
# - TiDB Serverless: daily automatic backup (default ON, verify di dashboard)

# 10. Cloudflare Analytics
# - Buka Cloudflare dashboard → Analytics → traffic + WAF events
```

---

## I. Rollback Plan

### I.1 Rollback app (VPS Coolify)
1. Buka Coolify → Deployments → pilih revision sebelumnya → **Redeploy**
2. Estimasi downtime: ~30-60 detik selama image pull + restart

### I.2 Rollback schema DB
1. `mysqldump` schema + data sebelum migration: `mysqldump socio_smm > pre-migration.sql`
2. Kalau ada masalah: `mysql socio_smm < pre-migration.sql` (restore)
3. ⚠️ Kalau data baru sudah ditulis, restore selektif hanya tabel yang konflik

### I.3 Rollback DNS
1. Di Cloudflare DNS: `app.socio.id` A record balik ke VPS PHP lama
2. PHP lama di port 80 masih hidup (jangan dimatikan sampai 7 hari setelah cutover)
3. Set `proxy` ke **DNS only** (gray cloud) untuk skip cache saat debugging

### I.4 Feature flag fallback
- `SOCIO_TURNSTILE_ENABLED=0` — kalau Turnstile bermasalah di prod, matikan
- Maintenance mode toggle via `/admin/maintenance` (deploy di M3, saat ini belum ada — tambahkan flag inline: `if (MAINTENANCE_MODE) throw redirect(303, "/maintenance")` di `hooks.server.ts`)

---

## J. Catatan khusus setelah test sesi 26 Agu

1. **WAJIB rotate `RESEND_API_KEY`** — key `re_AY22HoT9_…` pernah ke-commit di repo (B-01, file `api-keys-1784432518797.csv` sudah dihapus & `.gitignore` updated).
2. **WAJIB top-up SMMturk** — saldo $5.16 tidak cukup untuk launch.
3. **Tambah 8 halaman admin** yang masih 404 (audit-log, pricing-rules, reports, email-templates, maintenance, notify, api-keys, loyalty) sebelum production — atau konfirmasi owner bahwa fitur legacy tsb sudah tidak dipakai.
4. **Cron `app/src/cron/refund.ts`** sudah aman (destructure array) tapi belum dijadwalkan — wajib aktif di process VPS.
5. **5 bug P0 sudah fixed** di sesi test ini (V-01, V-DEP2/3/4, V-LOGIN-SUSPENDED) — semua sudah typecheck 0 errors & build OK.

---

**Owner**: print dokumen ini, centang satu per satu saat deploy. Kalau ada item yang belum ready, **JANGAN deploy dulu** — debug dulu lokal atau bikin sub-task.
