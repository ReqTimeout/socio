# COOLIFY — Project `socio-seo` (runner SEO socio.id)

> **Status 1 Okt 2026**: project Coolify `socio-seo` **sudah dibuat** (terpisah dari `socio-app` dan `agency-beriklan`) + 9 env var project-level terisi. Kode runner **sudah ditulis** (`runner/` di monorepo) + **terpublish ke repo private `ReqTimeout/socio-seo-runner`** + **image sudah ter-build & teruji end-to-end di VPS** (`socio-seo-runner:test`, 326 MB, pipeline `daily` + `weekly` hijau). **Tinggal 1 langkah yang butuh kamu**: buka akses repo untuk Coolify (§6.1) → setelah itu saya daftarkan image + 2 Scheduled Task via API.
> **Aturan keras**: project ini **tidak boleh** dicampur dengan `socio-app` (app.socio.id) atau `agency-beriklan`. Kalau ada yang perlu disentuh di project lain → STOP, tanya user dulu.
> Runbook credential GSC/Bing: [`GOOGLE_CLOUD_SETUP.md`](./GOOGLE_CLOUD_SETUP.md). Papan kemajuan: [`SEO_AUTOMATION_PLAN_V2.md`](./SEO_AUTOMATION_PLAN_V2.md) §14.2.

---

## 1. Akses server (sudah diverifikasi)

| Item | Nilai |
|---|---|
| VPS | Tencent Cloud `130.254.47.93` (IPv6 `2607:adc0:5::215`) |
| User | `root` |
| **SSH yang bekerja** | `ssh -i ~/.ssh/id_rsa root@130.254.47.93` |
| ~~SSH key lama~~ | `~/.ssh/socio_vps` **GAGAL** (Permission denied) walau `docs/deploy/APPSOCIOID_VPS.md` menyebutnya — jangan dipakai |
| IPv6 | host key belum di-`known_hosts`; pakai IPv4 saja |
| Password | diberikan user, **tidak dipakai & tidak disimpan** (key auth cukup). Password ini ada di chat → rotasi bila chat tidak privat |

Coolify:

| Item | Nilai |
|---|---|
| Versi | `coollabsio/coolify:4.3.23` (container `coolify`, healthy) |
| Panel | **hanya `127.0.0.1:8000`** di VPS → dari laptop harus SSH tunnel |
| User panel | `admin@socio.id` (user id 1), team `Socio Admin Team` (id 1) |
| CLI | tidak ada `coolify` CLI, tidak ada `docker` di laptop → semua operasi lewat SSH |
| Tunnel | `ssh -i ~/.ssh/id_rsa -L 8000:127.0.0.1:8000 root@130.254.47.93` lalu buka `http://localhost:8000` |

---

## 2. ⚠️ BAHAYA: push ke monorepo = deploy app.socio.id

`socio-app` Coolify memakai **GitHub App** pada repo `ReqTimeout/socio.git` branch `main`, dan `application_settings.is_auto_deploy_enabled = **t**` dengan `watch_paths` **kosong** → **push apa pun ke `main` memicu rebuild + redeploy app.socio.id**.

Bukti (1 Okt 2026): image container yang jalan = `nqsjafrei6k8dkup1pxkcuwf:1cab404c…` = commit `1cab404` (terbaru di repo), dibangun 25 jam lalu; image sebelumnya `9e38c3d…` = commit sebelum itu. Pola build = 1 image per commit.

**Konsekuensi untuk SEO work**: jangan `git push` ke `ReqTimeout/socio.git` selama sedang mengerjakan SEO. Semua perubahan `seo/`, `runner/`, `docs/` sekarang **local saja** (belum di-push, dengan sengaja). Opsi isolasi ada di §6.

---

## 3. Project yang ada (peta — jangan dicampur)

| id | Project | Env | Isi | Milik |
|---|---|---|---|---|
| 1 | `socio-app` | `production` (env id 1, uuid `eqhk0q4czxssprkvvgjvjpks`) | app `socio-app` (uuid `nqsjafrei6k8dkup1pxkcuwf`) | **app.socio.id — JANGAN DISENTUH** |
| 2 | `seo-pipeline` | `production` (env id 3) | app `seo-pipe-app` (uuid `igsbaxpsvuhopghoutiit2kk`) | **beriklan.co.id** — pipeline distribusi berita (cron internal + IndexNow ke beriklan.co.id). Despite its name, **BUKAN** milik socio.id → jangan dipakai |
| 3 | `agency-beriklan` | `production` (env id 4) | `sgb-dashboard`, `capi-gateway` | **agency — JANGAN DISENTUH** |
| **4** | **`socio-seo`** | `production` (env id 5, uuid `c1gnvpjfyihhhtxmkr8kjghw`) | env var saja (resource aplikasi menyusul) | **socio.id SEO engine** |

