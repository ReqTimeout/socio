FROM node:22-slim

# SEO engine runner socio.id — ZERO DEPENDENCY (node:crypto + global fetch).
# Karena tanpa dependency, tidak ada pnpm/npm install di dalam image: build
# cepat dan tidak pernah gagal karena lockfile.
LABEL org.opencontainers.image.title="socio-seo-runner" \
      org.opencontainers.image.description="IndexNow + Bing submit + GSC URL Inspection + ramp-gate untuk socio.id"

WORKDIR /app

# paths.mjs membaca env ini; default ke /app/seo/*.json kalau kosong.
ENV NODE_ENV=production \
    TZ=Asia/Jakarta \
    SEO_STATE_PATH=/app/data/state.json \
    SEO_CONFIG_PATH=/app/data/config.json \
    GSC_SITE_URL=sc-domain:socio.id

# Salin hanya yang dibutuhkan runtime (JANGAN seluruh repo — ada .env & secret).
COPY package.json ./package.json
COPY seo ./seo
COPY runner ./runner

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
