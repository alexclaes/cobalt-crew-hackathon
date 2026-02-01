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

// Recommendation structure for a single category
export interface CategoryRecommendation {
  current: { place: Restaurant | null; reasoning?: string } | null;
  previous: { place: Restaurant | null; reasoning?: string } | null;
}

// Complete trip data structure
export interface Trip {
  id: string;
  createdAt: string;
  users: TripUser[];
  themeId?: string;
  theme?: TripTheme;
  recommendation?: Record<string, CategoryRecommendation>; // Flexible for any PlaceType
  places?: Restaurant[];
  placesMetadata?: {
    midpointLat?: number;
    midpointLon?: number;
    radiusKm?: number;
    placeTypes?: string[];
    themeName?: string;
  };
}
