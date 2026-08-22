# REBUILD_GAP_ANALYSIS.md — Audit Script Lama ↔ Baru & Gap Improvement Design (per Phase)

> **Tanggal audit:** 17 Agustus 2026
> **Metode:** Build lokal (`pnpm --filter app build` + `pnpm --filter landing build` + `pnpm --filter app check`) → **LULUS** (app `✓ built in 9.65s` adapter-node; landing `✓ Complete`; svelte-check **0 errors / 38 warnings**). Lalu mapping folder PHP lama (`app.socio.id/`) vs route SvelteKit baru (`app/src/routes`, `landing/src`) + komponen `packages/ui` + lib `packages/core`.
>
> **Tujuan:** Temukan gap antara script lama & baru, apa yang *belum* di-improve di sisi design/fitur, dan susun per phase (M0→M7 + phase ADMIN_GAP) supaya bisa dieksekusi berurutan.

---

## 0. STATUS BUILD LOKAL (terverifikasi)

| Target | Perintah | Hasil |
|---|---|---|
| App (SvelteKit) | `pnpm --filter app build` | ✅ `✓ built in 9.65s` — adapter-node |
| Landing (Astro) | `pnpm --filter landing build` | ✅ `1 page(s) built in 2.50s` — Cloudflare ready |
| Type-check | `pnpm --filter app check` | ✅ **0 errors**, 38 warnings (a11y label + state) |
| Paket workspace | `pnpm install` (sudah ada `node_modules`) | ✅ `packages/core` resolve via source `.ts` (hoist pnpm) |

**Kesimpulan:** Fondasi sudah sehat & bisa di-build. Gap bukan di kompilasi, tapi di **cakupan fitur (porting PHP) + enforcement design system + fitur admin lanjutan**.

---

## 1. RINGKASAN EKSEKUTIF (per Phase)

| Phase / Milestone | Status | Gap utama yang belum | Prioritas |
|---|---|---|---|
| **M0 — Foundation** | ✅ Selesai | — | — |
| **M1 — Auth + DB** | ✅ 100% | selesai 17 Agt 2026 (lihat §3) | — |
| **M1.5 — Design Pass** | 🟡 70% | Tokens & komponen ada, tapi belum 100% dipakai di semua route (§8) | Medium |
| **M2 — User App Core** | 🟢 85% | CMS statis (`/faq`,`/terms`,`/privacy`), panel/whitelabel, ads module | Medium |
| **M3 — Admin + Gap Fix** | 🟡 55% | `/admin/affiliate`, `/admin/banner`, `/admin/news`, `/admin/email`, refund/refill UI, RBAC enforcement, 2FA, SSE feed, dark mode, card-list mobile | 🔴 Tinggi |
| **M4 — Cron & Webhooks** | 🟡 60% | Tripay webhook (BLOKKER), CekMutasi/Jasamutasi, refill cron, refund cron, email queue | 🔴 Tinggi |
| **M5 — Landing** | 🟡 40% | Cuma `index.astro`; belum FAQ/TOS/Privacy/Pricing/blog/SEO-verify files | Medium |
| **M6 — Email + Polish** | 🟡 30% | UI email marketing belum, dark mode, PDF export, newsletter analytics | Medium |
| **M7 — Cutover** | ⚪ 0% | Parallel run + sunset VPS lama | Nanti |

---

## 2. METODOLOGI & PETA STRUKTUR

**Baru (deploy):**
```
app/src/routes/(auth)/   → login, daftar, lupa-password, verifikasi, reset, dev-admin-login
app/src/routes/(app)/    → /, layanan, pesan, pesanan, saldo, saldo/top-up, saldo/riwayat,
                           affiliate, tiket, notif, akun
app/src/routes/(admin)/  → /admin, users, orders, deposits, services, providers,
                           pricing, settings, audit, reporting, tickets
app/src/routes/api/      → auth/[...all], v1, webhook/midtrans, cron/trigger
app/src/cron/            → index.ts, provider-sync.ts, status-polling.ts, light.ts
app/src/lib/server/      → auth, turnstile, rate-limit, cron, notification, crypto,
                           admin, email, pricing-defaults, r2, disposable-emails, payment
packages/ui/src/         → 31 komponen (Button, Card, DataTable, Sheet, BottomNav, FAB,
                           SaldoHero, StatCard, StatusBadge, ConfirmDialog, Chart, …)
packages/core/src/       → pricing.ts (computePrice + applyCoupon), smmturk.ts
landing/src/pages/       → index.astro ONLY
```

