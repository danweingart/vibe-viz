import { NextResponse } from "next/server";
import { getBestListing, parseListingPrice } from "@/lib/opensea/client";
import {
  getAllTransfers,
  filterToSalesOnly,
  getTotalSupply,
  calculateHolderCount,
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

    console.log("Fetching collection stats (hybrid Etherscan + OpenSea)...");
    console.log("Fetching COMPLETE historical data for accurate metrics...");

    // Fetch all data in parallel:
    // - Floor price from OpenSea (most accurate)
    // - ALL transfers from Etherscan since contract deployment (22021222 = March 2025)
    // - Total supply from Etherscan
    // - Current ETH price
    const [bestListing, allTransfers, totalSupply, ethPriceData] = await Promise.all([
      getBestListing(),
      getAllTransfers(CONTRACT_ADDRESS, 22021222), // Contract deployment block
      getTotalSupply(CONTRACT_ADDRESS),
      getEthPrice(),
    ]);

    // Get floor price from OpenSea listing
    const floorPrice = bestListing ? parseListingPrice(bestListing) : 0;

    // Filter to sales only (exclude mints and burns)
    const salesTransfers = filterToSalesOnly(allTransfers);

    // Calculate holder count from ALL transfers (accurate current ownership)
    const holderCount = calculateHolderCount(allTransfers);

    console.log(`Found ${allTransfers.length} total transfers, ${salesTransfers.length} sales, ${holderCount} unique holders`);

    // Enrich with OpenSea prices
    const enriched = await enrichTransfersWithPrices(salesTransfers, ethPriceData.usd);

    // Transform to SaleRecord format
    const allSales = transformToSaleRecords(enriched);

    console.log(`Enriched ${allSales.length}/${salesTransfers.length} sales with prices`);

    // Calculate total volume and sales (365 days)
    const totalVolume = allSales.reduce((sum, s) => sum + s.priceEth, 0);
    const totalSales = allSales.length;
    const avgPrice = totalSales > 0 ? totalVolume / totalSales : 0;

    // Calculate market cap = floor × total supply
    const marketCap = floorPrice * totalSupply;

    // Calculate 24h stats
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
      totalVolume, // From Etherscan (365 days)
      totalVolumeUsd: totalVolume * ethPriceData.usd,
      totalSales, // From Etherscan (365 days)
      numOwners: holderCount, // Calculated from Etherscan transfers
      marketCap, // Calculated: floor × supply
      marketCapUsd: marketCap * ethPriceData.usd,
      avgPrice, // From Etherscan (365 days)
      avgPriceUsd: avgPrice * ethPriceData.usd,
      volume24h, // From Etherscan
      volume24hUsd: volume24h * ethPriceData.usd,
      volume24hChange, // Calculated from Etherscan
      sales24h: sales24h.length, // From Etherscan
      lastUpdated: new Date().toISOString(),
    };

    // Cache the result
    await cache.set("collection-stats", result, CACHE_TTL.COLLECTION_STATS);

    console.log("Collection stats ready:", result);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching collection stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch collection stats" },
      { status: 500 }
    );
  }
}
