import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * High-performance, in-memory TTL & LRU Cache Service with in-flight request deduplication.
 * Eliminates redundant database round-trips to remote Neon PostgreSQL.
 */
@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private readonly inFlight = new Map<string, Promise<unknown>>();
  private readonly maxCapacity = 5000;
  private readonly cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Run garbage collection on expired keys every 60 seconds
    this.cleanupInterval = setInterval(() => {
      this.evictExpired();
    }, 60000);
    this.cleanupInterval.unref();
  }

  onModuleDestroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
    this.inFlight.clear();
  }

  /**
   * Retrieve cached value if present and unexpired.
   */
  get<T>(key: string): T | undefined {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) {
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    // Refresh position for LRU semantics (delete and re-insert)
    this.store.delete(key);
    this.store.set(key, entry);

    return entry.value;
  }

  /**
   * Store a value with a specific TTL in seconds.
   */
  set<T>(key: string, value: T, ttlSeconds: number): void {
    if (this.store.size >= this.maxCapacity) {
      // Evict oldest inserted entry (first key in Map iterator)
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) {
        this.store.delete(oldestKey);
      }
    }

    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.store.set(key, { value, expiresAt });
  }

  /**
   * Retrieve cached item or execute factory function.
   * Concurrent requests for the same key share the same in-flight promise (stampede protection).
   */
  async getOrSet<T>(key: string, factory: () => Promise<T>, ttlSeconds: number): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    // Stampede protection: if already in-flight, await the existing promise
    const existingPromise = this.inFlight.get(key) as Promise<T> | undefined;
    if (existingPromise) {
      return existingPromise;
    }

    const promise = (async () => {
      try {
        const result = await factory();
        this.set(key, result, ttlSeconds);
        return result;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    return promise;
  }

  /**
   * Delete a single cache key.
   */
  delete(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Invalidate all keys matching a prefix or wildcard pattern (e.g. 'storefront:*').
   */
  invalidatePattern(pattern: string): number {
    let evicted = 0;
    const isPrefix = pattern.endsWith('*');
    const prefix = isPrefix ? pattern.slice(0, -1) : pattern;

    for (const key of this.store.keys()) {
      if (isPrefix ? key.startsWith(prefix) : key === pattern) {
        this.store.delete(key);
        evicted++;
      }
    }

    if (evicted > 0) {
      this.logger.debug(`Invalidated ${evicted} cache entries for pattern: ${pattern}`);
    }

    return evicted;
  }

  /**
   * Clear the entire cache.
   */
  clear(): void {
    this.store.clear();
    this.inFlight.clear();
  }

  /**
   * Get total number of active items in cache.
   */
  get size(): number {
    return this.store.size;
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }
}

