import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserEntrySchema } from '@/types/user';
import type { CreateTripRequest, CreateTripResponse, TransportMode } from '@/types/trip';

interface UserEntry {
  id: string;
  name: string;
  address: string;
  lat: number;
  lon: number;
  isPreConfigured: boolean;
}

export function useTripCreation() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createTrip = async (
    users: UserEntry[], 
    selectedThemeId: string | null,
    transportMode: TransportMode = 'geographic'
  ) => {
    const validUsers = users.filter((user) =>
      UserEntrySchema.safeParse(user).success
    );

    if (validUsers.length < 2) {
      setError('Please add at least two mates with complete information (name and address)');
      alert('Please add at least two mates with complete information (name and address)');
      return;
    }

    if (!selectedThemeId) {
      setError('Please select a trip theme');
      alert('Please select a trip theme');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const preConfiguredUserIds = validUsers
        .filter((u) => u.isPreConfigured)
        .map((u) => u.id);

      const manualUsers = validUsers
        .filter((u) => !u.isPreConfigured)
        .map((u) => ({
          name: u.name,
          address: u.address,
          lat: u.lat,
          lon: u.lon,
        }));

      const requestBody: CreateTripRequest = {
        preConfiguredUserIds,
        manualUsers,
        themeId: selectedThemeId,
        transportMode,
      };

      const response = await fetch('/api/trips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to create trip');
      }

      const data: CreateTripResponse = await response.json();
      router.push(`/trip/${data.tripId}?transportMode=${encodeURIComponent(transportMode)}`);
    } catch (error) {
      console.error('Error creating trip:', error);
      const errorMsg = 'Failed to create trip. Please try again.';
      setError(errorMsg);
      alert(errorMsg);
      setIsCreating(false);
    }
  };

  return {
    createTrip,
    isCreating,
    error,
  };
}