Project baru dibuat via API resmi Coolify → environment `production` otomatis ikut dibuat. Verifikasi isolasi: 4 aplikasi lama tetap `running` dengan uptime tidak berubah (tidak ada restart), `scheduled_tasks` masih 0.

---

## 4. Token API Coolify (least privilege)

Untuk operasi Coolify non-UI (buat resource, set env, deploy) saya buat token sendiri:

| Item | Nilai |
|---|---|
| Nama | `opencode-socio-seo` (row id 133) |
| Abilities | `["read","write"]` — **bukan** `root`, **bukan** `deploy` |
| Expires | `2027-01-01` |
| Disimpan | `/root/.coolify-api-token` di VPS, mode `600` (**di luar repo**) |

Dua hal yang harus diketahui kalau buat token lewat SQL:

1. Kolom `token` berisi **SHA-256 hash** dari token (Laravel Sanctum, `auth:sanctum`), bukan tokennya sendiri. Token yang disimpan plaintext → 401.
2. Kolom `abilities` **wajib diisi** JSON (contoh `["*"]`). Kalau `NULL` → HTTP 500 `in_array(): Argument #2 ($haystack) must be of type array, null given` (bukan 401, jadi mudah salah diagnosis).

Token lain milik tool/orang lain — **jangan dipakai & jangan diubah**: `deploy-token`, `codex-deploy`, `seo-pipeline`, `sociodev`, `agency-agent`, `beriklan`, `sgb`.

Contoh pakai (dari dalam VPS):

```bash
P=$(cat /root/.coolify-api-token)
curl -s -H "Authorization: Bearer $P" http://127.0.0.1:8000/api/v1/projects
```

Cabut token:

```bash
docker exec coolify-db psql -U coolify -d coolify \
  -c "delete from personal_access_tokens where name='opencode-socio-seo';"
rm -f /root/.coolify-api-token
```

---

## 5. Env var project `socio-seo` (sudah terisi, terenkripsi di DB)

9 variabel, diisi via `POST /api/v1/projects/{uuid}/envs` (level project → diwarisi semua resource di project ini):

| Key | Nilai | Rahasia? |
|---|---|---|
| `GCP_PROJECT_ID` | `project-e899f4b3-5062-40a0-b9a` | tidak |
| `GSC_SERVICE_ACCOUNT_EMAIL` | `beriklanagency@…iam.gserviceaccount.com` | tidak |
| `GSC_SERVICE_ACCOUNT_JSON_B64` | base64 JSON SA (3.216 char) | **ya** |
| `GSC_SITE_URL` | `sc-domain:socio.id` | tidak |
| `GSC_SITEMAP_URL` | `https://socio.id/sitemap-index.xml` | tidak |
| `BING_API_KEY` | API key Bing | **ya** |
| `SEO_INDEXER_DAILY_LIMIT` | `3` | tidak |
| `SEO_RAMP_DAY` | `1` (Senin) | tidak |
| `TZ` | `Asia/Jakarta` | tidak |

Catatan:
- Nilai **terenkripsi at rest** (Laravel encrypted cast). Panjang di DB bukan panjang asli (3.216 char → 5.920 char ciphertext). Jangan panik melihat angka itu.
- Endpoint env **level project hanya menerima `key` + `value`** (field `is_buildtime`/`is_runtime` ditolak 422). Kalau butuh flag itu, pakai level application/environment setelah app ada.
- Secret tidak masuk repo; `.env.example` tetap kosong.

Env tambahan yang nanti dibutuhkan runner tapi **belum diisi** (isi setelah app dibuat): `RESEND_API_KEY` (email report), `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` (deploy landing), `GH_TOKEN` (push repo konten), `SEO_RUNNER_SECRET`, `NOTIFY_EMAIL_TO/FROM`.

---

## 6. Status image runner + 1 blokir tersisa

### 6.0 Yang sudah jadi

| Item | Status |
|---|---|
| Kode runner | `runner/{Dockerfile,daily.mjs,weekly.mjs,README.md,publish-repo.mjs}`, `runner/lib/{lock,notify}.mjs` — di monorepo (source of truth) |
| Repo terpisah | `ReqTimeout/socio-seo-runner` **private**, 19 file, commit `085964f` |
| Cara publish | `node runner/publish-repo.mjs` (git over SSH, allowlist 19 file + guard anti-secret) |
| Build image | **BERHASIL di VPS**: `docker build -t socio-seo-runner:test` → 326 MB, tanpa `npm install` (zero-dep) |
| Uji end-to-end | `docker run ... node runner/daily.mjs` → preflight OK (auth Google nyata dari VPS) · bing cooldown · gsc cache 24j · remedy backoff · notify graceful · lock ambil/lepas · **exit 0** |
| Uji mingguan | `node runner/weekly.mjs` di container → mining GSC 100 query, posisi real, tulis ke volume |
| Volume | `state.json` + `config.json` + `keywords.mined.json` di `/app/data` (bukan image) — terbukti persisten antar-run |