**Lama (reference, jangan di-deploy):** `app.socio.id/` → `admin/`, `affiliasi/`, `ads/`, `api/`, `auth/`, `balance/`, `cekmutasi/`, `cron/`, `jasamutasi/`, `lib/`, `order/`, `panel/`, `services/`, `ticket/`, `tripay/`, `pages/`(faq.html), `news/`, `marketing/`.

---

## 3. PHASE M1 — AUTH + DB WIRING  (status: ✅ 100% — DIKERJAKAN 17 Agt 2026)

### Yang SUDAH ✅
- `better-auth` + `lib/server/auth.ts`, endpoint `api/auth/[...all]`.
- Login/daftar/lupa/verifikasi/reset + `dev-admin-login` (bypass untuk dev).
- `bcryptjs` kompatibel `password_hash()` PHP (sesuai AGENTS.md §5).
- DB Drizzle `packages/db` (schema `users`, `accounts`, `sessions`, `pricing_rules`, `provider`, `provider_sync_log`, `audit_log`, `admin_roles`, dll).
- **Custom session cookie distabilkan** — `lib/server/session.ts` jadi single source of truth (`setSocioSessionCookie` / `clearSocioSessionCookie` / `parseSocioSession`). Dipakai oleh `login`, `dev-admin-login`, `logout`, `hooks.server.ts`. Keputusan desain (kenapa bukan cookie better-auth) **didokumentasikan** di `auth.ts` + `hooks.server.ts` agar tidak di-"fix" lagi dan ke-break lagi.
- **Turnstile di-aktifkan kembali di login** dengan aman (opt-in `SOCIO_TURNSTILE_ENABLED=1`, fallback skip kalau tidak di-arm).
- **Rehash-on-login** implement + extended ke dua store (`users.password` + `accounts.password`).

### Gap / Risiko — STATUS SETELAH FIX (17 Agt 2026)
| # | Masalah | Status | Bukti / Fix |
|---|---|---|---|
| M1-1 | **Session cookie fragile** | ✅ **RESOLVED** | `lib/server/session.ts` sentralisasi cookie + komentar desain di `auth.ts`/`hooks.server.ts`. `secure` cookie dijadikan env-gated (`SOCIO_SECURE_COOKIES=1` di prod, default `false` = perilaku lama, zero-regression). Risiko `__Secure-` tidak relevan karena kita pakai cookie custom (`socio_session`), bukan cookie better-auth. |
| M1-2 | **Turnstile dinonaktifkan paksa** | ✅ **RESOLVED (safe opt-in)** | `turnstile.ts` sekarang opt-in: `verifyTurnstile` return `true` kalau `SOCIO_TURNSTILE_ENABLED!=1` (skip), dev skip, no-secret skip. `TURNSTILE_SITEKEY` cuma return key kalau enabled. Login `load` balikin `TURNSTILE_SITEKEY`, action verify token, `+page.svelte` render widget kalau `sitekey` ada. **Bug token-capture juga diperbaiki**: `response-field-name: "turnstile"` di client → token masuk form. `.env.example` dokumentasikan flag + peringatan test-key dev-only. |
| M1-3 | **Rehash-on-login** | ✅ **RESOLVED** | `maybeRehashPassword` di `auth.ts` sudah ada & dipanggil di `login/+page.server.ts`. Diperluas: upgrade `users.password` DAN `accounts.password` (store yang benar-benar diverifikasi custom login). Best-effort try/catch → tidak pernah break login. |

