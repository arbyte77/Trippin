"use client";
import React, { useMemo } from "react";
import { GoogleMap, DirectionsRenderer, Marker } from "@react-google-maps/api";

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

  if (showItinerary) return null;
  
  return (
    <div className="mt-4">
      <GoogleMap mapContainerStyle={containerStyle} center={defaultCenter} zoom={14}>
        {/* Render route lines without default markers */}
        {travelMode === "TRANSIT" && directionsSegments.length > 0
          ? directionsSegments.map((seg, idx) => (
              <DirectionsRenderer
                key={idx}
                directions={seg}
                options={{ suppressMarkers: true, preserveViewport: false }}
              />
            ))
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
        
        {/* Extra markers from context */}
        {extraMarkers.map((marker, idx) => (
          <Marker key={`extra-${idx}`} position={marker.position} icon={icon} />
        ))}
      </GoogleMap>
    </div>
  );
}
