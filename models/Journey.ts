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
});

export default mongoose.models.Journey || mongoose.model("Journey", JourneySchema);
