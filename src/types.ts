export interface RideRequest {
  id: string;
  passengerName: string;
  passengerRating: number;
  pickupAddress: string;
  dropoffAddress: string;
  fare: number;
  distance: number; // in km
  surgeMultiplier: number;
  pickupCoordinate: { x: number; y: number };
  dropoffCoordinate: { x: number; y: number };
  tipAmount: number;
  estimatedMinutes: number;
  foodItem?: string;
  category?: string;
}

export interface DriverStats {
  rating: number;
  acceptanceRate: number;
  cancellationRate: number;
  todayEarnings: number;
  weeklyEarnings: number;
  hoursOnline: number;
  completedTripsCount: number;
  balance: number;
}

export type TripStage =
  | 'idle'
  | 'offering'
  | 'to_pickup'
  | 'arrived_pickup'
  | 'to_destination'
  | 'arrived_destination';

export interface TripProgress {
  stage: TripStage;
  currentRide: RideRequest | null;
  offerTimeRemaining: number; // in seconds
  totalOfferTime: number; // e.g. 15s
  navigationProgress: number; // 0 to 100%
  etaMinutes: number;
}

export interface SimulatorLog {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warn' | 'earnings';
  message: string;
}

export interface CompletedTrip {
  id: string;
  passengerName: string;
  pickupAddress: string;
  dropoffAddress: string;
  fare: number;
  tip: number;
  timestamp: string;
  ratingValue: number;
  surgeMultiplier: number;
}

export interface ActiveChat {
  id: string;
  sender: 'passenger' | 'driver';
  text: string;
  timestamp: string;
}
