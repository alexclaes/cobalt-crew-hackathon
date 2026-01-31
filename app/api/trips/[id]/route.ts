import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';
import type { Trip, TripTheme } from '@/types/trip';

const sql = neon(process.env.DATABASE_URL!);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: 'Invalid trip ID format' },
        { status: 400 }
      );
    }

    // Query database for trip with theme information (try with transport_mode; fallback if column missing)
    let result: { id: string; created_at: string; users: unknown; theme_id: string | null; transport_mode?: string | null; theme_name: string | null; theme_icon: string | null }[];
    try {
      result = await sql`
        SELECT 
          t.id, 
          t.created_at, 
          t.users,
          t.theme_id,
          t.transport_mode,
          tt.name as theme_name,
          tt.icon as theme_icon
        FROM trips t
        LEFT JOIN trip_themes tt ON t.theme_id = tt.id
        WHERE t.id = ${id}
      `;
    } catch (selectError: unknown) {
      const err = selectError as { code?: string; message?: string };
      const isMissingColumn = err?.code === '42703' || (typeof err?.message === 'string' && err.message.includes('transport_mode') && err.message.includes('does not exist'));
      if (isMissingColumn) {
        result = await sql`
          SELECT 
            t.id, 
            t.created_at, 
            t.users,
            t.theme_id,
            tt.name as theme_name,
            tt.icon as theme_icon
          FROM trips t
          LEFT JOIN trip_themes tt ON t.theme_id = tt.id
          WHERE t.id = ${id}
        `;
      } else {
        throw selectError;
      }
    }

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      );
    }

    const row = result[0];
    const theme =
      row.theme_id != null && row.theme_name != null && row.theme_icon != null
        ? { id: row.theme_id, name: row.theme_name, icon: row.theme_icon }
        : undefined;
    const trip: Trip = {
      id: row.id,
      createdAt: row.created_at,
      users: row.users,
      themeId: row.theme_id ?? undefined,
      theme,
      transportMode: row.transport_mode === 'car' || row.transport_mode === 'train' ? row.transport_mode : undefined,
    };

    return NextResponse.json(trip);
  } catch (error) {
    console.error('Error fetching trip:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trip' },
      { status: 500 }
    );
  }
}
