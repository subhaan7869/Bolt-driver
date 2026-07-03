import React, { useState, useEffect, useMemo } from 'react';
import { 
  Compass, MapPin, BarChart2, Calendar, Clock, Battery, BatteryCharging, 
  Sparkles, Radio, Star, ChevronRight, Play, Award, Zap, CloudRain, 
  Sun, CloudSnow, AlertTriangle, ShieldAlert, User, LogOut, Check, ArrowRight,
  Map, Settings, HelpCircle, Heart, Trophy, Activity, MessageSquare, Flame, Phone, Plane, RefreshCw, Coffee
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DriverStats } from '../types';

interface CommandCentreProps {
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
  mode: 'taxi' | 'food';
  setMode: (mode: 'taxi' | 'food') => void;
  stats: DriverStats;
  setStats: any;
  driverPoints: number;
  setDriverPoints: any;
  dailyEarningsGoal: number;
  setDailyEarningsGoal: (goal: number) => void;
  scheduledBookings: any[];
  setScheduledBookings: any;
  selectedPrebooking: any;
  setSelectedPrebooking: (b: any) => void;
  isOnBreak: boolean;
  setIsOnBreak: (b: boolean) => void;
  darkMode: boolean;
  playSoundEffect: (name: string) => void;
  appendLog: (text: string, type?: 'info' | 'success' | 'warn' | 'earnings') => void;
  currentCity: string;
  setCurrentCity: (city: string) => void;
  surgeLevel: 'low' | 'medium' | 'high';
  setSurgeLevel: (level: 'low' | 'medium' | 'high') => void;
  selectedPeak: 'breakfast' | 'lunch' | 'dinner' | 'offpeak';
  setSelectedPeak: (p: 'breakfast' | 'lunch' | 'dinner' | 'offpeak') => void;
  batteryLevel: number;
  setBatteryLevel: (b: number) => void;
}

