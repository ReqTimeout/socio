# SESSION HANDOVER — 77 Hari Terakhir (2026-07-16 → 2026-09-16) + Pindah PC

> Dibuat: 2026-09-27 (UTC) di PC lama sebelum pindah ke PC lain.
> Tujuan: agent di PC baru langsung nyambung tanpa baca 252 commit satu per satu.
> Urutan baca di PC baru: `AGENTS.md` → `REBUILD_PLAN.md §9` → `docs/AGENT_MEMORY.md` → file ini → `docs/AGENT_HANDOVER.md`.

---

## 0. TL;DR untuk agent baru

- Repo: `/Users/maabook/Desktop/socio.id` (ganti path sesuai PC baru), branch `main` @ `85f1935`.
- **252 commit dalam 77 hari terakhir.** Head: `85f1935 feat(brand): hero dot-grid sky ganti OrbField gradient-blob` (2026-09-16).
- Status git saat handover ditulis: **working tree bersih kecuali `sparko/` untracked (4 file)** → sudah di-commit bareng file ini.
- Relasi remote: `main` **ahead 170 vs `vps/main`** (belum push ke VPS remote — sengaja, deploy via `origin/main` + Coolify).
- Verifikasi pre-commit (2026-09-27): `pnpm --filter app check` = **0 errors, 49 warnings** (pre-existing CSS unused) • `pnpm --filter landing check` = **0 errors**.
- Milestone: **M0, M1, M1.5, M2, M3 (sebagian besar), M4 SELESAI & LIVE. M5 landing V2 playful + app playful F0–F8 + Sparko S1–S5/R1–R6/G1–G3 SELESAI di local.** Sisa: M6 polish + M7 monitoring.
- Infra live (jangan diubah): App `https://app.socio.id` (Coolify adapter-node), Landing `https://socio.id` (Pages), DB **MySQL VPS** (`socio_smm`, container `rebicrj57r3afbg9knieq9ks`) — **TiDB dibatalkan user**.

## 1. Cara lanjut di PC baru (copy-paste)

```bash
# 1. Clone / pull
git clone https://github.com/ReqTimeout/socio.git socio.id
cd socio.id
git checkout main
git pull --rebase origin main   # WAJIB rebase dulu (multi-sesi paralel, jangan force-push)

# 2. Install (lockfile kadang drift → pakai flag ini bila frozen-lockfile error)
pnpm install --no-frozen-lockfile

# 3. Env (JANGAN commit .env — sudah gitignored)
cp .env.example .env
# isi: SOCIO_DB_URL, SOCIO_AUTH_SECRET, SOCIO_SMMTURK_KEY,
# SOCIO_PROVIDER_ENC_KEY, SOCIO_DKIM_PRIVATE_KEY, R2_*, VAPID_*, SMTP_*

# 4. Verifikasi (wajib 0 error sebelum kerja)
pnpm --filter app check
pnpm --filter landing check

# 5. Dev
pnpm --filter app dev        # app.socio.id lokal
pnpm --filter landing dev    # socio.id lokal
```

Deploy tetap ikut `docs/AGENT_MEMORY.md §2` (pull-rebase → check+build → commit `--no-verify` → push `origin main` → trigger Coolify via API → tunggu `finished` → verifikasi session injeksi → cleanup). **Jangan deploy dari PC baru sebelum `check` 0 error.**

## 2. Apa yang dikerjakan 77 hari terakhir (ringkas per fase)

### 2.1 16–22 Jul 2026 — M0/M1/M1.5/M2/M4 fondasi (awal rebuild)
- M0: monorepo `landing/ + app/ + packages/{db,ui,core}`, Drizzle MySQL, bcrypt `$2y$` verified, skeleton live di Coolify + Pages.
- M1: better-auth + Turnstile env-gated + zxcvbn + disposable block + rate-limit DB + rehash-on-login.
- M1.5 Design Pass DONE: `DESIGN.md`, `docs/DESIGN_BRIEF.md`, `docs/MOBILE_UX_GUIDE.md`, `packages/ui` (Button/Card/StatusBadge/BottomNav/Sheet/dll), token OKLCH + Plus Jakarta Sans (bukan Inter).
- M2 user app 8 route DONE: dashboard, layanan, pesan, pesanan (sheet+swipe+SSE), saldo/top-up + riwayat, affiliate (QR), tiket, akun, PWA.
- M4 cron & webhook DONE & LIVE: `provider-sync` (8153 layanan), `status-poll` stratified tiap menit, `light` expire, Tripay/Midtrans callback (gated).

