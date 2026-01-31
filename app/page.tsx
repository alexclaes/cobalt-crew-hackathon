'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import AddressInput, { AddressSuggestion } from '@/components/AddressInput';
import UserSelectionModal from '@/components/UserSelectionModal';
import { calculateMidpoint, getDefaultRadiusKm, haversineDistanceKm, Coordinate } from '@/lib/midpoint';
import type { MapPoint, Restaurant, PlaceType } from '@/components/MapDisplay';
import { User } from '@/types/user';

// Dynamically import MapDisplay with SSR disabled to prevent "window is not defined" error
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

type UserEntry = User & {
  isPreConfigured: boolean;
  userLabel: string; // e.g., "User 1", "User 2"
};

export default function Home() {
  // #region agent log
  useEffect(() => {
    const el = typeof document !== 'undefined' ? document.querySelector('nextjs-portal') : null;
    const rect = el ? (el as HTMLElement).getBoundingClientRect() : null;
    fetch('http://127.0.0.1:7242/ingest/daa3ccaf-7d89-4e08-bbc6-692373e87c13', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'page.tsx:Home', message: 'Home mounted', data: { hasWindow: typeof window !== 'undefined', hasPortal: !!el, portalWidth: rect?.width, portalHeight: rect?.height }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'H1' }) }).catch(() => {});
  }, []);
  // #endregion
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [manualUserCount, setManualUserCount] = useState(0);
  const [showMap, setShowMap] = useState(false);
  const [radiusKm, setRadiusKm] = useState(50); // default; updated from trip scale when map is shown
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [places, setPlaces] = useState<Restaurant[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [enrichmentLoading, setEnrichmentLoading] = useState(false);
  const [enrichmentError, setEnrichmentError] = useState<string | null>(null);
  const [placeTypes, setPlaceTypes] = useState<PlaceType[]>(['restaurant']);
  const lastEnrichedKeyRef = useRef<string | null>(null);

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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/daa3ccaf-7d89-4e08-bbc6-692373e87c13', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'page.tsx:enrichEffect', message: 'enrich starting', data: { placesCount: places.length }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'H3' }) }).catch(() => {});
    // #endregion
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
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/daa3ccaf-7d89-4e08-bbc6-692373e87c13', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'page.tsx:enrichSuccess', message: 'enrich success', data: { isArray: Array.isArray(enriched), len: enriched?.length }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'H3' }) }).catch(() => {});
        // #endregion
        if (!cancelled && Array.isArray(enriched)) setPlaces(enriched);
      })
      .catch((err) => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/daa3ccaf-7d89-4e08-bbc6-692373e87c13', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'page.tsx:enrichCatch', message: 'enrich error', data: { errMsg: err?.message }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'H3' }) }).catch(() => {});
        // #endregion
        if (!cancelled) setEnrichmentError(err instanceof Error ? err.message : 'Could not load details');
      })
      .finally(() => {
        if (!cancelled) setEnrichmentLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [midpoint?.lat, midpoint?.lon, radiusKm, places, placesLoading]);

  const handleAddressSelect = (userId: string, address: AddressSuggestion) => {
    setUsers((prev) => {
      return prev.map((user) => {
        if (user.id === userId) {
          return {
            ...user,
            address: address.display_name,
            lat: address.lat,
            lon: address.lon,
          };
        }
        return user;
      });
    });
  };

  const handleRemoveUser = (userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    // If it's a manual user, decrement the counter
    const user = users.find(u => u.id === userId);
    if (user && !user.isPreConfigured) {
      setManualUserCount((prev) => Math.max(0, prev - 1));
    }
  };

  const handleNameChange = (userId: string, name: string) => {
    setUsers((prev) => {
      return prev.map((user) => {
        if (user.id === userId) {
          return { ...user, name };
        }
        return user;
      });
    });
  };

  const handleAddManualUser = () => {
    const newCount = manualUserCount + 1;
    const newUser: UserEntry = {
      id: `manual-${Date.now()}`,
      name: '',
      address: '',
      lat: 0,
      lon: 0,
      isPreConfigured: false,
      userLabel: `User ${users.length + 1}`,
    };
    setUsers((prev) => [...prev, newUser]);
    setManualUserCount(newCount);
  };

  const handleSelectPreConfiguredUsers = (selectedUsers: User[]) => {
    const newUserEntries: UserEntry[] = selectedUsers.map((user, index) => ({
      ...user,
      isPreConfigured: true,
      userLabel: `User ${users.length + index + 1}`,
    }));
    setUsers((prev) => [...prev, ...newUserEntries]);
  };

  const handleCalculateMidpoint = () => {
    if (users.length >= 2) {
      setShowMap(true);
    }
  };

  const alreadySelectedUserIds = users
    .filter(u => u.isPreConfigured)
    .map(u => u.id);

  const canCalculate = users.length >= 2;

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Plan a Weekend Trip
          </h1>
          <p className="text-gray-600">
            Add addresses for each participant to find the perfect meeting point
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Address Inputs */}
          <div className="space-y-6">
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
                    <AddressInput
                      key={user.id}
                      userLabel={user.userLabel}
                      userNumber={index + 1}
                      userName={user.name}
                      userAddress={user.address}
                      onAddressSelect={(address) =>
                        handleAddressSelect(user.id, address)
                      }
                      onNameChange={(name) => handleNameChange(user.id, name)}
                      onRemove={() => handleRemoveUser(user.id)}
                      isReadOnly={user.isPreConfigured}
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
                    onClick={handleAddManualUser}
                    className="flex-1 py-2 px-4 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
                  >
                    + Add Mate Manually
                  </button>
                </div>
              </div>

              {/* Calculate Midpoint Button */}
              <div className="mt-6">
                {!showMap ? (
                  <>
                    {canCalculate ? (
                      <button
                        onClick={handleCalculateMidpoint}
                        className="w-full py-3 px-4 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors shadow-md"
                      >
                        Plan your Trip
                      </button>
                    ) : (
                      <div className="p-4 bg-yellow-50 rounded-md border border-yellow-200">
                        <div className="text-sm text-yellow-800">
                          Add at least two mates
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-4 bg-blue-50 rounded-md border border-blue-200">
                    <div className="text-sm font-medium text-blue-900">
                      Midpoint Calculated
                    </div>
                    {midpoint && (
                      <div className="text-xs text-blue-700 mt-1">
                        {midpoint.lat.toFixed(6)}, {midpoint.lon.toFixed(6)}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Search radius slider – underneath places input, Germany-scale defaults (1 / 15 / 50 km) */}
              {showMap && midpoint && (
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
                          className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                        />
                        <span className="text-sm text-gray-700">Bars</span>
                        <span className="w-3 h-3 rounded-full bg-[#7c3aed]" aria-hidden />
                      </label>
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={placeTypes.includes('hotel')}
                          onChange={() => togglePlaceType('hotel')}
                          className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-sm text-gray-700">Hotels</span>
                        <span className="w-3 h-3 rounded-full bg-[#059669]" aria-hidden />
                      </label>
                    </div>
                  </fieldset>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Map */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Map View
            </h2>
            {showMap && users.length > 0 ? (
              <>
                <MapDisplay
                  startpoints={mapPoints}
                  midpoint={midpoint}
                  radiusKm={radiusKm}
                  restaurants={places}
                />
                {placesLoading && (
                  <p className="text-sm text-gray-500 mt-2">Loading places…</p>
                )}
                {enrichmentLoading && (
                  <p className="text-sm text-gray-500 mt-2">Enriching places…</p>
                )}
                {enrichmentError && (
                  <p className="text-sm text-amber-600 mt-2">{enrichmentError}</p>
                )}
                {!placesLoading && midpoint && placeTypes.length > 0 && (
                  <p className="text-sm text-gray-500 mt-2">
                    {places.length} place{places.length !== 1 ? 's' : ''} in radius
                    {placeTypes.length > 0 && (
                      <> ({places.filter((p) => p.type === 'restaurant').length} restaurants, {places.filter((p) => p.type === 'bar').length} bars, {places.filter((p) => p.type === 'hotel').length} hotels)</>
                    )}
                  </p>
                )}
              </>
            ) : (
              <div className="h-[500px] flex items-center justify-center border border-gray-300 rounded-lg bg-gray-50">
                <div className="text-center text-gray-500">
                  <svg
                    className="w-16 h-16 mx-auto mb-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                    />
                  </svg>
                  <p className="text-sm">
                    {users.length === 0
                      ? 'Add mates and click "Calculate Midpoint" to see the map'
                      : 'Click "Calculate Midpoint" to see the map'}
                  </p>
                </div>
              </div>
            )}
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
    </main>
  );
}