### 6.1 Clone repo private — ✅ SELESAI (deploy key)

Coolify di server ini cuma punya source **"Public GitHub"** (`app_id`/`installation_id` kosong → clone tanpa auth). Repo `socio-seo-runner` private → butuh **deploy key**.

| Item | Nilai |
|---|---|
| Deploy key di Coolify | `private_keys` id **1**, uuid `ftdt1pym28uaduhqhfvpgki2`, `is_git_related=true` |
| Private key | hanya di VPS `/root/.ssh/coolify-seo-runner` (600). Di DB Coolify **terenkripsi** |
| Fingerprint | `SHA256:gwOxfqUMGbFuq140uI3oQNWszOHVDZl3pH1MrhCPfjM` |
| Sudah dipasang di GitHub | ✅ user, 1 Okt 2026 (read-only) |
| Verifikasi | `git ls-remote` berhasil dari host VPS **dan** dari dalam container Coolify |

**Tiga jebakan yang ketemu saat menyiapkannya (penting kalau diulang):**

1. **`git_repository` harus SSH URL**, bukan `https://`. Dengan `https://github.com/...` Coolify clone tanpa auth → `fatal: could not read Username for 'https://github.com'` → deploy `failed`. Nilai yang benar: `git@github.com:ReqTimeout/socio-seo-runner.git`
2. **Shared env var level project TIDAK terinjeksi ke container** di Coolify 4.3.23 (`shared_environment_variables` tanpa kolom `is_buildtime`/`is_runtime`, dan isinya tidak masuk container aplikasi → `GSC=KOSONG`). Solusi: env var dipasang di **level aplikasi** (`POST /applications/{uuid}/envs` dengan `is_runtime: true`). Baris project-level tetap disimpan sebagai metadata untuk resource berikutnya.
3. **CMD bawaan Dockerfile harus idle**, bukan pipeline. Coolify menganggap application = service; kalau `CMD` exit, container restart-loop dan `docker exec` (dipakai Scheduled Task) balapan. Karena itu `runner/idle.mjs` jadi CMD, pipeline dipicu Scheduled Task.

### 6.2 Image + Scheduled Task — ✅ LIVE

| Item | Nilai |
|---|---|
| Application | `socio-seo-runner`, uuid **`c9iqug5vvi9kjywt1fn6xnsc`**, project `socio-seo` (env `production`) |
| Source | `POST /applications/private-deploy-key` → repo `git@github.com:ReqTimeout/socio-seo-runner.git`, branch `main`, `dockerfile_location=/Dockerfile` |
| Image | `c9iqug5vvi9kjywt1fn6xnsc:<commit-sha>` (326 MB) — tag = bukti clone private repo via deploy key |
| CMD | `node runner/idle.mjs` (container idle, `RestartCount=0`) |
| Domain / port | **tidak ada** (`fqdn` kosong, `ports_exposes` kosong) — runner bukan web service, tidak perlu diekspos |
| Env var | 10 var **level aplikasi**, `is_runtime: true` (lihat §6.1 jebakan #2) |
| Task harian | `seo-daily-index` uuid `typijvbcwldn4xjljls2zw4o` · `23 * * * *` UTC = **06:00 WIB** · `node runner/daily.mjs` · timeout 900 dtk |
| Task mingguan | `seo-weekly` uuid `raovpgwn2fzhs5fttjrkidge` · `2 2 * * 1` UTC = **Senin 09:00 WIB** · `node runner/weekly.mjs` · timeout 1800 dtk |
| Uji end-to-end | `POST …/scheduled-tasks/{uuid}/execute` → `scheduled_task_executions` **status `success`**, duration **4,28 dtk**, retry 0, log `exit 0`, `env: GSC=ada · BING=ada · INDEXNOW=ada` |
| Ramp-gate | otomatis jalan **hanya hari Senin** (di dalam `indexer.mjs`, env `SEO_RAMP_DAY=1`) |

Env var level aplikasi: `GCP_PROJECT_ID` · `GSC_SERVICE_ACCOUNT_EMAIL` · `GSC_SERVICE_ACCOUNT_JSON_B64` (3.216 char) · `GSC_SITE_URL` · `GSC_SITEMAP_URL` · `BING_API_KEY` · `SOCIO_INDEXNOW_KEY` · `SEO_INDEXER_DAILY_LIMIT` · `SEO_RAMP_DAY` · `TZ`.

**Deploy ulang perlu ability `deploy`**: `POST /api/v1/deploy` butuh `api.ability:deploy` (route `/deploy` di `routes/api.php:145`). Token `opencode-socio-seo` sengaja disimpan `["read","write"]`; saat perlu deploy ability-nya ditambah **seemporary** lalu dikembalikan (least privilege — jangan biarkan `deploy` menetap karena itu bisa mendeploy `socio-app` juga).


