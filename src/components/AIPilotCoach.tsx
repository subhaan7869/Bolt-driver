import React, { useState, useRef, useEffect } from 'react';
import { DriverStats } from '../types';
import { playTapSound, playWarningSound } from '../utils/SoundGenerator';
import { Send, Sparkles, MessageSquareCode, X, AlertOctagon, HelpCircle } from 'lucide-react';

interface AIPilotCoachProps {
  stats: DriverStats;
  isOpen: boolean;
  onClose: () => void;
}

interface CoachMessage {
  id: string;
  sender: 'driver' | 'support';
  text: string;
  timestamp: string;
}

export const AIPilotCoach: React.FC<AIPilotCoachProps> = ({
  stats,
  isOpen,
  onClose,
}) => {
  const [messages, setMessages] = useState<CoachMessage[]>([
    {
      id: 'welcome',
      sender: 'support',
      text: "👋 G'day! I am your Bolt AI Support Co-pilot and Dispatch Coach. Ask me how to find peak surges, maximize passenger tips, or manage safe routing!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll chat to bottom when message log updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSendMessage = async (customText?: string) => {
    const messageToSend = (customText || inputMsg).trim();
    if (!messageToSend) return;

    playTapSound();
    
    // Add driver message to chat log local state
    const driverMessage: CoachMessage = {
      id: Math.random().toString(),
      sender: 'driver',
      text: messageToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, driverMessage]);
    if (!customText) {
      setInputMsg('');
    }
    setLoading(true);

    try {
      // Send chat context and updated driver metrics to backend
      const response = await fetch('/api/chat-coach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, driverMessage].map((m) => ({ text: m.text, sender: m.sender })),
          driverStats: stats,
        }),
      });

      if (!response.ok) {
        throw new Error('Server returned failing status code');
      }

      const replyData = await response.json();
      
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: 'support',
          text: replyData.text,
          timestamp: replyData.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (error) {
      console.error('Error reaching dispatch co-pilot API:', error);
      playWarningSound();
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          sender: 'support',
          text: "⚠️ Dispatch offline. Make sure you entered your GEMINI_API_KEY in the user secrets. Otherwise, type 'surge zones' or 'cash out' to invoke local responses!",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const COACH_PRESETS = [
    "🔥 Where are the biggest surge areas right now?",
    "⭐ How can I raise my driver ratings and tips?",
    "⚡ What's the best strategy to maximize fuel efficiency?",
    "💼 How does Bolt balance cash-out work?",
  ];

  if (!isOpen) return null;

  return (
    <div id="ai-pilot-coach-drawer" className="absolute inset-0 bg-slate-950 z-55 flex flex-col overflow-hidden select-none animate-in fade-in slide-in-from-bottom duration-250">
      
      {/* Copilot Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-900 bg-slate-900/40">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-r from-emerald-400 to-teal-500 p-1 rounded-lg">
            <Sparkles className="w-4 h-4 text-slate-950 fill-slate-950" />
          </div>
          <div>
            <h3 className="text-white text-[13px] font-extrabold leading-tight">Bolt AI Dispatch Officer</h3>
            <span className="text-[9px] text-emerald-400 block font-medium animate-pulse">Connected to Copilot</span>
          </div>
        </div>
        <button
          id="close-coach-button"
          onClick={() => { playTapSound(); onClose(); }}
          className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-gray-400 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Chat Messages Feed container */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 scroll-smooth select-text">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col max-w-[85%] text-xs ${
              m.sender === 'driver' ? 'self-end items-end' : 'self-start items-start'
            }`}
          >
            {/* Sender Subheadline */}
            <span className="text-[9px] text-gray-500 font-bold mb-0.5 px-1 font-mono">
              {m.sender === 'driver' ? 'DRIVER' : 'BOLT CO-PILOT'}
            </span>
            
            {/* Message Bubble */}
            <div
              className={`rounded-xl px-3 py-2.5 leading-relaxed break-words shadow-md ${
                m.sender === 'driver'
                  ? 'bg-emerald-500 text-slate-950 font-medium rounded-tr-none'
                  : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-tl-none'
              }`}
            >
              <p>{m.text}</p>
            </div>
            
            {/* Message Hour */}
            <span className="text-[8px] text-gray-600 mt-1 px-1 font-mono">
              {m.timestamp}
            </span>
          </div>
        ))}
        {loading && (
          <div className="self-start flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-400">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-[10px] text-gray-500 font-mono">Formulating strategy...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Recommended Driver Preset Prompts */}
      <div className="p-3 border-t border-slate-900 bg-slate-950/40 flex flex-col gap-1.5">
        <span className="text-[9px] text-gray-500 font-extrabold uppercase tracking-wide px-1">
          Quick Ask Suggestions
        </span>
        <div className="flex flex-col gap-1 max-h-24 overflow-y-auto pr-1">
          {COACH_PRESETS.map((preset, idx) => (
            <button
              key={idx}
              disabled={loading}
              onClick={() => handleSendMessage(preset)}
              className="bg-slate-900 hover:bg-slate-850 active:scale-98 transition text-left text-[10px] text-emerald-400 font-medium py-1.5 px-3 rounded-lg border border-slate-850 truncate leading-snug"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Input Message Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-3 border-t border-slate-950 flex items-center gap-2"
      >
        <input
          type="text"
          placeholder="Ask AI dispatch support advice..."
          value={inputMsg}
          disabled={loading}
          onChange={(e) => setInputMsg(e.target.value)}
          className="flex-1 bg-slate-900 border border-slate-850 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
        />
        <button
          type="submit"
          disabled={!inputMsg.trim() || loading}
          className="w-10 h-10 rounded-xl bg-emerald-500 disabled:opacity-50 flex items-center justify-center text-slate-950 hover:bg-emerald-400 active:scale-95 transition shadow-lg shadow-emerald-500/10 cursor-pointer"
        >
          <Send className="w-4 h-4 fill-slate-950" />
        </button>
      </form>

    </div>
  );
};
