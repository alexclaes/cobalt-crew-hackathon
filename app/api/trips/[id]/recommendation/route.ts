import { neon } from '@neondatabase/serverless';
import { NextRequest, NextResponse } from 'next/server';

const sql = neon(process.env.DATABASE_URL!);

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { recommendation } = body;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: 'Invalid trip ID format' },
        { status: 400 }
      );
    }

    // Update recommendation in database
    // Try to update, if column doesn't exist, add it first
    try {
      await sql`
        UPDATE trips
        SET recommendation = ${JSON.stringify(recommendation)}
        WHERE id = ${id}
      `;
    } catch (err: any) {
      // If recommendation column doesn't exist, add it first
      if (err?.message?.includes('recommendation') || err?.message?.includes('column')) {
        try {
          await sql`ALTER TABLE trips ADD COLUMN IF NOT EXISTS recommendation JSONB`;
          await sql`
            UPDATE trips
            SET recommendation = ${JSON.stringify(recommendation)}
            WHERE id = ${id}
          `;
        } catch (alterErr) {
          console.error('Error adding recommendation column:', alterErr);
          throw alterErr;
        }
      } else {
        throw err;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating recommendation:', error);
    return NextResponse.json(
      { error: 'Failed to update recommendation' },
      { status: 500 }
    );
  }
}
