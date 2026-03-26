# Build stage — needs monorepo root context
FROM oven/bun:1 AS base

WORKDIR /app

# Copy workspace manifests for cache-efficient install
COPY package.json bun.lock ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/

RUN bun install --frozen-lockfile

# Copy source
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

WORKDIR /app/apps/web

# VITE_ vars are baked into the bundle at build time
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN bun run build

# Production stage — nginx serves the static SPA
FROM nginx:alpine AS production

COPY --from=base /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
