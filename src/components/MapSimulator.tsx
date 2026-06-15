import React, { useEffect, useRef, useState, useMemo } from 'react';
import { TripProgress, RideRequest } from '../types';
import L from 'leaflet';
import { MapPin, Navigation, Zap, Compass, Target } from 'lucide-react';

interface MapSimulatorProps {
  tripProgress: TripProgress;
  isOnline: boolean;
  surgeLevel: 'low' | 'medium' | 'high';
  onSpawnRideFromZone?: (multiplier: number, areaName: string, coords: { x: number; y: number }) => void;
  mode?: 'taxi' | 'food';
  realCoords: { lat: number; lon: number; accuracy: number; address: string } | null;
  useRealGPS: boolean;
  darkMode: boolean;
  simulateWandering: boolean;
  currentCity?: string;
}

// Logical surge coordinates relative to the 400x500 virtual grid
const SURGE_ZONES_OFFSET = [
  { id: 'london-soho', name: 'West End Soho', x: 200, y: 120, radius: 110, multiplier: 1.8 },
  { id: 'london-mayfair', name: 'Mayfair Central', x: 310, y: 380, radius: 120, multiplier: 2.2 },
  { id: 'london-city', name: 'Financial Core', x: 90, y: 280, radius: 100, multiplier: 1.4 },
  { id: 'london-kensington', name: 'Kensington High', x: 100, y: 100, radius: 90, multiplier: 1.2 },
];

const CITY_COORDINATES: Record<string, { lat: number; lon: number }> = {
  'london': { lat: 51.5074, lon: -0.1278 },
  'birmingham': { lat: 52.4862, lon: -1.8904 },
  'nottingham': { lat: 52.9548, lon: -1.1581 },
  'manchester': { lat: 53.4808, lon: -2.2426 },
  'leeds': { lat: 53.8008, lon: -1.5491 },
  'bristol': { lat: 51.4545, lon: -2.5879 },
  'glasgow': { lat: 55.8642, lon: -4.2518 },
  'edinburgh': { lat: 55.9533, lon: -3.1883 },
};

