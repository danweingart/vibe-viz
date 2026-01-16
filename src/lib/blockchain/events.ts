import type { Log } from 'viem';
import { getBlockTimestamp } from './client';
import { CONTRACTS, isVibestrContract, isZeroAddress } from './contracts';
import type {
  NFTTransaction,
  NFTHistory,
  NFTHistorySummary,
  NFTStatus,
  BurnTransaction,
  BurnCycle,
  ContractMetrics,
  DailyNFTStats,
  DailyBurnStats,
} from '@/types/blockchain';

/**
 * Parse raw Transfer event logs into NFTTransaction objects
 * Works for both ERC721 (NFT) and ERC20 (token) transfers
 */
export async function parseTransferEvents(logs: Log[]): Promise<NFTTransaction[]> {
  const transactions: NFTTransaction[] = [];

  for (const log of logs) {
    // Extract indexed parameters from topics
    // topics[0] = event signature
    // topics[1] = from address
    // topics[2] = to address
    // topics[3] = tokenId (for ERC721) or amount (for ERC20, but not indexed for burns)

    if (log.topics.length < 3) continue;

    const from = `0x${log.topics[1]?.slice(26)}`.toLowerCase();
    const to = `0x${log.topics[2]?.slice(26)}`.toLowerCase();
    const tokenIdHex = log.topics[3];
    const tokenId = tokenIdHex ? BigInt(tokenIdHex).toString() : '0';

    // Get timestamp for this block
    const timestamp = await getBlockTimestamp(Number(log.blockNumber));

    // Determine transaction type based on from/to addresses
    let type: 'purchase' | 'sale' | 'transfer' = 'transfer';

    if (to === CONTRACTS.VIBESTR_TOKEN.toLowerCase()) {
      type = 'purchase'; // NFT transferred TO the strategy contract
    } else if (from === CONTRACTS.VIBESTR_TOKEN.toLowerCase()) {
      type = 'sale'; // NFT transferred FROM the strategy contract
    }

    transactions.push({
      tokenId,
      transactionHash: log.transactionHash || '',
      blockNumber: Number(log.blockNumber),
      timestamp,
      type,
      from,
      to,
    });
  }

  return transactions;
}

/**
 * Parse burn events (ERC20 transfers to zero address)
 */
export async function parseBurnEvents(logs: Log[]): Promise<BurnTransaction[]> {
  const burns: BurnTransaction[] = [];

  for (const log of logs) {
    if (log.topics.length < 3) continue;

    const to = `0x${log.topics[2]?.slice(26)}`.toLowerCase();

    // Only process transfers to zero address (burns)
    if (!isZeroAddress(to)) continue;

    const from = `0x${log.topics[1]?.slice(26)}`.toLowerCase();

    // Parse amount from data field (not indexed for ERC20)
    const amountWei = log.data ? BigInt(log.data) : BigInt(0);
    const amount = Number(amountWei) / 1e18; // Convert from wei to tokens

    const timestamp = await getBlockTimestamp(Number(log.blockNumber));

    burns.push({
      transactionHash: log.transactionHash || '',
      blockNumber: Number(log.blockNumber),
      timestamp,
      amount,
      amountUsd: 0, // Will be calculated later with price data
      burnAddress: to,
    });
  }

  return burns;
}

/**
 * Build NFT history from transaction events
 * Groups transactions by tokenId and constructs lifecycle
 */
export function buildNFTHistory(transactions: NFTTransaction[]): Map<string, NFTHistory> {
  const historyMap = new Map<string, NFTHistory>();

  // Sort transactions by timestamp
  const sortedTxs = [...transactions].sort((a, b) => a.timestamp - b.timestamp);

  for (const tx of sortedTxs) {
    const { tokenId } = tx;

    // Get or create history entry
    let history = historyMap.get(tokenId);

    if (!history) {
      // First transaction should be a purchase
      if (tx.type === 'purchase') {
        history = {
          tokenId,
          currentStatus: 'held',
          purchaseDate: tx.timestamp,
          purchasePrice: 0, // Will be enriched with price data later
          purchaseTx: tx.transactionHash,
          purchaseBlock: tx.blockNumber,
        };
        historyMap.set(tokenId, history);
      }
      continue;
    }

    // Update history based on transaction type
    if (tx.type === 'sale') {
      history.saleDate = tx.timestamp;
      history.salePrice = 0; // Will be enriched with price data later
      history.saleTx = tx.transactionHash;
      history.saleBlock = tx.blockNumber;
      history.buyer = tx.to;
      history.currentStatus = 'sold';

      // Calculate hold duration (in days)
      const holdDurationMs = (tx.timestamp - history.purchaseDate) * 1000;
      history.holdDuration = holdDurationMs / (1000 * 60 * 60 * 24);
    }
  }

  // Calculate current hold duration for unsold NFTs
  const now = Date.now() / 1000;
  for (const history of historyMap.values()) {
    if (history.currentStatus === 'held') {
      const holdDurationMs = (now - history.purchaseDate) * 1000;
      history.holdDuration = holdDurationMs / (1000 * 60 * 60 * 24);
    }
  }

  return historyMap;
}

