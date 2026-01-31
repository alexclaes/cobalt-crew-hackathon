export interface Coordinate {
  lat: number;
  lon: number;
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
