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
      const res = await fetch(`/api/journeys/${tripId}/addPlace`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ place: showAddToTripFor }),
      });
      if (!res.ok) throw new Error("Failed to add");
      const data = await res.json();
      // refetch journeys in context (simple)
      const r = await fetch("/api/journeys");
      if (r.ok) ctx.setSavedJourneys(await r.json());
      alert("Added to trip");
    } catch (e) {
      console.error(e);
      alert("Error adding to trip");
    } finally {
      setShowAddToTripFor(null);
    }
  };

  return (
    <div className="p-6 bg-white min-h-screen">
  <h2 className="text-2xl font-bold mb-4 text-gray-900">Explore Goa</h2>

      <div className="mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search places, restaurants, activities..."
          className="w-full border rounded p-2"
        />
      </div>

  {loading && <div className="text-sm text-gray-900">Searching...</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {results.map((r, i) => {
          const addr = r.location?.address || r.description || "";
          const lat = r.location?.lat;
          const lng = r.location?.lng;
          const km = loc && lat && lng ? haversineKm(loc.lat, loc.lng, lat, lng).toFixed(1) : null;
          const rating = r.reviews && r.reviews.length ? r.reviews[0].rating : null;
          return (
            <div key={i} className="border rounded p-4 flex gap-4">
              <div className="w-24 h-24 bg-indigo-50 flex-shrink-0 rounded overflow-hidden">
                {r.imageUrl ? <img src={r.imageUrl} alt={r.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-sm text-indigo-400">No image</div>}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">{r.name}</h3>
                    <div className="text-sm text-gray-900">{r.type} • {addr}</div>
                    <div className="text-sm text-gray-900 mt-1">{r.costLevel ? `Cost: ${r.costLevel}` : null}</div>
                  </div>
                  <div className="text-right text-sm text-gray-900">
                    {km ? <div>{km} km</div> : <div>— km</div>}
                    {rating ? <div>⭐ {rating}</div> : null}
                  </div>
                </div>

                <p className="text-sm text-gray-900 mt-2">{r.description || ""}</p>

                {/* show first review snippet if available */}
                {r.reviews && r.reviews.length ? (
                  <div className="mt-2 text-sm text-gray-900">"{r.reviews[0].text || 'No review text.'}"</div>
                ) : null}

                <div className="mt-3 flex gap-2">
                  <button onClick={() => handleBookmark(r)} className="px-3 py-1 bg-indigo-100 hover:bg-indigo-200 rounded text-sm text-indigo-800">{bookmarking === r.name ? "..." : "Bookmark"}</button>
                  <button onClick={() => handleAddToTrip(r)} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Add to trip</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add-to-trip modal */}
      {showAddToTripFor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-white p-6 rounded w-full max-w-md">
            <h4 className="text-lg font-semibold mb-3 text-gray-900">Add "{showAddToTripFor.name}" to a trip</h4>
            {ctx.savedJourneys && ctx.savedJourneys.length ? (
              <div className="space-y-2 max-h-64 overflow-auto">
                {ctx.savedJourneys.map((j: any) => (
                  <div key={j._id} className="flex justify-between items-center border rounded p-2">
                    <div>
                      <div className="font-medium text-gray-900">{j.start} → {j.destination}</div>
                      <div className="text-sm text-gray-900">{new Date(j.startTime).toLocaleString()}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => confirmAddToTrip(j._id)} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Add</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div>No saved trips. Save a trip first to add places.</div>
            )}

            <div className="mt-4 text-right">
              <button onClick={() => setShowAddToTripFor(null)} className="px-3 py-1 bg-indigo-100 hover:bg-indigo-200 rounded text-sm text-indigo-800">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
