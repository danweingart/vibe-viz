import { NextResponse } from "next/server";
import { getListings, parseListingPrice } from "@/lib/opensea/client";
import {
  getTransfersInDateRange,
  filterToSalesOnly,
} from "@/lib/etherscan/client";
import { getEthPrice } from "@/lib/coingecko/client";
import {
  enrichTransfersWithPrices,
  transformToSaleRecords,
} from "@/lib/etherscan/transformer";
import { cache } from "@/lib/cache/postgres";
import { COLLECTION_SLUG } from "@/lib/constants";
import { withTimeout, timeoutWithCache } from "@/lib/middleware/timeout";
import type { MarketIndicators } from "@/types/api";

export const dynamic = "force-dynamic";

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

const CACHE_KEY = `market-indicators-${COLLECTION_SLUG}`;

export async function GET() {
  return withTimeout(async () => {
  try {
    const cached = await cache.get<MarketIndicators>(CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Stale-while-revalidate: return stale data immediately if available
    const staleData = await cache.get<MarketIndicators>(CACHE_KEY, true);
    if (staleData) {
      console.log("Returning stale market indicators while refreshing...");
      return NextResponse.json({ ...staleData, _stale: true });
    }

    console.log("Calculating market indicators (hybrid Etherscan + OpenSea)...");

    // Fetch 30 days of sales from Etherscan and current listings from OpenSea
    const [ethPriceData, allTransfers, listings] = await Promise.all([
      getEthPrice(),
      getTransfersInDateRange(30),
      getListings(COLLECTION_SLUG, 50),
    ]);

    // Filter to sales only
    const salesTransfers = filterToSalesOnly(allTransfers);

    // Enrich with prices
    const enriched = await enrichTransfersWithPrices(salesTransfers, ethPriceData.usd);

    // Transform to SaleRecord format
    const sales = transformToSaleRecords(enriched);

    console.log(`Analyzing ${sales.length} sales for market indicators...`);

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
      const date = sale.timestamp.toISOString().split("T")[0];
      const price = sale.priceEth;
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
    const listingCount = listings.length;
    const avgDailySales = sales.length / 30;
    const listingPrices = listings.map(parseListingPrice).filter((p) => p > 0);
    const priceSpread = listingPrices.length > 1
      ? (Math.max(...listingPrices) - Math.min(...listingPrices)) / Math.min(...listingPrices)
      : 1;

    // Score components (each 0-33.3)
    const listingScore = Math.min(33.3, (listingCount / 50) * 33.3);
    const velocityScore = Math.min(33.3, (avgDailySales / 10) * 33.3);
    const spreadScore = Math.max(0, 33.3 - priceSpread * 10);

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

    // Cache for 30 minutes
    await cache.set(CACHE_KEY, indicators, 1800);

    console.log("Market indicators calculated:", indicators);

    return NextResponse.json(indicators);
  } catch (error) {
    console.error("Error calculating market indicators:", error);

    const staleCache = await cache.get<MarketIndicators>(CACHE_KEY, true);
    if (staleCache) {
      console.log("Returning stale cached market indicators");
      return NextResponse.json({
        ...staleCache,
        lastUpdated: new Date().toISOString(),
        _stale: true,
      });
    }

    return NextResponse.json(
      { error: "Failed to calculate market indicators" },
      { status: 500 }
    );
  }
  }, timeoutWithCache(async () => {
    return await cache.get<MarketIndicators>(CACHE_KEY, true);
  }));
}
