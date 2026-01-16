import { createPublicClient, http, type PublicClient, type Log, type Address } from 'viem';
import { mainnet } from 'viem/chains';

// Environment configuration
const RPC_URL = process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com';

// Block timestamp cache (in-memory)
const blockTimestampCache = new Map<number, number>();

/**
 * Initialize and return a viem public client for Ethereum mainnet
 */
export function getPublicClient(): PublicClient {
  return createPublicClient({
    chain: mainnet,
    transport: http(RPC_URL, {
      retryCount: 5,
      retryDelay: 1000, // 1 second initial delay
    }),
  });
}

/**
 * Fetch with exponential backoff retry logic
 * Mirrors the pattern from opensea/client.ts and nftstrategy/client.ts
 */
async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  retries = 5
): Promise<T> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      if (attempt === retries - 1) {
        console.error('Blockchain request failed after max retries:', error);
        throw error;
      }

      // Check if error is rate limiting
      if (error.message?.includes('429') || error.message?.includes('rate limit')) {
        console.log(`Rate limited, waiting before retry ${attempt + 1}/${retries}`);
        await new Promise((resolve) => setTimeout(resolve, 10000)); // 10 second delay for rate limits
        continue;
      }

      // Exponential backoff: 2s, 4s, 8s, 16s, 32s
      const delay = Math.pow(2, attempt + 1) * 1000;
      console.log(`Blockchain retry ${attempt + 1}/${retries} after ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error('Max retries exceeded');
}

/**
 * Get block timestamp with caching
 * Blocks are immutable, so timestamps can be cached forever
 */
export async function getBlockTimestamp(blockNumber: number): Promise<number> {
  // Check cache first
  const cached = blockTimestampCache.get(blockNumber);
  if (cached) {
    return cached;
  }

  // Fetch from blockchain
  const client = getPublicClient();
  const block = await fetchWithRetry(async () => {
    return await client.getBlock({ blockNumber: BigInt(blockNumber) });
  });

  const timestamp = Number(block.timestamp);
  blockTimestampCache.set(blockNumber, timestamp);
  return timestamp;
}

/**
 * Query Transfer events for a specific contract within a block range
 * Events are batched to avoid overwhelming the RPC endpoint
 */
export async function getTransferEvents(
  contractAddress: Address,
  fromBlock: bigint,
  toBlock: bigint
): Promise<Log[]> {
  const client = getPublicClient();

  // Transfer event signature: Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
  const transferEventSignature = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

  const logs = await fetchWithRetry(async () => {
    return await client.getLogs({
      address: contractAddress,
      event: {
        type: 'event',
        name: 'Transfer',
        inputs: [
          { type: 'address', indexed: true, name: 'from' },
          { type: 'address', indexed: true, name: 'to' },
          { type: 'uint256', indexed: true, name: 'tokenId' },
        ],
      },
      fromBlock,
      toBlock,
    });
  });

  return logs;
}

/**
 * Query Transfer events in batches to avoid RPC limitations
 * Splits large block ranges into smaller chunks
 */
export async function getTransferEventsBatched(
  contractAddress: Address,
  fromBlock: bigint,
  toBlock: bigint,
  batchSize = 10000 // 10k blocks per batch
): Promise<Log[]> {
  const allLogs: Log[] = [];
  let currentBlock = fromBlock;

  while (currentBlock <= toBlock) {
    const endBlock = currentBlock + BigInt(batchSize - 1) > toBlock
      ? toBlock
      : currentBlock + BigInt(batchSize - 1);

    console.log(`Querying Transfer events from block ${currentBlock} to ${endBlock}`);

    const logs = await getTransferEvents(contractAddress, currentBlock, endBlock);
    allLogs.push(...logs);

    console.log(`  Found ${logs.length} events in this batch (total: ${allLogs.length})`);

    currentBlock = endBlock + BigInt(1);

    // Rate limiting delay between batches (longer for free tier)
    if (currentBlock <= toBlock) {
      await new Promise((resolve) => setTimeout(resolve, 500)); // 500ms delay for free tier
    }
  }

  return allLogs;
}

/**
 * Get the current block number
 */
export async function getCurrentBlockNumber(): Promise<bigint> {
  const client = getPublicClient();
  return await fetchWithRetry(async () => {
    return await client.getBlockNumber();
  });
}

/**
 * Get transaction receipt for a given transaction hash
 */
export async function getTransactionReceipt(txHash: string) {
  const client = getPublicClient();
  return await fetchWithRetry(async () => {
    return await client.getTransactionReceipt({ hash: txHash as Address });
  });
}

/**
 * Get balance of ERC721 tokens for an address
 */
export async function getERC721Balance(
  contractAddress: Address,
  ownerAddress: Address
): Promise<bigint> {
  const client = getPublicClient();

  return await fetchWithRetry(async () => {
    return await client.readContract({
      address: contractAddress,
      abi: [
        {
          type: 'function',
          name: 'balanceOf',
          stateMutability: 'view',
          inputs: [{ name: 'owner', type: 'address' }],
          outputs: [{ type: 'uint256' }],
        },
      ],
      functionName: 'balanceOf',
      args: [ownerAddress],
    }) as bigint;
  });
}
