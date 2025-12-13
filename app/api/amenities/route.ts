import { NextRequest, NextResponse } from "next/server";
import connectMongo from "@/lib/mongodb";
import GoaAmenity from "@/models/GoaAmenity";

// Disable Next.js caching for this route - always fetch fresh data
export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/amenities?lat=..&lng=..&radius=..&types=comma,separated
// Uses 3 sources:
// 1. Local Goa database (FREE) - curated hyper-local data
// 2. Overpass API (FREE) - OpenStreetMap public amenities
// 3. Google Places (PAID) - commercial establishments with photos/reviews
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = parseFloat(searchParams.get("lat") || "");
    const lng = parseFloat(searchParams.get("lng") || "");
    const radius = parseInt(searchParams.get("radius") || "1200", 10);
    const typesParam = (searchParams.get("types") || "").trim();
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: "lat/lng required" }, { status: 400 });
    }
    const userTypes = typesParam ? typesParam.split(",").map((t) => t.trim()).filter(Boolean) : [];
    const wantBus = userTypes.some((t) => ["bus", "bus_stop", "bus_station", "transit"].includes(t));

    // ============================================
    // SOURCE 1: Local Goa Database (FREE, curated)
    // ============================================
    async function fetchGoaLocal() {
      try {
        await connectMongo();
        
        // Convert radius from meters to approximate degrees (use wider search for local data)
        // Use at least 5km radius for local data to ensure we find results
        const searchRadiusM = Math.max(radius, 5000);
        const radiusDegrees = searchRadiusM / 111000;
        
        // First try: find with isActive filter
        let docs = await GoaAmenity.find({
          isActive: true,
          "location.lat": { $gte: lat - radiusDegrees, $lte: lat + radiusDegrees },
          "location.lng": { $gte: lng - radiusDegrees, $lte: lng + radiusDegrees },
        }).limit(100).lean();

        // Fallback: if no results, try without isActive filter (for newly seeded data)
        if (!docs || docs.length === 0) {
          docs = await GoaAmenity.find({
            "location.lat": { $gte: lat - radiusDegrees, $lte: lat + radiusDegrees },
            "location.lng": { $gte: lng - radiusDegrees, $lte: lng + radiusDegrees },
          }).limit(100).lean();
        }

        // Second fallback: if still no results, get any Goa amenities (user might be browsing from far)
        if (!docs || docs.length === 0) {
          docs = await GoaAmenity.find({}).limit(50).lean();
        }

        console.log(`[fetchGoaLocal] Found ${docs?.length || 0} local amenities near ${lat},${lng}`);

        // Filter by actual distance (use original radius) and transform
        return (docs || [])
          .map((doc: any) => {
            const dLat = doc.location?.lat - lat;
            const dLng = doc.location?.lng - lng;
            const distance = Math.sqrt(dLat * dLat + dLng * dLng) * 111000;
            
            // Use wider radius for local results (3x original) to ensure visibility
            const effectiveRadius = Math.max(radius * 3, 5000);
            if (distance > effectiveRadius) return null;
            
            return {
              name: doc.name,
              type: doc.subType || doc.category,
              location: {
                address: doc.location?.address || "",
                landmark: doc.location?.landmark || "",
                area: doc.location?.area || "",
                lat: doc.location?.lat,
                lng: doc.location?.lng,
              },
              description: doc.description || "",
              costLevel: doc.details?.isFree ? "Free" : doc.details?.priceRange || "Unknown",
              imageUrl: doc.imageUrl || "",
              tags: doc.tags || [],
              external_place_id: `goa:${doc._id}`,
              source: "goa_local",
              category: doc.category,
              details: doc.details || {},
              isVerified: doc.isVerified,
              distance,
            };
          })
          .filter(Boolean)
          .sort((a: any, b: any) => (a.distance || 0) - (b.distance || 0)); // Sort by distance
      } catch (e) {
        console.error("Goa local fetch error:", e);
        return [];
      }
    }

    // ============================================
    // SOURCE 2: Overpass API (FREE, OpenStreetMap)
    // ============================================
    const amenityTags = [
      "toilets",
      "drinking_water",
      "bench",
      "shelter",
      "fountain",
      "marketplace",
      "fast_food",
      "cafe",
      "restaurant",
      "food_court",
      "ice_cream",
      "pub",
      "bar",
      "fuel",
    ];
    const shopTags = [
      "convenience",
      "supermarket",
      "bakery",
      "butcher",
      "greengrocer",
      "deli",
      "kiosk",
      "confectionery",
      "pastry",
    ];
    const leisureTags = [
      "park",
      "garden",
      "playground",
      "picnic_site",
      "recreation_ground",
      "beach",
    ];
    const tourismTags = [
      "picnic_site",
      "attraction",
    ];

    const amenityRegex = amenityTags.join("|");
    const shopRegex = shopTags.join("|");
    const leisureRegex = leisureTags.join("|");
    const tourismRegex = tourismTags.join("|");

    const busFilter = wantBus
      ? `
        nwr(around:${radius},${lat},${lng})[amenity=bus_station];
        nwr(around:${radius},${lat},${lng})[highway=bus_stop];
        nwr(around:${radius},${lat},${lng})[public_transport=platform][bus=yes];
        nwr(around:${radius},${lat},${lng})[public_transport=stop_position][bus=yes];
      `
      : "";

    const overpassQuery = `
      [out:json][timeout:50];
      (
        nwr(around:${radius},${lat},${lng})[amenity~"^(${amenityRegex})$"];
        nwr(around:${radius},${lat},${lng})[shop~"^(${shopRegex})$"];
        nwr(around:${radius},${lat},${lng})[leisure~"^(${leisureRegex})$"];
        nwr(around:${radius},${lat},${lng})[tourism~"^(${tourismRegex})$"];
        nwr(around:${radius},${lat},${lng})[natural=beach];
        // Food cart / truck heuristics
        nwr(around:${radius},${lat},${lng})[amenity=fast_food][takeaway=yes];
        nwr(around:${radius},${lat},${lng})[amenity=fast_food][outdoor_seating=yes];
        nwr(around:${radius},${lat},${lng})[amenity=fast_food][mobile=yes];
        nwr(around:${radius},${lat},${lng})[shop=kiosk][food=yes];
        nwr(around:${radius},${lat},${lng})[amenity=vending_machine][vending~"^(food|drinks|beverages|water)$"];
        ${busFilter}
      );
      out center;
    `;

    async function fetchOverpass() {
      const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ data: overpassQuery }),
      });
      if (!res.ok) {
        throw new Error("Overpass error");
      }
      const data = await res.json();
      const elements = Array.isArray(data?.elements) ? data.elements : [];
      const transformed = elements
        .map((el: any) => {
          const tags = el.tags || {};
          const name = tags.name || tags["ref"] || "";
          const category =
            (tags.amenity ? "amenity" : "") ||
            (tags.shop ? "shop" : "") ||
            (tags.leisure ? "leisure" : "") ||
            (tags.tourism ? "tourism" : "") ||
            (tags.natural ? "natural" : "") ||
            "other";
          const type =
            tags.amenity ||
            tags.shop ||
            tags.leisure ||
            tags.tourism ||
            tags.natural ||
            (tags.cuisine ? "fast_food" : "") ||
            "amenity";
          const centerLike = el.type === "node" ? el : el.center;
          const lat0 = centerLike?.lat;
          const lng0 = centerLike?.lon;
          if (!Number.isFinite(lat0) || !Number.isFinite(lng0)) return null;
          
          // Build full address from OSM tags
          const addrParts = [
            tags["addr:housenumber"],
            tags["addr:street"],
            tags["addr:city"] || tags["addr:suburb"],
            tags["addr:postcode"],
          ].filter(Boolean);
          const fullAddress = tags["addr:full"] || addrParts.join(", ") || "";
          
          // Parse opening hours (OSM format can be complex, but try to extract useful info)
          const openingHours = tags["opening_hours"] || "";
          let openTime = "";
          let closeTime = "";
          // Simple parsing for common format like "Mo-Fr 09:00-18:00"
          const hoursMatch = openingHours.match(/(\d{1,2}:\d{2})-(\d{1,2}:\d{2})/);
          if (hoursMatch) {
            openTime = hoursMatch[1];
            closeTime = hoursMatch[2];
          }
          
          // Determine cost level
          let costLevel = "Unknown";
          if (tags.fee === "no" || tags.access === "yes" || type === "park" || type === "garden" || type === "beach") {
            costLevel = "Free";
          } else if (tags.fee === "yes") {
            costLevel = "Paid";
          }
          
          // Build description from available tags
          const descParts = [];
          if (tags.description) descParts.push(tags.description);
          if (tags.cuisine) descParts.push(`Cuisine: ${tags.cuisine.replace(/;/g, ", ")}`);
          if (tags.diet) descParts.push(`Diet options: ${tags.diet}`);
          if (tags.outdoor_seating === "yes") descParts.push("Outdoor seating available");
          if (tags.takeaway === "yes") descParts.push("Takeaway available");
          if (tags.delivery === "yes") descParts.push("Delivery available");
          if (tags.wheelchair === "yes") descParts.push("Wheelchair accessible");
          const description = descParts.join(". ");
          
          // Build details object (similar to our seed data format)
          const details: any = {};
          if (openTime) details.openTime = openTime;
          if (closeTime) details.closeTime = closeTime;
          if (tags.fee === "no") details.isFree = true;
          if (tags.fee === "yes") details.isFree = false;
          if (tags.cuisine) details.cuisine = tags.cuisine.split(";").map((c: string) => c.trim());
          if (tags.phone) details.phone = tags.phone;
          if (tags.website) details.website = tags.website;
          if (tags.wheelchair) details.wheelchair = tags.wheelchair === "yes";
          if (tags.outdoor_seating) details.outdoorSeating = tags.outdoor_seating === "yes";
          if (tags.takeaway) details.takeaway = tags.takeaway === "yes";
          if (tags.delivery) details.delivery = tags.delivery === "yes";
          if (openingHours) details.openingHoursRaw = openingHours;
          
          // Build meaningful tags array (filter out less useful ones)
          const usefulTags = [
            tags.amenity, tags.shop, tags.leisure, tags.tourism, tags.natural,
            tags.cuisine, tags.diet,
            tags.takeaway === "yes" ? "takeaway" : null,
            tags.delivery === "yes" ? "delivery" : null,
            tags.outdoor_seating === "yes" ? "outdoor_seating" : null,
            tags.wheelchair === "yes" ? "wheelchair_accessible" : null,
            tags.internet_access === "yes" || tags.internet_access === "wlan" ? "wifi" : null,
          ].filter(Boolean);
          
          return {
            name: name || type,
            type,
            location: {
              address: fullAddress,
              landmark: tags["addr:place"] || tags["addr:suburb"] || "",
              area: tags["addr:city"] || tags["addr:suburb"] || "",
              lat: lat0,
              lng: lng0,
            },
            description,
            costLevel,
            imageUrl: "",
            tags: usefulTags,
            external_place_id: `osm:${el.type}:${el.id}`,
            source: "overpass",
            category: type, // Use the actual type (restaurant, cafe, etc.) as category
            details,
            isVerified: false, // OSM data is community-contributed
          };
        })
        .filter(Boolean);
      return transformed;
    }

    // ============================================
    // SOURCE 3: Google Places (PAID, rich metadata)
    // ============================================
    async function fetchGooglePlaces() {
      const apiKey = process.env.GOOGLE_MAPS_BACKEND_API_KEY;
      if (!apiKey) return [] as any[];
      const nearbyTypes = [
        "park",
        "tourist_attraction",
        "cafe",
        "restaurant",
        "bar",
        "meal_takeaway",
        "food_court",
        "bakery",
        "convenience_store",
        "supermarket",
      ];
      const textQueries = [
        "public toilet",
        "restroom",
        "food cart",
        "food truck",
        "street food",
        "beach",
        "garden",
        "playground",
        "picnic site",
      ];
      const nearbyCalls = nearbyTypes.map((t) => {
        const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${encodeURIComponent(
          t
        )}&key=${apiKey}`;
        return fetch(url)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null);
      });
      const textCalls = textQueries.map((q) => {
        const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
          q
        )}&location=${lat},${lng}&radius=${radius}&key=${apiKey}`;
        return fetch(url)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null);
      });
      const responses = await Promise.all([...nearbyCalls, ...textCalls]);
      const items = responses
        .flatMap((res) => (res && Array.isArray(res.results) ? res.results : []))
        .filter(Boolean);
      const byPlaceId = new Map<string, any>();
      for (const r of items) {
        if (!r.place_id) continue;
        if (!byPlaceId.has(r.place_id)) byPlaceId.set(r.place_id, r);
      }
      const list = Array.from(byPlaceId.values());
      return list
        .map((r: any) => {
          const loc = r.geometry?.location;
          const lat0 = loc?.lat;
          const lng0 = loc?.lng;
          if (!Number.isFinite(lat0) || !Number.isFinite(lng0)) return null;
          const priceLevel = r.price_level;
          const costLevel =
            priceLevel != null
              ? priceLevel === 0
                ? "Free"
                : "$".repeat(Math.max(1, Math.min(4, priceLevel)))
              : "Unknown";
          return {
            name: r.name || (r.types && r.types[0]) || "Place",
            type: (r.types && r.types[0]) || "place",
            location: {
              address: r.formatted_address || r.vicinity || "",
              lat: lat0,
              lng: lng0,
            },
            description: r.vicinity || r.formatted_address || "",
            costLevel,
            imageUrl:
              r.photos && r.photos.length
                ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${r.photos[0].photo_reference}&key=${apiKey}`
                : "",
            tags: r.types || [],
            external_place_id: r.place_id,
            source: "google",
            category: "google",
          };
        })
        .filter(Boolean);
    }

    // Execute all providers in parallel
    const [goaLocalResults, overpassResults, googleResults] = await Promise.all([
      fetchGoaLocal().catch((e) => { console.error('[amenities] Goa local error:', e); return []; }),
      fetchOverpass().catch((e) => { console.error('[amenities] Overpass error:', e); return []; }),
      fetchGooglePlaces().catch((e) => { console.error('[amenities] Google error:', e); return []; }),
    ]);
    
    console.log(`[amenities] Results: goaLocal=${goaLocalResults.length}, overpass=${overpassResults.length}, google=${googleResults.length}`);
    
    // Log a sample of what we got from each source
    if (overpassResults.length > 0) {
      const restaurants = overpassResults.filter((r: any) => r.type === 'restaurant' || r.type === 'cafe');
      console.log(`[amenities] Overpass restaurants/cafes: ${restaurants.length}`);
    }
    if (googleResults.length > 0) {
      const restaurants = googleResults.filter((r: any) => r.type === 'restaurant' || r.tags?.includes('restaurant'));
      console.log(`[amenities] Google restaurants: ${restaurants.length}`);
    }

    // Deduplicate by external_place_id or name+lat/lng proximity
    // Priority: goa_local > overpass > google (local data first)
    const merged: any[] = [];
    const seen = new Set<string>();
    function coordKey(lat0: number, lng0: number) {
      return `${lat0.toFixed(5)},${lng0.toFixed(5)}`;
    }
    
    // Add in priority order: local first, then OSM, then Google
    [...goaLocalResults, ...overpassResults, ...googleResults].forEach((item) => {
      const key =
        item.external_place_id ||
        `${item.name}|${coordKey(item.location.lat, item.location.lng)}`;
      if (seen.has(key)) return;
      seen.add(key);
      merged.push(item);
    });

    const usedSources = [];
    if (goaLocalResults.length) usedSources.push("goa_local");
    if (overpassResults.length) usedSources.push("overpass");
    if (googleResults.length) usedSources.push("google");

    return NextResponse.json(
      { source: usedSources.join("+") || "none", results: merged },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Amenities lookup failed" }, { status: 500 });
  }
}
