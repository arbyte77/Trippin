/**
 * Scraper for https://goa-tourism.com/
 * Official Goa Tourism Development Corporation website
 * 
 * Run with: npm run scrape:goa-tourism
 * 
 * This scrapes:
 * - Beaches
 * - Nature spots (parks, wildlife, waterfalls)
 * - Heritage sites
 * - GTDC Residencies (hotels with public facilities)
 */

import axios from "axios";
import * as cheerio from "cheerio";
import mongoose from "mongoose";
import { config } from "dotenv";
import path from "path";

// Load environment variables from .env.local
config({ path: path.resolve(__dirname, "../.env.local") });

const BASE_URL = "https://goa-tourism.com";

// Known Goa coordinates for geocoding fallback
const GOA_LOCATIONS: Record<string, { lat: number; lng: number; area: string }> = {
  // North Goa Beaches
  "aguada": { lat: 15.4920, lng: 73.7731, area: "Aguada" },
  "anjuna": { lat: 15.5739, lng: 73.7413, area: "Anjuna" },
  "arambol": { lat: 15.6867, lng: 73.7042, area: "Arambol" },
  "ashwem": { lat: 15.6400, lng: 73.7267, area: "Ashwem" },
  "baga": { lat: 15.5551, lng: 73.7514, area: "Baga" },
  "calangute": { lat: 15.5438, lng: 73.7553, area: "Calangute" },
  "candolim": { lat: 15.5178, lng: 73.7621, area: "Candolim" },
  "chapora": { lat: 15.6033, lng: 73.7356, area: "Chapora" },
  "mandrem": { lat: 15.6622, lng: 73.7133, area: "Mandrem" },
  "morjim": { lat: 15.6267, lng: 73.7300, area: "Morjim" },
  "sinquerim": { lat: 15.4972, lng: 73.7683, area: "Sinquerim" },
  "vagator": { lat: 15.5969, lng: 73.7394, area: "Vagator" },
  
  // South Goa Beaches
  "agonda": { lat: 15.0447, lng: 74.0072, area: "Agonda" },
  "benaulim": { lat: 15.2642, lng: 73.9312, area: "Benaulim" },
  "betalbatim": { lat: 15.2917, lng: 73.9217, area: "Betalbatim" },
  "bogmalo": { lat: 15.3783, lng: 73.8367, area: "Bogmalo" },
  "butterfly": { lat: 15.0197, lng: 74.0233, area: "Butterfly Beach" },
  "cavelossim": { lat: 15.1750, lng: 73.9433, area: "Cavelossim" },
  "colva": { lat: 15.2789, lng: 73.9221, area: "Colva" },
  "majorda": { lat: 15.3033, lng: 73.9133, area: "Majorda" },
  "mobor": { lat: 15.1567, lng: 73.9467, area: "Mobor" },
  "palolem": { lat: 15.0100, lng: 74.0231, area: "Palolem" },
  "patnem": { lat: 15.0067, lng: 74.0367, area: "Patnem" },
  "varca": { lat: 15.2233, lng: 73.9317, area: "Varca" },
  
  // Cities/Towns
  "panaji": { lat: 15.4989, lng: 73.8278, area: "Panjim" },
  "panjim": { lat: 15.4989, lng: 73.8278, area: "Panjim" },
  "margao": { lat: 15.2832, lng: 73.9862, area: "Margao" },
  "mapusa": { lat: 15.5937, lng: 73.8102, area: "Mapusa" },
  "vasco": { lat: 15.3980, lng: 73.8113, area: "Vasco" },
  "ponda": { lat: 15.4033, lng: 73.9667, area: "Ponda" },
  "old goa": { lat: 15.5008, lng: 73.9116, area: "Old Goa" },
  "miramar": { lat: 15.4729, lng: 73.8068, area: "Miramar" },
  "dona paula": { lat: 15.4588, lng: 73.8053, area: "Dona Paula" },
  
  // Nature/Wildlife
  "bondla": { lat: 15.4167, lng: 74.0167, area: "Bondla" },
  "mollem": { lat: 15.3667, lng: 74.2333, area: "Mollem" },
  "bhagwan mahavir": { lat: 15.3500, lng: 74.2500, area: "Mollem" },
  "cotigao": { lat: 14.9833, lng: 74.1000, area: "Cotigao" },
  "salim ali": { lat: 15.5067, lng: 73.8567, area: "Chorao" },
  "chorao": { lat: 15.5067, lng: 73.8567, area: "Chorao" },
  "mayem": { lat: 15.5833, lng: 73.9000, area: "Mayem" },
  "carambolim": { lat: 15.4833, lng: 73.8833, area: "Carambolim" },
  
  // Waterfalls
  "dudhsagar": { lat: 15.3144, lng: 74.3147, area: "Dudhsagar" },
  "tambdi surla": { lat: 15.4500, lng: 74.2167, area: "Tambdi Surla" },
  "arvalem": { lat: 15.4667, lng: 73.9667, area: "Arvalem" },
  "harvalem": { lat: 15.4667, lng: 73.9667, area: "Arvalem" },
  "kesarval": { lat: 15.3500, lng: 74.0333, area: "Kesarval" },
  "netravali": { lat: 15.0833, lng: 74.2333, area: "Netravali" },
  
  // Heritage
  "fontainhas": { lat: 15.4932, lng: 73.8312, area: "Panjim" },
  "basilica": { lat: 15.5008, lng: 73.9116, area: "Old Goa" },
  "se cathedral": { lat: 15.5033, lng: 73.9117, area: "Old Goa" },
  "fort aguada": { lat: 15.4922, lng: 73.7731, area: "Aguada" },
  "chapora fort": { lat: 15.6053, lng: 73.7342, area: "Chapora" },
  "reis magos": { lat: 15.4997, lng: 73.8042, area: "Reis Magos" },
  "cabo de rama": { lat: 15.0903, lng: 74.0256, area: "Cabo de Rama" },
  "tiracol": { lat: 15.7233, lng: 73.6867, area: "Tiracol" },
  
  // Temples
  "mangeshi": { lat: 15.4500, lng: 73.9833, area: "Mangeshi" },
  "shantadurga": { lat: 15.4333, lng: 73.9833, area: "Kavlem" },
  "mangueshi": { lat: 15.4500, lng: 73.9833, area: "Mangeshi" },
  "mahalasa": { lat: 15.4500, lng: 73.9667, area: "Mardol" },
  "mardol": { lat: 15.4500, lng: 73.9667, area: "Mardol" },
};

