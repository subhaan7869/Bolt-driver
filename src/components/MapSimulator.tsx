import React, { useMemo } from 'react';
import { TripProgress, RideRequest } from '../types';
import { MapPin, Navigation, Zap } from 'lucide-react';

interface MapSimulatorProps {
  tripProgress: TripProgress;
  isOnline: boolean;
  surgeLevel: 'low' | 'medium' | 'high';
  onSpawnRideFromZone?: (multiplier: number, areaName: string, coords: { x: number; y: number }) => void;
  mode?: 'taxi' | 'food';
}

// Fixed coordinates represent streets/intersections in a 400x500 virtual city grid
export interface StreetPath {
  id: string;
  name: string;
  d: string;
}

const CITY_STREETS: StreetPath[] = [
  { id: 'highway-loop', name: 'Alhaji Adeola Avenue', d: 'M 40,40 L 360,40 L 360,460 L 40,460 Z' },
  { id: 'central-ave', name: 'Ahmadu Bello Way', d: 'M 200,10 L 200,490' },
  { id: 'liberty-st', name: 'Admiralty Way', d: 'M 10,250 L 390,250' },
  { id: 'broadway-drive', name: 'Inneh Crescent', d: 'M 10,120 L 390,120' },
  { id: 'market-rd', name: 'Adeola Odeku Street', d: 'M 10,380 L 390,380' },
  { id: 'park-way', name: 'Allen Avenue', d: 'M 100,10 L 100,490' },
  { id: 'diagonal-express', name: 'Gbagada Expressway', d: 'M 40,40 L 360,460' },
];

export interface HotZone {
  id: string;
  name: string;
  x: number;
  y: number;
  radius: number;
  multiplier: number;
  color: string;
}

const SURGE_ZONES: HotZone[] = [
  { id: 'victoria-island', name: 'Victoria Island', x: 200, y: 120, radius: 75, multiplier: 1.8, color: 'rgba(34, 197, 94, 0.15)' }, // Bolt Green glow
  { id: 'lekki-phase1', name: 'Lekki Phase 1', x: 340, y: 420, radius: 80, multiplier: 2.2, color: 'rgba(34, 197, 94, 0.2)' }, // Surge green
  { id: 'ikeja', name: 'Ikeja Gra', x: 80, y: 280, radius: 65, multiplier: 1.4, color: 'rgba(34, 197, 94, 0.12)' }, 
  { id: 'surulere', name: 'Surulere Core', x: 80, y: 70, radius: 55, multiplier: 1.2, color: 'rgba(34, 197, 94, 0.1)' },
];

