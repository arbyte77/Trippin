import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import connectMongo from "@/lib/mongodb";
import Journey from "@/models/Journey";
import User from "@/models/User";
import Place from "@/models/Place";
import { authOptions } from "@/app/api/auth/authOptions";

// POST /api/journeys/:id/addPlace
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: "Not authenticated" }, { status: 401 });

  await connectMongo();
  const user = await User.findOne({ email: session.user?.email });
  if (!user) return NextResponse.json({ message: "User not found" }, { status: 404 });

  const { id } = await context.params;
  const body = await request.json();
  if (!body) return NextResponse.json({ message: "Missing body" }, { status: 400 });

  // body can be { placeId } or { place: {...} }
  // placeLocation is what we store as waypoint - prefer address/coords for routing
  let placeLocation = "";
  const requestedIndex = typeof body.index === "number" ? body.index : undefined;
  if (body.placeId) {
    const p = await Place.findById(body.placeId);
    if (!p) return NextResponse.json({ message: "Place not found" }, { status: 404 });
    // Use address or coords if available, fallback to name
    if (p.location?.address) {
      placeLocation = p.location.address;
    } else if (p.location?.lat && p.location?.lng) {
      placeLocation = `${p.location.lat},${p.location.lng}`;
    } else {
      placeLocation = p.name;
    }
  } else if (body.place) {
    // Prefer locationStr if provided (from RefreshmentModal), then address, then coords, then name
    if (body.place.locationStr) {
      placeLocation = body.place.locationStr;
    } else if (body.place.location?.address && body.place.location.address.length > 5) {
      placeLocation = body.place.location.address;
    } else if (body.place.location?.lat && body.place.location?.lng) {
      placeLocation = `${body.place.location.lat},${body.place.location.lng}`;
    } else if (body.place.name) {
      placeLocation = body.place.name;
    } else {
      return NextResponse.json({ message: "Missing place info" }, { status: 400 });
    }
  } else {
    return NextResponse.json({ message: "Missing place info" }, { status: 400 });
  }
  
  // Keep the display name for itinerary text
  const placeName = body.place?.name || placeLocation;

  // Get the display name from the request (if provided)
  const displayName = body.place?.displayName || body.place?.name || placeLocation;

  // find journey owned by user
  const journey = await Journey.findOne({ _id: id, userId: user._id });
  if (!journey) return NextResponse.json({ message: "Journey not found" }, { status: 404 });

  journey.waypoints = journey.waypoints || [];
  journey.stopTimes = journey.stopTimes || [];
  journey.waypointNames = journey.waypointNames || {};

  // Build interval-aware insertion logic.
  // If the caller provided a stopTime (arriveBy or leaveBy), try to fit the new place
  // into the existing chronology of journey.stopTimes. Otherwise append to end.
  const providedStop = body.stopTime && (body.stopTime.arriveBy || body.stopTime.leaveBy) ? { arriveBy: body.stopTime.arriveBy || "", leaveBy: body.stopTime.leaveBy || "" } : null;

  let insertAt: number | undefined = undefined;

  if (typeof requestedIndex === "number" && requestedIndex >= 0) {
    // Special case: requestedIndex === waypoints.length + 1 means "after destination"
    if (requestedIndex === (journey.waypoints?.length || 0) + 1) {
      const currentWaypoints = journey.waypoints || [];
      const currentStopTimes = journey.stopTimes || [];
      
      // Parse existing waypointNames from JSON
      const existingNames: Record<string, string> = JSON.parse(journey.waypointNamesJson || "{}");
      
      const newWaypoints = [...currentWaypoints];
      const newStopTimes = [...currentStopTimes];
      const newWaypointNames: Record<string, string> = { ...existingNames };
      
      if (journey.destination) {
        // Move current destination to waypoints
        const currentWaypointsLength = newWaypoints.length;
        newWaypoints.push(journey.destination);
        newStopTimes.push({ arriveBy: "", leaveBy: "" });
        // If destination had a name, add it to waypointNames
        if (journey.destinationName) {
          newWaypointNames[String(currentWaypointsLength)] = journey.destinationName;
        }
      }
      
      // Convert to JSON string for storage
      const newWaypointNamesJson = JSON.stringify(newWaypointNames);
      
      // Update itinerary
      const entry = `${placeName}: Added via Explore`;
      const newItinerary = journey.itinerary ? `${journey.itinerary}\n${entry}` : entry;
      
      console.log('[addPlace] After destination: waypointNames:', newWaypointNamesJson);
      console.log('[addPlace] destinationName:', displayName);
      
      // Use findOneAndUpdate with $set
      const updated = await Journey.findOneAndUpdate(
        { _id: id, userId: user._id },
        {
          $set: {
            waypoints: newWaypoints,
            stopTimes: newStopTimes,
            waypointNamesJson: newWaypointNamesJson,
            destination: placeLocation,
            destinationName: displayName,
            itinerary: newItinerary,
          },
        },
        { new: true }
      ).lean();
      
      // Parse JSON for response
      const waypointNamesObj = JSON.parse((updated as any)?.waypointNamesJson || "{}");
      
      return NextResponse.json({ 
        message: "added", 
        journey: updated ? { ...updated, waypointNames: waypointNamesObj } : null 
      }, { status: 200 });
    }
    insertAt = Math.min(requestedIndex, journey.waypoints.length);
  } else if (providedStop) {
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
  const insertIndex: number = insertAt ?? journey.waypoints.length;

  // Build new arrays with the insertion
  const newWaypoints = [...(journey.waypoints || [])];
  newWaypoints.splice(insertIndex, 0, placeLocation);
  
  const newStopTimes = [...(journey.stopTimes || [])];
  newStopTimes.splice(insertIndex, 0, providedStop || { arriveBy: "", leaveBy: "" });
  
  // Update waypointNames: parse from JSON, shift existing names, add new name
  const existingNames: Record<string, string> = JSON.parse(journey.waypointNamesJson || "{}");
  
  const newWaypointNames: Record<string, string> = {};
  Object.entries(existingNames).forEach(([key, val]) => {
    const k = parseInt(key, 10);
    if (k >= insertIndex) {
      newWaypointNames[String(k + 1)] = val; // Shift up
    } else {
      newWaypointNames[String(k)] = val; // Keep as-is
    }
  });
  // Add the new display name at insertIndex
  newWaypointNames[String(insertIndex)] = displayName;
  
  // Convert back to JSON string for storage
  const newWaypointNamesJson = JSON.stringify(newWaypointNames);
  
  console.log('[addPlace] Saving waypointNames:', newWaypointNamesJson);
  
  // Update itinerary textual lines to keep in sync
  const entry = `${placeName}: Added via Explore`;
  let newItinerary = journey.itinerary || "";
  if (!newItinerary) {
    newItinerary = entry;
  } else {
    const lines = newItinerary.split("\n");
    if (insertIndex >= lines.length) lines.push(entry);
    else lines.splice(insertIndex, 0, entry);
    newItinerary = lines.join("\n");
  }

  // Use findOneAndUpdate with $set
  const updated = await Journey.findOneAndUpdate(
    { _id: id, userId: user._id },
    {
      $set: {
        waypoints: newWaypoints,
        stopTimes: newStopTimes,
        waypointNamesJson: newWaypointNamesJson,
        itinerary: newItinerary,
      },
    },
    { new: true }
  ).lean();

  // Parse JSON for response
  const waypointNamesObj = JSON.parse((updated as any)?.waypointNamesJson || "{}");

  console.log('[addPlace] Updated journey waypointNames:', JSON.stringify(waypointNamesObj));

  return NextResponse.json({ 
    message: "added", 
    journey: updated ? { ...updated, waypointNames: waypointNamesObj } : null 
  }, { status: 200 });
}
