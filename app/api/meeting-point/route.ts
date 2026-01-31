import { NextRequest, NextResponse } from 'next/server';
import { calculateMidpoint, type Coordinate } from '@/lib/midpoint';

export type TransportMode = 'geographic' | 'car' | 'train';

const ORS_MATRIX_URL = 'https://api.openrouteservice.org/v2/matrix/driving-car';

/** Grid step in degrees (~5–10 km at mid-latitudes). Use small grid for fair meeting point. */
const GRID_STEP_DEG = 0.03;
/** Number of grid points per axis (3 => 9 candidates, 5 => 25). */
const GRID_SIZE = 3;

function buildGrid(center: Coordinate): Coordinate[] {
  const half = (GRID_SIZE - 1) / 2;
  const points: Coordinate[] = [];
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      points.push({
        lat: center.lat + (i - half) * GRID_STEP_DEG,
        lon: center.lon + (j - half) * GRID_STEP_DEG,
      });
    }
  }
  return points;
}

/** OpenRouteService expects [lon, lat]. */
function toLonLat(c: Coordinate): [number, number] {
  return [c.lon, c.lat];
}

export interface MeetingPointResponse {
  lat: number;
  lon: number;
  travelTimes?: number[];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { coordinates, transport } = body as {
      coordinates?: Array<{ lat: number; lon: number }>;
      transport?: string;
    };

    const mode: TransportMode =
      transport === 'car' ? 'car' : transport === 'train' ? 'train' : 'geographic';

    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 coordinates required' },
        { status: 400 }
      );
    }

    const coords: Coordinate[] = coordinates.map((c: { lat: number; lon: number }) => ({
      lat: Number(c.lat),
      lon: Number(c.lon),
    }));

    if (mode === 'geographic') {
      const result = calculateMidpoint(coords);
      if (!result) {
        return NextResponse.json({ error: 'Could not compute midpoint' }, { status: 400 });
      }
      return NextResponse.json({ lat: result.lat, lon: result.lon });
    }

    if (mode === 'train') {
      return NextResponse.json(
        { error: 'Train/public transport not implemented. Use geographic or car.' },
        { status: 501 }
      );
    }

    // Car: use OpenRouteService Matrix + minimax
    const apiKey = process.env.OPENROUTESERVICE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenRouteService API key not configured' },
        { status: 503 }
      );
    }

    const geoCenter = calculateMidpoint(coords);
    if (!geoCenter) {
      return NextResponse.json({ error: 'Could not compute geographic center' }, { status: 400 });
    }

    const candidates = buildGrid(geoCenter);
    const locations: [number, number][] = [
      ...coords.map(toLonLat),
      ...candidates.map(toLonLat),
    ];
    const n = coords.length;
    const sources = Array.from({ length: n }, (_, i) => i);
    const destinations = Array.from({ length: candidates.length }, (_, i) => n + i);

    const res = await fetch(ORS_MATRIX_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKey,
      },
      body: JSON.stringify({
        locations,
        sources,
        destinations,
        metrics: ['duration'],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: 'OpenRouteService request failed', details: text.slice(0, 200) },
        { status: 502 }
      );
    }

    const data = (await res.json()) as { durations?: number[][] };
    const durations = data.durations;
    if (!durations || durations.length !== n) {
      return NextResponse.json(
        { error: 'Invalid matrix response' },
        { status: 502 }
      );
    }

    // durations[i][j] = time from participant i to candidate j (seconds)
    let bestIdx = 0;
    let bestMax = Infinity;
    let bestTravelTimes: number[] = [];

    for (let j = 0; j < candidates.length; j++) {
      let maxDur = 0;
      const times: number[] = [];
      for (let i = 0; i < n; i++) {
        const t = durations[i]?.[j] ?? Infinity;
        times.push(t);
        if (t > maxDur) maxDur = t;
      }
      if (maxDur < bestMax) {
        bestMax = maxDur;
        bestIdx = j;
        bestTravelTimes = times;
      }
    }

    const chosen = candidates[bestIdx];
    return NextResponse.json({
      lat: chosen.lat,
      lon: chosen.lon,
      travelTimes: bestTravelTimes,
    } as MeetingPointResponse);
  } catch (e) {
    console.error('Meeting point API error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to compute meeting point' },
      { status: 500 }
    );
  }
}
