# REBUILD_PLAN.md — Rebuild Socio.id (Astro + SvelteKit)

> Dokumen master rebuild `app.socio.id` (PHP legacy) → **Astro + SvelteKit**, mobile-first untuk SMM panel.
> Domain split: `socio.id` (Astro landing) + `app.socio.id` (SvelteKit app).
> Tujuan: hosting gratis/murah, database user existing tetap terpakai, UI/UX mobile jauh lebih nyaman.

---

## 0. Ringkasan Eksekutif

| Item | Keputusan |
|---|---|
| Landing `socio.id` | **Astro 5 + Svelte 5 islands** → Cloudflare Pages (Rp0) |
| App `app.socio.id` | **SvelteKit + adapter-node** → **Tencent Lighthouse Jakarta** (2vCPU/2GB/50GB) + Coolify |
| Database | **MySQL** via **Drizzle ORM** — **TiDB Serverless Singapore** (managed, terpisah dari VPS, free 5GB) |
| Auth | **better-auth** + bcryptjs (kompatibel `password_hash()` PHP) + Passkey WebAuthn |
| Provider SMM | **SMMturk** (smmturk.org/api/v2) — 8185 layanan, 872 kategori, USD currency |
| Queue (cron berat) | **DB-backed queue** (tabel `job_queue`, `SELECT ... FOR UPDATE SKIP LOCKED`) — no Redis |
| Cron | **node-cron** di app process (Fly.io / VPS) — bisa jalan 5-30 menit |
| Payment | Tripay + Midtrans (port callback ke TS) |
| Email | **Resend** (3.000/bln gratis) atau CF Email Routing + MailChannels (Rp0) |
| Storage | **Cloudflare R2** (10GB free, S3-compat) — avatar/banner/blog images |
| Real-time | **SSE** (SvelteKit endpoint) untuk live order status — no WebSocket |
| Push | **Web Push VAPID** (gratis) ganti WA bot mahal |
| Monitoring | **Axiom** free tier / Logflare |
| Referensi landing | `landing/` (clone haloka-landing) — upgrade ke Tailwind v4 + astro:assets |
| Timeline | 6-8 minggu (1 dev), M0→M7 |
| Cutover | Paralel 1 minggu (old PHP + new) → sunset VPS |

**Konstrain utama:** Cloudflare Workers **tidak bisa** TCP MySQL + CPU 10ms/free bunuh cron sync 5746 layanan. Wajib runtime serverful (Fly.io) untuk app + cron. Pages hanya untuk landing static.

---

## 1. Arsitektur & Domain Split

```
/Users/maabook/Desktop/socio.id/        ← ROOT (folder deploy baru dipisah dari folder lama)
├── app.socio.id/                       ← PHP lama (BACKUP/REFERENCE, jangan di-deploy lagi)
├── socio.id/                           ← WordPress lama (BACKUP/REFERENCE)
│
│   ──────  DEPLOY BARU (folder terpisah)  ──────
│
├── landing/                            ← Astro 5 static → socio.id (Cloudflare Pages) — SUDAH ADA (clone haloka)
│   ├── src/pages                       index, blog/[slug], faq, tos, privacy, pricing
│   ├── src/components                  Navbar, Hero, OrderSimulator, Pricing, Faq, ...
│   ├── src/content/blog                MDX articles (SEO)
│   └── public                          og-image, favicon, robots.txt, sitemap.xml (auto)
├── app/                                ← SvelteKit → app.socio.id (Fly.io / VPS)
│   ├── src/routes                      (auth, dashboard, order, services, deposit, admin, ...)
│   ├── src/lib/server                  db, auth, queue, provider-sync (SMMturk), payment, email
│   ├── src/lib/components              UI mobile-first (shared dgn packages/ui)
│   ├── src/hooks.server.ts             auth + CSRF + rate-limit + security headers
│   ├── cron/                           node-cron entrypoints (provider-sync, status, email, ...)
│   └── adapters/node                   deploy target
├── packages/
│   ├── db/                             Drizzle schema (reverse-engineered dari dump) + migrations
│   ├── ui/                             shadcn-svelte + Tailwind v4 tokens (shared landing+app)
│   └── core/                           pricing, smmturk-client, email-templates, format (shared)
├── docs/                               dokumentasi teknis (ADMIN_GAP, migrasi, runbook)
├── pnpm-workspace.yaml
└── REBUILD_PLAN.md                     (file ini)
```

**Folder deploy baru (`landing/`, `app/`, `packages/`) terpisah dari folder lama (`app.socio.id/`, `socio.id/`).** Saat deploy via git, hanya folder baru yang di-push. Folder lama tetap sebagai backup/reference sampai cutover selesai, lalu dihapus.

**Monorepo pnpm** → shared Drizzle schema, UI komponen, dan business logic (pricing/SMMturk client) antara landing & app. Deploy terpisah otomatis via CI per workspace.

### Hosting matrix final

| Komponen | Tempat | Biaya | Catatan |
|---|---|---|---|
| Landing `socio.id` | Cloudflare Pages | Rp0 | Static, edge, SEO |
| App `app.socio.id` + cron | **Tencent Lighthouse Jakarta** (2vCPU/2GB/50GB/30Mbps/1.02TB) + Coolify | ~Rp200k/bln | latency ID <10ms, panel Coolify |
| DB MySQL | **TiDB Serverless Singapore** (managed, terpisah) | Rp0 (5GB) | backup otomatis, encryption, HA, dump lama import |
| R2 storage | Cloudflare R2 | Rp0 (10GB) | avatar, banner, blog image, payment proof |
| Email | Resend | Rp0 (3.000/bln) | atau CF Email Routing + MailChannels (unlimited Rp0) |
| Cron | node-cron di VPS app process | (sudah app) | no CPU limit, 2GB cukup untuk SMMturk sync |
| Monitoring | Axiom free | Rp0 | 1GB ingest/bln cukup |
| DNS | Cloudflare | Rp0 | zone socio.id |

> **DB wajib terpisah dari VPS app** (sesuai permintaan user — keamanan): kalau VPS kena kompromi/crash, data user+saldo+order tetap aman di TiDB managed. VPS app hanya punya DB credential terbatas via env, gak ada akses shell ke DB.
> **Tencent Lighthouse Jakarta** dipilih karena: latency ID tercepat (<10ms untuk user mobile Indonesia), panel gampang (Coolify), spec cukup (2vCPU/2GB — Node app ~300MB + cron burst ~800MB saat sync SMMturk, masih ada buffer). Kalau RAM sempit nanti → aktifkan swap 2GB atau upgrade plan.
> **TiDB free 5GB penuh** → pindah ke PlanetScale / Aiven / self-hosted MySQL di VPS DB terpisah (Hetzner/Contabo private network). Dump sama.

### Spesifikasi VPS Tencent Lighthouse — apakah cukup?

| Resource | Spec | Kebutuhan app | Status |
|---|---|---|---|
| CPU | 2 vCPU | SvelteKit Node (1 core idle) + cron SMMturk sync (burst 1 core saat parsing 8185 layanan + queue worker parallel 10) | ✅ cukup |
| RAM | 2 GB | Node app steady ~200-300MB + cron burst ~500-800MB (parse JSON 2-4MB + 10 worker) + Coolify ~200-400MB + OS ~200MB | ⚠️ tight saat sync — **wajib enable swap 2GB** |
| Disk | 50 GB | OS ~5GB + Coolify ~2GB + app build ~1GB + logs ~5GB + buffer | ✅ cukup |
| Bandwidth | 1.02 TB / 30 Mbps | SMMturk sync 2-4MB/jam + user traffic + assets (R2 CDN) | ✅ sangat cukup |
| Region | Jakarta (ap-jakarta) | user mobile Indonesia | ✅ <10ms latency |

**Mitigasi RAM tight:**
1. Enable swap 2GB di VPS (`fallocate /swapfile 2G && mkswap && swapon`).
2. Cron SMMturk sync jangan paralel 10 → turun ke 5 worker dulu, naik kalau RAM ok.
3. Limit Node `--max-old-space-size=1024` (1GB) supaya gak OOM.
4. Kalau Masih OOM saat sync → upgrade Tencent plan ke 4GB (sekitar Rp350k/bln).
5. Coolify opsional — kalau RAM terlalu tight, skip Coolify, pakai Docker Compose + Caddy manual (hemat ~300MB).

> **Rekomendasi**: mulai dgn Coolify untuk gampang setup + git push deploy. Kalau RAM tight saat cron SMMturk, switch ke Docker Compose manual (hemat RAM Coolify). Atau tetap Coolify + swap 2GB.

---

