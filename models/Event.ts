import mongoose from "mongoose";

// Dynamic events, activities, shows, pop-ups, etc.
// This model stores both scraped/fetched events from external APIs
// and manually created events

const EventSchema = new mongoose.Schema({
  name: { type: String, required: true },
  
  // Event categorization
  category: {
    type: String,
    enum: [
      "comedy_show",
      "music_concert",
      "art_exhibition",
      "food_popup",
      "market",
      "workshop",
      "festival",
      "sports",
      "nightlife",
      "theater",
      "dance_performance",
      "wellness",
      "tour",
      "conference",
      "other",
    ],
    required: true,
  },
  
  // More specific type
  subType: { type: String }, // e.g., "stand-up", "live band", "food truck", "craft fair"
  
  // Event timing
  eventDate: { type: Date, required: true },
  startTime: { type: String }, // "19:00"
  endTime: { type: String },   // "22:00"
  
  // Is it recurring?
  isRecurring: { type: Boolean, default: false },
  recurrencePattern: { type: String }, // "Every Saturday", "Weekends", "Daily"
  recurringUntil: { type: Date }, // End date for recurring events
  
  // Location
  location: {
    venueName: { type: String },
    address: { type: String },
    area: { type: String },     // "Panjim", "Calangute", etc.
    lat: { type: Number },
    lng: { type: Number },
  },
  
  description: { type: String },
  
  // Event details
  details: {
    // Pricing
    isFree: { type: Boolean, default: false },
    price: { type: String },        // "₹500", "₹1000-2000"
    ticketLink: { type: String },   // URL to buy tickets
    
    // Organizer
    organizer: { type: String },
    contactPhone: { type: String },
    contactEmail: { type: String },
    
    // Capacity & booking
    hasLimitedSeating: { type: Boolean, default: false },
    requiresBooking: { type: Boolean, default: false },
    
    // Audience
    ageRestriction: { type: String }, // "18+", "All ages", "Kids friendly"
    dresscode: { type: String },
    
    // Amenities
    hasFoodAndDrinks: { type: Boolean },
    hasParking: { type: Boolean },
    wheelchairAccessible: { type: Boolean },
  },
  
  // Media
  imageUrl: { type: String },
  images: [String],
  videoUrl: { type: String },
  
  // Links
  websiteUrl: { type: String },
  facebookEventUrl: { type: String },
  instagramUrl: { type: String },
  
  // Tags for better discovery
  tags: [String], // ["comedy", "weekend", "drinks", "outdoor", etc.]
  
  // External source (if fetched from API)
  externalSource: { type: String }, // "eventbrite", "insider", "bookmyshow", "manual"
  externalEventId: { type: String },
  
  // Popularity & engagement
  views: { type: Number, default: 0 },
  bookmarks: { type: Number, default: 0 },
  shares: { type: Number, default: 0 },
  
  // Status
  status: {
    type: String,
    enum: ["upcoming", "ongoing", "completed", "cancelled"],
    default: "upcoming",
  },
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  
  // Verification
  isVerified: { type: Boolean, default: false },
  verifiedAt: { type: Date },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Indexes for efficient queries
EventSchema.index({ eventDate: 1 });
EventSchema.index({ category: 1 });
EventSchema.index({ "location.area": 1 });
EventSchema.index({ tags: 1 });
EventSchema.index({ status: 1 });
EventSchema.index({ isActive: 1 });

// Compound index for date range queries
EventSchema.index({ eventDate: 1, isActive: 1, status: 1 });

export default mongoose.models.Event || mongoose.model("Event", EventSchema);