export const MapSimulator: React.FC<MapSimulatorProps> = ({
  tripProgress,
  isOnline,
  surgeLevel,
  onSpawnRideFromZone,
  mode = 'taxi',
}) => {
  const { stage, currentRide, navigationProgress } = tripProgress;

  // Active surge multiplier display
  const activeSurges = useMemo(() => {
    if (surgeLevel === 'low') return SURGE_ZONES.map(z => ({ ...z, multiplier: 1.0, color: 'rgba(34, 197, 94, 0.04)' }));
    if (surgeLevel === 'medium') return SURGE_ZONES.map(z => ({ ...z, multiplier: Math.max(1.1, +(z.multiplier * 0.8).toFixed(1)) }));
    return SURGE_ZONES;
  }, [surgeLevel]);

  // Derive driver's current position and heading
  const driverPosition = useMemo(() => {
    if (currentRide && (stage === 'to_pickup' || stage === 'to_destination')) {
      const from = stage === 'to_pickup' 
        ? { x: 200, y: 300 } // Start center
        : currentRide.pickupCoordinate;
      
      const to = stage === 'to_pickup'
        ? currentRide.pickupCoordinate
        : currentRide.dropoffCoordinate;

      const ratio = navigationProgress / 100;
      
      const currentX = from.x + (to.x - from.x) * ratio;
      const currentY = from.y + (to.y - from.y) * ratio;

      // Calculate angle
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);

      return { x: currentX, y: currentY, angle };
    }

    return { x: 200, y: 300, angle: 0 };
  }, [currentRide, stage, navigationProgress]);

  // Draw the route path if navigating
  const routePathD = useMemo(() => {
    if (!currentRide) return '';
    if (stage === 'to_pickup') {
      return `M 200,300 L ${currentRide.pickupCoordinate.x},${currentRide.pickupCoordinate.y}`;
    }
    if (stage === 'to_destination') {
      return `M ${currentRide.pickupCoordinate.x},${currentRide.pickupCoordinate.y} L ${currentRide.dropoffCoordinate.x},${currentRide.dropoffCoordinate.y}`;
    }
    return '';
  }, [currentRide, stage]);

  return (
    <div id="map-simulator-container" className="relative w-full h-[300px] bg-[#f2f4f2] overflow-hidden select-none border-b border-gray-100">
      {/* Light Clean Map Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5eee6_1px,transparent_1px),linear-gradient(to_bottom,#e5eee6_1px,transparent_1px)] bg-[size:20px_20px] opacity-60" />

      <svg
        viewBox="0 0 400 500"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Draw water / park bodies in beautiful light theme */}
        {/* Lagos Lagoon Water Body */}
        <rect x="230" y="275" width="130" height="95" rx="16" fill="#cde4f7" />
        <text x="295" y="325" fill="#4ea5e9" className="text-[10px] font-sans font-semibold tracking-wide opacity-80 text-center" textAnchor="middle">
          Lagos Lagoon
        </text>

        {/* Kuramo Parkland */}
        <rect x="65" y="145" width="80" height="85" rx="12" fill="#d9ebd9" />
        <text x="105" y="190" fill="#2e7d32" className="text-[10px] font-sans font-semibold tracking-wide opacity-70 text-center" textAnchor="middle">
          Kuramo Park
        </text>

        {/* Draw Streets - Gray background casing */}
        {CITY_STREETS.map((street) => (
          <path
            key={`casing-${street.id}`}
            d={street.d}
            stroke="#e4e8e4"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ))}

        {/* Draw Streets - Pure white foreground */}
        {CITY_STREETS.map((street) => (
          <path
            key={`inner-${street.id}`}
            d={street.d}
            stroke="#ffffff"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ))}

        {/* Street Name Labels */}
        <text x="160" y="45" fill="#718096" className="text-[8px] font-sans opacity-70 font-bold tracking-wide">
          Alhaji Adeola Ave
        </text>
        <text x="205" y="220" fill="#718096" className="text-[8px] font-sans opacity-70 font-bold tracking-wide rotate-90 origin-[205px_220px]">
          Ahmadu Bello Way
        </text>
        <text x="25" y="245" fill="#718096" className="text-[8px] font-sans opacity-70 font-bold tracking-wide">
          Admiralty Way
        </text>

        {/* Surge Heatmap Spots (glowing neon circles - Bolt standard!) */}
        {isOnline && activeSurges.map((zone) => {
          const showMultiplier = zone.multiplier > 1.0;
          return (
            <g 
              key={zone.id} 
              className="cursor-pointer group select-none"
              onClick={() => onSpawnRideFromZone?.(zone.multiplier, zone.name, { x: zone.x, y: zone.y })}
            >
              {/* Pulsing Surge Zone Ring (Greenish/Yellow for Bolt) */}
              <circle
                cx={zone.x}
                cy={zone.y}
                r={zone.radius}
                fill={zone.color}
                className="transition-all duration-300 hover:opacity-80"
              />
              <circle
                cx={zone.x}
                cy={zone.y}
                r={zone.radius * 0.4}
                fill={zone.color}
                className="opacity-50 animate-pulse"
              />
              
              {/* Surge multiplier tag badge */}
              {showMultiplier && (
                <g transform={`translate(${zone.x}, ${zone.y})`}>
                  <rect
                    x="-24"
                    y="-9"
                    width="48"
                    height="18"
                    rx="9"
                    fill="#13AA52"
                    className="shadow-md group-hover:scale-105 transition-transform"
                  />
                  <text
                    y="3"
                    fill="#ffffff"
                    className="text-[9px] font-sans font-bold text-center"
                    textAnchor="middle"
                  >
                    +{zone.multiplier}x
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Active Navigation Route */}
        {isOnline && routePathD && (
          <>
            {/* thick shiny route line */}
            <path
              d={routePathD}
              stroke="#13AA52"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              className="opacity-40"
            />
            {/* moving dash overlay */}
            <path
              d={routePathD}
              stroke="#0f8f44"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="6 4"
              className="animate-[dash_1s_linear_infinite]"
              fill="none"
              id="active-route-line-light"
            />
          </>
        )}

        {/* Pickup Pin Bullet */}
        {isOnline && currentRide && (stage === 'to_pickup' || stage === 'arrived_pickup') && (
          <g transform={`translate(${currentRide.pickupCoordinate.x}, ${currentRide.pickupCoordinate.y})`}>
            <circle cx="0" cy="0" r="14" fill="none" stroke="#13AA52" strokeWidth="2" className="animate-ping opacity-60" />
            <circle cx="0" cy="0" r="7" fill="#13AA52" stroke="#ffffff" strokeWidth="1.5" />
            
            <g transform="translate(0, -18)">
              <rect x="-24" y="-8" width="48" height="13" rx="4" fill="#111827" />
              <text y="1" fill="#ffffff" className="text-[7.5px] font-sans font-extrabold text-center" textAnchor="middle">
                {mode === 'food' ? 'FOOD' : 'PICKUP'}
              </text>
            </g>
          </g>
        )}

        {/* Dropoff Destination Pin Bullet */}
        {isOnline && currentRide && stage === 'to_destination' && (
          <g transform={`translate(${currentRide.dropoffCoordinate.x}, ${currentRide.dropoffCoordinate.y})`}>
            <circle cx="0" cy="0" r="14" fill="none" stroke="#ea4335" strokeWidth="2" className="animate-ping opacity-60" />
            <circle cx="0" cy="0" r="7" fill="#ea4335" stroke="#ffffff" strokeWidth="1.5" />
            
            <g transform="translate(0, -18)">
              <rect x="-24" y="-8" width="48" height="13" rx="4" fill="#111827" />
              <text y="1" fill="#ffffff" className="text-[7.5px] font-sans font-extrabold text-center" textAnchor="middle">
                DELIVER
              </text>
            </g>
          </g>
        )}

        {/* Driver Car Icon (Pristine styled green tracker) */}
        <g 
          transform={`translate(${driverPosition.x}, ${driverPosition.y}) rotate(${driverPosition.angle})`}
          className="transition-transform duration-200 ease-linear"
        >
          {isOnline && stage === 'idle' && (
            <circle
              cx="0"
              cy="0"
              r="20"
              fill="none"
              stroke="#13AA52"
              strokeWidth="1.2"
              className="animate-ping opacity-50"
            />
          )}

          {/* Shadows */}
          <ellipse cx="0" cy="1" rx="8" ry="5.5" fill="#000000" opacity="0.25" />

          {/* Glowing Green Pointer Car */}
          <rect x="-5" y="-8" width="10" height="16" rx="2.5" fill="#13AA52" stroke="#ffffff" strokeWidth="1.2" />
          <rect x="-3" y="-4" width="6" height="3" rx="1" fill="#ffffff" opacity="0.8" />
          
          <circle cx="-2.5" cy="-7" r="1" fill="#fef08a" />
          <circle cx="2.5" cy="-7" r="1" fill="#fef08a" />

          <path d="M 0,-12 L -2.5,-9 L 2.5,-9 Z" fill="#13AA52" />
        </g>
      </svg>

      {/* Surge Indicator floating message */}
      <div className="absolute top-2.5 left-2.5 pointer-events-none">
        {isOnline && (
          <div className="bg-white/90 backdrop-blur-md border border-gray-100 rounded-full px-2.5 py-0.5 flex items-center gap-1 shadow-sm">
            <Zap className="w-3 h-3 text-[#13AA52] fill-[#13AA52]" />
            <span className="text-[9px] font-sans font-extrabold text-[#13AA52] uppercase tracking-wider">
              {surgeLevel === 'high' ? 'High Demand 🔥' : surgeLevel === 'medium' ? 'Surge Active ⚡' : 'Demand Stable'}
            </span>
          </div>
        )}
      </div>

      {/* Offline screen cover */}
      {!isOnline && (
        <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center p-4 text-center">
          <Navigation className="w-8 h-8 text-[#13AA52] mb-1.5 animate-bounce" />
          <h4 className="text-gray-950 text-sm font-black">Bolt Driver Offline</h4>
          <p className="text-gray-500 text-[11px] max-w-[240px] leading-tight">
            Please tap the <span className="font-extrabold text-[#13AA52]">+ Go Online</span> button below to start simulating requests.
          </p>
        </div>
      )}

      {/* Online, Idle Searching Pulse */}
      {isOnline && stage === 'idle' && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white/95 border border-gray-100 px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 animate-pulse z-10">
          <div className="w-1.5 h-1.5 rounded-full bg-[#13AA52] animate-ping" />
          <span className="text-[9.5px] font-sans font-bold text-[#13AA52] uppercase tracking-wider">
            Waiting for jobs...
          </span>
        </div>
      )}

      {/* Click Hotspot Guide */}
      {isOnline && stage === 'idle' && (
        <div className="absolute top-2.5 right-2.5 bg-white/80 border border-gray-100 px-1.5 py-0.5 rounded text-[8px] text-gray-500 font-bold">
          ⚡ Tap glowing zone to spawn!
        </div>
      )}

      {/* Turn Navigation Info Banner */}
      {isOnline && (stage === 'to_pickup' || stage === 'to_destination') && (
        <div className="absolute top-2 left-2 right-2 bg-white border border-gray-100 rounded-lg p-2 flex items-center gap-2.5 shadow-md animate-in fade-in slide-in-from-top-2 duration-200 z-10">
          <div className="w-7 h-7 rounded-full bg-[#13AA52] flex items-center justify-center text-white">
            <Navigation className="w-3.5 h-3.5 transform -rotate-45 fill-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h5 className="text-[10.5px] font-black text-gray-900 leading-none">
              {stage === 'to_pickup' 
                ? (mode === 'food' ? 'Pickup order at Restaurant' : 'Navigating to passenger')
                : 'Navigating to destination'
              }
            </h5>
            <p className="text-[9px] text-gray-500 truncate leading-snug mt-0.5">
              {stage === 'to_pickup' 
                ? `${currentRide?.pickupAddress}` 
                : `${currentRide?.dropoffAddress}`
              }
            </p>
          </div>
          <div className="text-right whitespace-nowrap">
            <span className="text-[10px] font-bold text-[#13AA52] block">
              {Math.ceil(currentRide?.distance ? (currentRide.distance * (1 - navigationProgress/100)) : 2.5).toFixed(1)} km
            </span>
            <span className="text-[8.5px] text-gray-400 block font-mono">
              {Math.ceil((currentRide?.estimatedMinutes || 5) * (1 - navigationProgress/100))} min
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
