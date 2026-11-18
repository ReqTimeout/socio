# Jurnal — Batch email P2.5–P2.8 + P3 kosmetik (18 Nov 2026)

> Status: **SELESAI — LIVE** image `54c8615302b5be19590f81daf6f651bea4899b69`.
> GO owner: "ya kerjakan ini cepat jangan ada salah" — scope: P2.6 operator-only →
> P2 email batch (quota/WP7/WP6) → P3 kosmetik + commit `style:` terpisah untuk
> drift prettier bawaan. L3 pre-push: AskUserQuestion → "Run L3 deep security review".
> Tracker: `docs/2026-11-17-my-to-id-gap-plan.md` — baris P2.5–P2.8 + P3.1–P3.4
> ditandai SELESAI, §7 butir 2/3/5 dijawab GO.

## 1. Latar belakang + scope

- Lanjutan gap-plan `.my → .id` setelah P1 (uang, live `23ef2b3`) + F1 (live `37bb77a`).
- Batch ini: **P2.6** operator-only alert, **P2.5** quota email, **P2.7** WP7
  deposit-aware + 2 lane baru, **P2.8** WP6 nudge/welcome/mid-life/bonus-rate,
  **P3.1–P3.4** kosmetik (CouponTicket, SaldoHero gold, ResellerArt, daftar ?mode).
- **Nol DB write** (tanpa migration, tanpa DDL) → rollback = revert + redeploy.
- Port per-fitur dari orphan fork `.my` (`git show <commit> -- <file>`), adaptasi
  IDR integer / BCA manual + kode unik 3 digit / Indonesia inline (tanpa i18n) /
  route `.id` (`/pesan`, `/saldo/top-up`, `/daftar`, `/reseller`).
- Guardrail `copy.ts`: DILARANG tambah/hapus/rename key → copy komponen baru
  (FirstDepositNudge, CouponTicket) ditulis inline di komponennya.

## 2. P2 — email

### P2.6 operator-only notifyAdmins (`email-templates.ts`)
- Sebelum: `eq(users.level,"Admin")` → email alert ke **semua** akun Admin (2 akun).
- Sesudah: daftar operator via env `SOCIO_ADMIN_ALERT_EMAILS` (default
  `aramadhi92@gmail.com`, bisa list dipisah koma). Bell `admin_notifications`
  **tetap** ke semua akun Admin; tanpa demote akun admin. Keputusan owner §7.2.

### P2.5 quota (`app/src/lib/server/email/quota.ts`, pure, baru)
- Cap default `.my`: provider 95/hari + 3000/bulan; marketing 35/hari, guard 10;
  `WINBACK_MIN_HEADROOM` 15, `ADMIN_ALERT_RESERVE` 5. Semua env-overridable
  (`envPositiveInt`: sampah → default). `computeLaneBudgets` protected-first;
  `monthlyPaceGuardActive` (tanggal ≥27 && terkirim ≥90% cap bulanan).
- Integrasi: `email-lifecycle` (budget lane), `email-queue` (cap provider),
  admin-email (reserve 5 supaya alert tidak pernah kehabisan kuota marketing).

### P2.7 WP7 (`marketing/segments.ts` + `marketing/templates.ts`)
- Activation **deposit-aware**: saldo 0 → CTA top-up + bonus; saldo >0 → CTA pesan.
- Lane baru `deposit_canceled` + `reseller_unpaid` (cohort prod 241 user nyata).
  **OFF per-lane**: env `EMAIL_LANE_RESELLER_UNPAID` / `EMAIL_LANE_DEPOSIT_CANCELED`
  belum di-set di prod; lane bawaan `activation` tetap ON (keputusan owner 6 Nov).
  Aktivasi lane baru = GO owner terpisah (§7.3).
- Urutan lifecycle: reseller_unpaid → activation → balance_low → deposit_canceled
  → winback_30/60/90; `laneOf`: reseller_unpaid→activation, deposit_canceled→winback.
- Template inline Indonesia: `balanceRp` (bukan sen), kode unik 3 digit, BCA,
  nominal bersih reseller (env `SOCIO_RESELLER_ACTIVATION_AMOUNT`/`SOCIO_RESELLER_BONUS`).

