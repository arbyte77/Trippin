"use client";

import React, { useState, useRef, useEffect, FormEvent } from "react";
import { useLoadScript } from "@react-google-maps/api";
// import Navbar from "./components/Navbar";
import TripPlannerModal from "./components/TripPlannerModal";
import ItineraryView from "./components/ItineraryView";
import MapView from "./components/MapView";
import { getTransitItinerary } from "./utils/transitUtils";
import { Trash, Pencil, MapPinned } from "lucide-react";

// Map container style and default center
const containerStyle = {
  width: "100vw",
  height: "calc(100vh - 56px)",
};
const defaultCenter = { lat: 15.3913, lng: 73.8782 };

// Helper: Combine date + time into a JS Date
function makeDate(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}:00`);
}



import { useTripContext } from "./context/TripContext";

export default function HomePage() {
  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: ["places"],
  });
  const {
    setWaypoints,
    setStopTimes,
    showModal,
    setShowModal,
    tripDate,
    setTripDate,
    origin,
    setOrigin,
    originTime,
    setOriginTime,
    destination,
    setDestination,
    destinationTime,
    setDestinationTime,
    waypoints,
    stopTimes,
    addStop,
    removeStop,
    updateStop,
    updateStopTime,
    travelMode,
    setTravelMode,
    filterOption,
    setFilterOption,
    showItinerary,
    setShowItinerary,
    itinerary,
    setItinerary,
    savedJourneys,
    setSavedJourneys,
    showTrips,
    setShowTrips,
    deleteTripHandler,
    saveTripHandler,
    getDirectionsHandler,
  } = useTripContext();

  // Local state for directions and extraMarkers (not needed globally)
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [directionsSegments, setDirectionsSegments] = useState<google.maps.DirectionsResult[]>([]);
  const [extraMarkers, setExtraMarkers] = useState<{ position: google.maps.LatLngLiteral }[]>([]);

  // Map icon (define or import as needed)
  const userStopIcon = ""; // fallback, update as needed

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ✅ My Trips View */}
      {showTrips && (
        <div className="p-6 bg-white">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">My Trips</h2>
          {savedJourneys.map((trip, idx) => (
            <div
              key={trip._id}
              className="mb-4 border p-4 rounded shadow bg-gray-50 space-y-2"
            >
              <h3 className="text-xl font-bold text-gray-900">{trip.start} → {trip.destination}</h3>
              <p className="text-gray-800 whitespace-pre-line">{trip.itinerary}</p>
              <div className="flex space-x-4">
                <button
                  onClick={() => {
                    setShowTrips(false);
                    setOrigin(trip.start);
                    setDestination(trip.destination);
                    setWaypoints(trip.waypoints || []);
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
                    setShowTrips(false);
                    setShowItinerary(false);
                  }}
                  className="flex items-center bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
                >
                  <MapPinned className="h-4 w-4 mr-1" /> View Map
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <TripPlannerModal
          showModal={showModal}
          onClose={() => setShowModal(false)}
          tripDate={tripDate}
          setTripDate={setTripDate}
          origin={origin}
          setOrigin={setOrigin}
          originTime={originTime}
          setOriginTime={setOriginTime}
          destination={destination}
          setDestination={setDestination}
          destinationTime={destinationTime}
          setDestinationTime={setDestinationTime}
          waypoints={waypoints}
          stopTimes={stopTimes}
          onAddStop={addStop}
          onRemoveStop={removeStop}
          onUpdateStop={updateStop}
          onUpdateStopTime={updateStopTime}
          travelMode={travelMode}
          setTravelMode={setTravelMode}
          filterOption={filterOption}
          setFilterOption={setFilterOption}
          onGetDirections={(e) => getDirectionsHandler(e, window.google.maps, setDirections, setDirectionsSegments, setExtraMarkers)}
        />
      )}

      <ItineraryView
        showItinerary={showItinerary}
        itinerary={itinerary}
        onSaveTrip={saveTripHandler}
        onShowMap={() => setShowItinerary(false)}
      />

      {!showItinerary && (
        loadError ? (
          <div>Error loading maps</div>
        ) : !isLoaded ? (
          <div>Loading map...</div>
        ) : (
          <MapView
            showItinerary={showItinerary}
            containerStyle={containerStyle}
            defaultCenter={defaultCenter}
            directionsSegments={directionsSegments}
            directions={directions}
            travelMode={travelMode}
            extraMarkers={extraMarkers}
            icon={userStopIcon}
          />
        )
      )}
    </div>
  );
}
