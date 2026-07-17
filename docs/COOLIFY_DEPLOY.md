# Coolify Deploy Runbook — app.socio.id

> Status: **LIVE on Coolify (2026-07-17).** `app.socio.id` is served by Coolify:
> Traefik (`coolify-proxy`) on :80/:443 → app container `f13y38...` (port 3000) → MySQL `socio-db`.
> systemd `socio-app-prod` and Caddy are **stopped** (no longer used). Cloudflare SSL = **full**.

## What is proven working

- Git-backed deploy: Coolify clones `https://github.com/ReqTimeout/socio.git` (branch `main`),
  builds `app/Dockerfile` (multi-stage pnpm monorepo), runs container on `:3000`.
- Auth login 200 against MySQL (`socio-db`) — container reaches DB via Docker DNS name `socio-db`
  (DB added to the `coolify` network). `SOCIO_DB_HOST=socio-db` in app env.
- Public `app.socio.id` = 200, `POST /api/auth/sign-in/email` = 200 with token.
- `cdn.socio.id` (R2 public) serves correctly.

## Setup notes / gotchas (so we don't redo the debugging)

- **Coolify server SSH**: the `localhost` server (`ykrq4b2q3kcrsak1fnos0izq`) needs `user=ubuntu`,
  `ip=host.docker.internal`, `port=22`, and a private key whose `private_keys.private_key` column
  holds **`encrypt(raw_key)`** (Laravel `encrypted` cast). Store the *encrypted* value, not plaintext,
  or the disk key file gets written as `s:432:"..."` garbage and SSH fails.
- `server_settings.is_reachable` + `is_usable` must be `true` or deploy fails "Server is not functional".
- `/data/coolify` must be owned by `ubuntu` (Coolify writes compose via SSH sudo).
- Inside the coolify container, `/var/www/html/storage/app/ssh` must be owned by `www-data` (9999)
  so the key file can be written.
- **Coolify proxy (Traefik)** is NOT auto-started if :80/:443 are taken by Caddy. Stop Caddy first,
  then `cd /data/coolify/proxy && docker compose up -d`.
- **Dockerfile fix**: build stage must `COPY --from=deps /app /app` (full installed workspace),
  not just `./node_modules` — pnpm node-linker layout otherwise hides `vite` → "vite: not found".
- better-auth pinned to **1.2.7** in `app/package.json` (1.5+/1.6+ breaks adapter-node build).

## Why the app container must be on the DB network

`socio-db` runs in Docker at `10.0.0.2` (bridge network). The app must reach MySQL at
`SOCIO_DB_HOST=10.0.0.2` (NOT `127.0.0.1`) when containerized. Coolify handles this by
placing the app on the same network as the DB — set `SOCIO_DB_HOST` to the DB service
hostname Coolify assigns (or the `socio-db` container IP).

## Coolify setup steps (do in dashboard at https://43.157.204.17:8000)

1. **Onboarding**: complete the initial Coolify setup (admin user, SSH key).
2. **Server**: register the VPS as a server (IP `43.157.204.17`, Docker already present).
   Or use the "localhost" server since Coolify runs on the same VPS.
3. **Project**: create project `socio-app`.
4. **Application (Dockerfile)**:
   - Source: Git → point at the repo (`~/socio-repo.git` bare remote, or GitHub if mirrored).
   - Build: Dockerfile at `app/Dockerfile`, context = repo root `.`.
   - Port: `3000`.
   - Domain: `app.socio.id` (Cloudflare proxy already points here; Coolify issues its own cert
     OR keep Cloudflare Full + Coolify :80/:443).
5. **Environment variables** (copy from VPS `~/.socio_env` + `.env`):
   - `PORT=3000`, `HOST=0.0.0.0`
   - `SOCIO_DB_URL`, `SOCIO_DB_HOST`, `SOCIO_DB_PORT`, `SOCIO_DB_USER`, `SOCIO_DB_PASS`, `SOCIO_DB_NAME`
   - `SOCIO_AUTH_SECRET` (≥32 chars), `SOCIO_APP_URL=https://app.socio.id`, `BETTER_AUTH_URL=https://app.socio.id`
   - `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_ENDPOINT`, `R2_PUBLIC_URL`
   - `SOCIO_SMMTURK_KEY`, `SOCIO_USD_TO_IDR`
6. **DB networking**: ensure the app service shares the network with `socio-db` and set
   `SOCIO_DB_HOST` to the DB container hostname.
7. **Deploy** → verify `https://app.socio.id` returns 200 and `POST /api/auth/sign-in/email`
   returns 200 with a token.
8. **Cutover**: once Coolify is stable, stop the systemd `socio-app-prod.service` and Caddy
   (Coolify takes over :80/:443) — or keep Caddy in front if preferred.

## Notes

- better-auth is pinned to **1.2.7** in `app/package.json` — do NOT bump to 1.5+/1.6+ in
  production: those versions add OpenTelemetry `withSpan` tracing whose dynamic chunk import
  breaks under adapter-node's Rollup build (`getTracer` undefined → 500 on auth).
- Cloudflare SSL mode for `app.socio.id` must stay **full** (not flexible) to avoid the
  HTTP→HTTPS 308 redirect loop through Caddy.
