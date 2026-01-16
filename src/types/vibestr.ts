// VIBESTR Token Types

// ============================================================================
// Raw API Response Types (from NFT Strategy API)
// ============================================================================

export interface NFTStrategyPoolData {
  price_usd: number;
  price_change_24h: number;
  volume_24h: number;
  liquidity_usd: number;
  market_cap_usd: number;
}

export interface NFTStrategyFloor {
  tokenId: string;
  price: string;
  image: string;
  name: string;
  owner: string;
}

export interface NFTStrategyData {
  id: string;
  type: string;
  name: string;
  nftContract: string;
  tokenContract: string;
  hookContract: string;
  collectionImage: string;
  poolId: string;
  icon: string;
  collectionName: string;
  collectionOsSlug: string;
  ticker: string;
  priceChange: number;
  chain: number;
  poolData: NFTStrategyPoolData;
  burnedAmount: string; // Wei format
  holdingsCount: number;
  currentFees: string; // Wei format
  floor: NFTStrategyFloor;
}

export interface NFTStrategyResponse {
  data: NFTStrategyData;
}

// ============================================================================
// Normalized Application Types
// ============================================================================

export interface TokenStats {
  // Price metrics
  price: number; // Price in ETH
  priceUsd: number;
  priceChange24h: number; // Percentage change

  // Market metrics
  marketCap: number;
  liquidity: number;
  volume24h: number;

  // Supply metrics
  holdingsCount: number;
  burnedAmount: number; // Converted from wei to decimal
  burnedPercent: number; // Percentage of total supply
  totalSupply: number;
  circulatingSupply: number;

  // Fee metrics
  currentFees: number; // Converted from wei to decimal

  // Collection reference
  nftContract: string;
  collectionName: string;
  collectionSlug: string;
  floorPrice: number; // NFT floor price in ETH

  // Metadata
  ticker: string;
  lastUpdated: string;
}

export interface DailyTokenStats {
  date: string; // ISO date string
  timestamp: number;

  // Price data
  price: number;
  priceUsd: number;
  priceChange: number; // Day-over-day change %

  // Volume data
  volume: number;
  volumeUsd: number;

  // Market data
  liquidity: number;
  marketCap: number;

  // Supply data
  burnedAmount: number;
  holdersCount: number;

  // Calculated metrics
  volatility?: number; // Price standard deviation
  movingAverage7?: number; // 7-day moving average
}

export interface HolderBucket {
  label: string; // e.g., "< 1K", "1K - 10K", "10K - 100K"
  min: number;
  max: number;
  holderCount: number;
  tokenAmount: number;
  percentage: number; // % of total supply
}

export interface TopHolder {
  address: string;
  balance: number;
  percentage: number;
  rank: number;
}

export interface HoldingsDistribution {
  totalHolders: number;
  totalSupply: number;

  // Distribution buckets
  distribution: HolderBucket[];

  // Top holders
  topHolders: TopHolder[];

  // Concentration metrics
  concentration: {
    top10: number; // % held by top 10 holders
    top25: number;
    top50: number;
    top100: number;
    giniCoefficient?: number; // Measure of inequality
  };

  lastUpdated: string;
}

export interface BurnRecord {
  date: string;
  timestamp: number;

  // Burn metrics
  amount: number; // Tokens burned this day
  cumulativeBurned: number; // Total burned to date
  burnRate: number; // Tokens burned per day (7-day avg)

  // Supply impact
  remainingSupply: number;
  burnedPercent: number; // % of total supply burned
}

export interface VolumeStats {
  date: string;
  timestamp: number;

  // Volume metrics
  volume: number;
  volumeUsd: number;

  // Transaction metrics
  transactions: number;
  uniqueTraders?: number;
  uniqueBuyers?: number;
  uniqueSellers?: number;

  // Calculated metrics
  avgTransactionSize: number;
  movingAverage7?: number;
}

export interface TraderActivity {
  date: string;
  timestamp: number;

  // Trader counts
  totalTraders: number;
  buyers: number;
  sellers: number;

  // Activity by size
  whaleTraders: number; // > 100K tokens
  mediumTraders: number; // 10K - 100K tokens
  smallTraders: number; // < 10K tokens

  // Flow metrics
  netFlow: number; // Positive = more buying
  buyVolume: number;
  sellVolume: number;
}

export interface ProfitLossData {
  date: string;
  timestamp: number;

  // P&L metrics
  profitableTraders: number;
  unprofitableTraders: number;
  profitablePercent: number;

  // Amounts
  totalProfit: number;
  totalLoss: number;
  avgProfit: number;
  avgLoss: number;
  netPnL: number;
}

export interface HoldTimeData {
  bucket: string; // e.g., "< 1 day", "1-7 days", "7-30 days"
  holderCount: number;
  tokenAmount: number;
  avgHoldTime: number; // In days
  percentage: number;
}

export interface LiquidityLevel {
  priceLevel: number;
  liquidity: number;
  depth: number; // How much can be traded at this level
  slippage: number; // Expected slippage %
}

export interface TokenHealthMetrics {
  // Liquidity health
  liquidityScore: number; // 0-100
  liquidityDepth: number;

  // Holder diversity
  holderDiversityScore: number; // 0-100 (based on distribution)

  // Volume health
  volumeTrend: number; // 7-day trend (-100 to +100)
  volumeToLiquidityRatio: number;

  // Price health
  priceStability: number; // 0-100 (inverse of volatility)
  rsI: number; // Relative Strength Index (0-100)

  // Overall score
  overallHealth: number; // 0-100 weighted average

  lastUpdated: string;
}

// ============================================================================
// Snapshot Storage Types
// ============================================================================

export interface TokenSnapshot {
  timestamp: number;
  date: string;
  data: NFTStrategyData;
}

export interface SnapshotMeta {
  firstSnapshot: string;
  lastSnapshot: string;
  snapshotCount: number;
  version: string;
}

// ============================================================================
// Chart Data Types
// ============================================================================

export interface ChartDataPoint {
  date: string;
  [key: string]: string | number; // Allow dynamic keys for different chart series
}

export interface TimeSeriesData {
  data: ChartDataPoint[];
  meta: {
    startDate: string;
    endDate: string;
    dataPoints: number;
  };
}

// ============================================================================
// API Query Parameters
// ============================================================================

export interface TokenQueryParams {
  days?: number; // Time range (7, 30, 90, 365)
  currency?: "eth" | "usd";
}

export interface PriceHistoryParams extends TokenQueryParams {
  includeMA?: boolean; // Include moving averages
}

export interface VolumeHistoryParams extends TokenQueryParams {
  includeTransactions?: boolean; // Include transaction counts
}

export interface BurnHistoryParams {
  days?: number;
}

// ============================================================================
// API Response Wrappers
// ============================================================================

export interface ApiResponse<T> {
  data: T;
  lastUpdated: string;
  cached: boolean;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}
