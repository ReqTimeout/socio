FROM node:22-slim

# SEO engine runner socio.id.
#
# PERUBAHAN 4 Okt 2026 — image ini dulu ZERO DEPENDENCY (cuma node:crypto + global
# fetch) sehingga `publish` tidak bisa jalan: image-nya tidak punya source
# `landing/`, jadi tidak bisa build Astro sama sekali. Itu sebabnya `daily.mjs`
# menulis "publish: belum aktif — no-op eksplisit".
#
# Sekarang image ini BISA build landing + deploy Cloudflare Pages. Konsekuensinya
# image tidak lagi zero-dependency: ada pnpm install. Yang tetap nol dependency
# adalah skrip `seo/` dan `runner/` sendiri (tidak ada dependency npm di sana),
# jadi kalau install gagal, indexer/ramp-gate TETAP jalan — hanya publish yang mati.
#
# Sifat penting: build landing terjadi saat RUNTIME (setelah draft di-flip),
# bukan saat `docker build`. Jadi `docker build` hanya perlu `pnpm install`.
LABEL org.opencontainers.image.title="socio-seo-runner" \
      org.opencontainers.image.description="Generate + publish + IndexNow + Bing + GSC URL Inspection + ramp-gate untuk socio.id"

WORKDIR /app

ENV NODE_ENV=production \
    TZ=Asia/Jakarta \
    SEO_STATE_PATH=/app/data/state.json \
    SEO_CONFIG_PATH=/app/data/config.json \
    GSC_SITE_URL=sc-domain:socio.id \
    PNPM_HOME=/usr/local/pnpm \
    PATH=/usr/local/pnpm:$PATH

# pnpm via corepack (lockfile repo ditulis untuk pnpm 9).
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

# wrangler dipakai `seo/publish.mjs` untuk `wrangler pages deploy`. Dipasang global
# supaya deterministik — `npx wrangler` akan mengunduh tiap kali dan bisa gagal
# karena timeout saat pipeline unattended.
RUN npm i -g wrangler@4

# lightningcss (@tailwindcss/vite) & friends mengunduh binary prebuilt per-platform.
# Kalau image ini dibangun untuk arm64 tapi runtime-nya amd64 (atau sebaliknya),
# `pnpm install` tetap lolos tapi build Astro gagal. bookworm multi-arch aman.
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# ── manifest workspace dulu, supaya layer install di-cache dan tidak dibangun
#    ulang tiap kali source berubah ────────────────────────────────────────────
# pnpm-workspace.yaml MENCAKUP `app` juga. Memasang seluruh workspace akan menarik
# SvelteKit + Drizzle + better-auth ke image yang tidak memakainya, jadi di-install
# HANYA subtree landing beserta dependency workspace-nya (`...` = beserta turunannya,
# yaitu @socio/ui).
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY landing/package.json ./landing/package.json
COPY packages/ui/package.json ./packages/ui/package.json
RUN pnpm install --frozen-lockfile --filter 'landing...'

# ── source runtime ───────────────────────────────────────────────────────────
# JANGAN `COPY . .` — ada .env, accountcf.md, dan repo app yang tidak boleh masuk image.
COPY seo ./seo
COPY runner ./runner
COPY landing ./landing
COPY packages/ui ./packages/ui

# node_modules untuk @socio/ui dibuat ulang oleh symlink pnpm; pastikan ikut.
RUN test -e /app/landing/node_modules/.bin/astro \
 && echo "  astro terpasang" \
 || (echo "FATAL: astro tidak terpasang — pnpm install --filter landing... gagal" && exit 1)

# Volume untuk state.json + config.json (bukan di image, supaya tidak hilang
# tiap container di-recreate Coolify).
VOLUME ["/app/data"]

# Seed state awal (dipakai sekali saat /app/data masih kosong).
RUN mkdir -p /app/data && cp /app/seo/state.seed.json /app/data/state.json \
 && cp /app/seo/config.json /app/data/config.json

# CMD = idle, BUKAN pipeline. Coolify menganggap application sebagai service dan
# akan me-restart container yang langsung exit; Scheduled Task menjalankan
# `node runner/daily.mjs` / `weekly.mjs` di dalam container ini.
CMD ["node", "runner/idle.mjs"]
