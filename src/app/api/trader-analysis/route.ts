import { NextRequest, NextResponse } from "next/server";
import {
  getTokenTransfers,
  filterToSalesOnly,
} from "@/lib/etherscan/client";
import { getEthPrice } from "@/lib/coingecko/client";
import {
  enrichTransfersWithPrices,
  transformToSaleRecords,
} from "@/lib/etherscan/transformer";
import { cache } from "@/lib/cache/postgres";
import { withTimeout, timeoutWithCache } from "@/lib/middleware/timeout";
import type { SaleRecord, DailyTraderStats, FlipRecord } from "@/types/api";

export const dynamic = "force-dynamic";

interface TraderAnalysis {
  dailyStats: DailyTraderStats[];
  flips: FlipRecord[];
  topBuyers: { address: string; count: number; volume: number }[];
  topSellers: { address: string; count: number; volume: number }[];
  repeatBuyerRate: number;
  avgHoldingPeriod: number;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const days = Math.min(parseInt(searchParams.get("days") || "30"), 90);
  const cacheKey = `trader-analysis-${days}`;

  return withTimeout(async () => {
  try {
    const cached = await cache.get<TraderAnalysis>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Stale-while-revalidate: return stale data immediately if available
    const staleData = await cache.get<TraderAnalysis>(cacheKey, true);
    if (staleData) {
      console.log("Returning stale trader analysis while refreshing...");
      return NextResponse.json(staleData);
    }

    console.log(`Fetching trader analysis for ${days} days...`);

    // Fetch the most recent transfers in a single API call, then filter by date
    const [ethPriceData, allTransfers] = await Promise.all([
      getEthPrice(),
      getTokenTransfers(undefined, 0, 'latest', 1, 1000),
    ]);

    // Filter to the requested date range
    const cutoffTimestamp = Math.floor(Date.now() / 1000) - (days * 86400);
    const transfersInRange = allTransfers.filter(
      t => parseInt(t.timeStamp) >= cutoffTimestamp
    );

    // Filter to sales only
    const salesTransfers = filterToSalesOnly(transfersInRange);

    // Enrich with prices
    const enriched = await enrichTransfersWithPrices(salesTransfers, ethPriceData.usd);

    // Transform to SaleRecord format
    const sales = transformToSaleRecords(enriched);

    console.log(`Analyzing ${sales.length} sales...`);

    if (sales.length === 0) {
      return NextResponse.json({
        dailyStats: [],
        flips: [],
        topBuyers: [],
        topSellers: [],
        repeatBuyerRate: 0,
        avgHoldingPeriod: 0,
      });
    }

    // Track all buyers and sellers
    const allBuyers = new Set<string>();
    const buyerCounts = new Map<string, { count: number; volume: number }>();
    const sellerCounts = new Map<string, { count: number; volume: number }>();

    // Track token ownership for flip detection
    const tokenHistory = new Map<string, { buyer: string; price: number; timestamp: number }[]>();

    // Group by date for daily stats
    const salesByDate = new Map<string, SaleRecord[]>();

    for (const sale of sales) {
      const date = sale.timestamp.toISOString().split("T")[0];
      const price = sale.priceEth;
      const buyer = sale.buyer.toLowerCase();
      const seller = sale.seller.toLowerCase();
      const tokenId = sale.tokenId;

      // Track by date
      if (!salesByDate.has(date)) {
        salesByDate.set(date, []);
      }
      salesByDate.get(date)!.push(sale);

      // Track buyers
      allBuyers.add(buyer);
      const existingBuyer = buyerCounts.get(buyer) || { count: 0, volume: 0 };
      buyerCounts.set(buyer, { count: existingBuyer.count + 1, volume: existingBuyer.volume + price });

      // Track sellers
      const existingSeller = sellerCounts.get(seller) || { count: 0, volume: 0 };
      sellerCounts.set(seller, { count: existingSeller.count + 1, volume: existingSeller.volume + price });

      // Track token history for flip detection
      if (!tokenHistory.has(tokenId)) {
        tokenHistory.set(tokenId, []);
      }
      tokenHistory.get(tokenId)!.push({
        buyer,
        price,
        timestamp: Math.floor(sale.timestamp.getTime() / 1000),
      });
    }

    // Calculate daily stats
    const dailyStats: DailyTraderStats[] = [];
    const seenBuyers = new Set<string>();
    const sortedDates = Array.from(salesByDate.keys()).sort();

    for (const date of sortedDates) {
      const daySales = salesByDate.get(date)!;
      const dayBuyers = new Set<string>();
      const daySellers = new Set<string>();
      let newBuyers = 0;

      for (const sale of daySales) {
        const buyer = sale.buyer.toLowerCase();
        const seller = sale.seller.toLowerCase();

        dayBuyers.add(buyer);
        if (!seenBuyers.has(buyer)) {
          newBuyers++;
          seenBuyers.add(buyer);
        }

        daySellers.add(seller);
      }

      dailyStats.push({
        date,
        uniqueBuyers: dayBuyers.size,
        uniqueSellers: daySellers.size,
        repeatBuyers: dayBuyers.size - newBuyers,
        newBuyers,
        totalTrades: daySales.length,
      });
    }

    // Detect flips (same token sold multiple times)
    const flips: FlipRecord[] = [];
    let totalHoldingDays = 0;
    let flipCount = 0;

    for (const [tokenId, history] of tokenHistory) {
      if (history.length >= 2) {
        // Sort by timestamp
        history.sort((a, b) => a.timestamp - b.timestamp);

        for (let i = 1; i < history.length; i++) {
          const buy = history[i - 1];
          const sell = history[i];

          const holdingDays = Math.round((sell.timestamp - buy.timestamp) / 86400);
          const profit = sell.price - buy.price;
          const profitPercent = buy.price > 0 ? (profit / buy.price) * 100 : 0;

          flips.push({
            tokenId,
            buyPrice: buy.price,
            sellPrice: sell.price,
            profit,
            profitPercent,
            holdingDays,
            buyer: buy.buyer,
          });

          totalHoldingDays += holdingDays;
          flipCount++;
        }
      }
    }

    // Calculate top buyers and sellers
    const topBuyers = Array.from(buyerCounts.entries())
      .map(([address, data]) => ({ address, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topSellers = Array.from(sellerCounts.entries())
      .map(([address, data]) => ({ address, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate repeat buyer rate
    const repeatBuyers = Array.from(buyerCounts.values()).filter((b) => b.count > 1).length;
    const repeatBuyerRate = allBuyers.size > 0 ? (repeatBuyers / allBuyers.size) * 100 : 0;

    // Average holding period
    const avgHoldingPeriod = flipCount > 0 ? totalHoldingDays / flipCount : 0;

    const result: TraderAnalysis = {
      dailyStats,
      flips: flips.sort((a, b) => b.profitPercent - a.profitPercent).slice(0, 50),
      topBuyers,
      topSellers,
      repeatBuyerRate: Math.round(repeatBuyerRate * 10) / 10,
      avgHoldingPeriod: Math.round(avgHoldingPeriod * 10) / 10,
    };

    // Cache for 30 minutes
    await cache.set(cacheKey, result, 1800);

    console.log("Trader analysis complete");

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching trader analysis:", error);

    const staleCache = await cache.get<TraderAnalysis>(cacheKey, true);
    if (staleCache) {
      console.log("Returning stale cached trader analysis");
      return NextResponse.json(staleCache);
    }

    return NextResponse.json(
      { error: "Failed to fetch trader analysis" },
      { status: 500 }
    );
  }
  }, timeoutWithCache(async () => {
    return await cache.get<TraderAnalysis>(cacheKey, true);
  }));
}
