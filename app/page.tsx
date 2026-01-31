'use client';

import { useState, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import AddressInput, { AddressSuggestion } from '@/components/AddressInput';
import { calculateMidpoint, getDefaultRadiusKm, Coordinate } from '@/lib/midpoint';
import type { MapPoint } from '@/components/MapDisplay';

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

export default function Home() {
  const [addresses, setAddresses] = useState<
    Array<{ userLabel: string; address: AddressSuggestion }>
  >([]);
  const [userCount, setUserCount] = useState(2); // Start with 2 users
  const [showMap, setShowMap] = useState(false);
  const [radiusKm, setRadiusKm] = useState(50); // default; updated from trip scale when map is shown

  // Create a stable key for addresses to use in useMemo
  const addressesKey = useMemo(() => {
    return addresses.map(a => `${a.userLabel}:${a.address.lat.toFixed(6)},${a.address.lon.toFixed(6)}`).join('|');
  }, [addresses]);

  // Calculate midpoint only when showMap is true - memoize to prevent object recreation
  const midpoint = useMemo(() => {
    if (!showMap || addresses.length < 2) {
      return null;
    }
    const coordinates: Coordinate[] = addresses.map((addr) => ({
      lat: addr.address.lat,
      lon: addr.address.lon,
    }));
    const result = calculateMidpoint(coordinates);
    // Return null if calculation failed, otherwise return the result
    return result;
  }, [addressesKey, showMap, addresses.length]);

  // Convert addresses to map points - use stable addressesKey
  const mapPoints: MapPoint[] = useMemo(() => {
    return addresses.map((addr) => ({
      lat: addr.address.lat,
      lon: addr.address.lon,
      label: addr.userLabel,
    }));
  }, [addressesKey]);

  // Set default radius from trip scale (Germany: small 1 km, mid 15 km, large 50 km) when midpoint/addresses change
  const coordinatesForRadius = useMemo(
    () => addresses.map((a) => ({ lat: a.address.lat, lon: a.address.lon })),
    [addressesKey]
  );
  useEffect(() => {
    if (midpoint && coordinatesForRadius.length >= 2) {
      setRadiusKm(getDefaultRadiusKm(midpoint, coordinatesForRadius));
    }
  }, [midpoint?.lat, midpoint?.lon, coordinatesForRadius.length, addressesKey]);

  const handleAddressSelect = (userLabel: string, address: AddressSuggestion) => {
    setAddresses((prev) => {
      const existingIndex = prev.findIndex((a) => a.userLabel === userLabel);
      if (existingIndex >= 0) {
        // Update existing address
        const updated = [...prev];
        updated[existingIndex] = { userLabel, address };
        return updated;
      } else {
        // Add new address
        return [...prev, { userLabel, address }];
      }
    });
  };

  const handleRemoveAddress = (userLabel: string) => {
    setAddresses((prev) => prev.filter((a) => a.userLabel !== userLabel));
  };

  const handleAddUser = () => {
    setUserCount((prev) => Math.min(prev + 1, 10));
  };

  const handleCalculateMidpoint = () => {
    if (addresses.length >= 2) {
      setShowMap(true);
    }
  };

  const maxUsers = 10;
  const nextUserLabel = `User ${userCount + 1}`;
  const canCalculate = addresses.length >= 2;

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
                Add Start Locations
              </h2>

              <div className="space-y-4">
                {/* Render address inputs for each user */}
                {Array.from({ length: userCount }, (_, i) => {
                  const userLabel = `User ${i + 1}`;
                  return (
                    <AddressInput
                      key={userLabel}
                      userLabel={userLabel}
                      onAddressSelect={(address) =>
                        handleAddressSelect(userLabel, address)
                      }
                      onRemove={() => handleRemoveAddress(userLabel)}
                    />
                  );
                })}

                {/* Add new user button */}
                {userCount < maxUsers && (
                  <button
                    onClick={handleAddUser}
                    className="w-full py-2 px-4 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
                  >
                    + Add {nextUserLabel}
                  </button>
                )}
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
                        Calculate Midpoint
                      </button>
                    ) : (
                      <div className="p-4 bg-yellow-50 rounded-md border border-yellow-200">
                        <div className="text-sm text-yellow-800">
                          Add at least 2 addresses to calculate the midpoint
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

          {/* Right Column: Map */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Map View
            </h2>
            {showMap && addresses.length > 0 ? (
              <MapDisplay startpoints={mapPoints} midpoint={midpoint} radiusKm={radiusKm} />
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
                    {addresses.length === 0
                      ? 'Add addresses and click "Calculate Midpoint" to see the map'
                      : 'Click "Calculate Midpoint" to see the map'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
