import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  DriverStats, RideRequest, TripProgress, SimulatorLog, CompletedTrip, ActiveChat, TripStage 
} from './types';
import { MapSimulator } from './components/MapSimulator';
import { 
  playTapSound, playCompleteRideSound, playWarningSound, playIncomingRideSound 
} from './utils/SoundGenerator';
import { 
  Navigation, Star, Zap, Clock, Landmark, Sparkles, MessageSquare, 
  AlertTriangle, CheckCircle, Smartphone, Wifi, Battery, Menu, Bell, 
  ChevronRight, Car, HelpCircle, Settings, LogOut, Check, ArrowRight, X, Phone, User, Calendar, Coffee
} from 'lucide-react';

// Preset mock matches matching the London UK screenshots precisely!
const TAXI_MOCK_RIDES: any[] = [
  {
    id: 'taxi-1',
    passengerName: 'Mark Sterling',
    passengerRating: 4.9,
    pickupAddress: 'Piccadilly Circus / Regent Street',
    dropoffAddress: 'Mayfair / Oxford Street',
    fare: 14.50,
    distance: 4.2,
    pickupCoordinate: { x: 200, y: 120 }, 
    dropoffCoordinate: { x: 340, y: 420 }, 
    estimatedMinutes: 12,
  },
  {
    id: 'taxi-2',
    passengerName: 'Sarah Bennet',
    passengerRating: 4.8,
    pickupAddress: 'City of London / Threadneedle St',
    dropoffAddress: 'Hyde Park Garden Road / Piccadilly',
    fare: 32.20,
    distance: 14.8,
    pickupCoordinate: { x: 80, y: 280 }, 
    dropoffCoordinate: { x: 100, y: 70 }, 
    estimatedMinutes: 24,
  },
  {
    id: 'taxi-3',
    passengerName: 'David Miller',
    passengerRating: 4.95,
    pickupAddress: 'London Heathrow Airport (LHR) Terminal 5',
    dropoffAddress: 'The Savoy Hotel, Strand, West End',
    fare: 54.00,
    distance: 26.5,
    pickupCoordinate: { x: 80, y: 280 }, 
    dropoffCoordinate: { x: 200, y: 120 }, 
    estimatedMinutes: 35,
  }
];

const FOOD_MOCK_RIDES: any[] = [
  {
    id: 'food-1',
    passengerName: 'James Okafor',
    passengerRating: 4.88,
    pickupAddress: "Nando's, Piccadilly Circus, London",
    dropoffAddress: 'Mayfair Presidential Residences, London',
    fare: 6.80,
    distance: 0.5,
    pickupCoordinate: { x: 200, y: 380 }, 
    dropoffCoordinate: { x: 100, y: 460 }, 
    estimatedMinutes: 3,
    foodItem: '1 x Peri-Peri Chicken with Regular Chips & Fanta',
  },
  {
    id: 'food-2',
    passengerName: 'Clara Oswald',
    passengerRating: 4.9,
    pickupAddress: 'Gourmet Burger Kitchen, Oxford Street',
    dropoffAddress: 'Kensington Garden Apartments, London',
    fare: 11.50,
    distance: 3.4,
    pickupCoordinate: { x: 340, y: 250 }, 
    dropoffCoordinate: { x: 105, y: 190 }, 
    estimatedMinutes: 9,
    foodItem: '2 x Bacon Guild Cheeseburgers + Truffle Fries',
  }
];

const INITIAL_TAXI_STATS: DriverStats = {
  rating: 4.9,
  acceptanceRate: 98,
  cancellationRate: 1,
  todayEarnings: 156.40,
  weeklyEarnings: 824.50,
  hoursOnline: 3.75, // 3h 45m
  completedTripsCount: 4,
  balance: 156.40,
};

const INITIAL_FOOD_STATS: DriverStats = {
  rating: 5.0,
  acceptanceRate: 100,
  cancellationRate: 0,
  todayEarnings: 84.20,
  weeklyEarnings: 512.60,
  hoursOnline: 2.5, // 2h 30m
  completedTripsCount: 3,
  balance: 84.20,
};

