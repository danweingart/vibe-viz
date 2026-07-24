import { NextRequest, NextResponse } from "next/server";
import {
  getTokenTransfers,
  filterToSalesOnly,
} from "@/lib/etherscan/client";
import { getEthPrice } from "@/lib/coingecko/client";
import {
  enrichTransfersWithPrices,
  transformToSaleRecords,
  groupSalesForFeed
} from "@/lib/etherscan/transformer";
import { resolveDisplayName, getAllAccountTags } from "@/lib/ens/resolver";
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
  // Opt-in: resolve buyer/seller wallet names (ENS / OpenSea username) for the
  // returned page. Off by default to keep the shared feed fast.
  const resolveNames = searchParams.get("resolveNames") === "true";

  // Use a single cache key for the recent events dataset
  const cacheKey = "events-recent";

  // Attach buyer/seller display names to a page of sales (only when requested).
  // Uses the shared resolver: manual tag → OpenSea username → ENS → null,
  // resolving uncached addresses within a ~5s time budget (best-effort).
  async function withNames(events: SaleRecord[]): Promise<SaleRecord[]> {
    if (!resolveNames || events.length === 0) return events;
    try {
      const names = new Map<string, string | null>();
      const tags = await getAllAccountTags();

      const addresses = Array.from(
        new Set(events.flatMap(e => [e.buyer.toLowerCase(), e.seller.toLowerCase()]))
      );

      const TIME_BUDGET_MS = 5000;
      const CONCURRENCY = 5;
      const start = Date.now();

      for (let i = 0; i < addresses.length; i += CONCURRENCY) {
        const batch = addresses.slice(i, i + CONCURRENCY);
        const results = await Promise.allSettled(
          batch.map(async (addr) => {
            // Manual tag wins over auto-resolution
            const tag = tags[addr];
            if (tag) return { addr, name: tag };
            const profile = await resolveDisplayName(addr);
            return { addr, name: profile.name };
          })
        );
        for (const r of results) {
          if (r.status === "fulfilled") names.set(r.value.addr, r.value.name);
        }
        if (Date.now() - start > TIME_BUDGET_MS) break;
      }

      return events.map(e => ({
        ...e,
        buyerName: names.get(e.buyer.toLowerCase()) ?? null,
        sellerName: names.get(e.seller.toLowerCase()) ?? null,
      }));
    } catch {
      return events; // names are best-effort
    }
  }

  return withTimeout(async () => {
  try {
    // Check for cached full dataset
    let allSales = await cache.get<SaleRecord[]>(cacheKey);

    if (!allSales) {
      // Stale-while-revalidate: return stale data immediately if available
      const staleData = await cache.get<SaleRecord[]>(cacheKey, true);
      if (staleData) {
        console.log("Returning stale events while refreshing...");
        const paginatedSales = staleData.slice(offset, offset + limit);
        const hasMore = offset + limit < staleData.length;
        return NextResponse.json({
          events: await withNames(paginatedSales),
          nextCursor: hasMore ? String(offset + limit) : null,
          hasMore,
          total: staleData.length,
          _stale: true,
        });
      }

      // Fetch the most recent transfers directly (no block range calculation needed)
      // This is a single API call that returns the latest transfers sorted desc
      const [ethPriceData, recentTransfers] = await Promise.all([
        getEthPrice(),
        getTokenTransfers(undefined, 0, 'latest', 1, 500),
      ]);

      // Filter to sales only (exclude mints and burns)
      const salesTransfers = filterToSalesOnly(recentTransfers);

      console.log(`Found ${salesTransfers.length} non-mint/burn transfers out of ${recentTransfers.length} total`);

      // Enrich with OpenSea prices
      const enriched = await enrichTransfersWithPrices(salesTransfers, ethPriceData.usd);

      // Transform to SaleRecord format (only keeps transfers with price data),
      // then group into one row per (transaction, buyer) for the feed.
      allSales = groupSalesForFeed(transformToSaleRecords(enriched));

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
      events: await withNames(paginatedSales),
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
