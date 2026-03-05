import { NextResponse } from "next/server";
import { cache } from "@/lib/cache/postgres";
import { VIBESTR_CACHE_TTL } from "@/lib/constants";
import { fetchHoldings, fetchSold } from "@/lib/nftstrategy/client";
import type { NFTTrade } from "@/types/vibestr";

export const dynamic = "force-dynamic";

const CACHE_KEY = "vibestr-nft-trades-v2";

export async function GET() {
  try {
    // Check cache first
    const cached = await cache.get<NFTTrade[]>(CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Fetch holdings and sold data in parallel
    const [holdings, sold] = await Promise.all([
      fetchHoldings(),
      fetchSold(),
    ]);

    // Helper: convert wei-like price to ETH
    const toEth = (price: number | string): number => {
      const n = typeof price === "string" ? Number(price) : price;
      // If price looks like wei (> 1e15), divide by 1e18
      return n > 1e15 ? n / 1e18 : n;
    };

    // Convert holdings to NFTTrade format (buys)
    const buyTrades: NFTTrade[] = holdings.map((h) => ({
      tokenId: h.token_id,
      action: "buy" as const,
      price: toEth(h.bought_price),
      date: new Date(h.timestamp * 1000).toISOString(),
      timestamp: h.timestamp,
      imageUrl: h.image_url,
    }));

    // Convert sold to NFTTrade format (sells)
    const sellTrades: NFTTrade[] = sold.map((s) => ({
      tokenId: s.token_id,
      action: "sell" as const,
      price: toEth(s.sold_price),
      date: new Date(s.timestamp * 1000).toISOString(),
      timestamp: s.timestamp,
      imageUrl: s.image_url,
      profit: toEth(s.sold_price) - toEth(s.bought_price),
    }));

    // Combine and sort by timestamp descending (newest first)
    const allTrades = [...buyTrades, ...sellTrades].sort(
      (a, b) => b.timestamp - a.timestamp
    );

    // Cache the result
    await cache.set(CACHE_KEY, allTrades, VIBESTR_CACHE_TTL.NFT_TRADES);

    return NextResponse.json(allTrades);
  } catch (error) {
    console.error("Error fetching NFT trades:", error);

    // Try to return stale cache on error
    const stale = await cache.get<NFTTrade[]>(CACHE_KEY, true);
    if (stale) {
      return NextResponse.json(stale);
    }

    return NextResponse.json(
      {
        error: "Failed to fetch NFT trades",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
