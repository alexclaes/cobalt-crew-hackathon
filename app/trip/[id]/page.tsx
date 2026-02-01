'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { Plus, Share2 } from 'lucide-react';
import { Header } from '@/components/Header';
import { FloatingStickers } from '@/components/FloatingStickers';
import MatesList from '@/components/MatesList';
import Recommendation from '@/components/Recommendation';
import { calculateMidpoint, getDefaultRadiusKm, haversineDistanceKm, Coordinate } from '@/lib/midpoint';
import type { MapPoint, Restaurant } from '@/components/MapDisplay';
import type { Trip } from '@/types/trip';
import { getPlaceTypesForTheme, type PlaceType } from '@/lib/theme-place-types';

const categoryLabels: Partial<Record<PlaceType, string>> = {
  restaurant: 'restaurants',
  bar: 'bars',
  hotel: 'hotels',
  camping: 'camping sites',
  hostel: 'hostels',
  shop: 'shops',
  museum: 'museums',
  theatre: 'theatres',
  spa: 'spas',
  'natural formations': 'natural formations',
  'brewery map': 'breweries',
  historic: 'historic sites',
  elevation: 'elevation points',
  'dog map': 'dog parks',
};

function getTripTitle(trip: Trip | null): React.ReactElement {
  if (!trip || !trip.theme) {
    return <>Trip Planning</>;
  }
  return (
    <>
      <span className="inline-flex items-center justify-center w-16 h-16 bg-white border-[3px] border-black rounded-full mr-3 p-3">
        {trip.theme.icon}
      </span>
      {trip.theme.name} Trip Planning
    </>
  );
}

