# ==============================================================================
# PINNACLE E-COMMERCE - FRONTEND NEXT.JS PRODUCTION DOCKERFILE
# Multi-stage standalone output build with non-root execution
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build Dependencies & Next.js Compilation
# ------------------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@12.16.1 --activate

# Copy monorepo configuration
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY frontend/package.json ./frontend/

# Install workspace dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/contracts ./packages/contracts
COPY frontend ./frontend

# Build shared contracts package
RUN pnpm --filter @pinnacle/contracts build

# Build Next.js application with standalone output enabled for containerization
ENV NEXT_STANDALONE=true
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN pnpm --filter @pinnacle/web build

# ------------------------------------------------------------------------------
# Stage 2: Production Minimal Runner
# ------------------------------------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache curl tzdata
ENV TZ=Pacific/Auckland

# Security: Create non-root unprivileged group and user
RUN addgroup -g 10001 -S nodejs && \
    adduser -u 10001 -S nextjs -G nodejs

# Create public dir if omitted in build to prevent copy failure
RUN mkdir -p ./frontend/public

# Copy standalone build bundle
COPY --from=builder --chown=nextjs:nodejs /app/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/frontend/.next/static ./frontend/.next/static

# Switch to non-root user
USER nextjs

EXPOSE 3000

# Healthcheck against Next.js health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["node", "frontend/server.js"]
