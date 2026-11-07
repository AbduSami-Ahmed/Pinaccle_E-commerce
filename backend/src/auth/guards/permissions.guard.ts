import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthenticatedUser, PermissionCode } from '@pinnacle/contracts';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { Request } from 'express';

/**
 * PermissionsGuard — checks that the authenticated user holds ALL required
 * permission codes declared via @RequirePermissions().
 *
 * This guard MUST be used AFTER JwtAuthGuard (user must already be on req).
 * Apply locally per route or controller, not globally.
 *
 * Throws ForbiddenException with the first missing permission code so that
 * logs and API clients can distinguish "not authenticated" (401) from
 * "authenticated but not authorised" (403).
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<PermissionCode[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @RequirePermissions decorator → route is authenticated but permission-free
    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('No authenticated user on request');
    }

    const missingPermission = required.find((code) => !user.permissions.includes(code));

    if (missingPermission) {
      throw new ForbiddenException(`Missing required permission: ${missingPermission}`);
    }

    return true;
  }
}
