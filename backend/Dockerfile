# ==============================================================================
# PINNACLE E-COMMERCE - BACKEND API PRODUCTION DOCKERFILE
# Multi-stage minimal runtime build with non-root security isolation
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Dependencies & Compilation
# ------------------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache libc6-compat openssl
RUN corepack enable && corepack prepare pnpm@12.16.1 --activate

# Copy monorepo configuration and lockfiles
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY backend/package.json ./backend/

# Install all workspace dependencies
RUN pnpm install --frozen-lockfile

# Copy source trees
COPY packages/contracts ./packages/contracts
COPY backend ./backend

# Build shared contracts package first
RUN pnpm --filter @pinnacle/contracts build

# Generate Prisma Client for PostgreSQL
RUN cd backend && npx prisma generate

# Compile NestJS API
RUN pnpm --filter @pinnacle/api build

# Prune dev dependencies for lean production footprint
RUN pnpm --filter @pinnacle/api --prod deploy /app/pruned-backend

# ------------------------------------------------------------------------------
# Stage 2: Production Minimal Runtime
# ------------------------------------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Install minimal system utilities for healthcheck & OpenSSL for Prisma
RUN apk add --no-cache curl openssl tzdata
ENV TZ=Pacific/Auckland

# Security: Create non-root system group and user
RUN addgroup -g 10001 -S pinnacle && \
    adduser -u 10001 -S appuser -G pinnacle

# Copy pruned production node_modules from deploy
COPY --from=builder --chown=appuser:pinnacle /app/pruned-backend/node_modules ./backend/node_modules
COPY --from=builder --chown=appuser:pinnacle /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=builder --chown=appuser:pinnacle /app/backend/dist ./backend/dist
COPY --from=builder --chown=appuser:pinnacle /app/backend/prisma ./backend/prisma
COPY --from=builder --chown=appuser:pinnacle /app/backend/package.json ./backend/package.json

# Switch to unprivileged execution user
USER appuser

EXPOSE 4000

# Container Healthcheck against NestJS Health Controller
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:4000/api/v1/health || exit 1

# Launch NestJS HTTP API
CMD ["node", "backend/dist/main"]
