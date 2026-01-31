'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useSearchParams } from 'next/navigation';
import MatesList from '@/components/MatesList';
import Recommendation from '@/components/Recommendation';
import { calculateMidpoint, getDefaultRadiusKm, haversineDistanceKm, Coordinate } from '@/lib/midpoint';
import type { MapPoint, Restaurant, PlaceType } from '@/components/MapDisplay';
import type { Trip } from '@/types/trip';

function getTripTitle(trip: Trip | null): string {
  if (!trip || !trip.theme) {
    return 'Trip Planning';
  }
  const title = `${trip.theme?.icon ?? ''} ${trip.theme?.name ?? ''} Trip Planning`.trim();
  return title || 'Trip Planning';
}

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
  const searchParams = useSearchParams();
  const tripId = params.id as string;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState(50);
  const [places, setPlaces] = useState<Restaurant[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [enrichmentLoading, setEnrichmentLoading] = useState(false);
  const [placeTypes, setPlaceTypes] = useState<PlaceType[]>(['restaurant']);
  const [recommendation, setRecommendation] = useState<{ placeId: string; reasoning?: string } | null>(null);
  const lastEnrichedKeyRef = useRef<string | null>(null);
  const [apiMidpoint, setApiMidpoint] = useState<{ lat: number; lon: number } | null>(null);
  const [meetingPointLoading, setMeetingPointLoading] = useState(false);
  const [carMidpoint, setCarMidpoint] = useState<{ lat: number; lon: number } | null>(null);
  const [carRoutePolylines, setCarRoutePolylines] = useState<Array<Array<[number, number]>>>([]);

  const togglePlaceType = (type: PlaceType) => {
    setPlaceTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

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

  // Geographic midpoint (used when transport is geographic, or as fallback)
  const geographicMidpoint = useMemo(() => {
    const users = trip?.users ?? [];
    if (!trip || users.length < 2) {
      return null;
    }
    const coordinates: Coordinate[] = users.map((user) => ({
      lat: user.lat,
      lon: user.lon,
    }));
    return calculateMidpoint(coordinates);
  }, [trip]);

  // Use trip.transportMode from API, or fallback to URL param (e.g. after create) so the chosen line shows
  const effectiveTransportMode = trip?.transportMode ?? (searchParams.get('transportMode') === 'car' ? 'car' : 'geographic');
  const wantCarMeetingPoint = trip?.transportMode === 'car' || searchParams.get('transportMode') === 'car';

  // When trip has car transport (from API or URL): fetch travel-time–fair meeting point
  useEffect(() => {
    if (!trip || trip.users.length < 2 || !wantCarMeetingPoint) {
      setApiMidpoint(null);
      return;
    }
    let cancelled = false;
    setMeetingPointLoading(true);
    const coordinates = trip.users.map((u) => ({ lat: u.lat, lon: u.lon }));
    fetch('/api/meeting-point', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coordinates, transport: 'car' }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then((data: { lat: number; lon: number }) => {
        if (!cancelled) setApiMidpoint({ lat: data.lat, lon: data.lon });
      })
      .catch(() => {
        if (!cancelled) setApiMidpoint(null);
      })
      .finally(() => {
        if (!cancelled) setMeetingPointLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [trip?.id, trip?.users, trip?.transportMode]);

  // Fetch car meeting point for drawing car line (geographic line uses computed midpoint)
  useEffect(() => {
    const users = trip?.users ?? [];
    if (!trip || users.length < 2) {
      setCarMidpoint(null);
      return;
    }
    const coordinates = users.map((u) => ({ lat: u.lat, lon: u.lon }));
    const geoFallback = calculateMidpoint(coordinates);
    let cancelled = false;
    fetch('/api/meeting-point', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coordinates, transport: 'car' }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { lat: number; lon: number } | null) => (cancelled ? null : data))
      .catch(() => null)
      .then((car) => {
        if (!cancelled && geoFallback) setCarMidpoint(car ?? geoFallback);
      });
    return () => { cancelled = true; };
  }, [trip?.id, trip?.users?.length]);

  // Fetch driving route geometry from each startpoint to car midpoint (for drawing road routes on map)
  useEffect(() => {
    const users = trip?.users ?? [];
    const car = carMidpoint;
    if (!car || users.length < 2) {
      setCarRoutePolylines([]);
      return;
    }
    let cancelled = false;
    const coordinates = users.map((u) => ({ lat: u.lat, lon: u.lon }));
    Promise.all(
      coordinates.map((start) =>
        fetch('/api/driving-route', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ start, end: car }),
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((data: { coordinates?: Array<[number, number]> } | null) =>
            cancelled ? null : data?.coordinates ?? null
          )
          .catch(() => null)
      )
    ).then((results) => {
      if (!cancelled) {
        const valid = results.filter((r): r is Array<[number, number]> => Array.isArray(r) && r.length >= 2);
        setCarRoutePolylines(valid);
        if (valid.length === 0 && results.length > 0 && typeof console !== 'undefined' && console.warn) {
          console.warn('Car routes could not be loaded. Ensure OPENROUTESERVICE_API_KEY is set in .env and the Directions API is available.');
        }
      }
    });
    return () => { cancelled = true; };
  }, [trip?.id, trip?.users?.length, carMidpoint?.lat, carMidpoint?.lon]);

  // Display midpoint: car uses API result or geographic fallback; else geographic (incl. legacy train / URL fallback)
  const midpoint =
    effectiveTransportMode === 'car'
      ? (apiMidpoint ?? geographicMidpoint)
      : geographicMidpoint;

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
    const users = trip?.users ?? [];
    if (midpoint && trip && users.length >= 2) {
      const coordinates = users.map((u) => ({ lat: u.lat, lon: u.lon }));
      setRadiusKm(getDefaultRadiusKm(midpoint, coordinates));
    }
  }, [midpoint, trip]);

  // Fetch places for each selected type in parallel; merge, tag with type, sort by distance
  useEffect(() => {
    if (!midpoint || placeTypes.length === 0) {
      setPlaces([]);
      setRecommendation(null);
      return;
    }

    let cancelled = false;
    setPlacesLoading(true);

    const base = `/api/restaurants?lat=${midpoint.lat}&lon=${midpoint.lon}&radiusKm=${radiusKm}`;
    const fetches = placeTypes.map((type) =>
      fetch(`${base}&type=${type}`)
        .then((r) => r.json())
        .then((places) => ({ type, places }))
    );

    Promise.all(fetches)
      .then((results) => {
        if (cancelled) return;
        const merged: Restaurant[] = [];
        for (const result of results) {
          if (Array.isArray(result.places)) {
            // Tag each place with its type
            const tagged = result.places.map((place) => ({
              ...place,
              type: result.type,
            }));
            merged.push(...tagged);
          }
        }
        // Sort by distance from midpoint
        merged.sort(
          (a, b) =>
            haversineDistanceKm(midpoint, { lat: a.lat, lon: a.lon }) -
            haversineDistanceKm(midpoint, { lat: b.lat, lon: b.lon })
        );
        setPlaces(merged);
        setRecommendation(null); // Clear recommendation when places change
      })
      .catch((err) => {
        console.error('Error fetching places:', err);
        setPlaces([]);
        setRecommendation(null);
      })
      .finally(() => {
        if (!cancelled) setPlacesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [midpoint?.lat, midpoint?.lon, radiusKm, placeTypes.slice().sort().join(',')]);

  // Automatic enrichment: when places load (from Overpass), call OpenAI to add cost, rating, vegan/veg, etc.
  useEffect(() => {
    if (!midpoint || places.length === 0 || placesLoading) return;

    const batchKey = places.map((p) => p.id).sort().join(',');
    if (lastEnrichedKeyRef.current === batchKey) return;

    let cancelled = false;
    setEnrichmentLoading(true);

    fetch('/api/enrich-places', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ places, midpoint, radiusKm }),
    })
      .then((r) => r.json())
      .then((response: { places?: Restaurant[]; recommendation?: { placeId: string; reasoning?: string } | null }) => {
        if (!cancelled) {
          if (Array.isArray(response.places)) {
            setPlaces(response.places);
          }
          if (response.recommendation && response.recommendation.placeId) {
            setRecommendation(response.recommendation);
          } else {
            setRecommendation(null);
          }
          lastEnrichedKeyRef.current = batchKey;
        }
      })
      .catch((err) => {
        console.error('Enrichment error:', err);
        if (!cancelled) {
          setRecommendation(null);
        }
      })
      .finally(() => {
        if (!cancelled) setEnrichmentLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [midpoint, places.length, placesLoading, places.map((p) => p.id).sort().join(',')]);

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
        <div className="relative text-center mb-8">
          {/* New Trip Button - Top Left */}
          <a
            href="/"
            className="absolute top-0 left-0 flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md font-medium hover:bg-gray-700 transition-colors shadow-md"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Trip
          </a>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {getTripTitle(trip)}
          </h1>
          <p className="text-gray-600">
            View your trip details and the calculated midpoint
          </p>
          <div className="mt-2 text-sm text-gray-500">
            Trip ID: {trip.id}
          </div>
          
          {/* Share Button - Top Right */}
          <button
            onClick={() => {
              navigator.clipboard.writeText(
                `${window.location.origin}/trip/${trip.id}`
              );
              alert('Link copied to clipboard!');
            }}
            className="absolute top-0 right-0 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors shadow-md"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
            Share Trip
          </button>
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
                  restaurants={places}
                  midpointsByMode={{
                    geographic: geographicMidpoint ?? undefined,
                    car: carMidpoint ?? undefined,
                  }}
                  showGeographicLine={effectiveTransportMode !== 'car'}
                  showCarLine={effectiveTransportMode === 'car'}
                  carRoutePolylines={carRoutePolylines.length > 0 ? carRoutePolylines : undefined}
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
                <div className="mt-6 pt-4 border-t border-gray-200 space-y-4">
                  <div>
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

                  {/* Place Type Selection */}
                  <fieldset>
                    <legend className="block text-sm font-medium text-gray-700 mb-2">
                      Show places (multiselect)
                    </legend>
                    <div className="flex flex-wrap gap-4">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={placeTypes.includes('restaurant')}
                          onChange={() => togglePlaceType('restaurant')}
                          className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                        />
                        <span className="text-sm text-gray-700">Restaurants</span>
                        <span className="w-3 h-3 rounded-full bg-[#ea580c]" aria-hidden />
                      </label>
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={placeTypes.includes('bar')}
                          onChange={() => togglePlaceType('bar')}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-sm text-gray-700">Bars</span>
                        <span className="w-3 h-3 rounded-full bg-[#9333ea]" aria-hidden />
                      </label>
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={placeTypes.includes('hotel')}
                          onChange={() => togglePlaceType('hotel')}
                          className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                        <span className="text-sm text-gray-700">Hotels</span>
                        <span className="w-3 h-3 rounded-full bg-[#16a34a]" aria-hidden />
                      </label>
                    </div>
                  </fieldset>

                  {/* Places Loading Indicator */}
                  {placesLoading && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading places...</span>
                    </div>
                  )}

                  {/* Enrichment Loading Indicator */}
                  {enrichmentLoading && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Enriching with AI...</span>
                    </div>
                  )}

                  {/* Places Count */}
                  {places.length > 0 && !placesLoading && (
                    <div className="text-sm text-gray-600">
                      Found {places.length} place{places.length !== 1 ? 's' : ''} within {radiusKm} km
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Recommendation and Mates List */}
          <div className="space-y-6">
            <Recommendation
              recommendedPlace={
                recommendation?.placeId
                  ? places.find((p) => p.id === recommendation.placeId) || null
                  : null
              }
              midpoint={midpoint}
              reasoning={recommendation?.reasoning}
              isLoading={enrichmentLoading || (places.length > 0 && !recommendation && !placesLoading)}
              themeIcon={trip?.theme?.icon ?? '🦫'}
            />
            <MatesList users={trip?.users ?? []} />
          </div>
        </div>
      </div>
    </main>
  );
}