### 2.2 22–31 Agu 2026 — M3 admin + email + deposit hardening
- Admin: layout+guard, users (suspend/adjust/audit+ConfirmDialog), services/kategori, provider library + **AES-256-GCM encrypt key (G5)**, pricing rules, deposits confirm/reject, orders, tickets, affiliate approval queue, **Banner CMS, News CRUD, Email marketing campaign**, reporting chart+CSV.
- Email pindah Resend → **self-hosted SMTP docker-mailserver v14**; `email_queue` async + retry; template `deposit-emails.ts` + `wrapEmail`.
- Deposit: **manual BCA only** (Tripay/Jasamutasi dihapus), bonus 10% (`SOCIO_DEPOSIT_BONUS`), suffix unik HMAC, max 2 pending, reseller Rp50k = fee aktivasi (saldo awal Rp20k, bukan kredit 50k).
- Security: RBAC matrix (`packages/core/src/rbac.ts` + `ROUTE_PERMISSION`), 2FA TOTP wajib admin + audit, `assertAdmin` + rate + `logAudit`.

### 2.3 2–9 Sep 2026 — Cron 8 job, health, email deliverability, P1–P3 fixes
- `/admin/cron` (8 job live + tombol Jalankan + `cron_runs` logging + registry `jobs.ts`): provider-sync, service-catalog (chained), status-poll, refill-poll, auto-refund, email-queue, light, backup 03:00.
- `/admin/health` (cron/queue/provider/DB 4 widget + `/api/admin/health` + auto-refresh) + SSE `/api/admin/events` + EventSource LIVE badge.
- Backup: mysql2 dump + gzip + keep 10 + `backup_logs` (handle MySQL zero-date).
- Broadcast 6 segmen + rate 5/mnt; export PDF pdfmake (allow font name-refs); refund dual-approval (<50rb auto, ≥50rb second admin); order manual (`is_manual`).
- **Email deliverability audit:** From double-wrap fix (`buildFrom`), DKIM sign di app (selector `mail`), DMARC `p=reject`, Gmail 421-4.7.28 = rate-limit (jangan blast >100/jam), guard (transaksional dulu, marketing max 10/run, Gmail max 5/run), import XLS `mailing_list` + audience `xls_list`, admin alerts backup in-app `admin_notifications`.
- **Bug kritis fixed:** Drizzle `sql IN (${join})` hanya match ID pertama → wajib `inArray()` (popular/refillMap/massCancel); FX ikut di-hash diff (kurs berubah = semua modal tulis ulang); `seedSmmturkProvider` match by `apiUrlOrder` bukan name (cegah duplikat tiap jam pasca-whitelabel); group `(admin)` tidak tambah segmen URL; `load()` harus serializable (jangan spread fungsi); Coolify double-serialized env fix via tinker + redeploy.
- **Kurs USD→IDR terpusat** (`lib/server/fx.ts` + `fx_rates`): `max(live harian, floor 20000)` via `getUsdToIdr()`; floor via `/admin/pricing`.
- Mobile audit 46/46 hijau (admin) + 22/22 hijau (user); skill `pw-vision` jadi default audit visual.

### 2.4 10–11 Sep 2026 — P5/M5: pesan, tiket, saldo, landing live-sync
- Pesan: layanan multiline + nama penuh, wrap anti-kepotong, skeleton navigasi, popular join katalog dulu (legacy ID beda namespace).
- Saldo trio + QR BCA lokal, numeric keyboard, deposit email instruksi/reminder/sukses/batal + tab Transaksional.
- Landing M5: `prices.json` live sync + angka dinamis (hapus hardcode 8.270), `PricingTable + OrderSimulator` live, 882 kategori dinamis, dock grid horizontal + WA di atas dock, copy simulator jujur + board mobile + ticker.
- Aturan multi-sesi `pull --rebase` ditulis (push tanpa fetch = rejected).

### 2.5 12–13 Sep 2026 — Landing V2 playful + deploy Pages
- V2-1: accent-2 + hero mesh 5 nodes (CSS 0kb, drift 26s, grain, reduced-motion).
- V2-2: svelte-motion stagger 60ms + whileHover + reduced-motion gate.
- V2-3/4b/4c: blob parallax + dotGrid + OrderBoard stagger 35ms + TestiLedger stagger 80ms + live-dot pulse.
- C1: clone haloka Features → KapabilitasBento (re-skin Socio, no hijau).
- F0–F6 app playful polish + brand assets; H1 dipadatkan + kata berputar CSS-only (CLS 0); WA → 081221272016 (5 titik); magnetic CTA + mockup tilt; StickyCTA dihapus (dobel dock); dock sticker; favicon/logo/og-image playful; deploy Pages `afa522d8 / 8da4bda1 / 25afc65f` live OK.
- **Blocker dicatat (belum selesai):** testimoni placeholder → ganti data asli owner; foto asli reseller/UMKM (masih inisial); staging preview → verifikasi user dulu.

