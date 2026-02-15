import { NextRequest, NextResponse } from "next/server";
import { cache } from "@/lib/cache/postgres";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const key = searchParams.get("key");

    if (key) {
      // Invalidate specific cache key
      await cache.delete(key);
      return NextResponse.json({
        success: true,
        message: `Cache key "${key}" cleared successfully`,
        timestamp: new Date().toISOString(),
      });
    } else {
      // Invalidate all cached data
      await cache.clear();
      return NextResponse.json({
        success: true,
        message: "All cache cleared successfully",
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("Error refreshing cache:", error);
    return NextResponse.json(
      { error: "Failed to refresh cache" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Return cache stats
    const stats = await cache.getStats();
    return NextResponse.json({
      totalEntries: stats.totalEntries,
      expiredEntries: stats.expiredEntries,
      totalSize: stats.totalSize,
    });
  } catch (error) {
    console.error("Error getting cache stats:", error);
    return NextResponse.json(
      { error: "Failed to get cache stats" },
      { status: 500 }
    );
  }
}
