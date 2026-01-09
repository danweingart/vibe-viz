import { NextResponse } from "next/server";
import { getEvents, getListings, parseEventPrice, parseListingPrice } from "@/lib/opensea/client";
import { cache } from "@/lib/cache/memory";
import { COLLECTION_SLUG } from "@/lib/constants";
import type { MarketIndicators, OpenSeaEvent } from "@/types/api";

export const dynamic = "force-dynamic";

async function fetchRecentSales(days: number): Promise<OpenSeaEvent[]> {
  const allEvents: OpenSeaEvent[] = [];
  const endTimestamp = Math.floor(Date.now() / 1000);
  const startTimestamp = endTimestamp - days * 24 * 60 * 60;
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
      COLLECTION_SLUG
    );

    allEvents.push(...response.asset_events);
    next = response.next;
    pages++;

    if (next && pages < 10) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  } while (next && pages < 10);

  return allEvents;
}

// Calculate RSI (Relative Strength Index) based on daily price changes
function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50; // Neutral if not enough data

  const changes: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }

  // Get the most recent 'period' changes
  const recentChanges = changes.slice(-period);

  let gains = 0;
  let losses = 0;

  for (const change of recentChanges) {
    if (change > 0) gains += change;
    else losses -= change; // Make positive
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);

  return Math.round(rsi * 10) / 10;
}

// Calculate momentum as rate of price change
function calculateMomentum(prices: number[]): number {
  if (prices.length < 2) return 0;

  const recent = prices.slice(-7);
  const earlier = prices.slice(-14, -7);

  if (recent.length === 0 || earlier.length === 0) return 0;

  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;

  if (earlierAvg === 0) return 0;

  const momentum = ((recentAvg - earlierAvg) / earlierAvg) * 100;
  return Math.round(Math.max(-100, Math.min(100, momentum)) * 10) / 10;
}

export async function GET() {
  try {
    const cacheKey = `market-indicators-${COLLECTION_SLUG}`;
    const cached = await cache.get<MarketIndicators>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Fetch 30 days of sales and current listings
    const [sales, listings] = await Promise.all([
      fetchRecentSales(30),
      getListings(COLLECTION_SLUG, 50),
    ]);

    if (sales.length === 0) {
      return NextResponse.json({
        rsi: 50,
        momentum: 0,
        liquidityScore: 0,
        volumeTrend: "stable",
        priceTrend: "neutral",
        lastUpdated: new Date().toISOString(),
      });
    }

    // Group sales by date and calculate daily average prices
    const salesByDate = new Map<string, number[]>();
    for (const sale of sales) {
      const date = new Date(sale.event_timestamp * 1000).toISOString().split("T")[0];
      const price = parseEventPrice(sale);
      if (price > 0) {
        if (!salesByDate.has(date)) {
          salesByDate.set(date, []);
        }
        salesByDate.get(date)!.push(price);
      }
    }

    // Calculate daily average prices
    const sortedDates = Array.from(salesByDate.keys()).sort();
    const dailyAvgPrices = sortedDates.map((date) => {
      const prices = salesByDate.get(date)!;
      return prices.reduce((a, b) => a + b, 0) / prices.length;
    });

    // Calculate daily volumes
    const dailyVolumes = sortedDates.map((date) => {
      const prices = salesByDate.get(date)!;
      return prices.reduce((a, b) => a + b, 0);
    });

    // Calculate RSI
    const rsi = calculateRSI(dailyAvgPrices);

    // Calculate momentum
    const momentum = calculateMomentum(dailyAvgPrices);

    // Calculate liquidity score (0-100)
    // Based on: listings count, sales velocity, bid-ask activity
    const listingCount = listings.length;
    const avgDailySales = sales.length / 30;
    const listingPrices = listings.map(parseListingPrice).filter((p) => p > 0);
    const priceSpread = listingPrices.length > 1
      ? (Math.max(...listingPrices) - Math.min(...listingPrices)) / Math.min(...listingPrices)
      : 1;

    // Score components (each 0-33.3)
    const listingScore = Math.min(33.3, (listingCount / 50) * 33.3);
    const velocityScore = Math.min(33.3, (avgDailySales / 10) * 33.3);
    const spreadScore = Math.max(0, 33.3 - priceSpread * 10); // Lower spread = higher score

    const liquidityScore = Math.round(listingScore + velocityScore + spreadScore);

    // Determine volume trend
    const recentVolume = dailyVolumes.slice(-7).reduce((a, b) => a + b, 0);
    const earlierVolume = dailyVolumes.slice(-14, -7).reduce((a, b) => a + b, 0);
    const volumeChange = earlierVolume > 0 ? (recentVolume - earlierVolume) / earlierVolume : 0;

    let volumeTrend: "increasing" | "decreasing" | "stable" = "stable";
    if (volumeChange > 0.15) volumeTrend = "increasing";
    else if (volumeChange < -0.15) volumeTrend = "decreasing";

    // Determine price trend
    let priceTrend: "bullish" | "bearish" | "neutral" = "neutral";
    if (rsi > 60 && momentum > 5) priceTrend = "bullish";
    else if (rsi < 40 && momentum < -5) priceTrend = "bearish";

    const indicators: MarketIndicators = {
      rsi,
      momentum,
      liquidityScore,
      volumeTrend,
      priceTrend,
      lastUpdated: new Date().toISOString(),
    };

    // Cache for 5 minutes
    await cache.set(cacheKey, indicators, 300);

    return NextResponse.json(indicators);
  } catch (error) {
    console.error("Error calculating market indicators:", error);
    return NextResponse.json(
      { error: "Failed to calculate market indicators" },
      { status: 500 }
    );
  }
}
