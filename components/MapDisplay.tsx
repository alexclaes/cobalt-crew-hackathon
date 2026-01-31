'use client';

import { useEffect, useRef, useState, useMemo, memo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

export interface MapPoint {
  lat: number;
  lon: number;
  label: string;
}

interface MapDisplayProps {
  startpoints: MapPoint[];
  midpoint: { lat: number; lon: number } | null;
}

// #region agent log
if (typeof window !== 'undefined') { fetch('http://127.0.0.1:7242/ingest/417d1cd5-fce3-4cd5-b239-18159c05ce15',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MapDisplay.tsx:18',message:'Module load - window check',data:{windowExists:true},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{}); } else { fetch('http://127.0.0.1:7242/ingest/417d1cd5-fce3-4cd5-b239-18159c05ce15',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MapDisplay.tsx:18',message:'Module load - window check',data:{windowExists:false},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{}); }
// #endregion

// Fix for default marker icons in React-Leaflet - moved inside component to avoid SSR issues
let defaultIcon: L.Icon | null = null;
let midpointIcon: L.Icon | null = null;

function getDefaultIcon(): L.Icon {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/417d1cd5-fce3-4cd5-b239-18159c05ce15',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MapDisplay.tsx:26',message:'getDefaultIcon called',data:{windowExists:typeof window !== 'undefined'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
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
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/417d1cd5-fce3-4cd5-b239-18159c05ce15',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MapDisplay.tsx:42',message:'getMidpointIcon called',data:{windowExists:typeof window !== 'undefined'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
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

// Component to fit map bounds
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

function MapDisplay({ startpoints, midpoint }: MapDisplayProps) {
  const renderId = useRef(Math.random().toString(36).substring(7));
  const [isMounted, setIsMounted] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const containerKeyRef = useRef(Math.random().toString(36).substring(7));
  
  // #region agent log
  useEffect(() => {
    const startpointsKey = JSON.stringify(startpoints.map(p => ({ lat: p.lat, lon: p.lon })));
    const midpointKey = midpoint ? `${midpoint.lat},${midpoint.lon}` : 'null';
    fetch('http://127.0.0.1:7242/ingest/417d1cd5-fce3-4cd5-b239-18159c05ce15',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MapDisplay.tsx:83',message:'MapDisplay component render',data:{windowExists:typeof window !== 'undefined',renderId:renderId.current,startpointsCount:startpoints.length,hasMidpoint:!!midpoint,startpointsKey,midpointKey},timestamp:Date.now(),sessionId:'debug-session',runId:'run8',hypothesisId:'A'})}).catch(()=>{});
  }, [startpoints.length, midpoint?.lat, midpoint?.lon]);
  // #endregion

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7242/ingest/417d1cd5-fce3-4cd5-b239-18159c05ce15',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MapDisplay.tsx:94',message:'useEffect mount',data:{windowExists:typeof window !== 'undefined',renderId:renderId.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run7',hypothesisId:'B'})}).catch(()=>{});
    setIsMounted(true);
    return () => {
      fetch('http://127.0.0.1:7242/ingest/417d1cd5-fce3-4cd5-b239-18159c05ce15',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MapDisplay.tsx:98',message:'useEffect unmount cleanup',data:{renderId:renderId.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run7',hypothesisId:'C'})}).catch(()=>{});
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
  // #endregion

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

  if (!isMounted) {
    return (
      <div className="w-full h-[500px] rounded-lg overflow-hidden border border-gray-300 flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading map...</div>
      </div>
    );
  }

  // Memoize center and zoom to prevent recalculations
  const center: [number, number] = useMemo(() => {
    if (allPoints.length > 0) {
      const avgLat = allPoints.reduce((sum, p) => sum + p.lat, 0) / allPoints.length;
      const avgLon = allPoints.reduce((sum, p) => sum + p.lon, 0) / allPoints.length;
      return [avgLat, avgLon];
    }
    return defaultCenter;
  }, [allPoints]);

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7242/ingest/417d1cd5-fce3-4cd5-b239-18159c05ce15',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MapDisplay.tsx:140',message:'Rendering MapContainer',data:{windowExists:typeof window !== 'undefined',startpointsCount:startpoints.length,renderId:renderId.current,mapRefExists:!!mapRef.current,containerKey:containerKeyRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run8',hypothesisId:'R'})}).catch(()=>{});
  }, [startpoints.length, allPoints.length]);
  // #endregion

  return (
    <div 
      key={`map-wrapper-${containerKeyRef.current}`}
      className="w-full h-[500px] rounded-lg overflow-hidden border border-gray-300"
    >
      <MapContainer
        key={`map-container-${containerKeyRef.current}`}
        center={center}
        zoom={defaultZoom}
        style={{ height: '100%', width: '100%' }}
        whenCreated={(mapInstance) => {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/417d1cd5-fce3-4cd5-b239-18159c05ce15',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MapDisplay.tsx:133',message:'MapContainer whenCreated callback',data:{mapInstanceExists:!!mapInstance,renderId:renderId.current,existingMapRef:!!mapRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run7',hypothesisId:'E'})}).catch(()=>{});
          // #endregion
          mapRef.current = mapInstance;
        }}
      >
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
            <Popup>
              <div className="font-medium">{point.label}</div>
              <div className="text-sm text-gray-600">Start Point</div>
            </Popup>
          </Marker>
        ))}

        {/* Midpoint marker */}
        {midpoint && (
          <Marker
            position={[midpoint.lat, midpoint.lon]}
            icon={getMidpointIcon()}
          >
            <Popup>
              <div className="font-bold text-blue-600">Midpoint</div>
              <div className="text-sm text-gray-600">
                Geographic center of all start points
              </div>
            </Popup>
          </Marker>
        )}

        {/* Fit bounds to show all points */}
        {allPoints.length > 0 && <FitBounds points={allPoints} />}
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
  
  return true; // All props are equal, skip re-render
});