## 2. Strategi Cron Berat (SMMturk sync 8185 layanan + status polling)

Ini bagian paling kritis — kalau salah, layanan gak ter-update & status order stuck.

### 2.0 Provider: SMMturk (verified)

- **API**: `https://smmturk.org/api/v2` (POST form-encoded)
- **Key**: `cc9076fecb4c0086edd2259dd488d2d5` (env `SOCIO_SMMTURK_KEY`, jangan hardcoded)
- **Balance**: $4.78 USD (currency USD → konversi IDR di pricing layer)
- **Services**: 8185 layanan, 872 kategori
- **Endpoint standar SMM panel**:
  - `action=balance` → `{balance, currency}`
  - `action=services` → array `{service, name, type, rate, min, max, dripfeed, refill, cancel, category}`
  - `action=add` → order baru `{service, link, quantity}` → `{order, status}`
  - `action=status` → `{status, start_count, remains, currency}`
  - `action=refill` → refill request
  - `action=cancel` → cancel order (jika `cancel=true`)
- **Currency rate**: rate SMMturk USD → IDR. Pricing markup: `effective_price = (rate_usd * USD_TO_IDR * (1 + markup%) / 1000) + flat_per_1k + min_profit`. Rate USD→IDR dari env atau fetch harian.

### 2.1 Provider Sync (SMMturk 8185 layanan)

**Algoritma:**
1. Cron `provider-sync` jalan **tiap 1 jam**.
2. Fetch `action=services` (1 HTTP POST → 8185 layanan, ~3-8 detik, response ~2-4MB JSON).
3. **Diff-based update**: hash `name|category|min|max|rate|refill|cancel`. Bandingkan dgn `provider_services.hash`. Kalau sama → skip. Kalau beda → enqueue ke `job_queue`.
4. Queue worker `provider-sync-worker` jalan **parallel 10 concurrent**, tiap job upsert 1 layanan dgn delay 100ms (anti rate-limit). Total ~10-15 menit untuk 500-1000 perubahan (jarang semua berubah).
5. **Auto price update** OFF by default — gak menimpa `services.price_api` kecuali admin enable per-provider.
6. Update `provider.balance_provider` (USD) + `last_sync_at`.
7. Kalau SMMturk error → backoff eksponensial (1h → 2h → 4h), log ke `provider_sync_log`, alert admin (in-app + email).

**DB schema baru (port dari PHP):**
```sql
-- provider (ALTER: tambah kolom sync)
-- provider_services (mirror katalog, kolom: hash, last_seen_at, raw_payload JSON)
-- provider_sync_log (id, provider_id, action, status, duration_ms, error, created_at)
-- job_queue (id, type, payload JSON, status, locked_at, attempts, max_attempts, run_after, created_at, updated_at)
```

**Queue worker pattern (MySQL, no Redis):**
```sql
SELECT * FROM job_queue
WHERE status='pending' AND run_after <= NOW()
ORDER BY priority DESC, id ASC
LIMIT 5
FOR UPDATE SKIP LOCKED;
-- UPDATE locked_at=NOW(), status='running' WHERE id IN (...)
```
Worker loop tiap 2 detik, lock 5 job, eksekusi parallel `Promise.all`, commit/skip.

### 2.2 Status Order Polling (paling berat)

**Stratified polling (jangan polling semua order tiap menit!):**

| Status order | Umur | Interval cek |
|---|---|---|
| `Pending` | < 1 jam | tiap 1 menit |
| `Pending` | 1-6 jam | tiap 5 menit |
| `Pending` | > 6 jam | tiap 30 menit |
| `Proses` | any | tiap 5 menit |
| `Berhasil`/`Gagal`/`Partial`/`Batal` | final | **skip** (gak cek lagi) |

**Tiap cron tick (tiap 1 menit):**
1. `SELECT ... WHERE status IN('Pending','Proses') AND next_poll_at <= NOW() ORDER BY priority LIMIT 200 FOR UPDATE SKIP LOCKED`
2. **Batch API call**: cek dokumentasi provider — kalau JAP/IRVAN/SMC support endpoint status multi-order (1 request = 100 order), pakai itu. Kalau per-order, queue 10 concurrent.
3. Update `status`, `start_count`, `remains`, `next_poll_at` (jika masih pending, set interval selanjutnya).
4. Kalau status berubah ke final → kirim Web Push notification ke user + email (jika opt-in) + update `notification` table.
5. Update `next_poll_at` untuk order yang masih pending dgn interval stratified.

**Webhook provider (kalau ada):** JAP/IRVAN/SMC beberapa support callback status. Kalau ada → daftarkan endpoint `app.socio.id/api/webhook/[provider]/status` → langsung update order, skip polling. Ini paling efisien — cek pas M4.

**Estimasi beban realistik:**
- Sync provider: 1 hit/jam, ~10-15 menit wall clock (queue paralel 10).
- Status polling: 200 order/tick × tiap 1 menit = 200 API call/menit worst case. Dgn batch endpoint = 2-4 request/menit. Fly VM 256MB cukup. Kalau traffic 10x → upgrade 512MB.

> **Catatan SMMturk batch status**: API `action=status` standar SMM panel biasanya per-order. Cek dokumentasi pas M4 — kalau support multi-order (koma-separated `orders` param), pakai. Kalau tidak, queue 10 concurrent.

### 2.3 Cron ringan (1 cron trigger langsung selesai)

| Cron | Interval | Job |
|---|---|---|
| `deposit-expire` | 5 menit | cancel deposit pending > 24 jam |
| `email-queue` | 1 menit | kirim email pending (Resend batch) |
| `email-bounce` | 1 jam | sync bounce dari Resend webhook |
| `refill-check` | 15 menit | cek refill eligible |
| `refund-process` | 10 menit | proses refund partial |
| `affiliate-commission` | realtime (di payment callback) | komisi 2% ke referrer |
| `housekeeping` | 1 hari | hapus log > 90 hari, optimize table |

### 2.4 Implementasi SvelteKit

`app/src/cron/index.ts` — entrypoint standalone (bisa jalan di process sama dgn app, atau sebagai service terpisah di Fly):
```ts
import cron from 'node-cron';
import { runProviderSync, runStatusPolling, runDepositExpire, ... } from '$lib/server/jobs';

cron.schedule('* * * * *', runStatusPolling);    // tiap menit
cron.schedule('0 * * * *', runProviderSync);     // tiap jam
cron.schedule('*/5 * * * *', runDepositExpire);
// ...
```
Atau pisah jadi `app/cron-server` Docker image terpisah (recommended kalau cron berat konflik dgn web request). Fly mendukung multi-process via `fly.toml` `processes`.

---

## 3. Database & Migrasi User Existing

### 3.1 Dump existing

- File: `app.socio.id/socio_smm_2026-06-23_*.sql` (43 MB, MySQL)
- DB name: `socio_smm`, ~100+ tabel (users, services, orders, deposits, provider, affiliate, tickets, pricing_rules, promotion_banners, email_bounces, dll)

### 3.2 Strategi import

1. **Verifikasi format password hash dulu** (lihat §3.3) — sebelum mulai coding.
2. Buat akun TiDB Serverless (free 5GB) region Singapore.
3. Import dump: `mysql -h tidb-host socio_smm < socio_smm_*.sql` (TiDB kompatibel MySQL dump).
4. Reverse-engineer Drizzle schema: `drizzle-kit introspect` → generate `schema.ts`. Review manual untuk: enum, FK, index, default.
5. Tambah tabel baru: `job_queue`, `web_push_subscriptions`, `saved_links`, `order_next_poll` (kolom), `notification_queue`.
6. Migration awal: `drizzle-kit generate` + `migrate` untuk tambah kolom baru (non-breaking, default nullable/0).

### 3.3 Verifikasi password hash (wajib sebelum M0)

Cek isi dump untuk format `users.password`:
- Jika prefix `$2y$` atau `$2a$` / `$2b$` → **bcrypt**. Pakai `bcryptjs` di Node langsung kompatibel. ✅
- Jika ada yang MD5 (`32 char hex`) / SHA1 → perlu **rehash-on-login**: saat user login dgn credential lama & berhasil, langsung rehash ke bcrypt + update DB. Tidak ada reset massal.
- PHP `password_verify()` kompatibel dgn `bcryptjs.compare()` untuk hash `$2y$/$2a$/$2b$`.

**Action item M0:** `grep -E "INSERT INTO users" dump.sql | head -3` → cek prefix hash. Kalau campur, implement rehash-on-login di `better-auth` custom adapter.

### 3.4 Tabel baru untuk fitur rebuild

