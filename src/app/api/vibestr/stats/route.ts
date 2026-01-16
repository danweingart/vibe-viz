import { NextResponse } from "next/server";
import { getVibestrData } from "@/lib/nftstrategy/client";
import { getEthPrice } from "@/lib/coingecko/client";
import { cache } from "@/lib/cache/memory";
import { VIBESTR_CACHE_TTL } from "@/lib/constants";
import { normalizeStrategyData } from "@/lib/vibestr/transform";
import type { TokenStats } from "@/types/vibestr";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Check cache first
    const cached = await cache.get<TokenStats>("vibestr-stats");
    if (cached) {
      console.log("Returning cached VIBESTR stats");
      return NextResponse.json(cached);
    }

    console.log("Fetching fresh VIBESTR stats");

    // Fetch fresh data in parallel
    const [strategyResponse, ethPrice] = await Promise.all([
      getVibestrData(),
      getEthPrice(),
    ]);

    // Normalize the data
    const stats = normalizeStrategyData(strategyResponse);

    // Calculate price in ETH using actual ETH price
    stats.price = stats.priceUsd / ethPrice.usd;

    // Cache the result
    await cache.set("vibestr-stats", stats, VIBESTR_CACHE_TTL.STATS);

    console.log("VIBESTR stats cached successfully");

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching VIBESTR stats:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch VIBESTR stats",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
