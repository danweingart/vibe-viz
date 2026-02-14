import { NextResponse } from "next/server";
import { getEthPrice } from "@/lib/coingecko/client";
import { cache } from "@/lib/cache/memory";
import { CACHE_TTL } from "@/lib/constants";
import type { EthPrice } from "@/types/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Check cache first
    const cached = await cache.get<EthPrice>("eth-price");
    if (cached) {
      return NextResponse.json(cached);
    }

    // Fetch fresh data from CoinGecko (Etherscan V1 API is deprecated)
    const price = await getEthPrice();

    const result: EthPrice = {
      usd: price.usd,
      usd_24h_change: price.usd_24h_change,
      lastUpdated: new Date().toISOString(),
    };

    // Cache the result
    await cache.set("eth-price", result, CACHE_TTL.ETH_PRICE);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching ETH price:", error);

    // Try to return stale cache on error
    const staleCache = await cache.get<EthPrice>("eth-price", true);
    if (staleCache) {
      console.log("Returning stale cached ETH price");
      return NextResponse.json({
        ...staleCache,
        lastUpdated: new Date().toISOString(),
        _stale: true,
      });
    }

    return NextResponse.json(
      { error: "Failed to fetch ETH price" },
      { status: 500 }
    );
  }
}
