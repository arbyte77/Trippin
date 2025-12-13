"use client";

import React, { FormEvent, useRef, useEffect } from "react";
import { useTripContext } from "../context/TripContext";
import { Autocomplete } from "@react-google-maps/api";

interface StopTimes {
  arriveBy: string;
  leaveBy: string;
}

interface TripPlannerModalProps {
  showModal: boolean;
  onClose: () => void;
  tripDate: string;
  setTripDate: (val: string) => void;
  origin: string;
  setOrigin: (val: string) => void;
  originTime: string;
  setOriginTime: (val: string) => void;
  waypoints: string[];
  waypointNames: Record<number, string>;
  stopTimes: StopTimes[];
  onAddStop: () => void;
  onRemoveStop: (index: number) => void;
  onUpdateStop: (index: number, value: string) => void;
  onUpdateStopTime: (
    index: number,
    field: "arriveBy" | "leaveBy",
    value: string
  ) => void;
  destination: string;
  destinationName: string;
  setDestination: (val: string) => void;
  destinationTime: string;
  setDestinationTime: (val: string) => void;
  travelMode: google.maps.TravelMode;
  setTravelMode: (mode: google.maps.TravelMode) => void;
  filterOption: string;
  setFilterOption: (option: string) => void;
  onGetDirections: (e: FormEvent) => void;
  isEditing?: boolean;
}


export default function TripPlannerModal({
  showModal,
  onClose,
  tripDate,
  setTripDate,
  origin,
  setOrigin,
  originTime,
  setOriginTime,
  waypoints,
  waypointNames,
  stopTimes,
  onAddStop,
  onRemoveStop,
  onUpdateStop,
  onUpdateStopTime,
  destination,
  destinationName,
  setDestination,
  destinationTime,
  setDestinationTime,
  travelMode,
  setTravelMode,
  filterOption,
  setFilterOption,
  onGetDirections,
  isEditing = false,
}: TripPlannerModalProps) {
  // All hooks must be at the top, before any return
  const { editingJourneyId } = useTripContext();
  const originRef = useRef<google.maps.places.Autocomplete | null>(null);
  const destinationRef = useRef<google.maps.places.Autocomplete | null>(null);
  const waypointRefs = useRef<(google.maps.places.Autocomplete | null)[]>([]);
  const waypointInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const destinationInputRef = useRef<HTMLInputElement | null>(null);
  
  // Determine if we're in editing mode (from prop or context)
  const inEditMode = isEditing || !!editingJourneyId;

  useEffect(() => {
    if (destinationInputRef.current) {
      // Prefer friendly name over coordinates
      destinationInputRef.current.value = destinationName || destination;
    }
  }, [destination, destinationName]);

  // Sync waypoint input values when waypoints change (e.g., when editing a trip)
  // Use waypointNames for display if available, otherwise fall back to waypoints
  useEffect(() => {
    waypoints.forEach((wp, idx) => {
      if (waypointInputRefs.current[idx]) {
        // Prefer friendly name over coordinates - try both numeric and string keys
        const name = waypointNames[idx] || waypointNames[String(idx)] || wp;
        waypointInputRefs.current[idx]!.value = name;
      }
    });
  }, [waypoints, waypointNames]);

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white text-black rounded shadow-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">{inEditMode ? "Edit Trip" : "Plan Your Trip"}</h2>
        <form onSubmit={onGetDirections} className="space-y-4">
          {/* Date */}
          <div>
            <label className="block font-medium mb-1">Date</label>
            <input
              type="date"
              value={tripDate}
              onChange={(e) => setTripDate(e.target.value)}
              className="w-full px-2 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-gray-700"
            />
          </div>
          {/* Origin */}
          <div>
            <label className="block font-medium mb-1">Origin</label>
            <Autocomplete
              onLoad={(auto) => (originRef.current = auto)}
              onPlaceChanged={() => {
                const place = originRef.current?.getPlace();
                if (place?.formatted_address) {
                  setOrigin(place.formatted_address);
                }
              }}
            >
              <input
                type="text"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="Enter origin"
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
            onClick={onAddStop}
            className="bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded text-white"
          >
            + Add Stop
          </button>

          {/* Dynamic Stops */}
          {waypoints.map((wp, idx) => (
            <div key={idx} className="border p-2 rounded space-y-2">
              <label className="block font-medium mb-1">{`Stop ${idx + 1}`}</label>
              <Autocomplete
                onLoad={(auto) => (waypointRefs.current[idx] = auto)}
                onPlaceChanged={() => {
                  const place = waypointRefs.current[idx]?.getPlace();
                  onUpdateStop(idx, place?.formatted_address || "");
                }}
              >
                <input
                  type="text"
                  ref={(el) => (waypointInputRefs.current[idx] = el)}
                  defaultValue={waypointNames[idx] || waypointNames[String(idx)] || wp}
                  onChange={(e) => onUpdateStop(idx, e.target.value)}
                  placeholder={`Enter stop ${idx + 1}`}
                  className="w-full px-2 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-gray-700"
                />
              </Autocomplete>
              <div className="flex space-x-2">
                <div>
                  <label className="block text-sm">Arrive by</label>
                  <input
                    type="time"
                    value={stopTimes[idx]?.arriveBy || ""}
                    onChange={(e) =>
                      onUpdateStopTime(idx, "arriveBy", e.target.value)
                    }
                    className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm">Leave by</label>
                  <input
                    type="time"
                    value={stopTimes[idx]?.leaveBy || ""}
                    onChange={(e) =>
                      onUpdateStopTime(idx, "leaveBy", e.target.value)
                    }
                    className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-gray-700"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveStop(idx)}
                  className="bg-red-500 hover:bg-red-600 px-2 py-1 rounded text-white"
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
              onLoad={(auto) => (destinationRef.current = auto)}
              onPlaceChanged={() => {
                const place = destinationRef.current?.getPlace();
                if (place?.formatted_address) {
                  setDestination(place.formatted_address);
                }
              }}
            >
              <input
                type="text"
                ref={destinationInputRef}
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Enter destination"
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

          {/* Mode & Filters */}
          <div className="flex space-x-4">
            <div className="flex-1">
              <label className="block font-medium mb-1">Mode of Transport</label>
              <select
                value={travelMode}
                onChange={(e) =>
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
              <div className="flex-1">
                <label className="block font-medium mb-1">Filters</label>
                <select
                  value={filterOption}
                  onChange={(e) => setFilterOption(e.target.value)}
                  className="w-full px-2 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-gray-700"
                >
                  {travelMode === "DRIVING" ? (
                    <>
                      <option value="BEST_ROUTE">Best Route</option>
                      <option value="NO_TOLL">No Toll</option>
                    </>
                  ) : (
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

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-500 hover:bg-gray-600 px-4 py-2 rounded text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white"
            >
              {inEditMode ? "Save" : "Start Trippin"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
