import { NextRequest, NextResponse } from "next/server";
import { getSnapshots } from "@/lib/db/vibestr";
import { cache } from "@/lib/cache/memory";
import { VIBESTR_CACHE_TTL } from "@/lib/constants";
import { snapshotsToDailyStats, calculateMovingAverage } from "@/lib/vibestr/transform";
import type { VolumeStats } from "@/types/vibestr";

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
    const cacheKey = `vibestr-volume-history-${days}`;
    const cached = await cache.get<VolumeStats[]>(cacheKey);
    if (cached) {
      console.log(`Returning cached volume history for ${days} days`);
      return NextResponse.json(cached);
    }

    console.log(`Fetching volume history for ${days} days`);

    // Get snapshots from storage
    const snapshots = await getSnapshots(days);

    if (snapshots.length === 0) {
      console.log("No snapshots found for volume history");
      return NextResponse.json([]);
    }

    // Convert to daily stats
    const dailyStats = snapshotsToDailyStats(snapshots);

    // Transform to volume stats format
    const volumeStats: VolumeStats[] = dailyStats.map((stat, index) => {
      // Calculate moving average for volume
      const startIndex = Math.max(0, index - 6);
      const slice = dailyStats.slice(startIndex, index + 1);
      const ma7 = slice.reduce((sum, s) => sum + s.volume, 0) / slice.length;

      // Estimate transactions (placeholder - would need actual transaction data)
      const transactions = Math.floor(stat.volume / (stat.price * 1000)); // Rough estimate

      return {
        date: stat.date,
        timestamp: stat.timestamp,
        volume: stat.volume,
        volumeUsd: stat.volumeUsd,
        transactions,
        avgTransactionSize: transactions > 0 ? stat.volume / transactions : 0,
        movingAverage7: ma7,
      };
    });

    // Cache the result
    await cache.set(cacheKey, volumeStats, VIBESTR_CACHE_TTL.VOLUME_HISTORY);

    console.log(`Volume history cached successfully (${volumeStats.length} records)`);

    return NextResponse.json(volumeStats);
  } catch (error) {
    console.error("Error fetching volume history:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch volume history",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
