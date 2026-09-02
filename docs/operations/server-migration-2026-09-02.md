# Server Migration — 2026-09-02 — VPS Lama Down → VPS Baru 130.254.47.93

> Status: COMPLETE. App live di `https://app.socio.id`. VPS lama `43.157.204.17`
> mati total sebelum migration — jadi rebuild di fresh VPS.

## Yang berubah

| Aspek | Sebelum | Sesudah |
|---|---|---|
| VPS | `43.157.204.17` (Tencent Jakarta, down) | `130.254.47.93` (Tencent APAC, ssh key `~/.ssh/id_rsa`) |
| IPv6 | n/a | `2607:adc0:5::215` |
| Coolify | up tapi tak bisa diupdate (server dead) | fresh install v4.3.14, root user, port 8000 |
| MySQL | import langsung dari `.sql` dump di repo, fix schema pakai ALTER | MySQL 8.0 container `rebicrj57r3afbg9knieq9ks`, network `coolify` |
| App source | public gh mirror `ReqTimeout/socio` (commit `5ced023`) | private, commit `6bd2eed` (history rewritten, token cfut_ disensor) |
| Web server | old Coolify auto-trusted cert | new Coolify v4.3.14 + Traefik 3.6 + Let's Encrypt ACME |
| DNS | `app.socio.id A 43.157.204.17` (proxied) | `app.socio.id A 130.254.47.93 + AAAA 2607:adc0:5::215` (proxied) |
| CF zone hardening | none | HSTS preload 2y + TLS 1.2 min + security-headers ruleset + rate-limit ruleset |

## Tahapan (urutan)

### 1. SSH key access ke server baru

```bash
# di laptop
sshpass -p 'T96bMkPl214RgKf' ssh-copy-id root@130.254.47.93
# verify
ssh root@130.254.47.93 'hostname && whoami && cat /etc/os-release | head -2'
```

### 2. Server setup

```bash
# swap 2GB (RAM cuma 3.8GB, Pnpm build need more)
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
grep -q swapfile /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Install Coolify
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
# output: install log di /data/coolify/source/installation-20260902-033342.log
# UI di http://130.254.47.93:8000
```

### 3. Coolify onboarding (bypass manual wizard via DB seed)

Onboarding UI pertama butuh "register" screen + bikin localhost server otomatis. Karena ga bisa trigger via web
(skip — kita sudah punya macbook + token CF), kita seed manual ke PG db Coolify:

```sql
-- di ssh ke server
docker exec coolify-db psql -U coolify -d coolify

INSERT INTO users (id, name, email, password, marketing_emails, force_password_reset, created_at, updated_at)
  VALUES (1, 'Socio Admin', 'admin@socio.id',
          '$2y$12$kyOuqOheY2ZO40Fh51lXNutpZ4o5zFA3.Wrk7ZQ3IazqVDI5QeX8i',
          false, false, now(), now())
  ON CONFLICT DO NOTHING;

INSERT INTO teams (id, name, personal_team, created_at, updated_at)
  VALUES (1, 'Socio Admin Team', true, now(), now());
UPDATE teams SET id=1 WHERE id=0;
UPDATE users SET id=1 WHERE id=0;

INSERT INTO team_user (team_id, user_id, role, created_at, updated_at)
  VALUES (1, 1, 'owner', now(), now());

UPDATE servers SET team_id=1 WHERE id=0;
UPDATE projects SET team_id=1 WHERE id=1;
UPDATE private_keys SET team_id=1 WHERE id=0;

UPDATE instance_settings SET is_registration_enabled=false, is_api_enabled=true;
```

Login UI: `admin@socio.id` / `SocioAdmin2026!`.

Generate API token via PHP bootstrap script (bypass web UI flow):

```php
// di dalam container Coolify via docker exec
session(['currentTeam' => App\Models\Team::find(1)]);
$t = App\Models\User::find(1)->createToken('deploy-token', ['*']);
echo $t->plainTextToken;  // 3|K5faW8LX3V8hjIDcYZs7YGDRnkmf1xRBhdBFEvwLb34444f2
```

### 4. MySQL socio-db (Coolify standalone MySQL)

```bash
TOK=<CF-style_bearer>   # any leading coolify API token
curl -X POST -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" \
  -d "$(cat <<EOF
{
  "server_uuid": "s3n78dwqdg6xayqvkvnxuz1k",
  "project_uuid": "ijkli6u16adifocsc8q0fjb0",
  "environment_name": "production",
  "destination_uuid": "ha3ju5mrsb54dqyotmtseaue",
  "mysql_root_password": "<32-char-hex>",
  "mysql_password": "<32-char-hex-other>",
  "mysql_user": "socio",
  "mysql_database": "socio_smm",
  "image": "mysql:8.0",
  "name": "socio-db",
  "instant_deploy": false
}
EOF
)" http://130.254.47.93:8000/api/v1/databases/mysql
```

