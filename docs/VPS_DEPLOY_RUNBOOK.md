# VPS Deploy Runbook — Socio.id

> **Target:** deploy `app.socio.id` (SvelteKit + node-cron) + MySQL 8.0 + Coolify + Cloudflare.
> **Topologi final (per diskusi):**
> - **Landing `socio.id`** → **Cloudflare Pages** (gratis, edge cached, latency ID ~10-20ms)
> - **App `app.socio.id`** → **Contabo Cloud VPS 4 (Singapore)** + Coolify + Docker
> - **DB** → Docker container di VPS yang sama (private network bridge, tidak exposed internet)
> **Waktu:** ~1-2 jam untuk first-time deploy.

---

## 1. Arsitektur final

```
user ──► Cloudflare (DNS+CDN+proxy orange)
           │
           ├── socio.id     ──► CF Pages (Astro landing, GRATIS, edge cache SG/JKT)
           │
           └── app.socio.id ──► CF proxy orange ──► VPS Contabo Singapore (4 vCPU/8 GB/100 GB)
                                       │
                                       ├─► Coolify (panel :8000) + Traefik reverse-proxy (auto SSL via DNS-01)
                                       ├─► App container (SvelteKit + node-cron) port 3000
                                       ├─► DB container (MySQL 8.0) port 3306 — docker network bridge internal
                                       ├─► Backup volume di /data (lokal, nanti)
                                       │
                                       └──► outbound: SMMturk API, Resend, CF R2
```

**Kenapa pisah landing ke CF Pages** (bukan di VPS):
- **$0/bln** — CF Pages gratis unlimited bandwidth
- **Latency ID ~10-20ms** vs VPS Chicago ~200ms
- **Isolasi reliability** — VPS app down, landing masih jalan
- **Single repo, dual deploy** — `landing/` folder connect via GitHub ke CF Pages, app di-deploy ke VPS via Coolify
- **DDoS protection** gratis di CF proxy

**Kenapa DB di VPS yang sama (bukan managed)**:
- Murah — $5/bln untuk app + DB vs $29/bln ke TiDB/PlanetScale
- Docker network bridge — DB **tidak** exposed ke internet, hanya app container yang akses
- Backup volume lokal di `/data/coolify/db/data` (300 GB SSD-cached, lebih dari cukup)

**Risiko & mitigasi Chicago latency** untuk `app.socio.id`:
- Static assets (CSS/JS/images via R2) → cache di CF edge → latency turun drastis
- HTML response app (~50 KB) → CF cache sesuai `cache-control` header; default no-cache untuk SSR
- Live SSE → tetap real-time, latency jadi ~250ms tapi acceptable
- DB query internal di Chicago VPS (50-100ms) → masih acceptable untuk request biasa
- **Optimization**: aktifkan CF Argo Smart Routing (~$5/bln extra, worth it kalau traffic tinggi); atau enable CF cache untuk endpoint tertentu (`/layanan`, `/` user dashboard)


---

## 2. Beli VPS + initial setup

### 2.1 Beli VPS — Contabo Cloud VPS 4 (Coolify First App) per keputusan 25 Agt 2026

