"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTripContext } from "../../context/TripContext";

export default function AddToTripPage() {
  const params = useSearchParams();
  const router = useRouter();
  const tripIdParam = params.get("tripId");
  const {
    savedJourneys,
    pendingPlace,
    setPendingPlace,
    setPendingRecalc,
    setWaypoints,
    setStopTimes,
    setSavedJourneys,
  } = useTripContext();

  const [selectedTripId, setSelectedTripId] = useState<string | null>(tripIdParam);
  const [insertIndex, setInsertIndex] = useState<number>(0);
  const [arriveBy, setArriveBy] = useState("");
  const [leaveBy, setLeaveBy] = useState("");

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

  if (!pendingPlace) return null;

  const chosenTrip = selectedTripId ? savedJourneys.find((j) => j._id === selectedTripId) : savedJourneys[0];
  const slots = chosenTrip ? (chosenTrip.waypoints ? chosenTrip.waypoints.length + 1 : 1) : 1;

  const onConfirm = async () => {
    if (!chosenTrip) return alert("Select a trip first.");
    try {
      const res = await fetch(`/api/journeys/${chosenTrip._id}/addPlace`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ place: pendingPlace, index: insertIndex, stopTime: { arriveBy, leaveBy } }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.message || "Failed to add place");
      }
      const { journey } = await res.json();
      // update local context to reflect new journey
      // 1) refetch saved journeys
      const r = await fetch("/api/journeys");
      if (r.ok) setSavedJourneys(await r.json());
      // 2) set current waypoints/stopTimes to the updated journey so UI reflects it
      setWaypoints(journey.waypoints || []);
      setStopTimes(journey.stopTimes || []);
      // set a flag so the Home page will recalc directions when maps are ready
      setPendingRecalc(true);
      // clear pendingPlace and go home where map will be recalculated
      setPendingPlace(null);
      router.push("/");
    } catch (e: any) {
      console.error(e);
      alert("Error adding place: " + (e.message || e));
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
          {Array.from({ length: slots }).map((_, idx) => (
            <option key={idx} value={idx}>{idx === 0 ? `Before first stop` : idx === slots - 1 ? `After last stop` : `After stop ${idx}`}</option>
          ))}
        </select>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <div>
          <label className="block font-medium">Arrive by</label>
          <input type="time" value={arriveBy} onChange={(e) => setArriveBy(e.target.value)} className="w-full p-2 border rounded" />
        </div>
        <div>
          <label className="block font-medium">Leave by</label>
          <input type="time" value={leaveBy} onChange={(e) => setLeaveBy(e.target.value)} className="w-full p-2 border rounded" />
        </div>
      </div>

      <div className="flex space-x-2">
        <button onClick={onConfirm} className="px-4 py-2 bg-blue-600 text-white rounded">Confirm & Add</button>
        <button onClick={() => { setPendingPlace(null); router.push('/'); }} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
      </div>
    </div>
  );
}
