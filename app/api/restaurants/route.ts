import { NextRequest, NextResponse } from 'next/server';
import { haversineDistanceKm } from '@/lib/midpoint';

// Try multiple Overpass endpoints; overpass-api.de can return 502/504 when overloaded
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];
const USER_AGENT = 'CobaltCrewHackathon/1.0 (meetup midpoint finder)';

export type PlaceType = 'restaurant' | 'bar' | 'hotel';

export interface RestaurantResult {
  id: string;
  name: string;
  lat: number;
  lon: number;
  cuisine?: string;
  priceRange?: string;
  openingHours?: string;
}

/** Overpass filter for each place type (nodes + ways). */
const PLACE_QUERIES: Record<
  PlaceType,
  { node: string; way: string }
> = {
  restaurant: { node: 'node["amenity"="restaurant"]', way: 'way["amenity"="restaurant"]' },
  bar: { node: 'node["amenity"="bar"]', way: 'way["amenity"="bar"]' },
  hotel: { node: 'node["tourism"="hotel"]', way: 'way["tourism"="hotel"]' },
};

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

function getLatLon(el: OverpassElement): { lat: number; lon: number } | null {
  if (el.lat != null && el.lon != null) return { lat: el.lat, lon: el.lon };
  if (el.center) return el.center;
  return null;
}

function elementToRestaurant(
  el: OverpassElement,
  center: { lat: number; lon: number }
): RestaurantResult | null {
  const pos = getLatLon(el);
  if (!pos) return null;
  const tags = el.tags ?? {};
  const name = tags.name ?? 'Unnamed';
  return {
    id: `${el.type}-${el.id}`,
    name,
    lat: pos.lat,
    lon: pos.lon,
    cuisine: tags.cuisine ?? tags.diet ?? undefined,
    priceRange: tags['price_range'] ?? tags['fee'] ?? tags['currency'] ?? undefined,
    openingHours: tags.opening_hours ?? undefined,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const radiusKm = searchParams.get('radiusKm');
  const typesParam = searchParams.get('types') || searchParams.get('type') || 'restaurant';
  
  // Support both single type and comma-separated types
  const requestedTypes: PlaceType[] = typesParam
    .split(',')
    .map(t => t.trim().toLowerCase())
    .filter(t => ['restaurant', 'bar', 'hotel'].includes(t))
    .map(t => t as PlaceType);
  
  if (requestedTypes.length === 0) {
    requestedTypes.push('restaurant');
  }

  if (!lat || !lon || !radiusKm) {
    return NextResponse.json(
      { error: 'Missing lat, lon or radiusKm' },
      { status: 400 }
    );
  }

  const latNum = parseFloat(lat);
  const lonNum = parseFloat(lon);
  const radiusM = Math.round(parseFloat(radiusKm) * 1000);

  if (Number.isNaN(latNum) || Number.isNaN(lonNum) || Number.isNaN(radiusM) || radiusM <= 0) {
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  }

  // Build combined query for all requested types
  const queryParts: string[] = [];
  for (const placeType of requestedTypes) {
    const { node: nodeFilter, way: wayFilter } = PLACE_QUERIES[placeType];
    queryParts.push(`${nodeFilter}(around:${radiusM},${latNum},${lonNum});`);
    queryParts.push(`${wayFilter}(around:${radiusM},${latNum},${lonNum});`);
  }

  // Overpass QL: nodes and ways for all requested types within radius; out center for ways
  const query = `
[out:json][timeout:25];
(
  ${queryParts.join('\n  ')}
);
out center;
  `.trim();

  let lastError: string | null = null;
  let lastStatus: number | null = null;

  for (const baseUrl of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(baseUrl, {
        method: 'POST',
        body: query,
        headers: {
          'Content-Type': 'text/plain',
          'User-Agent': USER_AGENT,
        },
      });
      if (!res.ok) {
        const text = await res.text();
        lastStatus = res.status;
        lastError = `${res.status} ${res.statusText}: ${text.slice(0, 300)}`;
        continue;
      }
      const data: OverpassResponse = await res.json();
      const center = { lat: latNum, lon: lonNum };

      // Group results by type and limit per category
      const resultsByType: Record<PlaceType, RestaurantResult[]> = {
        restaurant: [],
        bar: [],
        hotel: [],
      };

      for (const el of data.elements) {
        const tags = el.tags ?? {};
        let placeType: PlaceType | null = null;
        
        // Determine type from OSM tags
        if (tags.amenity === 'restaurant') placeType = 'restaurant';
        else if (tags.amenity === 'bar') placeType = 'bar';
        else if (tags.tourism === 'hotel') placeType = 'hotel';
        
        if (placeType && requestedTypes.includes(placeType)) {
          const r = elementToRestaurant(el, center);
          if (r) {
            resultsByType[placeType].push(r);
          }
        }
      }

      // Sort each category by distance and limit
      const MAX_PER_CATEGORY = 5;
      const allResults: Array<RestaurantResult & { type: PlaceType }> = [];
      
      for (const placeType of requestedTypes) {
        const places = resultsByType[placeType];
        places.sort((a, b) => {
          const da = haversineDistanceKm(center, { lat: a.lat, lon: a.lon });
          const db = haversineDistanceKm(center, { lat: b.lat, lon: b.lon });
          return da - db;
        });
        
        const limited = places.slice(0, MAX_PER_CATEGORY);
        for (const place of limited) {
          allResults.push({ ...place, type: placeType });
        }
      }

      // Sort all results by distance
      allResults.sort((a, b) => {
        const da = haversineDistanceKm(center, { lat: a.lat, lon: a.lon });
        const db = haversineDistanceKm(center, { lat: b.lat, lon: b.lon });
        return da - db;
      });

      return NextResponse.json(allResults);
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      continue;
    }
  }

  return NextResponse.json(
    {
      error: 'All Overpass endpoints failed',
      details: lastError ?? 'Unknown',
      lastStatus: lastStatus ?? undefined,
    },
    { status: 502 }
  );
}
