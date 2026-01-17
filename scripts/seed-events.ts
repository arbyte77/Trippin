// Script to seed the database with sample events and activities
// Run with: npm run seed:events

import mongoose from "mongoose";
import Event from "../models/Event";
import { config } from "dotenv";
import path from "path";

// Load environment variables from .env.local
config({ path: path.resolve(__dirname, "../.env.local") });

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/trippin";

// Get dates for upcoming events
const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);

const thisWeekend = new Date(today);
const daysUntilFriday = (5 - today.getDay() + 7) % 7;
thisWeekend.setDate(today.getDate() + daysUntilFriday);

const nextWeek = new Date(today);
nextWeek.setDate(today.getDate() + 7);

const twoWeeks = new Date(today);
twoWeeks.setDate(today.getDate() + 14);

const sampleEvents = [
  // Comedy Shows
  {
    name: "Stand-Up Comedy Night with Varun Thakur",
    category: "comedy_show",
    subType: "stand-up",
    eventDate: thisWeekend,
    startTime: "20:00",
    endTime: "22:00",
    location: {
      venueName: "SinQ Beach Club",
      address: "Candolim Beach, Goa",
      area: "Candolim",
      lat: 15.5189,
      lng: 73.7619,
    },
    description: "Join us for a hilarious evening with comedian Varun Thakur! Get ready for non-stop laughter with his unique brand of observational comedy.",
    details: {
      isFree: false,
      price: "₹799",
      ticketLink: "https://insider.in/comedy-goa",
      organizer: "The Comedy Store Goa",
      hasLimitedSeating: true,
      requiresBooking: true,
      ageRestriction: "18+",
      hasFoodAndDrinks: true,
      hasParking: true,
    },
    imageUrl: "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=400",
    tags: ["comedy", "nightlife", "weekend", "drinks"],
    isFeatured: true,
    isVerified: true,
  },
  {
    name: "Open Mic Comedy Night",
    category: "comedy_show",
    subType: "open-mic",
    eventDate: tomorrow,
    startTime: "19:30",
    endTime: "21:30",
    location: {
      venueName: "Caravela Cafe & Bistro",
      address: "Fontainhas, Panjim",
      area: "Panjim",
      lat: 15.4909,
      lng: 73.8278,
    },
    description: "Amateur and professional comedians take the stage! Come support local talent and enjoy a fun evening.",
    details: {
      isFree: true,
      organizer: "Goa Comedy Club",
      requiresBooking: false,
      ageRestriction: "All ages",
      hasFoodAndDrinks: true,
    },
    imageUrl: "https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=400",
    tags: ["comedy", "free", "local", "open-mic"],
    isFeatured: false,
    isVerified: true,
  },

  // Music Concerts
  {
    name: "Sunburn Arena ft. Alan Walker",
    category: "music_concert",
    subType: "electronic",
    eventDate: nextWeek,
    startTime: "18:00",
    endTime: "23:00",
    location: {
      venueName: "Vagator Ground",
      address: "Vagator Beach Road, Vagator",
      area: "Vagator",
      lat: 15.6007,
      lng: 73.7342,
    },
    description: "The biggest EDM event in Goa! Alan Walker brings his world-famous sounds to Vagator. Early bird tickets selling fast!",
    details: {
      isFree: false,
      price: "₹2999-₹7999",
      ticketLink: "https://sunburn.in/arena",
      organizer: "Sunburn",
      hasLimitedSeating: true,
      requiresBooking: true,
      ageRestriction: "18+",
      hasFoodAndDrinks: true,
      hasParking: true,
      wheelchairAccessible: false,
    },
    imageUrl: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400",
    tags: ["music", "edm", "nightlife", "festival"],
    isFeatured: true,
    isVerified: true,
  },
  {
    name: "Live Jazz & Blues Evening",
    category: "music_concert",
    subType: "jazz",
    eventDate: thisWeekend,
    startTime: "19:00",
    endTime: "22:00",
    isRecurring: true,
    recurrencePattern: "Every Saturday",
    location: {
      venueName: "Black Vanilla",
      address: "Salvador do Mundo, Loutolim",
      area: "Loutolim",
      lat: 15.3472,
      lng: 73.9594,
    },
    description: "Smooth jazz and soulful blues every Saturday night. Enjoy live music in an intimate garden setting.",
    details: {
      isFree: false,
      price: "₹500",
      organizer: "Black Vanilla Music Series",
      requiresBooking: true,
      ageRestriction: "All ages",
      hasFoodAndDrinks: true,
      hasParking: true,
    },
    imageUrl: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=400",
    tags: ["jazz", "live-music", "weekend", "romantic"],
    isFeatured: false,
    isVerified: true,
  },

  // Food Pop-ups
  {
    name: "Goan Seafood Festival Pop-Up",
    category: "food_popup",
    subType: "seafood",
    eventDate: thisWeekend,
    startTime: "12:00",
    endTime: "22:00",
    location: {
      venueName: "Fisherman's Wharf",
      address: "Cavelossim Beach",
      area: "Cavelossim",
      lat: 15.1667,
      lng: 73.9333,
    },
    description: "Celebrate Goan seafood! Fresh catch, traditional recipes, and beachside dining. Features special catches from local fishermen.",
    details: {
      isFree: true,
      price: "₹500-₹1500 per dish",
      organizer: "Goa Food Festival",
      requiresBooking: false,
      ageRestriction: "All ages",
      hasFoodAndDrinks: true,
      hasParking: true,
      wheelchairAccessible: true,
    },
    imageUrl: "https://images.unsplash.com/photo-1559737558-2f5a35f4523c?w=400",
    tags: ["food", "seafood", "goan", "weekend", "beach"],
    isFeatured: true,
    isVerified: true,
  },
  {
    name: "Street Food Market - Panjim Edition",
    category: "food_popup",
    subType: "street-food",
    eventDate: tomorrow,
    startTime: "17:00",
    endTime: "23:00",
    location: {
      venueName: "Campal Ground",
      address: "Campal, Panjim",
      area: "Panjim",
      lat: 15.4951,
      lng: 73.8281,
    },
    description: "Best street food vendors from across Goa in one place! Try everything from pao bhaji to xacuti.",
    details: {
      isFree: true,
      price: "₹50-₹300",
      organizer: "Goa Street Food Association",
      requiresBooking: false,
      ageRestriction: "All ages",
      hasFoodAndDrinks: true,
      hasParking: true,
    },
    imageUrl: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400",
    tags: ["food", "street-food", "local", "affordable"],
    isFeatured: false,
    isVerified: true,
  },

  // Markets
  {
    name: "Saturday Night Market Arpora",
    category: "market",
    subType: "night-market",
    eventDate: thisWeekend,
    startTime: "18:00",
    endTime: "00:00",
    isRecurring: true,
    recurrencePattern: "Every Saturday",
    location: {
      venueName: "Arpora Night Market",
      address: "Arpora, Bardez",
      area: "Arpora",
      lat: 15.5722,
      lng: 73.7744,
    },
    description: "The iconic Saturday Night Market! Handicrafts, clothes, jewelry, food stalls, live music, and more. A must-visit in Goa!",
    details: {
      isFree: true,
      organizer: "Arpora Market",
      requiresBooking: false,
      ageRestriction: "All ages",
      hasFoodAndDrinks: true,
      hasParking: true,
      wheelchairAccessible: false,
    },
    imageUrl: "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=400",
    tags: ["market", "shopping", "nightlife", "weekend", "handicrafts"],
    isFeatured: true,
    isVerified: true,
  },
  {
    name: "Anjuna Flea Market",
    category: "market",
    subType: "flea-market",
    eventDate: thisWeekend,
    startTime: "08:00",
    endTime: "18:00",
    isRecurring: true,
    recurrencePattern: "Every Wednesday",
    location: {
      venueName: "Anjuna Beach",
      address: "Anjuna, Bardez",
      area: "Anjuna",
      lat: 15.5733,
      lng: 73.7403,
    },
    description: "Historic flea market with Tibetan, Kashmiri, and Goan vendors. Great for souvenirs, clothes, and jewelry!",
    details: {
      isFree: true,
      organizer: "Anjuna Village Panchayat",
      requiresBooking: false,
      ageRestriction: "All ages",
      hasFoodAndDrinks: true,
      hasParking: true,
    },
    imageUrl: "https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=400",
    tags: ["market", "shopping", "beach", "souvenirs"],
    isFeatured: false,
    isVerified: true,
  },

  // Art Exhibitions
  {
    name: "Contemporary Goan Art Exhibition",
    category: "art_exhibition",
    subType: "painting",
    eventDate: nextWeek,
    startTime: "10:00",
    endTime: "19:00",
    location: {
      venueName: "Sunaparanta Goa Centre for the Arts",
      address: "Altinho, Panjim",
      area: "Panjim",
      lat: 15.4985,
      lng: 73.8273,
    },
    description: "Showcasing works from 15 contemporary Goan artists. From traditional to avant-garde, explore Goa through local eyes.",
    details: {
      isFree: true,
      organizer: "Sunaparanta",
      requiresBooking: false,
      ageRestriction: "All ages",
      hasFoodAndDrinks: true,
      wheelchairAccessible: true,
    },
    imageUrl: "https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=400",
    tags: ["art", "exhibition", "culture", "free"],
    isFeatured: false,
    isVerified: true,
  },

  // Workshops
  {
    name: "Traditional Goan Cooking Workshop",
    category: "workshop",
    subType: "cooking",
    eventDate: thisWeekend,
    startTime: "10:00",
    endTime: "14:00",
    location: {
      venueName: "Sahakari Spice Farm",
      address: "Ponda",
      area: "Ponda",
      lat: 15.4015,
      lng: 74.0151,
    },
    description: "Learn to cook authentic Goan dishes! Includes spice farm tour, cooking class, and lunch. Limited to 20 participants.",
    details: {
      isFree: false,
      price: "₹1499",
      ticketLink: "https://sahakari.com/workshop",
      organizer: "Sahakari Spice Farm",
      hasLimitedSeating: true,
      requiresBooking: true,
      ageRestriction: "10+",
      hasFoodAndDrinks: true,
      hasParking: true,
    },
    imageUrl: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400",
    tags: ["workshop", "cooking", "goan", "family-friendly"],
    isFeatured: false,
    isVerified: true,
  },
  {
    name: "Pottery & Ceramics Workshop",
    category: "workshop",
    subType: "crafts",
    eventDate: tomorrow,
    startTime: "15:00",
    endTime: "18:00",
    location: {
      venueName: "Ancestral Goa",
      address: "Loutolim",
      area: "Loutolim",
      lat: 15.3472,
      lng: 73.9594,
    },
    description: "Hands-on pottery workshop with a local artisan. Create your own ceramic piece to take home!",
    details: {
      isFree: false,
      price: "₹899",
      organizer: "Ancestral Goa",
      hasLimitedSeating: true,
      requiresBooking: true,
      ageRestriction: "All ages",
      hasFoodAndDrinks: true,
      hasParking: true,
    },
    imageUrl: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400",
    tags: ["workshop", "crafts", "pottery", "art"],
    isFeatured: false,
    isVerified: true,
  },

  // Festivals
  {
    name: "Sunset Music Festival",
    category: "festival",
    subType: "music-festival",
    eventDate: twoWeeks,
    startTime: "16:00",
    endTime: "00:00",
    location: {
      venueName: "Ashwem Beach",
      address: "Ashwem, Pernem",
      area: "Ashwem",
      lat: 15.7161,
      lng: 73.7108,
    },
    description: "3 stages, 20 artists, sunset vibes! Electronic, indie, and world music on the beach. Full-day festival with art installations.",
    details: {
      isFree: false,
      price: "₹1999",
      ticketLink: "https://sunsetfest.goa",
      organizer: "Sunset Festival Goa",
      hasLimitedSeating: false,
      requiresBooking: true,
      ageRestriction: "18+",
      hasFoodAndDrinks: true,
      hasParking: true,
    },
    imageUrl: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400",
    tags: ["festival", "music", "beach", "sunset"],
    isFeatured: true,
    isVerified: true,
  },

  // Wellness
  {
    name: "Beach Yoga & Meditation Session",
    category: "wellness",
    subType: "yoga",
    eventDate: tomorrow,
    startTime: "06:30",
    endTime: "08:00",
    isRecurring: true,
    recurrencePattern: "Daily",
    location: {
      venueName: "Palolem Beach",
      address: "Palolem, Canacona",
      area: "Palolem",
      lat: 15.0100,
      lng: 74.0231,
    },
    description: "Start your day with sunrise yoga on the beach. All levels welcome. Mats provided.",
    details: {
      isFree: false,
      price: "₹300",
      organizer: "Palolem Yoga Shala",
      requiresBooking: false,
      ageRestriction: "All ages",
      hasFoodAndDrinks: false,
      wheelchairAccessible: false,
    },
    imageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400",
    tags: ["wellness", "yoga", "beach", "morning", "meditation"],
    isFeatured: false,
    isVerified: true,
  },

  // Nightlife
  {
    name: "Full Moon Party - Goa Edition",
    category: "nightlife",
    subType: "beach-party",
    eventDate: nextWeek,
    startTime: "21:00",
    endTime: "04:00",
    location: {
      venueName: "Curlies Beach Shack",
      address: "Anjuna Beach",
      area: "Anjuna",
      lat: 15.5733,
      lng: 73.7403,
    },
    description: "Legendary full moon party at Curlies! International DJs, fire dancers, and non-stop music till sunrise.",
    details: {
      isFree: false,
      price: "₹500",
      organizer: "Curlies",
      requiresBooking: false,
      ageRestriction: "21+",
      hasFoodAndDrinks: true,
      hasParking: true,
    },
    imageUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400",
    tags: ["nightlife", "party", "beach", "edm", "full-moon"],
    isFeatured: true,
    isVerified: true,
  },

  // Theater
  {
    name: "Shakespearean Nights - Romeo & Juliet",
    category: "theater",
    subType: "drama",
    eventDate: nextWeek,
    startTime: "19:30",
    endTime: "22:00",
    location: {
      venueName: "Kala Academy",
      address: "Campal, Panjim",
      area: "Panjim",
      lat: 15.4951,
      lng: 73.8281,
    },
    description: "Classic Shakespeare performed by the Goa Theater Company. A beautiful adaptation set in contemporary Goa.",
    details: {
      isFree: false,
      price: "₹300-₹800",
      ticketLink: "https://kalaacademy.goa.gov.in",
      organizer: "Kala Academy",
      hasLimitedSeating: true,
      requiresBooking: true,
      ageRestriction: "All ages",
      hasFoodAndDrinks: true,
      hasParking: true,
      wheelchairAccessible: true,
    },
    imageUrl: "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=400",
    tags: ["theater", "drama", "shakespeare", "culture"],
    isFeatured: false,
    isVerified: true,
  },

  // Tours
  {
    name: "Heritage Walking Tour - Fontainhas",
    category: "tour",
    subType: "walking-tour",
    eventDate: tomorrow,
    startTime: "09:00",
    endTime: "12:00",
    isRecurring: true,
    recurrencePattern: "Daily",
    location: {
      venueName: "Fontainhas Latin Quarter",
      address: "Fontainhas, Panjim",
      area: "Panjim",
      lat: 15.4909,
      lng: 73.8278,
    },
    description: "Explore Goa's Portuguese heritage! 3-hour guided walk through colorful Fontainhas, including azulejo art and heritage homes.",
    details: {
      isFree: false,
      price: "₹500",
      organizer: "Goa Heritage Tours",
      hasLimitedSeating: true,
      requiresBooking: true,
      ageRestriction: "All ages",
      hasFoodAndDrinks: false,
      wheelchairAccessible: false,
    },
    imageUrl: "https://images.unsplash.com/photo-1609137144813-7d9921338f24?w=400",
    tags: ["tour", "heritage", "walking", "culture", "panjim"],
    isFeatured: false,
    isVerified: true,
  },

  // Sports
  {
    name: "Beach Football Tournament",
    category: "sports",
    subType: "football",
    eventDate: thisWeekend,
    startTime: "16:00",
    endTime: "20:00",
    location: {
      venueName: "Baga Beach",
      address: "Baga, Bardez",
      area: "Baga",
      lat: 15.5556,
      lng: 73.7515,
    },
    description: "Annual beach football tournament! Teams of 5, all skill levels welcome. Registration closes 1 hour before.",
    details: {
      isFree: true,
      organizer: "Goa Beach Sports Association",
      requiresBooking: false,
      ageRestriction: "16+",
      hasFoodAndDrinks: true,
      hasParking: true,
    },
    imageUrl: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=400",
    tags: ["sports", "football", "beach", "tournament", "free"],
    isFeatured: false,
    isVerified: true,
  },
];

async function seedEvents() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected!");

    console.log("Clearing existing events...");
    await Event.deleteMany({});

    console.log("Seeding events...");
    const inserted = await Event.insertMany(sampleEvents);
    console.log(`✅ Successfully seeded ${inserted.length} events!`);

    // Show breakdown
    const breakdown: { [key: string]: number } = {};
    inserted.forEach((e) => {
      breakdown[e.category] = (breakdown[e.category] || 0) + 1;
    });

    console.log("\n📊 Event breakdown:");
    Object.entries(breakdown).forEach(([category, count]) => {
      console.log(`  ${category}: ${count}`);
    });

    console.log("\n🎉 Featured events:");
    inserted.filter((e) => e.isFeatured).forEach((e) => {
      console.log(`  - ${e.name} (${e.category})`);
    });
  } catch (error) {
    console.error("Error seeding events:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\nDatabase connection closed.");
  }
}

// Run the seed function
seedEvents();
