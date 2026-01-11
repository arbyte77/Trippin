// app/api/journeys/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import connectMongo from "@/lib/mongodb";
import Journey from "@/models/Journey";
import User from "@/models/User";
import { authOptions } from "@/app/api/auth/authOptions";

console.log("🛠️  🔥  Loading journeys route.ts")

// ✅ GET /api/journeys — return all journeys for the logged-in user
export async function GET(request: NextRequest) {
  // 1) Check auth
  console.log("📡 got GET /api/journeys")
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  // 2) Connect & find user
  await connectMongo();
  const user = await User.findOne({ email: session.user?.email });
  if (!user) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  // 3) Fetch journeys
  try {
    const journeys = await Journey.find({ userId: user._id }).sort({ createdAt: -1 }).lean();
    
    // Parse waypointNamesJson for each journey
    const journeysWithParsedNames = journeys.map((j: any) => {
      const waypointNames = JSON.parse(j.waypointNamesJson || "{}");
      return {
        ...j,
        waypointNames, // Add parsed object for client
      };
    });
    
    // Debug: log what's being returned
    if (journeysWithParsedNames.length > 0) {
      console.log('[GET /api/journeys] First journey waypointNames:', JSON.stringify(journeysWithParsedNames[0].waypointNames));
      console.log('[GET /api/journeys] First journey destinationName:', journeysWithParsedNames[0].destinationName);
    }
    return NextResponse.json(journeysWithParsedNames, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

// Helper: Generate a cache key from route parameters
function generateRouteCacheKey(start: string, destination: string, waypoints: string[], travelMode: string, filterOption: string): string {
  const waypointsStr = (waypoints || []).filter(w => w?.trim()).join(',');
  return `${start}|${destination}|${waypointsStr}|${travelMode}|${filterOption}`;
}

// ✅ POST /api/journeys — save a new journey
export async function POST(request: NextRequest) {
  // 1) Check auth
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  // 2) Connect & find user
  await connectMongo();
  const user = await User.findOne({ email: session.user?.email });
  if (!user) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  // 3) Parse body
  const body = await request.json();
  const {
    start,
    waypoints,
    waypointNames,
    stopTimes,
    destination,
    destinationName,
    travelMode,
    filterOption,
    startTime,
    endTime,
    itinerary,
    // Route cache fields
    cachedDirections,
    cachedDirectionsSegments,
    cachedSegmentsByLeg,
    cachedItinerary,
  } = body;

  console.log('[POST /api/journeys] Received waypointNames:', JSON.stringify(waypointNames));
  console.log('[POST /api/journeys] Received destinationName:', destinationName);
  console.log('[POST /api/journeys] Has cached directions:', !!cachedDirections || !!cachedDirectionsSegments);

  // 4) Create and return
  try {
    // Store waypointNames as JSON string for reliable MongoDB storage
    const waypointNamesJson = JSON.stringify(waypointNames || {});
    
    // Generate route cache key for later invalidation checks
    const routeCacheKey = generateRouteCacheKey(start, destination, waypoints, travelMode, filterOption);
    
    const journey = await Journey.create({
      userId: user._id,
      start,
      waypoints,
      waypointNamesJson,
      stopTimes,
      destination,
      destinationName: destinationName || "",
      travelMode,
      filterOption,
      startTime,
      endTime,
      itinerary,
      // Cache fields
      cachedDirections: cachedDirections || null,
      cachedDirectionsSegments: cachedDirectionsSegments || null,
      cachedSegmentsByLeg: cachedSegmentsByLeg || [],
      cachedItinerary: cachedItinerary || null,
      routeCacheKey,
      cachedAt: (cachedDirections || cachedDirectionsSegments) ? new Date() : null,
    });
    
    // Convert to object and parse JSON for response
    const journeyObj = journey.toObject();
    const waypointNamesObj = JSON.parse(journeyObj.waypointNamesJson || "{}");
    console.log('[POST /api/journeys] Saved journey waypointNames:', JSON.stringify(waypointNamesObj));
    
    return NextResponse.json({
      ...journeyObj,
      waypointNames: waypointNamesObj, // Add parsed object for client
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}


