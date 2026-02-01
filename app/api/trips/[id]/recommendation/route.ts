import { neon } from '@neondatabase/serverless';
import { NextRequest, NextResponse } from 'next/server';
import type { CategoryRecommendation } from '@/types/trip';

const sql = neon(process.env.DATABASE_URL!);

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
    if (category && !['restaurant', 'bar', 'hotel'].includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category. Must be restaurant, bar, or hotel' },
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
    
    let currentRecommendations: {
      restaurant?: CategoryRecommendation;
      bar?: CategoryRecommendation;
      hotel?: CategoryRecommendation;
    } = {};
    
    if (result.length > 0 && result[0].recommendation) {
      currentRecommendations = result[0].recommendation;
    }

    // If category is provided, update only that category (no history stored)
    if (category && recommendation !== undefined) {
      const newCategoryRec: CategoryRecommendation = {
        current: recommendation,
        previous: null, // History removed - always null
      };
      currentRecommendations[category as keyof typeof currentRecommendations] = newCategoryRec;
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
