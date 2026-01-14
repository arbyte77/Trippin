"use client";
import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTripContext } from "../context/TripContext";
import { Bus, Car, Footprints, Bike, MapPin, Loader2 } from "lucide-react";
import MiniRouteMap from "./MiniRouteMap";

interface ItineraryItem {
  title: string;
  description: string;
}

interface ItineraryViewProps {
  showItinerary: boolean;
  itinerary: ItineraryItem[];
  onSaveTrip: () => Promise<any>;
  onShowMap: () => void;
  isLoaded?: boolean;
  loadError?: unknown;
}

export default function ItineraryView({
  showItinerary,
  itinerary,
  onSaveTrip,
  onShowMap,
  isLoaded,
  loadError,
}: ItineraryViewProps) {
  const router = useRouter();
  const {
    travelMode,
    directions,
    directionsSegments,
    segmentsByLeg,
    origin,
    destination,
    destinationName,
    waypoints,
    waypointNames,
    editingJourneyId,
    setEditingJourneyId,
    updateTripHandler,
    originTime,
    destinationTime,
    stopTimes,
    setShowItinerary,
    setPendingRecalc,
    setPendingShowAmenities,
    setPostSaveRedirectToTrips,
    forceShowAmenities,
    isLoadingDirections,
    tripDate,
    showNoChangesPrompt,
    setShowNoChangesPrompt,
    savedJourneys,
  } = useTripContext();

  // Build display names for nodes - use waypointNames/destinationName where available
  const nodes = useMemo(() => {
    console.log('[ItineraryView] waypointNames:', JSON.stringify(waypointNames));
    console.log('[ItineraryView] waypoints:', JSON.stringify(waypoints));
    console.log('[ItineraryView] destinationName:', destinationName);
    console.log('[ItineraryView] destination:', destination);
    
    const waypointDisplayNames = waypoints.map((wp, idx) => {
      // Try both numeric and string keys since MongoDB might return either
      const displayName = waypointNames[idx] || waypointNames[String(idx)] || wp;
      console.log(`[ItineraryView] waypoint ${idx}: name="${waypointNames[idx] || waypointNames[String(idx)]}" wp="${wp}" => "${displayName}"`);
      return displayName;
    });
    // Use destinationName if available, otherwise use destination value
    const destDisplay = destinationName || destination;
    const points = [origin, ...waypointDisplayNames, destDisplay].filter(Boolean);
    console.log('[ItineraryView] Final nodes:', JSON.stringify(points));
    return points;
  }, [origin, waypoints, waypointNames, destination, destinationName]);

  const noTransitFound = useMemo(() => {
    if (travelMode !== "TRANSIT") return false;
    // Don't show warning if we have no segments yet (e.g., viewing saved trip without recalculation)
    if (!directionsSegments || directionsSegments.length === 0) return false;
    // Only show warning if we have segments but NONE of them contain transit
    const hasAnyTransit = directionsSegments.some((seg) =>
      (seg.routes?.[0]?.legs?.[0]?.steps || []).some(
        (s: any) => s.travel_mode === google.maps.TravelMode.TRANSIT || s.travel_mode === "TRANSIT"
      )
    );
    return !hasAnyTransit;
  }, [travelMode, directionsSegments]);

  const legItems = useMemo(() => {
    if (travelMode === "TRANSIT") {
      // Group segments by leg using segmentsByLeg, then produce one summary per leg
      const numLegs = nodes.length - 1; // Number of legs = nodes - 1
      const items: { mode: "BUS" | "WALK" | "CAB"; label: string; subtext: string }[] = [];
      
      // Calculate segment ranges for each leg
      let segmentIndex = 0;
      for (let legIdx = 0; legIdx < numLegs; legIdx++) {
        const segCount = segmentsByLeg[legIdx] || 1;
        const legSegments = directionsSegments.slice(segmentIndex, segmentIndex + segCount);
        segmentIndex += segCount;
        
        // Aggregate data for this leg
        let totalDistM = 0;
        let totalDurS = 0;
        let hasTransit = false;
        let busLabel = "";
        let boardStop = "";
        let boardTime = "";
        
        legSegments.forEach((seg) => {
          const leg = seg.routes?.[0]?.legs?.[0];
          if (!leg) return;
          totalDistM += leg.distance?.value || 0;
          totalDurS += leg.duration?.value || 0;
          
          (leg.steps || []).forEach((step: any) => {
            if (step.travel_mode === google.maps.TravelMode.TRANSIT || step.travel_mode === "TRANSIT") {
              hasTransit = true;
              const tr = step.transit;
              if (!busLabel && tr?.line) {
                busLabel = `Bus ${tr.line.short_name || tr.line.name || ""}`;
              }
              if (!boardStop && tr?.departure_stop?.name) {
                boardStop = tr.departure_stop.name;
              }
              if (!boardTime && tr?.departure_time?.text) {
                boardTime = tr.departure_time.text;
              }
            }
          });
        });
        
        // Format distance and time
        const distStr = totalDistM >= 1000 
          ? `${(totalDistM / 1000).toFixed(1)} km` 
          : `${Math.round(totalDistM)} m`;
        const durMins = Math.round(totalDurS / 60);
        const durStr = durMins >= 60 
          ? `${Math.floor(durMins / 60)} hr ${durMins % 60} mins`
          : `${durMins} mins`;
        
        let subtext = "";
        if (boardStop || boardTime) {
          const parts: string[] = [];
          if (boardStop) parts.push(`Board @ ${boardStop}`);
          if (boardTime) parts.push(boardTime);
          subtext = parts.join(" • ");
        }
        
        if (hasTransit) {
          items.push({ 
            mode: "BUS", 
            label: `${busLabel || "Bus"} • ${distStr} • ${durStr}`, 
            subtext 
          });
        } else if (totalDistM > 3000) {
          // Long walk - suggest cab
          items.push({ 
            mode: "CAB", 
            label: `Cab recommended • ${distStr} • ~${Math.round(durMins / 3)} mins by car`, 
            subtext: "" 
          });
        } else {
          items.push({ 
            mode: "WALK", 
            label: `Walk • ${distStr} • ${durStr}`, 
            subtext: "" 
          });
        }
      }
      
      return items;
    } else if (directions) {
      const legs = directions.routes?.[0]?.legs || [];
      const mode =
        travelMode === "DRIVING"
          ? "Car"
          : travelMode === "BICYCLING"
          ? "Bike"
          : "Walk";
      return legs.map((leg) => {
        const d = leg.distance?.text || "";
        const t = leg.duration?.text || "";
        // For non-transit, generally no boarding; keep subtext blank
        return { mode: mode as "Car" | "Bike" | "Walk", label: `${mode} • ${d} • ${t}`, subtext: "" };
      });
    }
    return [];
  }, [travelMode, directions, directionsSegments, segmentsByLeg, nodes]);

  // Helper to extract steps from a single DirectionsResult segment
  const extractStepsFromSegment = (seg: google.maps.DirectionsResult) => {
    const leg = seg.routes?.[0]?.legs?.[0];
    const items: {
      mode: "WALK" | "BUS" | "CAB";
      label: string;
      subtext?: string;
      boardStop?: string;
      boardTime?: string;
      alightStop?: string;
      alightTime?: string;
    }[] = [];
    if (!leg) return items;
    let walkDistMeters = 0;
    let walkDurSec = 0;
    const flushWalk = () => {
      if (walkDistMeters === 0 && walkDurSec === 0) return;
      const mins = Math.round(walkDurSec / 60);
      // Format distance nicely
      const distStr = walkDistMeters >= 1000 
        ? `${(walkDistMeters / 1000).toFixed(1)} km` 
        : `${Math.round(walkDistMeters)} m`;
      // If walk is > 3km, suggest cab instead
      if (walkDistMeters > 3000) {
        const label = `Cab recommended • ${distStr} • ~${Math.round(mins / 3)} mins by car`;
        items.push({ mode: "CAB", label });
      } else {
        const label = `Walk • ${distStr} • ${mins} mins${mins > 30 ? " • Suggest Cab" : ""}`;
        items.push({ mode: "WALK", label });
      }
      walkDistMeters = 0;
      walkDurSec = 0;
    };
    (leg.steps || []).forEach((step: any) => {
      if (step.travel_mode === google.maps.TravelMode.WALKING || step.travel_mode === "WALKING") {
        // Sum up walking distance in meters for cleaner display
        walkDistMeters += step.distance?.value || 0;
        walkDurSec += step.duration?.value || 0;
      } else if (step.travel_mode === google.maps.TravelMode.TRANSIT || step.travel_mode === "TRANSIT") {
        flushWalk();
        const tr = step.transit;
        if (!tr) return;
        const bus = tr.line?.short_name || tr.line?.name || "Bus";
        const d = step.distance?.text || "";
        const t = step.duration?.text || "";
        const boardStop = tr.departure_stop?.name;
        const boardTime = tr.departure_time?.text;
        const alightStop = tr.arrival_stop?.name;
        const alightTime = tr.arrival_time?.text;
        const subtext = [boardStop ? `Board @ ${boardStop}` : "", boardTime || ""]
          .filter(Boolean)
          .join(" • ");
        items.push({
          mode: "BUS",
          label: `Bus ${bus} • ${d} • ${t}`,
          subtext,
          boardStop,
          boardTime,
          alightStop,
          alightTime,
        });
      }
    });
    flushWalk();
    
    // If this segment has no transit and is just a walking-only segment, 
    // ensure we show it (handles the final walk from bus stop to destination)
    if (items.length === 0 && leg.distance?.value) {
      const distM = leg.distance.value;
      const durSec = leg.duration?.value || 0;
      const mins = Math.round(durSec / 60);
      const distStr = distM >= 1000 
        ? `${(distM / 1000).toFixed(1)} km` 
        : `${Math.round(distM)} m`;
      if (distM > 3000) {
        items.push({ mode: "CAB", label: `Cab recommended • ${distStr} • ~${Math.round(mins / 3)} mins by car` });
      } else {
        items.push({ mode: "WALK", label: `Walk • ${distStr} • ${mins} mins${mins > 30 ? " • Suggest Cab" : ""}` });
      }
    }
    return items;
  };

  // Detailed transit steps per leg (Board/Walk/Ride details)
  // Groups segments by leg using segmentsByLeg tracking from context
  // Extract hub drop-offs and cab recommendations from itinerary (for bus+cab fallback display)
  const hubAndCabItems = useMemo(() => {
    const hubs: { title: string; description: string }[] = [];
    const cabs: { title: string; description: string }[] = [];
    
    itinerary.forEach(item => {
      if (item.description === "Bus drop-off" && item.title) {
        hubs.push(item);
      } else if (item.description.includes("Cab recommended")) {
        cabs.push(item);
      }
    });
    
    return { hubs, cabs };
  }, [itinerary]);

  const transitStepsByLeg = useMemo(() => {
    if (travelMode !== "TRANSIT") return [];
    
    const numLegs = nodes.length - 1; // number of node-pairs
    
    // Helper to deduplicate consecutive walk/cab steps (prevents duplicate walks showing)
    const dedupeSteps = (steps: ReturnType<typeof extractStepsFromSegment>) => {
      const deduped: ReturnType<typeof extractStepsFromSegment> = [];
      for (const step of steps) {
        const prev = deduped[deduped.length - 1];
        if (prev && step.mode === prev.mode && (step.mode === "WALK" || step.mode === "CAB")) {
          continue; // Skip duplicate consecutive walk/cab
        }
        deduped.push(step);
      }
      return deduped;
    };
    
    // If we have segmentsByLeg tracking, use it for accurate grouping
    if (segmentsByLeg && segmentsByLeg.length === numLegs) {
      const result: ReturnType<typeof extractStepsFromSegment>[] = [];
      let segmentIndex = 0;
      
      for (let leg = 0; leg < numLegs; leg++) {
        const segmentCount = segmentsByLeg[leg] || 1;
        const legSteps: ReturnType<typeof extractStepsFromSegment> = [];
        
        // Collect all steps from all segments belonging to this leg
        for (let s = 0; s < segmentCount && segmentIndex < directionsSegments.length; s++) {
          legSteps.push(...extractStepsFromSegment(directionsSegments[segmentIndex]));
          segmentIndex++;
        }
        
        result.push(dedupeSteps(legSteps));
      }
      
      return result;
    }
    
    // Fallback: if segmentsByLeg not available, use simple heuristics
    const numSegments = directionsSegments.length;
    
    // If there are more segments than legs, we have multi-segment routing (like via hub)
    // In this case, distribute segments evenly or combine them
    if (numSegments > numLegs && numLegs > 0) {
      // Simple case: all segments belong to single leg
      if (numLegs === 1) {
        const allSteps: ReturnType<typeof extractStepsFromSegment> = [];
        directionsSegments.forEach((seg) => {
          allSteps.push(...extractStepsFromSegment(seg));
        });
        return [dedupeSteps(allSteps)];
      }
      
      // Multiple legs with more segments - try to distribute
      // This is a fallback, segmentsByLeg should handle this properly
      const segmentsPerLeg = Math.ceil(numSegments / numLegs);
      const result: ReturnType<typeof extractStepsFromSegment>[] = [];
      
      for (let leg = 0; leg < numLegs; leg++) {
        const startIdx = leg * segmentsPerLeg;
        const endIdx = Math.min(startIdx + segmentsPerLeg, numSegments);
        const legSteps: ReturnType<typeof extractStepsFromSegment> = [];
        
        for (let s = startIdx; s < endIdx; s++) {
          if (directionsSegments[s]) {
            legSteps.push(...extractStepsFromSegment(directionsSegments[s]));
          }
        }
        
        result.push(dedupeSteps(legSteps));
      }
      
      return result;
    }
    
    // Standard case: one segment per leg
    return directionsSegments.map((seg) => dedupeSteps(extractStepsFromSegment(seg)));
  }, [travelMode, directionsSegments, nodes.length, segmentsByLeg]);

  if (!showItinerary) return null;

  // Show loading state while directions are being calculated
  if (isLoadingDirections) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-semibold mb-4 text-[#6B5539]">
            Your Itinerary
          </h2>
          <div className="glass rounded-2xl p-12 flex flex-col items-center justify-center border-2 border-[#4A7C59]">
            <Loader2 className="h-10 w-10 text-[#4A7C59] animate-spin mb-4" />
            <p className="text-gray-700 text-lg">Calculating your beach route...</p>
          </div>
        </div>
      </div>
    );
  }

  const ModeIcon = (mode: string, label: string) => {
    if (mode === "BUS") return <Bus className="h-4 w-4 text-blue-600" />;
    if (mode === "CAB" || mode === "Car") return <Car className="h-4 w-4 text-gray-800" />;
    if (mode === "Bike") return <Bike className="h-4 w-4 text-emerald-600" />;
    if (mode === "WALK" || mode === "Walk" || label.startsWith("Walk")) return <Footprints className="h-4 w-4 text-orange-600" />;
    return <Car className="h-4 w-4 text-gray-800" />;
  };

  const handleSave = async () => {
    if (editingJourneyId) {
      await updateTripHandler();
      router.push("/my-trips");
      return;
    }
    const saved = await onSaveTrip();
    // After first save of a new plan, open amenities list in-place
    setPostSaveRedirectToTrips(true);
    await forceShowAmenities();
  };
  const handleCancel = () => {
    if (editingJourneyId) {
      setEditingJourneyId(null);
      router.push("/my-trips");
    } else {
      setShowItinerary(false);
    }
  };
  
  // Handle "No changes made" prompt
  const handleNoChangesYes = () => {
    // Same as cancel - exit to my-trips
    setShowNoChangesPrompt(false);
    setEditingJourneyId(null);
    router.push("/my-trips");
  };
  
  const handleNoChangesNo = () => {
    // Just close the prompt and stay on the itinerary view
    setShowNoChangesPrompt(false);
  };

  return (
    <div className="p-6 relative z-10">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-semibold mb-4 text-[#6B5539]">
          Your Itinerary
        </h2>

        {/* Trip Info Header */}
        <div className="flex justify-between items-center mb-6 text-sm">
          <div>
            {editingJourneyId ? (
              <span className="font-mono text-xs glass px-3 py-1.5 rounded-lg text-gray-700">
                ID: {editingJourneyId.slice(-8)}
              </span>
            ) : (
              <span className="italic glass px-3 py-1.5 rounded-lg text-gray-700">New Trip</span>
            )}
          </div>
          <div>
            {tripDate && (
              <span className="glass px-3 py-1.5 rounded-lg text-gray-700">
                {new Date(tripDate).toLocaleDateString("en-IN", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            )}
          </div>
        </div>

      {/* Two-column layout: Timeline on left, Map on right (stacks on mobile) */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left column - Timeline (50% width on desktop) - Scrollable */}
        <div className="flex-1 relative lg:max-h-[calc(100vh-250px)] lg:overflow-y-auto lg:pr-2">

        {/* Starting point */}
        <div className="relative mb-4">
          <div className="glass-terracotta p-4 rounded-xl border border-[#E07856]/30">
            <div className="text-sm text-gray-600 font-medium">Starting point</div>
            <div className="text-lg font-semibold text-gray-800 flex items-center space-x-2 mt-1">
              <MapPin className="h-5 w-5 text-[#E07856]" />
              <span>{nodes[0] || "—"}</span>
            </div>
            {(originTime && originTime.trim()) ? (
              <div className="text-xs text-gray-600 mt-2 bg-white/40 px-2 py-1 rounded-lg inline-block">
                Leave by {originTime}
              </div>
            ) : null}
          </div>
        </div>
       
      {/* Show any external bus route suggestions from itinerary items (e.g., OSM bus route) */}
      {itinerary.filter(item => item.title.startsWith("🚌")).map((item, idx) => (
        <div key={`osm-${idx}`} className="mb-4">
          <div className="glass-dark text-white px-4 py-3 rounded-xl border border-[#4A90A4]/30">
            <div className="font-semibold">{item.title}</div>
            {item.description && (
              <div className="text-sm mt-1 opacity-90">{item.description}</div>
            )}
          </div>
        </div>
      ))}


      {travelMode === "TRANSIT" && noTransitFound ? (
        <div className="mb-4">
          <div className="glass-terracotta text-[#C85A3C] px-4 py-3 rounded-xl border border-[#E07856]/30">
            No transit found for the selected time. Showing walking between points.
          </div>
        </div>
      ) : null}

        {/* Segments between nodes */}
        {nodes.slice(1).map((node, idx) => (
          <div key={idx} className="mb-4">
            {/* Segment details (prefer detailed transit steps; fallback to single summary) */}
            {travelMode === "TRANSIT" && transitStepsByLeg[idx] && transitStepsByLeg[idx].length > 0 ? (
              <div className="mb-2 space-y-2">
                {transitStepsByLeg[idx].map((step, si) => (
                  <div key={si} className="bg-white px-3 py-2">
                    <div className="flex items-center space-x-2 text-sm text-gray-800">
                      {ModeIcon(step.mode, step.label)}
                      <span>{step.label}</span>
                    </div>
                    {step.subtext ? (
                      <div className="text-xs text-gray-500 mt-1 ml-6">{step.subtext}</div>
                    ) : null}
                    {step.alightStop || step.alightTime ? (
                      <div className="mt-2 ml-6">
                        <div className="bg-gray-50 border p-2 rounded inline-block">
                          <div className="flex items-center space-x-2 text-sm text-gray-800">
                            <span className="inline-flex items-center">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="mr-1">
                                <path d="M12 2C8.686 2 6 4.686 6 8c0 5 6 14 6 14s6-9 6-14c0-3.314-2.686-6-6-6zm0 8.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" fill="#e11d48"/>
                              </svg>
                              <span className="font-medium">Alight @ {step.alightStop || "Stop"}</span>
                            </span>
                          </div>
                          {step.alightTime ? (
                            <div className="text-xs text-gray-500 mt-1">at {step.alightTime}</div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : legItems[idx] ? (
              <div className="mb-2">
                <div className="bg-white px-3 py-2">
                  <div className="flex items-center space-x-2 text-sm text-gray-800">
                    {ModeIcon(legItems[idx].mode as string, legItems[idx].label)}
                    <span>{legItems[idx].label}</span>
                  </div>
                  {legItems[idx].subtext ? (
                    <div className="text-xs text-gray-500 mt-1 ml-6">
                      {legItems[idx].subtext}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
            
            {/* Bus+Cab fallback: Show hub drop-off and cab recommendation */}
            {travelMode === "TRANSIT" && idx === nodes.length - 2 && hubAndCabItems.hubs.length > 0 && (
              <>
                {/* Hub drop-off point */}
                {hubAndCabItems.hubs.map((hub, hi) => (
                  <div key={`hub-${hi}`} className="mb-2">
                    <div className="bg-blue-50 border border-blue-100 p-3 rounded">
                      <div className="text-sm text-blue-600">Bus drop-off point</div>
                      <div className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-blue-600" />
                        <span>{hub.title}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {/* Cab recommendation */}
                {hubAndCabItems.cabs.map((cab, ci) => (
                  <div key={`cab-${ci}`} className="mb-2">
                    <div className="bg-amber-50 border border-amber-200 px-3 py-2 rounded">
                      <div className="flex items-center space-x-2 text-sm text-amber-800">
                        <Car className="h-4 w-4" />
                        <span>{cab.description}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Next stop/destination */}
            <div className="relative">
              <div className={`${idx === nodes.length - 2 ? 'bg-[#2A6F85]' : 'glass'} p-4 rounded-xl border ${idx === nodes.length - 2 ? 'border-[#2A6F85]' : 'border-white/30'}`}>
                <div className={`text-sm font-medium ${idx === nodes.length - 2 ? 'text-white' : 'text-gray-600'}`}>
                  {idx === nodes.length - 2 ? "Destination" : "Next stop"}
                </div>
                <div className={`text-lg font-semibold flex items-center space-x-2 mt-1 ${idx === nodes.length - 2 ? 'text-white' : 'text-gray-800'}`}>
                  <MapPin className={`h-5 w-5 ${idx === nodes.length - 2 ? 'text-white' : 'text-[#4A90A4]'}`} />
                  <span>{node}</span>
                </div>
                {/* Subtext for stop times */}
                {idx === nodes.length - 2 ? (
                  (destinationTime && destinationTime.trim()) ? (
                    <div className="text-xs text-white mt-2 bg-white/30 px-2.5 py-1 rounded-lg inline-block font-medium">
                      Arrive by {destinationTime}
                    </div>
                  ) : null
                ) : (
                  (() => {
                    const wpIndex = idx - 1;
                    const arrive = stopTimes?.[wpIndex]?.arriveBy || "";
                    const leave = stopTimes?.[wpIndex]?.leaveBy || "";
                    const parts: string[] = [];
                    if (arrive) parts.push(`Arrive by ${arrive}`);
                    if (leave) parts.push(`Leave by ${leave}`);
                    return parts.length ? (
                      <div className="text-xs text-gray-600 mt-2 bg-white/40 px-2 py-1 rounded-lg inline-block">
                        {parts.join(" • ")}
                      </div>
                    ) : null;
                  })()
                )}
              </div>
            </div>
        </div>
      ))}
        </div>
        {/* End of left column */}

        {/* Right column - Map Preview (50% width on desktop, sticky on scroll) */}
        <div className="flex-1 lg:sticky lg:top-24 lg:self-start flex flex-col">
          <div className="glass rounded-2xl overflow-hidden shadow-xl flex-shrink-0">
            <MiniRouteMap
              start={origin}
              destination={destination}
              waypoints={waypoints}
              travelMode={travelMode}
              width="100%"
              height={400}
              isLoaded={!!isLoaded}
              loadError={loadError}
            />
            <div className="text-xs text-gray-600 text-center p-3 bg-white/30 border-t border-white/20">
              Click the map to open full map view
            </div>
          </div>
          
          {/* Buttons - Positioned to align with bottom of itinerary */}
          <div className="mt-auto pt-6 flex justify-end space-x-3">
            <button
              onClick={handleCancel}
              className="btn-terracotta text-white px-6 py-2.5 rounded-xl font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="btn-green text-white px-6 py-2.5 rounded-xl font-medium"
            >
              Save Trip
            </button>
          </div>
        </div>
        {/* End of right column */}
      </div>
      {/* End of two-column layout */}
      
      {/* No Changes Prompt Modal */}
      {showNoChangesPrompt && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass rounded-2xl p-8 max-w-md mx-4 shadow-2xl border-2 border-[#4A7C59]">
            <h3 className="text-xl font-semibold text-[#6B5539] mb-3">
              No changes made
            </h3>
            <p className="text-gray-600 mb-6">
              Exit instead?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleNoChangesNo}
                className="btn-glass text-gray-700 px-5 py-2 rounded-xl font-medium"
              >
                No
              </button>
              <button
                onClick={handleNoChangesYes}
                className="btn-green text-white px-5 py-2 rounded-xl font-medium"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
      {/* End of max-w-7xl container */}
    </div>
  );
}
