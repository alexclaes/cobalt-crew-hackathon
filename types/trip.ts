// API Request type for creating a trip
export interface CreateTripRequest {
  preConfiguredUserIds: string[];
  manualUsers: Array<{
    name: string;
    address: string;
    lat: number;
    lon: number;
  }>;
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

// Complete trip data structure
export interface Trip {
  id: string;
  createdAt: string;
  users: TripUser[];
}
