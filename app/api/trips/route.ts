import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import type { CreateTripRequest, CreateTripResponse } from '@/types/trip';
import type { User } from '@/types/user';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: Request) {
  try {
    const body: CreateTripRequest = await request.json();
    const { preConfiguredUserIds, manualUsers, themeId, transportMode } = body;

    // Validate input
    if (!Array.isArray(preConfiguredUserIds) || !Array.isArray(manualUsers)) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Validate theme ID
    if (!themeId || typeof themeId !== 'string') {
      return NextResponse.json(
        { error: 'Valid theme ID is required' },
        { status: 400 }
      );
    }

    // Generate unique trip ID (server-side only!)
    const tripId = crypto.randomUUID();

    // Load pre-configured users from users.json
    const usersFilePath = join(process.cwd(), 'public/data/users.json');
    const usersFile = await readFile(usersFilePath, 'utf-8');
    const { users: allUsers } = JSON.parse(usersFile) as { users: User[] };

    // Filter pre-configured users by provided IDs
    const preConfiguredUsers = allUsers.filter((u) =>
      preConfiguredUserIds.includes(u.id)
    );

    // Combine users with isPreConfigured flag
    const tripUsers = [
      ...preConfiguredUsers.map((u) => ({ ...u, isPreConfigured: true })),
      ...manualUsers.map((u) => ({
        ...u,
        id: `manual-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        isPreConfigured: false,
      })),
    ];

    // Validate that we have at least 2 users
    if (tripUsers.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 users are required to create a trip' },
        { status: 400 }
      );
    }

    // Save to database (transport_mode optional; fallback to 3-column INSERT if column missing)
    const transportModeVal = transportMode === 'car' || transportMode === 'train' ? transportMode : null;
    try {
      await sql`
        INSERT INTO trips (id, users, theme_id, transport_mode)
        VALUES (${tripId}, ${JSON.stringify(tripUsers)}, ${themeId}, ${transportModeVal})
      `;
    } catch (insertError: unknown) {
      const err = insertError as { code?: string; message?: string };
      const isMissingColumn = err?.code === '42703' || (typeof err?.message === 'string' && err.message.includes('transport_mode') && err.message.includes('does not exist'));
      if (isMissingColumn) {
        await sql`
          INSERT INTO trips (id, users, theme_id)
          VALUES (${tripId}, ${JSON.stringify(tripUsers)}, ${themeId})
        `;
      } else {
        throw insertError;
      }
    }

    const response: CreateTripResponse = { tripId };
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error creating trip:', error);
    return NextResponse.json(
      { error: 'Failed to create trip' },
      { status: 500 }
    );
  }
}
