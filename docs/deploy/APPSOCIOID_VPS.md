# app.socio.id — VPS Coolify Operations

> **Service:** `app.socio.id` (SvelteKit + node-cron)
> **VPS:** Tencent Cloud `130.254.47.93` (Tencent APAC region, IPv4 + IPv6)
> **Panel:** Coolify v4 di `:8000` (Traefik reverse-proxy auto-SSL)
> **Container runtime:** Docker (semua service jalan sebagai container)
> **Deploy source:** GitHub `ReqTimeout/socio.git` → branch `main` → Coolify auto-deploy

> **Dokumen ini** = operasional harian untuk operator. Untuk setup awal lihat
> [`docs/VPS_DEPLOY_RUNBOOK.md`](../VPS_DEPLOY_RUNBOOK.md) dan
> [`docs/COOLIFY_DEPLOY.md`](../COOLIFY_DEPLOY.md). Untuk DNS lihat
> [`docs/deploy/SOCIOID_DOMAIN.md`](./SOCIOID_DOMAIN.md).

---

## Daftar Isi

1. [Topologi](#1-topologi)
2. [Akses SSH & Docker ke VPS](#2-akses-ssh--docker-ke-vps)
3. [Environment variables](#3-environment-variables)
4. [Deploy workflow](#4-deploy-workflow)
5. [Rollback procedure](#5-rollback-procedure)
6. [Log & monitoring](#6-log--monitoring)
7. [Cron jobs](#7-cron-jobs)
8. [Backup & restore](#8-backup--restore)
9. [Troubleshooting](#9-troubleshooting)
10. [Security & maintenance](#10-security--maintenance)

---

## 1. Topologi

```
┌─────── VPS 130.254.47.93 (Tencent Cloud APAC) ───────┐
│                                                       │
│  coolify (panel :8000)         ← Localhost only       │
│  coolify-db (postgres)         ← Backend Coolify      │
│  coolify-proxy (traefik :80/:443) ← Public            │
│  coolify-sentinel (health)                            │
│                                                       │
│  nqsjafrei... (app) :3000    ← SvelteKit + node-cron │
│  rebicrj57... (mysql 8.0) :3306 ← private network   │
│  mailserver (mailserver/docker-mailserver v14)        │
│                                                       │
│  /data/coolify/                                       │
│    ├── proxy/ (Traefik dynamic config)               │
│    ├── ssh/keys/  (SSH keys per server, encrypted)   │
│    └── applications/nqsjafrei.../                     │
│        └── docker-compose.yaml                        │
│                                                       │
│  /data/backups/   (MySQL dumps, retention 7 hari)     │
│                                                       │
│  outbound: SMMturk API, Cloudflare R2, Resend SMTP    │
└───────────────────────────────────────────────────────┘
```

**Network**: Semua container di bridge `coolify`. App container reach MySQL via Docker DNS name `rebicrj57r3afbg9knieq9ks` (atau IP `10.0.0.2`). MySQL **tidak exposed internet** (private bridge only).

---

## 2. Akses SSH & Docker ke VPS

### SSH key access

Server pakai SSH keypair. Private key ada di workstation lokal: `~/.ssh/id_rsa` (atau key lain yang sudah ditambah ke `~/.ssh/authorized_keys` di VPS).

```bash
# Test koneksi
ssh root@130.254.47.93 'hostname && whoami && date'
# Expected: hostname VPS, user root, tanggal saat ini

# Login tanpa key (perlu password — hanya emergency)
ssh root@130.254.47.93
# Password ada di secrets manager (lihat runbook §1)
```

### Container identifiers

```bash
# List container aktif
ssh root@130.254.47.93 'docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"'

# Penting — container ini yang harus dimonitor:
# - nqsjafrei6k8dkup1pxkcuwf-*  → app SvelteKit (production)
# - rebicrj57r3afbg9knieq9ks      → MySQL 8.0
# - coolify                        → Coolify panel
# - coolify-proxy                  → Traefik
# - coolify-db                     → PostgreSQL backend Coolify
# - mailserver                     → mailserver v14 (M5)
```

Container app name prefix `nqsjafrei6k8dkup1pxkcuwf-` di-generate Coolify per-deploy. **Container ID berubah tiap redeploy**. Selalu ambil nama terbaru:
```bash
ssh root@130.254.47.93 'docker ps --format "{{.Names}}" | grep "^nqsjafrei6k8dkup1pxkcuwf"'
```

### Quick alias (recommended)

Tambah ke `~/.bashrc` atau `~/.zshrc` di workstation lokal:

```bash
alias socio-ssh='ssh root@130.254.47.93'
alias socio-app='ssh root@130.254.47.93 "docker ps --format \"{{.Names}}\" | grep \"^nqsjafrei6k8dkup1pxkcuwf\" | head -1 | xargs -I {} docker exec {}"'
alias socio-db='ssh root@130.254.47.93 "docker exec -i \$(docker ps --format \"{{.Names}}\" | grep \"^rebicrj57r3afbg9knieq9ks\" | head -1) mysql -usocio -p\"\\\$DB_PASS\" socio_smm"'
alias socio-logs='ssh root@130.254.47.93 "docker logs --since 1h -f \$(docker ps --format \"{{.Names}}\" | grep \"^nqsjafrei6k8dkup1pxkcuwf\" | head -1)"'
alias socio-coolify='ssh -L 8000:127.0.0.1:8000 root@130.254.47.93  # tunnel ke panel'
```

> Ganti `$DB_PASS` dengan password yang diambil dari Coolify env (lihat §3). Untuk kebanyakan operasional, pakai `socio-logs` alias — paling sering dipakai.

---

## 3. Environment variables

Semua env di-set di **Coolify Dashboard → Application → Environment Variables**.
Default `is_buildtime=false` (runtime env, tidak ter-bake ke image Docker).

### App container (wajib untuk jalan)

| Variable | Required | Contoh | Sumber |
|---|---|---|---|
| `PORT` | ya | `3000` | hardcoded by Coolify |
| `HOST` | ya | `0.0.0.0` | hardcoded by Coolify |
| `SOCIO_DB_URL` | ya | `mysql://socio:xxx@rebicrj57r3afbg9knieq9ks:3306/socio_smm?charset=utf8mb4` | Coolify auto |
| `SOCIO_AUTH_SECRET` | ya | `<32-char random>` | generate via `openssl rand -base64 48` |
| `SOCIO_APP_URL` | ya | `https://app.socio.id` | manual |
| `SOCIO_CRON_ENABLED` | optional | `1` | manual |
| `SOCIO_TURNSTILE_ENABLED` | optional | `1` | manual |
| `SOCIO_TURNSTILE_SITEKEY` | jika turnstile on | `0x4AAAAAAD3RtU-MhZPHl3Fw` | Cloudflare dashboard |
| `SOCIO_TURNSTILE_SECRET` | jika turnstile on | `<secret>` | Cloudflare dashboard |
| `SOCIO_SMMTURK_KEY` | ya | `<key>` | SMMturk dashboard |
| `SOCIO_USD_TO_IDR` | ya | `15800` | manual |
| `SOCIO_BCA_NUMBER` | ya | `1392680815` | manual |
| `SOCIO_BCA_NAME` | ya | `Awangga Ramadhi` (atau nama sebenarnya) | manual |
| `SOCIO_DEPOSIT_BONUS` | optional | `0.10` | manual |
| `SOCIO_PROVIDER_ENC_KEY` | ya (G5 ADMIN_GAP) | `<openssl rand -hex 32>` | generate sekali |
| `R2_ACCESS_KEY_ID` | ya | Cloudflare R2 API | lihat deploy/SOCIOID_DOMAIN.md §6 |
| `R2_SECRET_ACCESS_KEY` | ya | Cloudflare R2 API | (rahasia, jangan commit) |
| `R2_BUCKET` | ya | `socio` | manual |
| `R2_ENDPOINT` | ya | `https://0298214d1069f75436f490b51ea4763e.r2.cloudflarestorage.com` | manual |
| `R2_PUBLIC_URL` | ya | `https://cdn.socio.id` | manual |
| `BETTER_AUTH_URL` | ya | `https://app.socio.id` | manual |
| `SMTP_HOST` | (M5+) ya | `mailserver` | manual |
| `SMTP_PORT` | (M5+) ya | `587` | manual |
| `SMTP_USER` | (M5+) ya | `noreply@socio.id` | manual |
| `SMTP_PASS` | (M5+) ya | `<password>` | manual |
| `SOCIO_MAIL_FROM` | (M5+) ya | `noreply@socio.id` | manual |

> **Tip**: pakai Coolify **shared variables** (tim/prod/dev) untuk nilai yang sama di semua env (misal `CF_ACCOUNT_ID`). Pakai app-level untuk nilai spesifik (secrets).

### Cara ambil password database

```bash
# Ambil dari Coolify env (perlu token API Coolify — lihat secrets-setup/06-coolify-api.md)
ssh root@130.254.47.93 \
  "docker exec \$(docker ps --format '{{.Names}}' | grep '^nqsjafrei6k8dkup1pxkcuwf' | head -1) \
   printenv SOCIO_DB_URL"
```

Atau langsung di dashboard Coolify → **Applications → app.socio.id → Environment Variables** (klik ikon mata untuk reveal).

### Update env tanpa redeploy

Di Coolify v4:
1. **Dashboard → app.socio.id → Environment Variables → Edit**
2. Save → Coolify **restart container** (tidak rebuild image, ~5-10 detik)

> Untuk value secret (R2 keys, DB pass), always set `is_buildtime=false` — kalau true, value akan ter-bake ke dalam image layer (security risk).

---

## 4. Deploy workflow

### Normal deploy (Git push → auto)

```bash
# Dari workstation lokal
git push origin main

# Coolify webhook (sudah aktif) → queue build
# Build: 3-5 menit (pnpm monorepo + pnpm fetch)
# Deploy: ~10-30 detik (Traefik reload + healthcheck)
```

Monitor build:
```bash
# Lihat status deployment terbaru
ssh root@130.254.47.93 \
  "docker exec coolify-db psql -U coolify -d coolify -c \
   \"SELECT uuid, status, created_at, finished_at FROM application_deployment_queues ORDER BY id DESC LIMIT 3;\""
# Expected: status='finished' untuk deploy sukses
```

### Manual deploy via Coolify API

```bash
# Set token (sekali, simpan di secrets manager)
COOLIFY_TOK=$(docker exec coolify php artisan tinker --execute="
  session(['currentTeam' => App\Models\Team::find(1)]);
  echo App\Models\User::find(1)->createToken('deploy', ['*'])->plainTextToken;
" 2>/dev/null | tail -1)

# Trigger deploy
curl -sX POST -H "Authorization: Bearer $COOLIFY_TOK" \
  -H "Content-Type: application/json" \
  -d '{"uuid":"nqsjafrei6k8dkup1pxkcuwf"}' \
  http://130.254.47.93:8000/api/v1/deploy

# Hapus token setelah dipakai (rotasi)
docker exec coolify php artisan tinker --execute="
  Laravel\Sanctum\PersonalAccessToken::where('name','deploy')->delete();
" >/dev/null 2>&1
```

### Manual deploy dari Coolify dashboard

1. Login https://130.254.47.93:8000 (admin)
2. **Projects → socio-app → App → Deploy** (tombol kanan atas)
3. Tunggu ~5 menit

### Build cache & faster rebuilds

Coolify otomatis pakai Docker layer cache. Cache invalidation terjadi kalau:
- `app/Dockerfile` berubah
- `package.json`/`pnpm-lock.yaml` berubah
- `.dockerignore` berubah

Untuk paksa clean build:
1. Coolify → Application → **Force Rebuild** (toggle ON)
2. Deploy

---

## 5. Rollback procedure

### Rollback ke git commit terakhir

```bash
# Opsi A: revert commit lokal + push (PR-safe — bisa di-PR-review dulu)
git revert HEAD
git push origin main
# Coolify auto-deploy

# Opsi B: rollback instan (langsung pilih commit sebelumnya di Coolify)
# 1. Coolify → Application → "Git" → Checkout branch & commit
# 2. Pilih commit sebelumnya dari dropdown
# 3. Klik Deploy
```

### Rollback database (only if migration broke)

> ⚠️ **PERINGATAN**: Rollback DB bisa kehilangan data. Hanya untuk emergency.

```bash
# Stop app container (prevent new writes)
ssh root@130.254.47.93 \
  "docker stop \$(docker ps -q -f ancestor=nqsjafrei6k8dkup1pxkcuwf)"

# Restore dari dump (lihat §8 untuk detail)
gunzip < /data/backups/db-2026-09-02.sql.gz | \
  ssh root@130.254.47.93 \
  "docker exec -i \$(docker ps --format '{{.Names}}' | grep '^rebicrj57r3afbg9knieq9ks' | head -1) \
   mysql -usocio -p\"\\\$DB_PASS\" socio_smm"

# Restart app
ssh root@130.254.47.93 \
  "docker start \$(docker ps -aq -f ancestor=nqsjafrei6k8dkup1pxkcuwf)"
```

### Rollback container image (kalau image corrupt)

```bash
# List images lokal
ssh root@130.254.47.93 'docker images | grep nqsjafrei6k8dkup1pxkcuwf'
# Pilih image tag sebelumnya, redeploy via Coolify
```

---

## 6. Log & monitoring

### Live tail logs

```bash
# App logs (SvelteKit + cron)
ALIAS_ATAS=$(ssh root@130.254.47.93 'docker ps --format "{{.Names}}" | grep "^nqsjafrei6k8dkup1pxkcuwf" | head -1')
ssh root@130.254.47.93 "docker logs --tail 100 -f $ALIAS_ATAS"

# Filter by error
ssh root@130.254.47.93 "docker logs --since 1h $ALIAS_ATAS 2>&1 | grep -iE 'error|warn|fail'"

# Filter turnstile logs (debug widget)
ssh root@130.254.47.93 "docker logs --since 1h $ALIAS_ATAS 2>&1 | grep -i turnstile"

# Filter cron logs
ssh root@130.254.47.93 "docker logs --since 24h $ALIAS_ATAS 2>&1 | grep -E '^\[cron\]'"
```

### Coolify sentinel (health monitoring)

Coolify-sentinel cek container health setiap 60s. Check dashboard **Coolify → Resources** untuk status semua container (Up/Down/Restarting).

### Metrics yang dimonitor

| Metrik | Cara cek | Threshold alert |
|---|---|---|
| Container up | Coolify dashboard / `docker ps` | Down > 5 menit |
| CPU/RAM app | Coolify → Application → Resources | CPU > 80% sustained |
| MySQL connections | `docker exec ... mysql -e "SHOW STATUS LIKE 'Threads_connected'"` | > 100 |
| MySQL slow queries | `mysql -e "SHOW VARIABLES LIKE 'long_query_time'"` lalu cek slow log | > 5s per query |
| Cron health | logs `[cron]` prefix | Job skip/error |
| Disk usage | `df -h /data` | > 85% |
| SSL cert expiry | `echo \| openssl s_client -connect ...` | < 30 hari |

### Alert setup (manual)

Saat ini pakai Coolify sentinel + manual log check (no PagerDuty/OpsGenie). Untuk M6+: integrasi dengan UptimeRobot → Telegram webhook.

---

## 7. Cron jobs

Cron berjalan **di dalam app container** via `node-cron` (bukan sistem cron VPS). Di-trigger oleh `app/src/cron/index.ts` saat app boot (kalau `SOCIO_CRON_ENABLED=1`).

### Active jobs (M5 saat ini)

| Job | Schedule | Tanggung jawab | Logging prefix |
|---|---|---|---|
| `provider-sync` | setiap 1 jam | Sinkronisasi katalog provider SMM (SMMturk) | `[cron] provider-sync` |
| `status-polling` | setiap 1 menit (stratified) | Polling status order ke provider | `[cron] status-polling` |
| `email-queue` | setiap 1 menit | Kirim email dari queue | `[cron] email-queue` |
| `auto-cancel-stale` | setiap 5 menit | Cancel order pending stale | `[cron] auto-cancel` |
| `cleanup-rate-limit` | setiap 1 jam | Pangkas row rate_limit expired | `[cron] cleanupRateLimits` |

### Manual trigger cron job (debug)

```bash
# Tidak ada endpoint publik — restart container untuk trigger ulang.
# Semua job berjalan on-boot (`runOnAppStart`), lihat app/src/cron/index.ts
ssh root@130.254.47.93 \
  "docker restart \$(docker ps -q -f ancestor=nqsjafrei6k8dkup1pxkcuwf)"
```

### Add new cron job

1. Edit `app/src/cron/jobs/<nama-job>.ts` (lihat pattern existing)
2. Register di `app/src/cron/index.ts`
3. Test lokal: `pnpm dev` (cron jalan on-boot)
4. Commit + push → Coolify auto-deploy + restart
5. Monitor logs untuk 1 siklus penuh

> Cron job jalan di single instance (app container). Kalau ada multiple replicas (skala horizontal), perlu distributed lock (Redis/DB) untuk prevent double-execution. Saat ini single-instance aman.

---

## 8. Backup & restore

### MySQL backup otomatis

Ada cron job di VPS host (bukan di container app) untuk daily MySQL dump:

```bash
# Cek cron di host
ssh root@130.254.47.93 'crontab -l | grep -i dump'
# Expected: 0 3 * * * /data/scripts/backup-db.sh (cron 03:00 UTC)
```

Lokasi: `/data/backups/db-YYYY-MM-DD.sql.gz` (retention 7 hari, di-rotate otomatis oleh script).

### Manual backup sekarang

```bash
DB_PASS=$(ssh root@130.254.47.93 \
  "docker exec \$(docker ps -q -f ancestor=nqsjafrei6k8dkup1pxkcuwf) printenv SOCIO_DB_URL" | \
  sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')

ssh root@130.254.47.93 "
  docker exec \$(docker ps --format '{{.Names}}' | grep '^rebicrj57r3afbg9knieq9ks' | head -1) \
    mysqldump -usocio -p\"$DB_PASS\" socio_smm | gzip > /data/backups/db-manual-\$(date +%F-%H%M).sql.gz
"
ls -lh /data/backups/db-manual-*.sql.gz  # di VPS
```

### Restore dari backup

> Lihat [SOCIOID_DOMAIN.md §11 Disaster Recovery](./SOCIOID_DOMAIN.md#11-disaster-recovery) untuk prosedural lengkap.

Quick restore:

```bash
# 1. Stop app container
ssh root@130.254.47.93 \
  "docker stop \$(docker ps -q -f ancestor=nqsjafrei6k8dkup1pxkcuwf)"

# 2. Restore
gunzip < /data/backups/db-2026-09-02.sql.gz | ssh root@130.254.47.93 "
  docker exec -i \$(docker ps --format '{{.Names}}' | grep '^rebicrj57r3afbg9knieq9ks' | head -1) \
    mysql -usocio -p\"$DB_PASS\" socio_smm
"

# 3. Restart app (Cron akan jalan on-boot → provider sync re-pull katalog)
ssh root@130.254.47.93 \
  "docker start \$(docker ps -aq -f ancestor=nqsjafrei6k8dkup1pxkcuwf)"

# 4. Verify
curl -sI https://app.socio.id/ | head -1   # HTTP/2 200
```

---

## 9. Troubleshooting

### Cek cepat (90% masalah umum)

```bash
# 1. Container hidup?
ssh root@130.254.47.93 'docker ps --format "{{.Names}}\t{{.Status}}" | grep -E "nqsjafrei6k8|rebicrj57r3"'

# 2. App log error terakhir 5 menit
ssh root@130.254.47.93 \
  "docker logs --since 5m \$(docker ps -q -f ancestor=nqsjafrei6k8dkup1pxkcuwf) 2>&1 | tail -50"

# 3. DB reachable dari app?
ssh root@130.254.47.93 \
  "docker exec \$(docker ps -q -f ancestor=nqsjafrei6k8dkup1pxkcuwf) \
   node -e 'fetch(\"https://challenges.cloudflare.com/turnstile/v0/siteverify\",{method:\"POST\",body:new URLSearchParams({secret:\"\",response:\"\"})}).then(r=>r.text()).then(console.log).catch(console.error)' 2>&1 | head -3"
# Expected: keluar JSON atau error "fetch failed" → diagnose networking

# 4. Coolify panel reachable?
curl -sI https://130.254.47.93:8000/ -k | head -1  # HTTP/2 200 (atau 302 ke login)
```

### Common issues

| Gejala | Diagnosa | Fix |
|---|---|---|
| Login error "Verifikasi gagal" | Turnstile secret/sitekey mismatch | Lihat `docs/deploy/SOCIOID_DOMAIN.md` §7 |
| Login error "Email atau password salah" padahal password benar | DB hash mismatch / user.status=Blacklist | Query DB: `SELECT status FROM users WHERE email='...'` |
| Login error 500 | Cookie parsing / DB connection | Cek app logs `[turnstile]`, `ECONNREFUSED 3306` |
| Order status stuck "Pending" | Provider API down / cron error | Cek logs `[cron] status-polling` |
| Top-up stuck "Pending" | Admin belum konfirmasi manual, atau admin user 'info@beriklan' belum terima BCA | Cek inbox email + R2 `proofs/` folder |
| Static 404 | Build error / wrong route | Coolify → Application → Logs → "vite: not found" biasanya pnpm fix |
| Container restart loop | Healthcheck fail | Coolify → Resources → check exit code; biasanya DB unreachable |
| Disk penuh | DB dumps / logs menumpuk | `ssh ... 'du -sh /data/*'` + cleanup logs lama |
| VPS tidak reachable | Network issue / VPS down | Cek Tencent Cloud console; SSH dari provider web console |

### Network debug

```bash
# Test DNS dari VPS
ssh root@130.254.47.93 'dig +short app.socio.id 130.254.47.93 cdn.socio.id'

# Test ke external API (SMMturk)
ssh root@130.254.47.93 \
  "docker exec \$(docker ps -q -f ancestor=nqsjafrei6k8dkup1pxkcuwf) \
   curl -s -o /dev/null -w '%{http_code}\n' https://smmturk.org/api/v2"

# Test ke R2 (S3 endpoint)
ssh root@130.254.47.93 \
  "docker exec \$(docker ps -q -f ancestor=nqsjafrei6k8dkup1pxkcuwf) \
   curl -s -o /dev/null -w 'r2:%{http_code}\n' https://0298214d1069f75436f490b51ea4763e.r2.cloudflarestorage.com"
```

### SSH key rusak (deploy webhook GAGAL)

Gejala: Coolify deploy "Permission denied (publickey)".

```bash
# 1. SSH ke VPS sebagai root
ssh root@130.254.47.93

# 2. Lihat key di Coolify storage (mungkin rusak karena unserialize bug)
ls -la /data/coolify/ssh/keys/

# 3. Lihat di dalam container
docker exec coolify ls -la /var/www/html/storage/app/ssh/keys/

# 4. Kalau file corrupt (prefix "s:..." atau format salah), patch PHP accessor:
# Lihat docs/operations/server-migration-2026-09-02.md §Coolify v4.3.14 unserialize bug

# 5. Atau rotate: hapus server, add ulang di Coolify dashboard
# Penting: pakai encrypt(raw_key), bukan raw, untuk private_keys.private_key
```

---

## 10. Security & maintenance

### SSH hardening

```bash
# Login root hanya via key (no password)
ssh root@130.254.47.93 'grep "^PermitRootLogin\|^PasswordAuthentication\|^PermitEmptyPasswords" /etc/ssh/sshd_config'
# Expected: PermitRootLogin prohibit-password, PasswordAuthentication no
```

### Fail2ban

```bash
ssh root@130.254.47.93 'systemctl status fail2ban'
# Expected: active (running)

# Lihat banned IPs
ssh root@130.254.47.93 'fail2ban-client status sshd'
```

### Auto security updates

```bash
ssh root@130.254.47.93 'apt list --upgradable 2>/dev/null | head -5'
# Update OS:
ssh root@130.254.47.93 'unattended-upgrade -d'
```

### Coolify panel security

- Login pakai **email + password panjang** (bukan default)
- Enable **2FA** di **Coolify → Settings → Security**
- Backup token Coolify ke password manager; rotate tiap 90 hari
- IP allowlist (opsional, M6+): **Settings → Security → IP Allowlist** — whitelist IP kantor/devs

### Secret rotation (quarterly)

| Secret | Cara rotate |
|---|---|
| `SOCIO_AUTH_SECRET` | Generate baru + update Coolify env + redeploy. Invalidates semua session. |
| `SOCIO_PROVIDER_ENC_KEY` | **JANGAN rotate setelah dipakai encrypt data** — data lama tidak bisa decrypt. Rotate hanya jika belum pernah dipakai. |
| R2 API token | Lihat SOCIOID_DOMAIN §6 |
| Coolify API token | Delete + create baru via dashboard |
| MySQL password | Coolify → DB → reset; update `SOCIO_DB_URL` env; redeploy |
| SMTP password | Mailserver admin → reset; update `SMTP_PASS` env; redeploy |

### Node + pnpm upgrade (optional, per quarter)

Edit `app/package.json` + `package.json` (root) untuk versi baru → `pnpm install` → test → commit. Coolify auto-build image baru.

> ⚠️ better-auth pinned ke **1.2.7** — jangan bump ke 1.5+ (breaks build). Lihat [`docs/COOLIFY_DEPLOY.md`](../COOLIFY_DEPLOY.md).

---

## Cross-reference docs

| Topik | File |
|---|---|
| DNS + Cloudflare zone | [`deploy/SOCIOID_DOMAIN.md`](./SOCIOID_DOMAIN.md) |
| First-time deploy | [`../VPS_DEPLOY_RUNBOOK.md`](../VPS_DEPLOY_RUNBOOK.md) |
| Coolify panel setup | [`../COOLIFY_DEPLOY.md`](../COOLIFY_DEPLOY.md) |
| Cloudflare R2 setup | [`../secrets-setup/01-cloudflare-r2.md`](../secrets-setup/01-cloudflare-r2.md) |
| Turnstile setup | [`../secrets-setup/05-turnstile.md`](../secrets-setup/05-turnstile.md) |
| Environment variables reference | [`../.env.example`](../../.env.example) |
| Admin password / feature gap | [`../ADMIN_GAP.md`](../ADMIN_GAP.md) |
| Server migration history | [`../operations/server-migration-2026-09-02.md`](../operations/server-migration-2026-09-02.md) |
