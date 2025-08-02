"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, FormEvent } from "react";
import { getTransitItinerary } from "../utils/transitUtils";

interface StopTimes {
  arriveBy: string;
  leaveBy: string;
}

interface TripContextType {
  tripDate: string;
  setTripDate: (val: string) => void;
  origin: string;
  setOrigin: (val: string) => void;
  destination: string;
  setDestination: (val: string) => void;
  waypoints: string[];
  setWaypoints: (val: string[]) => void;
  originTime: string;
  setOriginTime: (val: string) => void;
  destinationTime: string;
  setDestinationTime: (val: string) => void;
  stopTimes: StopTimes[];
  setStopTimes: (val: StopTimes[]) => void;
  filterOption: string;
  setFilterOption: (val: string) => void;
  travelMode: google.maps.TravelMode;
  setTravelMode: (val: google.maps.TravelMode) => void;
  showModal: boolean;
  setShowModal: (val: boolean) => void;
  showItinerary: boolean;
  setShowItinerary: (val: boolean) => void;
  itinerary: { title: string; description: string }[];
  setItinerary: (val: { title: string; description: string }[]) => void;
  segmentInfos: any[];
  setSegmentInfos: (val: any[]) => void;
  savedJourneys: any[];
  setSavedJourneys: (val: any[]) => void;
  showTrips: boolean;
  setShowTrips: (val: boolean) => void;
  addStop: () => void;
  removeStop: (i: number) => void;
  updateStop: (i: number, val: string) => void;
  updateStopTime: (i: number, f: "arriveBy" | "leaveBy", val: string) => void;
  viewSavedTripHandler: () => void;
  editSavedTripHandler: () => void;
  deleteTripHandler: (id: string) => void;
  saveTripHandler: () => Promise<void>;
  getDirectionsHandler: (e: FormEvent, maps: typeof google.maps, setDirections: any, setDirectionsSegments: any, setExtraMarkers: any) => Promise<void>;
}

const TripContext = createContext<TripContextType | undefined>(undefined);

export function useTripContext() {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error("useTripContext must be used within TripProvider");
  return ctx;
}

