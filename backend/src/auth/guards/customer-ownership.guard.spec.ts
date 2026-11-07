import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { CustomerOwnershipGuard } from './customer-ownership.guard';
import { AuthenticatedUser } from '@pinnacle/contracts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildContext(
  user: Partial<AuthenticatedUser>,
  params: Record<string, string>,
): ExecutionContext {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({ user, params }),
    }),
  } as unknown as ExecutionContext;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CustomerOwnershipGuard', () => {
  let guard: CustomerOwnershipGuard;

  beforeEach(() => {
    guard = new CustomerOwnershipGuard();
  });

  it('allows a customer to access their OWN resource', () => {
    const ctx = buildContext(
      {
        sub: 'user-1',
        email: 'c@test.com',
        isStaff: false,
        customerId: 'cust-abc',
        permissions: ['customers:profile:own'],
      },
      { customerId: 'cust-abc' },
    );

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('throws ForbiddenException when customer tries to access ANOTHER customer resource', () => {
    const ctx = buildContext(
      {
        sub: 'user-1',
        email: 'c@test.com',
        isStaff: false,
        customerId: 'cust-abc',
        permissions: ['customers:profile:own'],
      },
      { customerId: 'cust-xyz' }, // Different customer
    );

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('allows staff with customers:view:directory to bypass ownership check', () => {
    const ctx = buildContext(
      {
        sub: 'staff-1',
        email: 'staff@test.com',
        isStaff: true,
        customerId: undefined,
        permissions: ['customers:view:directory', 'customers:view:pii_contact'],
      },
      { customerId: 'cust-xyz' },
    );

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('returns true when no customerId route param exists (guard is a no-op)', () => {
    const ctx = buildContext(
      {
        sub: 'user-1',
        email: 'c@test.com',
        isStaff: false,
        customerId: 'cust-abc',
        permissions: ['customers:profile:own'],
      },
      {}, // No customerId param
    );

    expect(guard.canActivate(ctx)).toBe(true);
  });
});
