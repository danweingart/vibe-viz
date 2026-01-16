/**
 * Business logic calculations for VIBESTR Strategy Dashboard
 * Centralized utility functions for metrics and analytics
 */

export interface NFTHolding {
  tokenId: string;
  purchasePrice: number;
  currentFloorPrice: number;
  purchaseDate: string;
}

export interface HolderBucket {
  label: string;
  count: number;
  percentage: number;
  range: string;
}

/**
 * Calculate NAV (Net Asset Value) Ratio
 * NAV Ratio = Total Treasury Value / (Token Price × Circulating Supply)
 *
 * @param treasuryValueEth - Total treasury value in ETH
 * @param tokenPriceUsd - Current token price in USD
 * @param circulatingSupply - Number of circulating tokens
 * @param ethPriceUsd - Current ETH price in USD
 * @returns NAV ratio as a multiplier (e.g., 5.03 means 5.03x)
 */
export function calculateNAVRatio(
  treasuryValueEth: number,
  tokenPriceUsd: number,
  circulatingSupply: number,
  ethPriceUsd: number
): number {
  if (tokenPriceUsd === 0 || circulatingSupply === 0) return 0;

  const treasuryValueUsd = treasuryValueEth * ethPriceUsd;
  const marketCapUsd = tokenPriceUsd * circulatingSupply;

  return marketCapUsd > 0 ? treasuryValueUsd / marketCapUsd : 0;
}

/**
 * Calculate total inventory value from NFT holdings
 * Sum of all NFT current floor prices
 *
 * @param holdings - Array of NFT holdings
 * @returns Total inventory value in ETH
 */
export function calculateInventoryValue(holdings: NFTHolding[]): number {
  return holdings.reduce((total, holding) => {
    return total + (holding.currentFloorPrice || 0);
  }, 0);
}

/**
 * Calculate unrealized profit/loss for NFT holdings
 *
 * @param holdings - Array of NFT holdings
 * @returns Object with total P/L amount and percentage
 */
export function calculateUnrealizedPnL(holdings: NFTHolding[]): {
  amount: number;
  percent: number;
} {
  const totalCost = holdings.reduce((sum, h) => sum + h.purchasePrice, 0);
  const currentValue = calculateInventoryValue(holdings);
  const amount = currentValue - totalCost;
  const percent = totalCost > 0 ? (amount / totalCost) * 100 : 0;

  return { amount, percent };
}

/**
 * Calculate burn pressure metrics
 * Shows potential impact of burning tokens on supply
 *
 * @param potentialBurnAmount - Number of tokens that could be burned
 * @param totalSupply - Total token supply
 * @returns Object with burn count and impact percentage
 */
export function calculateBurnPressure(
  potentialBurnAmount: number,
  totalSupply: number
): {
  potentialTokens: number;
  impactPercent: number;
} {
  const impactPercent = totalSupply > 0 ? (potentialBurnAmount / totalSupply) * 100 : 0;

  return {
    potentialTokens: potentialBurnAmount,
    impactPercent,
  };
}

/**
 * Calculate market dominance
 * Strategy volume as percentage of total market volume
 *
 * @param strategyVolume - Trading volume from strategy
 * @param totalMarketVolume - Total market trading volume
 * @returns Dominance percentage (0-100)
 */
export function calculateMarketDominance(
  strategyVolume: number,
  totalMarketVolume: number
): number {
  if (totalMarketVolume === 0) return 0;
  return (strategyVolume / totalMarketVolume) * 100;
}

/**
 * Calculate spread between strategy price and marketplace price
 *
 * @param strategyPrice - Price offered by strategy
 * @param marketPrice - Current market floor price
 * @returns Spread as percentage
 */
export function calculateSpread(
  strategyPrice: number,
  marketPrice: number
): number {
  if (marketPrice === 0) return 0;
  return ((marketPrice - strategyPrice) / marketPrice) * 100;
}

/**
 * Group holders into distribution buckets
 * Categorizes holders by token holdings amount
 *
 * @param holdings - Array of holder addresses and amounts
 * @param totalSupply - Total token supply for percentage calculation
 * @returns Array of distribution buckets with counts and percentages
 */
export function groupHoldersByBucket(
  holdings: Array<{ address: string; amount: number }>,
  totalSupply: number
): HolderBucket[] {
  // Sort by amount descending
  const sorted = [...holdings].sort((a, b) => b.amount - a.amount);

  const buckets: HolderBucket[] = [
    { label: "Top-10", count: 0, percentage: 0, range: "1-10" },
    { label: "11-30", count: 0, percentage: 0, range: "11-30" },
    { label: "31-50", count: 0, percentage: 0, range: "31-50" },
    { label: "Rest", count: 0, percentage: 0, range: "51+" },
  ];

  sorted.forEach((holder, index) => {
    const percentageOfSupply = (holder.amount / totalSupply) * 100;

    if (index < 10) {
      buckets[0].count++;
      buckets[0].percentage += percentageOfSupply;
    } else if (index < 30) {
      buckets[1].count++;
      buckets[1].percentage += percentageOfSupply;
    } else if (index < 50) {
      buckets[2].count++;
      buckets[2].percentage += percentageOfSupply;
    } else {
      buckets[3].count++;
      buckets[3].percentage += percentageOfSupply;
    }
  });

  return buckets;
}

