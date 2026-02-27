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
import { cache } from "@/lib/cache/postgres";
import { CACHE_TTL, COLLECTION_SLUG, CONTRACT_ADDRESS, COMPARISON_COLLECTIONS } from "@/lib/constants";
import { withTimeout, timeoutWithCache } from "@/lib/middleware/timeout";
import type { DailyStats, SaleRecord } from "@/types/api";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return withTimeout(async () => {
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

    // Stale-while-revalidate: return stale data immediately if available,
    // while the fresh fetch continues below and updates the cache
    const staleData = await cache.get<DailyStats[]>(cacheKey, true);
    if (staleData) {
      console.log(`Returning stale price history for ${collectionSlug} while refreshing...`);
      // Don't await — let the rest of this handler run in the background to refresh the cache.
      // The stale data is returned immediately below, and next request will get fresh data.
      // Note: We still proceed with the fetch below so the cache gets updated for next time,
      // but we return the stale response right away.
      // Fire-and-forget: schedule a background refresh
      refreshPriceHistory(days, contractAddress, collectionSlug, cacheKey).catch(err =>
        console.error("Background price history refresh failed:", err)
      );
      return NextResponse.json(staleData);
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

    // Cache based on time range: 30 min for short ranges, 6 hours for longer
    const cacheTTL = days <= 7 ? 1800 : CACHE_TTL.PRICE_HISTORY;
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
  }, timeoutWithCache(async () => {
    // Fallback to stale cache on timeout
    const searchParams = request.nextUrl.searchParams;
    const days = Math.min(parseInt(searchParams.get("days") || "7"), 365);
    const collectionSlug = searchParams.get("collection") || COLLECTION_SLUG;
    const cacheKey = `price-history-${days}-${collectionSlug}`;
    return await cache.get<DailyStats[]>(cacheKey, true);
  }));
}

/**
 * Background refresh: fetches fresh price history and updates the cache.
 * Called fire-and-forget when stale data is returned.
 */
async function refreshPriceHistory(
  days: number,
  contractAddress: string,
  collectionSlug: string,
  cacheKey: string
): Promise<void> {
  const [ethPriceData, allTransfers] = await Promise.all([
    getEthPrice(),
    getTransfersInDateRange(days, contractAddress),
  ]);

  const salesTransfers = filterToSalesOnly(allTransfers);
  const enriched = await enrichTransfersWithPrices(salesTransfers, ethPriceData.usd, collectionSlug);
  const allSales = transformToSaleRecords(enriched);

  if (allSales.length === 0) {
    await cache.set(cacheKey, [], days <= 7 ? 1800 : CACHE_TTL.PRICE_HISTORY);
    return;
  }

  const floorPrice = calculateFloorPrice(allSales);

  const salesByDate = new Map<string, SaleRecord[]>();
  for (const sale of allSales) {
    const date = sale.timestamp.toISOString().split("T")[0];
    if (!salesByDate.has(date)) {
      salesByDate.set(date, []);
    }
    salesByDate.get(date)!.push(sale);
  }

  const dailyStats: DailyStats[] = [];
  const dates = Array.from(salesByDate.keys()).sort();

  for (const date of dates) {
    const daySales = salesByDate.get(date)!;
    const prices = daySales.map((s) => s.priceEth);
    if (prices.length === 0) continue;

    const volume = prices.reduce((a, b) => a + b, 0);
    const ethPrice = daySales[0].priceEth > 0 ? daySales[0].priceUsd / daySales[0].priceEth : ethPriceData.usd;

    dailyStats.push({
      date,
      volume,
      volumeUsd: volume * ethPrice,
      salesCount: prices.length,
      avgPrice: volume / prices.length,
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      ethPrice,
      salesAbove10Pct: prices.length > 0 ? (daySales.filter(s => s.priceEth >= floorPrice * 1.1).length / prices.length) * 100 : 0,
      salesAbove25Pct: prices.length > 0 ? (daySales.filter(s => s.priceEth >= floorPrice * 1.25).length / prices.length) * 100 : 0,
      salesAbove50Pct: prices.length > 0 ? (daySales.filter(s => s.priceEth >= floorPrice * 1.5).length / prices.length) * 100 : 0,
      ethPayments: daySales.filter(s => s.paymentToken === "ETH").length,
      wethPayments: daySales.filter(s => s.paymentToken === "WETH").length,
      otherPayments: daySales.filter(s => s.paymentToken === "OTHER").length,
      ethVolume: daySales.filter(s => s.paymentToken === "ETH").reduce((sum, s) => sum + s.priceEth, 0),
      wethVolume: daySales.filter(s => s.paymentToken === "WETH").reduce((sum, s) => sum + s.priceEth, 0),
      otherVolume: daySales.filter(s => s.paymentToken === "OTHER").reduce((sum, s) => sum + s.priceEth, 0),
      salePrices: daySales.map(s => ({ eth: s.priceEth, usd: s.priceUsd })),
      marketplaceCounts: {},
    });
  }

  const cacheTTL = days <= 7 ? 1800 : CACHE_TTL.PRICE_HISTORY;
  await cache.set(cacheKey, dailyStats, cacheTTL);
  console.log(`Background refresh complete for ${collectionSlug} (${days}d): ${dailyStats.length} days cached`);
}
