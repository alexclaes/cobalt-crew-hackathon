import { NextRequest, NextResponse } from 'next/server';

const ORS_DIRECTIONS_URL = 'https://api.openrouteservice.org/v2/directions/driving-car/geojson';

/** GET or POST: start/end as query or body. Returns route geometry as [lat, lon][] for Leaflet. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { start, end } = body as {
      start?: { lat: number; lon: number };
      end?: { lat: number; lon: number };
    };

    if (
      !start ||
      !end ||
      typeof start.lat !== 'number' ||
      typeof start.lon !== 'number' ||
      typeof end.lat !== 'number' ||
      typeof end.lon !== 'number'
    ) {
      return NextResponse.json(
        { error: 'start and end coordinates { lat, lon } required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTESERVICE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenRouteService API key not configured' },
        { status: 503 }
      );
    }

    // ORS expects [lon, lat] order
    const coordinates: [number, number][] = [
      [start.lon, start.lat],
      [end.lon, end.lat],
    ];

    const res = await fetch(ORS_DIRECTIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKey,
      },
      body: JSON.stringify({ coordinates }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('OpenRouteService directions failed:', res.status, text.slice(0, 300));
      return NextResponse.json(
        { coordinates: [] },
        { status: 200 }
      );
    }

    const data = (await res.json()) as {
      type?: string;
      features?: Array<{
        type?: string;
        geometry?: { type?: string; coordinates?: Array<[number, number] | [number, number, number]> };
      }>;
      geometry?: { type?: string; coordinates?: Array<[number, number] | [number, number, number]> };
    };

    // GeoJSON: FeatureCollection with features[].geometry.coordinates, or single Feature with geometry.coordinates
    const coords =
      data.features?.[0]?.geometry?.coordinates ??
      (data.type === 'Feature' && data.geometry?.coordinates ? data.geometry.coordinates : null);
    if (!Array.isArray(coords) || coords.length < 2) {
      console.warn('OpenRouteService: no route geometry in response');
      return NextResponse.json({ coordinates: [] }, { status: 200 });
    }

    // Convert [lon, lat] (or [lon, lat, elev]) to [lat, lon] for Leaflet
    const positions: [number, number][] = coords.map((c) => [c[1], c[0]]);

    return NextResponse.json({ coordinates: positions });
  } catch (e) {
    console.error('Driving route API error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to get driving route' },
      { status: 500 }
    );
  }
}
