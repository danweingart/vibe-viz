/**
 * Postgres-based snapshot storage for VIBESTR data
 * Replaces filesystem storage with Vercel Postgres for production deployments
 */

import { sql } from "@vercel/postgres";
import type {
  TokenSnapshot,
  SnapshotMeta,
  NFTStrategyData,
} from "@/types/vibestr";

/**
 * Save a snapshot for the current day
 * @param data - NFTStrategyData to save
 * @returns The saved snapshot
 */
export async function saveSnapshot(
  data: NFTStrategyData
): Promise<TokenSnapshot> {
  const now = new Date();
  const date = now.toISOString().split("T")[0]; // YYYY-MM-DD
  const timestamp = now.getTime();

  const snapshot: TokenSnapshot = {
    timestamp,
    date,
    data,
  };

  try {
    // Upsert snapshot (insert or update if date already exists)
    await sql`
      INSERT INTO vibestr_snapshots (date, timestamp, data)
      VALUES (${date}, ${timestamp}, ${JSON.stringify(data)}::jsonb)
      ON CONFLICT (date)
      DO UPDATE SET
        timestamp = ${timestamp},
        data = ${JSON.stringify(data)}::jsonb,
        created_at = CURRENT_TIMESTAMP
    `;

    console.log(`Snapshot saved to database: ${date}`);

    // Update metadata
    await updateMeta();

    return snapshot;
  } catch (error) {
    console.error("Failed to save snapshot to database:", error);
    throw new Error(
      `Failed to save snapshot: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Get snapshot for a specific date
 * @param date - ISO date string (YYYY-MM-DD)
 * @returns TokenSnapshot or null if not found
 */
export async function getSnapshot(
  date: string
): Promise<TokenSnapshot | null> {
  try {
    const result = await sql`
      SELECT date, timestamp, data
      FROM vibestr_snapshots
      WHERE date = ${date}
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      date: row.date,
      timestamp: Number(row.timestamp),
      data: row.data as NFTStrategyData,
    };
  } catch (error) {
    console.error(`Failed to get snapshot for ${date}:`, error);
    return null;
  }
}

/**
 * Get snapshots for the last N days
 * @param days - Number of days to retrieve
 * @returns Array of TokenSnapshots
 */
export async function getSnapshots(days: number): Promise<TokenSnapshot[]> {
  try {
    const result = await sql`
      SELECT date, timestamp, data
      FROM vibestr_snapshots
      WHERE date >= CURRENT_DATE - ${days}::integer
      ORDER BY date ASC
    `;

    return result.rows.map((row) => ({
      date: row.date,
      timestamp: Number(row.timestamp),
      data: row.data as NFTStrategyData,
    }));
  } catch (error) {
    console.error(`Failed to get snapshots for ${days} days:`, error);
    return [];
  }
}

/**
 * Get the most recent snapshot
 * @returns TokenSnapshot or null if no snapshots exist
 */
export async function getLatestSnapshot(): Promise<TokenSnapshot | null> {
  try {
    const result = await sql`
      SELECT date, timestamp, data
      FROM vibestr_snapshots
      ORDER BY date DESC
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      date: row.date,
      timestamp: Number(row.timestamp),
      data: row.data as NFTStrategyData,
    };
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
    const result = await sql`
      SELECT date, timestamp, data
      FROM vibestr_snapshots
      ORDER BY timestamp ASC
    `;

    return result.rows.map((row) => ({
      date: row.date,
      timestamp: Number(row.timestamp),
      data: row.data as NFTStrategyData,
    }));
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
    await sql`
      UPDATE vibestr_snapshot_meta
      SET
        first_snapshot = (SELECT MIN(date) FROM vibestr_snapshots),
        last_snapshot = (SELECT MAX(date) FROM vibestr_snapshots),
        snapshot_count = (SELECT COUNT(*) FROM vibestr_snapshots),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `;
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
    const result = await sql`
      SELECT first_snapshot, last_snapshot, snapshot_count, version
      FROM vibestr_snapshot_meta
      WHERE id = 1
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      firstSnapshot: row.first_snapshot || "",
      lastSnapshot: row.last_snapshot || "",
      snapshotCount: Number(row.snapshot_count) || 0,
      version: row.version || "1.0.0",
    };
  } catch (error) {
    console.error("Failed to get meta:", error);
    return null;
  }
}

/**
 * Delete old snapshots (keep only last N days)
 * @param keepDays - Number of days to keep (default: 90)
 * @returns Number of rows deleted
 */
export async function cleanOldSnapshots(keepDays: number = 90): Promise<number> {
  try {
    const result = await sql`
      DELETE FROM vibestr_snapshots
      WHERE date < CURRENT_DATE - ${keepDays}::integer
    `;

    const deletedCount = result.rowCount || 0;

    if (deletedCount > 0) {
      console.log(`Deleted ${deletedCount} old snapshots`);
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
  coverage: number;
  missingDates: string[];
}> {
  try {
    // Generate all dates in the range
    const result = await sql`
      WITH date_range AS (
        SELECT CURRENT_DATE - generate_series(0, ${days - 1}) AS expected_date
      )
      SELECT
        dr.expected_date::text AS date,
        CASE WHEN vs.date IS NOT NULL THEN true ELSE false END AS exists
      FROM date_range dr
      LEFT JOIN vibestr_snapshots vs ON vs.date = dr.expected_date
      ORDER BY dr.expected_date ASC
    `;

    const missingDates: string[] = [];
    let available = 0;

    for (const row of result.rows) {
      if (row.exists) {
        available++;
      } else {
        missingDates.push(row.date);
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
  } catch (error) {
    console.error("Failed to check snapshot coverage:", error);
    return {
      total: days,
      available: 0,
      missing: days,
      coverage: 0,
      missingDates: [],
    };
  }
}

/**
 * Initialize database tables (creates tables if they don't exist)
 * This should be called during deployment or first run
 */
export async function initializeTables(): Promise<void> {
  try {
    // Create snapshots table
    await sql`
      CREATE TABLE IF NOT EXISTS vibestr_snapshots (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL UNIQUE,
        timestamp BIGINT NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create indexes
    await sql`
      CREATE INDEX IF NOT EXISTS idx_vibestr_snapshots_date
      ON vibestr_snapshots(date DESC)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_vibestr_snapshots_timestamp
      ON vibestr_snapshots(timestamp DESC)
    `;

    // Create metadata table
    await sql`
      CREATE TABLE IF NOT EXISTS vibestr_snapshot_meta (
        id INTEGER PRIMARY KEY DEFAULT 1,
        first_snapshot DATE,
        last_snapshot DATE,
        snapshot_count INTEGER DEFAULT 0,
        version VARCHAR(10) DEFAULT '1.0.0',
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT single_row CHECK (id = 1)
      )
    `;

    // Initialize metadata row
    await sql`
      INSERT INTO vibestr_snapshot_meta (id)
      VALUES (1)
      ON CONFLICT (id) DO NOTHING
    `;

    console.log("Database tables initialized successfully");
  } catch (error) {
    console.error("Failed to initialize database tables:", error);
    throw error;
  }
}
