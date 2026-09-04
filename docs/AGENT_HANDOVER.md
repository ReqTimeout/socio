# AGENT HANDOVER — Shared Memory for Socio.id Multi-Agent

> **Tujuan:** File ini shared cross-agent memory. Semua coding agent yang kerja di project ini (Codex, Claude Desktop, Qoder, Kilo, dst) **WAJIB BACA** di awal sesi, sebelum mulai kerja apapun. Update tiap ada perubahan state signifikan (deploy, env, schema, blocker solved/baru).
>
> **Source of truth order:** `AGENTS.md` → `REBUILD_PLAN.md` → `docs/AGENT_HANDOVER.md` (file ini) → `docs/AGENT_CONTEXT.md` (legacy memory) → `docs/` spesifik.

---

## 0. Posisi project (4 September 2026)

- **Milestone**: M3 selesai sebagian (auth + admin + cron dasar). Sedang dalam fase **polish dashboard UI/UX** (lihat `docs/UIUX_DASHBOARD_PLAN.md` 88 issue, 9 phase). Phase P0–P8 selesai 4 Sep 2026.
- **Live production**:
  - Landing `socio.id` → Cloudflare Pages (Astro)
  - App `app.socio.id` → VPS Coolify (SvelteKit + node-cron)
  - DB MySQL → private network di VPS
  - Asset `cdn.socio.id` → Cloudflare R2
- **Last commit**: `2c4a802 docs(deploy): operasional harian 2 file .md untuk socio.id domain + app.socio.id VPS`
- **Uncommitted changes** (Branch: default branch; cek `git status`):
  - `M app/src/routes/(app)/+page.svelte` (Beranda polish)
  - `M packages/ui/src/index.ts` (export tambahan)
  - `?? packages/ui/src/components/OrbField.svelte` (komponen baru)
  - `?? packages/ui/src/components/Stat.svelte` (komponen baru)

## 1. Live infra (single source of truth)

### VPS + Containers (verified 3 Sep 2026)

| Komponen | Identifier | Port | Network |
|---|---|---|---|
| VPS | `130.254.47.93` (Tencent Cloud APAC) | — | Public SSH |
| Coolify panel | `coolify` container | `:8000` | Localhost only (SSH tunnel) |
| Coolify Traefik | `coolify-proxy` | `:80`/`:443` | Public |
| Coolify DB | `coolify-db` (PostgreSQL) | internal | Private |
| **App SvelteKit** | `nqsjafrei6k8dkup1pxkcuwf-<id>` (prefix fixed, suffix berubah tiap redeploy) | `:3000` | Private |
| **MySQL 8.0** | `rebicrj57r3afbg9knieq9ks` (rarely changes) | `:3306` | Private (NO internet) |
| Mailserver | `mailserver` (docker-mailserver v14) | `:587` SMTP | Private |

**WAJIB**: Container app name suffix `<id>` berubah tiap redeploy. Selalu ambil nama terbaru:
```bash
ssh root@130.254.47.93 'docker ps --format "{{.Names}}" | grep "^nqsjafrei6k8dkup1pxkcuwf"'
```

### SSH + Docker

```bash
ssh root@130.254.47.93                                # SSH root (keypair)
ssh -L 8000:127.0.0.1:8000 root@130.254.47.93          # tunnel Coolify panel
```

Detail lengkap: `docs/deploy/APPSOCIOID_VPS.md` (552 baris).

### DNS zone `socio.id` (Cloudflare Account `0298214d1069f75436f490b51ea4763e`)

| Record | Type | Target | Proxy |
|---|---|---|---|
| `socio.id` | A | Cloudflare Pages | Proxied (orange) |
| `app.socio.id` | A | `130.254.47.93` | Proxied (orange) ← WAJIB untuk WAF/DDoS |
| `cdn.socio.id` | CNAME | `socio.b-cdn.r2.dev` | Proxied (orange) |

Detail: `docs/deploy/SOCIOID_DOMAIN.md` (388 baris).

**WARNING — 2 Cloudflare account ada di CLI**:
- `socio.id` (account ID `0298214d1069f75436f490b51ea4763e`) — yang dipakai project ini
- `3smedianet` (Reza Ramadhi) — akun berbeda, JANGAN pakai wrangler OAuth di akun ini untuk socio.id deploy
- Token API socio.id ada di `accountcf.md` (gitignored, **JANGAN COMMIT**)

