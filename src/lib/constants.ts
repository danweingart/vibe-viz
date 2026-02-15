// Good Vibes Club Collection
export const COLLECTION_SLUG = "good-vibes-club";
export const CONTRACT_ADDRESS = "0xb8ea78fcacef50d41375e44e6814ebba36bb33c4";

// Leading ETH Collections for comparison (basket)
export const COMPARISON_COLLECTIONS = [
  { slug: "boredapeyachtclub", address: "0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d" },
  { slug: "mutant-ape-yacht-club", address: "0x60e4d786628fea6478f785a6d7e704777c86a7c6" },
  { slug: "pudgypenguins", address: "0xbd3531da5cf5857e7cfaa92426877b022e612cf8" },
  { slug: "lilpudgys", address: "0x524cab2ec69124574082676e6f654a18df49a048" },
  { slug: "moonbirds", address: "0x23581767a106ae21c074b2276d25e5c3e136a68b" },
  { slug: "azuki", address: "0xed5af388653567af2f388e6224dc7c4b3241c544" },
  { slug: "doodles-official", address: "0x8a90cab2b38dba80c64b7734e58ee1db38b8992e" },
] as const;

// OpenSea API
export const OPENSEA_API_BASE = "https://api.opensea.io/api/v2";

// Etherscan API V2
export const ETHERSCAN_API_BASE = "https://api.etherscan.io/v2/api";
export const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "CMMJMWDWPJYRDDM4UEPFE525HQZAMVK23H";
export const ETHERSCAN_CHAIN_ID = 1; // Ethereum mainnet

// CoinGecko API (deprecated - migrating to Etherscan)
export const COINGECKO_API_BASE = "https://api.coingecko.com/api/v3";

// Cache TTLs (in seconds) - Balanced for performance + data freshness
export const CACHE_TTL = {
  COLLECTION_STATS: 7200, // 2 hours (balance: floor price freshness vs API cost)
  RECENT_EVENTS: 900, // 15 min (sales feed doesn't need real-time)
  HISTORICAL_EVENTS: 3600, // 1 hour (GVC only)
  ETH_PRICE: 600, // 10 min (price changes don't need instant updates)
  HOLDER_DISTRIBUTION: 3600, // 1 hour (GVC only)
  PRICE_HISTORY: 21600, // 6 hours (historical data is stable)
} as const;

// ETH token addresses
export const ETH_ADDRESS = "0x0000000000000000000000000000000000000000";
export const WETH_ADDRESS = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";

// VIBESTR Token & Strategy
export const VIBESTR_TOKEN_CONTRACT = "0xd0cc2b0efb168bfe1f94a948d8df70fa10257196";
export const VIBESTR_STRATEGY_ID = "0xd0cc2b0efb168bfe1f94a948d8df70fa10257196";
export const VIBESTR_TOTAL_SUPPLY = 1_000_000_000_000; // 1 trillion tokens

// VIBESTR Cache TTLs (in seconds)
export const VIBESTR_CACHE_TTL = {
  STATS: 300, // 5 minutes - token stats
  HOLDINGS: 3600, // 1 hour - NFT holdings
  PRICE_HISTORY: 3600, // 1 hour - historical price data
  VOLUME_HISTORY: 3600, // 1 hour - volume data
  BURN_HISTORY: 3600, // 1 hour - burn records
  CONTRACT_METRICS: 600, // 10 minutes - contract metrics
} as const;

// Chart colors
export const CHART_COLORS = {
  primary: "#ffe048",
  secondary: "#ffd700",
  accent: "#ff9500",
  success: "#34d399",
  danger: "#f87171",
  info: "#60a5fa",
  muted: "#71717a",
} as const;
