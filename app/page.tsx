"use client";

import { useState, FormEvent } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { LoadScript, GoogleMap, DirectionsRenderer } from "@react-google-maps/api";

const containerStyle = { width: "100%", height: "500px" };
const defaultCenter = { lat: 40.7128, lng: -74.0060 };

export default function HomePage() {
  const { data: session, status } = useSession();
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [travelMode, setTravelMode] = useState("driving");
  const [directions, setDirections] = useState<any>(null);

  const getDirections = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const res = await fetch(
        `/api/directions?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(
          destination
        )}&travelMode=${encodeURIComponent(travelMode)}`
      );
      const data = await res.json();

      if (data.routes && data.routes.length > 0) {
        setDirections(data);
      } else {
        alert("No directions found.");
      }
    } catch (error: any) {
      console.error("Error fetching directions:", error);
      alert("Failed to fetch directions.");
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Trippin</h1>
        <div>
          {session ? (
            <>
              <span style={{ marginRight: "10px" }}>
                Welcome, {session.user?.name || session.user?.email}
              </span>
              <button onClick={() => signOut()}>Sign Out</button>
            </>
          ) : (
            <button onClick={() => signIn()}>Sign In</button>
          )}
        </div>
      </header>

      <main style={{ marginTop: "20px" }}>
        <form onSubmit={getDirections} style={{ marginBottom: "20px" }}>
          <div style={{ marginBottom: "10px" }}>
            <label htmlFor="origin" style={{ marginRight: "5px" }}>
              Origin:
            </label>
            <input
              id="origin"
              type="text"
              placeholder="Enter starting point"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              required
            />
          </div>
          <div style={{ marginBottom: "10px" }}>
            <label htmlFor="destination" style={{ marginRight: "5px" }}>
              Destination:
            </label>
            <input
              id="destination"
              type="text"
              placeholder="Enter destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              required
            />
          </div>
          <div style={{ marginBottom: "10px" }}>
            <label htmlFor="travelMode" style={{ marginRight: "5px" }}>
              Travel Mode:
            </label>
            <select id="travelMode" value={travelMode} onChange={(e) => setTravelMode(e.target.value)}>
              <option value="driving">Driving</option>
              <option value="transit">Transit</option>
              <option value="walking">Walking</option>
              <option value="bicycling">Bicycling</option>
            </select>
          </div>
          <button type="submit">Get Directions</button>
        </form>
        <div style={{ height: "500px", width: "100%" }}>
          <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!} libraries={["places"]} nonce="your-generated-nonce">
            <GoogleMap mapContainerStyle={containerStyle} center={defaultCenter} zoom={12}>
              {directions && <DirectionsRenderer directions={directions} />}
            </GoogleMap>
          </LoadScript>
        </div>
      </main>
    </div>
  );
}