```sql
-- Queue (cron berat)
job_queue (id, type, payload JSON, status enum, locked_at, attempts, max_attempts, run_after, priority, created_at, updated_at, error TEXT)

-- Web Push (ganti WA bot)
web_push_subscriptions (id, user_id, endpoint, keys_p256dh, keys_auth, created_at, user_agent)

-- Saved links (repeat order)
saved_links (id, user_id, label, link, service_id, last_used_at, created_at)

-- Real-time
sse_subscriptions (id, user_id, channel, created_at)  -- optional, kalau pakai DB pub/sub

-- Order polling scheduler
-- ALTER orders ADD COLUMN next_poll_at DATETIME NULL, ADD COLUMN poll_priority INT DEFAULT 0;
```

---

## 4. Tech Stack Detail & Libraries

### 4.1 Landing (Astro + Svelte islands)

| Lib | Versi | Alasan |
|---|---|---|
| astro | ^5.x | Static, islands, SEO |
| @astrojs/svelte | ^7.x | Svelte 5 islands |
| @astrojs/mdx | ^4.x | Blog SEO |
| @astrojs/sitemap | ^3.x | Auto sitemap.xml |
| svelte | ^5.x | Runes, komponen interaktif |
| tailwindcss | **v4** | CSS-first `@theme`, ganti `@astrojs/tailwind` (deprecated) |
| @tailwindcss/vite | ^4.x | Vite plugin Tailwind v4 |
| @fontsource-variable | – | Self-host font (ganti Google Fonts CDN — lebih cepat) |
| astro:assets | – | Image optimization otomatis |
| lucide-svelte | – | Ikon (ganti emoji SVG inline) |

**Upgrade dari haloka-landing:**
1. Tailwind v3 config (`tailwind.config.mjs`) → v4 `@theme` di `global.css`. Hapus `@astrojs/tailwind` integration.
2. Google Fonts CDN → `@fontsource-variable/fredoka` + `@fontsource-variable/open-sans` (self-host, privacy-friendly, lebih cepat).
3. `astro:assets` untuk logo/bg → output WebP/AVIF otomatis + lazy load.
4. Tambah `<ClientRouter />` (View Transitions API Astro) → navigasi mulus antar page.
5. JSON-LD: tambah `FAQPage` (dari komponen Faq.svelte) + `BreadcrumbList` + `Product` schema (untuk paket pricing).
6. Auto `sitemap.xml` via `@astrojs/sitemap` + `robots.txt` static.
7. Analytics: ganti GTM berat → **Plausible** self-host / **Umami** Cloud (ringan, privacy) atau GA4 minimal.
8. A11y: `skip-to-content`, `focus-visible`, `prefers-reduced-motion` (disable animasi berat), `aria-*` di accordion/navbar.
9. `prefers-color-scheme` → dark mode toggle (opsional).

### 4.2 App (SvelteKit + adapter-node)

| Lib | Versi | Alasan |
|---|---|---|
| @sveltejs/kit | ^2.x | Framework app |
| svelte | ^5.x | Runes |
| @sveltejs/adapter-node | ^5.x | Deploy ke Fly.io (Node runtime) |
| drizzle-orm | latest | Type-safe SQL, MySQL mode |
| drizzle-kit | latest | Schema introspect + migrate |
| mysql2 | ^3.x | Driver MySQL (TCP, kompatibel TiDB) |
| better-auth | latest | Auth (email/pass + passkey + session + rate-limit) |
| bcryptjs | ^2.x | Kompatibel PHP `password_hash` bcrypt |
| zod | ^3.x | Validation (form, API, env) |
| @midtrans/sdk | latest | Payment gateway |
| resend | latest | Email API |
| lucide-svelte | – | Ikon |
| tailwindcss | v4 | Styling |
| bits-ui | latest | Headless UI (popover/dialog/sheet — basis shadcn-svelte) |
| sveltekit-superforms | latest | Form handling + validation Zod |
| @upstash/ratelimit (opsional) | – | Atau DIY dgn DB (Redis-free) |
| web-push | ^3.x | Web Push VAPID |
| node-cron | ^3.x | Cron scheduler |
| pino | latest | Logging (ganti Monolog) |
| @aws-sdk/client-s3 | – | R2 storage (S3-compat) |

### 4.3 Shared packages

- `packages/db` — Drizzle schema + `db.ts` (connection pool mysql2), share ke landing (untuk pricing stats di landing) + app.
- `packages/ui` — shadcn-svelte + Tailwind v4 tokens (color, spacing, typography, dark mode), komponen Button/Card/Badge/Sheet/Toast/Dialog/Command.
- `packages/core` — `pricing.ts` (markup per level), `provider-sync.ts` (JAP/IRVAN/SMC client), `format.ts` (formatIDR, tanggal WIB), `email-templates` (svelte-email).

---

## 4.5 Arsitektur DB Terpisah (keamanan)

DB **wajib terpisah** dari VPS app — tidak digabung. Sesuai permintaan user: kalau VPS app kena kompromi/crash, data user+saldo+order tetap aman.

```
┌─────────────────────────────────┐      ┌───────────────────────────────┐
│  VPS Tencent Lighthouse Jakarta │      │  TiDB Serverless Singapore     │
│  (app.socio.id + cron)          │      │  (DB managed, terpisah)        │
│                                 │      │                                │
│  - SvelteKit Node (adapter)     │─────▶│  - MySQL socio_smm             │
│  - node-cron SMMturk sync       │ TLS │  - dump lama import            │
│  - node-cron status polling     │      │  - 5GB free, HA                │
│  - R2 client (avatar/banner)    │      │  - encryption at rest          │
│  - env: DB_URL only (no root)   │      │  - backup snapshot otomatis    │
│  - Coolify panel                │      │  - IP whitelist (VPS app only) │
│                                 │      │                                │
│  RAM: 2GB + swap 2GB            │      │  User DB: socio_app            │
│  CPU: 2 vCPU                    │      │  Privileges: SELECT/INSERT/    │
│  Disk: 50GB                     │      │  UPDATE/DELETE on socio_smm.*  │
└──────────┬──────────────────────┘      │  (NO DROP/ALTER/GRANT)         │
           │                              └───────────────────────────────┘
           ▼                                          │
┌─────────────────────────┐                         │
│  Cloudflare R2          │                         ▼
│  - avatar/banner/blog   │             ┌────────────────────────┐
│  - 10GB free, S3-compat │             │  Backup R2 harian      │
│  - public CDN cdn.socio │             │  (mysqldump cron       │
└─────────────────────────┘             │   → R2, retention 30h) │
                                        └────────────────────────┘
```

**Layer keamanan DB terpisah:**
1. **Network isolation**: TiDB hanya accept connection dari IP VPS app (IP whitelist di console TiDB) + credential.
2. **Encryption at rest**: TiDB default encrypt data di disk.
3. **TLS in transit**: koneksi DB wajib TLS (`sslmode=require` di connection string).
4. **Credential minimal**: VPS app cuma punya 1 DB user `socio_app` dgn akses `socio_smm.*` (SELECT/INSERT/UPDATE/DELETE), **TIDAK ADA** DROP/ALTER/GRANT/SUPER. Migration dijalankan manual oleh admin (atau CI terpisah dgn credential migration sementara).
5. **Backup otomatis**: TiDB snapshot harian + dump ke R2 lewat cron VPS (extra layer, retention 30 hari).
6. **No SSH ke DB**: VPS app gak bisa SSH ke TiDB, cuma koneksi MySQL protocol.
7. **Secret di env**: DB URL di Coolify env / env file (gak masuk git, gak hardcoded). Rotate kalau ada indikasi leak.
8. **Audit query**: TiDB punya audit log — enable untuk modul admin (deposit confirm, refund, balance adjustment).

**Cara setup TiDB Serverless:**
1. Daftar `tidbcloud.com` → buat cluster Serverless free (region Singapore).
2. Buat database `socio_smm` + user `socio_app` dgn privilege terbatas.
3. Import dump: `mysql -h gateway.singapore.tidbcloud.com -P 4000 -u socio_app -p socio_smm < socio_smm_*.sql` (set `SET FOREIGN_KEY_CHECKS=0` di awal dump).
4. Whitelist IP VPS Tencent Jakarta di TiDB console (setelah VPS dibeli).
5. Connection string: `mysql://socio_app:PASS@gateway.singapore.tidbcloud.com:4000/socio_smm?sslmode=require`.

---

## 5. Auth Migration (tanpa reset password user)

### 5.1 better-auth setup