### Catatan verifikasi
- `pnpm --filter app build` → ✅ `built in 10.45s`.
- `pnpm --filter app check` → ✅ **0 errors**, 38 warnings (sama seperti sebelum fix; tidak ada warning baru dari perubahan M1).
- **Cara aktifkan Turnstile produksi**: set `SOCIO_TURNSTILE_ENABLED=1` + `SOCIO_TURNSTILE_SITEKEY`/`SOCIO_TURNSTILE_SECRET` = key **production** (bukan test key). Tanpa itu, auth tetap jalan (gate skip).

### Design improvement
- Auth pages pakai `@socio/ui` (Button/Input/Sheet) — conform DESIGN.md §5. `svelte-check` tidak trip di auth page.

---

## 4. PHASE M1.5 — DESIGN PASS  (status: 🟡 70%)

### Yang SUDAH ✅
- `DESIGN.md` (contract lengkap: palette, typography, radius, motion, 8 anti-pattern).
- `packages/ui/src/tokens.css` (OKLCH indigo `#4f46e5` / cyan `#06b6d4`, status colors).
- `packages/ui` 31 komponen siap pakai.
- `MOBILE_UX_GUIDE.md` (screen spec per route).

### Gap 🟡 (DESIGN SYSTEM BELUM 100% KONSISTEN)
| # | Masalah | Bukti | Perbaikan |
|---|---|---|---|
| D1 | **Komponen ada tapi belum dipakai merata** — beberapa route masih pakai `<div>`/markup mentah而不是 `Card`/`StatCard`/`DataTable` dari `@socio/ui`. | 31 komponen di `packages/ui`, tapi beberapa `+page.svelte` (terutama admin) masih raw markup | Audit tiap route: ganti card mentah → `Card`, stat mentah → `StatCard`, tabel mentah → `DataTable`. |
| D2 | **38 warnings svelte-check** — mayoritas `a11y_label_has_associated_control` di `(app)/pesan` (textarea, QtyStepper), `(app)/saldo/top-up` (nominal, metode, bukti), + `state_referenced_locally` di `(app)/pesanan`. | output `pnpm --filter app check` | Pasang `for`/`id` atau `aria-label` di label; di pesanan pakai `$derived(data.orders)`. |
| D3 | **Dark mode belum ada** (G27) — design system punya token dark, tapi toggle tidak ada di app/akun. | `(app)/akun` ledger rows, tidak ada theme toggle | Tambah toggle light/dark (AGENTS.md §7 #6). |
| D4 | **Variance/anti-pattern belum diaudit visual** — AGENTS.md §7 mewajibkan audit 8 anti-pattern per route sebelum "done". | belum ada checklist per-route di REBUILD_PLAN §9 | Jalankan audit `looks-expensive` per route, catat di §9. |

---

## 5. PHASE M2 — USER APP CORE  (status: 🟢 85%)

### Route user ↔ old script
| Fitur lama (PHP) | Baru (SvelteKit) | Status |
|---|---|---|
| `auth/*` | `(auth)/*` | ✅ |
| `balance/*` (saldo/topup/riwayat) | `(app)/saldo/*` | ✅ |
| `order/*` (pesan) | `(app)/pesan` | ✅ |
| `order/*` (pesanan) | `(app)/pesanan` | ✅ (refill/refund 🟡) |
| `services.php` | `(app)/layanan` | ✅ |
| `affiliasi/*` | `(app)/affiliate` | ✅ user-side |
| `ticket/*` | `(app)/tiket` | ✅ |
| `notif/*` | `(app)/notif` + SSE | ✅ + SSE |
| `api/v1/*` | `api/v1/+server.ts` | ✅ |
| **CMS statis** (`faq.html`, `pages/*`) | — | ❌ **belum** `/faq`,`/terms`,`/privacy` |
| **Panel reseller/whitelabel** (`panel/*`) | — | ❌ (old `panel/` kosong juga) |
| **Ads module** (`ads/*`) | — | ❌ (old `ads/` ada theme HTML lengkap) |

### Gap 🟡
| # | Masalah | Perbaikan |
|---|---|---|
| M2-1 | **Refill/Refund user-side** — `(app)/pesanan` detail punya tombol Refill tapi flow backend (cron refill) belum ada (lihat M4). | Port `api/refill-edit.php` + `cron/status_refill.php`. |
| M2-2 | **CMS statis** — tidak ada route `/faq`,`/terms`,`/privacy` (LEGACY_GAP §4). Landing juga belum (M5). | Tambah di `app` (atau `landing`) — perlu keputusan domain. |
| M2-3 | **Ads / monetisasi** — modul iklan lama (`ads/`) belum. | Keputusan bisnis: perlu atau tidak. |
| M2-4 | **Saved links / coupons / loyalty** — `packages/core` sudah ada `applyCoupon`, tapi UI checkout belum pakai (G18/G19). | Hook coupon + loyalty ke `(app)/pesan`. |

### Design improvement
- Shell mobile (BottomNav + FAB + Sheet) ✅ di `(app)/+layout.svelte`.
- `SaldoHero` counter, `QuickGrid`, `StatusBadge` pulse ✅ sesuai MOBILE_UX_GUIDE.
- **Audit**: `(app)/pesan` & `(app)/saldo/top-up` punya a11y warning (D2) → fix label.

---

## 6. PHASE M3 — ADMIN + GAP FIX  (status: 🟡 55% — PALING BANYAK GAP)

### 6.1 Route admin ↔ old script
| Modul lama (PHP) | Baru | Status |
|---|---|---|
| `admin/index-edit.php` (dashboard) | `(admin)/admin` Command Center | ✅ |
| `admin/users/*` | `users` | ✅ |
| `admin/order/*` | `orders` | 🟡 list/filter/table; refill/refund ditunda |
| `admin/balance/*` (deposit) | `deposits` | ✅ |
| `admin/service/*` + `services/*` | `services` | ✅ (konsolidasi duplikat ✅) |
| `admin/provider/*` | `providers` | ✅ + sync trigger |
| `admin/setting/pricing.php` | `pricing` | ✅ + live preview (M3 #1) |
| `admin/ticket/*` | `tickets` | ✅ |
| `admin/audit/*` | `audit` | ✅ |
| `admin/reporting/*` | `reporting` | 🟡 ada, chart + realtime feed ditunda |
| `admin/setting/*` | `settings` | ✅ (maintenance toggle ✅) |
| **`admin/affiliate/index.php`** | `/admin/affiliate` | ❌ **BELUM** (file tidak ada — terverifikasi) |
| **`admin/banner/*` + `promotion-banner.php`** | — | ❌ **BELUM** |
| **`admin/news/*`** | — | ❌ **BELUM** |
| **`admin/marketing/*` (email)** | — | ❌ **BELUM** (UI; lib `email.ts` ✅) |
| **Refund/Refill UI** | — | ❌ **BELUM** (G2/G3) |
| **Broadcast notif** | — | ❌ **BELUM** (G13) |
| **Backup management UI** | — | ❌ **BELUM** (G9) |

### 6.2 Gap Kritis (uang/data) — ADMIN_GAP G1–G5
| # | Gap | Status sekarang | Perbaikan |
|---|---|---|---|
| **G1** Audit log | 🟡 **Partial** — table + `logAudit` di confirm/suspend/adjust, tapi **belum semua action** (create/edit/delete service, deposit reject, dll). | Hook `logAudit` di SETIAP admin action destruktif. |
| **G2** Refund workflow | ❌ Belum | Request → approve (admin lain) → execute. Auto <Rp50k, dual approval >Rp50k. |
| **G3** Balance adj dual-control | 🟡 Partial — audit + reason ada, **dual approval >Rp1jt belum**. | Tambah dual-approval. |
| **G4** Deposit verify bukti | 🟡 Partial — manual confirm works, **auto-match mutasi belum** (Tripay/CekMutasi dihapus). | Butuh Tripay webhook (M4) untuk auto-match. |
| **G5** Provider key encrypt | ✅ **SELESAI di kode** — `lib/server/crypto.ts` AES-256-GCM (`encryptSecret`/`decryptSecret`/`isEncrypted`). | ⚠️ **Verify**: dipakai saat save provider + `.env` `SOCIO_PROVIDER_ENC_KEY` diset; display mask di UI. |

### 6.3 Gap Penting (operasional) — G6–G20
| # | Gap | Status | Perbaikan |
|---|---|---|---|
| **G6** RBAC | 🔴 **Partial berbahaya** — `admin_roles` table ada, tapi `(admin)/+layout.svelte` **TIDAK ada gating role** (semua admin akses penuh). | Enforce permission per route di layout/guard. |
| **G7** 2FA admin | ❌ Belum | TOTP + Passkey wajib admin. |
| **G8** Maintenance mode | ✅ Live (setting + hook) | — |
| **G9** Backup UI | ❌ Belum | On-demand dump → R2, list, restore. |
| **G10** Queue/cron monitoring | 🟡 Partial — `provider_sync_log` ada, **UI dashboard belum penuh**. | Widget queue depth + last run + error rate. |
| **G11** Provider fallback | ❌ Belum — cuma SMMturk (verify row id=8 seed). | Multi-provider primary+fallback per service. |
| **G12** Order manual | ❌ Belum | Admin create order manual (status manual). |
| **G13** Broadcast notif | ❌ Belum | Broadcast in-app + Web Push ke segment. |
| **G14** Export PDF | ❌ Belum (CSV aja) | svelte-pdf + invoice. |
| **G15** Service category custom | ❌ Belum | CRUD kategori + featured + urutan. |
| **G16** Service mapping multi-provider | ❌ Belum | Tabel `service_mapping`. |
| **G17** Newsletter analytics | ❌ Belum | Open/click/unsubscribe rate. |
| **G18** Coupon/voucher | ❌ Belum (core `applyCoupon` ada) | CRUD coupon + apply checkout. |
| **G19** Loyalty point/tier | ❌ Belum | Poin per order + tier. |
| **G20** API usage monitoring | ❌ Belum | Dashboard API per user. |

### 6.4 Gap UX/tech — G24–G30
| # | Gap | Status | Perbaikan |
|---|---|---|---|
| **G24** Card-list mobile admin | ❌ Belum — pakai `DataTable` (desktop). | Card-list mobile + table desktop. |
| **G25** Server-side search/filter | 🟡 Partial — search ada, filter belum lengkap. | Drizzle server-side filter + sort. |
| **G26** Realtime activity feed (SSE) | 🟡 Partial — `/api/sse` + `(app)/api/sse` ada, tapi feed di dashboard admin belum jelas terhubung. | Hubungkan SSE → widget activity di `/admin`. |
| **G27** Dark mode admin | ❌ Belum | Shared token + toggle. |
| **G28** Recent action widget | ❌ Belum | Dari `audit_log`. |
| **G29** Bulk action | 🟡 Partial (CSV export aja) | Bulk hapus/suspend/adjust/email. |
| **G30** Confirm dialog destruktif | ✅ Ada (`ConfirmDialog` component) | — |

### 6.5 Design improvement (Admin)
- `(admin)/+layout.svelte`: floating dock mobile + sidebar desktop ✅ (sesuai ADMIN_DESIGN_PLAN).
- **Audit**: beberapa page admin masih raw `<table>` bukan `DataTable` dari `@socio/ui` (D1). Stat cards belum pakai `StatCard`.
- Command Center (`/admin`): StatCard 2×2 + activity feed + queue health (ADMIN_DESIGN_PLAN §2.A) — **verify implementasi** (G10/G26/G28).

---

## 7. PHASE M4 — CRON & WEBHOOKS (SMMturk)  (status: 🟡 60% — ADA BLOKKER)

### Cron baru (`app/src/cron/`) ↔ lama (`app.socio.id/cron/`)
| Cron lama (PHP) | Baru | Status |
|---|---|---|
| `provider-sync.php` | `provider-sync.ts` + `runAllProviderSync` | ✅ (loop semua provider aktif) |
| `status.php` / `status_irvan.php` | `status-polling.ts` | ✅ stratified polling |
| `update_depo.php` / `cron-runner.sh` | `light.ts` (deposit-expire + seed) | ✅ |
| **`refund.php`** | — | ❌ **BELUM** (G2/G3) |
| **`status_refill.php`** | — | ❌ **BELUM** (refill cron) |
| **`send-email-queue.php`** | — | ❌ ditunda M6 |
| **`email-bounce.php`** | — | ❌ ditunda M6 |
| **`send-marketing-emails.php`** | — | ❌ (butuh `/admin/email`) |

### Webhook baru ↔ lama
| Webhook lama | Baru | Status |
|---|---|---|
| `api/webhook/midtrans` | `api/webhook/midtrans/+server.ts` | ✅ |
| **`tripay/callback.php`** | — | ❌ **BLOKKER** — top-up Tripay gak auto-confirm (LEGACY_GAP §1) |
| **`cekmutasi/callback.php` + `cron.php`** | — | ❌ auto-mutasi bank belum (G4) |
| **`jasamutasi/*`** | — | ❌ ditunda |

### Gap 🔴
| # | Masalah | Dampak | Perbaikan |
|---|---|---|---|
| M4-1 | **Tripay webhook tidak ada** | Deposit via Tripay stuck pending → rugi/投诉. | Port `tripay/callback.php` → `api/webhook/tripay`. **PRIORITAS 1.** |
| M4-2 | **Refill cron tidak ada** | Refill order gak pernah diproses. | Port `cron/status_refill.php`. |
| M4-3 | **Refund cron/flow tidak ada** | Refund manual gak ada (G2). | Buat flow + cron. |
| M4-4 | **Email queue/bounce ditunda M6** | Email marketing gak jalan. | M6. |
| M4-5 | **SMMturk live sync belum terverifikasi** | `cron/index.ts` loop aktif, tapi row SMMturk (id=8) perlu di-seed + test koneksi. | Insert provider row + `testConnection` + manual trigger via `/api/cron/trigger`. |

---

## 8. PHASE M5 — LANDING socio.id  (status: 🟡 40%)

### Yang SUDAH ✅
- `landing/src/pages/index.astro` + komponen: Navbar, StickyCTA, FloatingWhatsApp, OrderSimulator, TrustBadges, PainPoints, Features, HowItWorks, SocialProof, PricingInteractive, FinalCTA, Faq.
- Build Astro ✅ → Cloudflare Pages.
- Design token `@socio/ui` ✅.

### Gap 🟡 (LEGACY_GAP §5)
| # | Fitur lama (WordPress) | Status | Perbaikan |
|---|---|---|---|
| M5-1 | **FAQ page** (`faq.html`) | ❌ cuma accordion di homepage | Route `/faq` terpisah. |
| M5-2 | **Blog / News** (WP `wp-content`) | ❌ belum | `blog/[slug]` + MDX (SEO). |
| M5-3 | **TOS / Privacy** | ❌ belum | `/terms`, `/privacy`. |
| M5-4 | **SEO verify files** (`ads.txt`, `BingSiteAuth.xml`, `google*.html`, `health.html`) | ❌ belum | Taruh di `landing/public/`. |
| M5-5 | **Pricing page** terpisah | 🟡 ada di homepage (`PricingInteractive`) | Bisa dipecah route `/pricing` (HTML table, bukan 3-tier card — anti-pattern #4). |

### Design improvement
- Landing sudah conform desain (OrderSimulator CSS mockup, bukan gradient blob ✅).
- **Audit**: Pastikan PricingInteractive pakai **HTML table** bukan 3 card (anti-pattern #4), dan ≤5 `<li>` per section.

---

## 9. PHASE M6 — EMAIL + POLISH  (status: 🟡 30%)

### Yang SUDAH ✅
- `lib/server/email.ts` (Resend) + `lib/server/notification.ts` (user+admin notif).
- Web Push subscribe/notify ✅.

### Gap 🟡
| # | Masalah | Perbaikan |
|---|---|---|
| M6-1 | **UI Email Marketing belum** (`/admin/email`) — campaign/template/analytics. | Port `admin/marketing/*` (LEGACY_GAP §3). |
| M6-2 | **Dark mode** belum (D3/G27). | Toggle app + admin. |
| M6-3 | **Export PDF** belum (G14). | svelte-pdf. |
| M6-4 | **Newsletter analytics** belum (G17). | Open/click rate. |
| M6-5 | **Email queue/bounce cron** ditunda (M4-4). | M6. |

---

## 10. PHASE M7 — CUTOVER  (status: ⚪ 0%)

- Parallel run 1 minggu (old PHP + new) → sunset VPS lama.
- **Pre-cutover MUST**: M4-1 (Tripay), M3 affiliate/banner/news/email, RBAC (G6), 2FA (G7).
- Hapus folder lama (`app.socio.id/`, `socio.id/`) — **jangan sebelum M7** (AGENTS.md #8).

---

## 11. KONSOLIDASI: OLD PHP SCRIPT → NEW ROUTE (MASTER GAP TABLE)

| Script lama | Path lama | Baru | Status |
|---|---|---|---|
| Auth | `auth/*` | `(auth)/*` | ✅ |
| User app shell | `home/*` | `(app)/*` | ✅ |
| Saldo/Topup | `balance/*` | `(app)/saldo/*` | ✅ |
| Pesan order | `order/*` | `(app)/pesan` | ✅ |
| Pesanan | `order/*` | `(app)/pesanan` | ✅ (refill/refund 🟡) |
| Layanan | `services.php` | `(app)/layanan` | ✅ |
| Affiliate (user) | `affiliasi/*` | `(app)/affiliate` | ✅ |
| Tiket | `ticket/*` | `(app)/tiket` | ✅ |
| Notif | `notif/*` | `(app)/notif` + SSE | ✅ |
| API v1 | `api/*` | `api/v1` | ✅ |
| Admin dashboard | `admin/index-edit.php` | `(admin)/admin` | ✅ |
| Admin users | `admin/users/*` | `users` | ✅ |
| Admin orders | `admin/order/*` | `orders` | 🟡 |
| Admin deposits | `admin/balance/*` | `deposits` | ✅ |
| Admin services | `admin/service`+`services` | `services` | ✅ |
| Admin providers | `admin/provider/*` | `providers` | ✅ |
| Admin pricing | `admin/setting/pricing.php` | `pricing` | ✅ |
| Admin tickets | `admin/ticket`+`tickets` | `tickets` | ✅ |
| Admin audit | `admin/audit/*` | `audit` | ✅ |
| Admin reporting | `admin/reporting/*` | `reporting` | 🟡 |
| Admin settings | `admin/setting/*` | `settings` | ✅ |
| **Admin affiliate** | `admin/affiliate/index.php` | `/admin/affiliate` | ❌ |
| **Admin banner** | `admin/banner/*` | — | ❌ |
| **Admin news** | `admin/news/*` | — | ❌ |
| **Admin email mkt** | `admin/marketing/*` | `/admin/email` | ❌ |
| **Refund UI** | `api/refill-edit.php`, `cron/refund.php` | — | ❌ |
| **Refill cron** | `cron/status_refill.php` | — | ❌ |
| **Tripay webhook** | `tripay/callback.php` | `api/webhook/tripay` | ❌ **BLOKKER** |
| **CekMutasi** | `cekmutasi/*` | — | ❌ |
| **Jasamutasi** | `jasamutasi/*` | — | ❌ |
| **CMS statis** | `faq.html`, `pages/*`, `tos.html` | `/faq`,`/terms`,`/privacy` | ❌ |
| **Ads module** | `ads/*` | — | ❌ |
| **Panel/whitelabel** | `panel/*` (kosong) | — | ❌ |
| **Landing FAQ/Blog/TOS** | WP `socio.id/` | `landing/src/pages/*` | 🟡 index aja |
| **SEO verify files** | `ads.txt`, `google*.html` | `landing/public/` | ❌ |

---

## 12. DESIGN IMPROVEMENT GAP (ringkas, per anti-pattern)

| Anti-pattern (DESIGN.md §5) | Status | Aksi |
|---|---|---|
| #1 Bullet spam (≤5 `<li>`) | 🟡 audit per route | Hitung `<li>` tiap page |
| #2 Eyebrow pill (≤1) | 🟡 | grep pill class |
| #3 Card chrome (≤2 default) | 🔴 D1 — banyak raw card | Pakai `Card`/`StatCard`/`DataTable` |
| #4 3-tier pricing card | 🟡 verify landing PricingInteractive | Pakai HTML table |
| #5 4-col stat strip | 🟡 verify admin StatCard | Inline-stat narrative |
| #6 Real imagery | ✅ QR/avatar real `<img>` | — |
| #7 Identical containers (≥3 pola) | 🟡 audit | Variance per screen |
| #8 Inter default | ✅ Jakarta/Sora | — |
| **A11y label** | 🔴 38 warnings (D2) | Pasang `for`/`aria-label` |
| **Dark mode** | ❌ D3/G27 | Toggle |
| **Design-system consistency** | 🔴 D1 | Audit pemakaian `@socio/ui` per route |

---

## 13. PRIORITAS EKSEKUSI (BLOKKER → NICE-TO-HAVE)

1. 🔴 **M4-1 Tripay webhook** — deposit gak auto-confirm = rugi. (BLOKKER bisnis)
2. 🔴 **M3 `/admin/affiliate`** — transparansi komisi (LEGACY_GAP #3).
3. 🔴 **M3 RBAC enforcement (G6)** — semua admin akses penuh = risiko.
4. 🔴 **M3 refund/refill flow (G2/G3)** — uang.
5. 🟡 **M3 `/admin/banner` + `/admin/news`** — konten marketing.
6. 🟡 **M3 `/admin/email` marketing UI** — retention.
7. 🟡 **M5 FAQ/TOS/Privacy + SEO files** — landing SEO.
8. 🟡 **M1-1 stabilkan auth cookie** — risiko prod.
9. 🟡 **M4 refill/refund cron + CekMutasi** — operasional.
10. 🟢 **D1/D2/D3 design-system + a11y + dark mode** — polish.
11. ⚪ **M7 cutover** — setelah 1–9 beres.

---

## 14. CARA REPRODUCE BUILD LOKAL (untuk verifikasi)

```bash
cd /Users/maabook/Desktop/socio.id
pnpm install                      # jika node_modules belum ada
pnpm --filter app build          # → adapter-node, ~10s
pnpm --filter landing build      # → Cloudflare Pages, ~3s
pnpm --filter app check          # → svelte-check (0 errors / 38 warnings)
pnpm --filter app dev            # → dev server (butuh .env DB + provider key)
```

**Catatan:** Build tidak butuh DB. Dev/runtime butuh `.env` (`DATABASE_URL`, `SOCIO_SMMTURK_KEY`, `SOCIO_AUTH_SECRET`, `SOCIO_PROVIDER_ENC_KEY`, Resend, R2). Folder lama `app.socio.id/` **jangan di-edit/deploy** (AGENTS.md #6/#8).

---

## 15. KESIMPULAN

Rebuild **sudah bisa di-build lokal dengan sehat** (app + landing hijau, 0 type error). Yang masih jadi gap utama bukan kompilasi, tapi:

1. **Porting fitur PHP yang belum**: Tripay webhook (BLOKKER), admin affiliate/banner/news/email, refund/refill, CMS statis, ads/panel.
2. **Enforcement & advanced admin**: RBAC (G6), 2FA (G7), audit log di semua action (G1), SSE feed (G26), dark mode (G27), card-list mobile (G24).
3. **Design consistency**: 31 komponen `@socio/ui` sudah ada tapi belum 100% dipakai; 38 a11y warning belum dibersihkan; audit 8 anti-pattern belum per-route.

Eksekusi per phase di atas (M4-1 → M3 → M5 → M1-1 → M6 → M7) akan menutup gap secara berurutan tanpa halu.
