'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import UserSelectionModal from '@/components/UserSelectionModal';
import AddManualMateModal from '@/components/AddManualMateModal';
import MateCard from '@/components/MateCard';
import MapDisplay, { type Restaurant, type PlaceType, type MapPoint } from '@/components/MapDisplay';
import VoiceInput, { type VoiceResult, type BulkVoiceResult } from '@/components/VoiceInput';
import { User, UserEntrySchema } from '@/types/user';
import type { CreateTripRequest, CreateTripResponse, TripTheme } from '@/types/trip';
import { calculateMidpoint, getDefaultRadiusKm, haversineDistanceKm, type Coordinate } from '@/lib/midpoint';

type UserEntry = User & {
  isPreConfigured: boolean;
  userLabel: string; // e.g., "User 1", "User 2"
  isReadOnly: boolean; // Whether the user can be edited
};

export default function Home() {
  const router = useRouter();
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [manualUserCount, setManualUserCount] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isManualMateModalOpen, setIsManualMateModalOpen] = useState(false);
  const [isCreatingTrip, setIsCreatingTrip] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [radiusKm, setRadiusKm] = useState(50);
  const [places, setPlaces] = useState<Restaurant[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [enrichmentLoading, setEnrichmentLoading] = useState(false);
  const [enrichmentError, setEnrichmentError] = useState<string | null>(null);
  const [placeTypes, setPlaceTypes] = useState<PlaceType[]>(['restaurant']);
  const lastEnrichedKeyRef = useRef<string | null>(null);
  const [themes, setThemes] = useState<TripTheme[]>([]);
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);

  const togglePlaceType = (type: PlaceType) => {
    setPlaceTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  // Create a stable key for users to use in useMemo
  const usersKey = useMemo(() => {
    return users.map(u => `${u.id}:${u.lat.toFixed(6)},${u.lon.toFixed(6)}`).join('|');
  }, [users]);

  // Calculate midpoint only when showMap is true - memoize to prevent object recreation
  const midpoint = useMemo(() => {
    if (!showMap || users.length < 2) {
      return null;
    }
    const coordinates: Coordinate[] = users.map((user) => ({
      lat: user.lat,
      lon: user.lon,
    }));
    const result = calculateMidpoint(coordinates);
    // Return null if calculation failed, otherwise return the result
    return result;
  }, [usersKey, showMap, users.length]);

  // Convert users to map points - use stable usersKey
  const mapPoints: MapPoint[] = useMemo(() => {
    return users.map((user) => ({
      lat: user.lat,
      lon: user.lon,
      label: user.name,
    }));
  }, [usersKey]);

  // Set default radius from trip scale (Germany: small 1 km, mid 15 km, large 50 km) when midpoint/users change
  const coordinatesForRadius = useMemo(
    () => users.map((u) => ({ lat: u.lat, lon: u.lon })),
    [usersKey]
  );
  useEffect(() => {
    if (midpoint && coordinatesForRadius.length >= 2) {
      setRadiusKm(getDefaultRadiusKm(midpoint, coordinatesForRadius));
    }
  }, [midpoint?.lat, midpoint?.lon, coordinatesForRadius.length, usersKey]);

  // Fetch trip themes on component mount
  useEffect(() => {
    fetch('/api/trip-themes')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data.themes) && data.themes.length > 0) {
          setThemes(data.themes);
          // Do not set a default - user must select
        }
      })
      .catch(err => console.error('Error fetching themes:', err));
  }, []);

  // Fetch places for each selected type in parallel; merge, tag with type, sort by distance
  useEffect(() => {
    if (!midpoint || !showMap || placeTypes.length === 0) {
      setPlaces([]);
      return;
    }
    let cancelled = false;
    setPlacesLoading(true);
    const base = `/api/restaurants?lat=${midpoint.lat}&lon=${midpoint.lon}&radiusKm=${radiusKm}`;
    const center = { lat: midpoint.lat, lon: midpoint.lon };
    Promise.all(
      placeTypes.map((type) =>
        fetch(`${base}&type=${type}`)
          .then((res) => (res.ok ? res.json() : []))
          .then((data: { id: string; name: string; lat: number; lon: number; cuisine?: string; priceRange?: string; openingHours?: string }[]) =>
            (Array.isArray(data) ? data : []).map((p) => ({
              ...p,
              type,
              id: `${type}-${p.id}`,
            } as Restaurant))
          )
          .catch(() => [] as Restaurant[])
      )
    )
      .then((arrays) => {
        if (cancelled) return;
        const merged: Restaurant[] = arrays.flat();
        merged.sort((a, b) => {
          const da = haversineDistanceKm(center, { lat: a.lat, lon: a.lon });
          const db = haversineDistanceKm(center, { lat: b.lat, lon: b.lon });
          return da - db;
        });
        setPlaces(merged);
      })
      .finally(() => {
        if (!cancelled) setPlacesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [midpoint?.lat, midpoint?.lon, radiusKm, showMap, placeTypes.slice().sort().join(',')]);

  // Automatic enrichment: when places load (from Overpass), call OpenAI to add cost, rating, vegan/veg, etc.
  useEffect(() => {
    if (!midpoint || places.length === 0 || placesLoading) return;
    const batchKey = places.map((p) => p.id).sort().join(',');
    if (batchKey === lastEnrichedKeyRef.current) return;
    lastEnrichedKeyRef.current = batchKey;
    let cancelled = false;
    setEnrichmentLoading(true);
    setEnrichmentError(null);
    fetch('/api/enrich-places', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ places, midpoint, radiusKm }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 503 ? 'API key not configured' : res.statusText);
        return res.json();
      })
      .then((enriched: Restaurant[]) => {
        if (!cancelled && Array.isArray(enriched)) {
          console.log('[Enrich] data from API (merged places from OpenAI):', JSON.stringify(enriched, null, 2));
          setPlaces(enriched);
        }
      })
      .catch((err) => {
        if (!cancelled) setEnrichmentError(err instanceof Error ? err.message : 'Could not load details');
      })
      .finally(() => {
        if (!cancelled) setEnrichmentLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [midpoint?.lat, midpoint?.lon, radiusKm, places, placesLoading]);

  const handleRemoveUser = (userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    // If it's a manual user, decrement the counter
    const user = users.find(u => u.id === userId);
    if (user && !user.isPreConfigured) {
      setManualUserCount((prev) => Math.max(0, prev - 1));
    }
  };

  const handleAddManualMate = (mate: { name: string; address: string; lat: number; lon: number }) => {
    const newCount = manualUserCount + 1;
    const newUser: UserEntry = {
      id: `manual-${Date.now()}`,
      name: mate.name,
      address: mate.address,
      lat: mate.lat,
      lon: mate.lon,
      isPreConfigured: false,
      userLabel: `User ${users.length + 1}`,
      isReadOnly: true, // Manual mates added via modal are read-only
    };
    setUsers((prev) => [...prev, newUser]);
    setManualUserCount(newCount);
  };

  const handleSelectPreConfiguredUsers = (selectedUsers: User[]) => {
    const newUserEntries: UserEntry[] = selectedUsers.map((user, index) => ({
      ...user,
      isPreConfigured: true,
      userLabel: `User ${users.length + index + 1}`,
      isReadOnly: true, // Pre-configured users are read-only
    }));
    setUsers((prev) => [...prev, ...newUserEntries]);
  };

  const handleCreateTrip = async () => {
    // Validate that we have at least 2 users with complete information
    const validUsers = users.filter(user => UserEntrySchema.safeParse(user).success);
    
    if (validUsers.length < 2) {
      alert('Please add at least two mates with complete information (name and address)');
      return;
    }

    // Validate that a theme is selected
    if (!selectedThemeId) {
      alert('Please select a trip theme');
      return;
    }

    setIsCreatingTrip(true);

    try {
      // Separate pre-configured and manual users (use validUsers only)
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

      // Create trip via API
      const requestBody: CreateTripRequest = {
        preConfiguredUserIds,
        manualUsers,
        themeId: selectedThemeId,
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

      // Navigate to the trip page with the server-generated ID
      router.push(`/trip/${data.tripId}`);
    } catch (error) {
      console.error('Error creating trip:', error);
      alert('Failed to create trip. Please try again.');
      setIsCreatingTrip(false);
    }
  };

  // Handle bulk voice input results
  const handleVoiceResult = async (result: VoiceResult) => {
    if (result.type === 'bulk') {
      const bulkResult = result as BulkVoiceResult;
      console.log('[Voice] Bulk result received:', bulkResult);

      // Load pre-configured users from the JSON file
      let preConfiguredUsers: User[] = [];
      try {
        const usersResponse = await fetch('/data/users.json');
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          preConfiguredUsers = usersData.users || [];
        }
      } catch (error) {
        console.error('[Voice] Error loading pre-configured users:', error);
      }

      // Process each mate from voice input
      const newMates: UserEntry[] = [];
      const skippedMates: string[] = [];
      const notFoundMates: string[] = [];
      
      for (const mate of bulkResult.mates) {
        // Check if mate is already in the current users list
        const alreadyAdded = users.find(
          u => u.name.toLowerCase() === mate.name.toLowerCase()
        );
        
        if (alreadyAdded) {
          console.log(`[Voice] Mate "${mate.name}" is already added, skipping`);
          skippedMates.push(mate.name);
          continue;
        }

        // Check if mate exists in pre-configured users (by name, case-insensitive)
        const preConfiguredMate = preConfiguredUsers.find(
          u => u.name.toLowerCase() === mate.name.toLowerCase()
        );

        if (preConfiguredMate) {
          // Use the pre-configured mate
          console.log(`[Voice] Found pre-configured mate: ${preConfiguredMate.name}`);
          newMates.push({
            ...preConfiguredMate,
            isPreConfigured: true,
            userLabel: `User ${users.length + newMates.length + 1}`,
            isReadOnly: true,
          });
        } else {
          // Not found in pre-configured list
          // Check if address is just the name (meaning no location was provided)
          const hasLocation = mate.address.toLowerCase() !== mate.name.toLowerCase();
          
          if (!hasLocation) {
            // No location provided and not in pre-configured list
            console.warn(`[Voice] No location provided for: ${mate.name}`);
            notFoundMates.push(`${mate.name} (no location provided)`);
          } else {
            // Try to geocode the address
            try {
              const geocodeResponse = await fetch(`/api/geocode?q=${encodeURIComponent(mate.address)}`);
              if (geocodeResponse.ok) {
                const geocodeData = await geocodeResponse.json();
                if (geocodeData.results && geocodeData.results.length > 0) {
                  const firstResult = geocodeData.results[0];
                  
                  // Generate unique ID for manual mate
                  const mateId = `manual-voice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                  
                  newMates.push({
                    id: mateId,
                    name: mate.name,
                    address: firstResult.display_name,
                    lat: firstResult.lat,
                    lon: firstResult.lon,
                    isPreConfigured: false,
                    userLabel: `User ${users.length + newMates.length + 1}`,
                    isReadOnly: true,
                  });
                  
                  console.log(`[Voice] Successfully added mate via geocoding: ${mate.name} at ${firstResult.display_name}`);
                } else {
                  console.warn(`[Voice] No geocoding results for: ${mate.address}`);
                  notFoundMates.push(`${mate.name} (${mate.address})`);
                }
              } else {
                console.error(`[Voice] Geocoding failed for: ${mate.address}`);
                notFoundMates.push(`${mate.name} (${mate.address})`);
              }
            } catch (error) {
              console.error(`[Voice] Error processing mate ${mate.name}:`, error);
              notFoundMates.push(`${mate.name} (${mate.address})`);
            }
          }
        }
      }

      // Add all successfully processed mates
      if (newMates.length > 0) {
        setUsers(prev => [...prev, ...newMates]);
      }
      
      // Build status message
      let statusMessage = '';
      if (newMates.length > 0) {
        const matesText = newMates.length === 1 ? '1 mate' : `${newMates.length} mates`;
        statusMessage += `✓ Successfully added ${matesText}!`;
      }
      if (skippedMates.length > 0) {
        statusMessage += `\n\n⚠️ Already added: ${skippedMates.join(', ')}`;
      }
      if (notFoundMates.length > 0) {
        statusMessage += `\n\n❌ Could not find: ${notFoundMates.join(', ')}.\nPlease add them manually.`;
      }
      
      if (statusMessage) {
        alert(statusMessage);
      }

      // Handle theme if provided
      if (bulkResult.theme && themes.length > 0) {
        // Find matching theme (case-insensitive)
        const matchingTheme = themes.find(
          theme => theme.name.toLowerCase() === bulkResult.theme!.toLowerCase()
        );
        
        if (matchingTheme) {
          setSelectedThemeId(matchingTheme.id);
          console.log(`[Voice] Selected theme: ${matchingTheme.name}`);
        } else {
          console.warn(`[Voice] Could not match theme: ${bulkResult.theme}`);
        }
      }
    }
  };

  const handleVoiceError = (error: string) => {
    console.error('[Voice] Error:', error);
    // Error is already shown in the VoiceInput component
  };

  const alreadySelectedUserIds = users
    .filter(u => u.isPreConfigured)
    .map(u => u.id);

  // Filter users with complete and valid information using Zod validation
  const completeUsers = useMemo(() => {
    return users.filter(user => {
      const result = UserEntrySchema.safeParse(user);
      return result.success;
    });
  }, [users]);

  const canCalculate = completeUsers.length >= 2;

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Plan a Weekend Trip
          </h1>
          <p className="text-gray-600 mb-6">
            Add addresses for each participant to find the perfect meeting point
          </p>
          
          {/* Quick Start with Voice */}
          <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200">
            <div className="flex flex-col items-center gap-3">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  🎤 Quick Start with Voice
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Say everyone's name and location, plus trip theme!
                </p>
                <p className="text-xs text-gray-500 italic mb-3">
                  Example: "Add Sarah, Michael from Munich, and Alex. I want a food and drink trip."
                </p>
                <p className="text-xs text-gray-500 mb-3">
                  💡 Tip: If a mate is already in the system, just say their name. Otherwise, include their location.
                </p>
              </div>
              
              <VoiceInput
                context="bulk"
                availableThemes={themes.map(t => t.name)}
                onResult={handleVoiceResult}
                onError={handleVoiceError}
                buttonText="🎙️ Start Voice Input"
                buttonClassName="px-8 py-4 rounded-xl font-semibold text-lg shadow-lg"
              />
              
              <p className="text-xs text-gray-500 mt-2">
                Works best in Chrome or Edge • Microphone permission required
              </p>
            </div>
          </div>
        </div>

        {/* Single Column: Address Inputs */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Add your Mates
              </h2>

              <div className="space-y-4">
                {/* Render address inputs for each user */}
                {users.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p className="mb-4">No mates added yet</p>
                    <p className="text-sm">
                      Choose from existing mates or add a mate manually to get started
                    </p>
                  </div>
                ) : (
                  users.map((user, index) => (
                    <MateCard
                      key={user.id}
                      userNumber={index + 1}
                      userName={user.name}
                      userAddress={user.address}
                      onRemove={() => handleRemoveUser(user.id)}
                    />
                  ))
                )}

                {/* Add user buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex-1 py-2 px-4 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
                  >
                    Choose from Existing Mates
                  </button>
                  <button
                    onClick={() => setIsManualMateModalOpen(true)}
                    className="flex-1 py-2 px-4 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
                  >
                    + Add Mate Manually
                  </button>
                </div>
              </div>

              {/* Theme Selection Dropdown */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Trip Theme
                </label>
                <select
                  value={selectedThemeId || ''}
                  onChange={(e) => setSelectedThemeId(e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={themes.length === 0}
                >
                  {themes.length === 0 ? (
                    <option value="">Loading themes...</option>
                  ) : (
                    <>
                      <option value="">Select a theme...</option>
                      {themes.map((theme) => (
                        <option key={theme.id} value={theme.id}>
                          {theme.icon} {theme.name}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>

              {/* Create Trip Button */}
              <div className="mt-6">
                {canCalculate && selectedThemeId ? (
                  <button
                    onClick={handleCreateTrip}
                    disabled={isCreatingTrip}
                    className="w-full py-3 px-4 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isCreatingTrip ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Creating Trip...
                      </span>
                    ) : (
                      'Plan your Trip'
                    )}
                  </button>
                ) : (
                  <div className="p-4 bg-yellow-50 rounded-md border border-yellow-200">
                    <div className="text-sm text-yellow-800">
                      {!selectedThemeId
                        ? 'Please select a trip theme'
                        : users.length === 0
                        ? 'Add at least two mates'
                        : completeUsers.length === 0
                        ? 'Please complete the information for your mates (name and address)'
                        : `Add ${2 - completeUsers.length} more mate(s) with complete information`}
                    </div>
                  </div>
                )}
              </div>
          </div>
        </div>
      </div>

      {/* User Selection Modal */}
      <UserSelectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectUsers={handleSelectPreConfiguredUsers}
        alreadySelectedUserIds={alreadySelectedUserIds}
      />

      {/* Add Manual Mate Modal */}
      <AddManualMateModal
        isOpen={isManualMateModalOpen}
        onClose={() => setIsManualMateModalOpen(false)}
        onAddMate={handleAddManualMate}
      />
    </main>
  );
}
