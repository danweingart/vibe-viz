import { NextRequest, NextResponse } from 'next/server';
import {
  getCurrentBlockNumber,
  getTransferEventsBatched,
} from '@/lib/blockchain/client';
import { CONTRACTS } from '@/lib/blockchain/contracts';
import {
  parseTransferEvents,
  parseBurnEvents,
  buildNFTHistory,
  calculateContractMetrics,
} from '@/lib/blockchain/events';
import {
  loadAllBlockchainData,
  saveAllBlockchainData,
  loadSyncStatus,
  saveSyncStatus,
} from '@/lib/db/blockchain-snapshots';
import type { BlockchainSyncStatus } from '@/types/blockchain';

// Contract deployment block (approximate - adjust based on actual deployment)
const DEPLOYMENT_BLOCK = BigInt(process.env.VIBESTR_DEPLOYMENT_BLOCK || '18000000');

/**
 * POST /api/vibestr/blockchain-sync
 * Trigger blockchain data synchronization
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Starting blockchain sync...');

    // Get current block number
    const currentBlock = await getCurrentBlockNumber();
    console.log(`Current block: ${currentBlock}`);

    // Load existing data and sync status
    const existingData = await loadAllBlockchainData();
    const lastSyncedBlock = existingData.syncStatus?.lastSyncedBlock || Number(DEPLOYMENT_BLOCK);

    console.log(`Last synced block: ${lastSyncedBlock}`);

    // Check if already synced
    if (lastSyncedBlock >= Number(currentBlock)) {
      console.log('Already up to date');
      return NextResponse.json({
        success: true,
        message: 'Already up to date',
        syncStatus: existingData.syncStatus,
      });
    }

    // Determine block range to sync
    const fromBlock = BigInt(lastSyncedBlock + 1);
    const toBlock = currentBlock;
    const blocksToSync = Number(toBlock - fromBlock);

    console.log(`Syncing blocks ${fromBlock} to ${toBlock} (${blocksToSync} blocks)`);

    // Update sync status to "syncing"
    const syncStatus: BlockchainSyncStatus = {
      lastSyncedBlock,
      lastSyncTimestamp: Date.now(),
      currentBlock: Number(currentBlock),
      isSyncing: true,
      blocksToSync,
      nftEventsProcessed: 0,
      burnEventsProcessed: 0,
    };
    await saveSyncStatus(syncStatus);

    // Query NFT Transfer events (GVC NFT contract)
    // Use batch size of 10 for Alchemy free tier
    console.log('Querying NFT Transfer events...');
    const nftLogs = await getTransferEventsBatched(
      CONTRACTS.GVC_NFT,
      fromBlock,
      toBlock,
      10 // Alchemy free tier limit
    );
    console.log(`Found ${nftLogs.length} NFT Transfer events`);

    // Query token burn events (VIBESTR token transfers to zero address)
    console.log('Querying burn events...');
    const burnLogs = await getTransferEventsBatched(
      CONTRACTS.VIBESTR_TOKEN,
      fromBlock,
      toBlock,
      10 // Alchemy free tier limit
    );
    console.log(`Found ${burnLogs.length} token Transfer events (potential burns)`);

    // Parse events
    console.log('Parsing events...');
    const nftTransactions = await parseTransferEvents(nftLogs);
    const burnTransactions = await parseBurnEvents(burnLogs);

    console.log(`Parsed ${nftTransactions.length} NFT transactions`);
    console.log(`Parsed ${burnTransactions.length} burn transactions`);

    // Merge with existing data
    const existingHistory = existingData.nftHistory;
    const existingBurns = existingData.burnHistory;

    // Add new transactions to history
    for (const tx of nftTransactions) {
      const existing = existingHistory.get(tx.tokenId);
      if (existing) {
        // Update existing history with new transaction
        if (tx.type === 'sale' && !existing.saleDate) {
          existing.saleDate = tx.timestamp;
          existing.saleTx = tx.transactionHash;
          existing.saleBlock = tx.blockNumber;
          existing.currentStatus = 'sold';
        }
      } else if (tx.type === 'purchase') {
        // Create new history entry
        existingHistory.set(tx.tokenId, {
          tokenId: tx.tokenId,
          currentStatus: 'held',
          purchaseDate: tx.timestamp,
          purchasePrice: 0, // Will be enriched later
          purchaseTx: tx.transactionHash,
          purchaseBlock: tx.blockNumber,
        });
      }
    }

    // Rebuild complete NFT history with new data
    const completeNFTHistory = buildNFTHistory([
      ...Array.from(existingHistory.values()).flatMap((h) => [
        {
          tokenId: h.tokenId,
          transactionHash: h.purchaseTx,
          blockNumber: h.purchaseBlock,
          timestamp: h.purchaseDate,
          type: 'purchase' as const,
          from: '',
          to: CONTRACTS.VIBESTR_TOKEN,
        },
        ...(h.saleTx
          ? [
              {
                tokenId: h.tokenId,
                transactionHash: h.saleTx,
                blockNumber: h.saleBlock || 0,
                timestamp: h.saleDate || 0,
                type: 'sale' as const,
                from: CONTRACTS.VIBESTR_TOKEN,
                to: h.buyer || '',
              },
            ]
          : []),
      ]),
    ]);

    // Merge burn transactions
    const completeBurnHistory = [...existingBurns, ...burnTransactions].sort(
      (a, b) => a.timestamp - b.timestamp
    );

    // Calculate metrics (using placeholder values for prices)
    const currentFloorPrice = 0.1; // ETH - would fetch from OpenSea in production
    const ethPrice = 3000; // USD - would fetch from CoinGecko in production

    const metrics = calculateContractMetrics(
      completeNFTHistory,
      completeBurnHistory,
      currentFloorPrice,
      ethPrice
    );

    // Update sync status
    const finalSyncStatus: BlockchainSyncStatus = {
      lastSyncedBlock: Number(toBlock),
      lastSyncTimestamp: Date.now(),
      currentBlock: Number(currentBlock),
      isSyncing: false,
      blocksToSync: 0,
      nftEventsProcessed: nftLogs.length,
      burnEventsProcessed: burnLogs.length,
    };

    // Save all data
    await saveAllBlockchainData({
      nftHistory: completeNFTHistory,
      burnHistory: completeBurnHistory,
      metrics,
      syncStatus: finalSyncStatus,
    });

    console.log('Blockchain sync completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Sync completed successfully',
      syncStatus: finalSyncStatus,
      stats: {
        nftEventsProcessed: nftLogs.length,
        burnEventsProcessed: burnLogs.length,
        totalNFTHistory: completeNFTHistory.size,
        totalBurnHistory: completeBurnHistory.length,
      },
    });
  } catch (error: any) {
    console.error('Blockchain sync failed:', error);

    // Update sync status with error
    try {
      const status = await loadSyncStatus();
      if (status) {
        status.isSyncing = false;
        status.errors = [error.message];
        await saveSyncStatus(status);
      }
    } catch (saveError) {
      console.error('Failed to save error status:', saveError);
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Sync failed',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/vibestr/blockchain-sync
 * Get current sync status
 */
export async function GET() {
  try {
    const status = await loadSyncStatus();

    if (!status) {
      return NextResponse.json({
        synced: false,
        message: 'No sync has been performed yet',
      });
    }

    return NextResponse.json({
      synced: !status.isSyncing,
      status,
    });
  } catch (error: any) {
    console.error('Failed to get sync status:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to get sync status',
      },
      { status: 500 }
    );
  }
}
