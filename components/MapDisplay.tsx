'use client';

import { useEffect, useRef, useState, useMemo, memo, createRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import type { PlaceType } from '@/lib/theme-place-types';

export interface MapPoint {
  lat: number;
  lon: number;
  label: string;
}

export type { PlaceType };

/** Place from Overpass (OSM); API response + type; optionally enriched by OpenAI. */
export interface Restaurant {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type: PlaceType;
  cuisine?: string;
  priceRange?: string;
  openingHours?: string;
  rating?: string | number;
  veganOptions?: 'yes' | 'no' | 'unknown';
  vegetarianOptions?: 'yes' | 'no' | 'unknown';
}

interface MapDisplayProps {
  startpoints: MapPoint[];
  midpoint: { lat: number; lon: number } | null;
  /** Search radius in km around the midpoint (for places search). Default 50. */
  radiusKm?: number;
  /** Places within radius (from Overpass API), each with type for marker color. */
  restaurants?: Restaurant[];
  /** IDs of recommended places to highlight on the map */
  recommendedPlaceIds?: Set<string>;
}

const PLACE_TYPE_LABELS: Partial<Record<PlaceType, string>> = {
  restaurant: 'Restaurant',
  bar: 'Bar',
  hotel: 'Hotel',
  camping: 'Camping',
  hostel: 'Hostel',
  shop: 'Shop',
  museum: 'Museum',
  theatre: 'Theatre',
  spa: 'Spa',
  'natural formations': 'Natural Formation',
  'brewery map': 'Brewery',
  historic: 'Historic Site',
  elevation: 'Elevation Point',
  'dog map': 'Dog Park',
};

/** Render rating 0–5 as star string (e.g. ★★★★☆). */
function ratingToStars(rating: string | number | undefined): string | null {
  if (rating !== undefined && typeof rating !== 'string' && typeof rating !== 'number') return null;
  const num = typeof rating === 'string' ? parseFloat(rating) : rating;
  if (num == null || Number.isNaN(num) || num < 0 || num > 5) return null;
  const full = Math.round(num);
  const empty = 5 - full;
  return '★'.repeat(full) + '☆'.repeat(empty);
}

const PLACE_COLORS: Partial<Record<PlaceType, { bg: string; border: string }>> = {
  restaurant: { bg: '#ff69b4', border: '#ff1493' },       // Hot pink
  bar: { bg: '#4361ee', border: '#1e3a8a' },              // Cobalt blue
  hotel: { bg: '#7DF9FF', border: '#0ea5e9' },            // Mint
  camping: { bg: '#c8ff00', border: '#84cc16' },          // Lime
  hostel: { bg: '#E0B0FF', border: '#9333ea' },           // Lavender
  shop: { bg: '#ffe135', border: '#d97706' },             // Sunshine yellow
  museum: { bg: '#E0B0FF', border: '#9333ea' },           // Lavender
  theatre: { bg: '#ff69b4', border: '#ff1493' },          // Hot pink
  spa: { bg: '#7DF9FF', border: '#0ea5e9' },              // Mint
  'natural formations': { bg: '#c8ff00', border: '#84cc16' }, // Lime
  'brewery map': { bg: '#ffe135', border: '#d97706' },    // Sunshine yellow
  historic: { bg: '#4361ee', border: '#1e3a8a' },         // Cobalt blue
  elevation: { bg: '#E0B0FF', border: '#9333ea' },        // Lavender
  'dog map': { bg: '#ff69b4', border: '#ff1493' },        // Hot pink
};

const placeIcons: Map<string, L.DivIcon> = new Map();

function getPlaceIcon(type: PlaceType, isRecommended: boolean = false): L.DivIcon {
  const iconKey = `${type}-${isRecommended ? 'recommended' : 'normal'}`;
  if (!placeIcons.has(iconKey) && typeof window !== 'undefined') {
    const colors = PLACE_COLORS[type] || PLACE_COLORS.restaurant;
    if (!colors) {
      console.warn(`Unknown place type: ${type}, defaulting to restaurant colors`);
      const { bg, border } = PLACE_COLORS.restaurant!;
      const icon = L.divIcon({
        className: `place-marker place-marker-unknown`,
        html: `<div style="
          width: ${isRecommended ? '32px' : '20px'}; 
          height: ${isRecommended ? '32px' : '20px'};
          background: ${bg};
          border: 3px solid ${border};
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.4);
        "></div>`,
        iconSize: [isRecommended ? 32 : 20, isRecommended ? 32 : 20],
        iconAnchor: [isRecommended ? 16 : 10, isRecommended ? 16 : 10],
        popupAnchor: [0, isRecommended ? -16 : -10],
      });
      placeIcons.set(iconKey, icon);
      return icon;
    }
    const { bg, border } = colors;
    const icon = L.divIcon({
      className: `place-marker place-marker-${type} ${isRecommended ? 'recommended' : ''}`,
      html: `<div style="
        width: ${isRecommended ? '32px' : '20px'}; 
        height: ${isRecommended ? '32px' : '20px'};
        background: ${bg};
        border: 3px solid ${border};
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0,0,0,0.4);
      "></div>`,
      iconSize: [isRecommended ? 32 : 20, isRecommended ? 32 : 20],
      iconAnchor: [isRecommended ? 16 : 10, isRecommended ? 16 : 10],
      popupAnchor: [0, isRecommended ? -16 : -10],
    });
    placeIcons.set(iconKey, icon);
    return icon;
  }
  return placeIcons.get(iconKey)!;
}

// Fix for default marker icons in React-Leaflet - moved inside component to avoid SSR issues
const startpointIcons: Map<number, L.DivIcon> = new Map();
let midpointIcon: L.DivIcon | null = null;

// Color palette for start points (cycling through design colors)
const START_POINT_COLORS = [
  { bg: '#4361ee', border: '#1e3a8a' }, // Cobalt blue
  { bg: '#7DF9FF', border: '#0ea5e9' }, // Mint
  { bg: '#E0B0FF', border: '#9333ea' }, // Lavender
  { bg: '#ffe135', border: '#d97706' }, // Sunshine yellow
  { bg: '#ff69b4', border: '#ff1493' }, // Hot pink
  { bg: '#c8ff00', border: '#84cc16' }, // Lime
];

function getStartpointIcon(index: number): L.DivIcon {
  if (!startpointIcons.has(index) && typeof window !== 'undefined') {
    const color = START_POINT_COLORS[index % START_POINT_COLORS.length];
    const icon = L.divIcon({
      className: 'startpoint-marker',
      html: `<div style="
        position: relative;
        width: 38px;
        height: 46px;
      ">
        <svg width="38" height="46" viewBox="-3 -3 38 46" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 0C7.163 0 0 7.163 0 16C0 24 16 40 16 40C16 40 32 24 32 16C32 7.163 24.837 0 16 0Z" fill="${color.bg}"/>
          <path d="M16 0C7.163 0 0 7.163 0 16C0 24 16 40 16 40C16 40 32 24 32 16C32 7.163 24.837 0 16 0Z" stroke="#000" stroke-width="3"/>
          <circle cx="16" cy="14" r="6" fill="#fff" stroke="#000" stroke-width="2"/>
        </svg>
      </div>`,
      iconSize: [38, 46],
      iconAnchor: [19, 46],
      popupAnchor: [0, -46],
    });
    startpointIcons.set(index, icon);
    return icon;
  }
  return startpointIcons.get(index)!;
}

function getMidpointIcon(): L.DivIcon {
  if (!midpointIcon && typeof window !== 'undefined') {
    midpointIcon = L.divIcon({
      className: 'midpoint-marker',
      html: `<div style="
        position: relative;
        width: 46px;
        height: 56px;
      ">
        <svg width="46" height="56" viewBox="-3 -3 46 56" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 0C8.954 0 0 8.954 0 20C0 30 20 50 20 50C20 50 40 30 40 20C40 8.954 31.046 0 20 0Z" fill="#ff1493"/>
          <path d="M20 0C8.954 0 0 8.954 0 20C0 30 20 50 20 50C20 50 40 30 40 20C40 8.954 31.046 0 20 0Z" stroke="#000" stroke-width="3"/>
          <circle cx="20" cy="18" r="8" fill="#fff" stroke="#000" stroke-width="3"/>
          <circle cx="20" cy="18" r="4" fill="#ff1493"/>
        </svg>
      </div>`,
      iconSize: [46, 56],
      iconAnchor: [23, 56],
      popupAnchor: [0, -56],
    });
  }
  return midpointIcon!;
}

// Component to fit map bounds to points
function FitBounds({ points }: { points: Array<{ lat: number; lon: number }> }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lon]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, points]);
  return null;
}