Liat `getcred.php` script (di git history repo lokal, commited kalau mau):

```php
<?php // getcred.php — get R2 + DB credentials via decrypt Coolify cast
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$db = App\Models\StandaloneMysql::find($N);
echo 'root='.$db->mysql_root_password.PHP_EOL;
echo 'pw='.$db->mysql_password.PHP_EOL;
echo 'uuid='.$db->uuid.PHP_EOL;  // hostname di Docker network
```

Push `POST /api/v1/databases/<uuid>/start` (start job via Horizon queue).

### 5. DB dump import + schema migration

```bash
# scp dump lokal -> server
scp socio_smm_2026-06-23_10-53-20_mysql_data_2QRZW.sql root@130.254.47.93:/tmp/

# copy in container MySQL
docker cp /tmp/socio_dump.sql rebicrj57r3afbg9knieq9ks:/tmp/socio_dump.sql

# IMPORT (NOTE: the 25 tables + 39 tables extra akan out of sync; follow migration step below)
docker exec rebicrj57r3afbg9knieq9ks \
  bash -c "mysql -usocio -p<password> socio_smm < /tmp/socio_dump.sql"
```

**Schema yang hilang/diff antara dump + Drizzle schema — wajib di-fix (in order):**

#### 5.1. Zero-date cleanup (MySQL 8 strict mode reject '0000-00-00')

```sql
SET SESSION sql_mode = '';
UPDATE users SET expire='2099-12-31 23:59:59'     WHERE expire='0000-00-00';
UPDATE users SET exp_reset='2099-12-31 23:59:59' WHERE exp_reset='0000-00-00';
UPDATE users SET created_at='2020-01-01 00:00:00' WHERE created_at='0000-00-00';
-- ulangi untuk tabel lain (orders.deadline_at, deposits.expire, dll — sesuaikan)
```

#### 5.2. ALTER users — tambah default + nullable kolom untuk better-auth insert

```sql
ALTER TABLE users
  MODIFY COLUMN balance int NOT NULL DEFAULT 0,
  MODIFY COLUMN pulsa_balance int NOT NULL DEFAULT 0,
  MODIFY COLUMN pulsa_balance_used int NOT NULL DEFAULT 0,
  MODIFY COLUMN balance_used int NOT NULL DEFAULT 0,
  MODIFY COLUMN balance_reff int NOT NULL DEFAULT 0,
  MODIFY COLUMN status varchar(1) NOT NULL DEFAULT '1',
  MODIFY COLUMN read_popup varchar(255) NOT NULL DEFAULT '',
  MODIFY COLUMN verify varchar(288) NOT NULL DEFAULT '',
  MODIFY COLUMN token varchar(255) NOT NULL DEFAULT '',
  MODIFY COLUMN has varchar(255) NOT NULL DEFAULT '',
  MODIFY COLUMN reset_link varchar(280) NOT NULL DEFAULT '',
  MODIFY COLUMN exp_reset datetime NULL,
  MODIFY COLUMN used_reset enum('1','2') NOT NULL DEFAULT '1',
  MODIFY COLUMN sewa enum('No','Yes') NOT NULL DEFAULT 'No',
  MODIFY COLUMN reff_kode varchar(10) NOT NULL DEFAULT '',
  MODIFY COLUMN up_link varchar(50) NOT NULL DEFAULT '',
  MODIFY COLUMN subs tinyint(1) NOT NULL DEFAULT 1,
  MODIFY COLUMN sent_mail tinyint(1) NOT NULL DEFAULT 0,
  MODIFY COLUMN online tinyint(1) NOT NULL DEFAULT 0,
  MODIFY COLUMN token_login varchar(128) NOT NULL DEFAULT '',
  MODIFY COLUMN theme enum('light','dark') NOT NULL DEFAULT 'light',
  MODIFY COLUMN wa_number text NULL,
  MODIFY COLUMN hash varchar(300) NULL,
  MODIFY COLUMN kodek varchar(100) NULL,
  MODIFY COLUMN api_key varchar(100) NULL,
  MODIFY COLUMN astatus enum('1','2') NULL DEFAULT '1',
  MODIFY COLUMN full_name varchar(100) NULL,
  MODIFY COLUMN expire datetime NULL,
  MODIFY COLUMN password varchar(250) NULL,
  ADD COLUMN updated_at datetime NULL;
```

