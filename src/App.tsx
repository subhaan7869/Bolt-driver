import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { 
  DriverStats, RideRequest, TripProgress, SimulatorLog, CompletedTrip, ActiveChat, TripStage 
} from './types';
import { MapSimulator } from './components/MapSimulator';
import { CommandCentre } from './components/CommandCentre';
import { AIPilotCoach } from './components/AIPilotCoach';
import { 
  playTapSound, playCompleteRideSound, playWarningSound, playIncomingRideSound 
} from './utils/SoundGenerator';
import { 
  Navigation, Star, Zap, Clock, Landmark, Sparkles, Compass, MessageSquare, 
  AlertTriangle, CheckCircle, Smartphone, Wifi, Battery, Menu, Bell, 
  ChevronRight, ChevronLeft, Info, Car, HelpCircle, Settings, LogOut, Check, ArrowRight, X, Phone, User, Calendar, Coffee,
  Globe, Lock, ShieldAlert, Video, WifiOff, Sun, Moon, Sliders, Mail, Award, Target, TrendingUp, Search, Map, Flame
} from 'lucide-react';

// Live Firebase client and authentications
import { onAuthStateChanged, signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, onSnapshot } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from './firebase';
import { FaceScannerModal } from './components/FaceScannerModal';
import { SwipeButton } from './components/SwipeButton';

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

const CITY_ADDRESSES: Record<string, {
  taxi: {
    pickup: string[];
    dropoff: string[];
  };
  food: {
    restaurants: string[];
    residences: string[];
  };
  surgeAreas: string[];
}> = {
  'london': {
    taxi: {
      pickup: [
        'Piccadilly Circus / Regent Street',
        'City of London / Threadneedle St',
        'London Heathrow Airport (LHR) Terminal 5',
        'Soho Square / Greek Street',
        'Covent Garden Market / Long Acre'
      ],
      dropoff: [
        'Mayfair / Oxford Street',
        'Hyde Park Garden Road / Piccadilly',
        'The Savoy Hotel, Strand, West End',
        'Big Ben / Westminster Bridge',
        'Oxford Street East, London'
      ]
    },
    food: {
      restaurants: [
        "Nando's, Piccadilly Circus, London",
        "Gourmet Burger Kitchen, Oxford Street, London",
        "Wagamama, Covent Garden, London",
        "Dishoom, Covent Garden, London"
      ],
      residences: [
        "Mayfair Presidential Residences, London",
        "Kensington Garden Apartments, London",
        "Leicester Square Penthouse, London",
        "Soho Loft Studios, London"
      ]
    },
    surgeAreas: ['London Soho', 'Mayfair', 'Westminster', 'Hyde Park']
  },
  'birmingham': {
    taxi: {
      pickup: [
        'Birmingham New Street Station / Stephenson St',
        'Broad Street / Brindleyplace',
        'Birmingham Airport (BHX) Terminal 1',
        'Jewellery Quarter / Vyse Street',
        'Mailbox Birmingham / Commercial St'
      ],
      dropoff: [
        'Bullring Shopping Centre / High St',
        'Edgbaston Cricket Ground / Pershore Rd',
        'Bournville Village / Linden Road',
        'Selly Oak / Bristol Road',
        'Sutton Coldfield Park Gate'
      ]
    },
    food: {
      restaurants: [
        "Nando's, Bullring Shopping Centre, Birmingham",
        "Gourmet Burger Kitchen, Mailbox, Birmingham",
        "Dishoom, Chamberlain Square, Birmingham",
        "Original Patty Men, Digbeth, Birmingham"
      ],
      residences: [
        "Brindleyplace Executive Wharf, Birmingham",
        "Edgbaston Manor Residences, Birmingham",
        "Digbeth Creative Lofts, Birmingham",
        "S01 Wharfside Apartments, Birmingham"
      ]
    },
    surgeAreas: ['Bullring', 'Broad Street', 'Mailbox', 'Digbeth']
  },
  'nottingham': {
    taxi: {
      pickup: [
        'Old Market Square / Beastmarket Hill',
        'Nottingham Station / Carrington St',
        'Lace Market / High Pavement',
        'Trent Bridge Cricket Ground / Bridgford Rd',
        'Hockley / Broad Street'
      ],
      dropoff: [
        'Wollaton Hall / Wollaton Road',
        'University Park / University Boulevard',
        'Nottingham Castle / Lenton Road',
        'Beeston High Street',
        'Sherwood Forest Visitor Centre'
      ]
    },
    food: {
      restaurants: [
        "Nando's, Market Square, Nottingham",
        "Gourmet Burger Kitchen, Trinity Square, Nottingham",
        "Annie's Burger Shack, Lacey Road, Nottingham",
        "Sexy Mamma Love Spaghetti, Hockley, Nottingham"
      ],
      residences: [
        "Lace Market Luxury Suites, Nottingham",
        "Wollaton Park Gate Apartments, Nottingham",
        "Hockley Student Studios, Nottingham",
        "The Park Estate Villas, Nottingham"
      ]
    },
    surgeAreas: ['Lace Market', 'Hockley', 'Old Market Square', 'Trent Bridge']
  },
  'manchester': {
    taxi: {
      pickup: [
        'Piccadilly Gardens / Market Street',
        'Manchester Piccadilly Station',
        'Northern Quarter / Thomas Street',
        'Manchester Airport (MAN) Terminal 2',
        'MediaCityUK / Salford Quays'
      ],
      dropoff: [
        'Deansgate / Spinningfields',
        'Old Trafford Stadium / Sir Matt Busby Way',
        'Ancoats / Blossom Street',
        'Castlefield Basin / Duke Street',
        'Didsbury Village / Wilmslow Rd'
      ]
    },
    food: {
      restaurants: [
        "Nando's, Piccadilly Gardens, Manchester",
        "Gourmet Burger Kitchen, Trafford Centre, Manchester",
        "Rudy's Pizza, Ancoats, Manchester",
        "Albert's Schloss, Peter Street, Manchester"
      ],
      residences: [
        "Spinningfields Luxury Penthouses, Manchester",
        "Northern Quarter Canal Apartments, Manchester",
        "MediaCity Waterside Executive Flats, Manchester",
        "Salford Quays Quayhouse, Manchester"
      ]
    },
    surgeAreas: ['Spinningfields', 'Northern Quarter', 'MediaCity', 'Ancoats']
  },
  'leeds': {
    taxi: {
      pickup: [
        'Trinity Leeds / Briggate',
        'Leeds Station / New Station St',
        'Headingley / Otley Road',
        'Leeds Bradford Airport (LBA) Terminal',
        'Kirkgate Market / George Street'
      ],
      dropoff: [
        'Roundhay Park / Princes Avenue',
        'Victoria Quarter / King Edward St',
        'Clarence Dock / Armouries Drive',
        'Chapel Allerton / Harrogate Rd',
        'Kirkstall Abbey / Abbey Rd'
      ]
    },
    food: {
      restaurants: [
        "Nando's, Briggate, Leeds",
        "Gourmet Burger Kitchen, Trinity Shopping, Leeds",
        "Bundobust, Mill Hill, Leeds",
        "Zaap Thai Street Food, Leeds"
      ],
      residences: [
        "Headingley Student House, Leeds",
        "Roundhay Luxury Villas, Leeds",
        "Clarence Dock Waterside Apartments, Leeds",
        "Water Lane Urban Lofts, Leeds"
      ]
    },
    surgeAreas: ['Briggate', 'Headingley', 'Trinity Leeds', 'Clarence Dock']
  }
};

