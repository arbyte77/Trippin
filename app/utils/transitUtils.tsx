// utils/transitUtils.ts

type Row = { title: string; description?: string };

export async function getTransitItinerary(
  segmentPoints: string[],
  svc: google.maps.DirectionsService,
  origin: string,
  originTime: Date,                // ← type updated
  destination: string,
  destinationTime: Date,           // ← type updated (unused but kept for signature)
  waypoints: string[],
  stopTimes: { arriveBy: string; leaveBy: string }[]
): Promise<{
  itinerary: Row[];
  segmentInfos: any[];
  directionsSegments: google.maps.DirectionsResult[];
}> {
  // 1) fetch each slice
  const legs = await Promise.all(
    segmentPoints.slice(0, -1).map(
      (_, i) =>
        new Promise<google.maps.DirectionsResult>((resolve, reject) =>
          svc.route(
            {
              origin: segmentPoints[i],
              destination: segmentPoints[i + 1],
              travelMode: google.maps.TravelMode.TRANSIT,
              transitOptions: {
                modes: [google.maps.TransitMode.BUS],
                routingPreference: google.maps.TransitRoutePreference.LESS_WALKING,
                departureTime: originTime,                  // ← added here
              },
            },
            (r, s) =>
              s === google.maps.DirectionsStatus.OK && r
                ? resolve(r)
                : reject(s)
          )
        )
    )
  );

  const rows: Row[] = [];
  const segmentInfos: any[] = [];
  const directionsSegments: google.maps.DirectionsResult[] = [];

  const first = (s: string) => s.split(",")[0] || s;

  // Origin: just the title
  rows.push({ title: first(origin) });

  for (let idx = 0; idx < legs.length; idx++) {
    const result = legs[idx];
    const leg = result.routes[0].legs[0];
    directionsSegments.push(result);

    // emit each step in this leg
    for (const step of leg.steps) {
      if (step.travel_mode === google.maps.TravelMode.WALKING) {
        rows.push({
          title: "Walk",
          description: `Walk ${step.distance?.text} (${step.duration?.text})`,
        });
      } else if (step.travel_mode === google.maps.TravelMode.TRANSIT) {
        const t = (step as google.maps.DirectionsStep).transit;
        if (!t) continue;

        const bus = t.line.short_name ?? t.line.name;

        // Board
        rows.push({
          title: `Bus ${bus} – Board`,
          description: `Board at ${first(t.departure_stop.name)} @ ${t.departure_time.text}`,
        });

        // Ride
        rows.push({
          title: `Ride Bus ${bus}`,
          description: `Ride for ${step.distance?.text} (${step.duration?.text})`,
        });

        // Alight
        rows.push({
          title: `Bus ${bus} – Alight`,
          description: `Alight at ${first(t.arrival_stop.name)} @ ${t.arrival_time.text}`,
        });
      }
    }

    // separator except after last slice
    if (idx < legs.length - 1) {
      rows.push({ title: "" });
    }

    // collect map‐center info
    segmentInfos.push({
      position: {
        lat: (leg.start_location.lat() + leg.end_location.lat()) / 2,
        lng: (leg.start_location.lng() + leg.end_location.lng()) / 2,
      },
      duration: leg.duration?.text || "",
    });
  }

  // Destination: just the title
  rows.push({ title: first(destination) });

  return { itinerary: rows, segmentInfos, directionsSegments };
}
