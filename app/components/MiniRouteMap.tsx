"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleMap, DirectionsRenderer, Marker, Polyline } from "@react-google-maps/api";
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
  // Store driving routes for segments with sparse transit geometry
  const [drivingFallbacks, setDrivingFallbacks] = useState<Map<number, google.maps.LatLngLiteral[]>>(new Map());

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

  // For transit segments with sparse geometry (like inter-city buses),
  // fetch DRIVING directions to get proper road geometry for display
  useEffect(() => {
    if (!isLoaded || travelMode !== google.maps.TravelMode.TRANSIT) return;
    if (directionsSegments.length === 0) return;

    const getLatLngValue = (loc: any): { lat: number; lng: number } | null => {
      if (!loc) return null;
      if (typeof loc.lat === 'function') return { lat: loc.lat(), lng: loc.lng() };
      if (typeof loc.lat === 'number') return { lat: loc.lat, lng: loc.lng };
      return null;
    };

    const sparseSegments: { idx: number; start: google.maps.LatLngLiteral; end: google.maps.LatLngLiteral }[] = [];

    directionsSegments.forEach((seg, idx) => {
      if (!seg?.routes?.[0]?.legs?.[0]) return;
      const leg = seg.routes[0].legs[0];
      const overviewPath = seg.routes[0].overview_path;
      
      // Check if geometry is sparse (less than 20 points for a segment with transit)
      const hasTransit = leg.steps?.some((s: any) => s.travel_mode === 'TRANSIT');
      const pathLength = overviewPath?.length || 0;
      const distance = leg.distance?.value || 0;
      
      // For segments > 5km with transit that have sparse paths, fetch driving route
      if (hasTransit && distance > 5000 && pathLength < 20) {
        const startLoc = getLatLngValue(leg.start_location);
        const endLoc = getLatLngValue(leg.end_location);
        if (startLoc && endLoc) {
          sparseSegments.push({ idx, start: startLoc, end: endLoc });
        }
      }
    });

    if (sparseSegments.length === 0) {
      // Clear any existing fallbacks if no sparse segments
      if (drivingFallbacks.size > 0) {
        setDrivingFallbacks(new Map());
      }
      return;
    }

    // Check which segments we don't have fallbacks for yet
    const missingFallbacks = sparseSegments.filter(({ idx }) => !drivingFallbacks.has(idx));
    if (missingFallbacks.length === 0) return;

    const svc = new google.maps.DirectionsService();

    missingFallbacks.forEach(({ idx, start: segStart, end: segEnd }) => {
      svc.route({
        origin: segStart,
        destination: segEnd,
        travelMode: google.maps.TravelMode.DRIVING,
      }, (res, status) => {
        if (status === 'OK' && res?.routes?.[0]?.overview_path) {
          const path = res.routes[0].overview_path.map(p => ({
            lat: p.lat(),
            lng: p.lng()
          }));
          setDrivingFallbacks(prev => {
            const updated = new Map(prev);
            updated.set(idx, path);
            return updated;
          });
        }
      });
    });
  }, [isLoaded, travelMode, directionsSegments, drivingFallbacks.size]);

  // Decide which directions to use
  const directions = travelMode === google.maps.TravelMode.TRANSIT 
    ? (directionsSegments.length > 0 ? directionsSegments : null)
    : localDirections;

  // Extract custom markers
  const customMarkers = useMemo(() => {
    const markers: { position: google.maps.LatLngLiteral; label: string; icon: string; isTransitStop?: boolean }[] = [];
    
    // Helper: Extract lat/lng from either LatLng object or plain {lat, lng} object
    // This handles both fresh API responses and deserialized cached data
    const getLatLng = (location: any): { lat: number; lng: number } | null => {
      if (!location) return null;
      // Check if it's a LatLng object with methods
      if (typeof location.lat === 'function') {
        return { lat: location.lat(), lng: location.lng() };
      }
      // Check if it's a plain object with lat/lng numbers
      if (typeof location.lat === 'number' && typeof location.lng === 'number') {
        return { lat: location.lat, lng: location.lng };
      }
      return null;
    };
    
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
        const pos = getLatLng(firstLeg.start_location);
        if (pos) {
          markers.push({
            position: pos,
            label: "A",
            icon: createLabeledMarker("A", "FF4444"),
          });
        }
      }
      
      // Add waypoint markers (B, C, D, ...)
      filteredWaypoints.forEach((wp, wpIdx) => {
        const legIdx = wpIdx;
        const segEndIdx = legEndSegmentIndex[legIdx];
        
        if (segEndIdx !== undefined && segEndIdx < directionsSegments.length) {
          const seg = directionsSegments[segEndIdx];
          const leg = seg?.routes?.[0]?.legs?.[0];
          if (leg) {
            const pos = getLatLng(leg.end_location);
            if (pos) {
              const letter = String.fromCharCode(66 + wpIdx); // B, C, D, ...
              markers.push({
                position: pos,
                label: letter,
                icon: createLabeledMarker(letter, "FF4444"),
              });
            }
          }
        }
      });
      
      // Add destination marker (final letter)
      const lastSeg = directionsSegments[directionsSegments.length - 1];
      const lastLeg = lastSeg?.routes?.[0]?.legs?.[0];
      if (lastLeg) {
        const pos = getLatLng(lastLeg.end_location);
        if (pos) {
          const destLetter = String.fromCharCode(66 + filteredWaypoints.length);
          markers.push({
            position: pos,
            label: destLetter,
            icon: createLabeledMarker(destLetter, "FF4444"),
          });
        }
      }
      
      // Extract transit stops from all segments
      directionsSegments.forEach((seg) => {
        const leg = seg.routes?.[0]?.legs?.[0];
        if (!leg) return;
        
        (leg.steps || []).forEach((step: any) => {
          if (step.travel_mode === "TRANSIT" || step.travel_mode === google.maps.TravelMode.TRANSIT) {
            const tr = step.transit;
            if (tr?.departure_stop?.location) {
              const pos = getLatLng(tr.departure_stop.location);
              if (pos) {
                transitStops.push({
                  position: pos,
                  name: tr.departure_stop.name || "Bus Stop",
                });
              }
            }
            if (tr?.arrival_stop?.location) {
              const pos = getLatLng(tr.arrival_stop.location);
              if (pos) {
                transitStops.push({
                  position: pos,
                  name: tr.arrival_stop.name || "Bus Stop",
                });
              }
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
          const startPos = getLatLng(leg.start_location);
          if (startPos) {
            markers.push({
              position: startPos,
              label: String.fromCharCode(65 + letterIndex),
              icon: createLabeledMarker(String.fromCharCode(65 + letterIndex++), "FF4444"),
            });
          }
        }
        const endPos = getLatLng(leg.end_location);
        if (endPos) {
          markers.push({
            position: endPos,
            label: String.fromCharCode(65 + letterIndex),
            icon: createLabeledMarker(String.fromCharCode(65 + letterIndex++), "FF4444"),
          });
        }
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
          ? directionsSegments
              .filter(seg => seg && seg.routes && Array.isArray(seg.routes) && seg.routes.length > 0)
              .map((seg, idx) => {
                // Check if we have a driving fallback for this segment (sparse geometry)
                const fallbackPath = drivingFallbacks.get(idx);
                if (fallbackPath && fallbackPath.length > 0) {
                  // Use a Polyline with driving route for better visualization
                  return (
                    <Polyline
                      key={`fallback-${idx}`}
                      path={fallbackPath}
                      options={{
                        strokeColor: "#4285F4", // Google Maps blue
                        strokeOpacity: 0.8,
                        strokeWeight: 4,
                      }}
                    />
                  );
                }
                // Use DirectionsRenderer for segments with good geometry
                return (
                  <DirectionsRenderer
                    key={idx}
                    directions={seg}
                    options={{ suppressMarkers: true, preserveViewport: false }}
                  />
                );
              })
          : localDirections && localDirections.routes && Array.isArray(localDirections.routes) && (
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


