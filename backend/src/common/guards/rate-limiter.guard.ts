import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import {
  RATE_LIMIT_METADATA_KEY,
  RateLimitOptions,
} from '../decorators/rate-limit.decorator';

interface RateLimitRecord {
  timestamps: number[];
}

@Injectable()
export class RateLimiterGuard implements CanActivate {
  private readonly logger = new Logger(RateLimiterGuard.name);
  private readonly hits = new Map<string, RateLimitRecord>();
  private readonly CLEANUP_INTERVAL_MS = 60_000;
  private lastCleanup = Date.now();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<RateLimitOptions | undefined>(
      RATE_LIMIT_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If route is not decorated with @RateLimit, allow by default
    if (!options) {
      return true;
    }

    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const clientIdentifier = this.getClientIdentifier(req);
    const routeIdentifier = `${req.method}_${req.route?.path || req.path}`;
    const cacheKey = `${clientIdentifier}:${routeIdentifier}`;

    const now = Date.now();
    this.cleanExpired(now);

    let record = this.hits.get(cacheKey);
    if (!record) {
      record = { timestamps: [] };
      this.hits.set(cacheKey, record);
    }

    const windowMs = options.windowSeconds * 1000;
    const windowStart = now - windowMs;

    // Remove timestamps outside the sliding window
    record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

    if (record.timestamps.length >= options.maxRequests) {
      const oldestInWindow = record.timestamps[0] ?? windowStart;
      const retryAfterSeconds = Math.max(1, Math.ceil((oldestInWindow + windowMs - now) / 1000));

      if (res && typeof res.setHeader === 'function') {
        res.setHeader('Retry-After', retryAfterSeconds.toString());
      }

      this.logger.warn(
        `[RateLimiter] Rate limit exceeded for client "${clientIdentifier}" on "${routeIdentifier}" (${record.timestamps.length}/${options.maxRequests} req in ${options.windowSeconds}s). Retry in ${retryAfterSeconds}s.`,
      );

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message:
            options.message ||
            `Too many requests. You have exceeded the rate limit. Please try again in ${retryAfterSeconds} seconds.`,
          retryAfter: retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    record.timestamps.push(now);
    return true;
  }

  private getClientIdentifier(req: Request): string {
    const user = (req as any).user;
    if (user?.sub) {
      return `user_${user.sub}`;
    }

    const xForwardedFor = req.headers['x-forwarded-for'];
    if (xForwardedFor) {
      const ip = Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor.split(',')[0];
      if (ip) return ip.trim();
    }

    return req.ip || req.socket?.remoteAddress || '127.0.0.1';
  }

  private cleanExpired(now: number): void {
    if (now - this.lastCleanup < this.CLEANUP_INTERVAL_MS) {
      return;
    }

    this.lastCleanup = now;
    const maxRetentionMs = 300_000; // 5 minutes max window retention

    for (const [key, record] of this.hits.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < maxRetentionMs);
      if (record.timestamps.length === 0) {
        this.hits.delete(key);
      }
    }
  }

  /**
   * Clears internal state (useful for automated testing)
   */
  resetState(): void {
    this.hits.clear();
  }
}

