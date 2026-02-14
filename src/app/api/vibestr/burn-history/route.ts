import { NextRequest, NextResponse } from "next/server";
import { getSnapshots } from "@/lib/db/postgres-vibestr";
import { cache } from "@/lib/cache/postgres";
import { VIBESTR_CACHE_TTL } from "@/lib/constants";
import { calculateBurnMetrics } from "@/lib/vibestr/transform";
import type { BurnRecord } from "@/types/vibestr";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get("days") || "30");

    // Validate days parameter
    if (![7, 30, 90, 365].includes(days)) {
      return NextResponse.json(
        { error: "Invalid days parameter. Must be 7, 30, 90, or 365." },
        { status: 400 }
      );
    }

    // Check cache first
    const cacheKey = `vibestr-burn-history-${days}`;
    const cached = await cache.get<BurnRecord[]>(cacheKey);
    if (cached) {
      console.log(`Returning cached burn history for ${days} days`);
      return NextResponse.json(cached);
    }

    console.log(`Fetching burn history for ${days} days`);

    // Get snapshots from storage
    const snapshots = await getSnapshots(days);

    if (snapshots.length === 0) {
      console.log("No snapshots found for burn history");
      return NextResponse.json([]);
    }

    // Calculate burn metrics
    const burnRecords = calculateBurnMetrics(snapshots);

    // Cache the result
    await cache.set(cacheKey, burnRecords, VIBESTR_CACHE_TTL.BURN_HISTORY);

    console.log(`Burn history cached successfully (${burnRecords.length} records)`);

    return NextResponse.json(burnRecords);
  } catch (error) {
    console.error("Error fetching burn history:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch burn history",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