export function TripProvider({ children }: { children: ReactNode }) {
  // ...all state and handlers from GlobalNavbarWrapper go here...
  const [tripDate, setTripDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [origin, setOrigin] = useState("kk birla goa campus");
  const [destination, setDestination] = useState("");
  const [waypoints, setWaypoints] = useState<string[]>([]);
  const [originTime, setOriginTime] = useState("");
  const [destinationTime, setDestinationTime] = useState("");
  const [stopTimes, setStopTimes] = useState<StopTimes[]>([]);
  const [filterOption, setFilterOption] = useState("BEST_ROUTE");
  const [travelMode, setTravelMode] = useState<google.maps.TravelMode>("DRIVING" as google.maps.TravelMode);
  const [showModal, setShowModal] = useState(false);
  const [showItinerary, setShowItinerary] = useState(false);
  const [itinerary, setItinerary] = useState<{ title: string; description: string }[]>([]);
  const [segmentInfos, setSegmentInfos] = useState<any[]>([]);
  const [savedJourneys, setSavedJourneys] = useState<any[]>([]);
  const [showTrips, setShowTrips] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/journeys");
        if (res.ok) setSavedJourneys(await res.json());
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  const addStop = () => {
    setWaypoints((w) => [...w, ""]);
    setStopTimes((t) => [...t, { arriveBy: "", leaveBy: "" }]);
  };
  const removeStop = (i: number) => {
    setWaypoints((w) => w.filter((_, idx) => idx !== i));
    setStopTimes((t) => t.filter((_, idx) => idx !== i));
  };
  const updateStop = (i: number, val: string) => {
    setWaypoints((w) => {
      const c = [...w];
      c[i] = val;
      return c;
    });
  };
  const updateStopTime = (i: number, f: "arriveBy" | "leaveBy", val: string) => {
    setStopTimes((t) => {
      const c = [...t];
      c[i] = { ...c[i], [f]: val };
      return c;
    });
  };
  function viewSavedTripHandler() {
    if (!savedJourneys.length) return alert("No saved trips.");
    const latest = savedJourneys[savedJourneys.length - 1];
    setItinerary([{ title: "Your Itinerary", description: latest.itinerary }]);
    setShowItinerary(true);
  }
  function editSavedTripHandler() {
    if (!savedJourneys.length) return alert("No saved trips.");
    const j = savedJourneys[savedJourneys.length - 1];
    setOrigin(j.start);
    setDestination(j.destination);
    setWaypoints(j.waypoints || []);
    setStopTimes(j.stopTimes || []);
    setTravelMode(j.travelMode);
    setFilterOption(j.filterOption);
    setTripDate(new Date(j.startTime).toISOString().split("T")[0]);
    setOriginTime(new Date(j.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }));
    setDestinationTime(new Date(j.endTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }));
    setItinerary([{ title: "Your Itinerary", description: j.itinerary }]);
    setShowModal(true);
  }
  function deleteTripHandler(id: string) {
    fetch(`/api/journeys/${id}`, {
      method: "DELETE",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to delete trip");
        setSavedJourneys((prev: any[]) => prev.filter((j) => j._id !== id));
        alert("Trip deleted.");
      })
      .catch((err) => alert("Error deleting trip."));
  }
  async function saveTripHandler() {
    const journey = {
      userId: "placeholder_user_id",
      start: origin,
      destination,
      waypoints,
      stopTimes,
      travelMode,
      filterOption,
      startTime: new Date(`${tripDate}T${originTime}:00`),
      endTime: new Date(`${tripDate}T${destinationTime}:00`),
      itinerary: itinerary.map((r) => `${r.title}: ${r.description}`).join("\n"),
    };
    try {
      const res = await fetch("/api/journeys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(journey),
      });
      if (res.ok) {
        const saved = await res.json();
        setSavedJourneys((j) => [...j, saved]);
        alert("Trip saved.");
      } else {
        alert("Error saving trip.");
      }
    } catch {
      alert("Error saving trip.");
    }
  }
  async function getDirectionsHandler(e: FormEvent, maps: typeof google.maps, setDirections: any, setDirectionsSegments: any, setExtraMarkers: any) {
    e.preventDefault();
    if (!origin || !destination) {
      return alert("Enter both origin and destination.");
    }
    const svc = new maps.DirectionsService();
    const stops = waypoints.filter((w) => w.trim());
    if (travelMode === "TRANSIT") {
      try {
        const departureDate = new Date(`${tripDate}T${originTime}:00`);
        const arrivalDate = new Date(`${tripDate}T${destinationTime}:00`);
        const { itinerary: raw, segmentInfos, directionsSegments } =
          await getTransitItinerary(
            [origin, ...stops, destination],
            svc,
            origin,
            departureDate,
            destination,
            arrivalDate,
            waypoints,
            stopTimes
          );
        const normalized = raw.map((r: any) => ({
          title: r.title,
          description: r.description ?? "",
        }));
        setItinerary(normalized);
        setSegmentInfos(segmentInfos);
        setDirectionsSegments(directionsSegments);
        setShowItinerary(true);
        setShowModal(false);
      } catch (err) {
        console.error(err);
        alert("Transit error: " + err);
      }
    } else {
      svc.route(
        {
          origin,
          destination,
          travelMode,
          waypoints: stops.map((loc) => ({ location: loc })),
          ...(travelMode === "DRIVING" && {
            avoidTolls: filterOption === "NO_TOLL",
          }),
        },
        (res: any, stat: any) => {
          if (stat !== "OK" || !res) {
            console.error("Drive error:", stat);
            return alert("Drive error: " + stat);
          }
          setDirections(res);
          setDirectionsSegments([]);
          setExtraMarkers([]);
          const leg = res.routes[0].legs[0];
          const items = [
            {
              title: origin,
              description: `Leave by ${originTime || "N/A"}. Depart at ${
                leg.departure_time?.text || "N/A"
              }.`,
            },
            ...waypoints.map((wp, i) => ({
              title: wp,
              description: `Arrive by ${
                stopTimes[i].arriveBy || "N/A"
              }, leave by ${stopTimes[i].leaveBy || "N/A"}.`,
            })),
            {
              title: destination,
              description: `Arrive by ${destinationTime || "N/A"}. Arrives at ${
                leg.arrival_time?.text || "N/A"
              }.`,
            },
          ];
          setItinerary(items);
          setShowItinerary(true);
        }
      );
    }
  }

  return (
    <TripContext.Provider
      value={{
        tripDate,
        setTripDate,
        origin,
        setOrigin,
        destination,
        setDestination,
        waypoints,
        setWaypoints,
        originTime,
        setOriginTime,
        destinationTime,
        setDestinationTime,
        stopTimes,
        setStopTimes,
        filterOption,
        setFilterOption,
        travelMode,
        setTravelMode,
        showModal,
        setShowModal,
        showItinerary,
        setShowItinerary,
        itinerary,
        setItinerary,
        segmentInfos,
        setSegmentInfos,
        savedJourneys,
        setSavedJourneys,
        showTrips,
        setShowTrips,
        addStop,
        removeStop,
        updateStop,
        updateStopTime,
        viewSavedTripHandler,
        editSavedTripHandler,
        deleteTripHandler,
        saveTripHandler,
        getDirectionsHandler,
      }}
    >
      {children}
    </TripContext.Provider>
  );
}
