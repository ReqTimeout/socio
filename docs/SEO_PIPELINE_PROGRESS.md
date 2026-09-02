# Progress SEO Pipeline — catatan sesi 2 Sep 2026 (PAUSED by user)

> Status: pipeline S2d-S2g **PAUSED** — user minta skip artikel dulu, fokus deploy app.socio.id ke server baru.
> Dokumen ini catatan agar sesi berikutnya bisa lanjut tanpa konteks hilang.

## Yang sudah jadi (uncommitted)

### Scripts (folder `seo/` — semua untracked)
- `generate.mjs` (475 baris) — generator artikel via `opencode run --model <free>`, model rotasi
  (mimo-v2.5-free → ling-3.0-flash-fin-free → muse-spark-1.2-contributor-free → nemotron-3-ultra-free →
  nemotron-3.5-lightning-free → fallback big-pickle), budget ~2.5k token/artikel, timeout 180s, retry 1x ganti model.
  `ROOT` hardcoded `/Users/maabook/Desktop/socio.id`. Usage: `--count=N --keyword="…" --dry`.
  Debug: `SEO_DEBUG=1` → dump prompt/output/assembled ke `/tmp/seo-{prompt,out,user}.txt` + `/tmp/seo-assembled.mdx`.
- `prompts.ts` — SYSTEM_PROMPT + template + `validateMdx` (TEPAT 4 H2 + 1 FAQ section 5 Q&A, 1000-1200 kata
  di luar FAQ, TEPAT 3 internal link: 1 money `/beli-`|`/smm-panel-` + 2 related).
- `indexnow.mjs` — ping IndexNow (`api.indexnow.org` + `yandex.com`), batch ≤10 URL, key dari env
  `SOCIO_INDEXNOW_KEY` atau `landing/public/indexnow.txt`, state tracking `seo/state.json` (auto-create),
  dedup submitted URLs.
- `publish.mjs` — promote draft (`draft:true`→`false`, pubDate=now) → `pnpm --filter landing build` →
  `wrangler pages deploy` (env CF required) → panggil `indexnow.mjs` → update queue + state.
  Flag `--no-deploy` (flip+build saja), `--slug=…` (publish spesifik).
- `llms.mjs`, `s2b-expand.mjs`, `sync-prices.mjs` — dari sesi sebelumnya, sudah ada.
- `queue.json` — 183 item: 5 seed `status='published'` (live di cutover), 178 pending.

### Bug yang sudah difix sesi ini
1. **Regex unterminated** di `prompts.ts:185` — `[^\\)]*\\)` kurang escape penutup → SyntaxError saat
   `validateMdx`. FIXED (commit belum).
2. **Gate mismatch FAQ heading** — LLM menulis `## Pertanyaan Umum` (bukan `## FAQ`), jadi
   `stripFaqSection` no-op → FAQ tetap di body → H2 count 5 (masih OK) tapi `extractFaqFromBody`
   match `Pertanyaan` → FAQ di-extract 2x (body + frontmatter) → duplikat.
   **BELUM FIX** — perlu align: pilih satu istilah heading FAQ di prompt (pakai `## FAQ` literal,
   atau relax regex strip ke `/##\s*(FAQ|Pertanyaan Umum)/i`).

### Test run hasil (2 artikel percobaan, keduanya GATES FAIL, tidak jadi file)
- Run 1 (`beli followers instagram`, mimo timeout → ling OK 6938c): H2=9 (FAQ heading mismatch +
  duplikat), internal links=2 (min 3).
- Run 2 (mimo OK 8383c): body 747 kata (< 850 min), internal links=0 — LLM taruh link sebagai
  plain text URL, bukan markdown `[text](url)`.
- **Kesimpulan**: prompt perlu tightening — (a) heading FAQ HARUS `## FAQ` literal, (b) link format
  markdown eksplisit dengan contoh, (c) min kata dinaikkan di prompt (target LLM 1100+ supaya
  setelah strip FAQ ≥850). Alternatif: relax gate internal-link ke ≥2 + auto-append related links
  post-generate.

## Yang belum (sisa S2d-S2g)
- [ ] Fix FAQ heading mismatch + link format di `prompts.ts` (lihat atas)
- [ ] Root `package.json`: tambah `"seo:generate": "node seo/generate.mjs"`, `"seo:publish": "node seo/publish.mjs"`
- [ ] Real run `--count=1` sampai GATES PASS → MDX masuk `landing/src/content/blog/` (draft:true)
- [ ] Test `publish.mjs --no-deploy` → build pass → deploy + IndexNow ping
- [ ] Commit batch SEO: `docs/LANDING_SEO_SYSTEM.md` + `docs/SEO-KEYWORD-RESEARCH.md` + `seo/` + `.env.example`
- [ ] `gsc-sync.mjs` (defer ke S3)
- [ ] `.env` lokal: tambah `SOCIO_INDEXNOW_KEY=278171ffe6864b2ab698edb195272ea5`

## Konteks deploy (fokus sekarang — app.socio.id ke server baru)
- Landing socio.id SUDAH LIVE (cutover 2 Sep, deployment `9c8e6686`, commit `8c2ddf7`).
- VPS lama `43.157.204.17` (Tencent Lighthouse Jakarta) DOWN 522 — semua service mati
  (Coolify, app, MySQL `socio-db`, Traefik). User akan kasih **server baru**.
- Runbook deploy app ada: `docs/COOLIFY_DEPLOY.md` (setup Coolify + gotchas), `docs/VPS_DEPLOY_RUNBOOK.md`
  (topologi + langkah), `docs/VPS_DEPLOY_CHECKLIST.md` (prasyarat + env).
- App build: `app/Dockerfile` multi-stage pnpm monorepo, port 3000, `node build/index.js`.
  better-auth PINNED 1.2.7 (jangan upgrade — 1.5+ break adapter-node build).
- DB: MySQL 8.0 docker container `socio-db` di network `coolify` (bukan TiDB — deviasi disetujui).
  App reach DB via `SOCIO_DB_HOST=socio-db` (Docker DNS).
- Env wajib app: lihat `.env.example` (DB, AUTH_SECRET, APP_URL, R2, SMMTURK, RESEND, dll).
- Git remote deploy: GitHub `ReqTimeout/socio` branch `main` — **branch lokal `main` 21+ commits
  ahead remote** (belum push, butuh approval user).
- DNS: `app.socio.id` A record → IP VPS baru (CF proxy orange, SSL Full strict).
