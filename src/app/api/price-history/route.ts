import { NextRequest, NextResponse } from "next/server";
import {
  getTransfersInDateRange,
  filterToSalesOnly,
} from "@/lib/etherscan/client";
import { getEthPrice } from "@/lib/coingecko/client";
import {
  enrichTransfersWithPrices,
  transformToSaleRecords,
  calculateFloorPrice,
} from "@/lib/etherscan/transformer";
import { cache } from "@/lib/cache/memory";
import { CACHE_TTL, COLLECTION_SLUG, CONTRACT_ADDRESS, COMPARISON_COLLECTIONS } from "@/lib/constants";
import type { DailyStats, SaleRecord } from "@/types/api";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = Math.min(parseInt(searchParams.get("days") || "7"), 365);
    const collectionSlug = searchParams.get("collection") || COLLECTION_SLUG;

    // Map collection slug to contract address
    let contractAddress = CONTRACT_ADDRESS;
    if (collectionSlug !== COLLECTION_SLUG) {
      const comparison = COMPARISON_COLLECTIONS.find(c => c.slug === collectionSlug);
      if (!comparison) {
        return NextResponse.json(
          { error: `Unknown collection: ${collectionSlug}` },
          { status: 400 }
        );
      }
      contractAddress = comparison.address;
    }

    const cacheKey = `price-history-${days}-${collectionSlug}`;
    const cached = await cache.get<DailyStats[]>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    console.log(`Fetching price history for ${collectionSlug} (${days} days)...`);

    // Fetch current ETH price and all transfers in parallel
    const [ethPriceData, allTransfers] = await Promise.all([
      getEthPrice(),
      getTransfersInDateRange(days, contractAddress),
    ]);

    // Filter to sales only (exclude mints and burns)
    const salesTransfers = filterToSalesOnly(allTransfers);

    console.log(`Found ${salesTransfers.length} transfers (excluding mints/burns)`);

    // Enrich with OpenSea prices
    const enriched = await enrichTransfersWithPrices(salesTransfers, ethPriceData.usd, collectionSlug);

    // Transform to SaleRecord format
    const allSales = transformToSaleRecords(enriched);

    console.log(`Enriched ${allSales.length} sales with prices`);

    // If no sales with prices, return empty array
    if (allSales.length === 0) {
      return NextResponse.json([]);
    }

    // Calculate floor price for premium calculations
    const floorPrice = calculateFloorPrice(allSales);

    // Group sales by date
    const salesByDate = new Map<string, SaleRecord[]>();
    for (const sale of allSales) {
      const date = sale.timestamp.toISOString().split("T")[0];
      if (!salesByDate.has(date)) {
        salesByDate.set(date, []);
      }
      salesByDate.get(date)!.push(sale);
    }

    // Calculate daily stats
    const dailyStats: DailyStats[] = [];
    const dates = Array.from(salesByDate.keys()).sort();

    for (const date of dates) {
      const daySales = salesByDate.get(date)!;
      const prices = daySales.map((s) => s.priceEth);

      if (prices.length === 0) continue;

      const volume = prices.reduce((a, b) => a + b, 0);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const avgPrice = volume / prices.length;

      // Get ETH/USD price for this day (from sale records)
      const ethPrice = daySales[0].priceEth > 0 ? daySales[0].priceUsd / daySales[0].priceEth : ethPriceData.usd;

      // Calculate premium tiers (relative to floor price)
      const salesAbove10 = daySales.filter(s => s.priceEth >= floorPrice * 1.1).length;
      const salesAbove25 = daySales.filter(s => s.priceEth >= floorPrice * 1.25).length;
      const salesAbove50 = daySales.filter(s => s.priceEth >= floorPrice * 1.5).length;

      // Calculate payment token breakdown
      const ethPayments = daySales.filter(s => s.paymentToken === "ETH").length;
      const wethPayments = daySales.filter(s => s.paymentToken === "WETH").length;
      const otherPayments = daySales.filter(s => s.paymentToken === "OTHER").length;

      // Track actual ETH volume by payment type
      const ethVolume = daySales
        .filter(s => s.paymentToken === "ETH")
        .reduce((sum, s) => sum + s.priceEth, 0);
      const wethVolume = daySales
        .filter(s => s.paymentToken === "WETH")
        .reduce((sum, s) => sum + s.priceEth, 0);
      const otherVolume = daySales
        .filter(s => s.paymentToken === "OTHER")
        .reduce((sum, s) => sum + s.priceEth, 0);

      // Collect all sale prices for distribution charts
      const salePrices = daySales.map(s => ({ eth: s.priceEth, usd: s.priceUsd }));

      // Marketplace breakdown (not available from Etherscan directly, set in enrichment)
      const marketplaceCounts: Record<string, number> = {};
      // This would require storing protocol_address during enrichment

      dailyStats.push({
        date,
        volume,
        volumeUsd: volume * ethPrice,
        salesCount: prices.length,
        avgPrice,
        minPrice,
        maxPrice,
        ethPrice,
        salesAbove10Pct: prices.length > 0 ? (salesAbove10 / prices.length) * 100 : 0,
        salesAbove25Pct: prices.length > 0 ? (salesAbove25 / prices.length) * 100 : 0,
        salesAbove50Pct: prices.length > 0 ? (salesAbove50 / prices.length) * 100 : 0,
        ethPayments,
        wethPayments,
        otherPayments,
        ethVolume,
        wethVolume,
        otherVolume,
        salePrices,
        marketplaceCounts,
      });
    }

    // Cache based on time range
    const cacheTTL = days <= 7 ? 300 : CACHE_TTL.PRICE_HISTORY; // 5 min for short ranges
    await cache.set(cacheKey, dailyStats, cacheTTL);

    console.log(`Returning ${dailyStats.length} days of stats`);

    return NextResponse.json(dailyStats);
  } catch (error) {
    console.error("Error fetching price history:", error);

    // Try to return stale cache on error
    const searchParams = request.nextUrl.searchParams;
    const days = Math.min(parseInt(searchParams.get("days") || "7"), 365);
    const collectionSlug = searchParams.get("collection") || COLLECTION_SLUG;
    const cacheKey = `price-history-${days}-${collectionSlug}`;

    const staleCache = await cache.get<DailyStats[]>(cacheKey, true);
    if (staleCache) {
      console.log("Returning stale cached price history");
      return NextResponse.json(staleCache);
    }

    return NextResponse.json(
      { error: "Failed to fetch price history" },
      { status: 500 }
    );
  }
}
