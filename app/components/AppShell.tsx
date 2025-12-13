"use client";

import React, { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLoadScript } from "@react-google-maps/api";
import Navbar from "./Navbar";
import TripPlannerModal from "./TripPlannerModal";
import RefreshmentModal from "./RefreshmentModal";
import { useTripContext } from "../context/TripContext";
import type { ReactNode, FormEvent } from "react";

const LIBRARIES: ("places")[] = ["places"];

export default function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });
  
  const {
    showModal,
    setShowModal,
    tripDate,
    setTripDate,
    origin,
    setOrigin,
    originTime,
    setOriginTime,
    destination,
    destinationName,
    setDestination,
    destinationTime,
    setDestinationTime,
    waypoints,
    waypointNames,
    stopTimes,
    addStop,
    removeStop,
    updateStop,
    updateStopTime,
    travelMode,
    setTravelMode,
    filterOption,
    setFilterOption,
    getDirectionsHandler,
    pendingRecalc,
    setPendingRecalc,
    pendingShowAmenities,
    setPendingShowAmenities,
    pendingNavigateHome,
    setPendingNavigateHome,
    forceShowAmenities,
    setDirections,
    setDirectionsSegments,
    setExtraMarkers,
  } = useTripContext();

  // Guard to prevent duplicate recalculation calls
  const isRecalculating = useRef(false);

  // Handle pending navigation to homepage (after directions are calculated from another page)
  useEffect(() => {
    if (pendingNavigateHome) {
      setPendingNavigateHome(false);
      router.push("/");
    }
  }, [pendingNavigateHome, setPendingNavigateHome, router]);

  // Handle pending recalculation from any page (when waypoints are added via RefreshmentModal, etc.)
  useEffect(() => {
    if (!isLoaded || !pendingRecalc) return;
    
    // Prevent duplicate calls (React strict mode or rapid state changes)
    if (isRecalculating.current) return;

    // If origin/destination aren't set, clear the flag and do nothing.
    if (!origin || !destination) {
      setPendingRecalc(false);
      return;
    }

    const run = async () => {
      isRecalculating.current = true;
      const dummy = { preventDefault: () => {} } as unknown as FormEvent;
      try {
        await getDirectionsHandler(dummy, window.google.maps, setDirections, setDirectionsSegments, setExtraMarkers);
      } catch (e) {
        console.error("Recalc error:", e);
      } finally {
        setPendingRecalc(false);
        isRecalculating.current = false;
      }
    };

    run();
  }, [isLoaded, pendingRecalc, origin, destination, getDirectionsHandler, setDirections, setDirectionsSegments, setExtraMarkers, setPendingRecalc]);

  // After recalculation, if user explicitly asked to see amenities, open modal
  useEffect(() => {
    if (!isLoaded || pendingRecalc || !pendingShowAmenities) return;
    if (!origin || !destination) return;
    (async () => {
      try {
        await forceShowAmenities();
      } finally {
        setPendingShowAmenities(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, pendingRecalc, pendingShowAmenities, origin, destination, setPendingShowAmenities]);

  // Provide a wrapper for getDirectionsHandler to match the expected signature
  const handleGetDirections = (e: React.FormEvent) => {
    if (typeof window !== "undefined" && window.google && window.google.maps) {
      getDirectionsHandler(
        e,
        window.google.maps,
        setDirections,
        setDirectionsSegments,
        setExtraMarkers
      );
    }
  };
  return (
    <>
      <Navbar />
      <TripPlannerModal
        showModal={showModal}
        onClose={() => setShowModal(false)}
        tripDate={tripDate}
        setTripDate={setTripDate}
        origin={origin}
        setOrigin={setOrigin}
        originTime={originTime}
        setOriginTime={setOriginTime}
        destination={destination}
        destinationName={destinationName}
        setDestination={setDestination}
        destinationTime={destinationTime}
        setDestinationTime={setDestinationTime}
        waypoints={waypoints}
        waypointNames={waypointNames}
        stopTimes={stopTimes}
        onAddStop={addStop}
        onRemoveStop={removeStop}
        onUpdateStop={updateStop}
        onUpdateStopTime={updateStopTime}
        travelMode={travelMode}
        setTravelMode={setTravelMode}
        filterOption={filterOption}
        setFilterOption={setFilterOption}
        onGetDirections={handleGetDirections}
      />
      <RefreshmentModal />
      {children}
    </>
  );
}