- **Adapter**: custom MySQL via Drizzle — table `users`, `sessions`, `verification_tokens`.
- **Password**: `bcryptjs.compare(input, user.password)` kompatibel PHP `$2y$/$2a$/$2b$`.
- **Rehash-on-login**: kalau hash prefix bukan bcrypt → setel flag, setelah login sukses → `bcrypt.hash` + update DB. User gak sadar.
- **Session**: cookie `socio_session` (HttpOnly, Secure, SameSite=Lax) — kompatibel format baru. Old PHP session di-expire otomatis (user tinggal re-login sekali).
- **Passkey WebAuthn**: optional, register setelah login (prompt "Aktifkan login sidik jari").
- **Turnstile**: gate signup + signin + forgot (lib `turnstile` dari PHP port ke TS, env-gated).
- **Rate-limit**: per-IP per-endpoint, store di DB (tabel `rate_limit` dgn TTL) — no Redis.
- **Double opt-in**: port dari `verify.php` — signup → email verify link → status `verify='No'` → setelah klik → `Yes`.
- **Disposable email blocklist**: port `lib/disposable-emails.php`.
- **zxcvbn password strength**: port meter dari `signup-edit.php`.

### 5.2 Role/level (port dari PHP)

Level user existing: Member / Agen / Reseller / Admin. Pricing markup per level dipakai di `packages/core/pricing.ts` (sama dgn `lib/pricing.php`). Tabel `pricing_rules` sudah ada di dump.

---

## 6. UI/UX Mobile-First Design System

> **Prinsip utama:** 100% user pakai mobile. Semua flow harus bisa diselesaikan **satu tangan** (CTA primary di bawah, search reachable, bottom-sheet bukan modal). Micro-interactions harus **terasa instan** (optimistic UI, skeleton, haptic).
>
> **PENTING**: Jangan ngoding route apapun sebelum lewat **M1.5 — Design Pass** (lihat §9). Tanpa design contract fix (palette/typography/spacing/motion), agent akan keluar UI generic. Pakai skill design `looks-expensive` + `theming-components` + `emil-design-eng` di M1.5. Review tiap route pakai `web-design-guidelines` + `review-animations` sebelum bilang selesai (lihat AGENTS.md §7).

### 6.0 Skill design yang dipakai

Opencode punya skill design proper. **Wajib** load skill ini sesuai fase:

| Skill | Kapan dipakai | Output |
|---|---|---|
| **`looks-expensive`** | M1.5 (Design Pass) + review tiap landing | 9-phase design methodology (positioning, contract, screen spec, audit). Kill 8 AI tells (bullet spam, eyebrow pill, card chrome sama, Inter default, dll) |
| `theming-components` | M1.5 | Design token system (color/typography/spacing/shadow/motion/z-index) → `packages/ui` |
| `emil-design-eng` | M1.5 + tiap micro-interaction | UI polish philosophy (invisible details, animation decisions) |
| `web-design-guidelines` | Review tiap route | Compliance check (a11y, focus, contrast, nav, footer) |
| `review-animations` | Review tiap micro-interaction | Craft bar tinggi (animation timing, transform/opacity only, reduced-motion) |
| `designing-layouts` | M1.5 + tiap layout kompleks | Grid, flex, sidebar, responsive breakpoints |
| `ui-styling` (shadcn-svelte) | M1.5 → `packages/ui` setup | shadcn-svelte + Tailwind v4 + a11y primitives |
| `svelte` best practices | Tiap komponen Svelte | Runes, $derived, $effect, $state |
| `astro` best practices | Tiap komponen Astro | Islands, View Transitions, astro:assets |
| `web-perf` | Audit M5 landing + tiap route app | Core Web Vitals, LCP < 2.5s, INP < 200ms |

### 6.0.1 Referensi visual (per jawaban user)

| Surface | Referensi vibe | Elemen kunci |
|---|---|---|
| **Landing `socio.id`** | Haloka (sudah ada clone) — gradient + blur + micro-interaction | Hero dgn OrderSimulator (ganti ChatSimulator), sticky CTA, FAQ accordion, pricing toggle bulanan/tahunan → adapt ke paket reseller SMM |
| **App user (mobile)** | **Indo fintech** (GoPay/DANA) — bottom nav, kartu saldo prominent, QRIS quick top-up, kartu aksi 2x2, list transaksi dgn icon | Bottom nav 5 + FAB center, hero saldo dgn animated counter, quick-grid 2x2 (Top Up/Pesan/Layanan/Affiliate), saved links, quick re-order swipe |
| **App admin (desktop primary, mobile secondary)** | **Modern SaaS** (Linear/Stripe) — clean, sidebar, dense info, server-side filter | Sidebar desktop + off-canvas mobile, dense data table, card-list mobile, audit log, queue/cron monitoring |

### 6.0.2 Anti-pattern yang harus dihindari (dari `looks-expensive`)

Agent harus **selalu audit** 8 anti-pattern ini sebelum bilang route selesai:

1. **Bullet spam** — max 5 `<li>`/page. Lebih dari itu → pakai prose, ledger, table, definition list.
2. **Eyebrow pill di setiap section** — max 1/page, ideally zero. Heading cukup.
3. **Card chrome sama** — max 2 section pakai default rounded card. Lainnya pakai ledger, table, full-bleed photo, prose.
4. **3-tier pricing card generik** — pakai real HTML table atau inline pricing.
5. **4-col stat strip generik** — pakai inline-stat narrative atau single hero stat. Counter animation **bukan wajib**.
6. **No imagery** — pakai `<img>` real (Picsum/Unsplash) untuk section yang butuh foto, jangan gradient blob.
7. **Container chrome identik antar section** — variance IS the design.
8. **Inter font default** — pilih sans lain per project (Space Grotesk, Plus Jakarta Sans, Manrope, dll).

Detail anti-pattern lainnya: bullet budget, accent visibility, AA contrast, `--accent-ink` only background, `--accent-hover` lebih gelap (bukan lebih terang), focus ring contrast, mobile drawer (scroll-lock + focus trap + Esc), no browser chrome dots, no zero-pad step numbers, no italic, mono max 14px + data accent only.

### 6.1 Layout shell (app)

```
┌─────────────────────────────┐
│  Header (sticky, 56px)      │  ← judul halaman + back + notif badge
├─────────────────────────────┤
│                             │
│   Content (scrollable)      │  ← safe-area padding top
│   - Skeleton saat load      │
│   - Pull-to-refresh         │
│   - Infinite scroll (history)
│                             │
├─────────────────────────────┤
│   Sticky CTA (jika ada)     │  ← "Buat Pesanan" / "Top Up" / "Bayar"
├─────────────────────────────┤
│  Bottom nav 5 tab + FAB     │  ← safe-area padding bottom
│  Beranda │ Saldo │ [FAB] │ Pesanan │ Akun
└─────────────────────────────┘
```

- **Bottom nav 5**: Beranda · Saldo · **FAB Pesan (center, elevated)** · Pesanan · Akun.
- **FAB** buka **bottom-sheet** quick-action: Buat Pesanan · Layanan · Tiket · Affiliate.
- **Hamburger** (pojok kanan atas) → panel off-canvas: Profil, Pengaturan, Riwayat, Bantuan, Admin (jika admin), Logout.
- **Safe-area**: `env(safe-area-inset-bottom/top)` untuk iPhone notch + Android gesture bar.
- **Haptic feedback**: `navigator.vibrate(10)` pada tap CTA, add-to-cart, success order. Gate dgn `prefers-reduced-motion`.
- **View Transitions API** (SvelteKit `onNavigate`): animasi halus antar route (slide/fade), tidak full reload.

### 6.2 Micro-interactions wajib

| Element | Interaksi | Implementasi |
|---|---|---|
| **Button primary** | Tap → scale 0.96 + haptic + ripple | `active:scale-95` + `navigator.vibrate(8)` |
| **Skeleton** | Shimmer pulse selama load | Tailwind `animate-pulse` + gradient skeleton |
| **Optimistic UI** | Order/deposit langsung tampil, rollback kalau error | Svelte stores + `invalidateAll` |
| **Pull-to-refresh** | Drag down → spinner → reload | Custom Svelte action, `touchstart/move/end` |
| **Infinite scroll** | History/services auto-load next page | SvelteKit `load` cursor + `IntersectionObserver` |
| **Qty stepper** | Tap +/- → animate number + total realtime | Svelte tweened `total` |
| **Toast** | Slide-up + auto-dismiss 3s + swipe-to-dismiss | bits-ui Toast |
| **Bottom-sheet** | Drag handle → expand/collapse, swipe down dismiss | bits-ui Dialog (sheet variant) |
| **Status badge** | Color-coded + pulse untuk Pending/Proses | 7 warna status (port dari PHP) |
| **Saldo hero** | Animated counter saat update | Svelte `tweened` |
| **Order success** | Confetti micro + checkmark draw + haptic | canvas-confetti lightweight |
| **Empty state** | Ilustrasi + CTA (bukan "data kosong") | Lucide icon + copy ramah |
| **Error state** | Inline (bukan alert), retry button | Form-level sveltekit-superforms |
| **Loading button** | Spinner inline, text tetap, disable | `data-loading` attribute |
| **Sticky search** | Search bar sticky di atas list services | `position: sticky; top: 0` |