**Pilihan final: [Contabo Cloud VPS 4 — Coolify First App](https://contabo.com/en/coolify-vps/)** (lokasi Singapore — paling dekat ke Indonesia).

| Plan | Spec | Harga | Catatan |
|---|---|---|---|
| **Cloud VPS 4 (Coolify First App)** | 4 vCPU / 8 GB RAM / 100 GB SSD NVMe / **Singapore** | **€5.28/bln (~Rp92rb)** | ✅ Recommended — latency ID ~50-90ms (3-5× lebih cepat dari Chicago), Coolify **pre-installed free** + Contabo support handle initial install |
| Cloud VPS 6 (Coolify Production) | 6 vCPU / 12 GB / 200 GB | €7.20/bln (~Rp126rb) | Over-spec, kalau traffic tinggi |
| Cloud VPS 12 (Coolify Growing) | 12 vCPU / 48 GB / 400 GB | €24/bln (~Rp420rb) | Jauh over-spec |

**Order**: https://contabo.com/en/configure/vps/cloud-vps-core-4

Setup waktu order:
- **Region: Singapore** (penting — latency ID terbaik dari semua VPS murah)
- Image: pilih **Coolify — First App** (Ubuntu 22.04 + Coolify pre-installed)
- Initial password: set kuat, simpan di password manager
- Add-on opsional: **Auto Backup** (~€2-3/bln — snap otomatis mingguan, restore 1-klik)

Setelah order diproses (~5 menit), Contabo kirim email dengan:
- IP VPS
- Root password (kalau tidak pakai SSH key di awal)
- URL Coolify panel: `http://<IP>:8000`

### 2.2 Setup awal SSH

```bash
# Dari laptop lokal — login SSH pertama
ssh root@<IP-VPS>

# 1. Update OS + install paket dasar
apt update && apt upgrade -y
apt install -y curl wget git ufw vim nano htop ca-certificates

# 2. Set timezone (penting untuk cron & log WIB)
timedatectl set-timezone Asia/Jakarta
ln -sf /usr/share/zoneinfo/Asia/Jakarta /etc/localtime

# 3. Setup swap 4 GB (WAJIB — cron SMMturk burst bisa makan RAM 800MB, total app+cron+DB+Coolify di VPS 4 GB)
fallocate -l 4G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
# verify
free -h
# vm.swappiness = 10 (pakai swap hanya kalau perlu)
sysctl vm.swappiness=10
echo 'vm.swappiness=10' >> /etc/sysctl.d/99-swap.conf

# 4. Setup firewall — DEFAULT DENY, allow only needed
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP (Traefik acme)
ufw allow 443/tcp   # HTTPS
ufw allow 8000/tcp  # Coolify UI (opsional — bisa ditutup setelah setup)
# 3306 TIDAK di-expose ke publik (docker internal only)
ufw enable
ufw status

# 5. Setup non-root user (opsional, untuk SSH harian; root tetap untuk Coolify)
adduser deploy
usermod -aG sudo deploy
# copy SSH key dari laptop lokal
mkdir -p /home/deploy/.ssh
# (dari laptop): ssh-copy-id -i ~/.ssh/id_ed25519.pub deploy@<IP>

# 6. Disable root SSH login via password (key-only)
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart sshd
```

### 2.3 (Opsional) Setup Cloudflare DNS dulu

Di dashboard Cloudflare zone `socio.id`:
- `A app.socio.id <IP-VPS> Proxied` (orange cloud) — VPS app
- `A socio.id <IP-CF-PAGES> Proxied` (orange cloud) — landing di CF Pages (otomatis ter-resolve ke CF edge, gak perlu IP asli)
- `A cdn.socio.id <R2-IP atau CNAME> Proxied`

---

## 3.5 Setup Cloudflare Pages untuk landing `socio.id` (SEBELUM setup VPS)

Landing pakai `landing/` folder (Astro 5 + Svelte 5 islands, sudah ada). Deploy ke Cloudflare Pages via GitHub integration.

### 3.5.1 Push repo ke GitHub (kalau belum)
```bash
# Di laptop lokal
cd /Users/maabook/Desktop/socio.id
git init  # kalau belum
git remote add origin https://github.com/<user>/socio.id.git
# Pastikan landing/folder ada & .gitignore exclude node_modules + .env
git add -A
git commit -m "feat: rebuild socio.id v2 — pre-deploy"
git push -u origin main
```

### 3.5.2 Connect Cloudflare Pages
1. Dashboard CF: https://dash.cloudflare.com → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
2. Pilih repo `socio.id`, branch `main`
3. **Build settings**:
   - **Framework preset**: Astro
   - **Build command**: `pnpm --filter landing build`
   - **Build output directory**: `landing/dist`
   - **Root directory**: `/` (jangan set; biarkan default — pnpm monorepo)
   - **Environment variables**:
     - `NODE_VERSION=20`
     - `PNPM_VERSION=9.15.9`
4. Klik **Save and Deploy** — first build ~3-5 menit
5. Setelah sukses, CF kasih domain `*.socio-id.pages.dev` — test dulu
6. **Custom domain**: Settings → Custom domains → Add `socio.id` + `www.socio.id`
7. Di DNS zone `socio.id`, kalau CF otomatis — `A socio.id 192.0.2.1 Proxied` (CF Pages IP generic). Kalau tidak, biarkan DNS CF auto-add.

### 3.5.3 Konfigurasi redirect `www` → apex
- CF Pages → Settings → Custom domains
- Pastikan hanya `socio.id` yang primary; `www.socio.id` set ke **bulk redirect** ke `socio.id` (atau sebaliknya)

### 3.5.4 Preview deploys per PR
- CF Pages auto-create preview URL untuk tiap git push ke non-main branch — sudah built-in, gak perlu setup

### 3.5.5 Custom domain R2 (cdn.socio.id) — setup sekali
1. CF Dashboard → **R2** → Create bucket `socio`
2. R2 bucket → Settings → **Public access** → **Custom domain** → `cdn.socio.id`
3. DNS zone → CF auto-add `CNAME cdn.socio.id <bucket>.r2.dev Proxied`
4. Test: `curl -I https://cdn.socio.id/` (404 expected, tapi SSL valid)

### 3.5.6 Setup Resend domain verification (untuk email)
1. Daftar di https://resend.com (free tier 3k/bln)
2. Domains → Add domain → `socio.id`
3. Resend kasih **3 DNS records** (DKIM + SPF + return-path) — tambahkan di CF DNS
4. Verify (5-15 menit propagasi DNS)
5. Buat API key (Settings → API Keys)
6. Simpan sebagai `RESEND_API_KEY` di Coolify nanti (env §5.3)

---

## 3. Install Coolify (panel + reverse-proxy + auto-SSL)

```bash
# Di VPS sebagai root
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash

# Tunggu 5-10 menit — Docker akan terinstall otomatis
# Setelah selesai, akses: http://<IP-VPS>:8000

# Setup admin:
# - Email + password
# - Skip "register server" (self-hosted)
# - Set nama instance: socio-prod
# - Cloudflare proxy: enabled (Coolify support Let's Encrypt via DNS-01)
```

**Setup Cloudflare DNS-01 (auto SSL) di Coolify**:
- Settings → Server → Domains → Add `app.socio.id`
- Pilih **DNS-01 challenge** (pakai Cloudflare API token)
- Di CF: https://dash.cloudflare.com/profile/api-tokens → Create Token → Template "Edit DNS"
- Simpan token di Coolify Secrets → CLOUDFLARE_API_TOKEN
- Sekarang SSL `*.socio.id` auto-issue tiap add domain

Setelah selesai, **tutup port 8000** dari publik (akses via SSH tunnel saja):
```bash
ufw delete allow 8000/tcp
# Atau pakai Cloudflare Tunnel (opsional, lebih aman): coolify.io/docs/knowledge-base/cloudflare-tunnels
```

---

## 4. Setup DB container di Coolify

Coolify support Docker Compose native — pakai itu untuk setup MySQL + phpMyAdmin (UI web).

### 4.1 Buat `docker-compose.yml` untuk DB + backup volume

Di VPS, buat folder `/data/coolify/db/`:
```bash
mkdir -p /data/coolify/db/{data,backups,logs}
```

Buat `/data/coolify/db/docker-compose.yml`:
```yaml
services:
  mysql:
    image: mysql:8.0
    container_name: socio_mysql
    restart: unless-stopped
    command:
      - --character-set-server=utf8mb4
      - --collation-server=utf8mb4_unicode_ci
      - --default-authentication-plugin=mysql_native_password
      - --max_connections=200
      - --innodb-buffer-pool-size=512M
      - --query-cache-size=0
      - --slow-query-log=ON
      - --slow-query-log-file=/var/log/mysql/slow.log
      - --long-query-time=1
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}        # generate 32 char
      MYSQL_DATABASE: socio_smm
      MYSQL_USER: socio_app
      MYSQL_PASSWORD: ${MYSQL_APP_PASSWORD}              # generate 32 char
      TZ: Asia/Jakarta
    volumes:
      - ./data:/var/lib/mysql
      - ./backups:/backups
      - ./logs:/var/log/mysql
    networks:
      - socio_net
    ports:
      # TIDAK expose ke host — hanya app container yang akses via network bridge
      # Kalau perlu debug dari host, uncomment + bind ke 127.0.0.1
      # - "127.0.0.1:3306:3306"
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-p${MYSQL_ROOT_PASSWORD}"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 30s

  phpmyadmin:
    image: phpmyadmin:latest
    container_name: socio_phpmyadmin
    restart: unless-stopped
    environment:
      PMA_HOST: mysql
      PMA_PORT: 3306
      UPLOAD_LIMIT: 300M
    networks:
      - socio_net
    depends_on:
      mysql:
        condition: service_healthy
    # Expose via Traefik label (Coolify paham)
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.phpmyadmin.rule=Host(`pma.socio.id`)"
      - "traefik.http.routers.phpmyadmin.entrypoints=https"
      - "traefik.http.routers.phpmyadmin.tls=true"
      - "traefik.http.routers.phpmyadmin.tls.certresolver=letsencrypt"
      - "traefik.http.services.phpmyadmin.loadbalancer.server.port=80"
    # Bypass auth via Cloudflare Access (opsional, kalau mau admin-only)

networks:
  socio_net:
    driver: bridge
    name: socio_net
```

Buat `.env` di folder yang sama:
```bash
cat > /data/coolify/db/.env <<'EOF'
MYSQL_ROOT_PASSWORD=GENERATE_32_CHAR_HERE
MYSQL_APP_PASSWORD=GENERATE_OTHER_32_CHAR_HERE
EOF
chmod 600 /data/coolix/db/.env
```

Generate password:
```bash
openssl rand -base64 32
openssl rand -base64 32
```

### 4.2 Deploy via Coolify
- Coolify → New Resource → Docker Compose → pilih `/data/coolify/db/docker-compose.yml`
- Deploy → cek logs mysql container sampai "ready for connections"

### 4.3 Import dump dari lokal (kalau sudah ada data user)
```bash
# Di laptop lokal (export dari MySQL lokal)
mysqldump -h 127.0.0.1 -u root --single-transaction --routines --triggers socio_smm > socio_smm_2026_08.sql

# Upload ke VPS
scp socio_smm_2026_08.sql root@<IP-VPS>:/tmp/

# Di VPS — import ke container
docker exec -i socio_mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" socio_smm < /tmp/socio_smm_2026_08.sql
```

**Catatan penting untuk TiDB → MySQL 8.0:** schema sudah kompatibel (Drizzle-generated, MySQL dialect). Tapi `local.settings` dan `local.tunnel` tables TiDB-specific mungkin error — skip dengan:
```bash
docker exec -i socio_mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" --force < /tmp/socio_smm_2026_08.sql 2>&1 | grep -v "Unknown table" | tee /tmp/import.log
```

---

## 5. Deploy app SvelteKit via Coolify

### 5.1 Push repo ke GitHub (private)

```bash
# Di laptop lokal
cd /Users/maabook/Desktop/socio.id
git init   # kalau belum
git remote add origin https://github.com/<user>/socio.id.git
git checkout -b main
git add -A
git commit -m "feat: rebuild socio.id v2 — pre-deploy"
# Push
git push -u origin main
```

**Pastikan `.gitignore` exclude `.env`** dan secrets ada di Coolify Secrets (bukan di repo).

### 5.2 Setup di Coolify

- New Resource → **Application** (bukan Compose)
- **GitHub** source: `https://github.com/<user>/socio.id`
- Branch: `main`
- Build Pack: **Dockerfile** (auto-detect dari monorepo)

Buat `Dockerfile` di root (untuk monorepo, multi-stage):
```dockerfile
# syntax=docker/dockerfile:1.6

# Stage 1: deps
FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/db/package.json ./packages/db/
COPY packages/core/package.json ./packages/core/
COPY packages/ui/package.json ./packages/ui/
COPY app/package.json ./app/
RUN pnpm install --frozen-lockfile --prod=false

# Stage 2: build
FROM deps AS build
COPY packages ./packages
COPY app ./app
RUN pnpm --filter @socio/db generate 2>/dev/null || true
RUN pnpm --filter app build

# Stage 3: production deps only
FROM deps AS prod-deps
RUN pnpm install --frozen-lockfile --prod --filter @socio/app --filter @socio/core --filter @socio/ui --filter @socio/db

# Stage 4: runtime
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV TZ=Asia/Jakarta

RUN apk add --no-cache tini curl
RUN addgroup -g 1001 nodejs && adduser -D -u 1001 -G nodejs socio
COPY --from=build --chown=socio:nodejs /app/app/build /app/app/build
COPY --from=build --chown=socio:nodejs /app/node_modules /app/node_modules
COPY --from=prod-deps --chown=socio:nodejs /app/node_modules /app/node_modules
COPY --from=build /app/package.json /app/package.json
COPY --from=build /app/pnpm-workspace.yaml /app/pnpm-workspace.yaml
COPY --from=build /app/packages ./app/packages
COPY --from=build /app/app/package.json /app/app/package.json

WORKDIR /app/app
USER socio
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "build/index.js"]
```

Tunggu — adapter-node output di `app/build/`, pastikan di SvelteKit config `adapter: "node"` dan `out: "build"`.

### 5.3 Environment variables (di Coolify → app → Environment)

Wajib (ganti dengan nilai asli):
```bash
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
TZ=Asia/Jakarta

# App
SOCIO_APP_URL=https://app.socio.id
SOCIO_LANDING_URL=https://socio.id
SOCIO_DEV=0

# DB (point ke container MySQL di network bridge)
SOCIO_DB_URL=mysql://socio_app:<MYSQL_APP_PASSWORD>@socio_mysql:3306/socio_smm?charset=utf8mb4

# Auth
SOCIO_AUTH_SECRET=<openssl rand -base64 48>
SOCIO_PROVIDER_ENC_KEY=<openssl rand -hex 32>     # 64 hex chars = 32 byte AES-256
BETTER_AUTH_URL=https://app.socio.id
SOCIO_SECURE_COOKIES=1
SOCIO_TURNSTILE_ENABLED=0                            # set 1 setelah dapat prod CF keys
SOCIO_TURNSTILE_SITEKEY=
SOCIO_TURNSTILE_SECRET=
# Client IP belakang proxy (Cloudflare). Tanpa ini semua klien terlihat sebagai
# IP docker gateway → rate-limit global shared + session log IP salah.
# (Catatan Turnstile: siteverify dikirim TANPA remoteip — token-only, aman.)
ADDRESS_HEADER=cf-connecting-ip

# Email (Resend — verified domain)
RESEND_API_KEY=re_xxx
SOCIO_MAIL_FROM=noreply@socio.id
SOCIO_MAIL_FROM_NAME=Socio ID
SOCIO_MAIL_SUPPORT=support@socio.id

# Provider SMM
SOCIO_SMMTURK_KEY=xxx
SOCIO_USD_TO_IDR=15800
SOCIO_SMMTURK_URL=https://smmturk.org/api/v2

# Storage (Cloudflare R2)
CF_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET=socio
R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://cdn.socio.id

# Web Push (VAPID)
VAPID_PUBLIC_KEY=xxx
VAPID_PRIVATE_KEY=xxx
VAPID_SUBJECT=mailto:support@socio.id

# Cron (enable di prod, off di staging)
SOCIO_CRON_ENABLED=1
```

**Cara generate secrets:**
```bash
# SOCIO_AUTH_SECRET (32+ char)
openssl rand -base64 48
# SOCIO_PROVIDER_ENC_KEY (64 hex = 32 byte AES-256)
openssl rand -hex 32
```

### 5.4 Deploy

- Coolify → Deploy
- Tunggu build ~3-5 menit (pnpm install + vite build)
- Lihat logs — kalau "Server listening on 0.0.0.0:3000" sukses

---

## 6. Smoke test

```bash
# 1. Healthcheck dari VPS
curl -sf https://app.socio.id | head -20
# Harusnya return HTML dashboard / redirect ke /login

# 2. DB connectivity dari app
docker exec -it $(docker ps -qf name=socio_app) sh
wget -q -O- http://localhost:3000/api/healthcheck 2>/dev/null || echo "no healthcheck endpoint"
# Atau test via Coolify logs

# 3. Login admin
# Buka https://app.socio.id/login
# Login: testadmin@socio.local / admin123 (atau admin yang sudah ada)
# Akses /admin → dashboard harus jalan
```

**Provision test user** (kalau DB fresh):
```bash
docker exec -it socio_mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" socio_smm
# Di mysql prompt:
INSERT INTO users (full_name, username, email, password, level, balance, status, verify, created_at)
VALUES ('Test Admin', 'testadmin', 'testadmin@socio.local',
        -- bcrypt hash dari 'admin123' (10 rounds)
        '$2a$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        'Admin', 0, '1', 'Yes', NOW());
```

Generate bcrypt hash via Node:
```bash
node -e "console.log(require('bcryptjs').hashSync('admin123', 10))"
```

---

## 7. Hardening + monitoring

### 7.1 Security headers & SSL
- Traefik (via Coolify) auto-issue SSL via DNS-01 Cloudflare challenge — `https://app.socio.id` auto-HTTPS
- HSTS sudah di `app/src/hooks.server.ts:150`
- CSP di `hooks.server.ts:154-174` — review setelah production (cek apakah ada script inline yang diblok)

### 7.2 Fail2ban (SSH brute force protection)
```bash
apt install -y fail2ban
systemctl enable fail2ban
```

### 7.3 Auto security updates
```bash
apt install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades
```

### 7.4 Logrotate
```bash
cat > /etc/logrotate.d/socio <<'EOF'
/data/coolify/db/logs/*.log {
    daily
    rotate 14
    compress
    missingok
    notifempty
    copytruncate
}
EOF
```

### 7.5 Backup (nanti, di luar scope ini)
- `mysqldump` harian cron → upload ke CF R2 bucket `socio-db-backup`
- Retention 30 hari

---

## 8. Checklist deploy (centang sebelum go-live)

### Pre-deploy
- [ ] VPS dibeli (4 GB RAM min, Ubuntu 22.04)
- [ ] SSH key-only login (password off)
- [ ] Firewall: hanya 22/80/443 + 8000 opsional
- [ ] Swap 4 GB aktif
- [ ] Coolify terinstall + Cloudflare DNS-01 token
- [ ] MySQL container running + imported dump
- [ ] Repo pushed ke GitHub private

### Deploy
- [ ] Dockerfile jalan (build sukses di Coolify)
- [ ] Container start + "Server listening on 3000"
- [ ] https://app.socio.id/ resolve ke VPS (CF proxy)
- [ ] SSL valid (Traefik auto-issue)
- [ ] `SOCIO_APP_URL=https://app.socio.id` di env

### Post-deploy smoke test
- [ ] `/login` render OK
- [ ] Login admin testadmin → redirect ke `/admin`
- [ ] Dashboard `/admin` metrics load (users/orders/queue)
- [ ] Buat order test via user → masuk ke `/admin/orders`
- [ ] Trigger provider sync `/admin/providers` → "ok"
- [ ] Email verifikasi terkirim (cek Resend dashboard)
- [ ] Cron jalan: cek logs `Provider sync` tiap jam, `Status polling` tiap menit
- [ ] DB backup placeholder (volume mounted, backup nanti)

### Monitoring
- [ ] Coolify dashboard: container health + CPU/RAM
- [ ] Logs: `docker logs -f socio_app | ccze` atau `tail -f` Coolify UI
- [ ] Uptime: `uptimekuma` atau healthchecks.io (opsional)

---

## 9. Recovery / rollback

### Restart container
```bash
# Via Coolify UI: klik "Restart" pada app
# Via CLI:
docker restart socio_app
```

### Rollback deployment
- Coolify → Deployments → pilih deployment sebelumnya → "Redeploy"

### DB restore dari backup (kalau sudah setup)
```bash
docker exec -i socio_mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" socio_smm < /backups/socio_smm_YYYYMMDD.sql
```

### Disaster: VPS mati total
1. Spin up VPS baru
2. Install Coolify + DB container
3. Restore dari R2 backup
4. Update CF DNS (kalau IP berubah)
5. Deploy app container

---

## 10. Estimasi biaya bulanan

| Komponen | Biaya |
|---|---|
| VPS Contabo Cloud VPS 4 (Singapore, 4 vCPU/8 GB/100 GB) | **€5.28/bln (~Rp92rb)** |
| Domain `socio.id` (existing) | — |
| Cloudflare Pages (landing) | Rp0 |
| Cloudflare R2 (storage 10 GB + backup DB nanti) | Rp0 |
| Cloudflare DNS + proxy + SSL + DDoS | Rp0 |
| Resend email (3k/bln free) | Rp0 |
| Coolify (pre-installed gratis di VPS) | included |
| Contabo DDoS protection | included |
| **Total** | **~€5.28/bln (~Rp92rb)** |

Tambahan opsional:
- Contabo Auto Backup ~€2-3/bln (snap mingguan, restore 1-klik)
- Cloudflare Argo Smart Routing $5/bln (optimasi routing global, enable kalau traffic > 1k visitor/hari)

---

## 11. Topologi final sekali lagi (singkat)

```
Cloudflare (DNS+CDN)
├── socio.id      → CF Pages (landing, edge cache SG/JKT, GRATIS)
├── app.socio.id  → CF proxy → VPS Contabo SG
├── cdn.socio.id  → CF proxy → R2 bucket
└── pma.socio.id  → CF proxy → VPS (phpMyAdmin, opsional)

VPS Contabo Singapore (4 vCPU/8 GB/100 GB SSD)
├── Coolify panel + Traefik (auto SSL via DNS-01)
├── Container: socio_app (SvelteKit + node-cron, port 3000)
├── Container: socio_mysql (MySQL 8.0, port 3306 internal-only)
└── Container: socio_phpmyadmin (opsional, port 80 via Traefik)
```

**Latency ID ~50-90ms** (Singapore → Jakarta/Surabaya via CF proxy). Ideal untuk user mobile Indonesia.

---

## 12. Ringkasan step order (cheat sheet)

| # | Aksi | Alat | Waktu |
|---|---|---|---|
| 1 | Beli Contabo Cloud VPS 4 (Coolify First App, Singapore) | https://contabo.com/en/coolify-vps/ | 5 min |
| 2 | Setup CF Pages untuk landing via GitHub | CF dashboard | 15 min |
| 3 | Setup Resend + verify domain `socio.id` | resend.com dashboard | 15 min |
| 4 | SSH ke VPS, jalankan §2.2 (firewall, swap 4GB, timezone) | SSH root | 10 min |
| 5 | Coolify sudah pre-installed — skip §3 manual install | (auto) | 0 min |
| 6 | Setup DB container via Coolify compose (§4) | Coolify UI | 15 min |
| 7 | Import dump lokal (`mysqldump`) ke container MySQL | SSH | 10 min |
| 8 | Setup CF DNS API token di Coolify (DNS-01 SSL) | Coolify + CF | 10 min |
| 9 | Buat `app/Dockerfile` + setup env (§5) + deploy | Coolify UI | 20 min |
| 10 | Smoke test §6 + bugfix | curl + browser | 30 min |
| 11 | Hardening §7 (fail2ban, logrotate, close port 8000) | SSH | 10 min |
| 12 | Cutover DNS (opsional) + monitor 24 jam | CF + Coolify | ongoing |

**Total ~2.5 jam untuk first deploy** (skip install Coolify manual — sudah pre-installed oleh Contabo).

---

## 13. Struktur file repo setelah deploy (referensi)

```
socio.id/
├── app/                  ← SvelteKit + node-cron, deployed ke VPS via Coolify
│   ├── Dockerfile        ← (perlu dibuat — belum ada di repo, runbook §5.2 kasih contoh)
│   ├── src/
│   ├── build/            ← output dari `pnpm --filter app build`
│   └── package.json
├── landing/              ← Astro 5, deployed ke CF Pages (otomatis via GitHub integration)
│   ├── astro.config.mjs
│   ├── src/
│   └── package.json
├── packages/
│   ├── ui/               ← shared, di-include di app build
│   ├── core/             ← shared
│   └── db/               ← shared
├── data/                 ← LOCAL ONLY — JANGAN COMMIT (ada di .gitignore)
│   └── coolify/
│       ├── docker-compose.yml
│       └── db/
│           ├── data/     ← MySQL data dir (mounted volume)
│           ├── backups/  ← nanti
│           └── .env
├── docs/
│   ├── VPS_DEPLOY_RUNBOOK.md   ← (file ini)
│   ├── USER_FLOW_AUDIT.md
│   └── ADMIN_FLOW_AUDIT.md
├── .env.example
├── .gitignore
├── pnpm-workspace.yaml
└── REBUILD_PLAN.md
```

`.gitignore` **WAJIB** ada minimal:
```
node_modules
.svelte-kit
build
dist
.env*
data/
.screenshots/
audit-*.png
desktop-*.png
mobile-*.png
fab-*.png
*.log
.DS_Store
```

---

## 14. Yang perlu disiapkan sebelum deploy

Account/credential list:
- [ ] Contabo account + VPS aktif (Cloud VPS 4 Coolify First App, Singapore, Ubuntu 22.04 + Coolify pre-installed)
- [ ] GitHub account + repo `socio.id` (private)
- [ ] Cloudflare account (zone `socio.id` existing)
- [ ] Resend account + verified `socio.id` domain
- [ ] Better-auth secret (generate 48+ char via `openssl rand -base64 48`)
- [ ] VAPID keys (generate via `npx web-push generate-vapid-keys`)
- [ ] SMMturk API key (sudah ada di `app/.env`)
- [ ] R2 credentials (sudah ada di `app/.env`)

Kirimkan ke aku via chat (one-time):
- VPS IP + root password (kalau mau aku remote via kamu paste output)
- CF API token (untuk DNS-01 SSL di Coolify) — scope `Zone:DNS:Edit`
- Resend API key (setelah generate)
- GitHub repo URL
```
