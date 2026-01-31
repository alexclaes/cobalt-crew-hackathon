import { NextRequest, NextResponse } from 'next/server';
import { haversineDistanceKm } from '@/lib/midpoint';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

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
  const typeParam = (searchParams.get('type') ?? 'restaurant').toLowerCase();
  const placeType: PlaceType =
    typeParam === 'bar' ? 'bar' : typeParam === 'hotel' ? 'hotel' : 'restaurant';

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

  const { node: nodeFilter, way: wayFilter } = PLACE_QUERIES[placeType];
  // Overpass QL: nodes and ways for chosen type within radius; out center for ways
  const query = `
[out:json][timeout:25];
(
  ${nodeFilter}(around:${radiusM},${latNum},${lonNum});
  ${wayFilter}(around:${radiusM},${latNum},${lonNum});
);
out center;
  `.trim();

  try {
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      body: query,
      headers: { 'Content-Type': 'text/plain' },
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: 'Overpass request failed', details: text.slice(0, 200) },
        { status: 502 }
      );
    }
    const data: OverpassResponse = await res.json();
    const center = { lat: latNum, lon: lonNum };

    const restaurants: RestaurantResult[] = [];
    for (const el of data.elements) {
      const r = elementToRestaurant(el, center);
      if (r) restaurants.push(r);
    }

    // Sort by distance (nearest first); if limited results we already have nearest
    restaurants.sort((a, b) => {
      const da = haversineDistanceKm(center, { lat: a.lat, lon: a.lon });
      const db = haversineDistanceKm(center, { lat: b.lat, lon: b.lon });
      return da - db;
    });

    return NextResponse.json(restaurants);
  } catch (e) {
    console.error('Places API error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch restaurants' },
      { status: 500 }
    );
  }
}
