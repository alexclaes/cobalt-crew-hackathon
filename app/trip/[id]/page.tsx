'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import MatesList from '@/components/MatesList';
import { calculateMidpoint, getDefaultRadiusKm, Coordinate } from '@/lib/midpoint';
import type { MapPoint } from '@/components/MapDisplay';
import type { Trip } from '@/types/trip';

// Dynamically import MapDisplay with SSR disabled
const MapDisplay = dynamic(() => import('@/components/MapDisplay'), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] flex items-center justify-center border border-gray-300 rounded-lg bg-gray-50">
      <div className="text-center text-gray-500">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <p>Loading map...</p>
      </div>
    </div>
  ),
});

export default function TripPage() {
  const params = useParams();
  const tripId = params.id as string;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState(50);

  // Fetch trip data
  useEffect(() => {
    async function fetchTrip() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/trips/${tripId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Trip not found');
          } else {
            setError('Failed to load trip');
          }
          return;
        }

        const tripData: Trip = await response.json();
        setTrip(tripData);
      } catch (err) {
        console.error('Error fetching trip:', err);
        setError('Failed to load trip');
      } finally {
        setIsLoading(false);
      }
    }

    if (tripId) {
      fetchTrip();
    }
  }, [tripId]);

  // Calculate midpoint from trip users
  const midpoint = useMemo(() => {
    if (!trip || trip.users.length < 2) {
      return null;
    }
    const coordinates: Coordinate[] = trip.users.map((user) => ({
      lat: user.lat,
      lon: user.lon,
    }));
    return calculateMidpoint(coordinates);
  }, [trip]);

  // Convert users to map points
  const mapPoints: MapPoint[] = useMemo(() => {
    if (!trip) return [];
    return trip.users.map((user) => ({
      lat: user.lat,
      lon: user.lon,
      label: user.name,
    }));
  }, [trip]);

  // Set default radius based on trip scale
  useEffect(() => {
    if (midpoint && trip && trip.users.length >= 2) {
      const coordinates = trip.users.map((u) => ({ lat: u.lat, lon: u.lon }));
      setRadiusKm(getDefaultRadiusKm(midpoint, coordinates));
    }
  }, [midpoint, trip]);

  // Loading state
  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading trip...</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Error state
  if (error || !trip) {
    return (
      <main className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-20">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {error || 'Trip not found'}
            </h1>
            <p className="text-gray-600 mb-6">
              The trip you're looking for doesn't exist or has been removed.
            </p>
            <a
              href="/"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors"
            >
              Create a New Trip
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Trip Planning
          </h1>
          <p className="text-gray-600">
            View your trip details and the calculated midpoint
          </p>
          <div className="mt-2 text-sm text-gray-500">
            Trip ID: {trip.id}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Map and Radius Slider */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Map View
              </h2>
              {mapPoints.length > 0 && midpoint ? (
                <MapDisplay
                  startpoints={mapPoints}
                  midpoint={midpoint}
                  radiusKm={radiusKm}
                />
              ) : (
                <div className="h-[500px] flex items-center justify-center border border-gray-300 rounded-lg bg-gray-50">
                  <div className="text-center text-gray-500">
                    <p>No locations to display</p>
                  </div>
                </div>
              )}

              {/* Midpoint Info */}
              {midpoint && (
                <div className="mt-4 p-4 bg-blue-50 rounded-md border border-blue-200">
                  <div className="text-sm font-medium text-blue-900">
                    Midpoint Calculated
                  </div>
                  <div className="text-xs text-blue-700 mt-1">
                    {midpoint.lat.toFixed(6)}, {midpoint.lon.toFixed(6)}
                  </div>
                </div>
              )}

              {/* Radius Slider */}
              {midpoint && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search radius: {radiusKm} km
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={100}
                    step={1}
                    value={radiusKm}
                    onChange={(e) => setRadiusKm(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>1 km</span>
                    <span>100 km</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Mates List */}
          <div>
            <MatesList users={trip.users} />
          </div>
        </div>

        {/* Share Link Section */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Share this Trip
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={`${window.location.origin}/trip/${trip.id}`}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(
                  `${window.location.origin}/trip/${trip.id}`
                );
                alert('Link copied to clipboard!');
              }}
              className="px-6 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors"
            >
              Copy Link
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
