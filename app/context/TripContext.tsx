"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, FormEvent } from "react";
import { getTransitItinerary } from "../utils/transitUtils";

interface StopTimes {
  arriveBy: string;
  leaveBy: string;
}

interface TripContextType {
  editingJourneyId: string | null;
  setEditingJourneyId: (val: string | null) => void;
  postSaveRedirectToTrips: boolean;
  setPostSaveRedirectToTrips: (v: boolean) => void;
  showRefreshmentModal: boolean;
  setShowRefreshmentModal: (v: boolean) => void;
  refreshmentItems: any[];
  setRefreshmentItems: (v: any[]) => void;
  refreshmentNote: string | null;
  setRefreshmentNote: (v: string | null) => void;
  refreshmentInsertIndex: number | null;
  setRefreshmentInsertIndex: (v: number | null) => void;
  pendingShowAmenities: boolean;
  setPendingShowAmenities: (v: boolean) => void;
  pendingNavigateHome: boolean;
  setPendingNavigateHome: (v: boolean) => void;
  isLoadingDirections: boolean;
  isLoadingAmenities: boolean;
  suggestRefreshments: () => Promise<void>;
  forceShowAmenities: () => Promise<void>;
  clearTripState: () => void;
  tripDate: string;
  setTripDate: (val: string) => void;
  origin: string;
  setOrigin: (val: string) => void;
  destination: string;
  setDestination: (val: string) => void;
  destinationName: string; // Display name for destination (if different from destination value)
  setDestinationName: (val: string) => void;
  waypoints: string[];
  setWaypoints: (val: string[]) => void;
  waypointNames: Record<number, string>; // Maps waypoint index to display name
  setWaypointNames: (val: Record<number, string>) => void;
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
  segmentsByLeg: number[]; // Array of segment counts per leg, e.g., [2, 1, 3] means leg1 has 2 segments, leg2 has 1, leg3 has 3
  setSegmentsByLeg: (val: number[]) => void;
  savedJourneys: any[];
  setSavedJourneys: (val: any[]) => void;
  showTrips: boolean;
  setShowTrips: (val: boolean) => void;
  directions: google.maps.DirectionsResult | null;
  setDirections: (val: google.maps.DirectionsResult | null) => void;
  directionsSegments: google.maps.DirectionsResult[];
  setDirectionsSegments: (val: google.maps.DirectionsResult[]) => void;
  extraMarkers: { position: google.maps.LatLngLiteral }[];
  setExtraMarkers: (val: { position: google.maps.LatLngLiteral }[]) => void;
  pendingPlace: any | null;
  setPendingPlace: (val: any | null) => void;
  pendingRecalc: boolean;
  setPendingRecalc: (val: boolean) => void;
  addStop: () => void;
  removeStop: (i: number) => void;
  updateStop: (i: number, val: string) => void;
  updateStopTime: (i: number, f: "arriveBy" | "leaveBy", val: string) => void;
  viewSavedTripHandler: () => void;
  editSavedTripHandler: () => void;
  deleteTripHandler: (id: string) => void;
  saveTripHandler: () => Promise<any>;
  updateTripHandler: () => Promise<void>;
  getDirectionsHandler: (e: FormEvent, maps: typeof google.maps, setDirections?: any, setDirectionsSegments?: any, setExtraMarkers?: any) => Promise<void>;
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
  const [destinationName, setDestinationName] = useState("");
  const [editingJourneyId, setEditingJourneyId] = useState<string | null>(null);
  const [waypoints, setWaypoints] = useState<string[]>([]);
  const [waypointNames, setWaypointNames] = useState<Record<number, string>>({});
  const [originTime, setOriginTime] = useState("");
  const [destinationTime, setDestinationTime] = useState("");
  const [stopTimes, setStopTimes] = useState<StopTimes[]>([]);
  const [filterOption, setFilterOption] = useState("BEST_ROUTE");
  const [travelMode, setTravelMode] = useState<google.maps.TravelMode>("DRIVING" as google.maps.TravelMode);
  const [showModal, setShowModal] = useState(false);
  const [showItinerary, setShowItinerary] = useState(false);
  const [showRefreshmentModal, setShowRefreshmentModal] = useState(false);
  const [refreshmentItems, setRefreshmentItems] = useState<any[]>([]);
  const [refreshmentNote, setRefreshmentNote] = useState<string | null>(null);
  const [refreshmentInsertIndex, setRefreshmentInsertIndex] = useState<number | null>(null);
  const [pendingShowAmenities, setPendingShowAmenities] = useState(false);
  const [pendingNavigateHome, setPendingNavigateHome] = useState(false);
  const [postSaveRedirectToTrips, setPostSaveRedirectToTrips] = useState(false);
  const [itinerary, setItinerary] = useState<{ title: string; description: string }[]>([]);
  const [segmentInfos, setSegmentInfos] = useState<any[]>([]);
  const [segmentsByLeg, setSegmentsByLeg] = useState<number[]>([]);
  const [savedJourneys, setSavedJourneys] = useState<any[]>([]);

  // temporary place being added from Explore -> Add-to-Trip flow
  const [pendingPlace, setPendingPlace] = useState<any | null>(null);
  // flag to trigger a directions recalculation after client-side updates
  const [pendingRecalc, setPendingRecalc] = useState(false);

  const [showTrips, setShowTrips] = useState(false);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [directionsSegments, setDirectionsSegments] = useState<google.maps.DirectionsResult[]>([]);
  const [extraMarkers, setExtraMarkers] = useState<{ position: google.maps.LatLngLiteral }[]>([]);
  const [isLoadingDirections, setIsLoadingDirections] = useState(false);
  const [isLoadingAmenities, setIsLoadingAmenities] = useState(false);

  // Clear stale directions/routing state when recalculating
  // Note: Does NOT clear waypointNames/destinationName - those are user-provided display names
  const clearTripState = () => {
    setDirections(null);
    setDirectionsSegments([]);
    setExtraMarkers([]);
    setItinerary([]);
    setSegmentInfos([]);
    setSegmentsByLeg([]);
    setRefreshmentItems([]);
    setRefreshmentNote(null);
    setRefreshmentInsertIndex(null);
    // Don't clear waypointNames/destinationName - preserve display names across recalculations
  };
  
  // Full reset for starting a completely new trip
  const fullReset = () => {
    clearTripState();
    setWaypointNames({});
    setDestinationName("");
    setWaypoints([]);
    setStopTimes([]);
    setDestination("");
    setEditingJourneyId(null);
  };

