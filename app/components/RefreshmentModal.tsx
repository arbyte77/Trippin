"use client";
import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Loader2, Clock, MapPin, Info, ChevronDown, ChevronUp,
  Toilet, Droplets, Coffee, UtensilsCrossed, Trees, Church, 
  Waves, ShoppingBag, Fuel, ParkingCircle, Building, Store,
  Pizza, IceCream, Beer, Sandwich, Search, X
} from "lucide-react";
import { useTripContext } from "../context/TripContext";

export default function RefreshmentModal() {
  const router = useRouter();
  const {
    showRefreshmentModal,
    setShowRefreshmentModal,
    refreshmentItems,
    refreshmentNote,
    setPendingPlace,
    savedJourneys,
    editingJourneyId,
    refreshmentInsertIndex,
    waypoints,
    stopTimes,
    setWaypoints,
    setStopTimes,
    setPendingRecalc,
    origin,
    destination,
    setOrigin,
    setDestination,
    destinationName,
    setDestinationName,
    waypointNames,
    setWaypointNames,
    setTravelMode,
    setFilterOption,
    setSavedJourneys,
    postSaveRedirectToTrips,
    setPostSaveRedirectToTrips,
    isLoadingAmenities,
  } = useTripContext();

  const stops = useMemo(() => {
    // Use display names where available
    const waypointDisplayNames = waypoints.map((wp, idx) => waypointNames[idx] || wp);
    const destDisplay = destinationName || destination;
    const names = [...waypointDisplayNames, destDisplay].filter(Boolean);
    return names;
  }, [waypoints, waypointNames, destination, destinationName]);
  const [posIndex, setPosIndex] = useState<number>(() =>
    typeof refreshmentInsertIndex === "number" ? refreshmentInsertIndex : waypoints.length
  );
  
  // Track which items have expanded details
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  
  // Category filter (tabs)
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  
  // Search query
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // Category definitions with icons and labels
  const categories = [
    { id: "all", label: "All", icon: "📍", color: "gray" },
    { id: "utilities", label: "Utilities", icon: "🚿", color: "indigo" },
    { id: "rest", label: "Parks & Rest", icon: "🌳", color: "green" },
    { id: "quickfood", label: "Quick Bites", icon: "🥪", color: "orange" },
    { id: "dining", label: "Dining", icon: "🍽️", color: "pink" },
    { id: "other", label: "Other", icon: "📌", color: "slate" },
  ];
  
  // Helper: get normalized category for filtering
  const getItemCategory = (item: any): string => {
    const t = (item.type || item.category || "").toLowerCase();
    // Public utilities: toilets, water, fuel, ATM, pharmacy
    if (["toilets", "toilet", "restroom", "drinking_water", "water_point", "fuel", "atm", "pharmacy", "bank"].includes(t)) return "utilities";
    if (["bench", "shelter", "picnic_site", "picnic_table", "park", "garden", "beach", "playground", "recreation_ground"].includes(t)) return "rest";
    if (["kiosk", "convenience", "general", "supermarket", "grocery", "fast_food", "bakery", "confectionery", "pastry"].includes(t)) return "quickfood";
    if (["restaurant", "food", "cafe", "bar", "pub", "ice_cream", "biergarten", "food_court"].includes(t)) return "dining";
    return "other";
  };
  
  // Priority order for sorting "All" list - essentials first
  const getCategoryPriority = (item: any): number => {
    const t = (item.type || item.category || "").toLowerCase();
    // Priority 1: Toilets (most urgent)
    if (["toilets", "toilet", "restroom"].includes(t)) return 1;
    // Priority 2: Water
    if (["drinking_water", "water_point"].includes(t)) return 2;
    // Priority 3: Quick food/shops (hunger)
    if (["kiosk", "convenience", "general", "supermarket", "grocery", "fast_food", "bakery"].includes(t)) return 3;
    // Priority 4: Dining
    if (["restaurant", "food", "cafe", "bar", "pub", "ice_cream", "biergarten", "food_court"].includes(t)) return 4;
    // Priority 5: Rest spots
    if (["bench", "shelter", "picnic_site", "park", "garden", "beach"].includes(t)) return 5;
    // Priority 6: Other utilities
    if (["fuel", "atm", "pharmacy", "bank"].includes(t)) return 6;
    // Priority 7: Everything else
    return 7;
  };
  
  // Filter items based on category AND search query
  // For "all" tab, sort by priority (essentials first) then distance
  const filteredItems = useMemo(() => {
    let items = [...refreshmentItems]; // Clone to avoid mutating original
    
    // Apply category filter
    if (categoryFilter !== "all") {
      items = items.filter(item => getItemCategory(item) === categoryFilter);
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      items = items.filter(item => {
        const name = (item.name || "").toLowerCase();
        const desc = (item.description || "").toLowerCase();
        const type = (item.type || item.category || "").toLowerCase();
        const landmark = (item.location?.landmark || "").toLowerCase();
        const address = (item.location?.address || "").toLowerCase();
        const area = (item.location?.area || "").toLowerCase();
        
        return name.includes(query) || 
               desc.includes(query) || 
               type.includes(query) ||
               landmark.includes(query) ||
               address.includes(query) ||
               area.includes(query);
      });
    }
    
    // Sort: For "all" view, sort by priority first, then by distance within each priority
    // For specific categories, just sort by distance
    if (categoryFilter === "all" && !searchQuery.trim()) {
      items.sort((a, b) => {
        const priorityA = getCategoryPriority(a);
        const priorityB = getCategoryPriority(b);
        if (priorityA !== priorityB) {
          return priorityA - priorityB; // Lower priority number = higher in list
        }
        // Same priority: sort by distance
        return (a.distance || 0) - (b.distance || 0);
      });
    } else {
      // For filtered views or search, just sort by distance
      items.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    }
    
    return items;
  }, [refreshmentItems, categoryFilter, searchQuery]);
  
  // Category counts for tabs
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: refreshmentItems.length };
    refreshmentItems.forEach(item => {
      const cat = getItemCategory(item);
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [refreshmentItems]);
  
  // Clear search
  const clearSearch = () => setSearchQuery("");
  
  const toggleExpand = (index: number) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const onAdd = (item: any) => {
    // Get the best location string for Google Directions:
    // Priority: landmark (more recognizable) > coordinates (most reliable) > address > name
    const getLocationString = (place: any): string => {
      // Best option: use coordinates directly (Google Directions accepts "lat,lng" format)
      // This is the most reliable for local amenities not in Google's database
      if (place.location?.lat && place.location?.lng) {
        return `${place.location.lat},${place.location.lng}`;
      }
      // If we have a landmark, it might be more recognizable than the place name
      // e.g., "Menino Jesus Church" is more findable than "Colva Beach Public Toilet"
      if (place.location?.landmark && place.location.landmark.length > 5) {
        // Append area for context if available
        const area = place.location?.area ? `, ${place.location.area}, Goa` : ", Goa";
        return place.location.landmark + area;
      }
      // If we have a proper address, use it
      if (place.location?.address && place.location.address.length > 5) {
        return place.location.address;
      }
      // Last resort: name (might not work for obscure places)
      return place.name;
    };

    const locationStr = getLocationString(item);
    const displayName = item.name || locationStr; // Use the amenity name for display

    // Helper to update waypointNames when indices shift
    const updateWaypointNamesForInsert = (insertIdx: number, name: string) => {
      const newNames: Record<number, string> = {};
      // Shift existing names at >= insertIdx up by 1
      Object.entries(waypointNames).forEach(([key, val]) => {
        const k = parseInt(key, 10);
        if (k >= insertIdx) {
          newNames[k + 1] = val;
      } else {
          newNames[k] = val;
        }
      });
      // Add the new name at insertIdx
      newNames[insertIdx] = name;
      setWaypointNames(newNames);
    };

    console.log('[RefreshmentModal onAdd] editingJourneyId:', editingJourneyId, 'postSaveRedirectToTrips:', postSaveRedirectToTrips);
    console.log('[RefreshmentModal onAdd] displayName:', displayName, 'locationStr:', locationStr);
    
    // If editing an existing journey (either after first save or later edit), save to server
    if (editingJourneyId) {
      const shouldRedirectToTrips = postSaveRedirectToTrips;
      console.log('[RefreshmentModal onAdd] Calling addPlace API for journey:', editingJourneyId);
      (async () => {
        try {
          const res = await fetch(`/api/journeys/${editingJourneyId}/addPlace`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ place: { ...item, locationStr, displayName }, index: posIndex }),
          });
          if (!res.ok) throw new Error("Failed to add amenity");
          const addResult = await res.json();
          console.log('[RefreshmentModal onAdd] addPlace response:', JSON.stringify(addResult.journey?.waypointNames));
          // refresh saved journeys & current context
          const r = await fetch("/api/journeys");
          if (r.ok) {
            const list = await r.json();
            setSavedJourneys(list);
            const j = list.find((x: any) => x._id === editingJourneyId);
            console.log('[RefreshmentModal onAdd] Fetched journey waypointNames:', JSON.stringify(j?.waypointNames));
            if (j) {
              setOrigin(j.start);
              setDestination(j.destination);
              setDestinationName(j.destinationName || "");
              setWaypoints(j.waypoints || []);
              // Parse waypointNames - might come as object or need parsing from JSON
              const wpNames = j.waypointNames || 
                (j.waypointNamesJson ? JSON.parse(j.waypointNamesJson) : {});
              setWaypointNames(wpNames);
              setStopTimes(j.stopTimes || []);
              setTravelMode(j.travelMode);
              setFilterOption(j.filterOption);
            }
          }
          setPendingRecalc(true);
          // If this was the first save flow, redirect to homepage to show itinerary
          if (shouldRedirectToTrips) {
            setPostSaveRedirectToTrips(false);
            router.push("/");
          }
        } catch {
          // ignore
        } finally {
          setShowRefreshmentModal(false);
        }
      })();
      return;
    }
    // Otherwise insert into the current in-progress plan (unsaved)
    console.log('[RefreshmentModal onAdd] No editingJourneyId, doing local update only');
    const idx = typeof posIndex === "number" ? posIndex : waypoints.length;
    const wLen = waypoints.length;
    if (idx === wLen + 1) {
      // After destination: shift current destination into waypoints; set new place as destination
      if (destination) {
        const newWps = [...waypoints, destination];
        const newTimes = [...stopTimes, { arriveBy: "", leaveBy: "" }];
        setWaypoints(newWps);
        setStopTimes(newTimes);
        // If old destination had a name, preserve it as waypoint name
        if (destinationName) {
          updateWaypointNamesForInsert(wLen, destinationName);
        }
      }
      setDestination(locationStr);
      setDestinationName(displayName);
    } else {
      const newWps = [...waypoints];
      newWps.splice(idx, 0, locationStr);
      const newTimes = [...stopTimes];
      newTimes.splice(idx, 0, { arriveBy: "", leaveBy: "" });
      setWaypoints(newWps);
      setStopTimes(newTimes);
      updateWaypointNamesForInsert(idx, displayName);
    }
    setPendingRecalc(true);
    setShowRefreshmentModal(false);
    // For unsaved plans there is no redirect special-case here
  };

  if (!showRefreshmentModal) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded shadow-lg max-w-2xl w-full mx-4">
        <div className="p-4 border-b">
          <div className="text-lg font-semibold text-gray-900">Quick pit stop suggestions</div>
          {refreshmentNote ? <div className="text-sm text-gray-600 mt-1">{refreshmentNote}</div> : null}
        </div>
        <div className="px-4 pt-3">
          <label className="block text-sm font-medium mb-1">Insert at</label>
          <select
            className="w-full border rounded p-2"
            value={posIndex}
            onChange={(e) => setPosIndex(parseInt(e.target.value, 10))}
          >
            {stops.length > 0 && (
              <>
                <option value={0}>{`Before stop 1: ${stops[0]}`}</option>
                {stops.map((name: string, i: number) => {
                  const wLen = waypoints.length;
                  const afterIdx = i + 1 <= wLen ? i + 1 : wLen + 1; // after destination => wLen+1
                  return (
                    <option key={`after-${i}`} value={afterIdx}>{`After stop ${i + 1}: ${name}`}</option>
                  );
                })}
              </>
            )}
          </select>
        </div>
        {/* Search bar */}
        {refreshmentItems.length > 0 && !isLoadingAmenities && (
          <div className="px-4 py-2 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, location, or type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}
        
        {/* Category tabs */}
        {refreshmentItems.length > 0 && !isLoadingAmenities && (
          <div className="border-b bg-gray-50">
            <div className="flex overflow-x-auto px-2 py-1 gap-1 scrollbar-hide">
              {categories.map((cat) => {
                const count = categoryCounts[cat.id] || 0;
                if (cat.id !== "all" && count === 0) return null;
                
                const isActive = categoryFilter === cat.id;
                const colorClasses: Record<string, { active: string; inactive: string }> = {
                  gray: { active: "bg-gray-800 text-white", inactive: "bg-white text-gray-700 hover:bg-gray-100 border-gray-300" },
                  indigo: { active: "bg-indigo-600 text-white", inactive: "bg-white text-indigo-700 hover:bg-indigo-50 border-indigo-300" },
                  purple: { active: "bg-purple-600 text-white", inactive: "bg-white text-purple-700 hover:bg-purple-50 border-purple-300" },
                  blue: { active: "bg-blue-600 text-white", inactive: "bg-white text-blue-700 hover:bg-blue-50 border-blue-300" },
                  green: { active: "bg-green-600 text-white", inactive: "bg-white text-green-700 hover:bg-green-50 border-green-300" },
                  orange: { active: "bg-orange-600 text-white", inactive: "bg-white text-orange-700 hover:bg-orange-50 border-orange-300" },
                  pink: { active: "bg-pink-600 text-white", inactive: "bg-white text-pink-700 hover:bg-pink-50 border-pink-300" },
                  slate: { active: "bg-slate-600 text-white", inactive: "bg-white text-slate-700 hover:bg-slate-50 border-slate-300" },
                };
                const colors = colorClasses[cat.color] || colorClasses.gray;
                
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryFilter(cat.id)}
                    className={`flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                      isActive ? colors.active : colors.inactive
                    }`}
                  >
                    <span className="mr-1">{cat.icon}</span>
                    {cat.label}
                    <span className={`ml-1 ${isActive ? "opacity-80" : "opacity-60"}`}>({count})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div className="p-4 max-h-[55vh] overflow-y-auto">
          {isLoadingAmenities ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-6 w-6 text-blue-600 animate-spin mb-3" />
              <p className="text-sm text-gray-600">Finding nearby amenities...</p>
            </div>
          ) : filteredItems && filteredItems.length ? (
            <>
              {/* Results count indicator */}
              <div className="text-xs text-gray-500 mb-2 flex items-center justify-between">
                <span>
                  Showing {filteredItems.length} 
                  {filteredItems.length !== refreshmentItems.length && ` of ${refreshmentItems.length}`} pit stops
                  {searchQuery && <span className="text-blue-600"> matching "{searchQuery}"</span>}
                </span>
                <span className="text-gray-400">
                  {categoryFilter === "all" && !searchQuery.trim() 
                    ? "Essentials first, then by distance" 
                    : "Sorted by distance"}
                </span>
              </div>
            <ul className="space-y-3">
              {filteredItems.map((p: any, i: number) => {
                const isLocal = p.source === "goa_local" || p.external_place_id?.startsWith("goa:");
                const isExpanded = expandedItems.has(i);
                // Show details for any amenity that has relevant info
                const hasDetails = p.description || p.details || p.location?.landmark || p.location?.address || p.tags?.length > 0;
                
                // Category badge colors
                const categoryColors: Record<string, string> = {
                  toilet: "bg-purple-100 text-purple-800",
                  toilets: "bg-purple-100 text-purple-800",
                  drinking_water: "bg-blue-100 text-blue-800",
                  food_vendor: "bg-orange-100 text-orange-800",
                  dhaba: "bg-amber-100 text-amber-800",
                  restaurant: "bg-pink-100 text-pink-800",
                  cafe: "bg-yellow-100 text-yellow-800",
                  fast_food: "bg-orange-100 text-orange-800",
                  park: "bg-green-100 text-green-800",
                  garden: "bg-green-100 text-green-800",
                  temple: "bg-red-100 text-red-800",
                  church: "bg-gray-100 text-gray-800",
                  beach_access: "bg-cyan-100 text-cyan-800",
                  beach: "bg-cyan-100 text-cyan-800",
                  rest_area: "bg-lime-100 text-lime-800",
                  market: "bg-amber-100 text-amber-800",
                  marketplace: "bg-amber-100 text-amber-800",
                  convenience: "bg-teal-100 text-teal-800",
                  supermarket: "bg-teal-100 text-teal-800",
                  bakery: "bg-orange-100 text-orange-800",
                  bar: "bg-indigo-100 text-indigo-800",
                  pub: "bg-indigo-100 text-indigo-800",
                  fuel: "bg-gray-100 text-gray-800",
                  ice_cream: "bg-pink-100 text-pink-800",
                };
                const badgeColor = categoryColors[p.category] || categoryColors[p.type] || "bg-gray-100 text-gray-800";
                
                // Category-specific icons
                const getCategoryIcon = () => {
                  const cat = p.category || p.type || "";
                  const iconClass = "w-6 h-6";
                  const iconMap: Record<string, React.ReactNode> = {
                    toilet: <Toilet className={`${iconClass} text-purple-500`} />,
                    toilets: <Toilet className={`${iconClass} text-purple-500`} />,
                    drinking_water: <Droplets className={`${iconClass} text-blue-500`} />,
                    food_vendor: <Store className={`${iconClass} text-orange-500`} />,
                    restaurant: <UtensilsCrossed className={`${iconClass} text-pink-500`} />,
                    cafe: <Coffee className={`${iconClass} text-yellow-600`} />,
                    fast_food: <Pizza className={`${iconClass} text-orange-500`} />,
                    park: <Trees className={`${iconClass} text-green-500`} />,
                    garden: <Trees className={`${iconClass} text-green-500`} />,
                    temple: <Building className={`${iconClass} text-red-500`} />,
                    church: <Church className={`${iconClass} text-gray-600`} />,
                    beach_access: <Waves className={`${iconClass} text-cyan-500`} />,
                    beach: <Waves className={`${iconClass} text-cyan-500`} />,
                    rest_area: <ParkingCircle className={`${iconClass} text-lime-500`} />,
                    market: <ShoppingBag className={`${iconClass} text-amber-500`} />,
                    marketplace: <ShoppingBag className={`${iconClass} text-amber-500`} />,
                    convenience: <Store className={`${iconClass} text-teal-500`} />,
                    supermarket: <ShoppingBag className={`${iconClass} text-teal-500`} />,
                    bakery: <Sandwich className={`${iconClass} text-orange-500`} />,
                    bar: <Beer className={`${iconClass} text-indigo-500`} />,
                    pub: <Beer className={`${iconClass} text-indigo-500`} />,
                    fuel: <Fuel className={`${iconClass} text-gray-500`} />,
                    ice_cream: <IceCream className={`${iconClass} text-pink-400`} />,
                  };
                  return iconMap[cat] || <MapPin className={`${iconClass} text-gray-400`} />;
                };
                
                return (
                  <li key={i} className="border rounded-lg overflow-hidden">
                    <div className="flex items-center p-3">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="w-16 h-16 object-cover rounded mr-3" />
                  ) : (
                        <div className="w-16 h-16 bg-gray-100 rounded mr-3 flex items-center justify-center">
                          {getCategoryIcon()}
                        </div>
                  )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-gray-900 truncate">{p.name}</span>
                          {p.category && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${badgeColor}`}>
                              {p.category.replace(/_/g, " ")}
                            </span>
                          )}
                          {/* Source indicator - visible in list */}
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            p.source === "goa_local" 
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                              : p.source === "overpass" 
                                ? "bg-amber-50 text-amber-700 border border-amber-200" 
                                : "bg-blue-50 text-blue-600 border border-blue-200"
                          }`}>
                            {p.source === "goa_local" ? "📍" : p.source === "overpass" ? "🗺️" : "🔵"}
                          </span>
                          {p.isVerified && (
                            <span className="text-xs text-green-600">✓</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 truncate">
                          {p.location?.landmark || p.location?.address || p.location?.area}
                    </div>
                        {p.distance && (
                          <div className="text-xs text-gray-500">{Math.round(p.distance)}m away</div>
                        )}
                  </div>
                      <div className="flex items-center space-x-2 ml-2">
                        {/* Show Details button for all amenities */}
                        <button
                          onClick={() => toggleExpand(i)}
                          className="text-sm text-blue-600 hover:underline flex items-center"
                      >
                        Details
                          {isExpanded ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
                        </button>
                    <button
                      onClick={() => onAdd(p)}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      Add
                    </button>
                  </div>
                    </div>
                    
                    {/* Expanded amenity details - works for all sources */}
                    {isExpanded && hasDetails && (
                      <div className="px-4 pb-4 pt-2 bg-gray-50 border-t text-sm">
                        {/* Description */}
                        {p.description && (
                          <div className="flex items-start gap-2 mb-2">
                            <Info className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-700">{p.description}</span>
                          </div>
                        )}
                        
                        {/* Location context */}
                        {(p.locationContext || p.location?.landmark || p.location?.address) && (
                          <div className="flex items-start gap-2 mb-2">
                            <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-700">
                              {p.locationContext || (p.location?.landmark ? `Near ${p.location.landmark}${p.location?.area ? `, ${p.location.area}` : ""}` : p.location?.address)}
                            </span>
                          </div>
                        )}
                        
                        {/* Hours */}
                        {(p.details?.openTime || p.details?.closeTime) && (
                          <div className="flex items-start gap-2 mb-2">
                            <Clock className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-700">
                              <span className="font-medium">Hours:</span> {p.details.openTime || "?"} - {p.details.closeTime || "?"}
                            </span>
                          </div>
                        )}
                        
                        {/* Cost level */}
                        {(p.costLevel && p.costLevel !== "Unknown") && (
                          <div className="inline-block px-2 py-1 rounded bg-green-100 text-green-800 text-xs mr-2 mb-2">
                            {p.costLevel}
                          </div>
                        )}
                        
                        {/* Amenity-specific badges */}
                        <div className="flex flex-wrap gap-1 mb-2">
                          {p.details?.isFree !== undefined && (
                            <span className="inline-block px-2 py-1 rounded bg-green-100 text-green-800 text-xs">
                              {p.details.isFree ? "Free" : "Paid"}
                            </span>
                          )}
                          {p.details?.isClean && (
                            <span className="inline-block px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs">
                              Clean
                            </span>
                          )}
                          {p.details?.hasWater && (
                            <span className="inline-block px-2 py-1 rounded bg-cyan-100 text-cyan-800 text-xs">
                              Water available
                            </span>
                          )}
                          {p.details?.takeaway && (
                            <span className="inline-block px-2 py-1 rounded bg-orange-100 text-orange-800 text-xs">
                              Takeaway
                            </span>
                          )}
                          {p.details?.delivery && (
                            <span className="inline-block px-2 py-1 rounded bg-purple-100 text-purple-800 text-xs">
                              Delivery
                            </span>
                          )}
                          {p.details?.outdoorSeating && (
                            <span className="inline-block px-2 py-1 rounded bg-lime-100 text-lime-800 text-xs">
                              Outdoor seating
                            </span>
                          )}
                          {p.details?.wheelchair && (
                            <span className="inline-block px-2 py-1 rounded bg-indigo-100 text-indigo-800 text-xs">
                              ♿ Accessible
                            </span>
                          )}
                        </div>
                        
                        {/* Cuisine info */}
                        {p.details?.cuisine && p.details.cuisine.length > 0 && (
                          <div className="text-xs text-gray-600 mb-2">
                            <span className="font-medium">Cuisine:</span> {Array.isArray(p.details.cuisine) ? p.details.cuisine.join(", ") : p.details.cuisine}
                          </div>
                        )}
                        
                        {/* Raw opening hours (for complex OSM formats) */}
                        {p.details?.openingHoursRaw && !p.details?.openTime && (
                          <div className="flex items-start gap-2 mb-2">
                            <Clock className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-700 text-xs">{p.details.openingHoursRaw}</span>
                          </div>
                        )}
                        
                        {/* Contact info */}
                        {(p.details?.phone || p.details?.website) && (
                          <div className="text-xs text-gray-600 mb-2 space-y-1">
                            {p.details.phone && (
                              <div>📞 <a href={`tel:${p.details.phone}`} className="text-blue-600 hover:underline">{p.details.phone}</a></div>
                            )}
                            {p.details.website && (
                              <div>🌐 <a href={p.details.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate">{p.details.website.replace(/^https?:\/\//, '').slice(0, 30)}...</a></div>
                            )}
                          </div>
                        )}
                        
                        {/* Source indicator - more prominent */}
                        {p.source && (
                          <span className={`inline-block px-2 py-1 rounded text-xs mb-2 font-medium ${
                            p.source === "goa_local" 
                              ? "bg-emerald-100 text-emerald-800" 
                              : p.source === "overpass" 
                                ? "bg-amber-100 text-amber-800" 
                                : "bg-blue-100 text-blue-700"
                          }`}>
                            {p.source === "goa_local" ? "📍 Verified Local" : p.source === "overpass" ? "🗺️ OpenStreetMap" : "🔵 Google"}
                          </span>
                        )}
                        
                        {/* Tags */}
                        {p.tags && p.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {p.tags.slice(0, 8).map((tag: string, ti: number) => (
                              <span key={ti} className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                                #{tag.replace(/_/g, " ")}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        {/* Link to view on Google Maps by coordinates */}
                        {p.location?.lat && p.location?.lng && (
                          <div className="mt-3">
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${p.location.lat},${p.location.lng}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-blue-600 hover:underline"
                            >
                              View on Google Maps →
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                </li>
                );
              })}
            </ul>
            </>
          ) : refreshmentItems.length > 0 ? (
            <div className="text-sm text-gray-700 py-8 text-center">
              <div className="text-gray-400 text-4xl mb-3">🔍</div>
              <p className="font-medium">No results found</p>
              <p className="text-gray-500 mt-1">
                {searchQuery ? `No matches for "${searchQuery}"` : `No ${categories.find(c => c.id === categoryFilter)?.label || categoryFilter} spots`}
              </p>
              <div className="mt-3 flex justify-center gap-2">
                {searchQuery && (
                  <button 
                    onClick={clearSearch} 
                    className="text-blue-600 hover:underline text-sm"
                  >
                    Clear search
                  </button>
                )}
                {categoryFilter !== "all" && (
                  <button 
                    onClick={() => setCategoryFilter("all")} 
                    className="text-blue-600 hover:underline text-sm"
                  >
                    Show all categories
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-700 py-8 text-center">
              <div className="text-gray-400 text-4xl mb-3">📍</div>
              <p>No pit stops found nearby.</p>
              <p className="text-gray-500 mt-1">Try a different location!</p>
            </div>
          )}
        </div>
        <div className="p-4 border-t flex justify-end">
          <button
            onClick={() => {
              setShowRefreshmentModal(false);
              if (postSaveRedirectToTrips) {
                setPostSaveRedirectToTrips(false);
                router.push("/my-trips");
              }
            }}
            className="px-4 py-2 rounded border border-gray-300 text-gray-800 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