### P2.8 WP6 (`first-deposit.ts` baru + `FirstDepositNudge.svelte` baru + lainnya)
- `getFirstDepositNudge`: stage new|pending (Pending expire>NOW() ORDER BY id DESC
  LIMIT 1, amount=postAmount??amount, query gagal → stage new). Nudge dashboard:
  sticker, dismiss, fd-pop one-shot/fd-bob infinite, reduced-motion.
- `getDepositBonusRate()` single source di `lib/format.ts` (env `SOCIO_DEPOSIT_BONUS`
  default 0.10, clamp 0..1, invalid→0) — menggantikan parse env lokal top-up.
- Welcome rewrite 3 langkah (top-up BCA pas + kode unik → verifikasi admin → order),
  dikirim **setelah verifikasi email** (signup.ts), idempoten via `email_queue`
  (recipientId + templateName='welcome').
- `light.ts` mid-life reminder (2h,12h] LIMIT 100 tone mid, `reminder_stage=1`
  meski tanpa email; `leftLabel(expire)`.
- SKIP `ExactAmount.svelte` + copy TnG/sen (`.id` sudah punya kode unik 3 digit;
  manual-confirm BCA dipertahankan).

## 3. P3 — kosmetik

- **P3.1 CouponTicket** (333 baris, `app/src/lib/components/`): strip kupon PUBLIK
  di bawah SaldoHero — stub mango, perforasi, salin kode, kedaluwarsa live. Loader
  dashboard menyaring `coupons` aktif + kuota tersisa + belum tamat. Tanpa bagian
  personal/H3 (`user_coupons` absent di `.id`).
- **P3.2 SaldoHero** (`packages/ui/src/components/`): sparkline emas
  `var(--sparko-mango)` (fill + glow + shine sweep + float), radar ping CTA Top up
  (`cta-ping`) + ikon plus nudge, dots dua-tone drift halus — semua reduced-motion guard.
- **P3.3 ResellerArt** (`packages/ui/src/art/`, export baru `./art/*`): line-art
  margin/untung port `.my` (art-bob/pulse/dash/spark, reduced-motion off).
  `hot-crown` utility baru di `primitives.css` (+ entri reduced-motion). Enrichment
  `/reseller`: ambient blob, hot-crown, Sparko float-slow 64, reveal stagger semua
  seksi (`revealDelay`), card-lift di inner div, ResellerArt 84 di seksi biaya,
  FAQ hover. Semua logika/copy `.id` dipertahankan (doUpgrade, CTA 3-state, chart jujur).
- **P3.4 daftar ?mode** (`(auth)/daftar/`): `?mode=reseller` → `initialMode`
  (konservatif: hanya "reseller" dikenali, trim+toLowerCase); redirect bersih
  referral menjaga mode. Warning `state_referenced_locally` disengaja (capture
  nilai awal, tidak reset saat invalidateAll — parity `.my`).

## 4. Test (packages/core/test)

- `email-quota.test.ts` (baru, 5 blok): port faithful — default cap, budget lane
  normal/guard, protected-first, pace guard, override env (100/abc/-5/2000/40).
- `email-activation-lanes.test.ts` (baru, 7 blok): **ditulis ulang** untuk kontrak
  `.id` (bukan port mentah) — `balanceRp`, text version minimal → assertion di html,
  footer "Berhenti berlangganan", 7 trigger, route `.id`, escaping nama hostile,
  bukti env nominal bersih reseller 30.000→35.000.
- `email-resolve-hooks.mjs`: + mapping `$lib/*` → `app/src/lib/*` (rantai
  templates→signup→`$lib/format`); `@socio/db` tetap lazy Proxy (import-safe offline).
- Hasil: guard 28 + quota 5 + lanes 7 lulus; rantai test core lama (money invariant
  dll) tetap lulus.

## 5. Gates (semua lulus sebelum commit fitur)

- svelte-check **0 error** / 55 warning baseline (+1 `state_referenced_locally`
  daftar disengaja; warning `.shimmer` SaldoHero = dead CSS pre-existing di HEAD).
  3× diagnostik IDE stale (pola `$props<{data: typeof data}>` pre-existing) —
  diselesaikan dengan `svelte-kit sync` + fresh check, bukan "fix" pola lama.