// Zoom map to radius view: fit bounds to the circle around midpoint (and optional restaurant points)
function FitBoundsToRadius({
  midpoint,
  radiusKm,
  restaurantPoints,
}: {
  midpoint: { lat: number; lon: number };
  radiusKm: number;
  restaurantPoints?: Array<{ lat: number; lon: number }>;
}) {
  const map = useMap();
  useEffect(() => {
    const lat = midpoint.lat;
    const lon = midpoint.lon;
    // ~111 km per degree lat; lon degree = 111 * cos(lat rad)
    const kmPerDegLat = 111;
    const kmPerDegLon = 111 * Math.cos((lat * Math.PI) / 180);
    const pad = 1.15; // slight padding so circle isn't at edge
    const south = lat - (radiusKm / kmPerDegLat) * pad;
    const north = lat + (radiusKm / kmPerDegLat) * pad;
    const west = lon - (radiusKm / kmPerDegLon) * pad;
    const east = lon + (radiusKm / kmPerDegLon) * pad;
    const bounds = L.latLngBounds(
      [south, west],
      [north, east]
    );
    if (restaurantPoints && restaurantPoints.length > 0) {
      restaurantPoints.forEach((p) => bounds.extend([p.lat, p.lon]));
    }
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, midpoint.lat, midpoint.lon, radiusKm, restaurantPoints?.length]);
  return null;
}

