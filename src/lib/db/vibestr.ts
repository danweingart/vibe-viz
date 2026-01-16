import { promises as fs } from "fs";
import path from "path";
import type {
  TokenSnapshot,
  SnapshotMeta,
  NFTStrategyData,
  DailyTokenStats,
} from "@/types/vibestr";

// Snapshot storage directory (relative to project root)
const SNAPSHOT_DIR = path.join(process.cwd(), "data", "vibestr", "snapshots");
const META_FILE = path.join(process.cwd(), "data", "vibestr", "meta.json");

/**
 * Ensure the snapshot directory exists
 */
async function ensureDirectory(): Promise<void> {
  try {
    await fs.mkdir(SNAPSHOT_DIR, { recursive: true });
  } catch (error) {
    console.error("Failed to create snapshot directory:", error);
    throw error;
  }
}

/**
 * Get the filename for a specific date
 * @param date - ISO date string (YYYY-MM-DD)
 * @returns Filename like "2026-01-13.json"
 */
function getSnapshotFilename(date: string): string {
  return `${date}.json`;
}

/**
 * Get the full path for a snapshot file
 * @param date - ISO date string (YYYY-MM-DD)
 * @returns Full file path
 */
function getSnapshotPath(date: string): string {
  return path.join(SNAPSHOT_DIR, getSnapshotFilename(date));
}

/**
 * Save a snapshot for the current day
 * @param data - NFTStrategyData to save
 * @returns The saved snapshot
 */
export async function saveSnapshot(data: NFTStrategyData): Promise<TokenSnapshot> {
  await ensureDirectory();

  const now = new Date();
  const date = now.toISOString().split("T")[0]; // YYYY-MM-DD
  const timestamp = now.getTime();

  const snapshot: TokenSnapshot = {
    timestamp,
    date,
    data,
  };

  const filePath = getSnapshotPath(date);

  try {
    await fs.writeFile(filePath, JSON.stringify(snapshot, null, 2), "utf-8");
    console.log(`Snapshot saved: ${filePath}`);

    // Update metadata
    await updateMeta();

    return snapshot;
  } catch (error) {
    console.error("Failed to save snapshot:", error);
    throw new Error(`Failed to save snapshot: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Get snapshot for a specific date
 * @param date - ISO date string (YYYY-MM-DD)
 * @returns TokenSnapshot or null if not found
 */
export async function getSnapshot(date: string): Promise<TokenSnapshot | null> {
  const filePath = getSnapshotPath(date);

  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as TokenSnapshot;
  } catch (error) {
    // File not found is not an error, return null
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    console.error(`Failed to read snapshot for ${date}:`, error);
    return null;
  }
}

/**
 * Get snapshots for the last N days
 * @param days - Number of days to retrieve
 * @returns Array of TokenSnapshots
 */
export async function getSnapshots(days: number): Promise<TokenSnapshot[]> {
  const snapshots: TokenSnapshot[] = [];
  const now = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateString = date.toISOString().split("T")[0];

    const snapshot = await getSnapshot(dateString);
    if (snapshot) {
      snapshots.push(snapshot);
    }
  }

  // Sort by date ascending (oldest first)
  return snapshots.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Get the most recent snapshot
 * @returns TokenSnapshot or null if no snapshots exist
 */
export async function getLatestSnapshot(): Promise<TokenSnapshot | null> {
  try {
    await ensureDirectory();
    const files = await fs.readdir(SNAPSHOT_DIR);

    // Filter for JSON files and sort by date descending
    const snapshotFiles = files
      .filter((f) => f.endsWith(".json"))
      .sort()
      .reverse();

    if (snapshotFiles.length === 0) {
      return null;
    }

    // Read the most recent file
    const latestFile = snapshotFiles[0];
    const content = await fs.readFile(
      path.join(SNAPSHOT_DIR, latestFile),
      "utf-8"
    );
    return JSON.parse(content) as TokenSnapshot;
  } catch (error) {
    console.error("Failed to get latest snapshot:", error);
    return null;
  }
}

/**
 * Get all available snapshots
 * @returns Array of all TokenSnapshots
 */
export async function getAllSnapshots(): Promise<TokenSnapshot[]> {
  try {
    await ensureDirectory();
    const files = await fs.readdir(SNAPSHOT_DIR);

    const snapshots: TokenSnapshot[] = [];

    for (const file of files) {
      if (file.endsWith(".json")) {
        try {
          const content = await fs.readFile(
            path.join(SNAPSHOT_DIR, file),
            "utf-8"
          );
          const snapshot = JSON.parse(content) as TokenSnapshot;
          snapshots.push(snapshot);
        } catch (error) {
          console.error(`Failed to read snapshot ${file}:`, error);
        }
      }
    }

    // Sort by timestamp ascending
    return snapshots.sort((a, b) => a.timestamp - b.timestamp);
  } catch (error) {
    console.error("Failed to get all snapshots:", error);
    return [];
  }
}

/**
 * Update metadata about snapshots
 */
async function updateMeta(): Promise<void> {
  try {
    const snapshots = await getAllSnapshots();

    if (snapshots.length === 0) {
      return;
    }

    const meta: SnapshotMeta = {
      firstSnapshot: snapshots[0].date,
      lastSnapshot: snapshots[snapshots.length - 1].date,
      snapshotCount: snapshots.length,
      version: "1.0.0",
    };

    await fs.writeFile(META_FILE, JSON.stringify(meta, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to update meta:", error);
  }
}

/**
 * Get metadata about snapshots
 * @returns SnapshotMeta or null if not available
 */
export async function getMeta(): Promise<SnapshotMeta | null> {
  try {
    const content = await fs.readFile(META_FILE, "utf-8");
    return JSON.parse(content) as SnapshotMeta;
  } catch (error) {
    return null;
  }
}

/**
 * Delete old snapshots (keep only last N days)
 * @param keepDays - Number of days to keep
 * @returns Number of files deleted
 */
export async function cleanOldSnapshots(keepDays: number = 90): Promise<number> {
  try {
    const snapshots = await getAllSnapshots();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - keepDays);
    const cutoffTimestamp = cutoffDate.getTime();

    let deletedCount = 0;

    for (const snapshot of snapshots) {
      if (snapshot.timestamp < cutoffTimestamp) {
        const filePath = getSnapshotPath(snapshot.date);
        await fs.unlink(filePath);
        deletedCount++;
        console.log(`Deleted old snapshot: ${snapshot.date}`);
      }
    }

    if (deletedCount > 0) {
      await updateMeta();
    }

    return deletedCount;
  } catch (error) {
    console.error("Failed to clean old snapshots:", error);
    return 0;
  }
}

/**
 * Check if snapshots exist for a given date range
 * @param days - Number of days to check
 * @returns Object with coverage information
 */
export async function checkSnapshotCoverage(days: number): Promise<{
  total: number;
  available: number;
  missing: number;
  coverage: number; // Percentage (0-100)
  missingDates: string[];
}> {
  const now = new Date();
  const missingDates: string[] = [];
  let available = 0;

  for (let i = 0; i < days; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateString = date.toISOString().split("T")[0];

    const snapshot = await getSnapshot(dateString);
    if (snapshot) {
      available++;
    } else {
      missingDates.push(dateString);
    }
  }

  const missing = days - available;
  const coverage = days > 0 ? (available / days) * 100 : 0;

  return {
    total: days,
    available,
    missing,
    coverage,
    missingDates,
  };
}
