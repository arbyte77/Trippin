"use client";
import React, { useMemo } from "react";
import { GoogleMap, DirectionsRenderer, Marker, Polyline } from "@react-google-maps/api";

import { useTripContext } from "../context/TripContext";

interface MapViewProps {
  showItinerary: boolean;
  containerStyle: React.CSSProperties;
  defaultCenter: google.maps.LatLngLiteral;
  icon: google.maps.Symbol | google.maps.Icon | string;
}

// Create a labeled marker icon (A, B, C, etc.) using SVG data URL
const createLabeledMarker = (label: string, color: string = "#EA4335") => {
  // SVG pin marker with letter label
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
      <path fill="${color}" stroke="#FFFFFF" stroke-width="1" d="M16 0C7.163 0 0 7.163 0 16c0 8.837 16 26 16 26s16-17.163 16-26C32 7.163 24.837 0 16 0z"/>
      <circle fill="#FFFFFF" cx="16" cy="15" r="10"/>
      <text x="16" y="20" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="${color}">${label}</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

// Blue dot marker for origin (like current location indicator)
const createOriginMarker = () => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" fill="#4285F4" stroke="#FFFFFF" stroke-width="3"/>
      <circle cx="12" cy="12" r="4" fill="#FFFFFF"/>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const ORIGIN_BLUE_DOT = createOriginMarker();

// Bus stop icon URL
const BUS_STOP_ICON = "https://maps.google.com/mapfiles/kml/shapes/bus.png";

// Category-based amenity marker icons (diamond shape)
const createAmenityMarker = (category: string) => {
  const categoryColors: Record<string, string> = {
    toilet: "#9C27B0",        // Purple
    drinking_water: "#2196F3", // Blue
    food_vendor: "#FF9800",   // Orange
    dhaba: "#FF5722",         // Deep orange
    restaurant: "#E91E63",    // Pink
    cafe: "#795548",          // Brown
    park: "#4CAF50",          // Green
    temple: "#FF5722",        // Deep orange
    church: "#9E9E9E",        // Gray
    beach_access: "#00BCD4",  // Cyan
    rest_area: "#8BC34A",     // Light green
    market: "#FFC107",        // Amber
    default: "#607D8B",       // Blue gray
  };
  const color = categoryColors[category?.toLowerCase()] || categoryColors.default;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
      <path fill="${color}" stroke="#FFFFFF" stroke-width="1.5" d="M12 2 L22 12 L12 22 L2 12 Z"/>
      <circle fill="#FFFFFF" cx="12" cy="12" r="4"/>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

export default function MapView({ showItinerary, containerStyle, defaultCenter, icon }: MapViewProps) {
  const { directions, directionsSegments, segmentsByLeg, extraMarkers, travelMode, origin, destination, waypoints } = useTripContext();
  
  // Extract positions for custom markers
  // Origin = Blue dot, Stops (waypoints + destination) = A, B, C, ... in order
  const customMarkers = useMemo(() => {
    const markers: { position: google.maps.LatLngLiteral; label: string; icon: string; isTransitStop?: boolean; isOrigin?: boolean }[] = [];
    
    // Get the list of valid waypoints (non-empty strings)
    const validWaypoints = waypoints.filter(w => w && w.trim());
    
    if (travelMode === "TRANSIT" && directionsSegments.length > 0) {
      // Track transit stops we've seen to add bus icons
      const transitStops: { position: google.maps.LatLngLiteral; name: string }[] = [];
      
      // Calculate segment indices for each leg using segmentsByLeg
      const numLegs = validWaypoints.length + 1; // origin->wp1, wp1->wp2, ..., wpN->dest
      const legEndSegmentIndex: number[] = []; // Index of last segment for each leg
      
      if (segmentsByLeg && segmentsByLeg.length > 0) {
        let cumulative = 0;
        segmentsByLeg.forEach((count) => {
          cumulative += count;
          legEndSegmentIndex.push(cumulative - 1);
        });
      } else {
        // Fallback: assume 1 segment per leg
        for (let i = 0; i < numLegs && i < directionsSegments.length; i++) {
          legEndSegmentIndex.push(i);
        }
      }
      
      // Add origin marker as blue dot
      const firstSeg = directionsSegments[0];
      const firstLeg = firstSeg?.routes?.[0]?.legs?.[0];
      if (firstLeg) {
        markers.push({
          position: { lat: firstLeg.start_location.lat(), lng: firstLeg.start_location.lng() },
          label: "Origin",
          icon: ORIGIN_BLUE_DOT,
          isOrigin: true,
        });
      }
      
      // Add waypoint markers (A, B, C, ...) using end positions of each leg
      // Waypoints are labeled starting from 'A'
      validWaypoints.forEach((wp, wpIdx) => {
        const legIdx = wpIdx; // Leg index for this waypoint (0 = origin->wp1, etc.)
        const segEndIdx = legEndSegmentIndex[legIdx];
        
        if (segEndIdx !== undefined && segEndIdx < directionsSegments.length) {
          const seg = directionsSegments[segEndIdx];
          const leg = seg?.routes?.[0]?.legs?.[0];
          if (leg) {
            const letter = String.fromCharCode(65 + wpIdx); // A, B, C, ...
            markers.push({
              position: { lat: leg.end_location.lat(), lng: leg.end_location.lng() },
              label: letter,
              icon: createLabeledMarker(letter, "#EA4335"),
            });
          }
        }
      });
      
      // Add destination marker (next letter after all waypoints)
      const lastSegIdx = directionsSegments.length - 1;
      const lastSeg = directionsSegments[lastSegIdx];
      const lastLeg = lastSeg?.routes?.[0]?.legs?.[0];
      if (lastLeg) {
        const destLetter = String.fromCharCode(65 + validWaypoints.length); // A if no waypoints, B if 1 waypoint, etc.
        markers.push({
          position: { lat: lastLeg.end_location.lat(), lng: lastLeg.end_location.lng() },
          label: destLetter,
          icon: createLabeledMarker(destLetter, "#EA4335"),
        });
      }
      
      // Extract transit board/alight stops from all segments
      directionsSegments.forEach((seg) => {
        const leg = seg.routes?.[0]?.legs?.[0];
        if (!leg) return;
        
        (leg.steps || []).forEach((step: any) => {
          if (step.travel_mode === "TRANSIT" || step.travel_mode === google.maps.TravelMode.TRANSIT) {
            const tr = step.transit;
            if (tr?.departure_stop?.location) {
              transitStops.push({
                position: { 
                  lat: tr.departure_stop.location.lat(), 
                  lng: tr.departure_stop.location.lng() 
                },
                name: tr.departure_stop.name || "Bus Stop",
              });
            }
            if (tr?.arrival_stop?.location) {
              transitStops.push({
                position: { 
                  lat: tr.arrival_stop.location.lat(), 
                  lng: tr.arrival_stop.location.lng() 
                },
                name: tr.arrival_stop.name || "Bus Stop",
              });
            }
          }
        });
      });
      
      // Add transit stops with bus icons (deduplicated, skip if near user markers)
      const seenPositions = new Set<string>();
      transitStops.forEach((stop) => {
        const key = `${stop.position.lat.toFixed(5)},${stop.position.lng.toFixed(5)}`;
        // Skip if too close to an existing user marker (origin, waypoints, destination)
        const isNearUserMarker = markers.some((m) => {
          const dist = Math.sqrt(
            Math.pow(m.position.lat - stop.position.lat, 2) + 
            Math.pow(m.position.lng - stop.position.lng, 2)
          );
          return dist < 0.002; // ~200m
        });
        if (!seenPositions.has(key) && !isNearUserMarker) {
          seenPositions.add(key);
          markers.push({
            position: stop.position,
            label: stop.name,
            icon: BUS_STOP_ICON,
            isTransitStop: true,
          });
        }
      });
    } else if (directions) {
      // Non-transit: Blue dot for origin, A, B, C... for waypoints and destination
      const legs = directions.routes?.[0]?.legs || [];
      let stopIndex = 0; // Index for labeling stops (A, B, C, ...)
      
      legs.forEach((leg, idx) => {
        // Add origin marker (blue dot) for first leg only
        if (idx === 0) {
          markers.push({
            position: { lat: leg.start_location.lat(), lng: leg.start_location.lng() },
            label: "Origin",
            icon: ORIGIN_BLUE_DOT,
            isOrigin: true,
          });
        }
        // Add end marker for each leg (waypoint or destination)
        // Labels: A for first stop, B for second, etc.
        const letter = String.fromCharCode(65 + stopIndex);
        markers.push({
          position: { lat: leg.end_location.lat(), lng: leg.end_location.lng() },
          label: letter,
          icon: createLabeledMarker(letter, "#EA4335"),
        });
        stopIndex++;
      });
    }
    
    return markers;
  }, [travelMode, directions, directionsSegments, segmentsByLeg, waypoints]);

  // Analyze segments to determine which are walking-only vs transit
  const segmentAnalysis = useMemo(() => {
    if (travelMode !== "TRANSIT" || directionsSegments.length === 0) {
      return [];
    }
    
    return directionsSegments.map((seg) => {
      const leg = seg.routes?.[0]?.legs?.[0];
      if (!leg) return { isWalkingOnly: false, path: [] };
      
      // Check if this segment has any transit steps
      const hasTransit = (leg.steps || []).some((step: any) => 
        step.travel_mode === google.maps.TravelMode.TRANSIT || 
        step.travel_mode === "TRANSIT"
      );
      
      // If no transit, this is a walking-only segment
      if (!hasTransit) {
        // Extract the path from all steps for custom rendering
        const path: google.maps.LatLngLiteral[] = [];
        (leg.steps || []).forEach((step: any) => {
          if (step.path) {
            step.path.forEach((point: google.maps.LatLng) => {
              path.push({ lat: point.lat(), lng: point.lng() });
            });
          } else if (step.start_location && step.end_location) {
            // Fallback: use start and end locations
            path.push({ 
              lat: step.start_location.lat(), 
              lng: step.start_location.lng() 
            });
            path.push({ 
              lat: step.end_location.lat(), 
              lng: step.end_location.lng() 
            });
          }
        });
        
        // If path is empty, use leg start/end
        if (path.length === 0 && leg.start_location && leg.end_location) {
          path.push({ 
            lat: leg.start_location.lat(), 
            lng: leg.start_location.lng() 
          });
          path.push({ 
            lat: leg.end_location.lat(), 
            lng: leg.end_location.lng() 
          });
        }
        
        return { isWalkingOnly: true, path };
      }
      
      return { isWalkingOnly: false, path: [] };
    });
  }, [travelMode, directionsSegments]);

  if (showItinerary) return null;
  
  // Walking polyline style (dotted blue line)
  const walkingPolylineOptions: google.maps.PolylineOptions = {
    strokeColor: "#4285F4",
    strokeOpacity: 0,
    strokeWeight: 4,
    icons: [
      {
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: "#4285F4",
          fillOpacity: 1,
          strokeColor: "#4285F4",
          strokeOpacity: 1,
          scale: 3,
        },
        offset: "0",
        repeat: "12px",
      },
    ],
  };
  
  return (
    <div className="mt-4">
      <GoogleMap mapContainerStyle={containerStyle} center={defaultCenter} zoom={14}>
        {/* Render route lines - transit segments use DirectionsRenderer, walking uses dotted Polyline */}
        {travelMode === "TRANSIT" && directionsSegments.length > 0
          ? directionsSegments.map((seg, idx) => {
              const analysis = segmentAnalysis[idx];
              
              // Walking-only segment: render as dotted polyline
              if (analysis?.isWalkingOnly && analysis.path.length > 0) {
                return (
                  <Polyline
                    key={`walk-${idx}`}
                    path={analysis.path}
                    options={walkingPolylineOptions}
                  />
                );
              }
              
              // Transit segment: use DirectionsRenderer
              return (
                <DirectionsRenderer
                  key={idx}
                  directions={seg}
                  options={{ suppressMarkers: true, preserveViewport: false }}
                />
              );
            })
          : directions && (
              <DirectionsRenderer
                directions={directions}
                options={{ suppressMarkers: true, preserveViewport: false }}
              />
            )}
        
        {/* Custom markers: origin (blue dot), stops with letters (A, B, C...), transit stops with bus icons */}
        {customMarkers.map((marker, idx) => (
          <Marker 
            key={idx} 
            position={marker.position} 
            icon={{
              url: marker.icon,
              scaledSize: marker.isTransitStop 
                ? new google.maps.Size(24, 24)
                : marker.isOrigin
                  ? new google.maps.Size(28, 28) // Blue dot for origin
                  : new google.maps.Size(32, 42), // Pin for stops (matches SVG viewBox)
              anchor: marker.isOrigin 
                ? new google.maps.Point(14, 14) // Center anchor for blue dot
                : new google.maps.Point(16, 42), // Bottom center anchor for pin
            }}
            title={marker.isOrigin ? "Origin: " + marker.label : marker.label}
          />
        ))}
        
        {/* Amenity markers from context */}
        {extraMarkers.map((marker: any, idx) => (
          <Marker 
            key={`amenity-${idx}`} 
            position={marker.position} 
            icon={{
              url: createAmenityMarker(marker.category || "default"),
              scaledSize: new google.maps.Size(28, 28),
              anchor: new google.maps.Point(14, 14),
            }}
            title={marker.name || "Amenity"}
          />
        ))}
      </GoogleMap>
    </div>
  );
}
