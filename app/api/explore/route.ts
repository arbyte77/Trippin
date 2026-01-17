import { NextRequest, NextResponse } from "next/server";
import connectMongo from "@/lib/mongodb";
import Place from "@/models/Place";
import Event from "@/models/Event";
import GoaAmenity from "@/models/GoaAmenity";
import { getServerSession } from "next-auth/next";
import User from "@/models/User";
import { authOptions } from "@/app/api/auth/authOptions";

// GET /api/explore?q=...&filter=... -> return a browsable gallery of places AND events.
// Behavior:
// - Combines results from Google Places API (static places) and Events DB (dynamic activities)
// - Returns ~40 diverse results: places, events, comedy shows, pop-ups, etc.
// - Supports filtering by category, date (weekend/today/upcoming)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const filter = searchParams.get("filter") || "all"; // "all", "events", "places", "weekend", "today"
  const category = searchParams.get("category"); // "comedy_show", "food_popup", etc.

  try {
    await connectMongo();
    
    const apiKey = process.env.GOOGLE_MAPS_BACKEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Server-side Google Maps API key is not configured" }, { status: 500 });
    }

    // eslint-disable-next-line prefer-const
    let places: any[] = [];
    // eslint-disable-next-line prefer-const
    let events: any[] = [];
    // eslint-disable-next-line prefer-const
    let amenities: any[] = [];

    // Fetch nature spots and heritage sites from GoaAmenity collection
    if (filter === "all" || filter === "places") {
      const amenityQuery: any = {
        isActive: true,
        category: { 
          $in: ["park", "temple", "beach_access"] // Nature spots, heritage, beaches
        }
      };

      // Text search if query provided
      if (q) {
        amenityQuery.$or = [
          { name: new RegExp(q, "i") },
          { description: new RegExp(q, "i") },
          { tags: new RegExp(q, "i") },
        ];
      }

      const amenityResults = await GoaAmenity.find(amenityQuery)
        .limit(15)
        .lean();

      amenities = amenityResults.map((a: any) => ({
        _id: a._id.toString(),
        name: a.name,
        type: a.subType || a.category,
        category: a.category,
        location: {
          address: a.location?.address || a.location?.landmark || "",
          area: a.location?.area,
          lat: a.location?.lat,
          lng: a.location?.lng,
        },
        description: a.description || `${a.subType || a.category} in ${a.location?.area || "Goa"}`,
        costLevel: a.details?.isFree ? "Free" : "$",
        imageUrl: a.imageUrl,
        tags: a.tags || [],
        isVerified: a.isVerified,
        isAmenity: true,
        reviews: [],
      }));
    }

    // Fetch events from database (upcoming activities, shows, pop-ups, etc.)
    if (filter === "all" || filter === "events" || filter === "weekend" || filter === "today") {
      const now = new Date();
      const eventQuery: any = {
        isActive: true,
        status: { $in: ["upcoming", "ongoing"] },
      };

      // Date filtering
      if (filter === "today") {
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(todayStart);
        todayEnd.setDate(todayEnd.getDate() + 1);
        eventQuery.eventDate = { $gte: todayStart, $lt: todayEnd };
      } else if (filter === "weekend") {
        const today = now.getDay();
        const daysUntilFriday = (5 - today + 7) % 7;
        const thisFriday = new Date(now);
        thisFriday.setDate(now.getDate() + daysUntilFriday);
        thisFriday.setHours(0, 0, 0, 0);
        
        const thisMonday = new Date(thisFriday);
        thisMonday.setDate(thisFriday.getDate() + 3);
        
        eventQuery.eventDate = { $gte: thisFriday, $lt: thisMonday };
      } else {
        // Upcoming events (next 30 days)
        const in30Days = new Date(now);
        in30Days.setDate(now.getDate() + 30);
        eventQuery.eventDate = { $gte: now, $lt: in30Days };
      }

      // Category filtering
      if (category) {
        eventQuery.category = category;
      }

      // Text search if query provided
      if (q) {
        eventQuery.$or = [
          { name: new RegExp(q, "i") },
          { description: new RegExp(q, "i") },
          { tags: new RegExp(q, "i") },
        ];
      }

      const eventResults = await Event.find(eventQuery)
        .sort({ isFeatured: -1, eventDate: 1 })
        .limit(25)
        .lean();

      events = eventResults.map((e: any) => ({
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
        description: e.description || `${e.category} event at ${e.location?.venueName || e.location?.area || "Goa"}`,
        costLevel: e.details?.isFree ? "Free" : (e.details?.price || "$$"),
        imageUrl: e.imageUrl,
        tags: e.tags || [],
        websiteUrl: e.websiteUrl,
        ticketLink: e.details?.ticketLink,
        isFeatured: e.isFeatured,
        isEvent: true,
        reviews: [], // Events don't have reviews yet
      }));
    }

    // Fetch places from Google Places API
    if (filter === "all" || filter === "places") {
      // Diverse queries to get variety
      const queries = q 
        ? [`${q} Goa`] 
        : [
            "restaurants Goa",
            "beaches Goa", 
            "nightlife Goa",
            "attractions Goa",
            "cafes Goa",
          ];

      for (const query of queries) {
        const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;
        
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = await res.json();

        const transformed = (data.results || []).slice(0, 8).map((r: any) => ({
          name: r.name,
          type: (r.types && r.types[0]) || "place",
          location: {
            address: r.formatted_address || r.vicinity || "",
            lat: r.geometry?.location?.lat,
            lng: r.geometry?.location?.lng,
          },
          description: r.formatted_address || r.vicinity || "",
          costLevel: r.price_level != null ? ["Free", "$", "$$", "$$$", "$$$$"][r.price_level] || "$$" : "$$",
          reviews: (r.rating ? [{ rating: r.rating, text: "" }] : []),
          imageUrl: r.photos && r.photos.length ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${r.photos[0].photo_reference}&key=${apiKey}` : "",
          tags: r.types || [],
          external_place_id: r.place_id,
          isEvent: false,
        }));
        
        places.push(...transformed);
        
        // Stop after getting enough places
        if (places.length >= 20) break;
      }
    }

    // Combine and shuffle for diversity
    let combined = [...events, ...amenities, ...places];
    
    // Remove duplicates by name
    const seen = new Set();
    combined = combined.filter((item) => {
      if (seen.has(item.name)) return false;
      seen.add(item.name);
      return true;
    });

    // Shuffle to mix events and places (but keep featured events near top)
    const featured = combined.filter((item) => item.isFeatured);
    const regular = combined.filter((item) => !item.isFeatured);
    
    // Shuffle regular items
    for (let i = regular.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [regular[i], regular[j]] = [regular[j], regular[i]];
    }

    combined = [...featured, ...regular];

    // Limit to 40 results
    const results = combined.slice(0, 40);

    return NextResponse.json({ 
      results, 
      count: results.length,
      breakdown: {
        events: results.filter(r => r.isEvent).length,
        amenities: results.filter(r => r.isAmenity).length,
        places: results.filter(r => !r.isEvent && !r.isAmenity).length,
      }
    });
  } catch (err: any) {
    console.error("Error in explore API:", err);
    return NextResponse.json({ error: err.message || "Failed to search" }, { status: 500 });
  }
}

// POST /api/explore -> save/bookmark a place (body: place object)
export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body || !body.name) return NextResponse.json({ message: "Missing place data" }, { status: 400 });

  await connectMongo();

  try {
    // if user is logged in, add to bookmarkedBy
    let user = null;
    try {
      const session = await getServerSession(authOptions);
      if (session) user = await User.findOne({ email: session.user?.email });
    } catch (e) {
      // ignore auth errors for anonymous bookmarking
    }

    // upsert by name+address (simple heuristic)
    const filter = { name: body.name, "location.address": body.location?.address };
    const update: any = {
      $set: {
        name: body.name,
        type: body.type || body.tags?.[0] || "Sightseeing",
        location: body.location || {},
        description: body.description || body.location?.address || "",
        costLevel: body.costLevel || "Unknown",
        imageUrl: body.imageUrl || "",
        tags: body.tags || [],
      },
    };
    if (user) {
      update.$addToSet = { bookmarkedBy: user._id };
    }

    const saved = await Place.findOneAndUpdate(filter, update, { upsert: true, new: true });
    return NextResponse.json({ message: "saved", place: saved }, { status: 201 });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || "Failed to save" }, { status: 500 });
  }
}