export default function App() {
  // Simulator configuration states
  const [mode, setMode] = useState<'taxi' | 'food'>(() => {
    const saved = localStorage.getItem('bolt_sim_mode');
    return (saved as 'taxi' | 'food') || 'taxi';
  });

  const [activeTab, setActiveTab] = useState<'home' | 'earnings' | 'wallet' | 'profile'>('home');

  // Stats for both modes separately to support dynamic swapping!
  const [taxiStats, setTaxiStats] = useState<DriverStats>(() => {
    const saved = localStorage.getItem('bolt_sim_taxi_stats');
    return saved ? JSON.parse(saved) : INITIAL_TAXI_STATS;
  });

  const [foodStats, setFoodStats] = useState<DriverStats>(() => {
    const saved = localStorage.getItem('bolt_sim_food_stats');
    return saved ? JSON.parse(saved) : INITIAL_FOOD_STATS;
  });

  const stats = useMemo(() => {
    return mode === 'taxi' ? taxiStats : foodStats;
  }, [mode, taxiStats, foodStats]);

  const setStats = useCallback((updater: (s: DriverStats) => DriverStats) => {
    if (mode === 'taxi') {
      setTaxiStats(p => updater(p));
    } else {
      setFoodStats(p => updater(p));
    }
  }, [mode]);

  // Completed trips tracking
  const [taxiTrips, setTaxiTrips] = useState<CompletedTrip[]>([]);
  const [foodTrips, setFoodTrips] = useState<CompletedTrip[]>([]);

  const completedTrips = useMemo(() => {
    return mode === 'taxi' ? taxiTrips : foodTrips;
  }, [mode, taxiTrips, foodTrips]);

  const setCompletedTrips = (updater: any) => {
    if (mode === 'taxi') {
      setTaxiTrips(updater);
    } else {
      setFoodTrips(updater);
    }
  };

  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isOnBreak, setIsOnBreak] = useState<boolean>(false);
  const [surgeLevel, setSurgeLevel] = useState<'low' | 'medium' | 'high'>('high');
  const [simSpeed, setSimSpeed] = useState<number>(2);
  const [batteryLevel, setBatteryLevel] = useState<number>(71);
  const [autoAccept, setAutoAccept] = useState<boolean>(false);
  const [currentNotification, setCurrentNotification] = useState<string | null>(null);

  // Sound generator toggle
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Main navigation trip progress tracker
  const [tripProgress, setTripProgress] = useState<TripProgress>({
    stage: 'idle',
    currentRide: null,
    offerTimeRemaining: 0,
    totalOfferTime: 12,
    navigationProgress: 0,
    etaMinutes: 0,
  });

  const [chatMessages, setChatMessages] = useState<ActiveChat[]>([]);
  const [justCompletedTrip, setJustCompletedTrip] = useState<CompletedTrip | null>(null);
  const [showCelebration, setShowCelebration] = useState<boolean>(false);

  const [logs, setLogs] = useState<SimulatorLog[]>([
    {
      id: 'init-1',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'info',
      message: '⚡ Swift telemetric cores initialized. Standard Port 3000 running.',
    },
    {
      id: 'init-2',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'info',
      message: 'UK Dispatch Server connected: London (Westminster, Mayfair). Currency: British Pounds (£).',
    }
  ]);

  const [currentTimeStr, setCurrentTimeStr] = useState('09:41');

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setCurrentTimeStr(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // Sync to localStorages
  useEffect(() => {
    localStorage.setItem('bolt_sim_mode', mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem('bolt_sim_taxi_stats', JSON.stringify(taxiStats));
  }, [taxiStats]);

  useEffect(() => {
    localStorage.setItem('bolt_sim_food_stats', JSON.stringify(foodStats));
  }, [foodStats]);

  const appendLog = useCallback((message: string, type: 'info' | 'success' | 'warn' | 'earnings' = 'info') => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setLogs((prev) => [
      { id: Math.random().toString(), timestamp: time, type, message },
      ...prev.slice(0, 35),
    ]);
  }, []);

  // Sound proxy helpers
  const playSoundEffect = (effect: 'tap' | 'complete' | 'warn' | 'offer') => {
    if (!soundEnabled) return;
    if (effect === 'tap') playTapSound();
    else if (effect === 'complete') playCompleteRideSound();
    else if (effect === 'warn') playWarningSound();
    else if (effect === 'offer') playIncomingRideSound();
  };

  // Switch Online/Offline availability
  const handleSetOnline = (online: boolean) => {
    playSoundEffect('tap');
    setIsOnline(online);
    setIsOnBreak(false); // Clear break state on status change
    if (online) {
      appendLog(`Driver status changed to • Online in ${mode.toUpperCase()} dispatcher.`, 'success');
    } else {
      appendLog(`Driver logged out to Offline. Disconnected from queue.`, 'warn');
      if (tripProgress.stage !== 'idle') {
        setTripProgress({
          stage: 'idle',
          currentRide: null,
          offerTimeRemaining: 0,
          totalOfferTime: 12,
          navigationProgress: 0,
          etaMinutes: 0,
        });
        setChatMessages([]);
      }
    }
  };

  // Spawner action from the console
  const handleSpawnMockRide = useCallback((type: 'short' | 'long' | 'airport' | 'high-tip') => {
    if (!isOnline) {
      playSoundEffect('warn');
      appendLog('Simulation rejected: Set status to • Online first.', 'warn');
      return;
    }
    if (isOnBreak) {
      playSoundEffect('warn');
      appendLog('Simulation rejected: Cannot receive dispatch offers while on Coffee Break ☕.', 'warn');
      return;
    }
    if (tripProgress.stage !== 'idle') {
      playSoundEffect('warn');
      appendLog('Simulation rejected: Complete current active order first.', 'warn');
      return;
    }

    let preset = mode === 'taxi' ? TAXI_MOCK_RIDES[0] : FOOD_MOCK_RIDES[0];
    if (mode === 'taxi') {
      if (type === 'long') preset = TAXI_MOCK_RIDES[1];
      else if (type === 'airport') preset = TAXI_MOCK_RIDES[2];
      else if (type === 'high-tip') {
        preset = {
          ...TAXI_MOCK_RIDES[0],
          passengerName: 'Sir William',
          fare: 35.50,
          distance: 11.2,
          estimatedMinutes: 20
        };
      }
    } else {
      if (type === 'long') preset = FOOD_MOCK_RIDES[1];
      else if (type === 'airport' || type === 'high-tip') {
        preset = {
          ...FOOD_MOCK_RIDES[0],
          passengerName: 'Lady Beatrice',
          fare: 19.80,
          distance: 1.2,
          estimatedMinutes: 5,
          foodItem: '4 x Premium Fish & Chips with Mushy Peas (Royal Catch)'
        };
      }
    }

    const multiplier = surgeLevel === 'high' ? 2.2 : surgeLevel === 'medium' ? 1.4 : 1.0;
    const finalRide: RideRequest = {
      ...preset,
      id: `ride-${Date.now()}`,
      surgeMultiplier: multiplier,
      tipAmount: type === 'high-tip' ? 6.50 : Math.random() > 0.5 ? 2.50 : 0,
    };

    setTripProgress({
      stage: 'offering',
      currentRide: finalRide,
      offerTimeRemaining: 12,
      totalOfferTime: 12,
      navigationProgress: 0,
      etaMinutes: Math.ceil(finalRide.estimatedMinutes * 0.25),
    });
    setChatMessages([]);
    playSoundEffect('offer');
    appendLog(`🚨 Offer Broadcast: Incoming match "${finalRide.passengerName}" (${mode === 'food' ? 'Food delivery order' : 'Taxi trip'})`, 'info');
  }, [isOnline, tripProgress.stage, surgeLevel, mode, appendLog, soundEnabled]);

  // Click on Surge Hotspot in map
  const handleSpawnRideFromZone = (multiplier: number, areaName: string, coords: { x: number; y: number }) => {
    if (!isOnline || tripProgress.stage !== 'idle') return;
    playSoundEffect('tap');

    const template = mode === 'taxi' ? TAXI_MOCK_RIDES[0] : FOOD_MOCK_RIDES[0];
    const dropoffCo = { x: (coords.x + 130) % 350 + 20, y: (coords.y + 160) % 450 + 20 };

    const generated: RideRequest = {
      id: `hot-ride-${Date.now()}`,
      passengerName: template.passengerName,
      passengerRating: template.passengerRating,
      pickupAddress: `${areaName} Core`,
      dropoffAddress: `Oxford Street East, London`,
      fare: +(template.fare * multiplier).toFixed(2),
      distance: +(template.distance * 1.2).toFixed(1),
      surgeMultiplier: multiplier,
      pickupCoordinate: coords,
      dropoffCoordinate: dropoffCo,
      tipAmount: Math.random() > 0.5 ? 2.50 : 0,
      estimatedMinutes: Math.ceil(template.estimatedMinutes * 1.1),
    };

    setTripProgress({
      stage: 'offering',
      currentRide: generated,
      offerTimeRemaining: 12,
      totalOfferTime: 12,
      navigationProgress: 0,
      etaMinutes: 3,
    });
    setChatMessages([]);
    playSoundEffect('offer');
    appendLog(`📍 Surge Pickup spawned from ${areaName}. Multiplier: ${multiplier}x applied.`, 'info');
  };

  // Ambient automatic periodic simulations
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isOnline && !isOnBreak) {
      interval = setInterval(() => {
        if (tripProgress.stage === 'idle') {
          // 8% chance to trigger ambient match every 4 seconds
          if (Math.random() < 0.12) {
            handleSpawnMockRide('random' as any);
          }
        }
        if (Math.random() < 0.05) {
          setBatteryLevel(p => Math.max(5, p - 1));
        }
      }, 4000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOnline, isOnBreak, tripProgress.stage, handleSpawnMockRide]);

  // Offer tick countdown & Nav driving loop
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (tripProgress.stage !== 'idle') {
      timer = setInterval(() => {
        if (tripProgress.stage === 'offering') {
          setTripProgress((prev) => {
            if (prev.offerTimeRemaining <= 1) {
              playSoundEffect('warn');
              appendLog(`⚠️ Match offer expired! Acceptance score slightly declined.`, 'warn');
              setStats((s) => ({
                ...s,
                acceptanceRate: Math.max(70, s.acceptanceRate - 4),
              }));
              return { ...prev, stage: 'idle', currentRide: null, offerTimeRemaining: 0 };
            }

            // Auto accept helper
            if (autoAccept && prev.offerTimeRemaining === 10) {
              setTimeout(() => handleAcceptRide(), 50);
            }

            return { ...prev, offerTimeRemaining: prev.offerTimeRemaining - 1 };
          });
        }

        // Simulating GPS progress
        if (tripProgress.stage === 'to_pickup' || tripProgress.stage === 'to_destination') {
          setTripProgress((prev) => {
            const increment = 1.6 * simSpeed;
            const nextVal = prev.navigationProgress + increment;

            if (nextVal >= 100) {
              if (prev.stage === 'to_pickup') {
                playSoundEffect('complete');
                appendLog(`📍 Arrived at pickup. Notifying client: "${prev.currentRide?.passengerName}"`, 'success');
                return {
                  ...prev,
                  stage: 'arrived_pickup',
                  navigationProgress: 100,
                  etaMinutes: 0,
                };
              } else {
                playSoundEffect('complete');
                appendLog(`🏁 Destination reached! Safety lock released. Slide to close order.`, 'success');
                return {
                  ...prev,
                  stage: 'arrived_destination',
                  navigationProgress: 100,
                  etaMinutes: 0,
                };
              }
            }

            const pct = nextVal / 100;
            const fullMinutes = prev.currentRide?.estimatedMinutes || 10;
            const remaining = Math.ceil(fullMinutes * (1 - pct));

            return {
              ...prev,
              navigationProgress: nextVal,
              etaMinutes: remaining,
            };
          });
        }
      }, 500);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [tripProgress.stage, simSpeed, autoAccept, appendLog]);

  const handleAcceptRide = () => {
    if (!tripProgress.currentRide) return;
    playSoundEffect('tap');
    setTripProgress(p => ({
      ...p,
      stage: 'to_pickup',
      navigationProgress: 0,
    }));
    // Redirect screen to Home so user sees active mapping
    setActiveTab('home');
    appendLog(`✅ matched with passenger: ${tripProgress.currentRide.passengerName}. Navigating...`, 'success');
  };

  const handleDeclineRide = () => {
    playSoundEffect('tap');
    appendLog(`Decline offer: job returned to pools.`, 'warn');
    setStats((s) => ({
      ...s,
      acceptanceRate: Math.max(75, s.acceptanceRate - 2),
    }));
    setTripProgress({
      stage: 'idle',
      currentRide: null,
      offerTimeRemaining: 0,
      totalOfferTime: 12,
      navigationProgress: 0,
      etaMinutes: 0,
    });
  };

  const handleSlideUnlock = () => {
    const { stage, currentRide } = tripProgress;
    if (!currentRide) return;

    playSoundEffect('tap');

    if (stage === 'to_pickup') {
      setTripProgress(p => ({ ...p, stage: 'arrived_pickup', navigationProgress: 100 }));
    } else if (stage === 'arrived_pickup') {
      setTripProgress(p => ({
        ...p,
        stage: 'to_destination',
        navigationProgress: 0,
        etaMinutes: currentRide.estimatedMinutes,
      }));
      appendLog(`▶️ Ride started. Driving passenger toward: ${currentRide.dropoffAddress}`, 'info');
    } else if (stage === 'to_destination' || stage === 'arrived_destination') {
      const baseFee = Math.ceil(currentRide.fare * currentRide.surgeMultiplier);
      const tipAmount = currentRide.tipAmount;
      const totalSum = baseFee + tipAmount;

      const newRecord: CompletedTrip = {
        id: `com-${Date.now()}`,
        passengerName: currentRide.passengerName,
        pickupAddress: currentRide.pickupAddress,
        dropoffAddress: currentRide.dropoffAddress,
        fare: baseFee,
        tip: tipAmount,
        timestamp: `Today, ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        ratingValue: 5,
        surgeMultiplier: currentRide.surgeMultiplier,
      };

      if (mode === 'taxi') {
        setTaxiTrips(p => [newRecord, ...p]);
      } else {
        setFoodTrips(p => [newRecord, ...p]);
      }

      setJustCompletedTrip(newRecord);
      setShowCelebration(true);
      playSoundEffect('complete');

      setStats((s) => ({
        ...s,
        todayEarnings: s.todayEarnings + totalSum,
        weeklyEarnings: s.weeklyEarnings + totalSum,
        balance: s.balance + totalSum,
        completedTripsCount: s.completedTripsCount + 1,
        hoursOnline: +(s.hoursOnline + 0.4).toFixed(2),
      }));

      appendLog(`💰 FARE COMPLETED! Earned £${baseFee.toFixed(2)} + £${tipAmount.toFixed(2)} Tip from ${currentRide.passengerName}!`, 'earnings');

      setTripProgress({
        stage: 'idle',
        currentRide: null,
        offerTimeRemaining: 0,
        totalOfferTime: 12,
        navigationProgress: 0,
        etaMinutes: 0,
      });
      setChatMessages([]);
    }
  };

  const handleCancelTrip = () => {
    playSoundEffect('warn');
    appendLog(`❌ Trip cancelled by driver. Order returned to pool.`, 'warn');
    setStats((s) => ({
      ...s,
      cancellationRate: s.cancellationRate + 1,
    }));
    setTripProgress({
      stage: 'idle',
      currentRide: null,
      offerTimeRemaining: 0,
      totalOfferTime: 12,
      navigationProgress: 0,
      etaMinutes: 0,
    });
    setChatMessages([]);
  };

  const handleAddChatMessage = (text: string) => {
    if (!text.trim()) return;
    playSoundEffect('tap');
    const msg: ActiveChat = {
      id: Math.random().toString(),
      sender: 'driver',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setChatMessages(p => [...p, msg]);

    setTimeout(() => {
      playSoundEffect('offer');
      setChatMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: 'passenger',
          text: mode === 'food' ? "Yes, please deliver at the gate! Thanks 🍕" : "Alright driver! I am coming down right now. 👍",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
    }, 1500);
  };

  const handleCashOut = () => {
    if (stats.balance <= 0) {
      playSoundEffect('warn');
      alert("No cashable balance. Perform simulated trips first!");
      return;
    }
    playSoundEffect('tap');
    const sweepSum = stats.balance;
    setStats(s => ({ ...s, balance: 0 }));
    playSoundEffect('complete');
    appendLog(`swept payout of £${sweepSum.toFixed(2)} into registered Barclays Bank Plc routing.`, 'success');
    alert(`🎉 Payout Swept!\n£${sweepSum.toFixed(2)} has been transferred instantly into Barclays Bank Routing.\nBalance is now £0.00.`);
  };

  return (
    <div className="fixed inset-0 bg-zinc-950 flex flex-col items-center justify-center font-sans select-none overflow-hidden touch-none">
      
      {/* Smartphone Hardware Frame Body Shell */}
      <div className="w-full h-full md:max-w-[390px] md:h-[844px] md:rounded-[50px] md:shadow-[0_25px_60px_rgba(0,0,0,0.85)] md:border-[11px] md:border-zinc-800 bg-white relative flex flex-col overflow-hidden">
        
        {/* Top Camera Notch bar */}
        <div className="hidden md:flex absolute top-0 left-1/2 -translate-x-1/2 w-40 h-6.5 bg-zinc-950 rounded-b-2xl z-55 items-center justify-center gap-1.5 pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full bg-black/80" /> 
          <span className="w-12 h-0.5 bg-zinc-805 rounded" /> 
        </div>

        {/* Simulated status bar */}
        <div className="h-7 px-6 bg-white flex items-end justify-end text-[11px] text-zinc-900 select-none shrink-0 font-extrabold z-20 pb-1.5 pt-1.5">
          <Wifi className="w-3.5 h-3.5 text-zinc-900" />
        </div>

        {/* INTERNAL PHONE SCREEN PORTAL */}
        <div className="flex-1 bg-white flex flex-col overflow-hidden relative select-none text-gray-900">
              
              {/* 1. HOME TAB COMPONENT VIEW */}
              {activeTab === 'home' && (
                <div className="flex-1 flex flex-col relative overflow-hidden">
                  
                  {/* APP UPPER SHELF BAR (Swift Header) */}
                  <nav className="h-11 bg-white px-3 border-b border-gray-100 flex items-center justify-between shrink-0 select-none z-10 shadow-sm">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => { playSoundEffect('tap'); setActiveTab('profile'); }}
                        className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 hover:bg-gray-200 transition"
                      >
                        <Menu className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-sm font-black font-sans tracking-tight text-gray-900 flex items-baseline gap-0.5">
                        {mode === 'food' ? 'Swift Eats' : 'Swift Driver'}
                      </span>
                    </div>

                    {/* Online switcher on the header */}
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-sans font-extrabold ${isOnline ? 'text-[#13AA52]' : 'text-gray-400'}`}>
                        {isOnline ? 'Online' : 'Offline'}
                      </span>
                      <button
                        onClick={() => handleSetOnline(!isOnline)}
                        className={`w-8 h-4.5 rounded-full flex items-center px-0.5 transition-colors ${isOnline ? 'bg-[#13AA52]' : 'bg-gray-300'}`}
                      >
                        <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-md transform transition-transform ${isOnline ? 'translate-x-3.5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </nav>

                  {/* MAP SIMULATOR AREA */}
                  <div className="flex-1 relative bg-[#f2f4f2] overflow-hidden">
                    <MapSimulator
                      tripProgress={tripProgress}
                      isOnline={isOnline}
                      surgeLevel={surgeLevel}
                      onSpawnRideFromZone={handleSpawnRideFromZone}
                      mode={mode}
                    />

                    {/* Floating stats header inside Home map when online and searching */}
                    {isOnline && tripProgress.stage === 'idle' && (
                      <div className="absolute top-3 left-3 right-3 bg-white/95 backdrop-blur-md border border-gray-100 rounded-xl p-2.5 flex items-center justify-between shadow-md z-15 animate-in fade-in duration-300">
                        <div className="text-center flex-1 border-r border-gray-100">
                          <span className="text-[7.5px] text-gray-400 uppercase font-bold block leading-none">Accept Rate</span>
                          <span className="text-[11px] font-bold font-mono text-gray-900 tracking-tight">{stats.acceptanceRate}%</span>
                        </div>
                        <div className="text-center flex-1 border-r border-gray-100">
                          <span className="text-[7.5px] text-gray-400 uppercase font-bold block leading-none">Rating Stars</span>
                          <span className="text-[11px] font-bold font-mono text-amber-500 flex items-center justify-center gap-0.5 leading-none">
                            {stats.rating.toFixed(1)} <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                          </span>
                        </div>
                        <div className="text-center flex-1">
                          <span className="text-[7.5px] text-gray-400 uppercase font-bold block leading-none">Salary Today</span>
                          <span className="text-[11px] font-extrabold font-mono text-[#13AA52]">£{stats.todayEarnings.toFixed(2)}</span>
                        </div>
                      </div>
                    )}

                    {/* OFFLINE GO ONLINE FLOATING CTA BUTTON OVER MAP */}
                    {!isOnline && (
                      <div className="absolute bottom-5 left-4 right-4 z-20">
                        <button
                          onClick={() => handleSetOnline(true)}
                          className="w-full py-3.5 bg-[#13AA52] hover:bg-[#0f8f44] text-white font-extrabold text-sm uppercase tracking-wide rounded-xl shadow-lg shadow-emerald-700/20 active:scale-98 transition flex items-center justify-center gap-1.5"
                        >
                          + Go Online
                        </button>
                      </div>
                    )}
                  </div>

                  {/* BOTTOM INFO CARDS AND LISTS (Exactly replicating screenshots!) */}
                  {tripProgress.stage === 'idle' ? (
                    <div className="bg-white border-t border-gray-100 p-3 shrink-0 flex flex-col gap-2.5 select-none z-10 shadow-lg">
                      {/* Offline stats lists */}
                      {!isOnline ? (
                        <div className="flex flex-col gap-2 animate-in fade-in duration-200">
                          <div className="flex items-baseline justify-between">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Earnings today</span>
                            <span className="text-xl font-black text-gray-900 font-mono">
                              £{stats.todayEarnings.toFixed(2)}
                            </span>
                          </div>

                          {/* Matrix grid metrics */}
                          <div className="grid grid-cols-3 gap-2.5 text-center my-0.5">
                            <div className="bg-gray-50 border border-gray-100 p-1.5 rounded-lg flex flex-col justify-center">
                              <span className="text-gray-900 font-extrabold text-[12px] font-mono leading-none">
                                {mode === 'taxi' ? '4' : '3'}
                              </span>
                              <span className="text-gray-400 text-[8px] uppercase font-semibold mt-0.5 leading-none">
                                {mode === 'taxi' ? 'Trips' : 'Orders'}
                              </span>
                            </div>
                            <div className="bg-gray-50 border border-gray-100 p-1.5 rounded-lg flex flex-col justify-center">
                              <span className="text-gray-900 font-extrabold text-[12px] font-mono leading-none">
                                {mode === 'taxi' ? '3h 45m' : '2h 30m'}
                              </span>
                              <span className="text-gray-400 text-[8px] uppercase font-semibold mt-0.5 leading-none">Online</span>
                            </div>
                            <div className="bg-gray-50 border border-gray-100 p-1.5 rounded-lg flex flex-col justify-center">
                              <span className="text-[#13AA52] font-black text-[12px] font-mono leading-none">
                                {mode === 'taxi' ? '98%' : '100%'}
                              </span>
                              <span className="text-gray-400 text-[8px] uppercase font-semibold mt-0.5 leading-none">Rating</span>
                            </div>
                          </div>

                          {/* Swift menu options */}
                          <div className="flex flex-col divide-y divide-gray-100 border-t border-gray-50 mt-1">
                            {mode === 'taxi' ? (
                              <>
                                <button onClick={() => { playSoundEffect('tap'); setActiveTab('earnings'); }} className="flex items-center justify-between py-2 text-left hover:bg-gray-50">
                                  <div>
                                    <span className="text-[11px] font-bold text-gray-900 block leading-tight">My earnings</span>
                                    <span className="text-[8.5px] text-gray-400 block leading-none">See earnings summary</span>
                                  </div>
                                  <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                                </button>
                                <button onClick={() => { playSoundEffect('tap'); handleSpawnMockRide('random' as any); }} className="flex items-center justify-between py-2 text-left hover:bg-gray-50">
                                  <div>
                                    <span className="text-[11px] font-bold text-gray-900 block leading-tight">Opportunities</span>
                                    <span className="text-[8.5px] text-gray-400 block leading-none">See ride requests</span>
                                  </div>
                                  <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                                </button>
                                <button onClick={() => { playSoundEffect('tap'); alert("Insights terminal active inside core system."); }} className="flex items-center justify-between py-2 text-left hover:bg-gray-50">
                                  <div>
                                    <span className="text-[11px] font-bold text-gray-900 block leading-tight">Insights</span>
                                    <span className="text-[8.5px] text-gray-400 block leading-none">See driving insights</span>
                                  </div>
                                  <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => { playSoundEffect('tap'); setActiveTab('earnings'); }} className="flex items-center justify-between py-2 text-left hover:bg-gray-50">
                                  <div>
                                    <span className="text-[11px] font-bold text-gray-900 block leading-tight">Earnings</span>
                                    <span className="text-[8.5px] text-gray-400 block leading-none">See earnings summary</span>
                                  </div>
                                  <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                                </button>
                                <button onClick={() => { playSoundEffect('tap'); handleSpawnMockRide('random' as any); }} className="flex items-center justify-between py-2 text-left hover:bg-gray-50">
                                  <div>
                                    <span className="text-[11px] font-bold text-gray-900 block leading-tight">Orders</span>
                                    <span className="text-[8.5px] text-gray-400 block leading-none">See stats</span>
                                  </div>
                                  <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                                </button>
                                <button onClick={() => { playSoundEffect('tap'); alert("Performance reporting is active."); }} className="flex items-center justify-between py-2 text-left hover:bg-gray-50">
                                  <div>
                                    <span className="text-[11px] font-bold text-gray-900 block leading-tight">Performance</span>
                                    <span className="text-[8.5px] text-gray-400 block leading-none">See your stats</span>
                                  </div>
                                  <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ) : (
                          /* Online seeking list cards */
                          <div className="flex flex-col gap-2 animate-in fade-in duration-200">
                            <div className="bg-[#eefbf4] border border-[#d3f5df] rounded-xl p-2.5 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Zap className="w-4 h-4 text-[#13AA52] fill-[#13AA52]/10" />
                                <div>
                                  <span className="text-[11px] font-bold text-[#0c6b34] block">Auto-Accept Active</span>
                                  <span className="text-[8.5px] text-[#2c8d52] block leading-none">Simulator matches instantly</span>
                                </div>
                              </div>
                              <button
                                onClick={() => { playSoundEffect('tap'); setAutoAccept(!autoAccept); }}
                                className={`text-[8px] font-black px-2.5 py-1 rounded transition-colors ${
                                  autoAccept ? 'bg-[#13AA52] text-white' : 'bg-gray-200 text-gray-500'
                                }`}
                              >
                                {autoAccept ? 'ON' : 'OFF'}
                              </button>
                            </div>
                            
                            {/* BREAK TOGGLE ROW */}
                            <div className={`border rounded-xl p-2.5 flex items-center justify-between transition-all duration-300 ${
                              isOnBreak ? 'bg-amber-50 border-amber-200 shadow-sm' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100'
                            }`}>
                              <div className="flex items-center gap-2">
                                <Coffee className={`w-4 h-4 ${isOnBreak ? 'text-amber-500 animate-bounce' : 'text-gray-500'}`} />
                                <div className="text-left">
                                  <span className={`text-[11px] font-extrabold block leading-tight ${isOnBreak ? 'text-amber-700' : 'text-zinc-700'}`}>
                                    {isOnBreak ? 'On Coffee Break' : 'Take a Break'}
                                  </span>
                                  <span className="text-[8.5px] text-zinc-400 block leading-none mt-0.5">
                                    {isOnBreak ? 'Matching paused. Auto-spawner halted.' : 'Temporarily pause new order dispatch'}
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  playSoundEffect('tap');
                                  const nextBreak = !isOnBreak;
                                  setIsOnBreak(nextBreak);
                                  appendLog(nextBreak ? '☕ Driver went on a Coffee Break. Dispatch matched queue is paused.' : '⚡ Driver returned from Break. Re-entered dispatch match queue.', nextBreak ? 'warn' : 'success');
                                }}
                                className={`text-[8px] font-black px-3 py-1.5 rounded transition-all cursor-pointer ${
                                  isOnBreak ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-zinc-200 text-zinc-650 hover:bg-zinc-300'
                                }`}
                              >
                                {isOnBreak ? 'RESUME' : 'PAUSE'}
                              </button>
                            </div>

                            {!isOnBreak ? (
                              <div className="text-center py-2.5">
                                <span className="text-[9.5px] text-gray-400 uppercase font-black tracking-widest block leading-none">Queued matching</span>
                                <span className="text-[11px] text-gray-600 block mt-1">Driving streets of London, UK ...</span>
                              </div>
                            ) : (
                              <div className="text-center py-4 bg-amber-50/50 border border-dashed border-amber-200 rounded-xl my-1">
                                <span className="text-[9.5px] text-amber-600 uppercase font-black tracking-widest block leading-none">Dispatcher Paused</span>
                                <span className="text-[11px] text-amber-700 block mt-1 font-bold">Enjoying tea & biscuits in London 🇬🇧</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                    /* IN-TRIP ACTIVE HUD (Taxi & Food counter-assets) */
                    tripProgress.stage !== 'offering' && (
                      <div className="bg-white border-t border-gray-100 p-3.5 shrink-0 flex flex-col gap-3.5 z-10 shadow-lg animate-in slide-in-from-bottom duration-300">
                        {/* Upper state instructions */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#13AA52] animate-ping" />
                            <span className="text-[9px] font-black uppercase text-[#13AA52] tracking-wider font-mono">
                              {tripProgress.stage === 'to_pickup' ? 'Driving to Pickup' : tripProgress.stage === 'arrived_pickup' ? 'Arrived at pickup' : 'Order in progress'}
                            </span>
                          </div>

                          {/* Quick chat messaging bar */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => { playSoundEffect('tap'); setCurrentNotification(currentNotification ? null : "chat"); }}
                              className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-650 hover:bg-gray-200 relative"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              {chatMessages.length > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[7px] font-black px-1 rounded-full">{chatMessages.length}</span>
                              )}
                            </button>
                            <button
                              onClick={() => { playSoundEffect('tap'); alert(`Simulating phone link to: ${tripProgress.currentRide?.passengerName}`); }}
                              className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-650 hover:bg-gray-200"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Interactive Client Summary */}
                        <div className="bg-gray-50 border border-gray-100 p-3 rounded-xl flex items-center justify-between">
                          <div>
                            <span className="text-[8px] text-gray-400 uppercase font-black tracking-wider block leading-none">
                              {mode === 'food' ? 'Store order customer' : 'passenger client'}
                            </span>
                            <h4 className="text-gray-900 text-xs font-extrabold mt-0.5 leading-snug">
                              {tripProgress.stage === 'to_pickup' || tripProgress.stage === 'arrived_pickup'
                                ? (mode === 'food' ? 'Chicken Republic' : tripProgress.currentRide?.passengerName)
                                : (mode === 'food' ? `Deliver: ${tripProgress.currentRide?.passengerName}` : tripProgress.currentRide?.dropoffAddress)
                              }
                            </h4>
                            {mode === 'food' && (
                              <span className="text-[8px] bg-[#eefbf4] text-[#13AA52] border border-[#d3f5df] px-1.5 py-0.2 rounded font-extrabold block w-fit mt-1 leading-none font-mono">
                                {tripProgress.currentRide?.foodItem}
                              </span>
                            )}
                          </div>
                          
                          <div className="text-right">
                            <span className="text-lg font-black font-mono text-[#13AA52] block leading-none">
                              {tripProgress.stage === 'arrived_pickup' ? 'ARRIVED' : `${Math.ceil(tripProgress.etaMinutes)} MIN`}
                            </span>
                            <span className="text-[8.5px] text-gray-400 block leading-normal mt-0.5">
                              {tripProgress.stage === 'arrived_pickup' ? 'Customer alerted' : `${(tripProgress.currentRide?.distance || 1.2).toFixed(1)} km left`}
                            </span>
                          </div>
                        </div>

                        {/* CUSTOM SLIDE TO ACTION TRACK (Exactly styled like real Swift Slider button!) */}
                        <div className="relative">
                          <button
                            onClick={handleSlideUnlock}
                            className="w-full h-12 bg-[#13AA52] hover:bg-[#0f8f44] text-white font-extrabold text-[12px] uppercase tracking-wider rounded-xl relative flex items-center justify-center shadow-md select-none group active:scale-98 transition"
                          >
                            <div className="absolute left-1 top-1 bottom-1 w-10 bg-white/25 rounded-lg flex items-center justify-center">
                              <ArrowRight className="w-4 h-4 text-white" />
                            </div>
                            <span className="pl-6 block">
                              {tripProgress.stage === 'to_pickup' && 'Arrived at pickup'}
                              {tripProgress.stage === 'arrived_pickup' && (mode === 'food' ? 'Confirm Pickup' : 'Start ride')}
                              {(tripProgress.stage === 'to_destination' || tripProgress.stage === 'arrived_destination') && (mode === 'food' ? 'Complete delivery' : 'Complete ride')}
                            </span>
                          </button>
                        </div>

                        {/* Force Cancel link */}
                        <button
                          onClick={() => { if (confirm("Decline this job matches? Accept ratings will fall.")) handleCancelTrip(); }}
                          className="text-[10px] text-red-500 hover:text-red-650 font-bold self-center py-0.5 border-b border-transparent hover:border-red-500 transition"
                        >
                          Cancel order matches
                        </button>
                      </div>
                    )
                  )}

                  {/* ----------------- OFFER MATCH ALERT OVERLAY ----------------- */}
                  {tripProgress.stage === 'offering' && tripProgress.currentRide && (
                    <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col justify-end p-3 animate-in fade-in duration-200">
                      
                      {/* Incoming offer details card (Light theme from Swift screenshot!) */}
                      <div className="bg-white border border-gray-100 rounded-3xl p-4 shadow-2xl flex flex-col gap-4 select-none animate-in slide-in-from-bottom duration-350">
                        {/* Upper Header info */}
                        <div className="flex items-center justify-between">
                          <span className="bg-[#13AA52] text-white text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full font-sans tracking-wider-lg leading-none">
                            {mode === 'food' ? 'Swift Eats' : 'Swift'}
                          </span>
                          
                          {/* Rating Pill matches screenshot! */}
                          <div className="flex items-center gap-1 bg-[#13AA52]/10 border border-[#13AA52]/20 px-2.5 py-0.5 rounded-full text-[#13AA52] font-extrabold text-[9.5px] leading-none">
                            ★ {tripProgress.currentRide.passengerRating.toFixed(1)}
                          </div>
                        </div>

                        {/* Pricing section and fees */}
                        <div className="text-center pt-2">
                          <h2 className="text-3xl font-black text-gray-900 font-mono tracking-tight leading-none mb-1">
                            £{(tripProgress.currentRide.fare * tripProgress.currentRide.surgeMultiplier).toFixed(2)}
                          </h2>
                          <span className="text-[10px] text-gray-400 font-semibold uppercase block leading-none">
                            including simulated fees
                          </span>
                        </div>

                        {/* Pickup and Dropoff paths */}
                        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-3 flex flex-col gap-3 relative">
                          {/* Inner connecting node line */}
                          <div className="absolute left-4.5 top-4.5 bottom-4.5 w-0.5 border-l border-dashed border-gray-300" />

                          {/* Pickup point */}
                          <div className="flex items-start gap-2.5">
                            <div className="w-3.5 h-3.5 rounded-full bg-[#13AA52] border-2 border-white shadow-sm flex items-center justify-center shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <span className="text-[8px] text-[#1e6f3d] uppercase font-black block leading-none tracking-wider">
                                {mode === 'food' ? 'Restaurant Pick up' : 'Pick up client'}
                              </span>
                              <p className="text-[10.5px] font-extrabold text-gray-800 truncate leading-snug mt-0.5">
                                {tripProgress.currentRide.pickupAddress}
                              </p>
                            </div>
                          </div>

                          {/* Drop-off point */}
                          <div className="flex items-start gap-2.5">
                            <div className="w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white shadow-sm flex items-center justify-center shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <span className="text-[8px] text-red-700 uppercase font-black block leading-none tracking-wider">
                                {mode === 'food' ? 'Delivery point' : 'drop-off destination'}
                              </span>
                              <p className="text-[10.5px] font-extrabold text-gray-800 truncate leading-snug mt-0.5">
                                {tripProgress.currentRide.dropoffAddress}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Ride characteristics (Km / Minutes badge from screenshots) */}
                        <div className="flex items-center justify-center gap-4 text-[10.5px] text-gray-500 font-bold border-b border-gray-50 pb-2">
                          <span>📐 {tripProgress.currentRide.distance} km</span>
                          <span>•</span>
                          <span>⏱️ {tripProgress.currentRide.estimatedMinutes} mins</span>
                          {tripProgress.currentRide.surgeMultiplier > 1.0 && (
                            <>
                              <span>•</span>
                              <span className="text-[#13AA52] font-black uppercase">🔥 {tripProgress.currentRide.surgeMultiplier}x Surge</span>
                            </>
                          )}
                        </div>

                        {/* Interactive Buttons rows */}
                        <div className="flex flex-col gap-1.5 mt-1">
                          <button
                            onClick={handleAcceptRide}
                            className="w-full py-3.5 bg-[#13AA52] hover:bg-[#0f8f44] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md active:scale-98 transition flex items-center justify-center gap-1.5"
                          >
                            <Check className="w-4 h-4 fill-white text-[#13AA52]" />
                            Accept job match ({tripProgress.offerTimeRemaining}s)
                          </button>
                          
                          <button
                            onClick={handleDeclineRide}
                            className="w-full py-2 border border-gray-100 bg-white hover:bg-gray-50 text-gray-500 font-bold text-[10.5px] uppercase rounded-lg active:scale-98 transition text-center mt-1"
                          >
                            Decline match
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* -------------------- INTERNAL LIVE CHAT PANEL -------------------- */}
                  {currentNotification === 'chat' && tripProgress.currentRide && (
                    <div className="absolute inset-0 bg-white z-[45] flex flex-col p-3 animate-in slide-in-from-bottom duration-250">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                        <span className="text-xs font-black text-gray-900">Chat with {tripProgress.currentRide.passengerName}</span>
                        <button onClick={() => setCurrentNotification(null)} className="text-gray-400 hover:text-gray-650">
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Chat feed body */}
                      <div className="flex-1 overflow-y-auto py-3 flex flex-col gap-2 select-text text-[11px]">
                        {chatMessages.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-center text-gray-400">
                            <p>No messages. Initiate greeting with passenger.</p>
                          </div>
                        ) : (
                          chatMessages.map(m => (
                            <div key={m.id} className={`max-w-[80%] rounded-xl p-2.5 ${m.sender === 'driver' ? 'bg-[#13AA52] text-white self-end rounded-tr-none' : 'bg-gray-100 text-gray-800 self-start rounded-tl-none'}`}>
                              <p className="font-semibold">{m.text}</p>
                              <span className="text-[7.5px] text-right mt-1 block font-mono opacity-60">{m.timestamp}</span>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Presets replies */}
                      <div className="flex gap-1 overflow-x-auto py-1.5 border-t border-gray-100">
                        {['I am here at pickup point! 🚗', 'On my way inside traffic.', 'Sure, turn on the AC.'].map((txt, index) => (
                          <button key={index} onClick={() => handleAddChatMessage(txt)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-[8.5px] font-bold px-2 py-1 rounded-full whitespace-nowrap">
                            {txt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* 2. EARNINGS TAB SCREEN (1-to-1 styled like the screenshots!) */}
              {activeTab === 'earnings' && (
                <div className="flex-1 flex flex-col bg-white overflow-hidden p-3 animate-in fade-in duration-200 select-none">
                  <div className="flex items-center justify-between shrink-0 border-b border-gray-100 pb-2 mb-3">
                    <span className="text-sm font-black text-gray-900 uppercase">Earnings Performance</span>
                    <span className="text-[10px] bg-emerald-50 text-[#13AA52] px-2 py-0.2 rounded font-mono font-bold uppercase">Synced</span>
                  </div>

                  {/* Day | Week | Month pills selector */}
                  <div className="grid grid-cols-3 gap-1 border border-gray-100 rounded-full p-1 bg-gray-50/50">
                    <button className="bg-[#13AA52] text-white font-black text-[10.5px] py-1 rounded-full shadow-sm">Day</button>
                    <button className="text-gray-500 font-bold text-[10.5px] py-1 rounded-full">Week</button>
                    <button className="text-gray-500 font-bold text-[10.5px] py-1 rounded-full">Month</button>
                  </div>

                  {/* Largegross earnings layout */}
                  <div className="py-4 text-center">
                    <span className="text-[10px] text-gray-400 font-bold uppercase block leading-none tracking-wider">Today</span>
                    <h2 className="text-4xl font-black text-gray-900 font-mono tracking-tight mt-1.5">
                      £{stats.todayEarnings.toFixed(2)}
                    </h2>
                  </div>

                  {/* Summary metric matrix row */}
                  <div className="grid grid-cols-3 gap-2 text-center border-y border-gray-100 py-3.5 my-1 bg-gray-50/20">
                    <div className="flex flex-col">
                      <span className="text-gray-900 font-black font-mono text-sm leading-none">
                        {stats.completedTripsCount}
                      </span>
                      <span className="text-gray-400 text-[8.5px] font-semibold uppercase mt-1 leading-none">Rides / Orders</span>
                    </div>
                    <div className="flex flex-col border-x border-gray-100">
                      <span className="text-gray-900 font-black font-mono text-sm leading-none">
                        {mode === 'taxi' ? '3h 45m' : '2h 30m'}
                      </span>
                      <span className="text-gray-400 text-[8.5px] font-semibold uppercase mt-1 leading-none">Online time</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[#13AA52] font-black font-mono text-sm leading-none">
                        {mode === 'taxi' ? '120' : '90'}
                      </span>
                      <span className="text-gray-400 text-[8.5px] font-semibold uppercase mt-1 leading-none">Points</span>
                    </div>
                  </div>

                  {/* Breakdown finance cards */}
                  <div className="flex-1 overflow-y-auto flex flex-col gap-2 pt-2 text-[11px] text-gray-600">
                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex flex-col gap-2.5">
                      <div className="flex items-center justify-between">
                        <span>Base fare collected</span>
                        <span className="font-extrabold text-gray-900 font-mono">£{stats.todayEarnings.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>London Bonnet Bonuses</span>
                        <span className="font-extrabold text-[#13AA52] font-mono">+£{(mode === 'taxi' ? 15.00 : 6.50).toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-gray-150 pt-2 font-black text-gray-900 text-[12px]">
                        <span>Total simulated gross</span>
                        <span className="font-mono text-[#13AA52]">£{(stats.todayEarnings + (mode === 'taxi' ? 15.00 : 6.50)).toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Historical Completed list logs */}
                    <div>
                      <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block mb-2 px-1">Session transactions</span>
                      {completedTrips.length === 0 ? (
                        <div className="bg-gray-100/50 border border-dashed border-gray-200 p-4 rounded-xl text-center text-xs text-gray-400">
                          Complete some simulation trips on map to populate financial transaction ledgers.
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1.5 select-text">
                          {completedTrips.map(t => (
                            <div key={t.id} className="bg-white border border-gray-100 p-2.5 rounded-xl flex items-center justify-between">
                              <div className="min-w-0 flex-1">
                                <span className="font-bold text-gray-900 text-[11.5px] block truncate">{t.passengerName}</span>
                                <span className="text-[8.5px] text-gray-400 block font-mono mt-0.5">{t.timestamp}</span>
                              </div>
                              <span className="font-mono font-black text-[#13AA52] text-xs">
                                +£{((t.fare * t.surgeMultiplier) + t.tip).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 3. WALLET TAB COMPONENT */}
              {activeTab === 'wallet' && (
                <div className="flex-1 flex flex-col bg-white overflow-hidden p-3 animate-in fade-in duration-200 select-none">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-3">
                    <span className="text-sm font-black text-gray-900 uppercase">Payout & Ledger</span>
                    <Landmark className="w-4 h-4 text-[#13AA52]" />
                  </div>

                  <div className="bg-gradient-to-br from-[#13AA52] to-[#0d823d] rounded-2xl p-4 text-white relative shadow-md">
                    <span className="text-[10px] text-emerald-100 font-bold uppercase tracking-wider block">Cash out balance</span>
                    <h2 className="text-3xl font-black font-mono tracking-tight mt-1 leading-none">
                      £{stats.balance.toFixed(2)}
                    </h2>
                    
                    <p className="text-[9px] text-emerald-100/80 leading-normal mt-2.5">
                      Subsequent automatic settlements direct path on Saturday at midnight.
                    </p>

                    <button
                      onClick={handleCashOut}
                      className="w-full mt-4 bg-white text-gray-900 font-black font-sans py-2 rounded-xl text-[10.5px] uppercase tracking-wide cursor-pointer text-center hover:bg-gray-50 active:scale-95 transition"
                    >
                      Sweep to Bank
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto mt-4">
                    <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block mb-2 px-1">Registered routing</span>
                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-[11px] text-gray-600 flex flex-col gap-2">
                      <div className="flex justify-between font-bold">
                        <span>Institution Bank</span>
                        <span className="text-gray-900">Barclays Bank Plc</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Account Holder</span>
                        <span className="text-gray-900 text-right">John Daniel J.</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Settled account</span>
                        <span className="text-gray-900 font-mono">*****4829</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. PROFILE TAB / SETTINGS SCREEN (Exactly matching Menu drawer screenshot!) */}
              {activeTab === 'profile' && (
                <div className="flex-1 flex flex-col bg-white overflow-hidden animate-in fade-in duration-250 select-none">
                  
                  {/* Driver Header Profile block */}
                  <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col gap-2.5">
                    <div className="flex items-center gap-3">
                      {/* Driver Picture Placeholder avatar matching John Daniel! */}
                      <div className="w-12 h-12 rounded-full border border-gray-200 bg-gray-300 flex items-center justify-center text-gray-700 font-black text-sm relative overflow-hidden shrink-0">
                        {/* Beautiful user placeholder graphic card */}
                        <User className="w-6 h-6 text-gray-600" />
                      </div>

                      <div className="min-w-0">
                        <h4 className="text-sm font-black text-gray-900 leading-none">John Daniel</h4>
                        <div className="flex items-center gap-1 bg-[#13AA52]/10 px-2 py-0.5 rounded-full mt-1.5 text-[#13AA52] font-extrabold text-[9px] w-fit">
                          ★ 4.9 Score
                        </div>
                      </div>
                    </div>
                    
                    <button onClick={() => alert("Simulating Profile metrics summary: Active driver in Lagos zone, premium driver's badge.")} className="text-[9.5px] text-gray-400 font-bold text-left hover:underline">
                      View profile & achievements ➔
                    </button>
                  </div>

                  {/* Menu options list */}
                  <div className="flex-1 overflow-y-auto p-2.5 flex flex-col divide-y divide-gray-100 text-[11px] text-gray-700 font-bold">
                    
                    <button onClick={() => { playSoundEffect('tap'); setIsOnline(!isOnline); }} className="flex items-center justify-between py-2.5 hover:bg-gray-50 transition px-1.5">
                      <div className="flex items-center gap-2.5">
                        <User className="w-4 h-4 text-gray-400" />
                        <span>My availability</span>
                      </div>
                      <span className={`text-[9.5px] ${isOnline ? 'text-[#13AA52]' : 'text-gray-400'}`}>
                        {isOnline ? 'ONLINE' : 'OFFLINE'}
                      </span>
                    </button>

                    <button onClick={() => { playSoundEffect('tap'); alert("Registered: Toyota Corolla 2019 (Silver), Plate ABC-123XYZ, standard ride category."); }} className="flex items-center justify-between py-2.5 hover:bg-gray-50 transition px-1.5">
                      <div className="flex items-center gap-2.5">
                        <Car className="w-4 h-4 text-gray-400" />
                        <span>My vehicles</span>
                      </div>
                      <span className="text-gray-450">Corolla 2019</span>
                    </button>

                    <button onClick={() => { playSoundEffect('tap'); alert("Notification Center: 1) Surge bonus active across Lekki. 2) Maintenance schedule update."); }} className="flex items-center justify-between py-2.5 hover:bg-gray-50 transition px-1.5">
                      <div className="flex items-center gap-2.5">
                        <Bell className="w-4 h-4 text-gray-400" />
                        <span>Notifications</span>
                      </div>
                      <span className="bg-red-500 text-white font-extrabold text-[8.5px] px-1.5 py-0.2 rounded-full leading-none">
                        2
                      </span>
                    </button>

                    <button onClick={() => { playSoundEffect('tap'); alert("Swift Help center online: Standard dispatcher supports active."); }} className="flex items-center justify-between py-2.5 hover:bg-gray-50 transition px-1.5">
                      <div className="flex items-center gap-2.5">
                        <HelpCircle className="w-4 h-4 text-gray-400" />
                        <span>Help & support</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                    </button>                    {/* Simulation Parameters Switcher */}
                    <div className="py-3.5 px-2.5 flex flex-col gap-3.5 bg-zinc-50 rounded-2xl my-3.5 border border-zinc-100 shadow-sm text-left">
                      <div className="flex items-center gap-2">
                        <Settings className="w-4 h-4 text-[#13AA52]" />
                        <span className="font-extrabold uppercase text-[10px] tracking-wider text-[#13AA52]">Simulator admin core</span>
                      </div>
                      
                      {/* Mode picker (Taxi vs Food!) */}
                      <div>
                        <span className="text-[9px] text-zinc-400 font-bold block mb-1">SERVICE MODE</span>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            onClick={() => { playSoundEffect('tap'); setMode('taxi'); }}
                            className={`py-1 rounded-lg text-center text-[9.5px] font-black tracking-wide cursor-pointer transition ${
                              mode === 'taxi' ? 'bg-[#13AA52] text-white shadow-sm' : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-250'
                            }`}
                          >
                            🚕 TAXI MODE
                          </button>
                          <button
                            onClick={() => { playSoundEffect('tap'); setMode('food'); }}
                            className={`py-1 rounded-lg text-center text-[9.5px] font-black tracking-wide cursor-pointer transition ${
                              mode === 'food' ? 'bg-[#13AA52] text-white shadow-sm' : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-250'
                            }`}
                          >
                            🍕 FOOD MODE
                          </button>
                        </div>
                      </div>

                      {/* Trigger matches spawner */}
                      <div>
                        <span className="text-[9px] text-zinc-400 font-bold block mb-1">FORCE MATCH OFFERS</span>
                        <div className="grid grid-cols-2 gap-1">
                          <button
                            disabled={!isOnline || tripProgress.stage !== 'idle'}
                            onClick={() => { playSoundEffect('tap'); handleSpawnMockRide('short'); }}
                            className="bg-zinc-800 text-white hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed text-[8.5px] py-1.5 rounded-lg font-bold text-center active:scale-95 transition"
                          >
                            Short Trip
                          </button>
                          <button
                            disabled={!isOnline || tripProgress.stage !== 'idle'}
                            onClick={() => { playSoundEffect('tap'); handleSpawnMockRide('long'); }}
                            className="bg-zinc-800 text-white hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed text-[8.5px] py-1.5 rounded-lg font-bold text-center active:scale-95 transition"
                          >
                            Long Commute
                          </button>
                          <button
                            disabled={!isOnline || tripProgress.stage !== 'idle'}
                            onClick={() => { playSoundEffect('tap'); handleSpawnMockRide('airport'); }}
                            className="bg-[#13AA52] text-white hover:bg-[#0f8f44] disabled:opacity-30 disabled:cursor-not-allowed text-[8.5px] py-1.5 rounded-lg font-extrabold text-center active:scale-95 transition"
                          >
                            Airport Class
                          </button>
                          <button
                            disabled={!isOnline || tripProgress.stage !== 'idle'}
                            onClick={() => { playSoundEffect('tap'); handleSpawnMockRide('high-tip'); }}
                            className="bg-[#13AA52]/10 text-[#13AA52] border border-[#13AA52]/30 hover:bg-[#13AA52]/20 disabled:opacity-30 disabled:cursor-not-allowed text-[8.5px] py-1.5 rounded-lg font-black text-center active:scale-95 transition"
                          >
                            Rich Tip 💎
                          </button>
                        </div>
                      </div>

                      {/* Surge selectors */}
                      <div>
                        <span className="text-[9px] text-zinc-400 font-bold block mb-1">SURGENT HEAT FORCE</span>
                        <div className="grid grid-cols-3 gap-1">
                          {['low', 'medium', 'high'].map(l => (
                            <button
                              key={l}
                              onClick={() => { playSoundEffect('tap'); setSurgeLevel(l as any); }}
                              className={`py-1 rounded text-[8.5px] font-extrabold uppercase transition ${
                                surgeLevel === l ? 'bg-[#13AA52] text-white font-black' : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-250'
                              }`}
                            >
                              {l === 'high' ? '🔥 2.2x High' : l === 'medium' ? '⚡ 1.4x Mid' : '🍃 1.0x Low'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Warp Speed */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[9px] text-zinc-400 font-bold block">DRIVE RECTITUDE WARP</span>
                          <span className="text-[8.5px] font-mono text-[#13AA52] font-black">{simSpeed}x speed</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1">
                          {[1, 2, 5, 10].map(s => (
                            <button
                              key={s}
                              onClick={() => { playSoundEffect('tap'); setSimSpeed(s); }}
                              className={`py-1 text-[8.5px] rounded font-mono font-bold transition ${
                                simSpeed === s ? 'bg-[#13AA52] text-white font-black animate-pulse' : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-250'
                              }`}
                            >
                              {s}x
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Charge percentage */}
                      <div>
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="text-[9px] text-zinc-400 font-bold block">DEVICE CHARGE STATE</span>
                          <span className="text-[8.5px] font-mono font-bold text-zinc-700">{batteryLevel}%</span>
                        </div>
                        <input
                          type="range"
                          min="5"
                          max="100"
                          value={batteryLevel}
                          onChange={e => setBatteryLevel(parseInt(e.target.value))}
                          className="w-full h-1 bg-zinc-200 rounded appearance-none cursor-pointer accent-[#13AA52]"
                        />
                      </div>

                      {/* Telemetry scrolling logs inside Profile tab */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[9px] text-zinc-400 font-bold block">LIVE DISPATCH TELEMETRY FEED</span>
                          <button onClick={() => setLogs([])} className="text-zinc-400 hover:text-red-500 text-[8px] leading-none uppercase font-extrabold">
                            Clear
                          </button>
                        </div>
                        <div className="bg-zinc-950 rounded-xl p-2.5 font-mono text-[8px] text-zinc-400 h-24 overflow-y-auto block select-text leading-tight border border-zinc-900 w-full max-w-full">
                          {logs.length === 0 ? (
                            <span className="text-zinc-600">No events connected. Waiting...</span>
                          ) : (
                            logs.slice().reverse().map(l => (
                              <div key={l.id} className="truncate select-text">
                                <span className="text-zinc-650">[{l.timestamp}]</span> <span className={
                                  l.type === 'success' ? 'text-emerald-400' : l.type === 'warn' ? 'text-yellow-400' : l.type === 'earnings' ? 'text-purple-400 font-bold' : 'text-zinc-300'
                                }>{l.message}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Sound fx check */}
                      <button
                        onClick={() => { setSoundEnabled(!soundEnabled); playTapSound(); }}
                        className="w-full py-1.5 mt-0.5 border border-zinc-200 bg-white hover:bg-zinc-50 rounded text-center text-[9px] text-zinc-500 font-bold transition-colors"
                      >
                        Audio Chimes: {soundEnabled ? '🔔 ACTIVE' : '🔕 MUTED'}
                      </button>
                    </div>

                    <button onClick={() => alert("Swift Driver Simulator v3.0 London Localized Version.")} className="flex items-center justify-between py-2.5 hover:bg-gray-50 transition px-1.5">
                      <div className="flex items-center gap-2.5">
                        <Settings className="w-4 h-4 text-gray-400" />
                        <span>About Swift Driver</span>
                      </div>
                      <span className="text-gray-400 text-[9px] font-mono">v3.0</span>
                    </button>

                    <button
                      onClick={() => {
                        playSoundEffect('warn');
                        setIsOnline(false);
                        alert("Logged out of matching pool. Switched offline.");
                      }}
                      className="flex items-center gap-2.5 py-3 text-red-500 hover:bg-red-50/50 transition px-1.5 mt-2 active:translate-x-1"
                    >
                      <LogOut className="w-4 h-4 text-red-500" />
                      <span>Log out</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 📊 CONGRATULATIONS CELEBRATION CHIP CARD MODAL AND INVOICE (Exactly matches screenshot's completed view!) */}
              {showCelebration && justCompletedTrip && (
                <div className="absolute inset-0 bg-white/98 z-[60] flex flex-col justify-between p-4 text-center select-none animate-in fade-in zoom-in-95 duration-200">
                  
                  {/* Top Success Tick Banner */}
                  <div className="flex flex-col items-center pt-6">
                    <div className="w-12 h-12 rounded-full bg-[#13AA52]/10 border-2 border-[#13AA52] flex items-center justify-center text-[#13AA52] mb-3.5 animate-bounce">
                      <Check className="w-7 h-7" />
                    </div>
                    <span className="text-[10px] uppercase font-black text-[#13AA52] tracking-widest font-sans leading-none">
                      Completed!
                    </span>
                    <h3 className="text-gray-950 text-base font-black mt-1">
                      {mode === 'food' ? 'Order delivered' : 'Ride completed'}
                    </h3>
                  </div>

                  {/* Receipt breakdown exactly styled like the screenshots! */}
                  <div className="bg-gray-50 border border-gray-100 rounded-3xl p-4 flex flex-col gap-3.5">
                    <div className="text-center font-bold">
                      <span className="text-[10px] text-gray-400 uppercase tracking-wide block leading-none">Your earnings</span>
                      <span className="text-2xl font-black text-gray-900 font-mono block mt-1 leading-none">
                        £{justCompletedTrip.fare.toFixed(2)}
                      </span>
                      <span className="text-[8.5px] text-gray-400 block leading-none mt-1">including fees</span>
                    </div>

                    <div className="flex flex-col gap-2.5 text-[11px] text-gray-600 border-t border-gray-150 pt-3.5">
                      <div className="flex justify-between">
                        <span>Base fare</span>
                        <span className="font-bold text-gray-900 font-mono">£{(justCompletedTrip.fare * 0.75).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Distance & Time ({justCompletedTrip.surgeMultiplier}x surge)</span>
                        <span className="font-bold text-gray-900 font-mono">£{(justCompletedTrip.fare * 0.25).toFixed(2)}</span>
                      </div>
                      {justCompletedTrip.tip > 0 && (
                        <div className="flex justify-between text-[#13AA52] font-black">
                          <span>💎 Passenger Tip</span>
                          <span className="font-mono">+£{justCompletedTrip.tip.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-black text-gray-900 text-sm border-t border-gray-150 pt-2.5">
                        <span>Total Payout</span>
                        <span className="font-mono text-[#13AA52]">£{(justCompletedTrip.fare + justCompletedTrip.tip).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* How was your rider stars feedback! */}
                  <div className="flex flex-col items-center gap-1.5 pb-2">
                    <span className="text-[9.5px] text-gray-400 font-bold uppercase tracking-wider block">
                      {mode === 'food' ? 'How was your customer?' : 'How was your rider?'}
                    </span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star key={star} className="w-4.5 h-4.5 text-amber-500 fill-amber-500" />
                      ))}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    onClick={() => { playSoundEffect('tap'); setShowCelebration(false); setJustCompletedTrip(null); }}
                    className="w-full bg-[#13AA52] hover:bg-[#0f8f44] text-white font-black py-3.5 rounded-xl transition shadow-lg text-xs uppercase tracking-wide cursor-pointer text-center"
                  >
                    Submit & Done
                  </button>
                </div>
              )}

              {/* PERSISTENT TAB NAVBAR NAVIGATION AT THE BOTTOM (Matches Swift layout precisely!) */}
              <div className="h-12 bg-white border-t border-gray-100 flex items-center justify-around shrink-0 z-20">
                <button
                  onClick={() => { playSoundEffect('tap'); setActiveTab('home'); }}
                  className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                    activeTab === 'home' ? 'text-[#13AA52]' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <Navigation className="w-4 h-4" />
                  <span className="text-[8.5px] font-extrabold font-sans">Home</span>
                </button>

                <button
                  onClick={() => { playSoundEffect('tap'); setActiveTab('earnings'); }}
                  className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                    activeTab === 'earnings' ? 'text-[#13AA52]' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span className="text-[8.5px] font-extrabold font-sans">Earnings</span>
                </button>

                <button
                  onClick={() => { playSoundEffect('tap'); setActiveTab('wallet'); }}
                  className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                    activeTab === 'wallet' ? 'text-[#13AA52]' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <Landmark className="w-4 h-4" />
                  <span className="text-[8.5px] font-extrabold font-sans">Wallet</span>
                </button>

                <button
                  onClick={() => { playSoundEffect('tap'); setActiveTab('profile'); }}
                  className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                    activeTab === 'profile' ? 'text-[#13AA52]' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span className="text-[8.5px] font-extrabold font-sans">Profile</span>
                </button>
              </div>

            </div>

            {/* Simulated Smartphone bottom screen safearea pill */}
            <div className="hidden md:flex h-5.5 bg-white items-center justify-center shrink-0 rounded-b-[42px] select-none pb-1">
              <span className="w-24 h-1 bg-gray-300 rounded-full" />
            </div>

          </div>

    </div>
  );
}
