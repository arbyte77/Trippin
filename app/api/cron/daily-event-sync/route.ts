import { NextRequest, NextResponse } from "next/server";

/**
 * Daily Event Sync Cron Job
 * 
 * This endpoint should be called daily by:
 * - Vercel Cron (recommended)
 * - GitHub Actions
 * - Any external cron service
 * 
 * What it does:
 * 1. Syncs events from external APIs (Insider, Eventbrite, etc.)
 * 2. Archives old/completed events
 * 3. Updates event statuses
 * 
 * Security: Uses CRON_SECRET to prevent unauthorized access
 */
export async function GET(req: NextRequest) {
  try {
    // Verify the request is from authorized cron job
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // In development, allow without auth. In production, require secret.
    if (process.env.NODE_ENV === "production") {
      if (!cronSecret) {
        return NextResponse.json(
          { error: "CRON_SECRET not configured" },
          { status: 500 }
        );
      }

      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { error: "Unauthorized - Invalid cron secret" },
          { status: 401 }
        );
      }
    }

    console.log("🔄 Starting daily event sync...");

    // Call the sync API
    const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
    const syncResponse = await fetch(`${baseUrl}/api/events/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!syncResponse.ok) {
      throw new Error(`Sync failed: ${syncResponse.status}`);
    }

    const syncData = await syncResponse.json();

    console.log("✅ Daily sync completed:", syncData);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: "Daily event sync completed successfully",
      results: syncData,
    });
  } catch (error: any) {
    console.error("❌ Daily sync failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Also allow POST for manual testing
export async function POST(req: NextRequest) {
  return GET(req);
}
