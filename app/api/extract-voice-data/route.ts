import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

// Initialize Gemini API with new SDK
const ai = process.env.GEMINI_API_KEY 
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

interface ExtractVoiceRequest {
  transcription: string;
  context: 'bulk' | 'mate' | 'theme';
  availableThemes?: string[];
}

interface MateData {
  name: string;
  address: string;
}

interface BulkResponse {
  type: 'bulk';
  mates: MateData[];
  theme: string | null;
}

interface MateResponse {
  type: 'mate';
  name: string;
  address: string;
}

interface ThemeResponse {
  type: 'theme';
  themeName: string;
}

export async function POST(request: NextRequest) {
  // Check if Gemini API key is configured
  if (!process.env.GEMINI_API_KEY || !ai) {
    return NextResponse.json(
      { error: 'Gemini API key not configured. Please add GEMINI_API_KEY to your .env.local file.' },
      { status: 503 }
    );
  }

  let body: ExtractVoiceRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const { transcription, context, availableThemes } = body;

  // Validate required fields
  if (!transcription || typeof transcription !== 'string' || transcription.trim().length === 0) {
    return NextResponse.json(
      { error: 'Missing or invalid transcription' },
      { status: 400 }
    );
  }

  if (!context || !['bulk', 'mate', 'theme'].includes(context)) {
    return NextResponse.json(
      { error: 'Invalid context. Must be "bulk", "mate", or "theme"' },
      { status: 400 }
    );
  }

  try {
    let prompt: string;
    let responseType: 'bulk' | 'mate' | 'theme' = context;

    if (context === 'bulk') {
      // Extract multiple mates + theme
      const themes = availableThemes || [
        'City Exploration',
        'Food & Drink',
        'Cultural',
        'Adventure',
        'Nature',
        'Family-Friendly',
        'Wellness',
        'Shopping',
      ];

      prompt = `Extract all people and the trip theme from this text: "${transcription}"

Available themes: ${themes.join(', ')}

Return JSON with this EXACT structure:
{
  "mates": [
    { "name": "person name", "address": "location/city" },
    { "name": "person name", "address": "location/city" }
  ],
  "theme": "exact theme name from list above or null"
}

Instructions:
- Extract ALL people mentioned with their names
- For addresses, extract the city, location, or full address mentioned if specified
- If NO location is mentioned for a person, use just their name as the address (e.g., {"name": "Sarah", "address": "Sarah"})
- If a city/country is mentioned, use that as the address
- Match theme using keywords or synonyms (e.g., "food", "dining", "restaurants" → "Food & Drink")
- If theme is not mentioned or unclear, set it to null
- Always return valid JSON`;

    } else if (context === 'mate') {
      // Extract single mate
      prompt = `Extract the person's name and address from this text: "${transcription}"

Return JSON with this EXACT structure:
{
  "name": "person name",
  "address": "location/city/full address"
}

Instructions:
- Extract the person's name
- Extract their location, city, or full address
- If address is unclear, extract what you can
- If name is missing, use null
- Always return valid JSON`;

    } else {
      // Extract theme only
      const themes = availableThemes || [
        'City Exploration',
        'Food & Drink',
        'Cultural',
        'Adventure',
        'Nature',
        'Family-Friendly',
        'Wellness',
        'Shopping',
      ];

      prompt = `Match this text to one of these themes: ${themes.join(', ')}

Text: "${transcription}"

Return JSON with this EXACT structure:
{
  "themeName": "exact theme name from the list"
}

Instructions:
- Match using keywords or synonyms
- Examples: "food", "dining", "restaurants" → "Food & Drink"
- Examples: "culture", "museums", "art" → "Cultural"
- Examples: "shopping", "stores", "mall" → "Shopping"
- Always return valid JSON with exact theme name from list`;
    }

    // Use new SDK API
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text;

    if (!responseText) {
      return NextResponse.json(
        { error: 'Empty response from AI service' },
        { status: 502 }
      );
    }

    let parsed: any;
    try {
      parsed = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse AI response:', responseText.slice(0, 200));
      return NextResponse.json(
        { error: 'Invalid JSON from AI service', details: responseText.slice(0, 100) },
        { status: 502 }
      );
    }

    // Format and validate response based on context
    if (context === 'bulk') {
      const mates = Array.isArray(parsed.mates) ? parsed.mates : [];
      const theme = parsed.theme || null;

      // Validate mates have name and address
      const validMates = mates.filter(
        (mate: any) => mate.name && typeof mate.name === 'string' && mate.address && typeof mate.address === 'string'
      );

      const response: BulkResponse = {
        type: 'bulk',
        mates: validMates,
        theme,
      };

      console.log('[Voice API] Bulk extraction result:', JSON.stringify(response, null, 2));
      return NextResponse.json(response);

    } else if (context === 'mate') {
      const response: MateResponse = {
        type: 'mate',
        name: parsed.name || '',
        address: parsed.address || '',
      };

      console.log('[Voice API] Mate extraction result:', JSON.stringify(response, null, 2));
      return NextResponse.json(response);

    } else {
      // theme context
      const response: ThemeResponse = {
        type: 'theme',
        themeName: parsed.themeName || '',
      };

      console.log('[Voice API] Theme extraction result:', JSON.stringify(response, null, 2));
      return NextResponse.json(response);
    }

  } catch (e) {
    console.error('Voice data extraction error:', e);
    return NextResponse.json(
      { 
        error: 'Failed to extract data from voice input',
        details: e instanceof Error ? e.message : 'Unknown error'
      },
      { status: 502 }
    );
  }
}
