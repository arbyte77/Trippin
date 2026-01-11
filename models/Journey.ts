import mongoose from "mongoose";

const JourneySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  start: { type: String, required: true },
  destination: { type: String, required: true },
  destinationName: { type: String, default: "" }, // Display name for destination (if different from destination value)
  waypoints: [{ type: String }],
  waypointNamesJson: { type: String, default: "{}" }, // JSON string of waypoint index -> display name mapping
  stopTimes: [
    {
      arriveBy: { type: String },
      leaveBy: { type: String },
    },
  ],
  travelMode: { type: String, required: true, default: "driving" },
  filterOption: { type: String, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  itinerary: { type: String },
  createdAt: { type: Date, default: Date.now },
  
  // ===== ROUTE CACHING FIELDS =====
  // Stores serialized Google DirectionsResult for instant loading of saved routes
  cachedDirections: { type: String, default: null }, // JSON string of DirectionsResult (for driving/walking)
  cachedDirectionsSegments: { type: String, default: null }, // JSON string of DirectionsResult[] (for transit)
  cachedSegmentsByLeg: [{ type: Number }], // Number of segments per leg (for transit)
  cachedItinerary: { type: String, default: null }, // JSON string of structured itinerary items
  // Hash of route parameters to detect when cache needs invalidation
  // Format: "origin|destination|waypoints.join(',')|travelMode|filterOption"
  routeCacheKey: { type: String, default: null },
  cachedAt: { type: Date, default: null }, // When route was cached
});

export default mongoose.models.Journey || mongoose.model("Journey", JourneySchema);
