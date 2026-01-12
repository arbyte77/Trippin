"use client";

import React from "react";
import { useLoadScript } from "@react-google-maps/api";
import TripPlannerModal from "../components/TripPlannerModal";
import ItineraryView from "../components/ItineraryView";
import { Trash, Pencil, MapPinned } from "lucide-react";
import { useTripContext } from "../context/TripContext";

const LIBRARIES: ("places")[] = ["places"];

export default function HomePage() {
  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });
  const {
    setWaypoints,
    setWaypointNames,
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
    setDestinationName,
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
    showTrips,
    setShowTrips,
    deleteTripHandler,
    saveTripHandler,
    getDirectionsHandler,
    setDirections,
    setDirectionsSegments,
    setExtraMarkers,
    setEditingJourneyId,
  } = useTripContext();

  // Recalculation is now handled by AppShell (always mounted)
  
  return (
    <div className="min-h-screen relative z-10">
      {/* Recalculation is handled by useEffect above - removed duplicate inline IIFE that caused race conditions */}
      
      {/* My Trips View */}
      {showTrips && (
        <div className="p-6">
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
        isLoaded={isLoaded}
        loadError={loadError}
      />

      {/* RefreshmentModal is now in AppShell for global access */}

      {!showItinerary && (
        <div className="flex items-center justify-center h-[50vh] relative z-10">
          <div className="text-center glass rounded-2xl p-8 border-2 border-[#4A7C59]">
            <div className="text-xl font-semibold text-gray-900">Map preview moved</div>
            <div className="text-gray-600 mt-1">
              View each trip's route in <span className="font-medium">My Trips</span>.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
