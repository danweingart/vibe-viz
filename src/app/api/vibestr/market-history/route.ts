import { NextResponse } from "next/server";
import { cache } from "@/lib/cache/postgres";
import { COINGECKO_API_BASE, COINGECKO_VIBESTR_ID, VIBESTR_CACHE_TTL } from "@/lib/constants";
import type { MarketHistoryPoint } from "@/types/vibestr";

export const dynamic = "force-dynamic";

const CACHE_KEY = "vibestr-market-history";

interface CoinGeckoMarketChart {
  prices: [number, number][];
  market_caps: [number, number][];
}

export async function GET() {
  try {
    // Check cache first
    const cached = await cache.get<MarketHistoryPoint[]>(CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Fetch 90 days of hourly data from CoinGecko
    const response = await fetch(
      `${COINGECKO_API_BASE}/coins/${COINGECKO_VIBESTR_ID}/market_chart?vs_currency=usd&days=90`,
      {
        headers: { Accept: "application/json" },
      }
    );

    if (!response.ok) {
      // If rate-limited, try stale cache
      if (response.status === 429) {
        const stale = await cache.get<MarketHistoryPoint[]>(CACHE_KEY, true);
        if (stale) return NextResponse.json(stale);
      }
      throw new Error(`CoinGecko API returned ${response.status}`);
    }

    const raw: CoinGeckoMarketChart = await response.json();

    // Merge prices and market_caps into a single array
    // CoinGecko returns hourly data for days <= 90
    const points: MarketHistoryPoint[] = raw.prices.map(([timestamp, price], i) => ({
      timestamp,
      price,
      marketCap: raw.market_caps[i]?.[1] ?? 0,
    }));

    // Downsample to ~4 points per day (every 6 hours) to keep payload reasonable
    const downsampled = points.filter((_, i) => i % 6 === 0 || i === points.length - 1);

    // Cache the result
    await cache.set(CACHE_KEY, downsampled, VIBESTR_CACHE_TTL.MARKET_HISTORY);

    return NextResponse.json(downsampled);
  } catch (error) {
    console.error("Error fetching VIBESTR market history:", error);

    // Try to return stale cache on error
    const stale = await cache.get<MarketHistoryPoint[]>(CACHE_KEY, true);
    if (stale) {
      return NextResponse.json(stale);
    }

    return NextResponse.json(
      {
        error: "Failed to fetch market history",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
