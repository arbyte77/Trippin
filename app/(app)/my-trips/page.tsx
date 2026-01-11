"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash, Eye, MapPin, Zap } from "lucide-react";
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
    <div className="p-6 bg-white min-h-screen">
      <h2 className="text-2xl font-bold mb-4 text-gray-900">My Trips</h2>
      {savedJourneys.length === 0 ? (
        <p className="text-gray-600">No saved trips yet.</p>
      ) : (
        savedJourneys.map((trip) => {
          // Check if this trip has cached route data
          const hasCachedRoute = !!(trip.cachedDirections || trip.cachedDirectionsSegments);
          
          return (
            <div
              key={trip._id}
              className="mb-4 border p-4 rounded shadow bg-gray-50 space-y-2"
            >
              {/* Trip ID and Date header */}
              <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono bg-gray-200 px-2 py-0.5 rounded">
                    ID: {trip._id.slice(-8)}
                  </span>
                  {hasCachedRoute && (
                    <span className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">
                      <Zap className="h-3 w-3" /> Cached
                    </span>
                  )}
                </div>
                <span>
                  {new Date(trip.startTime).toLocaleDateString("en-IN", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                {trip.start} → {trip.destinationName || trip.destination}
              </h3>
              {trip.waypoints && trip.waypoints.length > 0 && (
                <p className="text-sm text-gray-600">
                  via {trip.waypoints.map((wp: string, i: number) => 
                    trip.waypointNames?.[i] || wp
                  ).join(", ")}
                </p>
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                <button
                  onClick={() => handleEditTrip(trip._id)}
                  className="flex items-center bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
                >
                  <Pencil className="h-4 w-4 mr-1" /> Edit
                </button>
                <button
                  onClick={() => deleteTripHandler(trip._id)}
                  className="flex items-center bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                >
                  <Trash className="h-4 w-4 mr-1" /> Delete
                </button>
                <button
                  onClick={() => handleViewTrip(trip._id)}
                  className="flex items-center border border-gray-300 hover:bg-gray-50 text-gray-800 px-3 py-1 rounded"
                >
                  <Eye className="h-4 w-4 mr-1" /> 
                  View Trip {hasCachedRoute && <span className="ml-1 text-green-600 text-xs">(instant)</span>}
                </button>
                <button
                  onClick={() => handleSeeAmenities(trip._id)}
                  className="flex items-center border border-gray-300 hover:bg-gray-50 text-gray-800 px-3 py-1 rounded"
                >
                  <MapPin className="h-4 w-4 mr-1" /> See Amenities
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
