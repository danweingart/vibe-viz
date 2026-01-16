import { NextResponse } from 'next/server';
import { cache } from '@/lib/cache/memory';
import { VIBESTR_CACHE_TTL } from '@/lib/constants';
import { fetchAllNFTData, type NFTStrategyHolding, type NFTStrategySold } from '@/lib/nftstrategy/client';
import type { ContractMetrics } from '@/types/blockchain';

export const dynamic = 'force-dynamic';

/**
 * Fetch NFTStrategy.fun data and calculate contract metrics
 */
async function calculateMetricsFromNFTStrategy(): Promise<ContractMetrics> {
  const { holdings, sold } = await fetchAllNFTData();

  // Helper: Convert wei to ETH (all prices from NFTStrategy are in wei)
  const weiToEth = (wei: number) => wei / 1e18;

  // Calculate TVL (Total Value Locked) - convert from wei to ETH
  const totalValueLocked = holdings.reduce((sum, h) => sum + weiToEth(h.current_price), 0);

  // Calculate total invested (bought_price for all NFTs) - convert from wei to ETH
  const totalInvested =
    holdings.reduce((sum, h) => sum + weiToEth(h.bought_price), 0) +
    sold.reduce((sum, s) => sum + weiToEth(s.bought_price), 0);

  // Calculate total proceeds from sold NFTs - convert from wei to ETH
  const totalProceedsGenerated = sold.reduce((sum, s) => sum + weiToEth(s.sold_price), 0);

  // Calculate unrealized gains (current value - cost basis for held NFTs) - convert from wei to ETH
  const unrealizedGains = holdings.reduce(
    (sum, h) => sum + (weiToEth(h.current_price) - weiToEth(h.bought_price)),
    0
  );

  // Calculate realized profit (proceeds - cost basis for sold NFTs) - convert from wei to ETH
  const realizedProfit = sold.reduce(
    (sum, s) => sum + (weiToEth(s.sold_price) - weiToEth(s.bought_price)),
    0
  );

  // ROI = (realized profit + unrealized gains) / total invested
  const roi = totalInvested > 0
    ? ((realizedProfit + unrealizedGains) / totalInvested) * 100
    : 0;

  // Average hold time calculation
  const now = Date.now() / 1000;
  let totalHoldDays = 0;
  let nftCount = 0;

  // Add hold time for currently held NFTs
  for (const h of holdings) {
    totalHoldDays += (now - h.timestamp) / 86400;
    nftCount++;
  }

  // Add hold time for sold NFTs (assuming timestamp is sale date)
  // Note: This is an approximation since we don't have exact hold periods
  for (const s of sold) {
    // Estimate: if bought at timestamp and sold at timestamp, hold time ≈ 0
    // This is a limitation of NFTStrategy.fun API
    // For now, use a conservative estimate of 30 days
    totalHoldDays += 30; // Conservative estimate
    nftCount++;
  }

  const averageHoldTime = nftCount > 0 ? totalHoldDays / nftCount : 0;

  // Placeholder values for metrics not available from NFTStrategy.fun API
  const totalTokensBurned = 0; // Would need burn transaction data
  const burnEfficiency = 0; // Would need burn transaction data

  return {
    totalValueLocked,
    totalValueLockedUsd: 0, // Would need ETH price
    totalProceedsGenerated,
    totalProceedsGeneratedUsd: 0, // Would need ETH price
    totalInvested,
    totalInvestedUsd: 0, // Would need ETH price
    totalNFTsPurchased: holdings.length + sold.length,
    totalNFTsSold: sold.length,
    currentNFTsHeld: holdings.length,
    averageHoldTime,
    averagePurchasePrice: totalInvested / (holdings.length + sold.length),
    averageSalePrice: sold.length > 0 ? totalProceedsGenerated / sold.length : 0,
    totalProfit: totalProceedsGenerated - totalInvested,
    totalProfitPercent: totalInvested > 0 ? ((totalProceedsGenerated - totalInvested) / totalInvested) * 100 : 0,
    totalTokensBurned,
    burnEfficiency,
    roi,
    realizedProfit,
    unrealizedValue: unrealizedGains,
  };
}

/**
 * GET /api/vibestr/contract-metrics
 * Returns high-level contract performance metrics
 */
export async function GET() {
  console.log('[CONTRACT-METRICS] GET called with new code v2');
  try {
    const cacheKey = 'contract-metrics-v5-force-dynamic'; // Added force-dynamic export
    console.log(`[CONTRACT-METRICS] Checking cache with key: ${cacheKey}`);

    // Check cache first
    const cached = await cache.get<ContractMetrics>(cacheKey);
    console.log(`[CONTRACT-METRICS] Cache result:`, cached ? `HIT (keys: ${Object.keys(cached).length})` : 'MISS');
    if (cached) {
      return NextResponse.json(cached);
    }

    console.log('[CONTRACT-METRICS] Cache MISS, calculating fresh metrics...');
    // Calculate metrics from NFTStrategy.fun data
    const metrics = await calculateMetricsFromNFTStrategy();
    console.log(`Calculated metrics: held=${metrics.currentNFTsHeld}, sold=${metrics.totalNFTsSold}, TVL=${metrics.totalValueLocked}`);

    // Cache for 5 minutes
    cache.set(cacheKey, metrics, VIBESTR_CACHE_TTL.STATS);

    return NextResponse.json(metrics);
  } catch (error: any) {
    console.error('Failed to get contract metrics:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      {
        error: error.message || 'Failed to get contract metrics',
      },
      { status: 500 }
    );
  }
}
// Force recompile
