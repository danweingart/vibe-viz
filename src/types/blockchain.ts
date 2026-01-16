/**
 * Blockchain data types for VIBESTR strategy tracking
 */

/**
 * Type of NFT transaction
 */
export type NFTTransactionType = 'purchase' | 'listing' | 'sale' | 'transfer';

/**
 * Status of an NFT in the strategy
 */
export type NFTStatus = 'held' | 'sold';

/**
 * Individual NFT transaction record
 */
export interface NFTTransaction {
  tokenId: string;
  transactionHash: string;
  blockNumber: number;
  timestamp: number;
  type: NFTTransactionType;
  from: string;
  to: string;
  priceEth?: number;
  priceUsd?: number;
}

/**
 * Complete history of an NFT's lifecycle in the strategy
 */
export interface NFTHistory {
  tokenId: string;
  currentStatus: NFTStatus;
  imageUrl?: string; // NFT image URL for display

  // Purchase details
  purchaseDate: number;
  purchasePrice: number;
  purchaseTx: string;
  purchaseBlock: number;

  // Current state (for held NFTs)
  currentPrice?: number; // Current floor price (for held NFTs)
  isListed?: boolean; // Whether NFT is currently listed for sale

  // Listing details (if listed)
  listingDate?: number;
  listingPrice?: number;
  listingTx?: string;
  listingBlock?: number;

  // Sale details (if sold)
  saleDate?: number;
  salePrice?: number;
  saleTx?: string;
  saleBlock?: number;
  buyer?: string;

  // Calculated metrics
  holdDuration?: number; // days held before sale (or current hold time if not sold)
  profitLoss?: number; // sale price - purchase price (if sold)
  profitLossPercent?: number; // (profitLoss / purchasePrice) * 100
}

/**
 * Summary of NFT history across all tokens
 */
export interface NFTHistorySummary {
  currentlyHeld: number;
  totalSold: number;
  totalInvested: number; // ETH
  totalProceeds: number; // ETH
  averageHoldTime: number; // days
  roi: number; // %
}

/**
 * Burn transaction record
 */
export interface BurnTransaction {
  transactionHash: string;
  blockNumber: number;
  timestamp: number;
  amount: number; // VIBESTR tokens burned (in full tokens, not wei)
  amountUsd: number; // USD value at time of burn
  triggeredBy?: string; // Related NFT sale tx if applicable
  burnAddress: string; // Should always be 0x0000...
}

/**
 * Complete burn cycle linking NFT sale to token burn
 */
export interface BurnCycle {
  // NFT Sale that triggered this cycle
  nftSale?: {
    tokenId: string;
    salePrice: number; // ETH
    saleTx: string;
    timestamp: number;
  };

  // Proceeds and token economics
  proceedsEth: number; // ETH from sale
  proceedsUsd: number; // USD value at time of sale
  tokensBought: number; // VIBESTR tokens bought with proceeds
  tokensBurned: number; // VIBESTR tokens burned

  // Burn transaction details
  burnTx: string;
  burnTimestamp: number;
  burnBlock: number;

  // Efficiency metrics
  efficiency: number; // % of proceeds that went to burns (0-100)
  burnRate: number; // Tokens burned per ETH spent
}

/**
 * Contract-level metrics and performance
 */
export interface ContractMetrics {
  // Value metrics
  totalValueLocked: number; // Current NFT holdings value in ETH
  totalValueLockedUsd: number; // Current NFT holdings value in USD

  // Historical performance
  totalProceedsGenerated: number; // Historical sum of all sales in ETH
  totalProceedsGeneratedUsd: number; // Historical sum of all sales in USD
  totalInvested: number; // Total ETH spent on NFT purchases
  totalInvestedUsd: number; // Total USD spent on NFT purchases

  // NFT metrics
  totalNFTsPurchased: number;
  totalNFTsSold: number;
  currentNFTsHeld: number;

  // Performance metrics
  averageHoldTime: number; // days
  averagePurchasePrice: number; // ETH
  averageSalePrice: number; // ETH
  totalProfit: number; // sales - purchases in ETH
  totalProfitPercent: number; // (profit / invested) * 100

  // Burn metrics
  totalTokensBurned: number; // Total VIBESTR burned
  burnEfficiency: number; // % of sale proceeds used for burns

  // ROI metrics
  roi: number; // (current value + proceeds - invested) / invested * 100
  realizedProfit: number; // Profit from sales only
  unrealizedValue: number; // Current value of held NFTs
}

/**
 * Blockchain sync status
 */
export interface BlockchainSyncStatus {
  lastSyncedBlock: number;
  lastSyncTimestamp: number;
  currentBlock: number;
  isSyncing: boolean;
  blocksToSync: number;
  nftEventsProcessed: number;
  burnEventsProcessed: number;
  errors?: string[];
}

/**
 * Daily aggregated stats for time-series charts
 */
export interface DailyNFTStats {
  date: string; // YYYY-MM-DD
  timestamp: number;
  purchasesCount: number;
  salesCount: number;
  netChange: number; // purchases - sales
  purchasesValue: number; // ETH
  salesValue: number; // ETH
  netValue: number; // ETH
  holdingsCount: number; // Running total of held NFTs
}

/**
 * Daily burn stats for time-series charts
 */
export interface DailyBurnStats {
  date: string; // YYYY-MM-DD
  timestamp: number;
  burnCount: number;
  tokensBurned: number;
  burnValueUsd: number;
  efficiency: number; // % of sale proceeds burned
  cumulativeBurned: number; // Running total
}
