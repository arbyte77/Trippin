"use client";

import React, { useState, useRef, useEffect } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { UserCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTripContext } from "../context/TripContext";

export default function Navbar() {
  const { data: session, status } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const {
    setShowModal,
    setShowTrips,
    setEditingJourneyId,
    setWaypoints,
    setStopTimes,
    setDestination,
    setDestinationName,
    setWaypointNames,
    clearTripState,
    setShowItinerary,
  } = useTripContext();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  return (
    <nav className="bg-[#F4E4C1] border-b-4 border-[#C8B896] px-6 py-4 sticky top-0 z-50 shadow-lg">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex-shrink-0 cursor-pointer group" onClick={() => {
          setShowItinerary(false);
          router.push("/");
        }}> 
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#4A7C59] via-[#E07856] to-[#87CEEB] bg-clip-text text-transparent transition-all group-hover:scale-105">
            🌴 TRIPPIN&apos;
          </h1>
        </div>

        <div className="flex space-x-3 items-center relative">
          {/* Home Button */}
          <button 
            className="btn-glass text-gray-700 px-4 py-2 rounded-lg font-medium"
            onClick={() => {
              setShowItinerary(false);
              router.push("/");
            }}
          >
            Home
          </button>

          {/* Explore Button */}
          <button 
            className="btn-glass text-gray-700 px-4 py-2 rounded-lg font-medium"
            onClick={() => router.push("/explore")}
          >
            Explore
          </button>

          {/* Plan Trip button */}
          <button
            onClick={() => {
              setEditingJourneyId(null);
              setWaypoints([]);
              setStopTimes([]);
              setDestination("");
              setDestinationName("");
              setWaypointNames({});
              clearTripState();
              setShowModal(true);
            }}
            className="btn-glass text-gray-700 px-4 py-2 rounded-lg font-medium"
          >
            Plan Trip
          </button>

          {/* Signed-out: Show Sign In */}
          {status !== "authenticated" ? (
            <button
              onClick={() => signIn("google")}
              className="btn-glass text-gray-700 px-4 py-2 rounded-lg font-medium"
            >
              Sign In
            </button>
          ) : (
            // Signed-in: Show User Icon + Dropdown
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setDropdownOpen((p) => !p)}
                className="glass p-2 rounded-full hover:scale-105 transition-all"
              >
                <UserCircle className="h-7 w-7 text-gray-700" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-xl overflow-hidden z-50 border-2 border-[#E8D4A8]">
                  <ul className="py-1">
                    <li>
                      <button
                        onClick={() => {
                          router.push("/my-trips");
                          setDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-gray-700 hover:bg-[#F4E4C1] transition-colors"
                      >
                        My Trips
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => {
                          signOut();
                          setDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-gray-700 hover:bg-[#F4E4C1] transition-colors"
                      >
                        Sign Out
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
