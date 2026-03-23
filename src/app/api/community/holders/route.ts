import { NextResponse } from "next/server";
import {
  getTokenTransfers,
  buildOwnershipMap,
} from "@/lib/etherscan/client";
import { getListings } from "@/lib/opensea/client";
import { cache } from "@/lib/cache/postgres";
import { withTimeout, timeoutWithCache } from "@/lib/middleware/timeout";

export const dynamic = "force-dynamic";

interface HolderEntry {
  address: string;
  tokenCount: number;
  percentOfSupply: number;
  hasActiveListing: boolean;
  lastTransferTimestamp: number | null;
}

interface HoldersResponse {
  holders: HolderEntry[];
  diamondHands: HolderEntry[];
  stats: {
    totalHolders: number;
    diamondHandsCount: number;
    diamondHandsPercent: number;
    totalSupply: number;
    topHolderConcentration: number;
  };
}

const CACHE_KEY = "community-holders";
const CACHE_TTL = 14400; // 4 hours
const TOTAL_SUPPLY = 10000;

export async function GET() {
  return withTimeout(
    async () => {
      try {
        const cached = await cache.get<HoldersResponse>(CACHE_KEY);
        if (cached) {
          return NextResponse.json(cached);
        }

        const staleData = await cache.get<HoldersResponse>(CACHE_KEY, true);
        if (staleData) {
          return NextResponse.json(staleData);
        }

        console.log("Building community holders data...");

        // Fetch transfers and listings in parallel
        // Single Etherscan call for up to 10k transfers + OpenSea listings
        const [allTransfers, activeListings] = await Promise.all([
          getTokenTransfers(undefined, 0, "latest", 1, 10000),
          getListings(undefined, 100).catch(() => []),
        ]);

        console.log(`Got ${allTransfers.length} transfers, ${activeListings.length} listings`);

        // Build current ownership map from transfer history
        const ownershipMap = buildOwnershipMap(allTransfers);

        // Build set of addresses with active listings
        const listedAddresses = new Set<string>();
        for (const listing of activeListings) {
          const offerer = listing.protocol_data?.parameters?.offerer;
          if (offerer) {
            listedAddresses.add(offerer.toLowerCase());
          }
        }

        // Build last transfer timestamp per address
        const lastTransfer = new Map<string, number>();
        for (const transfer of allTransfers) {
          const from = transfer.from.toLowerCase();
          const to = transfer.to.toLowerCase();
          const ts = parseInt(transfer.timeStamp);

          if (!lastTransfer.has(to) || ts > lastTransfer.get(to)!) {
            lastTransfer.set(to, ts);
          }
          if (!lastTransfer.has(from) || ts > lastTransfer.get(from)!) {
            lastTransfer.set(from, ts);
          }
        }

        // Build sorted holder list
        const holderEntries: HolderEntry[] = [];
        for (const [address, tokenIds] of ownershipMap) {
          holderEntries.push({
            address,
            tokenCount: tokenIds.size,
            percentOfSupply: Math.round((tokenIds.size / TOTAL_SUPPLY) * 10000) / 100,
            hasActiveListing: listedAddresses.has(address),
            lastTransferTimestamp: lastTransfer.get(address) || null,
          });
        }

        holderEntries.sort((a, b) => b.tokenCount - a.tokenCount);

        // Diamond hands: holders without active listings
        const diamondHands = holderEntries.filter((h) => !h.hasActiveListing);

        // Top 10 holder concentration
        const top10Holdings = holderEntries
          .slice(0, 10)
          .reduce((sum, h) => sum + h.tokenCount, 0);

        const result: HoldersResponse = {
          holders: holderEntries.slice(0, 100),
          diamondHands: diamondHands.slice(0, 50),
          stats: {
            totalHolders: holderEntries.length,
            diamondHandsCount: diamondHands.length,
            diamondHandsPercent:
              holderEntries.length > 0
                ? Math.round((diamondHands.length / holderEntries.length) * 1000) / 10
                : 0,
            totalSupply: TOTAL_SUPPLY,
            topHolderConcentration:
              Math.round((top10Holdings / TOTAL_SUPPLY) * 1000) / 10,
          },
        };

        await cache.set(CACHE_KEY, result, CACHE_TTL);
        console.log(`Community holders cached: ${result.stats.totalHolders} holders`);

        return NextResponse.json(result);
      } catch (error) {
        console.error("Error building community holders:", error);

        const staleCache = await cache.get<HoldersResponse>(CACHE_KEY, true);
        if (staleCache) {
          return NextResponse.json(staleCache);
        }

        return NextResponse.json(
          { error: "Failed to fetch community holders" },
          { status: 500 }
        );
      }
    },
    timeoutWithCache(async () => {
      return await cache.get<HoldersResponse>(CACHE_KEY, true);
    })
  );
}
