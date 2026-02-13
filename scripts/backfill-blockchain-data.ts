/**
 * Backfill VIBESTR Historical Blockchain Data
 *
 * This script queries the Ethereum blockchain for the last 90 days of:
 * - VIBESTR token burns (Transfer events to 0x000...dEaD)
 * - Good Vibes Club NFT transfers involving the strategy contract
 *
 * Data is aggregated by day and stored in Postgres to provide real
 * historical data for the dashboard charts.
 *
 * Usage:
 *   npx ts-node --esm scripts/backfill-blockchain-data.ts
 */

import { sql } from '@vercel/postgres';
import {
  getPublicClient,
  getCurrentBlockNumber,
  getTransferEventsBatched,
  getBlockTimestamp,
} from '@/lib/blockchain/client';
import { type Log, type Address, decodeEventLog } from 'viem';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Contract addresses
const VIBESTR_TOKEN = '0xd0cc2b0efb168bfe1f94a948d8df70fa10257196' as Address;
const GVC_NFT = '0xb8ea78fcacef50d41375e44e6814ebba36bb33c4' as Address;
const BURN_ADDRESS = '0x000000000000000000000000000000000000dead';
const STRATEGY_ADDRESS = '0xd0cc2b0efb168bfe1f94a948d8df70fa10257196';

// ERC20/721 Transfer event ABI
const TRANSFER_ABI = {
  type: 'event',
  name: 'Transfer',
  inputs: [
    { type: 'address', indexed: true, name: 'from' },
    { type: 'address', indexed: true, name: 'to' },
    { type: 'uint256', indexed: true, name: 'tokenIdOrValue' },
  ],
} as const;

interface DailyAggregate {
  date: string;
  timestamp: number;
  burnedAmount: bigint;
  nftPurchases: number;
  nftSales: number;
  uniqueTraders: Set<string>;
}

/**
 * Get block timestamps in batch
 */
async function getBlockTimestamps(blockNumbers: bigint[]): Promise<Map<bigint, number>> {
  const timestampMap = new Map<bigint, number>();
  const uniqueBlocks = [...new Set(blockNumbers)];

  console.log(`Fetching timestamps for ${uniqueBlocks.length} unique blocks...`);

  // Batch fetch with progress reporting
  for (let i = 0; i < uniqueBlocks.length; i += 10) {
    const batch = uniqueBlocks.slice(i, i + 10);
    await Promise.all(
      batch.map(async (blockNum) => {
        const timestamp = await getBlockTimestamp(Number(blockNum));
        timestampMap.set(blockNum, timestamp);
      })
    );

    if ((i + 10) % 50 === 0) {
      console.log(`  Fetched ${Math.min(i + 10, uniqueBlocks.length)}/${uniqueBlocks.length} timestamps`);
    }
  }

  return timestampMap;
}

/**
 * Parse Transfer event log
 */
function parseTransferLog(log: Log): {
  from: string;
  to: string;
  value: bigint;
} | null {
  try {
    const decoded = decodeEventLog({
      abi: [TRANSFER_ABI],
      data: log.data,
      topics: log.topics,
    });

    return {
      from: (decoded.args as any).from.toLowerCase(),
      to: (decoded.args as any).to.toLowerCase(),
      value: (decoded.args as any).tokenIdOrValue,
    };
  } catch (error) {
    console.warn(`Failed to parse log:`, error);
    return null;
  }
}

/**
 * Aggregate events by day
 */