export const MapSimulator: React.FC<MapSimulatorProps> = ({
  tripProgress,
  isOnline,
  surgeLevel,
  onSpawnRideFromZone,
  mode = 'taxi',
  realCoords,
  useRealGPS,
  darkMode,
  simulateWandering,
  currentCity = 'London',
}) => {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  
  // Custom Leaflet objects referencing active simulation layer maps
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const pickupPinRef = useRef<L.Marker | null>(null);
  const dropoffPinRef = useRef<L.Marker | null>(null);
  const surgeCirclesRef = useRef<Map<string, { circle: L.Circle; pulse: L.Circle; marker?: L.Marker }>>(new Map());

  // Sine/Cosine variables for idle wandering simulation
  const [wanderAngle, setWanderAngle] = useState(0);
  const [simulationAnchor, setSimulationAnchor] = useState<{ lat: number; lon: number } | null>(null);

  // Dynamically map surge zone names matching the active city
  const mappedSurgeZones = useMemo(() => {
    const normCity = currentCity.trim().toLowerCase();
    
    if (normCity === 'london') return SURGE_ZONES_OFFSET;
    
    let localizedNames = ['High Street Core', 'Central Boulevard', 'Commercial Hub', 'Station Side'];
    if (normCity === 'birmingham') {
      localizedNames = ['Bullring Core', 'Broad Street', 'Mailbox Plaza', 'Digbeth Creative'];
    } else if (normCity === 'nottingham') {
      localizedNames = ['Lace Market', 'Hockley Square', 'Old Market Centre', 'Trent Bridge'];
    } else if (normCity === 'manchester') {
      localizedNames = ['Spinningfields', 'Northern Quarter', 'MediaCity Basin', 'Ancoats Core'];
    } else if (normCity === 'leeds') {
      localizedNames = ['Briggate Core', 'Headingley Quarter', 'Trinity Hub', 'Clarence Dock'];
    } else {
      localizedNames = [
        `${currentCity} Centre`,
        `${currentCity} Waterfront`,
        `${currentCity} Station`,
        `${currentCity} Plaza`
      ];
    }
    
    return SURGE_ZONES_OFFSET.map((zone, idx) => ({
      ...zone,
      name: localizedNames[idx] || `${currentCity} Zone #${idx + 1}`
    }));
  }, [currentCity]);

  // Resolve city standard coordinates for simulation anchor mapping when real GPS is off
  const resolvedCityCoords = useMemo(() => {
    const cityKey = currentCity.trim().toLowerCase();
    return CITY_COORDINATES[cityKey] || { lat: 51.5074, lon: -0.1278 };
  }, [currentCity]);

  // Default coordinate anchor: Central matching local UK standard coordinates
  const anchorLat = simulationAnchor?.lat ?? realCoords?.lat ?? resolvedCityCoords.lat;
  const anchorLon = simulationAnchor?.lon ?? realCoords?.lon ?? resolvedCityCoords.lon;

  // Convert logical grid coordinates to Lat/Lng relative to the anchor location
  const getLatLngFromXY = (x: number, y: number): [number, number] => {
    const latOffset = -(y - 300) * 0.000028; // y flipped
    const lngOffset = (x - 200) * 0.000045;
    return [anchorLat + latOffset, anchorLon + lngOffset];
  };

  // 1. Idle Simulation Wandering Tick Effect
  useEffect(() => {
    if (!isOnline || tripProgress.stage !== 'idle' || !simulateWandering) return;

    const interval = setInterval(() => {
      setWanderAngle((prev) => (prev + 0.08) % (Math.PI * 2));
    }, 400);

    return () => clearInterval(interval);
  }, [isOnline, tripProgress.stage, simulateWandering]);

  // Compute active driver's current position lat/lon
  const currentPosition = useMemo((): { lat: number; lon: number; heading: number } => {
    const { stage, currentRide, navigationProgress } = tripProgress;

    // Active trip movement mapping
    if (isOnline && currentRide && (stage === 'to_pickup' || stage === 'to_destination')) {
      const from = stage === 'to_pickup'
        ? { x: 200, y: 300 }
        : currentRide.pickupCoordinate;

      const to = stage === 'to_pickup'
        ? currentRide.pickupCoordinate
        : currentRide.dropoffCoordinate;

      const ratio = Math.min(100, Math.max(0, navigationProgress)) / 100;
      const curX = from.x + (to.x - from.x) * ratio;
      const curY = from.y + (to.y - from.y) * ratio;

      const [lat, lon] = getLatLngFromXY(curX, curY);

      // Compute heading angle
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const angle = Math.atan2(dy, dx) * (180 / Math.PI) - 90; // offset for marker pointer

      return { lat, lon, heading: angle };
    }

    // Stationary simulation wandering
    if (isOnline && simulateWandering && tripProgress.stage === 'idle') {
      const wanderRadiusLat = 0.0007 * Math.sin(wanderAngle);
      const wanderRadiusLon = 0.0009 * Math.cos(wanderAngle * 0.6);
      
      const waveHeading = wanderAngle * (180 / Math.PI);
      return {
        lat: anchorLat + wanderRadiusLat,
        lon: anchorLon + wanderRadiusLon,
        heading: waveHeading
      };
    }

    // Default static layout
    return { lat: anchorLat, lon: anchorLon, heading: 0 };
  }, [isOnline, tripProgress, simulateWandering, wanderAngle, anchorLat, anchorLon]);

  // Handle Map Initialization & Lifecycle
  useEffect(() => {
    if (!mapElementRef.current) return;

    // Initialize Leaflet Map
    const initialMap = L.map(mapElementRef.current, {
      center: [currentPosition.lat, currentPosition.lon],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    });

    mapRef.current = initialMap;

    // Tile pattern selector matching Light vs Dark mode styling
    const tileUrl = darkMode
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    const tileLayer = L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(initialMap);
    tileLayerRef.current = tileLayer;

    // Custom driver car marker initialized inside leaf map
    const customCarHtml = `
      <div id="leaflet-car-marker" class="relative w-8 h-8 flex items-center justify-center">
        <div class="absolute inset-0 bg-[#13AA52]/45 rounded-full animate-ping opacity-60"></div>
        <div class="w-5 h-5 bg-[#13AA52] border-2 border-white rounded-full shadow-md flex items-center justify-center transform transition-transform" style="transform: rotate(${currentPosition.heading}deg)">
          <svg class="w-2.5 h-2.5 text-white fill-white" viewBox="0 0 24 24">
            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
          </svg>
        </div>
      </div>
    `;

    const carIcon = L.divIcon({
      html: customCarHtml,
      className: 'clear-div-icon',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const driverMarker = L.marker([currentPosition.lat, currentPosition.lon], { icon: carIcon }).addTo(initialMap);
    driverMarkerRef.current = driverMarker;

    return () => {
      initialMap.remove();
      mapRef.current = null;
    };
  }, []);

  // Center map on new city anchor if changed
  useEffect(() => {
    if (!mapRef.current) return;
    const centerLatLng = L.latLng(resolvedCityCoords.lat, resolvedCityCoords.lon);
    mapRef.current.setView(centerLatLng, 15, { animate: true });
    setSimulationAnchor(null);
  }, [resolvedCityCoords]);

  // Update Map Theme Tiles when Dark Mode toggles
  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current) return;
    
    const tileUrl = darkMode
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

    tileLayerRef.current.setUrl(tileUrl);
  }, [darkMode]);

  // Pan Map and Sync Driver Marker position when GPS coordinates or path shifts
  useEffect(() => {
    if (!mapRef.current || !driverMarkerRef.current) return;

    const latLng = L.latLng(currentPosition.lat, currentPosition.lon);
    
    // Dynamic smooth centering
    if (useRealGPS && tripProgress.stage === 'idle') {
      mapRef.current.panTo(latLng);
    } else if (tripProgress.stage !== 'idle') {
      // Auto centers on trip
      mapRef.current.setView(latLng, mapRef.current.getZoom(), { animate: true });
    }

    driverMarkerRef.current.setLatLng(latLng);

    const customCarHtml = `
      <div id="leaflet-car-marker" class="relative w-8 h-8 flex items-center justify-center">
        <div class="absolute inset-0 bg-[#13AA52]/45 rounded-full animate-ping opacity-60"></div>
        <div class="w-5 h-5 bg-[#13AA52] border-2 border-white rounded-full shadow-md flex items-center justify-center" style="transform: rotate(${currentPosition.heading}deg)">
          <svg class="w-2.5 h-2.5 text-white fill-white" viewBox="0 0 24 24">
            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
          </svg>
        </div>
      </div>
    `;

    driverMarkerRef.current.setIcon(L.divIcon({
      html: customCarHtml,
      className: 'clear-div-icon',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    }));
  }, [currentPosition, useRealGPS, tripProgress.stage]);

  // Sync Surge Heat Hot Zones atop Leaflet Map
  useEffect(() => {
    if (!mapRef.current) return;
    const mapObj = mapRef.current;

    // Clear old surge markers
    surgeCirclesRef.current.forEach((obj) => {
      obj.circle.remove();
      obj.pulse.remove();
      if (obj.marker) obj.marker.remove();
    });
    surgeCirclesRef.current.clear();

    if (!isOnline) return;

    mappedSurgeZones.forEach((zone) => {
      const zoneLatLng = getLatLngFromXY(zone.x, zone.y);
      const mult = surgeLevel === 'high' ? zone.multiplier : surgeLevel === 'medium' ? Math.max(1.1, +(zone.multiplier * 0.7).toFixed(1)) : 1.0;

      if (mult <= 1.0) return; // Hide standard multiplier spots

      // Determine dynamic colors & animations matching heat multiplier intensity
      let surgeColor = '#10B981'; // Mint Green (Default / Low)
      let badgeClass = 'bg-[#13AA52] border-emerald-450 badge-pulse';

      if (mult >= 2.0) {
        surgeColor = '#EF4444'; // Red-Crimson (High Demand)
        badgeClass = 'bg-red-600 border-red-400 badge-pulse-red';
      } else if (mult >= 1.6) {
        surgeColor = '#F97316'; // Deep Orange (Medium-High Demand)
        badgeClass = 'bg-orange-600 border-orange-400 badge-pulse-orange';
      } else if (mult >= 1.2) {
        surgeColor = '#F59E0B'; // Amber Core (Medium Demand)
        badgeClass = 'bg-amber-600 border-amber-400 badge-pulse-amber';
      }

      const mainCircle = L.circle(zoneLatLng, {
        radius: zone.radius,
        color: surgeColor,
        weight: 1.5,
        fillColor: surgeColor,
        fillOpacity: darkMode ? 0.08 : 0.05,
        className: 'surge-pulse-path',
      }).addTo(mapObj);

      const pulseCircle = L.circle(zoneLatLng, {
        radius: zone.radius * 0.45,
        color: surgeColor,
        weight: 0,
        fillColor: surgeColor,
        fillOpacity: 0.12,
        className: 'surge-pulse-path-inner',
      }).addTo(mapObj);

      // Simple interactive custom popup/marker badge with pulsing glow ring matching heat level
      const badgeHtml = `
        <div class="cursor-pointer ${badgeClass} text-white text-[9.5px] font-black font-sans px-2 py-0.5 rounded-full shadow-md flex items-center justify-center gap-0.5 border hover:scale-110 active:scale-95 transition-all duration-150">
          <span class="leading-none text-shadow-sm">+${mult}x</span>
        </div>
      `;

      const badgeMarker = L.marker(zoneLatLng, {
        icon: L.divIcon({
          html: badgeHtml,
          className: 'clear-div-icon',
          iconSize: [42, 18],
          iconAnchor: [21, 9]
        })
      }).addTo(mapObj);

      badgeMarker.on('click', () => {
        onSpawnRideFromZone?.(mult, zone.name, { x: zone.x, y: zone.y });
      });

      surgeCirclesRef.current.set(zone.id, {
        circle: mainCircle,
        pulse: pulseCircle,
        marker: badgeMarker
      });
    });

  }, [isOnline, surgeLevel, darkMode, anchorLat, anchorLon, mappedSurgeZones]);

  // Dynamic Routing Path overlay syncing with travel progress
  useEffect(() => {
    if (!mapRef.current) return;
    const mapObj = mapRef.current;

    // Remove old lines and markers
    if (routePolylineRef.current) {
      routePolylineRef.current.remove();
      routePolylineRef.current = null;
    }
    if (pickupPinRef.current) {
      pickupPinRef.current.remove();
      pickupPinRef.current = null;
    }
    if (dropoffPinRef.current) {
      dropoffPinRef.current.remove();
      dropoffPinRef.current = null;
    }

    const { stage, currentRide } = tripProgress;

    if (!isOnline || !currentRide || stage === 'idle' || stage === 'offering') {
      return;
    }

    const pLatLng = getLatLngFromXY(currentRide.pickupCoordinate.x, currentRide.pickupCoordinate.y);
    const dLatLng = getLatLngFromXY(currentRide.dropoffCoordinate.x, currentRide.dropoffCoordinate.y);
    const centerLatLng = getLatLngFromXY(200, 300);

    // Draw active routes
    if (stage === 'to_pickup' || stage === 'arrived_pickup') {
      const lineCoords = [centerLatLng, pLatLng];
      routePolylineRef.current = L.polyline(lineCoords, {
        color: '#13AA52',
        weight: 5.5,
        opacity: 0.75,
        dashArray: '8, 8'
      }).addTo(mapObj);

      // Map pin for active pickup restaurant or passenger
      const pinHtml = `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-7 h-7 bg-emerald-500 rounded-full animate-ping opacity-55"></div>
          <div class="w-6.5 h-6.5 bg-emerald-600 border border-white rounded-full flex items-center justify-center text-white font-extrabold text-[8px] shadow-md">
            ${mode === 'food' ? 'FOOD' : 'PICK'}
          </div>
        </div>
      `;

      pickupPinRef.current = L.marker(pLatLng, {
        icon: L.divIcon({
          html: pinHtml,
          className: 'clear-div-icon',
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        })
      }).addTo(mapObj);

      // Auto fit bounds on screen transitions
      mapObj.fitBounds(L.latLngBounds([centerLatLng, pLatLng]), { padding: [40, 40] });

    } else if (stage === 'to_destination' || stage === 'arrived_destination') {
      const lineCoords = [pLatLng, dLatLng];
      routePolylineRef.current = L.polyline(lineCoords, {
        color: '#ea4335',
        weight: 5.5,
        opacity: 0.75,
        dashArray: '8, 8'
      }).addTo(mapObj);

      // Map pin for active delivery destination
      const pinHtml = `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-7 h-7 bg-rose-500 rounded-full animate-ping opacity-55"></div>
          <div class="w-6.5 h-6.5 bg-rose-600 border border-white rounded-full flex items-center justify-center text-white font-extrabold text-[7.5px] shadow-md">
            DELIV
          </div>
        </div>
      `;

      dropoffPinRef.current = L.marker(dLatLng, {
        icon: L.divIcon({
          html: pinHtml,
          className: 'clear-div-icon',
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        })
      }).addTo(mapObj);

      // Fit route map bounds
      mapObj.fitBounds(L.latLngBounds([pLatLng, dLatLng]), { padding: [40, 40] });
    }

  }, [isOnline, tripProgress.stage, tripProgress.currentRide, mode, anchorLat, anchorLon]);

  return (
    <div 
      id="map-simulator-container" 
      className={`relative w-full h-[320px] overflow-hidden select-none border-b transition-colors duration-250 ${
        darkMode ? 'bg-zinc-950 border-zinc-900' : 'bg-[#e5eee6] border-gray-100'
      }`}
    >
      {/* Leaflet DOM Node Element Container */}
      <div 
        ref={mapElementRef} 
        className="w-full h-full z-0 pointer-events-auto" 
      />

      {/* Surge Indicator floating message */}
      <div className="absolute top-2.5 left-2.5 pointer-events-none z-10 select-none">
        {isOnline && (
          <div className={`backdrop-blur-md rounded-full px-2.5 py-0.5 flex items-center gap-1 shadow-md border ${
            darkMode ? 'bg-zinc-900/95 border-zinc-800' : 'bg-white/95 border-gray-100'
          }`}>
            <Zap className="w-3 h-3 text-[#13AA52] fill-[#13AA52]" />
            <span className="text-[9px] font-sans font-extrabold text-[#13AA52] uppercase tracking-wider">
              {surgeLevel === 'high' ? 'High Demand 🔥' : surgeLevel === 'medium' ? 'Surge Active ⚡' : 'Demand Stable'}
            </span>
          </div>
        )}
      </div>

      {/* Offline screen cover */}
      {!isOnline && (
        <div className={`absolute inset-0 flex flex-col items-center justify-center p-4 text-center z-15 backdrop-blur-xs transition-colors duration-250 ${
          darkMode ? 'bg-zinc-950/92' : 'bg-white/92'
        }`}>
          <Navigation className="w-8 h-8 text-[#13AA52] mb-1.5 animate-bounce" />
          <h4 className={`text-sm font-black ${darkMode ? 'text-zinc-50' : 'text-zinc-950'}`}>Swift Driver Offline</h4>
          <p className={`text-[11px] max-w-[240px] leading-tight mt-1 ${darkMode ? 'text-zinc-400' : 'text-gray-500'}`}>
            Please tap the <span className="font-extrabold text-[#13AA52]">+ Go Online</span> button below to start simulating requests.
          </p>
        </div>
      )}

      {/* Online, Idle Searching Pulse */}
      {isOnline && tripProgress.stage === 'idle' && (
        <div className={`absolute bottom-3 left-1/2 -translate-x-1/2 border px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 animate-pulse z-10 transition-colors duration-250 ${
          darkMode ? 'bg-zinc-900/95 border-zinc-850' : 'bg-white/95 border-gray-100'
        }`}>
          <div className="w-1.5 h-1.5 rounded-full bg-[#13AA52] animate-ping" />
          <span className="text-[9.5px] font-sans font-bold text-[#13AA52] uppercase tracking-wider">
            Waiting for jobs...
          </span>
        </div>
      )}

      {/* Click Hotspot Guide */}
      {isOnline && tripProgress.stage === 'idle' && (
        <div className={`absolute top-2.5 right-2.5 border px-1.5 py-0.5 rounded text-[8px] font-bold z-10 shadow-xs transition-colors duration-250 ${
          darkMode ? 'bg-zinc-900/80 border-zinc-850 text-zinc-400' : 'bg-white/80 border-gray-100 text-gray-500'
        }`}>
          ⚡ Tap +Surge multipliers to spawn!
        </div>
      )}

      {/* Turn Navigation Info Banner */}
      {isOnline && (tripProgress.stage === 'to_pickup' || tripProgress.stage === 'to_destination') && (
        <div className={`absolute top-2 left-2 right-2 border rounded-lg p-2 flex items-center gap-2.5 shadow-md animate-in fade-in slide-in-from-top-2 duration-200 z-10 transition-colors duration-250 ${
          darkMode ? 'bg-zinc-900/95 border-zinc-800 text-zinc-100' : 'bg-white border text-gray-900 border-gray-100'
        }`}>
          <div className="w-7 h-7 rounded-full bg-[#13AA52] flex items-center justify-center text-white shrink-0 shadow-sm">
            <Navigation className="w-3.5 h-3.5 transform -rotate-45 fill-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h5 className="text-[10.5px] font-black leading-none">
              {tripProgress.stage === 'to_pickup'
                ? (mode === 'food' ? 'Pickup order at Restaurant' : 'Navigating to passenger')
                : 'Navigating to destination'
              }
            </h5>
            <p className={`text-[9px] truncate leading-snug mt-1 ${darkMode ? 'text-zinc-450' : 'text-gray-500'}`}>
              {tripProgress.stage === 'to_pickup'
                ? `${tripProgress.currentRide?.pickupAddress}`
                : `${tripProgress.currentRide?.dropoffAddress}`
              }
            </p>
          </div>
          <div className="text-right whitespace-nowrap leading-tight">
            <span className="text-[11px] font-black text-[#13AA52] block">
              {Math.ceil(tripProgress.currentRide?.distance ? (tripProgress.currentRide.distance * (1 - tripProgress.navigationProgress/100)) : 2.5).toFixed(1)} km
            </span>
            <span className={`text-[8.5px] block font-mono font-bold mt-0.5 ${darkMode ? 'text-zinc-500' : 'text-gray-400'}`}>
              {Math.ceil((tripProgress.currentRide?.estimatedMinutes || 5) * (1 - tripProgress.navigationProgress/100))} min
            </span>
          </div>
        </div>
      )}

      {/* Floating Action Buttons Column (Recenter and Navigate to Busy Area) */}
      <div className="absolute right-3.5 bottom-3.5 flex flex-col gap-2 z-10 pointer-events-auto">
        {/* Navigate to Busy Area */}
        {isOnline && tripProgress.stage === 'idle' && (
          <button
            onClick={() => {
              // Select the highest multiplier zone as the "busy area"
              const highestZone = mappedSurgeZones.reduce((prev, cur) => (cur.multiplier > prev.multiplier ? cur : prev), mappedSurgeZones[0]);
              const zoneLatLng = getLatLngFromXY(highestZone.x, highestZone.y);
              setSimulationAnchor({ lat: zoneLatLng[0], lon: zoneLatLng[1] });
              
              // Trigger map smooth animation pan to the new busy area
              mapRef.current?.setView(L.latLng(zoneLatLng[0], zoneLatLng[1]), 15, { animate: true });
              
              // Custom alert/log simulation effect
              if (window.dispatchEvent) {
                const logEvent = new CustomEvent('add-simulation-log', {
                  detail: { text: `🧭 Navigating driver to busy area: ${highestZone.name} (+${highestZone.multiplier}x Demand Surge). Dispatch likeness boosted!`, type: 'info' }
                });
                window.dispatchEvent(logEvent);
                window.dispatchEvent(new CustomEvent('play-sound', { detail: 'tap' }));
              }
            }}
            className={`h-9 px-3 rounded-xl flex items-center gap-1.5 shadow-md border font-sans font-black text-[9px] uppercase tracking-wider transition duration-150 active:scale-95 cursor-pointer ${
              darkMode 
                ? 'bg-zinc-900/98 border-zinc-800 hover:bg-zinc-800 text-[#13AA52]' 
                : 'bg-white/98 border-gray-150 hover:bg-gray-50 text-[#13AA52]'
            }`}
          >
            <Compass className="w-3.5 h-3.5 animate-spin-slow text-[#13AA52]" />
            Navigate to Busy Area
          </button>
        )}

        {/* Recenter Map Button */}
        {isOnline && (
          <button
            onClick={() => {
              const currentLatLng = L.latLng(currentPosition.lat, currentPosition.lon);
              mapRef.current?.setView(currentLatLng, 15, { animate: true });
              
              // Temporary feedback sound/effect
              if (window.dispatchEvent) {
                window.dispatchEvent(new CustomEvent('play-sound', { detail: 'tap' }));
              }
            }}
            className={`w-9 h-9 rounded-full flex items-center justify-center shadow-md border transition duration-150 active:scale-95 cursor-pointer self-end ${
              darkMode 
                ? 'bg-zinc-900/98 border-zinc-800 hover:bg-zinc-800 text-[#13AA52]' 
                : 'bg-white/98 border-gray-150 hover:bg-gray-50 text-[#13AA52]'
            }`}
            title="Recenter Map"
          >
            <Target className="w-4.5 h-4.5 text-[#13AA52]" />
          </button>
        )}
      </div>
    </div>
  );
};
