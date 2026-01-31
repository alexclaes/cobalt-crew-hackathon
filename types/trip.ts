// Trip theme data
export interface TripTheme {
  id: string;
  name: string;
  icon: string;
}

// API Request type for creating a trip
export interface CreateTripRequest {
  preConfiguredUserIds: string[];
  manualUsers: Array<{
    name: string;
    address: string;
    lat: number;
    lon: number;
  }>;
  themeId: string;
}

// API Response type
export interface CreateTripResponse {
  tripId: string;
}

// Stored trip user data
export interface TripUser {
  id: string;
  name: string;
  address: string;
  lat: number;
  lon: number;
  isPreConfigured: boolean;
}

import type { Restaurant } from '@/components/MapDisplay';

// Complete trip data structure
export interface Trip {
  id: string;
  createdAt: string;
  users: TripUser[];
  themeId?: string;
  theme?: TripTheme;
  recommendation?: { place: Restaurant; reasoning?: string } | null;
  places?: Restaurant[];
  placesMetadata?: {
    midpointLat?: number;
    midpointLon?: number;
    radiusKm?: number;
    placeTypes?: string[];
  };
}
