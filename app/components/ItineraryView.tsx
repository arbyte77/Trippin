"use client";
import React from "react";

interface ItineraryItem {
  title: string;
  description: string;
}

interface ItineraryViewProps {
  showItinerary: boolean;
  itinerary: ItineraryItem[];
  onSaveTrip: () => void;
  onShowMap: () => void;
}

export default function ItineraryView({
  showItinerary,
  itinerary,
  onSaveTrip,
  onShowMap,
}: ItineraryViewProps) {
  if (!showItinerary) return null;
  return (
    <div className="p-6 bg-white">
      <h2 className="text-2xl font-bold mb-4 text-gray-900">Your Itinerary</h2>
      {itinerary.map((item, idx) => (
        <div key={idx} className="mb-4 border p-4 rounded shadow bg-gray-50">
          <h3 className="text-xl font-bold text-gray-900">{item.title}</h3>
          <p className="text-gray-800 whitespace-pre-line">{item.description}</p>
        </div>
      ))}
      <div className="flex justify-end space-x-4">
        <button
          onClick={onSaveTrip}
          className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-white"
        >
          Save Trip
        </button>
        <button
          onClick={onShowMap}
          className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded text-white"
        >
          Map View
        </button>
      </div>
    </div>
  );
}
