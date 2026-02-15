import { NextResponse } from "next/server";
import { getCollectionStats as getOpenSeaStats, getBestListing, parseListingPrice } from "@/lib/opensea/client";
import {
  getTransfersInDateRange,
  filterToSalesOnly,
  getTotalSupply,
} from "@/lib/etherscan/client";
import { getEthPrice } from "@/lib/coingecko/client";
import {
  enrichTransfersWithPrices,
  transformToSaleRecords,
} from "@/lib/etherscan/transformer";
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

    console.log("Fetching collection stats (using OpenSea totals + last 30d from Etherscan)...");

    // Fetch data in parallel:
    // - OpenSea stats (has total volume, owners, floor price)
    // - Last 30 days from Etherscan (for recent activity metrics)
    // - ETH price
    const [openSeaStats, recentTransfers, totalSupply, ethPriceData] = await Promise.all([
      getOpenSeaStats(),
      getTransfersInDateRange(30, CONTRACT_ADDRESS), // Only last 30 days
      getTotalSupply(CONTRACT_ADDRESS),
      getEthPrice(),
    ]);

    // Get metrics from OpenSea (source of truth for totals)
    const numOwners = openSeaStats.total.num_owners || 0;
    const floorPrice = openSeaStats.total.floor_price || 0;
    const totalVolume = openSeaStats.total.volume || 0; // OpenSea has all-time volume
    const totalSales = openSeaStats.total.sales || 0; // OpenSea has all-time sales count

    console.log(`OpenSea - Owners: ${numOwners}, Floor: ${floorPrice} ETH, Total Volume: ${totalVolume} ETH`);

    // Calculate 30D metrics from recent Etherscan data
    const salesTransfers = filterToSalesOnly(recentTransfers);
    console.log(`Etherscan - Found ${salesTransfers.length} sales in last 30 days`);

    // Enrich with OpenSea prices
    const enriched = await enrichTransfersWithPrices(salesTransfers, ethPriceData.usd);
    const recentSales = transformToSaleRecords(enriched);

    console.log(`Enriched ${recentSales.length}/${salesTransfers.length} recent sales with prices`);

    // Calculate average price from all-time totals
    const avgPrice = totalSales > 0 ? totalVolume / totalSales : 0;

    console.log(`Calculated - Total Volume: ${totalVolume.toFixed(2)} ETH, Total Sales: ${totalSales}, Avg: ${avgPrice.toFixed(4)} ETH`);

    // Calculate market cap = floor × total supply
    const marketCap = floorPrice * totalSupply;

    // Calculate 24h stats from recent sales data
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const twoDaysAgo = Date.now() - 48 * 60 * 60 * 1000;

    const sales24h = recentSales.filter(s => s.timestamp.getTime() >= oneDayAgo);
    const salesPrev24h = recentSales.filter(s =>
      s.timestamp.getTime() >= twoDaysAgo && s.timestamp.getTime() < oneDayAgo
    );

    const volume24h = sales24h.reduce((sum, s) => sum + s.priceEth, 0);
    const volumePrev24h = salesPrev24h.reduce((sum, s) => sum + s.priceEth, 0);

    const volume24hChange = volumePrev24h > 0
      ? ((volume24h - volumePrev24h) / volumePrev24h) * 100
      : 0;

    const result: CollectionStats = {
      floorPrice, // From OpenSea
      floorPriceUsd: floorPrice * ethPriceData.usd,
      totalVolume, // From OpenSea (all-time totals)
      totalVolumeUsd: totalVolume * ethPriceData.usd,
      totalSales, // From OpenSea (all-time totals)
      numOwners, // From OpenSea
      marketCap, // Calculated: floor × supply
      marketCapUsd: marketCap * ethPriceData.usd,
      avgPrice, // Calculated from totals
      avgPriceUsd: avgPrice * ethPriceData.usd,
      volume24h, // From recent Etherscan data
      volume24hUsd: volume24h * ethPriceData.usd,
      volume24hChange, // From recent Etherscan data
      sales24h: sales24h.length, // From recent Etherscan data
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

    console.log("Collection stats ready - Volume: ${totalVolume.toFixed(2)} ETH, Owners: ${numOwners}");

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
