"use client";

import React, { useEffect, useState } from "react";
import { useTripContext } from "../../context/TripContext";
import { useRouter } from "next/navigation";

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  function toRad(x: number) {
    return (x * Math.PI) / 180;
  }
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function ExplorePage() {
  const ctx = useTripContext();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [showAddToTripFor, setShowAddToTripFor] = useState<any | null>(null);
  const [bookmarking, setBookmarking] = useState<string | null>(null);

  // get user location (optional, used for km distances)
  useEffect(() => {
    if (!navigator?.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setLoc({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => undefined
    );
  }, []);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      const url = q.trim() ? `/api/explore?q=${encodeURIComponent(q)}` : `/api/explore`;
      fetch(url)
        .then((r) => r.json())
        .then((data) => {
          setResults(data.results || []);
        })
        .catch((e) => console.error(e))
        .finally(() => setLoading(false));
    }, 350);

    return () => clearTimeout(t);
  }, [q]);

  const handleBookmark = async (item: any) => {
    setBookmarking(item.name);
    try {
      const res = await fetch("/api/explore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      if (res.ok) {
        alert("Bookmarked");
      } else {
        alert("Failed to bookmark");
      }
    } catch (e) {
      console.error(e);
      alert("Error bookmarking");
    } finally {
      setBookmarking(null);
    }
  };

  const handleAddToTrip = (item: any) => {
    // set pending place in context and navigate to the add-to-trip flow
    ctx.setPendingPlace(item);
    // if user has exactly one saved trip, preselect it in the query
    const tripId = ctx.savedJourneys && ctx.savedJourneys.length === 1 ? ctx.savedJourneys[0]._id : null;
    if (tripId) router.push(`/add-to-trip?tripId=${tripId}`);
    else router.push(`/add-to-trip`);
  };

  const confirmAddToTrip = async (tripId: string) => {
    if (!showAddToTripFor) return;
    try {
      // Build the place object with displayName for the waypoint name
      const placeWithName = {
        ...showAddToTripFor,
        displayName: showAddToTripFor.name,
        // Build locationStr for routing (prefer coords, then address)
        locationStr: showAddToTripFor.location?.lat && showAddToTripFor.location?.lng
          ? `${showAddToTripFor.location.lat},${showAddToTripFor.location.lng}`
          : showAddToTripFor.location?.address || showAddToTripFor.name,
      };
      
      const res = await fetch(`/api/journeys/${tripId}/addPlace`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ place: placeWithName }),
      });
      if (!res.ok) throw new Error("Failed to add");
      const data = await res.json();
      // refetch journeys in context
      const r = await fetch("/api/journeys");
      if (r.ok) {
        const journeys = await r.json();
        ctx.setSavedJourneys(journeys);
        // Update waypointNames in context for the updated journey
        const updated = journeys.find((j: any) => j._id === tripId);
        if (updated) {
          const wpNames = updated.waypointNames || 
            (updated.waypointNamesJson ? JSON.parse(updated.waypointNamesJson) : {});
          ctx.setWaypointNames(wpNames);
          if (updated.destinationName) ctx.setDestinationName(updated.destinationName);
        }
      }
      alert("Added to trip");
    } catch (e) {
      console.error(e);
      alert("Error adding to trip");
    } finally {
      setShowAddToTripFor(null);
    }
  };

  return (
    <div className="p-6 min-h-screen relative z-10">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-semibold mb-6 text-[#6B5539]">
          Explore Goa
        </h2>

        <div className="mb-6">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search places, restaurants, activities..."
            className="w-full border-2 border-[#E8D4A8] rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#4A7C59] focus:border-[#4A7C59]"
          />
        </div>

        {loading && <div className="text-sm text-gray-700">Searching...</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {results.map((r, i) => {
            const addr = r.location?.address || r.description || "";
            const lat = r.location?.lat;
            const lng = r.location?.lng;
            const km = loc && lat && lng ? haversineKm(loc.lat, loc.lng, lat, lng).toFixed(1) : null;
            const rating = r.reviews && r.reviews.length ? r.reviews[0].rating : null;
            return (
              <div key={i} className="glass border-2 border-[#E8D4A8] rounded-xl p-4 flex gap-4 hover:shadow-lg transition-all">
                <div className="w-24 h-24 bg-[#FAF3E0] flex-shrink-0 rounded-lg overflow-hidden">
                {r.imageUrl ? <img src={r.imageUrl} alt={r.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-sm text-gray-400">No image</div>}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-800">{r.name}</h3>
                    <div className="text-sm text-gray-600">{r.type} • {addr}</div>
                    <div className="text-sm text-gray-600 mt-1">{r.costLevel ? `Cost: ${r.costLevel}` : null}</div>
                  </div>
                  <div className="text-right text-sm text-gray-600">
                    {km ? <div>{km} km</div> : <div>— km</div>}
                    {rating ? <div>⭐ {rating}</div> : null}
                  </div>
                </div>

                <p className="text-sm text-gray-700 mt-2">{r.description || ""}</p>

                {/* show first review snippet if available */}
                {r.reviews && r.reviews.length ? (
                  <div className="mt-2 text-sm text-gray-600 italic">"{r.reviews[0].text || 'No review text.'}"</div>
                ) : null}

                <div className="mt-3 flex gap-2">
                  <button onClick={() => handleBookmark(r)} className="btn-glass text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium">{bookmarking === r.name ? "..." : "Bookmark"}</button>
                  <button onClick={() => handleAddToTrip(r)} className="btn-green text-white px-3 py-1.5 rounded-lg text-sm font-medium">Add to trip</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

        {/* Add-to-trip modal */}
        {showAddToTripFor && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="glass rounded-2xl p-6 w-full max-w-md border-2 border-[#4A7C59]">
              <h4 className="text-lg font-semibold mb-4 text-[#6B5539]">
                Add to trip
              </h4>
              <p className="text-sm text-gray-700 mb-4">
                Adding "{showAddToTripFor.name}"
              </p>
              {ctx.savedJourneys && ctx.savedJourneys.length ? (
                <div className="space-y-2 max-h-64 overflow-auto">
                  {ctx.savedJourneys.map((j: any) => (
                    <div key={j._id} className="flex justify-between items-center border-2 border-[#E8D4A8] rounded-lg p-3 bg-white/50">
                      <div>
                        <div className="font-medium text-gray-800">{j.start} → {j.destination}</div>
                        <div className="text-sm text-gray-600">{new Date(j.startTime).toLocaleString()}</div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => confirmAddToTrip(j._id)} className="btn-green text-white px-4 py-1.5 rounded-lg text-sm font-medium">Add</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-600">No saved trips. Save a trip first to add places.</div>
              )}

              <div className="mt-4 text-right">
                <button onClick={() => setShowAddToTripFor(null)} className="btn-glass text-gray-700 px-4 py-2 rounded-lg text-sm font-medium">Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