## 2. Tech stack final (per AGENTS.md §2 — JANGAN ubah)

| Layer | Stack |
|---|---|
| Landing | Astro 5 + Svelte 5 islands + Tailwind v4 + MDX → Cloudflare Pages |
| App | SvelteKit + adapter-node + Tailwind v4 → VPS Coolify |
| DB | MySQL via Drizzle ORM |
| Auth | better-auth + bcryptjs (kompatibel PHP `password_hash`) |
| Queue | DB-backed (`job_queue` + `SELECT FOR UPDATE SKIP LOCKED`) — NO Redis |
| Cron | node-cron di VPS app process |
| Provider SMM | SMMturk (`smmturk.org/api/v2`, env `SOCIO_SMMTURK_KEY`) |
| Payment | Tripay + Midtrans (prod: BCA manual ONLY saat ini) |
| Email | docker-mailserver v14 (sebelumnya Resend — lihat git log) |
| Real-time | SSE (no WebSocket) |
| Push | Web Push VAPID |
| DNS/Edge | Cloudflare |

**Dilarang**: Redis, MongoDB, PostgreSQL (kecuali Coolify DB), PHP, WordPress, jQuery, Bootstrap, Next.js/Nuxt, Cloudflare Workers untuk app/cron.

## 3. Critical blockers (per 4 Sep 2026)

### 🔴 BLOCKER-1: `SOCIO_SMMTURK_KEY` missing di VPS

- **Symptom**: log prod error `[cron] status-polling provider 5 error: SMMturk error: "Invalid API key"` (dan provider 7).
- **Root cause**: env `SOCIO_SMMTURK_KEY` **tidak di-set** di Coolify (hanya `SOCIO_SMMTURK_URL`).
- **Impact**: SEMUA status polling order gagal. Order stuck di "Pending" → tidak pernah jadi "Selesai". UX rusak.
- **Fix**: User ambil key dari https://smmturk.org → set di Coolify → restart container.
- **Verify**: `ssh root@130.254.47.93 'docker exec $(docker ps --format "{{.Names}}" | grep "^nqsjafrei6k8dkup1pxkcuwf" | head -1) printenv SOCIO_SMMTURK_KEY'`

### 🟡 ACTION-1: Resend API key revoke (legacy B-01 dari 26 Agu)

- Token sempat tercatat di chat history sesi 26 Agu 2026. **WAJIB** revoke di dashboard Resend + rotate. Env saat ini pakai mailserver v14 (Lokal), tapi key masih aktif di akun Resend.

### 🟡 ACTION-2: Top-up saldo SMMturk

- Saldo SMMturk saat ini $5.16 (terlalu rendah untuk order normal). Wajib top-up sebelum M4 cutover full.

## 4. Env diff (prod VPS vs local `app/.env`)

| Var | Local `app/.env` | Prod VPS | Catatan |
|---|---|---|---|
| `SOCIO_DB_URL` | ✅ local MySQL brew | ✅ TiDB-style (private network ke `rebicrj57...`) | Beda sumber DB |
| `SOCIO_AUTH_SECRET` | ✅ random 48 char | ✅ sama generate pattern | Match |
| `SOCIO_SMMTURK_KEY` | ✅ `cc9076fe...` | ❌ **MISSING (BLOCKER-1)** | Harus di-set ASAP |
| `SOCIO_USD_TO_IDR` | ✅ `15800` | ✅ `15800` | Match |
| `SOCIO_PROVIDER_ENC_KEY` | — | ✅ `7d4081...7caa` (hex 32) | G5 ADMIN_GAP done |
| `SOCIO_SECURE_COOKIES` | default 0 | ✅ `1` | Prod lebih aman |
| `SOCIO_TURNSTILE_ENABLED` | default | ✅ `1` (real keys) | Match |
| `SOCIO_BCA_*` | — | ✅ set (manual payment) | Prod only |
| `SOCIO_DEPOSIT_BONUS` | — | ✅ `0.10` | 10% bonus match spec |
| `SOCIO_AFFILIATE_RATE` | — | ✅ set | Match |
| `RESELLER_BONUS` | — | ✅ set | Match |
| `SOCIO_CRON_ENABLED` | default | ✅ `1` | Cron on di prod |
| `SOCIO_INDEXNOW_KEY` | — | ✅ set | SEO IndexNow aktif |
| `SOCIO_LLM_BASE_URL/MODEL` | — | ✅ `tokenrouter` + `gmi-serving` | LLM integration |
| `MIDTRANS/TRIPAY/JASAMUTASI` | ✅ keys | ❌ NOT set (by design — BCA manual) | OK |
| `RESEND_API_KEY` | ✅ `re_AY22H...` | ❌ NOT set (pakai mailserver v14) | OK by M5 |

