import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  console.log("📡 Incoming request to /api/directions");

  const { searchParams } = new URL(request.url);
  const origin = searchParams.get("origin");
  const destination = searchParams.get("destination");
  const travelMode = searchParams.get("travelMode") || "driving";
  let waypoints = searchParams.get("waypoints");

  console.log("🔍 Parsed parameters:", { origin, destination, travelMode, waypoints });

  if (!origin || !destination) {
    console.error("❌ Missing required parameters");
    return NextResponse.json({ message: "Missing required parameters" }, { status: 400 });
  }

  if (!waypoints || waypoints.trim() === "") {
    waypoints = ""; // ✅ Remove empty waypoints
  } else {
    waypoints = `&waypoints=${encodeURIComponent(waypoints)}`;
  }

  console.log("📡 Sending request to Google Maps API...");
  const googleMapsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(
    origin
  )}&destination=${encodeURIComponent(destination)}&mode=${travelMode}${waypoints}&key=${process.env.GOOGLE_MAPS_BACKEND_API_KEY}`;

  console.log("🔗 Google Maps API URL:", googleMapsUrl);

  try {
    const response = await fetch(googleMapsUrl);
    const data = await response.json();

    console.log("📩 Google Maps API Response:", data);

    if (data.status !== "OK") {
      console.error("❌ Google Maps API Error:", data.error_message);
      return NextResponse.json({ message: data.error_message || "Error fetching directions" }, { status: 400 });
    }

    // ✅ Ensure bounds exist before returning response
    if (!data.routes[0]?.bounds) {
      console.error("❌ Missing bounds in response");
      return NextResponse.json({ message: "Invalid response from Google Maps API" }, { status: 400 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error("❌ Error fetching directions:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
