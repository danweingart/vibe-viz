/**
 * Etherscan API V2 Client
 *
 * Provides access to on-chain Ethereum data including:
 * - ERC-721 token transfers
 * - ETH/USD price feed
 * - Token supply information
 *
 * Rate limited to 5 calls/second with retry logic.
 *
 * V2 Changes:
 * - New base URL: /v2/api
 * - Requires chainid=1 parameter on all requests
 * - Improved response structure
 */

import { globalRateLimiter } from "./rate-limiter";

const ETHERSCAN_API_KEY = "CMMJMWDWPJYRDDM4UEPFE525HQZAMVK23H";
const ETHERSCAN_API_BASE = "https://api.etherscan.io/v2/api";
const CONTRACT_ADDRESS = "0xb8ea78fcacef50d41375e44e6814ebba36bb33c4";
const CHAIN_ID = 1; // Ethereum mainnet

/**
 * Rate-limited fetch with exponential backoff retry logic
 * Uses global rate limiter to coordinate across all API routes
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries = 2
): Promise<Response> {
  // Global rate limiting (coordinates across all routes)
  await globalRateLimiter.wait();

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const fetchTimeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(fetchTimeout);

      // Handle rate limiting (429) with short backoff
      if (response.status === 429) {
        const delay = Math.min(1000 * (attempt + 1), 3000);
        console.warn(`Rate limited by Etherscan, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // Handle server errors (5xx) with retry
      if (response.status >= 500) {
        const delay = Math.min(1000 * (attempt + 1), 3000);
        console.warn(`Etherscan server error (${response.status}), retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // Return immediately - global rate limiter already handles pacing
      return response;
    } catch (error) {
      lastError = error as Error;
      console.error(`Etherscan API error (attempt ${attempt + 1}/${maxRetries}):`, error instanceof Error ? error.message : error);

      if (attempt < maxRetries - 1) {
        const delay = Math.min(1000 * (attempt + 1), 3000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Failed to fetch from Etherscan after retries');
}

/**
 * Build Etherscan V2 API URL with common parameters
 *
 * V2 requires chainid parameter on all requests
 */
function buildUrl(params: Record<string, string | number>): string {
  const url = new URL(ETHERSCAN_API_BASE);
  url.searchParams.append('chainid', String(CHAIN_ID)); // V2 requires chainid
  url.searchParams.append('apikey', ETHERSCAN_API_KEY);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, String(value));
  });

  return url.toString();
}

/**
 * ERC-721 Transfer Record from Etherscan
 */
export interface EtherscanTransfer {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  nonce: string;
  blockHash: string;
  from: string;
  contractAddress: string;
  to: string;
  tokenID: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  transactionIndex: string;
  gas: string;
  gasPrice: string;
  gasUsed: string;
  cumulativeGasUsed: string;
  input: string;
  confirmations: string;
}

/**
 * Fetch ERC-721 token transfers for the Good Vibes Club contract
 *
 * @param startBlock - Starting block number (optional)
 * @param endBlock - Ending block number (optional, 'latest' for current)
 * @param page - Page number for pagination (default: 1)
 * @param offset - Number of records per page (max 10000, default: 10000)
 * @returns Array of transfer records
 */
export async function getTokenTransfers(
  contractAddress: string = CONTRACT_ADDRESS,
  startBlock: number = 0,
  endBlock: number | string = 'latest',
  page: number = 1,
  offset: number = 10000
): Promise<EtherscanTransfer[]> {
  const url = buildUrl({
    module: 'account',
    action: 'tokennfttx',
    contractaddress: contractAddress,
    startblock: startBlock,
    endblock: endBlock,
    page,
    offset,
    sort: 'desc', // Most recent first
  });

  const response = await fetchWithRetry(url);
  const data = await response.json();

  if (data.status !== '1') {
    // Status '0' with message 'No transactions found' is acceptable
    if (data.message === 'No transactions found') {
      return [];
    }
    console.error('Etherscan API error:', data);
    throw new Error(`Etherscan API error: ${data.message || data.result || 'Unknown error'}`);
  }

  return data.result;
}

/**
 * Fetch ALL transfers since contract deployment
 *
 * Uses small block batches to avoid Etherscan pagination limits (page * offset <= 10000).
 * Each batch is limited to ~1500 blocks to keep results under 10k records.
 * This is expensive (many API calls) but necessary for accurate holder count.
 * Should be cached for 4+ hours.
 *
 * @param contractAddress - Contract address to fetch transfers for
 * @param fromBlock - Starting block (default: 0 = contract deployment)
 * @returns Array of ALL transfer records
 */
