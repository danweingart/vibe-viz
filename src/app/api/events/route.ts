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
import type { SaleRecord } from "@/types/api";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");
    const days = parseInt(searchParams.get("days") || "30");

    const cacheKey = `events-${days}-${limit}-${offset}`;
    const cached = await cache.get<{ events: SaleRecord[]; nextCursor: string | null; hasMore: boolean; total: number }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

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
    const allSales = transformToSaleRecords(enriched);

    // Validate price coverage
    const enrichedCount = enriched.filter(t => t.priceEth !== undefined).length;
    const validation = validatePriceCoverage(enrichedCount, salesTransfers.length);

    logValidationMetrics("Events API", [
      { label: "Price Coverage", result: validation },
    ]);

    // Sort by timestamp (most recent first)
    allSales.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    const paginatedSales = allSales.slice(offset, offset + limit);
    const hasMore = offset + limit < allSales.length;

    const result = {
      events: paginatedSales,
      nextCursor: hasMore ? String(offset + limit) : null,
      hasMore,
      total: allSales.length,
    };

    // Cache for 2 minutes
    await cache.set(cacheKey, result, 120);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching events:", error);

    // Try to return stale cache on error
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");
    const days = parseInt(searchParams.get("days") || "30");
    const cacheKey = `events-${days}-${limit}-${offset}`;

    const staleCache = await cache.get<{ events: SaleRecord[]; nextCursor: string | null; hasMore: boolean; total: number }>(cacheKey, true);
    if (staleCache) {
      console.log("Returning stale cached events");
      return NextResponse.json({
        ...staleCache,
        _stale: true,
      });
    }

    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}
