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
    const journeys = await Journey.find({ userId: user._id }).sort({ createdAt: -1 });
    return NextResponse.json(journeys, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
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
  const {
    start,
    waypoints,
    stopTimes,
    destination,
    travelMode,
    filterOption,
    startTime,
    endTime,
    itinerary,
  } = await request.json();

  // 4) Create and return
  try {
    const journey = await Journey.create({
      userId: user._id,
      start,
      waypoints,
      stopTimes,
      destination,
      travelMode,
      filterOption,
      startTime,
      endTime,
      itinerary,
    });
    return NextResponse.json(journey, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}


