import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import connectMongo from "@/lib/mongodb";
import Journey from "@/models/Journey";
import User from "@/models/User";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// ✅ GET request: Fetch all journeys for the logged-in user
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  await connectMongo();
  const user = await User.findOne({ email: session.user?.email });
  if (!user) {
    return NextResponse.json({ message: "User not found in DB" }, { status: 404 });
  }

  try {
    const journeys = await Journey.find({ userId: user._id });
    return NextResponse.json(journeys, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}

// ✅ POST request: Save a new journey with waypoints
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  await connectMongo();
  const user = await User.findOne({ email: session.user?.email });
  if (!user) {
    return NextResponse.json({ message: "User not found in DB" }, { status: 404 });
  }

  const body = await request.json();
  const { start, waypoints, destination, travelMode, startTime, endTime } = body;

  try {
    const journey = await Journey.create({
      userId: user._id,
      start,
      waypoints,  // ✅ Store multiple stop points
      destination,
      travelMode, // ✅ Save travel mode
      startTime,
      endTime,
    });
    return NextResponse.json(journey, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }
}
