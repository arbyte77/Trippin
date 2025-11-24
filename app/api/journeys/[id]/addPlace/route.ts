import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import connectMongo from "@/lib/mongodb";
import Journey from "@/models/Journey";
import User from "@/models/User";
import Place from "@/models/Place";
import { authOptions } from "@/app/api/auth/authOptions";

// POST /api/journeys/:id/addPlace
export async function POST(request: NextRequest, context: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  await connectMongo();
  const user = await User.findOne({ email: session.user?.email });
  if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

  const { id } = context.params;
  const body = await request.json();
  if (!body) return NextResponse.json({ message: "Missing body" }, { status: 400 });

  // body can be { placeId } or { place: {...} }
  let placeName = "";
  if (body.placeId) {
    const p = await Place.findById(body.placeId);
    if (!p) return NextResponse.json({ message: "Place not found" }, { status: 404 });
    placeName = p.name;
  } else if (body.place && body.place.name) {
    placeName = body.place.name;
  } else {
    return NextResponse.json({ message: "Missing place info" }, { status: 400 });
  }

  // find journey owned by user
  const journey = await Journey.findOne({ _id: id, userId: user._id });
  if (!journey) return NextResponse.json({ message: "Journey not found" }, { status: 404 });

  journey.waypoints = journey.waypoints || [];
  journey.stopTimes = journey.stopTimes || [];

  // Build interval-aware insertion logic.
  // If the caller provided a stopTime (arriveBy or leaveBy), try to fit the new place
  // into the existing chronology of journey.stopTimes. Otherwise append to end.
  const providedStop = body.stopTime && (body.stopTime.arriveBy || body.stopTime.leaveBy) ? { arriveBy: body.stopTime.arriveBy || "", leaveBy: body.stopTime.leaveBy || "" } : null;

  let insertAt: number | undefined = undefined;

  if (providedStop) {
    // parse provided time (prefer arriveBy, then leaveBy)
    const newTimeStr = providedStop.arriveBy || providedStop.leaveBy;
    const newTs = newTimeStr ? Date.parse(newTimeStr) : NaN;

    if (!isNaN(newTs)) {
      // iterate the existing stopTimes in order to find the first stop whose start
      // time is greater than the new time; insert before that stop.
      for (let i = 0; i < journey.stopTimes.length; i++) {
        const st = journey.stopTimes[i] || {};
        const startStr = st.arriveBy || st.leaveBy || "";
        const startTs = startStr ? Date.parse(startStr) : NaN;
        const endStr = st.leaveBy || st.arriveBy || "";
        const endTs = endStr ? Date.parse(endStr) : NaN;

        // if this stop has a valid start time and the new time is before it,
        // insert here to keep chronology
        if (!isNaN(startTs) && newTs < startTs) {
          insertAt = i;
          break;
        }

        // if new time falls inside this stop's interval, place it after this stop
        if (!isNaN(startTs) && !isNaN(endTs) && newTs >= startTs && newTs <= endTs) {
          insertAt = i + 1;
          break;
        }
      }
      // if not set, append to end
      if (typeof insertAt === "undefined") insertAt = journey.waypoints.length;
    } else {
      // invalid provided time - fallback to append
      insertAt = journey.waypoints.length;
    }
  } else {
    // no stopTime provided - append to end
    insertAt = journey.waypoints.length;
  }

  // perform the insertion
  // ensure insertAt is defined for TypeScript and runtime safety
  if (typeof insertAt === "undefined") insertAt = journey.waypoints.length;

  journey.waypoints.splice(insertAt, 0, placeName);
  journey.stopTimes.splice(insertAt, 0, providedStop || { arriveBy: "", leaveBy: "" });
  // update itinerary textual lines to keep in sync
  const entry = `${placeName}: Added via Explore`;
  if (!journey.itinerary) journey.itinerary = entry;
  else {
    const lines = journey.itinerary.split("\n");
    if (insertAt && insertAt>= lines.length) lines.push(entry);
    else lines.splice(insertAt, 0, entry);
    journey.itinerary = lines.join("\n");
  }

  await journey.save();

  return NextResponse.json({ message: "added", journey }, { status: 200 });
}
