import { NextResponse } from "next/server";
import {
  getTokenTransfers,
  filterToSalesOnly,
  buildOwnershipMap,
} from "@/lib/etherscan/client";
import { cache } from "@/lib/cache/postgres";
import { withTimeout, timeoutWithCache } from "@/lib/middleware/timeout";

export const dynamic = "force-dynamic";

interface NewCollector {
  address: string;
  firstPurchaseTimestamp: number;
  tokensAcquired: number;
}

interface Accumulator {
  address: string;
  buysThisMonth: number;
  currentHoldings: number;
}

interface ActivityResponse {
  newCollectors: NewCollector[];
  accumulators: Accumulator[];
  stats: {
    newCollectors30d: number;
    accumulatorCount: number;
    totalBuys30d: number;
    totalSells30d: number;
    netAccumulationRate: number;
  };
}

const CACHE_KEY = "community-activity";
const CACHE_TTL = 1800; // 30 minutes

export async function GET() {
  return withTimeout(
    async () => {
      try {
        const cached = await cache.get<ActivityResponse>(CACHE_KEY);
        if (cached) {
          return NextResponse.json(cached);
        }

        const staleData = await cache.get<ActivityResponse>(CACHE_KEY, true);
        if (staleData) {
          return NextResponse.json(staleData);
        }

        console.log("Building community activity data...");

        // Single Etherscan call for recent transfers
        const allTransfers = await getTokenTransfers(undefined, 0, "latest", 1, 10000);

        // Build ownership map for current holdings
        const ownershipMap = buildOwnershipMap(allTransfers);

        const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 86400;

        // Filter to real sales:
        // 1. Exclude mints/burns
        // 2. Exclude batch transfers (>1 token per tx = wallet reorganization, not sales)
        const nonMintTransfers = filterToSalesOnly(allTransfers);

        // Count tokens per transaction hash — batch txs are wallet transfers, not sales
        const txTokenCounts = new Map<string, number>();
        for (const t of nonMintTransfers) {
          txTokenCounts.set(t.hash, (txTokenCounts.get(t.hash) || 0) + 1);
        }
        const allSales = nonMintTransfers.filter(
          (t) => (txTokenCounts.get(t.hash) || 0) <= 1
        );

        // Track all-time buyers (before 30d window) for first-time detection
        const historicalBuyers = new Set<string>();
        const recentBuyerActivity = new Map<
          string,
          { count: number; firstBuyTs: number; tokens: Set<string> }
        >();
        const recentSellers = new Set<string>();

        for (const transfer of allSales) {
          const buyer = transfer.to.toLowerCase();
          const seller = transfer.from.toLowerCase();
          const ts = parseInt(transfer.timeStamp);

          if (ts < thirtyDaysAgo) {
            historicalBuyers.add(buyer);
          } else {
            // Recent activity
            recentSellers.add(seller);

            const existing = recentBuyerActivity.get(buyer) || {
              count: 0,
              firstBuyTs: Infinity,
              tokens: new Set<string>(),
            };
            existing.count++;
            existing.firstBuyTs = Math.min(existing.firstBuyTs, ts);
            existing.tokens.add(transfer.tokenID);
            recentBuyerActivity.set(buyer, existing);
          }
        }

        // New collectors: bought recently but never bought before
        const newCollectorEntries: NewCollector[] = [];
        for (const [address, activity] of recentBuyerActivity) {
          if (!historicalBuyers.has(address)) {
            newCollectorEntries.push({
              address,
              firstPurchaseTimestamp: activity.firstBuyTs,
              tokensAcquired: activity.tokens.size,
            });
          }
        }
        newCollectorEntries.sort((a, b) => b.firstPurchaseTimestamp - a.firstPurchaseTimestamp);

        // Accumulators: bought recently without selling
        const accumulatorEntries: Accumulator[] = [];
        for (const [address, activity] of recentBuyerActivity) {
          if (!recentSellers.has(address)) {
            accumulatorEntries.push({
              address,
              buysThisMonth: activity.count,
              currentHoldings: ownershipMap.get(address)?.size || 0,
            });
          }
        }
        accumulatorEntries.sort((a, b) => b.buysThisMonth - a.buysThisMonth);

        const totalBuys = Array.from(recentBuyerActivity.values()).reduce(
          (sum, a) => sum + a.count,
          0
        );
        const totalSells = recentSellers.size;

        const result: ActivityResponse = {
          newCollectors: newCollectorEntries.slice(0, 25),
          accumulators: accumulatorEntries.slice(0, 25),
          stats: {
            newCollectors30d: newCollectorEntries.length,
            accumulatorCount: accumulatorEntries.length,
            totalBuys30d: totalBuys,
            totalSells30d: totalSells,
            netAccumulationRate:
              totalBuys > 0
                ? Math.round(((totalBuys - totalSells) / totalBuys) * 1000) / 10
                : 0,
          },
        };

        await cache.set(CACHE_KEY, result, CACHE_TTL);
        console.log(`Community activity cached: ${newCollectorEntries.length} new, ${accumulatorEntries.length} accumulators`);

        return NextResponse.json(result);
      } catch (error) {
        console.error("Error building community activity:", error);

        const staleCache = await cache.get<ActivityResponse>(CACHE_KEY, true);
        if (staleCache) {
          return NextResponse.json(staleCache);
        }

        return NextResponse.json(
          { error: "Failed to fetch community activity" },
          { status: 500 }
        );
      }
    },
    timeoutWithCache(async () => {
      return await cache.get<ActivityResponse>(CACHE_KEY, true);
    })
  );
}
