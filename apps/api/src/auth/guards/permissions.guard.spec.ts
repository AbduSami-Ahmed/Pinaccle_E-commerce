import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { AuthenticatedUser } from '@pinnacle/contracts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildContext(_requiredPermissions: string[], userPermissions: string[]): ExecutionContext {
  const user: AuthenticatedUser = {
    sub: 'user-uuid',
    email: 'user@test.com',
    isStaff: true,
    permissions: userPermissions as AuthenticatedUser['permissions'],
  };

  const context = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({ user }),
    }),
  } as unknown as ExecutionContext;

  return context;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as Reflector;
    guard = new PermissionsGuard(reflector);
  });

  it('returns true when no @RequirePermissions decorator is present', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);
    const context = buildContext([], ['catalog:product:view']);
    (context.getHandler as jest.Mock).mockReturnValue({});
    expect(guard.canActivate(context)).toBe(true);
  });

  it('returns true when user has ALL required permissions', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue([
      'catalog:product:view',
      'catalog:product:create',
    ]);
    const ctx = buildContext(
      ['catalog:product:view', 'catalog:product:create'],
      ['catalog:product:view', 'catalog:product:create', 'catalog:product:delete'],
    );
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('throws ForbiddenException with the missing permission code', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['catalog:product:delete']);
    const ctx = buildContext(['catalog:product:delete'], ['catalog:product:view']);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    try {
      guard.canActivate(ctx);
    } catch (e) {
      expect((e as ForbiddenException).message).toContain('catalog:product:delete');
    }
  });

  it('throws ForbiddenException when user has NO permissions', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['inventory:stock:adjust']);
    const ctx = buildContext(['inventory:stock:adjust'], []);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
