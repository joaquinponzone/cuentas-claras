# Build stage — needs monorepo root context
FROM oven/bun:1 AS base

WORKDIR /app

# Copy workspace manifests for cache-efficient install
COPY package.json bun.lock ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

RUN bun install --frozen-lockfile

# Copy source
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

WORKDIR /app/apps/api

# Bundle everything (shared package included) into a single file
RUN bun run build

# Production stage — just the bundle, no deps needed
FROM oven/bun:1-slim AS production

WORKDIR /app

COPY --from=base /app/apps/api/dist/index.js ./index.js

USER bun

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun --version || exit 1

CMD ["bun", "index.js"]