function aggregateByDay(
  burnEvents: Log[],
  nftPurchases: Log[],
  nftSales: Log[],
  blockTimestamps: Map<bigint, number>
): DailyAggregate[] {
  const dailyMap = new Map<string, DailyAggregate>();

  // Process burn events
  for (const event of burnEvents) {
    if (!event.blockNumber) continue;
    const timestamp = blockTimestamps.get(event.blockNumber);
    if (!timestamp) continue;

    const date = new Date(timestamp * 1000).toISOString().split('T')[0];
    const parsed = parseTransferLog(event);
    if (!parsed) continue;

    if (!dailyMap.has(date)) {
      dailyMap.set(date, {
        date,
        timestamp,
        burnedAmount: BigInt(0),
        nftPurchases: 0,
        nftSales: 0,
        uniqueTraders: new Set(),
      });
    }

    const day = dailyMap.get(date)!;
    day.burnedAmount += parsed.value;
  }

  // Process NFT purchases (transfers TO strategy)
  for (const event of nftPurchases) {
    if (!event.blockNumber) continue;
    const timestamp = blockTimestamps.get(event.blockNumber);
    if (!timestamp) continue;

    const date = new Date(timestamp * 1000).toISOString().split('T')[0];
    const parsed = parseTransferLog(event);
    if (!parsed) continue;

    if (!dailyMap.has(date)) {
      dailyMap.set(date, {
        date,
        timestamp,
        burnedAmount: BigInt(0),
        nftPurchases: 0,
        nftSales: 0,
        uniqueTraders: new Set(),
      });
    }

    const day = dailyMap.get(date)!;
    day.nftPurchases += 1;
    day.uniqueTraders.add(parsed.from);
  }

  // Process NFT sales (transfers FROM strategy)
  for (const event of nftSales) {
    if (!event.blockNumber) continue;
    const timestamp = blockTimestamps.get(event.blockNumber);
    if (!timestamp) continue;

    const date = new Date(timestamp * 1000).toISOString().split('T')[0];
    const parsed = parseTransferLog(event);
    if (!parsed) continue;

    if (!dailyMap.has(date)) {
      dailyMap.set(date, {
        date,
        timestamp,
        burnedAmount: BigInt(0),
        nftPurchases: 0,
        nftSales: 0,
        uniqueTraders: new Set(),
      });
    }

    const day = dailyMap.get(date)!;
    day.nftSales += 1;
    day.uniqueTraders.add(parsed.to);
  }

  // Convert map to sorted array
  return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Main backfill function
 */
async function backfillBlockchainData() {
  console.log('\n=== VIBESTR Blockchain Data Backfill ===\n');

  // 1. Calculate block range for 90 days
  const currentBlock = await getCurrentBlockNumber();
  const blocksPerDay = 7200; // ~12 sec per block on Ethereum
  const daysToBackfill = 90;
  const startBlock = currentBlock - BigInt(blocksPerDay * daysToBackfill);

  console.log(`Current block: ${currentBlock}`);
  console.log(`Start block: ${startBlock}`);
  console.log(`Querying ~${daysToBackfill} days of blockchain history\n`);

  // 2. Query VIBESTR token burns
  console.log('Step 1: Querying VIBESTR burn events...');
  const allBurnEvents = await getTransferEventsBatched(
    VIBESTR_TOKEN,
    startBlock,
    currentBlock,
    1000 // LlamaRPC limit is 1k blocks per request
  );

  // Filter for burns (to = 0x000...dEaD)
  const burnEvents = allBurnEvents.filter((log) => {
    const parsed = parseTransferLog(log);
    return parsed && parsed.to === BURN_ADDRESS;
  });

  console.log(`Found ${burnEvents.length} burn events\n`);

  // 3. Query GVC NFT transfer events
  console.log('Step 2: Querying GVC NFT transfer events...');
  const nftEvents = await getTransferEventsBatched(
    GVC_NFT,
    startBlock,
    currentBlock,
    1000 // LlamaRPC limit is 1k blocks per request
  );

  // Filter for strategy interactions
  const nftPurchases = nftEvents.filter((log) => {
    const parsed = parseTransferLog(log);
    return parsed && parsed.to === STRATEGY_ADDRESS.toLowerCase();
  });

  const nftSales = nftEvents.filter((log) => {
    const parsed = parseTransferLog(log);
    return (
      parsed &&
      parsed.from === STRATEGY_ADDRESS.toLowerCase() &&
      parsed.to !== BURN_ADDRESS
    );
  });

  console.log(`Found ${nftPurchases.length} NFT purchases`);
  console.log(`Found ${nftSales.length} NFT sales\n`);

  // 4. Get block timestamps
  console.log('Step 3: Fetching block timestamps...');
  const allBlocks = [
    ...burnEvents.map((e) => e.blockNumber),
    ...nftEvents.map((e) => e.blockNumber),
  ].filter((bn): bn is bigint => bn !== null);
  const blockTimestamps = await getBlockTimestamps(allBlocks);
  console.log('');

  // 5. Aggregate by day
  console.log('Step 4: Aggregating data by day...');
  const dailyAggregates = aggregateByDay(
    burnEvents,
    nftPurchases,
    nftSales,
    blockTimestamps
  );

  console.log(`Aggregated into ${dailyAggregates.length} daily snapshots\n`);

  // 6. Store in Postgres
  console.log('Step 5: Storing snapshots in database...');
  let insertedCount = 0;
  let updatedCount = 0;

  for (const day of dailyAggregates) {
    const snapshot = {
      // Real blockchain data
      burnedAmount: day.burnedAmount.toString(),
      holdingsCount: day.nftPurchases - day.nftSales, // Net holdings change
      activeTraders: day.uniqueTraders.size,

      // Placeholder for price/volume/liquidity (will be filled by daily cron)
      poolData: {
        price_usd: 0,
        volume_24h: 0,
        liquidity_usd: 0,
        market_cap_usd: 0,
      },

      // Metadata
      source: 'blockchain_backfill',
      nftPurchases: day.nftPurchases,
      nftSales: day.nftSales,
    };

    try {
      const result = await sql`
        INSERT INTO vibestr_snapshots (date, timestamp, data)
        VALUES (${day.date}, ${day.timestamp}, ${JSON.stringify(snapshot)}::jsonb)
        ON CONFLICT (date) DO UPDATE
        SET
          data = jsonb_set(
            jsonb_set(
              vibestr_snapshots.data,
              '{burnedAmount}',
              to_jsonb(${snapshot.burnedAmount}::text)
            ),
            '{holdingsCount}',
            to_jsonb(${snapshot.holdingsCount}::integer)
          ),
          timestamp = ${day.timestamp}
        RETURNING (xmax = 0) AS inserted
      `;

      if (result.rows[0]?.inserted) {
        insertedCount++;
      } else {
        updatedCount++;
      }

      if ((insertedCount + updatedCount) % 10 === 0) {
        console.log(`  Processed ${insertedCount + updatedCount}/${dailyAggregates.length} snapshots`);
      }
    } catch (error) {
      console.error(`Failed to store snapshot for ${day.date}:`, error);
    }
  }

  console.log(`\n✓ Backfill complete!`);
  console.log(`  Inserted: ${insertedCount} new snapshots`);
  console.log(`  Updated: ${updatedCount} existing snapshots`);
  console.log(`  Total burn amount: ${dailyAggregates.reduce((sum, d) => sum + d.burnedAmount, BigInt(0))} tokens`);
  console.log(`  Total NFT purchases: ${dailyAggregates.reduce((sum, d) => sum + d.nftPurchases, 0)}`);
  console.log(`  Total NFT sales: ${dailyAggregates.reduce((sum, d) => sum + d.nftSales, 0)}`);
}

// Run backfill
backfillBlockchainData()
  .then(() => {
    console.log('\n✓ Backfill script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Backfill script failed:', error);
    process.exit(1);
  });