### 6.3 SMM-specific UX patterns

Pola SMM panel user adalah: **repeat order cepat, cek status sering, top-up sering, cek harga**. Design harus optimize untuk loop ini.

1. **Quick re-order** (1 tap dari history):
   - Di history → swipe-left item → "Pesan Lagi" → langsung ke form pesanan dgn service+link+qty terisi. Edit qty → bayar.
   - Atau long-press item → context menu (Pesan Lagi · Salin Link · Detail · Tiket).

2. **Saved links** (repeat order tanpa ketik ulang):
   - Saat order sukses → prompt "Simpan link ini?" dgn label (cth: "IG @kaka_store").
   - Next order → tinggal pilih dari dropdown saved links.

3. **Service favorit + bundle** (port dari PHP P2-5):
   - Star toggle di katalog → filter "Favorit Saya".
   - Bundle tray (localStorage) → pesan multiple service sekaligus.

4. **Saldo hero prominent** (di Beranda):
   - Kartu besar di atas: saldo + tombol "Top Up" + "Riwayat".
   - Animated counter saat saldo update (deposit sukses / order).
   - Sub-text: "Cukup untuk X pesanan rata-rata" — social proof.

5. **Quick top-up chips**: Rp50k · Rp100k · Rp200k · Rp500k · custom. Langsung deep-link ke QRIS Midtrans (Snap) — user tinggal scan dgn GoPay/OVO/DANA.

6. **Live order status (SSE)**:
   - Buka halaman Pesanan → SSE connection → status berubah langsung update tanpa refresh.
   - Badge "Live" dgn pulse hijau.
   - Web Push notification untuk status final (Berhasil/Gagal/Partial) — ganti WA bot mahal.

7. **Search-first services catalog**:
   - Search bar sticky di atas, fokus default (auto-focus di mobile).
   - Filter chips horizontal scroll: Semua · Favorit · IG · TikTok · YouTube · Telegram · dll.
   - Sort: Termurah · Terlaris · Tercepat · Terbaru.
   - Card per service: nama, kategori, harga per 1k, min/max, avg waktu, status (Available/Delay). Tap → bottom-sheet detail dgn CTA "Pesan".

8. **Pesanan terbaru di Beranda**:
   - 5 kartu status warna-warni (Pending=amber, Proses=blue, Berhasil=green, Partial=purple, Batal=red, Error=rose).
   - Tap kartu → detail bottom-sheet dgn link + countdown + tombol "Refill" (jika eligible).

9. **Affiliate mobile-friendly**:
   - Kartu "Total Komisi" prominent.
   - Link referral + **QR code** (generate client-side via `qrcode` lib) → tombol "Share" native Web Share API.
   - Stats downline: jumlah referral, komisi bulan ini, top referrer.

10. **Onboarding singkat (1st login)**:
    - 3-slide quick tour: "Top Up dulu" → "Pilih layanan" → "Pantau status".
    - Skip → langsung dashboard. Pakai `localStorage` flag.

### 6.4 Dark mode

- Default ikut system (`prefers-color-scheme`).
- Toggle di Akun. Store preference di DB `users.theme`.
- Design tokens: 2 set (light/dark), Tailwind v4 `@theme` + CSS variables.

### 6.5 Accessibility

- Semua interactive: `focus-visible` ring jelas.
- Kontras WCAG AA (min 4.5:1 text, 3:1 large).
- `aria-label` di icon-only button.
- `prefers-reduced-motion` → disable animasi berat (shimmer, confetti, cursor auto-play landing).
- Screen reader test dgn VoiceOver iOS + TalkBack Android.
- Bottom nav: `role="tablist"` + `aria-current="page"`.

### 6.6 Performance budget

- **LCP < 2.5s** di 3G mobile Indonesia.
- **INP < 200ms** (Svelte + SSR).
- **CLS < 0.1** (reserve space skeleton/image).
- Bundle JS app < 200kb gzip initial (code-split per route).
- Image: WebP/AVIF via R2 + `astro:assets` (landing) / `cdn` (app).
- Font: self-host variable, `font-display: swap`.
- Service Worker (PWA): cache-first untuk static assets, network-first untuk HTML, offline catalog services.

---

## 7. SEO Strategy

### 7.1 Landing `socio.id`

**Astro static = SEO-friendly by default.**

- **Meta tags per page**: title, description, keywords, canonical (port dari Layout.astro haloka).
- **Open Graph + Twitter Card** per page (gambar OG 1200×630 via R2).
- **JSON-LD**:
  - `Organization` (socio.id global)
  - `SoftwareApplication` / `Service` (untuk panel SMM)
  - `Product` + `Offer` (untuk tiap paket pricing)
  - `FAQPage` (dari Faq.svelte — auto-generate dari data)
  - `BreadcrumbList` (untuk blog + pricing pages)
  - `Article` (untuk blog post)
- **Sitemap.xml** auto via `@astrojs/sitemap` (include blog + static pages).
- **robots.txt**: allow all, sitemap reference, disallow `/app/*` (app subdomain di-handle SvelteKit sendiri).
- **Blog MDX** (Astro content collections): artikel SEO "cara naik followers IG", "beli followers aman", "jual followers reseller", dll. Target keyword ID.
- **Page speed**: Astro static + R2 image CDN = Lighthouse 95+.
- **GEO/AEO** (AI search): FAQ schema, definition sentence di awal artikel, TL;DR block, comparison table (sesuai skill `ai-seo` kalau dipakai).
- **Internal linking**: blog → pricing → daftar. Breadcrumb konsisten.
- **Bahasa**: `lang="id"`, `hreflang` ID/EN kalau i18n.

### 7.2 App `app.socio.id`

- **Noindex** semua route app (login required, gak ada SEO value).
- `robots.txt` app: `Disallow: /`.
- Hanya halaman public (login/signup) yang indexable minimal.

### 7.3 Domain migrasi SEO

- Landing lama WordPress `socio.id` → cek URL existing yang sudah ter-index. Buat **redirect map** di Astro middleware: `/?p=123` → `/blog/[slug]`.
- Pakai `301 Moved Permanently` (bukan 302) untuk semua redirect.
- Cek Google Search Console untuk top URL → pastikan tidak drop traffic.

---

## 8. Inventory Fitur (existing PHP → new SvelteKit)

### 8.1 User-side (port semua)

| Fitur | PHP lama | SvelteKit baru | Peningkatan |
|---|---|---|---|
| Sign in | `auth/signin-edit.php` | `/login` | Passkey, Turnstile, rate-limit |
| Sign up | `auth/signup-edit.php` | `/daftar` | zxcvbn, disposable block, double opt-in |
| Forgot/reset | `auth/forgot-edit.php` | `/lupa-password` | Email Resend |
| Dashboard | `index-edit.php` | `/` (auth) | Hero saldo animated, quick-grid, pesanan terbaru SSE |
| New order | `order/new-sosmed.php` | `/pesan` | Kategori chips, qty-stepper, realtime total, saved links, quick re-order |
| Order history | `order/history-sosmed.php` | `/pesanan` | Filter chips, infinite scroll, SSE live status, swipe re-order |
| Order detail | modal Bootstrap | `/pesanan/[id]` | Bottom-sheet, timeline status, refill CTA |
| Services catalog | `services.php` | `/layanan` | Search sticky, filter chip, sort, favorit, bundle tray, card mobile |
| Deposit | `balance/add-balance.php` | `/saldo/top-up` | Amount chips, QRIS deep-link Midtrans, riwayat |
| Balance history | `balance/history-balance.php` | `/saldo/riwayat` | Card list, filter, export |
| Affiliate | `affiliasi/affi-edit.php` | `/affiliate` | Link + QR + Web Share, stats, withdraw |
| Affiliate withdraw | `affiliasi/wd.php` | `/affiliate/tarik` | Form + Riwayat |
| Tickets | `ticket/*.php` | `/tiket` | List, buat, balas, close (bottom-sheet) |
| Profile | `auth/signin-edit.php` | `/akun` | Edit, ganti password, API key regenerate, theme, passkey manage |
| API publik | `api/*.php` | `/api/v1/*` | Drizzle, Zod, rate-limit, doc OpenAPI |
| Notification | `ajax/notification-api.php` | SSE + Web Push | Real-time, gratis |
| PWA | `manifest.json` + `sw.js` | SvelteKit PWA | Offline catalog, install prompt |

