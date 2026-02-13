/**
 * Price Enrichment Cache
 *
 * Caches OpenSea price lookups by transaction hash to minimize API calls
 * during Etherscan data enrichment. Prices are immutable (won't change once
 * a transaction is on-chain), so we can cache them indefinitely.
 */

interface PriceCache {
  txHash: string;
  priceEth: number;
  paymentToken: "ETH" | "WETH" | "OTHER";
  paymentSymbol: string;
  protocol: string;
  imageUrl: string;
  cachedAt: number;
}

// In-memory cache with Map for O(1) lookups
const priceCache = new Map<string, PriceCache>();

// Cache TTL: 24 hours (prices are immutable but we refresh occasionally to allow corrections)
const CACHE_TTL = 24 * 60 * 60 * 1000;

/**
 * Get cached price data for a transaction hash
 *
 * @param txHash - Ethereum transaction hash
 * @returns Cached price data or null if not found/expired
 */
export function getPriceCache(txHash: string): Omit<PriceCache, "txHash" | "cachedAt"> | null {
  const key = txHash.toLowerCase();
  const cached = priceCache.get(key);

  if (!cached) {
    return null;
  }

  // Check if expired
  const age = Date.now() - cached.cachedAt;
  if (age > CACHE_TTL) {
    priceCache.delete(key);
    return null;
  }

  return {
    priceEth: cached.priceEth,
    paymentToken: cached.paymentToken,
    paymentSymbol: cached.paymentSymbol,
    protocol: cached.protocol,
    imageUrl: cached.imageUrl,
  };
}

/**
 * Set price data in cache for a transaction hash
 *
 * @param txHash - Ethereum transaction hash
 * @param data - Price data to cache
 */
export function setPriceCache(
  txHash: string,
  data: {
    priceEth: number;
    paymentToken: "ETH" | "WETH" | "OTHER";
    paymentSymbol: string;
    protocol: string;
    imageUrl?: string;
  }
): void {
  const key = txHash.toLowerCase();

  priceCache.set(key, {
    txHash: key,
    priceEth: data.priceEth,
    paymentToken: data.paymentToken,
    paymentSymbol: data.paymentSymbol,
    protocol: data.protocol,
    imageUrl: data.imageUrl || "",
    cachedAt: Date.now(),
  });
}

/**
 * Clear all cached price data
 */
export function clearPriceCache(): void {
  priceCache.clear();
}

/**
 * Get cache statistics
 */
export function getPriceCacheStats(): {
  size: number;
  oldestEntry: number | null;
  newestEntry: number | null;
} {
  if (priceCache.size === 0) {
    return {
      size: 0,
      oldestEntry: null,
      newestEntry: null,
    };
  }

  let oldest = Infinity;
  let newest = 0;

  for (const entry of Array.from(priceCache.values())) {
    if (entry.cachedAt < oldest) oldest = entry.cachedAt;
    if (entry.cachedAt > newest) newest = entry.cachedAt;
  }

  return {
    size: priceCache.size,
    oldestEntry: oldest === Infinity ? null : oldest,
    newestEntry: newest === 0 ? null : newest,
  };
}

/**
 * Remove expired entries from cache
 */
export function pruneExpiredPrices(): number {
  const now = Date.now();
  let removed = 0;

  for (const [key, entry] of Array.from(priceCache.entries())) {
    const age = now - entry.cachedAt;
    if (age > CACHE_TTL) {
      priceCache.delete(key);
      removed++;
    }
  }

  return removed;
}
