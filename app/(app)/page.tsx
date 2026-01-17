"use client";

import React, { useState, useEffect } from "react";
import { useLoadScript } from "@react-google-maps/api";
import TripPlannerModal from "../components/TripPlannerModal";
import ItineraryView from "../components/ItineraryView";
import { ChevronLeft, ChevronRight, MapPin, Utensils, Church, Compass } from "lucide-react";
import { useTripContext } from "../context/TripContext";
import { useRouter } from "next/navigation";

const LIBRARIES: ("places")[] = ["places"];

export default function HomePage() {
  const router = useRouter();
  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });
  const {
    setWaypoints,
    waypointNames,
    setWaypointNames,
    setStopTimes,
    showModal,
    setShowModal,
    tripDate,
    setTripDate,
    origin,
    setOrigin,
    originTime,
    setOriginTime,
    destination,
    setDestination,
    destinationName,
    setDestinationName,
    destinationTime,
    setDestinationTime,
    waypoints,
    stopTimes,
    addStop,
    removeStop,
    updateStop,
    updateStopTime,
    travelMode,
    setTravelMode,
    filterOption,
    setFilterOption,
    showItinerary,
    setShowItinerary,
    itinerary,
    setItinerary,
    savedJourneys,
    showTrips,
    setShowTrips,
    deleteTripHandler,
    saveTripHandler,
    getDirectionsHandler,
    setDirections,
    setDirectionsSegments,
    setExtraMarkers,
    setEditingJourneyId,
  } = useTripContext();

  // Carousel state
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isMapZoomed, setIsMapZoomed] = useState(false);

  const slides = [
    {
      id: 1,
      title: "Discover Pristine Beaches",
      description: "From serene Palolem to vibrant Baga",
      image: "/beach.jpg",
      icon: <Compass className="h-6 w-6 text-white" />,
    },
    {
      id: 2,
      title: "Taste Goan Delights",
      description: "From local fish thalis to fine dining",
      image: "", // Food collage - handled separately
      icon: <Utensils className="h-6 w-6 text-white" />,
      isFoodCollage: true,
    },
    {
      id: 3,
      title: "Visit Heritage Sites",
      description: "Portuguese churches, historic forts & culture",
      image: "/church.webp",
      icon: <Church className="h-6 w-6 text-white" />,
    },
    {
      id: 4,
      title: "Relax at Scenic Spots",
      description: "Rest areas, parks & peaceful benches",
      image: "/restspot.webp",
      icon: <MapPin className="h-6 w-6 text-white" />,
    },
    {
      id: 5,
      title: "Smart Itinerary Planning",  
      description: "Routes, stops & interactive maps",
      image: "/itinerary.png",
      icon: <MapPin className="h-6 w-6 text-white" />,
      isItinerary: true,
    },
  ];

  // Auto-rotate carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  // Map zoom-out effect on last slide (starts zoomed in, then zooms out)
  useEffect(() => {
    if (currentSlide === 4) {
      // Start zoomed in, then zoom out after a brief delay
      setIsMapZoomed(true);
      const zoomTimer = setTimeout(() => setIsMapZoomed(false), 800);
      return () => {
        clearTimeout(zoomTimer);
      };
    } else {
      setIsMapZoomed(false);
    }
  }, [currentSlide]);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);

  // Recalculation is now handled by AppShell (always mounted)
  
  return (
    <div className="min-h-screen relative z-10">
      {showModal && (
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
          onGetDirections={(e) => getDirectionsHandler(e, window.google.maps, setDirections, setDirectionsSegments, setExtraMarkers)}
        />
      )}
      <ItineraryView
        showItinerary={showItinerary}
        itinerary={itinerary}
        onSaveTrip={saveTripHandler}
        onShowMap={() => setShowItinerary(false)}
        isLoaded={isLoaded}
        loadError={loadError}
      />

      {/* RefreshmentModal is now in AppShell for global access */}

      {!showItinerary && (
        <div className="relative z-10">
          {/* Hero Section with Welcome */}
          <div className="max-w-6xl mx-auto px-6 pt-12 pb-8">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-semibold text-[#6B5539] mb-4">
                Welcome to Trippin&apos;
              </h1>
              <p className="text-lg text-gray-700 max-w-2xl mx-auto leading-relaxed">
                Your smart travel companion for exploring Goa. Plan perfect routes, discover hidden gems, 
                and make the most of your beach paradise adventure.
              </p>
            </div>

            {/* Simple Directions */}
            <div className="glass rounded-2xl p-6 max-w-3xl mx-auto mb-12 border-2 border-[#E8D4A8]">
              <div className="text-center space-y-3">
                <p className="text-gray-800">
                  <span className="font-semibold">Getting started is simple:</span> Hit{" "}
                  <button
                    onClick={() => setShowModal(true)}
                    className="inline-flex items-center text-[#4A7C59] font-semibold hover:underline"
                  >
                    Plan Trip
                  </button>
                  , enter a few details, and let us handle the rest.
                </p>
                <p className="text-gray-700">
                  Not sure where to go? Hit{" "}
                  <button
                    onClick={() => router.push("/explore")}
                    className="inline-flex items-center text-[#4A7C59] font-semibold hover:underline"
                  >
                    Explore
                  </button>{" "}
                  to discover amazing places and plan your adventure on the fly.
                </p>
              </div>
            </div>
          </div>

          {/* Carousel */}
          <div className="max-w-5xl mx-auto px-6 pb-16">
            <div className="relative h-[480px] rounded-2xl overflow-hidden shadow-2xl border-4 border-[#E8D4A8]">
              {slides.map((slide, idx) => (
                <div
                  key={slide.id}
                  className={`absolute inset-0 transition-opacity duration-700 ${
                    idx === currentSlide ? "opacity-100" : "opacity-0"
                  }`}
                >
                  {/* Background Image or Collage */}
                  {slide.isFoodCollage ? (
                    // Artistic Food Collage - asymmetric overlapping layout
                    <div className="absolute inset-0 bg-[#4A90A4]">
                      {/* Background layer */}
                      <div className="absolute inset-0">
                        {/* Food 1 - Left aligned, full height */}
                        <img 
                          src="/food1.webp" 
                          alt="Goan food 1" 
                          className="absolute top-0 left-0 w-[50%] h-full object-cover shadow-lg"
                          style={{ 
                            filter: 'contrast(1.1) saturate(1.2) brightness(1.05)',
                            objectPosition: 'center center'
                          }}
                        />
                        {/* Food 2 - Top right */}
                        <img 
                          src="/food2.jpg" 
                          alt="Goan food 2" 
                          className="absolute top-0 right-0 w-[52%] h-[50%] object-cover shadow-lg"
                          style={{ 
                            filter: 'contrast(1.1) saturate(1.2) brightness(1.05)',
                            objectPosition: 'center 30%'
                          }}
                        />
                        {/* Food 3 - Bottom right */}
                        <img 
                          src="/food3.jpeg" 
                          alt="Goan food 3" 
                          className="absolute bottom-0 right-0 w-[52%] h-[52%] object-cover shadow-lg"
                          style={{ 
                            filter: 'contrast(1.1) saturate(1.2) brightness(1.05)',
                            objectPosition: 'center 40%'
                          }}
                        />
                        {/* Food 4 - Foreground "window" - small featured image */}
                        <div className="absolute top-1/2 left-[40%] -translate-x-1/2 -translate-y-1/2 w-[26%] h-[32%] z-10 overflow-hidden rounded-xl border-3 border-white shadow-2xl">
                          <img 
                            src="/food4.jpeg" 
                            alt="Goan food 4" 
                            className="w-full h-full"
                            style={{ 
                              filter: 'contrast(1.15) saturate(1.25) brightness(1.08)',
                              objectFit: 'contain'
                            }}
                          />
                        </div>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-[#4A90A4]">
                      <img 
                        src={slide.image} 
                        alt={slide.title}
                        className="w-full h-full object-cover"
                        style={{ 
                          filter: 'contrast(1.1) saturate(1.2) brightness(1.05)',
                          objectPosition: slide.title === "Relax at Scenic Spots" ? 'center center' : 'center'
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                    </div>
                  )}

                  {/* Content Overlay */}
                  <div className="relative h-full flex flex-col justify-end p-8">
                    {slide.isItinerary ? (
                      // Full screenshot with zoom-out effect and overlay text
                      <div className="relative h-full">
                        {/* Screenshot background with zoom effect */}
                        <div 
                          className={`absolute inset-0 transition-transform duration-1500 ease-out ${
                            isMapZoomed ? "scale-150" : "scale-90"
                          }`}
                        >
                          <img 
                            src={slide.image} 
                            alt="Itinerary preview" 
                            className="w-full h-full object-contain"
                            style={{ filter: 'contrast(1.05) brightness(1.05)' }}
                          />
                        </div>
                        {/* Dark overlay for text */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                        {/* Text overlay */}
                        <div className="absolute bottom-0 left-0 right-0 p-8">
                          <div className="glass rounded-xl p-6 border border-white/30 max-w-3xl">
                            <div className="flex items-center gap-3 mb-3">
                              {slide.icon}
                              <h3 className="text-2xl font-semibold text-white">{slide.title}</h3>
                            </div>
                            <p className="text-white/90 text-lg mb-4">{slide.description}</p>
                            <div className="flex flex-wrap gap-x-6 gap-y-2">
                              <div className="flex items-center gap-2 text-white/80 text-sm">
                                <div className="w-2 h-2 rounded-full bg-[#5FAD56]" />
                                <span>Bus routes with real-time directions</span>
                              </div>
                              <div className="flex items-center gap-2 text-white/80 text-sm">
                                <div className="w-2 h-2 rounded-full bg-[#87CEEB]" />
                                <span>Interactive maps at every step</span>
                              </div>
                              <div className="flex items-center gap-2 text-white/80 text-sm">
                                <div className="w-2 h-2 rounded-full bg-[#E07856]" />
                                <span>Waypoints & timing customization</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Regular slide layout
                      <div className="glass rounded-xl p-6 max-w-2xl border border-white/30">
                        <div className="flex items-center gap-3 mb-2">
                          {slide.icon}
                          <h3 className="text-3xl font-semibold text-white">{slide.title}</h3>
                        </div>
                        <p className="text-white/90 text-lg">{slide.description}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Navigation Arrows - stationary */}
              <button
                onClick={prevSlide}
                className="absolute left-4 top-1/2 -translate-y-1/2 btn-glass-static p-3 rounded-full z-10"
              >
                <ChevronLeft className="h-6 w-6 text-gray-700" />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-4 top-1/2 -translate-y-1/2 btn-glass-static p-3 rounded-full z-10"
              >
                <ChevronRight className="h-6 w-6 text-gray-700" />
              </button>

              {/* Dots Indicator */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {slides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className={`h-2 rounded-full transition-all ${
                      idx === currentSlide ? "w-8 bg-white" : "w-2 bg-white/50"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
