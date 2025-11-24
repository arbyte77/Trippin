import { NextRequest, NextResponse } from "next/server";
import connectMongo from "@/lib/mongodb";
import Place from "@/models/Place";
import { getServerSession } from "next-auth/next";
import User from "@/models/User";
import { authOptions } from "@/app/api/auth/authOptions";

// GET /api/explore?q=... -> return a browsable gallery of places.
// Behavior:
// - Returns recent/curated `Place` documents from the DB (no user-specific filtering) when available.
// - If DB is empty or no matches, falls back to Google Places Text Search using a server-side key.
// NOTE: this endpoint does NOT read or filter by user bookmarks; bookmarks are stored separately via POST.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  try {
    // Always use Google Places Text Search for the Explore gallery.
    // Use a server-side-only key so it is not exposed to the client.
    const apiKey = process.env.GOOGLE_MAPS_BACKEND_API_KEY || process.env.GOOGLE_MAPS_BACKEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Server-side Google Maps API key is not configured" }, { status: 500 });
    }

    // If query is provided, search for that term in Goa; otherwise default to common activities/attractions in Goa
    const baseQuery = q ? `${q} Goa` : `things to do in Goa`;
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(baseQuery)}&key=${apiKey}`;

    const res = await fetch(url);
    if (!res.ok) return NextResponse.json({ error: "Google API error" }, { status: 500 });
    const data = await res.json();

    const transformed = (data.results || []).map((r: any) => ({
      name: r.name,
      type: (r.types && r.types[0]) || "Sightseeing",
      location: {
        address: r.formatted_address || r.vicinity || "",
        lat: r.geometry?.location?.lat,
        lng: r.geometry?.location?.lng,
      },
      description: r.formatted_address || r.vicinity || "",
      costLevel: r.price_level != null ? ["Free", "$", "$$", "$$$"][r.price_level] || "Unknown" : "Unknown",
      reviews: (r.rating ? [{ rating: r.rating, text: "" }] : []),
      imageUrl: r.photos && r.photos.length ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${r.photos[0].photo_reference}&key=${apiKey}` : "",
      tags: r.types || [],
      external_place_id: r.place_id,
    }));

    return NextResponse.json({ source: "google", results: transformed });
  } catch (err: any) {
    console.error(err);
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
