import { NextResponse } from "next/server";
import { getCollectionStats as getOpenSeaStats, getBestListing, parseListingPrice } from "@/lib/opensea/client";
import {
  getAllTransfers,
  filterToSalesOnly,
  getTotalSupply,
} from "@/lib/etherscan/client";
import { getEthPrice } from "@/lib/coingecko/client";
import {
  enrichTransfersWithPrices,
  transformToSaleRecords,
} from "@/lib/etherscan/transformer";
import { cache } from "@/lib/cache/memory";
import { CACHE_TTL, CONTRACT_ADDRESS } from "@/lib/constants";
import type { CollectionStats } from "@/types/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Check cache first
    const cached = await cache.get<CollectionStats>("collection-stats");
    if (cached) {
      return NextResponse.json(cached);
    }

    console.log("Fetching collection stats (OpenSea for owners, Etherscan for complete volume history)...");

    // Fetch data in parallel:
    // - OpenSea stats for current owners
    // - ALL transfers from Etherscan for accurate all-time volume
    // - ETH price
    const [openSeaStats, allTransfers, totalSupply, ethPriceData] = await Promise.all([
      getOpenSeaStats(),
      getAllTransfers(CONTRACT_ADDRESS, 22021222), // Contract deployment block
      getTotalSupply(CONTRACT_ADDRESS),
      getEthPrice(),
    ]);

    // Get current owners from OpenSea (source of truth)
    const numOwners = openSeaStats.total.num_owners || 0;
    const floorPrice = openSeaStats.total.floor_price || 0;

    console.log(`OpenSea - Owners: ${numOwners}, Floor: ${floorPrice} ETH`);

    // Calculate all-time volume from Etherscan (complete historical data)
    const salesTransfers = filterToSalesOnly(allTransfers);
    console.log(`Etherscan - Found ${allTransfers.length} total transfers, ${salesTransfers.length} sales`);

    // Enrich with OpenSea prices
    const enriched = await enrichTransfersWithPrices(salesTransfers, ethPriceData.usd);
    const allSales = transformToSaleRecords(enriched);

    console.log(`Enriched ${allSales.length}/${salesTransfers.length} sales with prices`);

    // Calculate all-time totals from enriched Etherscan data
    const totalVolume = allSales.reduce((sum, s) => sum + s.priceEth, 0);
    const totalSales = allSales.length;
    const avgPrice = totalSales > 0 ? totalVolume / totalSales : 0;

    console.log(`Calculated - Total Volume: ${totalVolume.toFixed(2)} ETH, Total Sales: ${totalSales}, Avg: ${avgPrice.toFixed(4)} ETH`);

    // Calculate market cap = floor × total supply
    const marketCap = floorPrice * totalSupply;

    // Calculate 24h stats from enriched data
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const twoDaysAgo = Date.now() - 48 * 60 * 60 * 1000;

    const sales24h = allSales.filter(s => s.timestamp.getTime() >= oneDayAgo);
    const salesPrev24h = allSales.filter(s =>
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
      totalVolume, // From Etherscan (all-time, enriched with OpenSea prices)
      totalVolumeUsd: totalVolume * ethPriceData.usd,
      totalSales, // From Etherscan (all-time)
      numOwners, // From OpenSea (source of truth)
      marketCap, // Calculated: floor × supply
      marketCapUsd: marketCap * ethPriceData.usd,
      avgPrice, // Calculated from Etherscan data
      avgPriceUsd: avgPrice * ethPriceData.usd,
      volume24h, // Calculated from Etherscan data
      volume24hUsd: volume24h * ethPriceData.usd,
      volume24hChange, // Calculated from Etherscan data
      sales24h: sales24h.length, // Calculated from Etherscan data
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
}
