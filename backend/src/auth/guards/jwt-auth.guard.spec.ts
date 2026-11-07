import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeContext(isPublic: boolean, userOnRequest: unknown = null) {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(isPublic),
  } as unknown as Reflector;

  const guard = new JwtAuthGuard(reflector);

  // Spy on the parent AuthGuard canActivate to simulate token validation
  const superCanActivate = jest
    .spyOn(
      Object.getPrototypeOf(Object.getPrototypeOf(guard)) as { canActivate: () => boolean },
      'canActivate',
    )
    .mockReturnValue(true as unknown as boolean);

  const mockContext = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({ user: userOnRequest }),
    }),
  } as unknown as ExecutionContext;

  return { guard, mockContext, reflector, superCanActivate };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('JwtAuthGuard', () => {
  it('allows @Public() routes without a token', () => {
    const { guard, mockContext } = makeContext(true);
    expect(guard.canActivate(mockContext)).toBe(true);
  });

  it('calls super.canActivate for protected routes', () => {
    const { guard, mockContext, superCanActivate } = makeContext(false);
    guard.canActivate(mockContext);
    expect(superCanActivate).toHaveBeenCalled();
  });

  it('throws UnauthorizedException when no user is on request', () => {
    const reflector = new Reflector();
    const guard = new JwtAuthGuard(reflector);
    expect(() => guard.handleRequest(null, null)).toThrow(UnauthorizedException);
  });

  it('throws provided error if passport returns an error', () => {
    const reflector = new Reflector();
    const guard = new JwtAuthGuard(reflector);
    const err = new UnauthorizedException('token expired');
    expect(() => guard.handleRequest(err, null)).toThrow(err);
  });

  it('returns the user object when authentication succeeds', () => {
    const reflector = new Reflector();
    const guard = new JwtAuthGuard(reflector);
    const user = { sub: 'uuid', email: 'a@b.com', isStaff: false, permissions: [] };
    expect(guard.handleRequest(null, user)).toBe(user);
  });
});
