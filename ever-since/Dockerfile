# ==============================================================================
# Multi-stage Dockerfile for EverSince (deps -> build -> runtime)
# Architecture: standard DOCKERFILE with multi-stage build (deps -> build -> runtime)
# and two volumes on data/ and media/.
# ==============================================================================

# Stage 1: Dependencies (deps)
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: Build (build)
FROM node:20-alpine AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# Stage 3: Production Runtime (runtime)
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN apk add --no-cache libc6-compat

# Security: Create and run as unprivileged non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy dependencies, built output and scripts needed for production runtime
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/lib ./lib
COPY --from=build /app/proxy.ts ./proxy.ts
COPY --from=build /app/next.config.ts ./next.config.ts

# Ensure data and media directories exist with proper permissions for nextjs user
RUN mkdir -p /app/data /app/media && \
    chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

# Mount persistent volumes for flat JSON database and uploaded media assets
VOLUME ["/app/data", "/app/media"]

# On startup, issues 20-character secret, prints to stdout log, updates db/env, and starts Next.js
CMD ["npx", "tsx", "scripts/init-secret.mjs"]
