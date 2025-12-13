"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash } from "lucide-react";
import { useTripContext } from "../../context/TripContext";
import { useLoadScript } from "@react-google-maps/api";

const LIBRARIES: ("places")[] = ["places"];

export default function MyTripsPage() {
  const router = useRouter();
  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string;
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });
  const {
    savedJourneys,
    setOrigin,
    setDestination,
    setDestinationName,
    setWaypoints,
    setWaypointNames,
    setStopTimes,
    setTravelMode,
    setFilterOption,
    setTripDate,
    setOriginTime,
    setDestinationTime,
    setItinerary,
    setShowModal,
    setShowItinerary,
    deleteTripHandler,
    setEditingJourneyId,
    setPendingRecalc,
    setPendingShowAmenities,
  } = useTripContext();

  return (
    <div className="p-6 bg-white min-h-screen">
      <h2 className="text-2xl font-bold mb-4 text-gray-900">My Trips</h2>
      {savedJourneys.length === 0 ? (
        <p>No saved trips yet.</p>
      ) : (
        savedJourneys.map((trip, idx) => (
          <div
            key={trip._id}
            className="mb-4 border p-4 rounded shadow bg-gray-50 space-y-2"
          >
            {/* Trip ID and Date header */}
            <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
              <span className="font-mono bg-gray-200 px-2 py-0.5 rounded">
                ID: {trip._id.slice(-8)}
              </span>
              <span>
                {new Date(trip.startTime).toLocaleDateString("en-IN", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
            <h3 className="text-xl font-bold text-gray-900">{trip.start} → {trip.destination}</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setEditingJourneyId(trip._id);
                  setOrigin(trip.start);
                  setDestination(trip.destination);
                  setDestinationName(trip.destinationName || "");
                  setWaypoints(trip.waypoints || []);
                  setWaypointNames(trip.waypointNames || {});
                  setStopTimes(trip.stopTimes || []);
                  setTravelMode(trip.travelMode);
                  setFilterOption(trip.filterOption);
                  setTripDate(new Date(trip.startTime).toISOString().split("T")[0]);
                  setOriginTime(new Date(trip.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }));
                  setDestinationTime(new Date(trip.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }));
                  setItinerary([{ title: "Your Itinerary", description: trip.itinerary }]);
                  setShowModal(true);
                }}
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
                onClick={() => {
                  // Load this trip into context and navigate to homepage; let it recalc and show itinerary
                  setEditingJourneyId(trip._id);
                  setOrigin(trip.start);
                  setDestination(trip.destination);
                  setDestinationName(trip.destinationName || "");
                  setWaypoints(trip.waypoints || []);
                  setWaypointNames(trip.waypointNames || {});
                  setStopTimes(trip.stopTimes || []);
                  setTravelMode(trip.travelMode);
                  setFilterOption(trip.filterOption);
                  setTripDate(new Date(trip.startTime).toISOString().split("T")[0]);
                  setOriginTime(new Date(trip.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }));
                  setDestinationTime(new Date(trip.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }));
                  setPendingRecalc(true);
                  router.push("/");
                }}
                className="flex items-center border border-gray-300 hover:bg-gray-50 text-gray-800 px-3 py-1 rounded"
              >
                View Trip
              </button>
              <button
                onClick={() => {
                  // Load trip, recalc, then open amenities automatically
                  setEditingJourneyId(trip._id);
                  setOrigin(trip.start);
                  setDestination(trip.destination);
                  setDestinationName(trip.destinationName || "");
                  setWaypoints(trip.waypoints || []);
                  setWaypointNames(trip.waypointNames || {});
                  setStopTimes(trip.stopTimes || []);
                  setTravelMode(trip.travelMode);
                  setFilterOption(trip.filterOption);
                  setTripDate(new Date(trip.startTime).toISOString().split("T")[0]);
                  setOriginTime(new Date(trip.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }));
                  setDestinationTime(new Date(trip.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }));
                  setPendingShowAmenities(true);
                  setPendingRecalc(true);
                  router.push("/");
                }}
                className="flex items-center border border-gray-300 hover:bg-gray-50 text-gray-800 px-3 py-1 rounded"
              >
                See Amenities
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
