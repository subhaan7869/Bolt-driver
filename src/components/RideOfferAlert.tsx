import React, { useEffect } from 'react';
import { RideRequest } from '../types';
import { playIncomingRideSound, playTapSound } from '../utils/SoundGenerator';
import { Star, Zap, MapPin, Check, X, Compass, DollarSign } from 'lucide-react';

interface RideOfferAlertProps {
  ride: RideRequest;
  onAccept: () => void;
  onDecline: () => void;
  timeRemaining: number;
  totalTime: number;
}

export const RideOfferAlert: React.FC<RideOfferAlertProps> = ({
  ride,
  onAccept,
  onDecline,
  timeRemaining,
  totalTime,
}) => {
  // Play simulated Swift ride beep/chime in interval while showing the alert
  useEffect(() => {
    playIncomingRideSound();
    const interval = setInterval(() => {
      playIncomingRideSound();
    }, 3500);
    return () => clearInterval(interval);
  }, [ride.id]);

  const progressPercent = (timeRemaining / totalTime) * 100;

  return (
    <div id="ride-offer-alert" className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm z-50 flex flex-col justify-between p-6 overflow-hidden select-none animate-in fade-in zoom-in-95 duration-200">
      
      {/* Top Banner: Incoming Offer */}
      <div className="text-center mt-2">
        <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full mb-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-widest font-mono">
            New Swift Request
          </span>
        </div>
        <h3 className="text-white text-lg font-bold">Incoming Ride Offer</h3>
      </div>

      {/* Circle Pulsing Ring & Price Indicator */}
      <div className="relative flex items-center justify-center my-4">
        {/* Animated outer radiating glows */}
        <div className="absolute w-44 h-44 rounded-full border-4 border-emerald-500/10 animate-ping opacity-60" />
        <div className="absolute w-36 h-36 rounded-full border-2 border-emerald-400/20 animate-pulse" />

        {/* SVG Circle Timer Progress Ring */}
        <svg className="w-32 h-32 transform -rotate-90">
          <circle
            cx="64"
            cy="64"
            r="54"
            stroke="#111827"
            strokeWidth="8"
            fill="transparent"
          />
          <circle
            cx="64"
            cy="64"
            r="54"
            stroke="#10B981"
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={339.29} // 2 * PI * r (54)
            strokeDashoffset={339.29 - (339.29 * progressPercent) / 100}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-linear"
          />
        </svg>

        {/* Floating Fare inside Timer */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Fare</span>
          <span className="text-4xl font-extrabold text-white tracking-tight flex items-start">
            <span className="text-lg font-medium text-emerald-400 mt-1">€</span>
            {(ride.fare * ride.surgeMultiplier).toFixed(2)}
          </span>
          {ride.surgeMultiplier > 1.0 && (
            <div className="flex items-center gap-1 bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full text-[9px] font-extrabold mt-1 uppercase animate-bounce">
              <Zap className="w-2.5 h-2.5 fill-slate-950" />
              {ride.surgeMultiplier}x Surge
            </div>
          )}
        </div>
      </div>

      {/* Ride Information Details Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
        {/* Passenger Profile */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-600/30 border border-emerald-500 flex items-center justify-center text-emerald-400 font-bold text-sm">
              {ride.passengerName.substring(0, 1)}
            </div>
            <div>
              <h4 className="text-white text-sm font-bold">{ride.passengerName}</h4>
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span className="text-xs text-amber-400 font-bold">{ride.passengerRating.toFixed(2)}</span>
                <span className="text-[10px] text-gray-400 font-mono">(138 trips)</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono font-bold text-gray-300 block">{ride.distance.toFixed(1)} km trip</span>
            <span className="text-[10px] text-gray-500 block">est. {ride.estimatedMinutes} mins</span>
          </div>
        </div>

        {/* Route Addresses */}
        <div className="flex flex-col gap-3 relative">
          {/* Vertical path dotted line */}
          <div className="absolute left-2.5 top-2.5 bottom-2.5 w-0.5 border-l-2 border-dashed border-gray-700 pointer-events-none" />

          {/* Pickup */}
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-emerald-400 text-[10px] font-bold z-10">
              A
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[9px] uppercase font-bold text-emerald-400 tracking-wider block">Pickup Point</span>
              <p className="text-xs text-white truncate">{ride.pickupAddress}</p>
            </div>
          </div>

          {/* Destination */}
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-5050 flex items-center justify-center text-indigo-400 text-[10px] font-bold z-10">
              B
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[9px] uppercase font-bold text-indigo-400 tracking-wider block">Destination Address</span>
              <p className="text-xs text-white truncate">{ride.dropoffAddress}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Button controls */}
      <div className="grid grid-cols-2 gap-4 mt-2">
        <button
          id="decline-button"
          onClick={() => {
            playTapSound();
            onDecline();
          }}
          className="flex items-center justify-center gap-2 py-3.5 bg-slate-900 hover:bg-slate-850 active:scale-95 text-gray-300 font-semibold rounded-xl border border-slate-800 transition-all text-sm"
        >
          <X className="w-4 h-4 text-red-500" />
          Decline
        </button>

        <button
          id="accept-button"
          onClick={() => {
            playTapSound();
            onAccept();
          }}
          className="flex items-center justify-center gap-2 py-3.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/20 text-sm"
        >
          <Check className="w-5 h-5" />
          ACCEPT ({timeRemaining}s)
        </button>
      </div>
    </div>
  );
};
