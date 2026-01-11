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
  showNoChangesPrompt: boolean;
  setShowNoChangesPrompt: (v: boolean) => void;
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
  loadJourneyById: (journeyId: string) => boolean;
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
  const [showNoChangesPrompt, setShowNoChangesPrompt] = useState(false);
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
      
      // Search radius: 3km near each stop/destination
      const SEARCH_RADIUS_M = 3000;
      
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
              // Use extractLatLng helper to handle both LatLng objects and plain objects
              const endLoc = extractLatLng(leg.end_location);
              if (endLoc) {
                searchPoints.push({
                  lat: endLoc.lat,
                  lng: endLoc.lng,
                  label,
                });
              }
            }
          }
        }
      } else if (directions) {
        // For driving/walking: get coordinates of destination and each waypoint
        const legs = directions.routes?.[0]?.legs || [];
        legs.forEach((leg, idx) => {
          const isDestination = idx === legs.length - 1;
          const label = isDestination ? destination : stops[idx] || `Stop ${idx + 1}`;
          // Use extractLatLng helper to handle both LatLng objects and plain objects
          const endLoc = extractLatLng(leg.end_location);
          if (endLoc) {
            searchPoints.push({
              lat: endLoc.lat,
              lng: endLoc.lng,
              label,
            });
          }
        });
      }
      
      // If no points found, use fallback
      if (searchPoints.length === 0) {
        searchPoints.push(fallbackPoint);
      }
      
      console.log(`[forceShowAmenities] Searching within 3km of ${searchPoints.length} stops:`, 
        searchPoints.map(p => p.label));
      
      setRefreshmentInsertIndex(insertIdx);
      
      // Fetch amenities from both APIs for each search point
      const allPromises: Promise<{ results: any[]; label: string; source: string }>[] = [];
      
      searchPoints.forEach(pt => {
        // Amenities API (includes Overpass + Google)
        allPromises.push(
          fetch(`/api/amenities?lat=${pt.lat}&lng=${pt.lng}&radius=${SEARCH_RADIUS_M}`)
            .then(r => r.json())
            .then(data => {
              console.log(`[forceShowAmenities] /api/amenities for ${pt.label}: ${data.results?.length || 0} results`);
              return { results: data.results || [], label: pt.label, source: 'amenities' };
            })
            .catch((e) => {
              console.error(`[forceShowAmenities] /api/amenities error for ${pt.label}:`, e);
              return { results: [], label: pt.label, source: 'amenities' };
            })
        );
        // Local Goa amenities
        allPromises.push(
          fetch(`/api/goa-amenities?lat=${pt.lat}&lng=${pt.lng}&radius=${SEARCH_RADIUS_M}`)
            .then(r => r.json())
            .then(data => {
              console.log(`[forceShowAmenities] /api/goa-amenities for ${pt.label}: ${data.results?.length || 0} results`);
              return { results: data.results || [], label: pt.label, source: 'goa-amenities' };
            })
            .catch((e) => {
              console.error(`[forceShowAmenities] /api/goa-amenities error for ${pt.label}:`, e);
              return { results: [], label: pt.label, source: 'goa-amenities' };
            })
        );
      });
      
      const responses = await Promise.all(allPromises);
      
      // Log raw response counts
      let totalFromApi = 0;
      responses.forEach(res => {
        totalFromApi += res.results?.length || 0;
      });
      console.log(`[forceShowAmenities] Total raw items from all API calls: ${totalFromApi}`);
      
      // Merge all results, tagging each with which stop it's near
      const merged: any[] = [];
      responses.forEach(res => {
        if (res?.results && Array.isArray(res.results)) {
          res.results.forEach((item: any) => {
            merged.push({ ...item, nearStop: res.label });
          });
        }
      });
      
      console.log(`[forceShowAmenities] Total merged (before dedup): ${merged.length}`);
      
      // Deduplicate by name+coordinates (same name at same location = duplicate)
      // Don't dedupe by name alone - "Public Toilet" in Colva is different from "Public Toilet" in Panjim
      const seen = new Set<string>();
      const deduped = merged.filter((item: any) => {
        const nameKey = (item.name || "").toLowerCase().trim();
        const coordKey = item.location?.lat && item.location?.lng 
          ? `${item.location.lat.toFixed(4)},${item.location.lng.toFixed(4)}` // ~11m precision (4 decimals)
          : Math.random().toString(); // No coords = always unique
        const key = `${nameKey}|${coordKey}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      
      console.log(`[forceShowAmenities] After dedup: ${deduped.length} (removed ${merged.length - deduped.length} duplicates)`);
      
      // ============================================
      // SMART CURATION: Category quotas + distance priority
      // Goal: ~150-200 useful items, essentials first, closer preferred
      // ============================================
      
      // Helper: normalize category for grouping
      const getCategory = (item: any): string => {
        const t = (item.type || item.category || "").toLowerCase();
        // Essentials
        if (["toilets", "toilet", "restroom"].includes(t)) return "toilet";
        if (["drinking_water", "water_point"].includes(t)) return "water";
        // Rest & relax
        if (["bench", "shelter", "picnic_site", "picnic_table"].includes(t)) return "rest";
        if (["park", "garden", "playground", "recreation_ground"].includes(t)) return "park";
        if (["beach", "beach_access"].includes(t)) return "beach";
        // Quick food (local life)
        if (["kiosk", "convenience", "general", "variety_store", "supermarket", "grocery"].includes(t)) return "shop";
        if (["fast_food", "food_court", "bakery", "confectionery", "pastry"].includes(t)) return "quickfood";
        if (["ice_cream"].includes(t)) return "icecream";
        // Dining
        if (["restaurant", "food"].includes(t)) return "restaurant";
        if (["cafe", "coffee"].includes(t)) return "cafe";
        if (["bar", "pub", "biergarten"].includes(t)) return "bar";
        // Services
        if (["fuel", "atm", "pharmacy"].includes(t)) return "services";
        // Accommodation
        if (["hotel", "guest_house", "hostel", "motel", "resort", "lodging"].includes(t)) return "lodging";
        // Attractions
        if (["tourist_attraction", "attraction", "viewpoint", "artwork"].includes(t)) return "attraction";
        if (["temple", "church", "place_of_worship"].includes(t)) return "worship";
        return "other";
      };
      
      // Helper: score item for sorting (higher = better)
      const scoreItem = (item: any): number => {
        let score = 0;
        // Distance: closer is better (invert distance, cap at 3km)
        const dist = item.distance || 3000;
        score += Math.max(0, (3000 - dist) / 100); // 0-30 points based on distance
        
        // Source priority: local > OSM > Google
        if (item.source === "goa_local") score += 15;
        else if (item.source === "overpass") score += 10;
        else if (item.source === "google") score += 5;
        
        // Has useful info
        if (item.description && item.description.length > 10) score += 3;
        if (item.details?.openTime || item.details?.phone) score += 2;
        if (item.imageUrl) score += 5; // Photos are nice
        if (item.isVerified) score += 3;
        
        return score;
      };
      
      // Group by category
      const byCategory: Record<string, any[]> = {};
      deduped.forEach((item) => {
        const cat = getCategory(item);
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(item);
      });
      
      // Sort each category by score (best first)
      Object.keys(byCategory).forEach((cat) => {
        byCategory[cat].sort((a, b) => scoreItem(b) - scoreItem(a));
      });
      
      // Category quotas - essentials get more, prioritize local life
      const quotas: Record<string, number> = {
        toilet: 50,      // Show all toilets (usually not many)
        water: 30,       // Show all water points
        rest: 20,        // Benches, shelters
        park: 20,        // Parks, gardens
        beach: 15,       // Beach access
        shop: 25,        // Kirana shops, convenience stores (local life!)
        quickfood: 30,   // Fast food, bakeries (quick pit stops)
        icecream: 10,    // Ice cream spots
        restaurant: 40,  // Restaurants (plenty of options)
        cafe: 25,        // Cafes
        bar: 10,         // Bars
        services: 15,    // Fuel, ATM, pharmacy
        lodging: 15,     // Hotels/guesthouses
        attraction: 15,  // Tourist spots
        worship: 10,     // Temples, churches
        other: 15,       // Everything else
      };
      
      // Build final list with quotas, maintaining category order
      const categoryOrder = [
        "toilet", "water",           // Essentials first
        "rest", "park", "beach",     // Rest & relax
        "shop", "quickfood", "icecream", // Quick local stops
        "cafe", "restaurant", "bar", // Dining
        "services",                  // Services
        "attraction", "worship",     // Sightseeing
        "lodging", "other"           // Other
      ];
      
      const curated: any[] = [];
      const categoryStats: Record<string, { available: number; selected: number }> = {};
      
      categoryOrder.forEach((cat) => {
        const items = byCategory[cat] || [];
        const quota = quotas[cat] || 10;
        const selected = items.slice(0, quota);
        curated.push(...selected);
        categoryStats[cat] = { available: items.length, selected: selected.length };
      });
      
      // Add any remaining categories not in our list
      Object.keys(byCategory).forEach((cat) => {
        if (!categoryOrder.includes(cat)) {
          const items = byCategory[cat] || [];
          const selected = items.slice(0, 10);
          curated.push(...selected);
          categoryStats[cat] = { available: items.length, selected: selected.length };
        }
      });
      
      // Final sort by distance within the curated list (closest first overall)
      curated.sort((a, b) => (a.distance || 0) - (b.distance || 0));
      
      // Build note showing which stops we searched
      const stopNames = searchPoints.map(p => p.label).join(", ");
      
      // Log detailed breakdown
      const finalTypeBreakdown: Record<string, number> = {};
      const finalSourceBreakdown: Record<string, number> = {};
      curated.forEach((item: any) => {
        const cat = getCategory(item);
        finalTypeBreakdown[cat] = (finalTypeBreakdown[cat] || 0) + 1;
        finalSourceBreakdown[item.source || "unknown"] = (finalSourceBreakdown[item.source || "unknown"] || 0) + 1;
      });
      
      console.log('[forceShowAmenities] Category quotas applied:');
      Object.entries(categoryStats).forEach(([cat, stats]) => {
        if (stats.available > 0) {
          console.log(`  ${cat}: ${stats.selected}/${stats.available} (quota: ${quotas[cat] || 10})`);
        }
      });
      console.log('[forceShowAmenities] Final curated count:', curated.length);
      console.log('[forceShowAmenities] By category:', finalTypeBreakdown);
      console.log('[forceShowAmenities] By source:', finalSourceBreakdown);
      
      const finalItems = curated;
      console.log('[forceShowAmenities] Setting refreshmentItems:', finalItems.length);
      console.log('[forceShowAmenities] First 5 items:', finalItems.slice(0, 5).map((i: any) => ({ 
        name: i.name, cat: getCategory(i), dist: Math.round(i.distance || 0), source: i.source 
      })));
      setRefreshmentItems(finalItems);
      const essentials = (finalTypeBreakdown.toilet || 0) + (finalTypeBreakdown.water || 0);
      const foodSpots = (finalTypeBreakdown.restaurant || 0) + (finalTypeBreakdown.cafe || 0) + (finalTypeBreakdown.quickfood || 0) + (finalTypeBreakdown.shop || 0);
      setRefreshmentNote(`${finalItems.length} pit stops near ${stopNames} • ${essentials} restrooms/water • ${foodSpots} food spots`);
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
    // Use cache-aware loading
    loadJourneyWithCache(latest);
    setShowItinerary(true);
  }
  
  // Load a specific journey by ID (used from Trips page, etc.)
  function loadJourneyById(journeyId: string) {
    const journey = savedJourneys.find((j: any) => (j._id?.toString?.() || j._id) === journeyId);
    if (!journey) {
      console.warn('[loadJourneyById] Journey not found:', journeyId);
      return false;
    }
    loadJourneyWithCache(journey);
    return true;
  }
  function editSavedTripHandler() {
    if (!savedJourneys.length) return alert("No saved trips.");
    const j = savedJourneys[savedJourneys.length - 1];
    loadJourneyWithCache(j);
    setShowModal(true);
  }
  
  // Load a journey and restore cached directions if available
  function loadJourneyWithCache(j: any) {
    console.log('[loadJourneyWithCache] Loading journey:', j._id, 'has cache:', !!j.cachedDirections || !!j.cachedDirectionsSegments);
    
    // Set basic journey data
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
    
    // Try to restore cached directions
    let cacheRestored = false;
    
    // For transit mode, restore segments
    if (j.cachedDirectionsSegments && j.travelMode === "TRANSIT") {
      try {
        const segments = JSON.parse(j.cachedDirectionsSegments);
        if (Array.isArray(segments) && segments.length > 0) {
          // Deserialize each segment
          const restoredSegments = segments.map((seg: string) => {
            const cached = typeof seg === 'string' ? seg : JSON.stringify(seg);
            return deserializeDirectionsResult(cached);
          }).filter((s: google.maps.DirectionsResult | null): s is google.maps.DirectionsResult => s !== null);
          
          if (restoredSegments.length > 0) {
            console.log('[loadJourneyWithCache] Restored', restoredSegments.length, 'transit segments from cache');
            setDirectionsSegments(restoredSegments);
            setDirections(null);
            cacheRestored = true;
          }
        }
      } catch (e) {
        console.error('[loadJourneyWithCache] Error restoring transit segments:', e);
      }
    }
    
    // For driving/walking, restore single directions result
    if (j.cachedDirections && j.travelMode !== "TRANSIT" && !cacheRestored) {
      const restored = deserializeDirectionsResult(j.cachedDirections);
      if (restored) {
        console.log('[loadJourneyWithCache] Restored driving directions from cache');
        setDirections(restored);
        setDirectionsSegments([]);
        cacheRestored = true;
      }
    }
    
    // Restore segments by leg
    if (j.cachedSegmentsByLeg && j.cachedSegmentsByLeg.length > 0) {
      setSegmentsByLeg(j.cachedSegmentsByLeg);
    }
    
    // Restore itinerary
    if (j.cachedItinerary) {
      try {
        const parsedItinerary = JSON.parse(j.cachedItinerary);
        if (Array.isArray(parsedItinerary) && parsedItinerary.length > 0) {
          console.log('[loadJourneyWithCache] Restored itinerary from cache:', parsedItinerary.length, 'items');
          setItinerary(parsedItinerary);
        } else {
          setItinerary([{ title: "Your Itinerary", description: j.itinerary || "" }]);
        }
      } catch {
        setItinerary([{ title: "Your Itinerary", description: j.itinerary || "" }]);
      }
    } else {
      setItinerary([{ title: "Your Itinerary", description: j.itinerary || "" }]);
    }
    
    // Show itinerary if cache was restored
    if (cacheRestored) {
      setShowItinerary(true);
      console.log('[loadJourneyWithCache] ✅ Route loaded from cache - no API calls needed!');
    }
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
  // Helper: Extract lat/lng from either LatLng object or plain {lat, lng} object
  const extractLatLng = (location: any): { lat: number; lng: number } | null => {
    if (!location) return null;
    // Check if it's a LatLng object with methods
    if (typeof location.lat === 'function') {
      return { lat: location.lat(), lng: location.lng() };
    }
    // Otherwise treat as plain object
    if (typeof location.lat === 'number' && typeof location.lng === 'number') {
      return { lat: location.lat, lng: location.lng };
    }
    return null;
  };

  // Helper: Serialize DirectionsResult for caching
  // We extract only the essential data needed to reconstruct the route display
  // Handles both fresh Google API results (LatLng objects) and deserialized cached data (plain objects)
  const serializeDirectionsResult = (result: google.maps.DirectionsResult | null): string | null => {
    if (!result) return null;
    try {
      // Extract the essential route data (routes, legs, steps, geometry)
      const serializable = {
        routes: result.routes.map(route => ({
          bounds: route.bounds ? {
            north: typeof route.bounds.getNorthEast === 'function' 
              ? route.bounds.getNorthEast().lat() 
              : (route.bounds as any).north,
            east: typeof route.bounds.getNorthEast === 'function'
              ? route.bounds.getNorthEast().lng()
              : (route.bounds as any).east,
            south: typeof route.bounds.getSouthWest === 'function'
              ? route.bounds.getSouthWest().lat()
              : (route.bounds as any).south,
            west: typeof route.bounds.getSouthWest === 'function'
              ? route.bounds.getSouthWest().lng()
              : (route.bounds as any).west,
          } : null,
          overview_polyline: route.overview_polyline,
          overview_path: route.overview_path?.map(p => extractLatLng(p)).filter(Boolean),
          legs: route.legs.map(leg => ({
            distance: leg.distance,
            duration: leg.duration,
            start_address: leg.start_address,
            end_address: leg.end_address,
            start_location: extractLatLng(leg.start_location),
            end_location: extractLatLng(leg.end_location),
            departure_time: leg.departure_time,
            arrival_time: leg.arrival_time,
            steps: leg.steps.map(step => ({
              distance: step.distance,
              duration: step.duration,
              instructions: step.instructions,
              travel_mode: step.travel_mode,
              start_location: extractLatLng(step.start_location),
              end_location: extractLatLng(step.end_location),
              path: step.path?.map(p => extractLatLng(p)).filter(Boolean),
              transit: step.transit ? {
                arrival_stop: step.transit.arrival_stop ? {
                  name: step.transit.arrival_stop.name,
                  location: extractLatLng(step.transit.arrival_stop.location),
                } : null,
                departure_stop: step.transit.departure_stop ? {
                  name: step.transit.departure_stop.name,
                  location: extractLatLng(step.transit.departure_stop.location),
                } : null,
                arrival_time: step.transit.arrival_time,
                departure_time: step.transit.departure_time,
                headsign: step.transit.headsign,
                line: step.transit.line ? {
                  name: step.transit.line.name,
                  short_name: step.transit.line.short_name,
                  vehicle: step.transit.line.vehicle,
                } : null,
                num_stops: step.transit.num_stops,
              } : null,
            })),
          })),
        })),
        request: {
          origin: result.request?.origin,
          destination: result.request?.destination,
          travelMode: result.request?.travelMode,
        },
      };
      return JSON.stringify(serializable);
    } catch (e) {
      console.error('[serializeDirectionsResult] Error:', e);
      return null;
    }
  };

  // Helper: Deserialize cached directions back to a usable format
  // Note: This returns a plain object, not a full google.maps.DirectionsResult
  // The DirectionsRenderer can handle this for display
  const deserializeDirectionsResult = (cached: string | null): google.maps.DirectionsResult | null => {
    if (!cached) return null;
    try {
      const parsed = JSON.parse(cached);
      
      // Validate that routes is an array with at least one route
      if (!parsed.routes || !Array.isArray(parsed.routes) || parsed.routes.length === 0) {
        console.warn('[deserializeDirectionsResult] Invalid cached data - routes is not a valid array');
        return null;
      }
      
      // Validate first route has legs
      if (!parsed.routes[0]?.legs || !Array.isArray(parsed.routes[0].legs)) {
        console.warn('[deserializeDirectionsResult] Invalid cached data - no legs in route');
        return null;
      }
      
      // Reconstruct LatLng objects and bounds
      if (typeof google !== 'undefined') {
        parsed.routes = parsed.routes.map((route: any) => ({
          ...route,
          bounds: route.bounds ? new google.maps.LatLngBounds(
            new google.maps.LatLng(route.bounds.south, route.bounds.west),
            new google.maps.LatLng(route.bounds.north, route.bounds.east)
          ) : null,
          overview_path: route.overview_path?.map((p: any) => new google.maps.LatLng(p.lat, p.lng)),
          legs: route.legs.map((leg: any) => ({
            ...leg,
            start_location: leg.start_location ? new google.maps.LatLng(leg.start_location.lat, leg.start_location.lng) : null,
            end_location: leg.end_location ? new google.maps.LatLng(leg.end_location.lat, leg.end_location.lng) : null,
            steps: (leg.steps || []).map((step: any) => ({
              ...step,
              start_location: step.start_location ? new google.maps.LatLng(step.start_location.lat, step.start_location.lng) : null,
              end_location: step.end_location ? new google.maps.LatLng(step.end_location.lat, step.end_location.lng) : null,
              path: step.path?.map((p: any) => new google.maps.LatLng(p.lat, p.lng)),
            })),
          })),
        }));
      }
      return parsed as google.maps.DirectionsResult;
    } catch (e) {
      console.error('[deserializeDirectionsResult] Error:', e);
      return null;
    }
  };

  async function saveTripHandler() {
    console.log('[saveTripHandler] waypointNames:', JSON.stringify(waypointNames));
    console.log('[saveTripHandler] destinationName:', destinationName);
    console.log('[saveTripHandler] waypoints:', JSON.stringify(waypoints));
    
    // Serialize current directions for caching
    const cachedDirections = serializeDirectionsResult(directions);
    
    // For segments, only include successfully serialized ones (skip null results)
    let cachedDirectionsSegments: string | null = null;
    if (directionsSegments.length > 0) {
      const serializedSegments = directionsSegments
        .map(seg => serializeDirectionsResult(seg))
        .filter((s): s is string => s !== null);
      
      // Only cache if we have valid serialized segments
      if (serializedSegments.length > 0) {
        cachedDirectionsSegments = JSON.stringify(serializedSegments.map(s => JSON.parse(s)));
      }
    }
    
    const cachedItinerary = JSON.stringify(itinerary);
    
    console.log('[saveTripHandler] Caching directions:', !!cachedDirections, 'segments:', !!cachedDirectionsSegments);
    
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
      // Cache fields
      cachedDirections,
      cachedDirectionsSegments,
      cachedSegmentsByLeg: segmentsByLeg,
      cachedItinerary,
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
    
    // Serialize current directions for caching
    // serializeDirectionsResult returns null if data is already deserialized (cached trip with no new route)
    const cachedDirections = serializeDirectionsResult(directions);
    
    // For segments, only include successfully serialized ones
    let cachedDirectionsSegments: string | null = null;
    if (directionsSegments.length > 0) {
      const serializedSegments = directionsSegments
        .map(seg => serializeDirectionsResult(seg))
        .filter((s): s is string => s !== null);
      
      if (serializedSegments.length > 0) {
        cachedDirectionsSegments = JSON.stringify(serializedSegments.map(s => JSON.parse(s)));
      }
    }
    
    // Check if we're trying to update a cached trip with no fresh data
    // This happens when user views a cached trip and clicks save without recalculating
    const hasNoFreshData = !cachedDirections && !cachedDirectionsSegments && 
                           (directions !== null || directionsSegments.length > 0);
    
    if (hasNoFreshData) {
      console.log('[updateTripHandler] No fresh data to save - showing prompt');
      setShowNoChangesPrompt(true);
      return;
    }
    
    const cachedItinerary = JSON.stringify(itinerary);
    
    console.log('[updateTripHandler] Caching directions:', !!cachedDirections, 'segments:', !!cachedDirectionsSegments);
    
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
      // Cache fields - only include if we have fresh data
      cachedDirections,
      cachedDirectionsSegments,
      cachedSegmentsByLeg: segmentsByLeg,
      cachedItinerary,
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
        // Comprehensive list covering all regions for maximum bus coverage
        const ALL_HUBS = [
          // Far South Goa hubs (for Palolem, Agonda, Canacona, Cavelossim)
          { name: "Canacona Bus Stand, Goa", lat: 15.0134, lng: 74.0512, region: "far_south" },
          { name: "Chaudi Bus Stand, Goa", lat: 15.0134, lng: 74.0512, region: "far_south" },
          { name: "Betul Junction, Goa", lat: 15.1350, lng: 73.9610, region: "far_south" },
          // South Goa hubs
          { name: "Margao Kadamba Bus Stand, Goa", lat: 15.2832, lng: 73.9610, region: "south" },
          { name: "Vasco da Gama Bus Stand, Goa", lat: 15.3954, lng: 73.8145, region: "south" },
          { name: "Colva Circle, Goa", lat: 15.2789, lng: 73.9200, region: "south" },
          { name: "Benaulim Church Junction, Goa", lat: 15.2642, lng: 73.9312, region: "south" },
          { name: "Cavelossim Junction, Goa", lat: 15.1750, lng: 73.9450, region: "south" },
          { name: "Mobor Junction, Goa", lat: 15.1550, lng: 73.9350, region: "south" },
          { name: "Majorda Bus Stop, Goa", lat: 15.3010, lng: 73.9068, region: "south" },
          { name: "Cortalim Bus Stand, Goa", lat: 15.4050, lng: 73.9050, region: "south" },
          { name: "Curchorem Bus Stand, Goa", lat: 15.2633, lng: 74.1083, region: "south" },
          // Central Goa hubs
          { name: "Panaji Kadamba Bus Stand, Goa", lat: 15.4963, lng: 73.8187, region: "central" },
          { name: "Ponda Bus Stand, Goa", lat: 15.4033, lng: 73.9667, region: "central" },
          { name: "Old Goa Bus Stop, Goa", lat: 15.5008, lng: 73.9116, region: "central" },
          // North Goa hubs
          { name: "Mapusa Bus Stand, Goa", lat: 15.5937, lng: 73.8102, region: "north" },
          { name: "Calangute Bus Stop, Goa", lat: 15.5438, lng: 73.7553, region: "north" },
          { name: "Candolim Junction, Goa", lat: 15.5180, lng: 73.7620, region: "north" },
          { name: "Pernem Bus Stand, Goa", lat: 15.7230, lng: 73.7950, region: "north" },
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
            // Far South Goa (Canacona taluka)
            "palolem": { lat: 15.0100, lng: 74.0231 },
            "agonda": { lat: 15.0447, lng: 74.0072 },
            "canacona": { lat: 15.0134, lng: 74.0512 },
            "chaudi": { lat: 15.0134, lng: 74.0512 },
            "patnem": { lat: 15.0050, lng: 74.0300 },
            "cola": { lat: 15.0320, lng: 74.0050 },
            
            // South Goa (Salcete/Quepem)
            "cavelossim": { lat: 15.1750, lng: 73.9450 },
            "mobor": { lat: 15.1550, lng: 73.9350 },
            "betul": { lat: 15.1350, lng: 73.9610 },
            "varca": { lat: 15.2150, lng: 73.9360 },
            "fatrade": { lat: 15.2400, lng: 73.9300 },
            "carmona": { lat: 15.2500, lng: 73.9250 },
            "colva": { lat: 15.2789, lng: 73.9221 },
            "benaulim": { lat: 15.2642, lng: 73.9312 },
            "sernabatim": { lat: 15.2580, lng: 73.9280 },
            "margao": { lat: 15.2832, lng: 73.9862 },
            "madgaon": { lat: 15.2832, lng: 73.9862 },
            "curchorem": { lat: 15.2633, lng: 74.1083 },
            "quepem": { lat: 15.2133, lng: 74.0767 },
            "cuncolim": { lat: 15.1767, lng: 73.9933 },
            "assolna": { lat: 15.1950, lng: 73.9600 },
            
            // South Goa (Mormugao/Sancoale)
            "vasco": { lat: 15.3980, lng: 73.8113 },
            "majorda": { lat: 15.3010, lng: 73.9068 },
            "utorda": { lat: 15.2900, lng: 73.9100 },
            "dabolim": { lat: 15.3808, lng: 73.8314 },
            "sancoale": { lat: 15.3677, lng: 73.8747 },
            "airport": { lat: 15.3808, lng: 73.8314 },
            "bogmalo": { lat: 15.3750, lng: 73.8150 },
            "chicalim": { lat: 15.3878, lng: 73.8340 },
            "chikalim": { lat: 15.3878, lng: 73.8340 },
            
            // Central - BITS/Zuarinagar area
            "bits": { lat: 15.3909, lng: 73.8786 },
            "birla": { lat: 15.3909, lng: 73.8786 },
            "kk birla": { lat: 15.3909, lng: 73.8786 },
            "bits pilani": { lat: 15.3909, lng: 73.8786 },
            "bits goa": { lat: 15.3909, lng: 73.8786 },
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
            "ferry terminal": { lat: 15.5010, lng: 73.8295 },
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
            "parade ground": { lat: 15.4850, lng: 73.8120 },  // Parade Ground area
            "madhuban": { lat: 15.4820, lng: 73.8100 },  // Madhuban Circle
            "black sheep": { lat: 15.4750, lng: 73.8070 },  // Black Sheep Bistro (Miramar)
            "bistro": { lat: 15.4750, lng: 73.8070 },
            "fab india": { lat: 15.4750, lng: 73.8070 },
            "braganca": { lat: 15.4750, lng: 73.8070 },
            "villa braganca": { lat: 15.4750, lng: 73.8070 },
            "vishal mega": { lat: 15.4989, lng: 73.8278 },  // Vishal Mega Mart (assume central Panaji)
            "mega mart": { lat: 15.4989, lng: 73.8278 },
            "toilet": { lat: 15.4989, lng: 73.8278 },  // Public toilets - assume central area
            "restroom": { lat: 15.4989, lng: 73.8278 },
            
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
          console.log(`\n========== [findSegmentRoute] ==========`);
          console.log(`  From: ${segOrigin.substring(0, 50)}...`);
          console.log(`  To: ${segDest.substring(0, 50)}...`);
          console.log(`  Time: ${segDeparture.toISOString()}`);
          console.log(`=========================================\n`);
          
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
          
          // ===== HELPER: Check if a transit route goes through a specific location =====
          // IMPORTANT: Only check actual stop names, NOT bus route names in instructions
          // Bus route names like "muddebehal-belgavi cbt-margao-vasco" contain city names
          // even if the bus doesn't actually stop there
          const routeGoesThrough = (result: google.maps.DirectionsResult, detourLocation: string): boolean => {
            const leg = result.routes?.[0]?.legs?.[0];
            if (!leg) return false;
            
            const detourLower = detourLocation.toLowerCase();
            for (const step of (leg.steps || [])) {
              // Only check actual transit stop names, not instructions
              // Instructions contain bus route names which can be misleading
              if (step.transit) {
                const depStop = (step.transit.departure_stop?.name || "").toLowerCase();
                const arrStop = (step.transit.arrival_stop?.name || "").toLowerCase();
                if (depStop.includes(detourLower)) {
                  console.log(`[routeGoesThrough] Found "${detourLocation}" in departure stop: ${depStop}`);
                  return true;
                }
                if (arrStop.includes(detourLower)) {
                  console.log(`[routeGoesThrough] Found "${detourLocation}" in arrival stop: ${arrStop}`);
                  return true;
                }
              }
            }
            return false;
          };
          
          // ===== GENERAL DETOUR DETECTION =====
          // Reject routes that go through major hubs that are way off the direct path
          // A hub is "on the way" if: distFromOrigin + distFromDest < directDist * maxRatio
          const MAJOR_DETOUR_HUBS = [
            { name: "mapusa", lat: 15.5915, lng: 73.8101, keywords: ["mapusa"] },
            { name: "margao", lat: 15.2832, lng: 73.9862, keywords: ["margao", "madgaon"] },
            { name: "old goa", lat: 15.5008, lng: 73.9116, keywords: ["old goa", "gandhi circle", "velha goa", "old goa bypass"] },
            { name: "ponda", lat: 15.4033, lng: 74.0084, keywords: ["ponda"] },
            { name: "vasco", lat: 15.3980, lng: 73.8113, keywords: ["vasco", "mormugao"] },
          ];
          
          const checkForAbsurdDetours = (result: google.maps.DirectionsResult): boolean => {
            const originCoords = getApproxCoords(segOrigin);
            const destCoords = getApproxCoords(segDest);
            
            if (!originCoords || !destCoords) {
              console.log(`[checkForAbsurdDetours] Can't check - missing coords for origin/dest`);
              return false; // Can't check without coords
            }
            
            const directDist = haversineDistance(originCoords.lat, originCoords.lng, destCoords.lat, destCoords.lng);
            console.log(`[checkForAbsurdDetours] Checking ${segOrigin.substring(0,30)}... → ${segDest.substring(0,30)}...`);
            console.log(`[checkForAbsurdDetours] Direct distance: ${directDist.toFixed(1)}km`);
            
            // Log all transit stops for debugging
            const leg = result.routes?.[0]?.legs?.[0];
            if (leg) {
              const stops: string[] = [];
              for (const step of (leg.steps || [])) {
                if (step.transit) {
                  const dep = step.transit.departure_stop?.name || "";
                  const arr = step.transit.arrival_stop?.name || "";
                  if (dep) stops.push(dep);
                  if (arr) stops.push(arr);
                }
              }
              if (stops.length > 0) {
                console.log(`[checkForAbsurdDetours] Transit stops: ${stops.join(" → ")}`);
              }
            }
            
            // Check each major hub
            for (const hub of MAJOR_DETOUR_HUBS) {
              // Check if route goes through this hub
              const goesThrough = hub.keywords.some(kw => routeGoesThrough(result, kw));
              if (!goesThrough) continue;
              
              const distFromOrigin = haversineDistance(originCoords.lat, originCoords.lng, hub.lat, hub.lng);
              const distFromDest = haversineDistance(destCoords.lat, destCoords.lng, hub.lat, hub.lng);
              const viaHubDist = distFromOrigin + distFromDest;
              
              // A hub is "on the way" if going via it doesn't add too much distance
              // For short routes, allow up to 2x direct distance (buses don't go direct)
              // For longer routes, allow up to 1.8x direct distance
              let maxDetourRatio: number;
              if (directDist < 3) {
                // Very short route - any major hub is likely a detour
                maxDetourRatio = 3.0;
              } else if (directDist < 10) {
                maxDetourRatio = 2.5;
              } else {
                maxDetourRatio = 2.0;
              }
              
              const actualRatio = viaHubDist / directDist;
              
              console.log(`[checkForAbsurdDetours] Hub ${hub.name}: via-dist=${viaHubDist.toFixed(1)}km, ratio=${actualRatio.toFixed(2)}, max=${maxDetourRatio}`);
              
              if (actualRatio > maxDetourRatio) {
                console.log(`[checkForAbsurdDetours] ❌ REJECTING: Route goes through ${hub.name} (ratio ${actualRatio.toFixed(2)} > ${maxDetourRatio})`);
                return true;
              }
            }
            
            console.log(`[checkForAbsurdDetours] ✅ Route OK - no absurd detours`);
            return false;
          };
          
          // Try direct transit first - this is the preferred option
          console.log(`[findSegmentRoute] Requesting direct transit...`);
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
          let directTransitRejected = false;
          
          if (!directTransit) {
            console.log(`[findSegmentRoute] ⚠️ No direct transit returned from Google API`);
          } else if (!hasTransitLeg(directTransit)) {
            console.log(`[findSegmentRoute] ⚠️ Direct transit has no transit legs (walking only)`);
          }
          
          if (directTransit && hasTransitLeg(directTransit)) {
            console.log(`[findSegmentRoute] Got direct transit, checking for detours...`);
            // First check: reject if it goes through a major hub unnecessarily (detour)
            if (checkForAbsurdDetours(directTransit)) {
              directTransitRejected = true;
              console.log(`[findSegmentRoute] Direct transit rejected due to detour`);
            } else {
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

          // Only try hub-based routes if direct transit wasn't found, was rejected, or took very long
          const shouldTryHubs = !directTransit || !hasTransitLeg(directTransit) || directTransitRejected || directTransitDuration > 3600;
          
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
                  // Check both segments for absurd detours
                  const segment1HasDetour = checkForAbsurdDetours(originToHubTransit);
                  const segment2HasDetour = checkForAbsurdDetours(hubToDestTransit);
                  
                  if (segment1HasDetour || segment2HasDetour) {
                    console.log(`[findSegmentRoute] Skipping hub route via ${hub}: absurd detour detected`);
                  } else {
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
                }
              
                // Try walking from hub to destination (only if short)
                const hubToDestWalk = await routeRequest({
                  origin: hub,
                  destination: segDest,
                  travelMode: google.maps.TravelMode.WALKING,
                });
              
                if (hubToDestWalk) {
                  const hubToDestWalkDist = getWalkDistance(hubToDestWalk);
                  // Check origin-to-hub segment for absurd detours
                  if (hubToDestWalkDist <= MAX_WALK_DISTANCE_M && !checkForAbsurdDetours(originToHubTransit)) {
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
                    // Check hub-to-dest segment for absurd detours
                    if (!checkForAbsurdDetours(hubToDest)) {
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
            console.log(`[findSegmentRoute] ✅ Selected best route:`);
            console.log(`  Type: ${best.isDirect ? 'direct' : 'via hub'} ${best.hasTransit ? 'transit' : 'walk'}`);
            console.log(`  Duration: ${Math.round(best.totalDuration/60)}min, Walking: ${best.totalWalking}m`);
            console.log(`  Segments: ${best.segments.length}`);
            return best;
          }

          // FINAL FALLBACK: Bus to closest reachable hub + Cab for the rest
          // This handles cases like BITS to Cavelossim where no direct transit exists
          console.log(`[findSegmentRoute] ⚠️ No candidates found. Trying bus + cab fallback...`);
          console.log(`[findSegmentRoute] Total candidates checked: ${candidates.length}`);
          
          // Find the hub closest to destination that we can reach by bus from origin
          const destCoordsFallback = getApproxCoords(segDest);
          console.log(`[findSegmentRoute] Dest coords: ${destCoordsFallback ? `${destCoordsFallback.lat}, ${destCoordsFallback.lng}` : 'NOT FOUND'}`);
          
          let bestBusPlusCab: {
            transitRoute: google.maps.DirectionsResult;
            hubName: string;
            hubToDestDistance: number;
            busDuration: number;
          } | null = null;
          
          // Try all hubs to find reachable ones
          console.log(`[findSegmentRoute] Checking ${ALL_HUBS.length} hubs for bus+cab fallback...`);
          for (const hub of ALL_HUBS) {
            try {
              console.log(`[findSegmentRoute] Trying hub: ${hub.name}`);
              const transitToHub = await routeRequest({
                origin: segOrigin,
                destination: hub.name,
                travelMode: google.maps.TravelMode.TRANSIT,
                transitOptions: {
                  routingPreference: transitPreference,
                  departureTime: segDeparture,
                },
              });
              
              if (!transitToHub) {
                console.log(`[findSegmentRoute]   - No route to ${hub.name}`);
                continue;
              }
              
              if (!hasTransitLeg(transitToHub)) {
                console.log(`[findSegmentRoute]   - Route to ${hub.name} is walking only`);
                continue;
              }
              
              console.log(`[findSegmentRoute]   - Got transit route to ${hub.name}`);
              
              // Calculate distance from this hub to destination
              let hubToDestDist = Infinity;
              if (destCoordsFallback) {
                hubToDestDist = haversineDistance(hub.lat, hub.lng, destCoordsFallback.lat, destCoordsFallback.lng);
              }
              console.log(`[findSegmentRoute]   - Hub ${hub.name} is ${hubToDestDist.toFixed(1)}km from destination`);
              
              // Pick the hub closest to destination (covers most of the journey by bus)
              if (!bestBusPlusCab || hubToDestDist < bestBusPlusCab.hubToDestDistance) {
                bestBusPlusCab = {
                  transitRoute: transitToHub,
                  hubName: hub.name,
                  hubToDestDistance: hubToDestDist,
                  busDuration: getDuration(transitToHub),
                };
                console.log(`[findSegmentRoute] ✅ Best hub so far: ${hub.name}, ${hubToDestDist.toFixed(1)}km to destination`);
              }
            } catch (e) {
              console.log(`[findSegmentRoute]   - Error checking hub: ${e}`);
            }
          }
          
          if (bestBusPlusCab) {
            const cabDistKm = bestBusPlusCab.hubToDestDistance;
            const cabTimeMin = Math.round(cabDistKm * 3); // ~3 min per km for cab estimate
            console.log(`[findSegmentRoute] Using bus + cab fallback: Bus to ${bestBusPlusCab.hubName}, then cab ~${cabDistKm.toFixed(1)}km (~${cabTimeMin}min) to ${segDest}`);
            
            return {
              segments: [bestBusPlusCab.transitRoute],
              itineraryItems: [
                { title: bestBusPlusCab.hubName.replace(", Goa", ""), description: "Bus drop-off" },
                { title: "", description: `Cab recommended • ${cabDistKm.toFixed(1)} km • ~${cabTimeMin} mins by car` }
              ],
              totalDuration: bestBusPlusCab.busDuration + cabTimeMin * 60,
              totalWalking: getTotalWalkingDistance(bestBusPlusCab.transitRoute),
            };
          }

          // Fallback to walking (for longer distances, suggest cab)
          if (walkRoute) {
            const walkDistFallback = getWalkDistance(walkRoute);
            // If walking distance is too long, suggest cab instead
            if (walkDistFallback > MAX_WALK_DISTANCE_M) {
              const cabDistKm = walkDistFallback / 1000;
              const cabTimeMin = Math.round(cabDistKm * 3);
              console.log(`[findSegmentRoute] Distance too far for walking (${cabDistKm.toFixed(1)}km). Suggesting cab.`);
              return {
                segments: [], // No directions to render - it's a cab segment
                itineraryItems: [{ title: "", description: `Cab recommended • ${cabDistKm.toFixed(1)} km • ~${cabTimeMin} mins by car` }],
                totalDuration: cabTimeMin * 60,
                totalWalking: 0,
              };
            }
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
          }
          
          // Add intermediate itinerary items (like hub stops and cab recommendations)
          // Note: Walk items are NOT added here because ItineraryView extracts them from directionsSegments
            result.itineraryItems.forEach(item => {
            // Include items with a title (hub stops) OR cab recommendations (for bus+cab fallback)
            // Skip walk items - they are already extracted from directionsSegments in ItineraryView
            if (item.title || (item.description.includes("Cab recommended") && !item.description.includes("Walk"))) {
                allItineraryItems.push(item);
              }
            });
          
            // Update departure time for next segment
            currentDeparture = new Date(currentDeparture.getTime() + result.totalDuration * 1000);
          
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
        showNoChangesPrompt,
        setShowNoChangesPrompt,
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
        loadJourneyById,
      }}
    >
      {children}
    </TripContext.Provider>
  );
}
