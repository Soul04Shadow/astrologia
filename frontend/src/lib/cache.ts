/**
 * In-memory client cache with TTL and key invalidation.
 * Eliminates redundant network fetches when navigating back and forth.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

export const memoryCache = {
  get<T>(key: string): T | null {
    const entry = store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      store.delete(key);
      return null;
    }
    return entry.data as T;
  },

  set<T>(key: string, data: T, ttlSeconds: number = 180): void {
    store.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  },

  delete(key: string): void {
    store.delete(key);
  },

  invalidatePattern(pattern: RegExp | string): void {
    const regex = typeof pattern === "string" ? new RegExp(pattern) : pattern;
    for (const key of store.keys()) {
      if (regex.test(key)) {
        store.delete(key);
      }
    }
  },

  clear(): void {
    store.clear();
  },
};
