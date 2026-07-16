# Coolify Deploy Runbook — app.socio.id

> Status: **Docker image validated, live production currently served via systemd+Caddy.**
> This runbook finishes the move to Coolify (planned in REBUILD_PLAN M7 / app deploy).

## What is proven working (2026-07-17)

- `app/Dockerfile` builds a working image (`socio-app:test` tested on VPS):
  - `pnpm --filter app build` → adapter-node `build/index.js`
  - Container serves HTTP on `:3000` (env `PORT=3000 HOST=0.0.0.0`)
  - Auth login 200 against MySQL (`socio-db`) over the `bridge` network
- Live public site `https://app.socio.id` → Caddy `:443` (Let's Encrypt) → Node `:3100` (systemd `socio-app-prod.service`) → MySQL. Cloudflare SSL = **full**.

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
