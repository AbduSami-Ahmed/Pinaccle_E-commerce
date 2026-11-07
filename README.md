# Pinnacle Automotive Parts E-Commerce Platform

Production-minded automotive parts e-commerce platform engineered as a modular monolith in strict TypeScript. The initial release specializes in **tyres** (bulk inventory with single/pair/set sale unit multipliers) and **seat belts** (individually serialized, condition-graded, and vehicle fitment verified).

---

## Architecture Overview

```
├── backend/            # NestJS REST API modular monolith (Swagger, DTO validation, RBAC)
├── frontend/           # Next.js App Router (React Server Components, Tailwind CSS, shadcn)
├── packages/
│   └── contracts/      # Shared TypeScript data transfer contracts, DTOs & response schemas
├── docs/               # Architecture specifications, domain model, role-permission matrix, ADRs
├── docker-compose.yml  # Local PostgreSQL 16 development database
├── pnpm-workspace.yaml # Monorepo workspace definition
└── turbo.json          # Turborepo task pipeline orchestration
```

---

## Prerequisites

- **Node.js**: `v20.x` or `v22.x` (tested on Node `v22.13.1`)
- **Package Manager**: `pnpm >= 9.x` (`npm install -g pnpm`) or `npm >= 10.x`
- **Container Engine**: Docker & Docker Compose (for local PostgreSQL database)

---

## Quickstart & Setup

### 1. Configure Environment Variables

```bash
# Root template
cp .env.example .env

# Backend configuration
cp backend/.env.example backend/.env

# Frontend configuration
cp frontend/.env.example frontend/.env.local
```

### 2. Start Local PostgreSQL Database

```bash
pnpm docker:up
# Or: docker compose up -d
```

The database will be accessible at `localhost:5432` (`pinnacle_db` / user: `postgres` / password: `postgres`).

---

## Running the Application

You can run both ends either independently by changing into their respective folders with `npm run dev`, or from the root with `pnpm dev`.

### Option A: Independent Terminals (`npm run dev`)

**Terminal 1 — Backend API (NestJS):**
```bash
cd backend
npm run dev
```
*Backend API starts on `http://localhost:4000` with Swagger docs at `http://localhost:4000/api/docs`.*

**Terminal 2 — Frontend Web (Next.js):**
```bash
cd frontend
npm run dev
```
*Frontend storefront starts on `http://localhost:3000`.*

---

### Option B: Root Concurrent Start (`pnpm dev`)

From the repository root:
```bash
# Run both frontend and backend concurrently:
pnpm dev

# Or run services independently from root:
pnpm dev:backend   # Starts NestJS API on http://localhost:4000
pnpm dev:frontend  # Starts Next.js Storefront on http://localhost:3000
```

---

## Available Service Endpoints

| Service              | Port   | Endpoint URL                       | Description                           |
| -------------------- | ------ | ---------------------------------- | ------------------------------------- |
| **Storefront Web**   | `3000` | `http://localhost:3000`            | Next.js App Router homepage           |
| **API Health Check** | `4000` | `http://localhost:4000/api/v1/health` | Service uptime and status telemetry |
| **API Swagger Docs** | `4000` | `http://localhost:4000/api/docs`   | Interactive OpenAPI 3.0 documentation |
| **Web Health Check** | `3000` | `http://localhost:3000/api/health` | Web service health probe              |
| **PostgreSQL DB**    | `5432` | `localhost:5432`                   | PostgreSQL 16 persistent database     |

---

## Monorepo Commands

| Command             | Action                                                                         |
| ------------------- | ------------------------------------------------------------------------------ |
| `pnpm build`        | Builds all packages and applications via Turborepo (`contracts -> backend -> frontend`) |
| `pnpm type-check`   | Runs TypeScript compiler in strict mode without emitting files                 |
| `pnpm lint`         | Runs ESLint across all packages                                                |
| `pnpm test`         | Executes unit tests across backend and contracts (33 suites, 214 tests)         |
| `pnpm format:check` | Verifies code formatting with Prettier                                         |
| `pnpm format`       | Formats all code files with Prettier                                           |
| `pnpm docker:up`    | Boots local PostgreSQL container                                               |
| `pnpm docker:down`  | Gracefully shuts down PostgreSQL container                                     |

---

## Documentation Index

- [Project Overview](docs/PROJECT_OVERVIEW.md)
- [Requirements Specification](docs/REQUIREMENTS.md)
- [Role & Permission Matrix](docs/ROLE_PERMISSION_MATRIX.md)
- [System Architecture](docs/architecture/SYSTEM_ARCHITECTURE.md)
- [Domain Model & ERD](docs/architecture/DOMAIN_MODEL.md)
- [External Integration Sync Architecture](docs/INTEGRATION_SYNC_ARCHITECTURE.md)
- [Open Decisions](docs/OPEN_DECISIONS.md)
- [Architecture Decision Records (ADRs)](docs/decisions/)
- [Project Status & Roadmap](docs/PROJECT_STATUS.md)
