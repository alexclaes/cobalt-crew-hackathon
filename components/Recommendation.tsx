'use client';

import { useState } from 'react';
import type { Restaurant } from './MapDisplay';
import type { CategoryRecommendation } from '@/types/trip';
import { haversineDistanceKm } from '@/lib/midpoint';
import type { PlaceType } from '@/lib/theme-place-types';

interface RecommendationProps {
  recommendations?: Record<string, CategoryRecommendation>; // Flexible for any PlaceType
  places?: Restaurant[];
  midpoint: { lat: number; lon: number } | null;
  isLoading?: boolean;
  placesLoading?: boolean;
  hasNoRecommendation?: boolean;
  themeIcon?: string;
  selectedPlaceTypes?: PlaceType[];
  onRegenerate?: (category: PlaceType) => void;
}

function ratingToStars(rating: string | number | undefined): string | null {
  if (rating !== undefined && typeof rating !== 'string' && typeof rating !== 'number') return null;
  const num = typeof rating === 'string' ? parseFloat(rating) : rating;
  if (num == null || Number.isNaN(num) || num < 0 || num > 5) return null;
  const full = Math.round(num);
  const empty = 5 - full;
  return '★'.repeat(full) + '☆'.repeat(empty);
}

function PlaceDetails({ place, midpoint, reasoning }: { place: Restaurant; midpoint: { lat: number; lon: number }; reasoning?: string }) {
  const distanceKm = haversineDistanceKm(midpoint, { lat: place.lat, lon: place.lon });
  const stars = ratingToStars(place.rating);

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-lg font-bold text-gray-900">{place.name}</h3>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-start gap-2">
          <span className="text-gray-600">📍</span>
          <div>
            <span className="font-medium text-gray-700">Distance:</span>{' '}
            <span className="text-gray-600">{distanceKm.toFixed(1)} km from midpoint</span>
          </div>
        </div>

        {stars && (
          <div className="flex items-start gap-2">
            <span className="text-gray-600">⭐</span>
            <div>
              <span className="font-medium text-gray-700">Rating:</span>{' '}
              <span className="text-amber-500">{stars}</span>
              {typeof place.rating === 'number' || 
               (typeof place.rating === 'string' && !Number.isNaN(parseFloat(place.rating))) ? (
                <span className="ml-1 text-gray-600">({place.rating})</span>
              ) : null}
            </div>
          </div>
        )}

        {place.priceRange && (
          <div className="flex items-start gap-2">
            <span className="text-gray-600">💰</span>
            <div>
              <span className="font-medium text-gray-700">Price Range:</span>{' '}
              <span className="text-gray-600">{place.priceRange}</span>
            </div>
          </div>
        )}

        {place.cuisine && (
          <div className="flex items-start gap-2">
            <span className="text-gray-600">🍽️</span>
            <div>
              <span className="font-medium text-gray-700">Cuisine:</span>{' '}
              <span className="text-gray-600">{place.cuisine}</span>
            </div>
          </div>
        )}

        {(place.veganOptions || place.vegetarianOptions) && (
          <div className="flex items-start gap-2">
            <span className="text-gray-600">🌱</span>
            <div>
              <span className="font-medium text-gray-700">Dietary Options:</span>{' '}
              <span className="text-gray-600">
                Vegan: {place.veganOptions || 'unknown'}, 
                Vegetarian: {place.vegetarianOptions || 'unknown'}
              </span>
            </div>
          </div>
        )}

        {place.openingHours && (
          <div className="flex items-start gap-2">
            <span className="text-gray-600">🕐</span>
            <div>
              <span className="font-medium text-gray-700">Opening Hours:</span>{' '}
              <span className="text-gray-600">{place.openingHours}</span>
            </div>
          </div>
        )}
      </div>

      {reasoning && (
        <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-200">
          <p className="text-sm text-blue-900">{reasoning}</p>
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-gray-200">
        <a
          href={`https://www.google.com/maps?q=${place.lat},${place.lon}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1"
        >
          View on Google Maps
        </a>
      </div>
    </div>
  );
}

export default function Recommendation({ 
  recommendations, 
  places = [],
  midpoint, 
  isLoading = false,
  placesLoading = false,
  hasNoRecommendation = false, 
  themeIcon = '🦫',
  selectedPlaceTypes = ['restaurant', 'bar', 'hotel'],
  onRegenerate
}: RecommendationProps) {
  const [activeTab, setActiveTab] = useState<PlaceType>('restaurant');
  const [isOtherOptionsExpanded, setIsOtherOptionsExpanded] = useState(false);

  // Determine which tabs to show (categories with recommendations or currently selected)
  const availableCategories: PlaceType[] = [];
  const categoryLabels: Partial<Record<PlaceType, string>> = {
    restaurant: 'Restaurants',
    bar: 'Bars',
    hotel: 'Hotels',
    camping: 'Camping',
    hostel: 'Hostels',
    shop: 'Shops',
    museum: 'Museums',
    theatre: 'Theatres',
    spa: 'Spas',
    'natural formations': 'Natural Formations',
    'brewery map': 'Breweries',
    historic: 'Historic Sites',
    elevation: 'Elevation Points',
    'dog map': 'Dog Parks',
  };

  for (const type of selectedPlaceTypes) {
    const hasRecommendation = recommendations?.[type]?.current !== null;
    const isSelected = selectedPlaceTypes.includes(type);
    if (hasRecommendation || isSelected) {
      availableCategories.push(type);
    }
  }

  // Set initial active tab to first available category
  if (availableCategories.length > 0 && !availableCategories.includes(activeTab)) {
    setActiveTab(availableCategories[0]);
  }

  const currentRecommendation = recommendations?.[activeTab]?.current;
  const previousRecommendation = recommendations?.[activeTab]?.previous;
  // Show loading only if actively loading (enrichment or places), not if we just don't have a recommendation
  const showLoading = isLoading || placesLoading;

  if (!midpoint) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Recommendation</h2>
        {onRegenerate && currentRecommendation && (
          <button
            onClick={() => onRegenerate(activeTab)}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            title="Regenerate recommendation"
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
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Tabs */}
      {availableCategories.length > 1 && (
        <div className="flex border-b border-gray-200 mb-4">
          {availableCategories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveTab(category)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === category
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {categoryLabels[category]}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {showLoading ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8">
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes jump {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-20px); }
            }
            .jump-emoji-1 {
              animation: jump 0.6s ease-in-out infinite;
              animation-delay: 0s;
            }
            .jump-emoji-2 {
              animation: jump 0.6s ease-in-out infinite;
              animation-delay: 0.2s;
            }
            .jump-emoji-3 {
              animation: jump 0.6s ease-in-out infinite;
              animation-delay: 0.4s;
            }
          `}} />
          <div className="flex items-center justify-center gap-2">
            <span className="text-4xl inline-block jump-emoji-1">{themeIcon}</span>
            <span className="text-4xl inline-block jump-emoji-2">{themeIcon}</span>
            <span className="text-4xl inline-block jump-emoji-3">{themeIcon}</span>
          </div>
          <p className="text-sm text-gray-600 mt-2">Enriching with AI...</p>
        </div>
      ) : !showLoading && currentRecommendation ? (
        <div>
          <PlaceDetails
            place={currentRecommendation.place}
            midpoint={midpoint}
            reasoning={currentRecommendation.reasoning}
          />
          
          {/* Other Options Overview */}
          {(() => {
            // Get other places of the same type, excluding the recommended one
            const otherPlaces = places
              .filter(p => p.type === activeTab && p.id !== currentRecommendation.place.id)
              .slice(0, 4); // Get top 4
            
            if (otherPlaces.length > 0) {
              return (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => setIsOtherOptionsExpanded(!isOtherOptionsExpanded)}
                    className="w-full flex items-center justify-between mb-3 hover:opacity-80 transition-opacity"
                  >
                    <h4 className="text-sm font-semibold text-gray-700">Other Options</h4>
                    <svg
                      className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${isOtherOptionsExpanded ? 'rotate-90' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                  {isOtherOptionsExpanded && (
                  <div className="space-y-2">
                    {otherPlaces.map((place) => {
                      const distanceKm = haversineDistanceKm(midpoint, { lat: place.lat, lon: place.lon });
                      const stars = ratingToStars(place.rating);
                      return (
                        <div key={place.id} className="p-2 bg-gray-50 rounded-md border border-gray-200">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h5 className="text-xs font-medium text-gray-900">{place.name}</h5>
                              <div className="mt-0.5 space-y-0.5 text-xs text-gray-600">
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px]">📍</span>
                                  <span className="text-[10px]">{distanceKm.toFixed(1)} km</span>
                                </div>
                                {stars && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px]">⭐</span>
                                    <span className="text-[10px] text-amber-500">{stars}</span>
                                  </div>
                                )}
                                {place.priceRange && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px]">💰</span>
                                    <span className="text-[10px]">{place.priceRange}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <a
                              href={`https://www.google.com/maps?q=${place.lat},${place.lon}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-2 text-[10px] text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              View
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  )}
                </div>
              );
            }
            return null;
          })()}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>No recommendation available for {categoryLabels[activeTab]?.toLowerCase() || activeTab} at this time.</p>
          <p className="text-sm mt-2">Please try adjusting your search criteria or radius.</p>
          {onRegenerate && (
            <button
              onClick={() => onRegenerate(activeTab)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Regenerate Recommendation
            </button>
          )}
        </div>
      )}
    </div>
  );
}
