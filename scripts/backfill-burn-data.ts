/**
 * Backfill VIBESTR Burn Data Only
 *
 * This script queries the Ethereum blockchain for the last 90 days of
 * VIBESTR token burn events and updates existing snapshots with burn amounts.
 *
 * FIX: Uses correct ERC20 Transfer ABI (value is NOT indexed)
 *
 * Usage:
 *   npx tsx scripts/backfill-burn-data.ts
 */

import { sql } from '@vercel/postgres';
import {
  getPublicClient,
  getCurrentBlockNumber,
  getTransferEventsBatched,
  getBlockTimestamp,
} from '@/lib/blockchain/client';
import { type Log, type Address, parseAbiItem, decodeEventLog } from 'viem';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Contract addresses
const VIBESTR_TOKEN = '0xd0cc2b0efb168bfe1f94a948d8df70fa10257196' as Address;
const BURN_ADDRESS = '0x000000000000000000000000000000000000dead';

// CORRECT ERC20 Transfer event ABI - value is NOT indexed
const ERC20_TRANSFER_ABI = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 value)'
);

interface DailyBurn {
  date: string;
  timestamp: number;
  burnedAmount: bigint;
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

    if ((i + 10) % 100 === 0) {
      console.log(`  Fetched ${Math.min(i + 10, uniqueBlocks.length)}/${uniqueBlocks.length} timestamps`);
    }
  }

  return timestampMap;
}

/**
 * Parse ERC20 Transfer event log
 */
function parseERC20Transfer(log: Log): {
  from: string;
  to: string;
  value: bigint;
} | null {
  try {
    const decoded = decodeEventLog({
      abi: [ERC20_TRANSFER_ABI],
      data: log.data,
      topics: log.topics,
    });

    return {
      from: (decoded.args.from as string).toLowerCase(),
      to: (decoded.args.to as string).toLowerCase(),
      value: decoded.args.value as bigint,
    };
  } catch (error) {
    console.warn(`Failed to parse ERC20 transfer log at block ${log.blockNumber}:`, error);
    return null;
  }
}

/**
 * Aggregate burn events by day
 */
function aggregateBurnsByDay(
  burnEvents: Log[],
  blockTimestamps: Map<bigint, number>
): DailyBurn[] {
  const dailyMap = new Map<string, DailyBurn>();

  for (const event of burnEvents) {
    if (!event.blockNumber) continue;
    const timestamp = blockTimestamps.get(event.blockNumber);
    if (!timestamp) continue;

    const date = new Date(timestamp * 1000).toISOString().split('T')[0];
    const parsed = parseERC20Transfer(event);
    if (!parsed) continue;

    if (!dailyMap.has(date)) {
      dailyMap.set(date, {
        date,
        timestamp,
        burnedAmount: BigInt(0),
      });
    }

    const day = dailyMap.get(date)!;
    day.burnedAmount += parsed.value;
  }

  return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Main backfill function
 */
async function backfillBurnData() {
  console.log('\n=== VIBESTR Burn Data Backfill ===\n');

  // 1. Calculate block range for 90 days
  const currentBlock = await getCurrentBlockNumber();
  const blocksPerDay = 7200; // ~12 sec per block on Ethereum
  const daysToBackfill = 90;
  const startBlock = currentBlock - BigInt(blocksPerDay * daysToBackfill);

  console.log(`Current block: ${currentBlock}`);
  console.log(`Start block: ${startBlock}`);
  console.log(`Querying ~${daysToBackfill} days of burn events\n`);

  // 2. Query VIBESTR token transfers
  console.log('Step 1: Querying VIBESTR token transfers...');
  const allTransfers = await getTransferEventsBatched(
    VIBESTR_TOKEN,
    startBlock,
    currentBlock,
    1000 // LlamaRPC limit
  );

  console.log(`\nFound ${allTransfers.length} total transfer events`);

  // 3. Filter for burns (to = 0x000...dEaD)
  console.log('Step 2: Filtering for burn events...');
  const burnEvents = allTransfers.filter((log) => {
    const parsed = parseERC20Transfer(log);
    return parsed && parsed.to === BURN_ADDRESS;
  });

  console.log(`Found ${burnEvents.length} burn events\n`);

  if (burnEvents.length === 0) {
    console.log('No burn events found. Exiting.');
    return;
  }

  // 4. Get block timestamps
  console.log('Step 3: Fetching block timestamps...');
  const blockNumbers = burnEvents.map((e) => e.blockNumber).filter((bn): bn is bigint => bn !== null);
  const blockTimestamps = await getBlockTimestamps(blockNumbers);
  console.log('');

  // 5. Aggregate by day
  console.log('Step 4: Aggregating burns by day...');
  const dailyBurns = aggregateBurnsByDay(burnEvents, blockTimestamps);
  console.log(`Aggregated into ${dailyBurns.length} daily burn records\n`);

  // 6. Update existing snapshots in Postgres
  console.log('Step 5: Updating snapshots in database...');
  let updatedCount = 0;
  let skippedCount = 0;

  for (const day of dailyBurns) {
    try {
      // Update existing snapshot with burn data
      const result = await sql`
        UPDATE vibestr_snapshots
        SET data = jsonb_set(
          data,
          '{burnedAmount}',
          to_jsonb(${day.burnedAmount.toString()}::text)
        )
        WHERE date = ${day.date}
      `;

      if (result.rowCount && result.rowCount > 0) {
        updatedCount++;
      } else {
        skippedCount++;
        console.log(`  No snapshot found for ${day.date}, skipping`);
      }

      if ((updatedCount + skippedCount) % 10 === 0) {
        console.log(`  Processed ${updatedCount + skippedCount}/${dailyBurns.length} days`);
      }
    } catch (error) {
      console.error(`Failed to update snapshot for ${day.date}:`, error);
    }
  }

  const totalBurned = dailyBurns.reduce((sum, d) => sum + d.burnedAmount, BigInt(0));

  console.log(`\n✓ Burn data backfill complete!`);
  console.log(`  Updated: ${updatedCount} snapshots`);
  console.log(`  Skipped: ${skippedCount} (no existing snapshot)`);
  console.log(`  Total burned: ${totalBurned.toString()} tokens (${Number(totalBurned) / 1e18} VIBESTR)`);
}

// Run backfill
backfillBurnData()
  .then(() => {
    console.log('\n✓ Burn backfill script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Burn backfill script failed:', error);
    process.exit(1);
  });
