import { NextResponse } from "next/server";
import { getCollectionStats as getOpenSeaStats } from "@/lib/opensea/client";
import { getTotalSupply } from "@/lib/etherscan/client";
import { getEthPrice } from "@/lib/coingecko/client";
import { cache } from "@/lib/cache/postgres";
import { CACHE_TTL, CONTRACT_ADDRESS } from "@/lib/constants";
import { withTimeout, timeoutWithCache } from "@/lib/middleware/timeout";
import type { CollectionStats } from "@/types/api";

export const dynamic = "force-dynamic";

export async function GET() {
  return withTimeout(async () => {
  try {
    // Check cache first
    const cached = await cache.get<CollectionStats>("collection-stats");
    if (cached) {
      return NextResponse.json(cached);
    }

    console.log("Fetching collection stats (using OpenSea totals + intervals)...");

    // Fetch data in parallel — only fast calls, no Etherscan transfer pagination
    const [openSeaStats, totalSupply, ethPriceData] = await Promise.all([
      getOpenSeaStats(),
      getTotalSupply(CONTRACT_ADDRESS),
      getEthPrice(),
    ]);

    // Get metrics from OpenSea (source of truth for totals)
    const numOwners = openSeaStats.total.num_owners || 0;
    const floorPrice = openSeaStats.total.floor_price || 0;
    const totalVolume = openSeaStats.total.volume || 0;
    const totalSales = openSeaStats.total.sales || 0;

    console.log(`OpenSea - Owners: ${numOwners}, Floor: ${floorPrice} ETH, Total Volume: ${totalVolume} ETH`);

    // Use OpenSea interval data for 24h metrics (already available, no extra API calls)
    const oneDayInterval = openSeaStats.intervals?.find(i => i.interval === "one_day");
    const volume24h = oneDayInterval?.volume || 0;
    const sales24h = oneDayInterval?.sales || 0;
    const volume24hChange = oneDayInterval?.volume_change
      ? oneDayInterval.volume_change * 100
      : 0;

    // Calculate average price from all-time totals
    const avgPrice = totalSales > 0 ? totalVolume / totalSales : 0;

    console.log(`Calculated - Total Volume: ${totalVolume.toFixed(2)} ETH, Total Sales: ${totalSales}, Avg: ${avgPrice.toFixed(4)} ETH`);

    // Calculate market cap = floor × total supply
    const marketCap = floorPrice * totalSupply;

    const result: CollectionStats = {
      floorPrice,
      floorPriceUsd: floorPrice * ethPriceData.usd,
      totalVolume,
      totalVolumeUsd: totalVolume * ethPriceData.usd,
      totalSales,
      numOwners,
      marketCap,
      marketCapUsd: marketCap * ethPriceData.usd,
      avgPrice,
      avgPriceUsd: avgPrice * ethPriceData.usd,
      volume24h,
      volume24hUsd: volume24h * ethPriceData.usd,
      volume24hChange,
      sales24h,
      lastUpdated: new Date().toISOString(),
    };

    // Data quality check
    if (floorPrice === 0 && totalVolume === 0 && numOwners === 0) {
      console.error("CRITICAL: All key metrics are zero");

      const staleCache = await cache.get<CollectionStats>("collection-stats", true);
      if (staleCache) {
        console.log("Returning stale cached data");
        return NextResponse.json({
          ...staleCache,
          lastUpdated: new Date().toISOString(),
          _stale: true,
        });
      }

      throw new Error("Failed to fetch any valid data");
    }

    // Cache the result
    await cache.set("collection-stats", result, CACHE_TTL.COLLECTION_STATS);

    console.log(`Collection stats ready - Volume: ${totalVolume.toFixed(2)} ETH, Owners: ${numOwners}`);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching collection stats:", error);

    const staleCache = await cache.get<CollectionStats>("collection-stats", true);
    if (staleCache) {
      console.log("Returning stale cached data after error");
      return NextResponse.json({
        ...staleCache,
        lastUpdated: new Date().toISOString(),
        _stale: true,
      });
    }

    return NextResponse.json(
      { error: "Failed to fetch collection stats" },
      { status: 500 }
    );
  }
  }, timeoutWithCache(async () => {
    // Fallback to stale cache on timeout
    return await cache.get<CollectionStats>("collection-stats", true);
  }));
}
