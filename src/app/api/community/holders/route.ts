import { NextResponse } from "next/server";
import {
  getTokenTransfers,
  type EtherscanTransfer,
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
  _partial?: boolean;
  _progress?: string;
}

/**
 * Incremental build state — stores the ownership map (compact) not raw transfers.
 * Map format: { address: tokenId[] }
 */
interface BuildState {
  holdings: Record<string, string[]>;
  lastTransfers: Record<string, number>; // address → last transfer timestamp
  lastBlock: number;
  complete: boolean;
  totalProcessed: number;
}

const CACHE_KEY = "community-holders-v2";
const BUILD_KEY = "community-holders-build-v2";
const CACHE_TTL = 14400; // 4 hours
const BUILD_TTL = 600; // 10 minutes
const TOTAL_SUPPLY = 10000;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/**
 * Apply a batch of transfers to the ownership map incrementally.
 */
function applyTransfers(
  state: BuildState,
  transfers: EtherscanTransfer[]
): void {
  // Sort ascending by block (should already be ascending from API)
  const sorted = [...transfers].sort(
    (a, b) => parseInt(a.blockNumber) - parseInt(b.blockNumber)
  );

  for (const t of sorted) {
    const from = t.from.toLowerCase();
    const to = t.to.toLowerCase();
    const tokenId = t.tokenID;
    const ts = parseInt(t.timeStamp);

    // Remove from sender
    if (from !== ZERO_ADDRESS && state.holdings[from]) {
      state.holdings[from] = state.holdings[from].filter(
        (id) => id !== tokenId
      );
      if (state.holdings[from].length === 0) {
        delete state.holdings[from];
      }
    }

    // Add to receiver
    if (to !== ZERO_ADDRESS) {
      if (!state.holdings[to]) {
        state.holdings[to] = [];
      }
      if (!state.holdings[to].includes(tokenId)) {
        state.holdings[to].push(tokenId);
      }
    }

    // Track last transfer timestamp
    if (from !== ZERO_ADDRESS) {
      state.lastTransfers[from] = Math.max(
        state.lastTransfers[from] || 0,
        ts
      );
    }
    if (to !== ZERO_ADDRESS) {
      state.lastTransfers[to] = Math.max(
        state.lastTransfers[to] || 0,
        ts
      );
    }
  }

  state.totalProcessed += transfers.length;
  if (sorted.length > 0) {
    state.lastBlock =
      Math.max(...sorted.map((t) => parseInt(t.blockNumber))) + 1;
  }
}

export async function GET() {
  return withTimeout(
    async () => {
      try {
        // Fast path: return completed cached data
        const cached = await cache.get<HoldersResponse>(CACHE_KEY);
        if (cached) {
          return NextResponse.json(cached);
        }

        // Stale data for fallback
        const staleData = await cache.get<HoldersResponse>(
          CACHE_KEY,
          true
        );

        // Load or initialize build state
        let buildState = await cache.get<BuildState>(BUILD_KEY);
        if (!buildState) {
          buildState = {
            holdings: {},
            lastTransfers: {},
            lastBlock: 0,
            complete: false,
            totalProcessed: 0,
          };
        }

        if (!buildState.complete) {
          console.log(
            `Holders build: batch from block ${buildState.lastBlock} (${buildState.totalProcessed} processed so far)...`
          );

          // Fetch one batch of 10k transfers ascending
          const batch = await getTokenTransfers(
            undefined,
            buildState.lastBlock,
            "latest",
            1,
            10000,
            "asc"
          );

          console.log(`Holders build: got ${batch.length} transfers`);

          if (batch.length > 0) {
            applyTransfers(buildState, batch);
          }

          if (batch.length < 10000) {
            buildState.complete = true;
          }

          // Save build progress (ownership map is compact — ~500 entries)
          await cache.set(BUILD_KEY, buildState, BUILD_TTL);

          if (!buildState.complete) {
            if (staleData) {
              return NextResponse.json(staleData);
            }
            const batchNum = Math.ceil(
              buildState.totalProcessed / 10000
            );
            return NextResponse.json({
              holders: [],
              diamondHands: [],
              stats: {
                totalHolders: 0,
                diamondHandsCount: 0,
                diamondHandsPercent: 0,
                totalSupply: TOTAL_SUPPLY,
                topHolderConcentration: 0,
              },
              _partial: true,
              _progress: `Building ownership map... (${buildState.totalProcessed.toLocaleString()} transfers processed)`,
            });
          }
        }

        // Build is complete — compute final result from ownership map
        console.log(
          `Holders build complete: ${buildState.totalProcessed} transfers, ${Object.keys(buildState.holdings).length} holders`
        );

        // Fetch active listings
        const activeListings = await getListings(undefined, 100).catch(
          () => []
        );

        const listedAddresses = new Set<string>();
        for (const listing of activeListings) {
          const offerer =
            listing.protocol_data?.parameters?.offerer;
          if (offerer) {
            listedAddresses.add(offerer.toLowerCase());
          }
        }

        // Convert ownership map to holder entries
        const holderEntries: HolderEntry[] = [];
        for (const [address, tokenIds] of Object.entries(
          buildState.holdings
        )) {
          if (tokenIds.length === 0) continue;
          holderEntries.push({
            address,
            tokenCount: tokenIds.length,
            percentOfSupply:
              Math.round(
                (tokenIds.length / TOTAL_SUPPLY) * 10000
              ) / 100,
            hasActiveListing: listedAddresses.has(address),
            lastTransferTimestamp:
              buildState.lastTransfers[address] || null,
          });
        }

        holderEntries.sort((a, b) => b.tokenCount - a.tokenCount);

        const diamondHands = holderEntries.filter(
          (h) => !h.hasActiveListing
        );
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
                ? Math.round(
                    (diamondHands.length / holderEntries.length) *
                      1000
                  ) / 10
                : 0,
            totalSupply: TOTAL_SUPPLY,
            topHolderConcentration:
              Math.round(
                (top10Holdings / TOTAL_SUPPLY) * 1000
              ) / 10,
          },
        };

        await cache.set(CACHE_KEY, result, CACHE_TTL);
        await cache.delete(BUILD_KEY);

        console.log(
          `Community holders cached: ${result.stats.totalHolders} holders from ${buildState.totalProcessed} transfers`
        );

        return NextResponse.json(result);
      } catch (error) {
        console.error("Error building community holders:", error);

        const staleCache = await cache.get<HoldersResponse>(
          CACHE_KEY,
          true
        );
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
