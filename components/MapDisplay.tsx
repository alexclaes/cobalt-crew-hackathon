'use client';

import { useEffect, useRef, useState, useMemo, memo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

export interface MapPoint {
  lat: number;
  lon: number;
  label: string;
}

export type PlaceType = 'restaurant' | 'bar' | 'hotel';

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

/** Optional midpoints by mode for drawing 3 lines (center, car, train) in different colors */
export interface MidpointsByMode {
  geographic?: { lat: number; lon: number };
  car?: { lat: number; lon: number };
  train?: { lat: number; lon: number };
}

interface MapDisplayProps {
  startpoints: MapPoint[];
  midpoint: { lat: number; lon: number } | null;
  /** Search radius in km around the midpoint (for places search). Default 50. */
  radiusKm?: number;
  /** Places within radius (from Overpass API), each with type for marker color. */
  restaurants?: Restaurant[];
  /** Optional: draw lines from each startpoint to center/car/train midpoints in different colors */
  midpointsByMode?: MidpointsByMode;
  /** Which lines to show when midpointsByMode is set (default all true). */
  showGeographicLine?: boolean;
  showCarLine?: boolean;
  showTrainLine?: boolean;
  /** Actual driving route polylines (start → car midpoint) for each startpoint. [lat, lon][] per route. */
  carRoutePolylines?: Array<Array<[number, number]>>;
}

const PLACE_TYPE_LABELS: Record<PlaceType, string> = {
  restaurant: 'Restaurant',
  bar: 'Bar',
  hotel: 'Hotel',
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

const PLACE_COLORS: Record<PlaceType, { bg: string; border: string }> = {
  restaurant: { bg: '#ea580c', border: '#c2410c' },
  bar: { bg: '#7c3aed', border: '#5b21b6' },
  hotel: { bg: '#059669', border: '#047857' },
};

const placeIcons: Partial<Record<PlaceType, L.DivIcon>> = {};

function getPlaceIcon(type: PlaceType): L.DivIcon {
  if (!placeIcons[type] && typeof window !== 'undefined') {
    const colors = PLACE_COLORS[type];
    if (!colors) {
      console.warn(`Unknown place type: ${type}, defaulting to restaurant colors`);
      const { bg, border } = PLACE_COLORS.restaurant;
      return L.divIcon({
        className: `place-marker place-marker-unknown`,
        html: `<div style="
          width: 24px; height: 24px;
          background: ${bg};
          border: 2px solid ${border};
          border-radius: 50%;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12],
      });
    }
    const { bg, border } = colors;
    placeIcons[type] = L.divIcon({
      className: `place-marker place-marker-${type}`,
      html: `<div style="
        width: 24px; height: 24px;
        background: ${bg};
        border: 2px solid ${border};
        border-radius: 50%;
        box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      "></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12],
    });
  }
  return placeIcons[type]!;
}

// Fix for default marker icons in React-Leaflet - moved inside component to avoid SSR issues
let defaultIcon: L.Icon | null = null;
let midpointIcon: L.Icon | null = null;

function getDefaultIcon(): L.Icon {
  if (!defaultIcon && typeof window !== 'undefined') {
    defaultIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });
  }
  return defaultIcon!;
}

function getMidpointIcon(): L.Icon {
  if (!midpointIcon && typeof window !== 'undefined') {
    midpointIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [35, 51],
      iconAnchor: [17, 51],
      popupAnchor: [1, -34],
      shadowSize: [51, 51],
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

// Line colors for center (geographic), car, train
const LINE_COLORS = {
  geographic: '#2563eb',
  car: '#16a34a',
  train: '#7c3aed',
} as const;

// Wrapper that only renders layers once the map context is ready (fixes appendChild undefined in react-leaflet)
interface MapContentProps {
  startpoints: MapPoint[];
  midpoint: { lat: number; lon: number } | null;
  radiusKm: number;
  restaurants: Restaurant[];
  allPoints: Array<{ lat: number; lon: number }>;
  restaurantPoints: Array<{ lat: number; lon: number }>;
  midpointsByMode?: MidpointsByMode;
  showGeographicLine?: boolean;
  showCarLine?: boolean;
  showTrainLine?: boolean;
  carRoutePolylines?: Array<Array<[number, number]>>;
}
function MapContent({ startpoints, midpoint, radiusKm, restaurants, allPoints, restaurantPoints, midpointsByMode, showGeographicLine = true, showCarLine = true, showTrainLine = true, carRoutePolylines }: MapContentProps) {
  const map = useMap();
  const [layersReady, setLayersReady] = useState(false);
  // Defer layers until next tick so map container/panes are in the DOM (fixes appendChild undefined)
  useEffect(() => {
    if (!map) return;
    const t = requestAnimationFrame(() => {
      setLayersReady(true);
    });
    return () => cancelAnimationFrame(t);
  }, [map]);
  if (!map || !layersReady) {
    return null;
  }
  return (
    <>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Startpoint markers */}
      {startpoints.map((point, index) => (
        <Marker
          key={`startpoint-${index}`}
          position={[point.lat, point.lon]}
          icon={getDefaultIcon()}
        >
          <Tooltip permanent direction="top" offset={[0, -40]}>
            <div className="font-medium">{point.label}</div>
          </Tooltip>
          <Popup>
            <div className="font-medium">{point.label}</div>
            <div className="text-sm text-gray-600">Start Point</div>
          </Popup>
        </Marker>
      ))}

      {/* Lines from each startpoint to center / car / train midpoints (different colors) */}
      {midpointsByMode && startpoints.length >= 2 && (
        <>
          {showGeographicLine && midpointsByMode.geographic && startpoints.map((point, i) => (
            <Polyline
              key={`line-geographic-${i}`}
              positions={[[point.lat, point.lon], [midpointsByMode.geographic!.lat, midpointsByMode.geographic!.lon]]}
              pathOptions={{ color: LINE_COLORS.geographic, weight: 3, opacity: 0.8 }}
            />
          ))}
          {showCarLine && midpointsByMode.car && (
            carRoutePolylines && carRoutePolylines.length > 0
              ? carRoutePolylines.map((positions, i) => (
                  <Polyline
                    key={`route-car-${i}`}
                    positions={positions}
                    pathOptions={{ color: LINE_COLORS.car, weight: 4, opacity: 0.9 }}
                  />
                ))
              : startpoints.map((point, i) => (
                  <Polyline
                    key={`line-car-${i}`}
                    positions={[[point.lat, point.lon], [midpointsByMode.car!.lat, midpointsByMode.car!.lon]]}
                    pathOptions={{ color: LINE_COLORS.car, weight: 3, opacity: 0.8 }}
                  />
                ))
          )}
          {showTrainLine && midpointsByMode.train && startpoints.map((point, i) => (
            <Polyline
              key={`line-train-${i}`}
              positions={[[point.lat, point.lon], [midpointsByMode.train!.lat, midpointsByMode.train!.lon]]}
              pathOptions={{ color: LINE_COLORS.train, weight: 4, opacity: 0.9, dashArray: '8, 8' }}
            />
          ))}
        </>
      )}

      {/* Search radius circle around midpoint (50 km default, adjustable later) */}
      {midpoint && (
        <Circle
          center={[midpoint.lat, midpoint.lon]}
          radius={radiusKm * 1000}
          pathOptions={{
            color: '#2563eb',
            fillColor: '#3b82f6',
            fillOpacity: 0.15,
            weight: 2,
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
            <div className="font-bold text-blue-600">Midpoint</div>
          </Tooltip>
          <Popup>
            <div className="font-bold text-blue-600">Midpoint</div>
            <div className="text-sm text-gray-600">
              Geographic center of all start points
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Search radius: {radiusKm} km
            </div>
          </Popup>
        </Marker>
      )}

      {/* Place markers (color by type): restaurants, bars, hotels */}
      {restaurants.filter((r) => r.type).map((r) => (
        <Marker
          key={`${r.id}-${r.type}`}
          position={[r.lat, r.lon]}
          icon={getPlaceIcon(r.type)}
          eventHandlers={{
            click: () => {
              try {
                console.log('[Enriched data] place clicked:', JSON.stringify(r, null, 2));
              } catch (_) {}
            },
          }}
        >
          <Popup>
            <div className="text-xs font-medium text-blue-600 uppercase tracking-wide">
              {PLACE_TYPE_LABELS[r.type]}
            </div>
            <div className="font-medium text-gray-900">{r.name}</div>
            {r.cuisine && (
              <div className="text-sm text-gray-600">Cuisine / style: {r.cuisine}</div>
            )}
            <div className="text-sm text-gray-600">Price range: {r.priceRange ?? '—'}</div>
            {r.rating != null && r.rating !== 'unknown' && ratingToStars(r.rating) && (
              <div className="text-sm text-gray-600">
                Rating: <span className="text-amber-500">{ratingToStars(r.rating)}</span>
                {typeof r.rating === 'number' || (typeof r.rating === 'string' && !Number.isNaN(parseFloat(r.rating))) ? (
                  <span className="ml-1 text-gray-500">({r.rating})</span>
                ) : null}
              </div>
            )}
            {r.veganOptions && (
              <div className="text-sm text-gray-600">Vegan options: {r.veganOptions}</div>
            )}
            {r.vegetarianOptions && (
              <div className="text-sm text-gray-600">Vegetarian options: {r.vegetarianOptions}</div>
            )}
            {r.openingHours && (
              <div className="text-xs text-gray-500 mt-1">{r.openingHours}</div>
            )}
            <div className="mt-2 pt-2 border-t border-gray-200">
              <a
                href={`https://www.google.com/maps?q=${r.lat},${r.lon}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1"
              >
                View on Google Maps
              </a>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Zoom to radius view when midpoint + radius set; otherwise fit all points */}
      {midpoint && (
        <FitBoundsToRadius
          midpoint={midpoint}
          radiusKm={radiusKm}
          restaurantPoints={restaurantPoints.length > 0 ? restaurantPoints : undefined}
        />
      )}
      {!midpoint && allPoints.length > 0 && <FitBounds points={allPoints} />}
    </>
  );
}

function MapDisplay({ startpoints, midpoint, radiusKm = DEFAULT_RADIUS_KM, restaurants = [], midpointsByMode, showGeographicLine = true, showCarLine = true, showTrainLine = true, carRoutePolylines }: MapDisplayProps) {
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
        <MapContent
          startpoints={startpoints}
          midpoint={midpoint}
          radiusKm={radiusKm}
          restaurants={restaurants}
          allPoints={allPoints}
          restaurantPoints={restaurantPoints}
          midpointsByMode={midpointsByMode}
          showGeographicLine={showGeographicLine}
          showCarLine={showCarLine}
          showTrainLine={showTrainLine}
          carRoutePolylines={carRoutePolylines}
        />
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

  // Compare midpointsByMode (for 3 lines: center, car, train)
  const mpPrev = prevProps.midpointsByMode;
  const mpNext = nextProps.midpointsByMode;
  if (!!mpPrev !== !!mpNext) return false;
  if (mpPrev && mpNext) {
    for (const mode of ['geographic', 'car', 'train'] as const) {
      const a = mpPrev[mode];
      const b = mpNext[mode];
      if (!!a !== !!b) return false;
      if (a && b && (Math.abs(a.lat - b.lat) > 1e-6 || Math.abs(a.lon - b.lon) > 1e-6)) return false;
    }
  }

  // Car route polylines (reference / length change)
  if (prevProps.carRoutePolylines?.length !== nextProps.carRoutePolylines?.length) return false;

  // Which lines to show (chosen transport mode)
  if (prevProps.showGeographicLine !== nextProps.showGeographicLine) return false;
  if (prevProps.showCarLine !== nextProps.showCarLine) return false;

  return true; // All props are equal, skip re-render
});