### 8.2 Admin-side (port semua)

| Fitur | PHP lama | SvelteKit baru | Catatan |
|---|---|---|---|
| Admin dashboard | `admin/index-edit.php` | `/admin` | Stats, chart, realtime activity feed |
| User mgmt | `admin/users/users-edit.php` | `/admin/users` | Bulk, CSV export, card-list mobile |
| Services CRUD | `admin/service/*` | `/admin/services` | Edit, kategori, harga |
| Provider library | `admin/provider/*` | `/admin/providers` | Sync trigger, auto-sync toggle, balance, log, **fallback provider** (G11), **API key encrypt** (G5), **service mapping** (G16) |
| Pricing rules | `admin/setting/pricing.php` | `/admin/pricing` | Markup per level + **USD→IDR rate config** |
| Deposit mgmt | `admin/balance/*` | `/admin/deposits` | Approve/cancel |
| Order mgmt | `admin/order/*` | `/admin/orders` | Filter, refill, refund |
| Tickets mgmt | `admin/tickets/*` | `/admin/tickets` | Reply, close |
| Affiliate laporan | `admin/affiliate/index.php` | `/admin/affiliate` | Summary, top referrer, detail |
| Banner CMS | `admin/setting/banners.php` | `/admin/banners` | CRUD, toggle |
| Reporting | `admin/reporting/*` | `/admin/laporan` | Chart (Svelte chart lib), CSV export |
| Email marketing | `lib/EmailMarketingSystem.php` | `/admin/email` | Campaign, segment, queue |
| News | `admin/news/*` | `/admin/news` | CRUD |

### 8.3 Cron/webhook (port)

| Job | PHP lama | Baru | Catatan |
|---|---|---|---|
| Provider sync | `cron/dapat_service.php`, `cron/dapat_cat.php`, `cron/provider-sync.php` | `cron/provider-sync` + queue worker | §2.1 |
| Status polling | `cron/status.php`, `cron/status_irvan.php`, `cron/status_refill.php` | `cron/status-polling` | §2.2 stratified |
| Update harga | `cron/update_harga.php` | merge ke provider-sync | (auto_price_update opt-in) |
| Refill | `cron/refund.php`, `cron/status_refill.php` | `cron/refill-check` | |
| Deposit expire | `cron/update_depo.php` | `cron/deposit-expire` | |
| Email queue | `cron/send-email-queue.php`, `cron/send-marketing-emails.php`, `cron/send-new-user-emails.php` | `cron/email-queue` + Resend | |
| Email bounce | `cron/email-bounce.php` | Resend webhook + `cron/email-bounce` | |
| Payment callback | `tripay/callback.php`, `jasamutasi/callback.php` | `/api/webhook/tripay`, `/api/webhook/jasamutasi` | Port ke TS |
| Optimize DB | `cron/optimize-database.php` | `cron/housekeeping` | TiDB auto-maintain sebagian |

### 8.4 Fitur BARU (improvement)

- **Quick re-order** (swipe history) — §6.3 #1
- **Saved links** — §6.3 #2
- **Live SSE order status** — §6.3 #6
- **Web Push notification** — §6.3 #6 (ganti WA bot mahal)
- **QRIS deep-link Midtrans** — §6.3 #5
- **Affiliate QR + Web Share** — §6.3 #9
- **PWA installable + offline catalog** — §6.6
- **Dark mode** — §6.4
- **Realtime admin activity feed** — SSE
- **Better search services** (sticky + filter chip + sort + favorit + bundle) — sudah di PHP sebagian, polish
- **Onboarding tour 1st login** — §6.3 #10
- **Web Push opt-in prompt** setelah 1st order sukses
- **Saved payment method** (opsional, Midtrans saved token)
- **Order ETA estimation** (dari avg waktu service)
- **Admin: server-side filtering DataTable** ganti client-side (mobile-friendly)

---

## 9. Roadmap Eksekusi (M0 → M7)

### M0 — Foundation (3-4 hari)

- [ ] Verifikasi password hash di dump (`grep INSERT INTO users`).
- [ ] Buat monorepo pnpm workspace: `landing/` (sudah ada clone haloka), `app/`, `packages/{db,ui,core}`.
- [ ] Setup SvelteKit skeleton di `app/` dgn adapter-node, Tailwind v4, ESLint, Prettier, Vitest.
- [ ] Setup Drizzle: introspect dump → `schema.ts`. Import dump ke TiDB lokal (Docker) untuk dev.
- [ ] Verifikasi: `bcryptjs.compare('test123', hashFromDump)` → true. Login user existing works.
- [ ] Setup TiDB Serverless (Singapore) + Tencent Lighthouse Jakarta (Coolify panel).
- [ ] Deploy skeleton `app.socio.id` ke Tencent Lighthouse (halaman "coming soon" + healthcheck).
- [ ] Setup DNS: `socio.id` di CF, `app.socio.id` pointing ke VPS.

### M1 — Auth + DB wiring (4-5 hari)

- [ ] better-auth setup dgn Drizzle adapter (MySQL).
- [ ] Route: `/login`, `/daftar`, `/lupa-password`, `/reset`, `/verifikasi`.
- [ ] Turnstile integration (env-gated), zxcvbn meter, disposable block, rate-limit DB.
- [ ] Rehash-on-login untuk hash non-bcrypt.
- [ ] Double opt-in email (Resend).
- [ ] Passkey WebAuthn (register di `/akun` setelah login).
- [ ] Hook `hooks.server.ts`: session check, CSRF double-submit, rate-limit, security headers (port `lib/security-headers.php`).
- [ ] Test: login dgn user existing dari dump → sukses, saldo terbaca.

### M1.5 — Design Pass (3-4 hari) ⚠️ WAJIB sebelum M2

> **Tujuan**: bikin design contract + design system + screen spec sebelum ngoding route apapun. Tanpa ini, agent akan keluar UI generic Tailwind.
> **Skill yang dipakai**: `looks-expensive` (9-phase) + `theming-components` + `emil-design-eng` + `designing-layouts` + `ui-styling` (shadcn-svelte).

- [ ] **Phase 1 — Positioning** (skill `looks-expensive`): interview product → brief.
  - Product: SMM panel socio.id (panel reseller SMM + layanan publik).
  - Audience: reseller SMM Indonesia (mobile, mobile-first), admin internal.
  - Register: **Product** (dashboard/SaaS) untuk app user + admin, **Brand** untuk landing.
  - Memorable thing: "Top up, pesan, status update — semua 1 tap di mobile."
  - NOT: bukan WhatsApp AI (haloka), bukan WhatsApp bot, bukan CRM.
  - References: GoPay/DANA (app user mobile), Linear/Stripe (admin), haloka (landing micro-interaction).
  - Temperature: **Bold/High-Contrast** (consumer app), **Neutral/Clean** (admin).
  - Output: positioning brief di `docs/DESIGN_BRIEF.md`.
- [ ] **Phase 2 — Research** (skill `looks-expensive`): study GoPay/DANA + Linear + haloka + 5 SMM panel (SMMturk/JAP/Rush/PerfectPanel/Boom). Steal/avoid list.
- [x] **Phase 3 — Design Contract** (skill `looks-expensive`): output `DESIGN.md` lengkap (root `DESIGN.md` — palette/typography/spacing/radius/shadow/motion + 8 anti-pattern audit + app shell). Tokens implemented in `packages/ui/src/tokens.css`.
  - Scene sentence: "Reseller SMM Indonesia 25 tahun di café, buka HP mid-day, top up saldo Rp100k via QRIS, pesan 500 followers IG, tutup HP, lanjut kerja. Balik buka app 5 menit kemudian — status sudah Berhasil."
  - Palette: OKLCH derived dari brand hue (default biru-ungu SMM tech vibe, **bukan** hijau WA haloka). Tinted paper/ink. Accent visible di CTA + link + icon + tinted section. `--accent-ink` untuk button fill (L=0.42-0.48). **BUKAN** Inter — pilih Plus Jakarta Sans atau Manrope atau Space Grotesk.
  - Typography: 1 sans family, base 15px (mobile product UI), scale ratio 1.2-1.25 (compact). 400/500/600/700 weight. Mono accent only ≤14px untuk data atoms (order ID, timestamp, unit).
  - Spacing: 4px base, compact rhythm (max 64px between sections). Bottom nav safe-area accounted.
  - Radius: 4-32 system (xs 4 input → 2xl 32 hero). Pill untuk chip/tag.
  - Motion: custom cubic-bezier (`cubic-bezier(0.25,1,0.5,1)` haloka style), hover 150-200ms, reveal 400-600ms, entrance 600-800ms. GPU-safe (transform+opacity only). `prefers-reduced-motion` respected.
  - Section rhythm: ≥3 different patterns per page, ≥1 dark-inverted section (atau light kalau dark theme).
  - Output: `DESIGN.md` di `docs/`.
