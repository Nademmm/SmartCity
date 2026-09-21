'use client';

import React, { useState, useEffect } from 'react';
import { useSmartCity } from '@/context/SmartCityContext';
import { SubsystemType, SimulationScenario } from '@/types/iot';
import {
  Menu,
  Clock,
  Radio,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Bell,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface TopbarProps {
  onOpenMobileMenu: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onOpenMobileMenu }) => {
  const {
    activeSubsystem,
    setActiveSubsystem,
    scenario,
    setScenario,
    isSimulating,
    setIsSimulating,
    isAudioMuted,
    toggleAudioMute,
    alerts,
    markAlertAsRead,
  } = useSmartCity();

  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [isAlertMenuOpen, setIsAlertMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
      );
      setCurrentDate(
        now.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getSubsystemTitle = (id: SubsystemType): string => {
    switch (id) {
      case 'overview':
        return 'City Overview & Command Center';
      case 'traffic':
        return 'Adaptive Traffic Signal Control (ATSC)';
      case 'lighting':
        return 'Smart Street Lighting (PJU)';
      case 'pedestrian':
        return 'Smart Pelican Crossing & Foot Traffic';
      case 'air-quality':
        return 'Multi-Gas Air Quality & Environmental Sensing';
      case 'iot-devices':
        return 'IoT Hardware Registry & Gateway';
      case 'automation':
        return 'Autonomous Decision Engine';
      case 'analytics':
        return 'Historical Telemetry Analytics & Reports';
      case 'alerts':
        return 'Alert & Incident Center';
      case 'settings':
        return 'IoT Gateway Settings & ESP32 SMK Guide';
      default:
        return 'Command Center';
    }
  };

  const unreadAlerts = alerts.filter((a) => !a.isRead && !a.isResolved);

  return (
    <header className="h-16 bg-[#080E1B]/95 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <h2 className="text-sm lg:text-base font-bold text-white tracking-tight">
              {getSubsystemTitle(activeSubsystem)}
            </h2>
          </div>
          <p className="hidden md:block text-[11px] text-slate-400">
            UrbanPulse Autonomous IoT Command Mesh • Zone: Capital Metropolitan
          </p>
        </div>
      </div>

      {/* Right: Simulation Controls, Live Clock, Notifications, Audio Toggle */}
      <div className="flex items-center gap-2.5 lg:gap-4">
        {/* Scenario Selector */}
        <div className="hidden sm:flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 rounded-lg p-1">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 ml-1.5" />
          <select
            value={scenario}
            onChange={(e) => setScenario(e.target.value as SimulationScenario)}
            className="bg-transparent text-xs font-semibold text-cyan-300 focus:outline-none cursor-pointer pr-1"
          >
            <option value="NORMAL" className="bg-slate-900 text-slate-200">
              Skenario: Normal
            </option>
            <option value="RUSH_HOUR" className="bg-slate-900 text-slate-200">
              Skenario: Rush Hour (Macet)
            </option>
            <option value="SMOG_CRISIS" className="bg-slate-900 text-slate-200">
              Skenario: Smog Crisis (AQI Tinggi)
            </option>
            <option value="NIGHT_PATROL" className="bg-slate-900 text-slate-200">
              Skenario: Night Patrol (PJU Dim)
            </option>
          </select>
        </div>

        {/* Live Simulation Play/Pause */}
        <button
          onClick={() => setIsSimulating(!isSimulating)}
          title={isSimulating ? 'Pause IoT Simulation' : 'Resume IoT Simulation'}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
            isSimulating
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
              : 'bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25'
          }`}
        >
          {isSimulating ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
          <span className="hidden md:inline">{isSimulating ? 'Live IoT Tick' : 'Paused'}</span>
        </button>

        {/* Audio Mute Toggle */}
        <button
          onClick={toggleAudioMute}
          title={isAudioMuted ? 'Unmute tactical audio' : 'Mute tactical audio'}
          className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
        >
          {isAudioMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
        </button>

        {/* Live Clock */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-right">
          <Clock className="w-4 h-4 text-cyan-400" />
          <div>
            <div className="text-xs font-mono font-bold text-white tracking-wider">{currentTime || '12:00:00'}</div>
            <div className="text-[10px] text-slate-400">{currentDate}</div>
          </div>
        </div>

        {/* Notifications Bell with Popover */}
        <div className="relative">
          <button
            onClick={() => setIsAlertMenuOpen(!isAlertMenuOpen)}
            className="relative p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadAlerts.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
                {unreadAlerts.length}
              </span>
            )}
          </button>

          {isAlertMenuOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-[#0D1527] border border-cyan-500/30 shadow-2xl z-50 p-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Active System Alerts</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    {unreadAlerts.length} Baru
                  </span>
                </div>
                <button
                  onClick={() => {
                    setIsAlertMenuOpen(false);
                    setActiveSubsystem('alerts');
                  }}
                  className="text-[11px] text-cyan-400 hover:underline font-semibold"
                >
                  Lihat Semua
                </button>
              </div>

              <div className="mt-3 space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {alerts.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs flex flex-col items-center gap-2">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    <span>Tidak ada alert aktif. Semua sensor normal.</span>
                  </div>
                ) : (
                  alerts.slice(0, 4).map((alert) => (
                    <div
                      key={alert.id}
                      onClick={() => markAlertAsRead(alert.id)}
                      className={`p-2.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                        alert.severity === 'CRITICAL'
                          ? 'bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/20'
                          : alert.severity === 'WARNING'
                          ? 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20'
                          : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5 font-bold text-slate-200">
                          <AlertTriangle
                            className={`w-3.5 h-3.5 ${
                              alert.severity === 'CRITICAL' ? 'text-rose-400' : 'text-amber-400'
                            }`}
                          />
                          <span>{alert.title}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">{alert.timestamp}</span>
                      </div>
                      <p className="text-[11px] text-slate-300 line-clamp-2">{alert.description}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
