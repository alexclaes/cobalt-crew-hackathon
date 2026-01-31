export interface Coordinate {
  lat: number;
  lon: number;
}

/** Earth radius in km for Haversine formula */
const EARTH_RADIUS_KM = 6371;

/**
 * Haversine distance between two coordinates in km.
 * Used for Germany-scale distances (e.g. Hamburg Hbf–Altona, Hamburg–Berlin, Hamburg–Munich).
 */
export function haversineDistanceKm(a: Coordinate, b: Coordinate): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/**
 * Max distance in km from midpoint to any of the given coordinates.
 */
export function maxSpreadKm(midpoint: Coordinate, coordinates: Coordinate[]): number {
  if (coordinates.length === 0) return 0;
  return Math.max(...coordinates.map((c) => haversineDistanceKm(midpoint, c)));
}

/**
 * Max pairwise distance in km between any two of the given coordinates
 * (trip "diameter"). Used for default radius so Hamburg–Munich counts as large.
 */
export function maxPairwiseDistanceKm(coordinates: Coordinate[]): number {
  if (coordinates.length < 2) return 0;
  let max = 0;
  for (let i = 0; i < coordinates.length; i++) {
    for (let j = i + 1; j < coordinates.length; j++) {
      const d = haversineDistanceKm(coordinates[i], coordinates[j]);
      if (d > max) max = d;
    }
  }
  return max;
}

/**
 * Default search radius in km based on trip scale (Germany as reference).
 * Uses max pairwise distance between start points (trip "diameter").
 *
 * Switch distances (max pairwise between any two start points):
 * - < 25 km  → 1 km radius  (e.g. Hamburg Hbf → Hamburg Altona ~8 km)
 * - 25–450 km → 15 km radius (e.g. Hamburg → Berlin ~255 km)
 * - ≥ 450 km → 50 km radius (e.g. Hamburg → Munich ~612 km)
 */
export function getDefaultRadiusKm(midpoint: Coordinate, coordinates: Coordinate[]): 1 | 15 | 50 {
  const maxDist = maxPairwiseDistanceKm(coordinates);
  if (maxDist < 25) return 1;   // same city / short
  if (maxDist < 450) return 15; // mid (e.g. Hamburg–Berlin)
  return 50;                    // large (e.g. Hamburg–Munich)
}

/**
 * Calculates the geographic midpoint (centroid) from an array of coordinates
 * by averaging the latitude and longitude values.
 *
 * @param coordinates - Array of coordinate objects with lat and lon
 * @returns The midpoint coordinate, or null if the array is empty
 */
export function calculateMidpoint(
  coordinates: Coordinate[]
): Coordinate | null {
  if (coordinates.length === 0) {
    return null;
  }

  const sum = coordinates.reduce(
    (acc, coord) => ({
      lat: acc.lat + coord.lat,
      lon: acc.lon + coord.lon,
    }),
    { lat: 0, lon: 0 }
  );

  return {
    lat: sum.lat / coordinates.length,
    lon: sum.lon / coordinates.length,
  };
}
