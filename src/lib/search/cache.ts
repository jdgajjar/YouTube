/**
 * In-Memory Cache for Search Results
 * Lightweight caching system optimized for Render free tier
 * LRU eviction policy to manage memory usage
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hits: number;
}

export class SearchCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private ttl: number; // Time to live in milliseconds
  private maxSize: number; // Maximum number of entries

  constructor(ttlSeconds: number = 300, maxSize: number = 100) {
    this.ttl = ttlSeconds * 1000;
    this.maxSize = maxSize;
  }

  /**
   * Generate cache key from query parameters
   */
  private generateKey(params: Record<string, any>): string {
    return JSON.stringify(params);
  }

  /**
   * Get cached data
   */
  get(params: Record<string, any>): T | null {
    const key = this.generateKey(params);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check if expired
    const now = Date.now();
    if (now - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Update hit count
    entry.hits++;
    return entry.data;
  }

  /**
   * Set cache data
   */
  set(params: Record<string, any>, data: T): void {
    const key = this.generateKey(params);

    // If cache is full, evict least recently used entry
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      hits: 0,
    });
  }

  /**
   * Evict least recently used (LRU) entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    this.cache.forEach((entry, key) => {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Clear expired entries
   */
  clearExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > this.ttl) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    totalHits: number;
    entries: Array<{ key: string; hits: number; age: number }>;
  } {
    const now = Date.now();
    let totalHits = 0;
    const entries: Array<{ key: string; hits: number; age: number }> = [];

    this.cache.forEach((entry, key) => {
      totalHits += entry.hits;
      entries.push({
        key,
        hits: entry.hits,
        age: Math.floor((now - entry.timestamp) / 1000),
      });
    });

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      totalHits,
      entries: entries.sort((a, b) => b.hits - a.hits),
    };
  }

  /**
   * Check if key exists and is valid
   */
  has(params: Record<string, any>): boolean {
    const key = this.generateKey(params);
    const entry = this.cache.get(key);

    if (!entry) return false;

    const now = Date.now();
    if (now - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Invalidate specific cache entries by pattern
   */
  invalidate(pattern: RegExp): number {
    let count = 0;
    const keysToDelete: string[] = [];

    this.cache.forEach((_, key) => {
      if (pattern.test(key)) {
        keysToDelete.push(key);
        count++;
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));
    return count;
  }

  /**
   * Get memory usage estimate (in bytes)
   */
  getMemoryUsage(): number {
    let size = 0;

    this.cache.forEach((entry, key) => {
      // Rough estimate: key + data JSON length
      size += key.length * 2; // UTF-16 encoding
      size += JSON.stringify(entry.data).length * 2;
      size += 16; // timestamp + hits overhead
    });

    return size;
  }
}

/**
 * Global search cache instance
 * Singleton pattern to ensure single cache across application
 */
let globalSearchCache: SearchCache<any> | null = null;

export function getSearchCache<T>(): SearchCache<T> {
  if (!globalSearchCache) {
    // 5 minutes TTL, max 100 entries
    globalSearchCache = new SearchCache<T>(300, 100);
  }
  return globalSearchCache as SearchCache<T>;
}

/**
 * Clear the global cache (useful for testing)
 */
export function clearGlobalCache(): void {
  if (globalSearchCache) {
    globalSearchCache.clear();
  }
}

/**
 * Cache key generator utilities
 */
export const CacheKeys = {
  search: (query: string, page: number, filters: any) => ({
    type: 'search',
    query: query.toLowerCase().trim(),
    page,
    filters,
  }),

  trending: (timeRange: string, limit: number) => ({
    type: 'trending',
    timeRange,
    limit,
  }),

  recommendations: (videoId: string, limit: number) => ({
    type: 'recommendations',
    videoId,
    limit,
  }),
};
