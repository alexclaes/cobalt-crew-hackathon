import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Key is loaded from .env (Next.js loads it automatically; do not use .env.example for the real key)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/** Place as sent from frontend (Overpass result + type). */
interface PlaceInput {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type: string;
  cuisine?: string;
  priceRange?: string;
  openingHours?: string;
}

/** Enriched fields returned by OpenAI (merge by id). */
interface EnrichedItem {
  id: string;
  cost?: string;
  rating?: number | string;
  openingHours?: string;
  cuisine?: string;
  veganOptions?: 'yes' | 'no' | 'unknown';
  vegetarianOptions?: 'yes' | 'no' | 'unknown';
}

/** Full place after merge (input + enriched fields). */
export interface EnrichedPlace extends PlaceInput {
  priceRange?: string;
  rating?: string | number;
  veganOptions?: 'yes' | 'no' | 'unknown';
  vegetarianOptions?: 'yes' | 'no' | 'unknown';
}

const SYSTEM_PROMPT = `You are a helpful assistant. You output only valid JSON. All places you receive are already near the given midpoint (within radiusKm). For each place, add or refine: cost (exactly one of "€", "€€", "€€€"), rating (number 0–5 or "unknown"), openingHours (string or keep existing), cuisine (string), veganOptions ("yes" | "no" | "unknown"), vegetarianOptions ("yes" | "no" | "unknown"). If you don't know, use "unknown". 

Additionally, analyze enriched places separately by their type and recommend the best location for EACH category based on all factors: rating, distance to midpoint, price value, cuisine/appeal, dietary options (for restaurants/bars), and opening hours. Consider the overall best balance of these factors for each category.

Return a JSON object with two keys:
1. "places": an array of objects; each object must include "id" (same as input) plus the enriched fields above.
2. "recommendations": an object with keys matching the place types in the input (e.g., "restaurant", "bar", "hotel", "camping", "hostel", "shop", "museum", "theatre", "spa", "natural formations", "brewery map", "historic", "elevation", "dog map"). Each key contains an object with "placeId" (the id of the recommended place of that type, or null if no suitable place) and optionally "reasoning" (a brief 1-2 sentence explanation). Only include recommendations for categories that have places in the input and are in the placeTypes array.`;

function buildUserPrompt(
  midpoint: { lat: number; lon: number },
  radiusKm: number,
  places: PlaceInput[],
  placeTypes: string[]
): string {
  const payload = JSON.stringify({ midpoint, radiusKm, places, placeTypes });
  return `${payload}\n\nOnly include and enrich places that are near this midpoint (they already are; do not add new locations). All places in the list are near the given midpoint (within radiusKm). Only return these same places with enriched fields; do not add or suggest other locations.

After enriching all places, analyze them separately by type. For each category that has places in the input, recommend the single best location of that type considering: rating quality, distance to midpoint (closer is better), price value (balance of cost and quality), cuisine/appeal (for restaurants/bars), dietary accommodation (for restaurants/bars), opening hours availability, and category-specific factors (e.g., natural beauty for natural formations, elevation for peaks, accessibility for family-friendly places). Only generate recommendations for categories that are in the placeTypes array and have places of that type in the input.`;
}

function mergeEnriched(
  input: PlaceInput[],
  enriched: EnrichedItem[]
): EnrichedPlace[] {
  const byId = new Map<string, EnrichedItem>();
  for (const e of enriched) {
    if (e.id) byId.set(e.id, e);
  }
  return input.map((place) => {
    const e = byId.get(place.id);
    if (!e) return { ...place } as EnrichedPlace;
    return {
      ...place,
      priceRange: e.cost ?? place.priceRange,
      openingHours: e.openingHours ?? place.openingHours,
      cuisine: e.cuisine ?? place.cuisine,
      rating: e.rating,
      veganOptions: e.veganOptions,
      vegetarianOptions: e.vegetarianOptions,
    } as EnrichedPlace;
  });
}

export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OpenAI API key not configured' },
      { status: 503 }
    );
  }

  let body: {
    places?: PlaceInput[];
    midpoint?: { lat: number; lon: number };
    radiusKm?: number;
    placeTypes?: string[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { places, midpoint, radiusKm, placeTypes } = body;
  if (
    !Array.isArray(places) ||
    places.length === 0 ||
    !midpoint ||
    typeof midpoint.lat !== 'number' ||
    typeof midpoint.lon !== 'number' ||
    typeof radiusKm !== 'number' ||
    !Array.isArray(placeTypes) ||
    placeTypes.length === 0
  ) {
    return NextResponse.json(
      { error: 'Missing or invalid: places (non-empty array), midpoint { lat, lon }, radiusKm, placeTypes (non-empty array)' },
      { status: 400 }
    );
  }

  const userPrompt = buildUserPrompt(midpoint, radiusKm, places, placeTypes);

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Empty or invalid OpenAI response' },
        { status: 502 }
      );
    }

    let parsed: { 
      places?: EnrichedItem[]; 
      recommendations?: Record<string, { placeId: string | null; reasoning?: string }>;
    };
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error('Enrich places: invalid JSON from OpenAI', content.slice(0, 200));
      return NextResponse.json(
        { error: 'Invalid JSON from enrichment service' },
        { status: 502 }
      );
    }

    const enrichedList = Array.isArray(parsed.places) ? parsed.places : [];
    console.log('[Enrich API] OpenAI response (enriched items):', JSON.stringify(enrichedList, null, 2));
    const merged = mergeEnriched(places, enrichedList);
    
    // Extract recommendations per category
    const recommendations = parsed.recommendations || {};
    console.log('[Enrich API] Recommendations:', JSON.stringify(recommendations, null, 2));
    
    // Build recommendations object, only including categories that are in placeTypes
    const recommendationsResponse: Record<string, { placeId: string | null; reasoning?: string }> = {};
    
    for (const placeType of placeTypes) {
      if (recommendations[placeType]) {
        recommendationsResponse[placeType] = recommendations[placeType];
      }
    }
    
    return NextResponse.json({
      places: merged,
      recommendations: recommendationsResponse
    });
  } catch (e) {
    console.error('Enrich places API error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Enrichment failed' },
      { status: 502 }
    );
  }
}
