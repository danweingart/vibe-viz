import { NextRequest, NextResponse } from "next/server";
import { getEvents, parseEventPrice } from "@/lib/opensea/client";
import { cache } from "@/lib/cache/memory";
import { COLLECTION_SLUG } from "@/lib/constants";
import type { OpenSeaEvent, DailyTraderStats, FlipRecord } from "@/types/api";

export const dynamic = "force-dynamic";

interface TraderAnalysis {
  dailyStats: DailyTraderStats[];
  flips: FlipRecord[];
  topBuyers: { address: string; count: number; volume: number }[];
  topSellers: { address: string; count: number; volume: number }[];
  repeatBuyerRate: number;
  avgHoldingPeriod: number;
}

async function fetchAllSales(
  startTimestamp: number,
  endTimestamp: number,
  maxPages: number = 20
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
      COLLECTION_SLUG
    );

    allEvents.push(...response.asset_events);
    next = response.next;
    pages++;

    if (next && pages < maxPages) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  } while (next && pages < maxPages);

  return allEvents;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = Math.min(parseInt(searchParams.get("days") || "30"), 90);

    const cacheKey = `trader-analysis-${days}`;
    const cached = await cache.get<TraderAnalysis>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const endTimestamp = Math.floor(Date.now() / 1000);
    const startTimestamp = endTimestamp - days * 24 * 60 * 60;

    const sales = await fetchAllSales(startTimestamp, endTimestamp);

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
    const salesByDate = new Map<string, OpenSeaEvent[]>();

    for (const sale of sales) {
      const date = new Date(sale.event_timestamp * 1000).toISOString().split("T")[0];
      const price = parseEventPrice(sale);
      const buyer = sale.buyer?.toLowerCase() || "";
      const seller = sale.seller?.toLowerCase() || "";
      const tokenId = sale.nft?.identifier || "";

      // Track by date
      if (!salesByDate.has(date)) {
        salesByDate.set(date, []);
      }
      salesByDate.get(date)!.push(sale);

      // Track buyers
      if (buyer) {
        allBuyers.add(buyer);
        const existing = buyerCounts.get(buyer) || { count: 0, volume: 0 };
        buyerCounts.set(buyer, { count: existing.count + 1, volume: existing.volume + price });
      }

      // Track sellers
      if (seller) {
        const existing = sellerCounts.get(seller) || { count: 0, volume: 0 };
        sellerCounts.set(seller, { count: existing.count + 1, volume: existing.volume + price });
      }

      // Track token history for flip detection
      if (tokenId) {
        if (!tokenHistory.has(tokenId)) {
          tokenHistory.set(tokenId, []);
        }
        tokenHistory.get(tokenId)!.push({
          buyer,
          price,
          timestamp: sale.event_timestamp,
        });
      }
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
        const buyer = sale.buyer?.toLowerCase() || "";
        const seller = sale.seller?.toLowerCase() || "";

        if (buyer) {
          dayBuyers.add(buyer);
          if (!seenBuyers.has(buyer)) {
            newBuyers++;
            seenBuyers.add(buyer);
          }
        }
        if (seller) {
          daySellers.add(seller);
        }
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

          // Check if seller was previous buyer (actual flip)
          // Note: In this data, we're tracking all resales for the token
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

    // Cache for 10 minutes
    await cache.set(cacheKey, result, 600);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching trader analysis:", error);
    return NextResponse.json(
      { error: "Failed to fetch trader analysis" },
      { status: 500 }
    );
  }
}
