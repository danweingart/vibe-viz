import type {
  NFTStrategyData,
  NFTStrategyResponse,
  TokenStats,
  DailyTokenStats,
  TokenSnapshot,
  BurnRecord,
} from "@/types/vibestr";
import { VIBESTR_TOTAL_SUPPLY } from "@/lib/constants";

/**
 * Convert wei string to decimal number
 * Handles 18 decimal places (standard ERC20)
 * @param weiString - Wei amount as string
 * @returns Decimal number
 */
export function wei18ToDecimal(weiString: string): number {
  try {
    const wei = BigInt(weiString);
    // Divide by 10^18 and convert to number
    const decimal = Number(wei) / 1e18;
    return decimal;
  } catch (error) {
    console.error("Failed to convert wei to decimal:", weiString, error);
    return 0;
  }
}

/**
 * Calculate circulating supply
 * Total supply minus burned tokens
 */
function calculateCirculatingSupply(burnedAmount: number): number {
  return VIBESTR_TOTAL_SUPPLY - burnedAmount;
}

/**
 * Normalize NFT Strategy API response to TokenStats
 * @param response - Raw API response
 * @returns Normalized TokenStats
 */
export function normalizeStrategyData(response: NFTStrategyResponse): TokenStats {
  const data = response.data;

  // Convert wei strings to decimal numbers
  const burnedAmount = wei18ToDecimal(data.burnedAmount);
  const currentFees = wei18ToDecimal(data.currentFees);

  // Calculate supply metrics
  const circulatingSupply = calculateCirculatingSupply(burnedAmount);
  const burnedPercent = (burnedAmount / VIBESTR_TOTAL_SUPPLY) * 100;

  // Extract pool data
  const poolData = data.poolData;

  // Parse floor price (comes as wei string)
  const floorPriceWei = BigInt(data.floor.price);
  const floorPrice = Number(floorPriceWei) / 1e18;

  // Price in ETH (calculated from USD price and current ETH price would be circular)
  // For now, we'll use the USD price as primary
  const priceUsd = poolData.price_usd;

  const stats: TokenStats = {
    // Price metrics
    price: priceUsd / 3000, // Rough conversion, will be calculated properly with ETH price
    priceUsd,
    priceChange24h: poolData.price_change_24h,

    // Market metrics
    marketCap: poolData.market_cap_usd,
    liquidity: poolData.liquidity_usd,
    volume24h: poolData.volume_24h,

    // Supply metrics
    holdingsCount: data.holdingsCount,
    burnedAmount,
    burnedPercent,
    totalSupply: VIBESTR_TOTAL_SUPPLY,
    circulatingSupply,

    // Fee metrics
    currentFees,

    // Collection reference
    nftContract: data.nftContract,
    collectionName: data.collectionName,
    collectionSlug: data.collectionOsSlug,
    floorPrice,

    // Metadata
    ticker: data.ticker,
    lastUpdated: new Date().toISOString(),
  };

  return stats;
}

/**
 * Convert snapshots to daily stats for time-series charts
 * @param snapshots - Array of TokenSnapshot
 * @param ethPrices - Optional map of date -> ETH price for USD conversion
 * @returns Array of DailyTokenStats
 */
export function snapshotsToDailyStats(
  snapshots: TokenSnapshot[],
  ethPrices?: Map<string, number>
): DailyTokenStats[] {
  if (snapshots.length === 0) {
    return [];
  }

  const dailyStats: DailyTokenStats[] = [];

  for (let i = 0; i < snapshots.length; i++) {
    const snapshot = snapshots[i];
    const data = snapshot.data;
    const poolData = data.poolData;

    // Get ETH price for this date if available
    const ethPrice = ethPrices?.get(snapshot.date) || 3000; // Fallback to $3000

    // Calculate price in ETH
    const priceUsd = poolData.price_usd;
    const price = priceUsd / ethPrice;

    // Calculate day-over-day change
    let priceChange = 0;
    if (i > 0) {
      const prevPrice = dailyStats[i - 1].price;
      priceChange = prevPrice > 0 ? ((price - prevPrice) / prevPrice) * 100 : 0;
    }

    // Convert burned amount
    const burnedAmount = wei18ToDecimal(data.burnedAmount);

    const stat: DailyTokenStats = {
      date: snapshot.date,
      timestamp: snapshot.timestamp,
      price,
      priceUsd,
      priceChange,
      volume: poolData.volume_24h,
      volumeUsd: poolData.volume_24h, // Already in USD
      liquidity: poolData.liquidity_usd,
      marketCap: poolData.market_cap_usd,
      burnedAmount,
      holdersCount: data.holdingsCount,
    };

    dailyStats.push(stat);
  }

  return dailyStats;
}

/**
 * Calculate moving average for daily stats
 * @param data - Array of DailyTokenStats
 * @param window - Window size (e.g., 7 for 7-day MA)
 * @param field - Field to calculate MA for (default: "price")
 * @returns Array with moving average added
 */
export function calculateMovingAverage(
  data: DailyTokenStats[],
  window: number = 7,
  field: keyof DailyTokenStats = "price"
): DailyTokenStats[] {
  if (data.length === 0) {
    return [];
  }

  return data.map((stat, index) => {
    // Get the last 'window' data points up to current index
    const startIndex = Math.max(0, index - window + 1);
    const slice = data.slice(startIndex, index + 1);

    // Calculate average
    const sum = slice.reduce((acc, s) => acc + (s[field] as number), 0);
    const avg = sum / slice.length;

    return {
      ...stat,
      movingAverage7: avg,
    };
  });
}

