/**
 * Price Enrichment Cache
 *
 * Two-tier caching strategy for OpenSea price lookups:
 * - L1: In-memory LRU cache (1000 entries max) for hot data
 * - L2: Postgres persistent cache for all historical prices
 *
 * Prices are immutable (won't change once on-chain), so L2 cache is permanent.
 * This eliminates N+1 queries by avoiding repeated OpenSea API calls for the same tx_hash.
 */

import { sql } from "@vercel/postgres";
import { withRetry, trackDatabaseOperation } from "@/lib/db/connection";

interface PriceCache {
  txHash: string;
  priceEth: number;
  paymentToken: "ETH" | "WETH" | "OTHER";
  paymentSymbol: string;
  protocol: string;
  imageUrl: string;
  cachedAt: number;
}

// L1 Cache: In-memory LRU cache (hot data, fast access)
const L1_MAX_SIZE = 1000; // Keep only 1000 most recent entries
const l1Cache = new Map<string, PriceCache>();
const l1AccessOrder: string[] = []; // Track access order for LRU

// Auto-prune counter - run cleanup every N operations
let operationCount = 0;
const PRUNE_INTERVAL = 100;

/**
 * LRU eviction - remove least recently used entries when cache is full
 */
function evictLRU(): void {
  if (l1Cache.size >= L1_MAX_SIZE && l1AccessOrder.length > 0) {
    const oldestKey = l1AccessOrder.shift();
    if (oldestKey) {
      l1Cache.delete(oldestKey);
    }
  }
}

/**
 * Update LRU access order
 */
function touchLRU(key: string): void {
  // Remove from current position
  const index = l1AccessOrder.indexOf(key);
  if (index !== -1) {
    l1AccessOrder.splice(index, 1);
  }
  // Add to end (most recently used)
  l1AccessOrder.push(key);
}

/**
 * Get cached price data for a transaction hash
 * Checks L1 (in-memory) first, then L2 (Postgres) if miss
 *
 * @param txHash - Ethereum transaction hash
 * @returns Cached price data or null if not found
 */
export async function getPriceCache(txHash: string): Promise<Omit<PriceCache, "txHash" | "cachedAt"> | null> {
  const key = txHash.toLowerCase();

  // L1 Cache check (in-memory, fast)
  const l1Hit = l1Cache.get(key);
  if (l1Hit) {
    touchLRU(key);
    return {
      priceEth: l1Hit.priceEth,
      paymentToken: l1Hit.paymentToken,
      paymentSymbol: l1Hit.paymentSymbol,
      protocol: l1Hit.protocol,
      imageUrl: l1Hit.imageUrl,
    };
  }

  // L2 Cache check (Postgres, slower but persistent)
  try {
    const result = await withRetry(async () => {
      return await sql`
        SELECT price_eth, price_usd, payment_token, payment_symbol, protocol, image_url
        FROM price_cache
        WHERE tx_hash = ${key}
        LIMIT 1
      `;
    });

    if (result.rows && result.rows.length > 0) {
      const row = result.rows[0];
      const data = {
        priceEth: parseFloat(row.price_eth),
        paymentToken: row.payment_token as "ETH" | "WETH" | "OTHER",
        paymentSymbol: row.payment_symbol || "",
        protocol: row.protocol || "",
        imageUrl: row.image_url || "",
      };

      // Populate L1 cache for faster subsequent access
      evictLRU();
      l1Cache.set(key, {
        txHash: key,
        ...data,
        cachedAt: Date.now(),
      });
      touchLRU(key);

      trackDatabaseOperation(true);
      return data;
    }

    trackDatabaseOperation(true);
  } catch (error) {
    trackDatabaseOperation(false);
    console.error(`Failed to fetch price from L2 cache for ${key}:`, error);
    // Fall through to return null
  }

  return null;
}

/**
 * Set price data in cache for a transaction hash
 * Writes to both L1 (in-memory) and L2 (Postgres) caches
 *
 * @param txHash - Ethereum transaction hash
 * @param data - Price data to cache
 */
export async function setPriceCache(
  txHash: string,
  data: {
    priceEth: number;
    paymentToken: "ETH" | "WETH" | "OTHER";
    paymentSymbol: string;
    protocol: string;
    imageUrl?: string;
  }
): Promise<void> {
  const key = txHash.toLowerCase();

  // L1 Cache (in-memory)
  evictLRU();
  l1Cache.set(key, {
    txHash: key,
    priceEth: data.priceEth,
    paymentToken: data.paymentToken,
    paymentSymbol: data.paymentSymbol,
    protocol: data.protocol,
    imageUrl: data.imageUrl || "",
    cachedAt: Date.now(),
  });
  touchLRU(key);

  // L2 Cache (Postgres) - write asynchronously, don't block on failure
  try {
    await withRetry(async () => {
      return await sql`
        INSERT INTO price_cache (tx_hash, price_eth, payment_token, payment_symbol, protocol, image_url)
        VALUES (
          ${key},
          ${data.priceEth},
          ${data.paymentToken},
          ${data.paymentSymbol},
          ${data.protocol},
          ${data.imageUrl || ""}
        )
        ON CONFLICT (tx_hash) DO UPDATE SET
          price_eth = ${data.priceEth},
          payment_token = ${data.paymentToken},
          payment_symbol = ${data.paymentSymbol},
          protocol = ${data.protocol},
          image_url = ${data.imageUrl || ""},
          updated_at = NOW()
      `;
    });
    trackDatabaseOperation(true);
  } catch (error) {
    trackDatabaseOperation(false);
    console.error(`Failed to write price to L2 cache for ${key}:`, error);
    // Don't throw - cache failures shouldn't break the app
  }

  // Auto-prune every N operations
  operationCount++;
  if (operationCount % PRUNE_INTERVAL === 0) {
    pruneExpiredPrices();
  }
}

/**
 * Clear all cached price data (L1 only - L2 is permanent)
 */
export function clearPriceCache(): void {
  l1Cache.clear();
  l1AccessOrder.length = 0;
}

/**
 * Get cache statistics
 */
export async function getPriceCacheStats(): Promise<{
  l1Size: number;
  l2Size: number;
  l1OldestEntry: number | null;
  l1NewestEntry: number | null;
}> {
  let l2Size = 0;
  try {
    const result = await sql`SELECT COUNT(*) as count FROM price_cache`;
    l2Size = parseInt(result.rows[0]?.count || "0");
  } catch (error) {
    console.error("Failed to get L2 cache size:", error);
  }

  if (l1Cache.size === 0) {
    return {
      l1Size: 0,
      l2Size,
      l1OldestEntry: null,
      l1NewestEntry: null,
    };
  }

  let oldest = Infinity;
  let newest = 0;

  for (const entry of Array.from(l1Cache.values())) {
    if (entry.cachedAt < oldest) oldest = entry.cachedAt;
    if (entry.cachedAt > newest) newest = entry.cachedAt;
  }

  return {
    l1Size: l1Cache.size,
    l2Size,
    l1OldestEntry: oldest === Infinity ? null : oldest,
    l1NewestEntry: newest === 0 ? null : newest,
  };
}

/**
 * Remove expired entries from L1 cache only
 * L2 cache is permanent (prices are immutable)
 */
export function pruneExpiredPrices(): number {
  // L1 cache has LRU eviction, so we just enforce the size limit
  let removed = 0;
  while (l1Cache.size > L1_MAX_SIZE && l1AccessOrder.length > 0) {
    const oldestKey = l1AccessOrder.shift();
    if (oldestKey && l1Cache.delete(oldestKey)) {
      removed++;
    }
  }
  return removed;
}
