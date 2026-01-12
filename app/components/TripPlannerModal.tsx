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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-3xl max-h-[90vh] overflow-y-auto border-4 border-[#4A7C59]">
        <h2 className="text-2xl font-semibold mb-6 text-[#6B5539]">
          {inEditMode ? "Edit trip" : "Plan trip"}
        </h2>
        <form onSubmit={onGetDirections} className="space-y-5">
          {/* Date */}
          <div>
            <label className="block font-medium mb-2 text-gray-700">Date</label>
            <input
              type="date"
              value={tripDate}
              onChange={(e) => setTripDate(e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-[#E8D4A8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A7C59] focus:border-[#4A7C59]"
            />
          </div>
          {/* Origin */}
          <div>
            <label className="block font-medium mb-2 text-gray-700">Origin</label>
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
                className="w-full px-4 py-2.5 border-2 border-[#E8D4A8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A7C59] focus:border-[#4A7C59]"
              />
            </Autocomplete>
            <label className="block text-sm mt-3 mb-1 text-gray-600">Leave by</label>
            <input
              type="time"
              value={originTime}
              onChange={(e) => setOriginTime(e.target.value)}
              className="w-full px-4 py-2 border-2 border-[#E8D4A8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A7C59] focus:border-[#4A7C59]"
            />
          </div>

          {/* + Add Stop Button */}
          <button
            type="button"
            onClick={onAddStop}
            className="btn-green text-white px-5 py-2.5 rounded-xl font-medium"
          >
            + Add Stop
          </button>

          {/* Dynamic Stops */}
          {waypoints.map((wp, idx) => (
            <div key={idx} className="bg-[#FAF3E0] p-4 rounded-xl space-y-3 border-2 border-[#E8D4A8]">
              <label className="block font-medium mb-1 text-gray-700">Stop {idx + 1}</label>
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
                  className="w-full px-4 py-2.5 border-2 border-[#E8D4A8] rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#4A7C59] focus:border-[#4A7C59]"
                />
              </Autocomplete>
              <div className="flex space-x-2">
                <div className="flex-1">
                  <label className="block text-sm mb-1 text-gray-600">Arrive by</label>
                  <input
                    type="time"
                    value={stopTimes[idx]?.arriveBy || ""}
                    onChange={(e) =>
                      onUpdateStopTime(idx, "arriveBy", e.target.value)
                    }
                    className="w-full px-3 py-2 border-2 border-[#E8D4A8] rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#4A7C59] focus:border-[#4A7C59]"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm mb-1 text-gray-600">Leave by</label>
                  <input
                    type="time"
                    value={stopTimes[idx]?.leaveBy || ""}
                    onChange={(e) =>
                      onUpdateStopTime(idx, "leaveBy", e.target.value)
                    }
                    className="w-full px-3 py-2 border-2 border-[#E8D4A8] rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#4A7C59] focus:border-[#4A7C59]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveStop(idx)}
                  className="btn-terracotta text-white px-3 py-2 rounded-xl mt-6"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}

          {/* Destination */}
          <div>
            <label className="block font-medium mb-2 text-gray-700">Destination</label>
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
                className="w-full px-4 py-2.5 border-2 border-[#E8D4A8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A7C59] focus:border-[#4A7C59]"
              />
            </Autocomplete>
            <label className="block text-sm mt-3 mb-1 text-gray-600">Arrive by</label>
            <input
              type="time"
              value={destinationTime}
              onChange={(e) => setDestinationTime(e.target.value)}
              className="w-full px-4 py-2 border-2 border-[#E8D4A8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A7C59] focus:border-[#4A7C59]"
            />
          </div>

          {/* Mode & Filters */}
          <div className="flex space-x-4">
            <div className="flex-1">
              <label className="block font-medium mb-2 text-gray-700">Mode of Transport</label>
              <select
                value={travelMode}
                onChange={(e) =>
                  setTravelMode(e.target.value as google.maps.TravelMode)
                }
                className="w-full px-4 py-2.5 border-2 border-[#E8D4A8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A7C59] focus:border-[#4A7C59] text-gray-700 bg-white"
              >
                <option value="DRIVING">Cab</option>
                <option value="TRANSIT">Bus</option>
                <option value="BICYCLING">Bike</option>
                <option value="WALKING">Walk</option>
              </select>
            </div>

            {(travelMode === "DRIVING" || travelMode === "TRANSIT") && (
              <div className="flex-1">
                <label className="block font-medium mb-2 text-gray-700">Filters</label>
                <select
                  value={filterOption}
                  onChange={(e) => setFilterOption(e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-[#E8D4A8] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A7C59] focus:border-[#4A7C59] text-gray-700 bg-white"
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
          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-glass text-gray-700 px-6 py-2.5 rounded-xl font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-green text-white px-6 py-2.5 rounded-xl font-medium"
            >
              {inEditMode ? "Save" : "Start Trippin"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
