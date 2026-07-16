# ---- socio.id app (SvelteKit + adapter-node) ----
# Multi-stage build for a pnpm monorepo. Coolify builds this and runs the
# produced Node server. Expects build env vars for the DB connection.

FROM node:20-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# Install deps (uses pnpm-lock.yaml for reproducible install)
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/db/package.json packages/db/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY app/package.json app/package.json
RUN pnpm install --frozen-lockfile

# Build
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @socio/ui build || true
RUN pnpm --filter app build

# Runtime
FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
WORKDIR /app
COPY --from=build /app/app/build ./app/build
COPY --from=build /app/app/node_modules ./app/node_modules
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
WORKDIR /app/app
EXPOSE 3000
CMD ["node", "build/index.js"]
