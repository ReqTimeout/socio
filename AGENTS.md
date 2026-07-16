# AGENTS.md — Panduan untuk Coding Agent (Socio.id Rebuild)

> **Baca wajib sebelum mulai kerja apapun.** Dokumen ini menjaga konsistensi antar coding agent / model yang berbeda supaya tetap stick to the plan, gak halu, gak invent fitur sendiri.

## 0. Aturan mutlak

1. **SELALU baca `REBUILD_PLAN.md` dulu** sebelum eksekusi apapun. Itu source of truth.
2. **SELALU baca `docs/ADMIN_GAP.md`** sebelum kerja modul admin — daftar gap wajib fix.
3. **DILARANG ngoding route apapun sebelum M1.5 (Design Pass) selesai** — tanpa design contract fix (palette/typography/spacing/motion), agent akan keluar UI generic. Load skill `looks-expensive` + `theming-components` di M1.5.
4. **JANGAN invent fitur/komponen sendiri** — hanya kerjakan yang ada di plan. Kalau butuh fitur baru, tanya user dulu.
5. **JANGAN ubah tech stack** tanpa approval user. Stack final ada di `REBUILD_PLAN.md §0`.
6. **JANGAN ubah struktur folder** — ikuti `REBUILD_PLAN.md §1`. Folder lama (`app.socio.id/`, `socio.id/`) hanya referensi, jangan diedit.
7. **JANGAN commit/push** tanpa instruksi user eksplisit.
8. **JANGAN hapus folder lama** (`app.socio.id/`, `socio.id/`) sampai M7 cutover selesai.
9. Kalau ada kontradiksi antar dokumen → `REBUILD_PLAN.md` menang. Tanya user kalau masih ambigu.
10. Kalau ragu **mana yang benar** → tanya user, jangan asumsi.
11. Selalu jalankan `pnpm lint && pnpm typecheck && pnpm test` (kalau ada) selesai kerja per modul.
12. **Sebelum bilang route selesai**, wajib load skill `web-design-guidelines` + `review-animations` + audit 8 anti-pattern `looks-expensive` (lihat §7).

## 1. Source of truth (urutan prioritas)

| Prioritas | Dokumen | Isi |
|---|---|---|
| 1 | `REBUILD_PLAN.md` | Master plan, tech stack, roadmap, hosting, schema, security |
| 2 | `docs/ADMIN_GAP.md` | Gap fitur admin yang wajib di-fix |
| 3 | `docs/MOBILE_UX_GUIDE.md` (dibuat M2) | Design system, micro-interactions spec |
| 4 | `docs/CRON_ARCHITECTURE.md` (dibuat M4) | Queue, SMMturk sync, status polling |
| 5 | `docs/DATABASE_MIGRATION.md` (dibuat M0) | Dump → TiDB, schema diff |
| 6 | `.env.example` | Daftar env variable wajib |

**Tidak ada dokumen lain yang valid** kecuali di atas. Reddit/Hacker News/blog random = bukan sumber.

## 2. Tech stack final (JANGAN diubah)

- **Landing**: Astro 5 + Svelte 5 islands + Tailwind v4 + MDX → Cloudflare Pages
- **App**: SvelteKit + adapter-node + Tailwind v4 → Tencent Lighthouse Jakarta + Coolify
- **DB**: MySQL via Drizzle ORM → TiDB Serverless Singapore (managed, terpisah dari VPS)
- **Auth**: better-auth + bcryptjs (kompatibel PHP `password_hash`)
- **Queue**: DB-backed (`job_queue` + `SELECT FOR UPDATE SKIP LOCKED`) — NO Redis
- **Cron**: node-cron di VPS app process
- **Provider SMM**: SMMturk (`smmturk.org/api/v2`, env `SOCIO_SMMTURK_KEY`)
- **Payment**: Tripay + Midtrans
- **Email**: Resend
- **Storage**: Cloudflare R2
- **Real-time**: SSE (no WebSocket)
- **Push**: Web Push VAPID
- **DNS/Edge**: Cloudflare (zone `socio.id`, `app.socio.id`, `socio.id`, R2 CDN)

**Dilarang pakai**: Redis, MongoDB, PostgreSQL (kecuali kalau user setuju konversi), PHP, WordPress, jQuery, Bootstrap, Next.js/Nuxt, Cloudflare Workers untuk app/cron (CPU limit + no MySQL TCP).

## 2.1 Cloudflare (wajib pakai skill resmi)

