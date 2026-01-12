"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash, Eye, MapPin } from "lucide-react";
import { useTripContext } from "../../context/TripContext";
import { useLoadScript } from "@react-google-maps/api";

const LIBRARIES: ("places")[] = ["places"];

export default function MyTripsPage() {
  const router = useRouter();
  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string;
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });
  const {
    savedJourneys,
    setShowModal,
    deleteTripHandler,
    loadJourneyById,
    setPendingRecalc,
    setPendingShowAmenities,
  } = useTripContext();

  // Handler for viewing a trip (uses cached directions if available)
  const handleViewTrip = (tripId: string) => {
    if (loadJourneyById(tripId)) {
      // Journey loaded with cache - navigate home to display
      router.push("/");
    }
  };

  // Handler for editing a trip (loads form with cached data)
  const handleEditTrip = (tripId: string) => {
    if (loadJourneyById(tripId)) {
      setShowModal(true);
    }
  };

  // Handler for viewing amenities (load cached route, then show amenities)
  const handleSeeAmenities = (tripId: string) => {
    if (loadJourneyById(tripId)) {
      setPendingShowAmenities(true);
      // If no cached route, trigger recalc
      const trip = savedJourneys.find((j: any) => j._id === tripId);
      if (trip && !trip.cachedDirections && !trip.cachedDirectionsSegments) {
        setPendingRecalc(true);
      }
      router.push("/");
    }
  };

  return (
    <div className="p-6 min-h-screen relative z-10">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-semibold mb-6 text-[#6B5539]">
          My Trips
        </h2>
        {savedJourneys.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center border-2 border-[#E8D4A8]">
            <p className="text-gray-600 text-lg">No saved trips yet. Start planning your beach adventure!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {savedJourneys.map((trip) => (
              <div
                key={trip._id}
                className="glass rounded-2xl p-5 space-y-3 hover:shadow-xl transition-all duration-300 border-2 border-[#E8D4A8]"
              >
                {/* Trip ID and Date header */}
                <div className="flex justify-between items-center text-xs text-gray-600 mb-1">
                  <span className="font-mono bg-white/40 px-2.5 py-1 rounded-lg">
                    ID: {trip._id.slice(-8)}
                  </span>
                  <span className="bg-white/40 px-2.5 py-1 rounded-lg">
                    {new Date(trip.startTime).toLocaleDateString("en-IN", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-800">
                  {trip.start} → {trip.destinationName || trip.destination}
                </h3>
                {trip.waypoints && trip.waypoints.length > 0 && (
                  <p className="text-sm text-gray-600">
                    via {trip.waypoints.map((wp: string, i: number) => 
                      trip.waypointNames?.[i] || wp
                    ).join(", ")}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    onClick={() => handleEditTrip(trip._id)}
                    className="btn-green text-white px-4 py-2 rounded-lg flex items-center gap-1.5 text-sm font-medium"
                  >
                    <Pencil className="h-4 w-4" /> Edit
                  </button>
                  <button
                    onClick={() => deleteTripHandler(trip._id)}
                    className="btn-terracotta text-white px-4 py-2 rounded-lg flex items-center gap-1.5 text-sm font-medium"
                  >
                    <Trash className="h-4 w-4" /> Delete
                  </button>
                  <button
                    onClick={() => handleViewTrip(trip._id)}
                    className="btn-glass text-gray-700 px-4 py-2 rounded-lg flex items-center gap-1.5 text-sm font-medium"
                  >
                    <Eye className="h-4 w-4" /> View Trip
                  </button>
                  <button
                    onClick={() => handleSeeAmenities(trip._id)}
                    className="btn-glass text-gray-700 px-4 py-2 rounded-lg flex items-center gap-1.5 text-sm font-medium"
                  >
                    <MapPin className="h-4 w-4" /> Amenities
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
