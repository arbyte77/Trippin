import { NextRequest, NextResponse } from "next/server";
import connectMongo from "@/lib/mongodb";
import Event from "@/models/Event";
import { 
  aggregateEvents, 
  extractAreaFromAddress, 
  validateEventData,
  formatPrice 
} from "@/app/utils/eventSync";

/**
 * POST /api/events/sync
 * Sync events from external APIs (Insider, Eventbrite, etc.)
 * 
 * This should be called:
 * - Manually when you want to refresh event data
 * - Via cron job (daily) for automated updates
 * - After adding new API keys
 * 
 * Security: Add authentication in production
 */
export async function POST(req: NextRequest) {
  try {
    // Optional: Add authentication check here
    // const session = await getServerSession(authOptions);
    // if (!session || session.user.role !== "admin") {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    await connectMongo();

    console.log("Starting event sync...");
    
    // Fetch events from all external sources
    const externalEvents = await aggregateEvents();
    
    if (externalEvents.length === 0) {
      return NextResponse.json({ 
        message: "No events found from external sources. Check API keys.",
        synced: 0,
        errors: 0
      });
    }

    let syncedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Process each event
    for (const extEvent of externalEvents) {
      try {
        // Validate event data
        if (!validateEventData(extEvent)) {
          errorCount++;
          errors.push(`Invalid data for: ${extEvent.name}`);
          continue;
        }

        const eventDate = new Date(extEvent.date);
        
        // Don't sync past events
        if (eventDate < new Date()) {
          continue;
        }

        // Extract timing if available in description or separate fields
        // This is a simple implementation - customize based on your API responses
        const startTime = extEvent.date.includes("T") 
          ? new Date(extEvent.date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
          : undefined;

        // Determine area from address
        const area = extEvent.location.venue 
          ? extractAreaFromAddress(extEvent.location.address || extEvent.location.venue)
          : "Goa";

        // Build event object
        const eventData = {
          name: extEvent.name,
          category: extEvent.category || "other",
          eventDate: eventDate,
          startTime: startTime,
          location: {
            venueName: extEvent.location.venue,
            address: extEvent.location.address,
            area: area,
            lat: extEvent.location.lat,
            lng: extEvent.location.lng,
          },
          description: extEvent.description?.substring(0, 500), // Limit description length
          details: {
            isFree: extEvent.price?.toLowerCase().includes("free") || false,
            price: extEvent.price,
            ticketLink: extEvent.ticketLink,
            requiresBooking: !!extEvent.ticketLink,
          },
          imageUrl: extEvent.imageUrl,
          tags: [
            extEvent.category,
            area.toLowerCase(),
            eventDate.getDay() === 0 || eventDate.getDay() === 6 ? "weekend" : "weekday",
          ].filter(Boolean),
          externalSource: extEvent.source,
          externalEventId: `${extEvent.source}-${extEvent.name.replace(/\s+/g, "-").toLowerCase()}-${eventDate.getTime()}`,
          status: "upcoming",
          isActive: true,
          isFeatured: false, // Can be manually promoted later
          isVerified: true, // Events from trusted APIs are verified
        };

        // Upsert: Update if exists, create if new
        await Event.findOneAndUpdate(
          { 
            externalEventId: eventData.externalEventId,
            externalSource: eventData.externalSource,
          },
          { $set: eventData },
          { upsert: true, new: true }
        );

        syncedCount++;
      } catch (err: any) {
        console.error(`Error syncing event ${extEvent.name}:`, err);
        errorCount++;
        errors.push(`${extEvent.name}: ${err.message}`);
      }
    }

    // Archive old events (completed or past 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const archived = await Event.updateMany(
      { 
        eventDate: { $lt: thirtyDaysAgo },
        status: "upcoming"
      },
      { 
        $set: { 
          status: "completed",
          isActive: false 
        } 
      }
    );

    console.log(`Sync complete: ${syncedCount} synced, ${errorCount} errors, ${archived.modifiedCount} archived`);

    return NextResponse.json({
      success: true,
      message: "Event sync completed",
      synced: syncedCount,
      errors: errorCount,
      archived: archived.modifiedCount,
      errorDetails: errors.length > 0 ? errors.slice(0, 10) : undefined, // Return first 10 errors
    });
  } catch (err: any) {
    console.error("Event sync error:", err);
    return NextResponse.json({ 
      error: err.message || "Failed to sync events",
      success: false 
    }, { status: 500 });
  }
}

/**
 * GET /api/events/sync
 * Get sync status and last sync time
 */
export async function GET(req: NextRequest) {
  try {
    await connectMongo();

    // Get event counts
    const total = await Event.countDocuments({ isActive: true });
    const upcoming = await Event.countDocuments({ 
      isActive: true, 
      status: "upcoming",
      eventDate: { $gte: new Date() }
    });
    const external = await Event.countDocuments({ 
      isActive: true,
      externalSource: { $exists: true, $ne: "manual" }
    });

    // Get sources breakdown
    const sources = await Event.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$externalSource", count: { $sum: 1 } } }
    ]);

    // Get category breakdown
    const categories = await Event.aggregate([
      { $match: { isActive: true, status: "upcoming" } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Get oldest and newest events
    const oldest = await Event.findOne({ isActive: true, status: "upcoming" })
      .sort({ eventDate: 1 })
      .select("name eventDate");
    
    const newest = await Event.findOne({ isActive: true })
      .sort({ createdAt: -1 })
      .select("name eventDate createdAt");

    return NextResponse.json({
      status: "ok",
      counts: {
        total,
        upcoming,
        external,
        manual: total - external,
      },
      sources: sources.reduce((acc: any, s) => {
        acc[s._id || "manual"] = s.count;
        return acc;
      }, {}),
      categories: categories.map(c => ({ category: c._id, count: c.count })),
      dateRange: {
        oldest: oldest ? {
          name: oldest.name,
          date: oldest.eventDate
        } : null,
        newest: newest ? {
          name: newest.name,
          date: newest.eventDate,
          addedAt: newest.createdAt
        } : null,
      },
      message: "Run POST /api/events/sync to refresh events from external sources",
    });
  } catch (err: any) {
    console.error("Error getting sync status:", err);
    return NextResponse.json({ 
      error: err.message || "Failed to get sync status" 
    }, { status: 500 });
  }
}
