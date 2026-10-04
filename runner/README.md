# socio-seo-runner — image runner SEO engine socio.id

> Repo ini **dibuat terpisah dari monorepo `ReqTimeout/socio`** dengan sengaja.
> Alasan: `socio-app` (Coolify) memakai GitHub App dengan **auto-deploy aktif** dan
> `watch_paths` kosong → *push apa pun* ke `main` monorepo memicu rebuild/deploy
> **app.socio.id**. Biar perubahan SEO tidak pernah menyentuh app produksi.
>
> **Source of truth tetap monorepo** `socio.id` (`runner/` + `seo/`). Repo ini
> dibuat dari sana oleh `runner/publish-repo.mjs` (allowlist file eksplisit).
> Jangan edit langsung di sini — edit di monorepo lalu publish ulang.

## Isi

| Path | Fungsi |
|---|---|
| `runner/daily.mjs` | Pipeline harian 06:00 WIB: lock → `seo/indexer.mjs` → ringkasan → email |
| `runner/weekly.mjs` | Pipeline mingguan Senin: indexer → mining GSC 28d → email |
| `runner/lib/lock.mjs` | Anti double-run (file lock, auto-bersihkan stale) |
| `runner/lib/notify.mjs` | Kirim laporan via Resend (zero-dep, graceful kalau key belum ada) |
| `seo/lib/gsc.mjs` | Client Search Console (JWT zero-dep): inspect, search analytics, sitemap |
| `seo/indexer.mjs` | Orchestrator: indexnow → bing → gsc → remedy → ramp |
| `seo/gsc-inspect.mjs` | URL Inspection batch → `state.json` |
| `seo/bing-submit.mjs` | Bing URL Submission (kuota 100/hari) |
| `seo/indexnow.mjs` | Ping IndexNow |
| `seo/remedy.mjs` | Auto-remedi URL tidak terindeks |
| `seo/ramp-gate.mjs` | Set `daily_count` 3-10 dari `index_rate` |
| `seo/scripts/gsc-doctor.mjs` | Diagnosa kredensial (dipakai preflight) |
| `seo/config.json`, `seo/state.seed.json` | Seed untuk volume `/app/data` |

Zero dependency runtime: cukup `node:crypto` + global `fetch` (Node ≥ 20).
Karena tidak ada dependency, **tidak ada `npm install`** di dalam image.

## Environment (Coolify → project `socio-seo`, env level project)

Wajib: `GSC_SERVICE_ACCOUNT_JSON_B64` · `GSC_SITE_URL=sc-domain:socio.id` ·
`GCP_PROJECT_ID` · `GSC_SERVICE_ACCOUNT_EMAIL` · `GSC_SITEMAP_URL` · `BING_API_KEY`
Opsional: `RESEND_API_KEY` + `NOTIFY_EMAIL_TO` + `NOTIFY_EMAIL_FROM` (email laporan),
`SEO_NOTIFY_DRYRUN=1` (uji tanpa kirim), `SEO_SKIP_INDEXER=1` (uji lock/notify saja),
`SEO_LOCK_PATH`, `SEO_STATE_PATH`, `SEO_CONFIG_PATH`.

## Scheduled task

| Nama | Cron (UTC) | WIB | Command |
|---|---|---|---|
| `seo-daily-index` | `0 23 * * *` | 06:00 | `node runner/daily.mjs` |
| `seo-weekly` | `0 2 * * 1` | Senin 09:00 | `node runner/weekly.mjs` |

Ramp-gate (`seo/ramp-gate.mjs`) jalan otomatis di dalam `indexer.mjs` **hanya hari Senin**
(atur dengan `SEO_RAMP_DAY`).

## Yang belum aktif (sengaja)

- **Publish** (flip draft → build landing → deploy Cloudflare Pages): butuh repo konten
  terpisah + `CLOUDFLARE_API_TOKEN`. Jalur kodenya ada di `daily.mjs` sebagai no-op
  eksplisit supaya tidak ada publish diam-diam.
- Freshness re-inject + mesh rebuild (butuh repo konten).

Fail-closed: kalau `indexer.mjs` keluar non-zero, `daily.mjs` **tidak** publish.

## Update kode

```bash
# di monorepo socio.id
node runner/publish-repo.mjs          # pakai GH_TOKEN dari .env
```

Lalu deploy ulang di Coolify (project `socio-seo`).