- [ ] **Phase 4 — Screen Spec** (skill `looks-expensive` + `theming-components`): per-route spec.
  - Untuk app user: 8 screen (dashboard, pesan, layanan, pesanan, saldo/top-up, affiliate, tiket, akun). Per-screen: route, purpose, hero pattern, imagery audit (real img, no gradient blob), section map, containment variance (≥3 patterns, max 2 default card), bullet budget (≤5), pricing pattern, stat section decision, ASCII wireframe, cognitive load check, 8 interaction states, responsive 320/640/768/1024/1280, animation plan (≥2 types, ≥1 domain-specific).
  - Untuk admin: 8 screen (dashboard, users, services, providers, orders, deposits, tickets, pricing). Dense data table + card-list mobile. Sidebar desktop + off-canvas mobile.
  - Untuk landing: pakai haloka sebagai baseline + adapt konten SMM (OrderSimulator ganti ChatSimulator).
  - Output: per-route spec di `docs/MOBILE_UX_GUIDE.md`.
- [x] **Setup `packages/ui`** (skill `ui-styling` + `theming-components`): Tailwind v4 + tokens dari DESIGN.md. Primitives built: Button, Card, StatusBadge, BalancePill, MobileShell (shadcn-svelte init + full component suite = follow-up M1.5 lanjutan).
  - Inisialisasi shadcn-svelte: `npx shadcn-svelte@latest init`.
  - Tambah komponen: Button, Card, Badge, Sheet (bottom-sheet), Dialog, Toast, Command (⌘K), Input, Select, Tabs, Skeleton, Tooltip, Avatar, Accordion.
  - Custom komponen SMM: StatusBadge (7 warna order), SaldoHero (animated counter), QuickGrid, ServiceCard, BottomNav, FAB, BottomSheet, QtyStepper, EmptyState, ConfirmDialog.
  - **Light dulu** (per jawaban user). Dark mode template ada tapi gak di-expose — ditambahkan di M6.
  - Output: `packages/ui/` siap dipakai app + landing.
- [ ] **Visual primitives** (skill `emil-design-eng`): invisible details — focus-visible ring, loading shimmer, skeleton, optimistic update pattern, haptic (navigator.vibrate), view transition SvelteKit, safe-area iOS/Android.
- [x] **Audit 8 anti-pattern `looks-expensive`** (per §6.0.2): rules encoded in `DESIGN.md` §5; enforced per-route before "done" (Phase 1/2/4 brief + screen-spec docs = follow-up).
- [ ] **Commit** + tandai M1.5 selesai di checklist ini.

### M2 — User app core (5-7 hari)

- [ ] Layout shell: header sticky, bottom nav 5 + FAB, off-canvas, safe-area, haptic.
- [ ] Dashboard `/`: hero saldo (animated), quick-grid 2×2, pesanan terbaru (SSE), pull-to-refresh.
- [ ] Services `/layanan`: search sticky, filter chip, sort, favorit (toggle), bundle tray, card mobile, infinite scroll.
- [ ] New order `/pesan`: kategori chips, qty-stepper, realtime total (pricing.ts), saved links, sticky CTA.
- [ ] Order history `/pesanan`: filter chips, infinite scroll, SSE live status, swipe quick re-order, detail bottom-sheet.
- [ ] Deposit `/saldo/top-up`: amount chips, Midtrans Snap (QRIS deep-link), Tripay port, riwayat.
- [ ] Balance history `/saldo/riwayat`.
- [ ] Affiliate `/affiliate`: link + QR + Web Share, stats, withdraw.
- [ ] Tickets `/tiket`: list, buat, balas, close.
- [ ] Profile `/akun`: edit, ganti password, API key, theme, passkey, logout.
- [ ] Notification: SSE + Web Push VAPID.
- [ ] PWA: manifest, service worker (offline catalog), install prompt.

### M3 — Admin (5-7 hari)

- [ ] Admin layout: sidebar (desktop) + off-canvas (mobile), role guard.
- [ ] Dashboard `/admin`: stats, chart (LayerKit/svelte-chartjs), realtime activity feed.
- [ ] Users mgmt: server-side filter, bulk, CSV export, card-list mobile.
- [ ] Services + kategori CRUD.
- [ ] Provider library: list, sync trigger, auto-sync toggle, balance, log.
- [ ] Pricing rules: markup per level.
- [ ] Deposit mgmt: approve/cancel.
- [ ] Order mgmt: filter, refill, refund.
- [ ] Tickets mgmt.
- [ ] Affiliate laporan.
- [ ] Banner CMS.
- [ ] Reporting: chart + CSV export.
- [ ] Email marketing: campaign, segment, queue.
- [ ] News CRUD.

### M4 — Cron & webhooks (3-4 hari)

- [ ] DB-backed queue (`job_queue` + worker loop).
- [ ] `cron/provider-sync` + worker (§2.1).
- [ ] `cron/status-polling` stratified (§2.2).
- [ ] Webhook provider status (kalau support) `/api/webhook/[provider]/status`.
- [ ] Payment callback: Tripay, Jasamutasi (port ke TS), Midtrans webhook.
- [ ] Cron ringan: deposit-expire, email-queue, email-bounce, refill-check, refund, housekeeping.
- [ ] Fly cron setup di `fly.toml`.
- [ ] Test: sync JAP live → 5746 layanan ter-update. Status polling order → update real-time.

### M5 — Landing socio.id (3-5 hari)

- [ ] Upgrade `landing/` (clone haloka) ke Tailwind v4 + astro:assets.
- [ ] Ganti konten haloka (WhatsApp AI) → socio.id (SMM panel).
- [ ] Section flow final: Navbar → Hero + **OrderSimulator** (simulasi alur pesan SMM, bukan chat WA) → TrustBadges → PainPoints (reseller SMM) → Features (catalog 6000+ layanan, auto-sync, pricing markup, affiliate) → InteractiveTutorial (top up → pilih layanan → status live) → SocialProof → Pricing (paket reseller: Member/Agen/Reseller/Admin markup) → FinalCTA → FAQ → Footer.
- [ ] Sticky CTA → "Daftar Gratis" → `app.socio.id/daftar`.
- [ ] FloatingWhatsApp → support.
- [ ] Blog MDX: setup content collections, 3-5 artikel SEO awal.
- [ ] Sitemap + robots + JSON-LD (Organization, SoftwareApplication, Product, FAQPage, BreadcrumbList).
- [ ] Deploy ke Cloudflare Pages, custom domain `socio.id`.

### M6 — Email + polish (3-4 hari)

- [ ] Resend integration (atau CF Email Routing + MailChannels).
- [ ] Email templates (svelte-email): welcome, verify, reset, deposit sukses, order status, ticket reply, affiliate komisi, marketing campaign.
- [ ] Bounce handling via Resend webhook → update `users.email_bounced/complained`.
- [ ] Unsubscribe page (`/unsubscribe`).
- [ ] Warm-up cap (ganti `SOCIO_MAIL_MAX_PER_RUN`).
- [ ] Polish micro-interactions, dark mode, a11y pass.
- [ ] Lighthouse mobile ≥ 90 semua page.
- [ ] Vitest coverage untuk `packages/core` (pricing, provider-sync, format).

### M7 — Cutover (2-3 hari + 1 minggu paralel)

- [ ] Backup dump final dari VPS lama.
- [ ] Import final ke TiDB production.
- [ ] **DNS + Cloudflare setup via skill `cloudflare`** (bukan manual):
  - Zone `socio.id` (kalau belum), NS di Cloudflare.
  - `socio.id` → Cloudflare Pages (landing build output `dist/`).
  - `app.socio.id` → VPS Tencent Jakarta (A/AAAA/CNAME + orange-cloud proxy).
  - `cdn.socio.id` → R2 custom domain (public access).
  - SSL Full (strict), always HTTPS, Brotli, auto-minify.
  - WAF + DDoS + rate-limit per-IP + security headers (HSTS, X-Frame, X-Content-Type, Referrer-Policy, Permissions-Policy, CSP).
  - Kalau perlu Zero Trust `/admin/*` → skill `cloudflare-one`.