**Semua konfigurasi Cloudflare dikerjakan via skill `cloudflare`** (bukan asal CLI/manual) supaya sesuai dokumentasi resmi:
- **DNS**: zone `socio.id`, record `socio.id` (Cloudflare Pages), `app.socio.id` (VPS Tencent Jakarta via A/AAAA/CNAME + orange-cloud proxy), `cdn.socio.id` (R2 custom domain).
- **Pages**: deploy landing `socio.id` dari repo (build `pnpm --filter landing build`, output `dist/`).
- **R2**: bucket `socio` (10GB free) untuk avatar/banner/blog image/payment proof. Setup custom domain `cdn.socio.id` + public access.
- **Turnstile**: signup/signin/forgot gate — pakai skill `turnstile-spin` untuk setup widget + sitekey/secret.
- **Security**: WAF, DDoS, rate-limit (per-IP), security headers (HSTS, X-Frame, X-Content-Type, Referrer-Policy, Permissions-Policy, CSP) via Cloudflare dashboard/API.
- **SSL**: Full (strict) mode, always HTTPS, auto-minify, Brotli.
- **Kalau perlu Zero Trust / Access untuk `/admin/*`**: pakai skill `cloudflare-one` (Access policy).
- **Kalau perlu deploy Worker (SEO/redirect)**: pakai skill `wrangler` (tapi app/cron TIDAK di Worker — lihat §2).

**Skill yang dipakai**: `cloudflare` (utama), `turnstile-spin` (Turnstile), `cloudflare-one` (Zero Trust admin), `wrangler` (Worker/CLI). Load sebelum kerja apapun yg menyentuh Cloudflare.

## 3. Milestone tracker (SEBELUM mulai kerja, cek posisi)

```
M0 — Foundation                    [ ] belum mulai
M1 — Auth + DB wiring              [ ] belum mulai
M1.5 — Design Pass (WAJIB)         [ ] belum mulai
M2 — User app core                 [ ] belum mulai
M3 — Admin + gap fix (ADMIN_GAP)   [ ] belum mulai
M4 — Cron & webhooks (SMMturk)     [ ] belum mulai
M5 — Landing socio.id              [ ] belum mulai
M6 — Email + polish                [ ] belum mulai
M7 — Cutover                       [ ] belum mulai
```

**Sebelum mulai milestone**, cek status di atas. Kalau M0 belum selesai, **jangan lompat ke M2**. Kerjakan berurutan kecuali user bilang sebaliknya.

Setiap milestone punya checklist di `REBUILD_PLAN.md §9`. Tidak boleh skip item kecuali ditandai "(opsional)" atau user approve.

## 4. Cara mulai sesi baru (apapun modelnya)

Saat lanjut kerja (model baru / sesi baru), **wajib lakukan ini dulu sebelum kode apapun**:

1. **Baca `AGENTS.md`** (file ini).
2. **Baca `REBUILD_PLAN.md §9`** — cari milestone yang sedang in-progress / belum selesai.
3. **Cek `docs/`** — ada dokumen milestone yang sudah dibuat?
4. **Cek git status** (`git status` + `git log --oneline -20`) — lihat progress terakhir.
5. **Cek struktur folder aktual** (`ls` di root + `app/` + `packages/`) — bandingkan dgn plan.
6. **Tanya user** (kalau perlu): "Lanjut milestone MX, item terakhir yang dikerjakan Y. Lanjut ke Z?" — konfirmasi sebelum mulai.
7. **Update todo list** pakai tool todowrite untuk item milestone yang akan dikerjakan sesi ini.

**Dilarang**: langsung mulai ngoding tanpa cek konteks di atas. Itu sumber utama "halu".

## 5. Konvensi kode

### Bahasa & format
- TypeScript strict mode (kalau bisa `strict: true` di tsconfig).
- ESM (`"type": "module"`).
- Format: Prettier (default config SvelteKit + Astro).
- Lint: ESLint (typescript-eslint + svelte plugin).
- Naming: `camelCase` variable/function, `PascalCase` component/type, `kebab-case` file route, `snake_case` untuk DB kolom (kompatibel dump lama).

### Struktur file
- App route: `app/src/routes/(auth)/login/+page.svelte` + `+page.server.ts` (group `(auth)` untuk layout shared).
- Lib: `app/src/lib/server/*` (server-only: db, auth, queue, payment) — JANGAN import ke client component.
- Komponen UI: `packages/ui/src/*` — shareable.
- Business logic: `packages/core/src/*` — shareable, no SvelteKit dependency.
- DB schema: `packages/db/src/schema/*` — satu file per tabel grup.

### Database
- **Drizzle ORM only** — dilarang raw SQL kecuali untuk performance critical (kasih komentar alasan).
- **Prepared statement otomatis** — Drizzle handle, jangan string concat SQL.
- **Migration**: `drizzle-kit generate` + `migrate`. Jangan edit migration yang sudah jalan.
- **Schema introspect**: dari dump TiDB → review manual → simpan di `packages/db/src/schema/`.
- **Tabel baru** (rebuild): `audit_log`, `job_queue`, `web_push_subscriptions`, `saved_links`, `coupons`, `loyalty_points`, `service_mapping`, `api_usage`.