Local `.env` (root) **TIDAK ADA** — env hanya di `app/.env`.

## 5. Multi-agent setup (4 Sep 2026)

| Agent | Workspace | Stack | Catatan |
|---|---|---|---|
| **Codex (kami)** | `app/`, `packages/`, `landing/` di branch default | SvelteKit, wrangler | Full coding + deploy CF Pages |
| **Claude Desktop** | `.opencode/memory/SUMMARY.md` | PHP legacy `app.socio.id/` | Punya local DB copy + dev server `:8080` |
| **Kilo** | `.kilo/worktrees/boiled-hyena` (branch `boiled-hyena`) | SvelteKit | Remote `vps`, dormant |
| **Qoder** | `.qoder/plans/` (design plan) | Design system | Punya `Design_Fix_Desktop_Mobile_e10de921.md` |

**Cross-agent memory files**:
- `docs/AGENT_HANDOVER.md` (file ini) — shared state utama
- `docs/AGENT_CONTEXT.md` — legacy memory (lebih tua, Aug 2026)
- `.opencode/memory/SUMMARY.md` — Claude's notes

Kalau kerja sebagai agent baru, **WAJIB baca ketiga file ini** sebelum mulai.

## 6. Deploy procedure (cheat sheet)

### Landing (`socio.id`) → Cloudflare Pages

```bash
cd landing
pnpm install
pnpm build        # output ke dist/
# Deploy via wrangler (butuh CLOUDFLARE_API_TOKEN dari accountcf.md)
pnpm exec wrangler pages deploy dist --project-name=socio-id --branch=main
```

Atau cukup `git push origin main` jika Pages sudah auto-connect ke repo GitHub `ReqTimeout/socio.git`. Detail: `docs/LANDING_DEPLOY.md`.

### App (`app.socio.id`) → Coolify auto-deploy

```bash
git push origin main
# Coolify webhook aktif → build 3-5 menit → deploy ~10-30 detik
```

Manual deploy via Coolify dashboard: Projects → socio-app → App → Deploy.

**Skill khusus**: `coolify-vps` di `~/.codex/skills/coolify-vps/SKILL.md` (custom, baru dibuat 4 Sep 2026). Loaded otomatis saat agen kerja VPS.

### DNS + R2 + Turnstile → Cloudflare dashboard

Manual editing via dashboard. Atau pakai skill `cloudflare` + `wrangler` + `turnstile-spin` (lihat `~/.codex/skills/cloudflare/`).

## 7. Key docs (urut prioritas baca)

| Dokumen | Isi |
|---|---|
| `AGENTS.md` | Panduan wajib agent (max 2-3 skill, jangan invent, milestone order) |
| `REBUILD_PLAN.md` | Master plan + tech stack + schema + milestone checklist (947 baris) |
| `docs/AGENT_HANDOVER.md` | **File ini** — state saat ini, blockers, env diff |
| `docs/AGENT_CONTEXT.md` | Legacy state (Aug 2026, B-01..B-08 bugs) |
| `docs/ADMIN_GAP.md` | Gap admin (G1–G30) yang wajib di-fix di M3 |
| `docs/DESIGN.md` | Design system preskriptif (palette OKLCH, type, motion, copy rules) |
| `docs/UIUX_DASHBOARD_PLAN.md` | Audit visual + backlog 88 issue, 9 phase (P0–P8) |
| `docs/IMPLEMENTATION_CHECKLIST.md` | Tracker per-issue (centang tiap selesai commit) |
| `docs/MOBILE_UX_GUIDE.md` | Design system phone-specific |
| `docs/deploy/APPSOCIOID_VPS.md` | **VPS ops runbook utama (552 baris)** |
| `docs/deploy/SOCIOID_DOMAIN.md` | **CF zone ops (388 baris)** |
| `docs/VPS_DEPLOY_RUNBOOK.md` | Setup awal VPS |
| `docs/COOLIFY_DEPLOY.md` | Coolify-specific setup |
| `docs/LANDING_DEPLOY.md` | CF Pages deploy runbook |
| `accountcf.md` (gitignored) | CF token, R2 keys — **JANGAN COMMIT** |

