'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, ChevronRight, ExternalLink } from 'lucide-react';
import type { Restaurant } from './MapDisplay';
import type { CategoryRecommendation } from '@/types/trip';
import { haversineDistanceKm } from '@/lib/midpoint';
import type { PlaceType } from '@/lib/theme-place-types';

interface RecommendationProps {
  recommendations?: Record<string, CategoryRecommendation>;
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

function PlaceDetails({
  place,
  midpoint,
  reasoning,
}: {
  place: Restaurant;
  midpoint: { lat: number; lon: number };
  reasoning?: string;
}) {
  const distanceKm = haversineDistanceKm(midpoint, { lat: place.lat, lon: place.lon });
  const stars = ratingToStars(place.rating);

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-lg font-bold text-black font-mono">{place.name}</h3>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-start gap-2">
          <span>📍</span>
          <div className="font-mono">
            <span className="font-bold text-black">Distance:</span>{' '}
            <span className="text-black/70">{distanceKm.toFixed(1)} km from midpoint</span>
          </div>
        </div>

        {stars && (
          <div className="flex items-start gap-2">
            <span>⭐</span>
            <div className="font-mono">
              <span className="font-bold text-black">Rating:</span>{' '}
              <span className="text-amber-500">{stars}</span>
              {typeof place.rating === 'number' ||
              (typeof place.rating === 'string' && !Number.isNaN(parseFloat(place.rating))) ? (
                <span className="ml-1 text-black/70">({place.rating})</span>
              ) : null}
            </div>
          </div>
        )}

        {place.priceRange && place.priceRange.toLowerCase() !== 'unknown' && (
          <div className="flex items-start gap-2">
            <span>💰</span>
            <div className="font-mono">
              <span className="font-bold text-black">Price Range:</span>{' '}
              <span className="text-black/70">{place.priceRange}</span>
            </div>
          </div>
        )}

        {place.cuisine && place.cuisine.toLowerCase() !== 'unknown' && (
          <div className="flex items-start gap-2">
            <span>🍽️</span>
            <div className="font-mono">
              <span className="font-bold text-black">Cuisine:</span>{' '}
              <span className="text-black/70">{place.cuisine}</span>
            </div>
          </div>
        )}

        {(() => {
          const hasVegan = place.veganOptions && place.veganOptions.toLowerCase() !== 'unknown';
          const hasVegetarian = place.vegetarianOptions && place.vegetarianOptions.toLowerCase() !== 'unknown';
          if (!hasVegan && !hasVegetarian) return null;
          
          const options: string[] = [];
          if (hasVegan) options.push(`Vegan: ${place.veganOptions}`);
          if (hasVegetarian) options.push(`Vegetarian: ${place.vegetarianOptions}`);
          
          return (
            <div className="flex items-start gap-2">
              <span>🌱</span>
              <div className="font-mono">
                <span className="font-bold text-black">Dietary Options:</span>{' '}
                <span className="text-black/70">{options.join(', ')}</span>
              </div>
            </div>
          );
        })()}

        {place.openingHours && place.openingHours.toLowerCase() !== 'unknown' && (
          <div className="flex items-start gap-2">
            <span>🕐</span>
            <div className="font-mono">
              <span className="font-bold text-black">Opening Hours:</span>{' '}
              <span className="text-black/70">{place.openingHours}</span>
            </div>
          </div>
        )}
      </div>

      {reasoning && (
        <div className="mt-4 p-3 bg-[#E0B0FF]/30 rounded-lg border-[2px] border-[#E0B0FF]">
          <p className="text-sm text-black font-mono">{reasoning}</p>
        </div>
      )}

      <div className="mt-4 pt-3 border-t-[2px] border-black/10">
        <a
          href={`https://www.google.com/maps?q=${place.lat},${place.lon}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-[#ff1493] hover:text-[#ff1493]/80 hover:underline inline-flex items-center gap-1 font-mono font-medium"
        >
          <ExternalLink className="w-3 h-3" />
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
  onRegenerate,
}: RecommendationProps) {
  const [activeTab, setActiveTab] = useState<PlaceType>('restaurant');
  const [isOtherOptionsExpanded, setIsOtherOptionsExpanded] = useState(false);

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

  // Determine which tabs to show
  const availableCategories: PlaceType[] = [];
  for (const type of selectedPlaceTypes) {
    const hasRecommendation = recommendations?.[type]?.current !== null;
    const isSelected = selectedPlaceTypes.includes(type);
    if (hasRecommendation || isSelected) {
      availableCategories.push(type);
    }
  }

  // Set initial active tab to first available category (use useEffect to avoid state updates during render)
  useEffect(() => {
    const available: PlaceType[] = [];
    for (const type of selectedPlaceTypes) {
      const hasRecommendation = recommendations?.[type]?.current !== null;
      const isSelected = selectedPlaceTypes.includes(type);
      if (hasRecommendation || isSelected) {
        available.push(type);
      }
    }
    if (available.length > 0 && !available.includes(activeTab)) {
      setActiveTab(available[0]);
    }
  }, [selectedPlaceTypes, recommendations, activeTab]);

  const currentRecommendation = recommendations?.[activeTab]?.current;
  const showLoading = isLoading || placesLoading;

  if (!midpoint) {
    return null;
  }

  const tabColors = [
    "bg-[#ff69b4]/30 border-[#ff69b4]",
    "bg-[#7DF9FF]/30 border-[#7DF9FF]",
    "bg-[#E0B0FF]/30 border-[#E0B0FF]",
    "bg-[#c8ff00]/30 border-[#c8ff00]",
    "bg-[#ffe135]/30 border-[#ffe135]",
  ];

  return (
    <div className="bg-white rounded-2xl border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-black font-sans">Recommendation</h2>
        {onRegenerate && currentRecommendation && (
          <button
            onClick={() => onRegenerate(activeTab)}
            className="p-2 text-black hover:bg-[#ff1493]/20 rounded-lg transition-colors border-2 border-transparent hover:border-black"
            title="Regenerate recommendation"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Tabs */}
      {availableCategories.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {availableCategories.map((category, index) => (
            <button
              key={category}
              onClick={() => setActiveTab(category)}
              className={`px-4 py-2 text-sm font-bold font-mono rounded-full border-[3px] transition-all ${
                activeTab === category
                  ? `${tabColors[index % tabColors.length]} border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`
                  : 'bg-white text-black/50 border-black/20 hover:border-black/40'
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
          <style
            dangerouslySetInnerHTML={{
              __html: `
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
          `,
            }}
          />
          <div className="flex items-center justify-center gap-2">
            <span className="text-4xl inline-block jump-emoji-1">{themeIcon}</span>
            <span className="text-4xl inline-block jump-emoji-2">{themeIcon}</span>
            <span className="text-4xl inline-block jump-emoji-3">{themeIcon}</span>
          </div>
          <p className="text-sm text-black/70 mt-2 font-mono">Enriching with AI...</p>
        </div>
      ) : !showLoading && currentRecommendation ? (
        <div>
          {currentRecommendation.place ? (
            <PlaceDetails
              place={currentRecommendation.place}
              midpoint={midpoint}
              reasoning={currentRecommendation.reasoning}
            />
          ) : <div className="text-center py-8">
          <div className="bg-[#ffe135]/30 border-[2px] border-[#ffe135] rounded-lg p-6">
            <p className="text-black/70 font-mono text-sm mb-2">
              No recommendation available for {categoryLabels[activeTab]?.toLowerCase() || activeTab}{' '}
              at this time.
            </p>
            <p className="text-xs text-black/50 font-mono mb-4">
              Please try adjusting your search criteria or radius.
            </p>
            {onRegenerate && (
              <button
                onClick={() => onRegenerate(activeTab)}
                className="px-4 py-2 bg-[#ff1493] text-white rounded-lg font-mono font-bold border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                Regenerate Recommendation
              </button>
            )}
          </div>
          </div>
          }

          {/* Other Options Overview */}
          {currentRecommendation.place && (() => {
            const otherPlaces = places
              .filter((p) => p.type === activeTab && p.id !== currentRecommendation.place?.id)
              .slice(0, 4);

            if (otherPlaces.length > 0) {
              return (
                <div className="mt-6 pt-6 border-t-[3px] border-black/10">
                  <button
                    onClick={() => setIsOtherOptionsExpanded(!isOtherOptionsExpanded)}
                    className="w-full flex items-center justify-between mb-3 hover:opacity-80 transition-opacity"
                  >
                    <h4 className="text-sm font-bold text-black font-mono">Other Options</h4>
                    <ChevronRight
                      className={`w-4 h-4 text-black transition-transform duration-200 ${
                        isOtherOptionsExpanded ? 'rotate-90' : ''
                      }`}
                    />
                  </button>
                  {isOtherOptionsExpanded && (
                    <div className="space-y-2">
                      {otherPlaces.map((place) => {
                        const distanceKm = haversineDistanceKm(midpoint, {
                          lat: place.lat,
                          lon: place.lon,
                        });
                        const stars = ratingToStars(place.rating);
                        return (
                          <div
                            key={place.id}
                            className="p-3 bg-[#f5f5f5] rounded-lg border-[2px] border-black/20"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h5 className="text-sm font-bold text-black font-mono">
                                  {place.name}
                                </h5>
                                <div className="mt-1 space-y-0.5 text-xs text-black/70 font-mono">
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px]">📍</span>
                                    <span>{distanceKm.toFixed(1)} km</span>
                                  </div>
                                  {stars && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-[10px]">⭐</span>
                                      <span className="text-amber-500">{stars}</span>
                                    </div>
                                  )}
                                  {place.priceRange && place.priceRange.toLowerCase() !== 'unknown' && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-[10px]">💰</span>
                                      <span>{place.priceRange}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <a
                                href={`https://www.google.com/maps?q=${place.lat},${place.lon}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-2 text-[11px] text-[#ff1493] hover:text-[#ff1493]/80 hover:underline font-mono font-medium"
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
        <div className="text-center py-8">
          <div className="bg-[#ffe135]/30 border-[2px] border-[#ffe135] rounded-lg p-6">
            <p className="text-black/70 font-mono text-sm mb-2">
              No recommendation available for {categoryLabels[activeTab]?.toLowerCase() || activeTab}{' '}
              at this time.
            </p>
            <p className="text-xs text-black/50 font-mono mb-4">
              Please try adjusting your search criteria or radius.
            </p>
            {onRegenerate && (
              <button
                onClick={() => onRegenerate(activeTab)}
                className="px-4 py-2 bg-[#ff1493] text-white rounded-lg font-mono font-bold border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
              >
                Regenerate Recommendation
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
