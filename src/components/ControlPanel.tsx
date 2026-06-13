import React from 'react';
import { SimulatorLog } from '../types';
import { playTapSound } from '../utils/SoundGenerator';
import { 
  Terminal, ShieldCheck, Zap, FastForward, Trash2, Sliders, Battery, 
  ToggleLeft, ToggleRight, Radio, Shield, MapPin, Sparkles, AlertCircle 
} from 'lucide-react';

interface ControlPanelProps {
  surgeLevel: 'low' | 'medium' | 'high';
  onSetSurgeLevel: (level: 'low' | 'medium' | 'high') => void;
  isOnline: boolean;
  onSetOnline: (online: boolean) => void;
  simSpeed: number;
  onSetSimSpeed: (speed: number) => void;
  batteryLevel: number;
  onSetBatteryLevel: (bat: number) => void;
  logs: SimulatorLog[];
  onClearLogs: () => void;
  onSpawnMockRide: (type: 'short' | 'long' | 'airport' | 'high-tip') => void;
  simulationActive: boolean;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  surgeLevel,
  onSetSurgeLevel,
  isOnline,
  onSetOnline,
  simSpeed,
  onSetSimSpeed,
  batteryLevel,
  onSetBatteryLevel,
  logs,
  onClearLogs,
  onSpawnMockRide,
  simulationActive,
}) => {
  return (
    <div id="simulation-control-panel" className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col gap-5 select-none text-gray-200">
      
      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-emerald-400" />
          <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">
            Simulator Console Settings
          </h2>
        </div>
        <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[9px] font-mono leading-none">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          ACTIVE KERNEL
        </div>
      </div>

      {/* ONLINE / OFFLINE TOGGLE WIDGET */}
      <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-850 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-white">Driver Availability</h3>
          <p className="text-[10px] text-gray-400 mt-0.5 leading-normal">
            Switch mock driver online/offline in network.
          </p>
        </div>
        <button
          id="sim-online-toggle"
          onClick={() => {
            playTapSound();
            onSetOnline(!isOnline);
          }}
          className="focus:outline-none"
        >
          {isOnline ? (
            <ToggleRight className="w-11 h-11 text-emerald-400 cursor-pointer" />
          ) : (
            <ToggleLeft className="w-11 h-11 text-gray-600 cursor-pointer" />
          )}
        </button>
      </div>

      {/* RIDE GENERATOR PANEL */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-1">
          <Radio className="w-3.5 h-3.5 text-emerald-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Ride Request Spawner</h3>
        </div>
        <p className="text-[10px] text-gray-400 mr-1 leading-normal">
          Click to inject a simulated rider request immediately onto the active driver app map. (Driver must be online!)
        </p>

        <div className="grid grid-cols-2 gap-2 mt-1">
          <button
            id="spawn-short-ride"
            disabled={!isOnline || simulationActive}
            onClick={() => { playTapSound(); onSpawnMockRide('short'); }}
            className="bg-slate-800 hover:bg-slate-750 disabled:opacity-40 text-gray-200 border border-slate-700 hover:border-slate-600 disabled:cursor-not-allowed font-medium text-xs py-2 px-3 rounded-lg transition active:scale-95 flex flex-col items-center justify-center text-center gap-0.5 shadow-md"
          >
            <span className="font-bold text-white text-[11px]">Coffee Shop Run</span>
            <span className="text-[9px] text-gray-400">Short trip (~2.1 km)</span>
          </button>

          <button
            id="spawn-long-ride"
            disabled={!isOnline || simulationActive}
            onClick={() => { playTapSound(); onSpawnMockRide('long'); }}
            className="bg-slate-800 hover:bg-slate-750 disabled:opacity-40 text-gray-200 border border-slate-700 hover:border-slate-600 disabled:cursor-not-allowed font-medium text-xs py-2 px-3 rounded-lg transition active:scale-95 flex flex-col items-center justify-center text-center gap-0.5 shadow-md"
          >
            <span className="font-bold text-white text-[11px]">Suburbs Commuter</span>
            <span className="text-[9px] text-gray-400">Medium trip (~14.8 km)</span>
          </button>

          <button
            id="spawn-airport-ride"
            disabled={!isOnline || simulationActive}
            onClick={() => { playTapSound(); onSpawnMockRide('airport'); }}
            className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:opacity-40 disabled:border-slate-700 text-slate-950 font-bold text-xs py-2 px-3 rounded-lg transition active:scale-95 flex flex-col items-center justify-center text-center gap-0.5 shadow-lg shadow-emerald-500/10"
          >
            <span className="font-extrabold text-[11px] flex items-center gap-0.5">
              Airport Executive ✈️
            </span>
            <span className="text-[9px] text-slate-900 opacity-80">Surge 2.2x (~26 km)</span>
          </button>

          <button
            id="spawn-high-tip-ride"
            disabled={!isOnline || simulationActive}
            onClick={() => { playTapSound(); onSpawnMockRide('high-tip'); }}
            className="bg-slate-800 hover:bg-slate-750 disabled:opacity-40 text-gray-200 border border-slate-700 hover:border-slate-600 disabled:cursor-not-allowed font-medium text-xs py-2 px-3 rounded-lg transition active:scale-95 flex flex-col items-center justify-center text-center gap-0.5 shadow-md"
          >
            <span className="font-bold text-amber-400 text-[11px] flex items-center gap-0.5">
              Generous Rider 💎
            </span>
            <span className="text-[9px] text-gray-400">High tips guaranteed</span>
          </button>
        </div>
      </div>

      {/* SIMULATOR HEAT / SURGE MULTIPLIER LEVEL */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1">
          <Zap className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Global Surge heat level</h3>
        </div>
        <p className="text-[10px] text-gray-400 leading-normal mb-1">
          Sets demand surge coefficients. High surges generate massive red/purple multipliers under zone maps, inflating fares.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {['low', 'medium', 'high'].map((level) => {
            const isSelected = surgeLevel === level;
            return (
              <button
                key={level}
                onClick={() => {
                  playTapSound();
                  onSetSurgeLevel(level as 'low' | 'medium' | 'high');
                }}
                className={`py-1.5 rounded-lg text-xs font-bold capitalize transition ${
                  isSelected
                    ? level === 'high' 
                      ? 'bg-red-500 text-white shadow-md' 
                      : level === 'medium'
                        ? 'bg-amber-500 text-slate-950 shadow-md'
                        : 'bg-slate-700 text-white shadow-md'
                    : 'bg-slate-800 text-gray-400 hover:bg-slate-750'
                }`}
              >
                {level === 'high' ? 'High 🔥' : level === 'medium' ? 'Medium ⚡' : 'Low 🍃'}
              </button>
            );
          })}
        </div>
      </div>

      {/* TRAVEL NAVIGATION SIMULATION SPEED */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <FastForward className="w-3.5 h-3.5 text-emerald-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Simulation Speed Speed</h3>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 font-extrabold">{simSpeed}x Warp</span>
        </div>
        <p className="text-[10px] text-gray-400 leading-normal">
          Accelerate driving time when active to complete fares immediately!
        </p>
        <div className="grid grid-cols-4 gap-1.5">
          {[1, 2, 5, 10].map((speed) => (
            <button
              key={speed}
              onClick={() => {
                playTapSound();
                onSetSimSpeed(speed);
              }}
              className={`py-1 rounded-md text-[10px] font-mono font-bold transition ${
                simSpeed === speed
                  ? 'bg-emerald-500 text-slate-950 font-black'
                  : 'bg-slate-800 text-gray-400 hover:bg-slate-750'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>

      {/* BATTERY REDUCER */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Battery className="w-3.5 h-3.5 text-sky-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">State-of-Charge Battery</h3>
          </div>
          <span className={`text-[10px] font-mono font-bold ${batteryLevel <= 20 ? 'text-red-400' : 'text-sky-400'}`}>
            {batteryLevel}%
          </span>
        </div>
        <input
          type="range"
          min="5"
          max="100"
          value={batteryLevel}
          onChange={(e) => onSetBatteryLevel(parseInt(e.target.value))}
          className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
        />
        {batteryLevel <= 20 && (
          <div className="flex items-center gap-1 text-[9px] text-red-400 bg-red-500/10 border border-red-500/20 rounded p-1.5 animate-pulse mt-0.5">
            <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />
            <span>Battery is running critically low. Toggle battery charger!</span>
          </div>
        )}
      </div>

      {/* REALTIME SYSTEM EVENT LOG TERMINAL */}
      <div className="flex-1 flex flex-col gap-2 min-h-[140px]">
        <div className="flex items-center justify-between border-t border-slate-800 pt-3">
          <div className="flex items-center gap-1.5 text-xs">
            <Terminal className="w-3.5 h-3.5 text-emerald-400 font-bold" />
            <span className="font-extrabold text-white uppercase tracking-wider">Live Event Diagnostics</span>
          </div>
          <button
            id="clear-logs-button"
            onClick={() => { playTapSound(); onClearLogs(); }}
            className="text-gray-500 hover:text-red-400 transition"
            title="Clear Event Log"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Console view */}
        <div className="flex-1 bg-slate-950 rounded-xl p-3 border border-slate-850 font-mono text-[9px] text-gray-400 overflow-y-auto max-h-[150px] flex flex-col gap-1 z-0 select-text leading-relaxed">
          {logs.length === 0 ? (
            <div className="text-gray-600 text-center py-4">Terminal ready. Waiting for dispatcher logs...</div>
          ) : (
            logs.map((log) => {
              const colorMap = {
                info: 'text-gray-400',
                success: 'text-emerald-400',
                warn: 'text-yellow-500',
                earnings: 'text-purple-400 font-bold',
              };
              return (
                <div key={log.id} className="flex items-start gap-1">
                  <span className="text-gray-600 shrink-0">[{log.timestamp}]</span>
                  <span className={colorMap[log.type]}>{log.message}</span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* System info disclaimer */}
      <div className="flex items-center gap-1.5 text-[9px] text-gray-500 bg-slate-950/20 p-2.5 rounded-lg border border-slate-850/40">
        <ShieldCheck className="w-4.5 h-4.5 text-emerald-500" />
        <span className="leading-tight">
          This simulation behaves identically to the actual Swift driver framework standard, including GPS routes, state transitions, and fare calculators.
        </span>
      </div>

    </div>
  );
};
