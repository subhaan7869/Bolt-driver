import React, { useState, useEffect } from 'react';
import { TripProgress, ActiveChat } from '../types';
import { playTapSound } from '../utils/SoundGenerator';
import { MessageSquare, Phone, MapPin, X, Compass, CheckCircle2, Navigation, MessageCircle } from 'lucide-react';

interface ActiveTripPanelProps {
  tripProgress: TripProgress;
  chatMessages: ActiveChat[];
  onAddChatMessage: (text: string, sender: 'driver' | 'passenger') => void;
  onAdvanceStage: () => void;
  onCancelTrip: () => void;
}

export const ActiveTripPanel: React.FC<ActiveTripPanelProps> = ({
  tripProgress,
  chatMessages,
  onAddChatMessage,
  onAdvanceStage,
  onCancelTrip,
}) => {
  const { stage, currentRide, etaMinutes, navigationProgress } = tripProgress;
  const [sliderVal, setSliderVal] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [newMessage, setNewMessage] = useState('');

  // Reset slide-to-unlock value on stage transition
  useEffect(() => {
    setSliderVal(0);
  }, [stage]);

  // Handle slider release / check trigger
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setSliderVal(val);
    if (val >= 95) {
      playTapSound();
      setSliderVal(100);
      onAdvanceStage();
    }
  };

  const handleSliderRelease = () => {
    if (sliderVal < 95) {
      setSliderVal(0);
    }
  };

  if (!currentRide) return null;

  // Preset driver replies
  const DRIVER_PRESETS = [
    "I'm here! At the pickup point. 🚗",
    "Almost there! Just stuck in light traffic.",
    "Sure, I will turn up the AC for you.",
    "Yes, I can play your music."
  ];

  return (
    <div id="active-trip-panel" className="bg-slate-900 border-t border-slate-800 p-4 rounded-t-2xl flex flex-col gap-3 relative animate-in slide-in-from-bottom duration-250 select-none">
      
      {/* Dynamic Upper Pill representing next turn instruction */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-[10px] font-bold text-emerald-400 uppercase font-mono tracking-widest">
            {stage === 'to_pickup' ? 'Navigating to pickup' : stage === 'arrived_pickup' ? 'Ready for pickup' : 'Tripping'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            id="chat-toggle-button"
            onClick={() => { playTapSound(); setIsChatOpen(!isChatOpen); }}
            className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-gray-300 hover:text-white transition-colors relative"
          >
            <MessageSquare className="w-4 h-4" />
            {chatMessages.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-emerald-500 text-slate-950 text-[8px] font-extrabold px-1.5 py-0.5 rounded-full animate-bounce">
                {chatMessages.length}
              </span>
            )}
          </button>
          
          <button
            id="call-passenger-button"
            onClick={() => { 
              playTapSound(); 
              window.alert(`Simulating phone call directly to passenger: ${currentRide.passengerName}`); 
            }}
            className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-gray-300 hover:text-white transition-colors"
          >
            <Phone className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Stats Display */}
      <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-850 flex items-center justify-between">
        <div>
          <span className="text-[10px] text-gray-400 uppercase font-bold block tracking-wider">
            {stage === 'to_pickup' ? 'Pickup Passenger' : stage === 'arrived_pickup' ? 'Waiting' : 'Destination'}
          </span>
          <h4 className="text-white text-base font-extrabold leading-snug">
            {stage === 'to_pickup' || stage === 'arrived_pickup' ? currentRide.passengerName : currentRide.dropoffAddress}
          </h4>
        </div>
        
        <div className="text-right">
          <span className="text-2xl font-mono font-bold text-emerald-400 block">
            {stage === 'arrived_pickup' ? 'WAIT' : `${Math.ceil(etaMinutes)} min`}
          </span>
          <span className="text-[10px] text-gray-500 block">
            {stage === 'arrived_pickup' ? 'Arrived safely' : `${(currentRide.distance * (stage === 'to_pickup' ? 0.35 : 1)).toFixed(1)} km left`}
          </span>
        </div>
      </div>

      {/* Slide-to-Action Slider (The core driver experience!) */}
      <div className="relative mt-1">
        <div className="w-full h-14 bg-slate-950/60 border border-slate-800 rounded-xl relative flex items-center justify-center overflow-hidden">
          {/* Neon moving glow bar in track background */}
          <div 
            className="absolute left-0 top-0 bottom-0 bg-emerald-500/10 transition-all duration-75"
            style={{ width: `${sliderVal}%` }}
          />

          {/* Core instruction display behind the slider thumb */}
          <span className="text-xs font-bold pointer-events-none uppercase tracking-wider text-gray-400 animate-pulse select-none z-0">
            {stage === 'to_pickup' && 'Slide to Confirm Arrival'}
            {stage === 'arrived_pickup' && 'Slide to Start Trip'}
            {stage === 'to_destination' && 'Slide to Complete Trip'}
          </span>

          <input
            id="trip-action-slider"
            type="range"
            min="0"
            max="100"
            value={sliderVal}
            onChange={handleSliderChange}
            onMouseUp={handleSliderRelease}
            onTouchEnd={handleSliderRelease}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />

          {/* Simulated sliding handle */}
          <div
            className="absolute left-1.5 top-1.5 bottom-1.5 w-11 rounded-lg bg-emerald-500 flex items-center justify-center shadow-lg transition-all duration-75 pointer-events-none z-20 flex-col"
            style={{ transform: `translateX(${sliderVal * 2.15}px)` }}
          >
            <Navigation className="w-5 h-5 text-slate-950 font-black fill-slate-950 transform rotate-90" />
          </div>
        </div>
      </div>

      {/* Cancel ride button */}
      <button
        id="cancel-ride-button"
        onClick={() => {
          if (confirm("Are you sure you want to cancel this ride request? It will decrease your acceptance rating model.")) {
            onCancelTrip();
          }
        }}
        className="text-[11px] text-red-400 hover:text-red-300 font-medium text-center hover:underline self-center transition"
      >
        Cancel and Decline Trip
      </button>

      {/* IMMERSIVE LIVE PASSENGER CHAT BOX DRAWER */}
      {isChatOpen && (
        <div id="passenger-chat-modal" className="absolute inset-x-0 bottom-0 bg-slate-950 rounded-t-2xl border-t border-slate-850 p-4 z-40 flex flex-col h-[320px] transition-all animate-in slide-in-from-bottom duration-250">
          <div className="flex items-center justify-between border-b border-slate-850 pb-2.5 mb-2.5">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <h5 className="text-xs font-bold text-white">Chat with {currentRide.passengerName}</h5>
            </div>
            <button
              id="close-chat-button"
              onClick={() => { playTapSound(); setIsChatOpen(false); }}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1 text-xs select-text">
            {chatMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 py-6">
                <p>No messages yet. Greet the rider!</p>
              </div>
            ) : (
              chatMessages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[80%] rounded-xl px-3 py-2 ${
                    m.sender === 'driver'
                      ? 'bg-emerald-500 text-slate-950 font-medium self-end rounded-tr-none'
                      : 'bg-slate-850 text-white self-start rounded-tl-none'
                  }`}
                >
                  <p>{m.text}</p>
                  <span className={`text-[8px] mt-1 block text-right font-mono ${
                    m.sender === 'driver' ? 'text-slate-800' : 'text-gray-400'
                  }`}>
                    {m.timestamp}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Quick Reply preset chips */}
          <div className="flex gap-1.5 overflow-x-auto py-2 no-scrollbar border-t border-slate-850 mt-1">
            {DRIVER_PRESETS.map((preset, index) => (
              <button
                key={index}
                onClick={() => {
                  playTapSound();
                  onAddChatMessage(preset, 'driver');
                }}
                className="bg-slate-850 hover:bg-slate-800 text-[10px] text-gray-300 px-2.5 py-1 rounded-full whitespace-nowrap active:scale-95 transition"
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Custom Message Field */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newMessage.trim()) {
                onAddChatMessage(newMessage.trim(), 'driver');
                setNewMessage('');
              }
            }}
            className="flex items-center gap-2 pt-2 border-t border-slate-850"
          >
            <input
              type="text"
              placeholder="Type message to rider..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="bg-emerald-500 disabled:opacity-50 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-emerald-400 transition"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