- Build sukses; scan CJK/Malay 36 file batch bersih (3 false-positive sah).
- L3 qodersec pre-push: **0 findings**.
- Prettier: 15 file batch app + 2 `.svelte` ui diformat via config app (ui tanpa
  plugin svelte). Commit style terpisah `54c8615` (50 file drift bawaan, format-only
  terverifikasi). **Temuan**: prettier 3.9.5 tidak idempoten untuk member-chain +
  `as any` (pass 1 memecah, pass 2 menyambung) → 2 file (fx.ts, deposits/verify)
  masih di-flag `--check`; fix pass kedua di commit `6f7544e` → `prettier --check`
  seluruh app hijau.
- eslint: **32 error / 1005 warning pre-existing** (no-empty, unused-vars,
  no-explicit-any; terverifikasi ada di `db01939`, termasuk `emailQueue` unused +
  `catch {}` di 2 file batch yang bergeser baris). Batch menambah **0 error baru**;
  perbaikan baseline eslint di luar scope (menyentuh jalur uang, butuh GO terpisah).
- Re-gate pasca `6f7544e`: svelte-check 0 error/55 warning, build sukses.

## 6. Commit, push, deploy, verifikasi

| Commit | Isi | File |
|---|---|---|
| `4259482` | feat(M3) P2 email batch (quota/operator/WP7/WP6 + test) | 25 |
| `e322797` | feat(M3) P3 kosmetik (kupon/SaldoHero/ResellerArt/daftar ?mode) | 11 |
| `54c8615` | style: prettier drift bawaan app (format-only) | 50 |
| `6f7544e` | style: konvergensi prettier pass-2 (format-only) | 2 |

- Urutan granular by-dependency: A (P2) build standalone; B (P3) wiring dashboard
  bergantung A; style ketiga. Union A+B = 36 file batch persis.
- Push FF `db01939..54c8615` → main (SSH). Deploy Coolify
  `gvfh3trw4pfce0dqfs3ya4mb` **finished 10:02:55**; container
  `nqsjafrei6k8dkup1pxkcuwf-20261118T095755`, **IMAGE tag = SHA push** (`54c8615…`),
  STARTED 10:01:50Z.
- Verifikasi prod (read-only, `verify-p2p3.sh`):
  - Marker server: "top up dalam 3 langkah" (chunk email.js), "reseller_unpaid"
    (chunk cron-runs.js) ✓.
  - Marker client: "Kupon aktif" (nodes 15/33), "Satu top-up lagi" (node 33+chunk),
    "cta-ping" (node 42+css), "hot-crown" (assets css) ✓.
  - Boot: 12 cron terdaftar (email-queue/email-lifecycle/light ikut), listening,
    **ALTER_COUNT=0**, status-poll jalan (4 order).
  - Route unauth: `/`, `/reseller`, `/saldo/top-up`, `/pesan` → 303
    `/login?redirect=…`; `/admin/email` → 303 `/login`; **`/daftar?mode=reseller` → 200** ✓.
  - Processlist: aktif=1, lebih_5s=0 (bersih).
  - 404 `/cekmutasi/cron.php` + `/cron/status.php` di log = probe cron PHP lama
    dari luar (noise pre-existing, bukan dari batch ini).
- Push docs + `6f7544e` (format-only) **tanpa redeploy**: runtime identik dengan
  image `54c8615` (preseden docs P10: HEAD `594d7eb` vs image `dd507e4`).

## 7. Keputusan aman + sisa

- Lane baru **OFF per-lane** menunggu GO aktivasi owner (cohort 241 nyata — jangan
  aktifkan tanpa keputusan); cap quota env-overridable tanpa rebuild.
- Operator-only default `aramadhi92@gmail.com`; bell tetap semua admin.
- Welcome idempoten (email_queue) — verifikasi ulang tidak mengirim ganda.
- Nol DB write → rollback = revert + redeploy, tanpa migration balik.
- Sisa gap-plan: **P2.1–P2.4** (defensif admin; P2.4 MOOT routing=0), **P4**
  (dormant, butuh setup eksternal). Tracker lama: E8/H2/H3 masih CONFIRM.
- Baseline eslint 32 error pre-existing = kandidat cleanup terpisah (butuh GO).