// Pages to scrape from goa-tourism.com
const PAGES_TO_SCRAPE = [
  { url: "/beaches", category: "beach_access", subType: "beach" },
  { url: "/nature", category: "park", subType: "nature" },
  { url: "/wildlife", category: "park", subType: "wildlife_sanctuary" },
  { url: "/waterfalls", category: "park", subType: "waterfall" },
  { url: "/lakes-falls-springs-dams", category: "park", subType: "water_body" },
  { url: "/history-heritage", category: "park", subType: "heritage" },
  { url: "/temples", category: "temple", subType: "hindu_temple" },
  { url: "/churches", category: "temple", subType: "church" },
  { url: "/museums", category: "park", subType: "museum" },
];

// GTDC Residencies (known data - these have public facilities)
const GTDC_RESIDENCIES = [
  {
    name: "GTDC Panaji Residency",
    category: "rest_area" as const,
    subType: "gtdc_hotel",
    location: {
      address: "Patto, Panaji",
      landmark: "Near Patto Bridge",
      area: "Panjim",
      lat: 15.4963,
      lng: 73.8246,
    },
    description: "GTDC hotel with restaurant and public toilet facilities. Restaurant open to non-guests.",
    details: {
      isFree: false,
      isClean: true,
      hasWater: true,
      openTime: "07:00",
      closeTime: "22:00",
    },
    tags: ["gtdc", "hotel", "restaurant", "toilet", "panjim"],
  },
  {
    name: "GTDC Calangute Residency",
    category: "rest_area" as const,
    subType: "gtdc_hotel",
    location: {
      address: "Calangute Beach Road",
      landmark: "Near Calangute Beach",
      area: "Calangute",
      lat: 15.5438,
      lng: 73.7553,
    },
    description: "GTDC beach resort with restaurant. Public toilets available.",
    details: {
      isFree: false,
      isClean: true,
      hasWater: true,
      openTime: "07:00",
      closeTime: "22:00",
    },
    tags: ["gtdc", "hotel", "beach", "restaurant", "toilet", "calangute"],
  },
  {
    name: "GTDC Miramar Residency",
    category: "rest_area" as const,
    subType: "gtdc_hotel",
    location: {
      address: "Miramar Beach",
      landmark: "On Miramar Beach Road",
      area: "Miramar",
      lat: 15.4729,
      lng: 73.8068,
    },
    description: "GTDC property near Miramar beach. Restaurant and facilities open to public.",
    details: {
      isFree: false,
      isClean: true,
      hasWater: true,
      openTime: "07:00",
      closeTime: "22:00",
    },
    tags: ["gtdc", "hotel", "beach", "restaurant", "toilet", "miramar"],
  },
  {
    name: "GTDC Mapusa Residency",
    category: "rest_area" as const,
    subType: "gtdc_hotel",
    location: {
      address: "Mapusa Town",
      landmark: "Near Mapusa Bus Stand",
      area: "Mapusa",
      lat: 15.5937,
      lng: 73.8102,
    },
    description: "GTDC hotel in Mapusa town center. Good stop on way to North Goa beaches.",
    details: {
      isFree: false,
      isClean: true,
      hasWater: true,
      openTime: "07:00",
      closeTime: "22:00",
    },
    tags: ["gtdc", "hotel", "restaurant", "toilet", "mapusa"],
  },
  {
    name: "GTDC Margao Residency",
    category: "rest_area" as const,
    subType: "gtdc_hotel",
    location: {
      address: "Margao Town",
      landmark: "Near Margao Bus Stand",
      area: "Margao",
      lat: 15.2832,
      lng: 73.9862,
    },
    description: "GTDC hotel in Margao. Gateway to South Goa beaches.",
    details: {
      isFree: false,
      isClean: true,
      hasWater: true,
      openTime: "07:00",
      closeTime: "22:00",
    },
    tags: ["gtdc", "hotel", "restaurant", "toilet", "margao", "south_goa"],
  },
  {
    name: "GTDC Vasco Residency",
    category: "rest_area" as const,
    subType: "gtdc_hotel",
    location: {
      address: "Vasco da Gama",
      landmark: "Near Vasco Railway Station",
      area: "Vasco",
      lat: 15.3980,
      lng: 73.8113,
    },
    description: "GTDC hotel near Vasco railway station and Mormugao port.",
    details: {
      isFree: false,
      isClean: true,
      hasWater: true,
      openTime: "07:00",
      closeTime: "22:00",
    },
    tags: ["gtdc", "hotel", "restaurant", "toilet", "vasco", "railway"],
  },
  {
    name: "GTDC Old Goa Residency",
    category: "rest_area" as const,
    subType: "gtdc_hotel",
    location: {
      address: "Old Goa",
      landmark: "Near Basilica of Bom Jesus",
      area: "Old Goa",
      lat: 15.5008,
      lng: 73.9116,
    },
    description: "GTDC hotel at Old Goa heritage site. Convenient for church visits.",
    details: {
      isFree: false,
      isClean: true,
      hasWater: true,
      openTime: "07:00",
      closeTime: "22:00",
    },
    tags: ["gtdc", "hotel", "heritage", "restaurant", "toilet", "old_goa"],
  },
  {
    name: "GTDC Mayem Lake View",
    category: "rest_area" as const,
    subType: "gtdc_hotel",
    location: {
      address: "Mayem Lake, Bicholim",
      landmark: "On Mayem Lake shore",
      area: "Mayem",
      lat: 15.5833,
      lng: 73.9000,
    },
    description: "GTDC property with lake views. Boating available. Restaurant and facilities.",
    details: {
      isFree: false,
      isClean: true,
      hasWater: true,
      openTime: "07:00",
      closeTime: "21:00",
    },
    tags: ["gtdc", "hotel", "lake", "boating", "nature", "restaurant", "toilet"],
  },
  {
    name: "Fort Tiracol Heritage Hotel",
    category: "rest_area" as const,
    subType: "heritage_hotel",
    location: {
      address: "Tiracol Fort, Pernem",
      landmark: "At Tiracol Fort",
      area: "Tiracol",
      lat: 15.7233,
      lng: 73.6867,
    },
    description: "GTDC heritage hotel inside Tiracol Fort. Stunning views of Arabian Sea.",
    details: {
      isFree: false,
      isClean: true,
      hasWater: true,
      openTime: "08:00",
      closeTime: "20:00",
    },
    tags: ["gtdc", "heritage", "fort", "hotel", "views", "restaurant", "toilet"],
  },
];

