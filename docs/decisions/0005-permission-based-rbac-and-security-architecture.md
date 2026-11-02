# ADR 0005: Permission-Based RBAC and API-Boundary Security

## Status

Accepted

## Context

Administrative roles in an automotive e-commerce operation have varying responsibilities:

- Warehouse workers need to inward tyres, scan seat belts, and update bin locations, but should not see wholesale cost margins or execute arbitrary price discounts.
- Customer support agents need to process returns and look up customer orders, but should not be issuing uninspected credit card refunds or publishing new catalogue items.
- In many applications, security is implemented via hardcoded role checks (`if (user.role === 'admin')`) or scattered UI conditions. This is fragile, difficult to audit, and insecure.

## Decision

We enforce a **Granular Permission-Based RBAC Architecture**:

1. **Permission as Atomic Unit**:
   - Security checks evaluate atomic string permissions formatted as `domain:resource:action` (e.g., `inventory:stock:adjust`, `orders:price:override`, `payments:refund:execute`).
   - Hardcoded role names are forbidden in business logic and controllers.
2. **Roles as Permission Bundles**:
   - Roles (e.g., `SUPER_ADMIN`, `CATALOG_MGR`, `INVENTORY_MGR`) are database-backed groups of granular permissions.
   - Users are assigned roles, and permissions are resolved dynamically upon authentication.
3. **Backend API Boundary Enforcement**:
   - All authorization checks are executed at the NestJS API layer using custom `@RequirePermissions(...)` decorators and a global `PermissionsGuard`.
   - UI button hiding in Next.js is strictly an ergonomic feature and is never relied upon for authorization.
4. **Tenant Isolation for Customers**:
   - Customer tokens are restricted to resources where `customer_id == user.id`. Ownership guards prevent customer A from accessing customer B's cart, orders, or profile.
5. **Confidential Price Protection & Audit Logging**:
   - Wholesale cost prices (`cost_price`) are scrubbed from API serialization unless the caller possesses the explicit `inventory:stock:view_cost_price` permission.
   - All state mutations by staff trigger immutable audit entries in the `AuditLog` table.

## Consequences

- Highly auditable and configurable authorization system.
- Zero risk of security bypasses due to client-side manipulation.
- Flexible role modifications without requiring application code changes.