// Dynamically import MapDisplay with SSR disabled
const MapDisplay = dynamic(() => import('@/components/MapDisplay'), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] flex items-center justify-center border-[3px] border-black rounded-lg bg-white">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <p className="text-black font-mono">Loading map...</p>
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
  const [radiusKm, setRadiusKm] = useState(50); // Displayed radius (updates immediately)
  const [fetchRadiusKm, setFetchRadiusKm] = useState(50); // Radius used for fetching (updates on release)
  const [places, setPlaces] = useState<Restaurant[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [enrichmentLoading, setEnrichmentLoading] = useState(false);
  // Calculate place types based on trip theme
  const placeTypes = useMemo(() => {
    if (!trip?.theme?.name) return ['restaurant', 'bar', 'hotel'] as PlaceType[];
    return getPlaceTypesForTheme(trip.theme.name);
  }, [trip?.theme?.name]);
  const [recommendations, setRecommendations] = useState<Record<string, { current: { place: Restaurant | null; reasoning?: string } | null; previous: { place: Restaurant | null; reasoning?: string } | null }>>({});
  const [isRegenerating, setIsRegenerating] = useState<PlaceType | null>(null);
  const [hasNoRecommendation, setHasNoRecommendation] = useState(false);
  const lastEnrichedKeyRef = useRef<string | null>(null);
  const hasStoredRecommendationsRef = useRef<Set<PlaceType>>(new Set());
  const previousPlacesIdsRef = useRef<string>('');

  // Place types are now always all three - no toggle needed

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
        // Load stored recommendations if they exist
        if (tripData.recommendation) {
          setRecommendations(tripData.recommendation);
          // Track which categories have stored recommendations (check all categories in the recommendation object)
          hasStoredRecommendationsRef.current = new Set();
          for (const category in tripData.recommendation) {
            if (tripData.recommendation[category]?.current) {
              hasStoredRecommendationsRef.current.add(category as PlaceType);
            }
          }
          
          // Get theme place types
          const themePlaceTypes = tripData.theme?.name 
            ? getPlaceTypesForTheme(tripData.theme.name)
            : ['restaurant', 'bar', 'hotel'] as PlaceType[];
          
          // If we have cached places, create "no locations found" recommendations for categories without places
          if (tripData.places && Array.isArray(tripData.places) && tripData.places.length > 0) {
            const placeTypesWithoutPlaces = themePlaceTypes.filter(type => 
              !(tripData.places?.some((p: Restaurant) => p.type === type) ?? false)
            );
            // Create "no locations found" recommendations for categories without places that don't have recommendations
            // Batch all updates into a single state update to avoid infinite loops
            const categoriesToCreate: PlaceType[] = [];
            for (const category of placeTypesWithoutPlaces) {
              if (!hasStoredRecommendationsRef.current.has(category)) {
                hasStoredRecommendationsRef.current.add(category);
                categoriesToCreate.push(category);
                // Save to database
                if (tripId) {
                  const categoryLabel = categoryLabels[category] || category;
                  fetch(`/api/trips/${tripId}/recommendation`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      recommendation: {
                        place: null,
                        reasoning: `No recommendation available for ${categoryLabel} at this time.\n\nPlease try adjusting your search criteria or radius.`,
                      },
                      category
                    }),
                  }).catch(err => console.error(`Error saving ${category} no-locations recommendation:`, err));
                }
              }
            }
            // Batch update state once for all categories
            if (categoriesToCreate.length > 0) {
              setRecommendations((prev) => {
                const updated = { ...prev };
                for (const category of categoriesToCreate) {
                  const categoryLabel = categoryLabels[category] || category;
                  updated[category] = {
                    current: {
                      place: null as Restaurant | null,
                      reasoning: `No recommendation available for ${categoryLabel} at this time.\n\nPlease try adjusting your search criteria or radius.`,
                    },
                    previous: null,
                  };
                }
                return updated;
              });
            }
            
            const batchKey = tripData.places.map((p) => p.id).sort().join(',');
            // Check if all place types (both with and without places) have recommendations
            const placeTypesWithPlaces = themePlaceTypes.filter(type => 
              tripData.places?.some((p: Restaurant) => p.type === type) ?? false
            );
            const allTypesWithPlacesHaveRecommendations = placeTypesWithPlaces.length === 0 || 
              placeTypesWithPlaces.every(type => hasStoredRecommendationsRef.current.has(type));
            const allTypesWithoutPlacesHaveRecommendations = placeTypesWithoutPlaces.length === 0 || 
              placeTypesWithoutPlaces.every(type => hasStoredRecommendationsRef.current.has(type));
            const allTypesHaveRecommendations = allTypesWithPlacesHaveRecommendations && allTypesWithoutPlacesHaveRecommendations;
            if (allTypesHaveRecommendations) {
              lastEnrichedKeyRef.current = batchKey;
            }
          } else {
            // No places at all - create "no locations found" recommendations for all theme types that don't have recommendations
            // Batch all updates into a single state update to avoid infinite loops
            const categoriesToCreate: PlaceType[] = [];
            for (const category of themePlaceTypes) {
              if (!hasStoredRecommendationsRef.current.has(category)) {
                hasStoredRecommendationsRef.current.add(category);
                categoriesToCreate.push(category);
                // Save to database
                if (tripId) {
                  const categoryLabel = categoryLabels[category] || category;
                  fetch(`/api/trips/${tripId}/recommendation`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      recommendation: {
                        place: null,
                        reasoning: `No recommendation available for ${categoryLabel} at this time.\n\nPlease try adjusting your search criteria or radius.`,
                      },
                      category
                    }),
                  }).catch(err => console.error(`Error saving ${category} no-locations recommendation:`, err));
                }
              }
            }
            // Batch update state once for all categories
            if (categoriesToCreate.length > 0) {
              setRecommendations((prev) => {
                const updated = { ...prev };
                for (const category of categoriesToCreate) {
                  const categoryLabel = categoryLabels[category] || category;
                  updated[category] = {
                    current: {
                      place: null as Restaurant | null,
                      reasoning: `No recommendation available for ${categoryLabel} at this time.\n\nPlease try adjusting your search criteria or radius.`,
                    },
                    previous: null,
                  };
                }
                return updated;
              });
            }
            // Check if all theme types have recommendations (including "no locations found")
            const allTypesHaveRecommendations = themePlaceTypes.length === 0 || 
              themePlaceTypes.every(type => hasStoredRecommendationsRef.current.has(type));
            if (allTypesHaveRecommendations) {
              lastEnrichedKeyRef.current = 'no-places';
            }
          }
        } else {
          setRecommendations({});
          hasStoredRecommendationsRef.current = new Set();
        }
        // Places will be loaded by the useEffect that checks metadata
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
      const defaultRadius = getDefaultRadiusKm(midpoint, coordinates);
      setRadiusKm(defaultRadius);
      setFetchRadiusKm(defaultRadius);
    }
  }, [midpoint, trip]);

  // Clear recommendations when fetch radius changes (new places = new recommendations needed)
  const previousRadiusRef = useRef<number | null>(null);
  useEffect(() => {
    if (previousRadiusRef.current !== null && previousRadiusRef.current !== fetchRadiusKm) {
      // Fetch radius changed - clear stored recommendations and force re-enrichment
      setRecommendations({});
      hasStoredRecommendationsRef.current.clear();
      lastEnrichedKeyRef.current = null;
    }
    previousRadiusRef.current = fetchRadiusKm;
  }, [fetchRadiusKm]);

  // Fetch places for each selected type in parallel; merge, tag with type, sort by distance
  // First check if we have cached places that match current parameters
  useEffect(() => {
    if (!midpoint || placeTypes.length === 0 || !trip) {
      setPlaces([]);
      return;
    }

    // Check if stored places match current parameters (including theme)
    const storedMetadata = trip.placesMetadata;
    const placeTypesStr = placeTypes.slice().sort().join(',');
    const themeName = trip.theme?.name || '';
    const metadataMatches = storedMetadata &&
      storedMetadata.midpointLat === midpoint.lat &&
      storedMetadata.midpointLon === midpoint.lon &&
      storedMetadata.radiusKm === fetchRadiusKm &&
      storedMetadata.placeTypes?.slice().sort().join(',') === placeTypesStr &&
      storedMetadata.themeName === themeName;

    // If we have matching cached places, use them (no loading spinner)
    if (metadataMatches && trip.places && Array.isArray(trip.places) && trip.places.length > 0) {
      setPlaces(trip.places);
      setPlacesLoading(false);
      // Set lastEnrichedKeyRef to prevent re-enrichment if we have cached places and recommendations
      const batchKey = trip.places.map((p) => p.id).sort().join(',');
      // Only set if we have recommendations for all place types that have places (prevents unnecessary enrichment)
      const placeTypesWithPlaces = placeTypes.filter(type => 
        trip.places?.some(p => p.type === type) ?? false
      );
      const allTypesWithPlacesHaveRecommendations = placeTypesWithPlaces.length > 0 && 
        placeTypesWithPlaces.every(type => hasStoredRecommendationsRef.current.has(type));
      if (allTypesWithPlacesHaveRecommendations) {
        lastEnrichedKeyRef.current = batchKey;
      }
      return;
    }

    // Otherwise, fetch from Overpass API (single fetch for all types)
    let cancelled = false;
    setPlacesLoading(true);

    const typesParam = placeTypes.join(',');
    fetch(`/api/restaurants?lat=${midpoint.lat}&lon=${midpoint.lon}&radiusKm=${fetchRadiusKm}&types=${typesParam}`)
      .then((r) => r.json())
      .then((places: Restaurant[]) => {
        if (cancelled) return;
        // Places already have type from API
        if (Array.isArray(places)) {
          // Sort by distance from midpoint
          places.sort(
            (a, b) =>
              haversineDistanceKm(midpoint, { lat: a.lat, lon: a.lon }) -
              haversineDistanceKm(midpoint, { lat: b.lat, lon: b.lon })
          );
          setPlaces(places);

          // Save places to database
          if (tripId && places.length > 0) {
            fetch(`/api/trips/${tripId}/places`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                places,
                placesMetadata: {
                  midpointLat: midpoint.lat,
                  midpointLon: midpoint.lon,
                  radiusKm: fetchRadiusKm,
                  placeTypes: placeTypes.slice(),
                  themeName: trip.theme?.name || '',
                },
              }),
            }).catch((err) => {
              console.error('Error saving places to database:', err);
            });
          }
        } else {
          setPlaces([]);
        }

        // Recommendations are handled separately in the enrichment effect
      })
      .catch((err) => {
        console.error('Error fetching places:', err);
        setPlaces([]);
      })
      .finally(() => {
        if (!cancelled) setPlacesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [midpoint?.lat, midpoint?.lon, fetchRadiusKm, placeTypes.slice().sort().join(','), trip, tripId, places.length, placesLoading, isRegenerating, isLoading]);

  // Automatic enrichment: when places load (from Overpass), call OpenAI to add cost, rating, vegan/veg, etc.
  useEffect(() => {
    if (!midpoint || places.length === 0 || placesLoading || !trip || isLoading) {
      setEnrichmentLoading(false); // Ensure loading state is cleared
      return;
    }
    
    // Compute batch key and check if places actually changed
    const currentPlacesIds = places.map((p) => p.id).sort().join(',');
    const batchKey = currentPlacesIds;
    
    // Early check: if we already processed this batch, skip
    if (previousPlacesIdsRef.current === batchKey && lastEnrichedKeyRef.current === batchKey) {
      setEnrichmentLoading(false); // Ensure loading state is cleared
      return;
    }
    
    // Update ref to track current places
    previousPlacesIdsRef.current = batchKey;

    // Identify place types with and without places
    const placeTypesWithPlaces = placeTypes.filter(type => 
      places.some(p => p.type === type)
    );
    const placeTypesWithoutPlaces = placeTypes.filter(type => 
      !places.some(p => p.type === type)
    );
    
    // Handle categories without places FIRST: create "no locations found" recommendations
    // Only create if they don't already exist in the database
    // This must happen BEFORE checking if enrichment is needed, to prevent unnecessary API calls
    if (placeTypesWithoutPlaces.length > 0) {
      const categoriesNeedingNoLocationRec = placeTypesWithoutPlaces.filter(type => 
        !hasStoredRecommendationsRef.current.has(type)
      );
      if (categoriesNeedingNoLocationRec.length > 0) {
        // Create "no locations found" recommendations synchronously by updating the ref immediately
        for (const category of categoriesNeedingNoLocationRec) {
          const categoryLabel = categoryLabels[category] || category;
          hasStoredRecommendationsRef.current.add(category);
          // Save to database
          if (tripId) {
            fetch(`/api/trips/${tripId}/recommendation`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                recommendation: {
                  place: null,
                  reasoning: `No recommendation available for ${categoryLabel} at this time.\n\nPlease try adjusting your search criteria or radius.`,
                },
                category
              }),
            }).catch(err => console.error(`Error saving ${category} no-locations recommendation:`, err));
          }
        }
        // Update state (async, but ref is already updated)
        setRecommendations((prev) => {
          const updated = { ...prev };
          for (const category of categoriesNeedingNoLocationRec) {
            const categoryLabel = categoryLabels[category] || category;
            updated[category] = {
              current: {
                place: null as Restaurant | null,
                reasoning: `No recommendation available for ${categoryLabel} at this time.\n\nPlease try adjusting your search criteria or radius.`,
              },
              previous: null,
            };
          }
          return updated;
        });
      }
    }
    
    // NOW check if we have stored recommendations for all place types (both with and without places)
    // Use the ref (which is updated immediately) rather than state (which is async)
    const allTypesWithPlacesHaveRecommendations = placeTypesWithPlaces.length === 0 || 
      placeTypesWithPlaces.every(type => hasStoredRecommendationsRef.current.has(type));
    const allTypesWithoutPlacesHaveRecommendations = placeTypesWithoutPlaces.length === 0 || 
      placeTypesWithoutPlaces.every(type => hasStoredRecommendationsRef.current.has(type));
    const allTypesHaveRecommendations = allTypesWithPlacesHaveRecommendations && allTypesWithoutPlacesHaveRecommendations;
    
    // If all types (with and without places) are covered, skip enrichment
    // We check the ref which is updated immediately, not state which is async
    if (allTypesHaveRecommendations && !isRegenerating) {
      // All place types have stored recommendations, no need to call API
      lastEnrichedKeyRef.current = batchKey; // Mark as processed to prevent future calls
      setEnrichmentLoading(false); // Ensure loading state is cleared
      return;
    }

    // Skip AI enrichment for categories that have stored recommendations (unless regenerating that category)
    // Only check place types that actually have places in the dataset
    const needsEnrichment = placeTypesWithPlaces.some(type =>
      !hasStoredRecommendationsRef.current.has(type) || isRegenerating === type
    );
    if (!needsEnrichment && !isRegenerating) {
      // All place types that have places have stored recommendations, no need to call API
      lastEnrichedKeyRef.current = batchKey; // Mark as processed to prevent future calls
      setEnrichmentLoading(false); // Ensure loading state is cleared
      return;
    }

    let cancelled = false;
    setEnrichmentLoading(true);
    setHasNoRecommendation(false);

    fetch('/api/enrich-places', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ places, midpoint, radiusKm: fetchRadiusKm, placeTypes }),
    })
      .then((r) => r.json())
      .then((response: { places?: Restaurant[]; recommendations?: Record<string, { placeId: string | null; reasoning?: string }> }) => {
        if (!cancelled) {
          if (Array.isArray(response.places)) {
            setPlaces(response.places);
            // Save enriched places back to database
            if (tripId && response.places.length > 0 && midpoint) {
              fetch(`/api/trips/${tripId}/places`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  places: response.places,
                  placesMetadata: {
                    midpointLat: midpoint.lat,
                    midpointLon: midpoint.lon,
                    radiusKm: fetchRadiusKm,
                    placeTypes: placeTypes.slice(),
                    themeName: trip?.theme?.name || '',
                  },
                }),
              }).catch((err) => {
                console.error('Error saving enriched places to database:', err);
              });
            }
          }

          // Process recommendations per category
          if (response.recommendations) {
            setRecommendations((prev) => {
              const updated = { ...prev };

              // Process recommendations for all place types in the theme
              for (const category of placeTypes) {
                const categoryRec = response.recommendations?.[category];
                if (categoryRec && categoryRec.placeId) {
                  // Find the full place data from enriched places
                  const recommendedPlace = response.places?.find(p => p.id === categoryRec.placeId);
                  if (recommendedPlace) {
                    const fullRecommendation = {
                      place: recommendedPlace,
                      reasoning: categoryRec.reasoning,
                    };

                    // Store new recommendation (no history)
                    const newCategoryRec = {
                      current: fullRecommendation,
                      previous: null, // History removed - always null
                    };
                    updated[category] = newCategoryRec;

                    // Save to database
                    if (tripId) {
                      fetch(`/api/trips/${tripId}/recommendation`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          recommendation: fullRecommendation,
                          category
                        }),
                      }).catch(err => console.error(`Error saving ${category} recommendation:`, err));
                    }

                    hasStoredRecommendationsRef.current.add(category);
                  }
                } else if (categoryRec && categoryRec.placeId === null && placeTypes.includes(category)) {
                  // No recommendation for this category, but it was requested
                  if (!updated[category]) {
                    updated[category] = { current: null, previous: null };
                  }
                }
              }

              return updated;
            });
            setHasNoRecommendation(false);
          } else {
            setHasNoRecommendation(true);
          }

          lastEnrichedKeyRef.current = batchKey;
          setIsRegenerating(null);
        }
      })
      .catch((err) => {
        console.error('Enrichment error:', err);
        if (!cancelled) {
          setHasNoRecommendation(true);
          setIsRegenerating(null);
        }
      })
      .finally(() => {
        if (!cancelled) setEnrichmentLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [midpoint?.lat, midpoint?.lon, places.length, placesLoading, isRegenerating, tripId, placeTypes.slice().sort().join(',')]);

  // Loading state
  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#ffb6c1] relative overflow-hidden">
        <FloatingStickers />
        <div className="relative z-10">
          <Header />
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-black font-mono">Loading trip...</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Error state
  if (error || !trip) {
    return (
      <main className="min-h-screen bg-[#ffb6c1] relative overflow-hidden">
        <FloatingStickers />
        <div className="relative z-10">
          <Header />
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center py-20">
              <div className="bg-white border-[3px] border-black rounded-2xl p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] inline-block">
                <svg
                  className="w-16 h-16 mx-auto mb-4 text-[#ff1493]"
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
                <h1 className="text-2xl font-bold text-black mb-2 font-sans">
                  {error || 'Trip not found'}
                </h1>
                <p className="text-black/70 mb-6 font-mono text-sm">
                  The trip you're looking for doesn't exist or has been removed.
                </p>
                <a
                  href="/"
                  className="inline-block px-6 py-3 bg-[#ff1493] text-white rounded-lg font-mono font-bold border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                >
                  Create a New Trip
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#ffb6c1] relative overflow-hidden">
      <FloatingStickers />
      <div className="relative z-10">
        <Header />
        <div className="max-w-6xl mx-auto px-4 pb-8">
          {/* Header */}
          <div className="mb-8">
            {/* Buttons Row */}
            <div className="flex items-center justify-between mb-6">
              {/* New Trip Button */}
              <a
                href="/"
                className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-full font-mono font-medium border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                <Plus className="w-4 h-4" />
                New Trip
              </a>
              
              {/* Share Button */}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${window.location.origin}/trip/${trip.id}`
                  );
                  alert('Link copied to clipboard!');
                }}
                className="flex items-center gap-2 px-4 py-2 bg-[#4361ee] text-white rounded-full font-mono font-medium border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                <Share2 className="w-4 h-4" />
                Share Trip
              </button>
            </div>
            
            {/* Title */}
            <h1 className="text-4xl font-bold text-black text-center font-sans">
              {getTripTitle(trip)}
            </h1>
          </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Map and Radius Slider */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6">
              {mapPoints.length > 0 && midpoint ? (
                <MapDisplay
                  startpoints={mapPoints}
                  midpoint={midpoint}
                  radiusKm={fetchRadiusKm}
                  restaurants={places}
                  recommendedPlaceIds={new Set(
                    Object.values(recommendations)
                      .filter(rec => rec?.current?.place?.id)
                      .map(rec => rec!.current!.place!.id)
                  )}
                />
              ) : (
                <div className="h-[500px] flex items-center justify-center border-[3px] border-black/20 rounded-lg bg-white">
                  <div className="text-center text-black/60 font-mono">
                    <p>No locations to display</p>
                  </div>
                </div>
              )}

              {/* Midpoint Info */}
              {midpoint && (
                <div className="mt-4 p-4 bg-[#7DF9FF]/30 rounded-lg border-[2px] border-[#7DF9FF]">
                  <div className="text-sm font-bold text-black font-mono">
                    Midpoint Calculated
                  </div>
                  <div className="text-xs text-black/70 mt-1 font-mono">
                    {midpoint.lat.toFixed(6)}, {midpoint.lon.toFixed(6)}
                  </div>
                </div>
              )}

              {/* Radius Slider */}
              {midpoint && (
                <div className="mt-6 pt-4 border-t-[3px] border-black/10 space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-black mb-2 font-mono">
                      Search radius: {radiusKm} km
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={100}
                      step={1}
                      value={radiusKm}
                      onChange={(e) => setRadiusKm(Number(e.target.value))}
                      onMouseUp={(e) => setFetchRadiusKm(Number((e.target as HTMLInputElement).value))}
                      onTouchEnd={(e) => setFetchRadiusKm(Number((e.target as HTMLInputElement).value))}
                      className="w-full h-3 bg-black/10 rounded-lg appearance-none cursor-pointer"
                      style={{
                        accentColor: '#ff1493',
                      }}
                    />
                    <div className="flex justify-between text-xs text-black/50 mt-1 font-mono">
                      <span>1 km</span>
                      <span>100 km</span>
                    </div>
                  </div>


                  {/* Places Loading Indicator */}
                  {placesLoading && (
                    <div className="flex items-center gap-2 text-sm text-black/70 font-mono">
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading places...</span>
                    </div>
                  )}

                  {/* Places Count */}
                  {places.length > 0 && !placesLoading && (
                    <div className="text-sm text-black/70 font-mono">
                      Found {places.length} place{places.length !== 1 ? 's' : ''} within {fetchRadiusKm} km
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Recommendation and Mates List */}
          <div className="space-y-6">
            <Recommendation
              recommendations={recommendations}
              places={places}
              midpoint={midpoint}
              isLoading={enrichmentLoading || isRegenerating !== null}
              placesLoading={placesLoading}
              hasNoRecommendation={hasNoRecommendation}
              themeIcon={trip?.theme?.icon}
              selectedPlaceTypes={placeTypes}
              onRegenerate={(category) => {
                setIsRegenerating(category);
                setHasNoRecommendation(false);
                hasStoredRecommendationsRef.current.delete(category);
                lastEnrichedKeyRef.current = null; // Force regeneration
              }}
            />
            <MatesList users={trip.users} />
          </div>
        </div>
        </div>
      </div>
    </main>
  );
}
