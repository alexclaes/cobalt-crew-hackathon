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
  removals: string[];
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

  console.log('[Voice API] Request received:', { transcription, context });

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
      // Extract multiple mates + removals + theme
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

      prompt = `Extract people to ADD, people to REMOVE, and the trip theme from this text: "${transcription}"

Available themes: ${themes.join(', ')}

Return JSON with this EXACT structure:
{
  "mates": [
    { "name": "person name", "address": "location/city" }
  ],
  "removals": ["person name to remove"],
  "theme": "exact theme name from list above or null"
}

Instructions for ADDING mates:
- Extract people with "add", "include", or no command word (e.g., "John from Berlin")
- For addresses, extract the city, location, or full address mentioned
- If NO location mentioned, use just their name as the address (e.g., {"name": "Sarah", "address": "Sarah"})
- Examples: 
  * "Add Sarah from Munich" → mates: [{"name": "Sarah", "address": "Munich"}]
  * "John from Berlin" → mates: [{"name": "John", "address": "Berlin"}]

Instructions for REMOVING mates:
- Extract people with "remove", "delete", "take out"
- Return ONLY the name in the removals array (no address)
- Examples:
  * "Remove John" → removals: ["John"]
  * "Delete Sarah" → removals: ["Sarah"]

Mixed command example:
"Add Sarah from Munich, remove John, add Alex from Paris"
→ {
  "mates": [{"name": "Sarah", "address": "Munich"}, {"name": "Alex", "address": "Paris"}],
  "removals": ["John"],
  "theme": null
}

Theme matching:
- Match using keywords or synonyms (e.g., "food", "dining" → "Food & Drink")
- If theme not mentioned or unclear, set it to null

Always return valid JSON with all three fields (mates, removals, theme)`;

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

    } else if (context === 'theme') {
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

    } else {
      // Extract mate name to remove
      prompt = `You are extracting a name from a DELETION/REMOVAL command.

User command: "${transcription}"

Return ONLY this JSON structure:
{
  "mateName": "name"
}

Rules:
1. Find the person's name mentioned in the command
2. Return ONLY the name (no address, no location)
3. The command contains words like "remove", "delete", "take out" - IGNORE these words
4. Return ONLY the "mateName" field
5. Example: "Delete Michael" → {"mateName": "Michael"}
6. Example: "Remove John" → {"mateName": "John"}

JSON response:`;
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

    console.log('[Voice API] Gemini raw response:', responseText.slice(0, 300));

    let parsed: any;
    try {
      parsed = JSON.parse(responseText);
      console.log('[Voice API] Parsed response:', JSON.stringify(parsed, null, 2));
      console.log('[Voice API] Parsed response keys:', Object.keys(parsed));
      console.log('[Voice API] Has "mates" key?', 'mates' in parsed);
      console.log('[Voice API] Has "mateName" key?', 'mateName' in parsed);
    } catch (e) {
      console.error('Failed to parse AI response:', responseText.slice(0, 200));
      return NextResponse.json(
        { error: 'Invalid JSON from AI service', details: responseText.slice(0, 100) },
        { status: 502 }
      );
    }

    // Format and validate response based on context
    console.log('[Voice API] Context for response formatting:', context);
    
    if (context === 'bulk') {
      const mates = Array.isArray(parsed.mates) ? parsed.mates : [];
      const removals = Array.isArray(parsed.removals) ? parsed.removals : [];
      const theme = parsed.theme || null;

      // Validate mates have name and address
      const validMates = mates.filter(
        (mate: any) => mate.name && typeof mate.name === 'string' && mate.address && typeof mate.address === 'string'
      );

      // Validate removals are non-empty strings
      const validRemovals = removals.filter(
        (name: any) => typeof name === 'string' && name.trim().length > 0
      );

      const response: BulkResponse = {
        type: 'bulk',
        mates: validMates,
        removals: validRemovals,
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
