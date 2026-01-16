import { NextRequest, NextResponse } from "next/server";
import { getSnapshots } from "@/lib/db/vibestr";
import { cache } from "@/lib/cache/memory";
import { VIBESTR_CACHE_TTL } from "@/lib/constants";
import {
  snapshotsToDailyStats,
  calculateMovingAverage,
  calculateVolatility,
  mergeWithSyntheticData,
  normalizeStrategyData,
} from "@/lib/vibestr/transform";
import { getVibestrData } from "@/lib/nftstrategy/client";
import { getHistoricalPrices } from "@/lib/coingecko/client";
import type { DailyTokenStats } from "@/types/vibestr";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get("days") || "7");

    // Validate days parameter
    if (![7, 30, 90, 365].includes(days)) {
      return NextResponse.json(
        { error: "Invalid days parameter. Must be 7, 30, 90, or 365." },
        { status: 400 }
      );
    }

    // Check cache first
    const cacheKey = `vibestr-price-history-${days}`;
    const cached = await cache.get<DailyTokenStats[]>(cacheKey);
    if (cached) {
      console.log(`Returning cached price history for ${days} days`);
      return NextResponse.json(cached);
    }

    console.log(`Fetching price history for ${days} days`);

    // Get snapshots from storage
    const snapshots = await getSnapshots(days);

    console.log(`Found ${snapshots.length} snapshots for ${days} days`);

    let dailyStats: DailyTokenStats[];

    if (snapshots.length === 0) {
      // No snapshots yet - generate synthetic data from current stats
      console.log("No snapshots found, generating synthetic data");
      const currentData = await getVibestrData();
      const currentStats = normalizeStrategyData(currentData);
      dailyStats = mergeWithSyntheticData([], days, currentStats);
    } else if (snapshots.length < days) {
      // Partial data - merge with synthetic
      console.log(`Partial data (${snapshots.length}/${days}), merging with synthetic`);
      const currentData = await getVibestrData();
      const currentStats = normalizeStrategyData(currentData);
      dailyStats = mergeWithSyntheticData(snapshots, days, currentStats);
    } else {
      // We have enough snapshots - use real data
      console.log("Using real snapshot data");

      // Get ETH prices for the date range
      try {
        const ethPriceMap = await getHistoricalPrices(days);
        dailyStats = snapshotsToDailyStats(snapshots, ethPriceMap);
      } catch (error) {
        console.warn("Failed to fetch ETH prices, using fallback", error);
        dailyStats = snapshotsToDailyStats(snapshots);
      }
    }

    // Calculate moving average and volatility
    dailyStats = calculateMovingAverage(dailyStats, 7);
    dailyStats = calculateVolatility(dailyStats, 7);

    // Cache the result
    await cache.set(cacheKey, dailyStats, VIBESTR_CACHE_TTL.PRICE_HISTORY);

    console.log(`Price history cached successfully (${dailyStats.length} data points)`);

    return NextResponse.json(dailyStats);
  } catch (error) {
    console.error("Error fetching price history:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch price history",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