### 2.6 16 Sep 2026 — App playful F1–F8 + Sparko V3 + brand (HEAD)
- F1 foundation (copy+token+komponen), F2–F3 shell M12 + dashboard playful, F4–F5 order loop + saldo trio + gate confetti, F6–F7 sisa route + auth ringan + audit, F7 fix `min-w-0` + truncate chain (overflow desktop), F8 dock sticker-chrome + shine tombol order.
- S1–S3: Sparko + token + dashboard alive + order motion; S3–S5: sidebar ink + Sparko states + BackButton rollout; R1–R6 reskin dashboard ala `sparko-preview`; G1–G3 brand-guidelines compliance dashboard; hero dot-grid sky → OrbField gradient-blob (HEAD `85f1935`).
- `sparko/` (4 file, di-commit sesi ini): `DESIGN_SYSTEM_BRAND_GUIDELINES.md`, `SPARKO_README.md` (maskot petir 6 pose, neutral gender), `Sparko.svelte` (pure SVG ~1.6KB, ingat: port ke `packages/ui` wajib konversi ke runes `$props()`), `sparko-preview.html` (showcase buka di Chrome).
- Spec acuan: `docs/APP_V3_SPARKO_PLAN.md` (hukum #1: nol sentuh `*.server.ts`/`packages/core` kecuali value `copy.ts`).

## 3. Pelajaran yang JANGAN diulang (dari AGENT_MEMORY — sudah terverifikasi)

1. Drizzle list → selalu `inArray(col, arr)`, jangan `sql IN (${join})`.
2. Tambah admin route → daftarkan di `ROUTE_PERMISSION` + nav + guard + audit.
3. `lib/server/*` tidak boleh diimport komponen client.
4. Cron tambah job = 1 entry di `app/src/cron/jobs.ts` (otomatis terjadwal + muncul di `/admin/cron`).
5. Semua rate via `getUsdToIdr()`; FX ikut di-hash diff provider-sync.
6. Provider match by URL, bukan name. Whitelabel "Provider Utama" — jangan sebut "SMMturk" di UI.
7. Coolify `ERR_SOCKET_BAD_PORT` + crash-loop → cek double-serialized env → unserialize via tinker → **redeploy** (restart saja tidak cukup).
8. Mobile: tabel → cards, grid ≥3 kolom wajib `min-w-0`, touch ≥24px, interval/SSE guard `document.hidden` + cleanup, list server `.limit()`.
9. `pnpm-lock.yaml` drift → `pnpm install --no-frozen-lockfile` lalu commit.
10. Verifikasi live hanya via session injeksi; **dilarang**: order sungguhan, broadcast ke user asli, email ke user asli, backup manual berulang.

## 4. Status file & commit sesi ini

- `git status` sebelum commit: bersih kecuali `?? sparko/` (4 file, 84K, no secret — sudah di-scan).
- File baru sesi ini: file ini (`docs/SESSION_HANDOVER_77HARI_2026-09-27.md`).
- Commit sesi ini: `chore(handover): sparko mascot + session 77 hari untuk pindah PC` (tambah `sparko/` + file ini, tanpa ubah tracked files lain).
- Setelah commit: `main` tetap ahead vs `vps/main` (itu normal — deploy via `origin`). **Tidak push** (user hanya minta commit).
- Di PC baru: verifikasi `git log --oneline -5` memuat commit handover ini + `ls sparko/` ada 4 file.

## 5. Sisa / blocker untuk agent berikutnya (urut prioritas)

1. **M5 blocker:** ganti testimoni placeholder + foto asli → staging Pages preview → verifikasi user → baru prod.
2. **M6:** template email sisa, bounce webhook, unsubscribe, Lighthouse ≥90, Vitest `packages/core`.
3. **M7:** UptimeRobot monitoring (ditunda user); folder lama `app.socio.id/`, `socio.id/` jangan dihapus/di-edit sampai cutover selesai.
4. Pending keputusan user: flag "kunci harga" manual (sync overwrite harga manual tiap jam); Resend key revoke; top-up SMMturk bila saldo tipis.
5. Worktree aktif lain: `boiled-hyena` (avatar R2 + API key regen + affiliate withdraw) — cek `git worktree list` bila perlu, jangan tabrak.

## 6. Referensi cepat file

| Butuh | Baca |
|---|---|
| Aturan kerja | `AGENTS.md` |
| Roadmap + checklist | `REBUILD_PLAN.md §9` |
| Memori operasional (deploy, cron, pricing, email) | `docs/AGENT_MEMORY.md` |
| Handover lintas-agent lama | `docs/AGENT_HANDOVER.md` |
| Sparko plan (lanjutkan reskin) | `docs/APP_V3_SPARKO_PLAN.md` + `sparko/SPARKO_README.md` |
| Landing V2 spec | `docs/LANDING_V2_PLAYFUL_PLAN.md` |
| Admin gap | `docs/ADMIN_GAP.md` |
| Env wajib | `.env.example` |
| Cron source of truth | `app/src/cron/jobs.ts` |
| RBAC | `packages/core/src/rbac.ts` |
| Migration pre-deploy | `scripts/db/migration-pre-deploy.sql` |

---
*Ditulis otomatis dari audit `git log --since="77 days ago"` (252 commit) + `REBUILD_PLAN.md §9` + `docs/AGENT_MEMORY.md` + `git status/diff` + `check` 0-error. Kalau ada yang tidak cocok dengan kondisi PC baru, tanya user — jangan asumsi.*
