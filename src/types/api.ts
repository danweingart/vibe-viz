// OpenSea API Types
export interface OpenSeaCollectionStats {
  total: {
    volume: number;
    sales: number;
    average_price: number;
    num_owners: number;
    market_cap: number;
    floor_price: number;
    floor_price_symbol: string;
  };
  intervals: Array<{
    interval: string;
    volume: number;
    volume_diff: number;
    volume_change: number;
    sales: number;
    sales_diff: number;
    average_price: number;
  }>;
}

export interface OpenSeaEvent {
  event_type: "sale" | "transfer" | "listing" | "offer" | "cancel_listing";
  order_hash: string;
  chain: string;
  protocol_address: string; // Marketplace contract address
  closing_date: number;
  nft: {
    identifier: string;
    collection: string;
    contract: string;
    token_standard: string;
    name: string;
    description: string;
    image_url: string;
    metadata_url: string;
  };
  quantity: number;
  seller: string;
  buyer: string;
  payment: {
    quantity: string;
    token_address: string;
    decimals: number;
    symbol: string;
  };
  transaction: string;
  event_timestamp: number;
}

export interface OpenSeaEventsResponse {
  asset_events: OpenSeaEvent[];
  next: string | null;
}

// App Types
export interface CollectionStats {
  floorPrice: number;
  floorPriceUsd: number;
  totalVolume: number;
  totalVolumeUsd: number;
  totalSales: number;
  numOwners: number;
  marketCap: number;
  marketCapUsd: number;
  avgPrice: number;
  avgPriceUsd: number;
  volume24h: number;
  volume24hUsd: number;
  volume24hChange: number;
  sales24h: number;
  lastUpdated: string;
}

export interface SaleRecord {
  id: string;
  tokenId: string;
  tokenName: string;
  imageUrl: string;
  priceEth: number;
  priceUsd: number;
  paymentToken: "ETH" | "WETH" | "OTHER";
  paymentSymbol: string;
  seller: string;
  buyer: string;
  timestamp: Date;
  txHash: string;
  premiumPercent?: number;
}

export interface DailyStats {
  date: string;
  volume: number;
  volumeUsd: number;
  salesCount: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  ethPrice: number;
  salesAbove10Pct: number;
  salesAbove25Pct: number;
  salesAbove50Pct: number;
  // Payment breakdown (transaction counts)
  ethPayments: number;
  wethPayments: number;
  otherPayments: number;
  // Payment volume breakdown (actual ETH amounts)
  ethVolume: number;
  wethVolume: number;
  otherVolume: number;
  // Individual sale prices for distribution chart
  salePrices: { eth: number; usd: number }[];
  // Marketplace breakdown (protocol_address -> count)
  marketplaceCounts?: Record<string, number>;
}

export interface HolderData {
  address: string;
  count: number;
  percentage: number;
}

export interface HolderDistribution {
  totalHolders: number;
  totalSupply: number;
  distribution: {
    label: string;
    min: number;
    max: number;
    count: number;
    totalNfts: number;
    percentage: number;
  }[];
  topHolders: HolderData[];
  whaleConcentration: {
    top10: number;
    top25: number;
    top50: number;
  };
  lastUpdated: string;
}

export interface PaymentRatio {
  eth: number;
  weth: number;
  other: number;
  total: number;
}

export interface EthPrice {
  usd: number;
  usd_24h_change: number;
  lastUpdated: string;
}

// OpenSea Listings API Types
export interface OpenSeaListing {
  order_hash: string;
  chain: string;
  protocol_address: string;
  price: {
    current: {
      currency: string;
      decimals: number;
      value: string;
    };
  };
  protocol_data: {
    parameters: {
      offerer: string;
      startTime: string;
      endTime: string;
    };
  };
}

export interface OpenSeaListingsResponse {
  listings: OpenSeaListing[];
  next: string | null;
}

// OpenSea Offers API Types
export interface OpenSeaOffer {
  order_hash: string;
  chain: string;
  price: {
    currency: string;
    decimals: number;
    value: string;
  };
  protocol_data: {
    parameters: {
      offerer: string;
    };
  };
}

export interface OpenSeaOffersResponse {
  offers: OpenSeaOffer[];
  next: string | null;
}

// Extended Daily Stats with trader analysis
export interface DailyTraderStats {
  date: string;
  uniqueBuyers: number;
  uniqueSellers: number;
  repeatBuyers: number;
  newBuyers: number;
  totalTrades: number;
}

// Market depth data for order book visualization
export interface MarketDepth {
  listings: { price: number; count: number }[];
  offers: { price: number; count: number }[];
  spread: number;
  spreadPercent: number;
  lowestListing: number;
  highestOffer: number;
  lastUpdated: string;
}

// Flip/resale tracking
export interface FlipRecord {
  tokenId: string;
  buyPrice: number;
  sellPrice: number;
  profit: number;
  profitPercent: number;
  holdingDays: number;
  buyer: string;
}

// Market momentum/health indicators
export interface MarketIndicators {
  rsi: number; // Relative Strength Index (0-100)
  momentum: number; // Price momentum (-100 to 100)
  liquidityScore: number; // 0-100 based on listings/offers/velocity
  volumeTrend: "increasing" | "decreasing" | "stable";
  priceTrend: "bullish" | "bearish" | "neutral";
  lastUpdated: string;
}
