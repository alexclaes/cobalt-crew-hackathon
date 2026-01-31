'use client';

import type { Restaurant } from './MapDisplay';
import { haversineDistanceKm } from '@/lib/midpoint';

interface RecommendationProps {
  recommendedPlace: Restaurant | null;
  midpoint: { lat: number; lon: number } | null;
  reasoning?: string;
  isLoading?: boolean;
  hasNoRecommendation?: boolean;
  themeIcon?: string;
  onRegenerate?: () => void;
}

function ratingToStars(rating: string | number | undefined): string | null {
  if (rating !== undefined && typeof rating !== 'string' && typeof rating !== 'number') return null;
  const num = typeof rating === 'string' ? parseFloat(rating) : rating;
  if (num == null || Number.isNaN(num) || num < 0 || num > 5) return null;
  const full = Math.round(num);
  const empty = 5 - full;
  return '★'.repeat(full) + '☆'.repeat(empty);
}

export default function Recommendation({ recommendedPlace, midpoint, reasoning, isLoading = false, hasNoRecommendation = false, themeIcon = '🦫', onRegenerate }: RecommendationProps) {
  // Show loading spinner if loading OR if no recommendation yet and not explicitly told there's no recommendation
  const showLoading = isLoading || (!recommendedPlace && !hasNoRecommendation);
  
  if (!recommendedPlace || !midpoint) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Recommendation</h2>
        {showLoading ? (
          <div className="flex items-center justify-center gap-2 py-8">
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
            <span className="text-4xl inline-block jump-emoji-1">{themeIcon}</span>
            <span className="text-4xl inline-block jump-emoji-2">{themeIcon}</span>
            <span className="text-4xl inline-block jump-emoji-3">{themeIcon}</span>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No recommendation available at this time.</p>
            <p className="text-sm mt-2">Please try adjusting your search criteria or radius.</p>
            {onRegenerate && (
              <button
                onClick={onRegenerate}
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

  const distanceKm = haversineDistanceKm(midpoint, { lat: recommendedPlace.lat, lon: recommendedPlace.lon });
  const stars = ratingToStars(recommendedPlace.rating);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Recommendation</h2>
      
      <div className="space-y-3">
        <div>
          <p className="text-sm text-gray-600 mb-2">Based on the enriched location data, we recommend:</p>
          <h3 className="text-lg font-bold text-gray-900">{recommendedPlace.name}</h3>
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
                {typeof recommendedPlace.rating === 'number' || 
                 (typeof recommendedPlace.rating === 'string' && !Number.isNaN(parseFloat(recommendedPlace.rating))) ? (
                  <span className="ml-1 text-gray-600">({recommendedPlace.rating})</span>
                ) : null}
              </div>
            </div>
          )}

          {recommendedPlace.priceRange && (
            <div className="flex items-start gap-2">
              <span className="text-gray-600">💰</span>
              <div>
                <span className="font-medium text-gray-700">Price Range:</span>{' '}
                <span className="text-gray-600">{recommendedPlace.priceRange}</span>
              </div>
            </div>
          )}

          {recommendedPlace.cuisine && (
            <div className="flex items-start gap-2">
              <span className="text-gray-600">🍽️</span>
              <div>
                <span className="font-medium text-gray-700">Cuisine:</span>{' '}
                <span className="text-gray-600">{recommendedPlace.cuisine}</span>
              </div>
            </div>
          )}

          {(recommendedPlace.veganOptions || recommendedPlace.vegetarianOptions) && (
            <div className="flex items-start gap-2">
              <span className="text-gray-600">🌱</span>
              <div>
                <span className="font-medium text-gray-700">Dietary Options:</span>{' '}
                <span className="text-gray-600">
                  Vegan: {recommendedPlace.veganOptions || 'unknown'}, 
                  Vegetarian: {recommendedPlace.vegetarianOptions || 'unknown'}
                </span>
              </div>
            </div>
          )}

          {recommendedPlace.openingHours && (
            <div className="flex items-start gap-2">
              <span className="text-gray-600">🕐</span>
              <div>
                <span className="font-medium text-gray-700">Opening Hours:</span>{' '}
                <span className="text-gray-600">{recommendedPlace.openingHours}</span>
              </div>
            </div>
          )}
        </div>

        {reasoning && (
          <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-200">
            <p className="text-sm text-blue-900">{reasoning}</p>
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-between">
          <a
            href={`https://www.google.com/maps?q=${recommendedPlace.lat},${recommendedPlace.lon}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1"
          >
            View on Google Maps
          </a>
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              className="text-sm px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
              Regenerate
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
