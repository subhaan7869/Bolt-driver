import React, { useState, useMemo } from 'react';
import { DriverStats, CompletedTrip } from '../types';
import { playCompleteRideSound, playTapSound } from '../utils/SoundGenerator';
import { DollarSign, ChevronRight, X, Calendar, Landmark, TrendingUp, HelpCircle, Star, ArrowUpRight, Award } from 'lucide-react';

interface EarningsDrawerProps {
  stats: DriverStats;
  completedTrips: CompletedTrip[];
  onCashOut: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export const EarningsDrawer: React.FC<EarningsDrawerProps> = ({
  stats,
  completedTrips,
  onCashOut,
  isOpen,
  onClose,
}) => {
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(6); // Default: Sunday (index 6)
  const [cashoutProcessing, setCashoutProcessing] = useState(false);

  // MOCK WEEKLY LOG (Mon-Sun)
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  // Weekly earnings model based on simulated real historical payouts + today's actual live driver actions
  const weeklyDailyEarnings = useMemo(() => {
    // Generate static values for Mon-Sat, Sunday updates dynamically with toda's earnings
    return [85.20, 110.45, 94.10, 134.50, 182.20, 245.80, stats.todayEarnings];
  }, [stats.todayEarnings]);

  const totalWeeklyCalculated = useMemo(() => {
    return weeklyDailyEarnings.reduce((acc, current) => acc + current, 0);
  }, [weeklyDailyEarnings]);

  const handleCashoutClick = () => {
    if (stats.balance <= 0) {
      alert("No balance available to Cash Out right now. Carry out simulated rides first!");
      return;
    }
    
    playTapSound();
    setCashoutProcessing(true);
    
    // Simulate instant payout bank routing
    setTimeout(() => {
      playCompleteRideSound();
      onCashOut();
      setCashoutProcessing(false);
      alert("🎉 cashout successful! €" + stats.balance.toFixed(2) + " has been credited directly to your registered bank routing account via FastTransfer.");
    }, 1800);
  };

  if (!isOpen) return null;

  return (
    <div id="earnings-drawer" className="absolute inset-0 bg-slate-950 z-55 flex flex-col overflow-hidden select-none animate-in fade-in slide-in-from-bottom duration-250">
      
      {/* Drawer Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-900 bg-slate-900/40">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          <h3 className="text-white text-[15px] font-extrabold">Bolt Balance & Analytics</h3>
        </div>
        <button
          id="close-earnings-button"
          onClick={() => { playTapSound(); onClose(); }}
          className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-gray-400 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Analytics Content body */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        
        {/* Main Card: Balance */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-4 text-white relative overflow-hidden shadow-xl shadow-emerald-950/20">
          <div className="absolute right-[-10px] bottom-[-10px] opacity-10">
            <Landmark className="w-40 h-40" />
          </div>

          <span className="text-emerald-100 text-[11px] font-bold uppercase tracking-wider block">Cashable Balance</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-medium text-emerald-200">€</span>
            <span className="text-4xl font-extrabold tracking-tight">
              {stats.balance.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-emerald-500/20 pt-3.5 mt-3.5">
            <span className="text-[10px] text-emerald-100">
              Auto transfers route on Monday 04:00
            </span>
            <button
              id="cashout-action-button"
              disabled={stats.balance <= 0 || cashoutProcessing}
              onClick={handleCashoutClick}
              className="bg-white hover:bg-slate-50 disabled:bg-emerald-400 disabled:text-emerald-200 text-slate-950 font-extrabold px-3.5 py-1.5 rounded-lg text-xs transition active:scale-95 flex items-center gap-1 shadow"
            >
              {cashoutProcessing ? (
                <>
                  <div className="w-3 h-3 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  Cash Out
                </>
              )}
            </button>
          </div>
        </div>

        {/* Daily Summary stats microgrid */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-slate-900 border border-slate-850 p-2.5 rounded-xl">
            <span className="text-gray-400 text-[9px] uppercase tracking-wider block mb-0.5">Today</span>
            <span className="text-white font-extrabold font-mono text-xs">€{stats.todayEarnings.toFixed(2)}</span>
          </div>
          <div className="bg-slate-900 border border-slate-850 p-2.5 rounded-xl">
            <span className="text-gray-400 text-[9px] uppercase tracking-wider block mb-0.5">Trips</span>
            <span className="text-white font-extrabold font-mono text-xs">{stats.completedTripsCount}</span>
          </div>
          <div className="bg-slate-900 border border-slate-850 p-2.5 rounded-xl">
            <span className="text-gray-400 text-[9px] uppercase tracking-wider block mb-0.5">Weekly</span>
            <span className="text-emerald-400 font-extrabold font-mono text-xs">€{totalWeeklyCalculated.toFixed(2)}</span>
          </div>
        </div>

        {/* Custom SVG Mon-Sun Bar Chart representation */}
        <div className="bg-slate-900 border border-slate-850 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Weekly earnings map</h4>
            </div>
            <span className="text-[10px] text-gray-500 font-mono">Tap day to toggle</span>
          </div>

          <div className="h-32 flex items-end justify-between px-1.5 pt-4 border-b border-slate-800 relative">
            {/* Guide lines inside graph */}
            <div className="absolute left-0 right-0 top-4 border-t border-slate-800/40 border-dashed pointer-events-none" />
            <div className="absolute left-0 right-0 top-16 border-t border-slate-800/40 border-dashed pointer-events-none" />

            {weeklyDailyEarnings.map((earnings, index) => {
              // Calculate relative projection height out of max target €250
              const maxTarget = 260;
              const heightPercent = Math.min(100, Math.max(10, (earnings / maxTarget) * 100));
              const isSelected = selectedDayIndex === index;

              return (
                <div 
                  key={index} 
                  className="flex flex-col items-center flex-1 cursor-pointer"
                  onClick={() => { playTapSound(); setSelectedDayIndex(index); }}
                >
                  {/* earnings float indicator on hover / selection */}
                  {isSelected && (
                    <div className="absolute top-[-4px] bg-emerald-500 text-slate-950 font-bold px-1.5 py-0.5 rounded text-[8px] tracking-tight font-mono z-10 animate-fade-in">
                      €{earnings.toFixed(1)}
                    </div>
                  )}

                  {/* Visual Bar element */}
                  <div
                    className={`w-4.5 rounded-t-sm transition-all duration-300 ${
                      isSelected 
                        ? 'bg-emerald-400 shadow-lg shadow-emerald-500/20' 
                        : 'bg-emerald-600/30 hover:bg-emerald-600/50'
                    }`}
                    style={{ height: `${heightPercent}px` }}
                  />

                  {/* Day label */}
                  <span className={`text-[9px] mt-1.5 font-bold ${
                    isSelected ? 'text-white' : 'text-gray-500'
                  }`}>
                    {daysOfWeek[index]}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Selected day payout context */}
          <div className="flex items-center justify-between pt-3 text-[11px] text-gray-400">
            <span>Payout for {daysOfWeek[selectedDayIndex]}</span>
            <span className="font-extrabold text-white font-mono">€{weeklyDailyEarnings[selectedDayIndex].toFixed(2)}</span>
          </div>
        </div>

        {/* Drivers Quality & Standards Tracker */}
        <div className="bg-slate-900 border border-slate-850 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2">
            <Award className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Quality Scorecard</h4>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex flex-col">
              <span className="text-gray-500 text-[10px]">Acceptance Score</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-sm font-extrabold text-white">{stats.acceptanceRate}%</span>
                <span className="text-[9px] text-emerald-400">Excellent</span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-gray-500 text-[10px]">Star Ratings</span>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-sm font-extrabold text-white">{stats.rating.toFixed(2)}</span>
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span className="text-[9px] text-gray-500">(100 trips)</span>
              </div>
            </div>
          </div>
        </div>

        {/* TRIP HISTORY list */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-white text-xs font-bold uppercase tracking-wider">Trip History Logs</h4>
            <span className="text-[10px] text-slate-500">Last {completedTrips.length} active rides</span>
          </div>

          {completedTrips.length === 0 ? (
            <div className="bg-slate-900 border border-dashed border-slate-800 p-6 rounded-2xl text-center">
              <p className="text-gray-500 text-xs">No completed trips during this simulation session yet.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 select-text">
              {completedTrips.map((trip) => (
                <div 
                  key={trip.id} 
                  className="bg-slate-900 border border-slate-850 p-3 rounded-xl flex items-center justify-between"
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] px-1.5 py-0.2 rounded font-mono">
                        Bolt Base
                      </span>
                      <span className="text-[9px] text-gray-500 font-mono">
                        {trip.timestamp}
                      </span>
                    </div>
                    <p className="text-xs text-white font-extrabold truncate">{trip.passengerName}</p>
                    <p className="text-[10px] text-gray-500 truncate mt-0.5">
                      {trip.pickupAddress} ➔ {trip.dropoffAddress}
                    </p>
                  </div>

                  <div className="text-right flex flex-col items-end">
                    <span className="text-xs font-mono font-extrabold text-emerald-400">
                      +€{((trip.fare * trip.surgeMultiplier) + trip.tip).toFixed(2)}
                    </span>
                    <div className="flex items-center gap-0.5 text-[9px] text-amber-400 font-medium mt-0.5">
                      <span>{trip.ratingValue}</span>
                      <Star className="w-2.5 h-2.5 fill-amber-400" />
                    </div>
                    {trip.tip > 0 && (
                      <span className="text-[8px] text-sky-400 font-bold bg-sky-400/10 px-1 rounded mt-0.5">
                        +€{trip.tip} Tip
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