/**
 * Calculate summary statistics from NFT history
 */
export function calculateNFTSummary(historyMap: Map<string, NFTHistory>): NFTHistorySummary {
  const histories = Array.from(historyMap.values());
  const totalPurchased = histories.length;
  const held = histories.filter((h) => h.currentStatus === 'held');
  const sold = histories.filter((h) => h.currentStatus === 'sold');

  const currentlyHeld = held.length;
  const totalSold = sold.length;

  // Calculate averages
  const avgHoldTime =
    histories.reduce((sum, h) => sum + (h.holdDuration || 0), 0) /
    histories.length;

  const avgPurchasePrice =
    histories.reduce((sum, h) => sum + h.purchasePrice, 0) / histories.length;

  const avgSalePrice =
    sold.length > 0
      ? sold.reduce((sum, h) => sum + (h.salePrice || 0), 0) / sold.length
      : 0;

  const totalProceeds = sold.reduce((sum, h) => sum + (h.salePrice || 0), 0);
  const totalInvested = histories.reduce((sum, h) => sum + h.purchasePrice, 0);
  const roi = totalInvested > 0 ? ((totalProceeds - totalInvested) / totalInvested) * 100 : 0;

  return {
    currentlyHeld,
    totalSold,
    totalInvested,
    totalProceeds,
    averageHoldTime: avgHoldTime,
    roi,
  };
}

/**
 * Link NFT sales to burn transactions to create burn cycles
 * Attempts to match sales to burns that occurred shortly after
 */
export function buildBurnCycles(
  historyMap: Map<string, NFTHistory>,
  burns: BurnTransaction[]
): BurnCycle[] {
  const cycles: BurnCycle[] = [];

  // Get all sold NFTs sorted by sale date
  const soldNFTs = Array.from(historyMap.values())
    .filter((h) => h.currentStatus === 'sold' && h.saleDate)
    .sort((a, b) => (a.saleDate || 0) - (b.saleDate || 0));

  // Sort burns by timestamp
  const sortedBurns = [...burns].sort((a, b) => a.timestamp - b.timestamp);

  // Match sales to burns (burns should occur within 7 days after sale)
  const maxTimeDiff = 7 * 24 * 60 * 60; // 7 days in seconds
  const usedBurns = new Set<string>();

  for (const nft of soldNFTs) {
    if (!nft.saleDate || !nft.salePrice) continue;

    // Find burn transactions that occurred after this sale
    const matchingBurns = sortedBurns.filter((burn) => {
      if (usedBurns.has(burn.transactionHash)) return false;
      const timeDiff = burn.timestamp - nft.saleDate!;
      return timeDiff > 0 && timeDiff <= maxTimeDiff;
    });

    if (matchingBurns.length > 0) {
      // Use the closest burn
      const closestBurn = matchingBurns[0];
      usedBurns.add(closestBurn.transactionHash);

      // Calculate efficiency (simplified - assumes all proceeds went to buy/burn)
      const proceedsEth = nft.salePrice;
      const tokensBurned = closestBurn.amount;

      // Efficiency is a simplified metric (% of proceeds used for burns)
      // In reality, we'd need to track the exact ETH -> VIBESTR buy transaction
      const efficiency = 100; // Placeholder - would need more sophisticated tracking

      cycles.push({
        nftSale: {
          tokenId: nft.tokenId,
          salePrice: nft.salePrice,
          saleTx: nft.saleTx!,
          timestamp: nft.saleDate,
        },
        proceedsEth,
        proceedsUsd: 0, // Will be enriched with price data
        tokensBought: tokensBurned, // Simplified assumption
        tokensBurned,
        burnTx: closestBurn.transactionHash,
        burnTimestamp: closestBurn.timestamp,
        burnBlock: closestBurn.blockNumber,
        efficiency,
        burnRate: tokensBurned / proceedsEth,
      });
    }
  }

  // Add unmatched burns as standalone cycles
  for (const burn of sortedBurns) {
    if (!usedBurns.has(burn.transactionHash)) {
      cycles.push({
        proceedsEth: 0,
        proceedsUsd: 0,
        tokensBought: burn.amount,
        tokensBurned: burn.amount,
        burnTx: burn.transactionHash,
        burnTimestamp: burn.timestamp,
        burnBlock: burn.blockNumber,
        efficiency: 100,
        burnRate: 0,
      });
    }
  }

  return cycles.sort((a, b) => b.burnTimestamp - a.burnTimestamp);
}

/**
 * Calculate contract-level metrics from NFT history and burns
 */
