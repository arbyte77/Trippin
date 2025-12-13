"use client";
import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useTripContext } from "../context/TripContext";

export default function RefreshmentModal() {
  const router = useRouter();
  const {
    showRefreshmentModal,
    setShowRefreshmentModal,
    refreshmentItems,
    refreshmentNote,
    setPendingPlace,
    savedJourneys,
    editingJourneyId,
    refreshmentInsertIndex,
    waypoints,
    stopTimes,
    setWaypoints,
    setStopTimes,
    setPendingRecalc,
    origin,
    destination,
    setOrigin,
    setDestination,
    setTravelMode,
    setFilterOption,
    setSavedJourneys,
    postSaveRedirectToTrips,
    setPostSaveRedirectToTrips,
    isLoadingAmenities,
  } = useTripContext();

  const stops = useMemo(() => {
    const names = [...waypoints, destination].filter(Boolean);
    return names;
  }, [waypoints, destination]);
  const [posIndex, setPosIndex] = useState<number>(() =>
    typeof refreshmentInsertIndex === "number" ? refreshmentInsertIndex : waypoints.length
  );

  const onAdd = (item: any) => {
    // Get the best location string for Google Directions:
    // Priority: address > "lat,lng" coordinates > name
    const getLocationString = (place: any): string => {
      // If we have a proper address, use it
      if (place.location?.address && place.location.address.length > 5) {
        return place.location.address;
      }
      // If we have coordinates, use "lat,lng" format (Google Directions accepts this)
      if (place.location?.lat && place.location?.lng) {
        return `${place.location.lat},${place.location.lng}`;
      }
      // Fallback to name (might not work for obscure places)
      return place.name;
    };

    const locationStr = getLocationString(item);

    // If this is immediately after first save, we want client-side insert and return to itinerary to allow explicit Save
    if (editingJourneyId && postSaveRedirectToTrips) {
      const idx = typeof posIndex === "number" ? posIndex : waypoints.length;
      const wLen = waypoints.length;
      if (idx === wLen + 1) {
        if (destination) {
          const newWps = [...waypoints, destination];
          const newTimes = [...stopTimes, { arriveBy: "", leaveBy: "" }];
          setWaypoints(newWps);
          setStopTimes(newTimes);
        }
        setDestination(locationStr);
      } else {
        const newWps = [...waypoints];
        newWps.splice(idx, 0, locationStr);
        const newTimes = [...stopTimes];
        newTimes.splice(idx, 0, { arriveBy: "", leaveBy: "" });
        setWaypoints(newWps);
        setStopTimes(newTimes);
      }
      setPendingRecalc(true);
      setShowRefreshmentModal(false);
      setPostSaveRedirectToTrips(false);
      router.push("/");
      return;
    }
    // If editing an existing journey outside first-save flow, reuse server add-to-trip
    if (editingJourneyId) {
      (async () => {
        try {
          const res = await fetch(`/api/journeys/${editingJourneyId}/addPlace`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ place: { ...item, locationStr }, index: posIndex }),
          });
          if (!res.ok) throw new Error("Failed to add amenity");
          // refresh saved journeys & current context
          const r = await fetch("/api/journeys");
          if (r.ok) {
            const list = await r.json();
            setSavedJourneys(list);
            const j = list.find((x: any) => x._id === editingJourneyId);
            if (j) {
              setOrigin(j.start);
              setDestination(j.destination);
              setWaypoints(j.waypoints || []);
              setStopTimes(j.stopTimes || []);
              setTravelMode(j.travelMode);
              setFilterOption(j.filterOption);
            }
          }
          setPendingRecalc(true);
        } catch {
          // ignore
        } finally {
          setShowRefreshmentModal(false);
        }
      })();
      return;
    }
    // Otherwise insert into the current in-progress plan (unsaved)
    const idx = typeof posIndex === "number" ? posIndex : waypoints.length;
    const wLen = waypoints.length;
    if (idx === wLen + 1) {
      // After destination: shift current destination into waypoints; set new place as destination
      if (destination) {
        const newWps = [...waypoints, destination];
        const newTimes = [...stopTimes, { arriveBy: "", leaveBy: "" }];
        setWaypoints(newWps);
        setStopTimes(newTimes);
      }
      setDestination(locationStr);
    } else {
      const newWps = [...waypoints];
      newWps.splice(idx, 0, locationStr);
      const newTimes = [...stopTimes];
      newTimes.splice(idx, 0, { arriveBy: "", leaveBy: "" });
      setWaypoints(newWps);
      setStopTimes(newTimes);
    }
    setPendingRecalc(true);
    setShowRefreshmentModal(false);
    // For unsaved plans there is no redirect special-case here
  };

  if (!showRefreshmentModal) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded shadow-lg max-w-2xl w-full mx-4">
        <div className="p-4 border-b">
          <div className="text-lg font-semibold text-gray-900">Quick pit stop suggestions</div>
          {refreshmentNote ? <div className="text-sm text-gray-600 mt-1">{refreshmentNote}</div> : null}
        </div>
        <div className="px-4 pt-3">
          <label className="block text-sm font-medium mb-1">Insert at</label>
          <select
            className="w-full border rounded p-2"
            value={posIndex}
            onChange={(e) => setPosIndex(parseInt(e.target.value, 10))}
          >
            {stops.length > 0 && (
              <>
                <option value={0}>{`Before stop 1: ${stops[0]}`}</option>
                {stops.map((name: string, i: number) => {
                  const wLen = waypoints.length;
                  const afterIdx = i + 1 <= wLen ? i + 1 : wLen + 1; // after destination => wLen+1
                  return (
                    <option key={`after-${i}`} value={afterIdx}>{`After stop ${i + 1}: ${name}`}</option>
                  );
                })}
              </>
            )}
          </select>
        </div>
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {isLoadingAmenities ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-6 w-6 text-blue-600 animate-spin mb-3" />
              <p className="text-sm text-gray-600">Finding nearby amenities...</p>
            </div>
          ) : refreshmentItems && refreshmentItems.length ? (
            <ul className="space-y-3">
              {refreshmentItems.map((p: any, i: number) => (
                <li key={i} className="flex items-center">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="w-16 h-16 object-cover rounded mr-3" />
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 rounded mr-3" />
                  )}
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{p.name}</div>
                    <div className="text-xs text-gray-600">
                      {p.location?.address}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {p.external_place_id ? (
                      <a
                        href={`https://www.google.com/maps/place/?q=place_id:${p.external_place_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Details
                      </a>
                    ) : null}
                    <button
                      onClick={() => onAdd(p)}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded"
                    >
                      Add
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-gray-700">
              No obvious places found. Also look out for fruit/meat cutlet sellers near Panjim Library!
            </div>
          )}
        </div>
        <div className="p-4 border-t flex justify-end">
          <button
            onClick={() => {
              setShowRefreshmentModal(false);
              if (postSaveRedirectToTrips) {
                setPostSaveRedirectToTrips(false);
                router.push("/my-trips");
              }
            }}
            className="px-4 py-2 rounded border border-gray-300 text-gray-800 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


