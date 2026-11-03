import { SetMetadata } from '@nestjs/common';
import { PermissionCode } from '@pinnacle/contracts';

export const PERMISSIONS_KEY = 'permissions';

/**
 * @RequirePermissions(...codes) — attach required permission codes to a route.
 * The PermissionsGuard reads this metadata and enforces it.
 *
 * Usage:
 *   @RequirePermissions('catalog:product:create', 'catalog:product:update')
 *   @Post('products')
 *   create() { ... }
 */
export const RequirePermissions = (...permissions: PermissionCode[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
