import React, { useEffect, useRef, useState, useMemo } from 'react';
import { TripProgress, RideRequest, DriverStats } from '../types';
import L from 'leaflet';
import { MapPin, Navigation, Zap, Compass, Target, ShieldCheck, CheckCircle2, User, Sliders, Radio, Globe, ArrowRight, Play, Volume2, VolumeX, Battery, BatteryCharging, RefreshCw, ArrowUp, CornerUpLeft, CornerUpRight, Award, BarChart2, Plane, ChevronRight, ChevronDown, Clock, Plus, Minus, Search, Sparkles, Check, Mail, X, Flame, Info } from 'lucide-react';
import { SwipeButton } from './SwipeButton';

interface MapSimulatorProps {
  tripProgress: TripProgress;
  isOnline: boolean;
  surgeLevel: 'low' | 'medium' | 'high';
  onSpawnRideFromZone?: (multiplier: number, areaName: string, coords: { x: number; y: number }) => void;
  mode?: 'taxi' | 'food' | 'courier';
  realCoords: { lat: number; lon: number; accuracy: number; address: string } | null;
  useRealGPS: boolean;
  darkMode: boolean;
  simulateWandering: boolean;
  currentCity?: string;
  faceVerified?: boolean;
  insuranceVerified?: boolean;
  onSetOnline?: (online: boolean) => void;
  boltCategories?: string[];
  setActiveTab?: (tab: 'home' | 'earnings' | 'activity' | 'inbox' | 'profile') => void;
  stats?: DriverStats;
  onSetMode?: (mode: 'taxi' | 'food') => void;
  onSetCurrentCity?: (city: string) => void;
  onSetMenuSubScreen?: (screen: string) => void;
  selectedPeak?: 'breakfast' | 'lunch' | 'dinner' | 'offpeak';
}

