import { NextRequest, NextResponse } from "next/server";
import {
  getTransfersInDateRange,
  filterToSalesOnly,
} from "@/lib/etherscan/client";
import { getEthPrice } from "@/lib/coingecko/client";
import {
  enrichTransfersWithPrices,
  transformToSaleRecords
} from "@/lib/etherscan/transformer";
import {
  validatePriceCoverage,
  logValidationMetrics
} from "@/lib/etherscan/validator";
import { cache } from "@/lib/cache/postgres";
import { CACHE_TTL } from "@/lib/constants";
import { withTimeout, timeoutWithCache } from "@/lib/middleware/timeout";
import type { SaleRecord } from "@/types/api";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const offset = parseInt(searchParams.get("offset") || "0");
  const days = parseInt(searchParams.get("days") || "7");

  // Cache the full dataset per day-range, then paginate from it
  const cacheKey = `events-${days}`;

  return withTimeout(async () => {
  try {
    // Check for cached full dataset
    let allSales = await cache.get<SaleRecord[]>(cacheKey);

    if (!allSales) {
      // Fetch ETH price and transfers in parallel
      const [ethPriceData, allTransfers] = await Promise.all([
        getEthPrice(),
        getTransfersInDateRange(days),
      ]);

      // Filter to sales only (exclude mints and burns)
      const salesTransfers = filterToSalesOnly(allTransfers);

      console.log(`Found ${salesTransfers.length} sales in last ${days} days`);

      // Enrich with OpenSea prices
      const enriched = await enrichTransfersWithPrices(salesTransfers, ethPriceData.usd);

      // Transform to SaleRecord format
      allSales = transformToSaleRecords(enriched);

      // Validate price coverage
      const enrichedCount = enriched.filter(t => t.priceEth !== undefined).length;
      const validation = validatePriceCoverage(enrichedCount, salesTransfers.length);

      logValidationMetrics("Events API", [
        { label: "Price Coverage", result: validation },
      ]);

      // Sort by timestamp (most recent first)
      allSales.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Cache full dataset for 15 minutes
      await cache.set(cacheKey, allSales, CACHE_TTL.RECENT_EVENTS);
    }

    // Apply pagination from cached full dataset
    const paginatedSales = allSales.slice(offset, offset + limit);
    const hasMore = offset + limit < allSales.length;

    const result = {
      events: paginatedSales,
      nextCursor: hasMore ? String(offset + limit) : null,
      hasMore,
      total: allSales.length,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching events:", error);

    // Try to return stale cache on error
    const staleCache = await cache.get<SaleRecord[]>(cacheKey, true);
    if (staleCache) {
      console.log("Returning stale cached events");
      const paginatedSales = staleCache.slice(offset, offset + limit);
      const hasMore = offset + limit < staleCache.length;
      return NextResponse.json({
        events: paginatedSales,
        nextCursor: hasMore ? String(offset + limit) : null,
        hasMore,
        total: staleCache.length,
        _stale: true,
      });
    }

    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
  }, timeoutWithCache(async () => {
    const staleCache = await cache.get<SaleRecord[]>(cacheKey, true);
    if (staleCache) {
      const paginatedSales = staleCache.slice(offset, offset + limit);
      const hasMore = offset + limit < staleCache.length;
      return {
        events: paginatedSales,
        nextCursor: hasMore ? String(offset + limit) : null,
        hasMore,
        total: staleCache.length,
        _stale: true,
        _timeout: true,
      };
    }
    return null;
  }));
}
