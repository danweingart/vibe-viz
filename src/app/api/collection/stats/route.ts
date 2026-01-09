import { NextResponse } from "next/server";
import { getCollectionStats } from "@/lib/opensea/client";
import { getEthPrice } from "@/lib/coingecko/client";
import { cache } from "@/lib/cache/memory";
import { CACHE_TTL } from "@/lib/constants";
import type { CollectionStats } from "@/types/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Check cache first
    const cached = await cache.get<CollectionStats>("collection-stats");
    if (cached) {
      return NextResponse.json(cached);
    }

    // Fetch fresh data
    const [stats, ethPrice] = await Promise.all([
      getCollectionStats(),
      getEthPrice(),
    ]);

    const result: CollectionStats = {
      floorPrice: stats.total.floor_price,
      floorPriceUsd: stats.total.floor_price * ethPrice.usd,
      totalVolume: stats.total.volume,
      totalVolumeUsd: stats.total.volume * ethPrice.usd,
      totalSales: stats.total.sales,
      numOwners: stats.total.num_owners,
      marketCap: stats.total.market_cap,
      marketCapUsd: stats.total.market_cap * ethPrice.usd,
      avgPrice: stats.total.average_price,
      avgPriceUsd: stats.total.average_price * ethPrice.usd,
      volume24h: stats.intervals?.[0]?.volume ?? 0,
      volume24hUsd: (stats.intervals?.[0]?.volume ?? 0) * ethPrice.usd,
      volume24hChange: stats.intervals?.[0]?.volume_change ?? 0,
      sales24h: stats.intervals?.[0]?.sales ?? 0,
      lastUpdated: new Date().toISOString(),
    };

    // Cache the result
    await cache.set("collection-stats", result, CACHE_TTL.COLLECTION_STATS);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching collection stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch collection stats" },
      { status: 500 }
    );
  }
}
