# Pinnacle Automotive Parts E-Commerce Platform

Production-minded automotive parts e-commerce platform engineered as a modular monolith in strict TypeScript. The initial release specializes in **tyres** (bulk inventory with single/pair/set sale unit multipliers) and **seat belts** (individually serialized, condition-graded, and vehicle fitment verified).

---

## Architecture Overview

```
├── apps/
│   ├── api/             # NestJS REST API modular monolith (Swagger, DTO validation, RBAC)
│   └── web/             # Next.js App Router (React Server Components, Tailwind CSS, shadcn)
├── packages/
│   └── contracts/       # Shared TypeScript data transfer contracts, DTOs & response schemas
├── docs/                # Architecture specifications, domain model, role-permission matrix, ADRs
├── docker-compose.yml   # Local PostgreSQL 16 development database
├── pnpm-workspace.yaml  # pnpm monorepo workspace definition
└── turbo.json           # Turborepo task pipeline orchestration
```

---

## Prerequisites

- **Node.js**: `v20.x` or `v22.x` (tested on Node `v22.13.1`)
- **Package Manager**: `pnpm >= 9.x` (`npm install -g pnpm`)
- **Container Engine**: Docker & Docker Compose (for local PostgreSQL database)

---

## Quickstart & Setup

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/SamiMirza-Code/Pinaccle_E-commerce.git
cd Pinaccle_E-commerce

# Install monorepo dependencies across all workspaces
pnpm install
```

### 2. Configure Environment Variables

Copy the template `.env.example` files:

```bash
# Root template
cp .env.example .env

# App-specific environment configurations
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

### 3. Start Local PostgreSQL Database

```bash
pnpm docker:up
# Or: docker compose up -d
```

The database will be accessible at `localhost:5432` (`pinnacle_db` / user: `postgres` / password: `postgres`).

### 4. Build Shared Contracts & Start Development Servers

```bash
# Build contracts package first
pnpm --filter @pinnacle/contracts build

# Run both Web and API concurrently:
pnpm dev

# Or run services independently:
pnpm dev:api   # Starts NestJS API on http://localhost:4000
pnpm dev:web   # Starts Next.js Storefront on http://localhost:3000
```

---

## Available Service Endpoints

| Service              | Port   | Endpoint URL                       | Description                           |
| -------------------- | ------ | ---------------------------------- | ------------------------------------- |
| **API Health Check** | `4000` | `http://localhost:4000/health`     | Service uptime and status telemetry   |
| **API Swagger Docs** | `4000` | `http://localhost:4000/api/docs`   | Interactive OpenAPI 3.0 documentation |
| **Storefront Web**   | `3000` | `http://localhost:3000`            | Next.js App Router homepage           |
| **Web Health Check** | `3000` | `http://localhost:3000/api/health` | Web service health probe              |
| **PostgreSQL DB**    | `5432` | `localhost:5432`                   | PostgreSQL 16 persistent database     |

---

## Monorepo Commands

| Command             | Action                                                                         |
| ------------------- | ------------------------------------------------------------------------------ |
| `pnpm build`        | Builds all packages and applications via Turborepo (`contracts -> api -> web`) |
| `pnpm type-check`   | Runs TypeScript compiler in strict mode without emitting files                 |
| `pnpm lint`         | Runs ESLint across all apps and packages                                       |
| `pnpm test`         | Executes unit tests across backend and contracts                               |
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
- [Open Decisions](docs/OPEN_DECISIONS.md)
- [Architecture Decision Records (ADRs)](docs/decisions/)
- [Project Status & Roadmap](docs/PROJECT_STATUS.md)
