import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimiterGuard } from './rate-limiter.guard';

describe('RateLimiterGuard', () => {
  let guard: RateLimiterGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RateLimiterGuard(reflector);
    guard.resetState();
  });

  function createMockContext(ip = '192.168.1.100', route = '/api/v1/auth/login', user?: any): ExecutionContext {
    const mockRequest = {
      ip,
      method: 'POST',
      path: route,
      route: { path: route },
      headers: {},
      user,
    };

    const mockResponse = {
      setHeader: jest.fn(),
    };

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
  }

  it('allows requests through when no @RateLimit metadata is attached', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createMockContext();
    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows requests within specified rate limit threshold', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      windowSeconds: 60,
      maxRequests: 3,
    });

    const context = createMockContext();
    expect(guard.canActivate(context)).toBe(true);
    expect(guard.canActivate(context)).toBe(true);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('blocks request with HTTP 429 when threshold is exceeded', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      windowSeconds: 60,
      maxRequests: 2,
    });

    const context = createMockContext();
    expect(guard.canActivate(context)).toBe(true);
    expect(guard.canActivate(context)).toBe(true);

    try {
      guard.canActivate(context);
      fail('Expected RateLimiterGuard to throw HttpException');
    } catch (err) {
      expect(err).toBeInstanceOf(HttpException);
      expect((err as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      const res = (err as HttpException).getResponse() as any;
      expect(res.statusCode).toBe(429);
      expect(res.retryAfter).toBeGreaterThanOrEqual(1);
    }
  });

  it('tracks distinct IP addresses independently', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      windowSeconds: 60,
      maxRequests: 1,
    });

    const contextA = createMockContext('10.0.0.1');
    const contextB = createMockContext('10.0.0.2');

    expect(guard.canActivate(contextA)).toBe(true);
    expect(guard.canActivate(contextB)).toBe(true); // Different IP is allowed

    expect(() => guard.canActivate(contextA)).toThrow(HttpException);
    expect(() => guard.canActivate(contextB)).toThrow(HttpException);
  });

  it('prefers authenticated user.sub over IP for user-specific throttling', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      windowSeconds: 60,
      maxRequests: 1,
    });

    const contextUserA = createMockContext('192.168.1.1', '/checkout', { sub: 'cust-uuid-1' });
    const contextUserB = createMockContext('192.168.1.1', '/checkout', { sub: 'cust-uuid-2' });

    expect(guard.canActivate(contextUserA)).toBe(true);
    expect(guard.canActivate(contextUserB)).toBe(true); // Different user from same shared NAT IP is allowed

    expect(() => guard.canActivate(contextUserA)).toThrow(HttpException);
  });
});

