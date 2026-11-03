/**
 * Pinnacle shared contracts — Auth & permissions.
 * These types are shared between the NestJS API and Next.js frontend.
 * Do NOT import backend-specific packages here.
 */

// ---------------------------------------------------------------------------
// Health (existing)
// ---------------------------------------------------------------------------

export interface ServiceHealth {
  service?: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'ok' | 'down';
  uptimeSeconds?: number;
  timestamp: string;
  version?: string;
  environment?: string;
  services?: Record<string, string>;
}

export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorEnvelope {
  statusCode: number;
  error: string;
  message: string | string[];
  timestamp: string;
  path?: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

export type PermissionCode =
  // Catalog
  | 'catalog:product:view'
  | 'catalog:product:view_draft'
  | 'catalog:product:create'
  | 'catalog:product:update'
  | 'catalog:product:publish'
  | 'catalog:product:delete'
  | 'catalog:category:manage'
  | 'catalog:spec:manage'
  // Fitment
  | 'fitment:matrix:view'
  | 'fitment:matrix:manage'
  | 'fitment:verify'
  // Inventory
  | 'inventory:stock:view_quantity'
  | 'inventory:stock:view_cost_price'
  | 'inventory:stock:inward_bulk'
  | 'inventory:stock:serialize_item'
  | 'inventory:stock:update_location'
  | 'inventory:stock:adjust'
  | 'inventory:stock:write_off'
  | 'inventory:stock:edit_condition'
  // Orders
  | 'orders:view:own'
  | 'orders:view:all'
  | 'orders:create:customer'
  | 'orders:create:manual'
  | 'orders:override_price'
  | 'orders:status:update'
  | 'orders:fulfill:pick_pack'
  | 'orders:fulfill:dispatch'
  | 'orders:cancel:own'
  | 'orders:cancel:any'
  // Payments
  | 'payments:view:transactions'
  | 'payments:capture:manual'
  | 'payments:refund:process'
  | 'payments:view:gateway_creds'
  // Returns
  | 'returns:request:own'
  | 'returns:view:all'
  | 'returns:review:approve_reject'
  | 'returns:inspect:disposition'
  // Customers
  | 'customers:profile:own'
  | 'customers:view:directory'
  | 'customers:view:pii_contact'
  | 'customers:gdpr:anonymize'
  // Staff
  | 'staff:users:view'
  | 'staff:users:manage'
  | 'staff:roles:assign'
  // Audit
  | 'audit:logs:view'
  // System
  | 'system:settings:manage';

// ---------------------------------------------------------------------------
// Authenticated User (JWT payload shape — same in local dev and Cognito modes)
// ---------------------------------------------------------------------------

export interface AuthenticatedUser {
  /** User UUID (Prisma User.id) */
  sub: string;
  email: string;
  isStaff: boolean;
  /** Resolved permission codes — checked by PermissionsGuard */
  permissions: PermissionCode[];
  /** Set when the user holds the CUSTOMER role; used for ownership checks */
  customerId?: string;
}

// ---------------------------------------------------------------------------
// Auth API response shapes (safe — never includes passwordHash)
// ---------------------------------------------------------------------------

export interface UserDto {
  id: string;
  email: string;
  isActive: boolean;
  isStaff: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface LoginResponseDto {
  user: UserDto;
  /** Only present in local-dev mode; not emitted in Cognito mode (cookie only). */
  accessToken?: string;
}
