import { NextRequest, NextResponse } from "next/server";
import { resolveDisplayName } from "@/lib/ens/resolver";
import { cache } from "@/lib/cache/postgres";

export const dynamic = "force-dynamic";

/**
 * Batch name resolution with time budget.
 *
 * Accepts any number of addresses. Returns cached results instantly,
 * then resolves uncached addresses until the time budget (~5s) runs out.
 * The client re-fetches periodically, and each call resolves more names
 * until all are cached.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const addresses: string[] = body.addresses || [];

    if (addresses.length === 0) {
      return NextResponse.json({});
    }

    const unique = [...new Set(addresses.map((a) => a.toLowerCase()))];
    const response: Record<string, string | null> = {};
    const uncached: string[] = [];

    // Phase 1: Check cache for ALL addresses (fast — just DB reads)
    for (const address of unique) {
      const cacheKey = `ens-${address}`;
      const cached = await cache.get<{ name: string | null }>(cacheKey);
      if (cached !== null) {
        response[address] = cached.name;
      } else {
        uncached.push(address);
      }
    }

    // Phase 2: Resolve uncached addresses within a time budget
    const TIME_BUDGET_MS = 5000;
    const CONCURRENCY = 5;
    const startTime = Date.now();
    let resolved = 0;

    for (let i = 0; i < uncached.length; i += CONCURRENCY) {
      // Check if we've exceeded the time budget
      if (Date.now() - startTime > TIME_BUDGET_MS) break;

      const batch = uncached.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map(async (address) => {
          const name = await resolveDisplayName(address);
          return { address, name };
        })
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          response[result.value.address] = result.value.name;
          resolved++;
        }
      }
    }

    if (uncached.length > 0) {
      console.log(
        `ENS: ${Object.keys(response).length} cached, ${resolved}/${uncached.length} newly resolved`
      );
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("ENS resolution error:", error);
    return NextResponse.json({});
  }
}
