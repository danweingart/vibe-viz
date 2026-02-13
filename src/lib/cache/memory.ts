interface CacheEntry<T> {
  data: T;
  expires: number;
}

class CacheStore {
  private cache: Map<string, CacheEntry<unknown>> = new Map();

  async get<T>(key: string, forceReturn = false): Promise<T | null> {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    if (Date.now() > entry.expires) {
      if (forceReturn) {
        // Return stale data if explicitly requested
        return entry.data;
      }
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  async set<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
    this.cache.set(key, {
      data,
      expires: Date.now() + ttlSeconds * 1000,
    });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async invalidate(pattern: string): Promise<void> {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Singleton instance
export const cache = new CacheStore();
