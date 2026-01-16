import fs from 'fs/promises';
import path from 'path';
import type {
  NFTHistory,
  BurnTransaction,
  ContractMetrics,
  BlockchainSyncStatus,
} from '@/types/blockchain';

/**
 * Base directory for blockchain data storage
 */
const BLOCKCHAIN_DATA_DIR = path.join(process.cwd(), 'data', 'vibestr', 'blockchain');

/**
 * File paths for different data types
 */
const FILES = {
  NFT_HISTORY: path.join(BLOCKCHAIN_DATA_DIR, 'nft-history.json'),
  BURN_HISTORY: path.join(BLOCKCHAIN_DATA_DIR, 'burn-history.json'),
  METRICS: path.join(BLOCKCHAIN_DATA_DIR, 'metrics.json'),
  SYNC_STATUS: path.join(BLOCKCHAIN_DATA_DIR, 'sync-status.json'),
} as const;

/**
 * Ensure blockchain data directory exists
 */
async function ensureDirectoryExists(): Promise<void> {
  try {
    await fs.mkdir(BLOCKCHAIN_DATA_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create blockchain data directory:', error);
    throw error;
  }
}

/**
 * Save NFT history data to disk
 */
export async function saveNFTHistory(historyMap: Map<string, NFTHistory>): Promise<void> {
  await ensureDirectoryExists();

  const historyArray = Array.from(historyMap.values());
  const data = JSON.stringify(historyArray, null, 2);

  await fs.writeFile(FILES.NFT_HISTORY, data, 'utf-8');
  console.log(`Saved ${historyArray.length} NFT history records`);
}

/**
 * Load NFT history data from disk
 */
export async function loadNFTHistory(): Promise<Map<string, NFTHistory>> {
  try {
    const data = await fs.readFile(FILES.NFT_HISTORY, 'utf-8');
    const historyArray: NFTHistory[] = JSON.parse(data);

    const historyMap = new Map<string, NFTHistory>();
    for (const history of historyArray) {
      historyMap.set(history.tokenId, history);
    }

    console.log(`Loaded ${historyMap.size} NFT history records`);
    return historyMap;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log('No NFT history file found, starting fresh');
      return new Map();
    }
    console.error('Failed to load NFT history:', error);
    throw error;
  }
}

/**
 * Save burn transaction history to disk
 */
export async function saveBurnHistory(burns: BurnTransaction[]): Promise<void> {
  await ensureDirectoryExists();

  const data = JSON.stringify(burns, null, 2);
  await fs.writeFile(FILES.BURN_HISTORY, data, 'utf-8');
  console.log(`Saved ${burns.length} burn transaction records`);
}

/**
 * Load burn transaction history from disk
 */
export async function loadBurnHistory(): Promise<BurnTransaction[]> {
  try {
    const data = await fs.readFile(FILES.BURN_HISTORY, 'utf-8');
    const burns: BurnTransaction[] = JSON.parse(data);

    console.log(`Loaded ${burns.length} burn transaction records`);
    return burns;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log('No burn history file found, starting fresh');
      return [];
    }
    console.error('Failed to load burn history:', error);
    throw error;
  }
}

/**
 * Save contract metrics to disk
 */
export async function saveContractMetrics(metrics: ContractMetrics): Promise<void> {
  await ensureDirectoryExists();

  const data = JSON.stringify(metrics, null, 2);
  await fs.writeFile(FILES.METRICS, data, 'utf-8');
  console.log('Saved contract metrics');
}

/**
 * Load contract metrics from disk
 */
export async function loadContractMetrics(): Promise<ContractMetrics | null> {
  try {
    const data = await fs.readFile(FILES.METRICS, 'utf-8');
    const metrics: ContractMetrics = JSON.parse(data);

    console.log('Loaded contract metrics');
    return metrics;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log('No metrics file found');
      return null;
    }
    console.error('Failed to load contract metrics:', error);
    throw error;
  }
}

/**
 * Save blockchain sync status to disk
 */
export async function saveSyncStatus(status: BlockchainSyncStatus): Promise<void> {
  await ensureDirectoryExists();

  const data = JSON.stringify(status, null, 2);
  await fs.writeFile(FILES.SYNC_STATUS, data, 'utf-8');
  console.log(`Saved sync status: block ${status.lastSyncedBlock}`);
}

/**
 * Load blockchain sync status from disk
 */
export async function loadSyncStatus(): Promise<BlockchainSyncStatus | null> {
  try {
    const data = await fs.readFile(FILES.SYNC_STATUS, 'utf-8');
    const status: BlockchainSyncStatus = JSON.parse(data);

    console.log(`Loaded sync status: last synced block ${status.lastSyncedBlock}`);
    return status;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log('No sync status file found, will start from scratch');
      return null;
    }
    console.error('Failed to load sync status:', error);
    throw error;
  }
}

/**
 * Get the last synced block number
 * Returns 0 if no previous sync exists
 */
export async function getLastSyncedBlock(): Promise<number> {
  const status = await loadSyncStatus();
  return status?.lastSyncedBlock || 0;
}

/**
 * Check if blockchain data exists
 */
export async function hasBlockchainData(): Promise<boolean> {
  try {
    await fs.access(FILES.NFT_HISTORY);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get all blockchain data in a single call
 * Useful for API endpoints that need multiple data types
 */
export async function loadAllBlockchainData(): Promise<{
  nftHistory: Map<string, NFTHistory>;
  burnHistory: BurnTransaction[];
  metrics: ContractMetrics | null;
  syncStatus: BlockchainSyncStatus | null;
}> {
  const [nftHistory, burnHistory, metrics, syncStatus] = await Promise.all([
    loadNFTHistory(),
    loadBurnHistory(),
    loadContractMetrics(),
    loadSyncStatus(),
  ]);

  return {
    nftHistory,
    burnHistory,
    metrics,
    syncStatus,
  };
}

/**
 * Save all blockchain data in a single call
 * Useful for sync operations that update everything at once
 */
export async function saveAllBlockchainData(data: {
  nftHistory: Map<string, NFTHistory>;
  burnHistory: BurnTransaction[];
  metrics: ContractMetrics;
  syncStatus: BlockchainSyncStatus;
}): Promise<void> {
  await Promise.all([
    saveNFTHistory(data.nftHistory),
    saveBurnHistory(data.burnHistory),
    saveContractMetrics(data.metrics),
    saveSyncStatus(data.syncStatus),
  ]);

  console.log('Saved all blockchain data');
}

/**
 * Clear all blockchain data (useful for testing or resync)
 */
export async function clearAllBlockchainData(): Promise<void> {
  const files = Object.values(FILES);

  for (const file of files) {
    try {
      await fs.unlink(file);
      console.log(`Deleted ${path.basename(file)}`);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        console.error(`Failed to delete ${path.basename(file)}:`, error);
      }
    }
  }

  console.log('Cleared all blockchain data');
}
