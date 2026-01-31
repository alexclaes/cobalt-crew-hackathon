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

const SYSTEM_PROMPT = `You are a helpful assistant. You output only valid JSON. All places you receive are already near the given midpoint (within radiusKm). For each place, add or refine: cost (exactly one of "€", "€€", "€€€"), rating (number 0–5 or "unknown"), openingHours (string or keep existing), cuisine (string), veganOptions ("yes" | "no" | "unknown"), vegetarianOptions ("yes" | "no" | "unknown"). If you don't know, use "unknown". Return a JSON object with a single key "places" whose value is an array of objects; each object must include "id" (same as input) plus the above fields.`;

function buildUserPrompt(
  midpoint: { lat: number; lon: number },
  radiusKm: number,
  places: PlaceInput[]
): string {
  const payload = JSON.stringify({ midpoint, radiusKm, places });
  return `${payload}\n\nOnly include and enrich places that are near this midpoint (they already are; do not add new locations). All places in the list are near the given midpoint (within radiusKm). Only return these same places with enriched fields; do not add or suggest other locations.`;
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
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { places, midpoint, radiusKm } = body;
  if (
    !Array.isArray(places) ||
    places.length === 0 ||
    !midpoint ||
    typeof midpoint.lat !== 'number' ||
    typeof midpoint.lon !== 'number' ||
    typeof radiusKm !== 'number'
  ) {
    return NextResponse.json(
      { error: 'Missing or invalid: places (non-empty array), midpoint { lat, lon }, radiusKm' },
      { status: 400 }
    );
  }

  const userPrompt = buildUserPrompt(midpoint, radiusKm, places);

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

    let parsed: { places?: EnrichedItem[] };
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
    const merged = mergeEnriched(places, enrichedList);
    return NextResponse.json(merged);
  } catch (e) {
    console.error('Enrich places API error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Enrichment failed' },
      { status: 502 }
    );
  }
}