#### 5.3. CREATE TABLE new tables (better-auth + rebuild)

```sql
-- better-auth required
CREATE TABLE IF NOT EXISTS accounts (
  id varchar(64) NOT NULL PRIMARY KEY,
  user_id varchar(64) NOT NULL,
  account_id varchar(255) NOT NULL,
  provider_id varchar(255) NOT NULL,
  access_token text NULL,
  refresh_token text NULL,
  id_token text NULL,
  access_token_expires_at datetime NULL,
  refresh_token_expires_at datetime NULL,
  scope text NULL,
  password varchar(250) NULL,
  created_at datetime NOT NULL,
  updated_at datetime NOT NULL,
  INDEX account_user_idx (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sessions (
  id varchar(64) NOT NULL PRIMARY KEY,
  user_id varchar(64) NOT NULL,
  token varchar(128) NOT NULL,
  expires_at datetime NOT NULL,
  ip_address varchar(64) NULL,
  user_agent text NULL,
  created_at datetime NOT NULL,
  updated_at datetime NOT NULL,
  impersonated_by varchar(64) NULL,
  INDEX session_token_idx (token),
  INDEX session_user_idx (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS verifications (
  id varchar(64) NOT NULL PRIMARY KEY,
  identifier varchar(191) NOT NULL,
  value text NOT NULL,
  expires_at datetime NOT NULL,
  created_at datetime NOT NULL,
  updated_at datetime NOT NULL,
  INDEX verification_identifier_idx (identifier)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- rebuild utility tables (sesuai packages/db/src/schema/rebuild.ts)
-- audit_log, job_queue, web_push_subscriptions sudah auto-created oleh dump.
```

### 6. Coolify application deploy

```bash
TOK=<coolify_api_token>
APP_UUID=nqsjafrei6k8dkup1pxkcuwf

# Push 42 env vars via tinker (bulk encrypted):
#   - generate encrypted values via Crypt::encryptString
#   - create via model: Model::create(['value' => $plain, ...])
# Lihat scripts/insert_envs.php di repo (TODO kalau mau di-commit)

# Trigger deploy
curl -X POST -H "Authorization: Bearer $TOK" \
  -d "{\"uuid\":\"$APP_UUID\"}" \
  http://130.254.47.93:8000/api/v1/deploy
```

### 7. DNS update via Cloudflare API

```bash
CF_TOKEN=<token dari accountcf.md — JANGAN COMMIT>
CF_ACC=0298214d1069f75436f490b51ea4763e
ZONE=22e8176e6577d5eee25d891747ff37e7

# A record app.socio.id
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$ZONE/dns_records/<id_record>" \
  -H "Authorization: Bearer $CF_TOKEN" -H "Content-Type: application/json" \
  -d '{"type":"A","name":"app.socio.id","content":"130.254.47.93","proxied":true}'

# AAAA record app.socio.id (new)
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE/dns_records" \
  -H "Authorization: Bearer $CF_TOKEN" -H "Content-Type: application/json" \
  -d '{"type":"AAAA","name":"app.socio.id","content":"2607:adc0:5::215","proxied":true}'
```

### 8. Cloudflare zone hardening (free plan scope)

```bash
# HSTS (2y, preload, includeSub)
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$ZONE/settings/security_header" \
  -H "Authorization: Bearer $CF_TOKEN" -H "Content-Type: application/json" \
  -d '{"value":{"strict_transport_security":{"enabled":true,"max_age":63072000,"include_subdomains":true,"preload":true,"nosniff":true}}}'

# Min TLS 1.2
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/$ZONE/settings/min_tls_version" \
  -H "Authorization: Bearer $CF_TOKEN" -H "Content-Type: application/json" \
  -d '{"value":"1.2"}'

# Security headers Transform Rules (X-Frame-Options, Permissions-Policy, dll)
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE/rulesets" \
  -H "Authorization: Bearer $CF_TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"socio-security-headers","kind":"zone","phase":"http_response_headers_transform","rules":[{"expression":"true","action":"rewrite","action_parameters":{"headers":{"X-Frame-Options":{"operation":"set","value":"DENY"},"X-Content-Type-Options":{"operation":"set","value":"nosniff"},"Referrer-Policy":{"operation":"set","value":"strict-origin-when-cross-origin"},"Permissions-Policy":{"operation":"set","value":"camera=(), microphone=(), geolocation=(), interest-cohort=()"},"X-DNS-Prefetch-Control":{"operation":"set","value":"on"}}}}]}'

# Rate limit (free plan: 1 rule only, period=10s max)
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE/rulesets" \
  -H "Authorization: Bearer $CF_TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"socio-rate-limits","kind":"zone","phase":"http_ratelimit","rules":[{"expression":"(http.request.method eq \"POST\") and (http.request.uri.path in {\"/api/auth/sign-in/email\" \"/api/auth/sign-up/email\"})","action":"block","ratelimit":{"characteristics":["cf.colo.id","ip.src"],"period":10,"requests_per_period":3,"mitigation_timeout":10},"description":"Auth endpoints: 3/10s"}]}'

# Turnstile widget update — tambah app.socio.id ke allowed domains
curl -X PUT "https://api.cloudflare.com/client/v4/accounts/$CF_ACC/challenges/widgets/0x4AAAAAAD3RtU-MhZPHl3Fw" \
  -H "Authorization: Bearer $CF_TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Socio ID","mode":"managed","domains":["socio.id","app.socio.id","localhost"],"region":"world","clearance_level":"no_clearance","offlabel":false}'
```

