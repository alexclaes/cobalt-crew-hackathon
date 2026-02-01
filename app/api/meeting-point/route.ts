import { NextRequest, NextResponse } from 'next/server';
import { calculateMidpoint, haversineDistanceKm, type Coordinate } from '@/lib/midpoint';

export type TransportMode = 'geographic' | 'car' | 'train';

const ORS_MATRIX_URL = 'https://api.openrouteservice.org/v2/matrix/driving-car';
const ORS_DIRECTIONS_URL = 'https://api.openrouteservice.org/v2/directions/driving-car/geojson';

/** Grid step in degrees (~5–10 km at mid-latitudes). Use small grid for fair meeting point. */
const GRID_STEP_DEG = 0.03;
/** Number of grid points per axis (3 => 9 candidates). */
const GRID_SIZE = 3;
/** Target: travel times within ±10 min of each other. */
const TARGET_MAX_SPREAD_SEC = 600;
/** If spread > 30 min, recalculate midpoint as center of car routes by time. */
const RECALC_SPREAD_THRESHOLD_SEC = 1800;
/** Refinement: finer grid step (~1 km) when initial best spread > 10 min. */
const REFINEMENT_STEP_DEG = 0.01;
const REFINEMENT_SIZE = 5;
/** When recalculating for > 30 min: larger grid (~2 km step, 7×7) to find a better point. */
const RECALC_GRID_STEP_DEG = 0.02;
const RECALC_GRID_SIZE = 7;
const RECALC_MAX_ITERATIONS = 3;

function buildGrid(center: Coordinate, stepDeg: number, size: number): Coordinate[] {
  const half = (size - 1) / 2;
  const points: Coordinate[] = [];
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      points.push({
        lat: center.lat + (i - half) * stepDeg,
        lon: center.lon + (j - half) * stepDeg,
      });
    }
  }
  return points;
}

/** OpenRouteService expects [lon, lat]. */
function toLonLat(c: Coordinate): [number, number] {
  return [c.lon, c.lat];
}