export const CommandCentre: React.FC<CommandCentreProps> = ({
  isOnline,
  setIsOnline,
  mode,
  setMode,
  stats,
  setStats,
  driverPoints,
  setDriverPoints,
  dailyEarningsGoal,
  setDailyEarningsGoal,
  scheduledBookings,
  setScheduledBookings,
  selectedPrebooking,
  setSelectedPrebooking,
  isOnBreak,
  setIsOnBreak,
  darkMode,
  playSoundEffect,
  appendLog,
  currentCity,
  setCurrentCity,
  surgeLevel,
  setSurgeLevel,
  selectedPeak,
  setSelectedPeak,
  batteryLevel,
  setBatteryLevel,
}) => {
  // 1. WEATHER & ENVIRONMENTAL CONTROLS
  const [weather, setWeather] = useState<'sunny' | 'rainy' | 'snowy' | 'stormy'>(() => {
    const hours = new Date().getHours();
    return hours > 18 ? 'rainy' : 'sunny';
  });

  // Weather effects on dispatch variables
  const weatherModifier = useMemo(() => {
    switch (weather) {
      case 'rainy': return { label: 'Heavy Rain 🌧️', eatsMultiplier: 2.0, taxiMultiplier: 1.0, surgeBoost: 1.4, description: 'Eats demand doubled, minor traffic delay +15%.' };
      case 'snowy': return { label: 'Blizzard ❄️', eatsMultiplier: 1.5, taxiMultiplier: 1.8, surgeBoost: 1.8, description: 'Massive taxi surge (1.8x), slow traffic speed limit.' };
      case 'stormy': return { label: 'Severe Storm ⚡', eatsMultiplier: 2.2, taxiMultiplier: 2.2, surgeBoost: 2.0, description: 'Extreme surge 2.0x, peak orders across all sectors!' };
      default: return { label: 'Clear Skies ☀️', eatsMultiplier: 1.0, taxiMultiplier: 1.0, surgeBoost: 1.0, description: 'Optimal road visibility. Standard matching rates.' };
    }
  }, [weather]);

  // 2. MEALS & DEMAND TIMELINE WINDOWS
  const timeWindows = [
    { id: 'breakfast', label: '🍳 Breakfast', hours: '7:00 AM – 10:00 AM', peak: '8:00 AM – 9:30 AM', common: 'Coffee, McDonalds, bakeries', active: selectedPeak === 'breakfast' },
    { id: 'lunch', label: '🍔 Lunch', hours: '11:30 AM – 2:00 PM', peak: '12:00 PM – 1:30 PM', common: 'Offices, schools, meal-preps', active: selectedPeak === 'lunch' },
    { id: 'dinner', label: '🍕 Dinner', hours: '5:00 PM – 9:00 PM', peak: '6:00 PM – 8:00 PM', common: 'Busiest takeout peak, family orders', active: selectedPeak === 'dinner' },
    { id: 'offpeak', label: '🌙 Late Night', hours: '9:00 PM – 1:00 AM', peak: '10:00 PM – Midnight', common: 'Takeaways, pubs, nightlife zones', active: selectedPeak === 'offpeak' },
  ];

  // 3. LIVE INCIDENT CENTRE (Accidents, traffic, delays)
  const [incidents, setIncidents] = useState<any[]>([
    { id: 'inc-1', type: 'road_closure', title: 'Road Closure: Piccadilly Circus', detail: 'Emergency utility works. Heavy congestion in surrounding West End avenues.', delay: '+12m delay', severity: 'high' },
    { id: 'inc-2', type: 'accident', title: 'Minor Collision: Shoreditch High St', detail: 'Bus lanes blocked. Traffic merged to single lane.', delay: '+7m delay', severity: 'medium' },
    { id: 'inc-3', type: 'checkpoint', title: 'TFL Regulatory Checkpoint: Victoria Station', detail: 'Routine Private Hire Vehicle inspections. Ensure badge is displayed.', delay: '+2m delay', severity: 'info' }
  ]);

  // 4. DEMAND FORECAST INSIGHTS
  const forecasts = useMemo(() => {
    if (selectedPeak === 'breakfast') {
      return [
        { text: "☕ Morning rush peak is currently at maximum capacity.", trend: "stable" },
        { text: "💼 High demand expected near office parks & business hubs.", trend: "rising" },
        { text: "🛑 Traffic delay spikes near Tower Bridge & central crossings.", trend: "warning" }
      ];
    } else if (selectedPeak === 'lunch') {
      return [
        { text: "🍔 Lunch demand expected to decrease in 35 minutes.", trend: "falling" },
        { text: "🏢 Commercial blocks showing dense short-distance Eats dispatches.", trend: "stable" },
        { text: "🌦️ Rain forecasts will immediately trigger 1.5x surge multipliers.", trend: "rising" }
      ];
    } else if (selectedPeak === 'dinner') {
      return [
        { text: "🔥 Peak dinner rush active. Surge expectations at maximum (2.2x).", trend: "rising" },
        { text: "🥡 Fast food takeaways are reporting high preparation wait times.", trend: "warning" },
        { text: "✈️ Airport pickups expected to spike around 10:45 PM arrivals.", trend: "stable" }
      ];
    } else {
      return [
        { text: "🌙 Late night hospitality dispatches rising near Soho / Mayfair.", trend: "rising" },
        { text: "🍻 Club venues reporting high demand. Enable XL / Premium tiers.", trend: "rising" },
        { text: "🔌 Smart recommendation: Battery depletion is faster with heater active.", trend: "info" }
      ];
    }
  }, [selectedPeak]);

  // 5. SMART EARNINGS PREDICTOR
  const earningsPrediction = useMemo(() => {
    let baseMin = 14;
    let baseMax = 20;

    // Apply modifiers based on weather, peak hour, and current surge
    const surgeFactor = surgeLevel === 'high' ? 1.6 : surgeLevel === 'medium' ? 1.2 : 0.9;
    const weatherFactor = weatherModifier.surgeBoost;
    const peakFactor = selectedPeak === 'dinner' ? 1.5 : selectedPeak === 'breakfast' || selectedPeak === 'lunch' ? 1.2 : 0.95;

    const scale = surgeFactor * weatherFactor * peakFactor;

    return {
      min30: +(baseMin * scale * 0.5).toFixed(2),
      max30: +(baseMax * scale * 0.5 * 1.15).toFixed(2),
      min1h: +(baseMin * scale).toFixed(2),
      max1h: +(baseMax * scale * 1.15).toFixed(2),
      min2h: +(baseMin * scale * 2.0).toFixed(2),
      max2h: +(baseMax * scale * 2.0 * 1.15).toFixed(2),
    };
  }, [surgeLevel, weatherModifier, selectedPeak]);

  // 6. DRIVER REPUTATION STATS
  const reputation = {
    speed: 4.9,
    friendliness: 4.8,
    foodHandling: 4.9,
    navigation: 4.7,
    acceptanceRate: stats.acceptanceRate,
    cancellationRate: stats.cancellationRate,
  };

  // 7. LEVEL THRESHOLDS & PROGRESSION
  const levels = [
    { name: 'Rookie', minPoints: 0, color: 'text-gray-400 border-gray-400 bg-gray-500/10' },
    { name: 'Bronze', minPoints: 100, color: 'text-amber-700 border-amber-600 bg-amber-600/10' },
    { name: 'Silver', minPoints: 150, color: 'text-zinc-400 border-zinc-400 bg-zinc-400/10' },
    { name: 'Gold', minPoints: 400, color: 'text-amber-500 border-amber-500 bg-amber-500/10' },
    { name: 'Platinum', minPoints: 800, color: 'text-cyan-500 border-cyan-400 bg-cyan-400/10' },
    { name: 'Diamond', minPoints: 1500, color: 'text-blue-400 border-blue-400 bg-blue-400/10' },
    { name: 'Elite', minPoints: 3000, color: 'text-purple-500 border-purple-500 bg-purple-500/10' },
  ];

  const currentLevelInfo = useMemo(() => {
    let activeLevel = levels[0];
    let nextLevel = levels[1];
    for (let i = 0; i < levels.length; i++) {
      if (driverPoints >= levels[i].minPoints) {
        activeLevel = levels[i];
        nextLevel = levels[i + 1] || levels[i];
      }
    }
    return { active: activeLevel, next: nextLevel };
  }, [driverPoints]);

  // 8. TACTICAL DRIVER ZONES IN CITY
  const driverZones = useMemo(() => {
    const isLdn = currentCity.toLowerCase() === 'london';
    return [
      { name: isLdn ? 'Soho Central' : 'Downtown Area', type: 'Nightlife / Food', multiplier: 2.2, demand: 'CRITICAL 🔥', color: 'from-orange-500 to-red-600', x: 200, y: 160 },
      { name: isLdn ? 'Heathrow Airport' : 'Main Airport Hub', type: 'Travel pen', multiplier: 2.5, demand: 'VERY HIGH ✈️', color: 'from-purple-500 to-indigo-600', x: 340, y: 220 },
      { name: isLdn ? 'Westminster' : 'Business Center', type: 'Offices / Tourists', multiplier: 1.4, demand: 'STEADY 💼', color: 'from-emerald-500 to-teal-600', x: 80, y: 220 },
      { name: isLdn ? 'Camden High St' : 'Student Area', type: 'Local Market', multiplier: 1.8, demand: 'BUSY 🛍️', color: 'from-pink-500 to-rose-600', x: 330, y: 100 },
    ];
  }, [currentCity]);

  // 9. HEATHROW AIRPORT DASHBOARD FEED
  const [airportQueue, setAirportQueue] = useState<number>(14);
  const [airportFlights, setAirportFlights] = useState<any[]>([
    { flight: 'LH452', origin: 'Frankfurt', status: 'LANDED', time: 'Just now', eta: '0m' },
    { flight: 'BA088', origin: 'New York JFK', status: 'ON TIME', time: 'In 12m', eta: '12m' },
    { flight: 'VS103', origin: 'Dubai Intl', status: 'DELAYED', time: 'In 24m', eta: '24m' }
  ]);
  const [isJoinedPen, setIsJoinedPen] = useState(false);

  // 10. ACTIVE DRIVE TIME & SMART BREAK REMINDER
  const [fatigueMinutes, setFatigueMinutes] = useState(155); // simulated minutes of continuous driving
  const showFatigueReminder = fatigueMinutes >= 180; // 3 hours limit

  // 11. PERSONAL RECORDS
  const personalRecords = {
    highestHourly: '£42.50/hr',
    biggestTip: '£15.00',
    longestShift: '4h 12m',
    bestDay: '£214.20',
    mostTripsHour: '5 trips'
  };

  // 12. SHIFT SESSION STATS
  const [sessionStats, setSessionStats] = useState({
    hoursWorked: 2.8,
    tripsCompleted: 8,
    milesDriven: 41.2,
    earnings: 124.50,
    tips: 18.00,
    averageTrip: 15.56,
    bestTrip: 48.00,
    longestTrip: '11.4 miles',
  });
  const [showShiftSummary, setShowShiftSummary] = useState(false);

  // 13. AI DISPATCH ASSISTANT (Jarvis advice log)
  const [aiTipIndex, setAiTipIndex] = useState(0);
  const aiTips = useMemo(() => [
    { text: "💡 Rain active! Quick Eats pickups in Shoreditch pay an average +£3.50 surcharge.", type: "tip" },
    { text: "✈️ Heathrow flight BA088 lands in 12 mins. Joining the airport queue will trigger a long-distance fare.", type: "airport" },
    { text: "🔋 Battery level is 71%. Optimized drive routing is active to preserve EV cell lifespans.", type: "battery" },
    { text: "🔥 Tactical Surge Alert: Soho Central has reached critical 2.2x demand multiplier.", type: "surge" },
    { text: "🧘 Safety reminder: You have been online for over 2.5 hours. Consider taking a 15-minute coffee break soon.", type: "warning" },
  ], []);

  // Cycle tips every 25 seconds
  useEffect(() => {
    const tipInterval = setInterval(() => {
      setAiTipIndex((prev) => (prev + 1) % aiTips.length);
    }, 25000);
    return () => clearInterval(tipInterval);
  }, [aiTips]);

  // Deplete battery slowly if online
  useEffect(() => {
    if (!isOnline || isOnBreak) return;
    const interval = setInterval(() => {
      setBatteryLevel(Math.max(1, batteryLevel - 0.2));
      setFatigueMinutes(prev => prev + 1);
    }, 15000); // simulated ticks
    return () => clearInterval(interval);
  }, [isOnline, isOnBreak, batteryLevel, setBatteryLevel]);

  // Handle joining airport pen
  const handleToggleAirportPen = () => {
    playSoundEffect('tap');
    if (isJoinedPen) {
      setIsJoinedPen(false);
      setAirportQueue(prev => prev + 1);
      appendLog("🛫 Left London Heathrow Virtual Taxi Pen queue.", "warn");
    } else {
      setIsJoinedPen(true);
      setAirportQueue(1);
      appendLog("🛫 Joined Heathrow Virtual Dispatch Pen. Current Queue: #1 (Priority)", "success");
      
      // Auto-dispatch airport ride after 8 seconds
      setTimeout(() => {
        if (!isOnline || isOnBreak) return;
        playSoundEffect('complete');
        appendLog("🛫 Airport Dispatch offer received! Premium airport passenger bound for Central London.", "earnings");
        
        // Spawn ride
        const mockAirportRide = {
          id: `sb-air-${Date.now()}`,
          passengerName: 'Lord Sebastian Coe',
          timeString: 'Due Now',
          route: 'Heathrow T5 ➔ The Savoy Hotel Strand',
          fare: 54.00,
          claimed: false,
          category: 'Swift Airport Line'
        };
        setSelectedPrebooking(mockAirportRide);
      }, 8000);
    }
  };

  // Handle going offline and showing shift summary
  const handleOfflineTransition = () => {
    playSoundEffect('tap');
    // Save or update session stats
    setSessionStats({
      hoursWorked: +(2.5 + Math.random() * 1.5).toFixed(1),
      tripsCompleted: stats.completedTripsCount || 8,
      milesDriven: +(30 + Math.random() * 25).toFixed(1),
      earnings: stats.todayEarnings || 124.50,
      tips: +(stats.todayEarnings * 0.15).toFixed(2),
      averageTrip: stats.completedTripsCount ? +(stats.todayEarnings / stats.completedTripsCount).toFixed(2) : 15.56,
      bestTrip: 48.00,
      longestTrip: '12.8 miles'
    });
    
    // Toggle offline and show shift summary modal
    setIsOnline(false);
    setShowShiftSummary(true);
    appendLog("📊 Driver shifted to Offline. Generating comprehensive Shift Performance summary.", "warn");
  };

  return (
    <div className={`flex-1 overflow-y-auto px-4 pb-16 space-y-4 pt-3 ${darkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-gray-50 text-gray-900'}`}>
      
      {/* 1. PRIMARY COCKPIT HEADER / EV STATUS BAR */}
      <div className={`p-4 rounded-3xl border shadow-sm flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center ${
        darkMode ? 'bg-zinc-900/90 border-zinc-800' : 'bg-white border-gray-150'
      }`}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md relative overflow-hidden`}>
              <Award className="w-6 h-6" />
              {isOnline && !isOnBreak && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-zinc-900 rounded-full animate-ping" />
              )}
            </div>
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <h3 className="font-sans font-black text-sm tracking-tight">Command Pilot</h3>
              <span className="text-[7px] px-1 bg-emerald-500/15 text-emerald-500 rounded font-black uppercase">Level {currentLevelInfo.active.name}</span>
            </div>
            <p className="text-[9px] text-zinc-400 font-bold mt-0.5">Shift Session Status: {isOnBreak ? '☕ On Coffee Break' : isOnline ? '🟢 Online dispatch' : '🔌 Standby Offline'}</p>
          </div>
        </div>

        {/* Battery & Dispatch Power */}
        <div className="flex items-center gap-3 justify-between md:justify-end">
          {/* Quick Recharge Battery Button */}
          <button 
            onClick={() => {
              playSoundEffect('cash');
              setBatteryLevel(100);
              appendLog("⚡ Electric Vehicle supercharged to 100% at Westminster Grid station.", "success");
            }}
            className="flex items-center gap-1 bg-[#13AA52]/10 hover:bg-[#13AA52]/20 text-[#13AA52] px-2 py-1 rounded-xl text-[8.5px] font-black uppercase tracking-wider transition active:scale-95 cursor-pointer"
            title="Plug in to EV Charger Station"
          >
            <BatteryCharging className="w-3.5 h-3.5 animate-pulse text-[#13AA52]" />
            Charge EV
          </button>

          {/* Core EV Battery Indicator */}
          <div className="text-right">
            <span className="text-[7.5px] uppercase tracking-wider text-zinc-400 font-extrabold block">EV Battery State</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[10px] font-mono font-black">{batteryLevel.toFixed(1)}%</span>
              <div className="w-16 h-2 bg-gray-200 dark:bg-zinc-800 rounded-full overflow-hidden p-0.5 border dark:border-zinc-700">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    batteryLevel > 50 ? 'bg-[#13AA52]' : batteryLevel > 20 ? 'bg-amber-500' : 'bg-red-500 animate-pulse'
                  }`} 
                  style={{ width: `${batteryLevel}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. WARNING ALERT: DRIVE FATIGUE REMINDER */}
      {showFatigueReminder && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-2xl flex items-start gap-3 text-left"
        >
          <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-500 mt-0.5 shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-[10.5px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-tight">Smart Break Advisory</h4>
            <p className="text-[9px] text-zinc-600 dark:text-zinc-400 font-medium leading-tight mt-0.5">
              You’ve been actively simulating driving for <b>{Math.floor(fatigueMinutes / 60)}h {fatigueMinutes % 60}m</b>. Fatigue indicators suggest taking a 15-minute coffee break to rest and restore customer satisfaction index.
            </p>
            <div className="flex gap-2 mt-2">
              <button 
                onClick={() => {
                  playSoundEffect('tap');
                  setIsOnBreak(true);
                  setFatigueMinutes(0);
                  appendLog("☕ Driver initiated a 15-minute restorative Coffee Break. Match queue suspended.", "warn");
                }}
                className="bg-amber-500 text-white font-black text-[8px] uppercase tracking-wider px-3 py-1 rounded-lg shadow-sm hover:bg-amber-600 transition cursor-pointer"
              >
                Take Break Now ☕
              </button>
              <button 
                onClick={() => {
                  playSoundEffect('tap');
                  setFatigueMinutes(120); // postpone alarm
                }}
                className="bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-400 font-extrabold text-[8px] uppercase px-2 py-1 rounded-lg transition"
              >
                Postpone Alarm
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* 3. SHIFT CONTROLLER / GOAL MODE COMPASS (Dual Bento Column) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Left Column: Tactical Control & Goal Ring (40% width) */}
        <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
          
          {/* Bento Block 1: Goal Mode Progress */}
          <div className={`p-4 rounded-3xl border text-left flex-1 flex flex-col justify-between ${
            darkMode ? 'bg-zinc-900/40 border-zinc-850' : 'bg-white border-gray-150'
          }`}>
            <div>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className="text-[7.5px] uppercase tracking-wider text-zinc-400 font-extrabold block">Core Directive</span>
                  <h4 className="text-[12.5px] font-black tracking-tight uppercase flex items-center gap-1 mt-0.5">
                    🎯 Goal Mode tracker
                  </h4>
                </div>
                {/* Goal Selector pills */}
                <div className="flex gap-1">
                  {[50, 100, 200].map((g) => (
                    <button
                      key={g}
                      onClick={() => {
                        playSoundEffect('tap');
                        setDailyEarningsGoal(g);
                        appendLog(`🎯 Swift shift target calibrated to £${g} goal. Drive on!`, "info");
                      }}
                      className={`text-[7.5px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider border transition-all cursor-pointer ${
                        dailyEarningsGoal === g 
                          ? 'bg-[#13AA52] border-[#13AA52] text-white' 
                          : 'bg-zinc-100 dark:bg-zinc-850 border-gray-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-300'
                      }`}
                    >
                      £{g}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-[9px] text-zinc-400 leading-normal mb-3">
                Choose your targeted shift budget goal. The AI dispatcher will prioritize matching you with optimal routes to achieve your reward milestone.
              </p>
            </div>

            {/* Circular Progress Display */}
            <div className="flex items-center gap-4 py-2.5">
              <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="32" cy="32" r="28" fill="transparent" stroke={darkMode ? '#27272a' : '#f4f4f5'} strokeWidth="5" />
                  <circle 
                    cx="32" 
                    cy="32" 
                    r="28" 
                    fill="transparent" 
                    stroke="#13AA52" 
                    strokeWidth="5" 
                    strokeDasharray={2 * Math.PI * 28}
                    strokeDashoffset={2 * Math.PI * 28 * (1 - Math.min(1.0, stats.todayEarnings / dailyEarningsGoal))}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[11px] font-mono font-black text-gray-900 dark:text-zinc-50 leading-none">
                    {Math.round((stats.todayEarnings / dailyEarningsGoal) * 100)}%
                  </span>
                </div>
              </div>
              
              <div className="flex-1 text-left space-y-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-mono font-black text-[#13AA52]">£{stats.todayEarnings.toFixed(2)}</span>
                  <span className="text-[7.5px] text-zinc-400 font-bold">of £{dailyEarningsGoal} Goal</span>
                </div>
                <div className="text-[8px] text-zinc-400 font-bold uppercase tracking-wider">
                  {stats.todayEarnings >= dailyEarningsGoal 
                    ? '🎉 Shift Milestone achieved!' 
                    : `Remaining: £${(dailyEarningsGoal - stats.todayEarnings).toFixed(2)}`
                  }
                </div>
                {/* Progress bar details */}
                <div className="w-full bg-gray-100 dark:bg-zinc-850 h-1 rounded-full overflow-hidden mt-1">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, (stats.todayEarnings / dailyEarningsGoal) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bento Block 2: Interactive Incident Reporter */}
          <div className={`p-4 rounded-3xl border text-left ${
            darkMode ? 'bg-zinc-900/40 border-zinc-850' : 'bg-white border-gray-150'
          }`}>
            <span className="text-[7.5px] uppercase tracking-wider text-zinc-400 font-extrabold block">Live Feed</span>
            <h4 className="text-[12px] font-black uppercase tracking-tight flex items-center gap-1.5 mt-0.5">
              🚨 Incident Control Center
            </h4>
            
            <p className="text-[9px] text-zinc-400 leading-normal mt-1 mb-2.5">
              Avoid designated road delays. Report active congestion to earn driver reputation and points.
            </p>

            <div className="space-y-1.5 max-h-[145px] overflow-y-auto pr-0.5">
              {incidents.map((inc) => (
                <div key={inc.id} className={`p-2 rounded-xl border flex items-start gap-2 text-[8px] ${
                  darkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-gray-50/50 border-gray-150'
                }`}>
                  <span className="text-sm mt-0.5 shrink-0">
                    {inc.type === 'road_closure' ? '🚧' : inc.type === 'accident' ? '💥' : '👮'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center gap-1">
                      <span className="font-extrabold text-gray-900 dark:text-zinc-100 truncate block">{inc.title}</span>
                      <span className="font-mono text-rose-500 font-bold shrink-0">{inc.delay}</span>
                    </div>
                    <p className="text-zinc-400 font-semibold mt-0.5 leading-normal">{inc.detail}</p>
                    <button 
                      onClick={() => {
                        playSoundEffect('tap');
                        setIncidents(prev => prev.filter(i => i.id !== inc.id));
                        setDriverPoints(p => p + 15);
                        appendLog(`🚨 Incident cleared or rerouted: "${inc.title}". Driver rewarded +15 reputation points!`, 'success');
                      }}
                      className="text-[#13AA52] hover:underline font-black text-[7.5px] uppercase tracking-wider mt-1 block"
                    >
                      ✓ Mark Cleared / Alternate Route Active (+15 pts)
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Report Tool */}
            <div className="flex gap-1 mt-2.5">
              <button 
                onClick={() => {
                  playSoundEffect('tap');
                  const randomReport = {
                    id: `inc-${Date.now()}`,
                    type: 'accident',
                    title: 'Accident Reported near Hyde Park Corner',
                    detail: 'Simulated multi-vehicle collision. Expected delay +15m.',
                    delay: '+15m delay',
                    severity: 'high'
                  };
                  setIncidents([randomReport, ...incidents]);
                  setDriverPoints(p => p + 25);
                  appendLog("🚨 Added user dispatch report: Accident near Hyde Park. +25 Driver points rewarded!", "success");
                }}
                className="flex-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-wider border border-rose-500/20 transition cursor-pointer flex items-center justify-center gap-1"
              >
                ⚠️ Report Accident
              </button>
              <button 
                onClick={() => {
                  playSoundEffect('tap');
                  const randomClosure = {
                    id: `inc-${Date.now()}`,
                    type: 'road_closure',
                    title: 'Heavy Congestion: Oxford Street',
                    detail: 'High shopping volume pedestrian overflow delay.',
                    delay: '+8m delay',
                    severity: 'medium'
                  };
                  setIncidents([randomClosure, ...incidents]);
                  setDriverPoints(p => p + 20);
                  appendLog("🚨 Added user dispatch report: Congestion near Oxford St. +20 Driver points rewarded!", "success");
                }}
                className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-wider border border-amber-500/20 transition cursor-pointer flex items-center justify-center gap-1"
              >
                🚧 Report Closed Road
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Grid & AI Dispatch (70% width) */}
        <div className="lg:col-span-7 space-y-4 flex flex-col justify-between">
          
          {/* Bento Block 3: Dynamic Command Dashboard Map & Environmental Variables */}
          <div className={`p-4 rounded-3xl border text-left flex-1 flex flex-col justify-between gap-3 ${
            darkMode ? 'bg-zinc-900/40 border-zinc-850' : 'bg-white border-gray-150'
          }`}>
            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-zinc-800">
              <div>
                <span className="text-[7.5px] uppercase tracking-wider text-zinc-400 font-extrabold block">Live Demand Status</span>
                <h4 className="text-[12.5px] font-black uppercase tracking-tight flex items-center gap-1.5">
                  🗺️ Driver Zones Dashboard ({currentCity})
                </h4>
              </div>

              {/* City Selection dropdown inside bento */}
              <select
                value={currentCity}
                onChange={(e) => {
                  playSoundEffect('tap');
                  setCurrentCity(e.target.value);
                  appendLog(`🗺️ City simulation bounds configured: ${e.target.value}. Loading coordinates...`, "success");
                }}
                className={`text-[8.5px] font-black uppercase tracking-wider py-1 px-2 rounded-lg border focus:outline-none cursor-pointer ${
                  darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-gray-200 text-gray-900'
                }`}
              >
                {['London', 'Birmingham', 'Manchester', 'Leeds', 'Bristol', 'Glasgow', 'Edinburgh', 'Accra'].map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            {/* Environmental Weather Panel */}
            <div className={`p-2.5 rounded-2xl border flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between ${
              darkMode ? 'bg-zinc-950/40 border-zinc-850' : 'bg-gray-50/50 border-gray-150'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                  {weather === 'sunny' ? <Sun className="w-4.5 h-4.5 text-yellow-500 animate-spin" style={{ animationDuration: '6000ms' }} /> :
                   weather === 'rainy' ? <CloudRain className="w-4.5 h-4.5 text-blue-400 animate-bounce" /> :
                   weather === 'snowy' ? <CloudSnow className="w-4.5 h-4.5 text-cyan-400 animate-pulse" /> :
                   <Zap className="w-4.5 h-4.5 text-red-500 animate-bounce" />}
                </div>
                <div className="text-left">
                  <span className="text-[7px] text-zinc-400 font-extrabold uppercase block leading-none">Simulated Weather</span>
                  <span className="text-[10px] font-black uppercase tracking-tight block mt-0.5">{weatherModifier.label}</span>
                  <span className="text-[7.5px] text-zinc-400 block mt-0.5 font-sans leading-none">{weatherModifier.description}</span>
                </div>
              </div>

              {/* Weather switchers */}
              <div className="flex gap-1">
                {(['sunny', 'rainy', 'snowy', 'stormy'] as const).map((w) => (
                  <button
                    key={w}
                    onClick={() => {
                      playSoundEffect('tap');
                      setWeather(w);
                      setSurgeLevel(w === 'stormy' ? 'high' : w === 'snowy' ? 'high' : 'medium');
                      appendLog(`🌦️ Weather changed to ${w.toUpperCase()}. Surge and passenger matches recalculated.`, 'success');
                    }}
                    className={`text-[7.5px] font-black uppercase tracking-wider py-1 px-2 rounded-lg border transition cursor-pointer ${
                      weather === w 
                        ? 'bg-amber-500 border-amber-500 text-white shadow-sm' 
                        : 'bg-transparent border-gray-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-300'
                    }`}
                  >
                    {w === 'sunny' ? '☀️' : w === 'rainy' ? '🌧️' : w === 'snowy' ? '❄️' : '⚡'} {w}
                  </button>
                ))}
              </div>
            </div>

            {/* Tactical Grid / Zones Map */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
              {driverZones.map((zone) => (
                <div 
                  key={zone.name} 
                  className={`p-3 rounded-2xl border text-left flex flex-col justify-between bg-gradient-to-br relative overflow-hidden group shadow-xs ${
                    darkMode ? 'bg-zinc-950/20 border-zinc-850' : 'bg-white border-gray-150'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start gap-1">
                      <span className="text-[9.5px] font-black text-gray-900 dark:text-zinc-50 truncate leading-tight block">{zone.name}</span>
                      <span className="text-[7.5px] font-mono font-black text-[#13AA52] bg-emerald-500/10 px-1 rounded-sm">
                        {zone.multiplier.toFixed(1)}x Surge
                      </span>
                    </div>
                    <span className="text-[7px] text-zinc-400 font-bold uppercase tracking-wider block mt-0.5">{zone.type}</span>
                  </div>

                  <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-gray-100 dark:border-zinc-900">
                    <div>
                      <span className="text-[6.5px] uppercase tracking-wider text-zinc-400 font-extrabold block">Live Demand</span>
                      <span className="text-[8px] font-black text-amber-500">{zone.demand}</span>
                    </div>

                    {/* Simulation Dispatch Spawn Ride */}
                    <button
                      onClick={() => {
                        if (!isOnline) {
                          appendLog("⚠️ Cannot spawn dispatches. Go Online first!", "warn");
                          playSoundEffect('warning');
                          return;
                        }
                        if (isOnBreak) {
                          appendLog("⚠️ Suspended: Cannot spawn offers while resting on Coffee Break.", "warn");
                          playSoundEffect('warning');
                          return;
                        }
                        playSoundEffect('tap');
                        
                        // Spawn ride from Zone
                        const randomPassenger = ['David Attenborough', 'Rowan Atkinson', 'Emma Watson', 'Gordon Ramsay', 'Adele'][Math.floor(Math.random() * 5)];
                        const multiplier = zone.multiplier * weatherModifier.surgeBoost;
                        const fare = +( (12.50 + Math.random() * 15.00) * multiplier ).toFixed(2);
                        
                        const mockRideOffer = {
                          id: `sb-z-${Date.now()}`,
                          passengerName: randomPassenger,
                          timeString: 'Due Now',
                          route: `${zone.name} ➔ Central London Plaza`,
                          fare,
                          claimed: false,
                          category: mode === 'food' ? 'Eats Courier delivery' : 'Swift Premium'
                        };

                        setSelectedPrebooking(mockRideOffer);
                        appendLog(`📡 Tactical dispatch triggered from ${zone.name}. Payout multiplier is set to ${multiplier.toFixed(1)}x.`, 'success');
                      }}
                      className="bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-black text-[8px] uppercase tracking-wider py-1 px-2 rounded-lg transition active:scale-95 cursor-pointer"
                    >
                      📡 Offer Match
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Smart Demand Forecast message line */}
            <div className={`p-2 rounded-xl text-left text-[8.5px] border font-sans font-bold flex items-center gap-1.5 ${
              darkMode ? 'bg-zinc-950/40 border-zinc-850 text-emerald-400' : 'bg-emerald-50/20 border-emerald-100 text-emerald-600'
            }`}>
              <Radio className="w-3.5 h-3.5 animate-pulse shrink-0" />
              <span>📡 Demand forecast: &quot;Demand expected to rise in 20 minutes across travel terminals.&quot;</span>
            </div>
          </div>

          {/* Bento Block 4: AI Dispatch Assistant - Jarvis Panel */}
          <div className={`p-4 rounded-3xl border text-left ${
            darkMode ? 'bg-zinc-900/40 border-zinc-850' : 'bg-white border-gray-150'
          }`}>
            <div className="flex justify-between items-center pb-2.5 border-b border-gray-100 dark:border-zinc-800">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4.5 h-4.5 text-amber-500 animate-pulse" />
                <h4 className="text-[12px] font-black uppercase tracking-tight">
                  🤖 AI Dispatch Co-Pilot (Jarvis)
                </h4>
              </div>
              <span className="text-[7.5px] font-mono bg-amber-500/10 text-amber-500 font-extrabold px-1.5 py-0.5 rounded uppercase">AI Advisory</span>
            </div>

            <div className="py-3 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-white shrink-0 font-extrabold text-xs shadow-md">
                🤖
              </div>
              <div className="flex-1">
                <span className="text-[7px] text-zinc-400 font-extrabold uppercase tracking-wider block">Jarvis Recommends</span>
                <p className="text-[10px] text-zinc-700 dark:text-zinc-200 font-black leading-snug mt-0.5 italic">
                  &quot;{aiTips[aiTipIndex].text}&quot;
                </p>
              </div>
            </div>

            {/* Quick coaching prompts */}
            <div className="flex flex-wrap gap-1 pt-1.5 border-t border-gray-100 dark:border-zinc-900">
              <button 
                onClick={() => {
                  playSoundEffect('tap');
                  appendLog("🤖 AI Pilot: Position optimization active. Set coordinates 2.1 miles east near Soho to enter high-surge zones.", "success");
                  setSurgeLevel('high');
                }}
                className="bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-[8px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg transition active:scale-95 text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                📍 Optimize Position
              </button>
              <button 
                onClick={() => {
                  playSoundEffect('tap');
                  appendLog(`🤖 AI Pilot: Weather: ${weather.toUpperCase()} is boosting Swift Eats demand by +2.0x. Recommend loading insulated delivery container on back rack.`, "info");
                }}
                className="bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-[8px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg transition active:scale-95 text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                📊 Analyze surge
              </button>
              <button 
                onClick={() => {
                  playSoundEffect('tap');
                  appendLog("🤖 AI Pilot: Active restaurant queues are currently fast-moving with average 4.5m ticket response times.", "info");
                }}
                className="bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-[8px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg transition active:scale-95 text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                Scan for Food dispatches
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. DYNAMIC MEALS TIMELINE SLIDER (Full Width Row) */}
      <div className={`p-4 rounded-3xl border text-left ${
        darkMode ? 'bg-zinc-900/40 border-zinc-850' : 'bg-white border-gray-150'
      }`}>
        <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-zinc-800">
          <div>
            <span className="text-[7.5px] uppercase tracking-wider text-zinc-400 font-extrabold block">Dispatcher Demand Scheduler</span>
            <h4 className="text-[12.5px] font-black uppercase tracking-tight flex items-center gap-1.5 mt-0.5">
              🍕 Meal Peak Demand Windows (Real-Time Simulator)
            </h4>
          </div>
          <span className="text-[7.5px] font-mono text-[#13AA52] font-black uppercase">Clock synced</span>
        </div>

        <p className="text-[9.5px] text-zinc-400 mt-1.5 mb-3 leading-normal">
          Toggle different meal periods. Each demand phase dynamically unlocks targeted dispatch profiles (e.g. Breakfast coffee orders vs Late Night pub crawls) and recalculates Surge multiples!
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {timeWindows.map((t) => (
            <div
              key={t.id}
              onClick={() => {
                playSoundEffect('tap');
                setSelectedPeak(t.id as any);
                setSurgeLevel(t.id === 'dinner' ? 'high' : t.id === 'breakfast' || t.id === 'lunch' ? 'medium' : 'low');
                appendLog(`⏰ Timetable phase shifted to ${t.label.toUpperCase()}. Target surge adjusted automatically.`, 'info');
              }}
              className={`p-3 rounded-2xl border text-left transition duration-200 cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                t.active 
                  ? 'border-emerald-500 bg-emerald-500/5 shadow-xs' 
                  : 'bg-zinc-900/10 dark:bg-zinc-900/5 hover:bg-zinc-900/20 border-gray-150 dark:border-zinc-850'
              }`}
            >
              <div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-extrabold text-gray-900 dark:text-zinc-100 block">{t.label}</span>
                  {t.active && <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                </div>
                <span className="text-[7.5px] text-zinc-400 font-bold block mt-0.5 uppercase tracking-wide">{t.hours}</span>
                <p className="text-[8.5px] text-zinc-500 dark:text-zinc-400 font-medium leading-tight mt-1.5 italic">{t.common}</p>
              </div>

              <div className="mt-3.5 pt-2 border-t border-gray-150/40 dark:border-zinc-800 flex justify-between items-center">
                <span className="text-[7px] text-zinc-400 font-bold uppercase block">Peak Strength</span>
                <span className="text-[8px] font-extrabold text-emerald-500">{t.peak}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. MULTI-COL COMPLEX: AIRPORT FEED / PREDICTION SUMMARY / REPUTATION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Col 1: Heathrow Airport Dashboard (40% width) */}
        <div className="lg:col-span-5 space-y-4">
          <div className={`p-4 rounded-3xl border text-left ${
            darkMode ? 'bg-zinc-900/40 border-zinc-850' : 'bg-white border-gray-150'
          }`}>
            <span className="text-[7.5px] uppercase tracking-wider text-zinc-400 font-extrabold block">Aviation Dispatch Feed</span>
            <h4 className="text-[12.5px] font-black uppercase tracking-tight flex items-center gap-1.5 mt-0.5">
              🛫 Airport Dashboard (Heathrow T5 Feed)
            </h4>

            <p className="text-[9.5px] text-zinc-400 leading-normal mt-1 mb-3">
              Monitor landing flights. Join the virtual queue pen to receive automatic premium airport bookings.
            </p>

            <div className={`p-3 rounded-2xl border flex items-center justify-between gap-3 mb-3 ${
              darkMode ? 'bg-zinc-950/40 border-zinc-850' : 'bg-gray-50/50 border-gray-150'
            }`}>
              <div className="text-left">
                <span className="text-[7.5px] text-zinc-400 font-extrabold uppercase block leading-none">Queue Size</span>
                <span className="text-[12.5px] font-mono font-black text-gray-900 dark:text-zinc-50 block mt-0.5">
                  {isJoinedPen ? 'Position #1 (Priority)' : `${airportQueue} Drivers in Pen`}
                </span>
                <span className="text-[7px] text-zinc-400 block mt-0.5 font-sans leading-none">Average Wait: ~12 minutes</span>
              </div>

              <button
                onClick={handleToggleAirportPen}
                className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-wider transition duration-150 active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-sm ${
                  isJoinedPen 
                    ? 'bg-rose-500 text-white hover:bg-rose-600' 
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                <Plane className="w-3.5 h-3.5" />
                {isJoinedPen ? 'Leave Pen Queue' : 'Join Pen Queue 🛫'}
              </button>
            </div>

            {/* Flight arrivals ticker */}
            <div className="space-y-1 max-h-[145px] overflow-y-auto pr-0.5">
              <span className="text-[7px] uppercase tracking-wider text-zinc-400 font-extrabold block mb-1">Incoming flight board</span>
              {airportFlights.map((fl) => (
                <div key={fl.flight} className={`p-2 rounded-xl border flex items-center justify-between gap-1.5 text-[8.5px] ${
                  darkMode ? 'bg-zinc-900/50 border-zinc-800' : 'bg-gray-50/50 border-gray-150'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="text-base">✈️</span>
                    <div className="text-left">
                      <span className="font-extrabold block text-gray-900 dark:text-zinc-100 leading-none">{fl.flight}</span>
                      <span className="text-[7.5px] text-zinc-400 leading-none">From {fl.origin}</span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <span className={`text-[8px] font-mono font-black ${
                      fl.status === 'LANDED' ? 'text-emerald-500' : fl.status === 'DELAYED' ? 'text-rose-500' : 'text-amber-500'
                    }`}>{fl.status}</span>
                    <span className="text-[7.5px] text-zinc-400 block leading-none mt-0.5">{fl.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Col 2: Earnings Predictor & Reputation Cards (80% width combined) */}
        <div className="lg:col-span-7 space-y-4">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Predictor Panel */}
            <div className={`p-4 rounded-3xl border text-left flex flex-col justify-between ${
              darkMode ? 'bg-zinc-900/40 border-zinc-850' : 'bg-white border-gray-150'
            }`}>
              <div>
                <span className="text-[7.5px] uppercase tracking-wider text-zinc-400 font-extrabold block">Shift Budgeting</span>
                <h4 className="text-[12.5px] font-black uppercase tracking-tight flex items-center gap-1.5 mt-0.5">
                  💰 Smart Earnings Predictor
                </h4>
                <p className="text-[9px] text-zinc-400 leading-normal mt-1">
                  Estimated driver earnings based on current weather (<b>{weather}</b>), clock phase, and surge multipliers.
                </p>
              </div>

              <div className="space-y-2 mt-4">
                <div className="flex justify-between items-center pb-1.5 border-b border-gray-100 dark:border-zinc-800">
                  <span className="text-[8.5px] text-zinc-400 font-bold uppercase">Stay online 30 min</span>
                  <span className="text-[10px] font-mono font-black text-emerald-500">£{earningsPrediction.min30} – £{earningsPrediction.max30}</span>
                </div>
                <div className="flex justify-between items-center pb-1.5 border-b border-gray-100 dark:border-zinc-800">
                  <span className="text-[8.5px] text-zinc-400 font-bold uppercase">Stay online 1 hour</span>
                  <span className="text-[10px] font-mono font-black text-emerald-500">£{earningsPrediction.min1h} – £{earningsPrediction.max1h}</span>
                </div>
                <div className="flex justify-between items-center pb-1.5 border-b border-gray-100 dark:border-zinc-800">
                  <span className="text-[8.5px] text-zinc-400 font-bold uppercase">Stay online 2 hours</span>
                  <span className="text-[10px] font-mono font-black text-emerald-500">£{earningsPrediction.min2h} – £{earningsPrediction.max2h}</span>
                </div>
              </div>

              <div className="text-[7px] text-zinc-400 font-bold uppercase tracking-wider mt-3 italic">
                *Predictions fluctuate dynamically based on live client surge maps.
              </div>
            </div>

            {/* Reputation Ratings Panel */}
            <div className={`p-4 rounded-3xl border text-left flex flex-col justify-between ${
              darkMode ? 'bg-zinc-900/40 border-zinc-850' : 'bg-white border-gray-150'
            }`}>
              <div>
                <span className="text-[7.5px] uppercase tracking-wider text-zinc-400 font-extrabold block">Audit Metrics</span>
                <h4 className="text-[12.5px] font-black uppercase tracking-tight flex items-center gap-1.5 mt-0.5">
                  ⭐ Driver Reputation Matrix
                </h4>
                <p className="text-[9px] text-zinc-400 leading-normal mt-1">
                  Individual passenger feedback scores. Maintain 4.7 stars across all classes to preserve Gold matching.
                </p>
              </div>

              <div className="space-y-1.5 mt-3">
                <div className="flex justify-between items-center text-[8.5px]">
                  <span className="text-zinc-400 font-bold uppercase">⚡ Navigation precision</span>
                  <span className="font-mono font-black text-gray-900 dark:text-zinc-50">{reputation.navigation.toFixed(1)} / 5</span>
                </div>
                <div className="flex justify-between items-center text-[8.5px]">
                  <span className="text-zinc-400 font-bold uppercase">💬 Friendliness score</span>
                  <span className="font-mono font-black text-gray-900 dark:text-zinc-50">{reputation.friendliness.toFixed(1)} / 5</span>
                </div>
                <div className="flex justify-between items-center text-[8.5px]">
                  <span className="text-zinc-400 font-bold uppercase">🍕 Safe food handling</span>
                  <span className="font-mono font-black text-gray-900 dark:text-zinc-50">{reputation.foodHandling.toFixed(1)} / 5</span>
                </div>
                <div className="flex justify-between items-center text-[8.5px]">
                  <span className="text-zinc-400 font-bold uppercase">🚀 Driving speed rate</span>
                  <span className="font-mono font-black text-gray-900 dark:text-zinc-50">{reputation.speed.toFixed(1)} / 5</span>
                </div>
                <div className="flex justify-between items-center text-[8.5px]">
                  <span className="text-zinc-400 font-bold uppercase">📈 Order acceptance</span>
                  <span className="font-mono font-black text-emerald-500">{reputation.acceptanceRate}%</span>
                </div>
              </div>

              <div className="mt-3.5 pt-2.5 border-t border-gray-100 dark:border-zinc-800 flex justify-between items-center">
                <span className="text-[7.5px] uppercase tracking-wider text-zinc-400 font-extrabold block">Account Level Badge</span>
                <span className="text-[9.5px] font-sans font-extrabold text-emerald-500 uppercase">{currentLevelInfo.active.name} Class</span>
              </div>
            </div>

          </div>

          {/* Bento Row: Personal Records Dashboard */}
          <div className={`p-4 rounded-3xl border text-left ${
            darkMode ? 'bg-zinc-900/40 border-zinc-850' : 'bg-white border-gray-150'
          }`}>
            <span className="text-[7.5px] uppercase tracking-wider text-zinc-400 font-extrabold block">Driver Hall of Fame</span>
            <h4 className="text-[12.5px] font-black uppercase tracking-tight flex items-center gap-1.5 mt-0.5">
              🥇 Personal Shift Records & Milestone achievements
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-3">
              <div className="p-2 rounded-2xl bg-zinc-100 dark:bg-zinc-950/40 border dark:border-zinc-900 text-center">
                <span className="text-[7px] text-zinc-400 uppercase font-black block">Best Hour</span>
                <span className="text-[10px] font-mono font-black text-[#13AA52] block mt-1">{personalRecords.highestHourly}</span>
              </div>
              <div className="p-2 rounded-2xl bg-zinc-100 dark:bg-zinc-950/40 border dark:border-zinc-900 text-center">
                <span className="text-[7px] text-zinc-400 uppercase font-black block">Biggest Tip</span>
                <span className="text-[10px] font-mono font-black text-emerald-500 block mt-1">{personalRecords.biggestTip}</span>
              </div>
              <div className="p-2 rounded-2xl bg-zinc-100 dark:bg-zinc-950/40 border dark:border-zinc-900 text-center">
                <span className="text-[7px] text-zinc-400 uppercase font-black block">Longest shift</span>
                <span className="text-[10px] font-mono font-black text-gray-900 dark:text-zinc-50 block mt-1">{personalRecords.longestShift}</span>
              </div>
              <div className="p-2 rounded-2xl bg-zinc-100 dark:bg-zinc-950/40 border dark:border-zinc-900 text-center">
                <span className="text-[7px] text-zinc-400 uppercase font-black block">Best Day net</span>
                <span className="text-[10px] font-mono font-black text-amber-500 block mt-1">{personalRecords.bestDay}</span>
              </div>
              <div className="p-2 rounded-2xl bg-zinc-100 dark:bg-zinc-950/40 border dark:border-zinc-900 text-center col-span-2 sm:col-span-1">
                <span className="text-[7px] text-zinc-400 uppercase font-black block">Hourly peak</span>
                <span className="text-[10px] font-mono font-black text-purple-500 block mt-1">{personalRecords.mostTripsHour}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 6. COMPLETED SHIFT ARCADE SUMMARY MODAL */}
      <AnimatePresence>
        {showShiftSummary && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={`w-full max-w-md rounded-3xl p-6 text-left border shadow-2xl relative overflow-hidden ${
                darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-gray-150 text-gray-900'
              }`}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl" />
              
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <Trophy className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-tight">Shift Summary report</h3>
                  <span className="text-[8px] font-mono font-bold text-zinc-400">SESSION AUDIT COMPLETED</span>
                </div>
              </div>

              <p className="text-[9.5px] text-zinc-400 mb-5 leading-normal">
                Congratulations on completing your Swift Driver dispatch shift. Below is your verified simulator shift earnings debrief and performance score.
              </p>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="p-3 rounded-2xl bg-gray-50 dark:bg-zinc-950 border dark:border-zinc-900 text-left">
                  <span className="text-[7px] text-zinc-400 uppercase font-black block">Shift Duration</span>
                  <span className="text-[12px] font-mono font-black block mt-0.5">{sessionStats.hoursWorked} Hours</span>
                </div>
                <div className="p-3 rounded-2xl bg-gray-50 dark:bg-zinc-950 border dark:border-zinc-900 text-left">
                  <span className="text-[7px] text-zinc-400 uppercase font-black block">Trips Completed</span>
                  <span className="text-[12px] font-mono font-black text-emerald-500 block mt-0.5">{sessionStats.tripsCompleted} Rides</span>
                </div>
                <div className="p-3 rounded-2xl bg-gray-50 dark:bg-zinc-950 border dark:border-zinc-900 text-left">
                  <span className="text-[7px] text-zinc-400 uppercase font-black block">Total Miles Driven</span>
                  <span className="text-[12px] font-mono font-black block mt-0.5">{sessionStats.milesDriven} mi</span>
                </div>
                <div className="p-3 rounded-2xl bg-gray-50 dark:bg-zinc-950 border dark:border-zinc-900 text-left">
                  <span className="text-[7px] text-zinc-400 uppercase font-black block">Average Payout</span>
                  <span className="text-[12px] font-mono font-black text-[#13AA52] block mt-0.5">£{sessionStats.averageTrip.toFixed(2)}</span>
                </div>

                <div className="col-span-2 p-3.5 rounded-2xl bg-[#13AA52]/5 border border-[#13AA52]/20 text-left">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[8px] text-zinc-400 uppercase font-black block">Core Shift Payout</span>
                    <span className="text-[9px] font-mono font-bold">£{sessionStats.earnings.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-baseline mt-1 pb-2 border-b border-dashed border-[#13AA52]/20">
                    <span className="text-[8px] text-zinc-400 uppercase font-black block">Voluntary tips</span>
                    <span className="text-[9px] font-mono font-bold text-emerald-500">+£{sessionStats.tips}</span>
                  </div>
                  <div className="flex justify-between items-baseline mt-2 font-black text-gray-900 dark:text-zinc-100">
                    <span className="text-[9.5px] uppercase">Net Shift Earnings</span>
                    <span className="text-[14px] font-mono text-[#13AA52]">£{(sessionStats.earnings + parseFloat(sessionStats.tips as any)).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="space-y-2">
                <button
                  onClick={() => {
                    playSoundEffect('cash');
                    setShowShiftSummary(false);
                    setIsOnline(true);
                    appendLog("🟢 Shift restarted successfully. Driver entered online dispatch queues.", "success");
                  }}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-black text-[10.5px] uppercase tracking-wide py-2.5 rounded-xl transition duration-200 active:scale-98 shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-4 h-4" />
                  Start New Online Shift 🚕
                </button>
                <button
                  onClick={() => {
                    playSoundEffect('tap');
                    setShowShiftSummary(false);
                  }}
                  className={`w-full py-2.5 rounded-xl font-sans font-black text-[10.5px] uppercase tracking-wide transition ${
                    darkMode ? 'bg-zinc-800 hover:bg-zinc-750 text-zinc-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  Close & View Command Dashboard
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. QUICK ACTION FLOATERS */}
      {!isOnline && (
        <div className="pt-2 select-none">
          <button
            onClick={() => {
              playSoundEffect('complete');
              setIsOnline(true);
              appendLog("🟢 Driver is now Online. Swift Command Center dispatch active.", "success");
            }}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white py-3 rounded-2xl font-sans font-black text-xs uppercase tracking-wide shadow-lg active:scale-98 transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Play className="w-4 h-4 text-white" />
            Go Online Dispatch 🚕
          </button>
        </div>
      )}

      {isOnline && (
        <div className="pt-2 select-none">
          <button
            onClick={handleOfflineTransition}
            className="w-full bg-red-500/10 hover:bg-red-500/25 border border-red-500/25 text-red-500 py-3 rounded-2xl font-sans font-black text-xs uppercase tracking-wide shadow-xs active:scale-98 transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-rose-500" />
            Shift Offline (Summary & Break) 🔌
          </button>
        </div>
      )}

    </div>
  );
};
