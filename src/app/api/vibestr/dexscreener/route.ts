import { NextResponse } from "next/server";
import { cache } from "@/lib/cache/postgres";
import { DEXSCREENER_API, VIBESTR_TOKEN_CONTRACT, VIBESTR_CACHE_TTL } from "@/lib/constants";
import type { DexScreenerResponse } from "@/types/vibestr";

export const dynamic = "force-dynamic";

const CACHE_KEY = "vibestr-dexscreener";

export async function GET() {
  try {
    // Check cache first
    const cached = await cache.get<DexScreenerResponse>(CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Fetch from DexScreener API
    const response = await fetch(
      `${DEXSCREENER_API}/tokens/${VIBESTR_TOKEN_CONTRACT}`,
      {
        headers: { Accept: "application/json" },
      }
    );

    if (!response.ok) {
      throw new Error(`DexScreener API returned ${response.status}`);
    }

    const data: DexScreenerResponse = await response.json();

    // Cache the result
    await cache.set(CACHE_KEY, data, VIBESTR_CACHE_TTL.DEXSCREENER);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching DexScreener data:", error);

    // Try to return stale cache on error
    const stale = await cache.get<DexScreenerResponse>(CACHE_KEY, true);
    if (stale) {
      return NextResponse.json(stale);
    }

    return NextResponse.json(
      {
        error: "Failed to fetch DexScreener data",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
