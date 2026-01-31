import { neon } from '@neondatabase/serverless';
import { NextRequest, NextResponse } from 'next/server';
import type { Restaurant } from '@/components/MapDisplay';

const sql = neon(process.env.DATABASE_URL!);

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { places, placesMetadata } = body;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: 'Invalid trip ID format' },
        { status: 400 }
      );
    }

    // Ensure columns exist
    try {
      await sql`ALTER TABLE trips ADD COLUMN IF NOT EXISTS places JSONB`;
      await sql`ALTER TABLE trips ADD COLUMN IF NOT EXISTS places_metadata JSONB`;
    } catch (err) {
      // Columns might already exist, ignore
    }

    // Update places and metadata
    await sql`
      UPDATE trips
      SET places = ${JSON.stringify(places)},
          places_metadata = ${JSON.stringify(placesMetadata)}
      WHERE id = ${id}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving places:', error);
    return NextResponse.json(
      { error: 'Failed to save places' },
      { status: 500 }
    );
  }
}
