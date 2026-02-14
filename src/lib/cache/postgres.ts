/**
 * Persistent Cache using Vercel Postgres
 *
 * Unlike in-memory cache, this survives serverless cold starts.
 * Cache entries persist across function invocations.
 *
 * Auto-migrates on first use. Falls back gracefully if Postgres unavailable.
 */

import { sql } from '@vercel/postgres';

export class PostgresCache {
  private migrationAttempted = false;
  private isAvailable = true;

  /**
   * Auto-migrate: Create table if it doesn't exist
   */
  private async ensureTable(): Promise<void> {
    if (this.migrationAttempted) return;
    this.migrationAttempted = true;

    try {
      await sql`
        CREATE TABLE IF NOT EXISTS cache_entries (
          key TEXT PRIMARY KEY,
          value JSONB NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;

      await sql`
        CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache_entries(expires_at)
      `;

      console.log('✓ Postgres cache table ready');
    } catch (error) {
      console.error('PostgresCache: Auto-migration failed, cache disabled:', error);
      this.isAvailable = false;
    }
  }
  /**
   * Get cached data by key
   * @param key - Cache key
   * @param forceReturn - If true, return even if expired (for stale-while-revalidate)
   */
  async get<T>(key: string, forceReturn = false): Promise<T | null> {
    await this.ensureTable();
    if (!this.isAvailable) return null;

    try {
      const result = await sql`
        SELECT value, expires_at
        FROM cache_entries
        WHERE key = ${key}
      `;

      if (!result.rows || result.rows.length === 0) {
        return null;
      }

      const { value, expires_at } = result.rows[0];
      const isExpired = new Date(expires_at) < new Date();

      // If expired and not forcing return, delete and return null
      if (isExpired && !forceReturn) {
        await this.delete(key);
        return null;
      }

      // Parse JSONB value
      return value as T;
    } catch (error) {
      console.error(`PostgresCache.get error for key "${key}":`, error);
      return null;
    }
  }

  /**
   * Set cached data with TTL
   * @param key - Cache key
   * @param data - Data to cache (will be JSON stringified)
   * @param ttlSeconds - Time to live in seconds
   */
  async set<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
    await this.ensureTable();
    if (!this.isAvailable) return;

    try {
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

      await sql`
        INSERT INTO cache_entries (key, value, expires_at)
        VALUES (${key}, ${JSON.stringify(data)}::jsonb, ${expiresAt.toISOString()})
        ON CONFLICT (key)
        DO UPDATE SET
          value = ${JSON.stringify(data)}::jsonb,
          expires_at = ${expiresAt.toISOString()},
          updated_at = NOW()
      `;
    } catch (error) {
      console.error(`PostgresCache.set error for key "${key}":`, error);
      // Don't throw - cache failures shouldn't break the app
    }
  }

  /**
   * Delete a cache entry
   * @param key - Cache key to delete
   */
  async delete(key: string): Promise<void> {
    try {
      await sql`DELETE FROM cache_entries WHERE key = ${key}`;
    } catch (error) {
      console.error(`PostgresCache.delete error for key "${key}":`, error);
    }
  }

  /**
   * Clear all cache entries (full cache invalidation)
   */
  async clear(): Promise<number> {
    try {
      const result = await sql`DELETE FROM cache_entries`;
      return result.rowCount || 0;
    } catch (error) {
      console.error('PostgresCache.clear error:', error);
      return 0;
    }
  }

  /**
   * Clear all expired cache entries (cleanup job)
   */
  async clearExpired(): Promise<number> {
    try {
      const result = await sql`
        DELETE FROM cache_entries
        WHERE expires_at < NOW()
      `;
      return result.rowCount || 0;
    } catch (error) {
      console.error('PostgresCache.clearExpired error:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalEntries: number;
    expiredEntries: number;
    totalSize: string;
  }> {
    try {
      const result = await sql`
        SELECT
          COUNT(*) as total_entries,
          COUNT(*) FILTER (WHERE expires_at < NOW()) as expired_entries,
          pg_size_pretty(pg_total_relation_size('cache_entries')) as total_size
        FROM cache_entries
      `;

      const row = result.rows[0];
      return {
        totalEntries: parseInt(row.total_entries) || 0,
        expiredEntries: parseInt(row.expired_entries) || 0,
        totalSize: row.total_size || '0 bytes',
      };
    } catch (error) {
      console.error('PostgresCache.getStats error:', error);
      return {
        totalEntries: 0,
        expiredEntries: 0,
        totalSize: '0 bytes',
      };
    }
  }
}

// Singleton instance
export const cache = new PostgresCache();
