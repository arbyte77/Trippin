"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleMap, DirectionsRenderer, Marker } from "@react-google-maps/api";
import { useTripContext } from "../context/TripContext";

interface MiniRouteMapProps {
  start: string;
  destination: string;
  waypoints?: string[];
  travelMode: google.maps.TravelMode;
  width?: number | string;
  height?: number | string;
  beforeNavigate?: () => void;
  isLoaded: boolean;
  loadError?: unknown;
}

// Create a labeled marker icon (A, B, C, etc.) using Google's chart API
const createLabeledMarker = (label: string, color: string = "red") => {
  return `https://chart.googleapis.com/chart?chst=d_map_pin_letter&chld=${label}|${color.replace('#', '')}|FFFFFF`;
};

// Bus stop icon URL
const BUS_STOP_ICON = "https://maps.google.com/mapfiles/kml/shapes/bus.png";

export default function MiniRouteMap({
  start,
  destination,
  waypoints = [],
  travelMode,
  width = 360,
  height = 220,
  beforeNavigate,
  isLoaded,
  loadError,
}: MiniRouteMapProps) {
  const router = useRouter();
  const { directionsSegments, segmentsByLeg } = useTripContext();
  const [localDirections, setLocalDirections] = useState<google.maps.DirectionsResult | null>(null);

  const containerStyle = useMemo(
    () => ({
      width: typeof width === "number" ? `${width}px` : width,
      height: typeof height === "number" ? `${height}px` : height,
    }),
    [width, height]
  );

  // For non-transit, calculate directions locally
  useEffect(() => {
    if (!isLoaded || !start || !destination) return;
    if (travelMode === google.maps.TravelMode.TRANSIT) {
      // Use directionsSegments from context for transit
      return;
    }
    const svc = new google.maps.DirectionsService();
    const request: google.maps.DirectionsRequest = {
      origin: start,
      destination,
      travelMode,
      waypoints: (waypoints || []).filter(Boolean).map((w) => ({ location: w })),
    };
    svc.route(request, (res, status) => {
      if (status === "OK" && res) {
        setLocalDirections(res);
      } else {
        setLocalDirections(null);
      }
    });
  }, [isLoaded, start, destination, waypoints, travelMode]);

  // Decide which directions to use
  const directions = travelMode === google.maps.TravelMode.TRANSIT 
    ? (directionsSegments.length > 0 ? directionsSegments : null)
    : localDirections;

  // Extract custom markers
  const customMarkers = useMemo(() => {
    const markers: { position: google.maps.LatLngLiteral; label: string; icon: string; isTransitStop?: boolean }[] = [];
    
    if (travelMode === google.maps.TravelMode.TRANSIT && directionsSegments.length > 0) {
      const transitStops: { position: google.maps.LatLngLiteral; name: string }[] = [];
      const filteredWaypoints = waypoints.filter(Boolean);
      
      // Calculate segment indices for each leg using segmentsByLeg
      const numLegs = filteredWaypoints.length + 1;
      const legEndSegmentIndex: number[] = [];
      
      if (segmentsByLeg && segmentsByLeg.length > 0) {
        let cumulative = 0;
        segmentsByLeg.forEach((count) => {
          cumulative += count;
          legEndSegmentIndex.push(cumulative - 1);
        });
      } else {
        for (let i = 0; i < numLegs && i < directionsSegments.length; i++) {
          legEndSegmentIndex.push(i);
        }
      }
      
      // Add origin marker (A)
      const firstSeg = directionsSegments[0];
      const firstLeg = firstSeg?.routes?.[0]?.legs?.[0];
      if (firstLeg) {
        markers.push({
          position: { lat: firstLeg.start_location.lat(), lng: firstLeg.start_location.lng() },
          label: "A",
          icon: createLabeledMarker("A", "FF4444"),
        });
      }
      
      // Add waypoint markers (B, C, D, ...)
      filteredWaypoints.forEach((wp, wpIdx) => {
        const legIdx = wpIdx;
        const segEndIdx = legEndSegmentIndex[legIdx];
        
        if (segEndIdx !== undefined && segEndIdx < directionsSegments.length) {
          const seg = directionsSegments[segEndIdx];
          const leg = seg?.routes?.[0]?.legs?.[0];
          if (leg) {
            const letter = String.fromCharCode(66 + wpIdx); // B, C, D, ...
            markers.push({
              position: { lat: leg.end_location.lat(), lng: leg.end_location.lng() },
              label: letter,
              icon: createLabeledMarker(letter, "FF4444"),
            });
          }
        }
      });
      
      // Add destination marker (final letter)
      const lastSeg = directionsSegments[directionsSegments.length - 1];
      const lastLeg = lastSeg?.routes?.[0]?.legs?.[0];
      if (lastLeg) {
        const destLetter = String.fromCharCode(66 + filteredWaypoints.length);
        markers.push({
          position: { lat: lastLeg.end_location.lat(), lng: lastLeg.end_location.lng() },
          label: destLetter,
          icon: createLabeledMarker(destLetter, "FF4444"),
        });
      }
      
      // Extract transit stops from all segments
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
      
      // Add transit stops with bus icons (deduplicated)
      const seenPositions = new Set<string>();
      transitStops.forEach((stop) => {
        const key = `${stop.position.lat.toFixed(5)},${stop.position.lng.toFixed(5)}`;
        const isNearUserMarker = markers.some((m) => {
          const dist = Math.sqrt(
            Math.pow(m.position.lat - stop.position.lat, 2) + 
            Math.pow(m.position.lng - stop.position.lng, 2)
          );
          return dist < 0.002;
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
    } else if (localDirections) {
      const legs = localDirections.routes?.[0]?.legs || [];
      let letterIndex = 0;
      
      legs.forEach((leg, idx) => {
        if (idx === 0) {
          markers.push({
            position: { lat: leg.start_location.lat(), lng: leg.start_location.lng() },
            label: String.fromCharCode(65 + letterIndex),
            icon: createLabeledMarker(String.fromCharCode(65 + letterIndex++), "FF4444"),
          });
        }
        markers.push({
          position: { lat: leg.end_location.lat(), lng: leg.end_location.lng() },
          label: String.fromCharCode(65 + letterIndex),
          icon: createLabeledMarker(String.fromCharCode(65 + letterIndex++), "FF4444"),
        });
      });
    }
    
    return markers;
  }, [travelMode, localDirections, directionsSegments, segmentsByLeg, waypoints]);

  // Rough default center for Goa to avoid blank map before directions load
  const defaultCenter = { lat: 15.491997, lng: 73.8278 };

  if (loadError) return <div className="text-sm text-red-600">Map failed to load.</div>;
  if (!isLoaded) return <div className="text-sm text-gray-600">Loading map...</div>;

  return (
    <div className="rounded overflow-hidden border relative" style={containerStyle as React.CSSProperties}>
      {/* Click overlay to navigate to full map */}
      <div
        className="absolute inset-0 z-10 cursor-pointer"
        onClick={() => {
          try {
            beforeNavigate?.();
          } finally {
            router.push("/map");
          }
        }}
        aria-label="Open full map"
        role="button"
      />
      <GoogleMap mapContainerStyle={{ width: "100%", height: "100%" }} center={defaultCenter} zoom={11}>
        {/* Render route lines */}
        {travelMode === google.maps.TravelMode.TRANSIT && directionsSegments.length > 0
          ? directionsSegments.map((seg, idx) => (
              <DirectionsRenderer
                key={idx}
                directions={seg}
                options={{ suppressMarkers: true, preserveViewport: false }}
              />
            ))
          : localDirections && (
              <DirectionsRenderer
                directions={localDirections}
                options={{ suppressMarkers: true, preserveViewport: false }}
              />
            )}
        
        {/* Custom markers */}
        {customMarkers.map((marker, idx) => (
          <Marker 
            key={idx} 
            position={marker.position} 
            icon={{
              url: marker.icon,
              scaledSize: marker.isTransitStop 
                ? new google.maps.Size(20, 20)
                : new google.maps.Size(18, 29),
            }}
          />
        ))}
      </GoogleMap>
    </div>
  );
}