  const REFRESHMENT_THRESHOLD_SECS = 2 * 60 * 60; // 2 hours
  const hasRefreshmentKeyword = (s: string) => {
    const q = (s || "").toLowerCase();
    return ["restaurant","cafe","hotel","resort","restroom","toilet","washroom","park","store","supermarket"].some(k => q.includes(k));
  };
  async function suggestRefreshmentsWith(options?: {
    transitSegments?: google.maps.DirectionsResult[];
    driving?: google.maps.DirectionsResult | null;
  }) {
    try {
      setShowRefreshmentModal(false);
      setRefreshmentItems([]);
      setRefreshmentNote(null);
      setRefreshmentInsertIndex(null);
      const stops = waypoints.filter((w) => (w || "").trim());
      let longLegLabel = "";
      const segs = options?.transitSegments && options.transitSegments.length ? options.transitSegments : directionsSegments;
      if (travelMode === "TRANSIT" && segs.length > 0) {
        for (let i = 0; i < segs.length; i++) {
          const seg = segs[i];
          const leg = seg.routes?.[0]?.legs?.[0];
          if (!leg) continue;
          const dur = leg.duration?.value || 0;
          const a = [origin, ...stops, destination][i];
          const b = [origin, ...stops, destination][i+1];
          const hasRefresh = [a, b].some(x => x && hasRefreshmentKeyword(x));
          if (dur > REFRESHMENT_THRESHOLD_SECS && !hasRefresh) {
            longLegLabel = `${a} → ${b}`;
            setRefreshmentInsertIndex(i);
            const q = `restaurants near ${b}`;
            const endLat = leg.end_location.lat();
            const endLng = leg.end_location.lng();
            const [gData, oData, goaData] = await Promise.all([
              fetch(`/api/explore?q=${encodeURIComponent(q)}`).then(r => r.json()).catch(() => ({ results: [] })),
              fetch(`/api/amenities?lat=${encodeURIComponent(endLat)}&lng=${encodeURIComponent(endLng)}&radius=3000`).then(r => r.json()).catch(() => ({ results: [] })),
              fetch(`/api/goa-amenities?lat=${encodeURIComponent(endLat)}&lng=${encodeURIComponent(endLng)}&radius=5000`).then(r => r.json()).catch(() => ({ results: [] })),
            ]);
            const merged = [...(goaData.results || []), ...(oData.results || []), ...(gData.results || [])];
            setRefreshmentItems(merged.slice(0, 12));
            setRefreshmentNote(`Long leg detected (${longLegLabel}). Consider a refreshment stop.`);
            setShowRefreshmentModal(true);
            break;
          }
        }
      } else {
        const drv = options?.driving || directions;
        if (!drv) return;
        const legs = drv.routes?.[0]?.legs || [];
        const nodes = [origin, ...stops, destination];
        for (let i = 0; i < legs.length; i++) {
          const leg = legs[i];
          const dur = leg.duration?.value || 0;
          const a = nodes[i];
          const b = nodes[i+1];
          const hasRefresh = [a, b].some(x => x && hasRefreshmentKeyword(x));
          if (dur > REFRESHMENT_THRESHOLD_SECS && !hasRefresh) {
            longLegLabel = `${a} → ${b}`;
            setRefreshmentInsertIndex(i);
            const q = `restaurants near ${b}`;
            const endLat = leg.end_location.lat();
            const endLng = leg.end_location.lng();
            const [gData, oData, goaData] = await Promise.all([
              fetch(`/api/explore?q=${encodeURIComponent(q)}`).then(r => r.json()).catch(() => ({ results: [] })),
              fetch(`/api/amenities?lat=${encodeURIComponent(endLat)}&lng=${encodeURIComponent(endLng)}&radius=3000`).then(r => r.json()).catch(() => ({ results: [] })),
              fetch(`/api/goa-amenities?lat=${encodeURIComponent(endLat)}&lng=${encodeURIComponent(endLng)}&radius=5000`).then(r => r.json()).catch(() => ({ results: [] })),
            ]);
            const merged = [...(goaData.results || []), ...(oData.results || []), ...(gData.results || [])];
            setRefreshmentItems(merged.slice(0, 12));
            setRefreshmentNote(`Long leg detected (${longLegLabel}). Consider a refreshment stop.`);
            setShowRefreshmentModal(true);
            break;
          }
        }
      }
    } catch {
      // ignore
    }
  }
  const suggestRefreshments = async () => suggestRefreshmentsWith();

