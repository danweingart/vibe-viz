import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

/**
 * Run database migrations for cache table
 *
 * Call this endpoint once to set up the persistent cache table.
 * Safe to run multiple times (uses IF NOT EXISTS).
 */
export async function POST() {
  try {
    console.log("Running cache table migration...");

    // Create cache_entries table
    await sql`
      CREATE TABLE IF NOT EXISTS cache_entries (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create indexes
    await sql`
      CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache_entries(expires_at)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_cache_updated ON cache_entries(updated_at)
    `;

    console.log("Cache table migration completed successfully");

    return NextResponse.json({
      success: true,
      message: "Cache table created successfully",
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Get migration status
 */
export async function GET() {
  try {
    // Check if table exists
    const result = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'cache_entries'
      ) as table_exists
    `;

    const tableExists = result.rows[0]?.table_exists || false;

    if (!tableExists) {
      return NextResponse.json({
        migrated: false,
        message: "Cache table does not exist. Run POST to create it.",
      });
    }

    // Get table stats
    const stats = await sql`
      SELECT
        COUNT(*) as total_entries,
        COUNT(*) FILTER (WHERE expires_at < NOW()) as expired_entries
      FROM cache_entries
    `;

    return NextResponse.json({
      migrated: true,
      tableExists,
      stats: stats.rows[0],
    });
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
