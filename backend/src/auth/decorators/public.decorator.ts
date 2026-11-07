import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * @Public() — mark a route as unauthenticated.
 * The global JwtAuthGuard skips JWT validation for routes decorated with this.
 *
 * Usage:
 *   @Public()
 *   @Post('auth/login')
 *   login() { ... }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
