"use client";

import React, { FormEvent, useRef } from "react";
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
  setDestination: (val: string) => void;
  destinationTime: string;
  setDestinationTime: (val: string) => void;
  travelMode: google.maps.TravelMode;
  setTravelMode: (mode: google.maps.TravelMode) => void;
  filterOption: string;
  setFilterOption: (option: string) => void;
  onGetDirections: (e: FormEvent) => void;
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
  stopTimes,
  onAddStop,
  onRemoveStop,
  onUpdateStop,
  onUpdateStopTime,
  destination,
  setDestination,
  destinationTime,
  setDestinationTime,
  travelMode,
  setTravelMode,
  filterOption,
  setFilterOption,
  onGetDirections,
}: TripPlannerModalProps) {
  if (!showModal) return null;

  const originRef = useRef<google.maps.places.Autocomplete | null>(null);
  const destinationRef = useRef<google.maps.places.Autocomplete | null>(null);
  const waypointRefs = useRef<(google.maps.places.Autocomplete | null)[]>(
    []
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white text-black rounded shadow-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Plan Your Trip</h2>
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
                setOrigin(place?.formatted_address || "");
              }}
            >
              <input
                type="text"
                defaultValue={origin}
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
          {waypoints.map((_, idx) => (
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
                setDestination(place?.formatted_address || "");
              }}
            >
              <input
                type="text"
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
              Start Trippin
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
