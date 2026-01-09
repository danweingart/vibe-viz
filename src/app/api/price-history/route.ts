import { NextRequest, NextResponse } from "next/server";
import { getEvents, parseEventPrice, getPaymentToken } from "@/lib/opensea/client";
import { getHistoricalPrices } from "@/lib/coingecko/client";
import { cache } from "@/lib/cache/memory";
import { CACHE_TTL, COLLECTION_SLUG } from "@/lib/constants";
import type { DailyStats, OpenSeaEvent } from "@/types/api";

export const dynamic = "force-dynamic";

// Optimized: Fetch events with pagination but limit total API calls
async function fetchSalesEfficiently(
  startTimestamp: number,
  endTimestamp: number,
  maxPages: number = 5,
  collectionSlug: string = COLLECTION_SLUG
): Promise<OpenSeaEvent[]> {
  const allEvents: OpenSeaEvent[] = [];
  let next: string | null = null;
  let pages = 0;

  do {
    const response = await getEvents(
      {
        eventType: "sale",
        limit: 50,
        after: startTimestamp,
        before: endTimestamp,
        next: next || undefined,
      },
      collectionSlug
    );

    allEvents.push(...response.asset_events);
    next = response.next;
    pages++;

    // Small delay to avoid rate limiting
    if (next && pages < maxPages) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  } while (next && pages < maxPages);

  return allEvents;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = Math.min(parseInt(searchParams.get("days") || "7"), 365);
    const collection = searchParams.get("collection") || COLLECTION_SLUG;

    const cacheKey = `price-history-${days}-${collection}`;
    const cached = await cache.get<DailyStats[]>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Calculate date range
    const endTimestamp = Math.floor(Date.now() / 1000);
    const startTimestamp = endTimestamp - days * 24 * 60 * 60;

    // Limit pages based on time range to speed up smaller queries
    // More pages for longer ranges to ensure complete data
    const maxPages = days <= 7 ? 5 : days <= 30 ? 15 : 30;

    // Fetch sales and ETH prices in parallel
    const [sales, ethPrices] = await Promise.all([
      fetchSalesEfficiently(startTimestamp, endTimestamp, maxPages, collection),
      getHistoricalPrices(days),
    ]);

    // If no sales, return empty array
    if (sales.length === 0) {
      return NextResponse.json([]);
    }

    // Group sales by date
    const salesByDate = new Map<string, typeof sales>();
    for (const sale of sales) {
      const date = new Date(sale.event_timestamp * 1000)
        .toISOString()
        .split("T")[0];
      if (!salesByDate.has(date)) {
        salesByDate.set(date, []);
      }
      salesByDate.get(date)!.push(sale);
    }

    // Calculate daily stats
    const dailyStats: DailyStats[] = [];
    const dates = Array.from(salesByDate.keys()).sort();

    for (const date of dates) {
      const daySales = salesByDate.get(date)!;
      const prices = daySales.map((s) => parseEventPrice(s)).filter((p) => p > 0);

      if (prices.length === 0) continue;

      const ethPrice = ethPrices.get(date) || 0;
      const minPrice = Math.min(...prices);
      const volume = prices.reduce((a, b) => a + b, 0);

      // Calculate premium tiers
      let salesAbove10 = 0;
      let salesAbove25 = 0;
      let salesAbove50 = 0;

      for (const price of prices) {
        if (minPrice > 0) {
          const premium = ((price - minPrice) / minPrice) * 100;
          if (premium >= 10) salesAbove10++;
          if (premium >= 25) salesAbove25++;
          if (premium >= 50) salesAbove50++;
        }
      }

      // Calculate payment token and marketplace breakdown
      let ethPayments = 0;
      let wethPayments = 0;
      let otherPayments = 0;
      // Track actual ETH volume by payment type (for volume-weighted basket aggregation)
      let ethVolume = 0;
      let wethVolume = 0;
      let otherVolume = 0;
      const salePrices: { eth: number; usd: number }[] = [];
      const marketplaceCounts: Record<string, number> = {};

      for (const sale of daySales) {
        const priceEth = parseEventPrice(sale);
        if (priceEth <= 0) continue;

        const paymentToken = getPaymentToken(sale.payment?.symbol);
        if (paymentToken === "ETH") {
          ethPayments++;
          ethVolume += priceEth;
        } else if (paymentToken === "WETH") {
          wethPayments++;
          wethVolume += priceEth;
        } else {
          otherPayments++;
          otherVolume += priceEth;
        }

        // Track marketplace (protocol_address)
        const protocol = sale.protocol_address || "unknown";
        marketplaceCounts[protocol] = (marketplaceCounts[protocol] || 0) + 1;

        salePrices.push({ eth: priceEth, usd: priceEth * ethPrice });
      }

      dailyStats.push({
        date,
        volume,
        volumeUsd: volume * ethPrice,
        salesCount: prices.length,
        avgPrice: volume / prices.length,
        minPrice,
        maxPrice: Math.max(...prices),
        ethPrice,
        salesAbove10Pct: prices.length > 0 ? (salesAbove10 / prices.length) * 100 : 0,
        salesAbove25Pct: prices.length > 0 ? (salesAbove25 / prices.length) * 100 : 0,
        salesAbove50Pct: prices.length > 0 ? (salesAbove50 / prices.length) * 100 : 0,
        ethPayments,
        wethPayments,
        otherPayments,
        ethVolume,
        wethVolume,
        otherVolume,
        salePrices,
        marketplaceCounts,
      });
    }

    // Cache based on time range
    const cacheTTL = days <= 7 ? 300 : CACHE_TTL.PRICE_HISTORY; // 5 min for short ranges
    await cache.set(cacheKey, dailyStats, cacheTTL);

    return NextResponse.json(dailyStats);
  } catch (error) {
    console.error("Error fetching price history:", error);
    return NextResponse.json(
      { error: "Failed to fetch price history" },
      { status: 500 }
    );
  }
}