export async function getAllTransfers(
  contractAddress: string = CONTRACT_ADDRESS,
  fromBlock: number = 0
): Promise<EtherscanTransfer[]> {
  const currentBlock = await getCurrentBlockNumber();

  // Small batches to ensure we never exceed 10k records per batch
  // Etherscan limit: page * offset <= 10000, so we use 1 page of max 10k records
  // With ~5-10 transfers per day for GVC: 50k blocks = ~7 days = ~50 transfers (very safe)
  const batchSize = 50000; // 50k blocks per batch (~1 week, well under 10k record limit)
  const allTransfers: EtherscanTransfer[] = [];

  const totalBlocks = currentBlock - fromBlock;
  const estimatedBatches = Math.ceil(totalBlocks / batchSize);

  console.log(`Fetching ALL transfers from block ${fromBlock} to ${currentBlock}...`);
  console.log(`Total blocks: ${totalBlocks.toLocaleString()}, Batches: ${estimatedBatches}`);

  for (let start = fromBlock; start < currentBlock; start += batchSize) {
    const end = Math.min(start + batchSize, currentBlock);
    const batchNum = Math.floor((start - fromBlock) / batchSize) + 1;

    // Fetch transfers for this block range
    const transfers = await getTokenTransfers(contractAddress, start, end, 1, 10000);

    if (transfers.length > 0) {
      allTransfers.push(...transfers);

      // If we got exactly 10k transfers, this batch is too large - split it
      if (transfers.length === 10000) {
        console.log(`  Batch ${batchNum}/${estimatedBatches}: blocks ${start}-${end} → 10000+ transfers (SPLITTING into sub-batches...)`);

        // Split this range into smaller sub-batches (10k blocks each = ~2 months)
        const subBatchSize = 10000;
        for (let subStart = start; subStart < end; subStart += subBatchSize) {
          if (subStart === start) continue; // Skip first sub-batch (already fetched)

          const subEnd = Math.min(subStart + subBatchSize, end);
          const subTransfers = await getTokenTransfers(contractAddress, subStart, subEnd, 1, 10000);

          if (subTransfers.length > 0) {
            allTransfers.push(...subTransfers);
            console.log(`    └─ Sub-batch: blocks ${subStart}-${subEnd} → ${subTransfers.length} transfers (total: ${allTransfers.length})`);
          }

          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } else {
        console.log(`  Batch ${batchNum}/${estimatedBatches}: blocks ${start}-${end} → ${transfers.length} transfers (total: ${allTransfers.length})`);
      }
    }

    // Add delay between batches to respect rate limit
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`✓ Fetched ${allTransfers.length} total transfers from ${estimatedBatches} batches`);
  return allTransfers;
}

/**
 * Fetch all transfers within a date range by converting to block numbers
 *
 * @param days - Number of days to look back from now
 * @returns Array of all transfer records in the time period
 */
export async function getTransfersInDateRange(
  days: number,
  contractAddress: string = CONTRACT_ADDRESS
): Promise<EtherscanTransfer[]> {
  const blocksPerDay = 6500; // ~13 second block time
  const currentBlock = await getCurrentBlockNumber();
  const startBlock = Math.max(0, currentBlock - (days * blocksPerDay));

  // Fetch in batches to handle large date ranges
  const batchSize = 50000; // 50k blocks per batch (~7 days)
  const allTransfers: EtherscanTransfer[] = [];

  for (let start = startBlock; start < currentBlock; start += batchSize) {
    const end = Math.min(start + batchSize, currentBlock);
    console.log(`Fetching transfers from block ${start} to ${end}...`);

    // Fetch all pages for this block range
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const transfers = await getTokenTransfers(contractAddress, start, end, page, 10000);

      if (transfers.length === 0) {
        hasMore = false;
      } else {
        allTransfers.push(...transfers);

        // If we got a full page, there might be more
        if (transfers.length === 10000) {
          page++;
          // Add delay between pagination requests
          await new Promise(resolve => setTimeout(resolve, 200));
        } else {
          hasMore = false;
        }
      }
    }

    // Add delay between block batches
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  return allTransfers;
}

/**
 * Get current block number from Etherscan
 */
export async function getCurrentBlockNumber(): Promise<number> {
  const url = buildUrl({
    module: 'proxy',
    action: 'eth_blockNumber',
  });

  const response = await fetchWithRetry(url);
  const data = await response.json();

  if (!data.result) {
    throw new Error('Failed to fetch current block number');
  }

  // Convert hex to decimal
  return parseInt(data.result, 16);
}

/**
 * ETH Price Response from Etherscan
 *
 * NOTE: This function is deprecated - use CoinGecko for ETH price instead.
 * Etherscan V2 historical price data requires Pro account.
 * Keeping this for reference only.
 */
export interface EtherscanEthPrice {
  ethbtc: string;
  ethbtc_timestamp: string;
  ethusd: string;
  ethusd_timestamp: string;
}

/**
 * Get current ETH/USD price from Etherscan
 *
 * @deprecated Use getEthPrice() from @/lib/coingecko/client instead
 * @returns ETH price in USD and timestamp
 */
export async function getEthPriceFromEtherscan(): Promise<{ usd: number; timestamp: number }> {
  const url = buildUrl({
    module: 'stats',
    action: 'ethprice',
  });

  const response = await fetchWithRetry(url);
  const data = await response.json();

  if (data.status !== '1') {
    console.error('Etherscan getEthPrice error:', data);
    throw new Error(`Etherscan API error: ${data.message || data.result || 'Unknown error'}`);
  }

  const result: EtherscanEthPrice = data.result;

  return {
    usd: parseFloat(result.ethusd),
    timestamp: parseInt(result.ethusd_timestamp) * 1000, // Convert to milliseconds
  };
}

/**
 * Get total supply of tokens for a contract
 *
 * @param contractAddress - ERC-721 contract address
 * @returns Total supply as a number
 */
export async function getTotalSupply(
  contractAddress: string = CONTRACT_ADDRESS
): Promise<number> {
  const url = buildUrl({
    module: 'stats',
    action: 'tokensupply',
    contractaddress: contractAddress,
  });

  const response = await fetchWithRetry(url);
  const data = await response.json();

  if (data.status !== '1') {
    console.error('Etherscan getTotalSupply error:', data);
    throw new Error(`Etherscan API error: ${data.message || data.result || 'Unknown error'}`);
  }

  // For ERC-721, this returns the total number of tokens minted
  return parseInt(data.result);
}

/**
 * Filter transfers to only include actual sales (exclude mints and burns)
 *
 * @param transfers - Raw transfer array from Etherscan
 * @returns Filtered array excluding mints (from 0x0) and burns (to 0x0)
 */
export function filterToSalesOnly(transfers: EtherscanTransfer[]): EtherscanTransfer[] {
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

  return transfers.filter(transfer => {
    const from = transfer.from.toLowerCase();
    const to = transfer.to.toLowerCase();

    // Exclude mints (from null address)
    if (from === ZERO_ADDRESS) return false;

    // Exclude burns (to null address)
    if (to === ZERO_ADDRESS) return false;

    return true;
  });
}

/**
 * Calculate unique holder count from transfer history
 *
 * @param transfers - All transfer records
 * @returns Number of unique current holders
 */
export function calculateHolderCount(transfers: EtherscanTransfer[]): number {
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

  // Build current ownership state
  const holdings = new Map<string, Set<string>>(); // address -> Set of tokenIDs

  // Sort transfers by block number (oldest first) to replay history
  const sortedTransfers = [...transfers].sort((a, b) =>
    parseInt(a.blockNumber) - parseInt(b.blockNumber)
  );

  for (const transfer of sortedTransfers) {
    const from = transfer.from.toLowerCase();
    const to = transfer.to.toLowerCase();
    const tokenId = transfer.tokenID;

    // Remove from sender (unless minting)
    if (from !== ZERO_ADDRESS) {
      const fromHoldings = holdings.get(from);
      if (fromHoldings) {
        fromHoldings.delete(tokenId);
        if (fromHoldings.size === 0) {
          holdings.delete(from);
        }
      }
    }

    // Add to receiver (unless burning)
    if (to !== ZERO_ADDRESS) {
      if (!holdings.has(to)) {
        holdings.set(to, new Set());
      }
      holdings.get(to)!.add(tokenId);
    }
  }

  return holdings.size;
}