- [ ] **Paralel run 1 minggu**: old PHP (alias `old-app.socio.id`) + new app. User bisa akses keduanya. Monitor error log.
- [ ] Migrate cron: disable cron PHP lama, enable node-cron di VPS baru.
- [ ] Sunset VPS lama: backup final, archive code, terminate.
- [ ] Post-cutover monitoring: Axiom dashboard, error alert, uptime monitoring (UptimeRobot free).

---

## 10. Referensi Landing (haloka-landing) — Upgrade Checklist

Sudah di-clone ke `/Users/maabook/Desktop/socio.id/landing`. Bagusnya: section flow, micro-interactions, SEO meta. Yang di-upgrade:

| Aspek | Sekarang | Upgrade |
|---|---|---|
| Tailwind | v3 (`tailwind.config.mjs` + `@astrojs/tailwind`) | **v4** (`@theme` di `global.css` + `@tailwindcss/vite`) |
| Font | Google Fonts CDN | `@fontsource-variable/fredoka` + `open-sans` (self-host) |
| Image | `<img src="/logo.png">` | `astro:assets` `<Image>` → WebP/AVIF |
| View Transition | none | `<ClientRouter />` di Layout |
| JSON-LD | SoftwareApplication + Organization | + `Product` (paket), `FAQPage` (auto dari data), `BreadcrumbList` |
| Sitemap | none (static `sitemap.xml` lama) | `@astrojs/sitemap` auto |
| Analytics | GTM berat | Plausible/Umami (ringan) atau GA4 |
| A11y | minimal | skip-link, focus-visible, aria, reduced-motion |
| Konten | WhatsApp AI Agent Haloka | **SMM Panel Socio.id** (rewrite all section + komponen baru `OrderSimulator` ganti `ChatSimulator`) |
| Pricing | paket Sapa/Sobat/Juragan (langganan) | Paket reseller SMM: Member/Agen/Reseller/Admin (markup-based, port dari `pricing_rules`) |
| Sticky CTA | "Ambil Trial" | "Daftar Gratis" + "Lihat Layanan" |
| Mobile nav | hamburger sederhana | + bottom CTA bar di mobile (Daftar + Masuk) |

**Komponen baru untuk SMM:**
- `OrderSimulator.svelte` (ganti `ChatSimulator`): simulasi alur — pilih layanan → masuk link → lihat status real-time → sukses. Auto-play cursor seperti InteractiveTutorial.
- `LiveServiceCount.svelte`: counter "6000+ layanan tersedia" animated.
- `ProviderLogos.svelte`: logo JAP/IRVAN/SMC/Midtrans (trust).
- `ResellerCalculator.svelte`: kalkulator profit reseller (input modal → estimasi profit dgn markup).

---

## 11. Security Checklist (port dari P0-P3)

- [ ] **SQL injection**: Drizzle prepared statement otomatis. No raw query tanpa escape.
- [ ] **CSRF**: double-submit cookie + SameSite=Lax. SvelteKit form action punya CSRF built-in.
- [ ] **XSS**: Svelte auto-escape `{expr}`. `{@html}` hanya untuk konten trusted/sanitized (blog MDX → rehype-sanitize).
- [ ] **Password**: bcryptjs (kompatibel PHP). Rehash-on-login untuk hash lama.
- [ ] **Session**: HttpOnly + Secure + SameSite. Rotate session ID setelah login.
- [ ] **Rate-limit**: per-IP per-endpoint, DB store. Login 5/menit, signup 5/15menit, API publik 60/menit.
- [ ] **Turnstile**: gate signup/signin/forgot (env-gated `SOCIO_TURNSTILE_*`).
- [ ] **Security headers**: HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, CSP (SvelteKit hook).
- [ ] **SSL verify**: semua outbound HTTP (provider API, Midtrans, Resend) verify peer.
- [ ] **Secrets**: env via Fly secrets + Cloudflare Pages env. No hardcoded.
- [ ] **Disposable email block** (port).
- [ ] **Email suppression**: bounced/complained (port `email_bounces`).
- [ ] **API publik**: API key per user, rate-limit, Zod validation, doc OpenAPI.
- [ ] **Audit log**: admin action (delete user, approve deposit, refund) → tabel `audit_log`.
- [ ] **Backup DB**: otomatis harian (TiDB snapshot atau `mysqldump` cron ke R2).

---

## 12. Open Decisions (butuh jawaban kamu)

1. **Database hosting**: TiDB Serverless (free 5GB, rekomendasi) atau MySQL Fly Volume / VPS Hetzner?
2. **Password hash verify**: boleh saya cek dump sekarang untuk konfirmasi format? (penting untuk M0)
3. **Email**: Resend (3.000/bln, gampang) atau CF Email Routing + MailChannels (unlimited Rp0)?
4. **Cutover**: paralel 1 minggu (rekomendasi, aman) atau langsung switch DNS?
5. **Blog landing**: convert WP posts existing → Astro MDX, atau mulai bersih (3-5 artikel baru)?
6. **Analytics**: Plausible self-host (Rp0, perlu VPS/cloud) / Umami Cloud (free) / GA4?
7. **Midtrans**: Snap (rekomendasi, QRIS deep-link ready) atau Core API custom?
8. **Cron process**: 1 Fly app (web + cron same process) atau 2 process group terpisah (web + cron)? Rekomendasi: terpisah (gak ganggu web saat sync berat).

---

## 13. File Pendukung (akan dibuat per milestone)

| File | Tujuan | Milestone |
|---|---|---|
| `docs/DATABASE_MIGRATION.md` | Dump → TiDB, schema diff, verify | M0 |
| `docs/AUTH_MIGRATION.md` | Password compat, rehash, session | M1 |
| `docs/DESIGN_BRIEF.md` | Positioning brief (Phase 1 looks-expensive) | M1.5 |
| `docs/DESIGN.md` | Design contract lengkap (palette/typography/spacing/motion, Phase 3) | M1.5 |
| `docs/MOBILE_UX_GUIDE.md` | Screen spec per route (Phase 4), micro-interactions, design system reference | M1.5 + M2 |
| `docs/CRON_ARCHITECTURE.md` | Queue, provider-sync (SMMturk), status polling | M4 |
| `docs/LANDING_UPGRADE.md` | Haloka → socio.id transform | M5 |
| `docs/EMAIL_SETUP.md` | Resend + templates + bounce | M6 |
| `docs/DEPLOYMENT.md` | Tencent Lighthouse + TiDB + CF Pages + DNS cutover | M7 |
| `docs/RUNBOOK.md` | Cheat sheet ops harian | M7 |

---

## 14. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Password hash ternyata MD5 | User gak bisa login | Rehash-on-login (test sample dump dulu di M0) |
| TiDB free 5GB penuh | App down | Monitor, siapkan VPS Hetzner fallback |
| Cron sync diblokir provider (rate-limit) | Layanan gak update | Backoff eksponensial + log + alert admin |
| Fly free tier habis (3 VM) | App lambat | Upgrade 512MB (~Rp100k/bln) |
| Web Push gak support iOS < 16.4 | Notif gak masuk | Fallback email + in-app notif |
| Dump import gagal (FK/charset) | Migrasi stuck | Import per tabel, set `SET FOREIGN_KEY_CHECKS=0`, charset utf8mb4 |
| SEO drop saat cutover domain | Traffic turun | Redirect 301 map, sitemap submit GSC, paralel run |
| Provider webhook gak ada | Status polling tetap berat | Tetap pakai stratified polling, batch API |
| jQuery dependency di admin PHP | Tidak relevan (rewrite penuh) | Admin SvelteKit murni, gak pakai jQuery |

---

## 15. Estimasi Biaya Operasional (post-migrate)

| Item | Free tier | Setelah growth |
|---|---|---|
| Landing CF Pages | Rp0 | Rp0 (unlimited) |
| App Fly.io | Rp0 (3 VM 256MB) | ~Rp100-300k/bln (512MB-1GB) |
| DB TiDB | Rp0 (5GB) | ~Rp200k/bln (10GB) atau VPS Rp80k/bln |
| R2 | Rp0 (10GB) | ~Rp1/GB/bln setelah 10GB |
| Email Resend | Rp0 (3.000/bln) | $20/bln (50.000) atau CF MailChannels Rp0 |
| Domain socio.id | ~Rp150k/tahun | sama |
| **Total awal** | **~Rp150k/tahun** (domain only) | |
| **Total growth** | | **~Rp500k-1jt/bln** |

vs VPS lama: ~Rp200-500k/bln + maintenance. Rebuild ini **lebih murah + lebih scalable**.

---

**Status dokumen:** Draft v1 — siap eksekusi setelah §12 keputusan dijawab.
**Next action:** Cek password hash di dump (M0 step 1), setup monorepo.