// Logical surge coordinates relative to the 400x500 virtual grid
const SURGE_ZONES_OFFSET = [
  { id: 'london-city', name: 'City of London', x: 200, y: 160, radius: 110, multiplier: 2.3 },
  { id: 'london-brixton', name: 'Brixton', x: 220, y: 340, radius: 120, multiplier: 2.1 },
  { id: 'london-stratford', name: 'Stratford', x: 330, y: 100, radius: 100, multiplier: 1.8 },
  { id: 'london-canary', name: 'Canary Wharf', x: 340, y: 220, radius: 90, multiplier: 1.7 },
  { id: 'london-kensington', name: 'Kensington', x: 80, y: 220, radius: 100, multiplier: 1.6 },
  { id: 'london-wandsworth', name: 'Wandsworth', x: 100, y: 360, radius: 85, multiplier: 1.1 }
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
  faceVerified = false,
  insuranceVerified = false,
  onSetOnline,
  boltCategories = [],
  setActiveTab,
  stats,
  onSetMode,
  onSetCurrentCity,
  onSetMenuSubScreen,
  selectedPeak = 'dinner',
}) => {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Cockpit telemetry state variables
  const [speed, setSpeed] = useState<number>(0);
  const [speedLimit, setSpeedLimit] = useState<number>(30);
  const [evBattery, setEvBattery] = useState<number>(() => {
    const saved = localStorage.getItem('swift_ev_battery');
    return saved ? parseFloat(saved) : 88.5;
  });
  const [isCharging, setIsCharging] = useState<boolean>(false);
  const [voiceMuted, setVoiceMuted] = useState<boolean>(() => {
    return localStorage.getItem('swift_navigator_voice_muted') === 'true';
  });
  const [lastSpokenStep, setLastSpokenStep] = useState<string>('');

  useEffect(() => {
    localStorage.setItem('swift_ev_battery', evBattery.toFixed(1));
  }, [evBattery]);

  useEffect(() => {
    localStorage.setItem('swift_navigator_voice_muted', String(voiceMuted));
  }, [voiceMuted]);

  // Special Bolt features: Peak Hours modal, Airport Queue modal, and City selector
  const [showPeakModal, setShowPeakModal] = useState<boolean>(false);
  const [showAirportQueueModal, setShowAirportQueueModal] = useState<boolean>(false);
  const [isJoinedQueue, setIsJoinedQueue] = useState<boolean>(false);
  const [queueProgress, setQueueProgress] = useState<number>(14);
  const [showCityDropdown, setShowCityDropdown] = useState<boolean>(false);

  // Airport Virtual Queue countdown interval helper
  useEffect(() => {
    if (!isJoinedQueue || !showAirportQueueModal) return;

    const interval = setInterval(() => {
      setQueueProgress(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          // Auto trigger airport dispatch ride!
          if (window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('add-simulation-log', {
              detail: { text: "✈️ Virtual queue position #1! Loading incoming premium Heathrow Airport dispatch offer...", type: "success" }
            }));
            window.dispatchEvent(new CustomEvent('play-sound', { detail: 'complete' }));
          }
          // After 2 seconds, trigger a ride spawn!
          setTimeout(() => {
            if (onSetOnline) onSetOnline(true);
            setTimeout(() => {
              if (onSpawnRideFromZone) {
                onSpawnRideFromZone(2.4, "Heathrow Terminal 5", { x: 310, y: 380 });
              }
            }, 600);
            setShowAirportQueueModal(false);
            setIsJoinedQueue(false);
          }, 2000);
          return 1;
        }
        
        // Decrement rank
        const dec = Math.floor(Math.random() * 2) + 1;
        if (window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('add-simulation-log', {
            detail: { text: `✈️ Virtual Heathrow Queue progress: position #${Math.max(1, prev - dec)}`, type: "info" }
          }));
          window.dispatchEvent(new CustomEvent('play-sound', { detail: 'tap' }));
        }
        return Math.max(1, prev - dec);
      });
    }, 4500);

    return () => clearInterval(interval);
  }, [isJoinedQueue, showAirportQueueModal, onSpawnRideFromZone, onSetOnline]);

  // Drain EV battery as navigation progress advances
  const prevNavProgressRef = useRef<number>(0);
  useEffect(() => {
    const { stage, navigationProgress } = tripProgress;
    if (isOnline && (stage === 'to_pickup' || stage === 'to_destination')) {
      if (navigationProgress !== prevNavProgressRef.current) {
        setEvBattery(prev => {
          const next = Math.max(1, prev - 0.08); // small battery depletion
          return parseFloat(next.toFixed(1));
        });
        prevNavProgressRef.current = navigationProgress;
      }
    }
  }, [tripProgress.navigationProgress, tripProgress.stage, isOnline]);

  // Handle EV Charging cycle animation
  useEffect(() => {
    if (!isCharging) return;
    
    const interval = setInterval(() => {
      setEvBattery(prev => {
        if (prev >= 100) {
          setIsCharging(false);
          if (window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('add-simulation-log', {
              detail: { text: "🔋 EV Supercharger completed! Battery capacity calibrated at 100%.", type: "success" }
            }));
            window.dispatchEvent(new CustomEvent('play-sound', { detail: 'complete' }));
          }
          return 100;
        }
        return Math.min(100, prev + 2.5); // rapid charge +2.5% per tick
      });
    }, 150);

    return () => clearInterval(interval);
  }, [isCharging]);

  // Speedometer simulator drifting
  useEffect(() => {
    const { stage } = tripProgress;
    if (!isOnline || stage === 'idle' || stage === 'arrived_pickup' || stage === 'arrived_destination' || isCharging) {
      setSpeed(0);
      return;
    }

    const interval = setInterval(() => {
      setSpeed(() => {
        const baseSpeed = stage === 'to_pickup' ? 24 : 32;
        const speedLimitVal = stage === 'to_pickup' ? 20 : 30;
        setSpeedLimit(speedLimitVal);
        const drift = (Math.random() * 8 - 4);
        return Math.max(5, Math.round(baseSpeed + drift));
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOnline, tripProgress.stage, isCharging]);

  // Compute Turn Instructions based on active city and progress ratio
  const activeNavigationStep = useMemo(() => {
    const { stage, currentRide, navigationProgress } = tripProgress;
    if (!isOnline || !currentRide || stage === 'idle' || stage === 'offering') {
      return null;
    }

    const normCity = currentCity.trim().toLowerCase();
    const cityStreets = normCity === 'london'
      ? ['Regent Street', 'The Mall', 'Charing Cross Road', 'Piccadilly Circus', 'Park Lane', 'Oxford Street', 'Shaftesbury Avenue', 'Baker Street']
      : normCity === 'birmingham'
      ? ['Broad Street', 'Corporation Street', 'New Street', 'Hagley Road', 'Bristol Road', 'Colmore Row']
      : ['High Street', 'Station Road', 'Church Street', 'London Road', 'Victoria Road', 'The Avenue'];

    const routeSeed = currentRide.passengerName ? currentRide.passengerName.charCodeAt(0) : 0;
    const st1 = cityStreets[routeSeed % cityStreets.length];
    const st2 = cityStreets[(routeSeed + 2) % cityStreets.length];
    const st3 = cityStreets[(routeSeed + 4) % cityStreets.length];

    const isPickup = stage === 'to_pickup' || stage === 'arrived_pickup';
    const targetDest = isPickup ? currentRide.pickupAddress : currentRide.dropoffAddress;

    if (stage === 'arrived_pickup') {
      return {
        text: `Arrived at pickup location`,
        sub: `Waiting for passenger ${currentRide.passengerName}`,
        type: 'arrive',
        distanceText: '0m',
      };
    }

    if (navigationProgress < 30) {
      const remainingDist = Math.max(40, Math.round((30 - navigationProgress) * 7.5));
      return {
        text: `Turn right onto ${st1}`,
        sub: `Head toward ${isPickup ? 'pickup node' : 'destination sector'}`,
        type: 'right',
        distanceText: `${remainingDist}m`,
      };
    } else if (navigationProgress < 65) {
      const remainingDist = Math.max(30, Math.round((65 - navigationProgress) * 8.5));
      return {
        text: `At roundabout, take exit onto ${st2}`,
        sub: `Simulated traffic flows green`,
        type: 'roundabout',
        distanceText: `${remainingDist}m`,
      };
    } else if (navigationProgress < 90) {
      const remainingDist = Math.max(20, Math.round((90 - navigationProgress) * 6));
      return {
        text: `Continue straight on ${st3}`,
        sub: `Nearing target geospatial coordinates`,
        type: 'straight',
        distanceText: `${remainingDist}m`,
      };
    } else {
      return {
        text: `Arriving shortly at ${targetDest}`,
        sub: `Prepare to decelerate near final curb`,
        type: 'arrive',
        distanceText: 'Soon',
      };
    }
  }, [isOnline, tripProgress, currentCity]);

  // Trigger verbal voice synthesis guidance assistant
  useEffect(() => {
    if (activeNavigationStep && activeNavigationStep.text !== lastSpokenStep && !voiceMuted && !isCharging) {
      setLastSpokenStep(activeNavigationStep.text);
      if ('speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(activeNavigationStep.text);
          utterance.rate = 1.05;
          utterance.pitch = 1.05;
          window.speechSynthesis.speak(utterance);
        } catch (e) {
          console.log('Speech synthetics interrupted', e);
        }
      }
    }
  }, [activeNavigationStep, lastSpokenStep, voiceMuted, isCharging]);
  
  // Custom Leaflet objects referencing active simulation layer maps
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const pickupPinRef = useRef<L.Marker | null>(null);
  const dropoffPinRef = useRef<L.Marker | null>(null);
  const surgeCirclesRef = useRef<Map<string, { circle: L.Circle; pulse: L.Circle; marker?: L.Marker }>>(new Map());
  const labelMarkersRef = useRef<L.Marker[]>([]);

  // Toggle state for the premium Heat Map Details sidebar/drawer
  const [isHeatMapPanelOpen, setIsHeatMapPanelOpen] = useState(false);

  // Sine/Cosine variables for idle wandering simulation
  const [wanderAngle, setWanderAngle] = useState(0);
  const [simulationAnchor, setSimulationAnchor] = useState<{ lat: number; lon: number } | null>(null);

  // Dynamically map surge zone names matching the active city
  const mappedSurgeZones = useMemo(() => {
    const normCity = currentCity.trim().toLowerCase();
    
    if (normCity === 'london') return SURGE_ZONES_OFFSET;
    
    let localizedNames = [
      'High Street Core',
      'Central Boulevard',
      'Commercial Hub',
      'Station Side',
      'West End Quarter',
      'North Side Gate'
    ];
    if (normCity === 'birmingham') {
      localizedNames = ['Bullring Core', 'Broad Street', 'Mailbox Plaza', 'Digbeth Creative', 'Edgbaston High', 'Aston Quarter'];
    } else if (normCity === 'nottingham') {
      localizedNames = ['Lace Market', 'Hockley Square', 'Old Market Centre', 'Trent Bridge', 'Wollaton Park', 'Beeston Central'];
    } else if (normCity === 'manchester') {
      localizedNames = ['Spinningfields', 'Northern Quarter', 'MediaCity Basin', 'Ancoats Core', 'Chorlton West', 'Didsbury Heights'];
    } else if (normCity === 'leeds') {
      localizedNames = ['Briggate Core', 'Headingley Quarter', 'Trinity Hub', 'Clarence Dock', 'University Area', 'Roundhay Park'];
    } else {
      localizedNames = [
        `${currentCity} Centre`,
        `${currentCity} West End`,
        `${currentCity} North`,
        `${currentCity} Harbour`,
        `${currentCity} Financial`,
        `${currentCity} Quarter`
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

  // Sync Surge Heat Hot Zones & District Labels atop Leaflet Map
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

    // Clear old neighbourhood text labels and road shields
    labelMarkersRef.current.forEach((m) => m.remove());
    labelMarkersRef.current = [];

    if (!isOnline) return;

    // Add high-fidelity real-time district labels and major signs
    const normCity = currentCity.trim().toLowerCase();
    
    let cityLabels = [
      { name: 'WEST END Soho', x: 200, y: 120 },
      { name: 'FINANCIAL CORE', x: 90, y: 280 },
      { name: 'KENSINGTON HIGH', x: 100, y: 100 }
    ];
    let cityShields = [
      { name: 'A401', x: 190, y: 100 },
      { name: 'A1', x: 270, y: 110 }
    ];

    if (normCity === 'london') {
      cityLabels = [
        { name: 'WEMBLEY', x: 40, y: 80 },
        { name: 'HOLLOWAY', x: 240, y: 80 },
        { name: 'STRATFORD', x: 370, y: 110 },
        { name: 'NOTTING HILL', x: 50, y: 160 },
        { name: 'CITY OF LONDON', x: 250, y: 170 },
        { name: 'CANARY WHARF', x: 385, y: 220 },
        { name: 'BRIXTON', x: 220, y: 340 },
        { name: 'WANDSWORTH', x: 105, y: 360 }
      ];
      cityShields = [
        { name: 'A406', x: 110, y: 60 },
        { name: 'A40', x: 40, y: 125 },
        { name: 'A11', x: 360, y: 70 },
        { name: 'A1', x: 270, y: 110 },
        { name: 'A2', x: 350, y: 320 },
        { name: 'A3', x: 50, y: 330 },
        { name: 'A205', x: 155, y: 440 }
      ];
    } else if (normCity === 'birmingham') {
      cityLabels = [
        { name: 'ASTON', x: 100, y: 80 },
        { name: 'BULLRING', x: 250, y: 175 },
        { name: 'DIGBETH', x: 220, y: 340 },
        { name: 'EDGBASTON', x: 80, y: 220 },
        { name: 'SUTTON COLDFIELD', x: 330, y: 100 }
      ];
      cityShields = [
        { name: 'A38', x: 270, y: 110 },
        { name: 'A45', x: 350, y: 320 },
        { name: 'M6', x: 40, y: 80 }
      ];
    } else if (normCity === 'manchester') {
      cityLabels = [
        { name: 'SALFORD', x: 60, y: 80 },
        { name: 'SPINNINGFIELDS', x: 250, y: 170 },
        { name: 'ANCOATS', x: 330, y: 100 },
        { name: 'DIDSBURY', x: 220, y: 340 },
        { name: 'CHORLTON', x: 80, y: 220 }
      ];
      cityShields = [
        { name: 'M60', x: 110, y: 60 },
        { name: 'A56', x: 270, y: 110 },
        { name: 'A57', x: 350, y: 320 }
      ];
    }

    // Render district typography labels in capital modern format
    cityLabels.forEach((label) => {
      const latLng = getLatLngFromXY(label.x, label.y);
      const labelHtml = `
        <div class="text-[7.5px] uppercase font-black font-sans tracking-[0.14em] select-none text-[#8d909c] dark:text-zinc-550 whitespace-nowrap opacity-85" style="text-shadow: 0 1px 2px rgba(0,0,0,0.4)">
          ${label.name}
        </div>
      `;
      const marker = L.marker(latLng, {
        icon: L.divIcon({
          html: labelHtml,
          className: 'clear-div-icon',
          iconSize: [120, 16],
          iconAnchor: [60, 8]
        }),
        interactive: false
      }).addTo(mapObj);
      labelMarkersRef.current.push(marker);
    });

    // Render UK standard Ax route sign shields
    cityShields.forEach((shield) => {
      const latLng = getLatLngFromXY(shield.x, shield.y);
      const shieldHtml = `
        <div class="bg-emerald-950/80 border border-emerald-500/35 text-[5.8px] font-mono font-black text-emerald-400 px-1 py-0.5 rounded leading-none whitespace-nowrap shadow-xs select-none">
          ${shield.name}
        </div>
      `;
      const marker = L.marker(latLng, {
        icon: L.divIcon({
          html: shieldHtml,
          className: 'clear-div-icon',
          iconSize: [26, 12],
          iconAnchor: [13, 6]
        }),
        interactive: false
      }).addTo(mapObj);
      labelMarkersRef.current.push(marker);
    });

    // Render multi-layered heat maps & pricing speech bubble capsules
    mappedSurgeZones.forEach((zone) => {
      const zoneLatLng = getLatLngFromXY(zone.x, zone.y);
      const mult = surgeLevel === 'high' ? zone.multiplier : surgeLevel === 'medium' ? Math.max(1.1, +(zone.multiplier * 0.7).toFixed(1)) : 1.0;

      if (mult <= 1.0) return; // Hide standard multiplier spots

      // Determine colors matching the standard Heat Map guidelines
      let surgeColor = '#10B981'; // Low Mint Green
      let badgeColorClass = 'bg-[#13AA52] border-emerald-400 text-[#13AA52]';

      if (mult >= 2.0) {
        surgeColor = '#EF4444'; // Red-Crimson
        badgeColorClass = 'bg-[#ea4335] border-[#ea4335] text-[#ea4335]';
      } else if (mult >= 1.5) {
        surgeColor = '#F97316'; // Deep Orange
        badgeColorClass = 'bg-[#f97316] border-[#f97316] text-[#f97316]';
      } else if (mult >= 1.2) {
        surgeColor = '#F59E0B'; // Amber Core
        badgeColorClass = 'bg-[#f59e0b] border-[#f59e0b] text-[#f59e0b]';
      }

      // 1. Layered Gaussian Heat Gradient - Outer Faint Glow
      const mainCircle = L.circle(zoneLatLng, {
        radius: zone.radius * 1.8,
        color: surgeColor,
        weight: 0,
        fillColor: surgeColor,
        fillOpacity: darkMode ? 0.05 : 0.03,
      }).addTo(mapObj);

      // 2. Layered Gaussian Heat Gradient - Medium Glow
      const pulseCircle = L.circle(zoneLatLng, {
        radius: zone.radius * 1.1,
        color: surgeColor,
        weight: 0,
        fillColor: surgeColor,
        fillOpacity: darkMode ? 0.13 : 0.08,
      }).addTo(mapObj);

      // 3. Layered Gaussian Heat Gradient - Central Core Glow
      const coreCircle = L.circle(zoneLatLng, {
        radius: zone.radius * 0.5,
        color: surgeColor,
        weight: 0,
        fillColor: surgeColor,
        fillOpacity: darkMode ? 0.30 : 0.19,
      }).addTo(mapObj);

      // Speech bubble multiplier badge matching the Bolt visual guidelines
      const bgClass = badgeColorClass.split(' ')[0];
      const borderClass = badgeColorClass.split(' ')[1];
      const textClass = badgeColorClass.split(' ')[2];

      const badgeHtml = `
        <div class="cursor-pointer flex flex-col items-center select-none transform hover:scale-110 active:scale-95 transition-all duration-150">
          <div class="${bgClass} border ${borderClass} text-white font-sans font-black text-[9.5px] px-2.5 py-0.5 rounded-full shadow-md flex items-center justify-center gap-0.5 border-white/20">
            <span class="leading-none text-shadow-xs">${mult.toFixed(1)}x</span>
          </div>
          <div class="w-1.5 h-1 border-t-[4px] border-r-[3.5px] border-l-[3.5px] border-transparent ${textClass.replace('text-', 'border-t-')} -mt-[1px]"></div>
        </div>
      `;

      const badgeMarker = L.marker(zoneLatLng, {
        icon: L.divIcon({
          html: badgeHtml,
          className: 'clear-div-icon',
          iconSize: [42, 18],
          iconAnchor: [21, 14]
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

      // Automatically clean up coreCircle and extra rings by storing references if needed or adding them to Map Ref
      // By storing them as children inside the main circle structure
      (mainCircle as any).coreCircle = coreCircle;
    });

  }, [isOnline, surgeLevel, darkMode, anchorLat, anchorLon, mappedSurgeZones, currentCity]);

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

      {!isOnline && (
        <>
          {/* Top Floating Status toggle capsule */}
          <div className="absolute top-4 left-4 right-4 z-20 mx-auto max-w-sm bg-white dark:bg-zinc-950 px-4 py-3 border border-gray-150 dark:border-zinc-850 rounded-3xl flex items-center justify-between shadow-xl transition-all duration-300 transform animate-in slide-in-from-top-4 duration-300 pointer-events-auto">
            {/* Pulsing indicator bullet for inactive state */}
            <div className="flex h-5 w-5 relative items-center justify-center mr-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
            </div>

            {/* Offline details text */}
            <div className="flex-1 text-left min-w-0">
              <span className="text-gray-900 dark:text-zinc-50 text-[13px] font-black block tracking-tight">Offline</span>
              <span className="text-[10px] text-gray-500 dark:text-zinc-400 block truncate mt-0.5 font-bold font-sans leading-none">
                Go online to start receiving trips
              </span>
            </div>

            {/* Settings Slider Trigger */}
            <button 
              onClick={() => {
                if (window.dispatchEvent) window.dispatchEvent(new CustomEvent('play-sound', { detail: 'tap' }));
                setActiveTab?.('profile');
                onSetMenuSubScreen?.('categories');
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-zinc-900 text-gray-700 dark:text-zinc-350 transition shrink-0 border-0 bg-transparent cursor-pointer"
              title="Active Booking Tiers"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>

          {/* Draggable/Swipable Bottom Sheet Drawer */}
          <div className="absolute bottom-0 left-0 right-0 z-20 rounded-t-[28px] border-t bg-white/95 dark:bg-zinc-950/98 dark:border-zinc-850 p-4 pb-6 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] flex flex-col pointer-events-auto w-full max-w-sm mx-auto md:bottom-2 md:rounded-3xl md:border">
            {/* Pull Bar Indicator */}
            <div className="w-10 h-1 bg-gray-200 dark:bg-zinc-850 rounded-full mx-auto mb-3" />

            {/* Today's earnings row link */}
            <div 
              onClick={() => {
                if (window.dispatchEvent) window.dispatchEvent(new CustomEvent('play-sound', { detail: 'tap' }));
                setActiveTab?.('earnings');
              }}
              className="flex items-center justify-between cursor-pointer group mb-1"
            >
              <span className="text-[9.5px] font-extrabold uppercase text-gray-400 tracking-wider font-sans group-hover:text-gray-600 dark:group-hover:text-zinc-300 transition-colors">
                Today's earnings
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:translate-x-0.5 transition duration-150" />
            </div>

            {/* Main Balance display */}
            <div className="flex items-baseline mb-3.5 text-left select-text">
              <span className="text-xl font-bold font-sans text-gray-905 dark:text-zinc-50 mr-0.5">£</span>
              <span className="text-3.5xl font-black tracking-tight text-gray-905 dark:text-zinc-50 font-mono leading-none">
                {(stats?.todayEarnings ?? 0).toFixed(2)}
              </span>
            </div>

            {/* Grid Matrix microdashboard */}
            <div className="grid grid-cols-3 gap-1 py-2.5 border-y border-gray-100 dark:border-zinc-900 text-center select-none bg-gray-50/10 dark:bg-transparent mb-3.5">
              <div className="flex flex-col animate-in fade-in duration-150">
                <span className="text-gray-905 dark:text-zinc-150 font-black font-mono text-sm leading-none">
                  {stats?.completedTripsCount ?? 0}
                </span>
                <span className="text-gray-400 text-[8px] font-extrabold uppercase mt-1 tracking-wide leading-none font-sans">Trips</span>
              </div>
              <div className="flex flex-col border-x border-gray-100 dark:border-zinc-900 animate-in fade-in duration-200">
                <span className="text-gray-905 dark:text-zinc-150 font-black font-mono text-sm leading-none col-span-1">
                  {stats ? `${Math.floor(stats.hoursOnline)}h ${Math.round((stats.hoursOnline % 1) * 60)}m` : '0h 0m'}
                </span>
                <span className="text-gray-400 text-[8px] font-extrabold uppercase mt-1 tracking-wide leading-none font-sans">Online time</span>
              </div>
              <div className="flex flex-col animate-in fade-in duration-250">
                <span className="text-[#13AA52] font-black font-mono text-sm leading-none font-sans font-extrabold">
                  {(stats?.completedTripsCount ?? 0) * 15}
                </span>
                <span className="text-gray-400 text-[8px] font-extrabold uppercase mt-1 tracking-wide leading-none font-sans">Points</span>
              </div>
            </div>

            {/* Opportunities Heading */}
            <div className="flex items-center justify-between mb-2 select-none">
              <span className="text-xs font-black tracking-tight text-gray-900 dark:text-zinc-50 font-sans">Opportunities</span>
              <span 
                onClick={() => {
                  if (window.dispatchEvent) window.dispatchEvent(new CustomEvent('play-sound', { detail: 'tap' }));
                  setActiveTab?.('profile');
                  onSetMenuSubScreen?.('quests');
                }}
                className="text-[9.5px] text-[#13AA52] hover:underline font-extrabold cursor-pointer uppercase tracking-wider font-sans border-0 bg-transparent p-0"
              >
                See all
              </span>
            </div>

            {/* Horizontally scrolling opportunities carousel */}
            <div className="flex items-center gap-2 overflow-x-auto pb-3 w-full scrollbar-none flex-nowrap mb-3.5">
              
              {/* Card 1: Weekly bonus */}
              <div 
                onClick={() => {
                  if (window.dispatchEvent) {
                    window.dispatchEvent(new CustomEvent('play-sound', { detail: 'chime' }));
                  }
                  setActiveTab?.('profile');
                  onSetMenuSubScreen?.('quests');
                }}
                className="flex-1 min-w-[130px] p-2.5 rounded-2xl border border-emerald-500/10 dark:border-emerald-500/5 bg-emerald-500/5 hover:bg-emerald-500/10 dark:bg-emerald-500/[5%] transition duration-150 cursor-pointer text-left focus:outline-none"
              >
                <div className="w-6.5 h-6.5 rounded-lg bg-[#13AA52]/10 flex items-center justify-center text-[#13AA52] mb-2">
                  <Award className="w-4 h-4 text-emerald-500" />
                </div>
                <span className="text-[10px] font-black block text-gray-900 dark:text-zinc-50 leading-none">Weekly bonus</span>
                <span className="text-[7.5px] text-[#13AA52] font-extrabold mt-1.5 block tracking-wide font-sans">Earn up to £120 ➔</span>
              </div>

              {/* Card 2: Peak hours graph trigger */}
              <div 
                onClick={() => {
                  if (window.dispatchEvent) window.dispatchEvent(new CustomEvent('play-sound', { detail: 'tap' }));
                  setShowPeakModal(true);
                }}
                className="flex-1 min-w-[130px] p-2.5 rounded-2xl border border-amber-500/10 dark:border-amber-500/5 bg-amber-500/5 hover:bg-amber-500/10 transition duration-150 cursor-pointer text-left focus:outline-none"
              >
                <div className="w-6.5 h-6.5 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 mb-2">
                  <BarChart2 className="w-4 h-4 text-amber-500" />
                </div>
                <span className="text-[10px] font-black block text-gray-900 dark:text-zinc-50 leading-none">Peak hours</span>
                <span className="text-[7.5px] text-amber-600 font-extrabold mt-1.5 block tracking-wide font-sans">See busy times ➔</span>
              </div>

              {/* Card 3: Airport virtual queue board */}
              <div 
                onClick={() => {
                  if (window.dispatchEvent) window.dispatchEvent(new CustomEvent('play-sound', { detail: 'tap' }));
                  setShowAirportQueueModal(true);
                }}
                className="flex-1 min-w-[130px] p-2.5 rounded-2xl border border-purple-500/10 dark:border-purple-500/5 bg-purple-500/5 hover:bg-purple-500/10 transition duration-150 cursor-pointer text-left focus:outline-none"
              >
                <div className="w-6.5 h-6.5 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500 mb-2">
                  <Plane className="w-4 h-4 text-purple-500" />
                </div>
                <span className="text-[10px] font-black block text-gray-900 dark:text-zinc-50 leading-none">Airport queues</span>
                <span className="text-[7.5px] text-purple-600 font-extrabold mt-1.5 block tracking-wide font-sans">Heathrow Terminal ➔</span>
              </div>
            </div>

            {/* Service Filter Toggles: Bolt | Food | Courier */}
            <div className="bg-gray-100/70 dark:bg-zinc-900/60 p-1 rounded-2xl grid grid-cols-3 gap-1 mb-4 select-none mt-1 border dark:border-zinc-800">
              {(['taxi', 'food', 'courier'] as const).map((profile) => {
                const isActive = profile === 'courier' ? false : (mode === profile);
                return (
                  <button
                    key={profile}
                    type="button"
                    onClick={() => {
                      if (window.dispatchEvent) window.dispatchEvent(new CustomEvent('play-sound', { detail: 'tap' }));
                      
                      if (profile === 'courier') {
                        if (window.dispatchEvent) {
                          window.dispatchEvent(new CustomEvent('add-simulation-log', {
                            detail: { text: "📦 Courier dispatch profile loaded. Priority document delivery activated on central network.", type: "info" }
                          }));
                        }
                      } else if (onSetMode) {
                        onSetMode(profile);
                      }
                    }}
                    className={`py-1.5 text-[9.5px] font-black text-center rounded-xl font-sans transition py-1 border-0 ${
                      isActive
                        ? 'bg-[#13AA52] text-white shadow-md'
                        : 'text-gray-550 hover:text-gray-800 dark:text-zinc-400 dark:hover:text-zinc-200 bg-transparent font-bold'
                    }`}
                  >
                    {profile === 'taxi' ? 'Bolt' : profile === 'food' ? 'Food' : 'Courier'}
                  </button>
                );
              })}
            </div>

            {/* Click to Go Online Button */}
            <div className="w-full">
              <button
                onClick={() => {
                  if (window.dispatchEvent) {
                    window.dispatchEvent(new CustomEvent('play-sound', { detail: 'complete' }));
                    window.dispatchEvent(new CustomEvent('add-simulation-log', {
                      detail: { text: "⚡ Driver connecting... Handshaking dispatch servers. Status ACTIVE", type: "success" }
                    }));
                  }
                  onSetOnline?.(true);
                }}
                className="w-full py-3.5 bg-[#13AA52] hover:bg-[#0f8f44] text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-md active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer border-0"
              >
                <div className="w-2 h-2 rounded-full bg-white animate-ping" />
                Go Online
              </button>
            </div>
          </div>
        </>
      )}

      {/* MODAL 1: EXTREME PEAK HOURS VISUAL CHART OVERLAY */}
      {showPeakModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-xs p-4 animate-in fade-in duration-205 pointer-events-auto">
          <div className={`w-full max-w-sm rounded-[24px] border p-4 shadow-2xl animate-in zoom-in-95 duration-200 text-left ${
            darkMode ? 'bg-zinc-900 border-zinc-805 text-zinc-100' : 'bg-white border-gray-150 text-gray-900'
          }`}>
            <div className="flex items-center justify-between border-b pb-2 mb-3 dark:border-zinc-800 font-sans">
              <div className="flex items-center gap-1.5">
                <BarChart2 className="w-4.5 h-4.5 text-amber-500 animate-bounce" />
                <h4 className="text-[12.5px] font-black uppercase tracking-wide">Predictive Peak Hours</h4>
              </div>
              <button 
                onClick={() => {
                  if (window.dispatchEvent) window.dispatchEvent(new CustomEvent('play-sound', { detail: 'tap' }));
                  setShowPeakModal(false);
                }}
                className={`w-6.5 h-6.5 rounded-full flex items-center justify-center border-0 text-[11px] font-black ${
                  darkMode ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-gray-100 hover:bg-gray-205 text-gray-500'
                }`}
              >
                ✕
              </button>
            </div>

            <p className="text-[10px] text-gray-550 dark:text-zinc-400 font-medium mb-4 leading-normal font-sans">
              High surge multipliers trigger heavy ridership demand. Tap any spike segment below to temporarily inject instant peak pricing!
            </p>

            {/* Custom Interactive Vertical Bar chart */}
            <div className="h-32 flex items-end justify-between px-2 pt-4 border-b dark:border-zinc-800 relative mb-4 select-none">
              {[
                { time: "08:00", multiplier: 1.8, label: "MORN SPURT", color: "bg-amber-500" },
                { time: "12:00", multiplier: 1.4, label: "LUNCH CRUSH", color: "bg-emerald-500" },
                { time: "17:00", multiplier: 2.2, label: "RUSH HOUR", color: "bg-rose-550 animate-pulse" },
                { time: "21:00", multiplier: 1.6, label: "NIGHT FERRY", color: "bg-purple-550" }
              ].map((item, idx) => {
                const heightVal = (item.multiplier / 2.5) * 100;
                return (
                  <div 
                    key={idx} 
                    onClick={() => {
                      if (window.dispatchEvent) {
                        window.dispatchEvent(new CustomEvent('play-sound', { detail: 'chime' }));
                        window.dispatchEvent(new CustomEvent('add-simulation-log', {
                          detail: { text: `🔥 Simulated pricing adjustments: ${item.label} active! Surge is set to ${item.multiplier}x`, type: "warn" }
                        }));
                      }
                      setShowPeakModal(false);
                    }}
                    className="flex flex-col items-center flex-1 cursor-pointer group hover:scale-105 transition-all"
                  >
                    <span className="text-[8px] font-black font-mono text-[#13AA52] mb-1 opacity-100">
                      +{item.multiplier}x
                    </span>
                    <div className="w-8 bg-gray-100/50 dark:bg-zinc-800 rounded-t-lg h-20 flex items-end justify-center overflow-hidden">
                      <div className={`w-full rounded-t-md transition-all ${item.color}`} style={{ height: `${heightVal}%` }} />
                    </div>
                    <span className="text-[8.5px] font-black mt-2 font-mono">{item.time}</span>
                  </div>
                );
              })}
            </div>

            <div className={`p-2.5 rounded-xl border flex items-center gap-2 text-[9px] font-bold leading-normal font-sans/80 ${
              darkMode ? 'bg-zinc-950/50 border-zinc-805 text-zinc-400' : 'bg-gray-50 border-gray-150 text-gray-505'
            }`}>
              <Zap className="w-4 h-4 text-amber-500 fill-amber-500/20 shrink-0" />
              <span>Highest weekend payout occurs during 17:00 Rush (x2.2 multiplier active in central zones).</span>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: HEATHROW AIRPORT DISPATCH CONTROL BOARD & VIRTUAL QUEUE */}
      {showAirportQueueModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-xs p-4 animate-in fade-in duration-200 pointer-events-auto">
          <div className={`w-full max-w-sm rounded-[24px] border p-4 shadow-2xl animate-in zoom-in-95 duration-200 text-left ${
            darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-gray-150 text-gray-905'
          }`}>
            <div className="flex items-center justify-between border-b pb-2 mb-3 dark:border-zinc-800 font-sans">
              <div className="flex items-center gap-1.5">
                <Plane className="w-4.5 h-4.5 text-[#13AA52] animate-pulse" />
                <h4 className="text-[12.5px] font-black uppercase tracking-wide">Airport Dispatch Dashboard</h4>
              </div>
              <button 
                onClick={() => {
                  if (window.dispatchEvent) window.dispatchEvent(new CustomEvent('play-sound', { detail: 'tap' }));
                  setShowAirportQueueModal(false);
                }}
                className={`w-6.5 h-6.5 rounded-full flex items-center justify-center border-0 text-[11px] font-black ${
                  darkMode ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'
                }`}
              >
                ✕
              </button>
            </div>

            {/* Airport details */}
            <div className="flex items-center justify-between mb-3 bg-gray-50 dark:bg-zinc-950/50 p-2.5 rounded-xl border dark:border-zinc-850 font-sans">
              <div className="text-left font-sans text-xs">
                <span className="text-[7.5px] font-mono font-black uppercase text-gray-400">ACTIVE REGION</span>
                <span className="text-[11.5px] font-black block mt-0.5 whitespace-nowrap">London Heathrow Airport</span>
              </div>
              <div className="text-right font-sans text-xs">
                <span className="text-[7.5px] font-mono font-black uppercase text-gray-400">QUEUED DRIVERS</span>
                <span className="text-[11.5px] text-[#13AA52] font-black block mt-0.5 font-mono">14 Waiting</span>
              </div>
            </div>

            {!isJoinedQueue ? (
              <>
                <p className="text-[10px] text-gray-505 dark:text-zinc-400 mb-3.5 leading-normal font-sans font-medium">
                  London Heathrow virtual taxi pen is active. Join the dispatch queue below to receive automatic high-fare airport long distance bookings!
                </p>

                <button
                  onClick={() => {
                    if (window.dispatchEvent) {
                      window.dispatchEvent(new CustomEvent('play-sound', { detail: 'complete' }));
                      window.dispatchEvent(new CustomEvent('add-simulation-log', {
                        detail: { text: "✈️ Checked in at Heathrow Virtual Queue pen! Position #14 assigned.", type: "info" }
                      }));
                    }
                    setIsJoinedQueue(true);
                    setQueueProgress(14);
                  }}
                  className="w-full py-3 bg-[#13AA52] hover:bg-[#0f8f44] text-white font-extrabold text-[11px] uppercase tracking-wider rounded-xl transition duration-155 border-0 cursor-pointer shadow-md font-sans"
                >
                  Join Virtual Queue
                </button>
              </>
            ) : (
              <div className="text-center py-2 font-sans">
                {/* Circular queue ticket */}
                <div className="w-18 h-18 rounded-full border-4 border-dashed border-[#13AA52] flex flex-col items-center justify-center mx-auto mb-3.5 relative animate-spin-slow">
                  <div className="absolute inset-0 flex flex-col items-center justify-center font-sans">
                    <span className="text-[8px] font-bold text-gray-400 uppercase leading-none">RANK</span>
                    <span className="text-lg font-mono font-black text-[#13AA52] mt-0.5">#{queueProgress}</span>
                  </div>
                </div>

                <p className="text-[10px] font-semibold text-gray-500 dark:text-zinc-350 leading-snug mb-4 max-w-[240px] mx-auto font-sans">
                  Connected! Your dispatch rank is progressing. Remain in the geo-fenced waiting zone to preserve priority.
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (window.dispatchEvent) {
                        window.dispatchEvent(new CustomEvent('play-sound', { detail: 'tap' }));
                        window.dispatchEvent(new CustomEvent('add-simulation-log', {
                          detail: { text: "✈️ Voluntarily exited Heathrow virtual queue.", type: "warning" }
                        }));
                      }
                      setIsJoinedQueue(false);
                    }}
                    className={`flex-1 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition font-sans ${
                      darkMode ? 'border-zinc-705 bg-zinc-800 text-zinc-350 hover:bg-zinc-750' : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Leave Queue
                  </button>
                  <button
                    onClick={() => {
                      // Instantly jump queue to #1
                      if (window.dispatchEvent) window.dispatchEvent(new CustomEvent('play-sound', { detail: 'complete' }));
                      setQueueProgress(1);
                    }}
                    className="flex-1 py-1.5 bg-purple-600 hover:bg-purple-705 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition border-0 cursor-pointer font-sans"
                  >
                    💳 Jump Queue (+£2)
                  </button>
                </div>
              </div>
            )}
          </div>
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
        <div className={`absolute top-2.5 left-2.5 right-2.5 border rounded-2xl p-3 flex items-center gap-3 shadow-lg animate-in fade-in slide-in-from-top-3 duration-250 z-10 transition-colors duration-250 ${
          darkMode ? 'bg-zinc-950/95 border-zinc-850 text-zinc-100 shadow-emerald-950/10' : 'bg-white border text-gray-900 border-gray-150/80 shadow-gray-200/50'
        }`}>
          {/* Tactical Turn Left/Right Directional Arrow Container */}
          <div className="w-9 h-9 rounded-xl bg-[#13AA52] flex items-center justify-center text-white shrink-0 shadow-md shadow-emerald-500/10">
            {(!activeNavigationStep || activeNavigationStep.type === 'straight') && (
              <ArrowUp className="w-5 h-5 text-white stroke-[3.5]" />
            )}
            {activeNavigationStep?.type === 'right' && (
              <CornerUpRight className="w-5 h-5 text-white stroke-[3.5]" />
            )}
            {activeNavigationStep?.type === 'roundabout' && (
              <RefreshCw className="w-5 h-5 text-white stroke-[3.5] animate-spin-slow" />
            )}
            {activeNavigationStep?.type === 'arrive' && (
              <MapPin className="w-5 h-5 text-white fill-white animate-bounce" />
            )}
          </div>

          <div className="flex-1 min-w-0 text-left">
            <span className="text-[7.5px] font-mono font-black uppercase tracking-wider text-[#13AA52] block leading-none mb-0.5">
              SWIFT TURN NAVIGATOR
            </span>
            <h5 className="text-[11.5px] font-black leading-tight truncate">
              {activeNavigationStep?.text || (tripProgress.stage === 'to_pickup' ? 'Proceed to pickup run' : 'Proceed to destination') }
            </h5>
            <p className={`text-[9.5px] font-bold truncate leading-tight mt-1 ${darkMode ? 'text-zinc-400' : 'text-gray-500'}`}>
              {activeNavigationStep?.sub || (tripProgress.stage === 'to_pickup' ? tripProgress.currentRide?.pickupAddress : tripProgress.currentRide?.dropoffAddress)}
            </p>
          </div>

          {/* Right side countdown or voice toggle controls */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-dashed border-gray-200/20">
            <div className="text-right whitespace-nowrap leading-none">
              <span className="text-[12px] font-mono font-black text-[#13AA52] block">
                {activeNavigationStep?.distanceText || `${Math.ceil(tripProgress.currentRide?.distance ? (tripProgress.currentRide.distance * (1 - tripProgress.navigationProgress/100)) : 2).toFixed(1)} km`}
              </span>
              <span className={`text-[8.5px] block font-mono font-bold mt-1 ${darkMode ? 'text-zinc-550' : 'text-gray-400'}`}>
                {Math.ceil((tripProgress.currentRide?.estimatedMinutes || 5) * (1 - tripProgress.navigationProgress/100))} min
              </span>
            </div>

            {/* In-app Voice assistant mute controls button */}
            <button
              onClick={() => {
                const nextMuted = !voiceMuted;
                setVoiceMuted(nextMuted);
                if (window.dispatchEvent) {
                  window.dispatchEvent(new CustomEvent('play-sound', { detail: 'tap' }));
                  window.dispatchEvent(new CustomEvent('add-simulation-log', {
                    detail: { 
                      text: nextMuted ? '🔇 Verbal Voice Assistant muted.' : '🔊 Verbal Voice Co-Pilot activated! Speech guides enabled.',
                      type: 'info'
                    }
                  }));
                }
              }}
              className={`w-7 h-7 rounded-lg border flex items-center justify-center transition pointer-events-auto ${
                voiceMuted 
                  ? darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-400' : 'bg-gray-50 border-gray-200 text-gray-400'
                  : 'bg-emerald-500/10 border-emerald-500/20 text-[#13AA52]'
              }`}
              title={voiceMuted ? "Unmute Voice Navigator" : "Mute Voice Navigator"}
            >
              {voiceMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 animate-pulse" />}
            </button>
          </div>
        </div>
      )}

      {/* Immersive HUD Telemetry Cockpit Panel */}
      {isOnline && (
        <div id="hud-telemetry-cockpit" className={`absolute bottom-3.5 left-3.5 p-2 rounded-xl flex items-center gap-2.5 shadow-md border pointer-events-auto z-10 transition-all ${
          darkMode ? 'bg-zinc-950/95 border-zinc-850 text-zinc-100' : 'bg-white border text-gray-950 border-gray-150/80'
        }`}>
          {/* Circular UI Speedometer */}
          <div className="flex items-center gap-1.5 text-left">
            <div className={`w-8 h-8 rounded-full border-2 flex flex-col items-center justify-center leading-none shrink-0 ${
              speed > speedLimit 
                ? 'border-rose-500 bg-rose-500/10 text-rose-500 animate-pulse' 
                : 'border-[#13AA52] bg-[#13AA52]/5 text-[#13AA52]'
            }`}>
              <span className="text-[11px] font-mono font-black">{speed}</span>
              <span className="text-[6px] font-bold uppercase">mph</span>
            </div>
            
            {/* Speed Limit UK Sign Ring */}
            <div className="w-5.5 h-5.5 rounded-full border border-rose-600 bg-white flex items-center justify-center font-black text-[8px] text-gray-950 shadow-xs" title="Road Speed Limit">
              {speedLimit}
            </div>
          </div>

          <div className="h-5 w-px bg-zinc-200/20" />

          {/* EV Battery Cluster */}
          <div className="flex items-center gap-1 bg-transparent">
            <div className="relative">
              {evBattery > 20 ? (
                <Battery className={`w-4 h-4 ${evBattery < 40 ? 'text-amber-500' : 'text-emerald-500'}`} />
              ) : (
                <Battery className="w-4 h-4 text-rose-500 animate-bounce" />
              )}
              {isCharging && (
                <BatteryCharging className="w-3.5 h-3.5 text-emerald-400 absolute -top-1 -right-1 animate-pulse" />
              )}
            </div>
            <div className="text-left font-mono leading-none">
              <span className="text-[9.5px] font-black">{evBattery}%</span>
              <span className="text-[6px] text-gray-400 block font-bold uppercase mt-0.5">EV BATT</span>
            </div>
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

        {/* Heat Map Directory legend panel toggle */}
        {isOnline && (
          <button
            onClick={() => {
              setIsHeatMapPanelOpen(!isHeatMapPanelOpen);
              if (window.dispatchEvent) {
                window.dispatchEvent(new CustomEvent('play-sound', { detail: 'tap' }));
              }
            }}
            className={`w-9 h-9 rounded-full flex items-center justify-center shadow-md border transition duration-150 active:scale-95 cursor-pointer self-end ${
              isHeatMapPanelOpen
                ? 'bg-rose-600 border-rose-500 text-white'
                : darkMode 
                  ? 'bg-zinc-900/98 border-zinc-800 hover:bg-zinc-800 text-[#13AA52]' 
                  : 'bg-white/98 border-gray-150 hover:bg-gray-50 text-[#13AA52]'
            }`}
            title="Toggle Heat Map Directory"
          >
            <Flame className={`w-4.5 h-4.5 ${isHeatMapPanelOpen ? 'text-white animate-pulse' : 'text-rose-500 fill-rose-500/10'}`} />
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

        {/* Custom Zoom In Button */}
        <button
          onClick={() => {
            mapRef.current?.zoomIn();
            if (window.dispatchEvent) window.dispatchEvent(new CustomEvent('play-sound', { detail: 'tap' }));
          }}
          className={`w-9 h-9 rounded-full flex items-center justify-center shadow-md border transition duration-150 active:scale-95 cursor-pointer self-end ${
            darkMode 
              ? 'bg-zinc-900/98 border-zinc-800 hover:bg-zinc-800 text-zinc-150' 
              : 'bg-white/98 border-gray-150 hover:bg-gray-50 text-gray-700'
          }`}
          title="Zoom In"
        >
          <Plus className="w-4.5 h-4.5" />
        </button>

        {/* Custom Zoom Out Button */}
        <button
          onClick={() => {
            mapRef.current?.zoomOut();
            if (window.dispatchEvent) window.dispatchEvent(new CustomEvent('play-sound', { detail: 'tap' }));
          }}
          className={`w-9 h-9 rounded-full flex items-center justify-center shadow-md border transition duration-150 active:scale-95 cursor-pointer self-end ${
            darkMode 
              ? 'bg-zinc-900/98 border-zinc-800 hover:bg-zinc-800 text-zinc-150' 
              : 'bg-white/98 border-gray-150 hover:bg-gray-50 text-gray-700'
          }`}
          title="Zoom Out"
        >
          <Minus className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* RENDER THE SCREEN-CLONED PREMIUM BOLT HEAT MAP DETAILS PANEL */}
      {isOnline && (
        <div 
          style={{ transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)' }}
          className={`absolute right-0 top-0 bottom-0 z-30 border-l flex flex-col shadow-2xl ${
            isHeatMapPanelOpen 
              ? 'w-[270px] translate-x-0 opacity-100' 
              : 'w-0 translate-x-full opacity-0 pointer-events-none'
          } ${
            darkMode 
              ? 'bg-[#090A10]/98 border-zinc-800 text-zinc-100 backdrop-blur-md' 
              : 'bg-white/98 border-gray-250 text-gray-905 backdrop-blur-md'
          }`}
        >
          {/* Header row */}
          <div className="p-3 border-b border-gray-200/10 dark:border-zinc-850 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-left">
              <Flame className="w-4 h-4 text-rose-500 fill-rose-500/15" />
              <h2 className="text-[11px] font-black uppercase tracking-wider font-sans">Heat map</h2>
              <div className="w-4 h-4 rounded-full bg-gray-500/10 flex items-center justify-center cursor-pointer" title="About Surge Pricing">
                <Info className="w-2.5 h-2.5 text-gray-400" />
              </div>
            </div>
            
            <button 
              onClick={() => setIsHeatMapPanelOpen(false)}
              className="w-5.5 h-5.5 rounded-lg flex items-center justify-center hover:bg-gray-500/10 transition border-0 bg-transparent cursor-pointer"
            >
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>

          <div className="p-3 flex-1 flex flex-col gap-3.5 overflow-y-auto scrollbar-none">
            {/* Live Demand Status heading banner */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#13AA52] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#13AA52]"></span>
                </div>
                <span className="text-[9px] font-black uppercase tracking-wider text-gray-800 dark:text-zinc-200">Live Demand</span>
              </div>
              <span className="text-[8px] font-bold text-gray-500 dark:text-zinc-450 font-mono">
                Updates every 2 min
              </span>
            </div>

            {/* Simulated Period Info Banner */}
            <div className="bg-[#13AA52]/5 border border-[#13AA52]/10 dark:border-[#13AA52]/20 p-2 rounded-2xl flex items-center justify-between">
              <div className="flex flex-col text-left">
                <span className="text-[7.5px] uppercase tracking-wider text-gray-400 font-extrabold font-sans block">Simulated Period</span>
                <span className="text-[9.5px] font-black uppercase text-[#13AA52] tracking-wide mt-0.5 font-sans">
                  {selectedPeak === 'breakfast' ? '🥞 Breakfast Peak' : selectedPeak === 'lunch' ? '🍱 Lunch Rush' : selectedPeak === 'dinner' ? '🍷 Dinner Peak' : '💤 Off-Peak / Slow'}
                </span>
              </div>
              <span className="text-[7.5px] font-mono font-bold bg-[#13AA52]/10 text-[#13AA52] px-1.5 py-0.5 rounded-lg border border-[#13AA52]/10">
                {selectedPeak === 'breakfast' ? '07:30-09:30' : selectedPeak === 'lunch' ? '12:00-13:30' : selectedPeak === 'dinner' ? '18:00-21:00' : 'Other Hours'}
              </span>
            </div>

            {/* Gradient pricing indicator bar */}
            <div className="bg-gray-550/5 dark:bg-zinc-900/30 p-2.5 rounded-2xl border border-gray-200/10 dark:border-zinc-850/60">
              <span className="text-[8.5px] font-extrabold uppercase text-gray-500 dark:text-zinc-400 font-sans tracking-wide block mb-1.5 text-left">
                Pricing multiplier range
              </span>
              <div className="h-2 w-full rounded-full bg-gradient-to-r from-sky-450 via-amber-400 to-[#ea4335]" />
              <div className="flex items-center justify-between text-[7px] font-black tracking-wider text-gray-400 uppercase mt-1">
                <span>Low</span>
                <span>Moderate</span>
                <span>High</span>
              </div>
            </div>

            {/* High Demand advisory alert capsule */}
            <div className="bg-emerald-500/5 border border-emerald-500/10 dark:border-emerald-500/5 p-2.5 rounded-2xl flex gap-2 text-left">
              <div className="w-7 h-7 rounded-full bg-[#13AA52]/10 flex items-center justify-center shrink-0">
                <Flame className="w-4 h-4 text-[#13AA52]" />
              </div>
              <div>
                <h4 className="text-[9px] font-black text-gray-905 dark:text-zinc-100 uppercase tracking-wide">
                  High demand in area
                </h4>
                <p className="text-[8px] font-bold text-gray-550 dark:text-zinc-400 mt-0.5 leading-snug">
                  Multiplier fares active! Average earnings are valued up to <strong className="text-[#13AA52] font-black">2.3x</strong> higher than normal.
                </p>
              </div>
            </div>

            {/* List Header */}
            <div>
              <span className="text-[8.5px] font-extrabold uppercase text-gray-500 dark:text-zinc-400 font-sans tracking-wide block mb-1.5 text-left">
                Top high demand areas
              </span>

              {/* Dynamically mapped local city zones based on location/city */}
              <div className="flex flex-col gap-1 z-10">
                {mappedSurgeZones.slice(0, 5).map((zone, idx) => {
                  const mult = surgeLevel === 'high' ? zone.multiplier : surgeLevel === 'medium' ? Math.max(1.1, +(zone.multiplier * 0.7).toFixed(1)) : 1.0;
                  
                  let badgeColorClass = 'text-[#13AA52]';
                  if (mult >= 2.0) {
                    badgeColorClass = 'text-[#ea4335]';
                  } else if (mult >= 1.5) {
                    badgeColorClass = 'text-orange-500';
                  } else if (mult >= 1.2) {
                    badgeColorClass = 'text-amber-500';
                  }

                  return (
                    <div 
                      key={zone.id}
                      onClick={() => {
                        const latLng = getLatLngFromXY(zone.x, zone.y);
                        mapRef.current?.setView(L.latLng(latLng[0], latLng[1]), 15, { animate: true });
                        if (window.dispatchEvent) {
                          window.dispatchEvent(new CustomEvent('play-sound', { detail: 'tap' }));
                          window.dispatchEvent(new CustomEvent('add-simulation-log', {
                            detail: { text: `🧭 Inspection: Map viewport panned to ${zone.name} (+${mult.toFixed(1)}x Peak Surge)`, type: 'info' }
                          }));
                        }
                      }}
                      className="flex items-center justify-between p-1.5 rounded-xl hover:bg-gray-500/10 border border-transparent hover:border-gray-500/5 cursor-pointer transition text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-gray-500/15 dark:bg-zinc-850 text-[9px] font-mono font-black text-gray-500 dark:text-zinc-400 flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-[10px] font-black truncate text-gray-805 dark:text-zinc-200">
                          {zone.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className={`text-[10px] font-black font-mono ${badgeColorClass}`}>
                          {mult.toFixed(1)}x
                        </span>
                        <ChevronRight className="w-3 h-3 text-gray-500 shrink-0" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Compass Hotspot Row Button */}
            <div className="mt-auto pt-2.5 border-t border-gray-200/10 dark:border-zinc-850">
              <button
                onClick={() => {
                  const firstZone = mappedSurgeZones[0];
                  if (!firstZone) return;
                  const latLng = getLatLngFromXY(firstZone.x, firstZone.y);
                  setSimulationAnchor({ lat: latLng[0], lon: latLng[1] });
                  mapRef.current?.setView(L.latLng(latLng[0], latLng[1]), 15, { animate: true });
                  
                  const mult = surgeLevel === 'high' ? firstZone.multiplier : surgeLevel === 'medium' ? Math.max(1.1, +(firstZone.multiplier * 0.7).toFixed(1)) : 1.0;

                  if (window.dispatchEvent) {
                    window.dispatchEvent(new CustomEvent('play-sound', { detail: 'complete' }));
                    window.dispatchEvent(new CustomEvent('add-simulation-log', {
                      detail: { text: `🎯 Dispatch Co-Pilot locked navigation on top hotspot: ${firstZone.name} (+${mult.toFixed(1)}x Demand Surge)`, type: 'success' }
                    }));
                  }
                }}
                className="w-full p-2 rounded-xl bg-[#13AA52]/10 border border-[#13AA52]/20 hover:bg-[#13AA52]/15 transition flex items-center justify-between text-left group cursor-pointer border-solid bg-transparent"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6.5 h-6.5 rounded-full bg-[#13AA52]/20 flex items-center justify-center shrink-0">
                    <Compass className="w-3.5 h-3.5 text-[#13AA52] animate-spin-slow" />
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-[8.5px] font-black text-[#13AA52] uppercase tracking-wide leading-none">
                      Navigate to Hotspot
                    </h5>
                    <p className="text-[8.5px] font-bold text-gray-500 dark:text-zinc-400 mt-1 truncate">
                       {mappedSurgeZones[0]?.name || 'Local Hotspot'} ({(surgeLevel === 'high' ? (mappedSurgeZones[0]?.multiplier ?? 2.3) : surgeLevel === 'medium' ? Math.max(1.1, +((mappedSurgeZones[0]?.multiplier ?? 2.3) * 0.7).toFixed(1)) : 1.0).toFixed(1)}x)
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#13AA52] group-hover:translate-x-0.5 transition duration-150 shrink-0" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