/** Fetch route geometry (coordinates) from start to end. Returns [lon, lat][] or null. */
async function fetchRouteGeometry(
  apiKey: string,
  start: Coordinate,
  end: Coordinate
): Promise<[number, number][] | null> {
  const res = await fetch(ORS_DIRECTIONS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey,
    },
    body: JSON.stringify({
      coordinates: [[start.lon, start.lat], [end.lon, end.lat]],
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    type?: string;
    features?: Array<{ geometry?: { coordinates?: [number, number][] } }>;
    geometry?: { coordinates?: [number, number][] };
  };
  const coords =
    data.features?.[0]?.geometry?.coordinates ??
    (data.type === 'Feature' && data.geometry?.coordinates ? data.geometry.coordinates : null);
  return Array.isArray(coords) && coords.length >= 2 ? coords : null;
}

/** Cumulative distances in km along polyline (same length as coords; last element = total). */
function cumulativeDistancesKm(coords: [number, number][]): number[] {
  const cum: number[] = [0];
  for (let i = 1; i < coords.length; i++) {
    const a = { lon: coords[i - 1][0], lat: coords[i - 1][1] };
    const b = { lon: coords[i][0], lat: coords[i][1] };
    cum.push(cum[cum.length - 1] + haversineDistanceKm(a, b));
  }
  return cum;
}

/** Position at fraction 0..1 along polyline (by distance). Returns { lat, lon }. */
function positionAtFraction(coords: [number, number][], fraction: number): Coordinate {
  if (fraction <= 0 || coords.length < 2)
    return { lat: coords[0][1], lon: coords[0][0] };
  if (fraction >= 1)
    return { lat: coords[coords.length - 1][1], lon: coords[coords.length - 1][0] };
  const cum = cumulativeDistancesKm(coords);
  const total = cum[cum.length - 1];
  if (total <= 0) return { lat: coords[0][1], lon: coords[0][0] };
  const target = fraction * total;
  let i = 0;
  while (i < cum.length - 1 && cum[i + 1] < target) i++;
  const segStart = cum[i];
  const segEnd = cum[i + 1];
  const segFrac = segEnd > segStart ? (target - segStart) / (segEnd - segStart) : 0;
  const lat = coords[i][1] + segFrac * (coords[i + 1][1] - coords[i][1]);
  const lon = coords[i][0] + segFrac * (coords[i + 1][0] - coords[i][0]);
  return { lat, lon };
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

    const n = coords.length;
    const finalApiKey = apiKey; // Create a const that TypeScript knows is defined

    /** Request travel-time matrix for candidate points, then pick candidate that minimizes range (max - min). */
    async function bestFromCandidates(candidates: Coordinate[]): Promise<{
      chosen: Coordinate;
      travelTimes: number[];
      rangeSec: number;
    }> {
      const locations: [number, number][] = [
        ...coords.map(toLonLat),
        ...candidates.map(toLonLat),
      ];
      const sources = Array.from({ length: n }, (_, i) => i);
      const destinations = Array.from({ length: candidates.length }, (_, i) => n + i);

      const res = await fetch(ORS_MATRIX_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: finalApiKey,
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
        throw new Error(`OpenRouteService request failed: ${text.slice(0, 200)}`);
      }

      const data = (await res.json()) as { durations?: number[][] };
      const durations = data.durations;
      if (!durations || durations.length !== n) {
        throw new Error('Invalid matrix response');
      }

      let bestIdx = 0;
      let bestRange = Infinity;
      let bestTravelTimes: number[] = [];

      for (let j = 0; j < candidates.length; j++) {
        const times: number[] = [];
        for (let i = 0; i < n; i++) {
          const t = durations[i]?.[j] ?? Infinity;
          times.push(t);
        }
        const minDur = Math.min(...times);
        const maxDur = Math.max(...times);
        const range = maxDur - minDur;
        if (range < bestRange || (range === bestRange && maxDur < Math.max(...bestTravelTimes))) {
          bestRange = range;
          bestIdx = j;
          bestTravelTimes = times;
        }
      }

      return {
        chosen: candidates[bestIdx],
        travelTimes: bestTravelTimes,
        rangeSec: bestRange,
      };
    }

    // Initial grid around geographic center (equal travel time = minimize range)
    const candidates = buildGrid(geoCenter, GRID_STEP_DEG, GRID_SIZE);
    let result = await bestFromCandidates(candidates);

    // If spread > 10 min, refine with a finer grid around the best candidate
    if (result.rangeSec > TARGET_MAX_SPREAD_SEC) {
      const refinementCandidates = buildGrid(result.chosen, REFINEMENT_STEP_DEG, REFINEMENT_SIZE);
      const refined = await bestFromCandidates(refinementCandidates);
      if (refined.rangeSec <= result.rangeSec) {
        result = refined;
      }
    }

    // If spread still > 30 min, iteratively recalculate midpoint as center of car routes by time
    let recalcIteration = 0;
    while (
      result.rangeSec > RECALC_SPREAD_THRESHOLD_SEC &&
      recalcIteration < RECALC_MAX_ITERATIONS
    ) {
      recalcIteration++;
      const avgTimeSec =
        result.travelTimes.reduce((a, b) => a + b, 0) / result.travelTimes.length;
      const positionsAtAvgTime: Coordinate[] = [];
      for (let i = 0; i < n; i++) {
        const geometry = await fetchRouteGeometry(finalApiKey, coords[i], result.chosen);
        const totalDur = result.travelTimes[i];
        if (!geometry || totalDur <= 0) {
          positionsAtAvgTime.push(result.chosen);
          continue;
        }
        const fraction = Math.min(1, Math.max(0, avgTimeSec / totalDur));
        positionsAtAvgTime.push(positionAtFraction(geometry, fraction));
      }
      const timeCenter = calculateMidpoint(positionsAtAvgTime);
      if (!timeCenter) break;
      const timeCenterCandidates = buildGrid(
        timeCenter,
        RECALC_GRID_STEP_DEG,
        RECALC_GRID_SIZE
      );
      const recalc = await bestFromCandidates(timeCenterCandidates);
      if (recalc.rangeSec >= result.rangeSec) break;
      result = recalc;
    }

    const payload = {
      lat: result.chosen.lat,
      lon: result.chosen.lon,
      travelTimes: result.travelTimes,
    } as MeetingPointResponse;
    // #region agent log
    try {
      await fetch('http://127.0.0.1:7244/ingest/8e2c6a3c-7e89-4fc0-8b62-983893625af2', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'api/meeting-point/route.ts:return', message: 'Meeting-point API returning', data: { travelTimesLength: result.travelTimes?.length ?? null }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'H4' }) });
    } catch (_) {}
    // #endregion
    return NextResponse.json(payload);
  } catch (e) {
    console.error('Meeting point API error:', e);
    // #region agent log
    try {
      await fetch('http://127.0.0.1:7244/ingest/8e2c6a3c-7e89-4fc0-8b62-983893625af2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'api/meeting-point/route.ts:catch',
          message: 'Meeting-point API 500',
          data: {
            errorMessage: e instanceof Error ? e.message : String(e),
            errorName: e instanceof Error ? e.name : undefined,
            stack: e instanceof Error ? (e.stack ?? undefined) : undefined,
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          hypothesisId: 'H5',
        }),
      });
    } catch (_) {}
    // #endregion
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to compute meeting point' },
      { status: 500 }
    );
  }
}