### Auth
- **better-auth** + custom Drizzle adapter MySQL.
- **Password verify**: `bcryptjs.compare(input, user.password)` — kompatibel PHP `$2y$/$2a$/$2b$`.
- **Rehash-on-login**: kalau hash prefix bukan bcrypt → setelah login sukses, rehash + update DB.
- **Session**: cookie HttpOnly + Secure + SameSite=Lax.
- **CSRF**: SvelteKit form action built-in + double-submit cookie untuk API endpoint.

### SMMturk client (packages/core/src/smmturk.ts)
- Endpoint: `POST https://smmturk.org/api/v2` form-encoded.
- Action: `balance`, `services`, `add`, `status`, `refill`, `cancel`.
- API key via env `SOCIO_SMMTURK_KEY` — **DILARANG HARDCODE**.
- USD currency → konversi IDR di `packages/core/src/pricing.ts` pakai `SOCIO_USD_TO_IDR` env.
- Rate-limit: 10 concurrent request max (worker queue), delay 100ms antar request.
- Error handling: backoff eksponensial (1h → 2h → 4h), log ke `provider_sync_log`.

### Cron
- **node-cron** di `app/src/cron/index.ts` (jalan di process sama dgn app, atau Coolify separate process).
- **Queue**: tabel `job_queue`, worker loop `SELECT ... FOR UPDATE SKIP LOCKED LIMIT N`, commit per job.
- **Provider sync**: tiap 1 jam, fetch 8185 layanan, diff hash, enqueue yang berubah, worker parallel 5-10.
- **Status polling**: tiap 1 menit, stratified (Pending<1h=1m, Pending 1-6h=5m, Proses=5m, final=skip).
- **Dilarang**: polling semua order tiap menit (boros API + RAM).

### Security (wajib)
- Drizzle prepared statement (auto) — no SQLi.
- CSRF double-submit cookie + SvelteKit form action.
- XSS: Svelte auto-escape, `{@html}` hanya untuk konten trusted/sanitized.
- Rate-limit per-IP per-endpoint (DB store, no Redis).
- Turnstile gate (signup/signin/forgot) — env-gated.
- Security headers (HSTS, X-Frame, X-Content-Type, Referrer-Policy, Permissions-Policy, CSP) di `hooks.server.ts`.
- SSL verify semua outbound HTTP (SMMturk, Midtrans, Resend).
- **Provider API key encrypt at rest** (AES-256 env key) — G5 dari ADMIN_GAP.
- **Audit log** semua admin action destruktif — G1 dari ADMIN_GAP.

## 6. Anti-pattern (DILARANG)

| Anti-pattern | Alasan |
|---|---|
| Hardcode secret/API key | Leak ke git = disaster |
| `any` type tanpa komentar alasan | Hilang type safety |
| Import `lib/server/*` ke client component | Leak server code ke browser |
| Raw SQL string concat | SQLi |
| Polling semua order tiap menit | Boros API + RAM VPS |
| Sync SMMturk tanpa diff-hash | Boros write DB + RAM |
| WebSocket untuk real-time | SSE lebih ringan, no upgrade |
| Redis untuk queue | Tambah dependency + biaya, DB queue cukup |
| jQuery / Bootstrap / PHP | Stack baru = SvelteKit + Tailwind |
| Cloudflare Workers untuk app/cron | No MySQL TCP + CPU limit |
| Edit folder lama (`app.socio.id/`, `socio.id/`) | Reference only, jangan sentuh |
| Skip checklist milestone tanpa approval user | Bisa ada gap terlewat |
| Commit tanpa `pnpm lint && pnpm typecheck` | Bisa masuk error ke repo |

## 7. Verifikasi selesai per modul

Sebelum bilang "selesai" untuk modul/route apapun, **wajib lakukan**:

