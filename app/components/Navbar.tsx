"use client";

import React, { useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { UserCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTripContext } from "../context/TripContext";

export default function Navbar() {
  const { data: session, status } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);
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
  } = useTripContext();

  return (
    <nav className="bg-black text-white flex items-center justify-between px-4 py-2">
      <div className="flex-shrink-0 cursor-pointer" onClick={() => router.push("/")}> {/* Logo navigates home */}
        <h1 className="text-2xl font-bold">TRIPPIN&apos;</h1>
      </div>

      <div className="flex space-x-4 items-center relative">
        {/* Explore Button navigates to /explore */}
        <button className="bg-purple-500 hover:bg-purple-600 px-3 py-1 rounded" onClick={() => router.push("/explore")}>Explore</button>

        {/* Plan Trip button - starts a fresh new trip */}
        <button
          onClick={() => {
            // Clear any existing edit state to start fresh
            setEditingJourneyId(null);
            setWaypoints([]);
            setStopTimes([]);
            setDestination("");
            setDestinationName("");
            setWaypointNames({});
            clearTripState();
            setShowModal(true);
          }}
          className="bg-turquoise-500 hover:bg-turquoise-600 px-3 py-1 rounded"
        >
          Plan Trip
        </button>

        {/* Signed-out: Show Sign In */}
        {status !== "authenticated" ? (
          <button
            onClick={() => signIn("google")}
            className="bg-yellow-500 hover:bg-yellow-600 text-black px-3 py-1 rounded"
          >
            Sign In with Google
          </button>
        ) : (
          // Signed-in: Show User Icon + Dropdown
          <div className="relative">
            <button onClick={() => setDropdownOpen((p) => !p)}>
              <UserCircle className="h-8 w-8 text-white" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-white text-black rounded shadow z-50">
                <ul className="py-1">
                  {/* My Trips always visible for navigation */}
                  <li>
                    <button
                      onClick={() => {
                        router.push("/my-trips");
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-indigo-50"
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
                      className="w-full text-left px-4 py-2 hover:bg-indigo-50"
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
    </nav>
  );
}