/**
 * Calculate volatility (standard deviation) for price data
 * @param data - Array of DailyTokenStats
 * @param window - Window size for rolling calculation
 * @returns Array with volatility added
 */
export function calculateVolatility(
  data: DailyTokenStats[],
  window: number = 7
): DailyTokenStats[] {
  if (data.length === 0) {
    return [];
  }

  return data.map((stat, index) => {
    // Get the last 'window' data points
    const startIndex = Math.max(0, index - window + 1);
    const slice = data.slice(startIndex, index + 1);

    // Calculate mean
    const mean = slice.reduce((acc, s) => acc + s.price, 0) / slice.length;

    // Calculate standard deviation
    const squaredDiffs = slice.map((s) => Math.pow(s.price - mean, 2));
    const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / slice.length;
    const stdDev = Math.sqrt(variance);

    // Normalize to percentage
    const volatility = mean > 0 ? (stdDev / mean) * 100 : 0;

    return {
      ...stat,
      volatility,
    };
  });
}

/**
 * Calculate burn metrics from snapshots
 * @param snapshots - Array of TokenSnapshot
 * @returns Array of BurnRecord
 */
export function calculateBurnMetrics(snapshots: TokenSnapshot[]): BurnRecord[] {
  if (snapshots.length === 0) {
    return [];
  }

  const burnRecords: BurnRecord[] = [];

  for (let i = 0; i < snapshots.length; i++) {
    const snapshot = snapshots[i];
    const burnedAmount = wei18ToDecimal(snapshot.data.burnedAmount);
    const remainingSupply = VIBESTR_TOTAL_SUPPLY - burnedAmount;
    const burnedPercent = (burnedAmount / VIBESTR_TOTAL_SUPPLY) * 100;

    // Calculate burn rate (tokens burned per day, 7-day average)
    let burnRate = 0;
    if (i >= 7) {
      const sevenDaysAgo = burnRecords[i - 7];
      const burnedInWeek = burnedAmount - sevenDaysAgo.cumulativeBurned;
      burnRate = burnedInWeek / 7;
    } else if (i > 0) {
      // For first week, use daily change
      const dayBurned = burnedAmount - burnRecords[i - 1].cumulativeBurned;
      burnRate = dayBurned;
    }

    // Daily burn amount (difference from previous day)
    const amount = i > 0 ? burnedAmount - burnRecords[i - 1].cumulativeBurned : 0;

    const record: BurnRecord = {
      date: snapshot.date,
      timestamp: snapshot.timestamp,
      amount,
      cumulativeBurned: burnedAmount,
      burnRate,
      remainingSupply,
      burnedPercent,
    };

    burnRecords.push(record);
  }

  return burnRecords;
}

/**
 * Generate synthetic historical data for backfilling
 * Creates data points with realistic variation for the past
 * @param currentStats - Current token stats
 * @param days - Number of days to generate
 * @returns Array of DailyTokenStats
 */
export function generateSyntheticHistory(
  currentStats: TokenStats,
  days: number
): DailyTokenStats[] {
  const now = new Date();
  const data: DailyTokenStats[] = [];

  // Generate data points going backwards
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateString = date.toISOString().split("T")[0];
    const timestamp = date.getTime();

    // Add realistic variation (±5% per day, but trending toward current)
    const progressRatio = (days - i) / days;
    const basePrice = currentStats.priceUsd * (0.7 + 0.3 * progressRatio);
    const variation = (Math.random() - 0.5) * 0.1; // ±5%
    const priceUsd = basePrice * (1 + variation);
    const price = priceUsd / 3000; // Rough ETH conversion

    // Similar for other metrics
    const volume = currentStats.volume24h * (0.5 + 0.5 * progressRatio) * (1 + variation);
    const liquidity = currentStats.liquidity * (0.8 + 0.2 * progressRatio);
    const marketCap = currentStats.marketCap * (0.7 + 0.3 * progressRatio);

    // Burned amount should increase monotonically
    const burnedAmount = currentStats.burnedAmount * (0.5 + 0.5 * progressRatio);

    // Holders should generally increase
    const holdersCount = Math.floor(
      currentStats.holdingsCount * (0.6 + 0.4 * progressRatio)
    );

    // Calculate day-over-day change
    const priceChange = data.length > 0
      ? ((price - data[data.length - 1].price) / data[data.length - 1].price) * 100
      : 0;

    data.push({
      date: dateString,
      timestamp,
      price,
      priceUsd,
      priceChange,
      volume,
      volumeUsd: volume,
      liquidity,
      marketCap,
      burnedAmount,
      holdersCount,
    });
  }

  return data;
}

/**
 * Merge real snapshots with synthetic data for missing days
 * @param snapshots - Real snapshots from storage
 * @param days - Total days needed
 * @param currentStats - Current stats for synthetic generation
 * @returns Complete array of DailyTokenStats
 */
export function mergeWithSyntheticData(
  snapshots: TokenSnapshot[],
  days: number,
  currentStats: TokenStats
): DailyTokenStats[] {
  // Convert existing snapshots to daily stats
  const realData = snapshotsToDailyStats(snapshots);

  // If we have enough real data, use it
  if (realData.length >= days) {
    return realData.slice(-days);
  }

  // Otherwise, generate synthetic data for missing period
  const missingDays = days - realData.length;
  const syntheticData = generateSyntheticHistory(currentStats, missingDays);

  // Combine synthetic (older) with real (newer) data
  return [...syntheticData, ...realData];
}
