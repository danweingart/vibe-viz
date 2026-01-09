import { NextResponse } from "next/server";
import { cache } from "@/lib/cache/memory";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    // Invalidate all cached data
    await cache.clear();

    return NextResponse.json({
      success: true,
      message: "Cache cleared successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error refreshing cache:", error);
    return NextResponse.json(
      { error: "Failed to refresh cache" },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return cache stats
  const stats = cache.getStats();
  return NextResponse.json({
    cacheSize: stats.size,
    cachedKeys: stats.keys,
  });
}
