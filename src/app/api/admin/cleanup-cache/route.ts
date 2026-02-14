import { NextResponse } from "next/server";
import { cache } from "@/lib/cache/postgres";

/**
 * Cleanup expired cache entries
 *
 * This endpoint is called by Vercel Cron to periodically clean up
 * expired cache entries from the database.
 *
 * Cron schedule: Every 6 hours (configured in vercel.json)
 */
export async function GET() {
  try {
    console.log("Starting cache cleanup...");

    const deletedCount = await cache.clearExpired();

    console.log(`Cache cleanup complete: ${deletedCount} expired entries removed`);

    return NextResponse.json({
      success: true,
      deletedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cache cleanup error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