const DEFAULT_RADIUS_KM = 50;

function MapDisplay({ startpoints, midpoint, radiusKm = DEFAULT_RADIUS_KM, restaurants = [], recommendedPlaceIds = new Set() }: MapDisplayProps) {
  const [isMounted, setIsMounted] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const containerKeyRef = useRef(Math.random().toString(36).substring(7));
  
  useEffect(() => {
    setIsMounted(true);
    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {
          // Map might already be removed
        }
        mapRef.current = null;
      }
    };
  }, []);

  // Default center (Europe)
  const defaultCenter: [number, number] = [50.5, 10.5];
  const defaultZoom = 6;

  // Collect all points for bounds calculation - memoize to prevent recreation
  const allPoints = useMemo(() => {
    return [
      ...startpoints.map((p) => ({ lat: p.lat, lon: p.lon })),
      ...(midpoint ? [midpoint] : []),
    ];
  }, [startpoints, midpoint]);

  const restaurantPoints = useMemo(
    () => restaurants.map((r) => ({ lat: r.lat, lon: r.lon })),
    [restaurants]
  );

  // Memoize center and zoom to prevent recalculations
  const center: [number, number] = useMemo(() => {
    if (allPoints.length > 0) {
      const avgLat = allPoints.reduce((sum, p) => sum + p.lat, 0) / allPoints.length;
      const avgLon = allPoints.reduce((sum, p) => sum + p.lon, 0) / allPoints.length;
      return [avgLat, avgLon];
    }
    return defaultCenter;
  }, [allPoints]);

  if (!isMounted) {
    return (
      <div className="w-full h-[500px] rounded-lg overflow-hidden border border-gray-300 flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading map...</div>
      </div>
    );
  }

  return (
    <div 
      key={`map-wrapper-${containerKeyRef.current}`}
      className="w-full h-[500px] rounded-lg overflow-hidden border border-gray-300"
    >
      <MapContainer
        ref={mapRef}
        key={`map-container-${containerKeyRef.current}`}
        center={center}
        zoom={defaultZoom}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
        />

        {/* Startpoint markers */}
        {startpoints.map((point, index) => (
          <Marker
            key={`startpoint-${index}`}
            position={[point.lat, point.lon]}
            icon={getStartpointIcon(index)}
          >
            <Tooltip permanent direction="top" offset={[0, -40]}>
              <div className="font-bold text-black font-mono">{point.label}</div>
            </Tooltip>
            <Popup>
              <div className="font-bold text-black font-mono">{point.label}</div>
              <div className="text-sm text-black/70 font-mono">Start Point</div>
            </Popup>
          </Marker>
        ))}

        {/* Search radius circle around midpoint (50 km default, adjustable later) */}
        {midpoint && (
          <Circle
            center={[midpoint.lat, midpoint.lon]}
            radius={radiusKm * 1000}
            pathOptions={{
              color: '#ff1493',
              fillColor: '#ff69b4',
              fillOpacity: 0.15,
              weight: 3,
            }}
          />
        )}

        {/* Midpoint marker */}
        {midpoint && (
          <Marker
            position={[midpoint.lat, midpoint.lon]}
            icon={getMidpointIcon()}
          >
            <Tooltip permanent direction="top" offset={[0, -50]}>
              <div className="font-bold text-[#ff1493] font-mono">Midpoint</div>
            </Tooltip>
            <Popup>
              <div className="font-bold text-[#ff1493] font-mono">Midpoint</div>
              <div className="text-sm text-black/70 font-mono">
                Geographic center of all start points
              </div>
              <div className="text-sm text-black/60 mt-1 font-mono">
                Search radius: {radiusKm} km
              </div>
            </Popup>
          </Marker>
        )}

        {/* Place markers (color by type): restaurants, bars, hotels */}
        {restaurants.filter((r) => r.type).map((r) => {
          const isRecommended = recommendedPlaceIds.has(r.id);
          return (
          <Marker
            key={`${r.id}-${r.type}`}
            position={[r.lat, r.lon]}
            icon={getPlaceIcon(r.type, isRecommended)}
            eventHandlers={{
              click: () => {
                try {
                  console.log('[Enriched data] place clicked:', JSON.stringify(r, null, 2));
                } catch (_) {}
              },
            }}
          >
            <Popup>
              <div className="text-xs font-bold text-[#ff1493] uppercase tracking-wide font-mono">
                {PLACE_TYPE_LABELS[r.type] || r.type}
              </div>
              <div className="font-bold text-black font-mono">{r.name}</div>
              {r.cuisine && r.cuisine !== 'unknown' && (
                <div className="text-sm text-black/70 font-mono">Cuisine / style: {r.cuisine}</div>
              )}
              {r.priceRange && r.priceRange !== 'unknown' && (
                <div className="text-sm text-black/70 font-mono">Price range: {r.priceRange}</div>
              )}
              {r.rating != null && r.rating !== 'unknown' && ratingToStars(r.rating) && (
                <div className="text-sm text-black/70 font-mono">
                  Rating: <span className="text-amber-500">{ratingToStars(r.rating)}</span>
                  {typeof r.rating === 'number' || (typeof r.rating === 'string' && !Number.isNaN(parseFloat(r.rating))) ? (
                    <span className="ml-1 text-black/60">({r.rating})</span>
                  ) : null}
                </div>
              )}
              {r.veganOptions && r.veganOptions !== 'unknown' && (
                <div className="text-sm text-black/70 font-mono">Vegan options: {r.veganOptions}</div>
              )}
              {r.vegetarianOptions && r.vegetarianOptions !== 'unknown' && (
                <div className="text-sm text-black/70 font-mono">Vegetarian options: {r.vegetarianOptions}</div>
              )}
              {r.openingHours && r.openingHours !== 'unknown' && (
                <div className="text-xs text-black/60 mt-1 font-mono">{r.openingHours}</div>
              )}
              <div className="mt-2 pt-2 border-t border-black/20">
                <a
                  href={`https://www.google.com/maps?q=${r.lat},${r.lon}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#ff1493] hover:text-[#ff1493]/80 hover:underline inline-flex items-center gap-1 font-mono font-medium"
                >
                  View on Google Maps
                </a>
              </div>
            </Popup>
          </Marker>
          );
        })}

        {/* Zoom to radius view when midpoint + radius set; otherwise fit all points */}
        {midpoint && (
          <FitBoundsToRadius
            midpoint={midpoint}
            radiusKm={radiusKm}
            restaurantPoints={restaurantPoints.length > 0 ? restaurantPoints : undefined}
          />
        )}
        {!midpoint && allPoints.length > 0 && <FitBounds points={allPoints} />}
      </MapContainer>
    </div>
  );
}

// Memoize component to prevent re-renders when props haven't actually changed
export default memo(MapDisplay, (prevProps, nextProps) => {
  // Custom comparison function - return true if props are equal (skip re-render)
  if (prevProps.startpoints.length !== nextProps.startpoints.length) {
    return false; // Props changed, should re-render
  }
  
  // Compare startpoints by value
  for (let i = 0; i < prevProps.startpoints.length; i++) {
    const prev = prevProps.startpoints[i];
    const next = nextProps.startpoints[i];
    if (prev.lat !== next.lat || prev.lon !== next.lon || prev.label !== next.label) {
      return false; // Props changed, should re-render
    }
  }
  
  // Compare midpoint by value
  if (prevProps.midpoint === null && nextProps.midpoint === null) {
    return true; // Both null, props are equal
  }
  if (prevProps.midpoint === null || nextProps.midpoint === null) {
    return false; // One is null, other isn't - props changed
  }
  if (Math.abs(prevProps.midpoint.lat - nextProps.midpoint.lat) > 0.000001 || 
      Math.abs(prevProps.midpoint.lon - nextProps.midpoint.lon) > 0.000001) {
    return false; // Midpoint coordinates changed
  }

  if ((prevProps.radiusKm ?? DEFAULT_RADIUS_KM) !== (nextProps.radiusKm ?? DEFAULT_RADIUS_KM)) {
    return false; // Radius changed
  }

  if (prevProps.restaurants?.length !== nextProps.restaurants?.length) {
    return false;
  }
  const restPrev = prevProps.restaurants ?? [];
  const restNext = nextProps.restaurants ?? [];
  for (let i = 0; i < restPrev.length; i++) {
    if (restPrev[i].id !== restNext[i].id || restPrev[i].type !== restNext[i].type) return false;
  }

  return true; // All props are equal, skip re-render
});