const getCityAddresses = (city: string) => {
  const normCity = (city || 'London').trim().toLowerCase();
  if (CITY_ADDRESSES[normCity]) {
    return CITY_ADDRESSES[normCity];
  }
  
  // Dynamic fallback generator using the exact city name
  return {
    taxi: {
      pickup: [
        `${city} High Street / Town Centre`,
        `${city} Central Station / Station Rd`,
        `${city} Civic Square / Cathedral Place`,
        `${city} Northern Quarter / Market Lane`,
        `${city} Park & Ride Gateway`
      ],
      dropoff: [
        `${city} Grand Hotel & Spa / Victoria Rd`,
        `${city} Heights Luxury Residences`,
        `${city} Meadows Park / Green Street`,
        `${city} Retail Outlet / Shopping Walk`,
        `Riverside Marina, ${city}`
      ]
    },
    food: {
      restaurants: [
        `Nando's, ${city} Shop Centre`,
        `Gourmet Burger Kitchen, ${city} Waterfront`,
        `Wagamama, ${city} Plaza`,
        `The Pizza Slabs, ${city}`
      ],
      residences: [
        `${city} Heights Marina Apartments`,
        `${city} Manor Park Estate`,
        `${city} Central Luxury Lofts`,
        `Woodland Crescent Residences, ${city}`
      ]
    },
    surgeAreas: [`${city} Centre`, `${city} Waterfront`, `${city} Station`, `${city} Plaza`]
  };
};

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
  const [homeView, setHomeView] = useState<'map' | 'command'>('command');

  // Firebase Auth states
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Compliance variables (per user account / local storage fallback)
  const [faceVerified, setFaceVerified] = useState<boolean>(() => {
    const saved = localStorage.getItem('swift_face_verified');
    return saved !== 'false'; // Default to true so it works automatically!
  });
  const [faceSelfieUrl, setFaceSelfieUrl] = useState<string>(() => {
    return localStorage.getItem('swift_face_selfie_url') || '';
  });
  const [showFaceScanner, setShowFaceScanner] = useState<boolean>(false);

  const [insuranceVerified, setInsuranceVerified] = useState<boolean>(() => {
    const saved = localStorage.getItem('swift_insurance_verified');
    return saved !== 'false'; // Default to true so simulation runs smoothly, let them customize
  });
  const [insurancePolicyNo, setInsurancePolicyNo] = useState<string>(() => {
    return localStorage.getItem('swift_insurance_policy') || 'UK-ZEGO-SWIFT-9482903';
  });
  const [insuranceExpiry, setInsuranceExpiry] = useState<string>(() => {
    return localStorage.getItem('swift_insurance_expiry') || '2026-08-24';
  });

  // OTP Compliance variables
  const [otpEmail, setOtpEmail] = useState<string>('hassennabeel9@gmail.com');
  const [otpCode, setOtpCode] = useState<string>('');
  const [otpVerified, setOtpVerified] = useState<boolean>(() => {
    return localStorage.getItem('swift_otp_verified') === 'true';
  });
  const [otpLoading, setOtpLoading] = useState<boolean>(false);
  const [otpStatusMsg, setOtpStatusMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' | null }>({ text: '', type: null });
  const [testOtpReceived, setTestOtpReceived] = useState<string | null>(null);

  // Random Face Verify Audit states
  const [randomAuditActive, setRandomAuditActive] = useState<boolean>(false);
  const [randomAuditTimer, setRandomAuditTimer] = useState<number>(60);

  // Real Internet online/offline indicator vs Simulation offline-toggle
  const [offlineSimulation, setOfflineSimulation] = useState<boolean>(() => {
    return localStorage.getItem('swift_offline_simulation') === 'true';
  });
  const [networkOnline, setNetworkOnline] = useState<boolean>(navigator.onLine);

  // Combined readiness is true if both real browser and sim are online
  const isInternetConnected = useMemo(() => {
    return networkOnline && !offlineSimulation;
  }, [networkOnline, offlineSimulation]);

  // Real-world Live GPS Geolocation states
  const [realCoords, setRealCoords] = useState<{ lat: number; lon: number; accuracy: number; address: string } | null>(null);
  const [useRealGPS, setUseRealGPS] = useState<boolean>(() => {
    return localStorage.getItem('swift_use_real_gps') === 'true';
  });
  const [currentCity, setCurrentCity] = useState<string>(() => {
    return localStorage.getItem('swift_current_city') || 'London';
  });
  const [geoTrackingState, setGeoTrackingState] = useState<'idle' | 'tracking' | 'denied'>('idle');

  const handleRequestOtp = async () => {
    if (!otpEmail || !otpEmail.includes('@') || otpLoading) return;
    playSoundEffect('tap');
    setOtpLoading(true);
    setOtpStatusMsg({ text: 'Dispatching daily pass code via server...', type: 'info' });
    setTestOtpReceived(null);

    try {
      const res = await fetch('/api/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpEmail })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Server request failed');
      }

      setOtpStatusMsg({ text: data.message, type: 'success' });
      if (data.otp) {
        setTestOtpReceived(data.otp);
      }
      appendLog(`🔒 Daily security pass code requested for ${otpEmail}.`, 'info');
      playSoundEffect('complete');
    } catch (err: any) {
      console.error(err);
      setOtpStatusMsg({ text: err.message, type: 'error' });
      playSoundEffect('warn');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpLoading) return;
    playSoundEffect('tap');
    setOtpLoading(true);
    setOtpStatusMsg({ text: 'Validating security code with server...', type: 'info' });

    try {
      const res = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: otpEmail, code: otpCode })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid security code');
      }

      setOtpVerified(true);
      localStorage.setItem('swift_otp_verified', 'true');
      setOtpStatusMsg({ text: data.message, type: 'success' });
      appendLog(`✓ Daily security pass verified successfully for ${otpEmail}.`, 'success');
      playSoundEffect('complete');

      // Update in Firestore profile too if user is authenticated
      if (user) {
        try {
          await updateDoc(doc(db, 'drivers', user.uid), {
            otpVerified: true,
            updatedAt: new Date().toISOString()
          });
        } catch (e) {
          console.error('Error updating profile with otpVerified:', e);
        }
      }
    } catch (err: any) {
      console.error(err);
      setOtpStatusMsg({ text: err.message, type: 'error' });
      playSoundEffect('warn');
    } finally {
      setOtpLoading(false);
    }
  };

  useEffect(() => {
    localStorage.setItem('swift_current_city', currentCity);
  }, [currentCity]);

  // Bolt-exclusive premium state variables
  const [boltCategories, setBoltCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('swift_bolt_categories');
      return saved ? JSON.parse(saved) : ['comfort', 'xl', 'lite'];
    } catch (_) {
      return ['comfort', 'xl', 'lite'];
    }
  });
  const [destinationFilter, setDestinationFilter] = useState<string>(() => {
    return localStorage.getItem('swift_destination_filter') || '';
  });
  const [destinationActivated, setDestinationActivated] = useState<boolean>(() => {
    return localStorage.getItem('swift_destination_active') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('swift_bolt_categories', JSON.stringify(boltCategories));
  }, [boltCategories]);

  useEffect(() => {
    localStorage.setItem('swift_destination_filter', destinationFilter);
  }, [destinationFilter]);

  useEffect(() => {
    localStorage.setItem('swift_destination_active', String(destinationActivated));
  }, [destinationActivated]);

  // Quests & Challenges states
  const [quests] = useState([
    { id: 'q-1', name: 'Morning Peak Hustle', description: 'Complete 3 simulated trips across Soho or local core.', target: 3, reward: 15.00 },
    { id: 'q-2', name: 'Elite Comfort Quest', description: 'Complete 2 Comfort premium category rides.', target: 2, reward: 25.00 },
    { id: 'q-3', name: 'Airport Shuttle Run', description: 'Complete 1 long-haul trip ending near Heathrow Airport terminals.', target: 1, reward: 20.00 },
    { id: 'q-4', name: 'Double-Shift Explorer', description: 'Earn high rating marks over 5 total completed trips.', target: 5, reward: 35.00 },
  ]);

  const [completedQuestIds, setCompletedQuestIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('swift_completed_quests');
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });

  const [completedComfortCount, setCompletedComfortCount] = useState<number>(() => {
    return Number(localStorage.getItem('swift_completed_comfort') || '0');
  });

  const [completedAirportCount, setCompletedAirportCount] = useState<number>(() => {
    return Number(localStorage.getItem('swift_completed_airport') || '0');
  });

  useEffect(() => {
    localStorage.setItem('swift_completed_quests', JSON.stringify(completedQuestIds));
  }, [completedQuestIds]);

  useEffect(() => {
    localStorage.setItem('swift_completed_comfort', String(completedComfortCount));
  }, [completedComfortCount]);

  useEffect(() => {
    localStorage.setItem('swift_completed_airport', String(completedAirportCount));
  }, [completedAirportCount]);

  // Dark Mode, Ambient Wander, and Background notifications configuration states
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('swift_dark_mode') === 'true';
  });
  const [simulateWandering, setSimulateWandering] = useState<boolean>(() => {
    return localStorage.getItem('swift_simulate_wandering') !== 'false';
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    return localStorage.getItem('swift_notifications_enabled') !== 'false';
  });
  const [backgroundModeEnabled, setBackgroundModeEnabled] = useState<boolean>(() => {
    return localStorage.getItem('swift_background_mode_enabled') !== 'false';
  });
  const [workerTickCount, setWorkerTickCount] = useState<number>(0);

  // Stats for both modes separately to support dynamic swapping!
  const [taxiStats, setTaxiStats] = useState<DriverStats>(() => {
    const saved = localStorage.getItem('bolt_sim_taxi_stats');
    const parsed = saved ? JSON.parse(saved) : { ...INITIAL_TAXI_STATS };
    const foodSaved = localStorage.getItem('bolt_sim_food_stats');
    const foodParsed = foodSaved ? JSON.parse(foodSaved) : null;
    if (foodParsed) {
      parsed.balance = foodParsed.balance;
      parsed.todayEarnings = foodParsed.todayEarnings;
      parsed.weeklyEarnings = foodParsed.weeklyEarnings;
    }
    return parsed;
  });

  const [foodStats, setFoodStats] = useState<DriverStats>(() => {
    const saved = localStorage.getItem('bolt_sim_food_stats');
    const parsed = saved ? JSON.parse(saved) : { ...INITIAL_FOOD_STATS };
    const taxiSaved = localStorage.getItem('bolt_sim_taxi_stats');
    const taxiParsed = taxiSaved ? JSON.parse(taxiSaved) : null;
    if (taxiParsed) {
      parsed.balance = taxiParsed.balance;
      parsed.todayEarnings = taxiParsed.todayEarnings;
      parsed.weeklyEarnings = taxiParsed.weeklyEarnings;
    }
    return parsed;
  });

  const stats = useMemo(() => {
    return mode === 'taxi' ? taxiStats : foodStats;
  }, [mode, taxiStats, foodStats]);

  const setStats = useCallback((updater: (s: DriverStats) => DriverStats) => {
    if (mode === 'taxi') {
      setTaxiStats(p => {
        const next = updater(p);
        setFoodStats(f => ({
          ...f,
          todayEarnings: next.todayEarnings,
          weeklyEarnings: next.weeklyEarnings,
          balance: next.balance,
        }));
        return next;
      });
    } else {
      setFoodStats(p => {
        const next = updater(p);
        setTaxiStats(t => ({
          ...t,
          todayEarnings: next.todayEarnings,
          weeklyEarnings: next.weeklyEarnings,
          balance: next.balance,
        }));
        return next;
      });
    }
  }, [mode]);

  // Completed trips tracking (Persisted in LocalStorage, seeds default list if empty)
  const [taxiTrips, setTaxiTrips] = useState<CompletedTrip[]>(() => {
    try {
      const saved = localStorage.getItem('swift_taxi_completed_trips');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return [
      {
        id: 'mock-t-1',
        passengerName: 'Jasper Montgomery',
        pickupAddress: 'Mayfair District Lounge',
        dropoffAddress: 'Chelsea Pavilions Gate',
        fare: 16.50,
        tip: 4.50,
        timestamp: 'Today, 10:24 AM',
        ratingValue: 5,
        surgeMultiplier: 1.4
      },
      {
        id: 'mock-t-2',
        passengerName: 'Alistair Sterling',
        pickupAddress: 'London City Airport Terminal 1',
        dropoffAddress: 'Westminster Green',
        fare: 34.00,
        tip: 5.00,
        timestamp: 'Yesterday, 05:45 PM',
        ratingValue: 5,
        surgeMultiplier: 1.0
      },
      {
        id: 'mock-t-3',
        passengerName: 'Penelope Thorne',
        pickupAddress: 'Regent\'s Park North Coach',
        dropoffAddress: 'Buckingham Palace East Gateway',
        fare: 18.20,
        tip: 3.00,
        timestamp: 'Yesterday, 08:15 PM',
        ratingValue: 5,
        surgeMultiplier: 1.8
      }
    ];
  });

  const [foodTrips, setFoodTrips] = useState<CompletedTrip[]>(() => {
    try {
      const saved = localStorage.getItem('swift_food_completed_trips');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return [
      {
        id: 'mock-f-1',
        passengerName: 'Fiona Gallagher',
        pickupAddress: 'Gourmet Burger Kitchen',
        dropoffAddress: 'Flat 4B, Bloomsbury Square',
        fare: 8.50,
        tip: 2.00,
        timestamp: 'Today, 11:32 AM',
        ratingValue: 5,
        surgeMultiplier: 1.2
      },
      {
        id: 'mock-f-2',
        passengerName: 'Nigel Rutherford',
        pickupAddress: 'Dishoom Indian Cuisine',
        dropoffAddress: 'Soho Creative Studio Floor 3',
        fare: 11.20,
        tip: 3.50,
        timestamp: 'Yesterday, 01:10 PM',
        ratingValue: 5,
        surgeMultiplier: 1.5
      },
      {
        id: 'mock-f-3',
        passengerName: 'Imogen Sinclair',
        pickupAddress: 'Pizza Express Covent Garden',
        dropoffAddress: 'King\'s College Dorm Room 51A',
        fare: 7.20,
        tip: 1.50,
        timestamp: 'Yesterday, 07:40 PM',
        ratingValue: 5,
        surgeMultiplier: 1.0
      }
    ];
  });

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

  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [isSideMenuOpen, setIsSideMenuOpen] = useState<boolean>(false);
  const [tripTypeFilter, setTripTypeFilter] = useState<'all' | 'high_yield'>('all');
  const [selectedInvoiceTrip, setSelectedInvoiceTrip] = useState<CompletedTrip | null>(null);
  const [selectedPrebooking, setSelectedPrebooking] = useState<any | null>(null);
  const [tripSearchText, setTripSearchText] = useState<string>('');
  const [isBooting, setIsBooting] = useState<boolean>(true);
  const [bootProgress, setBootProgress] = useState<number>(0);
  const [bootStage, setBootStage] = useState<string>('Initializing SWIFT Pilot OS...');
  const [bootLogs, setBootLogs] = useState<string[]>([
    '⚙️ SWIFT Pilot Co-Pilot Terminal v4.28.1 booting...',
    '⚙️ System environment: Secure Sandboxed Dev Node',
  ]);
  const [hapticEnabled, setHapticEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('swift_haptic_enabled') !== 'false';
    } catch (_) {
      return true;
    }
  });
  const [triggerHapticPulse, setTriggerHapticPulse] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isCoachOpen, setIsCoachOpen] = useState<boolean>(false);
  const [isOnBreak, setIsOnBreak] = useState<boolean>(false);
  
  // Streak Count for completed consecutive trips
  const [streakCount, setStreakCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('swift_streak_count');
      return saved ? parseInt(saved, 10) : 0;
    } catch (_) {
      return 0;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('swift_streak_count', streakCount.toString());
    } catch (_) {}
  }, [streakCount]);

  // One-tap Head Home Mode
  const [headHomeMode, setHeadHomeMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('swift_head_home_mode') === 'true';
    } catch (_) {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('swift_head_home_mode', String(headHomeMode));
    } catch (_) {}
  }, [headHomeMode]);

  const [homeAddress, setHomeAddress] = useState<string>(() => {
    try {
      return localStorage.getItem('swift_home_address') || 'Hammersmith Broadway, London';
    } catch (_) {
      return 'Hammersmith Broadway, London';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('swift_home_address', homeAddress);
    } catch (_) {}
  }, [homeAddress]);

  // Favorite waiting zones saved
  const [favZones, setFavZones] = useState<{ id: string; name: string; lat: number; lon: number }[]>(() => {
    try {
      const saved = localStorage.getItem('swift_fav_zones');
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('swift_fav_zones', JSON.stringify(favZones));
    } catch (_) {}
  }, [favZones]);

  // Active driving time (actual trip time) & Miles driven today
  const [activeDrivingTime, setActiveDrivingTime] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('swift_active_driving_time');
      return saved ? parseFloat(saved) : 1.25; // default 1.25h
    } catch (_) {
      return 1.25;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('swift_active_driving_time', activeDrivingTime.toString());
    } catch (_) {}
  }, [activeDrivingTime]);

  const [milesDriven, setMilesDriven] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('swift_miles_driven');
      return saved ? parseFloat(saved) : 34.8; // default 34.8 miles
    } catch (_) {
      return 34.8;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('swift_miles_driven', milesDriven.toString());
    } catch (_) {}
  }, [milesDriven]);

  // Break countdown timer in seconds
  const [breakTimeRemaining, setBreakTimeRemaining] = useState<number>(0);

  const [surgeLevel, setSurgeLevel] = useState<'low' | 'medium' | 'high'>('high');
  const [selectedPeak, setSelectedPeak] = useState<'breakfast' | 'lunch' | 'dinner' | 'offpeak'>('dinner');
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

  const tripProgressRef = useRef<TripProgress>(tripProgress);
  tripProgressRef.current = tripProgress;

  const [earningsPeriod, setEarningsPeriod] = useState<'day' | 'week' | 'month' | 'year'>('day');

  // Multi-delivery states for premium food mode
  const [activeEatsJobs, setActiveEatsJobs] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('swift_active_eats_jobs');
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });

  const [activeEatsJobId, setActiveEatsJobId] = useState<string | null>(() => {
    return localStorage.getItem('swift_active_eats_job_id') || null;
  });

  // Food eats mode bootup sequence (-1 = inactive, 100 = completed, 0-4 = stages)
  const [eatsBootupProgress, setEatsBootupProgress] = useState<number>(-1);

  // Subscreen navigation state inside Menu/Profile tab
  const [menuSubScreen, setMenuSubScreen] = useState<string>('main');
  const [showDestinationSettings, setShowDestinationSettings] = useState<boolean>(false);

  // Editable dynamic vehicles state
  const [vehicles, setVehicles] = useState<{id: string, name: string, class: string, plate: string, active: boolean}[]>([
    {id: '1', name: 'Toyota Auris Hybrid (2019)', class: 'Swift Ride, Cargo Carrier', plate: 'LF69 SFT', active: true},
    {id: '2', name: 'Cargo Electric E-Bike', class: 'Swift Eats Courier only', plate: 'BIKE-32X', active: false}
  ]);
  const [showAddVehicleForm, setShowAddVehicleForm] = useState<boolean>(false);
  const [newVehicleName, setNewVehicleName] = useState<string>('');
  const [newVehiclePlate, setNewVehiclePlate] = useState<string>('');
  const [newVehicleClass, setNewVehicleClass] = useState<string>('Swift Ride');

  // Working availability day state (M, T, W, T, F, S, S)
  const [workingDays, setWorkingDays] = useState<boolean[]>([true, true, true, true, true, true, true]);
  const [autoOnlineStartup, setAutoOnlineStartup] = useState<boolean>(false);

  // Dynamic Driver Level & Points State
  const [driverPoints, setDriverPoints] = useState<number>(() => {
    const saved = localStorage.getItem('swift_driver_points');
    return saved ? parseInt(saved, 10) : 135; // Default points (Silver/Bronze bound)
  });

  // Daily Earnings Target Goal State
  const [dailyEarningsGoal, setDailyEarningsGoal] = useState<number>(() => {
    const saved = localStorage.getItem('swift_daily_earnings_goal');
    return saved ? parseInt(saved, 10) : 100; // Default £100 goal
  });

  // Goal Achievement Notification state
  const [goalAchievedNotified, setGoalAchievedNotified] = useState<boolean>(() => {
    return localStorage.getItem('swift_goal_notified') === 'true';
  });

  // Scheduled Bookings Calendar State
  const [scheduledBookings, setScheduledBookings] = useState<{ id: string; passengerName: string; timeString: string; route: string; fare: number; claimed: boolean; category: string }[]>(() => {
    const saved = localStorage.getItem('swift_scheduled_bookings');
    if (saved) return JSON.parse(saved);
    return [
      { id: 'sb-1', passengerName: 'Alexander Bell', timeString: 'In 8m', route: 'Mayfair ➔ Heathrow T2', fare: 48.00, claimed: false, category: 'Swift Airport Line' },
      { id: 'sb-2', passengerName: 'Flora McDonald', timeString: 'In 15m', route: 'Soho ➔ Chelsea Pavilions', fare: 18.50, claimed: true, category: 'Swift Comfort Tier' },
      { id: 'sb-3', passengerName: 'Sir Arthur Conan Doyle', timeString: 'In 24m', route: 'Baker Street ➔ Kings Cross Station', fare: 12.20, claimed: false, category: 'Swift Basic Ride' }
    ];
  });

  // Dynamically computed driver level metrics
  const driverLevel = useMemo(() => {
    if (driverPoints < 150) {
      return { 
        name: 'Bronze' as const, 
        color: 'text-amber-700 dark:text-amber-500 bg-amber-500/10 border-amber-500/20 dark:border-amber-550/30', 
        nextGoal: 150, 
        medal: '🥉', 
        label: 'Bronze Partner', 
        note: 'Complete rides to advance to Silver and unleash loyalty boosts.' 
      };
    }
    if (driverPoints < 400) {
      return { 
        name: 'Silver' as const, 
        color: 'text-zinc-650 dark:text-zinc-400 bg-zinc-500/10 border-zinc-500/20 dark:border-zinc-800', 
        nextGoal: 400, 
        medal: '🥈', 
        label: 'Silver Premium', 
        note: 'Earn +250 points to grab Gold Executive rewards and prioritised orders.' 
      };
    }
    if (driverPoints < 800) {
      return { 
        name: 'Gold' as const, 
        color: 'text-amber-600 dark:text-[#E6B014] bg-amber-500/10 border-amber-500/20 dark:border-amber-600/30', 
        nextGoal: 800, 
        medal: '🏆', 
        label: 'Gold Executive', 
        note: 'High-tier orders active. Reach 800 points to become a Platinum Legend!' 
      };
    }
    return { 
      name: 'Platinum' as const, 
      color: 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/20 dark:border-cyan-500/30', 
      nextGoal: 9999, 
      medal: '💎', 
      label: 'Platinum VIP Legend', 
      note: 'Ultimate matching privileges active. Highest-paying priority dispatches!' 
    };
  }, [driverPoints]);

  // Dynamic system notifications state
  const [notifications, setNotifications] = useState<{id: string, title: string, desc: string, time: string, read: boolean}[]>([
    {id: '1', title: 'London Soho Food Surge active', desc: 'Simulated food orders have 1.4x surge active due to heavy rain in Soho Central.', time: 'Just now', read: false},
    {id: '2', title: 'Driver Biometrics audit passed', desc: 'Daily facial scanner validation completed. Safe matching enabled for 24 hours.', time: '2h ago', read: false},
    {id: '3', title: 'Bonus pricing multiplier update', desc: 'Surgemeister levels updated to high multiplier factor across West End.', time: '5h ago', read: true}
  ]);

  // Support chatbot interactions state
  const [supportMessages, setSupportMessages] = useState<{id: string, sender: 'driver' | 'system', text: string}[]>([
    {id: '1', sender: 'system', text: "Hello! Welcome to Swift Driver Help Desk. Select any common system briefing below or ask a question directly:"}
  ]);
  const [supportInputMessage, setSupportInputMessage] = useState<string>('');
  const [supportLoading, setSupportLoading] = useState<boolean>(false);

  const handleSendSupportMessage = async (textToSend: string) => {
    if (!textToSend.trim() || supportLoading) return;
    try {
      playSoundEffect('tap');
    } catch (_) {}
    
    const userMsgId = String(Date.now());
    const userMsg = { id: userMsgId, sender: 'driver' as const, text: textToSend };
    setSupportMessages(prev => [...prev, userMsg]);
    setSupportInputMessage('');
    setSupportLoading(true);

    try {
      const response = await fetch('/api/chat-coach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...supportMessages, userMsg].map((m) => ({ text: m.text, sender: m.sender === 'driver' ? 'driver' : 'support' })),
          driverStats: stats,
        }),
      });

      if (!response.ok) throw new Error('API failed');
      const data = await response.json();
      const replyId = String(Date.now() + 1);
      const botReply = { id: replyId, sender: 'system' as const, text: data.text };
      setSupportMessages(prev => [...prev, botReply]);
      try {
        playSoundEffect('complete');
      } catch (_) {}
    } catch (e) {
      console.error(e);
      const replyId = String(Date.now() + 1);
      const botReply = { 
        id: replyId, 
        sender: 'system' as const, 
        text: "🚨 Hey driver, connection to our AI dispatch office is busy. Make sure you have entered your GEMINI_API_KEY in the Secrets panel, or try again shortly."
      };
      setSupportMessages(prev => [...prev, botReply]);
    } finally {
      setSupportLoading(false);
    }
  };

  useEffect(() => {
    localStorage.setItem('swift_active_eats_jobs', JSON.stringify(activeEatsJobs));
  }, [activeEatsJobs]);

  useEffect(() => {
    localStorage.setItem('swift_active_eats_job_id', activeEatsJobId || '');
  }, [activeEatsJobId]);

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

  const appendLog = useCallback((message: string, type: 'info' | 'success' | 'warn' | 'earnings' = 'info') => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setLogs((prev) => [
      { id: Math.random().toString(), timestamp: time, type, message },
      ...prev.slice(0, 35),
    ]);
  }, []);

  // Trigger virtual/real haptic feedback
  const triggerHaptic = useCallback((vibeType: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!hapticEnabled) return;
    
    // 1. Dynamic Web vibration channel
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        if (vibeType === 'light') navigator.vibrate(45);
        else if (vibeType === 'medium') navigator.vibrate(85);
        else if (vibeType === 'heavy') navigator.vibrate(160);
      }
    } catch (_) {}

    // 2. CSS-based visual screen shake haptic simulator pulse induction
    setTriggerHapticPulse(true);
    setTimeout(() => {
      setTriggerHapticPulse(false);
    }, 150);
  }, [hapticEnabled]);

  // Sound proxy helpers
  const playSoundEffect = useCallback((effect: 'tap' | 'complete' | 'warn' | 'offer') => {
    // Dispatch automated haptic patterns coincident with audio outputs
    if (effect === 'tap') triggerHaptic('light');
    else if (effect === 'complete') triggerHaptic('heavy');
    else if (effect === 'warn') triggerHaptic('heavy');
    else if (effect === 'offer') triggerHaptic('medium');

    if (!soundEnabled) return;
    if (effect === 'tap') playTapSound();
    else if (effect === 'complete') playCompleteRideSound();
    else if (effect === 'warn') playWarningSound();
    else if (effect === 'offer') playIncomingRideSound();
  }, [soundEnabled, triggerHaptic]);

  // Listen to custom map simulation activity log alerts and tap gestures
  useEffect(() => {
    const handleSimLog = (e: Event) => {
      const customEvent = e as CustomEvent<{ text: string; type: 'info' | 'warn' | 'success' | 'earnings' }>;
      if (customEvent.detail) {
        appendLog(customEvent.detail.text, customEvent.detail.type);
      }
    };
    const handlePlaySound = (e: Event) => {
      const customEvent = e as CustomEvent<any>;
      if (customEvent.detail) {
        playSoundEffect(customEvent.detail);
      }
    };
    window.addEventListener('add-simulation-log', handleSimLog);
    window.addEventListener('play-sound', handlePlaySound);
    return () => {
      window.removeEventListener('add-simulation-log', handleSimLog);
      window.removeEventListener('play-sound', handlePlaySound);
    };
  }, [appendLog, playSoundEffect]);

  // Break countdown timer in seconds
  useEffect(() => {
    if (!isOnBreak) {
      setBreakTimeRemaining(0);
      return;
    }
    
    if (breakTimeRemaining === 0) {
      setBreakTimeRemaining(300); // 5 minutes
    }

    const interval = setInterval(() => {
      setBreakTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsOnBreak(false);
          playSoundEffect('complete');
          appendLog("☕ Break finished! Auto-resuming driver dispatch matches.", "success");
          sendRealNotification("☕ Break Finished", "Auto-resuming your driver dispatch matches now!");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOnBreak, playSoundEffect, appendLog]);

  // 1. Initial Permission Setup on App Mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Dynamic bootup simulation sequence
  useEffect(() => {
    if (!isBooting) return;

    let progress = 0;
    const logsList = [
      '📡 Connecting securely with London Transport dispatch...',
      '📡 Syncing GNSS telemetry with 12 orbital satellites...',
      '📊 Aggregating active passenger traffic in central London...',
      '🔥 Loading dynamic surge multiplier matrices...',
      '🔋 Reading vehicle battery and thermal efficiency data...',
      '🎯 Synchronizing consecutive driver streak trackers...',
      '🏠 Mapping secure offline Co-Pilot backup routes...',
      '🚀 All systems nominal! Entering driver match dashboard.'
    ];

    const interval = setInterval(() => {
      // Dynamic acceleration of progress
      const increment = Math.floor(Math.random() * 8) + 4;
      progress = Math.min(100, progress + increment);
      setBootProgress(progress);

      // Sound play on significant step increments
      try {
        if (progress % 15 < 5) {
          playSoundEffect('tap');
        }
      } catch (_) {}

      // Update stage name based on percentage
      if (progress < 20) {
        setBootStage('Initializing SWIFT Pilot OS...');
      } else if (progress < 40) {
        setBootStage('Syncing GNSS Telemetry...');
      } else if (progress < 60) {
        setBootStage('Aggregating Passenger Grid...');
      } else if (progress < 80) {
        setBootStage('Loading Surge Matrices...');
      } else if (progress < 95) {
        setBootStage('Securing Offline Caches...');
      } else {
        setBootStage('Boot Complete. Safe Travels!');
      }

      // Add log entries based on progress
      const logIdx = Math.floor((progress / 100) * logsList.length);
      setBootLogs((prev) => {
        const nextLogs = [...prev];
        const line = logsList[Math.min(logIdx, logsList.length - 1)];
        if (!nextLogs.includes(line)) {
          nextLogs.push(line);
        }
        return nextLogs;
      });

      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          try {
            playSoundEffect('complete');
          } catch (_) {}
          setIsBooting(false);
          appendLog("🚀 SWIFT Co-Pilot System bootup complete. Dispatch matchmaking online.", "success");
        }, 700);
      }
    }, 150);

    return () => clearInterval(interval);
  }, [isBooting, playSoundEffect, appendLog]);

  // 2. In-App Toasts State and Dispatcher
  const [toasts, setToasts] = useState<{ id: string; title: string; body: string; type?: 'info' | 'success' | 'alert' | 'message' }[]>([]);

  const addToast = useCallback((title: string, body: string, type: 'info' | 'success' | 'alert' | 'message' = 'info') => {
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    setToasts((prev) => [{ id, title, body, type }, ...prev.slice(0, 3)]); // Keep maximum of 4 active toasts
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  // Real Notification helper (Alerts even when in background or minimized)
  const lastNoteRef = useRef<{ title: string; body: string; time: number } | null>(null);

  const sendRealNotification = useCallback((title: string, body: string, type: 'info' | 'success' | 'alert' | 'message' = 'info') => {
    const now = Date.now();

    // Prevent duplicate notifications firing in rapid succession
    if (
      lastNoteRef.current &&
      lastNoteRef.current.title === title &&
      lastNoteRef.current.body === body &&
      now - lastNoteRef.current.time < 1000
    ) {
      return;
    }
    lastNoteRef.current = { title, body, time: now };

    // Real Notification Delivery via Browser API
    if (notificationsEnabled && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        // Prefer Service Worker showNotification for reliable background delivery on Android/PWA
        if (navigator.serviceWorker && navigator.serviceWorker.ready) {
          navigator.serviceWorker.ready.then((registration) => {
            registration.showNotification(title, {
              body,
              icon: "https://www.gstatic.com/images/branding/product/1x/googleg_48dp.png",
              badge: "https://www.gstatic.com/images/branding/product/1x/googleg_48dp.png",
              vibrate: [200, 100, 200],
              tag: title,
              renotify: true,
              silent: false,
            } as any).catch(() => {
              new Notification(title, {
                body,
                icon: "https://www.gstatic.com/images/branding/product/1x/googleg_48dp.png",
                tag: title
              });
            });
          });
        } else {
          new Notification(title, {
            body,
            icon: "https://www.gstatic.com/images/branding/product/1x/googleg_48dp.png",
            tag: title
          });
        }
      } catch (e) {
        console.warn("Notification API failed, trying direct fallback:", e);
        try {
          new Notification(title, { body, tag: title });
        } catch (err) {}
      }
    }

    // Trigger feedback sound effects based on notification type
    if (type === 'success') {
      playSoundEffect('complete');
    } else if (type === 'alert' || type === 'message') {
      playSoundEffect('offer');
    }

    // Append to in-simulation notifications list
    const newNotif = {
      id: Math.random().toString(),
      title: title,
      desc: body,
      time: 'Just now',
      read: false
    };
    setNotifications((prev) => [newNotif, ...prev.slice(0, 49)]);

    // Render the in-app UI Toast as a visual fallback in the driver's interface
    addToast(title, body, type);
  }, [notificationsEnabled, playSoundEffect, addToast]);

  // Persist driver points, dynamic target details and scheduled reservations
  useEffect(() => {
    localStorage.setItem('swift_driver_points', driverPoints.toString());
  }, [driverPoints]);

  useEffect(() => {
    localStorage.setItem('swift_daily_earnings_goal', dailyEarningsGoal.toString());
  }, [dailyEarningsGoal]);

  useEffect(() => {
    localStorage.setItem('swift_scheduled_bookings', JSON.stringify(scheduledBookings));
  }, [scheduledBookings]);

  // Pre-bookings dynamic scheduler effect - runs every 60 seconds
  useEffect(() => {
    const updatePrebookings = () => {
      setScheduledBookings(prev => {
        // Step 1: Update timeStrings for all existing unclaimed bookings
        let updated = prev.map(b => {
          if (b.claimed) return b; // Don't change claimed ones

          // If the time is "In 30s", keep it or change to "Due Now"
          if (b.timeString === 'In 30s') {
            return { ...b, timeString: 'Due Now' };
          }
          if (b.timeString === 'Due Now') {
            return b;
          }

          // If it is in minutes, like "In Xm" or "In X min" or "In X mins" or "In 15m"
          const matchMins = b.timeString.match(/In\s+(\d+)\s*(m|min|mins)/i);
          if (matchMins) {
            const mins = parseInt(matchMins[1], 10);
            if (mins <= 1) {
              return { ...b, timeString: 'In 30s' };
            } else {
              return { ...b, timeString: `In ${mins - 1}m` };
            }
          }

          // If it's a static time, we don't strictly parse but we can leave it
          return b;
        });

        // Step 2: Randomly remove an unclaimed booking (driver claimed or passenger cancelled)
        const unclaimed = updated.filter(b => !b.claimed);
        const claimedOnes = updated.filter(b => b.claimed);
        
        let finalUnclaimed = [...unclaimed];

        if (finalUnclaimed.length > 2 && Math.random() < 0.3) {
          // Remove a random unclaimed booking
          const removeIdx = Math.floor(Math.random() * finalUnclaimed.length);
          const removed = finalUnclaimed[removeIdx];
          finalUnclaimed.splice(removeIdx, 1);
          appendLog(`📅 Pre-booking cancelled or claimed by another driver: "${removed.passengerName}" (${removed.route})`, 'info');
        }

        // Step 3: Randomly add a new pre-booking if there is space or automatically if count < 2
        const MOCK_PREBOOK_PASSENGERS = [
          'Emma Watson', 'Benedict Cumberbatch', 'Adele Adkins', 'Tom Hiddleston', 'Dua Lipa', 'Lewis Hamilton', 
          'J.K. Rowling', 'David Beckham', 'Idris Elba', 'Keira Knightley', 'Jude Law', 'Christian Bale',
          'Helen Mirren', 'Daniel Radcliffe', 'Emily Blunt', 'Gary Oldman', 'Olivia Colman', 'Hugh Grant',
          'Rosamund Pike', 'Dev Patel', 'Gemma Chan', 'James Corden'
        ];

        const MOCK_PREBOOK_ROUTES = [
          { route: 'Covent Garden ➔ London Bridge', baseFare: 16.50 },
          { route: 'Paddington Station ➔ Soho House', baseFare: 12.00 },
          { route: 'Mayfair ➔ Harrods Knightsbridge', baseFare: 14.50 },
          { route: 'Shoreditch High St ➔ Canary Wharf', baseFare: 19.80 },
          { route: 'Camden Town ➔ Wembley Stadium', baseFare: 28.00 },
          { route: 'Notting Hill ➔ Royal Albert Hall', baseFare: 11.20 },
          { route: 'Westminster ➔ Greenwich Observatory', baseFare: 24.50 },
          { route: 'Brixton Academy ➔ Waterloo Station', baseFare: 13.40 },
          { route: 'Heathrow Airport T5 ➔ The Ritz Hotel', baseFare: 55.00 },
          { route: 'Gatwick Airport ➔ Chelsea FC Stadium', baseFare: 62.00 },
          { route: 'St Pancras Intl ➔ Piccadilly Circus', baseFare: 9.80 },
          { route: 'The Shard ➔ Kensington Palace', baseFare: 22.00 }
        ];

        const MOCK_PREBOOK_CATEGORIES = [
          'Swift Basic Ride', 'Swift Comfort Tier', 'Swift Premium', 'Swift Airport Line', 'Swift Executive'
        ];

        if (finalUnclaimed.length < 2 || (finalUnclaimed.length < 5 && Math.random() < 0.4)) {
          // Generate a brand new pre-booking
          const passenger = MOCK_PREBOOK_PASSENGERS[Math.floor(Math.random() * MOCK_PREBOOK_PASSENGERS.length)];
          const routeObj = MOCK_PREBOOK_ROUTES[Math.floor(Math.random() * MOCK_PREBOOK_ROUTES.length)];
          const category = MOCK_PREBOOK_CATEGORIES[Math.floor(Math.random() * MOCK_PREBOOK_CATEGORIES.length)];
          const baseFare = routeObj.baseFare;
          // random fare fluctuation between -10% and +15%
          const fare = +( (baseFare * (0.9 + Math.random() * 0.25)).toFixed(2) );
          const minutesInFuture = Math.floor(Math.random() * 20) + 3; // 3 to 22 minutes in future
          const timeString = `In ${minutesInFuture}m`;
          
          const newBooking = {
            id: `sb-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            passengerName: passenger,
            timeString,
            route: routeObj.route,
            fare,
            claimed: false,
            category
          };

          finalUnclaimed.unshift(newBooking);
          appendLog(`📅 New pre-booking posted: "${passenger}" • ${routeObj.route} • £${fare.toFixed(2)} (${timeString})`, 'success');
        }

        // Return combined list, keeping maximum 10 historical/claimed bookings to avoid clutter
        return [...finalUnclaimed, ...claimedOnes].slice(0, 10);
      });
    };

    // Run interval every 60 seconds (1 minute)
    const prebookingInterval = setInterval(updatePrebookings, 60000);
    return () => clearInterval(prebookingInterval);
  }, [appendLog]);

  useEffect(() => {
    localStorage.setItem('swift_haptic_enabled', hapticEnabled ? 'true' : 'false');
  }, [hapticEnabled]);

  useEffect(() => {
    localStorage.setItem('swift_taxi_completed_trips', JSON.stringify(taxiTrips));
  }, [taxiTrips]);

  useEffect(() => {
    localStorage.setItem('swift_food_completed_trips', JSON.stringify(foodTrips));
  }, [foodTrips]);

  // Handle auto-checking of performance targets
  useEffect(() => {
    if (stats.todayEarnings >= dailyEarningsGoal && !goalAchievedNotified) {
      setGoalAchievedNotified(true);
      localStorage.setItem('swift_goal_notified', 'true');
      sendRealNotification(
        "🎯 Daily earnings target reached!",
        `Amazing work, CEO! You reached today's goal of £${dailyEarningsGoal}. Today's total: £${stats.todayEarnings.toFixed(2)}. Reward bonus of +50 Driver Points awarded!`,
        'success'
      );
      setDriverPoints(p => p + 50);
    } else if (stats.todayEarnings < dailyEarningsGoal && goalAchievedNotified) {
      setGoalAchievedNotified(false);
      localStorage.setItem('swift_goal_notified', 'false');
    }
  }, [stats.todayEarnings, dailyEarningsGoal, goalAchievedNotified, sendRealNotification]);

  const sendNotification = sendRealNotification;

  const [currentTimeStr, setCurrentTimeStr] = useState('09:41');

  // Time and Midnight Reset Effect
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setCurrentTimeStr(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));

      // Midnight/Date reset check
      const todayStr = d.toLocaleDateString('en-CA'); // YYYY-MM-DD
      const lastLogin = localStorage.getItem('bolt_sim_last_login_date');
      if (lastLogin && lastLogin !== todayStr) {
        setTaxiStats(p => ({
          ...p,
          todayEarnings: 0,
          balance: 0,
        }));
        setFoodStats(p => ({
          ...p,
          todayEarnings: 0,
          balance: 0,
        }));
        appendLog("🕛 Midnight strike! Daily simulated earnings and balances reset to £0.00.", "success");
        localStorage.setItem('bolt_sim_last_login_date', todayStr);
      }
    };

    // First time login date tracking check on mount
    const d = new Date();
    const todayStr = d.toLocaleDateString('en-CA');
    const lastLogin = localStorage.getItem('bolt_sim_last_login_date');
    if (lastLogin && lastLogin !== todayStr) {
      setTaxiStats(p => ({
        ...p,
        todayEarnings: 0,
        balance: 0,
      }));
      setFoodStats(p => ({
        ...p,
        todayEarnings: 0,
        balance: 0,
      }));
      appendLog("🌅 New day started! Simulated earnings and balance successfully reset to £0.00.", "success");
    }
    localStorage.setItem('bolt_sim_last_login_date', todayStr);

    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, [appendLog]);

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

  // Automated Quest Completion Tracker Effect
  useEffect(() => {
    if (mode !== 'taxi') return;

    const newlyCompleted: string[] = [];
    
    // Quest 1: Morning Peak Hustle (3 completed trips total)
    if (stats.completedTripsCount >= 3 && !completedQuestIds.includes('q-1')) {
      newlyCompleted.push('q-1');
    }
    // Quest 2: Elite Comfort Quest (2 Comfort category trips)
    if (completedComfortCount >= 2 && !completedQuestIds.includes('q-2')) {
      newlyCompleted.push('q-2');
    }
    // Quest 3: Airport Shuttle Run (1 long-haul airport trip)
    if (completedAirportCount >= 1 && !completedQuestIds.includes('q-3')) {
      newlyCompleted.push('q-3');
    }
    // Quest 4: Double-Shift Explorer (5 completed trips overall)
    if (stats.completedTripsCount >= 5 && !completedQuestIds.includes('q-4')) {
      newlyCompleted.push('q-4');
    }

    if (newlyCompleted.length > 0) {
      setCompletedQuestIds(prev => {
        const next = [...prev, ...newlyCompleted];
        
        let additionalBonus = 0;
        newlyCompleted.forEach(qId => {
          const quest = quests.find(q => q.id === qId);
          if (quest) {
            additionalBonus += quest.reward;
            appendLog(`🏆 QUEST COMPLETED! Completed "${quest.name}"! Bonus of +£${quest.reward.toFixed(2)} added to active balance.`, 'success');
            playSoundEffect('complete');
          }
        });

        if (additionalBonus > 0) {
          setStats(s => ({
            ...s,
            todayEarnings: s.todayEarnings + additionalBonus,
            weeklyEarnings: s.weeklyEarnings + additionalBonus,
            balance: s.balance + additionalBonus,
          }));
        }

        return next;
      });
    }
  }, [stats.completedTripsCount, completedComfortCount, completedAirportCount, completedQuestIds, quests, mode, appendLog, playSoundEffect, setStats]);

  // Real Internet online/offline event subscriptions
  useEffect(() => {
    const onOnline = () => {
      setNetworkOnline(true);
      appendLog('🌐 Internet restored: Connected securely to cloud systems.', 'success');
    };
    const onOffline = () => {
      setNetworkOnline(false);
      appendLog('🔌 Internet lost: Switched seamlessly to standalone local storage cache.', 'warn');
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [appendLog]);

  // Locally persist compliance details
  useEffect(() => {
    localStorage.setItem('swift_face_verified', String(faceVerified));
    localStorage.setItem('swift_face_selfie_url', faceSelfieUrl);
  }, [faceVerified, faceSelfieUrl]);

  useEffect(() => {
    localStorage.setItem('swift_insurance_verified', String(insuranceVerified));
    localStorage.setItem('swift_insurance_policy', insurancePolicyNo);
    localStorage.setItem('swift_insurance_expiry', insuranceExpiry);
  }, [insuranceVerified, insurancePolicyNo, insuranceExpiry]);

  useEffect(() => {
    localStorage.setItem('swift_offline_simulation', String(offlineSimulation));
  }, [offlineSimulation]);

  useEffect(() => {
    localStorage.setItem('swift_use_real_gps', String(useRealGPS));
  }, [useRealGPS]);

  useEffect(() => {
    localStorage.setItem('swift_dark_mode', String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('swift_simulate_wandering', String(simulateWandering));
  }, [simulateWandering]);

  useEffect(() => {
    localStorage.setItem('swift_notifications_enabled', String(notificationsEnabled));
    if (notificationsEnabled && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, [notificationsEnabled]);

  useEffect(() => {
    localStorage.setItem('swift_background_mode_enabled', String(backgroundModeEnabled));
  }, [backgroundModeEnabled]);

  // GPS Location Tracker hook with Nominatim Reverse-Geocoding
  useEffect(() => {
    if (!useRealGPS) {
      setRealCoords(null);
      setGeoTrackingState('idle');
      return;
    }

    setGeoTrackingState('tracking');
    appendLog('📡 Initialising real GPS tracking...', 'info');

    const handlePosSuccess = (pos: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = pos.coords;
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14`;
      
      fetch(url)
        .then(r => r.json())
        .then(data => {
          const addressParts = data.address;
          const detectedCity = addressParts.city || addressParts.town || addressParts.village || addressParts.suburb || addressParts.county || addressParts.state || 'London';
          setCurrentCity(detectedCity);
          
          const displayAddress = [
            addressParts.road || addressParts.suburb || '',
            detectedCity
          ].filter(Boolean).join(', ') || `Lat:${latitude.toFixed(4)}, Lon:${longitude.toFixed(4)}`;
          
          setRealCoords({
            lat: latitude,
            lon: longitude,
            accuracy: Math.round(accuracy),
            address: displayAddress
          });
          appendLog(`📍 Location verified: ${displayAddress}. Job dispatches matched to ${detectedCity}!`, 'success');
        })
        .catch(() => {
          setRealCoords({
            lat: latitude,
            lon: longitude,
            accuracy: Math.round(accuracy),
            address: `GPS: ${latitude.toFixed(4)}N, ${longitude.toFixed(4)}W`
          });
        });
    };

    const handlePosError = (err: GeolocationPositionError) => {
      console.warn("Geolocation watch failed:", err);
      setGeoTrackingState('denied');
      appendLog('⚠️ GPS Tracking unavailable/denied in iframe permission scope.', 'warn');
    };

    const watchId = navigator.geolocation.watchPosition(handlePosSuccess, handlePosError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000
    });

    return () => navigator.geolocation.clearWatch(watchId);
  }, [useRealGPS, appendLog]);

  // Auth subscriber on login/logout state changes
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      setAuthLoading(false);
    }, 1500);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      clearTimeout(fallbackTimer);
      setUser(firebaseUser);
      setAuthLoading(false);
      
      if (firebaseUser) {
        appendLog(`👤 Active Cloud Account: ${firebaseUser.displayName || firebaseUser.email}`, 'success');
        playSoundEffect('complete');

        try {
          const ref = doc(db, 'drivers', firebaseUser.uid);
          const docSnap = await getDoc(ref);

          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.taxiStats) setTaxiStats(data.taxiStats);
            if (data.foodStats) setFoodStats(data.foodStats);
            if (data.insuranceVerified !== undefined) setInsuranceVerified(data.insuranceVerified);
            if (data.insurancePolicyNo) setInsurancePolicyNo(data.insurancePolicyNo);
            if (data.insuranceExpiry) setInsuranceExpiry(data.insuranceExpiry);
            if (data.faceVerified !== undefined) setFaceVerified(data.faceVerified);
            if (data.faceSelfieSnapshot) setFaceSelfieUrl(data.faceSelfieSnapshot);
            if (data.otpVerified !== undefined) {
              setOtpVerified(data.otpVerified);
              localStorage.setItem('swift_otp_verified', String(data.otpVerified));
            }
            if (firebaseUser.email) {
              setOtpEmail(firebaseUser.email);
            }
            appendLog('💾 Profile settings synchronized perfectly from Firestore.', 'success');
          } else {
            const freshProfile = {
              userId: firebaseUser.uid,
              taxiStats: INITIAL_TAXI_STATS,
              foodStats: INITIAL_FOOD_STATS,
              insuranceVerified: true,
              insurancePolicyNo: 'UK-ZEGO-SWIFT-9482903',
              insuranceExpiry: '2026-08-24',
              faceVerified: true,
              faceSelfieSnapshot: '',
              otpVerified: false,
              updatedAt: new Date().toISOString()
            };
            if (firebaseUser.email) {
              setOtpEmail(firebaseUser.email);
            }
            await setDoc(ref, freshProfile);
            appendLog('📌 Created new verified profile in Cloud Firestore.', 'success');
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `drivers/${firebaseUser.uid}`);
        }
      } else {
        appendLog('👤 Standalone local workspace loaded.', 'info');
      }
    });

    return () => unsubscribe();
  }, [appendLog]);

  // FCM Token Synchronization Effect
  useEffect(() => {
    if (user && notificationsEnabled && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        const mockFcmToken = localStorage.getItem('swift_fcm_token') || `fcm_token_swift_${Math.random().toString(36).substring(2, 12)}_${user.uid.substring(0, 5)}`;
        localStorage.setItem('swift_fcm_token', mockFcmToken);
        
        const syncFcmToken = async () => {
          try {
            const ref = doc(db, 'drivers', user.uid);
            await updateDoc(ref, { 
              fcmToken: mockFcmToken,
              updatedAt: new Date().toISOString()
            });
            appendLog(`📲 Background Push Token (FCM) synchronised with drivers/${user.uid.substring(0, 5)}...`, "success");
          } catch (err) {
            console.warn("FCM Profile sync skipped or delayed:", err);
          }
        };
        syncFcmToken();
      }
    }
  }, [user, notificationsEnabled, appendLog]);

  // Auto push statistics updates to Firestore
  useEffect(() => {
    if (!user || !isInternetConnected) return;

    const timer = setTimeout(async () => {
      try {
        const ref = doc(db, 'drivers', user.uid);
        await updateDoc(ref, {
          taxiStats,
          foodStats,
          insuranceVerified,
          insurancePolicyNo,
          insuranceExpiry,
          faceVerified,
          faceSelfieSnapshot: faceSelfieUrl,
          updatedAt: new Date().toISOString()
        });
      } catch (e) {
        console.warn("Firestore autosync paused:", e);
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [user, isInternetConnected, taxiStats, foodStats, insuranceVerified, insurancePolicyNo, insuranceExpiry, faceVerified, faceSelfieUrl]);



  // Interactive Foods "Swift Eats" Mode Boot Up Sequence Effect
  useEffect(() => {
    if (mode === 'food' && eatsBootupProgress === -1) {
      setEatsBootupProgress(0);
    } else if (mode === 'taxi') {
      setEatsBootupProgress(-1);
    }
  }, [mode]);

  useEffect(() => {
    if (mode === 'food' && eatsBootupProgress === 0) {
      playSoundEffect('offer');
      let currentStep = 0;
      const interval = setInterval(() => {
        currentStep++;
        if (currentStep < 5) {
          setEatsBootupProgress(currentStep);
          playSoundEffect('tap');
        } else {
          clearInterval(interval);
          setEatsBootupProgress(100); // 100 is fully loaded!
          playSoundEffect('complete');
          appendLog("🟢 Swift Eats system online. Multi-delivery dispatch routing loaded: CAPACITY 3 CONCURRENT JOBS.", "success");
        }
      }, 650);

      return () => clearInterval(interval);
    }
  }, [mode, eatsBootupProgress, playSoundEffect, appendLog]);


  // Daily random biometric face verification compliance check
  useEffect(() => {
    if (!isOnline) {
      setRandomAuditActive(false);
      return;
    }

    // Trigger a random security compliance audit at random intervals between 45 seconds and 3 minutes
    const getRandomInterval = () => Math.floor(Math.random() * (120000 - 45000) + 45000);

    let auditTimeout: NodeJS.Timeout;

    const triggerAudit = () => {
      // Trigger only if idle and no other modal is currently active
      if (tripProgress.stage === 'idle' && !showFaceScanner && !randomAuditActive) {
        setRandomAuditActive(true);
        setRandomAuditTimer(60); // 60s to scan face selfie
        playSoundEffect('warn');
        appendLog("⚠️ SECURITY AUDIT REQUIRED: Please verify your biometric signature within 60s.", "warn");
      }
      auditTimeout = setTimeout(triggerAudit, getRandomInterval());
    };

    auditTimeout = setTimeout(triggerAudit, getRandomInterval());

    return () => {
      clearTimeout(auditTimeout);
    };
  }, [isOnline, tripProgress.stage, showFaceScanner, randomAuditActive, playSoundEffect, appendLog]);

  // Handle countdown for active random biometric safety audit
  useEffect(() => {
    if (!randomAuditActive) return;

    const interval = setInterval(() => {
      setRandomAuditTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setRandomAuditActive(false);
          setIsOnline(false); // Suspend operator connection!
          setFaceVerified(false); // require re-verification
          appendLog("🚨 CRITICAL COMPLIANCE FAILURE: Random security audit timed out. Connection suspended.", "error");
          playSoundEffect('warn');
          alert("🚨 Swift Safety Dispatch: You failed to complete the random face verification audit within 60 seconds. Your connection has been suspended and set OFFLINE for safety.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [randomAuditActive, appendLog, playSoundEffect, setIsOnline]);


  // Switch Online/Offline availability
  const handleSetOnline = (online: boolean) => {
    playSoundEffect('tap');
    if (online) {
      if (!otpVerified) {
        playSoundEffect('warn');
        alert("🔒 Swift Security Compliance: Security Daily OTP Pass Code verification is required before you can toggle ONLINE.\n\nPlease complete daily email verification in your Profile tab first.");
        setActiveTab('profile');
        return;
      }
      if (!faceVerified) {
        playSoundEffect('warn');
        alert("🔒 Swift Security Compliance: Biometric Face Verification selfie check is required before you can toggle ONLINE.\n\nLoading biometric camera viewport...");
        setActiveTab('profile');
        setShowFaceScanner(true);
        return;
      }
      if (!insuranceVerified) {
        playSoundEffect('warn');
        alert("⚠️ Swift Transport Registry: Certified Hire & Reward (H&R) commercial carriage insurance cover must be activated to process fares.");
        setActiveTab('profile');
        return;
      }
      setIsOnline(true);
      setIsOnBreak(false);
      appendLog(`Driver status changed to • Online in ${mode.toUpperCase()} dispatcher.`, 'success');
    } else {
      setIsOnline(false);
      setIsOnBreak(false);
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

  const handleGoogleSignIn = async () => {
    playSoundEffect('tap');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      playSoundEffect('warn');
      console.error("Google Auth Error:", e);
      alert("Google popup auth block: Please ensure that popups are allowed for this preview widget, or open the app in a new tab to bypass iframe security controls.");
    }
  };

  const handleGoogleSignOut = async () => {
    playSoundEffect('tap');
    if (window.confirm("Are you sure you want to log out of your synchronized Swift profile?")) {
      try {
        await signOut(auth);
      } catch (e) {
        console.error("Signout fail:", e);
      }
    }
  };

  // Spawner action from the console
  const handleSpawnMockRide = useCallback((type: 'short' | 'long' | 'airport' | 'high-tip' | 'random') => {
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

    // Determine target type from 'random'
    let actualType: 'short' | 'long' | 'airport' | 'high-tip' = type as any;
    if (type === 'random') {
      const types: ('short' | 'long' | 'airport' | 'high-tip')[] = ['short', 'long', 'airport', 'high-tip'];
      actualType = types[Math.floor(Math.random() * types.length)];
    }

    let preset = mode === 'taxi' ? TAXI_MOCK_RIDES[0] : FOOD_MOCK_RIDES[0];
    if (mode === 'taxi') {
      if (actualType === 'long') preset = TAXI_MOCK_RIDES[1];
      else if (actualType === 'airport') preset = TAXI_MOCK_RIDES[2];
      else if (actualType === 'high-tip') {
        preset = {
          ...TAXI_MOCK_RIDES[0],
          passengerName: 'Sir William',
          fare: 35.50,
          distance: 11.2,
          estimatedMinutes: 20
        };
      }
    } else {
      if (actualType === 'long') preset = FOOD_MOCK_RIDES[1];
      else if (actualType === 'airport' || actualType === 'high-tip') {
        preset = {
          ...FOOD_MOCK_RIDES[0],
          passengerName: 'Lady Beatrice',
          fare: 19.80,
          distance: 1.2,
          estimatedMinutes: 5,
          foodItem: '4 x Premium Fish & Chips with Mushy Peas (Royal Catch)'
        };
      }

      // Automatically customize foodItem based on the active simulated peak schedule
      let customFood = preset.foodItem || 'Tandoori Mixed Grill';
      if (selectedPeak === 'breakfast') {
        const breakfastItems = [
          '🍳 Traditional Full English Breakfast with Buttered Toast & PG Tips Tea',
          '🥞 Smoked Bacon Stacked Pancakes & Organic Maple Syrup',
          '🥐 3x Warm Butter Croissants, Raspberry Conserve & Caffe Latte',
          '🥑 Smashed Avocado on Organic Sourdough with Poached Eggs & Green Tea'
        ];
        customFood = breakfastItems[Math.floor(Math.random() * breakfastItems.length)];
      } else if (selectedPeak === 'lunch') {
        const lunchItems = [
          '🥪 Meal Deal: Chicken & Bacon Club Sandwich + Salt & Vinegar Crisps + Coca-Cola',
          '🌯 Spicy Pulled Pork Burrito with Tortilla Chips, Lime & Guacamole',
          '🥗 Classic Caesar Salad with Grilled Chicken Breast & Warm Focaccia',
          '🍱 Chicken Katsu Curry Bento Box with Sticky Jasmine Rice & Edamame'
        ];
        customFood = lunchItems[Math.floor(Math.random() * lunchItems.length)];
      } else if (selectedPeak === 'dinner') {
        const dinnerItems = [
          '🍣 Premium Sunset Sushi & Sashimi Chef Platter (16 pieces + Wasabi)',
          '🥩 28-Day Aged Ribeye Steak, Rosemary Truffle Fries & Bearnaise Sauce',
          '🍔 The Big Truffle Beast Bacon Cheeseburger with Triple Cooked Chips',
          '🍝 Handmade Carbonara Tagliatelle with Parmesan & Freshly Ground Pepper'
        ];
        customFood = dinnerItems[Math.floor(Math.random() * dinnerItems.length)];
      } else {
        const snackItems = [
          '🍩 Box of 4 Glazed Krispy Kreme Donuts & Warm Salted Caramel Latte',
          '🥤 Triple Chocolate Milkshake, Warm Fudge Brownies & Cream',
          '🍕 Late-night Double Pepperoni Pizza with Spicy Garlic & Herb Dip'
        ];
        customFood = snackItems[Math.floor(Math.random() * snackItems.length)];
      }

      preset = {
        ...preset,
        foodItem: customFood
      };
    }

    // Dynamic passenger and courier names (UK theme)
    const MOCK_UK_NAMES = [
      'Arthur Pendelton', 'Clara Vance', 'Alistair Sterling', 'Penelope Thorne', 
      'Winston Briggs', 'Eleanor Finch', 'Gareth Croft', 'Fiona Gallagher', 
      'Nigel Rutherford', 'Imogen Sinclair', 'Barnaby Vance', 'Harriet Lowe',
      'Jasper Montgomery', 'Chloe Cartwright', 'Rupert Kingsley', 'Beatrix Potter',
      'Daphne Bridgewater', 'Felix Sterling', 'Oliver Twist', 'Alastair Cook',
      'Jameson Bond', 'Sienna Westwood'
    ];
    let passengerName = MOCK_UK_NAMES[Math.floor(Math.random() * MOCK_UK_NAMES.length)];
    if (actualType === 'high-tip') {
      passengerName = mode === 'taxi' ? 'Sir William' : 'Lady Beatrice';
    }

    const localData = getCityAddresses(currentCity);
    const pIndex = Math.floor(Math.random() * (mode === 'taxi' ? localData.taxi.pickup.length : localData.food.restaurants.length));
    const dIndex = Math.floor(Math.random() * (mode === 'taxi' ? localData.taxi.dropoff.length : localData.food.residences.length));

    const pickupAddress = mode === 'taxi' ? localData.taxi.pickup[pIndex] : localData.food.restaurants[pIndex];
    let dropoffAddress = mode === 'taxi' ? localData.taxi.dropoff[dIndex] : localData.food.residences[dIndex];

    const pickupCoordinate = {
      x: 60 + Math.floor(Math.random() * 280),
      y: 120 + Math.floor(Math.random() * 360),
    };
    const dropoffCoordinate = {
      x: 60 + Math.floor(Math.random() * 280),
      y: 120 + Math.floor(Math.random() * 360),
    };

    // Apply destination filtering for taxi simulation
    if (mode === 'taxi' && destinationActivated && destinationFilter.trim()) {
      const landmarks = [
        `${destinationFilter} Central Station`,
        `The Grand ${destinationFilter} Hotel`,
        `${destinationFilter} Business Park`,
        `${destinationFilter} High Street East`,
        `${destinationFilter} Parklands Gate`
      ];
      dropoffAddress = landmarks[Math.floor(Math.random() * landmarks.length)];
    }

    // Determine Bolt Ride Category & Multiplier
    let rideCategory = 'Standard';
    let categoryMultiplier = 1.0;
    if (mode === 'taxi') {
      const activeCats = boltCategories && boltCategories.length > 0 ? boltCategories : ['comfort'];
      const chosenCat = activeCats[Math.floor(Math.random() * activeCats.length)].toLowerCase();
      
      if (chosenCat === 'lite') {
        rideCategory = 'Bolt Lite';
        categoryMultiplier = 0.88;
      } else if (chosenCat === 'comfort') {
        rideCategory = 'Bolt Comfort';
        categoryMultiplier = 1.25;
      } else if (chosenCat === 'xl') {
        rideCategory = 'Bolt XL';
        categoryMultiplier = 1.55;
      } else if (chosenCat === 'green') {
        rideCategory = 'Bolt Green';
        categoryMultiplier = 1.05;
      } else {
        rideCategory = 'Bolt Standard';
        categoryMultiplier = 1.0;
      }
    }

    // Apply random pricing and distance variations to avoid repetitive amounts
    const priceVariance = 0.82 + Math.random() * 0.36; // Range: ~82% to ~118%
    const distVariance = headHomeMode ? 0.40 + Math.random() * 0.30 : 0.80 + Math.random() * 0.40;  // shorter if heading home

    let finalDistance = +(preset.distance * distVariance).toFixed(1);
    if (finalDistance < 0.4) finalDistance = 0.4;

    let finalFare = +(preset.fare * priceVariance * categoryMultiplier).toFixed(2);
    const minFare = mode === 'food' ? 4.50 : 8.50;
    if (finalFare < minFare) {
      finalFare = +(minFare + Math.random() * 2.50).toFixed(2);
    }

    let finalMinutes = Math.ceil(finalDistance * (mode === 'food' ? 3.5 : 2.0) + 2 + Math.floor(Math.random() * 3));

    const multiplier = surgeLevel === 'high' ? 2.2 : surgeLevel === 'medium' ? 1.4 : 1.0;

    let finalDropoffAddress = dropoffAddress;
    let finalDropoffCoordinate = dropoffCoordinate;
    if (headHomeMode) {
      const shortAddress = homeAddress.split(',')[0];
      finalDropoffAddress = `${shortAddress} (Head Home Direction 🏠)`;
      // Home coordinates center
      finalDropoffCoordinate = { x: 140, y: 320 };
    }

    const revenuePerKm = (finalFare * multiplier) / finalDistance;
    const computedQuality: 'Excellent' | 'Good' | 'Fair' = revenuePerKm >= 3.0 ? 'Excellent' : revenuePerKm >= 1.8 ? 'Good' : 'Fair';

    const finalRide: RideRequest = {
      ...preset,
      passengerName,
      passengerRating: +(4.6 + Math.random() * 0.4).toFixed(2),
      pickupAddress,
      dropoffAddress: finalDropoffAddress,
      pickupCoordinate,
      dropoffCoordinate: finalDropoffCoordinate,
      fare: finalFare,
      distance: finalDistance,
      estimatedMinutes: finalMinutes,
      id: `ride-${Date.now()}`,
      surgeMultiplier: multiplier,
      tipAmount: actualType === 'high-tip' ? +(5.00 + Math.random() * 8.00).toFixed(2) : Math.random() > 0.6 ? +(1.50 + Math.random() * 3.50).toFixed(2) : 0,
      category: mode === 'taxi' ? rideCategory : undefined,
      qualityScore: computedQuality,
    };

    if (headHomeMode) {
      appendLog(`🏠 [Head Home Mode Active] Filtered and adjusted ride heading toward saved Home: ${homeAddress}`, 'success');
    }

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
    appendLog(`🚨 Offer Broadcast: Incoming match "${finalRide.passengerName}" (${mode === 'food' ? 'Food delivery order' : 'Taxi trip'}) - £${(finalRide.fare * multiplier).toFixed(2)}`, 'info');
    
    sendRealNotification(
      mode === 'food' ? "🍕 New Swift Eats Order!" : "🚕 New Swift Ride Match!",
      `Match: ${finalRide.passengerName} (★${finalRide.passengerRating}) • Distance: ${finalRide.distance}km • Est Fare: £${(finalRide.fare * multiplier).toFixed(2)}`
    );
  }, [isOnline, isOnBreak, tripProgress.stage, surgeLevel, mode, appendLog, soundEnabled, playSoundEffect, currentCity]);

  // Trigger a pre-booked ride from scheduled reservations drawer
  const handleSpawnPrebookedRide = useCallback((booking: any) => {
    if (!isOnline) {
      playSoundEffect('warn');
      appendLog('Position warning: Change status to • Online to receive pre-booked orders.', 'warn');
      sendRealNotification("📅 Dispatch Failed", "Turn on Online status to active scheduled trips.");
      return;
    }
    if (isOnBreak) {
      playSoundEffect('warn');
      appendLog('Position warning: Cannot activate scheduled pre-bookings during a coffee break.', 'warn');
      return;
    }
    if (tripProgress.stage !== 'idle') {
      playSoundEffect('warn');
      appendLog('Dispatch collision: Finish your ongoing ride before accepting schedules.', 'warn');
      return;
    }

    const routeStr = booking.route || 'London Central ➔ West London';
    const splitRoute = routeStr.split(' ➔ ');
    const pickupAddress = splitRoute[0] || 'London Central';
    const dropoffAddress = splitRoute[1] || 'West London';

    const pickupCoordinate = {
      x: 80 + Math.floor(Math.random() * 220),
      y: 140 + Math.floor(Math.random() * 320),
    };
    const dropoffCoordinate = {
      x: 80 + Math.floor(Math.random() * 220),
      y: 140 + Math.floor(Math.random() * 320),
    };

    const multiplier = surgeLevel === 'high' ? 2.2 : surgeLevel === 'medium' ? 1.4 : 1.0;
    const finalFare = booking.fare;
    
    const prebookedRide: RideRequest = {
      id: `prebooked-${Date.now()}`,
      passengerName: booking.passengerName,
      passengerRating: 4.95,
      pickupAddress,
      dropoffAddress,
      fare: finalFare,
      distance: 5.4,
      surgeMultiplier: multiplier,
      pickupCoordinate,
      dropoffCoordinate,
      tipAmount: +(3.00 + Math.random() * 5.00).toFixed(2),
      estimatedMinutes: 10,
      category: booking.category || 'Swift Premier',
    };

    setTripProgress({
      stage: 'offering',
      currentRide: prebookedRide,
      offerTimeRemaining: 18, 
      totalOfferTime: 18,
      navigationProgress: 0,
      etaMinutes: 2,
    });
    setChatMessages([]);
    playSoundEffect('offer');
    appendLog(`📅 Scheduled Booking Dispatched: "${prebookedRide.passengerName}" is waiting! Est payout is £${(prebookedRide.fare * multiplier).toFixed(2)}`, 'success');
    
    sendRealNotification(
      "📅 Scheduled Ride Dispatch!",
      `Reserved Fare from ${prebookedRide.passengerName} is ready starting now! Payout: £${(prebookedRide.fare * multiplier).toFixed(2)}`
    );
  }, [isOnline, isOnBreak, tripProgress.stage, surgeLevel, playSoundEffect, appendLog, sendRealNotification]);

  // Click on Surge Hotspot in map
  const handleSpawnRideFromZone = (multiplier: number, areaName: string, coords: { x: number; y: number }) => {
    if (!isOnline || tripProgress.stage !== 'idle') return;
    playSoundEffect('tap');

    const template = mode === 'taxi' ? TAXI_MOCK_RIDES[0] : FOOD_MOCK_RIDES[0];
    const dropoffCo = { x: (coords.x + 130) % 350 + 20, y: (coords.y + 160) % 450 + 20 };

    // Choose random name for zone spawned ride
    const MOCK_UK_NAMES = [
      'Arthur Pendelton', 'Clara Vance', 'Alistair Sterling', 'Penelope Thorne', 
      'Winston Briggs', 'Eleanor Finch', 'Gareth Croft', 'Fiona Gallagher', 
      'Nigel Rutherford', 'Imogen Sinclair', 'Barnaby Vance', 'Harriet Lowe',
      'Jasper Montgomery', 'Chloe Cartwright', 'Rupert Kingsley', 'Beatrix Potter'
    ];
    const passengerName = MOCK_UK_NAMES[Math.floor(Math.random() * MOCK_UK_NAMES.length)];

    // Pricing and distance variation
    const fareMultiplier = 0.85 + Math.random() * 0.35;
    const distanceMultiplier = headHomeMode ? 0.40 + Math.random() * 0.30 : 0.80 + Math.random() * 0.40;

    let finalDistance = +(template.distance * distanceMultiplier * 1.2).toFixed(1);
    if (finalDistance < 0.4) finalDistance = 0.4;

    let finalFare = +(template.fare * fareMultiplier).toFixed(2);
    const minFare = mode === 'food' ? 4.50 : 8.50;
    if (finalFare < minFare) {
      finalFare = +(minFare + Math.random() * 1.50).toFixed(2);
    }

    const localData = getCityAddresses(currentCity);
    let dropoffAddress = mode === 'taxi' 
      ? localData.taxi.dropoff[Math.floor(Math.random() * localData.taxi.dropoff.length)]
      : localData.food.residences[Math.floor(Math.random() * localData.food.residences.length)];

    let finalDropoffCo = dropoffCo;
    if (headHomeMode) {
      const shortAddress = homeAddress.split(',')[0];
      dropoffAddress = `${shortAddress} (Head Home Direction 🏠)`;
      finalDropoffCo = { x: 140, y: 320 };
    }

    const revenuePerKm = (finalFare * multiplier) / finalDistance;
    const computedQuality: 'Excellent' | 'Good' | 'Fair' = revenuePerKm >= 3.0 ? 'Excellent' : revenuePerKm >= 1.8 ? 'Good' : 'Fair';

    const generated: RideRequest = {
      id: `hot-ride-${Date.now()}`,
      passengerName,
      passengerRating: +(4.6 + Math.random() * 0.4).toFixed(2),
      pickupAddress: `${areaName} Core`,
      dropoffAddress,
      fare: finalFare,
      distance: finalDistance,
      surgeMultiplier: multiplier,
      pickupCoordinate: coords,
      dropoffCoordinate: finalDropoffCo,
      tipAmount: Math.random() > 0.5 ? 2.50 : 0,
      estimatedMinutes: Math.ceil(finalDistance * (mode === 'food' ? 3.5 : 2.0) + 2),
      qualityScore: computedQuality,
    };

    if (headHomeMode) {
      appendLog(`🏠 [Head Home Mode Active] Dynamic Surge hotspot ride routed close to saved Home: ${homeAddress}`, 'success');
    }

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
    appendLog(`📍 Surge Pickup spawned from ${areaName}. Multiplier: ${multiplier}x applied. Total: £${(finalFare * multiplier).toFixed(2)}`, 'info');
    
    sendRealNotification(
      mode === 'food' ? "🍕 Hot Demand order!" : "🚕 Hot Zone Surge Match!",
      `Match from ${areaName} (★${generated.passengerRating}) • Distance: ${generated.distance}km • Est Fare: £${(finalFare * multiplier).toFixed(2)}`
    );
  };

  // Web Worker hook to keep state ticks running at full speed in the background (even when tab is hidden or phone is locked!)
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Worker' in window)) return;

    if (isOnline && !isOnBreak && backgroundModeEnabled) {
      const workerSource = `
        let timer = null;
        self.onmessage = function(e) {
          if (e.data === 'start') {
            if (timer) clearInterval(timer);
            timer = setInterval(() => {
              self.postMessage('tick');
            }, 1000);
          } else if (e.data === 'stop') {
            if (timer) clearInterval(timer);
            timer = null;
          }
        };
      `;
      const blob = new Blob([workerSource], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      const worker = new Worker(workerUrl);

      worker.onmessage = (e) => {
        if (e.data === 'tick') {
          setWorkerTickCount(c => c + 1);
        }
      };
      
      worker.postMessage('start');
      workerRef.current = worker;
      appendLog('⚙️ Background simulation Worker thread active.', 'success');
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.postMessage('stop');
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [isOnline, isOnBreak, backgroundModeEnabled, appendLog]);

  // Fallback ticker if Worker is disabled or unsupported by browser
  useEffect(() => {
    let fallbackInterval: NodeJS.Timeout | null = null;
    
    if (isOnline && !isOnBreak) {
      const usesWorker = backgroundModeEnabled && typeof window !== 'undefined' && 'Worker' in window;
      if (!usesWorker) {
        fallbackInterval = setInterval(() => {
          setWorkerTickCount(c => c + 1);
        }, 1000);
      }
    }

    return () => {
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, [isOnline, isOnBreak, backgroundModeEnabled]);

  // Unified simulation clock synced with the Worker background ticker (runs perfectly even when tab is hidden)
  useEffect(() => {
    if (workerTickCount === 0) return;

    // 1. Ambient Match Offers (Every 4 ticks)
    if (workerTickCount % 4 === 0) {
      if (tripProgressRef.current.stage === 'idle') {
        if (Math.random() < 0.12) {
          handleSpawnMockRide('random');
        }
      }
      if (Math.random() < 0.05) {
        setBatteryLevel(p => Math.max(5, p - 1));
      }
    }

    // 2. Dynamic Surge Pricing shifts (Every 16 ticks)
    if (workerTickCount % 16 === 0) {
      if (Math.random() < 0.18) {
        const levels: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high'];
        const nextLevel = levels[Math.floor(Math.random() * levels.length)];
        setSurgeLevel((prev) => {
          if (prev !== nextLevel) {
            const mult = nextLevel === 'high' ? 2.2 : nextLevel === 'medium' ? 1.4 : 1.0;
            appendLog(`⚡ Dynamic Demand Shift: London Soho / Mayfair surge adjusted to ${mult}x.`, nextLevel === 'high' ? 'warn' : 'info');
            playSoundEffect('tap');
            return nextLevel;
          }
          return prev;
        });
      }
    }

    // 3. Match offering beep chime
    if (tripProgressRef.current.stage === 'offering' && tripProgressRef.current.offerTimeRemaining > 0) {
      if (tripProgressRef.current.offerTimeRemaining % 3 === 0) {
        playSoundEffect('offer');
      }
    }

    // 4. Current active stage updates
    const { stage, offerTimeRemaining } = tripProgressRef.current;
    
    if (stage === 'offering') {
      if (offerTimeRemaining <= 1) {
        setStreakCount(0); // reset streak when offer expires
      }
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

    if (stage === 'to_pickup' || stage === 'to_destination') {
      setTripProgress((prev) => {
        // since timer is now 1000ms instead of 500ms, double the speed increment
        const increment = 3.2 * simSpeed;
        const nextVal = prev.navigationProgress + increment;

        if (nextVal >= 100) {
          if (prev.stage === 'to_pickup') {
            playSoundEffect('complete');
            appendLog(`📍 Arrived at pickup. Notifying client: "${prev.currentRide?.passengerName}"`, 'success');
            sendRealNotification(
              mode === 'food' ? "🍕 Restaurant Reached!" : "🚕 Arrived at Passenger!",
              `Waiting for start clearance. Slide to initiate transit.`
            );
            return {
              ...prev,
              stage: 'arrived_pickup',
              navigationProgress: 100,
              etaMinutes: 0,
            };
          } else {
            playSoundEffect('complete');
            appendLog(`🏁 Destination reached! Safety lock released. Slide to close order.`, 'success');
            sendRealNotification(
              mode === 'food' ? "🍕 Delivery Complete!" : "🚕 Passenger Dropped Off!",
              `Trip successfully finalised. Swipe to complete transaction.`
            );
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

    // Ticking active food delivery jobs concurrently
    if (mode === 'food') {
      setActiveEatsJobs((prevJobs) => {
        if (!prevJobs || prevJobs.length === 0) return prevJobs;
        return prevJobs.map((job) => {
          if (job.stage === 'to_pickup' || job.stage === 'to_destination') {
            const increment = 3.2 * simSpeed;
            const nextVal = (job.navigationProgress || 0) + increment;

            if (nextVal >= 100) {
              playSoundEffect('complete');
              if (job.stage === 'to_pickup') {
                appendLog(`📍 Arrived at restaurant: "${job.passengerName}". Ready to collect order.`, 'success');
                sendRealNotification("🍕 Restaurant Reached!", `Awaiting pickup confirmation for ${job.passengerName}.`);
                return {
                  ...job,
                  stage: 'arrived_pickup',
                  navigationProgress: 100,
                  etaMinutes: 0,
                };
              } else {
                appendLog(`🏁 Delivery spot reached for customer: "${job.passengerName}". Ready to drop off!`, 'success');
                sendRealNotification("🍕 Delivery Spot Reached!", `Swipe to complete delivery to ${job.passengerName}.`);
                return {
                  ...job,
                  stage: 'arrived_destination',
                  navigationProgress: 100,
                  etaMinutes: 0,
                };
              }
            }

            const pct = nextVal / 100;
            const fullMinutes = job.estimatedMinutes || 10;
            const remaining = Math.max(1, Math.ceil(fullMinutes * (1 - pct)));

            return {
              ...job,
              navigationProgress: nextVal,
              etaMinutes: remaining,
            };
          }
          return job;
        });
      });
    }

  }, [workerTickCount, appendLog, playSoundEffect, mode, autoAccept, simSpeed, sendRealNotification]);

  const handleAcceptRide = () => {
    if (!tripProgress.currentRide) return;
    playSoundEffect('tap');

    if (mode === 'food') {
      if (activeEatsJobs.length >= 3) {
        alert("Eats safety protocols limit: You can only accept a maximum of 3 active jobs concurrently.");
        return;
      }

      setStats((s) => ({
        ...s,
        acceptanceRate: Math.min(100, s.acceptanceRate + 1),
      }));

      const newJob = {
        ...tripProgress.currentRide,
        id: tripProgress.currentRide.id || 'order-' + Date.now(),
        stage: 'to_pickup',
        navigationProgress: 0,
        etaMinutes: tripProgress.currentRide.estimatedMinutes || 10,
      };

      setActiveEatsJobs(p => {
        const index = p.findIndex(j => j.id === newJob.id);
        if (index !== -1) return p;
        return [...p, newJob];
      });
      setActiveEatsJobId(newJob.id);

      appendLog(`✅ Accepted Swift Eats Order from restaurant: ${newJob.passengerName}. Navigating...`, 'success');

      // Clear the single offer area so user can match additional concurrent deliveries while driving!
      setTripProgress({
        stage: 'idle',
        currentRide: null,
        offerTimeRemaining: 0,
        totalOfferTime: 12,
        navigationProgress: 0,
        etaMinutes: 0,
      });
      setActiveTab('home');
      return;
    }

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
    setStreakCount(0); // reset streak on decline
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

  // Transit confirmation triggers for Food mode multi-jobs
  const handleConfirmFoodPickup = (jobId: string) => {
    playSoundEffect('tap');
    setActiveEatsJobs(p => p.map(job => {
      if (job.id === jobId) {
        appendLog(`🍕 Picked up food order: "${job.passengerName}". Heading to customer delivery address.`, 'success');
        return {
          ...job,
          stage: 'to_destination',
          navigationProgress: 0,
          etaMinutes: job.estimatedMinutes || 10
        };
      }
      return job;
    }));
  };

  const handleCompleteFoodDelivery = (jobId: string) => {
    playSoundEffect('complete');
    
    setActiveEatsJobs(p => {
      const job = p.find(j => j.id === jobId);
      if (!job) return p;

      // Update statistics and award driver points
      const earnedPoints = 15;
      setStats((s) => ({
        ...s,
        completedTripsCount: s.completedTripsCount + 1,
        todayEarnings: s.todayEarnings + job.fare,
        weeklyEarnings: s.weeklyEarnings + job.fare,
        balance: s.balance + job.fare,
      }));
      setDriverPoints(pts => pts + earnedPoints);

      // Increment miles and active driving time
      const dist = job.distance || 1.8;
      const mins = job.estimatedMinutes || 6;
      setMilesDriven(prev => +(prev + dist).toFixed(1));
      setActiveDrivingTime(prev => +(prev + mins / 60).toFixed(2));

      // Streak tracking & bonuses
      setStreakCount(prev => {
        const nextStreak = prev + 1;
        if (nextStreak === 3) {
          const bonusAmt = 10.00;
          setStats((s) => ({
            ...s,
            todayEarnings: s.todayEarnings + bonusAmt,
            weeklyEarnings: s.weeklyEarnings + bonusAmt,
            balance: s.balance + bonusAmt,
          }));
          setDriverPoints(pts => pts + 20);
          appendLog(`🔥 STREAK BONUS UNLOCKED! Completed 3 consecutive trips and earned an extra £10.00! (+20 Driver Points ⭐)`, 'success');
          sendRealNotification("🔥 Streak Bonus!", "You completed 3 consecutive trips and earned an extra £10.00!");
        } else if (nextStreak === 5) {
          const bonusAmt = 25.00;
          setStats((s) => ({
            ...s,
            todayEarnings: s.todayEarnings + bonusAmt,
            weeklyEarnings: s.weeklyEarnings + bonusAmt,
            balance: s.balance + bonusAmt,
          }));
          setDriverPoints(pts => pts + 40);
          appendLog(`🔥 MEGA STREAK BONUS UNLOCKED! Completed 5 consecutive trips and earned an extra £25.00! (+40 Driver Points ⭐)`, 'success');
          sendRealNotification("🔥 Mega Streak Bonus!", "You completed 5 consecutive trips and earned an extra £25.00!");
        } else {
          appendLog(`🔥 Food Delivery Trip streak is now at ${nextStreak} consecutive trips!`, 'success');
        }
        return nextStreak;
      });

      const completedRun = {
        id: job.id,
        passengerName: job.passengerName,
        pickupAddress: job.pickupAddress,
        dropoffAddress: job.dropoffAddress,
        fare: job.fare,
        tip: 0,
        timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        type: 'food' as const,
        rating: 5,
        review: 'Super prompt hot delivery, thanks! ⭐⭐⭐⭐⭐'
      };

      setCompletedTrips((prev: any) => [...prev, completedRun]);
      setJustCompletedTrip(completedRun);
      setShowCelebration(true);
      appendLog(`🏆 Order successfully delivered. £${job.fare.toFixed(2)} added to your Swift balance! (+${earnedPoints} Driver Points ⭐)`, 'success');

      return p.filter(j => j.id !== jobId);
    });

    // Reset active focused job ID
    setActiveEatsJobId(prev => {
      const remaining = activeEatsJobs.filter(j => j.id !== jobId);
      return remaining.length > 0 ? remaining[0].id : null;
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
        if (currentRide.category && currentRide.category.toLowerCase().includes('comfort')) {
          setCompletedComfortCount(c => c + 1);
        }
        if (currentRide.pickupAddress.toLowerCase().includes('terminal') || currentRide.dropoffAddress.toLowerCase().includes('airport') || currentRide.dropoffAddress.toLowerCase().includes('heathrow')) {
          setCompletedAirportCount(a => a + 1);
        }
      } else {
        setFoodTrips(p => [newRecord, ...p]);
      }

      setJustCompletedTrip(newRecord);
      setShowCelebration(true);
      playSoundEffect('complete');

      const isComfort = currentRide.category && currentRide.category.toLowerCase().includes('comfort');
      const isAirport = currentRide.pickupAddress.toLowerCase().includes('terminal') || currentRide.dropoffAddress.toLowerCase().includes('airport') || currentRide.dropoffAddress.toLowerCase().includes('heathrow');
      const earnedPoints = currentRide.surgeMultiplier > 1.5 ? 35 : (isComfort || isAirport ? 25 : 20);

      // Increment miles and active driving time
      const dist = currentRide.distance || 4.2;
      const mins = currentRide.estimatedMinutes || 12;
      setMilesDriven(prev => +(prev + dist).toFixed(1));
      setActiveDrivingTime(prev => +(prev + mins / 60).toFixed(2));

      // Streak tracking & bonuses
      setStreakCount(prev => {
        const nextStreak = prev + 1;
        if (nextStreak === 3) {
          const bonusAmt = 10.00;
          setStats((s: any) => ({
            ...s,
            todayEarnings: s.todayEarnings + bonusAmt,
            weeklyEarnings: s.weeklyEarnings + bonusAmt,
            balance: s.balance + bonusAmt,
          }));
          setDriverPoints(pts => pts + 20);
          appendLog(`🔥 STREAK BONUS UNLOCKED! Completed 3 consecutive trips and earned an extra £10.00! (+20 Driver Points ⭐)`, 'success');
          sendRealNotification("🔥 Streak Bonus!", "You completed 3 consecutive trips and earned an extra £10.00!");
        } else if (nextStreak === 5) {
          const bonusAmt = 25.00;
          setStats((s: any) => ({
            ...s,
            todayEarnings: s.todayEarnings + bonusAmt,
            weeklyEarnings: s.weeklyEarnings + bonusAmt,
            balance: s.balance + bonusAmt,
          }));
          setDriverPoints(pts => pts + 40);
          appendLog(`🔥 MEGA STREAK BONUS UNLOCKED! Completed 5 consecutive trips and earned an extra £25.00! (+40 Driver Points ⭐)`, 'success');
          sendRealNotification("🔥 Mega Streak Bonus!", "You completed 5 consecutive trips and earned an extra £25.00!");
        } else {
          appendLog(`🔥 Taxi Trip streak is now at ${nextStreak} consecutive trips!`, 'success');
        }
        return nextStreak;
      });

      setStats((s: any) => ({
        ...s,
        todayEarnings: s.todayEarnings + totalSum,
        weeklyEarnings: s.weeklyEarnings + totalSum,
        balance: s.balance + totalSum,
        completedTripsCount: s.completedTripsCount + 1,
        hoursOnline: +(s.hoursOnline + 0.4).toFixed(2),
      }));
      setDriverPoints(pts => pts + earnedPoints);

      appendLog(`💰 FARE COMPLETED! Earned £${baseFee.toFixed(2)} + £${tipAmount.toFixed(2)} Tip from ${currentRide.passengerName}! (+${earnedPoints} Driver Points ⭐)`, 'earnings');

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
    setStreakCount(0); // reset streak on cancellation
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

  const handleCancelFoodTrip = (jobId: string) => {
    playSoundEffect('warn');
    appendLog(`❌ Food order cancelled by driver. Order returned to pool.`, 'warn');
    setStreakCount(0); // reset streak on cancellation
    setStats((s) => ({
      ...s,
      cancellationRate: s.cancellationRate + 1,
    }));
    setActiveEatsJobs((prev) => prev.filter(job => job.id !== jobId));
    setActiveEatsJobId((prev) => {
      const remaining = activeEatsJobs.filter(job => job.id !== jobId);
      return remaining.length > 0 ? remaining[0].id : null;
    });
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
      let responseText = "Alright driver! I am coming down right now. 👍";
      const userTextLower = text.toLowerCase();
      if (mode === 'food') {
        if (userTextLower.includes('here') || userTextLower.includes('arrived')) {
          responseText = "Super, I will come to the lobby inside 1 min! Thanks!";
        } else if (userTextLower.includes('traffic') || userTextLower.includes('delayed') || userTextLower.includes('way')) {
          responseText = "No worries, thank you for letting me know! Safe driving.";
        } else if (userTextLower.includes('ac') || userTextLower.includes('cold') || userTextLower.includes('hot')) {
          responseText = "Yes please, keep it warm. Thanks!";
        } else {
          responseText = "Got it! Thanks for the update.";
        }
      } else {
        if (userTextLower.includes('here') || userTextLower.includes('pickup') || userTextLower.includes('arrived')) {
          responseText = "Coming down now! Just taking the elevator, see you in 1 min.";
        } else if (userTextLower.includes('traffic') || userTextLower.includes('late') || userTextLower.includes('way')) {
          responseText = "No problem at all! I see you on my map, take your time.";
        } else if (userTextLower.includes('ac') || userTextLower.includes('cold') || userTextLower.includes('hot')) {
          responseText = "Yes please, some cool air would be fantastic! Thank you.";
        } else {
          responseText = "Splendid, see you shortly!";
        }
      }

      setChatMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: 'passenger',
          text: responseText,
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
        
        {/* SWIFT DRIVER BOOTUP SEQUENCE OVERLAY */}
        <AnimatePresence>
          {isBooting && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ 
                opacity: 0,
                scale: 1.05,
                y: -15,
                transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] }
              }}
              className="absolute inset-0 z-[110] bg-[#070b13] flex flex-col justify-between overflow-hidden p-6 text-white"
              style={{
                backgroundImage: 'radial-gradient(circle at top, rgba(16, 185, 129, 0.12), transparent), radial-gradient(circle at bottom, rgba(5, 150, 105, 0.05), transparent), linear-gradient(180deg, #070b13 0%, #030509 100%)'
              }}
            >
              {/* Particle/Radar Grid Decorative Background */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
                backgroundImage: `radial-gradient(circle, #10b981 1px, transparent 1px)`,
                backgroundSize: '20px 20px'
              }} />

              {/* Top bar indicators */}
              <div className="flex items-center justify-between opacity-40 text-[8px] font-mono select-none tracking-widest mt-1">
                <span>CO-PILOT OS v4.28</span>
                <span>STABLE CONNECT</span>
              </div>

              {/* Core Content: Animated Logo & Ring */}
              <div className="flex-1 flex flex-col items-center justify-center -mt-8">
                <div className="relative flex items-center justify-center mb-8">
                  {/* Spinning vector orbit ring */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                    className="absolute w-24 h-24 rounded-full border-2 border-dashed border-[#10b981]/30"
                  />
                  {/* Pulsing glow ring */}
                  <motion.div
                    animate={{ scale: [0.95, 1.05, 0.95] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    className="absolute w-20 h-20 rounded-full bg-[#10b981]/10 blur-md"
                  />
                  {/* Core glowing emerald emblem */}
                  <div className="w-16 h-16 rounded-2xl bg-[#10b981] flex items-center justify-center shadow-[0_0_25px_rgba(16,185,129,0.5)] border border-[#34d399]/40 relative z-10">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                </div>

                <motion.h1 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1"
                >
                  SWIFT <span className="text-[#10b981] font-black">CO-PILOT</span>
                </motion.h1>
                <span className="text-[8px] font-black uppercase text-zinc-500 tracking-[0.25em] mt-1.5">Driver Command Deck</span>

                {/* Progress bar container */}
                <div className="w-full max-w-[240px] mt-10">
                  <div className="flex justify-between items-end text-[10px] mb-1.5 font-mono">
                    <span className="text-zinc-400 font-bold uppercase tracking-wider">{bootStage}</span>
                    <span className="text-[#10b981] font-extrabold">{bootProgress}%</span>
                  </div>
                  
                  {/* Outer loading track */}
                  <div className="w-full h-1.5 bg-zinc-900 border border-zinc-800/80 rounded-full overflow-hidden p-[1px]">
                    {/* Dynamic filled loading indicator */}
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-150 shadow-[0_0_10px_#10b981]"
                      style={{ width: `${bootProgress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Diagnostics Log Terminal Footer */}
              <div className="bg-zinc-950/80 border border-zinc-900/50 rounded-2xl p-3.5 flex flex-col gap-1.5 h-[130px] overflow-hidden justify-end font-mono text-[8px] text-zinc-400 select-none">
                <div className="flex items-center gap-1 border-b border-zinc-900 pb-1.5 mb-1 text-[7.5px] text-zinc-500 font-extrabold uppercase">
                  <span>Diagnostic Logs Feed</span>
                  <span className="ml-auto animate-pulse">● RECEIVING</span>
                </div>
                <div className="space-y-1 overflow-y-auto max-h-[90px] flex flex-col justify-end">
                  <AnimatePresence>
                    {bootLogs.slice(-4).map((log) => (
                      <motion.div
                        key={log}
                        initial={{ opacity: 0, x: -10, y: 5 }}
                        animate={{ opacity: 1, x: 0, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`flex items-start gap-1.5 leading-snug ${log === bootLogs[bootLogs.length - 1] ? 'text-[#10b981] font-black' : 'text-zinc-400'}`}
                      >
                        <span className="shrink-0 text-zinc-500 font-extrabold">&gt;</span>
                        <span className="break-words">{log}</span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              {/* Fast Bypass Control */}
              <div className="mt-4 flex justify-center">
                <button
                  onClick={() => {
                    try {
                      playSoundEffect('complete');
                    } catch (_) {}
                    setIsBooting(false);
                    appendLog("⚡ Pilot bypassed bootup initialization. Co-Pilot console fully operational.", "success");
                  }}
                  className="text-[8px] font-black tracking-widest text-zinc-500 hover:text-zinc-300 bg-zinc-900/30 hover:bg-zinc-900/60 border border-zinc-900 py-1.5 px-4 rounded-xl transition cursor-pointer uppercase"
                >
                  Instant Unlock &gt;&gt;
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* RANDOM COMPLIANCE AUDIT OVERLAY */}
        <AnimatePresence>
          {randomAuditActive && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 z-[100] bg-black/90 flex flex-col justify-between p-6 text-white text-center"
            >
              <div className="flex flex-col items-center mt-8">
                <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500 flex items-center justify-center mb-4 animate-pulse">
                  <Video className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-lg font-black uppercase tracking-wide text-red-500">
                  Mandatory Security Audit
                </h2>
                <div className="text-[10px] font-mono text-zinc-400 mt-1 uppercase tracking-widest">
                  Random daily compliance verification
                </div>
              </div>

              <div className="flex flex-col items-center justify-center my-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <div className="text-[10px] text-zinc-450 uppercase font-black tracking-wider mb-2">
                  Time Remaining to Comply
                </div>
                <div className="text-4xl font-mono font-extrabold text-red-500">
                  {randomAuditTimer}s
                </div>
                <p className="text-[10px] text-zinc-400 mt-3 leading-relaxed">
                  Compliance standards require all active Swift dispatch operators to verify their identity within 60 seconds of a random audit request. Failure to scan will result in immediate suspension and account lockout.
                </p>
              </div>

              <div className="flex flex-col gap-2 mb-8">
                <button
                  onClick={() => {
                    playSoundEffect('tap');
                    setShowFaceScanner(true);
                  }}
                  className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-red-600/20 active:scale-98 transition cursor-pointer"
                >
                  Scan Biometric Selfie Now
                </button>
                <button
                  onClick={() => {
                    playSoundEffect('tap');
                    setRandomAuditActive(false);
                    setIsOnline(false);
                    appendLog("⚠️ Operator manually canceled safety audit and went offline.", "warn");
                  }}
                  className="w-full py-2 bg-transparent hover:bg-white/5 text-zinc-400 font-bold text-[10px] uppercase tracking-wider rounded-xl transition cursor-pointer"
                >
                  Go Offline (Skip & Decline)
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* IN-APP TOAST PORTAL OVERLAY */}
        <div className="absolute top-10 left-3 right-3 z-100 pointer-events-none flex flex-col gap-2">
          <AnimatePresence>
            {toasts.map((toast) => {
              // Color styles and icons based on type
              let bgColor = 'bg-zinc-900/95 dark:bg-zinc-950/98 text-white border-zinc-805';
              let icon = <Info className="w-3.5 h-3.5 text-emerald-400" />;
              
              if (toast.type === 'success') {
                bgColor = 'bg-emerald-900/95 dark:bg-emerald-950/98 text-white border-emerald-800';
                icon = <CheckCircle className="w-3.5 h-3.5 text-emerald-300" />;
              } else if (toast.type === 'alert') {
                bgColor = 'bg-rose-900/95 dark:bg-rose-950/98 text-white border-rose-800';
                icon = <AlertTriangle className="w-3.5 h-3.5 text-rose-300 animate-pulse" />;
              } else if (toast.type === 'message') {
                bgColor = 'bg-blue-900/95 dark:bg-blue-950/98 text-white border-blue-800';
                icon = <MessageSquare className="w-3.5 h-3.5 text-blue-300" />;
              }

              return (
                <motion.div
                  key={toast.id}
                  initial={{ opacity: 0, y: -20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                  className={`pointer-events-auto w-full p-2.5 rounded-2xl border flex items-start gap-2 shadow-lg backdrop-blur-md ${bgColor}`}
                >
                  <div className="shrink-0 mt-0.5">
                    {icon}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <h4 className="text-[9.5px] font-black uppercase tracking-wider leading-none">
                      {toast.title}
                    </h4>
                    <p className="text-[9px] font-semibold text-zinc-100 mt-1 leading-tight">
                      {toast.body}
                    </p>
                  </div>
                  <button 
                    onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                    className="p-1 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition cursor-pointer self-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Top Camera Notch/Dynamic Island bar */}
        <div 
          onClick={() => {
            if (isMinimized) {
              playSoundEffect('complete');
              setIsMinimized(false);
              appendLog("📲 Restored Swift Driver simulation from iOS Dynamic Island.", "success");
            }
          }}
          className={`hidden md:flex absolute top-0 left-1/2 -translate-x-1/2 h-6.5 rounded-b-2xl z-55 items-center justify-center gap-1.5 transition-all duration-300 ${
            isMinimized && isOnline 
              ? 'w-48 bg-[#007AFF] shadow-[0_0_12px_rgba(0,122,255,0.7)] cursor-pointer hover:bg-blue-500 scale-105 active:scale-98' 
              : 'w-40 bg-zinc-950 pointer-events-none'
          }`}
          title={isMinimized && isOnline ? "Active Background Tracking - Click to Restore App" : undefined}
        >
          {isMinimized && isOnline ? (
            <div className="flex items-center gap-1 px-2.5 py-0.5 text-[8.5px] font-black tracking-widest text-white select-none animate-pulse">
              <Navigation className="w-2.5 h-2.5 fill-white text-white rotate-45" />
              <span>ACTIVE SYSTEM</span>
            </div>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-black/80" /> 
              <span className="w-12 h-0.5 bg-zinc-805 rounded" /> 
            </>
          )}
        </div>

        {/* Simulated status bar */}
        <div 
          onClick={() => {
            if (isMinimized) {
              playSoundEffect('complete');
              setIsMinimized(false);
              appendLog("📲 Restored Swift Driver from active status bar.", "success");
            }
          }}
          className={`h-7 px-5 flex items-center justify-between text-[10px] select-none shrink-0 font-black z-20 pb-0.5 pt-1 transition-all duration-300 border-b ${
            isMinimized && isOnline 
              ? 'bg-[#007AFF] text-white cursor-pointer hover:bg-blue-600 border-blue-500 shadow-md' 
              : darkMode 
                ? 'bg-zinc-950 text-zinc-100 border-zinc-900/50' 
                : 'bg-white text-zinc-900 border-zinc-100/50'
          }`}
          title={isMinimized && isOnline ? "Active Background Tracking - Click Bar to Restore App" : undefined}
        >
          {/* Left: iOS Location Indicator displaying the time */}
          <div className="flex items-center gap-1">
            {isOnline ? (
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  if (isMinimized) {
                    playSoundEffect('complete');
                    setIsMinimized(false);
                  } else {
                    handleSetOnline(false);
                  }
                }}
                className="bg-[#007AFF] text-white px-2.5 py-0.5 rounded-full flex items-center gap-1 font-sans text-[10px] font-black tracking-normal select-none cursor-pointer hover:bg-blue-600 transition-all active:scale-95 animate-pulse shadow-xs"
                title={isMinimized ? "Active Location - Click to Open App" : "Location Active (Online) - Tap to toggle Offline"}
              >
                <Navigation className="w-2.5 h-2.5 text-white fill-white" style={{ transform: 'rotate(45deg)' }} />
                <span>{currentTimeStr}</span>
              </div>
            ) : (
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  if (isMinimized) {
                    playSoundEffect('complete');
                    setIsMinimized(false);
                  } else {
                    handleSetOnline(true);
                  }
                }}
                className="flex items-center gap-1 cursor-pointer select-none py-0.5 font-extrabold"
                title={isMinimized ? "App Minimized - Click to Open App" : "Location Inactive (Offline) - Tap to Go Online"}
              >
                <span className="font-sans font-black text-[11px] tracking-tight">{currentTimeStr}</span>
                <Navigation className="w-2.5 h-2.5 text-zinc-350 dark:text-zinc-650" style={{ transform: 'rotate(45deg)' }} />
              </div>
            )}
          </div>

          {/* Right: iOS signal, Wi-Fi network system & battery stats */}
          <div className="flex items-center gap-2">
            {/* Simulated cellular bars */}
            <div className="flex items-end gap-[1.5px] h-2.5" title="Cellular Strength">
              <div className="w-[2px] h-[3px] bg-current rounded-full" />
              <div className="w-[2px] h-[5.5px] bg-current rounded-full" />
              <div className={`w-[2px] h-[7.5px] rounded-full ${isInternetConnected ? 'bg-current' : 'bg-zinc-300 dark:bg-zinc-700 opacity-40'}`} />
              <div className={`w-[2px] h-[9.5px] rounded-full ${isInternetConnected ? 'bg-current' : 'bg-zinc-300 dark:bg-zinc-700 opacity-40'}`} />
            </div>

            {/* Wifi indicating line connection */}
            {isInternetConnected ? (
              <Wifi className="w-3.5 h-3.5 animate-pulse" title="Connected to Network" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-rose-500" title="Offline Status - Cloud Backup Idle" />
            )}

            {/* Battery status representing actual level */}
            <div className="flex items-center gap-1 font-mono text-[9px] font-extrabold" title={`Battery Level: ${batteryLevel}%`}>
              <span>{batteryLevel}%</span>
              <div className="w-5.5 h-3 border border-current rounded-[4px] p-[1.5px] flex items-center relative gap-[0.5px]">
                <div 
                  className={`h-full rounded-[1px] transition-all duration-300 ${batteryLevel <= 20 ? 'bg-rose-500' : 'bg-current'}`} 
                  style={{ width: `${batteryLevel}%` }} 
                />
                <div className="w-[1.2px] h-1.5 bg-current absolute -right-[2px] rounded-r-[1px]" />
              </div>
            </div>
          </div>
        </div>

        {/* INTERNAL PHONE SCREEN PORTAL */}
        <div className={`flex-1 flex flex-col overflow-hidden relative select-none transition-colors duration-200 ${darkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-gray-900'} ${triggerHapticPulse ? 'swift-haptic-active' : ''}`}>
              
              <style>{`
                @keyframes swift-haptic-shake {
                  0% { transform: translate(0px, 0px) scale(1); }
                  20% { transform: translate(-2px, 1.5px) scale(0.995); }
                  40% { transform: translate(1.5px, -1px) scale(1.002); }
                  60% { transform: translate(-1.5px, 2px) scale(0.998); }
                  80% { transform: translate(2px, -1px) scale(1.001); }
                  100% { transform: translate(0px, 0px) scale(1); }
                }
                .swift-haptic-active {
                  animation: swift-haptic-shake 0.12s ease-in-out;
                }
              `}</style>

              {/* Left Slide-out Side Menu Drawer Overlay */}
              <AnimatePresence>
                {isSideMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => { playSoundEffect('tap'); setIsSideMenuOpen(false); }}
                    className="absolute inset-0 bg-black/55 backdrop-blur-[1px] z-[80] cursor-pointer"
                  />
                )}
              </AnimatePresence>

              {/* Left Sliding Drawer Panel content */}
              <AnimatePresence>
                {isSideMenuOpen && (
                  <motion.div
                    initial={{ x: '-100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '-100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                    className={`absolute inset-y-0 left-0 w-[275px] max-w-[85%] ${darkMode ? 'bg-zinc-950 border-r border-zinc-850 text-zinc-100' : 'bg-white border-r border-gray-150 text-gray-950'} z-[85] flex flex-col shadow-2xl overflow-hidden`}
                  >
                    {/* Header */}
                    <div className={`p-3.5 border-b ${darkMode ? 'border-zinc-900 bg-zinc-900/30' : 'border-gray-100 bg-gray-50/50'} flex items-center justify-between`}>
                      <div className="flex items-center gap-1.5 text-left">
                        <div className="w-5.5 h-5.5 rounded bg-[#13AA52] flex items-center justify-center text-white font-black text-[10px]">S</div>
                        <div>
                          <h3 className="font-sans font-black text-[11px] tracking-tight leading-none text-[#13AA52]">Swift Operations</h3>
                          <span className="text-[7px] text-zinc-400 font-bold uppercase tracking-wider font-mono">Driver Suite v2.4</span>
                        </div>
                      </div>
                      <button
                        onClick={() => { playSoundEffect('tap'); setIsSideMenuOpen(false); }}
                        className={`p-1 rounded-lg transition ${darkMode ? 'hover:bg-zinc-850 text-zinc-400' : 'hover:bg-gray-100 text-gray-500'}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Scrollable drawer body */}
                    <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 scrollbar-thin text-left">
                      
                      {/* Driver profile summary */}
                      <div className={`p-2.5 rounded-lg border flex items-center gap-2.5 ${darkMode ? 'bg-zinc-900/40 border-zinc-850' : 'bg-gray-105 border-gray-150'}`}>
                        <div className="relative">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white font-black text-xs">
                            C
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 bg-green-500 w-2 h-2 rounded-full border border-white dark:border-zinc-950 animate-pulse" />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <h4 className="text-[10px] font-black tracking-tight leading-tight truncate">Marcus Sterling</h4>
                          <span className="text-[8px] font-bold text-zinc-400 flex items-center gap-1 mt-0.5">
                            <span>{driverLevel.medal} {driverLevel.name}</span>
                            <span className="text-[7.5px] px-1 bg-amber-500/10 text-amber-500 rounded font-mono font-bold">{driverPoints} pts</span>
                          </span>
                        </div>
                      </div>

                      {/* Scheduled reservations (Pre-bookings Manager) */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[8.5px] font-bold uppercase tracking-wider text-zinc-400 font-sans">📅 Pre-booking Manager</span>
                          <span className="text-[7.5px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded-full font-bold">{scheduledBookings.filter(b => !b.claimed).length} Unclaimed</span>
                        </div>

                        {/* Create dynamic prebookings */}
                        <div className={`p-3 rounded-lg border ${darkMode ? 'bg-zinc-900/15 border-zinc-850' : 'bg-zinc-50/15 border-gray-150'} space-y-2`}>
                          <span className="text-[9px] font-black block leading-none">Schedule Upcoming Booking</span>
                          
                          <div className="grid grid-cols-2 gap-1.5">
                            <div>
                              <label className="text-[7.5px] text-zinc-400 font-bold uppercase block mb-0.5">Passenger</label>
                              <input
                                id="drawer-prebook-passenger"
                                type="text"
                                defaultValue="Charles Dickens"
                                className={`w-full text-[9px] font-semibold px-2 py-1 rounded border outline-none ${darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                              />
                            </div>
                            <div>
                              <label className="text-[7.5px] text-zinc-400 font-bold uppercase block mb-0.5">Fare (£)</label>
                              <input
                                id="drawer-prebook-fare"
                                type="number"
                                defaultValue="22.50"
                                className={`w-full text-[9px] font-semibold px-2 py-1 rounded border outline-none ${darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[7.5px] text-zinc-400 font-bold uppercase block mb-0.5">Route (Pickup ➔ Dropoff)</label>
                            <input
                              id="drawer-prebook-route"
                              type="text"
                              defaultValue="Covent Garden ➔ London Bridge"
                              className={`w-full text-[9px] font-semibold px-2 py-1 rounded border outline-none ${darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                            />
                          </div>

                          <button
                            onClick={() => {
                              const passInput = document.getElementById('drawer-prebook-passenger') as HTMLInputElement;
                              const fareInput = document.getElementById('drawer-prebook-fare') as HTMLInputElement;
                              const routeInput = document.getElementById('drawer-prebook-route') as HTMLInputElement;

                              const pass = passInput?.value || 'Charles Dickens';
                              const fare = +(parseFloat(fareInput?.value || '22.50').toFixed(2));
                              const route = routeInput?.value || 'Covent Garden ➔ London Bridge';
                              
                              playSoundEffect('tap');

                              const newBooking = {
                                id: `sb-${Date.now()}`,
                                passengerName: pass,
                                timeString: 'In 30s',
                                route,
                                fare,
                                claimed: false,
                                category: mode === 'taxi' ? 'Swift Premium' : 'Swift Fast Delivery'
                              };

                              setScheduledBookings(prev => [newBooking, ...prev]);
                              appendLog(`📅 New pre-booking scheduled: "${pass}" (${route}) for £${fare.toFixed(2)}`, 'success');
                              addToast("📅 Pre-booking Setup Success", `Passenger: ${pass} • £${fare.toFixed(2)}`, 'success');
                            }}
                            className="w-full bg-[#13AA52] hover:bg-[#108F45] text-white py-1 rounded-md text-[8.5px] font-black transition-all active:scale-97 flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Calendar className="w-3 h-3" />
                            Create upcoming reservation
                          </button>
                        </div>

                        {/* List/dispatch bookings */}
                        <div className="space-y-1 max-h-[145px] overflow-y-auto pr-0.5 scrollbar-thin">
                          {scheduledBookings.map((b) => (
                            <div 
                              key={b.id} 
                              onClick={() => {
                                playSoundEffect('tap');
                                setSelectedPrebooking(b);
                              }}
                              className={`p-2 rounded border text-[8.5px] font-medium flex items-center justify-between gap-1.5 cursor-pointer transition-all hover:scale-[1.01] active:scale-99 ${
                                darkMode 
                                  ? 'bg-zinc-900/30 border-zinc-850 hover:bg-zinc-850' 
                                  : 'bg-gray-50/50 border-gray-150 hover:bg-gray-100/70'
                              }`}
                              title="Tap to view reservation details & pricing"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1 justify-between">
                                  <span className="font-extrabold truncate">{b.passengerName}</span>
                                  <span className="text-[7px] font-mono text-amber-500 font-bold bg-amber-500/10 px-1 rounded">{b.timeString}</span>
                                </div>
                                <p className="text-zinc-400 truncate text-[7.5px] mt-0.5">{b.route}</p>
                                <p className="text-[8px] font-bold text-emerald-500 mt-0.5">£{b.fare.toFixed(2)}</p>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Trigger immediate dispatch
                                  handleSpawnPrebookedRide(b);
                                  
                                  // Mark claimed and Close menu
                                  setScheduledBookings(prev => prev.map(item => item.id === b.id ? { ...item, claimed: true } : item));
                                  setIsSideMenuOpen(false);
                                }}
                                disabled={b.claimed}
                                className={`px-1.5 py-0.5 rounded text-[7.5px] font-black cursor-pointer shrink-0 transition-all ${
                                  b.claimed 
                                    ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-700 cursor-not-allowed' 
                                    : 'bg-[#007AFF] text-white hover:bg-blue-600 active:scale-95'
                                }`}
                              >
                                {b.claimed ? 'Claimed ✔' : 'Dispatch 🚕'}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* App settings / configuration */}
                      <div className="space-y-1.5 text-left animate-fade-in">
                        <span className="text-[8.5px] font-bold uppercase tracking-wider text-zinc-400 font-sans">⚡ App Configuration</span>
                        
                        <div className={`p-2.5 rounded-lg border ${darkMode ? 'bg-zinc-900/15 border-zinc-850' : 'bg-zinc-50/15 border-gray-150'} space-y-2`}>
                          
                          {/* Haptic trigger settings switch */}
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-[9px] font-bold block leading-none">Haptic Vibration</span>
                              <span className="text-[7px] text-zinc-400 block mt-0.5">Adaptive screen kickback</span>
                            </div>
                            <button
                              onClick={() => {
                                const next = !hapticEnabled;
                                setHapticEnabled(next);
                                if (next) {
                                  try {
                                    if (navigator.vibrate) navigator.vibrate(35);
                                  } catch (_) {}
                                }
                              }}
                              className={`w-6 h-3.5 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${hapticEnabled ? 'bg-[#13AA52]' : 'bg-zinc-350 dark:bg-zinc-750'}`}
                            >
                              <div className={`w-2.5 h-2.5 rounded-full bg-white transition-transform ${hapticEnabled ? 'translate-x-2.5' : 'translate-x-0'}`} />
                            </button>
                          </div>

                          {/* Haptic pulse tester */}
                          <div className="flex items-center gap-1 pt-1.5 border-t border-dashed border-zinc-800">
                            <button
                              onClick={() => {
                                triggerHaptic('light');
                                appendLog('⚡ Haptic test channel: Light pulse executed.', 'info');
                              }}
                              className={`flex-1 py-1 rounded text-[7.5px] font-bold transition-all text-center ${darkMode ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200'}`}
                            >
                              Light 📳
                            </button>
                            <button
                              onClick={() => {
                                triggerHaptic('medium');
                                appendLog('⚡ Haptic test channel: Medium rumble executed.', 'success');
                              }}
                              className={`flex-1 py-1 rounded text-[7.5px] font-bold transition-all text-center ${darkMode ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200'}`}
                            >
                              Medium 🔥
                            </button>
                            <button
                              onClick={() => {
                                triggerHaptic('heavy');
                                appendLog('⚡ Haptic test channel: Heavy kick shockwave executed.', 'warn');
                              }}
                              className={`flex-1 py-1 rounded text-[7.5px] font-bold transition-all text-center ${darkMode ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200'}`}
                            >
                              Heavy 💥
                            </button>
                          </div>

                          {/* Sound feedback switch */}
                          <div className="flex items-center justify-between pt-1.5 border-t border-dashed border-zinc-805">
                            <div>
                              <span className="text-[9px] font-bold block leading-none font-sans">Audio Synth Alerts</span>
                              <span className="text-[7px] text-zinc-400 block mt-0.5">Play trip alert tones</span>
                            </div>
                            <button
                              onClick={() => {
                                playSoundEffect('tap');
                                setSoundEnabled(!soundEnabled);
                              }}
                              className={`w-6 h-3.5 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${soundEnabled ? 'bg-[#13AA52]' : 'bg-zinc-350 dark:bg-zinc-750'}`}
                            >
                              <div className={`w-2.5 h-2.5 rounded-full bg-white transition-transform ${soundEnabled ? 'translate-x-2.5' : 'translate-x-0'}`} />
                            </button>
                          </div>

                          {/* Notifications feedback switch */}
                          <div className="flex items-center justify-between pt-1.5 border-t border-dashed border-zinc-850">
                            <div>
                              <span className="text-[9px] font-bold block leading-none font-sans">Browser Push Alerts</span>
                              <span className="text-[7px] text-zinc-400 block mt-0.5">Desktop notification delivery</span>
                            </div>
                            <button
                              onClick={() => {
                                playSoundEffect('tap');
                                setNotificationsEnabled(!notificationsEnabled);
                              }}
                              className={`w-6 h-3.5 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${notificationsEnabled ? 'bg-[#13AA52]' : 'bg-zinc-350 dark:bg-zinc-750'}`}
                            >
                              <div className={`w-2.5 h-2.5 rounded-full bg-white transition-transform ${notificationsEnabled ? 'translate-x-2.5' : 'translate-x-0'}`} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Interactive system links */}
                      <div className="pt-1">
                        <button
                          onClick={() => {
                            playSoundEffect('tap');
                            setActiveTab('earnings');
                            setIsSideMenuOpen(false);
                          }}
                          className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white rounded-lg p-2.5 text-left shadow relative overflow-hidden transition-all duration-200 hover:shadow-emerald-500/10 transform hover:-translate-y-0.5 flex items-center justify-between group"
                        >
                          <div className="relative z-10 text-left">
                            <span className="text-[7px] font-extrabold uppercase bg-white/20 px-1 hover:bg-white/30 rounded leading-none block w-max tracking-wider">Earnings Hub</span>
                            <h5 className="font-extrabold text-[10px] mt-1">Today's Pool: £{stats.todayEarnings.toFixed(2)}</h5>
                            <p className="text-[7px] text-white/80 mt-0.5 leading-tight">View completed receipts & invoice templates.</p>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-white shrink-0 group-hover:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    </div>

                    {/* Footer operations */}
                    <div className={`p-2 border-t ${darkMode ? 'border-zinc-900 bg-zinc-950 text-zinc-650' : 'border-gray-150 bg-gray-50 text-gray-400'} text-center text-[7.5px] font-mono`}>
                      Device GPS IP: 147.28.32.128 • Port 3000 Ingress
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Selected Pre-booking Details Sheet Overlay */}
              <AnimatePresence>
                {selectedPrebooking && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-[90] flex flex-col justify-end text-left select-none">
                    <motion.div
                      initial={{ y: '100%' }}
                      animate={{ y: 0 }}
                      exit={{ y: '100%' }}
                      transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                      className={`rounded-t-2xl p-4 flex flex-col gap-3.5 shadow-2xl max-h-[85%] overflow-y-auto border-t ${
                        darkMode ? 'bg-zinc-950 border-zinc-850 text-zinc-100' : 'bg-white border-gray-150 text-gray-900'
                      }`}
                    >
                      {/* Header */}
                      <div className="flex justify-between items-center pb-2.5 border-b border-gray-100 dark:border-zinc-900 text-left">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-emerald-500" />
                          <div>
                            <h4 className="text-xs font-black text-gray-900 dark:text-zinc-100 uppercase tracking-tight">Reservation Detail</h4>
                            <span className="text-[7.5px] font-mono font-bold text-gray-400 dark:text-zinc-500">BOOKING ID: #{selectedPrebooking.id.toUpperCase()}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => { playSoundEffect('tap'); setSelectedPrebooking(null); }}
                          className={`p-1.5 rounded-lg transition text-[9px] font-black font-sans px-3 ${
                            darkMode ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300' : 'bg-gray-100 hover:bg-gray-150 text-gray-700'
                          }`}
                        >
                          Close
                        </button>
                      </div>

                      {/* Client profile info */}
                      <div className={`p-3 rounded-xl border flex items-center gap-3 ${
                        darkMode ? 'bg-zinc-900/40 border-zinc-850' : 'bg-gray-50/50 border-gray-150'
                      }`}>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#13AA52] to-emerald-400 flex items-center justify-center text-white font-extrabold text-sm shadow-md">
                          {selectedPrebooking.passengerName ? selectedPrebooking.passengerName.charAt(0) : 'P'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h5 className="font-sans font-black text-[12px] truncate leading-tight">{selectedPrebooking.passengerName}</h5>
                            <span className="text-[6.5px] px-1 bg-[#13AA52]/10 text-[#13AA52] rounded-full font-bold uppercase tracking-wider">VIP</span>
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-[8px] font-bold text-zinc-400">Class:</span>
                            <span className="text-[8px] font-extrabold text-[#007AFF] bg-blue-500/10 px-1 rounded">
                              {selectedPrebooking.category || (mode === 'taxi' ? 'Swift Premium' : 'Swift Fast Delivery')}
                            </span>
                            <span className="text-[7.5px] font-sans text-amber-500 font-bold bg-amber-500/10 px-1 rounded flex items-center gap-0.5">
                              ★ 4.95
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Route address summary */}
                      <div className={`space-y-2 text-left p-3 rounded-xl border ${
                        darkMode ? 'bg-zinc-900/15 border-zinc-850' : 'bg-gray-50/40 border-gray-150'
                      }`}>
                        <span className="text-[7.5px] uppercase tracking-wider text-zinc-400 font-extrabold block">Planned Route & Coordinates</span>
                        
                        <div className="space-y-2">
                          <div className="flex gap-2 items-start">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1" />
                            <div>
                              <span className="text-zinc-600 dark:text-zinc-400 text-[7px] uppercase font-bold tracking-wide">Pickup Point</span>
                              <p className="font-bold text-[10px] leading-tight mt-0.5">
                                {(selectedPrebooking.route || '').split(' ➔ ')[0] || 'London Central'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="w-0.5 h-3.5 border-l border-dashed border-gray-300 dark:border-zinc-800 ml-1" />
                          
                          <div className="flex gap-2 items-start">
                            <div className="w-2 h-2 rounded-full bg-[#007AFF] mt-1" />
                            <div>
                              <span className="text-zinc-600 dark:text-zinc-400 text-[7px] uppercase font-bold tracking-wide">Dropoff Destination</span>
                              <p className="font-bold text-[10px] leading-tight mt-0.5">
                                {(selectedPrebooking.route || '').split(' ➔ ')[1] || 'West London'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Scheduling Window */}
                      <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 ${
                        darkMode ? 'bg-zinc-900/15 border-zinc-850' : 'bg-gray-50/20 border-gray-150'
                      }`}>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          <div>
                            <span className="text-[7.5px] text-zinc-400 font-bold block uppercase leading-none">Schedule Window</span>
                            <span className="text-[9.5px] font-extrabold block mt-0.5">Pickup Window: {selectedPrebooking.timeString}</span>
                          </div>
                        </div>
                        <span className="text-[8px] font-mono text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">Guaranteed booking</span>
                      </div>

                      {/* Financial Detail Breakdown */}
                      <div className={`border rounded-xl p-3 space-y-2 text-left ${
                        darkMode ? 'bg-zinc-900/10 border-zinc-850' : 'bg-white border-gray-150'
                      }`}>
                        <span className="text-[7.5px] uppercase tracking-wider text-zinc-400 font-extrabold block">Financial Division</span>
                        
                        <div className="flex justify-between items-center text-[9px]">
                          <span className="text-zinc-400 dark:text-zinc-500 font-medium">Standard Class Fare</span>
                          <span className="font-mono font-bold">£{selectedPrebooking.fare.toFixed(2)}</span>
                        </div>
                        
                        <div className="flex justify-between items-center text-[9px]">
                          <span className="text-zinc-400 dark:text-zinc-500 font-medium">Surge Multiplication</span>
                          <span className="font-mono font-black text-amber-500">
                            {surgeLevel === 'high' ? 'x2.2 High' : surgeLevel === 'medium' ? 'x1.4 Medium' : 'x1.0 standard'}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-[9px]">
                          <span className="text-zinc-400 dark:text-zinc-500 font-medium">Est. Voluntary Tips</span>
                          <span className="font-mono font-bold text-emerald-500">~£4.50</span>
                        </div>

                        <div className="border-t border-dashed border-gray-150 dark:border-zinc-850 pt-2 flex justify-between font-black text-gray-900 dark:text-zinc-100 text-[11px]">
                          <span>Projected Net Payout</span>
                          <span className="font-mono text-[#13AA52] text-[12px]">
                            £{((selectedPrebooking.fare * (surgeLevel === 'high' ? 2.2 : surgeLevel === 'medium' ? 1.4 : 1.0)) + 4.5).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Quick Action Button Box */}
                      <div className="pt-1 select-none">
                        <button
                          onClick={() => {
                            if (selectedPrebooking.claimed) return;
                            playSoundEffect('tap');
                            handleSpawnPrebookedRide(selectedPrebooking);
                            
                            // Mark claimed
                            setScheduledBookings(prev => prev.map(item => item.id === selectedPrebooking.id ? { ...item, claimed: true } : item));
                            setSelectedPrebooking(null);
                            setIsSideMenuOpen(false);
                          }}
                          disabled={selectedPrebooking.claimed}
                          className={`w-full py-2.5 rounded-xl font-sans font-black text-[11px] uppercase tracking-wide transition-all duration-200 active:scale-98 cursor-pointer flex items-center justify-center gap-1.5 shadow-md ${
                            selectedPrebooking.claimed
                              ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-700 cursor-not-allowed shadow-none'
                              : 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white hover:shadow-emerald-500/10'
                          }`}
                        >
                          <Car className="w-3.5 h-3.5" />
                          {selectedPrebooking.claimed ? 'Reservation Already Dispatched' : 'Dispatch Reservation Now 🚕'}
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* Optional iOS Home Screen Overlay when minimized */}
              {isMinimized && (
                <div 
                  className="absolute inset-0 z-50 flex flex-col justify-between overflow-hidden p-5 text-white bg-[#0f172a]"
                  style={{
                    backgroundImage: 'radial-gradient(circle at top right, rgba(99, 102, 241, 0.25), transparent), radial-gradient(circle at bottom left, rgba(244, 63, 94, 0.15), transparent), linear-gradient(135deg, #090d16 0%, #020617 100%)'
                  }}
                >
                  {/* Location active background banner */}
                  {isOnline && (
                    <div 
                      onClick={() => { playSoundEffect('complete'); setIsMinimized(false); }}
                      className="absolute top-2.5 left-3.5 right-3.5 bg-[#007AFF] hover:bg-blue-600 text-white py-2.5 px-3 rounded-2xl flex items-center justify-between text-[11px] font-black tracking-normal shadow-lg cursor-pointer transform hover:scale-[1.01] active:scale-[0.99] transition-all z-55 animate-pulse"
                    >
                      <div className="flex items-center gap-1.5">
                        <Navigation className="w-3.5 h-3.5 fill-white text-white rotate-45" />
                        <span>Swift Driver • GPS Location Active</span>
                      </div>
                      <span className="text-[8px] bg-white/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-extrabold font-mono">Return</span>
                    </div>
                  )}

                  {/* Date & Time display */}
                  <div className={`flex flex-col items-center transition-all ${isOnline ? 'mt-14' : 'mt-8'}`}>
                    <span className="text-[11px] font-black text-slate-400 tracking-wider uppercase font-sans">
                      {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-4xl font-light tracking-tight mt-1 text-slate-100 font-sans">
                      {currentTimeStr}
                    </span>
                  </div>

                  {/* iOS Style Icons Grid */}
                  <div className="grid grid-cols-4 gap-x-3 gap-y-5 px-1 mt-6 flex-1 items-start content-start">
                    {/* SWIFT DRIVER APP ICON */}
                    <div 
                      onClick={() => { playSoundEffect('complete'); setIsMinimized(false); }}
                      className="flex flex-col items-center gap-1 group cursor-pointer animate-fade-in"
                    >
                      <div className="relative w-11 h-11 bg-[#13AA52] rounded-[11px] flex items-center justify-center shadow-lg transform group-active:scale-95 transition-all">
                        <Navigation className="w-6 h-6 text-white text-center rotate-45" />
                        {isOnline ? (
                          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border border-white flex items-center justify-center" />
                          </span>
                        ) : null}
                      </div>
                      <span className="text-[9.5px] font-bold text-slate-200 text-center truncate w-full">Swift Driver</span>
                    </div>

                    {/* MAPS ICON */}
                    <div 
                      onClick={() => { playSoundEffect('tap'); }}
                      className="flex flex-col items-center gap-1 group cursor-pointer"
                    >
                      <div className="w-11 h-11 bg-white rounded-[11px] flex items-center justify-center shadow-lg transform group-active:scale-95 transition-all relative overflow-hidden">
                        <div className="absolute inset-0 bg-blue-100/50 flex flex-col">
                          <div className="h-full bg-emerald-200 w-2.5 absolute left-1/3 rotate-12" />
                          <div className="h-1.5 bg-amber-200 w-full absolute top-1/2" />
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500 absolute top-1/3 left-1/2 border border-white" />
                        </div>
                      </div>
                      <span className="text-[9.5px] font-bold text-slate-200 text-center truncate w-full">Maps</span>
                    </div>

                    {/* SETTINGS ICON */}
                    <div 
                      onClick={() => { playSoundEffect('tap'); setDarkMode(!darkMode); }}
                      className="flex flex-col items-center gap-1 group cursor-pointer"
                    >
                      <div className="w-11 h-11 bg-slate-400 rounded-[11px] flex items-center justify-center shadow-lg transform group-active:scale-95 transition-all">
                        <Sliders className="w-5 h-5 text-slate-800" />
                      </div>
                      <span className="text-[9.5px] font-bold text-slate-200 text-center truncate w-full">Settings</span>
                    </div>

                    {/* PHONE ICON */}
                    <div 
                      onClick={() => playSoundEffect('tap')}
                      className="flex flex-col items-center gap-1 group cursor-pointer"
                    >
                      <div className="w-11 h-11 bg-[#22C55E] rounded-[11px] flex items-center justify-center shadow-lg transform group-active:scale-95 transition-all">
                        <Smartphone className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-[9.5px] font-bold text-slate-200 text-center truncate w-full">Phone</span>
                    </div>

                    {/* SAFARI ICON */}
                    <div 
                      onClick={() => playSoundEffect('tap')}
                      className="flex flex-col items-center gap-1 group cursor-pointer"
                    >
                      <div className="w-11 h-11 bg-white rounded-[11px] flex items-center justify-center shadow-lg transform group-active:scale-95 transition-all overflow-hidden relative">
                        <div className="w-8 h-8 rounded-full border-[1.5px] border-blue-400 flex items-center justify-center rotate-45">
                          <div className="w-0.5 h-6 bg-[#FF3B30] relative before:absolute before:bottom-0 before:left-0 before:w-0.5 before:h-3 before:bg-[#007AFF]" />
                        </div>
                      </div>
                      <span className="text-[9.5px] font-bold text-slate-200 text-center truncate w-full">Safari</span>
                    </div>

                    {/* MESSAGES ICON */}
                    <div 
                      onClick={() => playSoundEffect('tap')}
                      className="flex flex-col items-center gap-1 group cursor-pointer"
                    >
                      <div className="w-11 h-11 bg-emerald-400 rounded-[11px] flex items-center justify-center shadow-lg transform group-active:scale-95 transition-all">
                        <Mail className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-[9.5px] font-bold text-slate-200 text-center truncate w-full">Messages</span>
                    </div>

                    {/* APP STORE ICON */}
                    <div 
                      onClick={() => playSoundEffect('tap')}
                      className="flex flex-col items-center gap-1 group cursor-pointer"
                    >
                      <div className="w-11 h-11 bg-[#007AFF] rounded-[11px] flex items-center justify-center shadow-lg transform group-active:scale-95 transition-all">
                        <div className="text-white font-sans font-black text-xs tracking-wider">A</div>
                      </div>
                      <span className="text-[9.5px] font-bold text-slate-200 text-center truncate w-full">App Store</span>
                    </div>

                    {/* COMPASS ICON */}
                    <div 
                      onClick={() => playSoundEffect('tap')}
                      className="flex flex-col items-center gap-1 group cursor-pointer"
                    >
                      <div className="w-11 h-11 bg-zinc-900 rounded-[11px] flex items-center justify-center shadow-lg transform group-active:scale-95 transition-all">
                        <Compass className="w-5 h-5 text-rose-500 fill-rose-500/20" />
                      </div>
                      <span className="text-[9.5px] font-bold text-slate-200 text-center truncate w-full">Compass</span>
                    </div>
                  </div>

                  {/* iOS Style Bottom Translucent Dock */}
                  <div className="bg-white/10 dark:bg-black/25 backdrop-blur-xl border border-white/5 rounded-3xl py-2.5 px-4 flex items-center justify-around mx-1 mb-8 shadow-2xl relative">
                    <div onClick={() => playSoundEffect('tap')} className="cursor-pointer active:scale-90 transition-transform">
                      <div className="w-11 h-11 bg-emerald-400 rounded-[11px] flex items-center justify-center shadow-md">
                        <Mail className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <div onClick={() => playSoundEffect('tap')} className="cursor-pointer active:scale-90 transition-transform">
                      <div className="w-11 h-11 bg-white rounded-[11px] flex items-center justify-center shadow-md overflow-hidden relative">
                        <div className="w-8 h-8 rounded-full border-[1.5px] border-blue-400 flex items-center justify-center rotate-[60deg]">
                          <div className="w-0.5 h-6 bg-[#FF3B30] relative before:absolute before:bottom-0 before:left-0 before:w-0.5 before:h-3 before:bg-[#007AFF]" />
                        </div>
                      </div>
                    </div>
                    <div onClick={() => playSoundEffect('tap')} className="cursor-pointer active:scale-90 transition-transform">
                      <div className="w-11 h-11 bg-[#22C55E] rounded-[11px] flex items-center justify-center shadow-md">
                        <Smartphone className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <div onClick={() => { playSoundEffect('complete'); setIsMinimized(false); }} className="cursor-pointer active:scale-90 transition-transform relative group" title="Return to Swift Driver app">
                      <div className="w-11 h-11 bg-[#13AA52] rounded-[11px] flex items-center justify-center shadow-md">
                        <Navigation className="w-5 h-5 text-white rotate-45" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* 1. HOME TAB COMPONENT VIEW */}
              {activeTab === 'home' && (
                <div className="flex-1 flex flex-col relative overflow-hidden">
                  
                  {/* APP UPPER SHELF BAR (Swift Header) */}
                  <nav className={`h-11 flex items-center justify-between shrink-0 select-none z-10 shadow-sm border-b transition-colors duration-200 px-3 ${darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-gray-100 text-gray-900'}`}>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => { playSoundEffect('tap'); setIsSideMenuOpen(true); }}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition ${darkMode ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                      >
                        <Menu className="w-3.5 h-3.5" />
                      </button>
                      <span className={`text-sm font-black font-sans tracking-tight flex items-baseline gap-0.5 ${darkMode ? 'text-zinc-100' : 'text-gray-905'}`}>
                        {mode === 'food' ? 'Swift Eats' : 'Swift Driver'}
                      </span>
                    </div>

                    {/* Online switcher on the header */}
                    <div className="flex items-center gap-2.5">
                      {/* Sun/Moon Toggle button */}
                      <button
                        onClick={() => { playSoundEffect('tap'); setDarkMode(!darkMode); }}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${darkMode ? 'bg-zinc-800 text-yellow-450 hover:bg-zinc-750' : 'bg-amber-50 text-amber-600 border border-amber-100 hover:bg-amber-100'}`}
                        title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                      >
                        {darkMode ? <Sun className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400/20" /> : <Moon className="w-3.5 h-3.5 fill-amber-600/10" />}
                      </button>

                      <button
                        onClick={() => {
                          playSoundEffect('tap');
                          handleSetOnline(!isOnline);
                        }}
                        className={`px-2 py-0.5 rounded-full text-[9px] font-sans font-black uppercase tracking-wider flex items-center gap-1.5 transition-all border shrink-0 cursor-pointer active:scale-95 ${
                          isOnline 
                            ? 'bg-[#13AA52]/10 text-[#13AA52] border-[#13AA52]/20 hover:bg-[#13AA52]/20' 
                            : 'bg-rose-500 text-white border-rose-600 hover:bg-rose-600 shadow-sm animate-pulse'
                        }`}
                        title={isOnline ? "Switch to Offline Mode" : "Switch to Online Mode"}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-[#13AA52] animate-ping' : 'bg-white'}`} />
                        {isOnline ? 'Active' : 'Go Online'}
                      </button>
                    </div>
                  </nav>

                  {/* TACTICAL SWITCHER BAR */}
                  <div className={`h-10 border-b flex items-center justify-center gap-1 shrink-0 px-3 select-none ${darkMode ? 'bg-zinc-900/60 border-zinc-800' : 'bg-gray-50 border-gray-150'}`}>
                    <button
                      onClick={() => { playSoundEffect('tap'); setHomeView('command'); }}
                      className={`flex-1 max-w-[180px] h-7 rounded-lg text-[9.5px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition ${
                        homeView === 'command'
                          ? 'bg-[#13AA52] text-white shadow-xs'
                          : darkMode ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200' : 'text-gray-550 hover:bg-gray-100 hover:text-gray-800'
                      }`}
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      Command Centre
                    </button>
                    <button
                      onClick={() => { playSoundEffect('tap'); setHomeView('map'); }}
                      className={`flex-1 max-w-[180px] h-7 rounded-lg text-[9.5px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition ${
                        homeView === 'map'
                          ? 'bg-[#13AA52] text-white shadow-xs'
                          : darkMode ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200' : 'text-gray-550 hover:bg-gray-100 hover:text-gray-800'
                      }`}
                    >
                      <Map className="w-3.5 h-3.5" />
                      Live Map Simulator
                    </button>
                  </div>

                  {homeView === 'command' ? (
                    <CommandCentre
                      isOnline={isOnline}
                      setIsOnline={handleSetOnline}
                      mode={mode}
                      setMode={setMode}
                      stats={stats}
                      setStats={setStats}
                      driverPoints={driverPoints}
                      setDriverPoints={setDriverPoints}
                      dailyEarningsGoal={dailyEarningsGoal}
                      setDailyEarningsGoal={setDailyEarningsGoal}
                      scheduledBookings={scheduledBookings}
                      setScheduledBookings={setScheduledBookings}
                      selectedPrebooking={selectedPrebooking}
                      setSelectedPrebooking={setSelectedPrebooking}
                      isOnBreak={isOnBreak}
                      setIsOnBreak={setIsOnBreak}
                      darkMode={darkMode}
                      playSoundEffect={playSoundEffect}
                      appendLog={appendLog}
                      currentCity={currentCity}
                      setCurrentCity={setCurrentCity}
                      surgeLevel={surgeLevel}
                      setSurgeLevel={setSurgeLevel}
                      selectedPeak={selectedPeak}
                      setSelectedPeak={setSelectedPeak}
                      batteryLevel={batteryLevel}
                      setBatteryLevel={setBatteryLevel}
                      streakCount={streakCount}
                      headHomeMode={headHomeMode}
                      setHeadHomeMode={setHeadHomeMode}
                      homeAddress={homeAddress}
                      setHomeAddress={setHomeAddress}
                      favZones={favZones}
                      setFavZones={setFavZones}
                      milesDriven={milesDriven}
                      setMilesDriven={setMilesDriven}
                      activeDrivingTime={activeDrivingTime}
                      setActiveDrivingTime={setActiveDrivingTime}
                      breakTimeRemaining={breakTimeRemaining}
                      setBreakTimeRemaining={setBreakTimeRemaining}
                    />
                  ) : (
                    <>
                      {/* HIGH COMPLIANCE / OFFLINE STATUS RIBBONS */}
                  {!isInternetConnected && (
                    <div className="bg-orange-500 text-white text-[8.5px] font-black uppercase tracking-wider py-1 px-3 text-center flex items-center justify-center gap-1.5 z-10 animate-in slide-in-from-top duration-200">
                      <WifiOff className="w-3 h-3 text-white" />
                      <span>STANDALONE CACHE ACTIVE • CLOUD SYNC PAUSED</span>
                    </div>
                  )}
                  {useRealGPS && realCoords && (
                    <div className="bg-blue-600 text-white text-[8.5px] font-black uppercase tracking-wider py-1 px-3 text-center flex items-center justify-center gap-1.5 z-10 animate-in slide-in-from-top duration-200">
                      <Globe className="w-3 h-3 text-white" />
                      <span className="truncate">GPS LOCKED: {realCoords.address}</span>
                    </div>
                  )}

                  {/* MAP SIMULATOR AREA */}
                  <div className="flex-1 relative bg-[#f2f4f2] overflow-hidden">
                    {(() => {
                      const mapTripProgress = mode === 'food' && activeEatsJobs.length > 0
                        ? (() => {
                            const focusJob = activeEatsJobs.find(j => j.id === activeEatsJobId) || activeEatsJobs[0];
                            return {
                              stage: focusJob.stage,
                              currentRide: focusJob,
                              offerTimeRemaining: 0,
                              totalOfferTime: 12,
                              navigationProgress: focusJob.navigationProgress || 0,
                              etaMinutes: focusJob.etaMinutes || 0,
                            };
                          })()
                        : tripProgress;

                      return (
                        <MapSimulator
                          tripProgress={mapTripProgress}
                          isOnline={isOnline}
                          surgeLevel={surgeLevel}
                          onSpawnRideFromZone={handleSpawnRideFromZone}
                          mode={mode}
                          realCoords={realCoords}
                          useRealGPS={useRealGPS}
                          darkMode={darkMode}
                          simulateWandering={simulateWandering}
                          currentCity={currentCity}
                          faceVerified={faceVerified}
                          insuranceVerified={insuranceVerified}
                          onSetOnline={handleSetOnline}
                          boltCategories={boltCategories}
                          setActiveTab={setActiveTab}
                          selectedPeak={selectedPeak}
                          onSetMode={setMode}
                          onSetCurrentCity={setCurrentCity}
                          onSetMenuSubScreen={setMenuSubScreen}
                        />
                      );
                    })()}

                    {/* Floating stats header inside Home map when online and searching */}
                    {isOnline && tripProgress.stage === 'idle' && activeEatsJobs.length === 0 && (
                      <div className={`absolute top-3 left-3 right-3 backdrop-blur-md border rounded-xl p-2 flex items-center justify-between shadow-md z-15 animate-in fade-in duration-300 ${darkMode ? 'bg-zinc-900/95 border-zinc-800 text-zinc-100' : 'bg-white/95 border-gray-100 text-gray-950'}`}>
                        <div className={`text-center flex-1 border-r ${darkMode ? 'border-zinc-800' : 'border-gray-100'}`}>
                          <span className="text-[7px] text-gray-400 dark:text-zinc-450 uppercase font-bold block leading-none">Accept Rate</span>
                          <span className={`text-[10px] font-bold font-mono tracking-tight ${darkMode ? 'text-zinc-100' : 'text-gray-900'}`}>{stats.acceptanceRate}%</span>
                        </div>
                        <div className={`text-center flex-1 border-r ${darkMode ? 'border-zinc-800' : 'border-gray-100'}`}>
                          <span className="text-[7px] text-gray-400 dark:text-zinc-450 uppercase font-bold block leading-none">Rating Stars</span>
                          <span className="text-[10px] font-bold font-mono text-amber-500 flex items-center justify-center gap-0.5 leading-none">
                            {stats.rating.toFixed(1)} <Star className="w-2 h-2 text-amber-500 fill-amber-500 animate-pulse" />
                          </span>
                        </div>
                        <div className={`text-center flex-1 border-r ${darkMode ? 'border-zinc-800' : 'border-gray-100'}`}>
                          <span className="text-[7px] text-gray-400 dark:text-zinc-450 uppercase font-bold block leading-none">Today's Total</span>
                          <span className="text-[10px] font-bold font-mono text-[#13AA52] block leading-none">£{stats.todayEarnings.toFixed(2)}</span>
                          <span className="text-[6.5px] text-gray-400/80 font-bold block mt-0.5 font-sans leading-none">Goal £{dailyEarningsGoal}</span>
                        </div>
                        <div className="text-center flex-1">
                          <span className="text-[7px] text-gray-400 dark:text-zinc-450 uppercase font-bold block leading-none">Badge Level</span>
                          <span className="text-[10px] font-extrabold font-sans text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-0.5 leading-none mt-0.5">
                            {driverLevel.medal} {driverLevel.name}
                          </span>
                        </div>
                      </div>
                    )}



                    {/* Destination Filter Active Badge */}
                    {isOnline && mode === 'taxi' && tripProgress.stage === 'idle' && destinationActivated && destinationFilter.trim() && (
                      <div className={`absolute top-18 left-3 z-15 backdrop-blur-md border rounded-lg px-2 py-1 flex items-center gap-1.5 shadow-sm animate-in fade-in slide-in-from-left duration-200 text-[9px] font-black uppercase tracking-wider ${
                        darkMode ? 'bg-zinc-900/90 border-[#13AA52] text-[#13AA52]' : 'bg-emerald-50/90 border-[#13AA52] text-[#13AA52]'
                      }`}>
                        <Compass className="w-3 h-3 text-[#13AA52] animate-spin" style={{ animationDuration: '3500ms' }} />
                        <span>Filter: {destinationFilter}</span>
                        <button
                          onClick={() => { playSoundEffect('tap'); setDestinationActivated(false); }}
                          className="w-3.5 h-3.5 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500 flex items-center justify-center font-mono font-black"
                        >
                          ×
                        </button>
                      </div>
                    )}

                    {/* Floating Controls Widget Stack */}
                    <div className="absolute right-3.5 bottom-3.5 z-15 flex flex-col gap-2.5">
                      {/* AI Support Co-Pilot Button */}
                      <button
                        onClick={() => { playSoundEffect('tap'); setIsCoachOpen(true); }}
                        className="w-10 h-10 rounded-full shadow-lg border backdrop-blur-md flex items-center justify-center transition active:scale-90 cursor-pointer bg-gradient-to-tr from-emerald-500 to-teal-400 border-emerald-400 text-slate-950 hover:brightness-110 relative group"
                        title="AI Support Chat & Co-Pilot"
                      >
                        <Sparkles className="w-5 h-5 text-slate-950 fill-slate-950 animate-pulse" />
                        <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-white"></span>
                        </span>
                      </button>

                      {/* Destination Filter Button */}
                      {isOnline && mode === 'taxi' && tripProgress.stage === 'idle' && (
                        <button
                          onClick={() => { playSoundEffect('tap'); setShowDestinationSettings(true); }}
                          className={`w-10 h-10 rounded-full shadow-lg border backdrop-blur-md flex items-center justify-center transition active:scale-90 cursor-pointer ${
                            destinationActivated 
                              ? 'bg-[#13AA52] border-[#13AA52] text-white' 
                              : darkMode
                                ? 'bg-zinc-900/95 border-zinc-800 text-zinc-200 hover:bg-zinc-800'
                                : 'bg-white/95 border-gray-200 text-gray-700 hover:bg-gray-100'
                          }`}
                          title="Destination Filter (My Way)"
                        >
                          <Compass className={`w-5 h-5 ${destinationActivated ? 'animate-spin' : ''}`} style={{ animationDuration: '3000ms' }} />
                        </button>
                      )}
                    </div>

                    {/* Destination Filter Slide-Up Panel Modal */}
                    {showDestinationSettings && (
                      <div className="absolute inset-x-0 bottom-0 top-0 bg-slate-950/70 z-30 backdrop-blur-xs flex items-end justify-center animate-in fade-in duration-200">
                        <div className={`w-full rounded-t-[25px] border-t p-5 flex flex-col gap-4 max-h-[75%] select-none animate-in slide-in-from-bottom duration-250 ${
                          darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-gray-150 text-gray-900'
                        }`}>
                          {/* Modal Header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 flex-1">
                              <Compass className="w-4 h-4 text-[#13AA52]" />
                              <span className="text-xs font-black uppercase tracking-wider">Destination (My Way)</span>
                            </div>
                            <button
                              onClick={() => { playSoundEffect('tap'); setShowDestinationSettings(false); }}
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${darkMode ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                            >
                              ✕
                            </button>
                          </div>

                          {/* Modal Body */}
                          <div className="flex flex-col gap-2.5 text-left">
                            <p className="text-[10px] text-gray-400 font-bold leading-normal">
                              Set a specific destination area (e.g. Heathrow, Birmingham, Chelsea). Once activated, the simulator will strictly route incoming match dispatches ending near this local hub.
                            </p>
                            
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={destinationFilter}
                                onChange={(e) => setDestinationFilter(e.target.value)}
                                placeholder="Enter airport, area or city..."
                                className={`flex-1 px-3 py-2 border rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#13AA52] ${
                                  darkMode 
                                    ? 'bg-zinc-950 border-zinc-850 text-zinc-100' 
                                    : 'bg-gray-50 border-gray-200 text-gray-900'
                                }`}
                              />
                              {destinationFilter && (
                                <button
                                  onClick={() => { playSoundEffect('tap'); setDestinationFilter(''); }}
                                  className={`px-3 py-2 text-xs font-bold rounded-xl ${
                                    darkMode ? 'bg-zinc-800 hover:bg-zinc-750' : 'bg-gray-100 hover:bg-gray-150'
                                  }`}
                                >
                                  Clear
                                </button>
                              )}
                            </div>

                            {/* Preset destination shortcuts */}
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {['Heathrow LHR', 'City Center', 'Main Train Station', 'Airport Terminals', 'Birmingham Core'].map((preset) => (
                                <button
                                  key={preset}
                                  onClick={() => { playSoundEffect('tap'); setDestinationFilter(preset); }}
                                  className={`text-[8px] font-black uppercase tracking-wider px-2 py-1 rounded-md border ${
                                    destinationFilter === preset
                                      ? 'bg-[#13AA52]/10 border-[#13AA52] text-[#13AA52]'
                                      : darkMode
                                        ? 'bg-zinc-950/40 border-zinc-850 text-zinc-400 hover:bg-zinc-800'
                                        : 'bg-white border-zinc-150 text-zinc-500 hover:bg-zinc-50'
                                  }`}
                                >
                                  {preset}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Action Button */}
                          <div className="flex gap-2.5 mt-2">
                            <button
                              onClick={() => {
                                playSoundEffect('tap');
                                setDestinationActivated(false);
                                setShowDestinationSettings(false);
                                appendLog("📍 Destination filter disabled.", "info");
                              }}
                              className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide border transition ${
                                darkMode 
                                  ? 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-850' 
                                  : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-100'
                              }`}
                            >
                              Turn Off
                            </button>
                            <button
                              disabled={!destinationFilter.trim()}
                              onClick={() => {
                                playSoundEffect('tap');
                                setDestinationActivated(true);
                                setShowDestinationSettings(false);
                                appendLog(`📍 Destination filter enabled targeting: "${destinationFilter}". All incoming offer arrivals will head here.`, "success");
                              }}
                              className={`flex-1 py-2 font-black text-[10px] uppercase tracking-wide rounded-xl transition ${
                                !destinationFilter.trim()
                                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                  : 'bg-[#13AA52] text-white hover:bg-[#0f8f44] cursor-pointer shadow-md shadow-emerald-500/10'
                              }`}
                            >
                              Activate Filter
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* BOTTOM INFO CARDS AND LISTS (Exactly replicating screenshots!) */}
                  {mode === 'food' && activeEatsJobs.length > 0 && isOnline ? (
                    /* MULTI-DELIVERY HUD CONTROLLER (EATS MODE) */
                    <div className={`border-t p-3 shrink-0 flex flex-col gap-3 select-none z-10 shadow-lg transition-colors duration-250 ${darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-gray-100 text-gray-900'}`}>
                      {/* Tabs selector for concurrent list */}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-[#13AA52] tracking-wider leading-none">
                          Active Orders • {activeEatsJobs.length}/3 Accepted
                        </span>
                        
                        {/* Emergency simulation cancel buttons */}
                        <button
                          onClick={() => {
                            if (confirm("Cancel all accepted orders and return to idle?")) {
                              setActiveEatsJobs([]);
                              setActiveEatsJobId(null);
                              appendLog("🔌 Multi-delivery queues cleared by dispatch directive.", "warn");
                            }
                          }}
                          className="text-[9px] text-red-500 hover:text-red-750 font-bold leading-none"
                        >
                          Cancel All Matches
                        </button>
                      </div>

                      {/* Horizontal pill list of jobs */}
                      <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
                        {activeEatsJobs.map((job, idx) => {
                          const isFocused = job.id === activeEatsJobId || (!activeEatsJobId && idx === 0);
                          return (
                            <button
                              key={job.id}
                              onClick={() => { playSoundEffect('tap'); setActiveEatsJobId(job.id); }}
                              className={`px-3 py-1.5 rounded-full text-[10px] font-black transition-all whitespace-nowrap active:scale-95 flex items-center gap-1.5 shrink-0 ${
                                isFocused
                                  ? 'bg-[#13AA52] text-white shadow-md'
                                  : (darkMode ? 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-750' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
                              }`}
                            >
                              <div className={`w-1.5 h-1.5 rounded-full ${
                                job.stage === 'arrived_destination' ? 'bg-red-500 animate-ping' : 'bg-emerald-300'
                              }`} />
                              Order #{idx + 1}
                            </button>
                          );
                        })}
                      </div>

                      {/* Details of the focused active delivery job */}
                      {(() => {
                        const selectedJob = activeEatsJobs.find(j => j.id === activeEatsJobId) || activeEatsJobs[0];
                        if (!selectedJob) return null;

                        const stagesSeq = ['to_pickup', 'arrived_pickup', 'to_destination', 'arrived_destination'];
                        const curIdx = stagesSeq.indexOf(selectedJob.stage);

                        return (
                          <div className="flex flex-col gap-2.5 animate-in fade-in duration-200">
                            {/* Visual flow connector nodes */}
                            <div className="flex items-center justify-between px-2 pt-1 border-b border-dashed border-zinc-150 pb-2">
                              {['Pickup Restaurant', 'At Kitchen', 'Transit Delivery', 'Arrived'].map((term, sIdx) => {
                                const active = sIdx <= curIdx;
                                return (
                                  <div key={term} className="flex flex-col items-center gap-1 flex-1 relative">
                                    <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[7.5px] font-bold border transition ${
                                      active 
                                        ? 'bg-[#13AA52] text-white border-[#13AA52]'
                                        : (darkMode ? 'bg-zinc-950 text-zinc-600 border-zinc-800' : 'bg-white text-gray-300 border-gray-150')
                                    }`}>
                                      {sIdx + 1}
                                    </div>
                                    <span className={`text-[6.5px] text-center tracking-tight leading-none truncate w-14 ${
                                      sIdx === curIdx ? 'text-[#13AA52] font-black' : (darkMode ? 'text-zinc-500' : 'text-gray-400')
                                    }`}>
                                      {term}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Job restaurant & customer details */}
                            <div className={`border p-2.5 rounded-xl flex flex-col gap-2 transition-colors ${darkMode ? 'bg-zinc-950/40 border-zinc-800' : 'bg-gray-50/50 border-gray-100'}`}>
                              <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0">
                                  <span className="text-[7.5px] text-gray-450 font-extrabold uppercase tracking-wide block leading-none">
                                    Restaurant Pick up
                                  </span>
                                  <h4 className={`text-[11px] font-black tracking-tight mt-1 truncate ${darkMode ? 'text-zinc-100' : 'text-gray-900'}`}>
                                    {selectedJob.passengerName}
                                  </h4>
                                  <p className={`text-[9.5px] mt-0.5 truncate ${darkMode ? 'text-zinc-500' : 'text-gray-500'}`}>
                                    {selectedJob.pickupAddress}
                                  </p>
                                </div>
                                
                                <div className="text-right">
                                  <span className="text-xs font-black font-mono text-[#13AA52] block leading-none">
                                    £{selectedJob.fare.toFixed(2)}
                                  </span>
                                  <span className="text-[7px] text-gray-400 block mt-0.5 leading-none">Gross Fare</span>
                                </div>
                              </div>

                              <div className={`h-px ${darkMode ? 'bg-zinc-800' : 'bg-gray-100'}`} />

                              <div>
                                <span className="text-[7.5px] text-gray-450 font-extrabold uppercase tracking-wide block leading-none">
                                  Customer destination address
                                </span>
                                <p className={`text-[9.5px] font-medium mt-1 truncate ${darkMode ? 'text-zinc-350' : 'text-gray-750'}`}>
                                  {selectedJob.dropoffAddress}
                                </p>
                              </div>

                              <div className={`h-px ${darkMode ? 'bg-zinc-800' : 'bg-gray-100'}`} />

                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                  <span className="text-[8px] bg-emerald-500/10 text-[#13AA52] border border-emerald-500/20 px-1.5 py-0.5 rounded font-black max-w-[120px] truncate leading-none">
                                    🍗 {selectedJob.foodItem || 'Meatballs Hot combo & Chips'}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1 text-[8.5px] font-mono font-bold text-gray-400">
                                  <span>Transit:</span>
                                  <span className={`text-[#13AA52] font-black ${selectedJob.stage === 'to_pickup' || selectedJob.stage === 'to_destination' ? 'animate-pulse' : ''}`}>
                                    {selectedJob.stage === 'arrived_pickup' ? 'COLLECT NOW' : selectedJob.stage === 'arrived_destination' ? 'ARRIVED SPOT' : `${Math.ceil(selectedJob.etaMinutes || 5)} MINS`}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Interactive Confirmation Action Bar */}
                            <div className="mt-0.5">
                              {selectedJob.stage === 'to_pickup' && (
                                <div className="text-center bg-gray-50 border border-gray-150 rounded-xl py-2 px-1 text-[8.5px] text-gray-500 font-medium font-mono leading-none flex items-center justify-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#13AA52] animate-ping" />
                                  Driving to restaurant: <span className="font-bold text-[#13AA52]">{Math.round(selectedJob.navigationProgress)}% completed</span>
                                </div>
                              )}

                              {selectedJob.stage === 'arrived_pickup' && (
                                <button
                                  onClick={() => handleConfirmFoodPickup(selectedJob.id)}
                                  className="w-full h-11 bg-[#13AA52] hover:bg-[#0f8f44] text-white font-extrabold text-[11px] uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition duration-200 cursor-pointer animate-pulse"
                                >
                                  Confirm Pickup & Start transit ✓
                                </button>
                              )}

                              {selectedJob.stage === 'to_destination' && (
                                <div className="text-center bg-gray-50 border border-gray-150 rounded-xl py-2 px-1 text-[8.5px] text-gray-500 font-medium font-mono leading-none flex items-center justify-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                                  Driving to customer location: <span className="font-bold text-rose-500">{Math.round(selectedJob.navigationProgress)}% completed</span>
                                </div>
                              )}

                              {selectedJob.stage === 'arrived_destination' && (
                                <button
                                  onClick={() => handleCompleteFoodDelivery(selectedJob.id)}
                                  className="w-full h-11 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[11px] uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition duration-200 cursor-pointer"
                                >
                                  Complete Delivery ✅
                                </button>
                              )}

                              {/* Cancel selected food job */}
                              <div className="flex justify-center mt-2 pb-0.5">
                                <button
                                  onClick={() => {
                                    if (confirm("Decline this food order? Your acceptance score will fall.")) {
                                      handleCancelFoodTrip(selectedJob.id);
                                    }
                                  }}
                                  className="text-[9.5px] text-red-500 hover:text-red-750 font-bold border-b border-transparent hover:border-red-500 transition leading-none py-0.5"
                                >
                                  Cancel selected order
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ) : tripProgress.stage === 'idle' ? (
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
                              <div className="flex flex-col gap-2 mt-1.5">
                                <div className="text-center py-1 flex items-center justify-center gap-1.5">
                                  <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#13AA52]"></span>
                                  </span>
                                  <span className="text-[9.5px] text-[#13AA52] uppercase font-black tracking-widest">Active & Searching</span>
                                </div>
                                <SwipeButton
                                  text="Swipe to Go Offline"
                                  onSwipeComplete={() => handleSetOnline(false)}
                                  activeColorClass="bg-rose-600"
                                  icon={<X className="w-5 h-5 text-white" />}
                                />
                              </div>
                            ) : (
                              <div className="flex flex-col gap-2 mt-1.5">
                                <div className="text-center py-2.5 bg-amber-50/50 dark:bg-amber-500/5 border border-dashed border-amber-200 dark:border-amber-500/20 rounded-xl">
                                  <span className="text-[9.5px] text-amber-600 uppercase font-black tracking-widest block leading-none">Dispatcher Paused</span>
                                  <span className="text-[11px] text-amber-700 dark:text-amber-500 block mt-1 font-bold">Enjoying tea & biscuits in London 🇬🇧</span>
                                </div>
                                <SwipeButton
                                  text="Swipe to Go Offline"
                                  onSwipeComplete={() => handleSetOnline(false)}
                                  activeColorClass="bg-rose-600"
                                  icon={<X className="w-5 h-5 text-white" />}
                                />
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
                          <SwipeButton
                            text={
                              tripProgress.stage === 'to_pickup' ? 'Swipe: Arrived at pickup' :
                              tripProgress.stage === 'arrived_pickup' ? (mode === 'food' ? 'Swipe to Confirm Pickup' : 'Swipe to Start Ride') :
                              (mode === 'food' ? 'Swipe to Complete Delivery' : 'Swipe to Complete Ride')
                            }
                            onSwipeComplete={handleSlideUnlock}
                            activeColorClass={
                              tripProgress.stage === 'to_destination' || tripProgress.stage === 'arrived_destination' ? 'bg-[#ea4335]' : 'bg-[#13AA52]'
                            }
                            icon={
                              <ArrowRight className="w-5 h-5 text-white" />
                            }
                          />
                        </div>

                        {/* Force Cancel link */}
                        <button
                          onClick={() => {
                            if (confirm("Decline this job matches? Accept ratings will fall.")) {
                              if (mode === 'food') {
                                const selectedJob = activeEatsJobs.find(j => j.id === activeEatsJobId) || activeEatsJobs[0];
                                if (selectedJob) {
                                  handleCancelFoodTrip(selectedJob.id);
                                } else if (activeEatsJobId) {
                                  handleCancelFoodTrip(activeEatsJobId);
                                } else {
                                  handleCancelTrip();
                                }
                              } else {
                                handleCancelTrip();
                              }
                            }
                          }}
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
                        <div className="flex items-center justify-center gap-3.5 text-[10px] text-gray-500 font-bold border-b border-gray-50 pb-2 flex-wrap">
                          <span>📐 {tripProgress.currentRide.distance} km</span>
                          <span>•</span>
                          <span>⏱️ {tripProgress.currentRide.estimatedMinutes} mins</span>
                          {tripProgress.currentRide.surgeMultiplier > 1.0 && (
                            <>
                              <span>•</span>
                              <span className="text-[#13AA52] font-black uppercase">🔥 {tripProgress.currentRide.surgeMultiplier}x Surge</span>
                            </>
                          )}
                          {tripProgress.currentRide.qualityScore && (
                            <>
                              <span>•</span>
                              <span className={`px-1.5 py-0.2 rounded font-black uppercase text-[8.5px] ${
                                tripProgress.currentRide.qualityScore === 'Excellent' 
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                                  : tripProgress.currentRide.qualityScore === 'Good' 
                                    ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                                    : 'bg-gray-100 text-gray-850 border border-gray-200'
                              }`}>
                                💎 {tripProgress.currentRide.qualityScore} Pay
                              </span>
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

                    </>
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

                  {/* Day | Week | Month | Year pills selector */}
                  <div className="grid grid-cols-4 gap-1 border border-gray-100 rounded-full p-1 bg-gray-50/50 select-none">
                    {(['day', 'week', 'month', 'year'] as const).map((period) => (
                      <button
                        key={period}
                        onClick={() => { playSoundEffect('tap'); setEarningsPeriod(period); }}
                        className={`font-black text-[9.5px] py-1 rounded-full capitalize transition duration-150 ${
                          earningsPeriod === period
                            ? 'bg-[#13AA52] text-white shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {period}
                      </button>
                    ))}
                  </div>

                  {(() => {
                    let grossEarnings = stats.todayEarnings;
                    let ridesCount = stats.completedTripsCount;
                    let onlineTime = mode === 'taxi' ? '3h 45m' : '2h 30m';
                    let pointsStr = mode === 'taxi' ? '120' : '90';
                    let baseFare = stats.todayEarnings;
                    let bonusFare = mode === 'taxi' ? 15.00 : 6.50;
                    let titleLabel = "Today";

                    if (earningsPeriod === 'week') {
                      grossEarnings = stats.weeklyEarnings;
                      ridesCount = stats.completedTripsCount + 22;
                      onlineTime = mode === 'taxi' ? '24h 15m' : '18h 45m';
                      pointsStr = mode === 'taxi' ? '740' : '620';
                      baseFare = stats.weeklyEarnings;
                      bonusFare = mode === 'taxi' ? 75.00 : 35.00;
                      titleLabel = "This Week";
                    } else if (earningsPeriod === 'month') {
                      grossEarnings = stats.weeklyEarnings * 4.2 + 120.00;
                      ridesCount = stats.completedTripsCount + 94;
                      onlineTime = mode === 'taxi' ? '98h 30m' : '76h 15m';
                      pointsStr = mode === 'taxi' ? '3,120' : '2,480';
                      baseFare = stats.weeklyEarnings * 4.2 + 120.00;
                      bonusFare = mode === 'taxi' ? 320.00 : 160.00;
                      titleLabel = "This Month";
                    } else if (earningsPeriod === 'year') {
                      grossEarnings = stats.weeklyEarnings * 52.1 + 840.00;
                      ridesCount = stats.completedTripsCount + 1240;
                      onlineTime = mode === 'taxi' ? '1,240h' : '980h';
                      pointsStr = mode === 'taxi' ? '41,500' : '32,400';
                      baseFare = stats.weeklyEarnings * 52.1 + 840.00;
                      bonusFare = mode === 'taxi' ? 4200.00 : 2100.00;
                      titleLabel = "This Year";
                    }

                    const totalGross = baseFare + bonusFare;

                    return (
                      <>
                        {/* Large gross earnings layout */}
                        <div className="py-2.5 text-center shrink-0">
                          <span className="text-[10px] text-gray-400 font-bold uppercase block leading-none tracking-wider">{titleLabel}</span>
                          <h2 className="text-4.2xl font-black text-gray-900 font-mono tracking-tight mt-1.5 leading-none">
                            £{totalGross.toFixed(2)}
                          </h2>
                        </div>

                        {/* Summary metric matrix row */}
                        <div className="grid grid-cols-3 gap-2 text-center border-y border-gray-100 py-3 my-1 bg-gray-50/20 shrink-0">
                          <div className="flex flex-col">
                            <span className="text-gray-900 font-black font-mono text-sm leading-none">
                              {ridesCount}
                            </span>
                            <span className="text-gray-400 text-[8.5px] font-semibold uppercase mt-1 leading-none">Rides / Orders</span>
                          </div>
                          <div className="flex flex-col border-x border-gray-100">
                            <span className="text-gray-900 font-black font-mono text-sm leading-none">
                              {onlineTime}
                            </span>
                            <span className="text-gray-400 text-[8.5px] font-semibold uppercase mt-1 leading-none">Online time</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[#13AA52] font-black font-mono text-sm leading-none">
                              {pointsStr}
                            </span>
                            <span className="text-gray-400 text-[8.5px] font-semibold uppercase mt-1 leading-none">Points</span>
                          </div>
                        </div>

                        {/* Scrollable area wrapper */}
                        <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pt-2 text-[11px] text-gray-650 dark:text-zinc-300">
                          
                          {/* Dynamic Earnings Target Goal Tracker Card */}
                          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100/50 rounded-2xl p-3.5 mb-1 flex flex-col gap-3 shadow-xs select-none">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <Target className="w-4 h-4 text-emerald-600 animate-pulse" />
                                <span className="text-[10.5px] font-black text-emerald-800 uppercase tracking-wide">Daily Target Tracker</span>
                              </div>
                              {/* Target value selector pills */}
                              <div className="flex items-center gap-1">
                                {([50, 100, 200] as const).map(g => (
                                  <button
                                    key={g}
                                    onClick={() => {
                                      playSoundEffect('tap');
                                      setDailyEarningsGoal(g);
                                    }}
                                    className={`px-2 py-0.5 rounded text-[9px] font-extrabold font-mono transition-colors ${
                                      dailyEarningsGoal === g
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-emerald-100/40 text-emerald-700 hover:bg-emerald-100/80 border border-emerald-200/30'
                                    }`}
                                  >
                                    £{g}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Horizontal progress visualization */}
                            {(() => {
                              const pct = Math.min(100, Math.round((stats.todayEarnings / dailyEarningsGoal) * 100));
                              const remaining = Math.max(0, dailyEarningsGoal - stats.todayEarnings);
                              const isAchieved = stats.todayEarnings >= dailyEarningsGoal;
                              return (
                                <div className="flex flex-col gap-1.5">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="font-extrabold text-emerald-950 font-sans">
                                      Today's earnings: <span className="font-mono text-emerald-800 font-black">£{stats.todayEarnings.toFixed(2)}</span>
                                    </span>
                                    <span className="font-black font-mono text-emerald-700">
                                      {pct}%
                                    </span>
                                  </div>

                                  <div className="w-full h-2 rounded-full bg-emerald-200/30 overflow-hidden relative border border-emerald-200/25">
                                    <div 
                                      className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-500"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>

                                  <div className="flex items-center justify-between text-[9px] font-bold text-teal-850 mt-0.5">
                                    <span>{isAchieved ? "🎉 Bonus points goal achieved!" : `£${remaining.toFixed(2)} needed for +50 pts bonus`}</span>
                                    <span className="flex items-center gap-1 text-emerald-700">
                                      Milestone Tracker <Award className="w-2.5 h-2.5 text-emerald-600" />
                                    </span>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                          {/* Consecutive Trip Streak Widget */}
                          <div className="border border-amber-200/50 bg-amber-50/50 dark:bg-amber-950/10 rounded-2xl p-3.5 mb-1 flex flex-col gap-3 shadow-xs select-none">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <Flame className="w-4 h-4 text-amber-500 animate-pulse" />
                                <span className="text-[10.5px] font-black text-amber-850 dark:text-amber-400 uppercase tracking-wide">Consecutive Trip Streak</span>
                              </div>
                              <span className="text-[8.5px] font-black bg-amber-500 text-white px-1.5 py-0.2 rounded font-mono">STREAK: {streakCount}</span>
                            </div>
                            <p className="text-[9px] text-amber-700 dark:text-amber-350 leading-snug font-medium">
                              Complete trips consecutively to unlock massive bonuses! Resets if you cancel or let an offer expire.
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-center mt-0.5">
                              <div className="bg-white dark:bg-zinc-900 border border-amber-100 dark:border-amber-950/30 rounded-xl p-2 flex flex-col justify-between">
                                <span className="text-[10.5px] font-black font-mono text-amber-600">3-Trip Streak</span>
                                <span className="text-[9px] font-bold text-gray-500 dark:text-zinc-400 mt-0.5">£10.00 Bonus</span>
                                <div className="w-full bg-gray-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-2">
                                  <div className="h-full bg-amber-500 rounded-full transition-all duration-300" style={{ width: `${Math.min(100, (streakCount / 3) * 100)}%` }} />
                                </div>
                              </div>
                              <div className="bg-white dark:bg-zinc-900 border border-amber-100 dark:border-amber-950/30 rounded-xl p-2 flex flex-col justify-between">
                                <span className="text-[10.5px] font-black font-mono text-amber-600">5-Trip Streak</span>
                                <span className="text-[9px] font-bold text-gray-500 dark:text-zinc-400 mt-0.5">£25.00 Bonus</span>
                                <div className="w-full bg-gray-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-2">
                                  <div className="h-full bg-amber-500 rounded-full transition-all duration-300" style={{ width: `${Math.min(100, (streakCount / 5) * 100)}%` }} />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Driver Progression Level Status Widget */}
                          <div className={`border rounded-2xl p-3.5 mb-1 flex flex-col gap-3 shadow-xs select-none ${driverLevel.color}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[14px]">{driverLevel.medal}</span>
                                <span className="text-[10.5px] font-black uppercase tracking-wide text-slate-800 dark:text-zinc-100">Driver Level Progression</span>
                              </div>
                              <span className="text-[9px] font-black uppercase text-slate-500/80">Active Level</span>
                            </div>

                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1">
                                <h3 className="text-[13px] font-black text-slate-900 dark:text-white flex items-center gap-1.5 leading-tight">
                                  {driverLevel.label}
                                  <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 font-bold">({driverPoints} pts)</span>
                                </h3>
                                <p className="text-[9px] text-slate-500 dark:text-zinc-400 mt-1 font-medium leading-normal">
                                  {driverLevel.note}
                                </p>
                              </div>
                            </div>

                            {/* Progress meter to next rank tier */}
                            {driverLevel.name !== 'Platinum' && (
                              <div className="flex flex-col gap-1 mt-1">
                                <div className="flex justify-between items-center text-[9px] font-bold text-slate-650 dark:text-zinc-400">
                                  <span>Silver: 200 pts • Gold: 500 pts</span>
                                  <span className="font-mono">Next milestone: {driverLevel.nextGoal} pts</span>
                                </div>
                                <div className="w-full h-1.5 rounded-full bg-slate-200/50 dark:bg-zinc-800 overflow-hidden relative">
                                  <div 
                                    className="h-full bg-current rounded-full transition-all duration-500 opacity-80"
                                    style={{ width: `${Math.min(100, (driverPoints / driverLevel.nextGoal) * 100)}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex flex-col gap-2.5">
                            <div className="flex items-center justify-between">
                              <span>Base fare collected</span>
                              <span className="font-extrabold text-gray-900 font-mono">£{baseFare.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>London Bonnet Bonuses</span>
                              <span className="font-extrabold text-[#13AA52] font-mono">+£{bonusFare.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between border-t border-gray-150 pt-2 font-black text-gray-900 text-[12px]">
                              <span>Total simulated gross</span>
                              <span className="font-mono text-[#13AA52]">£{totalGross.toFixed(2)}</span>
                            </div>
                          </div>

                          {/* Historical Completed list logs */}
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between px-1">
                              <span className="text-[9.5px] text-gray-400 font-bold uppercase tracking-wider block">Completed Trip Receipts ({mode})</span>
                              <span className="text-[8px] text-gray-400 font-bold">{completedTrips.length} entries</span>
                            </div>

                            {/* Search bar and Filter row */}
                            <div className="flex flex-col gap-1.5 shrink-0 px-1">
                              {/* Search Input */}
                              <div className="relative">
                                <Search className="absolute left-2.5 top-2 w-3 h-3 text-gray-400 z-10" />
                                <input
                                  type="text"
                                  placeholder="Search passenger or route..."
                                  value={tripSearchText}
                                  onChange={(e) => setTripSearchText(e.target.value)}
                                  className="w-full text-[10px] font-semibold pl-8 pr-2 py-1 rounded-md border border-gray-200 outline-none bg-gray-50 focus:bg-white focus:border-gray-300 transition-all text-gray-800"
                                />
                                {tripSearchText && (
                                  <button
                                    onClick={() => setTripSearchText('')}
                                    className="absolute right-2 top-1.5 text-gray-400 hover:text-gray-650 font-black text-xs"
                                  >
                                    ×
                                  </button>
                                )}
                              </div>

                              {/* Filter Pills */}
                              <div className="flex items-center gap-1.5 text-[8px]">
                                <button
                                  onClick={() => { playSoundEffect('tap'); setTripTypeFilter('all'); }}
                                  className={`px-2 py-0.5 rounded font-bold transition-all ${
                                    tripTypeFilter === 'all'
                                      ? 'bg-gray-800 text-white'
                                      : 'bg-gray-100 text-gray-600 hover:bg-gray-150'
                                  }`}
                                >
                                  All Rides
                                </button>
                                <button
                                  onClick={() => { playSoundEffect('tap'); setTripTypeFilter('high_yield'); }}
                                  className={`px-2 py-0.5 rounded font-bold transition-all flex items-center gap-0.5 ${
                                    tripTypeFilter === 'high_yield'
                                      ? 'bg-amber-600 text-white'
                                      : 'bg-amber-100/60 text-amber-800 hover:bg-amber-100/90'
                                  }`}
                                >
                                  High Surge 🔥
                                </button>
                              </div>
                            </div>

                            {(() => {
                              // Perform logical match and filter passes
                              let items = [...completedTrips];
                              
                              if (tripSearchText.trim()) {
                                const q = tripSearchText.toLowerCase();
                                items = items.filter(item => 
                                  item.passengerName.toLowerCase().includes(q) ||
                                  item.pickupAddress.toLowerCase().includes(q) ||
                                  item.dropoffAddress.toLowerCase().includes(q)
                                );
                              }

                              if (tripTypeFilter === 'high_yield') {
                                items = items.filter(item => item.surgeMultiplier > 1.0);
                              }

                              if (items.length === 0) {
                                return (
                                  <div className="bg-gray-50 border border-dashed border-gray-150 p-4 rounded-xl text-center text-[10px] text-gray-400">
                                    No completed trips match these criteria. Complete rides or adjust parameters.
                                  </div>
                                );
                              }

                              return (
                                <div className="flex flex-col gap-1.5 max-h-[190px] overflow-y-auto pr-0.5 scrollbar-thin">
                                  {items.map(t => {
                                    const totalPaid = (t.fare * t.surgeMultiplier) + t.tip;
                                    return (
                                      <div 
                                        key={t.id} 
                                        className="bg-white border border-gray-100 hover:bg-gray-50/50 p-2 rounded flex items-center justify-between cursor-pointer transition active:scale-99 select-none text-left"
                                        title="Click to inspect invoice statement"
                                        onClick={() => {
                                          playSoundEffect('tap');
                                          setSelectedInvoiceTrip(t);
                                        }}
                                      >
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-1.5">
                                            <span className="font-extrabold text-gray-900 text-[10.5px] truncate">{t.passengerName}</span>
                                            {t.surgeMultiplier > 1.0 && (
                                              <span className="text-[7px] font-bold bg-amber-500/10 text-amber-600 px-1 rounded font-mono leading-none">
                                                x{t.surgeMultiplier.toFixed(1)} Surge
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-[7.5px] text-gray-400 truncate mt-0.5">{t.pickupAddress} ➔ {t.dropoffAddress}</p>
                                          <span className="text-[7px] text-gray-450 block font-mono mt-0.5">{t.timestamp}</span>
                                        </div>
                                        <div className="text-right ml-2 shrink-0">
                                          <span className="font-mono font-black text-[#13AA52] text-[10.5px] block text-right">
                                            +£{totalPaid.toFixed(2)}
                                          </span>
                                          <span className="text-[6.5px] text-gray-400 font-bold uppercase tracking-wider block mt-0.5">Invoice Detail</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                          </div>

                          {/* INVOICE / STATEMENT MODAL SHEET OVERLAY */}
                          {selectedInvoiceTrip && (
                            <div className="absolute inset-x-0 bottom-0 top-0 bg-black/55 z-[95] flex flex-col justify-end text-left select-none">
                              {/* Slide-up modal card */}
                              <div className="bg-white rounded-t-2xl p-4 flex flex-col gap-3 shadow-2xl max-h-[85%] overflow-y-auto animate-slide-up select-none border-t border-gray-100 text-left">
                                <div className="flex justify-between items-center pb-2 border-b border-gray-100 text-left">
                                  <div>
                                    <h4 className="text-xs font-black text-gray-900 uppercase">Trip Statement</h4>
                                    <span className="text-[7.5px] font-mono font-bold text-gray-400">INVOICE NO: #{selectedInvoiceTrip.id.toUpperCase()}</span>
                                  </div>
                                  <button
                                    onClick={() => { playSoundEffect('tap'); setSelectedInvoiceTrip(null); }}
                                    className="p-1 rounded bg-gray-100 hover:bg-gray-150 text-gray-600 font-black text-[9px] transition px-2.5"
                                  >
                                    Dismiss
                                  </button>
                                </div>

                                <div className="text-[9.5px] space-y-2.5 text-left">
                                  {/* Trip details heading */}
                                  <div className="grid grid-cols-2 gap-2 text-left bg-gray-55 p-2 rounded border border-gray-150">
                                    <div>
                                      <span className="text-gray-400 block text-[7.5px] uppercase tracking-wider font-bold">Partner Driver</span>
                                      <span className="font-bold text-gray-800">Marcus Sterling</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-400 block text-[7.5px] uppercase tracking-wider font-bold">Date & Time</span>
                                      <span className="font-bold text-gray-800">{selectedInvoiceTrip.timestamp}</span>
                                    </div>
                                  </div>

                                  {/* Route address summary */}
                                  <div className="space-y-1.5 text-left bg-gray-50/50 p-2 rounded border border-gray-100">
                                    <div className="flex gap-1.5 items-start">
                                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1" />
                                      <div>
                                        <span className="text-gray-400 text-[7px] uppercase font-bold tracking-wide">Pickup Point</span>
                                        <p className="font-semibold text-gray-905 leading-tight">{selectedInvoiceTrip.pickupAddress}</p>
                                      </div>
                                    </div>
                                    <div className="w-0.5 h-2 border-l border-dashed border-gray-300 ml-0.75" />
                                    <div className="flex gap-1.5 items-start">
                                      <div className="w-1.5 h-1.5 rounded-full bg-[#007AFF] mt-1" />
                                      <div>
                                        <span className="text-gray-400 text-[7px] uppercase font-bold tracking-wide">Dropoff Destination</span>
                                        <p className="font-semibold text-gray-905 leading-tight">{selectedInvoiceTrip.dropoffAddress}</p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Fare Splits Calculation */}
                                  <div className="border border-gray-100 rounded p-2.5 space-y-2 text-left">
                                    <span className="text-[8px] uppercase tracking-wider text-gray-400 font-extrabold block">Financial Division</span>
                                    
                                    <div className="flex justify-between">
                                      <span className="text-gray-500 font-medium">Base Payout</span>
                                      <span className="font-mono font-semibold text-gray-805">£{selectedInvoiceTrip.fare.toFixed(2)}</span>
                                    </div>
                                    
                                    <div className="flex justify-between">
                                      <span className="text-gray-500 font-medium">Surge Bonus</span>
                                      <span className="font-mono font-semibold text-amber-600">x{selectedInvoiceTrip.surgeMultiplier.toFixed(1)}</span>
                                    </div>

                                    <div className="flex justify-between">
                                      <span className="text-gray-500 font-medium">Voluntary Tips</span>
                                      <span className="font-mono font-semibold text-emerald-600">+£{selectedInvoiceTrip.tip.toFixed(2)}</span>
                                    </div>

                                    <div className="border-t border-dashed border-gray-150 pt-1.5 flex justify-between font-black text-gray-900 text-[10px]">
                                      <span>Authorized Net Payment</span>
                                      <span className="font-mono text-[#13AA52]">
                                        £{((selectedInvoiceTrip.fare * selectedInvoiceTrip.surgeMultiplier) + selectedInvoiceTrip.tip).toFixed(2)}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Standard security note */}
                                  <div className="text-[7.5px] text-gray-450 font-bold border-l-2 border-emerald-500 pl-2 text-left leading-normal">
                                    Completed via Swift Cashier Engine. Settled directly into John Daniel's registered Barclays settlement routing.
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
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
                <div className={`flex-1 flex flex-col overflow-hidden animate-in fade-in duration-250 select-none ${darkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-gray-900'}`}>
                  
                  {/* Back Navigation Header for sub-menus */}
                  {menuSubScreen !== 'main' && (
                    <div className={`h-11 px-3 border-b flex items-center justify-between shrink-0 transition-colors ${darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-gray-50/50 border-gray-150 text-gray-900'}`}>
                      <button
                        onClick={() => { playSoundEffect('tap'); setMenuSubScreen('main'); }}
                        className={`flex items-center gap-1 text-[11px] font-black uppercase tracking-wider px-2 py-1 rounded-lg ${darkMode ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'}`}
                      >
                        <ChevronLeft className="w-3.5 h-3.5" /> Back
                      </button>
                      <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest leading-none">
                        {menuSubScreen === 'vehicles' && 'My Vehicles'}
                        {menuSubScreen === 'availability' && 'My Availability'}
                        {menuSubScreen === 'settings' && 'Simulator Controls'}
                        {menuSubScreen === 'categories' && 'Ride Tiers'}
                        {menuSubScreen === 'quests' && 'Driver Quests'}
                        {menuSubScreen === 'about' && 'About Simulator'}
                        {menuSubScreen === 'notifications' && 'Notifications Inbox'}
                        {menuSubScreen === 'help' && 'Driver Help & Chatbot'}
                      </span>
                      <div className="w-12" />
                    </div>
                  )}

                  {/* SUB-SCREEN: MAIN PROFILE MENU DRAWER */}
                  {menuSubScreen === 'main' && (
                    <div className="flex-1 flex flex-col overflow-hidden">
                      {/* Driver Header Profile block */}
                      <div className={`p-4 border-b flex flex-col gap-2.5 transition-colors ${darkMode ? 'bg-zinc-900/40 border-zinc-850' : 'bg-gray-50/50 border-gray-100'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {/* Driver Picture Placeholder/Real Avatar */}
                            <div className={`w-12 h-12 rounded-full border bg-zinc-200 flex items-center justify-center text-gray-750 font-black text-sm relative overflow-hidden shrink-0 ${darkMode ? 'border-zinc-700 bg-zinc-800 text-zinc-300' : 'border-gray-200'}`}>
                              {user && user.photoURL ? (
                                <img src={user.photoURL} referrerPolicy="no-referrer" alt="Google Profile" className="w-full h-full object-cover" />
                              ) : faceSelfieUrl ? (
                                <img src={faceSelfieUrl} alt="Facial Profile" className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-6 h-6 text-gray-500" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <h4 className={`text-sm font-black leading-none truncate max-w-[150px] ${darkMode ? 'text-zinc-100' : 'text-gray-900'}`}>
                                {user ? (user.displayName || user.email) : "John Daniel"}
                              </h4>
                              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                <span className="bg-[#13AA52]/10 px-1.5 py-0.5 rounded-full text-[#13AA52] font-black text-[8.5px] w-fit font-mono">
                                  ★ 4.93 Score
                                </span>
                                {user ? (
                                  <span className="bg-blue-500/10 text-blue-650 font-extrabold text-[8.5px] px-1.5 py-0.5 rounded-full tracking-wider uppercase font-mono">
                                    CLOUD SYNCD
                                  </span>
                                ) : (
                                  <span className="bg-amber-500/10 text-amber-600 font-extrabold text-[8.5px] px-1.5 py-0.5 rounded-full tracking-wider uppercase font-mono">
                                    LOCAL STAGE
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Google Authentication Trigger button */}
                          <div>
                            {user ? (
                              <button
                                onClick={handleGoogleSignOut}
                                className="text-[9px] text-red-500 hover:bg-red-50/10 font-black px-2.5 py-1.5 border border-red-200 rounded-xl transition cursor-pointer font-sans"
                              >
                                Disconnect
                              </button>
                            ) : (
                              <button
                                onClick={handleGoogleSignIn}
                                className="bg-[#4285F4] hover:bg-[#357ae8] text-white text-[9px] font-black px-2.5 py-1.5 rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer font-sans"
                              >
                                <User className="w-3" />
                                <span>Link Google</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Primary Navigation list container */}
                      <div className="flex-1 overflow-y-auto p-2.5 flex flex-col space-y-1">
                        
                        {/* 1. My availability */}
                        <button 
                          onClick={() => { playSoundEffect('tap'); setMenuSubScreen('availability'); }}
                          className={`flex items-center justify-between py-3 px-2.5 rounded-xl transition text-left text-[11px] font-extrabold ${darkMode ? 'hover:bg-zinc-900 text-zinc-100' : 'hover:bg-gray-100 text-gray-800'}`}
                        >
                          <div className="flex items-center gap-3">
                            <Clock className="w-4 h-4 text-[#13AA52]" />
                            <div className="flex flex-col">
                              <span>My availability</span>
                              <span className="text-[7.5px] text-gray-400 font-medium font-bold">Auto-dispatch hours</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-gray-400 font-medium text-[9px]">
                            <span>Daily 24/7</span>
                            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                          </div>
                        </button>

                        {/* 2. My vehicles */}
                        <button 
                          onClick={() => { playSoundEffect('tap'); setMenuSubScreen('vehicles'); }}
                          className={`flex items-center justify-between py-3 px-2.5 rounded-xl transition text-left text-[11px] font-extrabold ${darkMode ? 'hover:bg-zinc-900 text-zinc-100' : 'hover:bg-gray-100 text-gray-800'}`}
                        >
                          <div className="flex items-center gap-3">
                            <Car className="w-4 h-4 text-blue-500" />
                            <div className="flex flex-col">
                              <span>My vehicles</span>
                              <span className="text-[7.5px] text-gray-400 font-medium font-bold">Licensed hire vectors</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-gray-400 font-medium text-[9px]">
                            <span className="bg-[#13AA52]/10 text-[#13AA52] text-[8px] font-black px-1.5 py-0.2 rounded font-mono">TOYOTA AURIS</span>
                            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                          </div>
                        </button>

                        {/* Bolt Ride Categories setting selection */}
                        {mode === 'taxi' && (
                          <button 
                            onClick={() => { playSoundEffect('tap'); setMenuSubScreen('categories'); }}
                            className={`flex items-center justify-between py-3 px-2.5 rounded-xl transition text-left text-[11px] font-extrabold ${darkMode ? 'hover:bg-zinc-900 text-zinc-100' : 'hover:bg-gray-100 text-gray-800'}`}
                          >
                            <div className="flex items-center gap-3">
                              <Zap className="w-4 h-4 text-amber-500 fill-amber-500/20" />
                              <div className="flex flex-col">
                                <span>Ride Categories</span>
                                <span className="text-[7.5px] text-gray-400 font-medium font-bold font-sans">Select active booking tiers</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 text-gray-400 font-mono text-[8.5px]">
                              <span className="bg-amber-500/10 text-amber-600 text-[8px] font-black px-1.5 py-0.2 rounded font-mono uppercase">{boltCategories.length} Active</span>
                              <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                            </div>
                          </button>
                        )}

                        {/* Driver Quests & Milestones setting selection */}
                        <button 
                          onClick={() => { playSoundEffect('tap'); setMenuSubScreen('quests'); }}
                          className={`flex items-center justify-between py-3 px-2.5 rounded-xl transition text-left text-[11px] font-extrabold ${darkMode ? 'hover:bg-zinc-900 text-zinc-100' : 'hover:bg-gray-100 text-gray-800'}`}
                        >
                          <div className="flex items-center gap-3">
                            <Sparkles className="w-4 h-4 text-purple-500" />
                            <div className="flex flex-col">
                              <span>Driver Quests & Milestones</span>
                              <span className="text-[7.5px] text-gray-400 font-medium font-bold font-sans">Earn consecutive trip bonuses</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-[#13AA52] font-mono text-[8.5px]">
                            <span className="bg-emerald-500/10 text-[#13AA52] text-[8px] font-black px-1.5 py-0.2 rounded font-mono">
                              {completedQuestIds.length}/{quests.length} DONE
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                          </div>
                        </button>

                        {/* 3. Notifications */}
                        <button 
                          onClick={() => { playSoundEffect('tap'); setMenuSubScreen('notifications'); }}
                          className={`flex items-center justify-between py-3 px-2.5 rounded-xl transition text-left text-[11px] font-extrabold ${darkMode ? 'hover:bg-zinc-900 text-zinc-100' : 'hover:bg-gray-100 text-gray-800'}`}
                        >
                          <div className="flex items-center gap-3">
                            <Bell className="w-4 h-4 text-amber-500" />
                            <div className="flex flex-col">
                              <span>Notifications</span>
                              <span className="text-[7.5px] text-gray-400 font-medium font-bold">Inbox matched briefings</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {notifications.filter(n => !n.read).length > 0 && (
                              <span className="bg-red-500 text-white font-black text-[9px] px-2 py-0.5 rounded-full leading-none">
                                {notifications.filter(n => !n.read).length}
                              </span>
                            )}
                            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                          </div>
                        </button>

                        {/* 4. Help & support */}
                        <button 
                          onClick={() => { playSoundEffect('tap'); setMenuSubScreen('help'); }}
                          className={`flex items-center justify-between py-3 px-2.5 rounded-xl transition text-left text-[11px] font-extrabold ${darkMode ? 'hover:bg-zinc-900 text-zinc-100' : 'hover:bg-gray-100 text-gray-800'}`}
                        >
                          <div className="flex items-center gap-3">
                            <HelpCircle className="w-4 h-4 text-purple-500" />
                            <div className="flex flex-col">
                              <span>Help & support</span>
                              <span className="text-[7.5px] text-gray-400 font-medium font-bold">Help center portal</span>
                            </div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                        </button>

                        {/* 5. Settings / Simulator parameters */}
                        <button 
                          onClick={() => { playSoundEffect('tap'); setMenuSubScreen('settings'); }}
                          className={`flex items-center justify-between py-3 px-2.5 rounded-xl transition text-left text-[11px] font-extrabold ${darkMode ? 'hover:bg-zinc-900 text-zinc-100' : 'hover:bg-gray-100 text-gray-800'}`}
                        >
                          <div className="flex items-center gap-3">
                            <Settings className="w-4 h-4 text-orange-500" />
                            <div className="flex flex-col">
                              <span>Settings</span>
                              <span className="text-[7.5px] text-gray-400 font-medium font-bold">Admin & simulation options</span>
                            </div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                        </button>

                        {/* 6. About Swift Driver */}
                        <button 
                          onClick={() => { playSoundEffect('tap'); setMenuSubScreen('about'); }}
                          className={`flex items-center justify-between py-3 px-2.5 rounded-xl transition text-left text-[11px] font-extrabold ${darkMode ? 'hover:bg-zinc-900 text-zinc-100' : 'hover:bg-gray-100 text-gray-800'}`}
                        >
                          <div className="flex items-center gap-3">
                            <Info className="w-4 h-4 text-zinc-400" />
                            <div className="flex flex-col">
                              <span>About Swift Driver</span>
                              <span className="text-[7.5px] text-gray-400 font-medium font-bold">Simulator metadata</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-gray-400 font-mono text-[8.5px]">
                            <span>v3.0</span>
                            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                          </div>
                        </button>

                        {/* COMPLIANCE MODULE CARDS INSIDE MAIN DRAWER */}
                        <div className="pt-4 pb-2 border-t border-gray-100 mt-2 flex flex-col gap-3">
                          
                          {/* Face check scan card */}
                          <div className={`p-3 rounded-2xl border text-left flex flex-col gap-1.5 ${darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-gray-50 border-gray-150 text-gray-850'}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 font-black uppercase text-[8.5px] font-mono tracking-wider">
                                <Video className="w-3.5 h-3.5 text-[#13AA52]" />
                                <span>Biometrics validation</span>
                              </div>
                              <span className={`text-[7.5px] font-extrabold font-mono px-1.5 py-0.2 rounded-full ${faceVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-650 animate-pulse'}`}>
                                {faceVerified ? 'VERIFIED ✓' : 'OUTSTANDING'}
                              </span>
                            </div>
                            <p className="text-[9.2px] text-gray-400 leading-tight">
                              All Swift operators must register daily biometric scans before completing matches.
                            </p>
                            {faceSelfieUrl && (
                              <div className="flex items-center gap-2 bg-white/20 border border-black/5 p-1.5 rounded-lg">
                                <img src={faceSelfieUrl} alt="Selfie" className="w-5 h-5 rounded-full object-cover" />
                                <span className="text-[7.5px] font-mono text-zinc-500">Selfie Registered (99.8% Match)</span>
                              </div>
                            )}
                            <button
                              onClick={() => { playSoundEffect('tap'); setShowFaceScanner(true); }}
                              className="w-full py-1.5 bg-[#13AA52] hover:bg-[#119949] text-white rounded-lg text-[9px] font-black uppercase tracking-wider text-center"
                            >
                              Scan Face selfie ➔
                            </button>
                          </div>

                          {/* Daily Identity OTP Verification card */}
                          <div className={`p-3 rounded-2xl border text-left flex flex-col gap-1.5 ${darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-gray-50 border-gray-150 text-gray-850'}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 font-black uppercase text-[8.5px] font-mono tracking-wider text-purple-500">
                                <Mail className="w-3.5 h-3.5 text-purple-500" />
                                <span>Daily Email Identity Pass</span>
                              </div>
                              <span className={`text-[7.5px] font-extrabold font-mono px-1.5 py-0.2 rounded-full ${otpVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-705 animate-pulse'}`}>
                                {otpVerified ? 'PASS ACTIVE ✓' : 'UNVERIFIED'}
                              </span>
                            </div>
                            <p className="text-[9.2px] text-gray-400 leading-tight">
                              Submit email identity verification daily to receive your secure 6-digit session key.
                            </p>

                            <div className="flex flex-col gap-1.5 mt-1 font-mono text-[8.5px]">
                              <div>
                                <span className="text-zinc-400 block text-[6.5px] uppercase font-bold">Driver Registry Email</span>
                                <div className="flex gap-1.5 mt-0.5 font-sans">
                                  <input 
                                    type="email" 
                                    value={otpEmail} 
                                    onChange={(e) => setOtpEmail(e.target.value)}
                                    placeholder="Enter registered email"
                                    className="bg-white border text-zinc-805 rounded px-2 py-1 w-full text-[8.5px] font-extrabold" 
                                  />
                                  <button
                                    onClick={handleRequestOtp}
                                    disabled={otpLoading || !otpEmail.includes('@')}
                                    className="px-2.5 bg-purple-600 text-white font-black text-[8px] uppercase tracking-wider rounded-lg hover:bg-purple-700 disabled:opacity-40 transition-colors cursor-pointer shrink-0"
                                  >
                                    Send
                                  </button>
                                </div>
                              </div>

                              {/* Simulator SMTP Bypass Option */}
                              {testOtpReceived && (
                                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 p-1.5 rounded-lg text-[8px] leading-tight flex flex-col gap-0.5 font-sans">
                                  <span className="font-extrabold uppercase">Simulator SMTP Bypass:</span>
                                  <span>OTP Code: <strong className="font-black underline tracking-wide text-amber-700 font-mono">{testOtpReceived}</strong></span>
                                </div>
                              )}

                              <div>
                                <span className="text-zinc-400 block text-[6.5px] uppercase font-bold">6-Digit Verification Code</span>
                                <div className="flex gap-1.5 mt-0.5">
                                  <input 
                                    type="text" 
                                    maxLength={6}
                                    placeholder="------"
                                    value={otpCode} 
                                    onChange={(e) => setOtpCode(e.target.value)}
                                    className="bg-white border text-zinc-805 rounded px-2 py-1 w-full text-center tracking-widest text-[9.5px] font-mono font-black" 
                                  />
                                  <button
                                    onClick={handleVerifyOtp}
                                    disabled={otpLoading || otpCode.length < 4}
                                    className="px-2.5 bg-[#13AA52] text-white font-black text-[8px] uppercase tracking-wider rounded-lg hover:bg-[#119949] disabled:opacity-40 transition-colors cursor-pointer shrink-0 font-sans"
                                  >
                                    Verify
                                  </button>
                                </div>
                              </div>
                            </div>

                            {otpStatusMsg.text && (
                              <div className={`text-[8.5px] leading-tight rounded-lg p-1.5 font-bold font-sans ${
                                otpStatusMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-600' :
                                otpStatusMsg.type === 'error' ? 'bg-rose-500/10 text-rose-600' :
                                'bg-zinc-100 text-zinc-600'
                              }`}>
                                {otpStatusMsg.text}
                              </div>
                            )}

                            {otpVerified && (
                              <button
                                onClick={() => { playSoundEffect('tap'); setOtpVerified(false); localStorage.setItem('swift_otp_verified', 'false'); }}
                                className="w-full mt-1 py-1 bg-zinc-200 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-250 text-[8px] font-black uppercase tracking-wider text-center rounded font-sans"
                              >
                                Clear daily session token
                              </button>
                            )}
                          </div>

                          {/* Insurance policy cover */}
                          <div className={`p-3 rounded-2xl border text-left flex flex-col gap-1.5 ${darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-gray-50 border-gray-150'}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5 font-black uppercase text-[8.5px] font-mono tracking-wider text-blue-500">
                                <Lock className="w-3.5 h-3.5 text-blue-500" />
                                <span>Hire & Reward insurance</span>
                              </div>
                              <span className={`text-[7.5px] font-extrabold font-mono px-1.5 py-0.2 rounded-full ${insuranceVerified ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                                {insuranceVerified ? 'CERTIFIED ✓' : 'UNINSURED'}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5 mt-1 font-mono text-[8.5px]">
                              <div>
                                <span className="text-zinc-400 block text-[6.5px]">POLICY NUMBER</span>
                                <input 
                                  type="text" 
                                  value={insurancePolicyNo} 
                                  onChange={(e) => setInsurancePolicyNo(e.target.value)}
                                  className="bg-white border rounded px-1 w-full text-zinc-800 font-extrabold py-0.5 mt-0.5 text-[8.2px]" 
                                />
                              </div>
                              <div>
                                <span className="text-zinc-400 block text-[6.5px]">EXPIRATION</span>
                                <input 
                                  type="date" 
                                  value={insuranceExpiry} 
                                  onChange={(e) => setInsuranceExpiry(e.target.value)}
                                  className="bg-white border rounded px-1 w-full text-zinc-805 font-extrabold py-0.5 mt-0.5 text-[8.2px]" 
                                />
                              </div>
                            </div>
                            <button
                              onClick={() => { playSoundEffect('tap'); setInsuranceVerified(!insuranceVerified); }}
                              className={`w-full py-1.2 rounded-lg text-[8.5px] font-black uppercase tracking-wider text-center ${insuranceVerified ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20 hover:bg-amber-100/50' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                            >
                              {insuranceVerified ? 'Suspend validation' : 'Verify active Certificate'}
                            </button>
                          </div>
                        </div>

                        {/* Standard logout element */}
                        <button
                          onClick={() => {
                            playSoundEffect('warn');
                            setIsOnline(false);
                            alert("Logged out of matching pool. Switched offline.");
                          }}
                          className="flex items-center gap-2 py-3 text-red-500 hover:bg-red-50/10 rounded-xl transition px-2 hover:translate-x-1"
                        >
                          <LogOut className="w-4 h-4 text-red-500" />
                          <span className="text-[11px] font-black">Log out</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* SUB-SCREEN: MY VEHICLES */}
                  {menuSubScreen === 'vehicles' && (
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 animate-in fade-in slide-in-from-right duration-250 text-left">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black tracking-tight">Approved Registry Vehicles</h3>
                        <span className="text-[8px] font-mono font-black uppercase text-gray-400 bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">TFL APPROVED</span>
                      </div>
                      
                      {/* Render dynamic vehicle list */}
                      <div className="flex flex-col gap-2.5">
                        {vehicles.map((vh) => (
                          <div 
                            key={vh.id} 
                            onClick={() => {
                              playSoundEffect('tap');
                              setVehicles(vehicles.map(v => ({
                                ...v,
                                active: v.id === vh.id
                              })));
                              appendLog(`🚗 Switched active driving vehicle to ${vh.name} (${vh.plate})`, 'success');
                            }}
                            className={`p-3.5 rounded-2xl border-2 flex flex-col gap-2 transition-all duration-200 cursor-pointer ${
                              vh.active 
                                ? (darkMode ? 'bg-zinc-900 border-[#13AA52]' : 'bg-emerald-50/20 border-[#13AA52]') 
                                : (darkMode ? 'bg-zinc-900/40 border-zinc-800 text-zinc-100 hover:border-zinc-700' : 'bg-gray-50 border-gray-150 text-gray-900 hover:border-gray-250')
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <span className={`text-[8px] font-black font-mono px-1.5 py-0.5 rounded uppercase leading-none ${
                                  vh.active ? 'bg-[#13AA52] text-white' : 'bg-zinc-350 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-300'
                                }`}>
                                  {vh.active ? 'ACTIVE DRIVING' : 'STANDBY'}
                                </span>
                                <h4 className="text-xs font-black text-gray-905 mt-1.5">{vh.name}</h4>
                                <p className="text-[9.5px] text-gray-500 dark:text-zinc-400">Class: {vh.class}</p>
                              </div>
                              <div className={`w-7.5 h-7.5 rounded-full flex items-center justify-center ${vh.active ? 'bg-[#13AA52]/10 text-[#13AA52]' : 'bg-zinc-200/50 dark:bg-zinc-800 text-zinc-400'}`}>
                                <Car className="w-4 h-4" />
                              </div>
                            </div>
                            <div className={`border-t border-dashed pt-2 flex items-center justify-between text-[9px] font-mono mt-1 ${vh.active ? 'border-[#13AA52]/20' : 'border-gray-300/40'}`}>
                              <div>
                                <span className="block text-[6.5px] text-gray-400">LICENSED PLATE</span>
                                <span className={`font-extrabold ${vh.active ? 'text-[#13AA52]' : 'text-gray-600 dark:text-zinc-300'}`}>{vh.plate}</span>
                              </div>
                              <div>
                                <span className="block text-[6.5px] text-gray-400">STATUS</span>
                                <span className={`font-extrabold ${vh.active ? 'text-[#13AA52]' : 'text-zinc-400'}`}>APPROVED ✓</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {showAddVehicleForm ? (
                        <div className={`p-4 rounded-2xl border flex flex-col gap-3 mt-2 ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-gray-50 border-gray-200'}`}>
                          <h4 className="text-xs font-black uppercase tracking-wider text-gray-400">Register Additional Vehicle</h4>
                          
                          <div className="flex flex-col gap-1">
                            <label className="text-[8px] font-bold text-gray-400 uppercase">Make & Model</label>
                            <input 
                              type="text" 
                              value={newVehicleName}
                              onChange={(e) => setNewVehicleName(e.target.value)}
                              placeholder="e.g. Tesla Model 3 (2022)"
                              className="px-2.5 py-1.5 rounded-xl border text-xs bg-white dark:bg-zinc-950 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold"
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-[8px] font-bold text-gray-400 uppercase">Licensed Plate Registration</label>
                            <input 
                              type="text" 
                              value={newVehiclePlate}
                              onChange={(e) => setNewVehiclePlate(e.target.value)}
                              placeholder="e.g. LC71 MTR"
                              className="px-2.5 py-1.5 rounded-xl border text-xs bg-white dark:bg-zinc-950 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold uppercase font-mono"
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-[8px] font-bold text-gray-400 uppercase">Vehicle dispatch Class</label>
                            <select 
                              value={newVehicleClass}
                              onChange={(e) => setNewVehicleClass(e.target.value)}
                              className="px-2.5 py-1.5 rounded-xl border text-xs bg-white dark:bg-zinc-950 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 font-bold"
                            >
                              <option value="Swift Ride, Cargo Carrier">Swift Standard Ride</option>
                              <option value="Swift Comfort, Executive Class">Swift Comfort (Luxury)</option>
                              <option value="Swift Eats Courier only">Swift Eats Delivery</option>
                            </select>
                          </div>

                          <div className="flex gap-2 mt-1">
                            <button
                              onClick={() => {
                                playSoundEffect('tap');
                                setShowAddVehicleForm(false);
                              }}
                              className="flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider border text-zinc-500 hover:bg-zinc-100/50"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => {
                                if (!newVehicleName || !newVehiclePlate) {
                                  alert("Please specify Make & Model and Licensed Plate number.");
                                  return;
                                }
                                playSoundEffect('complete');
                                const newId = String(vehicles.length + 1);
                                setVehicles([...vehicles, {
                                  id: newId,
                                  name: newVehicleName,
                                  plate: newVehiclePlate.toUpperCase(),
                                  class: newVehicleClass,
                                  active: false
                                }]);
                                appendLog(`📝 Initiated TFL audit: Added ${newVehicleName} [${newVehiclePlate.toUpperCase()}] on standby catalog!`, 'success');
                                setNewVehicleName('');
                                setNewVehiclePlate('');
                                setShowAddVehicleForm(false);
                              }}
                              className="flex-1 py-2 bg-[#13AA52] hover:bg-[#0f8f44] text-white rounded-xl text-[9px] font-black uppercase tracking-wider text-center"
                            >
                              Save TFL Vehicle
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => { playSoundEffect('tap'); setShowAddVehicleForm(true); }}
                          className={`py-3 text-[9px] uppercase tracking-wider rounded-xl transition text-center mt-2 font-black ${
                            darkMode ? 'bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-200' : 'bg-gray-105 hover:bg-gray-200 text-gray-700'
                          }`}
                        >
                          + Register another vehicle
                        </button>
                      )}
                    </div>
                  )}

                  {/* SUB-SCREEN: MY AVAILABILITY */}
                  {menuSubScreen === 'availability' && (
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5 animate-in fade-in slide-in-from-right duration-250 text-left">
                      <div>
                        <h3 className="text-sm font-black tracking-tight mb-1">Working Availability Control</h3>
                        <p className="text-[10px] text-gray-450 font-bold">Configure simulated working schedule parameters.</p>
                      </div>

                      <div className={`p-4 rounded-2xl border flex flex-col gap-3 ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-50 border-gray-150'}`}>
                        <span className="font-black text-[9px] uppercase tracking-wider text-[#13AA52] block leading-none antialiased">Automatic Dispatch Hours</span>
                        
                        {/* Weekly nodes */}
                        <div className="grid grid-cols-7 gap-1 text-center font-mono my-1">
                          {['M','T','W','T','F','S','S'].map((day, idx) => {
                            const active = workingDays[idx];
                            return (
                              <button 
                                key={idx} 
                                onClick={() => {
                                  playSoundEffect('tap');
                                  const nextDays = [...workingDays];
                                  nextDays[idx] = !nextDays[idx];
                                  setWorkingDays(nextDays);
                                  appendLog(`📅 Toggled scheduler: ${day} is now ${nextDays[idx] ? 'ACTIVE' : 'OFFLINE'}`, 'info');
                                }}
                                className="flex flex-col gap-1 items-center bg-transparent border-0 cursor-pointer focus:outline-none"
                              >
                                <span className="text-[8px] text-zinc-455">{day}</span>
                                <div className={`w-6 h-6 rounded-full text-[9px] font-extrabold flex items-center justify-center transition-all ${
                                  active 
                                    ? 'bg-[#13AA52] text-white' 
                                    : 'bg-gray-250 dark:bg-zinc-800 text-gray-400 dark:text-zinc-600'
                                }`}>
                                  {active ? '✓' : '✕'}
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        <div className="border-t border-dashed border-gray-200 pt-2.5 flex items-center justify-between">
                          <span className="text-[10px] font-bold">Auto-online at startup</span>
                          <button 
                            onClick={() => { playSoundEffect('tap'); setAutoOnlineStartup(!autoOnlineStartup); }}
                            className={`w-8 h-4.5 rounded-full flex items-center px-0.5 transition-colors cursor-pointer ${autoOnlineStartup ? 'bg-[#13AA52]' : 'bg-gray-300 dark:bg-zinc-700'}`}
                          >
                            <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-md transform transition-transform ${autoOnlineStartup ? 'translate-x-3.5' : 'translate-x-0'}`} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-center text-zinc-650">
                        <div className={`p-3 rounded-xl border flex flex-col items-center justify-center ${darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-white shadow-sm border-gray-150'}`}>
                          <span className="block text-sm font-black font-mono animate-pulse">24h</span>
                          <span className="block text-[8px] text-zinc-450 tracking-wider font-extrabold uppercase mt-0.5">MATCH WINDOW</span>
                        </div>
                        <div className={`p-3 rounded-xl border flex flex-col items-center justify-center ${darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-white shadow-sm border-gray-150'}`}>
                          <span className="block text-sm font-black text-[#13AA52] font-[#13AA52] font-mono">100%</span>
                          <span className="block text-[8px] text-zinc-450 tracking-wider font-extrabold uppercase mt-0.5">DISPATCH RATIO</span>
                        </div>
                      </div>

                      <div className="text-center p-3 text-[9px] text-gray-450 leading-tight">
                        ⚠️ Simulated dispatcher matches requests strictly according to nearby surges regardless of scheduling calendar.
                      </div>
                    </div>
                  )}

                  {/* SUB-SCREEN: SETTINGS (SIMULATOR CONTROLS) */}
                  {menuSubScreen === 'settings' && (
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5 animate-in fade-in slide-in-from-right duration-250 text-left">
                      <div className="flex items-center gap-2">
                        <Settings className="w-4 h-4 text-[#13AA52]" />
                        <span className="font-extrabold uppercase text-[10px] tracking-wider text-[#13AA52]">Simulation Controls</span>
                      </div>

                      {/* Mode picker (Taxi vs Food!) */}
                      <div>
                        <span className="text-[9px] text-zinc-400 font-bold block mb-1">SERVICE MODE</span>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            onClick={() => { playSoundEffect('tap'); setMode('taxi'); }}
                            className={`py-1.5 rounded-xl text-center text-[9.5px] font-black tracking-wide cursor-pointer transition ${
                              mode === 'taxi' ? 'bg-[#13AA52] text-white shadow-xs' : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-250'
                            }`}
                          >
                            🚕 TAXI MODE
                          </button>
                          <button
                            onClick={() => { playSoundEffect('tap'); setMode('food'); }}
                            className={`py-1.5 rounded-xl text-center text-[9.5px] font-black tracking-wide cursor-pointer transition ${
                              mode === 'food' ? 'bg-[#13AA52] text-white shadow-xs' : 'bg-zinc-200 text-zinc-650 hover:bg-zinc-250'
                            }`}
                          >
                            🍕 FOOD MODE
                          </button>
                        </div>
                      </div>

                      {/* Trigger matches spawner */}
                      <div>
                        <span className="text-[9px] text-zinc-450 font-bold block mb-1">FORCE MATCH OFFERS</span>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            disabled={!isOnline || (mode === 'taxi' && tripProgress.stage !== 'idle') || (mode === 'food' && activeEatsJobs.length >= 3)}
                            onClick={() => { playSoundEffect('tap'); handleSpawnMockRide('short'); }}
                            className="bg-zinc-850 text-white hover:bg-zinc-750 disabled:opacity-30 disabled:cursor-not-allowed text-[8.5px] py-1.5 rounded-xl font-bold text-center active:scale-95 transition cursor-pointer"
                          >
                            Short Trip
                          </button>
                          <button
                            disabled={!isOnline || (mode === 'taxi' && tripProgress.stage !== 'idle') || (mode === 'food' && activeEatsJobs.length >= 3)}
                            onClick={() => { playSoundEffect('tap'); handleSpawnMockRide('long'); }}
                            className="bg-zinc-850 text-white hover:bg-zinc-750 disabled:opacity-30 disabled:cursor-not-allowed text-[8.5px] py-1.5 rounded-xl font-bold text-center active:scale-95 transition cursor-pointer"
                          >
                            Long Commute
                          </button>
                          <button
                            disabled={!isOnline || (mode === 'taxi' && tripProgress.stage !== 'idle') || (mode === 'food' && activeEatsJobs.length >= 3)}
                            onClick={() => { playSoundEffect('tap'); handleSpawnMockRide('airport'); }}
                            className="bg-[#13AA52] text-white hover:bg-[#0f8f44] disabled:opacity-30 disabled:cursor-not-allowed text-[8.5px] py-1.5 rounded-xl font-extrabold text-center active:scale-95 transition cursor-pointer"
                          >
                            Airport Class
                          </button>
                          <button
                            disabled={!isOnline || (mode === 'taxi' && tripProgress.stage !== 'idle') || (mode === 'food' && activeEatsJobs.length >= 3)}
                            onClick={() => { playSoundEffect('tap'); handleSpawnMockRide('high-tip'); }}
                            className="bg-[#13AA52]/10 text-[#13AA52] border border-[#13AA52]/30 hover:bg-[#13AA52]/20 disabled:opacity-30 disabled:cursor-not-allowed text-[8.5px] py-1.5 rounded-xl font-black text-center active:scale-95 transition cursor-pointer"
                          >
                            Rich Tip 💎
                          </button>
                        </div>
                      </div>

                      {/* Peak Schedule Times */}
                      <div>
                        <span className="text-[9px] text-[#13AA52] font-black uppercase tracking-wider block mb-1">⏰ SIMULATED PEAK PERIOD</span>
                        <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                          {[
                            { id: 'breakfast', label: '🥞 Breakfast', desc: '07:30-09:30', surge: 'medium' as const, note: 'Morning commute & breakfast runs' },
                            { id: 'lunch', label: '🍱 Lunch Rush', desc: '12:00-13:30', surge: 'medium' as const, note: 'Business lunch deliveries & rapid office taxi rides' },
                            { id: 'dinner', label: '🍷 Dinner Peak', desc: '18:00-21:00', surge: 'high' as const, note: 'Mega restaurant orders & social evening rides' },
                            { id: 'offpeak', label: '💤 Off-Peak', desc: 'Other times', surge: 'low' as const, note: 'Idle off-rush dispatch levels' }
                          ].map(p => {
                            const isSelected = selectedPeak === p.id;
                            return (
                              <button
                                key={p.id}
                                onClick={() => {
                                  playSoundEffect('tap');
                                  setSelectedPeak(p.id as any);
                                  setSurgeLevel(p.surge);
                                  appendLog(`⏰ Peak Period Shift: Set simulation clock to ${p.label} (${p.desc}). Surge factor aligned to ${p.surge === 'high' ? 'High 🔥' : p.surge === 'medium' ? 'Medium ⚡' : 'Low 🍃'}.`, 'info');
                                }}
                                className={`p-1.5 rounded-xl border flex flex-col justify-between text-left h-12 transition-all cursor-pointer ${
                                  isSelected 
                                    ? 'bg-[#13AA52]/10 border-[#13AA52]/40 text-[#13AA52]' 
                                    : 'bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-805 text-zinc-650 dark:text-zinc-400 hover:bg-zinc-200'
                                }`}
                                title={p.note}
                              >
                                <span className="text-[8.5px] font-black uppercase tracking-wide truncate">{p.label}</span>
                                <span className="text-[7.5px] font-bold text-zinc-450 dark:text-zinc-500">{p.desc}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Surge Level */}
                      <div>
                        <span className="text-[9px] text-zinc-450 font-bold block mb-1">SURGENT HEAT FORCE</span>
                        <div className="grid grid-cols-3 gap-1">
                          {['low', 'medium', 'high'].map(l => (
                            <button
                              key={l}
                              onClick={() => { playSoundEffect('tap'); setSurgeLevel(l as any); }}
                              className={`py-1 rounded-lg text-[8.5px] font-extrabold uppercase transition cursor-pointer ${
                                surgeLevel === l ? 'bg-[#13AA52] text-white font-black' : 'bg-zinc-200 text-zinc-650 hover:bg-zinc-250'
                              }`}
                            >
                              {l === 'high' ? '🔥 High 2.2x' : l === 'medium' ? '⚡ Mid 1.4x' : '🍃 Low 1.0x'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Warp Speed */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[9px] text-zinc-450 font-bold block">DRIVE RECTITUDE WARP</span>
                          <span className="text-[8.5px] font-mono text-[#13AA52] font-black">{simSpeed}x speed</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1">
                          {[1, 2, 5, 10].map(s => (
                            <button
                              key={s}
                              onClick={() => { playSoundEffect('tap'); setSimSpeed(s); }}
                              className={`py-1 text-[8.5px] rounded-lg font-mono font-bold transition cursor-pointer ${
                                simSpeed === s ? 'bg-[#13AA52] text-white font-black' : 'bg-zinc-200 text-zinc-650 hover:bg-zinc-250'
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
                          <span className="text-[9px] text-zinc-450 font-bold block">DEVICE CHARGE STATE</span>
                          <span className="text-[8.5px] font-mono font-bold">{batteryLevel}%</span>
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

                      {/* Geolocation real GPS */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[9px] text-[#13AA52] font-black uppercase tracking-wider block">🗺️ Live GPS Tracking</span>
                          <span className={`text-[8.5px] font-mono font-black ${geoTrackingState === 'tracking' ? 'text-emerald-500 animate-pulse' : 'text-gray-400'}`}>
                            {geoTrackingState === 'tracking' ? 'WATCHING' : 'OFFLINE'}
                          </span>
                        </div>
                        <button
                          onClick={() => { playSoundEffect('tap'); setUseRealGPS(!useRealGPS); }}
                          className={`w-full py-2 rounded-xl text-[8.5px] font-black uppercase tracking-wider transition cursor-pointer mb-2 ${
                            useRealGPS ? 'bg-[#13AA52] text-white font-black' : 'bg-zinc-200 text-zinc-650 hover:bg-zinc-250'
                          }`}
                        >
                          {useRealGPS ? '✓ Live GPS Active' : 'Enable Device GPS Link'}
                        </button>

                        {/* Interactive City Selector */}
                        <div className={`text-[9px] font-bold border rounded-xl p-2.5 transition-colors duration-250 ${
                          darkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-zinc-50/55 border-zinc-150 text-zinc-600'
                        }`}>
                          <span className={`text-[8px] tracking-wider uppercase block mb-1.5 font-black ${darkMode ? 'text-zinc-550' : 'text-zinc-400'}`}>
                            {useRealGPS ? '📡 Auto-Detected GPS Region' : '🗺️ Select Simulated City'}
                          </span>
                          {useRealGPS ? (
                            <div className="flex items-center gap-1.5 py-0.5 text-[#13AA52] font-black uppercase text-[8.5px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              <span>{currentCity} dispatch active</span>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-1 mt-1">
                              {['London', 'Birmingham', 'Nottingham', 'Manchester'].map((ct) => (
                                <button
                                  key={ct}
                                  onClick={() => {
                                    playSoundEffect('tap');
                                    setCurrentCity(ct);
                                    appendLog(`🗺️ City region changed to ${ct}. Dispatch of rides and order routes now targeting ${ct} streets perfectly!`, 'success');
                                  }}
                                  className={`py-1 rounded text-[8px] font-extrabold uppercase transition cursor-pointer ${
                                    currentCity.toLowerCase() === ct.toLowerCase()
                                      ? 'bg-[#13AA52] text-white font-black shadow-xs'
                                      : darkMode 
                                        ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-750' 
                                        : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-250'
                                  }`}
                                >
                                  {ct}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Offline standalone simulation */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[9px] text-orange-600 font-black uppercase tracking-wider block">🔌 Offline Simulation</span>
                        </div>
                        <button
                          onClick={() => { 
                            playSoundEffect('tap'); 
                            const nextOffline = !offlineSimulation;
                            setOfflineSimulation(nextOffline);
                            appendLog(nextOffline ? '🔌 Offline simulation triggered: Firestore writes paused, caching local logs.' : '🌐 Offline simulation completed: Firestore writes resumed.', nextOffline ? 'warn' : 'success');
                          }}
                          className={`w-full py-2 rounded-xl text-[8.5px] font-black uppercase tracking-wider transition cursor-pointer ${
                            offlineSimulation ? 'bg-orange-500 text-white animate-pulse' : 'bg-zinc-205 text-zinc-650'
                          }`}
                        >
                          {offlineSimulation ? 'Offline Simulator Active' : 'Enable Standalone Offline'}
                        </button>
                      </div>

                      {/* Audio Chimes toggle */}
                      <div className="flex justify-between items-center py-1">
                        <span className="text-[10px] font-bold">Simulator Audio Chimes</span>
                        <button
                          onClick={() => { setSoundEnabled(!soundEnabled); playTapSound(); }}
                          className={`px-3 py-1 text-[9px] uppercase font-black rounded-lg transition-colors cursor-pointer ${soundEnabled ? 'bg-[#13AA52]/15 text-[#13AA52]' : 'bg-zinc-200 text-zinc-500'}`}
                        >
                          {soundEnabled ? '🔔 ACTIVE' : '🔕 MUTED'}
                        </button>
                      </div>

                      {/* Premium Options */}
                      <div className={`p-3.5 rounded-2xl border flex flex-col gap-2.5 ${darkMode ? 'bg-zinc-900 border-zinc-805' : 'bg-gray-50 border-gray-150'}`}>
                        <span className="text-[9px] text-[#13AA52] font-black uppercase tracking-wider block">⚡ Premium Options</span>
                        
                        {/* Dark Mode */}
                        <div className="flex justify-between items-center">
                          <span className="text-[9.5px] font-bold">Dark Theme Design</span>
                          <button
                            onClick={() => { playSoundEffect('tap'); setDarkMode(!darkMode); }}
                            className={`w-8 h-4.5 rounded-full flex items-center px-0.5 transition-colors cursor-pointer ${darkMode ? 'bg-[#13AA52]' : 'bg-gray-300'}`}
                          >
                            <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-md transform transition-transform ${darkMode ? 'translate-x-3.5' : 'translate-x-0'}`} />
                          </button>
                        </div>

                        {/* Simulate wandering */}
                        <div className="flex justify-between items-center">
                          <span className="text-[9.5px] font-bold">Wander parked vehicles</span>
                          <button
                            onClick={() => { playSoundEffect('tap'); setSimulateWandering(!simulateWandering); }}
                            className={`w-8 h-4.5 rounded-full flex items-center px-0.5 transition-colors cursor-pointer ${simulateWandering ? 'bg-[#13AA52]' : 'bg-gray-300'}`}
                          >
                            <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-md transform transition-transform ${simulateWandering ? 'translate-x-3.5' : 'translate-x-0'}`} />
                          </button>
                        </div>

                        {/* Push Notifications */}
                        <div className="flex justify-between items-center">
                          <span className="text-[9.5px] font-bold">Background Push notifications</span>
                          <button
                            onClick={() => { playSoundEffect('tap'); setNotificationsEnabled(!notificationsEnabled); }}
                            className={`w-8 h-4.5 rounded-full flex items-center px-0.5 transition-colors cursor-pointer ${notificationsEnabled ? 'bg-[#13AA52]' : 'bg-gray-300'}`}
                          >
                            <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-md transform transition-transform ${notificationsEnabled ? 'translate-x-3.5' : 'translate-x-0'}`} />
                          </button>
                        </div>

                        {/* Background service worker */}
                        <div className="flex justify-between items-center">
                          <span className="text-[9.5px] font-bold">Background processes watch</span>
                          <button
                            onClick={() => { playSoundEffect('tap'); setBackgroundModeEnabled(!backgroundModeEnabled); }}
                            className={`w-8 h-4.5 rounded-full flex items-center px-0.5 transition-colors cursor-pointer ${backgroundModeEnabled ? 'bg-[#13AA52]' : 'bg-gray-300'}`}
                          >
                            <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-md transform transition-transform ${backgroundModeEnabled ? 'translate-x-3.5' : 'translate-x-0'}`} />
                          </button>
                        </div>
                      </div>

                      {/* Biometric random trigger simulation */}
                      <div className="border border-red-500/30 bg-red-500/5 p-3 rounded-2xl flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[9.5px] font-black text-red-600 dark:text-red-400 uppercase tracking-wide">🚨 Compliance Sim</span>
                          <span className="text-[7.5px] font-bold text-zinc-450 uppercase">Daily Face Verify</span>
                        </div>
                        <p className="text-[8px] text-zinc-500 leading-tight">
                          Trigger a random driver biometric verification audit instantly to test daily compliance timeout penalty enforcement.
                        </p>
                        <button
                          disabled={!isOnline}
                          onClick={() => {
                            playSoundEffect('warn');
                            setRandomAuditActive(true);
                            setRandomAuditTimer(60);
                            appendLog("⚠️ MANUAL SIMULATED COMPLIANCE AUDIT TRIGGERED: Complete verification within 60s.", "warn");
                          }}
                          className="w-full py-1.5 text-center bg-red-500 text-white disabled:bg-zinc-200 dark:disabled:bg-zinc-800 disabled:text-zinc-450 text-[8.5px] font-black uppercase tracking-wider rounded-xl active:scale-98 transition cursor-pointer"
                        >
                          {!isOnline ? 'Go Online to Test Audit' : 'Trigger Random Biometric Audit Now'}
                        </button>
                      </div>

                      {/* Display telemetry logs */}
                      <div>
                        <span className="text-[9px] text-zinc-400 font-bold block mb-1">LIVE DISPATCH TELEMETRY REGISTRY</span>
                        <div className="bg-zinc-950 rounded-xl p-2.5 font-mono text-[7.5px] text-zinc-400 h-24 overflow-y-auto block select-text leading-tight w-full">
                          {logs.length === 0 ? "No active match events cached." : logs.slice().reverse().map(l => (
                            <div key={l.id} className="truncate">
                              <span className="text-zinc-600">[{l.timestamp}]</span> <span className={l.type === 'success' ? 'text-emerald-400' : l.type === 'warn' ? 'text-yellow-400' : 'text-zinc-300'}>{l.message}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUB-SCREEN: ABOUT */}
                  {menuSubScreen === 'about' && (
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 animate-in fade-in slide-in-from-right duration-250 text-left">
                      <div className="text-center py-4">
                        <div className="w-14 h-14 rounded-2xl bg-[#13AA52] text-white font-black flex items-center justify-center text-xl mx-auto shadow-md mb-2">
                          🗲
                        </div>
                        <h3 className="text-lg font-black tracking-tight">Swift Driver Simulator</h3>
                        <span className="text-zinc-400 font-mono text-[10px]">v3.0 - Premium Edition</span>
                      </div>

                      <div className={`p-4 rounded-2xl border flex flex-col gap-2.5 text-[11px] ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-gray-50 border-gray-150'}`}>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 font-semibold">TFL Regulated License</span>
                          <span className="font-bold">✓ Approved</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-gray-105/10 pt-2.5">
                          <span className="text-gray-400 font-semibold">Offline Caching Buffer</span>
                          <span className="font-bold">128 local logs</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-gray-105/10 pt-2.5">
                          <span className="text-gray-400 font-semibold">Multi-eats Dispatch Cap</span>
                          <span className="font-bold text-[#13AA52]">3 Concurrent orders</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-gray-105/10 pt-2.5">
                          <span className="text-gray-400 font-semibold">Regional Coverage Map</span>
                          <span className="font-bold font-mono text-[10px]">All World Interactive</span>
                        </div>
                      </div>

                      <div className="p-3 text-[9.5px] text-gray-400 text-center leading-relaxed">
                        Built for ultimate driver simulation on London and worldwide routes. Features include custom surge controls, full offline telemetry state persistence, and multiple Eats order queues.
                      </div>
                    </div>
                  )}

                  {/* SUB-SCREEN: RIDE CATEGORIES SELECTOR */}
                  {menuSubScreen === 'categories' && (
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5 animate-in fade-in slide-in-from-right duration-250 text-left">
                      <div>
                        <h3 className="text-sm font-black tracking-tight mb-1">Select Active Tiers</h3>
                        <p className="text-[10px] text-gray-450 font-bold leading-normal">
                          Deselect any categories to stop receiving dispatch invitations for those booking tiers. Fares and demand multipliers sync dynamically.
                        </p>
                      </div>

                      <div className="flex flex-col gap-2.5">
                        {[
                          { id: 'lite', name: 'Bolt Lite', desc: 'Shorter, lower budget transit runs.', multiplier: 0.88, color: 'text-zinc-500 bg-zinc-100' },
                          { id: 'standard', name: 'Bolt Standard', desc: 'Frequent general booking tier.', multiplier: 1.0, color: 'text-[#13AA52] bg-[#13AA52]/10' },
                          { id: 'comfort', name: 'Bolt Comfort', desc: 'Sleek premium sedans & top rated operators.', multiplier: 1.25, color: 'text-amber-500 bg-amber-500/10' },
                          { id: 'green', name: 'Bolt Green', desc: 'Environment friendly electric/hybrid vehicles.', multiplier: 1.05, color: 'text-emerald-500 bg-emerald-500/10' },
                          { id: 'xl', name: 'Bolt XL', desc: '6-seater large SUVs & vans.', multiplier: 1.55, color: 'text-blue-500 bg-blue-500/10' },
                        ].map((cat) => {
                          const isActive = boltCategories.includes(cat.id);
                          return (
                            <button
                              key={cat.id}
                              onClick={() => {
                                playSoundEffect('tap');
                                if (isActive) {
                                  if (boltCategories.length <= 1) {
                                    alert("At least one booking tier must remain active to accept dispatch matches!");
                                    return;
                                  }
                                  setBoltCategories(prev => prev.filter(c => c !== cat.id));
                                  appendLog(`❌ Disabled booking tier: ${cat.name}`, 'info');
                                } else {
                                  setBoltCategories(prev => [...prev, cat.id]);
                                  appendLog(`✓ Enabled booking tier: ${cat.name}`, 'success');
                                }
                              }}
                              className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition ${
                                isActive 
                                  ? darkMode
                                    ? 'bg-zinc-900 border-[#13AA52] text-zinc-100'
                                    : 'bg-emerald-50/20 border-[#13AA52] text-gray-900 font-extrabold'
                                  : darkMode
                                    ? 'bg-zinc-950 border-zinc-850 text-zinc-400'
                                    : 'bg-white border-gray-150 text-gray-500'
                              }`}
                            >
                              <div className="flex-1 pr-3">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-black">{cat.name}</span>
                                  <span className={`text-[7.5px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded font-mono ${cat.color}`}>
                                    {cat.multiplier}x Rate
                                  </span>
                                </div>
                                <p className="text-[9.5px] text-gray-400 font-bold mt-1.5 leading-tight">{cat.desc}</p>
                              </div>

                              <div className={`w-5 h-5 rounded-full border-1.5 flex items-center justify-center transition-all ${
                                isActive 
                                  ? 'bg-[#13AA52] border-[#13AA52] text-white' 
                                  : darkMode ? 'border-zinc-750' : 'border-gray-200'
                              }`}>
                                {isActive && <Check className="w-3.5 h-3.5 stroke-[4.5]" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* SUB-SCREEN: DRIVER QUESTS & ACHIEVEMENTS */}
                  {menuSubScreen === 'quests' && (
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5 animate-in fade-in slide-in-from-right duration-250 text-left">
                      <div>
                        <h3 className="text-sm font-black tracking-tight mb-1">Campaigns & Quests</h3>
                        <p className="text-[10px] text-gray-450 font-bold leading-normal">
                          Complete active consecutive trips to unleash lucrative cash rewards added immediately into your wallet ledger.
                        </p>
                      </div>

                      <div className="flex flex-col gap-3">
                        {quests.map((quest) => {
                          const isDone = completedQuestIds.includes(quest.id);
                          
                          // Dynamically calculate progress based on types
                          let currentProgress = 0;
                          if (quest.id === 'q-1' || quest.id === 'q-4') {
                            currentProgress = stats.completedTripsCount;
                          } else if (quest.id === 'q-2') {
                            currentProgress = completedComfortCount;
                          } else if (quest.id === 'q-3') {
                            currentProgress = completedAirportCount;
                          }

                          const progressPct = Math.min(Math.round((currentProgress / quest.target) * 100), 100);

                          return (
                            <div
                              key={quest.id}
                              className={`p-4 rounded-2xl border flex flex-col gap-3 transition ${
                                isDone 
                                  ? darkMode
                                    ? 'bg-zinc-900/60 border-emerald-500/20'
                                    : 'bg-emerald-50/10 border-emerald-500/20'
                                  : darkMode
                                    ? 'bg-zinc-900 border-zinc-800'
                                    : 'bg-zinc-50 border-gray-150'
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <div className="min-w-0 pr-3">
                                  <h4 className={`text-xs font-black truncate ${isDone ? 'text-[#13AA52] line-through decoration-emerald-500/30 font-extrabold' : ''}`}>
                                    {quest.name}
                                  </h4>
                                  <p className="text-[9.5px] text-gray-400 font-bold mt-1 leading-normal">
                                    {quest.description}
                                  </p>
                                </div>
                                <span className={`text-[10px] font-mono font-black shrink-0 ${isDone ? 'text-[#13AA52]' : 'text-amber-500'}`}>
                                  +£{quest.reward.toFixed(2)}
                                </span>
                              </div>

                              {/* Progress elements */}
                              <div className="flex flex-col gap-1.5 pt-1.5 border-t border-dashed border-gray-150/10">
                                <div className="flex justify-between items-center text-[9px] font-mono font-bold leading-none">
                                  <span className="text-gray-400">PROGRESS</span>
                                  <span className={isDone ? 'text-[#13AA52]' : 'text-gray-405'}>
                                    {isDone ? 'COMPLETED' : `${currentProgress} / ${quest.target}`}
                                  </span>
                                </div>

                                <div className="w-full h-2 rounded-full bg-gray-200/50 overflow-hidden relative">
                                  <div
                                    className={`h-full rounded-full transition-all duration-300 ${isDone ? 'bg-[#13AA52]' : 'bg-amber-500'}`}
                                    style={{ width: `${progressPct}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* SUB-SCREEN: NOTIFICATIONS INBOX */}
                  {menuSubScreen === 'notifications' && (
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5 animate-in fade-in slide-in-from-right duration-250 text-left">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black tracking-tight">System Briefing Notifications</h3>
                        {notifications.length > 0 && (
                          <button
                            onClick={() => {
                              playSoundEffect('tap');
                              setNotifications([]);
                              appendLog("🗑️ Cleared all notifications inbox.", "info");
                            }}
                            className="bg-transparent border-0 text-[9px] font-black text-rose-500 uppercase tracking-wider cursor-pointer hover:underline"
                          >
                            Clear All
                          </button>
                        )}
                      </div>

                      {notifications.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-16 px-6 text-center">
                          <CheckCircle className="w-12 h-12 text-[#13AA52]/25 mb-3" />
                          <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider">Inbox Cleared!</h4>
                          <p className="text-[10px] text-gray-450 mt-1 leading-normal max-w-xs font-sans">
                            You are fully up to date. We will ping you as soon as new surges, zone multipliers or match events occur.
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2.5">
                          {notifications.map((notif) => (
                            <div 
                              key={notif.id}
                              onClick={() => {
                                playSoundEffect('tap');
                                setNotifications(notifications.map(n => n.id === notif.id ? {...n, read: true} : n));
                              }}
                              className={`p-3 rounded-2xl border flex flex-col gap-1.5 transition duration-150 cursor-pointer ${
                                notif.read 
                                  ? (darkMode ? 'bg-zinc-900/30 border-zinc-850 opacity-60' : 'bg-gray-50/50 border-gray-100 opacity-75')
                                  : (darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200 shadow-xs')
                              }`}
                            >
                              <div className="flex items-center justify-between font-sans">
                                <div className="flex items-center gap-1.5">
                                  <div className={`w-1.5 h-1.5 rounded-full ${notif.read ? 'bg-transparent' : 'bg-amber-500 animate-ping'}`} />
                                  <h4 className="text-[10.5px] font-black uppercase tracking-wide truncate max-w-[180px]">{notif.title}</h4>
                                </div>
                                <span className="text-[8px] font-mono text-gray-400 text-right">{notif.time}</span>
                              </div>
                              <p className="text-[9.5px] text-gray-550 dark:text-zinc-400 leading-relaxed pl-3 font-medium">
                                {notif.desc}
                              </p>
                              {!notif.read && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    playSoundEffect('tap');
                                    setNotifications(notifications.map(n => n.id === notif.id ? {...n, read: true} : n));
                                  }}
                                  className="w-fit self-end text-[7.5px] font-black uppercase tracking-widest text-[#13AA52] hover:underline cursor-pointer py-0.5 mt-1 border-0 bg-transparent font-sans"
                                >
                                  Mark as read ✓
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* SUB-SCREEN: SUPPORT HELP CENTER & CHATBOT */}
                  {menuSubScreen === 'help' && (
                    <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in slide-in-from-right duration-250 text-left">
                      
                      {/* Help Header Stats Desk */}
                      <div className={`p-3 border-b flex items-center justify-between shrink-0 ${darkMode ? 'bg-zinc-900/40 border-zinc-850' : 'bg-gray-50/50 border-gray-100'}`}>
                        <div className="flex items-center gap-2 font-sans">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider block">Support Agent Sarah</span>
                            <span className="text-[7.5px] text-gray-400 block font-mono">SIMULATION CO-DISPATCHED</span>
                          </div>
                        </div>
                        <span className="text-[8.5px] font-mono bg-[#13AA52]/10 text-[#13AA52] px-1.5 py-0.5 rounded-md font-black uppercase tracking-wider">ONLINE</span>
                      </div>

                      {/* Message Thread Feed */}
                      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5">
                        {supportMessages.map((msg) => (
                          <div 
                            key={msg.id}
                            className={`max-w-[82%] p-2.5 rounded-2xl text-[10.5px] leading-relaxed font-sans ${
                              msg.sender === 'driver'
                                ? 'bg-[#13AA52] text-white self-end font-extrabold rounded-tr-none'
                                : (darkMode ? 'bg-zinc-900 border border-zinc-800 text-zinc-200' : 'bg-gray-100 text-gray-800') + ' self-start font-medium rounded-tl-none'
                            }`}
                          >
                            {msg.text}
                          </div>
                        ))}
                        {supportLoading && (
                          <div className={`self-start max-w-[82%] p-2.5 rounded-2xl rounded-tl-none text-[10.5px] flex items-center gap-1.5 ${
                            darkMode ? 'bg-zinc-900 border border-zinc-800 text-zinc-400' : 'bg-gray-100 text-gray-500'
                          }`}>
                            <div className="flex gap-1">
                              <span className="w-1 h-1 rounded-full bg-[#13AA52] animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-1 h-1 rounded-full bg-[#13AA52] animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-1 h-1 rounded-full bg-[#13AA52] animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                            <span className="text-[9px] font-medium font-mono">Sarah is writing...</span>
                          </div>
                        )}
                      </div>

                      {/* Quick FAQ Interactive Action Chips */}
                      <div className={`p-2 shrink-0 border-t flex flex-col gap-1 ${darkMode ? 'bg-zinc-950 border-zinc-850/60' : 'bg-gray-50/55 border-gray-150'}`}>
                        <span className="text-[7.5px] font-black uppercase text-gray-400 pl-1">Suggested inquiries:</span>
                        <div className="flex flex-wrap gap-1">
                          {[
                            "Why am I not getting jobs?",
                            "How do point Incentives work?",
                            "How to trigger Heathrow virtual pen?"
                          ].map((faq, index) => (
                            <button
                              key={index}
                              disabled={supportLoading}
                              onClick={() => handleSendSupportMessage(faq)}
                              className={`border-0 rounded-full px-2.5 py-1 text-[8.5px] font-black uppercase tracking-wider text-left cursor-pointer transition ${
                                darkMode ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-white hover:bg-gray-100 text-gray-650 border border-gray-200'
                              } disabled:opacity-50`}
                            >
                              {faq}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Custom input bar */}
                      <form 
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!supportInputMessage.trim() || supportLoading) return;
                          handleSendSupportMessage(supportInputMessage);
                        }}
                        className={`p-2.5 border-t shrink-0 flex gap-2 ${darkMode ? 'bg-zinc-900 border-zinc-850' : 'bg-white border-gray-150'}`}
                      >
                        <input
                          type="text"
                          value={supportInputMessage}
                          onChange={(e) => setSupportInputMessage(e.target.value)}
                          disabled={supportLoading}
                          placeholder="Type simulated inquiry..."
                          className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold ${
                            darkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-200 placeholder-zinc-500' : 'bg-gray-50 border-gray-200 text-gray-800'
                          }`}
                        />
                        <button
                          type="submit"
                          disabled={!supportInputMessage.trim() || supportLoading}
                          className="px-3.5 bg-[#13AA52] hover:bg-[#0f8f44] text-white rounded-xl text-xs font-black uppercase tracking-wide border-0 cursor-pointer flex items-center justify-center font-sans disabled:opacity-50"
                        >
                          Send
                        </button>
                      </form>
                    </div>
                  )}
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
            <div 
              onClick={() => {
                playSoundEffect('tap');
                setIsMinimized(m => !m);
              }}
              className={`hidden md:flex h-5.5 items-center justify-center shrink-0 rounded-b-[42px] select-none pb-1 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-zinc-900 active:scale-98 ${
                isMinimized ? 'bg-[#0b172a] border-t border-slate-900' : 'bg-white border-t border-slate-50/50'
              }`}
              title={isMinimized ? "Maximize Swift Driver App" : "Minimize to iOS Home Screen"}
            >
              <span className={`w-24 h-1 rounded-full transition ${isMinimized ? 'bg-slate-750' : 'bg-gray-300'}`} />
            </div>

          </div>

          {/* Biometric Face Capture Cam Viewport */}
          <FaceScannerModal
            isOpen={showFaceScanner}
            onClose={() => setShowFaceScanner(false)}
            onSuccess={(selfie) => {
              setFaceSelfieUrl(selfie);
              setFaceVerified(true);
              setRandomAuditActive(false); // Clear the daily safety audit checklist!
              appendLog("✓ Biometric identity verification successful. Security pass verified.", "success");
            }}
            playSoundEffect={playSoundEffect}
          />

          {/* AI Support Co-Pilot Chat Overlay */}
          <AIPilotCoach
            isOpen={isCoachOpen}
            onClose={() => setIsCoachOpen(false)}
            stats={stats}
          />

    </div>
  );
}
