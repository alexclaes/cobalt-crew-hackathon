import { neon } from '@neondatabase/serverless';
import { NextRequest, NextResponse } from 'next/server';
import type { CategoryRecommendation } from '@/types/trip';
import type { PlaceType } from '@/lib/theme-place-types';

const sql = neon(process.env.DATABASE_URL!);

// Valid place types for validation
const VALID_PLACE_TYPES: PlaceType[] = [
  'restaurant', 'bar', 'hotel', 'camping', 'hostel', 'shop',
  'museum', 'theatre', 'spa', 'natural formations', 'brewery map',
  'historic', 'elevation', 'dog map'
];

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { recommendation, category } = body;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: 'Invalid trip ID format' },
        { status: 400 }
      );
    }

    // Validate category if provided
    if (category && !VALID_PLACE_TYPES.includes(category as PlaceType)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${VALID_PLACE_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Ensure recommendation column exists
    try {
      await sql`ALTER TABLE trips ADD COLUMN IF NOT EXISTS recommendation JSONB`;
    } catch (err) {
      // Column might already exist, ignore
    }

    // Get current recommendations
    const result = await sql`
      SELECT recommendation FROM trips WHERE id = ${id}
    `;
    
    let currentRecommendations: Record<string, CategoryRecommendation> = {};
    
    if (result.length > 0 && result[0].recommendation) {
      currentRecommendations = result[0].recommendation;
    }

    // If category is provided, update only that category (no history stored)
    if (category && recommendation !== undefined) {
      const newCategoryRec: CategoryRecommendation = {
        current: recommendation,
        previous: null, // History removed - always null
      };
      currentRecommendations[category] = newCategoryRec;
    } else if (!category) {
      // If no category, replace entire recommendations object
      currentRecommendations = recommendation || {};
    }

    // Update recommendation in database
    await sql`
      UPDATE trips
      SET recommendation = ${JSON.stringify(currentRecommendations)}
      WHERE id = ${id}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating recommendation:', error);
    return NextResponse.json(
      { error: 'Failed to update recommendation' },
      { status: 500 }
    );
  }
}
