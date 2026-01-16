import { NextRequest, NextResponse } from 'next/server';
import { cache } from '@/lib/cache/memory';
import { VIBESTR_CACHE_TTL } from '@/lib/constants';
import { fetchAllNFTData, type NFTStrategyHolding, type NFTStrategySold } from '@/lib/nftstrategy/client';
import type { NFTHistory, NFTHistorySummary, NFTStatus } from '@/types/blockchain';

interface NFTHistoryResponse {
  history: NFTHistory[];
  summary: NFTHistorySummary;
  count: number;
}

/**
 * Convert NFTStrategy data to our NFTHistory format
 */
function transformToNFTHistory(
  holdings: NFTStrategyHolding[],
  sold: NFTStrategySold[]
): Map<string, NFTHistory> {
  const historyMap = new Map<string, NFTHistory>();

  // Helper: Convert wei to ETH
  const weiToEth = (wei: number) => wei / 1e18;

  // Process holdings (currently held NFTs)
  for (const holding of holdings) {
    historyMap.set(holding.token_id, {
      tokenId: holding.token_id,
      currentStatus: 'held',
      purchaseDate: holding.timestamp,
      purchasePrice: weiToEth(holding.bought_price),
      purchaseTx: holding.transactionHash,
      purchaseBlock: holding.blockNumber,
      currentPrice: weiToEth(holding.current_price),
      isListed: holding.listing,
      imageUrl: holding.image_url || undefined,
    });
  }

  // Process sold NFTs
  for (const soldNFT of sold) {
    historyMap.set(soldNFT.token_id, {
      tokenId: soldNFT.token_id,
      currentStatus: 'sold',
      purchaseDate: soldNFT.timestamp, // Note: NFTStrategy timestamp is ambiguous
      purchasePrice: weiToEth(soldNFT.bought_price),
      purchaseTx: '', // Not available from their API
      purchaseBlock: 0, // Not available from their API
      saleDate: soldNFT.timestamp, // Assuming timestamp is sale date
      salePrice: weiToEth(soldNFT.sold_price),
      saleTx: '', // Not available from their API
      saleBlock: 0, // Not available from their API
      imageUrl: soldNFT.image_url || undefined,
    });
  }

  return historyMap;
}

/**
 * Calculate summary statistics from NFT history
 */
function calculateSummary(historyMap: Map<string, NFTHistory>): NFTHistorySummary {
  let currentlyHeld = 0;
  let totalSold = 0;
  let totalInvested = 0;
  let totalProceeds = 0;
  let totalHoldingDays = 0;
  let holdingCount = 0;

  for (const history of historyMap.values()) {
    totalInvested += history.purchasePrice;

    if (history.currentStatus === 'held') {
      currentlyHeld++;
      const daysHeld = (Date.now() / 1000 - history.purchaseDate) / 86400;
      totalHoldingDays += daysHeld;
      holdingCount++;
    } else if (history.currentStatus === 'sold' && history.salePrice) {
      totalSold++;
      totalProceeds += history.salePrice;
      if (history.saleDate) {
        const daysHeld = (history.saleDate - history.purchaseDate) / 86400;
        totalHoldingDays += daysHeld;
        holdingCount++;
      }
    }
  }

  return {
    currentlyHeld,
    totalSold,
    totalInvested,
    totalProceeds,
    averageHoldTime: holdingCount > 0 ? totalHoldingDays / holdingCount : 0,
    roi: totalInvested > 0 ? ((totalProceeds - totalInvested) / totalInvested) * 100 : 0,
  };
}

/**
 * GET /api/vibestr/nft-history
 * Query parameters:
 *   - status: 'held' | 'sold' | 'all' (default: 'all')
 *   - tokenId: specific token ID (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = (searchParams.get('status') as NFTStatus | 'all') || 'all';
    const tokenId = searchParams.get('tokenId');

    // Create cache key based on query params
    const cacheKey = `nft-history-v3-nftstrategy:${status}:${tokenId || 'all'}`;

    // Check cache first
    const cached = await cache.get<NFTHistoryResponse>(cacheKey);
    if (cached) {
      console.log(`Cache hit for ${cacheKey}:`, JSON.stringify(cached).substring(0, 100));
      return NextResponse.json(cached);
    }
    console.log(`Cache miss for ${cacheKey}, fetching fresh data...`);

    // Fetch data from NFTStrategy.fun
    console.log('Fetching NFT data from NFTStrategy.fun...');
    const { holdings, sold } = await fetchAllNFTData();
    console.log(`Fetched ${holdings.length} holdings, ${sold.length} sold NFTs`);

    // Transform to our format
    const historyMap = transformToNFTHistory(holdings, sold);
    console.log(`Transformed to ${historyMap.size} history entries`);

    // If specific tokenId requested
    if (tokenId) {
      const specificHistory = historyMap.get(tokenId);
      if (!specificHistory) {
        return NextResponse.json(
          { error: `NFT ${tokenId} not found` },
          { status: 404 }
        );
      }

      const response: NFTHistoryResponse = {
        history: [specificHistory],
        summary: calculateSummary(new Map([[tokenId, specificHistory]])),
        count: 1,
      };

      // Cache for 10 minutes (specific NFTs change less frequently)
      cache.set(cacheKey, response, VIBESTR_CACHE_TTL.HOLDINGS * 2);

      return NextResponse.json(response);
    }

    // Filter by status
    let filteredHistory: NFTHistory[];

    if (status === 'all') {
      filteredHistory = Array.from(historyMap.values());
    } else {
      filteredHistory = Array.from(historyMap.values()).filter(
        (h) => h.currentStatus === status
      );
    }

    // Sort by purchase date (most recent first)
    filteredHistory.sort((a, b) => b.purchaseDate - a.purchaseDate);

    // Calculate summary statistics
    const summary = calculateSummary(historyMap);

    const response: NFTHistoryResponse = {
      history: filteredHistory,
      summary,
      count: filteredHistory.length,
    };

    // Cache for 5 minutes
    cache.set(cacheKey, response, VIBESTR_CACHE_TTL.STATS);

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Failed to get NFT history:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to get NFT history',
      },
      { status: 500 }
    );
  }
}