export function calculateContractMetrics(
  historyMap: Map<string, NFTHistory>,
  burns: BurnTransaction[],
  currentFloorPrice: number,
  ethPrice: number
): ContractMetrics {
  const summary = calculateNFTSummary(historyMap);
  const held = Array.from(historyMap.values()).filter((h) => h.currentStatus === 'held');
  const sold = Array.from(historyMap.values()).filter((h) => h.currentStatus === 'sold');

  // Total value locked (current holdings at floor price)
  const tvl = held.length * currentFloorPrice;
  const tvlUsd = tvl * ethPrice;

  // Total proceeds from sales
  const totalProceeds = sold.reduce((sum, h) => sum + (h.salePrice || 0), 0);
  const totalProceedsUsd = totalProceeds * ethPrice;

  // Total invested (all purchases)
  const totalInvested = Array.from(historyMap.values()).reduce(
    (sum, h) => sum + h.purchasePrice,
    0
  );
  const totalInvestedUsd = totalInvested * ethPrice;

  // Burn metrics
  const totalBurned = burns.reduce((sum, b) => sum + b.amount, 0);
  const burnEfficiency = totalProceeds > 0 ? (totalBurned / totalProceeds) * 100 : 0;

  // ROI calculation
  const currentValue = tvl + totalProceeds;
  const roi = totalInvested > 0 ? ((currentValue - totalInvested) / totalInvested) * 100 : 0;

  return {
    totalValueLocked: tvl,
    totalValueLockedUsd: tvlUsd,
    totalProceedsGenerated: totalProceeds,
    totalProceedsGeneratedUsd: totalProceedsUsd,
    totalInvested,
    totalInvestedUsd,
    totalNFTsPurchased: summary.currentlyHeld + summary.totalSold,
    totalNFTsSold: summary.totalSold,
    currentNFTsHeld: summary.currentlyHeld,
    averageHoldTime: summary.averageHoldTime,
    averagePurchasePrice: summary.totalInvested / (summary.currentlyHeld + summary.totalSold),
    averageSalePrice: summary.totalSold > 0 ? summary.totalProceeds / summary.totalSold : 0,
    totalProfit: summary.totalProceeds - summary.totalInvested,
    totalProfitPercent: summary.roi,
    totalTokensBurned: totalBurned,
    burnEfficiency,
    roi,
    realizedProfit: summary.totalProceeds - summary.totalInvested,
    unrealizedValue: tvl,
  };
}

/**
 * Aggregate NFT transactions into daily stats for charting
 */
export function aggregateDailyNFTStats(historyMap: Map<string, NFTHistory>): DailyNFTStats[] {
  const dailyStats = new Map<string, DailyNFTStats>();

  for (const history of historyMap.values()) {
    // Process purchase
    const purchaseDate = new Date(history.purchaseDate * 1000)
      .toISOString()
      .split('T')[0];

    if (!dailyStats.has(purchaseDate)) {
      dailyStats.set(purchaseDate, {
        date: purchaseDate,
        timestamp: history.purchaseDate,
        purchasesCount: 0,
        salesCount: 0,
        netChange: 0,
        purchasesValue: 0,
        salesValue: 0,
        netValue: 0,
        holdingsCount: 0,
      });
    }

    const purchaseDay = dailyStats.get(purchaseDate)!;
    purchaseDay.purchasesCount += 1;
    purchaseDay.purchasesValue += history.purchasePrice;

    // Process sale if exists
    if (history.saleDate) {
      const saleDate = new Date(history.saleDate * 1000)
        .toISOString()
        .split('T')[0];

      if (!dailyStats.has(saleDate)) {
        dailyStats.set(saleDate, {
          date: saleDate,
          timestamp: history.saleDate,
          purchasesCount: 0,
          salesCount: 0,
          netChange: 0,
          purchasesValue: 0,
          salesValue: 0,
          netValue: 0,
          holdingsCount: 0,
        });
      }

      const saleDay = dailyStats.get(saleDate)!;
      saleDay.salesCount += 1;
      saleDay.salesValue += history.salePrice || 0;
    }
  }

  // Calculate net changes and running holdings count
  const sorted = Array.from(dailyStats.values()).sort(
    (a, b) => a.timestamp - b.timestamp
  );

  let runningHoldings = 0;
  for (const day of sorted) {
    day.netChange = day.purchasesCount - day.salesCount;
    day.netValue = day.purchasesValue - day.salesValue;
    runningHoldings += day.netChange;
    day.holdingsCount = runningHoldings;
  }

  return sorted;
}

/**
 * Aggregate burn transactions into daily stats for charting
 */
export function aggregateDailyBurnStats(burns: BurnTransaction[]): DailyBurnStats[] {
  const dailyStats = new Map<string, DailyBurnStats>();

  for (const burn of burns) {
    const date = new Date(burn.timestamp * 1000).toISOString().split('T')[0];

    if (!dailyStats.has(date)) {
      dailyStats.set(date, {
        date,
        timestamp: burn.timestamp,
        burnCount: 0,
        tokensBurned: 0,
        burnValueUsd: 0,
        efficiency: 0,
        cumulativeBurned: 0,
      });
    }

    const day = dailyStats.get(date)!;
    day.burnCount += 1;
    day.tokensBurned += burn.amount;
    day.burnValueUsd += burn.amountUsd;
  }

  // Calculate cumulative burns
  const sorted = Array.from(dailyStats.values()).sort(
    (a, b) => a.timestamp - b.timestamp
  );

  let cumulative = 0;
  for (const day of sorted) {
    cumulative += day.tokensBurned;
    day.cumulativeBurned = cumulative;
  }

  return sorted;
}