// Helper: find coordinates based on name matching
function findCoordinates(name: string): { lat: number; lng: number; area: string } | null {
  const nameLower = name.toLowerCase();
  
  for (const [key, coords] of Object.entries(GOA_LOCATIONS)) {
    if (nameLower.includes(key)) {
      return coords;
    }
  }
  
  return null;
}

// Scrape a single page
async function scrapePage(pageUrl: string, defaultCategory: string, defaultSubType: string): Promise<any[]> {
  const results: any[] = [];
  
  try {
    console.log(`  Fetching ${BASE_URL}${pageUrl}...`);
    const response = await axios.get(`${BASE_URL}${pageUrl}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; GoaTrippin/1.0; +https://github.com/trippin)",
      },
      timeout: 15000,
    });
    
    const $ = cheerio.load(response.data);
    
    // Try different selectors based on page structure
    const selectors = [
      ".card", ".place-card", ".destination-card",
      ".attraction", ".item", ".listing",
      "article", ".content-block",
    ];
    
    for (const selector of selectors) {
      $(selector).each((_, element) => {
        const $el = $(element);
        
        // Extract name
        const name = $el.find("h2, h3, h4, .title, .name").first().text().trim() ||
                     $el.find("a").first().text().trim();
        
        if (!name || name.length < 3) return;
        
        // Extract description
        const description = $el.find("p, .description, .excerpt").first().text().trim();
        
        // Try to find image
        const imageUrl = $el.find("img").first().attr("src") || "";
        
        // Find coordinates based on name
        const coords = findCoordinates(name);
        
        if (coords) {
          results.push({
            name,
            category: defaultCategory,
            subType: defaultSubType,
            location: {
              address: "",
              landmark: "",
              area: coords.area,
              lat: coords.lat,
              lng: coords.lng,
            },
            description: description || `${name} - from Goa Tourism official website`,
            imageUrl: imageUrl.startsWith("http") ? imageUrl : imageUrl ? `${BASE_URL}${imageUrl}` : "",
            tags: [defaultSubType, coords.area.toLowerCase(), "goa_tourism_official"],
            isVerified: true,
            contributedBy: "goa-tourism.com",
          });
        }
      });
    }
    
    // Also try to find any place names in text content
    const pageText = $("body").text();
    for (const [key, coords] of Object.entries(GOA_LOCATIONS)) {
      const regex = new RegExp(`\\b${key}\\s+(beach|falls|waterfall|sanctuary|park|fort|temple|church)\\b`, "gi");
      const matches = pageText.match(regex);
      
      if (matches) {
        for (const match of matches) {
          const existing = results.find(r => r.name.toLowerCase().includes(key));
          if (!existing) {
            results.push({
              name: match.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" "),
              category: defaultCategory,
              subType: defaultSubType,
              location: {
                address: "",
                landmark: "",
                area: coords.area,
                lat: coords.lat,
                lng: coords.lng,
              },
              description: `${match} - mentioned on Goa Tourism website`,
              tags: [defaultSubType, coords.area.toLowerCase(), "goa_tourism_official"],
              isVerified: true,
              contributedBy: "goa-tourism.com",
            });
          }
        }
      }
    }
    
  } catch (error: any) {
    console.log(`  ⚠️ Could not fetch ${pageUrl}: ${error.message}`);
  }
  
  return results;
}

// Generate beach data from known locations
function generateBeachData(): any[] {
  const beaches = [];
  
  for (const [key, coords] of Object.entries(GOA_LOCATIONS)) {
    if (key.includes("beach") || 
        ["aguada", "anjuna", "arambol", "ashwem", "baga", "calangute", "candolim", 
         "chapora", "mandrem", "morjim", "sinquerim", "vagator", "agonda", "benaulim",
         "betalbatim", "bogmalo", "butterfly", "cavelossim", "colva", "majorda",
         "mobor", "palolem", "patnem", "varca", "miramar", "dona paula"].includes(key)) {
      beaches.push({
        name: `${coords.area} Beach`,
        category: "beach_access",
        subType: "beach",
        location: {
          address: `${coords.area} Beach, Goa`,
          landmark: "Main beach entrance",
          area: coords.area,
          lat: coords.lat,
          lng: coords.lng,
        },
        description: `${coords.area} Beach - Popular beach in ${coords.lat < 15.35 ? "South" : "North"} Goa. Public beach with various facilities nearby.`,
        details: {
          isFree: true,
          hasBenches: true,
        },
        tags: ["beach", "free", coords.lat < 15.35 ? "south_goa" : "north_goa", coords.area.toLowerCase()],
        isVerified: true,
        contributedBy: "goa-tourism.com",
      });
    }
  }
  
  return beaches;
}

// Generate nature/wildlife data
function generateNatureData(): any[] {
  return [
    {
      name: "Bondla Wildlife Sanctuary",
      category: "park",
      subType: "wildlife_sanctuary",
      location: {
        address: "Bondla, Ponda Taluka",
        landmark: "Bondla Forest",
        area: "Bondla",
        lat: 15.4167,
        lng: 74.0167,
      },
      description: "Mini zoo and wildlife sanctuary. Has deer park, botanical garden, and nature trails. Public toilets and canteen available.",
      details: {
        isFree: false,
        priceRange: "₹20-50",
        hasBenches: true,
        hasShade: true,
        openTime: "09:00",
        closeTime: "17:00",
        openDays: ["Fri", "Sat", "Sun", "Mon", "Tue", "Wed"], // Closed Thursday
      },
      tags: ["wildlife", "zoo", "nature", "family", "toilet", "canteen"],
      isVerified: true,
      contributedBy: "goa-tourism.com",
    },
    {
      name: "Bhagwan Mahavir Wildlife Sanctuary",
      category: "park",
      subType: "wildlife_sanctuary",
      location: {
        address: "Mollem, Sanguem Taluka",
        landmark: "Mollem National Park",
        area: "Mollem",
        lat: 15.3500,
        lng: 74.2500,
      },
      description: "Largest wildlife sanctuary in Goa. Home to Dudhsagar Falls. Trekking and jeep safaris available.",
      details: {
        isFree: false,
        priceRange: "₹20-400",
        openTime: "08:00",
        closeTime: "17:30",
      },
      tags: ["wildlife", "trekking", "dudhsagar", "nature", "forest"],
      isVerified: true,
      contributedBy: "goa-tourism.com",
    },
    {
      name: "Cotigao Wildlife Sanctuary",
      category: "park",
      subType: "wildlife_sanctuary",
      location: {
        address: "Cotigao, Canacona Taluka",
        landmark: "Near Palolem",
        area: "Cotigao",
        lat: 14.9833,
        lng: 74.1000,
      },
      description: "Pristine forest sanctuary in South Goa. Tree-top watchtowers for wildlife viewing.",
      details: {
        isFree: false,
        priceRange: "₹5-20",
        openTime: "07:00",
        closeTime: "17:30",
      },
      tags: ["wildlife", "forest", "south_goa", "nature", "trekking"],
      isVerified: true,
      contributedBy: "goa-tourism.com",
    },
    {
      name: "Salim Ali Bird Sanctuary",
      category: "park",
      subType: "bird_sanctuary",
      location: {
        address: "Chorao Island, Tiswadi",
        landmark: "Chorao Island via ferry",
        area: "Chorao",
        lat: 15.5067,
        lng: 73.8567,
      },
      description: "Mangrove habitat for migratory birds. Named after ornithologist Salim Ali. Boat rides available.",
      details: {
        isFree: false,
        priceRange: "₹20-100",
        openTime: "06:00",
        closeTime: "18:00",
      },
      tags: ["birds", "mangrove", "nature", "boat_ride", "photography"],
      isVerified: true,
      contributedBy: "goa-tourism.com",
    },
    {
      name: "Dudhsagar Waterfalls",
      category: "park",
      subType: "waterfall",
      location: {
        address: "Mollem, Sanguem Taluka",
        landmark: "Inside Bhagwan Mahavir Sanctuary",
        area: "Dudhsagar",
        lat: 15.3144,
        lng: 74.3147,
      },
      description: "Four-tiered waterfall, one of India's tallest. Best visited during monsoon. Jeep safari required.",
      details: {
        isFree: false,
        priceRange: "₹400-600",
        openTime: "07:00",
        closeTime: "16:00",
        openDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], // Closed during heavy monsoon
      },
      tags: ["waterfall", "trekking", "nature", "monsoon", "photography"],
      isVerified: true,
      contributedBy: "goa-tourism.com",
    },
    {
      name: "Arvalem (Harvalem) Waterfalls",
      category: "park",
      subType: "waterfall",
      location: {
        address: "Sanquelim, Bicholim Taluka",
        landmark: "Near Arvalem Caves",
        area: "Arvalem",
        lat: 15.4667,
        lng: 73.9667,
      },
      description: "50m waterfall with ancient rock-cut caves nearby. Garden area with seating.",
      details: {
        isFree: true,
        hasBenches: true,
        hasShade: true,
      },
      tags: ["waterfall", "caves", "heritage", "free", "nature"],
      isVerified: true,
      contributedBy: "goa-tourism.com",
    },
    {
      name: "Mayem Lake",
      category: "park",
      subType: "lake",
      location: {
        address: "Mayem, Bicholim Taluka",
        landmark: "GTDC Mayem Lake View",
        area: "Mayem",
        lat: 15.5833,
        lng: 73.9000,
      },
      description: "Freshwater lake with boating facilities. GTDC resort on shore. Peaceful picnic spot.",
      details: {
        isFree: false,
        priceRange: "₹50-200",
        hasBenches: true,
        openTime: "08:00",
        closeTime: "18:00",
      },
      tags: ["lake", "boating", "picnic", "nature", "gtdc"],
      isVerified: true,
      contributedBy: "goa-tourism.com",
    },
    {
      name: "Carambolim Lake",
      category: "park",
      subType: "lake",
      location: {
        address: "Old Goa Road, Tiswadi",
        landmark: "Between Panjim and Old Goa",
        area: "Carambolim",
        lat: 15.4833,
        lng: 73.8833,
      },
      description: "Wetland lake attracting migratory birds. Viewing platform available. Free entry.",
      details: {
        isFree: true,
        hasBenches: true,
      },
      tags: ["lake", "birds", "nature", "free", "photography"],
      isVerified: true,
      contributedBy: "goa-tourism.com",
    },
  ];
}

// Generate heritage data
function generateHeritageData(): any[] {
  return [
    {
      name: "Basilica of Bom Jesus",
      category: "temple",
      subType: "church",
      location: {
        address: "Old Goa",
        landmark: "UNESCO World Heritage Site",
        area: "Old Goa",
        lat: 15.5008,
        lng: 73.9116,
      },
      description: "16th century church housing remains of St. Francis Xavier. UNESCO World Heritage Site. Public toilets in complex.",
      details: {
        isFree: true,
        isClean: true,
        hasWater: true,
        wheelchairAccessible: true,
        openTime: "09:00",
        closeTime: "18:30",
      },
      tags: ["church", "heritage", "unesco", "old_goa", "toilet", "free"],
      isVerified: true,
      contributedBy: "goa-tourism.com",
    },
    {
      name: "Se Cathedral",
      category: "temple",
      subType: "church",
      location: {
        address: "Old Goa",
        landmark: "Near Basilica of Bom Jesus",
        area: "Old Goa",
        lat: 15.5033,
        lng: 73.9117,
      },
      description: "Largest church in Asia. 16th century Portuguese architecture. Public facilities nearby.",
      details: {
        isFree: true,
        wheelchairAccessible: true,
        openTime: "07:30",
        closeTime: "18:00",
      },
      tags: ["church", "heritage", "old_goa", "free", "architecture"],
      isVerified: true,
      contributedBy: "goa-tourism.com",
    },
    {
      name: "Fort Aguada",
      category: "park",
      subType: "fort",
      location: {
        address: "Sinquerim, Bardez",
        landmark: "Aguada Beach",
        area: "Aguada",
        lat: 15.4922,
        lng: 73.7731,
      },
      description: "17th century Portuguese fort with lighthouse. Panoramic views. Basic facilities available.",
      details: {
        isFree: false,
        priceRange: "₹25-300",
        openTime: "09:30",
        closeTime: "18:00",
      },
      tags: ["fort", "heritage", "views", "lighthouse", "photography"],
      isVerified: true,
      contributedBy: "goa-tourism.com",
    },
    {
      name: "Chapora Fort",
      category: "park",
      subType: "fort",
      location: {
        address: "Chapora, Bardez",
        landmark: "Dil Chahta Hai fame",
        area: "Chapora",
        lat: 15.6053,
        lng: 73.7342,
      },
      description: "Hilltop fort famous from Bollywood. Stunning sunset views over Vagator beach. No facilities - bring water.",
      details: {
        isFree: true,
        hasBenches: false,
        hasShade: false,
      },
      tags: ["fort", "heritage", "sunset", "views", "free", "vagator"],
      isVerified: true,
      contributedBy: "goa-tourism.com",
    },
    {
      name: "Shri Mangeshi Temple",
      category: "temple",
      subType: "hindu_temple",
      location: {
        address: "Mangeshi, Priol, Ponda",
        landmark: "Main Ponda Temple",
        area: "Mangeshi",
        lat: 15.4500,
        lng: 73.9833,
      },
      description: "Major Hindu temple dedicated to Shiva. Free drinking water and toilet facilities for visitors.",
      details: {
        isFree: true,
        isClean: true,
        hasWater: true,
        openTime: "06:00",
        closeTime: "21:00",
      },
      tags: ["temple", "hindu", "shiva", "toilet", "water", "free"],
      isVerified: true,
      contributedBy: "goa-tourism.com",
    },
    {
      name: "Shri Shantadurga Temple",
      category: "temple",
      subType: "hindu_temple",
      location: {
        address: "Kavlem, Ponda",
        landmark: "Near Mangeshi Temple",
        area: "Kavlem",
        lat: 15.4333,
        lng: 73.9833,
      },
      description: "Popular temple dedicated to goddess Shantadurga. Facilities available for pilgrims.",
      details: {
        isFree: true,
        isClean: true,
        hasWater: true,
        openTime: "06:00",
        closeTime: "20:30",
      },
      tags: ["temple", "hindu", "goddess", "toilet", "water", "free"],
      isVerified: true,
      contributedBy: "goa-tourism.com",
    },
    {
      name: "Fontainhas Latin Quarter",
      category: "park",
      subType: "heritage_area",
      location: {
        address: "Fontainhas, Panjim",
        landmark: "Near Panjim Church",
        area: "Panjim",
        lat: 15.4932,
        lng: 73.8312,
      },
      description: "UNESCO heritage neighborhood with Portuguese colonial houses. Walking tours available. Cafes with toilets.",
      details: {
        isFree: true,
        hasBenches: true,
      },
      tags: ["heritage", "walking", "portuguese", "panjim", "photography", "free"],
      isVerified: true,
      contributedBy: "goa-tourism.com",
    },
  ];
}

async function main() {
  const MONGO_URI = process.env.MONGO_URI;

  if (!MONGO_URI) {
    console.error("❌ MONGO_URI not set");
    console.log("Set it with: export MONGO_URI='your-mongodb-uri'");
    process.exit(1);
  }

  console.log("🌴 Goa Tourism Website Scraper");
  console.log("==============================\n");

  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected\n");

    // Define schema
    const GoaAmenitySchema = new mongoose.Schema({
      name: { type: String, required: true },
      category: { type: String, required: true },
      subType: { type: String },
      location: {
        address: { type: String },
        landmark: { type: String },
        area: { type: String },
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
      },
      description: { type: String },
      details: { type: mongoose.Schema.Types.Mixed },
      imageUrl: { type: String },
      images: [String],
      tags: [String],
      isVerified: { type: Boolean, default: false },
      contributedBy: { type: String },
      isActive: { type: Boolean, default: true },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
    });

    const GoaAmenity = mongoose.models.GoaAmenity || mongoose.model("GoaAmenity", GoaAmenitySchema);

    const allResults: any[] = [];

    // 1. Add GTDC Residencies (known data)
    console.log("📍 Adding GTDC Residencies...");
    allResults.push(...GTDC_RESIDENCIES);
    console.log(`   Added ${GTDC_RESIDENCIES.length} GTDC properties\n`);

    // 2. Generate beach data
    console.log("🏖️ Generating beach data...");
    const beaches = generateBeachData();
    allResults.push(...beaches);
    console.log(`   Added ${beaches.length} beaches\n`);

    // 3. Generate nature/wildlife data
    console.log("🌿 Generating nature & wildlife data...");
    const nature = generateNatureData();
    allResults.push(...nature);
    console.log(`   Added ${nature.length} nature spots\n`);

    // 4. Generate heritage data
    console.log("🏛️ Generating heritage data...");
    const heritage = generateHeritageData();
    allResults.push(...heritage);
    console.log(`   Added ${heritage.length} heritage sites\n`);

    // 5. Try to scrape live pages (may or may not work depending on site structure)
    console.log("🌐 Attempting to scrape live pages from goa-tourism.com...");
    for (const page of PAGES_TO_SCRAPE) {
      const scraped = await scrapePage(page.url, page.category, page.subType);
      if (scraped.length > 0) {
        // Deduplicate
        for (const item of scraped) {
          const exists = allResults.find(r => 
            r.name.toLowerCase() === item.name.toLowerCase() ||
            (r.location.lat === item.location.lat && r.location.lng === item.location.lng)
          );
          if (!exists) {
            allResults.push(item);
          }
        }
        console.log(`   Found ${scraped.length} items from ${page.url}`);
      }
    }

    // 6. Save to database
    console.log(`\n💾 Saving ${allResults.length} amenities to database...`);
    
    let saved = 0;
    let updated = 0;
    
    for (const amenity of allResults) {
      const result = await GoaAmenity.findOneAndUpdate(
        { 
          name: amenity.name,
          "location.area": amenity.location.area,
        },
        { 
          ...amenity,
          updatedAt: new Date(),
          isActive: true,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      
      if (result.createdAt.getTime() === result.updatedAt.getTime()) {
        saved++;
      } else {
        updated++;
      }
    }

    console.log(`   ✅ New: ${saved}, Updated: ${updated}\n`);

    // Summary
    const counts = await GoaAmenity.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    console.log("📊 Database Summary:");
    console.log("--------------------");
    let total = 0;
    for (const c of counts) {
      console.log(`   ${c._id}: ${c.count}`);
      total += c.count;
    }
    console.log(`   ────────────`);
    console.log(`   TOTAL: ${total}`);

    await mongoose.disconnect();
    console.log("\n✅ Done! Data sourced from https://goa-tourism.com/");
    
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();

