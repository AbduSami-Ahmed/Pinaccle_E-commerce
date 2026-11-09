import { SetMetadata } from '@nestjs/common';

export const CACHE_CONTROL_KEY = 'cache_control';

export interface CacheControlOptions {
  maxAge?: number;
  sMaxAge?: number;
  staleWhileRevalidate?: number;
  public?: boolean;
  private?: boolean;
  noCache?: boolean;
}

export function CacheControl(options: CacheControlOptions) {
  const parts: string[] = [];

  if (options.noCache) {
    parts.push('no-cache, no-store, must-revalidate');
  } else {
    if (options.public) parts.push('public');
    if (options.private) parts.push('private');
    if (options.maxAge !== undefined) parts.push(`max-age=${options.maxAge}`);
    if (options.sMaxAge !== undefined) parts.push(`s-maxage=${options.sMaxAge}`);
    if (options.staleWhileRevalidate !== undefined) {
      parts.push(`stale-while-revalidate=${options.staleWhileRevalidate}`);
    }
  }

  const headerValue = parts.join(', ');
  return SetMetadata(CACHE_CONTROL_KEY, headerValue);
}

