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

const categoryEmojis: { [key: string]: string } = {
  comedy_show: "🎤",
  music_concert: "🎵",
  art_exhibition: "🎨",
  food_popup: "🍔",
  market: "🛍️",
  workshop: "👨‍🏫",
  festival: "🎉",
  sports: "⚽",
  nightlife: "🌃",
  theater: "🎭",
  dance_performance: "💃",
  wellness: "🧘",
  tour: "🗺️",
  restaurant: "🍽️",
  beach: "🏖️",
  beach_access: "🏖️",
  attraction: "🎡",
  cafe: "☕",
  event: "📅",
  // Nature & Heritage
  park: "🌳",
  nature: "🌿",
  waterfall: "💧",
  wildlife_sanctuary: "🦜",
  water_body: "🏞️",
  temple: "🛕",
  church: "⛪",
  hindu_temple: "🛕",
  fort: "🏰",
  heritage: "🏛️",
  museum: "🏛️",
};

export default function ExplorePage() {
  const ctx = useTripContext();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [showAddToTripFor, setShowAddToTripFor] = useState<any | null>(null);
  const [bookmarking, setBookmarking] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all"); // "all", "events", "places", "weekend", "today"
  const [breakdown, setBreakdown] = useState<{ events: number; amenities: number; places: number } | null>(null);

  // get user location (optional, used for km distances)
  useEffect(() => {
    if (!navigator?.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setLoc({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => undefined
    );
  }, []);

  // debounce search with filter
  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      let url = `/api/explore?filter=${filter}`;
      if (q.trim()) url += `&q=${encodeURIComponent(q)}`;
      
      fetch(url)
        .then((r) => r.json())
        .then((data) => {
          setResults(data.results || []);
          setBreakdown(data.breakdown || null);
        })
        .catch((e) => console.error(e))
        .finally(() => setLoading(false));
    }, 350);

    return () => clearTimeout(t);
  }, [q, filter]);

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

  const formatEventDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
    
    const options: Intl.DateTimeFormatOptions = { 
      weekday: "short", 
      month: "short", 
      day: "numeric" 
    };
    return date.toLocaleDateString("en-US", options);
  };

  return (
    <div className="p-6 min-h-screen relative z-10">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold mb-2 text-[#6B5539]">
          Explore Goa
        </h2>
        <p className="text-gray-600 mb-6">
          Discover {breakdown ? `${breakdown.events} events, ${breakdown.amenities || 0} nature & heritage sites & ${breakdown.places} places` : "places, events, shows & activities"}
        </p>

        {/* Search Bar */}
        <div className="mb-4">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search places, events, comedy shows, pop-ups..."
            className="w-full border-2 border-[#E8D4A8] rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#4A7C59] focus:border-[#4A7C59]"
          />
        </div>

        {/* Filter Chips */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              filter === "all"
                ? "bg-[#4A7C59] text-white"
                : "bg-white/50 border-2 border-[#E8D4A8] text-gray-700 hover:bg-white/80"
            }`}
          >
            🌟 All
          </button>
          <button
            onClick={() => setFilter("events")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              filter === "events"
                ? "bg-[#4A7C59] text-white"
                : "bg-white/50 border-2 border-[#E8D4A8] text-gray-700 hover:bg-white/80"
            }`}
          >
            🎉 Events & Shows
          </button>
          <button
            onClick={() => setFilter("places")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              filter === "places"
                ? "bg-[#4A7C59] text-white"
                : "bg-white/50 border-2 border-[#E8D4A8] text-gray-700 hover:bg-white/80"
            }`}
          >
            📍 Places
          </button>
          <button
            onClick={() => setFilter("weekend")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              filter === "weekend"
                ? "bg-[#4A7C59] text-white"
                : "bg-white/50 border-2 border-[#E8D4A8] text-gray-700 hover:bg-white/80"
            }`}
          >
            🎊 This Weekend
          </button>
          <button
            onClick={() => setFilter("today")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              filter === "today"
                ? "bg-[#4A7C59] text-white"
                : "bg-white/50 border-2 border-[#E8D4A8] text-gray-700 hover:bg-white/80"
            }`}
          >
            📅 Today
          </button>
        </div>

        {loading && <div className="text-sm text-gray-700 mb-4">Loading...</div>}

        {/* Results Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {results.map((r, i) => {
            const addr = r.location?.address || r.location?.venueName || r.description || "";
            const lat = r.location?.lat;
            const lng = r.location?.lng;
            const km = loc && lat && lng ? haversineKm(loc.lat, loc.lng, lat, lng).toFixed(1) : null;
            const rating = r.reviews && r.reviews.length ? r.reviews[0].rating : null;
            const isEvent = r.isEvent === true;
            const emoji = categoryEmojis[r.category || r.type] || "📍";
            
            return (
              <div 
                key={i} 
                className={`glass border-2 rounded-xl p-4 flex gap-4 hover:shadow-lg transition-all ${
                  isEvent ? "border-[#4A7C59]" : "border-[#E8D4A8]"
                } ${r.isFeatured ? "ring-2 ring-yellow-400" : ""}`}
              >
                <div className="w-24 h-24 bg-[#FAF3E0] flex-shrink-0 rounded-lg overflow-hidden relative">
                  {r.imageUrl ? (
                    <img src={r.imageUrl} alt={r.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">
                      {emoji}
                    </div>
                  )}
                  {r.isFeatured && (
                    <div className="absolute top-1 right-1 bg-yellow-400 text-xs px-1.5 py-0.5 rounded-full font-bold">
                      ⭐
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg text-gray-800 truncate">{r.name}</h3>
                      
                      {/* Event-specific info */}
                      {isEvent ? (
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-[#4A7C59]">
                            {emoji} {r.category?.replace(/_/g, " ").toUpperCase()}
                          </div>
                          {r.eventDate && (
                            <div className="text-sm text-gray-700">
                              📅 {formatEventDate(r.eventDate)}
                              {r.startTime && ` • ${r.startTime}`}
                            </div>
                          )}
                          {r.location?.venueName && (
                            <div className="text-sm text-gray-600">📍 {r.location.venueName}</div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-600">
                          {r.type} • {addr.substring(0, 40)}{addr.length > 40 ? "..." : ""}
                        </div>
                      )}
                    </div>
                    
                    <div className="text-right text-sm text-gray-600 flex-shrink-0">
                      {km && <div>{km} km</div>}
                      {rating && <div>⭐ {rating}</div>}
                      {isEvent && r.costLevel && (
                        <div className="text-xs font-medium text-[#4A7C59]">
                          {r.costLevel}
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-gray-700 mt-2 line-clamp-2">
                    {r.description || ""}
                  </p>

                  {/* Tags */}
                  {r.tags && r.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {r.tags.slice(0, 3).map((tag: string, idx: number) => (
                        <span
                          key={idx}
                          className="text-xs bg-[#FAF3E0] text-gray-700 px-2 py-0.5 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex gap-2">
                    <button 
                      onClick={() => handleBookmark(r)} 
                      className="btn-glass text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium"
                    >
                      {bookmarking === r.name ? "..." : "Bookmark"}
                    </button>
                    <button 
                      onClick={() => handleAddToTrip(r)} 
                      className="btn-green text-white px-3 py-1.5 rounded-lg text-sm font-medium"
                    >
                      Add to trip
                    </button>
                    {isEvent && r.ticketLink && (
                      <a
                        href={r.ticketLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[#4A7C59] underline px-2 py-1.5"
                      >
                        Tickets
                      </a>
                    )}
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
                Adding &ldquo;{showAddToTripFor.name}&rdquo;
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