/**
 * Calculate profit/loss for a single trade
 *
 * @param purchasePrice - Purchase price in ETH
 * @param salePrice - Sale price in ETH
 * @returns Object with P/L amount and percentage
 */
export function calculateProfitLoss(
  purchasePrice: number,
  salePrice: number
): {
  amount: number;
  percent: number;
} {
  const amount = salePrice - purchasePrice;
  const percent = purchasePrice > 0 ? (amount / purchasePrice) * 100 : 0;

  return { amount, percent };
}

/**
 * Calculate next floor purchase progress
 * Shows how close the strategy is to purchasing next NFT at floor
 *
 * @param currentLiquidity - Available ETH in strategy
 * @param floorPrice - Current NFT floor price
 * @returns Object with progress percentage and missing amount
 */
export function calculateFloorPurchaseProgress(
  currentLiquidity: number,
  floorPrice: number
): {
  progressPercent: number;
  missingAmount: number;
  canPurchase: boolean;
} {
  if (floorPrice === 0) {
    return { progressPercent: 0, missingAmount: 0, canPurchase: false };
  }

  const progressPercent = Math.min((currentLiquidity / floorPrice) * 100, 100);
  const missingAmount = Math.max(floorPrice - currentLiquidity, 0);
  const canPurchase = currentLiquidity >= floorPrice;

  return {
    progressPercent,
    missingAmount,
    canPurchase,
  };
}

/**
 * Calculate strategy coverage of NFT collection
 * What percentage of collection holders also hold the strategy token
 *
 * @param strategyHolders - Number of strategy token holders
 * @param collectionHolders - Number of NFT collection holders
 * @returns Coverage percentage
 */
export function calculateStrategyCoverage(
  strategyHolders: number,
  collectionHolders: number
): number {
  if (collectionHolders === 0) return 0;
  return (strategyHolders / collectionHolders) * 100;
}

/**
 * Calculate average holding period for sold NFTs
 *
 * @param trades - Array of trades with purchase and sale dates
 * @returns Average holding period in days
 */
export function calculateAverageHoldingPeriod(
  trades: Array<{ purchaseDate: Date; saleDate: Date }>
): number {
  if (trades.length === 0) return 0;

  const totalDays = trades.reduce((sum, trade) => {
    const holdingMs = trade.saleDate.getTime() - trade.purchaseDate.getTime();
    const holdingDays = holdingMs / (1000 * 60 * 60 * 24);
    return sum + holdingDays;
  }, 0);

  return totalDays / trades.length;
}

/**
 * Calculate fee breakdown from total fees
 *
 * @param totalFees - Total fees collected in ETH
 * @param strategyFeePercent - Strategy fee percentage (default 8%)
 * @param platformFeePercent - Platform fee percentage (default 1%)
 * @param royaltyFeePercent - Royalty fee percentage (default 1%)
 * @returns Object with breakdown of fee amounts
 */
export function calculateFeeBreakdown(
  totalFees: number,
  strategyFeePercent: number = 8,
  platformFeePercent: number = 1,
  royaltyFeePercent: number = 1
): {
  strategyFees: number;
  platformFees: number;
  royaltyFees: number;
  totalPercent: number;
} {
  const totalPercent = strategyFeePercent + platformFeePercent + royaltyFeePercent;

  if (totalPercent === 0) {
    return {
      strategyFees: 0,
      platformFees: 0,
      royaltyFees: 0,
      totalPercent: 0,
    };
  }

  return {
    strategyFees: totalFees * (strategyFeePercent / totalPercent),
    platformFees: totalFees * (platformFeePercent / totalPercent),
    royaltyFees: totalFees * (royaltyFeePercent / totalPercent),
    totalPercent,
  };
}

/**
 * Calculate liquidity depth at different price levels
 * Groups liquidity by price ranges
 *
 * @param listings - Array of listings with prices and amounts
 * @param binSize - Price range for each bin (e.g., 0.1 ETH)
 * @returns Array of price bins with liquidity amounts
 */
export function calculateLiquidityDepth(
  listings: Array<{ price: number; amount: number }>,
  binSize: number = 0.05
): Array<{ priceRange: string; listings: number; volume: number }> {
  if (listings.length === 0) return [];

  // Find min and max prices
  const prices = listings.map((l) => l.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  // Create bins
  const bins: Map<number, { listings: number; volume: number }> = new Map();

  listings.forEach((listing) => {
    const binIndex = Math.floor(listing.price / binSize);
    const existing = bins.get(binIndex) || { listings: 0, volume: 0 };
    bins.set(binIndex, {
      listings: existing.listings + 1,
      volume: existing.volume + listing.price,
    });
  });

  // Convert to array with labels
  return Array.from(bins.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([binIndex, data]) => {
      const lower = binIndex * binSize;
      const upper = (binIndex + 1) * binSize;
      return {
        priceRange: `${lower.toFixed(3)}-${upper.toFixed(3)}`,
        listings: data.listings,
        volume: data.volume,
      };
    });
}
