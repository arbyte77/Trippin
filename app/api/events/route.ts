import { NextRequest, NextResponse } from "next/server";
import connectMongo from "@/lib/mongodb";
import Event from "@/models/Event";

// GET /api/events?date=...&category=...&area=...
// Returns upcoming events and activities
// Supports filtering by date, category, and location
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const dateFilter = searchParams.get("date") || "upcoming"; // "upcoming", "weekend", "today", or ISO date
  const category = searchParams.get("category");
  const area = searchParams.get("area");
  const limit = parseInt(searchParams.get("limit") || "20");

  try {
    await connectMongo();

    // Build query
    const query: any = {
      isActive: true,
      status: { $in: ["upcoming", "ongoing"] },
    };

    // Date filtering
    const now = new Date();
    if (dateFilter === "today") {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);
      query.eventDate = { $gte: todayStart, $lt: todayEnd };
    } else if (dateFilter === "weekend") {
      // Get next weekend (Friday evening through Sunday)
      const today = now.getDay();
      const daysUntilFriday = (5 - today + 7) % 7;
      const thisFriday = new Date(now);
      thisFriday.setDate(now.getDate() + daysUntilFriday);
      thisFriday.setHours(0, 0, 0, 0);
      
      const thisMonday = new Date(thisFriday);
      thisMonday.setDate(thisFriday.getDate() + 3);
      
      query.eventDate = { $gte: thisFriday, $lt: thisMonday };
    } else if (dateFilter === "upcoming") {
      // All future events
      query.eventDate = { $gte: now };
    } else if (dateFilter && dateFilter !== "all") {
      // Specific date provided
      try {
        const targetDate = new Date(dateFilter);
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);
        query.eventDate = { $gte: targetDate, $lt: nextDay };
      } catch (e) {
        // Invalid date, ignore
      }
    }

    // Category filtering
    if (category && category !== "all") {
      query.category = category;
    }

    // Area filtering
    if (area && area !== "all") {
      query["location.area"] = new RegExp(area, "i");
    }

    const events = await Event.find(query)
      .sort({ isFeatured: -1, eventDate: 1 }) // Featured first, then by date
      .limit(limit)
      .lean();

    // Transform to consistent format
    const transformed = events.map((e: any) => ({
      _id: e._id.toString(),
      name: e.name,
      type: e.category || "event",
      category: e.category,
      subType: e.subType,
      eventDate: e.eventDate,
      startTime: e.startTime,
      endTime: e.endTime,
      isRecurring: e.isRecurring,
      location: {
        venueName: e.location?.venueName,
        address: e.location?.address || e.location?.venueName || "",
        area: e.location?.area,
        lat: e.location?.lat,
        lng: e.location?.lng,
      },
      description: e.description,
      imageUrl: e.imageUrl,
      isFree: e.details?.isFree,
      price: e.details?.price,
      ticketLink: e.details?.ticketLink,
      tags: e.tags || [],
      websiteUrl: e.websiteUrl,
      isFeatured: e.isFeatured,
      isEvent: true, // Flag to distinguish from places
    }));

    return NextResponse.json({ results: transformed, count: transformed.length });
  } catch (err: any) {
    console.error("Error fetching events:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch events" }, { status: 500 });
  }
}

// POST /api/events -> create a new event (for admin or verified users)
export async function POST(req: NextRequest) {
  const body = await req.json();
  
  if (!body || !body.name || !body.category || !body.eventDate) {
    return NextResponse.json({ message: "Missing required fields: name, category, eventDate" }, { status: 400 });
  }

  await connectMongo();

  try {
    const event = await Event.create({
      name: body.name,
      category: body.category,
      subType: body.subType,
      eventDate: new Date(body.eventDate),
      startTime: body.startTime,
      endTime: body.endTime,
      isRecurring: body.isRecurring || false,
      recurrencePattern: body.recurrencePattern,
      recurringUntil: body.recurringUntil ? new Date(body.recurringUntil) : undefined,
      location: body.location,
      description: body.description,
      details: body.details,
      imageUrl: body.imageUrl,
      images: body.images,
      videoUrl: body.videoUrl,
      websiteUrl: body.websiteUrl,
      facebookEventUrl: body.facebookEventUrl,
      instagramUrl: body.instagramUrl,
      tags: body.tags || [],
      externalSource: body.externalSource || "manual",
      externalEventId: body.externalEventId,
      isFeatured: body.isFeatured || false,
      isVerified: body.isVerified || false,
    });

    return NextResponse.json({ message: "Event created", event }, { status: 201 });
  } catch (err: any) {
    console.error("Error creating event:", err);
    return NextResponse.json({ error: err.message || "Failed to create event" }, { status: 500 });
  }
}
