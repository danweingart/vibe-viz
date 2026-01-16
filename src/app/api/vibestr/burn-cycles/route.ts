import { NextRequest, NextResponse } from 'next/server';
import { loadNFTHistory, loadBurnHistory } from '@/lib/db/blockchain-snapshots';
import { buildBurnCycles } from '@/lib/blockchain/events';
import { cache } from '@/lib/cache/memory';
import { VIBESTR_CACHE_TTL } from '@/lib/constants';
import type { BurnCycle } from '@/types/blockchain';

interface BurnCyclesResponse {
  cycles: BurnCycle[];
  count: number;
  stats: {
    totalBurned: number;
    totalProceeds: number;
    averageEfficiency: number;
    cyclesWithSales: number;
    standaloneBurns: number;
  };
}

/**
 * GET /api/vibestr/burn-cycles
 * Query parameters:
 *   - days: number of days to include (default: 30)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);

    // Create cache key
    const cacheKey = `burn-cycles:${days}`;

    // Check cache first
    const cached = cache.get<BurnCyclesResponse>(cacheKey);
    if (cached) {
      console.log(`Cache hit for ${cacheKey}`);
      return NextResponse.json(cached);
    }

    // Load blockchain data
    const [historyMap, burnHistory] = await Promise.all([
      loadNFTHistory(),
      loadBurnHistory(),
    ]);

    // Build burn cycles
    const allCycles = buildBurnCycles(historyMap, burnHistory);

    // Filter by date range
    const cutoffTimestamp = Date.now() / 1000 - days * 24 * 60 * 60;
    const filteredCycles = allCycles.filter(
      (cycle) => cycle.burnTimestamp >= cutoffTimestamp
    );

    // Calculate statistics
    const totalBurned = filteredCycles.reduce(
      (sum, c) => sum + c.tokensBurned,
      0
    );
    const totalProceeds = filteredCycles.reduce(
      (sum, c) => sum + c.proceedsEth,
      0
    );
    const cyclesWithSales = filteredCycles.filter((c) => c.nftSale).length;
    const standaloneBurns = filteredCycles.length - cyclesWithSales;
    const averageEfficiency =
      filteredCycles.length > 0
        ? filteredCycles.reduce((sum, c) => sum + c.efficiency, 0) /
          filteredCycles.length
        : 0;

    const response: BurnCyclesResponse = {
      cycles: filteredCycles,
      count: filteredCycles.length,
      stats: {
        totalBurned,
        totalProceeds,
        averageEfficiency,
        cyclesWithSales,
        standaloneBurns,
      },
    };

    // Cache for 5 minutes
    cache.set(cacheKey, response, VIBESTR_CACHE_TTL.STATS);

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Failed to get burn cycles:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to get burn cycles',
      },
      { status: 500 }
    );
  }
}
