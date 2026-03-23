import { NextResponse } from "next/server";
import { getERC20TokenTransfers } from "@/lib/etherscan/client";
import { cache } from "@/lib/cache/postgres";
import { withTimeout, timeoutWithCache } from "@/lib/middleware/timeout";
import { VIBESTR_TOKEN_CONTRACT } from "@/lib/constants";

export const dynamic = "force-dynamic";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const DEAD_ADDRESSES = new Set([
  ZERO_ADDRESS,
  "0x000000000000000000000000000000000000dead",
]);

interface VibestrHolder {
  address: string;
  balance: number;
  lastSellTimestamp: number | null;
}

interface VibestrNewBuyer {
  address: string;
  firstBuyTimestamp: number;
  amountPurchased: number;
}

interface VibestrActivityResponse {
  diamondHands: VibestrHolder[];
  newBuyers: VibestrNewBuyer[];
  stats: {
    totalHolders: number;
    diamondHandsCount: number;
    newBuyers30d: number;
    totalTransfers30d: number;
  };
}

const CACHE_KEY = "community-vibestr-activity";
const CACHE_TTL = 3600; // 1 hour

export async function GET() {
  return withTimeout(
    async () => {
      try {
        const cached = await cache.get<VibestrActivityResponse>(CACHE_KEY);
        if (cached) {
          return NextResponse.json(cached);
        }

        const staleData = await cache.get<VibestrActivityResponse>(CACHE_KEY, true);
        if (staleData) {
          return NextResponse.json(staleData);
        }

        console.log("Building VIBESTR community activity data...");

        // Single Etherscan call - fetch most recent 2000 ERC-20 transfers
        const transfers = await getERC20TokenTransfers(
          VIBESTR_TOKEN_CONTRACT,
          0,
          "latest",
          1,
          2000
        );

        console.log(`Fetched ${transfers.length} VIBESTR transfers`);

        if (transfers.length === 0) {
          const empty: VibestrActivityResponse = {
            diamondHands: [],
            newBuyers: [],
            stats: { totalHolders: 0, diamondHandsCount: 0, newBuyers30d: 0, totalTransfers30d: 0 },
          };
          return NextResponse.json(empty);
        }

        const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 86400;
        const decimals = parseInt(transfers[0]?.tokenDecimal || "18");

        // Sort oldest first for accurate balance tracking
        const sortedTransfers = [...transfers].sort(
          (a, b) => parseInt(a.timeStamp) - parseInt(b.timeStamp)
        );

        // Build balance map and track sells/buys
        const balances = new Map<string, number>();
        const lastSell = new Map<string, number>();
        const historicalBuyers = new Set<string>();
        const recentBuyAmounts = new Map<string, { amount: number; firstTs: number }>();
        let recentTransferCount = 0;

        for (const transfer of sortedTransfers) {
          const from = transfer.from.toLowerCase();
          const to = transfer.to.toLowerCase();
          const ts = parseInt(transfer.timeStamp);
          const value = Number(BigInt(transfer.value)) / Math.pow(10, decimals);

          if (ts >= thirtyDaysAgo) recentTransferCount++;

          // Update balances
          if (!DEAD_ADDRESSES.has(from)) {
            balances.set(from, (balances.get(from) || 0) - value);
          }
          if (!DEAD_ADDRESSES.has(to)) {
            balances.set(to, (balances.get(to) || 0) + value);
          }

          // Track sells
          if (!DEAD_ADDRESSES.has(from) && !DEAD_ADDRESSES.has(to)) {
            const existing = lastSell.get(from);
            if (!existing || ts > existing) {
              lastSell.set(from, ts);
            }
          }

          // Track buys for new buyer detection
          if (!DEAD_ADDRESSES.has(to) && !DEAD_ADDRESSES.has(from)) {
            if (ts < thirtyDaysAgo) {
              historicalBuyers.add(to);
            } else {
              const existing = recentBuyAmounts.get(to);
              if (existing) {
                existing.amount += value;
              } else {
                recentBuyAmounts.set(to, { amount: value, firstTs: ts });
              }
            }
          }
        }

        // Filter to holders with meaningful balance
        const holdersWithBalance: VibestrHolder[] = [];
        for (const [address, balance] of balances) {
          if (balance > 1 && !DEAD_ADDRESSES.has(address)) {
            holdersWithBalance.push({
              address,
              balance: Math.round(balance),
              lastSellTimestamp: lastSell.get(address) || null,
            });
          }
        }

        // Diamond hands: haven't sold in 30+ days
        const diamondHands = holdersWithBalance
          .filter((h) => !h.lastSellTimestamp || h.lastSellTimestamp < thirtyDaysAgo)
          .sort((a, b) => b.balance - a.balance)
          .slice(0, 25);

        // New buyers
        const newBuyers: VibestrNewBuyer[] = [];
        for (const [address, data] of recentBuyAmounts) {
          if (!historicalBuyers.has(address) && data.amount > 1) {
            newBuyers.push({
              address,
              firstBuyTimestamp: data.firstTs,
              amountPurchased: Math.round(data.amount),
            });
          }
        }
        newBuyers.sort((a, b) => b.firstBuyTimestamp - a.firstBuyTimestamp);

        const result: VibestrActivityResponse = {
          diamondHands,
          newBuyers: newBuyers.slice(0, 25),
          stats: {
            totalHolders: holdersWithBalance.length,
            diamondHandsCount: diamondHands.length,
            newBuyers30d: newBuyers.length,
            totalTransfers30d: recentTransferCount,
          },
        };

        await cache.set(CACHE_KEY, result, CACHE_TTL);
        console.log(`VIBESTR activity cached: ${diamondHands.length} diamond hands, ${newBuyers.length} new buyers`);

        return NextResponse.json(result);
      } catch (error) {
        console.error("Error building VIBESTR community activity:", error);

        const staleCache = await cache.get<VibestrActivityResponse>(CACHE_KEY, true);
        if (staleCache) {
          return NextResponse.json(staleCache);
        }

        return NextResponse.json(
          { error: "Failed to fetch VIBESTR community activity" },
          { status: 500 }
        );
      }
    },
    timeoutWithCache(async () => {
      return await cache.get<VibestrActivityResponse>(CACHE_KEY, true);
    })
  );
}
