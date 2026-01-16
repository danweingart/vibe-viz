import { NextResponse } from "next/server";
import { getVibestrData } from "@/lib/nftstrategy/client";
import { saveSnapshot } from "@/lib/db/vibestr";

export const dynamic = "force-dynamic";

/**
 * POST endpoint to capture a snapshot of current VIBESTR data
 * This endpoint should be called periodically (e.g., hourly via cron)
 * to build up historical data for charts
 */
export async function POST() {
  try {
    console.log("Capturing VIBESTR snapshot...");

    // Fetch current data from NFT Strategy API
    const response = await getVibestrData();

    // Save snapshot to storage
    const snapshot = await saveSnapshot(response.data);

    console.log(`Snapshot saved successfully: ${snapshot.date}`);

    return NextResponse.json({
      success: true,
      snapshot: {
        date: snapshot.date,
        timestamp: snapshot.timestamp,
      },
      message: "Snapshot captured successfully",
    });
  } catch (error) {
    console.error("Error capturing snapshot:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to capture snapshot",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check snapshot status
 */
export async function GET() {
  try {
    const { checkSnapshotCoverage } = await import("@/lib/db/vibestr");

    const [coverage7, coverage30, coverage90] = await Promise.all([
      checkSnapshotCoverage(7),
      checkSnapshotCoverage(30),
      checkSnapshotCoverage(90),
    ]);

    return NextResponse.json({
      status: "ok",
      coverage: {
        "7days": coverage7,
        "30days": coverage30,
        "90days": coverage90,
      },
    });
  } catch (error) {
    console.error("Error checking snapshot status:", error);
    return NextResponse.json(
      {
        error: "Failed to check snapshot status",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