1. `pnpm --filter app lint` — no error.
2. `pnpm --filter app typecheck` (`svelte-check`) — no error.
3. `pnpm --filter app test` (Vitest) — kalau ada test untuk modul ini, lulus.
4. `pnpm --filter app build` — build sukses.
5. Manual test di `pnpm --filter app dev` — route jalan, mobile view OK (Chrome DevTools mobile emulation 360×640 + 768×1024).
6. **Load skill `web-design-guidelines`** → audit UI compliance (a11y, focus, contrast, nav, footer, dark mode kalau ada).
7. **Load skill `review-animations`** (kalau ada animasi) → audit craft bar (timing, transform/opacity only, reduced-motion).
8. **Audit 8 anti-pattern `looks-expensive`** (lihat REBUILD_PLAN §6.0.2): bullet budget (≤5), eyebrow pill (≤1), card chrome (≤2 default), 3-tier pricing card generik (replace dgn table), 4-col stat strip (replace dgn inline-stat), no imagery (pakai `<img>` real), container identik (≥3 patterns), Inter default (pilih sans lain).
9. **Cek AA contrast** untuk accent-filled surfaces (button, badge, recommended-plan stripe, active tab) — minimum 4.5:1 di rest + hover. Pakai `--accent-ink` (L=0.42-0.48) untuk button fill.
10. **Cek Lighthouse mobile** (kalau route public) — score ≥ 90.
11. Update checklist di `REBUILD_PLAN.md §9` (tandai `[x]`).
12. Update `docs/` kalau ada dokumen milestone yang perlu diisi.
13. Commit dgn message format: `feat(M{X}): {modul} — {item checklist}` atau `fix(M{X}): {masalah}`.

**Dilarang bilang "selesai" kalau step 1-4 belum lulus. Dilarang ngoding route apapun sebelum M1.5 selesai.**

## 8. Kalau bingung / halu / kontradiksi

1. **Berhenti ngoding**.
2. Cek `REBUILD_PLAN.md` bagian relevan.
3. Cek `docs/ADMIN_GAP.md` kalau soal admin.
4. Cek git log — mungkin sudah dikerjakan sesi sebelumnya.
5. **Tanya user** dengan pertanyaan spesifik: "Di REBUILD_PLAN §X disebut A tapi di kode ada B, ikuti mana?" — jangan asumsi.

## 9. Quick reference: env wajib

Lihat `.env.example` di root untuk daftar lengkap. Yang paling kritis:
- `SOCIO_SMMTURK_KEY` — API key SMMturk
- `SOCIO_DB_URL` — connection string TiDB (dgn `sslmode=require`)
- `SOCIO_AUTH_SECRET` — secret session
- `RESEND_API_KEY` — email
- `R2_*` — storage
- `VAPID_*` — web push

## 10. Quick reference: tabel DB penting (dari dump lama)

- `users` — user (id, username, email, password [bcrypt], balance, level [Member/Agen/Reseller/Admin], verify, token_login, ...)
- `orders` — order (user_id, service_id, link, quantity, price, status, created_at, ...) — TAMBAH kolom `next_poll_at`, `poll_priority` di M0
- `deposits` — deposit (user_id, amount, status, payment_method, ...)
- `services` — layanan internal (service_id, name, category, price_api, min, max, ...)
- `provider` — provider SMM (JAP/IRVAN/SMC/SMMturk) — TAMBAH SMMturk di M0
- `provider_services` — mirror katalog provider
- `pricing_rules` — markup per level (level, markup_percent, flat_per_1k, min_profit_per_1k, is_active)
- `tickets` — ticket support
- `affiliate` / `balance_logs` — komisi + riwayat saldo
- `notifications` — in-app notif

Tabel BARU di rebuild:
- `audit_log` — admin action log (G1)
- `job_queue` — cron queue (no Redis)
- `web_push_subscriptions` — VAPID
- `saved_links` — repeat order
- `coupons`, `loyalty_points`, `service_mapping`, `api_usage`

## 11. Referensi cepat: file lama PHP (untuk port logika)

| Modul | File PHP lama | Tujuan port |
|---|---|---|
| Pricing | `lib/pricing.php` | `packages/core/src/pricing.ts` |
| Provider sync | `lib/provider-sync.php` | `packages/core/src/smmturk.ts` + `app/src/cron/provider-sync.ts` |
| Mailer | `lib/mailer.php` | `app/src/lib/server/email.ts` (Resend) |
| Auth | `auth/*-edit.php` | `app/src/routes/(auth)/*` + `app/src/lib/server/auth.ts` |
| Order | `order/new-action.php` | `app/src/routes/pesan/+page.server.ts` |
| Deposit | `balance/add-action.php` | `app/src/routes/saldo/top-up/+page.server.ts` |
| Affiliate | `affiliasi/*` | `app/src/routes/affiliate/*` |
| Admin | `admin/*` | `app/src/routes/admin/*` + baca `docs/ADMIN_GAP.md` |
| Cron | `cron/*.php` | `app/src/cron/*.ts` |
| Payment | `tripay/callback.php`, `jasamutasi/callback.php` | `app/src/routes/api/webhook/*/+server.ts` |
| API publik | `api/*-edit.php` | `app/src/routes/api/v1/*/+server.ts` |
| Notification | `lib/NotificationManager.php` | `app/src/lib/server/notification.ts` |

---

**Inti pesan untuk coding agent**: baca plan, kerjakan berurutan, jangan invent sendiri, verifikasi sebelum bilang selesai, tanya kalau ragu. Konsistensi > kecepatan.
