import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_METADATA_KEY = 'RATE_LIMIT_METADATA';

export interface RateLimitOptions {
  windowSeconds: number;
  maxRequests: number;
  message?: string;
}

/**
 * Decorator to apply custom rate limits to sensitive routes (e.g. login, checkout, search).
 */
export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_METADATA_KEY, options);