## Issues yang di-patch in-place

### Coolify v4.3.14 bug: env vars deserialize

Coolify `EnvironmentVariable::get_environment_variables()` accessor decrypt tapi tidak `unserialize()`
lagi, jadi $env->value return `s:4:"3000";` bukan `"3000"`. Container `process.env.PORT` jadi string
`"s:4:\"3000\";"` → Node.js `net.listen('s:4:"3000";')` crash RangeError.

**Patch (in-container):**
```diff
- return trim(decrypt($environment_variable));
+ return trim(@unserialize(decrypt($environment_variable)) ?? decrypt($environment_variable));
```

⚠️ **Patch ini hilang kalau container Coolify di-recreate** (update, migrate). Solusi permanen:
- Cherry-pick ke upstream Coolify
- Atau rollback ke v4.3.13
- Atau add sebagai volume mount file `/data/coolify/source/coolify/patch.diff`

Track di `rebuild-tracker.md` kalau ada. Untuk sekarang: container up + env decoded correctly.

### `count is_buildtime=false` saat create env

Coolify `api/v1/applications/{uuid}/envs` POST endpoint default `is_buildtime=true`. Kalau var secret
diset `is_buildtime=true`, value akan ter-bake ke image Docker (security risk). Selalu override `is_buildtime=false`
saat push via API.

## Yang udah state pasca-deploy (2026-09-02 jam 14:35)

```
# Containers
coolify-proxy      traefik:v3.6    Up, healthy, :80 :443
coolify            coollabsio/coolify:4.3.14
coolify-db         postgres:15-alpine  (state Coolify)
coolify-redis      redis:7-alpine
coolify-realtime   coollabsio/coolify-realtime:1.0.17
coolify-sentinel   coollabsio/sentinel:0.0.22
rebicrj57r3afbg9knieq9ks  mysql:8.0 (socio-db)
nqsjafrei6k8dkup1pxkcuwf-073011638198  socio-app :3000
```

```
# DNS
app.socio.id A     130.254.47.93 (proxied)
app.socio.id AAAA  2607:adc0:5::215 (proxied)
```

```
# CF zone settings
ssl             = strict
min_tls_version  = 1.2
tls_1_3          = on
security_header  = HSTS preload 2y enabled
```

```
# CF custom rulesets
socio-security-headers (http_response_headers_transform)
  - X-Frame-Options DENY
  - X-Content-Type-Options nosniff
  - Referrer-Policy strict-origin-when-cross-origin
  - Permissions-Policy camera/mic/geo disabled
  - X-DNS-Prefetch-Control on
socio-rate-limits (http_ratelimit)
  - /api/auth/{sign-in,sign-up}/email POST: 3/10s, block 10s
```

```
# Auth flow
POST /api/auth/sign-up/email   200 (returns JWT token + user)
POST /api/auth/sign-in/email   200 (returns JWT token + user)
GET  /api/auth/get-session     200 (with cookie)
DB users count                 3223 (lama) + 3 (new test)
```

## Yang masih harus manual

1. SMMturk register + top-up saldo (crypto atau fiat)
2. Resend register + verify domain `socio.id` (CF auto-add DNS tersedia)
3. (Opsional) Replace Turnstile test keys dengan prod keys (saat ini test key Cloudflare — fine untuk eval)
4. (Opsional) CF HSTS Preload submission ke https://hstspreload.org/?domain=app.socio.id

## File yang di-commit di PR ini

- `docs/secrets-setup/README.md` + 5 file guide
- `docs/operations/server-migration-2026-09-02.md` (this file)