## 8. Skills installed (4 Sep 2026)

Total 33 skills di `~/.codex/skills/`. Project-relevant:

**Cloudflare stack**: `cloudflare`, `cloudflare-deploy`, `cloudflare-email-service`, `cloudflare-one`, `cloudflare-one-migrations`, `cloudflare-r2` (in cloudflare parent), `turnstile-spin`, `wrangler`, `workers-best-practices`, `durable-objects`, `agents-sdk`, `sandbox-sdk`, `web-perf`.

**Frontend**: `svelte-code-writer`, `svelte-core-bestpractices`, `astro-best-practices`, `create-component`, `content-collection`, `nanobanana-skill`.

**Visual confirm**: `playwright`, `playwright-interactive`, `screenshot`, `figma-implement-design`.

**Security + ops**: `security-best-practices`, `security-threat-model`, `sentry`, `pdf`.

**Custom untuk project ini**: `coolify-vps` (VPS + Coolify ops, baru 4 Sep 2026).

**Generic utilities**: `gh-fix-ci`, `gh-address-comments`, `migrate-to-codex`, `define-goal`, `openai-docs`, `imagegen`, `skill-installer`, `skill-creator`, `plugin-creator`.

**Tidak relevan di-skip**: `mkland-copywriting`, `mkland-research` (proyek Bandung lain), `review-agent`.

Drizzle ORM: TIDAK ada official skill repo (cek `drizzle-team/drizzle-orm` — `.claude/skills` & `.agents/skills` tidak ada). Pakai docs di `node_modules` saja.

## 9. Quick reference: perintah harian

### Lihat log app (PALING SERING)
```bash
ssh root@130.254.47.93 'docker logs --since 1h -f $(docker ps --format "{{.Names}}" | grep "^nqsjafrei6k8dkup1pxkcuwf" | head -1)'
```

### Status semua container
```bash
ssh root@130.254.47.93 'docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"'
```

### Env aktif di app container
```bash
ssh root@130.254.47.93 'docker exec $(docker ps --format "{{.Names}}" | grep "^nqsjafrei6k8dkup1pxkcuwf" | head -1) printenv | grep -E "^SOCIO_|^R2_|^VAPID_"'
```

### Restart app tanpa rebuild
```bash
ssh root@130.254.47.93 'docker restart $(docker ps -q -f ancestor=nqsjafrei6k8dkup1pxkcuwf)'
```

### Tail logs prod untuk debug
```bash
ssh root@130.254.47.93 'docker logs --tail 500 $(docker ps --format "{{.Names}}" | grep "^nqsjafrei6k8dkup1pxkcuwf" | head -1) 2>&1 | grep -iE "error|smmturk|cron"'
```

### Cek response socio.id (dari workstation, pakai DNS 1.1.1.1)
```bash
dig +short socio.id A @1.1.1.1
dig +short app.socio.id A @1.1.1.1
curl -sI https://socio.id | head -5
curl -sI https://app.socio.id | head -5
```

## 10. PR / commit convention (per AGENTS.md §0 & §7)

- **JANGAN commit tanpa instruksi eksplisit** (AGENTS.md §0 rule 7).
- Format: `feat(M{X}): {modul} — {item checklist}` atau `fix(M{X}): {masalah}`.
- Sebelum commit: `pnpm lint && pnpm typecheck && pnpm test` (kalau ada).
- Branch prefix default: `codex/` (Codex convention).
- **JANGAN edit** folder `app.socio.id/` atau `socio.id/` (legacy PHP, reference only).

---

**Update file ini setiap ada perubahan state**: deploy sukses, blocker solved/baru, env berubah, skill baru di-install, agent baru onboarded.
