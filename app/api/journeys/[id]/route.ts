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
  } = await request.json();

  // Store waypointNames as JSON string
  const waypointNamesJson = JSON.stringify(waypointNames || {});

  const updated = await Journey.findOneAndUpdate(
    { _id: id, userId: user._id },
    {
      $set: {
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
      },
    },
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
