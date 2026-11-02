# ADR 0001: Modular Monolith Architecture and Domain Separation

## Status

Accepted (Governing Architecture)

## Context

We are designing a production-minded automotive parts e-commerce platform. Initial product categories are tyres (quantity-tracked, sold in single/pair/set sale units mapped to base stock) and seat belts (individually tracked used/refurbished items with unique identifiers, condition notes, photos, and fitment verification).

The platform requires both a high-performance customer-facing storefront and a secure administrative back-office with fine-grained permission-based access control.

## Decisions

### 1. Architectural Pattern: Modular Monolith

- We will build the backend as a NestJS modular monolith.
- We reject microservices at this stage to avoid premature network partitioning, distributed transaction complexity, and operational overhead.
- Direct cross-module database access is prohibited; modules must interact via defined service interfaces or internal events.
- The web frontend (Next.js) will communicate exclusively with the NestJS REST API. The browser will never access PostgreSQL or Prisma directly.

### 2. Separation of Product, Inventory, and Sale Units

- **Catalogue Definition**: Defines generic product metadata (brand, model, category, specifications like tyre width/aspect/rim or seat belt position/mounting).
- **Physical Inventory**: Models physical stock.
  - _Bulk/Quantity items (Tyres)_: Base units tracked by quantity and warehouse location.
  - _Individually tracked items (Used Seat Belts)_: Tracked by unique stock ID / serial number, physical condition grade, condition notes, inspection photos, and vehicle fitment verification.
- **Sale Units**: Defines what the customer purchases (e.g., a tyre sold as single, pair of 2, or set of 4). Maps to the number of base inventory units consumed upon reservation and fulfillment.
- **Inventory Movements & Reservations**: Any reservation, allocation, adjustment, or write-off must be performed via database transactions with audit logging.

### 3. Security & Permission-Based RBAC

- Hardcoded role checks (`if (role === 'admin')`) are prohibited in business logic.
- Access control is governed by granular permissions (e.g., `inventory:read`, `inventory:adjust`, `orders:manage`, `pricing:view_cost`).
- Roles (Super Admin, Business Admin, Catalog Manager, Inventory Manager, Sales Manager, Support, Customer) represent predefined permission bundles.
- All permissions are strictly enforced on backend endpoints. Frontend visibility toggles are strictly for user experience, not security.
- Customer accounts are restricted strictly to tenant/owner boundaries (a customer can only read or mutate their own cart, orders, and addresses).

### 4. Code Quality & Integration Standards

- TypeScript in `strict` mode with zero tolerance for arbitrary `any` or suppressed type checks.
- DTO validation on all external inputs via `class-validator` / `zod`.
- Provider-agnostic adapter boundaries for all external integrations (payments, storage, email).
- Idempotency mechanisms for payment hooks and transactional events.

## Consequences

- Clean, testable, and maintainable codebase with explicit bounded contexts.
- Evolution path towards extracted microservices remains possible in the future if domain traffic demands it, without requiring redesign of domain boundaries.