  async function forceShowAmenities() {
    try {
      // Do not toggle modal off to avoid render loops; just overwrite contents and show
      setIsLoadingAmenities(true);
      setRefreshmentItems([]);
      setRefreshmentNote(null);
      setShowRefreshmentModal(true); // Show modal early with loading state
      const stops = waypoints.filter((w) => (w || "").trim());
      let insertIdx = 0;
      
      // Search radius: 2km near each stop/destination
      const SEARCH_RADIUS_M = 2000;
      
      // Collect search points: only destination + waypoints (not entire route)
      const searchPoints: { lat: number; lng: number; label: string }[] = [];
      
      // Default fallback point (central Goa)
      const fallbackPoint = { lat: 15.4989, lng: 73.8278, label: "Goa" };
      
      if (travelMode === "TRANSIT" && directionsSegments.length > 0) {
        // For transit: get coordinates of destination and each waypoint
        const numLegs = stops.length + 1; // origin→stop1, stop1→stop2, ..., lastStop→destination
        let segmentIndex = 0;
        
        // Get waypoint locations from segment endpoints
        for (let legIdx = 0; legIdx < numLegs; legIdx++) {
          const segCount = segmentsByLeg[legIdx] || 1;
          const lastSegOfLeg = directionsSegments[segmentIndex + segCount - 1];
          segmentIndex += segCount;
          
          if (lastSegOfLeg) {
            const leg = lastSegOfLeg.routes?.[0]?.legs?.[0];
            if (leg) {
              const isDestination = legIdx === numLegs - 1;
              const label = isDestination ? destination : stops[legIdx] || `Stop ${legIdx + 1}`;
              searchPoints.push({
                lat: leg.end_location.lat(),
                lng: leg.end_location.lng(),
                label,
              });
            }
          }
        }
      } else if (directions) {
        // For driving/walking: get coordinates of destination and each waypoint
        const legs = directions.routes?.[0]?.legs || [];
        legs.forEach((leg, idx) => {
          const isDestination = idx === legs.length - 1;
          const label = isDestination ? destination : stops[idx] || `Stop ${idx + 1}`;
          searchPoints.push({
            lat: leg.end_location.lat(),
            lng: leg.end_location.lng(),
            label,
          });
        });
      }
      
      // If no points found, use fallback
      if (searchPoints.length === 0) {
        searchPoints.push(fallbackPoint);
      }
      
      console.log(`[forceShowAmenities] Searching within ${SEARCH_RADIUS_M}m of ${searchPoints.length} stops:`, 
        searchPoints.map(p => p.label));
      
      setRefreshmentInsertIndex(insertIdx);
      
      // Search amenities within 2km of each stop/destination
      const allPromises: Promise<{ results: any[]; label: string }>[] = [];
      
      searchPoints.forEach(pt => {
        // Amenities API (includes Overpass + Google)
        allPromises.push(
          fetch(`/api/amenities?lat=${pt.lat}&lng=${pt.lng}&radius=${SEARCH_RADIUS_M}`)
            .then(r => r.json())
            .then(data => ({ results: data.results || [], label: pt.label }))
            .catch(() => ({ results: [], label: pt.label }))
        );
        // Local Goa amenities
        allPromises.push(
          fetch(`/api/goa-amenities?lat=${pt.lat}&lng=${pt.lng}&radius=${SEARCH_RADIUS_M}`)
            .then(r => r.json())
            .then(data => ({ results: data.results || [], label: pt.label }))
            .catch(() => ({ results: [], label: pt.label }))
        );
      });
      
      const responses = await Promise.all(allPromises);
      
      // Merge all results, tagging each with which stop it's near
      const merged: any[] = [];
      responses.forEach(res => {
        if (res?.results) {
          res.results.forEach((item: any) => {
            merged.push({ ...item, nearStop: res.label });
          });
        }
      });
      
      // Deduplicate by name (case-insensitive) and coordinates
      const seen = new Set<string>();
      const deduped = merged.filter((item: any) => {
        const nameKey = (item.name || "").toLowerCase().trim();
        const coordKey = item.location?.lat && item.location?.lng 
          ? `${item.location.lat.toFixed(4)},${item.location.lng.toFixed(4)}` 
          : "";
        const key = `${nameKey}|${coordKey}`;
        if (seen.has(key) || seen.has(nameKey)) return false;
        seen.add(key);
        if (nameKey) seen.add(nameKey);
        return true;
      });
      
      // Sort by: toilets first, then distance
      const prioritized = deduped.sort((a: any, b: any) => {
        // Toilets get highest priority
        const aIsToilet = (a.category === "toilet" || a.type === "toilets" || 
          (a.tags || []).some((t: string) => t.toLowerCase().includes("toilet")));
        const bIsToilet = (b.category === "toilet" || b.type === "toilets" || 
          (b.tags || []).some((t: string) => t.toLowerCase().includes("toilet")));
        if (aIsToilet && !bIsToilet) return -1;
        if (!aIsToilet && bIsToilet) return 1;
        // Then sort by distance if available
        return (a.distance || 0) - (b.distance || 0);
      });
      
      // Build note showing which stops we searched
      const stopNames = searchPoints.map(p => p.label).join(", ");
      // Show more results (25) to ensure restaurants aren't cut off after toilets
      const finalItems = prioritized.slice(0, 25);
      console.log('[forceShowAmenities] Setting refreshmentItems:', finalItems.length);
      console.log('[forceShowAmenities] Categories:', [...new Set(finalItems.map((p: any) => p.category || p.type))]);
      console.log('[forceShowAmenities] Sources:', [...new Set(finalItems.map((p: any) => p.source))]);
      console.log('[forceShowAmenities] Sample item details:', finalItems[0]?.details);
      setRefreshmentItems(finalItems);
      setRefreshmentNote(`Pit stops within 2km of: ${stopNames}`);
      setIsLoadingAmenities(false);
    } catch (e) {
      console.error("[forceShowAmenities] Error:", e);
      setIsLoadingAmenities(false);
    }
  }

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
    // Also update waypointNames: remove the name at index i and shift higher indices down
    setWaypointNames((prevNames) => {
      const newNames: Record<number, string> = {};
      Object.entries(prevNames).forEach(([key, val]) => {
        const k = parseInt(key, 10);
        if (k < i) {
          newNames[k] = val; // Keep as-is
        } else if (k > i) {
          newNames[k - 1] = val; // Shift down by 1
        }
        // Skip k === i (the removed stop)
      });
      return newNames;
    });
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
    setEditingJourneyId(j._id?.toString?.() || j._id);
    setOrigin(j.start);
    setDestination(j.destination);
    setDestinationName(j.destinationName || "");
    setWaypoints(j.waypoints || []);
    setWaypointNames(j.waypointNames || {});
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
    console.log('[saveTripHandler] waypointNames:', JSON.stringify(waypointNames));
    console.log('[saveTripHandler] destinationName:', destinationName);
    console.log('[saveTripHandler] waypoints:', JSON.stringify(waypoints));
    const journey = {
      userId: "placeholder_user_id",
      start: origin,
      destination,
      destinationName,
      waypoints,
      waypointNames,
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
        // set editing id so subsequent Save updates the same journey
        if (saved && saved._id) {
          setEditingJourneyId(saved._id as string);
        }
        alert("Trip saved.");
        return saved;
      } else {
        alert("Error saving trip.");
      }
    } catch {
      alert("Error saving trip.");
    }
    return null;
  }
  async function updateTripHandler() {
    if (!editingJourneyId) {
      alert("No trip selected for editing.");
      return;
    }
    const payload = {
      start: origin,
      destination,
      destinationName,
      waypoints,
      waypointNames,
      stopTimes,
      travelMode,
      filterOption,
      startTime: new Date(`${tripDate}T${originTime}:00`),
      endTime: new Date(`${tripDate}T${destinationTime}:00`),
      itinerary: itinerary.map((r) => `${r.title}: ${r.description}`).join("\n"),
    };
    try {
      const res = await fetch(`/api/journeys/${editingJourneyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to update trip");
      }
      const updated = await res.json();
      setSavedJourneys((prev: any[]) =>
        prev.map((j) => (j._id === updated._id ? updated : j))
      );
      alert("Trip updated.");
      setEditingJourneyId(null);
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Error updating trip.");
    }
  }
  async function getDirectionsHandler(
    e: FormEvent,
    maps: typeof google.maps,
    setDirectionsOverride?: any,
    setDirectionsSegmentsOverride?: any,
    setExtraMarkersOverride?: any
  ) {
    e.preventDefault();
    // Only clear editingJourneyId if we're starting a FRESH new trip (no existing edit in progress)
    // If editingJourneyId is already set, we're editing an existing trip - don't clear it!
    // This was causing issues where the modal title would switch from "Edit Trip" to "Plan Trip"
    // and saved edits (like deleted stops) wouldn't persist because update would fail.
    
    if (!origin || !destination) {
      return alert("Enter both origin and destination.");
    }
    
    // Clear stale data and show loading state
    setIsLoadingDirections(true);
    clearTripState();
    
    const svc = new maps.DirectionsService();
    const stops = waypoints.filter((w) => w.trim());
    if (travelMode === "TRANSIT") {
      try {
        // Parse departure time - use current time if not specified or if saved time is in the past
        let departureDate: Date;
        const now = new Date();
        if (originTime && tripDate) {
          const parsedDate = new Date(`${tripDate}T${originTime}:00`);
          // If the saved departure time is in the past, use current time instead
          // (Transit API often fails for past times)
          if (parsedDate > now) {
            departureDate = parsedDate;
          } else {
            departureDate = now;
            console.log("[TRANSIT] Saved departure time is in the past, using current time instead");
          }
        } else {
          departureDate = now;
        }
        console.log("[TRANSIT] Starting route search, departure:", departureDate.toISOString());
        
        const transitPreference =
          filterOption === "FEWER_TRANSFERS"
            ? google.maps.TransitRoutePreference.FEWER_TRANSFERS
            : google.maps.TransitRoutePreference.LESS_WALKING;

        // Goa transit hubs with coordinates for smart selection
        const ALL_HUBS = [
          // South Goa hubs (prioritize for South Goa destinations)
          { name: "Margao Kadamba Bus Stand, Goa", lat: 15.2832, lng: 73.9610, region: "south" },
          { name: "Vasco da Gama Bus Stand, Goa", lat: 15.3954, lng: 73.8145, region: "south" },
          { name: "Colva Circle, Goa", lat: 15.2789, lng: 73.9200, region: "south" },
          { name: "Majorda Bus Stop, Goa", lat: 15.3010, lng: 73.9068, region: "south" },
          { name: "Cortalim Bus Stand, Goa", lat: 15.4050, lng: 73.9050, region: "south" },
          // Central Goa hubs
          { name: "Panaji Kadamba Bus Stand, Goa", lat: 15.4963, lng: 73.8187, region: "central" },
          { name: "Ponda Bus Stand, Goa", lat: 15.4033, lng: 73.9667, region: "central" },
          { name: "Old Goa Bus Stop, Goa", lat: 15.5008, lng: 73.9116, region: "central" },
          // North Goa hubs
          { name: "Mapusa Bus Stand, Goa", lat: 15.5937, lng: 73.8102, region: "north" },
        ];
        
        // Helper: Haversine distance in km
        const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
          const R = 6371; // Earth's radius in km
          const dLat = (lat2 - lat1) * Math.PI / 180;
          const dLng = (lng2 - lng1) * Math.PI / 180;
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
          return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        };
        
        // Helper: Get location coordinates from a place name (rough geocoding for Goa)
        const getApproxCoords = (placeName: string): { lat: number, lng: number } | null => {
          const lower = placeName.toLowerCase();
          // Known Goa locations - comprehensive list for accurate detour detection
          const knownPlaces: Record<string, { lat: number, lng: number }> = {
            // South Goa
            "colva": { lat: 15.2789, lng: 73.9221 },
            "benaulim": { lat: 15.2642, lng: 73.9312 },
            "margao": { lat: 15.2832, lng: 73.9862 },
            "vasco": { lat: 15.3980, lng: 73.8113 },
            "palolem": { lat: 15.0100, lng: 74.0231 },
            "agonda": { lat: 15.0447, lng: 74.0072 },
            "majorda": { lat: 15.3010, lng: 73.9068 },
            "dabolim": { lat: 15.3808, lng: 73.8314 },
            "airport": { lat: 15.3808, lng: 73.8314 },
            "chikalim": { lat: 15.3878, lng: 73.8340 },
            
            // Central - BITS/Zuarinagar area
            "bits": { lat: 15.3909, lng: 73.8786 },
            "birla": { lat: 15.3909, lng: 73.8786 },
            "kk birla": { lat: 15.3909, lng: 73.8786 },
            "zuarinagar": { lat: 15.3909, lng: 73.8786 },
            "zuari": { lat: 15.3909, lng: 73.8786 },
            
            // Panaji - detailed landmarks for better routing
            "panjim": { lat: 15.4989, lng: 73.8278 },
            "panaji": { lat: 15.4989, lng: 73.8278 },
            "campal": { lat: 15.4935, lng: 73.8165 },  // Campal area (Taj Vivanta)
            "taj vivanta": { lat: 15.4935, lng: 73.8165 },
            "vivanta": { lat: 15.4935, lng: 73.8165 },
            "18th june": { lat: 15.4978, lng: 73.8262 },  // 18th June Road
            "miramar": { lat: 15.4750, lng: 73.8070 },
            "dona paula": { lat: 15.4580, lng: 73.8040 },
            "promenade": { lat: 15.5005, lng: 73.8285 },  // Panjim Promenade
            "panjim market": { lat: 15.4998, lng: 73.8268 },
            "panjim ferry": { lat: 15.5010, lng: 73.8295 },
            "divja": { lat: 15.4985, lng: 73.8245 },  // Divja Circle
            "library": { lat: 15.4950, lng: 73.8320 },  // Panjim Library area
            "central library": { lat: 15.4950, lng: 73.8320 },
            "sanskruti": { lat: 15.4950, lng: 73.8320 },
            "patto": { lat: 15.4942, lng: 73.8335 },  // Patto area
            "casanoni": { lat: 15.4970, lng: 73.8255 },  // Casanoni Trattoria (near Fontainhas)
            "trattoria": { lat: 15.4970, lng: 73.8255 },
            "fontainhas": { lat: 15.4965, lng: 73.8275 },  // Latin Quarter
            "altinho": { lat: 15.4920, lng: 73.8310 },
            "ktc": { lat: 15.4978, lng: 73.8285 },  // KTC Bus Stand
            "kadamba": { lat: 15.4978, lng: 73.8285 },
            
            // Old Goa (for detecting detours)
            "old goa": { lat: 15.5008, lng: 73.9116 },
            "velha goa": { lat: 15.5008, lng: 73.9116 },
            "gandhi circle": { lat: 15.5010, lng: 73.9110 },
            
            // Ponda area
            "ponda": { lat: 15.4033, lng: 73.9667 },
            
            // North Goa
            "mapusa": { lat: 15.5937, lng: 73.8102 },
            "calangute": { lat: 15.5438, lng: 73.7553 },
            "baga": { lat: 15.5551, lng: 73.7514 },
            "anjuna": { lat: 15.5739, lng: 73.7413 },
            "vagator": { lat: 15.5969, lng: 73.7394 },
            "candolim": { lat: 15.5180, lng: 73.7620 },
            "sinquerim": { lat: 15.4970, lng: 73.7730 },
            "reis magos": { lat: 15.4980, lng: 73.7890 },
          };
          for (const [key, coords] of Object.entries(knownPlaces)) {
            if (lower.includes(key)) return coords;
          }
          return null;
        };
        
        // Sort hubs by total distance (origin→hub + hub→destination)
        // This ensures we pick geographically sensible hubs
        const originCoords = getApproxCoords(origin);
        const destCoords = getApproxCoords(destination);
        
        let HUBS: string[];
        if (originCoords && destCoords) {
          // Sort hubs by how well they lie between origin and destination
          const sortedHubs = ALL_HUBS.map(hub => {
            const toOrigin = haversineDistance(originCoords.lat, originCoords.lng, hub.lat, hub.lng);
            const toDest = haversineDistance(hub.lat, hub.lng, destCoords.lat, destCoords.lng);
            const directDist = haversineDistance(originCoords.lat, originCoords.lng, destCoords.lat, destCoords.lng);
            // Prefer hubs where origin→hub→dest is not much longer than direct
            const detour = (toOrigin + toDest) - directDist;
            return { ...hub, detour };
          }).sort((a, b) => a.detour - b.detour);
          
          HUBS = sortedHubs.map(h => h.name);
          console.log(`[TRANSIT] Sorted hubs for ${origin} → ${destination}:`, HUBS.slice(0, 3));
        } else {
          // Fallback: use default order
          HUBS = ALL_HUBS.map(h => h.name);
        }
        
        const MAX_WALK_DISTANCE_M = 6500; // 6.5km max walking - allows Majorda (5119m) and Colva Circle (6420m) to Colva Beach
        
        // Helper: make a directions request with timeout
        const routeRequest = (req: google.maps.DirectionsRequest): Promise<google.maps.DirectionsResult | null> =>
          new Promise((resolve) => {
            const timer = setTimeout(() => resolve(null), 10000);
            svc.route(req, (res, status) => {
              clearTimeout(timer);
              if (status === google.maps.DirectionsStatus.OK && res) {
                resolve(res);
              } else {
                console.log(`[routeRequest] status: ${status}`);
                resolve(null);
              }
            });
          });
        
        // Helper: check if a result has transit legs
        const hasTransitLeg = (r: google.maps.DirectionsResult | null): boolean => {
          if (!r) return false;
          const steps = r.routes?.[0]?.legs?.[0]?.steps || [];
          return steps.some((st: any) => 
            st.travel_mode === google.maps.TravelMode.TRANSIT || 
            st.travel_mode === "TRANSIT"
          );
        };
        
        // Helper: get walking distance from a DirectionsResult
        const getWalkDistance = (r: google.maps.DirectionsResult | null): number => {
          if (!r) return Infinity;
          return r.routes?.[0]?.legs?.[0]?.distance?.value || Infinity;
        };
        
        // Helper: get duration from a DirectionsResult
        const getDuration = (r: google.maps.DirectionsResult | null): number => {
          if (!r) return 0;
          return r.routes?.[0]?.legs?.[0]?.duration?.value || 0;
        };

        // Helper: calculate total walking distance in a DirectionsResult
        const getTotalWalkingDistance = (r: google.maps.DirectionsResult | null): number => {
          if (!r) return 0;
          const leg = r.routes?.[0]?.legs?.[0];
          if (!leg) return 0;
          let walkDist = 0;
          (leg.steps || []).forEach((step: any) => {
            if (step.travel_mode === google.maps.TravelMode.WALKING || step.travel_mode === "WALKING") {
              walkDist += step.distance?.value || 0;
            }
          });
          return walkDist;
        };

        // Helper function to find route for a single segment (with fallback via hubs)
        // Prioritizes: 1) direct transit, 2) short duration, 3) less walking
        // Avoids backtracking routes through distant hubs
        const findSegmentRoute = async (
          segOrigin: string, 
          segDest: string, 
          segDeparture: Date
        ): Promise<{ segments: google.maps.DirectionsResult[], itineraryItems: { title: string; description: string }[], totalDuration: number, totalWalking: number }> => {
          
          type RouteOption = {
            segments: google.maps.DirectionsResult[];
            itineraryItems: { title: string; description: string }[];
            totalDuration: number;
            totalWalking: number;
            hasTransit: boolean;
            isDirect: boolean; // True if this is a direct route (no hub transfer)
            hubName?: string; // Name of hub used (for filtering)
          };
          
          const candidates: RouteOption[] = [];
          
          // Try direct transit first - this is the preferred option
          const directTransit = await routeRequest({
            origin: segOrigin,
            destination: segDest,
            travelMode: google.maps.TravelMode.TRANSIT,
            transitOptions: {
              routingPreference: transitPreference,
              departureTime: segDeparture,
            },
          });
        
          let directTransitDuration = Infinity;
          if (directTransit && hasTransitLeg(directTransit)) {
            const walkDist = getTotalWalkingDistance(directTransit);
            directTransitDuration = getDuration(directTransit);
            candidates.push({
              segments: [directTransit],
              itineraryItems: [],
              totalDuration: directTransitDuration,
              totalWalking: walkDist,
              hasTransit: true,
              isDirect: true,
            });
          }

          // Get walking route for reference and short-distance fallback
          const walkRoute = await routeRequest({
            origin: segOrigin,
            destination: segDest,
            travelMode: google.maps.TravelMode.WALKING,
          });
          
          const walkDist = walkRoute ? getWalkDistance(walkRoute) : Infinity;
          
          // Always add walking as a candidate (will be preferred for short distances < 1km)
          if (walkRoute) {
            candidates.push({
              segments: [walkRoute],
              itineraryItems: [],
              totalDuration: getDuration(walkRoute),
              totalWalking: walkDist,
              hasTransit: false,
              isDirect: true,
            });
          }

          // ===== GENERALIZED DETOUR DETECTION FOR ALL GOA ROUTES =====
          
          // Define geographic regions across Goa for smart detour detection
          type GeoRegion = { name: string; lat: number; lng: number; radius: number }; // radius in km
          const GOA_REGIONS: GeoRegion[] = [
            // Panaji / Central
            { name: "panaji", lat: 15.4970, lng: 73.8270, radius: 4 },
            // Old Goa
            { name: "old_goa", lat: 15.5008, lng: 73.9116, radius: 2 },
            // Margao / South Central
            { name: "margao", lat: 15.2832, lng: 73.9610, radius: 4 },
            // Vasco / Mormugao
            { name: "vasco", lat: 15.3980, lng: 73.8113, radius: 3 },
            // BITS / Zuarinagar
            { name: "zuari", lat: 15.3909, lng: 73.8786, radius: 2 },
            // Mapusa
            { name: "mapusa", lat: 15.5937, lng: 73.8102, radius: 3 },
            // Calangute-Baga beach belt
            { name: "calangute_baga", lat: 15.5490, lng: 73.7535, radius: 3 },
            // Anjuna-Vagator
            { name: "anjuna", lat: 15.5850, lng: 73.7400, radius: 3 },
            // Candolim-Sinquerim
            { name: "candolim", lat: 15.5100, lng: 73.7670, radius: 2 },
            // Ponda
            { name: "ponda", lat: 15.4033, lng: 73.9667, radius: 3 },
            // Colva-Benaulim beach belt
            { name: "colva", lat: 15.2715, lng: 73.9265, radius: 3 },
            // Palolem-Agonda (far south)
            { name: "palolem", lat: 15.0270, lng: 74.0150, radius: 4 },
          ];
          
          // Helper: Find which region a coordinate belongs to
          const findRegion = (coords: { lat: number; lng: number } | null): GeoRegion | null => {
            if (!coords) return null;
            for (const region of GOA_REGIONS) {
              const dist = haversineDistance(coords.lat, coords.lng, region.lat, region.lng);
              if (dist <= region.radius) return region;
            }
            return null;
          };
          
          // Helper: Check if a transit route goes through a specific location
          const routeGoesThrough = (result: google.maps.DirectionsResult, detourLocation: string): boolean => {
            const leg = result.routes?.[0]?.legs?.[0];
            if (!leg) return false;
            
            const detourLower = detourLocation.toLowerCase();
            for (const step of (leg.steps || [])) {
              // Check step instructions for detour location names
              const instructions = (step.instructions || "").toLowerCase();
              if (instructions.includes(detourLower)) return true;
              
              // For transit steps, check stop names
              if (step.transit) {
                const depStop = (step.transit.departure_stop?.name || "").toLowerCase();
                const arrStop = (step.transit.arrival_stop?.name || "").toLowerCase();
                if (depStop.includes(detourLower) || arrStop.includes(detourLower)) return true;
              }
            }
            return false;
          };
          
          // Helper: Calculate approximate transit route distance by checking stops
          const getTransitRouteDistance = (result: google.maps.DirectionsResult): number => {
            const leg = result.routes?.[0]?.legs?.[0];
            if (!leg) return 0;
            let totalDist = 0;
            for (const step of (leg.steps || [])) {
              totalDist += step.distance?.value || 0;
            }
            return totalDist / 1000; // Return in km
          };
          
          // Check if direct transit route goes through an undesirable detour
          const originCoords = getApproxCoords(segOrigin);
          const destCoords = getApproxCoords(segDest);
          const originRegion = findRegion(originCoords);
          const destRegion = findRegion(destCoords);
          
          // Calculate direct distance between origin and destination
          const directDistKm = originCoords && destCoords 
            ? haversineDistance(originCoords.lat, originCoords.lng, destCoords.lat, destCoords.lng)
            : Infinity;
          
          // Determine if this is a "local" route (short distance or same region)
          const isLocalRoute = directDistKm < 5 || (originRegion && destRegion && originRegion.name === destRegion.name);
          const isShortRoute = directDistKm < 10;
          
          // Define major hub locations that shouldn't be detours for local routes
          const MAJOR_HUBS = ["mapusa", "margao", "panaji", "ponda", "old goa", "vasco"];
          
          // For local/short routes, check if the transit goes through far-away hubs
          if (directTransit && hasTransitLeg(directTransit)) {
            const transitDistKm = getTransitRouteDistance(directTransit);
            const detourRatio = transitDistKm / directDistKm;
            
            // If transit route is more than 2x the direct distance, it's likely a bad detour
            if (isLocalRoute && detourRatio > 2.0) {
              console.log(`[findSegmentRoute] Rejecting transit: route distance ${transitDistKm.toFixed(1)}km is ${detourRatio.toFixed(1)}x direct distance ${directDistKm.toFixed(1)}km`);
              const idx = candidates.findIndex(c => c.isDirect && c.hasTransit);
              if (idx >= 0) candidates.splice(idx, 1);
              directTransitDuration = Infinity;
            }
            // For short routes, also check if it goes through specific far hubs
            else if (isShortRoute) {
              // Determine which hubs would be detours based on origin/dest regions
              const potentialDetours: string[] = [];
              
              // If both in Panaji area, Old Goa/Mapusa/Ponda are detours
              if (originRegion?.name === "panaji" && destRegion?.name === "panaji") {
                potentialDetours.push("old goa", "gandhi circle", "mapusa", "ponda", "margao");
              }
              // If both in Margao area, Panaji/Mapusa are detours
              else if (originRegion?.name === "margao" && destRegion?.name === "margao") {
                potentialDetours.push("panaji", "mapusa", "old goa", "ponda");
              }
              // If both in Calangute-Baga area, Margao/Ponda/Old Goa are detours
              else if (originRegion?.name === "calangute_baga" && destRegion?.name === "calangute_baga") {
                potentialDetours.push("margao", "ponda", "old goa", "vasco");
              }
              // If both in Vasco area, Mapusa/Ponda/Old Goa are detours
              else if (originRegion?.name === "vasco" && destRegion?.name === "vasco") {
                potentialDetours.push("mapusa", "ponda", "old goa", "panaji");
              }
              // If both in Colva beach area, Panaji/Mapusa are detours
              else if (originRegion?.name === "colva" && destRegion?.name === "colva") {
                potentialDetours.push("panaji", "mapusa", "old goa", "ponda");
              }
              // Generic: for any local route, major hubs far from both origin and dest are detours
              else if (isLocalRoute && originCoords && destCoords) {
                for (const hub of MAJOR_HUBS) {
                  const hubCoords = getApproxCoords(hub);
                  if (hubCoords) {
                    const distFromOrigin = haversineDistance(originCoords.lat, originCoords.lng, hubCoords.lat, hubCoords.lng);
                    const distFromDest = haversineDistance(destCoords.lat, destCoords.lng, hubCoords.lat, hubCoords.lng);
                    // If hub is more than 2x the direct distance from both origin and dest, it's a detour
                    if (distFromOrigin > directDistKm * 2 && distFromDest > directDistKm * 2) {
                      potentialDetours.push(hub);
                    }
                  }
                }
              }
              
              // Check if route goes through any potential detours
              for (const detour of potentialDetours) {
                if (routeGoesThrough(directTransit, detour)) {
                  console.log(`[findSegmentRoute] Rejecting transit for ${originRegion?.name || 'unknown'} to ${destRegion?.name || 'unknown'}: goes through ${detour}`);
                  const idx = candidates.findIndex(c => c.isDirect && c.hasTransit);
                  if (idx >= 0) candidates.splice(idx, 1);
                  directTransitDuration = Infinity;
                  break;
                }
              }
            }
          }

          // Only try hub-based routes if direct transit wasn't found or took very long
          const shouldTryHubs = !directTransit || !hasTransitLeg(directTransit) || directTransitDuration > 3600;
          
          if (shouldTryHubs) {
            // Filter hubs: only consider hubs that are roughly "on the way"
            // Use stricter filtering for local/short routes
            const viableHubs = HUBS.filter(hub => {
              if (!originCoords || !destCoords) return true; // Can't filter, try all
              
              const hubInfo = ALL_HUBS.find(h => h.name === hub);
              if (!hubInfo) return true;
              
              const viaHubDist = haversineDistance(originCoords.lat, originCoords.lng, hubInfo.lat, hubInfo.lng) +
                                 haversineDistance(hubInfo.lat, hubInfo.lng, destCoords.lat, destCoords.lng);
              
              // Stricter ratio for local routes, relaxed for longer journeys
              let maxDetourRatio: number;
              if (isLocalRoute) {
                maxDetourRatio = 1.2; // Very strict for local routes
              } else if (isShortRoute) {
                maxDetourRatio = 1.3; // Strict for short routes
              } else {
                maxDetourRatio = 1.5; // Standard for longer routes
              }
              
              const isOnTheWay = viaHubDist <= directDistKm * maxDetourRatio;
              
              if (!isOnTheWay) {
                console.log(`[findSegmentRoute] Skipping hub ${hub}: detour ratio ${(viaHubDist/directDistKm).toFixed(2)} > ${maxDetourRatio} (${isLocalRoute ? 'local' : isShortRoute ? 'short' : 'long'} route)`);
              }
              
              return isOnTheWay;
            });
            
            console.log(`[findSegmentRoute] Viable hubs for ${segOrigin} → ${segDest}: ${viableHubs.length}/${HUBS.length}`);

            // Try via viable hubs only
            for (const hub of viableHubs) {
              // OPTION 1: Transit from origin to hub, then TRANSIT to destination
              const originToHubTransit = await routeRequest({
                origin: segOrigin,
                destination: hub,
                travelMode: google.maps.TravelMode.TRANSIT,
                transitOptions: {
                  routingPreference: transitPreference,
                  departureTime: segDeparture,
                },
              });
          
              if (originToHubTransit && hasTransitLeg(originToHubTransit)) {
                const hubArrivalTime = new Date(segDeparture.getTime() + getDuration(originToHubTransit) * 1000);
              
                // Try transit from hub to destination
                const hubToDestTransit = await routeRequest({
                  origin: hub,
                  destination: segDest,
                  travelMode: google.maps.TravelMode.TRANSIT,
                  transitOptions: {
                    routingPreference: transitPreference,
                    departureTime: hubArrivalTime,
                  },
                });
              
                if (hubToDestTransit && hasTransitLeg(hubToDestTransit)) {
                  const totalWalk = getTotalWalkingDistance(originToHubTransit) + getTotalWalkingDistance(hubToDestTransit);
                  const totalDur = getDuration(originToHubTransit) + getDuration(hubToDestTransit);
                  
                  // Only add if this hub route is not significantly longer than direct
                  if (directTransitDuration === Infinity || totalDur <= directTransitDuration * 1.3) {
                    candidates.push({
                      segments: [originToHubTransit, hubToDestTransit],
                      itineraryItems: [{ title: hub, description: "Transfer" }],
                      totalDuration: totalDur,
                      totalWalking: totalWalk,
                      hasTransit: true,
                      isDirect: false,
                      hubName: hub,
                    });
                  }
                }
              
                // Try walking from hub to destination (only if short)
                const hubToDestWalk = await routeRequest({
                  origin: hub,
                  destination: segDest,
                  travelMode: google.maps.TravelMode.WALKING,
                });
              
                if (hubToDestWalk) {
                  const hubToDestWalkDist = getWalkDistance(hubToDestWalk);
                  if (hubToDestWalkDist <= MAX_WALK_DISTANCE_M) {
                    const totalWalk = getTotalWalkingDistance(originToHubTransit) + hubToDestWalkDist;
                    candidates.push({
                      segments: [originToHubTransit, hubToDestWalk],
                      itineraryItems: [{ title: hub, description: `Walk ${Math.round(hubToDestWalkDist)}m` }],
                      totalDuration: getDuration(originToHubTransit) + getDuration(hubToDestWalk),
                      totalWalking: totalWalk,
                      hasTransit: true,
                      isDirect: false,
                      hubName: hub,
                    });
                  }
                }
              }

              // OPTION 2: Walk from origin to hub (only if within threshold), then transit to destination
              const walkToHub = await routeRequest({
                origin: segOrigin,
                destination: hub,
                travelMode: google.maps.TravelMode.WALKING,
              });
          
              if (walkToHub) {
                const walkToHubDist = getWalkDistance(walkToHub);
                if (walkToHubDist <= MAX_WALK_DISTANCE_M) {
                  const walkDuration = getDuration(walkToHub);
                  const transitTime = new Date(segDeparture.getTime() + walkDuration * 1000);
                
                  const hubToDest = await routeRequest({
                    origin: hub,
                    destination: segDest,
                    travelMode: google.maps.TravelMode.TRANSIT,
                    transitOptions: {
                      routingPreference: transitPreference,
                      departureTime: transitTime,
                    },
                  });
          
                  if (hubToDest && hasTransitLeg(hubToDest)) {
                    const totalWalk = walkToHubDist + getTotalWalkingDistance(hubToDest);
                    candidates.push({
                      segments: [walkToHub, hubToDest],
                      itineraryItems: [{ title: hub, description: `Walk ${Math.round(walkToHubDist)}m to hub` }],
                      totalDuration: walkDuration + getDuration(hubToDest),
                      totalWalking: totalWalk,
                      hasTransit: true,
                      isDirect: false,
                      hubName: hub,
                    });
                  }
                }
              }
            }
          }
          
          // Pick the best route using improved sorting
          if (candidates.length > 0) {
            // First, check if there's a short direct walk option (< 1km)
            const shortWalk = candidates.find(c => !c.hasTransit && c.totalWalking < 1000);
            if (shortWalk) {
              console.log(`[findSegmentRoute] Using short direct walk: ${shortWalk.totalWalking}m`);
              return shortWalk;
            }
            
            // Sort by: 
            // 1) Has transit (prefer transit over pure walking)
            // 2) Direct routes (prefer direct over hub-based)
            // 3) Total duration (prefer faster routes)
            // 4) Total walking (prefer less walking)
            candidates.sort((a, b) => {
              // Prefer routes with transit
              if (a.hasTransit && !b.hasTransit) return -1;
              if (!a.hasTransit && b.hasTransit) return 1;
              
              // Prefer direct routes over hub-based routes
              if (a.isDirect && !b.isDirect) return -1;
              if (!a.isDirect && b.isDirect) return 1;
              
              // Prefer shorter total duration (weight heavily)
              const durationDiff = a.totalDuration - b.totalDuration;
              if (Math.abs(durationDiff) > 300) { // If difference > 5 minutes, use duration
                return durationDiff;
              }
              
              // For similar durations, prefer less walking
              return a.totalWalking - b.totalWalking;
            });
            
            const best = candidates[0];
            console.log(`[findSegmentRoute] Best route: ${best.isDirect ? 'direct' : 'via hub'} ${best.hasTransit ? 'transit' : 'walk'}, duration: ${Math.round(best.totalDuration/60)}min, walking: ${best.totalWalking}m`);
            return best;
          }

          // Fallback to walking (for longer distances, suggest cab)
          if (walkRoute) {
            const walkDistFallback = getWalkDistance(walkRoute);
            return {
              segments: [walkRoute],
              itineraryItems: [{ title: "", description: `Walk ${Math.round(walkDistFallback)}m (no transit available)` }],
              totalDuration: getDuration(walkRoute),
              totalWalking: walkDistFallback,
            };
          }

          return { segments: [], itineraryItems: [], totalDuration: 0, totalWalking: 0 };
        };

        // Build list of all route points: origin, waypoints, destination
        const allPoints = [origin, ...stops, destination];
        const allSegments: google.maps.DirectionsResult[] = [];
        const segmentsPerLeg: number[] = []; // Track how many segments each leg has
        const allItineraryItems: { title: string; description: string }[] = [{ title: origin, description: "" }];
        let currentDeparture = departureDate;

        console.log(`[TRANSIT] Routing through ${allPoints.length} points: ${allPoints.join(" → ")}`);

        // Route each segment (leg = pair of consecutive points)
        for (let i = 0; i < allPoints.length - 1; i++) {
          const segOrigin = allPoints[i];
          const segDest = allPoints[i + 1];
          console.log(`[TRANSIT] Routing leg ${i + 1}: ${segOrigin} → ${segDest}`);
          
          const result = await findSegmentRoute(segOrigin, segDest, currentDeparture);
          
          // Track how many segments this leg produced
          segmentsPerLeg.push(result.segments.length);
          
          if (result.segments.length > 0) {
            allSegments.push(...result.segments);
            // Add intermediate itinerary items (like hub stops)
            result.itineraryItems.forEach(item => {
              if (item.title) {
                allItineraryItems.push(item);
              }
            });
            // Update departure time for next segment
            currentDeparture = new Date(currentDeparture.getTime() + result.totalDuration * 1000);
          }
          
          // Add the destination of this segment to itinerary
          if (i < allPoints.length - 2) {
            // This is a waypoint
            const wpIdx = i;
            const arrive = stopTimes?.[wpIdx]?.arriveBy || "";
            const leave = stopTimes?.[wpIdx]?.leaveBy || "";
            const parts: string[] = [];
            if (arrive) parts.push(`Arrive by ${arrive}`);
            if (leave) parts.push(`Leave by ${leave}`);
            allItineraryItems.push({ title: segDest, description: parts.join(" • ") });
          } else {
            // This is the final destination
            allItineraryItems.push({ title: destination, description: "" });
          }
        }

        // Set results
        if (allSegments.length > 0) {
          if (setDirectionsSegmentsOverride) setDirectionsSegmentsOverride(allSegments);
          else setDirectionsSegments(allSegments);
        } else {
          if (setDirectionsSegmentsOverride) setDirectionsSegmentsOverride([]);
          else setDirectionsSegments([]);
        }
        
        setSegmentsByLeg(segmentsPerLeg);
        setItinerary(allItineraryItems);
        setSegmentInfos([]);
        setIsLoadingDirections(false);
        setShowItinerary(true);
        setTimeout(() => setShowModal(false), 0);
        // Navigate to homepage if not already there (so itinerary is visible)
        if (typeof window !== "undefined" && window.location.pathname !== "/") {
          setPendingNavigateHome(true);
        }
        
      } catch (err) {
        console.error("[TRANSIT] Error:", err);
        // Render minimal itinerary on error
        if (setDirectionsSegmentsOverride) setDirectionsSegmentsOverride([]);
        else setDirectionsSegments([]);
        setItinerary([
          { title: origin, description: "" },
          { title: destination, description: "" },
        ]);
        setSegmentInfos([]);
        setIsLoadingDirections(false);
        setShowItinerary(true);
        setTimeout(() => setShowModal(false), 0);
        // Navigate to homepage if not already there
        if (typeof window !== "undefined" && window.location.pathname !== "/") {
          setPendingNavigateHome(true);
        }
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
            setIsLoadingDirections(false);
            return alert("Drive error: " + stat);
          }
          if (setDirectionsOverride) {
            setDirectionsOverride(res);
          } else {
            setDirections(res);
          }
          if (setDirectionsSegmentsOverride) {
            setDirectionsSegmentsOverride([]);
          } else {
            setDirectionsSegments([]);
          }
          if (setExtraMarkersOverride) {
            setExtraMarkersOverride([]);
          } else {
            setExtraMarkers([]);
          }
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
          setIsLoadingDirections(false);
          setShowItinerary(true);
          // Close the modal after showing itinerary
          setTimeout(() => setShowModal(false), 0);
          // Navigate to homepage if not already there
          if (typeof window !== "undefined" && window.location.pathname !== "/") {
            setPendingNavigateHome(true);
          }
        }
      );
    }
  }

  return (
    <TripContext.Provider
      value={{
        editingJourneyId,
        setEditingJourneyId,
        showRefreshmentModal,
        setShowRefreshmentModal,
        refreshmentItems,
        setRefreshmentItems,
        refreshmentNote,
        setRefreshmentNote,
        refreshmentInsertIndex,
        setRefreshmentInsertIndex,
        pendingShowAmenities,
        setPendingShowAmenities,
        pendingNavigateHome,
        setPendingNavigateHome,
        isLoadingDirections,
        isLoadingAmenities,
        suggestRefreshments: suggestRefreshments,
        forceShowAmenities,
        clearTripState,
        postSaveRedirectToTrips,
        setPostSaveRedirectToTrips,
  pendingPlace,
  setPendingPlace,
  pendingRecalc,
  setPendingRecalc,
        tripDate,
        setTripDate,
        origin,
        setOrigin,
        destination,
        setDestination,
        destinationName,
        setDestinationName,
        waypoints,
        setWaypoints,
        waypointNames,
        setWaypointNames,
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
        segmentsByLeg,
        setSegmentsByLeg,
        savedJourneys,
        setSavedJourneys,
        showTrips,
        setShowTrips,
        directions,
        setDirections,
        directionsSegments,
        setDirectionsSegments,
        extraMarkers,
        setExtraMarkers,
        addStop,
        removeStop,
        updateStop,
        updateStopTime,
        viewSavedTripHandler,
        editSavedTripHandler,
        deleteTripHandler,
        saveTripHandler,
        updateTripHandler,
        getDirectionsHandler,
      }}
    >
      {children}
    </TripContext.Provider>
  );
}
