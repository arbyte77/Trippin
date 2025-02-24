"use client";

import React, { useState, FormEvent, useRef, useEffect } from "react";
import {
  GoogleMap,
  DirectionsRenderer,
  Autocomplete,
  Marker,
  useLoadScript,
} from "@react-google-maps/api";

// Map container style and default center
const containerStyle = {
  width: "100vw",
  height: "calc(100vh - 56px)", // Leaves room for the navbar
};
const defaultCenter = { lat: 15.3913, lng: 73.8782 };

// Helper: Parse a time string ("HH:MM") into a Date (using today's date)
function parseTime(timeStr: string): Date {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
}

export default function HomePage() {
  // --- State Declarations ---
  const [origin, setOrigin] = useState("kk birla goa campus");
  const [destination, setDestination] = useState("");
  const [waypoints, setWaypoints] = useState<string[]>([]);
  const [originTime, setOriginTime] = useState<string>(""); // Leave by for origin
  const [destinationTime, setDestinationTime] = useState<string>(""); // Arrive by for destination
  const [stopTimes, setStopTimes] = useState<{ arriveBy: string; leaveBy: string }[]>([]);
  const [directions, setDirections] = useState<any>(null);
  const [directionsSegments, setDirectionsSegments] = useState<any[]>([]);
  const [extraMarkers, setExtraMarkers] = useState<{ position: google.maps.LatLngLiteral }[]>([]);
  const [filterOption, setFilterOption] = useState<string>("BEST_ROUTE");
  const [travelMode, setTravelMode] = useState<google.maps.TravelMode>("DRIVING" as google.maps.TravelMode);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showItinerary, setShowItinerary] = useState<boolean>(false);
  const [itinerary, setItinerary] = useState<{ title: string; description: string }[]>([]);
  const [segmentInfos, setSegmentInfos] = useState<{ position: google.maps.LatLngLiteral; duration: string }[]>([]);
  const [savedJourneys, setSavedJourneys] = useState<any[]>([]);

  // --- Refs for Autocomplete ---
  const originRef = useRef<google.maps.places.Autocomplete | null>(null);
  const destinationRef = useRef<google.maps.places.Autocomplete | null>(null);
  const waypointRefs = useRef<(google.maps.places.Autocomplete | null)[]>([]);

  // --- Load Google Maps API ---
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: ["places"],
  });

  // --- Functions for Managing Stops and Times ---
  const addStop = () => {
    setWaypoints([...waypoints, ""]);
    setStopTimes([...stopTimes, { arriveBy: "", leaveBy: "" }]);
  };

  const removeStop = (index: number) => {
    setWaypoints(waypoints.filter((_, i) => i !== index));
    setStopTimes(stopTimes.filter((_, i) => i !== index));
  };

  const updateStop = (index: number, value: string) => {
    const newWaypoints = [...waypoints];
    newWaypoints[index] = value;
    setWaypoints(newWaypoints);
  };

  const updateStopTime = (index: number, field: "arriveBy" | "leaveBy", value: string) => {
    const newStopTimes = [...stopTimes];
    newStopTimes[index] = { ...newStopTimes[index], [field]: value };
    setStopTimes(newStopTimes);
  };

  const updateUserStopMarkers = () => {
    setExtraMarkers([]);
    // It's safe to use google here because this function should only be called after isLoaded is true.
    const geocoder = new google.maps.Geocoder();
    waypoints.filter((wp) => wp.trim() !== "").forEach((address) => {
      geocoder.geocode({ address }, (results, geoStatus) => {
        if (geoStatus === "OK" && results && results[0]) {
          const pos = {
            lat: results[0].geometry.location.lat(),
            lng: results[0].geometry.location.lng(),
          };
          setExtraMarkers((prev) => [...prev, { position: pos }]);
        }
      });
    });
  };

  // --- Saved Journeys Functions ---
  const saveTripHandler = async () => {
    const journey = {
      userId: "placeholder_user_id",
      start: origin,
      destination,
      waypoints,
      stopTimes,
      travelMode,
      filterOption,
      startTime: parseTime(originTime),
      endTime: parseTime(destinationTime),
      itinerary: itinerary.length > 0 ? itinerary[0].description : "",
    };
    try {
      const res = await fetch("/api/journeys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(journey),
      });
      if (res.ok) {
        const saved = await res.json();
        setSavedJourneys([...savedJourneys, saved]);
        alert("Trip saved successfully.");
      } else {
        alert("Error saving trip.");
      }
    } catch (error) {
      console.error(error);
      alert("Error saving trip.");
    }
  };

  const loadSavedJourneys = async () => {
    try {
      const res = await fetch("/api/journeys");
      if (res.ok) {
        const journeys = await res.json();
        setSavedJourneys(journeys);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadSavedJourneys();
  }, []);

  const viewSavedTripHandler = () => {
    if (savedJourneys.length > 0) {
      const latest = savedJourneys[savedJourneys.length - 1];
      setItinerary([{ title: "Your Detailed Itinerary", description: latest.itinerary || "" }]);
      setShowItinerary(true);
    } else {
      alert("No saved trips.");
    }
  };

  const editSavedTripHandler = () => {
    if (savedJourneys.length > 0) {
      const latest = savedJourneys[savedJourneys.length - 1];
      loadJourneyIntoModal(latest);
    } else {
      alert("No saved trips.");
    }
  };

  const loadJourneyIntoModal = (journey: any) => {
    setOrigin(journey.start);
    setDestination(journey.destination);
    setWaypoints(journey.waypoints || []);
    setStopTimes(journey.stopTimes || []);
    setTravelMode(journey.travelMode);
    setFilterOption(journey.filterOption);
    const formatTime = (d: Date) =>
      d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
    setOriginTime(journey.startTime ? formatTime(new Date(journey.startTime)) : "");
    setDestinationTime(journey.endTime ? formatTime(new Date(journey.endTime)) : "");
    setItinerary([{ title: "Your Detailed Itinerary", description: journey.itinerary || "" }]);
    setShowModal(true);
  };

  const getSegmentedTransitDirections = (
    segmentPoints: string[],
    directionsService: google.maps.DirectionsService
  ) => {
    const segmentPromises = [];
    for (let i = 0; i < segmentPoints.length - 1; i++) {
      segmentPromises.push(
        new Promise((resolve, reject) => {
          directionsService.route(
            {
              origin: segmentPoints[i],
              destination: segmentPoints[i + 1],
              travelMode: "TRANSIT" as google.maps.TravelMode,
              transitOptions: {
                departureTime: new Date(),
                routingPreference: google.maps.TransitRoutePreference.LESS_WALKING,
                modes: [google.maps.TransitMode.BUS],
              },
            },
            (result, status) => {
              if (status === "OK" && result) {
                resolve(result);
              } else {
                reject(status);
              }
            }
          );
        })
      );
    }
    Promise.all(segmentPromises)
      .then((results) => {
        for (let i = 0; i < results.length - 1; i++) {
          const leg1 = (results[i] as any).routes[0].legs[0];
          const leg2 = (results[i + 1] as any).routes[0].legs[0];
          if (leg1.arrival_time && leg2.departure_time) {
            const arrival = new Date(leg1.arrival_time.valueOf());
            const nextDeparture = new Date(leg2.departure_time.valueOf());
            if (nextDeparture < arrival) {
              const keep = window.confirm(
                `Time conflict between segment ${i + 1} and ${i + 2}: Bus departs at ${leg2.departure_time.text} but you would arrive at ${leg1.arrival_time.text}. Click OK to adjust, or Cancel to abort.`
              );
              if (!keep) {
                alert("Trip planning aborted due to time conflict.");
                return;
              }
            }
          }
        }
        let itineraryText = "";
        itineraryText += `${origin}\nLeave by: ${originTime || "N/A"}\n\n`;
        results.forEach((segment, segIndex) => {
          const leg = (segment as any).routes[0].legs[0];
          itineraryText += `--- Segment ${segIndex + 1}: ${leg.start_address} to ${leg.end_address} ---\n`;
          leg.steps.forEach((step: any) => {
            if (step.travel_mode === "WALKING") {
              itineraryText += `Walk ${step.distance.text} (takes about ${step.duration.text}).\n`;
            } else if (step.travel_mode === "TRANSIT" && step.transit_details) {
              const t = step.transit_details;
              itineraryText += `Board bus ${t.line.short_name || t.line.name} at ${t.departure_stop.name} scheduled for ${t.departure_time.text}.\n`;
              itineraryText += `Bus journey: ${t.distance.text}, ${t.duration.text}.\n`;
              itineraryText += `Alight at ${t.arrival_stop.name} arriving at ${t.arrival_time.text}.\n`;
            }
          });
          if (segIndex < waypoints.length) {
            itineraryText += `\nStop ${segIndex + 1}: ${waypoints[segIndex]}\nArrive by: ${stopTimes[segIndex]?.arriveBy || "N/A"}, Leave by: ${stopTimes[segIndex]?.leaveBy || "N/A"}\n\n`;
          }
        });
        itineraryText += `\nDestination: ${destination}\nArrive by: ${destinationTime || "N/A"}\n`;
        setItinerary([{ title: "Your Detailed Itinerary", description: itineraryText }]);
        setSegmentInfos(
          results.map((result) => {
            const leg = (result as any).routes[0].legs[0];
            const start = leg.start_location;
            const end = leg.end_location;
            const midPosition = {
              lat: (start.lat() + end.lat()) / 2,
              lng: (start.lng() + end.lng()) / 2,
            };
            const duration = leg.duration?.text || "";
            return { position: midPosition, duration };
          })
        );
        setDirectionsSegments(results as any[]);
        setDirections(null);
        updateUserStopMarkers();
        setShowItinerary(true);
      })
      .catch((status) => {
        console.error("Error fetching transit segments:", status);
        alert("Could not fetch transit directions for segments: " + status);
      });
  };

  const getDirectionsHandler = (e: FormEvent) => {
    e.preventDefault();
    if (!origin || !destination) {
      alert("Please provide both a starting point and destination.");
      return;
    }
    const directionsService = new google.maps.DirectionsService();
    const validUserStops = waypoints.filter((wp) => wp.trim() !== "");
    if (travelMode === "TRANSIT" && validUserStops.length > 0) {
      const segmentPoints = [origin, ...validUserStops, destination];
      getSegmentedTransitDirections(segmentPoints, directionsService);
    } else {
      const validWaypoints =
        travelMode === "TRANSIT"
          ? []
          : waypoints.filter((wp) => wp.trim() !== "").map((location) => ({ location }));
      const effectiveTravelMode =
        travelMode === "BICYCLING"
          ? ("DRIVING" as google.maps.TravelMode)
          : travelMode === "TRANSIT"
          ? ("TRANSIT" as google.maps.TravelMode)
          : travelMode;
      directionsService.route(
        {
          origin,
          destination,
          travelMode: effectiveTravelMode,
          waypoints: validWaypoints,
          ...(travelMode === "TRANSIT" && {
            transitOptions: {
              departureTime: new Date(),
              routingPreference: google.maps.TransitRoutePreference.LESS_WALKING,
              modes: [google.maps.TransitMode.BUS],
            },
          }),
          ...(effectiveTravelMode === "DRIVING" && { avoidTolls: filterOption === "NO_TOLL" }),
        },
        (result, status) => {
          if (status === "OK" && result) {
            setDirections(result);
            setDirectionsSegments([]);
            if (travelMode === "TRANSIT") {
              updateUserStopMarkers();
            } else {
              setExtraMarkers([]);
            }
            const leg = result.routes[0].legs[0];
            const items = [
              {
                title: origin,
                description: `Leave by: ${originTime || "N/A"}.\nDepart at ${
                  leg.departure_time ? leg.departure_time.text : "N/A"
                }.`,
              },
              ...waypoints.map((wp, idx) => ({
                title: wp,
                description: `Arrive by: ${stopTimes[idx]?.arriveBy || "N/A"}, Leave by: ${
                  stopTimes[idx]?.leaveBy || "N/A"
                }.`,
              })),
              {
                title: destination,
                description: `Arrive by: ${destinationTime || "N/A"}.\nArrives at ${
                  leg.arrival_time ? leg.arrival_time.text : "N/A"
                }.`,
              },
            ];
            setItinerary(items);
            setShowItinerary(true);
          } else {
            console.error("Error fetching directions:", status);
            alert("Could not fetch directions: " + status);
          }
        }
      );
    }
    setShowModal(false);
  };

  // Until the API is loaded, render a loading/error message.
  if (!isLoaded || loadError) {
    return <p>{loadError ? "Error loading maps" : "Loading maps..."}</p>;
  }

  // Now that isLoaded is true, it’s safe to reference the global `google` object.
  const userStopIcon = {
    path: google.maps.SymbolPath.CIRCLE,
    scale: 6,
    fillColor: "#FF0000",
    fillOpacity: 1,
    strokeWeight: 1,
    strokeColor: "#FFFFFF",
  };

  return (
    <>
      <div className="min-h-screen bg-gray-100">
        {/* Navbar */}
        <nav className="bg-black text-white flex items-center justify-between px-4 py-2">
          <div className="flex-shrink-0">
            <h1 className="text-2xl font-bold">TRIPPIN'</h1>
          </div>
          <div className="flex space-x-4">
            {savedJourneys.length > 0 && (
              <>
                <button
                  onClick={viewSavedTripHandler}
                  className="bg-green-500 hover:bg-green-600 px-3 py-1 rounded"
                >
                  View Saved Trip
                </button>
                <button
                  onClick={editSavedTripHandler}
                  className="bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded"
                >
                  Edit Saved Trip
                </button>
              </>
            )}
            {!savedJourneys.length && (
              <button
                onClick={() => setShowModal(true)}
                className="bg-turquoise-500 hover:bg-turquoise-600 px-3 py-1 rounded"
              >
                Plan Trip
              </button>
            )}
            <button className="bg-yellow-500 hover:bg-yellow-600 text-black px-3 py-1 rounded">
              Sign In
            </button>
          </div>
        </nav>

        {/* Modal for Trip Planning */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white text-black rounded shadow-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">Plan Your Trip</h2>
              <form onSubmit={getDirectionsHandler} className="space-y-4">
                {/* Vertical stack for Origin, Stops, Destination */}
                <div className="flex flex-col space-y-4">
                  {/* Origin */}
                  <div>
                    <label className="block font-medium mb-1">Origin</label>
                    <Autocomplete
                      onLoad={(autocomplete) => (originRef.current = autocomplete)}
                      onPlaceChanged={() => {
                        const place = originRef.current?.getPlace();
                        setOrigin(place?.formatted_address || "");
                      }}
                    >
                      <input
                        type="text"
                        defaultValue="kk birla goa campus"
                        placeholder="Origin"
                        className="w-full px-2 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-gray-700"
                      />
                    </Autocomplete>
                    <label className="block text-sm mt-1">Leave by</label>
                    <input
                      type="time"
                      value={originTime}
                      onChange={(e) => setOriginTime(e.target.value)}
                      className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-gray-700"
                    />
                  </div>
                  {/* + Add Stop Button */}
                  <button
                    type="button"
                    onClick={addStop}
                    className="bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded text-white"
                  >
                    + Add Stop
                  </button>
                  {/* Dynamic Stops */}
                  {waypoints.map((_, index) => (
                    <div key={index} className="border p-2 rounded space-y-2">
                      <div>
                        <label className="block font-medium mb-1">{`Stop ${index + 1}`}</label>
                        <Autocomplete
                          onLoad={(autocomplete) => (waypointRefs.current[index] = autocomplete)}
                          onPlaceChanged={() => {
                            const place = waypointRefs.current[index]?.getPlace();
                            updateStop(index, place?.formatted_address || "");
                          }}
                        >
                          <input
                            type="text"
                            placeholder={`Stop ${index + 1}`}
                            className="w-full px-2 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-gray-700"
                          />
                        </Autocomplete>
                      </div>
                      <div className="flex flex-col space-y-2">
                        <div>
                          <label className="block text-sm">Arrive by</label>
                          <input
                            type="time"
                            value={stopTimes[index]?.arriveBy || ""}
                            onChange={(e) => updateStopTime(index, "arriveBy", e.target.value)}
                            className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-gray-700"
                          />
                        </div>
                        <div>
                          <label className="block text-sm">Leave by</label>
                          <input
                            type="time"
                            value={stopTimes[index]?.leaveBy || ""}
                            onChange={(e) => updateStopTime(index, "leaveBy", e.target.value)}
                            className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-gray-700"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeStop(index)}
                          className="bg-red-500 hover:bg-red-600 px-2 py-1 rounded text-white self-center"
                        >
                          –
                        </button>
                      </div>
                    </div>
                  ))}
                  {/* Destination */}
                  <div>
                    <label className="block font-medium mb-1">Destination</label>
                    <Autocomplete
                      onLoad={(autocomplete) => (destinationRef.current = autocomplete)}
                      onPlaceChanged={() => {
                        const place = destinationRef.current?.getPlace();
                        setDestination(place?.formatted_address || "");
                      }}
                    >
                      <input
                        type="text"
                        placeholder="Destination"
                        className="w-full px-2 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-gray-700"
                      />
                    </Autocomplete>
                    <label className="block text-sm mt-1">Arrive by</label>
                    <input
                      type="time"
                      value={destinationTime}
                      onChange={(e) => setDestinationTime(e.target.value)}
                      className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-gray-700"
                    />
                  </div>
                </div>
                {/* Row 2: Mode of Transport & Filters */}
                <div className="flex items-center space-x-4">
                  <div className="w-1/2">
                    <label className="block font-medium mb-1">Mode of Transport</label>
                    <select
                      value={travelMode}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        setTravelMode(e.target.value as google.maps.TravelMode)
                      }
                      className="w-full px-2 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-gray-700"
                    >
                      <option value="DRIVING">Cab</option>
                      <option value="TRANSIT">Bus</option>
                      <option value="BICYCLING">Bike</option>
                      <option value="WALKING">Walk</option>
                    </select>
                  </div>
                  {(travelMode === "DRIVING" || travelMode === "TRANSIT") && (
                    <div className="w-1/2">
                      <label className="block font-medium mb-1">Filters</label>
                      <select
                        value={filterOption}
                        onChange={(e) => setFilterOption(e.target.value)}
                        className="w-full px-2 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-gray-700"
                      >
                        {travelMode === "DRIVING" && (
                          <>
                            <option value="BEST_ROUTE">Best Route</option>
                            <option value="NO_TOLL">No Toll</option>
                          </>
                        )}
                        {travelMode === "TRANSIT" && (
                          <>
                            <option value="BEST_ROUTE">Best Route</option>
                            <option value="LESS_WALKING">Less Walking</option>
                            <option value="FEWER_TRANSFERS">Fewer Transfers</option>
                          </>
                        )}
                      </select>
                    </div>
                  )}
                </div>
                {/* Modal Actions */}
                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="bg-gray-500 hover:bg-gray-600 px-4 py-2 rounded text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white"
                  >
                    Plan Trip
                  </button>
                  <button
                    type="button"
                    onClick={saveTripHandler}
                    className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-white"
                  >
                    Save Trip
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Itinerary Page */}
        <div className={`${showItinerary ? "" : "hidden"} p-6 bg-white`}>
          <h2 className="text-2xl font-bold mb-4 text-gray-900">Your Itinerary</h2>
          {itinerary.map((item, idx) => (
            <div key={idx} className="mb-4 border p-4 rounded shadow bg-gray-50">
              <h3 className="text-xl font-bold text-gray-900">{item.title}</h3>
              <p className="text-gray-800 whitespace-pre-line">{item.description}</p>
            </div>
          ))}
          <button
            onClick={() => setShowItinerary(false)}
            className="bg-gray-500 hover:bg-gray-600 px-4 py-2 rounded text-white"
          >
            Back to Map
          </button>
        </div>

        {/* Google Map */}
        <div className={`${showItinerary ? "hidden" : ""} mt-4`}>
          <GoogleMap mapContainerStyle={containerStyle} center={defaultCenter} zoom={14}>
            {travelMode === "TRANSIT" && directionsSegments.length > 0
              ? directionsSegments.map((seg, idx) => (
                  <DirectionsRenderer
                    key={idx}
                    directions={seg}
                    options={{ suppressMarkers: false, preserveViewport: false }}
                  />
                ))
              : directions && (
                  <DirectionsRenderer
                    directions={directions}
                    options={{ suppressMarkers: false, preserveViewport: false }}
                  />
                )}
            {travelMode !== "TRANSIT" &&
              extraMarkers.map((marker, idx) => (
                <Marker key={idx} position={marker.position} icon={userStopIcon} />
              ))}
          </GoogleMap>
        </div>
      </div>
    </>
  );
}
