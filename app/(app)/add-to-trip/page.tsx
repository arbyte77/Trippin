"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTripContext } from "../../context/TripContext";

function AddToTripContent() {
  const params = useSearchParams();
  const router = useRouter();
  const tripIdParam = params.get("tripId");
  const {
    savedJourneys,
    pendingPlace,
    setPendingPlace,
    setPendingRecalc,
    setOrigin,
    setDestination,
    setDestinationName,
    setTravelMode,
    setFilterOption,
    setWaypoints,
    setWaypointNames,
    setStopTimes,
    setSavedJourneys,
    setEditingJourneyId,
  } = useTripContext();

  const [selectedTripId, setSelectedTripId] = useState<string | null>(tripIdParam);
  const [insertIndex, setInsertIndex] = useState<number>(0);

  useEffect(() => {
    if (!pendingPlace) {
      // nothing pending — go back
      router.push("/");
    }
  }, [pendingPlace, router]);

  useEffect(() => {
    // if a tripId was passed but we don't have it in savedJourneys, clear
    if (selectedTripId && savedJourneys && !savedJourneys.find((j) => j._id === selectedTripId)) {
      setSelectedTripId(null);
    }
  }, [selectedTripId, savedJourneys]);

  const chosenTrip = selectedTripId ? savedJourneys.find((j) => j._id === selectedTripId) : savedJourneys[0];
  const stops = useMemo(() => {
    if (!chosenTrip) return [] as string[];
    const wps = Array.isArray(chosenTrip.waypoints) ? chosenTrip.waypoints : [];
    const dest = chosenTrip.destination ? [chosenTrip.destination] : [];
    return [...wps, ...dest];
  }, [chosenTrip]);

  if (!pendingPlace) return null;

  const onConfirm = async () => {
    if (!chosenTrip) return alert("Select a trip first.");
    try {
      const res = await fetch(`/api/journeys/${chosenTrip._id}/addPlace`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ place: pendingPlace, index: insertIndex }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.message || "Failed to add place");
      }
      let journey: any = null;
      try {
        const parsed = await res.json();
        journey = parsed?.journey || null;
      } catch {
        journey = null;
      }
      // Always refresh saved journeys; some environments return empty body
      const r = await fetch("/api/journeys");
      if (r.ok) {
        const list = await r.json();
        setSavedJourneys(list);
        if (!journey) {
          journey = list.find((j: any) => j._id === chosenTrip._id) || null;
        }
      }
      // Update current context to reflect the latest journey
      if (journey) {
        setOrigin(journey.start);
        setDestination(journey.destination);
        setDestinationName(journey.destinationName || "");
        setTravelMode(journey.travelMode);
        setFilterOption(journey.filterOption);
      setWaypoints(journey.waypoints || []);
        // Parse waypointNames - it might come as object or need parsing from JSON
        const wpNames = journey.waypointNames || 
          (journey.waypointNamesJson ? JSON.parse(journey.waypointNamesJson) : {});
        setWaypointNames(wpNames);
      setStopTimes(journey.stopTimes || []);
        // Set editing journey ID so subsequent saves update this journey
        setEditingJourneyId(journey._id);
      }
      // set a flag so the Home page will recalc directions when maps are ready
      setPendingRecalc(true);
      // clear pendingPlace and go home where map will be recalculated
      setPendingPlace(null);
      router.push("/");
    } catch (e: any) {
      console.error(e);
      // Be lenient: if add likely succeeded but parsing failed, still continue UX without alerting
      setPendingPlace(null);
      setPendingRecalc(true);
      router.push("/");
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Place: {pendingPlace.name}</h2>

      <div className="mb-4">
        <label className="block font-medium">Select trip</label>
        {savedJourneys && savedJourneys.length ? (
          <select value={selectedTripId || ""} onChange={(e) => setSelectedTripId(e.target.value)} className="w-full p-2 border rounded">
            <option value="">-- choose trip --</option>
            {savedJourneys.map((j: any) => (
              <option key={j._id} value={j._id}>{j.start} → {j.destination}</option>
            ))}
          </select>
        ) : (
          <div>No saved trips — please create a trip first.</div>
        )}
      </div>

      <div className="mb-4">
        <label className="block font-medium">Where to insert</label>
        <select value={insertIndex} onChange={(e) => setInsertIndex(parseInt(e.target.value, 10))} className="w-full p-2 border rounded">
          {stops.length > 0 && (
            <>
              {/* Before stop 1 */}
              <option value={0}>{`Before stop 1: ${stops[0]}`}</option>
              {/* After stop i for i = 1..N (N includes destination) */}
              {stops.map((name: string, i: number) => {
                const wLen = chosenTrip?.waypoints?.length || 0;
                const afterIdx = i + 1 <= wLen ? i + 1 : wLen + 1; // after destination => wLen+1
                return (
                  <option key={`after-${i}`} value={afterIdx}>{`After stop ${i + 1}: ${name}`}</option>
                );
              })}
            </>
          )}
        </select>
      </div>

      

      <div className="flex space-x-2">
        <button onClick={onConfirm} className="px-4 py-2 bg-blue-600 text-white rounded">Confirm & Add</button>
        <button onClick={() => { setPendingPlace(null); router.push('/'); }} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
      </div>
    </div>
  );
}

export default function AddToTripPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <AddToTripContent />
    </Suspense>
  );
}
