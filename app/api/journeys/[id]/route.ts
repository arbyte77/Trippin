import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import connectMongo from "@/lib/mongodb";
import Journey from "@/models/Journey";
import User from "@/models/User";
import { authOptions } from "@/app/api/auth/authOptions";

// DELETE /api/journeys/:id
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  await connectMongo();
  const user = await User.findOne({ email: session.user?.email });
  if (!user) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  const { id } = await context.params;
  const deleted = await Journey.findOneAndDelete({
    _id: id,
    userId: user._id,
  });

  if (!deleted) {
    return NextResponse.json({ message: "Journey not found" }, { status: 404 });
  }

  return NextResponse.json({ message: "Journey deleted" }, { status: 200 });
}

// Helper: Generate a cache key from route parameters
function generateRouteCacheKey(start: string, destination: string, waypoints: string[], travelMode: string, filterOption: string): string {
  const waypointsStr = (waypoints || []).filter((w: string) => w?.trim()).join(',');
  return `${start}|${destination}|${waypointsStr}|${travelMode}|${filterOption}`;
}

// PUT /api/journeys/:id
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  await connectMongo();
  const user = await User.findOne({ email: session.user?.email });
  if (!user) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  const { id } = await context.params;
  const {
    start,
    destination,
    destinationName,
    waypoints,
    waypointNames,
    stopTimes,
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
  } = await request.json();

  // Store waypointNames as JSON string
  const waypointNamesJson = JSON.stringify(waypointNames || {});
  
  // Generate new cache key
  const routeCacheKey = generateRouteCacheKey(start, destination, waypoints, travelMode, filterOption);

  // Build update object - only include cache fields if provided
  const updateFields: Record<string, unknown> = {
    start,
    destination,
    destinationName: destinationName || "",
    waypoints,
    waypointNamesJson,
    stopTimes,
    travelMode,
    filterOption,
    startTime,
    endTime,
    itinerary,
    routeCacheKey,
  };
  
  // Only update cache if new cached data is provided
  if (cachedDirections !== undefined) {
    updateFields.cachedDirections = cachedDirections;
    updateFields.cachedAt = new Date();
  }
  if (cachedDirectionsSegments !== undefined) {
    updateFields.cachedDirectionsSegments = cachedDirectionsSegments;
    updateFields.cachedAt = new Date();
  }
  if (cachedSegmentsByLeg !== undefined) {
    updateFields.cachedSegmentsByLeg = cachedSegmentsByLeg;
  }
  if (cachedItinerary !== undefined) {
    updateFields.cachedItinerary = cachedItinerary;
  }

  const updated = await Journey.findOneAndUpdate(
    { _id: id, userId: user._id },
    { $set: updateFields },
    { new: true }
  ).lean();

  if (!updated) {
    return NextResponse.json({ message: "Journey not found" }, { status: 404 });
  }

  // Parse JSON and add to response
  const waypointNamesObj = JSON.parse((updated as any).waypointNamesJson || "{}");

  return NextResponse.json({
    ...updated,
    waypointNames: waypointNamesObj,
  }, { status: 200 });
}
