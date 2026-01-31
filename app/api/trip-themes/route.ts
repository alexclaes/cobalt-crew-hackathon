import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  try {
    const themes = await sql`
      SELECT id, name FROM trip_themes ORDER BY name ASC
    `;
    return NextResponse.json({ themes });
  } catch (error) {
    console.error('Error fetching trip themes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trip themes' },
      { status: 500 }
    );
  }
}
